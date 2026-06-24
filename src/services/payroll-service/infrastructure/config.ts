import 'dotenv/config';

export const config = {
  port: Number(process.env.PAYROLL_PORT ?? 4002),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/access_mgmt',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me',
  serviceToken: process.env.SERVICE_TOKEN ?? 'dev-service-token-change-me',
  pdpUrl: process.env.PDP_URL ?? 'http://localhost:4000',
} as const;
