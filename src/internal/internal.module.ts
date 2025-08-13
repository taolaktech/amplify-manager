import { Module } from '@nestjs/common';
import { BusinessModule } from './business/business.module';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './auth/api-key.guard';

@Module({
  imports: [BusinessModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class InternalModule {}
