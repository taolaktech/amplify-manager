import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddToWaitlistDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  shopifyUrl: string;

  @ApiProperty()
  @IsArray()
  @IsArray()
  @Type(() => String)
  @IsNotEmpty()
  salesLocations: string[];
}
