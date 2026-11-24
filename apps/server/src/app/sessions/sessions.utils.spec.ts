import { describe, expect, it } from 'vitest';
import { monthlyPeriod } from './sessions.utils';

describe('monthlyPeriod', () => {
  it('runs from the start of the UTC month to the start of the next', () => {
    expect(monthlyPeriod(new Date('2026-11-24T08:00:00Z'))).toEqual({
      start: new Date('2026-11-01T00:00:00Z'),
      resetsAt: new Date('2026-12-01T00:00:00Z'),
    });
  });

  it('rolls over the year in December', () => {
    expect(monthlyPeriod(new Date('2026-12-31T23:59:59Z'))).toEqual({
      start: new Date('2026-12-01T00:00:00Z'),
      resetsAt: new Date('2027-01-01T00:00:00Z'),
    });
  });

  it('starts a new month at midnight UTC, whatever the local time zone', () => {
    expect(monthlyPeriod(new Date('2026-12-01T00:00:00Z')).start).toEqual(
      new Date('2026-12-01T00:00:00Z'),
    );

    expect(monthlyPeriod(new Date('2026-11-30T23:59:59.999Z')).start).toEqual(
      new Date('2026-11-01T00:00:00Z'),
    );
  });
});
