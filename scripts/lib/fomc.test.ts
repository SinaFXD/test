import { readFileSync } from 'node:fs';
import { mergeMeetings, parseFomcCalendar, plausibleYears } from './fomc';

const html = readFileSync(new URL('../fixtures/fomc-calendar.html', import.meta.url), 'utf8');

describe('FOMC calendar parser', () => {
  const meetings = parseFomcCalendar(html);

  it('extracts decision dates and SEP flags', () => {
    const y2027 = meetings.filter((m) => m.date.startsWith('2027'));
    expect(y2027.map((m) => m.date)).toEqual([
      '2027-01-27',
      '2027-03-17',
      '2027-04-28',
      '2027-06-09',
      '2027-07-28',
      '2027-09-15',
      '2027-10-27',
      '2027-12-08',
    ]);
    expect(y2027.filter((m) => m.sep).length).toBe(4);
  });

  it('handles month-spanning meetings and skips notation votes', () => {
    const y2024 = meetings.filter((m) => m.date.startsWith('2024'));
    expect(y2024.map((m) => m.date)).toEqual(['2024-01-31', '2024-05-01']);
  });

  it('only trusts years with a plausible meeting count', () => {
    expect([...plausibleYears(meetings)]).toEqual([2027]);
    const merged = mergeMeetings(meetings, [
      { date: '2027-01-01', sep: false },
      { date: '2028-01-26', sep: false },
    ]);
    expect(merged.some((m) => m.date === '2027-01-01')).toBe(false);
    expect(merged.some((m) => m.date === '2028-01-26')).toBe(true);
    expect(merged.some((m) => m.date.startsWith('2024'))).toBe(false);
  });

  it('returns nothing for unrelated HTML', () => {
    expect(parseFomcCalendar('<html><body>Maintenance</body></html>')).toEqual([]);
  });
});
