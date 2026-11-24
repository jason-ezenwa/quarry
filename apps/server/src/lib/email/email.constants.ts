export const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

// The sender unless EMAIL_FROM overrides it. The domain must be verified in Resend.
export const DEFAULT_EMAIL_FROM = 'Quarry <noreply@quarry.chukwuemelie.com>';

export const RESEND_TIMEOUT_MS = 10_000;

// Mirrors the web app's tokens. Inline styles only: email clients strip stylesheets.
export const COLORS = {
  plaster: '#eee9e1',
  paper: '#fffefb',
  line: '#e1dad0',
  ink: '#24201b',
  inkMuted: '#6a6056',
  inkFaint: '#8c8073',
  chocolate: '#5a3826',
  onChocolate: '#ffffff',
} as const;

// The brand face where the reader has it installed, else system fallbacks.
export const FONT_STACK =
  "'Ezenwa Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";
