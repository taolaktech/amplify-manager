import { Module } from '@nestjs/common';
import { InternalBusinessService } from './business.service';
import { InternalBusinessController } from './business.controller';

@Module({
  controllers: [InternalBusinessController],
  providers: [InternalBusinessService],
})
export class InternalBusinessModule {}
