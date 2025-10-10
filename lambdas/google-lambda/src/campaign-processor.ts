import {
  getAmplifyBusinessById,
  getTargetRoas,
  saveGoogleIntegrationsInfo,
} from './business.service.js';
import {
  getAmplifyCampaignById,
  saveGoogleAdsCampaignData,
  saveProcessingStatus,
} from './campaign.service.js';
import {
  createCampaignBudget,
  getCampaignByNameOrId,
  createConversionAction,
  createTargetRoasBiddingStrategy,
  createSearchCampaign,
  createAdGroup,
  createAdGroupAd,
  extractResourceNameFromCreateResponse,
  generateKeywordIdeas,
  addKeywordsToAdGroup,
  addGeoTargetingToCampaign,
  getConversionActionByNameOrId,
  createCustomer,
  extractResourceIdFromResourceName,
  extractConversionIdAndLabelFromEventSnippet,
  getAdGroupByNameOrId,
  updateGoogleCampaignStatus,
} from './google-ads.service.js';
import { BusinessInfoType } from './types/business-info.js';
import { CampaignInfoType } from './types/campaign-info.js';
import { GoogleAdsProcessingStatus } from './types/save-google-campaign-data.js';
import {
  countryCodeMap,
  generateRandomString,
  trimDescription,
  trimHeadline,
  formatCampaignName,
} from './utils.js';

const getAdAssetsFromCampaign = ({
  campaignInfo,
}: {
  campaignInfo: CampaignInfoType;
}) => {
  const headlines = [];
  const descriptions = [];
  const finalUrls = [];

  for (const product of campaignInfo.products) {
    finalUrls.push(product.productLink);
    for (const creative of product.creatives) {
      if (creative.channel === 'google') {
        for (const d of creative.data) {
          const datum = JSON.parse(d);
          if (datum.headline) {
            headlines.push(trimHeadline(datum.headline, 30));
          }
          if (datum.description) {
            descriptions.push(trimDescription(datum.description, 90));
          }
        }
      }
    }
  }

  return { headlines, descriptions, finalUrls };
};

const calculateDailyBudget = ({
  totalBudget,
  startDate,
  endDate,
}: {
  totalBudget: number;
  startDate: string;
  endDate: string;
}) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date string');
  }

  if (end < start) {
    throw new Error('End date must be after start date');
  }

  if (start < new Date()) {
    throw new Error('Start date must be in the future');
  }

  // Calculate number of days inclusive
  const diffInMs = end.getTime() - start.getTime();
  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1;

  const budget = totalBudget / days;
  return Math.floor(budget * 100) / 100;
};

const handleCustomerAndConversionActionCreation = async ({
  businessInfo,
}: {
  businessInfo: BusinessInfoType;
}) => {
  const TIME_ZONE = 'America/Chicago';
  const CURRENCY_CODE = 'USD';
  const BUSINESS_ID = businessInfo._id;
  const customerName = `${businessInfo.companyName}-${businessInfo._id}`;

  console.log(`\nCreating new customer... ${customerName}`);
  const createCustomerRes = await createCustomer({
    customerName,
    currencyCode: CURRENCY_CODE,
    timeZone: TIME_ZONE,
  });

  const customerResourceName =
    extractResourceNameFromCreateResponse(createCustomerRes);
  const customerId = extractResourceIdFromResourceName(customerResourceName);

  console.log(`\ncreating conversion action...`);
  const conversionActionResp = await createConversionAction({
    customerId: customerId,
    name: `${customerName}-conversion-action`,
  });
  const conversionActionResourceName =
    extractResourceNameFromCreateResponse(conversionActionResp);
  const conversionActionId = extractResourceIdFromResourceName(
    conversionActionResourceName,
  );

  console.log('\ngetting conversion action details...');
  const conversionActionGetRes = await getConversionActionByNameOrId({
    customerId: customerId,
    id: conversionActionId,
  });

  const tagSnippets =
    conversionActionGetRes.results?.[0]?.conversionAction?.tagSnippets;
  const { conversionTag, label } = extractConversionIdAndLabelFromEventSnippet(
    tagSnippets?.[0].eventSnippet,
  );

  console.log('saving customer and conversion action details...');
  await saveGoogleIntegrationsInfo(BUSINESS_ID, {
    customerId: customerId,
    customerName,
    customerResourceName,
    conversionActionResourceName,
    conversionActionId,
    conversionActionTag: conversionTag,
    conversionActionLabel: label,
    tagSnippets,
  });

  console.log('customer creation successful...');
  return { customerId };
};

