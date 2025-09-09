import { constants } from './constants.js';
import axios from 'axios';
import { SaveGoogleAdsCampaignData } from './types/save-google-campaign-data.js';
import { CampaignInfoType } from './types/campaign-info.js';

export const campaignsAxiosInstance = axios.create({
  baseURL: `${constants.AMP_MANAGER_URL}/internal/campaign`,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': constants.AMP_MANAGER_API_KEY,
  },
});

export const getAmplifyCampaignById = async (campaignId: string) => {
  try {
    const response = await campaignsAxiosInstance.get<{
      data: CampaignInfoType;
    }>(`/${campaignId}`);
    return response.data;
  } catch (error) {
    console.error('Error occurred while getting campaign by Id');
    throw error;
  }
};

export const saveGoogleAdsCampaignData = async (
  campaignId: string,
  googleAdsData: SaveGoogleAdsCampaignData,
) => {
  try {
    const response = await campaignsAxiosInstance.patch(
      `/${campaignId}/google-ads/save-data`,
      googleAdsData,
    );
    return response.data;
  } catch (error) {
    console.error('Error occurred while saving google ads campaign data');
    throw error;
  }
};
