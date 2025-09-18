import { constants } from './constants.js';
import axios from 'axios';
import { BusinessInfoRes } from './types/business-info.js';
const businessAxiosInstance = axios.create({
  baseURL: `${constants.AMP_MANAGER_URL}/internal/business`,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': constants.AMP_MANAGER_API_KEY,
  },
});

export const getAmplifyBusinessById = async (businessId: string) => {
  try {
    const response = await businessAxiosInstance.get<BusinessInfoRes>(
      `/${businessId}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error occurred while getting business by Id');
    console.log(JSON.stringify({ error }));
    throw new Error('unable to get campaign');
  }
};

export const getTargetRoas = async (
  businessId: string,
  { budget }: { budget: number },
) => {
  try {
    const response = await businessAxiosInstance.post(
      `/${businessId}/calculate-target-roas`,
      { budget },
    );
    return response.data;
  } catch (error) {
    console.error('Error occurred while getting business by Id');
    console.log(JSON.stringify({ error }));
    throw new Error('unable to get campaign');
  }
};

export const saveGoogleIntegrationsInfo = async (
  businessId: string,
  {
    customerId,
    customerName,
    customerResourceName,
    conversionActionResourceName,
    conversionActionId,
    conversionActionTag,
    conversionActionLabel,
    tagSnippets,
  }: {
    customerId: string;
    customerName: string;
    customerResourceName: string;
    conversionActionResourceName: string;
    conversionActionId: string;
    conversionActionTag?: string;
    conversionActionLabel?: string;
    tagSnippets: string;
  },
) => {
  try {
    const response = await businessAxiosInstance.patch(
      `/${businessId}/save-googleads-customer-data
`,
      {
        customerId,
        customerName,
        customerResourceName,
        conversionActionResourceName,
        conversionActionId,
        conversionActionTag,
        conversionActionLabel,
        tagSnippets,
      },
    );
    return response.data;
  } catch (error) {
    console.error('Unable to store google ads data in business');
    console.log(JSON.stringify({ error }));
    throw new Error(`unable to store google ads data in business`);
  }
};
