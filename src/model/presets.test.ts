import fallback from '../data/fallback.json';
import { LatestDataSchema } from '../data/schema';
import { en } from '../i18n/en';
import { fa } from '../i18n/fa';
import { STORIES } from '../i18n/history';
import {
  clampToSpec,
  DEFAULT_VALUES,
  isNeutral,
  SLIDERS,
  toModelInputs,
  type NumericKey,
  type ScenarioValues,
} from '../state/controls';
import { decodeState, encodeState } from '../state/url-state';
import { initFromData } from './from-data';
import { HISTORY_PRESETS, isHistoryPreset, PRESETS } from './presets';
import { simulate } from './simulate';
import { PATH_KEYS } from './types';

const DATA_INIT = initFromData(LatestDataSchema.parse(fallback));
const full = (values: Partial<ScenarioValues>): ScenarioValues => ({
  ...DEFAULT_VALUES,
  ...values,
});

describe('presets', () => {
  it('have unique ids', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it.each(PRESETS.map((p) => [p.id, p] as const))(
    '%s stays inside the slider ranges and steps',
    (_id, p) => {
      for (const [k, v] of Object.entries(p.values)) {
        if (!(k in SLIDERS) || typeof v !== 'number') continue;
        const spec = SLIDERS[k as NumericKey];
        expect(clampToSpec(k as NumericKey, v), k).toBe(v);
        const steps = (v - spec.min) / spec.step;
        expect(Math.abs(steps - Math.round(steps)), k).toBeLessThan(1e-9);
      }
    },
  );

  it.each(PRESETS.map((p) => [p.id, p] as const))(
    '%s survives a share-link round trip',
    (_id, p) => {
      const v = full(p.values);
      expect(decodeState(`?${encodeState(v).toString()}`)).toEqual(v);
    },
  );

  it('every historical preset has complete copy in both languages', () => {
    for (const { id } of HISTORY_PRESETS) {
      expect(isHistoryPreset(id)).toBe(true);
      for (const m of [
        fa.presetsHistory[id],
        en.presetsHistory[id],
        STORIES.fa.stories[id],
        STORIES.en.stories[id],
      ])
        for (const text of Object.values(m)) expect(text.trim().length).toBeGreaterThan(0);
    }
    expect(isHistoryPreset('softLanding')).toBe(false);
    expect(isHistoryPreset(null)).toBe(false);
  });

  it.each(HISTORY_PRESETS.map((p) => [p.id, p] as const))(
    '%s changes the outlook and stays finite on real data',
    (_id, p) => {
      const v = full(p.values);
      expect(isNeutral(v)).toBe(false);
      for (const baselineMode of ['market', 'rule'] as const) {
        const r = simulate(DATA_INIT, { ...toModelInputs(v), baselineMode });
        for (const k of PATH_KEYS)
          for (const x of r.scenario[k]) expect(Number.isFinite(x)).toBe(true);
        const moved = PATH_KEYS.some((k) =>
          r.scenario[k].some((x, t) => Math.abs(x - r.baseline[k][t]!) > 0.05),
        );
        expect(moved).toBe(true);
      }
    },
  );

  it('the 2008 crisis is deep and lasting, the 2020 pandemic deep but short', () => {
    const gap = (id: string) => {
      const p = PRESETS.find((x) => x.id === id)!;
      const r = simulate(DATA_INIT, { ...toModelInputs(full(p.values)), baselineMode: 'rule' });
      return (t: number) => r.scenario.y[t]! - r.baseline.y[t]!;
    };
    const gfc = gap('gfc2008');
    const covid = gap('covid2020');
    expect(gfc(1)).toBeLessThan(-4);
    expect(covid(1)).toBeLessThan(-4);
    expect(gfc(4)).toBeLessThan(covid(4));
  });
});
