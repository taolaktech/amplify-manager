import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalcTargetRoasDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  budget: number;
}
