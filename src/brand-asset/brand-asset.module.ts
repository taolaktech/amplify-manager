import { Module } from '@nestjs/common';
import { BrandAssetService } from './brand-asset.service';
import { BrandAssetController } from './brand-asset.controller';
import { UploadService } from 'src/common/file-upload';
import { ValidationTransformPipe } from './pipes/validation-transform.pipe';

@Module({
  providers: [BrandAssetService, UploadService],
  controllers: [BrandAssetController],
})
export class BrandAssetModule {}
