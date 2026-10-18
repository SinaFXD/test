import type { FomcMeeting } from '../../src/data/schema';
import { getWithRetry } from './http';

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const stripTags = (s: string) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

/**
 * Parse the official FOMC calendar page into decision dates (the second day of
 * each meeting). Notation votes, unscheduled and cancelled meetings — anything
 * whose date cell contains parentheses — are skipped. `*` marks SEP meetings.
 */
export function parseFomcCalendar(html: string): FomcMeeting[] {
  const out: FomcMeeting[] = [];
  const headings = [...html.matchAll(/(\d{4}) FOMC Meetings/g)];
  headings.forEach((h, idx) => {
    const year = Number(h[1]);
    const segment = html.slice(h.index, headings[idx + 1]?.index ?? html.length);
    const months = [
      ...segment.matchAll(/class="[^"]*fomc-meeting__month[^"]*"[^>]*>([\s\S]*?)<\/div>/g),
    ].map((m) => stripTags(m[1]!));
    const dates = [
      ...segment.matchAll(/class="[^"]*fomc-meeting__date[^"]*"[^>]*>([\s\S]*?)<\/div>/g),
    ].map((m) => stripTags(m[1]!));
    if (months.length !== dates.length) return;

    months.forEach((monthText, i) => {
      const dateText = dates[i]!;
      if (dateText.includes('(')) return;
      const days = dateText
        .replace('*', '')
        .split(/[-–]/)
        .map((d) => Number(d.trim()));
      const parts = monthText.split('/').map((p) => MONTHS[p.trim().slice(0, 3).toLowerCase()]);
      if (
        parts.some((p) => p === undefined) ||
        days.some((d) => !Number.isInteger(d) || d < 1 || d > 31)
      ) {
        return;
      }
      const first = days[0]!;
      const last = days[days.length - 1]!;
      let month = parts[parts.length - 1]!;
      // "30-1" without a split month label → decision falls in the next month
      if (parts.length === 1 && last < first) month = month + 1;
      let y = year;
      if (month > 12) {
        month = 1;
        y += 1;
      }
      out.push({
        date: `${y}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
        sep: dateText.includes('*'),
      });
    });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** A year parses cleanly if it has a normal number of scheduled meetings. */
export function plausibleYears(meetings: FomcMeeting[]): Set<number> {
  const counts = new Map<number, number>();
  for (const m of meetings) {
    const y = Number(m.date.slice(0, 4));
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n >= 7 && n <= 10).map(([y]) => y));
}

/** Official dates win for every year that parsed cleanly; bundled dates fill the rest. */
export function mergeMeetings(official: FomcMeeting[], bundled: FomcMeeting[]): FomcMeeting[] {
  const years = plausibleYears(official);
  const fromOfficial = official.filter((m) => years.has(Number(m.date.slice(0, 4))));
  const fromBundled = bundled.filter((m) => !years.has(Number(m.date.slice(0, 4))));
  return [...fromOfficial, ...fromBundled].sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchOfficialMeetings(url: string): Promise<FomcMeeting[]> {
  const html = await getWithRetry(url, {
    retries: 2,
    headers: { 'User-Agent': 'fed-policy-lab data bot (educational; once per update run)' },
  });
  return parseFomcCalendar(html);
}
