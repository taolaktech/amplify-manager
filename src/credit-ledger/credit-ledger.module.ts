import { Module } from '@nestjs/common';
import { CreditLedgerController } from './credit-ledger.controller';
import { CreditLedgerService } from './credit-ledger.service';

@Module({
  controllers: [CreditLedgerController],
  providers: [CreditLedgerService],
  exports: [CreditLedgerService],
})
export class CreditLedgerModule {}
