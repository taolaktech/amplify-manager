import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { InternalAuthController } from './auth.internal.controller';
import { AmplifyWalletService } from 'src/campaign/services/wallet.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
  ],
  providers: [
    AuthService,
    FirebaseService,
    AmplifyWalletService,
    InternalHttpHelper,
    ServiceRegistryService,
  ],
  controllers: [AuthController, InternalAuthController],
})
export class AuthModule {}
