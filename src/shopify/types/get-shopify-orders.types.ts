export interface GetShopifyOrdersResponse {
  orders: Orders;
}

export interface GetShopifyOrdersQuery {
  first?: number;
  after?: string;
  before?: string;
  last?: number;
  query?: string;
}

interface Orders {
  edges: Edge[];
  pageInfo: PageInfo;
}

interface Edge {
  node: Node;
}

interface Node {
  id: string;
  totalPriceSet: TotalPriceSet;
}

interface TotalPriceSet {
  shopMoney: ShopMoney;
}

interface ShopMoney {
  amount: string;
  currencyCode: string;
}

interface PageInfo {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startCursor: string;
  endCursor: string;
}
