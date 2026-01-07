export type GenerateKeywordIdeasResponse = {
  results: Result[];
  totalSize: string;
};

export type Result = {
  keywordIdeaMetrics: KeywordIdeaMetrics;
  text: string;
  keywordAnnotations: any;
};

export type KeywordIdeaMetrics = {
  competition: string;
  monthlySearchVolumes: MonthlySearchVolume[];
  avgMonthlySearches: string;
  competitionIndex: string;
  lowTopOfPageBidMicros: string;
  highTopOfPageBidMicros: string;
};

export type MonthlySearchVolume = {
  month: string;
  year: string;
  monthlySearches: string;
};
