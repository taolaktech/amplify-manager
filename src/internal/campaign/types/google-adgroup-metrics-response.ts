export interface GoogleAdGroupMetricsResponse {
  results: Result[];
  fieldMask: string;
  queryResourceConsumption: string;
}

interface Result {
  adGroup: AdGroup;
  metrics: Metrics;
}

interface AdGroup {
  resourceName: string;
  status: string;
  type: string;
  id: string;
  name: string;
  campaign: string;
  cpcBidMicros: string;
  cpmBidMicros: string;
  targetCpaMicros: string;
  cpvBidMicros: string;
  targetCpmMicros: string;
  effectiveTargetCpaMicros: string;
  effectiveTargetRoas: number;
  targetCpvMicros: string;
}

interface Metrics {
  clicks: string;
  conversionsValue: number;
  conversions: number;
  costMicros: string;
  impressions: string;
}
