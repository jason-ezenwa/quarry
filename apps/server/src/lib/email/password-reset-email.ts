import { renderActionEmail } from './email-layout';
import type { PasswordResetEmailInput } from './email.types';
import { greetingFor } from './greeting';
import { sendEmail } from './send-email';

const LEAD =
  'We received a request to reset the password for your Quarry account. The link expires in 1 hour.';

const NOTE =
  "If you didn't ask to reset your password, you can ignore this email. Your password won't change.";

// Better Auth's emailAndPassword.sendResetPassword.
export async function sendPasswordResetEmail({
  user,
  url,
}: PasswordResetEmailInput): Promise<void> {
  const greeting = greetingFor(user.name);

  await sendEmail({
    to: user.email,
    subject: 'Reset your Quarry password',
    html: renderActionEmail({
      title: 'Reset your password',
      preheader: LEAD,
      paragraphs: [greeting.html, LEAD],
      action: { label: 'Reset password', url },
      note: NOTE,
    }),
    text: `${greeting.text}\n\n${LEAD}\n\n${url}\n\n${NOTE}\n\nQuarry`,
  });
}
