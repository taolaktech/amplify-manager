import { Body, Controller, Post } from '@nestjs/common';
import { ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { TokenBillingService } from 'src/token-billing/token-billing.service';
import { AssetEventsService } from 'src/assets/asset-events.service';
import { AssetGenerationWebhookDto } from './dto/asset-generation-webhook.dto';

@ApiTags('Internal Assets')
@ApiSecurity('x-api-key')
@Controller('internal/assets')
export class InternalAssetsController {
  constructor(
    private readonly tokenBilling: TokenBillingService,
    private readonly assetEvents: AssetEventsService,
  ) {}

  @Post('/generation/webhook')
  @ApiResponse({ status: 201 })
  async assetGenerationWebhook(@Body() dto: AssetGenerationWebhookDto) {
    const result = await this.tokenBilling.settleAssetGeneration({
      assetId: dto.assetId,
      status: dto.status,
      kind: dto.kind,
      modelUsed: dto.modelUsed,
      inputTokens: dto.inputTokens,
      outputTokens: dto.outputTokens,
    });

    if (result?.userId) {
      this.assetEvents.emit({
        assetId: dto.assetId,
        userId: result.userId,
        status: dto.status,
      });
    }

    return {
      success: true,
      message: 'Webhook received successfully',
    };
  }
}
