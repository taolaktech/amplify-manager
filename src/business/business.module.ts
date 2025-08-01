import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { UploadService } from 'src/common/file-upload';

@Module({
  controllers: [BusinessController],
  providers: [BusinessService, UploadService],
})
export class BusinessModule {}
