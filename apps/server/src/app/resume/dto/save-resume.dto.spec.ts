import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { resumeSchema } from '@quarry/contracts';
import { isHttpUrl } from './is-http-url.decorator';
import { SaveResumeDto } from './save-resume.dto';

const experience = {
  title: 'Backend Engineer',
  company: 'Paystack',
  startDate: '2021-03',
  bullets: ['Built the settlement service.'],
};

const valid = {
  name: 'Ada Obi',
  contact: {
    email: 'ada@example.com',
    links: [{ label: 'GitHub', url: 'https://github.com/ada' }],
  },
  summary: 'Backend engineer.',
  experience: [experience],
  education: [{ school: 'University of Lagos', endDate: '2018', details: [] }],
  skills: [{ name: 'TypeScript' }],
  projects: [{ name: 'Ledger', url: 'http://ledger.dev', bullets: [] }],
  certifications: [{ name: 'AWS SA', date: '2022' }],
};

async function errorsFor(body: object) {
  const dto = plainToInstance(SaveResumeDto, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return { dto, properties: errors.map((error) => error.property) };
}

describe('SaveResumeDto', () => {
  it('accepts a complete resume', async () => {
    expect((await errorsFor(valid)).properties).toEqual([]);
  });

  it('accepts empty sections and no optional fields', async () => {
    const { properties } = await errorsFor({
      name: 'Ada Obi',
      contact: { links: [] },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    });

    expect(properties).toEqual([]);
  });

  it('trims required text', async () => {
    const { dto } = await errorsFor({ ...valid, name: '  Ada Obi ' });

    expect(dto.name).toBe('Ada Obi');
  });

  it.each([
    ['a blank name', { name: '   ' }, 'name'],
    ['no contact', { contact: undefined }, 'contact'],
    [
      'a link that is not http(s)',
      { contact: { links: [{ label: 'Site', url: 'ftp://ada.dev' }] } },
      'contact',
    ],
    [
      'a role without a company',
      { experience: [{ ...experience, company: '' }] },
      'experience',
    ],
    [
      'a written-out start date',
      { experience: [{ ...experience, startDate: 'March 2021' }] },
      'experience',
    ],
    [
      'a month out of range',
      { experience: [{ ...experience, endDate: '2021-13' }] },
      'experience',
    ],
    [
      'a full date',
      { certifications: [{ name: 'AWS SA', date: '2022-01-05' }] },
      'certifications',
    ],
    ['a blank skill', { skills: [{ name: ' ' }] }, 'skills'],
    ['a missing section', { projects: undefined }, 'projects'],
    ['an unknown field', { photo: 'me.png' }, 'photo'],
  ])('rejects %s', async (_case, override, property) => {
    expect((await errorsFor({ ...valid, ...override })).properties).toContain(
      property,
    );
  });
});

describe('isHttpUrl', () => {
  const linkSchema = resumeSchema.shape.contact.shape.links.element.shape.url;

  it.each([
    'https://github.com/ada',
    'http://ada.dev',
    'https://localhost:3000',
    'https://ada',
    'http://my_site.dev/x',
    'https://ada.dev/a b',
    'ftp://ada.dev',
    'mailto:ada@example.com',
    'github.com/ada',
    '',
  ])('agrees with the parser schema on %s', (url) => {
    expect(isHttpUrl(url)).toBe(linkSchema.safeParse(url).success);
  });
});
