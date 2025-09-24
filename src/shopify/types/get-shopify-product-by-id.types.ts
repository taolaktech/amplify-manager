export interface GetShopifyProductByIdResponse {
  shop: Shop;
  productByIdentifier: ProductByIdentifier;
}

interface ProductByIdentifier {
  id: string;
  status: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  tags: any[];
  onlineStoreUrl: null;
  onlineStorePreviewUrl: string;
  hasOnlyDefaultVariant: boolean;
  vendor: string;
  category: Category;
  featuredMedia: FeaturedMedia;
  seo: SEO;
  priceRangeV2: PriceRangeV2;
  media: Media;
  variants: Variants;
}

interface Category {
  name: string;
  fullName: string;
  id: string;
}

interface FeaturedMedia {
  id: string;
  alt: string;
  mediaContentType: string;
  preview: Preview;
}

interface Preview {
  image: Image;
}

interface Image {
  altText?: string;
  url: string;
  height: number;
  width: number;
}

interface Media {
  edges: MediaEdge[];
}

interface MediaEdge {
  node: PurpleNode;
}

interface PurpleNode {
  id: string;
  mediaContentType: string;
  preview: Preview;
}

interface PriceRangeV2 {
  maxVariantPrice: VariantPrice;
  minVariantPrice: VariantPrice;
}

interface VariantPrice {
  amount: string;
  currencyCode: string;
}

interface SEO {
  title: null;
  description: null;
}

interface Variants {
  edges: VariantsEdge[];
  pageInfo: PageInfo;
}

interface VariantsEdge {
  node: FluffyNode;
}

interface FluffyNode {
  id: string;
  displayName: string;
  title: string;
  price: string;
}

interface PageInfo {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startCursor: string;
  endCursor: string;
}

interface Shop {
  name: string;
  url: string;
  currencyCode: string;
}
