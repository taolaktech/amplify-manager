export const ServiceNames = {
  AMPLIFY_MANAGER: 'amplify-manager',
  AMPLIFY_WALLET: 'amplify-wallet',
  AMPLIFY_INTEGRATIONS: 'amplify-integrations',
} as const;

export type ServiceName = (typeof ServiceNames)[keyof typeof ServiceNames];
