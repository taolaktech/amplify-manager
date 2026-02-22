export const topLevelFolders = {
  'brand-assets': 'brand-assets',
  'campaign-assets': 'campaign-assets',
  'video-presets': 'video-presets',
  'image-presets': 'image-presets',
  // add more top-level folders as needed
} as const;

export type TopLevelFolder = keyof typeof topLevelFolders;
