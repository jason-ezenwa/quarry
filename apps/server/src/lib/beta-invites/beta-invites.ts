import type { Collection, Db } from 'mongodb';
import { USERS_COLLECTION } from '../auth.constants';
import { isDuplicateKeyError } from '../mongo-errors/mongo-errors';
import { BETA_INVITES_COLLECTION, BETA_SPOTS } from './beta-invites.constants';
import type {
  AddInviteResult,
  BetaInvite,
  BetaInviteListing,
  NewBetaInvite,
} from './beta-invites.types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function invites(db: Db): Collection<BetaInvite> {
  return db.collection<BetaInvite>(BETA_INVITES_COLLECTION);
}

function findInvite(db: Db, email: string): Promise<BetaInvite | null> {
  return invites(db).findOne(
    { email: normalizeEmail(email) },
    { projection: { _id: 0 } },
  );
}

export async function isInvited(db: Db, email: string): Promise<boolean> {
  return (await findInvite(db, email)) !== null;
}

export function countInvites(db: Db): Promise<number> {
  return invites(db).countDocuments();
}

export async function addInvite(
  db: Db,
  { email, firstName }: NewBetaInvite,
  { force = false }: { force?: boolean } = {},
): Promise<AddInviteResult> {
  const spotsUsed = await countInvites(db);
  const existing = await findInvite(db, email);

  if (existing) {
    return { outcome: 'already-invited', invite: existing, spotsUsed };
  }

  if (spotsUsed >= BETA_SPOTS && !force) {
    return { outcome: 'no-spots-left', spotsUsed };
  }

  const invite: BetaInvite = {
    email: normalizeEmail(email),
    firstName: firstName.trim(),
    invitedAt: new Date(),
  };

  try {
    // A copy, since the driver adds an _id to the document it inserts.
    await invites(db).insertOne({ ...invite });
  } catch (error) {
    // Another run invited the same email in between.
    const raced = isDuplicateKeyError(error) && (await findInvite(db, email));
    if (raced) return { outcome: 'already-invited', invite: raced, spotsUsed };
    throw error;
  }

  return { outcome: 'added', invite, spotsUsed: spotsUsed + 1 };
}

// Stops a new sign-up only; an account made earlier keeps working.
export async function removeInvite(db: Db, email: string): Promise<boolean> {
  const { deletedCount } = await invites(db).deleteOne({
    email: normalizeEmail(email),
  });

  return deletedCount > 0;
}

export async function listInvites(db: Db): Promise<BetaInviteListing[]> {
  const all = await invites(db)
    .find({}, { projection: { _id: 0 } })
    .sort({ invitedAt: 1 })
    .toArray();

  const users = await db
    .collection<{ email: string }>(USERS_COLLECTION)
    .find(
      { email: { $in: all.map((invite) => invite.email) } },
      { projection: { _id: 0, email: 1 } },
    )
    .toArray();

  const signedUp = new Set(users.map((user) => user.email));

  return all.map((invite) => ({
    ...invite,
    signedUp: signedUp.has(invite.email),
  }));
}

// The web app's sign-up page with the invited email and first name filled in.
export function inviteSignUpUrl(
  webOrigin: string,
  { email, firstName }: NewBetaInvite,
): string {
  const url = new URL('/sign-up', webOrigin);
  url.searchParams.set('email', normalizeEmail(email));
  url.searchParams.set('name', firstName.trim());
  return url.href;
}
