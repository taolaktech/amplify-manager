import { Module } from '@nestjs/common';
import { CreditLedgerController } from './credit-ledger.controller';
import { CreditLedgerService } from './credit-ledger.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';
import { AmplifyWalletService } from 'src/campaign/services/wallet.service';

@Module({
  controllers: [CreditLedgerController],
  providers: [
    CreditLedgerService,
    InternalHttpHelper,
    ServiceRegistryService,
    AmplifyWalletService,
  ],
  exports: [CreditLedgerService],
})
export class CreditLedgerModule {}
