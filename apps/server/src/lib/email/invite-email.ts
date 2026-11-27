import { renderActionEmail } from './email-layout';
import type { InviteEmailInput } from './email.types';
import { greetingFor } from './greeting';
import { sendEmail } from './send-email';

const LEAD =
  "You're in the Quarry beta. Create your account with this email address to get started.";

const NOTE =
  "The link fills in your email. If you didn't ask to join Quarry, you can ignore this.";

export async function sendInviteEmail({
  email,
  firstName,
  url,
}: InviteEmailInput): Promise<void> {
  const greeting = greetingFor(firstName);

  await sendEmail({
    to: email,
    subject: "You're in the Quarry beta",
    html: renderActionEmail({
      title: "You're in",
      preheader: LEAD,
      paragraphs: [greeting.html, LEAD],
      action: { label: 'Create your account', url },
      note: NOTE,
    }),
    text: `${greeting.text}\n\n${LEAD}\n\n${url}\n\n${NOTE}\n\nQuarry`,
  });
}
