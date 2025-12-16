import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

@Module({
  providers: [ShopifyService, InternalHttpHelper, ServiceRegistryService],
  controllers: [ShopifyController],
})
export class ShopifyModule {}