const handleCampaignCreation = async ({
  businessInfo,
  campaignInfo,
  CUSTOMER_ID,
}: {
  businessInfo: BusinessInfoType;
  campaignInfo: CampaignInfoType;
  CUSTOMER_ID: string;
}) => {
  const START_DATE = campaignInfo.startDate;
  const END_DATE = campaignInfo.endDate;

  const G_CAMPAIGN_NAME = formatCampaignName(
    `${campaignInfo.name ?? ''}_${campaignInfo._id}`,
  );
  const googleAdsBudgetAmount =
    +campaignInfo.totalBudget / +campaignInfo.platforms.length;

  const CAMPAIGN_BUDGET_AMOUNT = calculateDailyBudget({
    totalBudget: googleAdsBudgetAmount,
    startDate: START_DATE,
    endDate: END_DATE,
  });

  // target roas
  const targetRoasRes = await getTargetRoas(businessInfo._id, {
    budget: googleAdsBudgetAmount,
  });
  const TARGET_ROAS = Math.min(+targetRoasRes.targetRoas['googleSearch'], 1000);
  const CPC_BID_CEILING = Math.ceil((CAMPAIGN_BUDGET_AMOUNT * 0.8) / 10);
  const CPC_BID_FLOOR = Math.ceil((CAMPAIGN_BUDGET_AMOUNT * 0.2) / 10);

  console.log('\nchecking if campaign exists on account...');
  let campaignRes = await getCampaignByNameOrId({
    customerId: CUSTOMER_ID,
    name: G_CAMPAIGN_NAME,
  });

  let campaignResourceName = campaignRes.results?.[0]?.campaign?.resourceName;

  if (!campaignResourceName) {
    console.log(
      `\ncampaign does not exist. Now creating campaign...${G_CAMPAIGN_NAME}`,
    );
    await saveProcessingStatus(
      campaignInfo._id,
      GoogleAdsProcessingStatus.CREATING_BUDGET,
    );
    console.log(
      `\ncreating campaign budget, $_${CAMPAIGN_BUDGET_AMOUNT} per day ...`,
    );
    const campaignBudgetName = `${G_CAMPAIGN_NAME} ${generateRandomString()}`;
    const budgetResultRes = await createCampaignBudget({
      customerId: CUSTOMER_ID,
      campaignBudgetName,
      amount: CAMPAIGN_BUDGET_AMOUNT,
    });
    const budgetResourceName =
      extractResourceNameFromCreateResponse(budgetResultRes);

    await saveProcessingStatus(
      campaignInfo._id,
      GoogleAdsProcessingStatus.CREATING_BIDDING_STRATEGY,
    );
    console.log(
      `\ncreating target roas bidding strategy, value- ${TARGET_ROAS}...`,
    );
    const biddingStrategyName = `${G_CAMPAIGN_NAME} ${generateRandomString()}`;
    const biddingStrategyRes = await createTargetRoasBiddingStrategy({
      customerId: CUSTOMER_ID,
      biddingStrategyName,
      targetRoas: TARGET_ROAS,
      cpcBidCeiling: CPC_BID_CEILING,
      cpcBidFloor: CPC_BID_FLOOR,
    });
    const biddingStrategyResourceName =
      extractResourceNameFromCreateResponse(biddingStrategyRes);

    await saveProcessingStatus(
      campaignInfo._id,
      GoogleAdsProcessingStatus.CREATING_CAMPAIGN,
    );
    console.log('\ncreating campaign with budget and bidding strategy...');
    campaignRes = await createSearchCampaign({
      customerId: CUSTOMER_ID,
      campaignName: G_CAMPAIGN_NAME,
      budgetResourceName,
      biddingStrategy: biddingStrategyResourceName,
      startDate: START_DATE,
      endDate: END_DATE,
    });

    campaignResourceName = extractResourceNameFromCreateResponse(campaignRes);

    await saveGoogleAdsCampaignData(campaignInfo._id, {
      campaignResourceName,
      campaignName: G_CAMPAIGN_NAME,
      campaignType: 'SEARCH',
      campaignStatus: 'PAUSED',
      budgetResourceName,
      budgetAmountMicros: CAMPAIGN_BUDGET_AMOUNT * 1_000_000,
      biddingStrategyResourceName,
      biddingStrategyType: 'TARGET_ROAS',
    });
  }
  return { campaignResourceName, campaignName: G_CAMPAIGN_NAME };
};

