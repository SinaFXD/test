import fallback from './fallback.json';
import { LatestDataSchema } from './schema';
import { FED_SERIES } from '../banks/fed/series';

describe('bundled fallback snapshot', () => {
  it('is real pipeline output that satisfies the schema', () => {
    const parsed = LatestDataSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    for (const s of FED_SERIES) expect(parsed.data.series[s.key]).toBeDefined();
    expect(parsed.data.source.name).toBe('FRED');
    expect(parsed.data.marketPath?.meetings.length).toBeGreaterThan(0);
  });
});
