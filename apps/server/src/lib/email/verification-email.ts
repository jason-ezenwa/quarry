import { renderActionEmail } from './email-layout';
import type { VerificationEmailInput } from './email.types';
import { greetingFor } from './greeting';
import { sendEmail } from './send-email';

const LEAD =
  'Confirm this is your email address so we can reach you about your account.';

const NOTE = "If you didn't sign up for Quarry, ignore this.";

// Better Auth's emailVerification.sendVerificationEmail.
export async function sendVerificationEmail({
  user,
  url,
}: VerificationEmailInput): Promise<void> {
  const greeting = greetingFor(user.name);

  await sendEmail({
    to: user.email,
    subject: 'Verify your Quarry email',
    html: renderActionEmail({
      title: 'Verify your email',
      preheader: LEAD,
      paragraphs: [greeting.html, LEAD],
      action: { label: 'Verify email', url },
      note: NOTE,
    }),
    text: `${greeting.text}\n\n${LEAD}\n\n${url}\n\n${NOTE}\n\nQuarry`,
  });
}
