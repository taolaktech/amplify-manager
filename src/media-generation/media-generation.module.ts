import { Module } from '@nestjs/common';
import { MediaGenerationController } from './media-generation.controller';
import { MediaGenerationService } from './media-generation.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

@Module({
  controllers: [MediaGenerationController],
  providers: [
    MediaGenerationService,
    InternalHttpHelper,
    ServiceRegistryService,
  ],
})
export class MediaGenerationModule {}
