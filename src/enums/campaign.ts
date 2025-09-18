export enum CampaignType {
  PRODUCT_LAUNCH = 'Product Launch',
  FLASH_SALE = 'Flash Sale / Limited Time',
  ABANDONED_CART = 'Abandoned Cart Recovery',
  UPSELL_CROSS_SELL = 'Upsell / Cross-sell',
  SEASONAL = 'Seasonal Campaigns',
  FREE_SHIPPING = 'Free Shipping Promo',
  CUSTOMER_REACTIVATION = 'Customer Reactivation',
  BESTSELLER_BOOST = 'Bestseller Boost',
  HIGH_ROAS_BOOSTER = 'High ROAS Booster',
  SLOW_MOVER_PUSH = 'Slow-Mover Inventory Push',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  READY_TO_LAUNCH = 'READY_TO_LAUNCH',
  LAUNCHING = 'LAUNCHING',
  FAILED_TO_LAUNCH = 'FAILED_TO_LAUNCH',
}

export enum CampaignPlatform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  GOOGLE = 'GOOGLE',
}
