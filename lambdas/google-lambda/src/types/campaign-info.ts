export type CampaignInfoType = {
  _id: string;
  createdBy: string;
  status: string;
  businessId: string;
  shopifyAccountId: string;
  name?: string;
  type: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  products: Product[];
  location: Location[];
  platforms: string[];
  createdAt: string;
  updatedAt: string;
  __v: number;
};

export type Location = {
  country: string;
  city: string;
  state: string;
};

export type Product = {
  shopifyId: string;
  title: string;
  price: number;
  description: string;
  features: string[];
  category: string;
  imageLink: string;
  productLink: string;
  creatives: Creative[];
};

export type Creative = {
  id: string;
  channel: string;
  data: string[];
};
