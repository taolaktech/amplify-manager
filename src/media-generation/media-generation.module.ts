import { Module } from '@nestjs/common';
import { MediaGenerationService } from './media-generation.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

@Module({
  controllers: [],
  providers: [
    MediaGenerationService,
    InternalHttpHelper,
    ServiceRegistryService,
  ],
  exports: [MediaGenerationService],
})
export class MediaGenerationModule {}
