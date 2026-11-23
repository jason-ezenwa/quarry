import { Logger } from '@nestjs/common';
import { auth } from '../src/lib/auth';

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@quarry.dev',
  password: 'quarry-demo-password',
};

const logger = new Logger('Seed');

// Creates the demo account through Better Auth, so the stored password hash
// and account record match a real sign-up. Running it again is a no-op.
async function seed(): Promise<void> {
  const context = await auth.$context;
  const existing = await context.internalAdapter.findUserByEmail(
    DEMO_USER.email,
  );

  if (existing) {
    logger.log('Demo user already exists', { email: DEMO_USER.email });
    return;
  }

  await auth.api.signUpEmail({ body: DEMO_USER });
  logger.log('Demo user created', { email: DEMO_USER.email });
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error('Seed failed', error instanceof Error ? error.stack : error);
    process.exit(1);
  });
