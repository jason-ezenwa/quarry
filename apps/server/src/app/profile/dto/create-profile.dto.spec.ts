import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateProfileDto } from './create-profile.dto';

const valid = {
  targetRoles: ['Backend Engineer'],
  yearsOfExperience: 5,
  countryCode: 'NG',
  workSetups: ['remote', 'hybrid'],
  salaryFloor: { amount: 60000, currency: 'USD' },
  resume: { key: 'V1StGXR8_Z5jdHi6B-myT.pdf', mimeType: 'application/pdf' },
};

async function errorsFor(body: object) {
  const dto = plainToInstance(CreateProfileDto, body);

  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return { dto, properties: errors.map((error) => error.property) };
}

describe('CreateProfileDto', () => {
  it('accepts a complete set of answers', async () => {
    expect((await errorsFor(valid)).properties).toEqual([]);
  });

  it('trims each target role', async () => {
    const { dto, properties } = await errorsFor({
      ...valid,
      targetRoles: ['  Backend Engineer  ', 'SRE '],
    });

    expect(properties).toEqual([]);
    expect(dto.targetRoles).toEqual(['Backend Engineer', 'SRE']);
  });

  it.each([
    ['no target roles', { targetRoles: [] }, 'targetRoles'],
    ['four target roles', { targetRoles: ['a', 'b', 'c', 'd'] }, 'targetRoles'],
    ['a blank target role', { targetRoles: ['   '] }, 'targetRoles'],
    ['an 81-character role', { targetRoles: ['x'.repeat(81)] }, 'targetRoles'],
    ['negative years', { yearsOfExperience: -1 }, 'yearsOfExperience'],
    ['61 years', { yearsOfExperience: 61 }, 'yearsOfExperience'],
    ['fractional years', { yearsOfExperience: 2.5 }, 'yearsOfExperience'],
    ['an unknown country', { countryCode: 'XX' }, 'countryCode'],
    ['a lowercase country', { countryCode: 'ng' }, 'countryCode'],
    ['no work setup', { workSetups: [] }, 'workSetups'],
    ['an unknown work setup', { workSetups: ['office'] }, 'workSetups'],
    [
      'a repeated work setup',
      { workSetups: ['remote', 'remote'] },
      'workSetups',
    ],
    [
      'a zero salary',
      { salaryFloor: { amount: 0, currency: 'USD' } },
      'salaryFloor',
    ],
    [
      'a fractional salary',
      { salaryFloor: { amount: 1000.5, currency: 'USD' } },
      'salaryFloor',
    ],
    [
      'an unknown currency',
      { salaryFloor: { amount: 1000, currency: 'ABC' } },
      'salaryFloor',
    ],
    ['no salary floor', { salaryFloor: undefined }, 'salaryFloor'],
    [
      'a key that is not an upload key',
      { resume: { key: '../x.pdf', mimeType: 'application/pdf' } },
      'resume',
    ],
    [
      'a type outside the allowlist',
      { resume: { key: 'V1StGXR8_Z5jdHi6B-myT.png', mimeType: 'image/png' } },
      'resume',
    ],
    ['no resume', { resume: undefined }, 'resume'],
  ])('rejects %s', async (_, override, property) => {
    expect((await errorsFor({ ...valid, ...override })).properties).toEqual([
      property,
    ]);
  });
});