const handleAdGroupsCreation = async ({
  G_CAMPAIGN_NAME,
  CAMPAIGN_RESOURCE_NAME,
  CUSTOMER_ID,
}: {
  G_CAMPAIGN_NAME: string;
  CAMPAIGN_RESOURCE_NAME: string;
  CUSTOMER_ID: string;
}) => {
  const NUMBER_OF_AD_GROUPS = 1;
  const adGroups = [];
  console.log(`\nCreating ${NUMBER_OF_AD_GROUPS} ad-groups...`);

  for (let i = 1; i <= NUMBER_OF_AD_GROUPS; i++) {
    console.log(`\ncreating ad-group-${i} for ${G_CAMPAIGN_NAME}...`);
    const adGroupName = `ad_group_${i}`;
    console.log(
      `\nchecking if adgroup ${adGroupName} already exists... getting ad group`,
    );
    const res = await getAdGroupByNameOrId({
      customerId: CUSTOMER_ID,
      campaignResourceName: CAMPAIGN_RESOURCE_NAME,
      name: adGroupName,
    });

    let adGroupResourceName = res.results?.[0]?.adGroup?.resourceName;

    if (!adGroupResourceName) {
      console.log(
        `\nadgroup ${adGroupName} doesn't exists... creating ad group`,
      );
      const adGroupRes = await createAdGroup({
        adGroupName,
        campaignResourceName: CAMPAIGN_RESOURCE_NAME,
      });
      adGroupResourceName = extractResourceNameFromCreateResponse(adGroupRes);
    }
    adGroups.push({
      adGroupName,
      adGroupResourceName,
    });
  }

  return adGroups;
};

const handleKeywordGenAndAdditionToAdGroups = async ({
  campaignInfo,
  CUSTOMER_ID,
  adGroups,
  SHOPIFY_URL,
}: {
  campaignInfo: CampaignInfoType;
  businessInfo: BusinessInfoType;
  CUSTOMER_ID: string;
  adGroups: { adGroupName: string; adGroupResourceName: string }[];
  SHOPIFY_URL: string | undefined;
}) => {
  console.log(`\ngetting shopify account from business`);

  const adGroupResourceNames = adGroups.map(
    (adGroup) => adGroup.adGroupResourceName,
  );

  if (!SHOPIFY_URL) {
    throw new Error(`shopify url not found`);
  }

  console.log('\ngenerating keyword ideas...');
  const generatedKeywords = await generateKeywordIdeas(
    {
      customerId: CUSTOMER_ID,
      url: SHOPIFY_URL,
      keywords: [],
    },
    { pageSize: 25 },
  );

  const keywordTexts = generatedKeywords.results.map((result) => result.text);

  const assignments: string[][] = adGroupResourceNames.map(() => []);

  keywordTexts.forEach((keyword, index) => {
    const groupIndex = index % adGroupResourceNames.length;
    assignments[groupIndex].push(keyword);
  });

  console.log('\nadding keywords to ad groups...');

  for (const [index, adGroupResourceName] of adGroupResourceNames.entries()) {
    console.log(`\nadding keywords to ${adGroupResourceName}...`);
    await addKeywordsToAdGroup({
      adGroupResourceName,
      exactMatchKeywords: assignments[index],
      broadMatchKeywords: assignments[index],
      phraseMatchKeywords: assignments[index],
    });
  }

  await saveGoogleAdsCampaignData(campaignInfo._id, {
    keywordsAddedToAdGroups: true,
  });
};

