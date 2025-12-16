import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthcheckModule } from './healthcheck/healthcheck.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UtilsModule } from './utils/utils.module';
import { AuthGuard } from './auth/auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { ShopifyModule } from './shopify/shopify.module';
import { BusinessModule } from './business/business.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { FeedbackModule } from './feedback/feedback.module';
import { BrandAssetModule } from './brand-asset/brand-asset.module';
import { CampaignModule } from './campaign/campaign.module';
import { InternalModule } from './internal/internal.module';
import { ApiKeyGuard } from './internal/auth/api-key.guard';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UtilsModule,
    HealthcheckModule,
    ShopifyModule,
    BusinessModule,
    WaitlistModule,
    FeedbackModule,
    BrandAssetModule,
    CampaignModule,
    InternalModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
