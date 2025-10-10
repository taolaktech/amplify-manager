import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { GoogleAdsProcessingStatus } from 'src/enums/campaign';

class AdGroupAd {
  @ApiProperty()
  @IsOptional()
  @IsString()
  resourceName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  status: string;
}

class AdGroup {
  @ApiProperty()
  @IsOptional()
  @IsString()
  resourceName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  status: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  type: string;

  @ApiProperty({ type: [AdGroupAd], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdGroupAd)
  ads: AdGroupAd[];
}

export class SaveGoogleAdsCampaignDataDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  campaignResourceName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  campaignName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  campaignType?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  campaignStatus?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  budgetResourceName?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  budgetAmountMicros?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  biddingStrategyResourceName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  biddingStrategyType?: string;

  @ApiProperty({ type: [AdGroup], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdGroup)
  adGroups: AdGroup[];

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  keywordsAddedToAdGroups?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  geotargetingAddedToCampaign?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsEnum(GoogleAdsProcessingStatus)
  processingStatus?: GoogleAdsProcessingStatus;

  @ApiProperty()
  @IsOptional()
  @IsEnum(GoogleAdsProcessingStatus)
  processingStatusBeforeFailure?: GoogleAdsProcessingStatus;
}
