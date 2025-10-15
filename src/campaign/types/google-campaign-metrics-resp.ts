export type GetGoogleCampaignMetrics = {
  results: [
    {
      campaign: {
        resourceName: string;
        status: string;
        name: string;
        id: string;
      };
      metrics: {
        clicks: string;
        conversionsValue: number;
        conversions: number;
        costMicros: string;
        impressions: string;
      };
    },
  ];
  fieldMask: string; //'campaign.id,campaign.name,campaign.status,metrics.impressions,metrics.clicks,metrics.conversions,metrics.conversionsValue,metrics.costMicros,metrics.ctr,metrics.averageCpc,metrics.conversionsFromInteractionsRate,metrics.valuePerConversion';
  queryResourceConsumption: string; //'1202';
};
