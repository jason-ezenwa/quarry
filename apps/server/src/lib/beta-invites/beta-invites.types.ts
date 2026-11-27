export type BetaInvite = {
  // Lowercased and trimmed, as sign-up looks it up.
  email: string;
  firstName: string;
  invitedAt: Date;
};

export type NewBetaInvite = Pick<BetaInvite, 'email' | 'firstName'>;

export type AddInviteResult =
  // The saved invite, so a resend greets them by the name first given.
  | {
      outcome: 'added' | 'already-invited';
      invite: BetaInvite;
      spotsUsed: number;
    }
  | { outcome: 'no-spots-left'; spotsUsed: number };

export type BetaInviteListing = BetaInvite & { signedUp: boolean };
