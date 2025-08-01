import { Module } from '@nestjs/common';
import { BrandAssetService } from './brand-asset.service';
import { BrandAssetController } from './brand-asset.controller';
import { UploadService } from 'src/common/file-upload';

@Module({
  providers: [BrandAssetService, UploadService],
  controllers: [BrandAssetController],
})
export class BrandAssetModule {}
