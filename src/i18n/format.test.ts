import {
  fmtBp,
  fmtDate,
  fmtJalali,
  fmtNum,
  fmtPct,
  fmtPp,
  fmtRate,
  fomcDecisionTime,
  toPersianDigits,
} from './format';

describe('number formatting', () => {
  it('never prints NaN or undefined', () => {
    expect(fmtRate(Number.NaN)).toBe('—');
    expect(fmtPct(undefined)).toBe('—');
    expect(fmtNum(null)).toBe('—');
    expect(fmtBp(Infinity, 'bp')).toBe('—');
  });

  it('uses 2 decimals for rates and 1 for percentages', () => {
    expect(fmtRate(3.875)).toBe('3.88%');
    expect(fmtPct(3.0076)).toBe('3.0%');
    expect(fmtPp(-0.349, 'pp')).toBe('−0.3 pp');
    expect(fmtBp(0.5, 'bp')).toBe('+50 bp');
  });

  it('avoids negative zero', () => {
    expect(fmtNum(-0.0001, { dp: 2, signed: true })).toBe('0.00');
  });

  it('converts to Persian digits with Persian separators', () => {
    expect(toPersianDigits('+50')).toBe('+۵۰');
    expect(toPersianDigits('3.88%')).toBe('۳٫۸۸%');
    expect(fmtNum(7659.44, { dp: 0, group: true, persian: true })).toBe('۷٬۶۵۹');
  });
});

describe('dates', () => {
  it('formats Gregorian dates in both languages', () => {
    expect(fmtDate('2026-10-15', 'en')).toBe('October 15, 2026');
    expect(fmtDate('2026-10-15', 'fa')).toMatch(/2026/);
  });

  it('formats Jalali dates', () => {
    expect(fmtJalali('2026-10-15')).toMatch(/1405/);
  });

  it('places FOMC decisions at 2pm New York time (DST-aware)', () => {
    expect(new Date(fomcDecisionTime('2026-10-28')).toISOString()).toBe('2026-10-28T18:00:00.000Z');
    expect(new Date(fomcDecisionTime('2026-12-09')).toISOString()).toBe('2026-12-09T19:00:00.000Z');
  });
});
