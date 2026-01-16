import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InternalBusinessService } from './business.service';
import { ApiSecurity } from '@nestjs/swagger';
import { CalcTargetRoasDto } from './dto/calculate-target-roas.dto';

@ApiSecurity('x-api-key')
@Controller('internal/business')
export class InternalBusinessController {
  constructor(
    private readonly internalbusinessService: InternalBusinessService,
  ) {}

  @Get('/:businessId')
  async findOne(@Param('businessId') id: string) {
    const business = await this.internalbusinessService.getBusinessById(id);
    return { business };
  }

  @Post('/:businessId/calculate-target-roas')
  async calculateTargetRoas(
    @Param('businessId') id: string,
    @Body() dto: CalcTargetRoasDto,
  ) {
    return await this.internalbusinessService.calculateTargetRoas(id, dto);
  }
}
