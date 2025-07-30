import {
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum ToneOfVoice {
  FRIENDLY = 'Friendly',
  BOLD = 'Bold',
  QUIRKY = 'Quirky',
  MINIMAL = 'Minimal',
  LUXURIOUS = 'Luxurious',
  PROFESSIONAL = 'Professional',
}

export enum SupportedFonts {
  HELVETICA = 'Helvetica',
  ARIAL = 'Arial',
  OPEN_SANS = 'Open Sans',
  POPPINS = 'Poppins',
  LATO = 'Lato',
  ROBOTO = 'Roboto',
  MONTSERRAT = 'Montserrat',
  INTER = 'Inter',
  NOTO_SANS = 'Noto Sans',
  DM_SANS = 'DM Sans',
  TIMES_NEW_ROMAN = 'Times New Roman',
  GEORGIA = 'Georgia',
  MERRIWEATHER = 'Merriweather',
  PLAYFAIR_DISPLAY = 'Playfair Display',
  CORMORANT_GARAMOND = 'Cormorant Garamon',
  VERDANA = 'Verdana',
  TREBUCHET_MS = 'Trebuchet MS',
  TAHOMA = 'Tahoma',
  GENEVA = 'Geneva',
  PALATINO_LINOTYPE = 'Palatino Linotype',
  BOOK_ANTIQUA = 'Book Antiqua',
  COURIER_NEW = 'Courier New',
  LUCIDA_CONSOLE = 'Lucida Console',
}

export class UpsertBrandAssetDto {
  @ApiPropertyOptional({
    description:
      'Set to true to remove the existing primary logo. This is ignored if a new primaryLogo file is uploaded in the same request.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  removePrimaryLogo?: boolean;

  @ApiPropertyOptional({
    description:
      'Set to true to remove the existing secondary logo. This is ignored if a new secondaryLogo file is uploaded in the same request.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  removeSecondaryLogo?: boolean;

  @ApiPropertyOptional({
    description:
      'Set to true to remove the existing brand guide. This is ignored if a new brandGuide file is uploaded in the same request.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  removeBrandGuide?: boolean;

  /*  */
  @ApiPropertyOptional({
    description: 'The primary color for the brand.',
  })
  @IsString({
    message: 'Primary color must be a string',
  })
  @IsHexColor({
    message: 'Primary color must be a valid hexadecimal color code',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  primaryColor?: string;

  /*  */
  @ApiPropertyOptional({
    description: 'The primary font for the brand.',
  })
  @IsString({
    message: 'Secondary color must be a string',
  })
  @IsHexColor({
    message: 'Secondary color must be a valid hexadecimal color code',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  secondaryColor?: string;

  /*  */
  @ApiPropertyOptional({
    description: 'The primary font for the brand.',
    enum: SupportedFonts,
    default: SupportedFonts.OPEN_SANS,
  })
  @IsEnum(SupportedFonts)
  @IsOptional()
  @Transform(({ value }) => value || SupportedFonts.OPEN_SANS)
  primaryFont: SupportedFonts = SupportedFonts.OPEN_SANS;

  /*  */
  @ApiPropertyOptional({
    description: 'The secondary font for the brand.',
    enum: SupportedFonts,
    default: SupportedFonts.OPEN_SANS,
  })
  @IsEnum(SupportedFonts)
  @IsOptional()
  @Transform(({ value }) => value || SupportedFonts.OPEN_SANS)
  secondaryFont: SupportedFonts = SupportedFonts.OPEN_SANS;

  /*  */
  @ApiPropertyOptional({
    description: "The brand's tone of voice.",
    enum: ToneOfVoice,
    default: ToneOfVoice.FRIENDLY,
  })
  @IsEnum(ToneOfVoice)
  @IsOptional()
  @Transform(({ value }) => value || ToneOfVoice.FRIENDLY)
  toneOfVoice: ToneOfVoice = ToneOfVoice.FRIENDLY;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  primaryLogo?: Express.Multer.File;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  secondaryLogo?: Express.Multer.File;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  brandGuide?: Express.Multer.File;
}
