// src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from 'src/config/config.service';
import { AppConfigModule } from 'src/config/config.module';
import { UserSchema } from './schema';
import { ShopifySchema } from './schema/shopify-account.schema';

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
      { name: 'users', schema: UserSchema },
      { name: 'shopify-accounts', schema: ShopifySchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
