import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyTokenDto } from './dto';
import { InternalGuard } from '../common/guards/internal.guard';
import { Public } from './decorators';

@Public()
@UseGuards(InternalGuard)
@Controller('api/internal/auth')
export class InternalAuthController {
  constructor(private authService: AuthService) {}

  @Post('verify-token')
  async verifyToken(@Body() dto: VerifyTokenDto) {
    const user = await this.authService.verifyToken(dto);

    return {
      message: 'Token verified successfully',
      success: true,
      data: user,
    };
  }
}
