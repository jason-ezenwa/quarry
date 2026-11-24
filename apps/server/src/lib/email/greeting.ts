import { firstNameOf, isPlainName } from '@quarry/contracts';
import type { Greeting } from './email.types';
import { escapeHtml } from './escape-html';

// Names saved before the name check existed fall back to "Hi there,".
export function greetingFor(name: string): Greeting {
  const firstName = firstNameOf(name);
  const text = isPlainName(firstName) ? `Hi ${firstName},` : 'Hi there,';
  return { text, html: escapeHtml(text) };
}
