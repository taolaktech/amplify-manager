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
});

export type AppConfig = z.infer<typeof configSchema>;
