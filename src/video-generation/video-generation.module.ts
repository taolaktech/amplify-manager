import { Module } from '@nestjs/common';
import { VideoGenerationController } from './video-generation.controller';
import { VideoGenerationService } from './video-generation.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

@Module({
  controllers: [VideoGenerationController],
  providers: [
    VideoGenerationService,
    InternalHttpHelper,
    ServiceRegistryService,
  ],
})
export class VideoGenerationModule {}
