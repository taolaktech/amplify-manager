import { Module } from '@nestjs/common';
import { InternalBusinessService } from './business.service';
import { InternalBusinessController } from './business.controller';
import { ShopifyService } from 'src/shopify/shopify.service';

@Module({
  controllers: [InternalBusinessController],
  providers: [InternalBusinessService, ShopifyService],
})
export class InternalBusinessModule {}
