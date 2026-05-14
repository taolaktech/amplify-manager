import { Module } from '@nestjs/common';
import { InternalAssetsController } from './internal-assets.controller';
import { TokenBillingService } from 'src/token-billing/token-billing.service';

@Module({
  controllers: [InternalAssetsController],
  providers: [TokenBillingService],
})
export class InternalAssetsModule {}
