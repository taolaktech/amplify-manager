import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

class TeamSize {
  @ApiProperty()
  min: number;

  @ApiProperty()
  max: number;
}

export class SetBusinessDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  website: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  industry: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  companyRole: string;

  @ApiProperty()
  @IsObject()
  teamSize: TeamSize;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  estimatedMonthlyBudget: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  estimatedAnnualRevenue: number;
}

export class SetBusinessGoalsDto {
  @ApiProperty()
  @IsBoolean()
  brandAwareness: boolean;

  @ApiProperty()
  @IsBoolean()
  acquireNewCustomers: boolean;

  @ApiProperty()
  @IsBoolean()
  boostRepeatPurchases: boolean;
}

class LocalShippingLocations {
  @ApiProperty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  shorthand: string;
}

export class SetShippingLocationsDto {
  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LocalShippingLocations)
  localShippingLocations: LocalShippingLocations[];

  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => String)
  @IsString({ each: true })
  internationalShippingLocations: string[];
}

export class GetCitiesDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  input: string;
}

export class LogoUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
