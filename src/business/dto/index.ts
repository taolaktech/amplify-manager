import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPhoneNumber,
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

  @ApiPropertyOptional()
  @IsString()
  @IsEmail()
  @IsOptional()
  contactEmail: string;

  @ApiPropertyOptional()
  @ApiProperty()
  @IsString()
  @IsPhoneNumber()
  @IsOptional()
  contactPhone: string;

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

export class UpdateBusinessLogo {
  @ApiPropertyOptional({
    description:
      'Set to true to remove the existing logo. This is ignored if a new logo file is uploaded in the same request.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  removeLogo?: boolean;

  /*  */
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  businessLogo?: Express.Multer.File;
}
