import { IsBoolean, IsOptional } from 'class-validator';
import { CreateBrandDto } from './create-brand-asset.dto';
import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandAssetDto extends PartialType(CreateBrandDto) {
  @ApiPropertyOptional({
    description:
      'Set to true to remove the existing primary logo. This is ignored if a new primaryLogo file is uploaded in the same request.',
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  removePrimaryLogo?: boolean;

  @ApiPropertyOptional({
    description:
      'Set to true to remove the existing secondary logo. This is ignored if a new secondaryLogo file is uploaded in the same request.',
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  removeSecondaryLogo?: boolean;

  @ApiPropertyOptional({
    description:
      'Set to true to remove the existing brand guide. This is ignored if a new brandGuide file is uploaded in the same request.',
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  removeBrandGuide?: boolean;
}
