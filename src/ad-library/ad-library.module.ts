import { Module } from '@nestjs/common';
import { AdLibraryController } from './ad-library.controller';
import { AdLibraryService } from './services/ad-library.service';
import { MetaAdLibraryApiService } from './services/meta-ad-library-api.service';
import { ShopifyModule } from 'src/shopify/shopify.module';

@Module({
  imports: [ShopifyModule],
  controllers: [AdLibraryController],
  providers: [AdLibraryService, MetaAdLibraryApiService],
  exports: [AdLibraryService, MetaAdLibraryApiService],
})
export class AdLibraryModule {}
