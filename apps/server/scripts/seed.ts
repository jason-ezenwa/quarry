import { Logger } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { auth } from '../src/lib/auth';
import { addInvite } from '../src/lib/beta-invites/beta-invites';
import { DATABASE_NAME, getMongoUri } from '../src/lib/database';

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@quarry.dev',
  password: 'quarry-demo-password',
};

const logger = new Logger('Seed');

// Sign-up only takes invited emails. Forced, so a full beta list can't block it.
async function inviteDemoUser(): Promise<void> {
  const client = new MongoClient(getMongoUri());

  try {
    await addInvite(
      client.db(DATABASE_NAME),
      { email: DEMO_USER.email, firstName: 'Demo' },
      { force: true },
    );
  } finally {
    await client.close();
  }
}

// Signs up through Better Auth, then verifies, since unverified accounts can't sign in.
async function seed(): Promise<void> {
  const context = await auth.$context;

  await inviteDemoUser();

  const existing = await context.internalAdapter.findUserByEmail(
    DEMO_USER.email,
  );

  if (existing) {
    logger.log('Demo user already exists', { email: DEMO_USER.email });
  } else {
    await auth.api.signUpEmail({ body: DEMO_USER });
    logger.log('Demo user created', { email: DEMO_USER.email });
  }

  await context.internalAdapter.updateUserByEmail(DEMO_USER.email, {
    emailVerified: true,
  });
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error('Seed failed', error instanceof Error ? error.stack : error);
    process.exit(1);
  });
