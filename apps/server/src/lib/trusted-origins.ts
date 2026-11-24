import { config } from 'dotenv';
import { isDeployedEnv } from './app-env';

config();

export const DEV_WEB_ORIGIN = 'http://localhost:5173';

const devOrigins = isDeployedEnv() ? [] : [DEV_WEB_ORIGIN];

export const TRUSTED_ORIGINS = [...devOrigins, process.env.FRONTEND_URL].filter(
  (origin): origin is string => Boolean(origin),
);
