import { config } from 'dotenv';

config();

const isDeployedEnv = ['production', 'staging'].includes(
  process.env.APP_ENV ?? '',
);

const devOrigins = isDeployedEnv ? [] : ['http://localhost:5173'];

export const TRUSTED_ORIGINS = [...devOrigins, process.env.FRONTEND_URL].filter(
  (origin): origin is string => Boolean(origin),
);
