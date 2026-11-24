import type { Resume } from '@quarry/contracts';
import { describe, expect, it } from 'vitest';
import { replaceSections } from './resume.utils';

const source: Resume = {
  name: 'Ada Obi',
  contact: { email: 'ada@example.com', links: [] },
  summary: 'Backend engineer.',
  experience: [
    {
      title: 'Backend Engineer',
      company: 'Paystack',
      bullets: ['Built the settlement service.'],
    },
  ],
  education: [],
  skills: [{ name: 'TypeScript' }],
  projects: [],
  certifications: [],
};

describe('replaceSections', () => {
  it('replaces the given sections whole and keeps the rest', () => {
    const edited = replaceSections(source, {
      contact: {
        email: 'ada@work.dev',
        links: [{ label: 'Site', url: 'https://ada.dev' }],
      },
      skills: [{ name: 'Go' }, { name: 'Kafka' }],
    });

    expect(edited).toEqual({
      ...source,
      contact: {
        email: 'ada@work.dev',
        links: [{ label: 'Site', url: 'https://ada.dev' }],
      },
      skills: [{ name: 'Go' }, { name: 'Kafka' }],
    });
  });

  it('leaves the source untouched', () => {
    const before = structuredClone(source);

    const edited = replaceSections(source, { education: [] });
    edited.experience[0].bullets.push('Led the team.');

    expect(source).toEqual(before);
  });
});
