import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators';
import {
  LoginDto,
  SignUpWithEmailDto,
  VerifyEmailDto,
  ResendVerificationEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { GetUser } from './decorators';
import { UserDoc } from 'src/database/schema';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('/sign-up')
  async signUpWithEmailPassword(@Body() dto: SignUpWithEmailDto) {
    const user = await this.authService.signUpWithEmailPassword(dto);

    return user;
  }

  @Public()
  @Post('/log-in')
  async logIn(@Body() dto: LoginDto) {
    const token = await this.authService.logIn(dto);

    return token;
  }

  @Public()
  @Post('/verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return await this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('/resend-verfication-email')
  async resendEmailVerification(@Body() dto: ResendVerificationEmailDto) {
    return await this.authService.resendEmailVerification(dto);
  }

  @ApiBearerAuth()
  @Get('/me')
  me(@GetUser() user: UserDoc) {
    return user;
  }

  @Public()
  @Post('/forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('/reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetPassword(dto);
  }
}
