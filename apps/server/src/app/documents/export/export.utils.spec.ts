import { describe, expect, it } from 'vitest';
import {
  contactLine,
  formatDateRange,
  formatPartialDate,
} from './export.utils';

describe('formatPartialDate', () => {
  it('shows a month as its short name and year', () => {
    expect(formatPartialDate('2021-03')).toBe('Mar 2021');
  });

  it('keeps a bare year', () => {
    expect(formatPartialDate('2019')).toBe('2019');
  });
});

describe('formatDateRange', () => {
  it('runs from start to end', () => {
    expect(formatDateRange('2019', '2021-12')).toBe('2019 – Dec 2021');
  });

  it('reads Present when only the start is given', () => {
    expect(formatDateRange('2021-03')).toBe('Mar 2021 – Present');
  });

  it('shows the end alone, or nothing, without a start', () => {
    expect(formatDateRange(undefined, '2018')).toBe('2018');
    expect(formatDateRange()).toBe('');
  });
});

describe('contactLine', () => {
  it('joins what is present and drops the scheme from links', () => {
    expect(
      contactLine({
        email: 'ada@example.com',
        location: 'Lagos, Nigeria',
        phone: ' ',
        links: [{ label: 'GitHub', url: 'https://github.com/ada' }],
      }),
    ).toBe('ada@example.com  ·  Lagos, Nigeria  ·  github.com/ada');
  });
});
