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
};
