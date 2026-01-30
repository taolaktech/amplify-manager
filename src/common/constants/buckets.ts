export const topLevelFolders = {
  'brand-assets': 'brand-assets',
  'campaign-assets': 'campaign-assets',
  // add more top-level folders as needed
} as const;

export type TopLevelFolder = keyof typeof topLevelFolders;
