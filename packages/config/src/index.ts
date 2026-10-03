import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  ADMIN_URL: z.string().url(),
  API_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32)
});

export type Environment = z.infer<typeof environmentSchema>;
export const validateEnvironment = (environment: NodeJS.ProcessEnv): Environment => environmentSchema.parse(environment);

