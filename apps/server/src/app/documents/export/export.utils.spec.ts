import type { CoverLetterDocumentResponse } from '@quarry/contracts';
import { describe, expect, it } from 'vitest';
import { contactParts, exportFileName } from './export.utils';

describe('contactParts', () => {
  it('puts location, email and phone first, leaves out blanks and drops the scheme from links', () => {
    expect(
      contactParts({
        email: 'ada@example.com',
        location: 'Lagos, Nigeria',
        phone: ' ',
        links: [{ label: 'GitHub', url: 'https://github.com/ada' }],
      }).map(({ text }) => text),
    ).toEqual(['Lagos, Nigeria', 'ada@example.com', 'github.com/ada']);
  });

  it('links the email, the phone and each link, but not the location', () => {
    expect(
      contactParts({
        email: 'ada@example.com',
        location: 'Lagos, Nigeria',
        phone: '+234 (0) 800-000-0000',
        links: [{ label: 'Site', url: 'http://ada.dev' }],
      }).map(({ href }) => href),
    ).toEqual([
      null,
      'mailto:ada@example.com',
      'tel:+23408000000000',
      'http://ada.dev',
    ]);
  });

  it('leaves a phone with no digits to dial unlinked', () => {
    expect(
      contactParts({ phone: 'on request', links: [] }).map(({ href }) => href),
    ).toEqual([null]);
  });
});

const letter = (person: string, name: string): CoverLetterDocumentResponse => ({
  id: 'letter',
  kind: 'cover-letter',
  name,
  header: { name: person, contact: { links: [] } },
  greeting: 'Hello,',
  paragraphs: [],
  signOff: 'Thanks,',
  createdAt: '2026-11-24T00:00:00.000Z',
});

describe('exportFileName', () => {
  it("joins the person's name and the document's into a lowercase, hyphenated name", () => {
    expect(
      exportFileName(letter('Ada Obi', 'Lead with payments!'), 'pdf'),
    ).toBe('ada-obi-lead-with-payments.pdf');
  });

  it('drops accents and anything outside a-z and 0-9', () => {
    expect(exportFileName(letter('Chídí Ọkọ', 'v2 / "final"'), 'docx')).toBe(
      'chidi-oko-v2-final.docx',
    );
  });

  it('falls back to a fixed name when nothing usable is left', () => {
    expect(exportFileName(letter('日本', '語'), 'pdf')).toBe('document.pdf');
  });
});
