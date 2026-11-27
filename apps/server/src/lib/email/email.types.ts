export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  // Always send a plain-text part: a missing one costs deliverability.
  text: string;
};

export type ActionEmailOptions = {
  // Tab title and the heading in the body.
  title: string;
  // Inbox preview text shown beside the subject.
  preheader: string;
  // Body paragraphs as HTML; escape any user input first.
  paragraphs: string[];
  action: { label: string; url: string };
  // Fine print under the button, such as "ignore this if it wasn't you".
  note: string;
};

export type VerificationEmailInput = {
  user: { email: string; name: string };
  url: string;
};

export type PasswordResetEmailInput = {
  user: { email: string; name: string };
  url: string;
};

export type Greeting = { text: string; html: string };

export type InviteEmailInput = {
  email: string;
  firstName: string;
  // The web app's sign-up page, with the email and name filled in.
  url: string;
};
