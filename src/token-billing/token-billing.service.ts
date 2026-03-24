import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import {
  AssetDoc,
  BusinessDoc,
  CreditLedgerDocument,
  TokenTransactionDocument,
  UserDoc,
} from 'src/database/schema';

export type GenerationKind =
  | 'video_copy_generation'
  | 'image_copy_generation'
  | 'google_ad_generation'
  | 'image_ad_generation'
  | 'video_generation_12s';

@Injectable()
export class TokenBillingService {
  private readonly logger = new Logger(TokenBillingService.name);

  private isTransientMongoTransactionError(error: unknown): boolean {
    const anyErr = error as any;
    const labels = anyErr?.errorLabelSet;
    const hasTransientLabel =
      labels && typeof labels.has === 'function'
        ? labels.has('TransientTransactionError')
        : false;

    const code = anyErr?.code;
    const codeName = anyErr?.codeName;

    return (
      hasTransientLabel ||
      code === 112 ||
      codeName === 'WriteConflict' ||
      codeName === 'TransientTransactionError'
    );
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getSpendableBalance(
    user: Pick<UserDoc, 'subscriptionTokenBalance' | 'topUpTokenBalance'>,
  ): number {
    return (user.subscriptionTokenBalance ?? 0) + (user.topUpTokenBalance ?? 0);
  }

  private debitSpendableBalance(
    user: Pick<UserDoc, 'subscriptionTokenBalance' | 'topUpTokenBalance'>,
    amount: number,
  ): void {
    if (amount <= 0) return;

    const topUpAvailable = user.topUpTokenBalance ?? 0;
    const fromTopUp = Math.min(topUpAvailable, amount);
    const remaining = amount - fromTopUp;

    user.topUpTokenBalance = topUpAvailable - fromTopUp;

    if (remaining > 0) {
      const subAvailable = user.subscriptionTokenBalance ?? 0;
      user.subscriptionTokenBalance = subAvailable - remaining;
    }
  }

  private creditSpendableBalance(
    user: Pick<UserDoc, 'topUpTokenBalance'>,
    amount: number,
  ): void {
    if (amount <= 0) return;
    user.topUpTokenBalance = (user.topUpTokenBalance ?? 0) + amount;
  }

  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    @InjectModel('users') private readonly userModel: Model<UserDoc>,
    @InjectModel('token-transactions')
    private readonly tokenTransactionModel: Model<TokenTransactionDocument>,
    @InjectModel('credit-ledgers')
    private readonly creditLedgerModel: Model<CreditLedgerDocument>,
    @InjectModel('assets') private readonly assetModel: Model<AssetDoc>,
    @InjectModel('business') private readonly businessModel: Model<BusinessDoc>,
  ) {}

  getQuoteAmount(kind: GenerationKind): number {
    if (kind === 'video_copy_generation') return 4;
    if (kind === 'image_copy_generation') return 4;
    if (kind === 'google_ad_generation') return 4;
    if (kind === 'image_ad_generation') return 15;
    if (kind === 'video_generation_12s') return 120;

    return 0;
  }

  private computeTokenCost(params: {
    inputTokens?: number;
    outputTokens?: number;
    modelUsed?: string;
  }): { tokens: number; costUsd: number } {
    const inputTokens = params.inputTokens ?? 0;
    const outputTokens = params.outputTokens ?? 0;

    let inputCostPer1M = 0.15;
    let outputCostPer1M = 0.6;

    if (params.modelUsed?.includes('gpt-4o-mini')) {
      inputCostPer1M = 0.15;
      outputCostPer1M = 0.6;
    } else if (params.modelUsed?.includes('gpt-4o')) {
      inputCostPer1M = 2.5;
      outputCostPer1M = 10.0;
    } else if (params.modelUsed?.includes('gpt-4')) {
      inputCostPer1M = 30.0;
      outputCostPer1M = 60.0;
    }

    const inputCostUsd = (inputTokens / 1_000_000) * inputCostPer1M;
    const outputCostUsd = (outputTokens / 1_000_000) * outputCostPer1M;
    const totalCostUsd = inputCostUsd + outputCostUsd;

    const tokenCost = Math.ceil(totalCostUsd * 100);

    return { tokens: tokenCost, costUsd: totalCostUsd };
  }