const handleAdGroupAdCreation = async ({
  adGroups,
  SHOPIFY_URL,
  campaignInfo,
}: {
  adGroups: { adGroupName: string; adGroupResourceName: string }[];
  SHOPIFY_URL?: string;
  campaignInfo: CampaignInfoType;
}) => {
  const NUMBER_OF_AD_GROUP_ADS_PER_ADGROUP = 2;
  console.log(
    `\ncreating ${NUMBER_OF_AD_GROUP_ADS_PER_ADGROUP} ads per ad group...`,
  );
  const { headlines, descriptions, finalUrls } = getAdAssetsFromCampaign({
    campaignInfo,
  });

  if (headlines.length < NUMBER_OF_AD_GROUP_ADS_PER_ADGROUP * 3) {
    throw new Error(
      `Not enough headlines for ad creation, need at least 6, got ${headlines.length}`,
    );
  }
  if (descriptions.length < NUMBER_OF_AD_GROUP_ADS_PER_ADGROUP * 3) {
    throw new Error(
      `Not enough descriptions for ad creation, need at least 6, got ${descriptions.length}`,
    );
  }

  function getRange(i: number, totalAds: number, totalAssets: number) {
    /*
      The function divides totalAssets across totalAds.
      Each ad gets at least 3 assets.
      Extra assets (from uneven division) are given to the first few ads.
      For each ad i, it returns the start (a) and end (b) indexes to slice assets from an array.

      i=1; 0, 3 -headlines[0:3]
      i=2; 3, 6 -headlines[3:6]
    */
    if (i <= 0 || !Number.isInteger(i)) {
      throw new Error('i must be a positive integer');
    }

    // Divide equally
    const baseSize = Math.floor(totalAssets / totalAds);
    const extra = totalAssets % totalAds; // leftover assets to distribute
    const minSize = 3; // each ad must have at least 3 headlines // description

    // Calculate size for this ad
    let size = baseSize + (i <= extra ? 1 : 0);
    if (size < minSize) size = minSize;

    // Start index = sum of all previous sizes
    let start = 0;
    for (let j = 1; j < i; j++) {
      let prevSize = baseSize + (j <= extra ? 1 : 0);
      if (prevSize < minSize) prevSize = minSize;
      start += prevSize;
    }

    const end = start + size;

    return { a: start, b: end };
  }

  const adGroupsToSave = [];
  for (const adGroup of adGroups) {
    const adGroupInfo = {
      resourceName: adGroup.adGroupResourceName,
      name: adGroup.adGroupName,
      status: 'ENABLED',
      type: 'SEARCH_STANDARD',
      ads: [] as { resourceName?: string; name?: string; status?: string }[],
    };
    // 3 headlines and 3 descriptions per adGroupAd
    for (let i = 1; i <= NUMBER_OF_AD_GROUP_ADS_PER_ADGROUP; i++) {
      const adGroupAdName = `${adGroup.adGroupName}_adGroupAd_${i}`;
      const { a: headlineStart, b: headlineEnd } = getRange(
        i,
        NUMBER_OF_AD_GROUP_ADS_PER_ADGROUP,
        headlines.length,
      );
      const { a: descripionStart, b: descriptionEnd } = getRange(
        i,
        NUMBER_OF_AD_GROUP_ADS_PER_ADGROUP,
        descriptions.length,
      );
      console.log(`\ncreating adGroupAd ${adGroupAdName}...`);
      const adGroupAdRes = await createAdGroupAd({
        adGroupAdName,
        adGroupResourceName: adGroup.adGroupResourceName,
        finalUrls: SHOPIFY_URL ? [SHOPIFY_URL, ...finalUrls] : [...finalUrls],
        headlines: headlines.slice(headlineStart, headlineEnd),
        descriptions: descriptions.slice(descripionStart, descriptionEnd),
      });
      const adGroupAdResourceName =
        extractResourceNameFromCreateResponse(adGroupAdRes);
      const ad = {
        resourceName: adGroupAdResourceName,
        name: adGroupAdName,
        status: 'ENABLED',
      };
      adGroupInfo.ads.push(ad);
    }
    adGroupsToSave.push(adGroupInfo);
  }

  await saveGoogleAdsCampaignData(campaignInfo._id, {
    adGroups: adGroupsToSave,
  });
};

