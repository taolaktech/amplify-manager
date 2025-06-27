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
import { BusinessDetailsModule } from './business-details/business-details.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UtilsModule,
    HealthcheckModule,
    ShopifyModule,
    BusinessDetailsModule,
    WaitlistModule,
    FeedbackModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
