export const topLevelFolders = {
  'brand-assets': 'brand-assets',
  // add more top-level folders as needed
} as const;

export type TopLevelFolder = keyof typeof topLevelFolders;
