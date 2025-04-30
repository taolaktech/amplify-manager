import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { InternalAuthController } from './auth.internal.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
  ],
  providers: [AuthService, FirebaseService],
  controllers: [AuthController, InternalAuthController],
})
export class AuthModule {}
