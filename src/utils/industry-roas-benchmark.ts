import { Industry } from 'src/enums/industry';

export const IndustryRoasBenchMark: Record<
  Industry,
  Record<
    'Facebook' | 'Instagram' | 'Google Search',
    { conversionRate: number; cpc: number }
  >
> = {
  [Industry.FashionAndApparel]: {
    'Google Search': { conversionRate: 2.5, cpc: 2.72 },
    Facebook: { conversionRate: 1.2, cpc: 0.5 },
    Instagram: { conversionRate: 1.0, cpc: 0.5 },
  },
  [Industry.BeautyAndCosmetics]: {
    'Google Search': { conversionRate: 5.7, cpc: 5.16 },
    Facebook: { conversionRate: 4.0, cpc: 0.46 },
    Instagram: { conversionRate: 2.0, cpc: 0.51 },
  },
  [Industry.ElectronicsAndGadgets]: {
    'Google Search': { conversionRate: 2.2, cpc: 1.32 },
    Facebook: { conversionRate: 1.5, cpc: 1.35 },
    Instagram: { conversionRate: 1.5, cpc: 1.36 },
  },
  [Industry.HomeAndFurniture]: {
    'Google Search': { conversionRate: 2.7, cpc: 2.94 },
    Facebook: { conversionRate: 2.0, cpc: 1.0 },
    Instagram: { conversionRate: 1.5, cpc: 1.06 },
  },
  [Industry.HealthAndWellness]: {
    'Google Search': { conversionRate: 3.3, cpc: 2.62 },
    Facebook: { conversionRate: 2.0, cpc: 0.58 },
    Instagram: { conversionRate: 2.0, cpc: 0.59 },
  },
  [Industry.PetCareAndSupplies]: {
    'Google Search': { conversionRate: 6.5, cpc: 3.97 },
    Facebook: { conversionRate: 1.0, cpc: 0.35 },
    Instagram: { conversionRate: 1.0, cpc: 0.34 },
  },
  [Industry.JewelryAndLuxuryGoods]: {
    'Google Search': { conversionRate: 2.5, cpc: 4.31 },
    Facebook: { conversionRate: 1.0, cpc: 1.13 },
    Instagram: { conversionRate: 1.0, cpc: 1.42 },
  },
  [Industry.FoodAndBeverage]: {
    'Google Search': { conversionRate: 1.5, cpc: 2.05 },
    Facebook: { conversionRate: 0.8, cpc: 0.21 },
    Instagram: { conversionRate: 0.8, cpc: 0.22 },
  },
};

export const IndustryRoasBenchMark2: Record<
  Industry,
  Record<
    'Facebook' | 'Instagram' | 'Google Search',
    { conversionRate: number; maxCpc: number }
  >
> = {
  [Industry.FashionAndApparel]: {
    Facebook: { conversionRate: 3.5, maxCpc: 0.5 },
    Instagram: { conversionRate: 3.2, maxCpc: 0.5 },
    'Google Search': { conversionRate: 4.5, maxCpc: 0.56 },
  },
  [Industry.BeautyAndCosmetics]: {
    Facebook: { conversionRate: 4.0, maxCpc: 0.46 },
    Instagram: { conversionRate: 4.2, maxCpc: 0.51 },
    'Google Search': { conversionRate: 5.0, maxCpc: 0.44 },
  },
  [Industry.ElectronicsAndGadgets]: {
    Facebook: { conversionRate: 4.5, maxCpc: 1.35 },
    Instagram: { conversionRate: 4.2, maxCpc: 1.36 },
    'Google Search': { conversionRate: 5.5, maxCpc: 1.32 },
  },
  [Industry.HomeAndFurniture]: {
    Facebook: { conversionRate: 4.0, maxCpc: 1.0 },
    Instagram: { conversionRate: 3.8, maxCpc: 1.06 },
    'Google Search': { conversionRate: 5.2, maxCpc: 1.08 },
  },
  [Industry.HealthAndWellness]: {
    Facebook: { conversionRate: 4.5, maxCpc: 0.58 },
    Instagram: { conversionRate: 4.2, maxCpc: 0.59 },
    'Google Search': { conversionRate: 5.0, maxCpc: 0.52 },
  },
  [Industry.PetCareAndSupplies]: {
    Facebook: { conversionRate: 2.5, maxCpc: 0.35 },
    Instagram: { conversionRate: 2.2, maxCpc: 0.34 },
    'Google Search': { conversionRate: 3.2, maxCpc: 0.37 },
  },
  [Industry.JewelryAndLuxuryGoods]: {
    Facebook: { conversionRate: 3.0, maxCpc: 1.13 },
    Instagram: { conversionRate: 3.5, maxCpc: 1.42 },
    'Google Search': { conversionRate: 4.0, maxCpc: 1.2 },
  },
  [Industry.FoodAndBeverage]: {
    Facebook: { conversionRate: 2.0, maxCpc: 0.21 },
    Instagram: { conversionRate: 1.8, maxCpc: 0.22 },
    'Google Search': { conversionRate: 2.5, maxCpc: 0.23 },
  },
};
