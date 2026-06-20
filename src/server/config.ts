import { loadLocalEnv } from "./env";

loadLocalEnv();

type AppConfig = {
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  r2: {
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
    publicBaseUrl?: string;
  };
};

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getConfig(): AppConfig {
  return {
    databaseUrl: requiredEnv("DATABASE_URL"),
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    jwtSecret: requiredEnv("JWT_SECRET"),
    r2: {
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET,
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL
    }
  };
}
