import { Global, Module } from '@nestjs/common';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

@Global()
@Module({
  providers: [InternalHttpHelper, ServiceRegistryService],
  exports: [InternalHttpHelper, ServiceRegistryService],
})
export class CommonModule {}
