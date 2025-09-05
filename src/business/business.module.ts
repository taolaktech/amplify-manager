import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { UploadService } from 'src/common/file-upload';
import { ShopifyService } from 'src/shopify/shopify.service';

@Module({
  controllers: [BusinessController],
  providers: [BusinessService, UploadService, ShopifyService],
})
export class BusinessModule {}
