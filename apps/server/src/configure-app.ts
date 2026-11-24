import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  resolveClientIp,
  warnIfTrustedHeaderUnset,
} from './lib/client-ip/client-ip';
import { TRUSTED_ORIGINS } from './lib/trusted-origins';

// Shared by main.ts and the integration test app so tests exercise the same
// prefix, pipes and CORS policy the server runs with.
export function configureApp(app: INestApplication): void {
  // Before Better Auth's handler, which Nest mounts at init, so every limit
  // reads the same resolved client IP.
  warnIfTrustedHeaderUnset();
  app.use(resolveClientIp);

  // Turns bodies and queries into their DTOs and refuses unknown fields.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || TRUSTED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.setGlobalPrefix('/api');
}
