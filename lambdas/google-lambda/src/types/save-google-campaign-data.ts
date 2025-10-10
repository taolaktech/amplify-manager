type AdGroupAd = {
  resourceName?: string;
  name?: string;
  status?: string;
};

type AdGroup = {
  resourceName?: string;
  name?: string;
  status?: string;
  type?: string;
  ads?: AdGroupAd[];
};

export type SaveGoogleAdsCampaignData = {
  campaignResourceName?: string;
  campaignName?: string;
  campaignType?: string;
  campaignStatus?: string;
  budgetResourceName?: string;
  budgetAmountMicros?: number;
  biddingStrategyResourceName?: string;
  biddingStrategyType?: string;
  adGroups?: AdGroup[];
  keywordsAddedToAdGroups?: boolean;
  geotargetingAddedToCampaign?: boolean;
  processingStatus?: GoogleAdsProcessingStatus;
  processingStatusBeforeFailure?: GoogleAdsProcessingStatus;
};

export enum GoogleAdsProcessingStatus {
  PENDING = 'PENDING',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
  CREATING_CUSTOMER = 'CREATING_CUSTOMER',
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CREATING_BUDGET = 'CREATING_BUDGET',
  CREATING_BIDDING_STRATEGY = 'CREATING_BIDDING_STRATEGY',
  CREATING_CAMPAIGN = 'CREATING_CAMPAIGN',
  CREATING_AD_GROUPS = 'CREATING_AD_GROUPS',
  AD_GROUPS_CREATED = 'AD_GROUPS_CREATED',
  CREATING_AD_GROUP_ADS = 'CREATING_AD_GROUPS_ADS',
  AD_GROUP_ADS_CREATED = 'AD_GROUP_ADS_CREATED',
  GENERATING_KEYWORDS = 'GENERATING_KEYWORDS',
  KEYWORDS_ADDED = 'KEYWORDS_ADDED',
  ADDING_GEO_TARGETING = 'GEO_TARGETING_ADDED',
  LAUNCHING = 'LAUNCHING',
  LAUNCHED = 'LAUNCHED',
  FAILED = 'FAILED',
}
