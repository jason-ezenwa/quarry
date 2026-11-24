import type { TailoredResumeContent } from '@quarry/contracts';
import { describe, expect, it } from 'vitest';
import { replaceSections } from './resume.utils';

const source: TailoredResumeContent = {
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
      summary: 'Payments engineer.',
      skills: [{ name: 'Go' }, { name: 'Kafka' }],
    });

    expect(edited).toEqual({
      ...source,
      summary: 'Payments engineer.',
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
