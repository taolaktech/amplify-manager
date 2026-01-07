export type BusinessInfoRes = {
  business: BusinessInfoType;
};

export type BusinessInfoType = {
  _id: string;
  userId: string;
  brandAssets: any[];
  shopifyAccounts: string[];
  integrations?: Integrations;
  currencyCode: string;
  website: string;
  companyName: string;
  shopifyBrandAssets: ShopifyBrandAssets;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  industry: string;
};

type Integrations = {
  shopify: Shopify;
  googleAds?: GoogleAds;
};

type GoogleAds = {
  customerId: string;
  customerName: string;
  customerResourceName: string;
  conversionAction: ConversionAction;
};

type ConversionAction = {
  resourceName: string;
  id: string;
  tagSnippets: TagSnippet[];
};

type TagSnippet = {
  type: string;
  pageFormat: string;
  globalSiteTag: string;
  eventSnippet: string;
};

type Shopify = {
  shopifyAccount: ShopifyAccount;
};

type ShopifyAccount = {
  _id: string;
  shop: string;
  belongsTo: string;
  __v: number;
  accessToken: string;
  accountStatus: string;
  createdAt: Date;
  currencyCode: string;
  myshopifyDomain: string;
  scope: string;
  shopId: string;
  updatedAt: Date;
  url: string;
};

type ShopifyBrandAssets = {
  colors: Colors;
};

type Colors = {
  primary: any[];
  secondary: any[];
};
