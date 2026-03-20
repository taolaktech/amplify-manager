import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'staging'])
    .default('development'),

  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3333'),
  API_URL: z.string().url(),

  API_KEY: z.string(), // for internal endpoints

  // amplify integration
  INTEGRATION_API_URL: z.string(),
  INTEGRATION_API_KEY: z.string(),

  // amplify ai
  AMPLIFY_AI_API_URL: z.string(),
  AMPLIFY_AI_API_KEY: z.string(),

  // amplify n8n
  AMPLIFY_N8N_API_URL: z.string(),
  AMPLIFY_N8N_API_KEY: z.string(),

  //DB
  MONGO_URI: z.string(),
  DB_NAME: z.string(),

  // JWT auth
  JWT_SECRET: z.string(),

  // web client
  CLIENT_BASE_URL: z.string().url(),

  // email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform((val) => parseInt(val)),
  SMTP_USERNAME: z.string(),
  SMTP_PASSWORD: z.string(),
  SMTP_FROM: z.string(),

  //firebase
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string(),

  // google maps/places
  GOOGLE_MAPS_API_KEY: z.string(),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  S3_BUCKET: z.string(),

  // Credit metering
  CREDIT_COST_USD: z
    .string()
    .transform((val) => parseFloat(val))
    .default('0.01'),

  // GPT text model pricing (USD per million tokens)
  GPT_INPUT_PRICE_PER_MILLION: z
    .string()
    .transform((val) => parseFloat(val))
    .default('2.50'),
  GPT_OUTPUT_PRICE_PER_MILLION: z
    .string()
    .transform((val) => parseFloat(val))
    .default('10.00'),

  // Gemini analysis model pricing (USD per million tokens)
  GEMINI_INPUT_PRICE_PER_MILLION: z
    .string()
    .transform((val) => parseFloat(val))
    .default('0.075'),
  GEMINI_OUTPUT_PRICE_PER_MILLION: z
    .string()
    .transform((val) => parseFloat(val))
    .default('0.30'),

  // Image generation pricing (USD)
  IMAGE_TOKEN_COST: z
    .string()
    .transform((val) => parseFloat(val))
    .default('0.042'),
  IMAGE_GENERATION_COST: z
    .string()
    .transform((val) => parseFloat(val))
    .default('0.070'),

  // Video generation pricing (USD per second — Sora)
  VIDEO_COST_PER_SECOND: z
    .string()
    .transform((val) => parseFloat(val))
    .default('0.10'),
});

export type AppConfig = z.infer<typeof configSchema>;
