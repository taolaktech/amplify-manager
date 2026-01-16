import dotenv from 'dotenv';

dotenv.config();

export const constants = {
  AMP_MANAGER_URL: process.env.AMP_MANAGER_URL,
  AMP_MANAGER_API_KEY: process.env.AMP_MANAGER_API_KEY,

  AMP_INTEGRATIONS_URL: process.env.AMP_INTEGRATIONS_URL,
  AMP_INTEGRATIONS_API_KEY: process.env.AMP_INTEGRATIONS_API_KEY,
};