  async reserveForAsset(params: {
    userId: Types.ObjectId;
    assetId: string;
    kind: GenerationKind;
  }) {
    // Phase 1 (Reservation):
    // - Charges the fixed quote immediately by moving tokens from tokenBalance -> reservedTokenBalance.
    // - Creates an internal debit transaction (reason: generation_reserve) for idempotency/auditing.
    // - Uses assetId as the idempotency key so retries do not double-charge.
    this.logger.log(
      `reserveForAsset start assetId=${params.assetId} userId=${params.userId.toString()} kind=${params.kind}`,
    );

    const quoteAmount = this.getQuoteAmount(params.kind);
    if (quoteAmount <= 0) {
      throw new BadRequestException('Invalid quote amount');
    }

    if (!Types.ObjectId.isValid(params.assetId)) {
      throw new BadRequestException('Invalid asset id');
    }

    const assetId = new Types.ObjectId(params.assetId);

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const session = await this.connection.startSession();
      try {
        session.startTransaction();

        const existing = await this.tokenTransactionModel
          .exists({
            userId: params.userId,
            assetId,
            reason: 'generation_reserve',
            type: 'debit',
          })
          .session(session);

        if (existing) {
          this.logger.log(
            `reserveForAsset idempotent-skip assetId=${params.assetId} userId=${params.userId.toString()} quote=${quoteAmount}`,
          );
          await session.commitTransaction();
          return { quoteAmount };
        }

        const updatedUser = await this.userModel
          .findById(params.userId)
          .session(session);

        if (!updatedUser) {
          throw new NotFoundException('User not found');
        }

        const spendableBefore = this.getSpendableBalance(updatedUser);
        if (spendableBefore < quoteAmount) {
          this.logger.warn(
            `reserveForAsset insufficient-tokens assetId=${params.assetId} userId=${params.userId.toString()} quote=${quoteAmount} spendable=${spendableBefore}`,
          );
          throw new BadRequestException({
            message: 'Insufficient tokens',
            code: 'INSUFFICIENT_TOKENS',
          });
        }

        this.debitSpendableBalance(updatedUser, quoteAmount);
        updatedUser.reservedTokenBalance =
          (updatedUser.reservedTokenBalance ?? 0) + quoteAmount;

        await updatedUser.save({ session });

        await this.tokenTransactionModel.create(
          [
            {
              userId: updatedUser._id,
              type: 'debit',
              amount: quoteAmount,
              reason: 'generation_reserve',
              assetId,
              balanceAfter: this.getSpendableBalance(updatedUser),
            },
          ],
          { session },
        );

        await session.commitTransaction();
        this.logger.log(
          `reserveForAsset success assetId=${params.assetId} userId=${params.userId.toString()} quote=${quoteAmount} spendableAfter=${this.getSpendableBalance(updatedUser)}`,
        );
        return { quoteAmount };
      } catch (error) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        const shouldRetry =
          this.isTransientMongoTransactionError(error) && attempt < maxAttempts;
        if (shouldRetry) {
          const backoffMs = 50 * Math.pow(2, attempt - 1);
          this.logger.warn(
            `reserveForAsset transient-error retrying attempt=${attempt}/${maxAttempts} backoffMs=${backoffMs} assetId=${params.assetId} userId=${params.userId.toString()}`,
          );
          await this.sleep(backoffMs);
        } else {
          this.logger.error(
            `reserveForAsset error assetId=${params.assetId} userId=${params.userId.toString()} kind=${params.kind}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      } finally {
        await session.endSession();
      }
    }
  }

  async settleAssetGeneration(params: {
    assetId: string;
    status: 'completed' | 'failed';
    kind: GenerationKind;
    modelUsed?: string;
    inputTokens?: number;
    outputTokens?: number;
  }) {
    // Phase 2 (Settlement):
    // - Runs once n8n finishes and we have usage.
    // - Releases the reservation from reservedTokenBalance.
    // - If actual < quote: refunds the difference.
    // - If actual > quote: debits the overage from tokenBalance.
    // - Writes a user-visible debit (reason: generation) that represents the final actual cost.
    // - Idempotent: skips if billing settlement transactions already exist for this assetId.
    const { tokens: actualCost, costUsd: totalApiCostUsd } =
      this.computeTokenCost({
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        modelUsed: params.modelUsed,
      });

    this.logger.log(
      `settleAssetGeneration start assetId=${params.assetId} status=${params.status} kind=${params.kind} actualCost=${actualCost} (computed from ${params.inputTokens ?? 0} input + ${params.outputTokens ?? 0} output tokens)`,
    );

    if (!Types.ObjectId.isValid(params.assetId)) {
      throw new BadRequestException('Invalid asset id');
    }

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const asset = await this.assetModel
        .findById(new Types.ObjectId(params.assetId))
        .session(session)
        .lean<AssetDoc>();

      if (!asset) {
        this.logger.log(
          `settleAssetGeneration skip assetId=${params.assetId} (asset not found)`,
        );
        await session.commitTransaction();
        return;
      }

      const business = await this.businessModel
        .findById(asset.businessId)
        .lean<BusinessDoc>();

      if (!business) {
        throw new NotFoundException('Business not found');
      }

      const user = await this.userModel
        .findById(business.userId)
        .session(session);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const assetId = new Types.ObjectId(params.assetId);

      const alreadySettled = await this.tokenTransactionModel
        .exists({
          userId: user._id,
          assetId,
          reason: {
            $in: [
              'generation',
              'generation_reserve_refund',
              'generation_overage',
            ],
          },
        })
        .session(session);

      if (alreadySettled) {
        this.logger.log(
          `settleAssetGeneration idempotent-skip assetId=${params.assetId} userId=${user._id.toString()} (already settled)`,
        );
        await session.commitTransaction();
        return;
      }

      const quoteTx = await this.tokenTransactionModel
        .findOne({
          userId: user._id,
          assetId,
          reason: 'generation_reserve',
          type: 'debit',
        })
        .session(session);

      const quoteAmount = quoteTx?.amount ?? 0;

      this.logger.log(
        `settleAssetGeneration loaded assetId=${params.assetId} userId=${user._id.toString()} quote=${quoteAmount}`,
      );

      if (params.status === 'failed') {
        if (quoteAmount > 0) {
          user.reservedTokenBalance = Math.max(
            0,
            (user.reservedTokenBalance ?? 0) - quoteAmount,
          );
          this.creditSpendableBalance(user, quoteAmount);

          await this.tokenTransactionModel.create(
            [
              {
                userId: user._id,
                type: 'credit',
                amount: quoteAmount,
                reason: 'generation_reserve_refund',
                assetId,
                balanceAfter: this.getSpendableBalance(user),
              },
            ],
            { session },
          );

          this.logger.log(
            `settleAssetGeneration failed-refund assetId=${params.assetId} userId=${user._id.toString()} amount=${quoteAmount} spendableAfter=${this.getSpendableBalance(user)}`,
          );
        }

        await user.save({ session });
        await session.commitTransaction();
        return;
      }
      // quote is the amount that was reserved for the generation
      // refundAmount is the amount that is less than the quote
      const refundAmount = Math.max(0, quoteAmount - actualCost);
      // overage is the amount that exceeds the quote
      const overage = Math.max(0, actualCost - quoteAmount);

      if (quoteAmount > 0) {
        user.reservedTokenBalance = Math.max(
          0,
          (user.reservedTokenBalance ?? 0) - quoteAmount,
        );
      }

      if (refundAmount > 0) {
        this.creditSpendableBalance(user, refundAmount);
        await this.tokenTransactionModel.create(
          [
            {
              userId: user._id,
              type: 'credit',
              amount: refundAmount,
              reason: 'generation_reserve_refund',
              assetId,
              balanceAfter: this.getSpendableBalance(user),
            },
          ],
          { session },
        );

        this.logger.log(
          `settleAssetGeneration completed-refund assetId=${params.assetId} userId=${user._id.toString()} amount=${refundAmount} spendableAfter=${this.getSpendableBalance(user)}`,
        );
      }

      if (overage > 0) {
        const spendableBeforeOverage = this.getSpendableBalance(user);
        if (spendableBeforeOverage < overage) {
          this.logger.warn(
            `settleAssetGeneration insufficient-overage assetId=${params.assetId} userId=${user._id.toString()} overage=${overage} spendable=${spendableBeforeOverage}`,
          );
          throw new BadRequestException({
            message: 'Insufficient tokens for overage debit',
            code: 'INSUFFICIENT_TOKENS_FOR_OVERAGE',
          });
        }

        this.debitSpendableBalance(user, overage);

        await this.tokenTransactionModel.create(
          [
            {
              userId: user._id,
              type: 'debit',
              amount: overage,
              reason: 'generation_overage',
              assetId,
              balanceAfter: this.getSpendableBalance(user),
            },
          ],
          { session },
        );

        this.logger.log(
          `settleAssetGeneration completed-overage assetId=${params.assetId} userId=${user._id.toString()} amount=${overage} spendableAfter=${this.getSpendableBalance(user)}`,
        );
      }

      const existingUserVisibleGenerationTx = await this.tokenTransactionModel
        .exists({
          userId: user._id,
          assetId,
          reason: 'generation',
          type: 'debit',
        })
        .session(session);

      if (!existingUserVisibleGenerationTx) {
        await this.tokenTransactionModel.create(
          [
            {
              userId: user._id,
              type: 'debit',
              amount: actualCost,
              reason: 'generation',
              assetId,
              balanceAfter: this.getSpendableBalance(user),
            },
          ],
          { session },
        );
      }

      const actionType =
        params.kind === 'video_generation_12s'
          ? 'video-gen'
          : params.kind === 'video_copy_generation' ||
              params.kind === 'image_copy_generation'
            ? 'ad-copy-gen'
            : 'image-gen';

      await this.creditLedgerModel.create(
        [
          {
            userId: user._id,
            assetId: new Types.ObjectId(params.assetId),
            actionType,
            modelUsed: params.modelUsed ?? 'unknown',
            inputTokens: params.inputTokens ?? 0,
            outputTokens: params.outputTokens ?? 0,
            totalApiCostUsd: totalApiCostUsd ?? 0,
            creditsUsed: actualCost,
          },
        ],
        { session },
      );

      await user.save({ session });
      await session.commitTransaction();

      this.logger.log(
        `settleAssetGeneration success assetId=${params.assetId} userId=${user._id.toString()} status=${params.status} actualCost=${actualCost} spendableAfter=${this.getSpendableBalance(user)} reservedAfter=${user.reservedTokenBalance}`,
      );
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      this.logger.error(
        `settleAssetGeneration error assetId=${params.assetId} status=${params.status} kind=${params.kind}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