const handleGeoTargeting = async ({
  campaignInfo,
  campaignResourceName,
}: {
  campaignInfo: CampaignInfoType;
  campaignResourceName: string;
}) => {
  const LOCALE = 'en';
  // const COUNTRY_CODE = "US";
  // const LOCATION_NAMES = ["san francisco", "texas", "new york"];

  // { country: [city1, state1, ]}
  const locations = campaignInfo?.location?.reduce(
    (acc, loc) => {
      const country =
        loc.country.length === 3 ? countryCodeMap[loc.country] : loc.country;
      if (!country || country.length !== 2) {
        return acc;
      }
      if (acc[country]) {
        acc[country].push(loc.state, loc.city);
      } else {
        acc[country] = [loc.state, loc.city];
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );
  console.log('\nadd geo-targeting to campaign...');

  for (const country of Object.keys(locations)) {
    await addGeoTargetingToCampaign({
      campaignResourceName,
      locale: LOCALE,
      countryCode: country,
      locationNames: locations[country],
    });
  }

  await saveGoogleAdsCampaignData(campaignInfo._id, {
    geotargetingAddedToCampaign: true,
  });
};

export const processCampaign = async (campaignId: string) => {
  console.log('\nstarting process...');

  const { data: campaignInfo } = await getAmplifyCampaignById(campaignId);

  //save processing status
  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.INITIALIZING,
  );

  if (!campaignInfo.platforms.includes('GOOGLE')) {
    const message = `GOOGLE not among platforms- ${campaignInfo.platforms.join(', ')}`;
    console.error(message);
    throw new Error(message);
  }

  const { business: businessInfo } = await getAmplifyBusinessById(
    campaignInfo.businessId,
  );

  //save processing status
  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.INITIALIZED,
  );

  const BUSINESS_ID = businessInfo._id;
  const SHOPIFY_URL = businessInfo.integrations?.shopify?.shopifyAccount?.url;

  console.log('\nchecking for google ads customer in business...');
  let CUSTOMER_ID = businessInfo?.integrations?.googleAds?.customerId;
  if (!CUSTOMER_ID) {
    console.log(
      '\ngoogle ads customer not found on business, creating new customer...',
    );
    //save processing status
    await saveProcessingStatus(
      campaignInfo._id,
      GoogleAdsProcessingStatus.CREATING_CUSTOMER,
    );

    const customerHandlerRes = await handleCustomerAndConversionActionCreation({
      businessInfo,
    });

    await saveProcessingStatus(
      campaignInfo._id,
      GoogleAdsProcessingStatus.CUSTOMER_CREATED,
    );

    CUSTOMER_ID = customerHandlerRes.customerId;
  } else {
    console.log('\ngoogle ads customer found on business and ready to go...');
  }

  console.log({ CUSTOMER_ID, BUSINESS_ID });

  console.log('\nhandling campaign creation...');
  const handleCampaignCreationRes = await handleCampaignCreation({
    businessInfo,
    campaignInfo,
    CUSTOMER_ID,
  });

  const CAMPAIGN_RESOURCE_NAME = handleCampaignCreationRes.campaignResourceName;
  const G_CAMPAIGN_NAME = handleCampaignCreationRes.campaignName;

  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.CREATING_AD_GROUPS,
  );

  console.log(`\ncreating ad groups for ${CAMPAIGN_RESOURCE_NAME}...`);
  const adGroups = await handleAdGroupsCreation({
    G_CAMPAIGN_NAME,
    CAMPAIGN_RESOURCE_NAME,
    CUSTOMER_ID,
  });
  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.AD_GROUPS_CREATED,
  );

  //save processing status
  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.CREATING_AD_GROUP_ADS,
  );
  console.log('\ncreating adGroupAd for each adGroup...');
  await handleAdGroupAdCreation({ adGroups, SHOPIFY_URL, campaignInfo });
  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.AD_GROUP_ADS_CREATED,
  );

  //save processing status
  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.GENERATING_KEYWORDS,
  );
  console.log('\ngenerating keywords and adding them to adgroups...');
  await handleKeywordGenAndAdditionToAdGroups({
    campaignInfo,
    businessInfo,
    CUSTOMER_ID,
    adGroups,
    SHOPIFY_URL,
  });
  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.KEYWORDS_ADDED,
  );

  //save processing status
  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.ADDING_GEO_TARGETING,
  );

  console.log(`\nadding geo targeting to campaign....`);
  await handleGeoTargeting({
    campaignInfo,
    campaignResourceName: CAMPAIGN_RESOURCE_NAME,
  });

  console.log(`\nenabling(launching) campaign on google....`);
  await updateGoogleCampaignStatus({
    campaignResourceName: CAMPAIGN_RESOURCE_NAME,
    status: 'ENABLED',
  });

  await saveGoogleAdsCampaignData(campaignInfo._id, {
    campaignStatus: 'ENABLED',
  });

  //save processing status
  await saveProcessingStatus(
    campaignInfo._id,
    GoogleAdsProcessingStatus.LAUNCHED,
  );
};
