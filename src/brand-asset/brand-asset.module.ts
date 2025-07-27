import { Module } from '@nestjs/common';
import { BrandAssetService } from './brand-asset.service';
import { BrandAssetController } from './brand-asset.controller';

@Module({
  providers: [BrandAssetService],
  controllers: [BrandAssetController],
})
export class BrandAssetModule {}
