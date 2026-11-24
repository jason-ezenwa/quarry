import { Logger } from '@nestjs/common';
import { isDeployedEnv } from '../app-env';
import {
  DEFAULT_EMAIL_FROM,
  RESEND_EMAILS_URL,
  RESEND_TIMEOUT_MS,
} from './email.constants';
import type { EmailMessage } from './email.types';

const logger = new Logger('Email');

// A plain function: Better Auth hooks run outside Nest's DI container.
export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (isDeployedEnv()) {
      throw new Error('RESEND_API_KEY is not set');
    }

    // Local development without a key: the text part carries any link.
    logger.warn('RESEND_API_KEY is not set, so the email was logged instead', {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });

    return;
  }

  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    // A resend request waits on this, so a slow Resend must not hold it up.
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();

    logger.error('Resend refused the email', {
      status: response.status,
      subject: message.subject,
      detail,
    });

    throw new Error('Resend refused the email');
  }

  logger.log('Email sent', { subject: message.subject });
}
