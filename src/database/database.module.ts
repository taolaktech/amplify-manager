// src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from 'src/config/config.service';
import { AppConfigModule } from 'src/config/config.module';
import {
  UserSchema,
  ShopifyAccountSchema,
  BusinessSchema,
  WaitlistSchema,
  BrandAssetSchema,
  CampaignSchema,
  CreativeSchema,
  GoogleAdsCampaignSchema,
  WalletSchema,
  CampaignTopUpRequestSchema,
  CampaignProductSchema,
  AdLibrarySchema,
} from './schema';
import { FeedbackSchema } from './schema/feedback.schema';

@Global()
@Module({
  imports: [
    AppConfigModule, // Ensure ConfigModule is imported to access ConfigService
    MongooseModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (configService: AppConfigService) => ({
        uri: configService.get('MONGO_URI'),
        dbName: configService.get('DB_NAME'),
        serverSelectionTimeoutMS: 5000,
      }),
      inject: [AppConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'waitlist', schema: WaitlistSchema },
      { name: 'users', schema: UserSchema },
      { name: 'shopify-accounts', schema: ShopifyAccountSchema },
      { name: 'business', schema: BusinessSchema },
      { name: 'feedbacks', schema: FeedbackSchema },
      { name: 'brand-assets', schema: BrandAssetSchema },
      { name: 'campaigns', schema: CampaignSchema },
      { name: 'google-ads-campaigns', schema: GoogleAdsCampaignSchema },
      { name: 'wallets', schema: WalletSchema },
      { name: 'campaign-top-up-requests', schema: CampaignTopUpRequestSchema },
      { name: 'creatives', schema: CreativeSchema },
      { name: 'campaign-products', schema: CampaignProductSchema },
      { name: 'ad-library', schema: AdLibrarySchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
