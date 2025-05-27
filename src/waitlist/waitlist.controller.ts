import { Body, Controller, Post } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { AddToWaitlistDto } from './dto';
import { Public } from 'src/auth/decorators';

@Controller('api/waitlist')
export class WaitlistController {
  constructor(private waitlistService: WaitlistService) {}

  @Public()
  @Post('/')
  async addToWaitlist(@Body() dto: AddToWaitlistDto) {
    await this.waitlistService.addToWaitlist(dto.email);
    return { message: 'success' };
  }
}
