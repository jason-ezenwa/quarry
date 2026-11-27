import { Logger } from '@nestjs/common';
import { isPlainName } from '@quarry/contracts';
import { config } from 'dotenv';
import { MongoClient, type Db } from 'mongodb';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import {
  addInvite,
  countInvites,
  inviteSignUpUrl,
  listInvites,
  normalizeEmail,
  removeInvite,
} from '../src/lib/beta-invites/beta-invites';
import { BETA_SPOTS } from '../src/lib/beta-invites/beta-invites.constants';
import { DATABASE_NAME, getMongoUri } from '../src/lib/database';
import { sendInviteEmail } from '../src/lib/email/invite-email';
import { DEV_WEB_ORIGIN } from '../src/lib/trusted-origins';

config();

const USAGE = `Usage:
  pnpm invite add <email> --name <first name> [--send] [--force]
  pnpm invite remove <email>
  pnpm invite list

Uses MONGODB_URI from apps/server/.env, so point it at production to invite
real people. --send also needs RESEND_API_KEY and an https FRONTEND_URL.
--send emails the invite (again, if they were already invited).
--force invites past the ${BETA_SPOTS} beta spots.`;

const logger = new Logger('Invite');

const emailSchema = z.email();

function spots(used: number): string {
  return `${used} of ${BETA_SPOTS} spots used`;
}

// --send emails real people, so a laptop .env must point at production.
function sendOrigin(): string {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      '--send needs RESEND_API_KEY, or the email is only logged.',
    );
  }

  const origin = process.env.FRONTEND_URL ?? '';
  if (!origin.startsWith('https://')) {
    throw new Error(
      '--send needs FRONTEND_URL set to the live web app (https://…).',
    );
  }

  return origin;
}

async function add(
  db: Db,
  email: string,
  firstName: string,
  { send, force }: { send: boolean; force: boolean },
): Promise<void> {
  // Checked before saving, so a refused send leaves nothing half done.
  const origin = send
    ? sendOrigin()
    : process.env.FRONTEND_URL || DEV_WEB_ORIGIN;

  const result = await addInvite(db, { email, firstName }, { force });

  if (result.outcome === 'no-spots-left') {
    throw new Error(
      `No spots left (${spots(result.spotsUsed)}). Pass --force to invite anyway.`,
    );
  }

  const { invite, spotsUsed } = result;

  logger.log(
    result.outcome === 'added'
      ? `Invited ${invite.email}. ${spots(spotsUsed)}.`
      : `${invite.email} was already invited as ${invite.firstName}. ${spots(spotsUsed)}.`,
  );

  const url = inviteSignUpUrl(origin, invite);

  if (!send) {
    logger.log(`Sign-up link: ${url}`);
    return;
  }

  await sendInviteEmail({ ...invite, url });
  logger.log(`Invite email sent to ${invite.email} with ${url}`);
}

async function list(db: Db): Promise<void> {
  const invites = await listInvites(db);

  for (const invite of invites) {
    const status = invite.signedUp ? 'signed up' : 'not signed up yet';
    logger.log(`${invite.email} (${invite.firstName}): ${status}`);
  }

  logger.log(spots(invites.length));
}

async function remove(db: Db, email: string): Promise<void> {
  const removed = await removeInvite(db, email);

  logger.log(
    removed
      ? `Removed ${email}. ${spots(await countInvites(db))}.`
      : `${email} wasn't invited.`,
  );
}

async function run(db: Db, argv: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      name: { type: 'string' },
      send: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
    },
  });

  const [command, rawEmail = ''] = positionals;

  if (command === 'list') return list(db);

  if (command !== 'add' && command !== 'remove') throw new Error(USAGE);

  const email = normalizeEmail(rawEmail);
  if (!emailSchema.safeParse(email).success) {
    throw new Error(`Give a valid email.\n\n${USAGE}`);
  }

  if (command === 'remove') return remove(db, email);

  const firstName = values.name?.trim() ?? '';
  if (!firstName || !isPlainName(firstName)) {
    throw new Error(`Give their first name with --name.\n\n${USAGE}`);
  }

  await add(db, email, firstName, { send: values.send, force: values.force });
}

async function main(): Promise<void> {
  const client = new MongoClient(getMongoUri());

  try {
    await run(client.db(DATABASE_NAME), process.argv.slice(2));
  } finally {
    await client.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
