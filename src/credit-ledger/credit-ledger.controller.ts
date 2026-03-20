import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators';
import { UserDoc } from 'src/database/schema';
import { CreditLedgerService } from './credit-ledger.service';
import { QueryCreditLedgerDto } from './dto/query-credit-ledger.dto';

@ApiTags('Credit Ledger')
@ApiBearerAuth()
@Controller('api/credit-ledger')
export class CreditLedgerController {
  constructor(private readonly creditLedgerService: CreditLedgerService) {}

  @Get('/')
  @ApiOperation({ summary: 'Get user credit ledger entries' })
  @ApiQuery({ name: 'actionType', required: false, enum: ['image-gen', 'video-gen', 'ad-copy-gen'] })
  @ApiQuery({ name: 'assetId', required: false })
  async getUserLedger(
    @GetUser() user: UserDoc,
    @Query() query: QueryCreditLedgerDto,
  ) {
    const entries = await this.creditLedgerService.getUserLedger(
      user._id.toString(),
      query,
    );
    return {
      data: entries,
      status: 'success',
      message: 'Credit ledger retrieved successfully',
    };
  }

  @Get('/summary')
  @ApiOperation({ summary: 'Get user credit usage summary' })
  async getUserCreditSummary(@GetUser() user: UserDoc) {
    const summary = await this.creditLedgerService.getUserCreditSummary(
      user._id.toString(),
    );
    return {
      data: summary,
      status: 'success',
      message: 'Credit summary retrieved successfully',
    };
  }
}
