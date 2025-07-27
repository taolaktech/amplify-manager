// create-brand.dto.ts
import {
  IsString,
  IsHexColor,
  IsEnum,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
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

export class CreateBrandDto {
  @IsString({
    message: 'Primary color must be a string',
  })
  @IsNotEmpty({
    message: 'Primary color is required',
  })
  @IsHexColor({
    message: 'Primary color must be a valid hexadecimal color code',
  })
  @Transform(({ value }) => value?.toUpperCase())
  primaryColor: string;

  @IsString({
    message: 'Secondary color must be a string',
  })
  @IsNotEmpty({
    message: 'Secondary color is required',
  })
  @IsHexColor({
    message: 'Secondary color must be a valid hexadecimal color code',
  })
  @Transform(({ value }) => value?.toUpperCase())
  secondaryColor: string;

  @IsEnum(SupportedFonts)
  @IsOptional()
  @Transform(({ value }) => value || SupportedFonts.OPEN_SANS)
  primaryFont: SupportedFonts = SupportedFonts.OPEN_SANS;

  @ApiPropertyOptional({
    description: 'The secondary font for the brand.',
    enum: SupportedFonts,
    default: SupportedFonts.OPEN_SANS,
  })
  @IsEnum(SupportedFonts)
  @IsOptional()
  @Transform(({ value }) => value || SupportedFonts.OPEN_SANS)
  secondaryFont: SupportedFonts = SupportedFonts.OPEN_SANS;

  @ApiPropertyOptional({
    description: "The brand's tone of voice.",
    enum: ToneOfVoice,
    default: ToneOfVoice.FRIENDLY,
  })
  @IsEnum(ToneOfVoice)
  @IsOptional()
  @Transform(({ value }) => value || ToneOfVoice.FRIENDLY)
  toneOfVoice: ToneOfVoice = ToneOfVoice.FRIENDLY;
}
