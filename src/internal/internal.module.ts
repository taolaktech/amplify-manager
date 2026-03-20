import { Module } from '@nestjs/common';
import { InternalBusinessModule } from './business/business.module';
import { InternalMediaPresetsModule } from './media-presets/internal-media-presets.module';
import { InternalAssetsModule } from './assets/internal-assets.module';

@Module({
  imports: [
    InternalBusinessModule,
    InternalMediaPresetsModule,
    InternalAssetsModule,
  ],
  providers: [],
})
export class InternalModule {}
