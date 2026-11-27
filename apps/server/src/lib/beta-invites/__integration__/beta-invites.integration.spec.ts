import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTestDatabase } from '../../../../test/integration/database';
import { fakeResend } from '../../../../test/integration/fake-resend';
import { sendInviteEmail } from '../../email/invite-email';
import {
  addInvite,
  isInvited,
  listInvites,
  removeInvite,
} from '../beta-invites';
import { BETA_INVITES_COLLECTION, BETA_SPOTS } from '../beta-invites.constants';

const fillSpots = (count: number) =>
  getTestDatabase()
    .collection(BETA_INVITES_COLLECTION)
    .insertMany(
      Array.from({ length: count }, (_, index) => ({
        email: `tester-${index}@example.com`,
        firstName: 'Tester',
        invitedAt: new Date(),
      })),
    );

describe('Beta invites (integration)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addInvite', () => {
    it('saves the email lowercased and trimmed with the first name', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-27T18:00:00Z'));

      const result = await addInvite(getTestDatabase(), {
        email: '  Ada@Example.com ',
        firstName: ' Ada ',
      });

      const saved = await getTestDatabase()
        .collection(BETA_INVITES_COLLECTION)
        .findOne({}, { projection: { _id: 0 } });

      const invite = {
        email: 'ada@example.com',
        firstName: 'Ada',
        invitedAt: new Date('2026-11-27T18:00:00Z'),
      };
      expect(result).toEqual({ outcome: 'added', invite, spotsUsed: 1 });
      expect(saved).toEqual(invite);
    });

    it('leaves an email that is already invited as it was and returns it', async () => {
      const db = getTestDatabase();
      await addInvite(db, { email: 'ada@example.com', firstName: 'Ada' });

      const result = await addInvite(db, {
        email: 'ADA@example.com',
        firstName: 'Adaeze',
      });

      expect(result).toEqual({
        outcome: 'already-invited',
        invite: expect.objectContaining({
          email: 'ada@example.com',
          firstName: 'Ada',
        }),
        spotsUsed: 1,
      });
      expect(
        await db.collection(BETA_INVITES_COLLECTION).countDocuments(),
      ).toBe(1);
    });

    it('refuses once every beta spot is taken', async () => {
      await fillSpots(BETA_SPOTS);

      const result = await addInvite(getTestDatabase(), {
        email: 'ada@example.com',
        firstName: 'Ada',
      });

      expect(result).toEqual({
        outcome: 'no-spots-left',
        spotsUsed: BETA_SPOTS,
      });
      expect(await isInvited(getTestDatabase(), 'ada@example.com')).toBe(false);
    });

    it('invites past the beta spots when forced', async () => {
      await fillSpots(BETA_SPOTS);

      const result = await addInvite(
        getTestDatabase(),
        { email: 'ada@example.com', firstName: 'Ada' },
        { force: true },
      );

      expect(result).toMatchObject({
        outcome: 'added',
        spotsUsed: BETA_SPOTS + 1,
      });
    });
  });

  it('removes an invite whatever the case of the email', async () => {
    const db = getTestDatabase();
    await addInvite(db, { email: 'ada@example.com', firstName: 'Ada' });

    expect(await removeInvite(db, 'Ada@Example.com')).toBe(true);
    expect(await removeInvite(db, 'ada@example.com')).toBe(false);
    expect(await isInvited(db, 'ada@example.com')).toBe(false);
  });

  it('lists invites oldest first with whether each has signed up', async () => {
    const db = getTestDatabase();
    await db.collection(BETA_INVITES_COLLECTION).insertMany([
      {
        email: 'bayo@example.com',
        firstName: 'Bayo',
        invitedAt: new Date('2026-11-28T00:00:00Z'),
      },
      {
        email: 'ada@example.com',
        firstName: 'Ada',
        invitedAt: new Date('2026-11-27T00:00:00Z'),
      },
    ]);
    await db.collection('users').insertOne({ email: 'ada@example.com' });

    expect(await listInvites(db)).toEqual([
      {
        email: 'ada@example.com',
        firstName: 'Ada',
        invitedAt: new Date('2026-11-27T00:00:00Z'),
        signedUp: true,
      },
      {
        email: 'bayo@example.com',
        firstName: 'Bayo',
        invitedAt: new Date('2026-11-28T00:00:00Z'),
        signedUp: false,
      },
    ]);
  });

  it('emails the invite greeting them by first name with the sign-up link', async () => {
    const url =
      'http://localhost:5173/sign-up?email=ada%40example.com&name=Ada';

    await sendInviteEmail({ email: 'ada@example.com', firstName: 'Ada', url });

    const [email] = fakeResend.sent;
    expect(email?.to).toEqual(['ada@example.com']);
    expect(email?.subject).toBe("You're in the Quarry beta");
    expect(email?.text).toContain('Hi Ada,');
    expect(fakeResend.linkSentTo('ada@example.com').href).toBe(url);
  });
});
