import type { CoverLetterDocumentResponse } from '@quarry/contracts';
import { describe, expect, it } from 'vitest';
import { exportFileName } from './documents.utils';

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
