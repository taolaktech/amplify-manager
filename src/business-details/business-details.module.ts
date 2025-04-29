import { Module } from '@nestjs/common';
import { BusinessDetailsController } from './business-details.controller';
import { BusinessDetailsService } from './business-details.service';

@Module({
  controllers: [BusinessDetailsController],
  providers: [BusinessDetailsService],
})
export class BusinessDetailsModule {}
