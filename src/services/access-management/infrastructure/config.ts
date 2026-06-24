import 'dotenv/config';

/** Core service config with working local defaults so the POC runs without a .env file. */
export const config = {
  port: Number(process.env.CORE_PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/access_mgmt',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me',
  serviceToken: process.env.SERVICE_TOKEN ?? 'dev-service-token-change-me',
} as const;
