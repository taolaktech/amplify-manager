import axios from 'axios';

const getIntegrationsHttpClient = () => {
  const baseUrl = process.env.AMP_INTEGRATIONS_URL;
  const apiKey = process.env.AMP_INTEGRATIONS_API_KEY;

  if (!baseUrl) throw new Error('AMP_INTEGRATIONS_URL is required');
  if (!apiKey) throw new Error('AMP_INTEGRATIONS_API_KEY is required');

  return axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });
};

const callIntegrationsStep1 = async (params: { campaignId: string }) => {
  // Calculate daily budget
  // Create budget resource
  // Calculate target roas
  // Calculate cpc bid ceiling and floor
  // Create target roas bidding strategy
  // Create campaign
  const { campaignId } = params;
  const integrationsHttp = getIntegrationsHttpClient();
  await integrationsHttp.post('/api/google-ads/campaign-orchestration/step-1', {
    campaignId,
  });
};

const callIntegrationsStep2 = async (params: { campaignId: string }) => {
  // Create ad groups
  // Create ad group ads
  const { campaignId } = params;
  const integrationsHttp = getIntegrationsHttpClient();
  await integrationsHttp.post('/api/google-ads/campaign-orchestration/step-2', {
    campaignId,
  });
};

const callIntegrationsStep3 = async (params: { campaignId: string }) => {
  // add keywords to all adgroups
  const { campaignId } = params;
  const integrationsHttp = getIntegrationsHttpClient();
  await integrationsHttp.post('/api/google-ads/campaign-orchestration/step-3', {
    campaignId,
  });
};

const callIntegrationsStep4 = async (params: { campaignId: string }) => {
  // add geo targeting to campaign
  const { campaignId } = params;
  const integrationsHttp = getIntegrationsHttpClient();
  await integrationsHttp.post('/api/google-ads/campaign-orchestration/step-4', {
    campaignId,
  });
};

const callIntegrationsStep5 = async (params: { campaignId: string }) => {
  // Enable campaign
  const { campaignId } = params;
  const integrationsHttp = getIntegrationsHttpClient();
  await integrationsHttp.post('/api/google-ads/campaign-orchestration/step-5', {
    campaignId,
  });
};

export const processCampaign = async (campaignId: string) => {
  console.log('\nstarting process...');

  await callIntegrationsStep1({ campaignId });
  await callIntegrationsStep2({ campaignId });
  await callIntegrationsStep3({ campaignId });
  await callIntegrationsStep4({ campaignId });
  await callIntegrationsStep5({ campaignId });
};
