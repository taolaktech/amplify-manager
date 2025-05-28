import { Module } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';

@Module({
  providers: [WaitlistService],
  controllers: [WaitlistController]
})
export class WaitlistModule {}
