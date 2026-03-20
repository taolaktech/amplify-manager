import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { CreditLedgerActionType } from 'src/database/schema/credit-ledger.schema';

export class QueryCreditLedgerDto {
  @ApiProperty({ required: false, enum: ['image-gen', 'video-gen', 'ad-copy-gen'] })
  @IsEnum(['image-gen', 'video-gen', 'ad-copy-gen'])
  @IsOptional()
  actionType?: CreditLedgerActionType;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  assetId?: string;
}
