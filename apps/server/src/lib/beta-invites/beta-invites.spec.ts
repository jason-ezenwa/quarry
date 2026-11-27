import { describe, expect, it } from 'vitest';
import { inviteSignUpUrl } from './beta-invites';

describe('inviteSignUpUrl', () => {
  it('points at the sign-up page with the email and first name filled in', () => {
    const url = inviteSignUpUrl('https://quarry.example.com', {
      email: ' Ada+Beta@Example.com ',
      firstName: ' Ada ',
    });

    expect(url).toBe(
      'https://quarry.example.com/sign-up?email=ada%2Bbeta%40example.com&name=Ada',
    );
  });
});
