import { constants } from './constants.js';
import axios from 'axios';
import { GenerateKeywordIdeasResponse } from './types/generate-keyword-ideas.js';

const googleAdsAxiosInstance = axios.create({
  baseURL: `${constants.AMP_INTEGRATIONS_URL}/api/google-ads`,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': constants.AMP_MANAGER_API_KEY,
  },
});

const errorHandler = (error: any, message: string) => {
  if (error.response?.data?.duplicateName) {
    return { duplicateName: true };
  }
  console.error(message.toUpperCase());
  throw error;
};

export const extractResourceNameFromCreateResponse = (
  googleAdsApiCreateResp: any,
) => {
  return (
    googleAdsApiCreateResp.resourceName ||
    googleAdsApiCreateResp.response?.results?.[0]?.resourceName ||
    googleAdsApiCreateResp.results?.[0]?.resourceName
  );
};

export const extractResourceIdFromResourceName = (
  resourceName: `${string}/${string}/${string}/${string}`,
) => {
  const parts = resourceName.split('/');
  return parts[parts.length - 1];
};

export const extractConversionIdAndLabelFromEventSnippet = (
  eventSnippet: string,
) => {
  const match = eventSnippet.match(/"send_to":\s*\[\s*"AW-(\d+)\/([\w-]+)"/);
  let conversionTag;
  let label;
  if (match) {
    conversionTag = `AW-${match[1]}`;
    label = match[2];
  }
  return { conversionTag, label };
};

export const createCustomer = async ({
  customerName,
  currencyCode,
  timeZone,
}: {
  customerName: string;
  currencyCode: string;
  timeZone: string;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post('/customers/create', {
      customerName,
      currencyCode,
      timeZone,
    });
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error creating customer:');
  }
};

export const createConversionAction = async ({
  customerId,
  name,
}: {
  customerId: string;
  name: string;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      '/conversion-actions/create',
      { customerId, name },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error creating conversion action:');
  }
};

export const getConversionActionByNameOrId = async ({
  customerId,
  name,
  id,
}: {
  customerId: string;
  name?: string;
  id?: string;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      `/conversion-actions/get-by-name-or-id`,
      { customerId, name, id },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error getting conversion action:');
  }
};

export const createTargetRoasBiddingStrategy = async ({
  customerId,
  biddingStrategyName,
  targetRoas,
  cpcBidCeiling,
  cpcBidFloor,
}: {
  customerId: string;
  biddingStrategyName: string;
  targetRoas: number;
  cpcBidCeiling: number;
  cpcBidFloor: number;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      '/bidding-strategy/target-roas/create',
      {
        customerId,
        biddingStrategyName,
        targetRoas,
        cpcBidCeiling,
        cpcBidFloor,
      },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error creating target-roas bidding strategy:');
  }
};

export const getBiddingStrategyByNameOrId = async ({
  customerId,
  name,
  id,
}: {
  customerId: string;
  name?: string;
  id?: string;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      `/bidding-strategy/get-by-name-or-id`,
      { customerId, name, id },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error getting bidding strategy:');
  }
};

export const createCampaignBudget = async ({
  customerId,
  campaignBudgetName,
  amount,
}: {
  customerId: string;
  campaignBudgetName: string;
  amount: number;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      '/campaign-budgets/create',
      { customerId, campaignBudgetName, amount },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error creating campaign budget:');
  }
};

export const getCampaignByNameOrId = async ({
  customerId,
  name,
  id,
}: {
  customerId: string;
  name?: string;
  id?: string;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      `/campaigns/get-by-name-or-id`,
      { customerId, name, id },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error getting campaign:');
  }
};

export const createSearchCampaign = async ({
  customerId,
  campaignName,
  budgetResourceName,
  biddingStrategy,
  startDate,
  endDate,
}: {
  customerId: string;
  campaignName: string;
  budgetResourceName: string;
  biddingStrategy: string;
  startDate: string;
  endDate: string;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      '/campaigns/search-campaign/create',
      {
        customerId,
        campaignName,
        budgetResourceName,
        biddingStrategy,
        startDate,
        endDate,
      },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error creating campaign:');
  }
};

export const updateGoogleCampaignStatus = async ({
  campaignResourceName,
  status,
}: {
  campaignResourceName: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      '/campaigns/update-status',
      {
        campaignResourceName,
        status,
      },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error updating google campaign status');
  }
};

export const createAdGroup = async ({
  adGroupName,
  campaignResourceName,
}: {
  adGroupName: string;
  campaignResourceName: string;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post('/ad-groups/create', {
      adGroupName,
      campaignResourceName,
    });
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error creating ad group:');
  }
};

export const getAdGroupByNameOrId = async ({
  customerId,
  campaignResourceName,
  name,
  id,
}: {
  customerId: string;
  campaignResourceName: string;
  name?: string;
  id?: string;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      `/ad-groups/get-by-name-or-id`,
      { customerId, campaignResourceName, name, id },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error getting adgroup:');
  }
};

export const createAdGroupAd = async ({
  adGroupAdName,
  adGroupResourceName,
  finalUrls,
  headlines,
  descriptions,
  path1,
  path2,
}: {
  adGroupAdName: string;
  adGroupResourceName: string;
  finalUrls: string[];
  headlines: string[];
  descriptions: string[];
  path1?: string;
  path2?: string;
}) => {
  /*
  {
    "adGroupAdName": "string",
    "adGroupResourceName": "string",
    "finalUrls": ["string"],
    "headlines": ["string"],
    "descriptions": ["string"],
    "path1"?: "string",
    "path2"?: "string"
  }
  */
  try {
    const response = await googleAdsAxiosInstance.post('/ad-group-ads/create', {
      adGroupAdName,
      adGroupResourceName,
      finalUrls,
      headlines,
      descriptions,
      path1,
      path2,
    });
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error creating ad group ad');
  }
};

export const getAdGroupAdByNameOrId = async ({
  customerId,
  campaignResourceName,
  name,
  id,
}: {
  customerId: string;
  campaignResourceName: string;
  name?: string;
  id?: string;
}) => {
  try {
    const response = await googleAdsAxiosInstance.post(
      `/ad-groups/get-by-name-or-id`,
      { customerId, campaignResourceName, name, id },
    );
    return response.data;
  } catch (error) {
    return errorHandler(error, 'Error getting adgroup:');
  }
};

export const generateKeywordIdeas = async (
  {
    customerId,
    url,
    keywords,
  }: {
    customerId: string;
    url?: string;
    keywords?: string[];
  },
  options = { pageSize: 25 },
) => {
  /* {
  "customerId": "string",
  "url"?: "string",
  "keywords"?: ["string"] */
  try {
    const response =
      await googleAdsAxiosInstance.post<GenerateKeywordIdeasResponse>(
        `keyword-ideas/generate?pageSize=${options.pageSize}`,
        { customerId, url, keywords },
      );
    return response.data;
  } catch (error) {
    console.error('Error generating keyword ideas', error);
    throw error;
  }
};

export const addKeywordsToAdGroup = async ({
  adGroupResourceName,
  exactMatchKeywords,
  broadMatchKeywords,
  phraseMatchKeywords,
}: {
  adGroupResourceName: string;
  exactMatchKeywords: string[];
  broadMatchKeywords: string[];
  phraseMatchKeywords: string[];
}) => {
  /* {
  "adGroupResourceName": "string",
  "exactMatchKeywords": ["string"],
  "broadMatchKeywords": ["string"],
  "phraseMatchKeywords": ["string"]
} */

  try {
    const response = await googleAdsAxiosInstance.post(
      '/ad-groups/add-keywords',
      {
        adGroupResourceName,
        exactMatchKeywords,
        broadMatchKeywords,
        phraseMatchKeywords,
      },
    );
    return response.data;
  } catch (error) {
    console.error('Error adding keywords to ad group', error);
    throw error;
  }
};

export const addGeoTargetingToCampaign = async ({
  campaignResourceName,
  locale,
  countryCode,
  locationNames,
}: {
  campaignResourceName: string;
  locale: string;
  countryCode: string;
  locationNames: string[];
}) => {
  /* {
  "campaignResourceName": "string",
  "locale": "string",
  "countryCode": "string",
  "locationNames": ["string"]
} */

  try {
    const response = await googleAdsAxiosInstance.post(
      '/campaigns/add-geo-targeting',
      {
        campaignResourceName,
        locale,
        countryCode,
        locationNames,
      },
    );
    return response.data;
  } catch (error) {
    console.error('Error adding keywords to ad group', error);
    throw error;
  }
};
