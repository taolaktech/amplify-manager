import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { UploadService } from 'src/common/file-upload';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, UploadService],
})
export class AssetsModule {}
