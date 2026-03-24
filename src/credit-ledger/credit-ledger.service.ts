import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreditLedger,
  CreditLedgerDocument,
} from 'src/database/schema/credit-ledger.schema';
import { TokenTransactionDocument } from 'src/database/schema/token-transaction.schema';
import { UserDoc } from 'src/database/schema/user.schema';
import { AppConfigService } from 'src/config/config.service';
import { RecordCreditUsageDto } from './dto/record-credit-usage.dto';
import { QueryCreditLedgerDto } from './dto/query-credit-ledger.dto';

@Injectable()
export class CreditLedgerService {
  private readonly logger = new Logger(CreditLedgerService.name);

  private readonly creditCostUsd: number;
  private readonly gptInputPricePerMillion: number;
  private readonly gptOutputPricePerMillion: number;
  private readonly geminiInputPricePerMillion: number;
  private readonly geminiOutputPricePerMillion: number;
  private readonly imageTokenCost: number;
  private readonly imageGenerationCost: number;
  private readonly videoCostPerSecond: number;

  constructor(
    @InjectModel('credit-ledgers')
    private readonly creditLedgerModel: Model<CreditLedgerDocument>,
    @InjectModel('token-transactions')
    private readonly tokenTransactionModel: Model<TokenTransactionDocument>,
    @InjectModel('users')
    private readonly userModel: Model<UserDoc>,
    private readonly configService: AppConfigService,
  ) {
    this.creditCostUsd = this.configService.get('CREDIT_COST_USD');
    this.gptInputPricePerMillion = this.configService.get(
      'GPT_INPUT_PRICE_PER_MILLION',
    );
    this.gptOutputPricePerMillion = this.configService.get(
      'GPT_OUTPUT_PRICE_PER_MILLION',
    );
    this.geminiInputPricePerMillion = this.configService.get(
      'GEMINI_INPUT_PRICE_PER_MILLION',
    );
    this.geminiOutputPricePerMillion = this.configService.get(
      'GEMINI_OUTPUT_PRICE_PER_MILLION',
    );
    this.imageTokenCost = this.configService.get('IMAGE_TOKEN_COST');
    this.imageGenerationCost = this.configService.get('IMAGE_GENERATION_COST');
    this.videoCostPerSecond = this.configService.get('VIDEO_COST_PER_SECOND');
  }

  private getTextModelPricing(modelUsed: string): {
    inputPricePerMillion: number;
    outputPricePerMillion: number;
  } {
    const model = modelUsed.toLowerCase();
    if (model.startsWith('gemini')) {
      return {
        inputPricePerMillion: this.geminiInputPricePerMillion,
        outputPricePerMillion: this.geminiOutputPricePerMillion,
      };
    }
    return {
      inputPricePerMillion: this.gptInputPricePerMillion,
      outputPricePerMillion: this.gptOutputPricePerMillion,
    };
  }

  calculateTotalApiCost(dto: RecordCreditUsageDto): number {
    const {
      actionType,
      modelUsed,
      inputTokens = 0,
      outputTokens = 0,
      generationCost = 0,
      videoDurationSeconds = 0,
    } = dto;

    if (actionType === 'video-gen') {
      return videoDurationSeconds * this.videoCostPerSecond;
    }

    if (actionType === 'image-gen') {
      return this.imageTokenCost + this.imageGenerationCost + generationCost;
    }

    const pricing = this.getTextModelPricing(modelUsed);
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
    const outputCost =
      (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
    return inputCost + outputCost + generationCost;
  }

  calculateCreditsUsed(totalApiCostUsd: number): number {
    return Math.ceil(totalApiCostUsd / this.creditCostUsd);
  }

  async recordUsage(dto: RecordCreditUsageDto): Promise<CreditLedgerDocument> {
    const totalApiCostUsd = this.calculateTotalApiCost(dto);
    const creditsUsed = this.calculateCreditsUsed(totalApiCostUsd);

    const entry = await this.creditLedgerModel.create({
      userId: new Types.ObjectId(dto.userId),
      assetId: dto.assetId ? new Types.ObjectId(dto.assetId) : undefined,
      actionType: dto.actionType,
      modelUsed: dto.modelUsed,
      inputTokens: dto.inputTokens ?? 0,
      outputTokens: dto.outputTokens ?? 0,
      totalApiCostUsd,
      creditsUsed,
    });

    this.logger.log(
      `Credit recorded: userId=${dto.userId}, action=${dto.actionType}, model=${dto.modelUsed}, cost=$${totalApiCostUsd.toFixed(6)}, credits=${creditsUsed}`,
    );

    return entry;
  }

  async getUserLedger(
    userId: string,
    query?: QueryCreditLedgerDto,
  ): Promise<CreditLedger[]> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (query?.actionType) filter.actionType = query.actionType;
    if (query?.assetId) filter.assetId = new Types.ObjectId(query.assetId);

    return this.creditLedgerModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getUserCreditSummary(userId: string): Promise<{
    totalCreditsUsed: number;
    totalApiCostUsd: number;
    entryCount: number;
  }> {
    const result = await this.creditLedgerModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalCreditsUsed: { $sum: '$creditsUsed' },
          totalApiCostUsd: { $sum: '$totalApiCostUsd' },
          entryCount: { $sum: 1 },
        },
      },
    ]);

    if (!result.length) {
      return { totalCreditsUsed: 0, totalApiCostUsd: 0, entryCount: 0 };
    }

    return {
      totalCreditsUsed: result[0].totalCreditsUsed,
      totalApiCostUsd: result[0].totalApiCostUsd,
      entryCount: result[0].entryCount,
    };
  }

  async getUserSubscriptionUsageSummary(userId: string): Promise<{
    tokensUsed: number;
    totalTokenBalance: number;
    windowStart: Date | null;
  }> {
    const userObjectId = new Types.ObjectId(userId);

    const lastSubscriptionTopUp = await this.tokenTransactionModel
      .findOne({
        userId: userObjectId,
        reason: 'subscription_topup',
        type: 'credit',
      })
      .sort({ createdAt: -1 })
      .lean<{ createdAt?: Date }>();

    const windowStart = lastSubscriptionTopUp?.createdAt ?? null;

    const match: Record<string, unknown> = {
      userId: userObjectId,
    };

    if (windowStart) {
      match.createdAt = { $gte: windowStart };
    }

    const usageAgg = await this.creditLedgerModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          tokensUsed: { $sum: '$creditsUsed' },
        },
      },
    ]);

    const tokensUsed = usageAgg?.[0]?.tokensUsed ?? 0;

    const user = await this.userModel
      .findById(userObjectId)
      .select('subscriptionTokenBalance topUpTokenBalance')
      .lean<{
        subscriptionTokenBalance?: number;
        topUpTokenBalance?: number;
      }>();

    const totalTokenBalance =
      (user?.subscriptionTokenBalance ?? 0) + (user?.topUpTokenBalance ?? 0);

    return {
      tokensUsed,
      totalTokenBalance,
      windowStart,
    };
  }
}
