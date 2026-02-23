import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { UploadService } from 'src/common/file-upload';
import { MediaGenerationService } from 'src/media-generation/media-generation.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

@Module({
  controllers: [AssetsController],
  providers: [
    AssetsService,
    UploadService,
    MediaGenerationService,
    InternalHttpHelper,
    ServiceRegistryService,
  ],
})
export class AssetsModule {}
