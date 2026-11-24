import { http, HttpResponse } from 'msw';
import { RESEND_EMAILS_URL } from '../../src/lib/email/email.constants';

// The body the app posts to Resend's send-email endpoint.
export type SentEmail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};

// Resend's send-email endpoint. `failNext` makes the next request fail.
export class FakeResend {
  readonly sent: SentEmail[] = [];
  private failures = 0;

  readonly handler = http.post(RESEND_EMAILS_URL, async ({ request }) => {
    if (this.failures > 0) {
      this.failures -= 1;
      return HttpResponse.json(
        { name: 'internal_server_error', message: 'Something went wrong' },
        { status: 500 },
      );
    }

    this.sent.push((await request.json()) as SentEmail);
    return HttpResponse.json({ id: `email-${this.sent.length}` });
  });

  failNext(): void {
    this.failures += 1;
  }

  // The link in the last email sent to `to`, read from its plain-text part.
  linkSentTo(to: string): URL {
    const email = this.sent.findLast((sent) => sent.to.includes(to));
    const link = email?.text.match(/https?:\/\/\S+/)?.[0];
    if (!link) throw new Error('No email with a link was sent to that address');
    return new URL(link);
  }

  reset(): void {
    this.sent.length = 0;
    this.failures = 0;
  }
}

export const fakeResend = new FakeResend();
