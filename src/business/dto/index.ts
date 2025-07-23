import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
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

enum LogoType {
  'PRIMARY' = 'primary',
  'SECONDARY' = 'secondary',
}
export class LogoUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty()
  @IsEnum(LogoType)
  @IsNotEmpty()
  type: 'primary' | 'secondary';
}

export class BrandGuideUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}

export class SetBrandAssetsDto {
  @ApiProperty()
  @IsString()
  @IsUrl()
  @IsOptional()
  primaryLogo: string;

  @ApiProperty()
  @IsString()
  @IsUrl()
  @IsOptional()
  secondaryLogo: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  primaryColor: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  secondaryColor: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  primaryFont: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  secondaryFont: string;

  @ApiProperty()
  @IsString()
  @IsUrl()
  @IsOptional()
  brandGuide: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  toneOfVoice: string;
}
