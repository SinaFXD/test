import { create } from 'zustand';
import { PRESETS, type PresetId } from '../model/presets';
import { readJSON } from '../lib/storage';
import { prefersReducedMotion } from '../lib/motion';
import {
  DEFAULT_VALUES,
  SLIDERS,
  sanitize,
  type NumericKey,
  type ScenarioValues,
} from './controls';
import { decodeState, hasScenarioParams } from './url-state';

export const SCENARIO_KEY = 'fpl:scenario';

function initialValues(): ScenarioValues {
  if (typeof location !== 'undefined' && hasScenarioParams(location.search)) {
    return decodeState(location.search);
  }
  const saved = readJSON<Partial<ScenarioValues>>(SCENARIO_KEY);
  return saved ? sanitize(saved) : { ...DEFAULT_VALUES };
}

interface ScenarioStore extends ScenarioValues {
  activePreset: PresetId | null;
  set: (patch: Partial<ScenarioValues>) => void;
  reset: () => void;
  applyPreset: (id: PresetId) => void;
}

let anim = 0;

export const useScenario = create<ScenarioStore>((set, get) => ({
  ...initialValues(),
  activePreset: null,
  set: (patch) => {
    cancelAnimationFrame(anim);
    set({ ...patch, activePreset: null });
  },
  reset: () => {
    cancelAnimationFrame(anim);
    const { horizon, baselineMode, marketOverride } = get();
    set({ ...DEFAULT_VALUES, horizon, baselineMode, marketOverride, activePreset: null });
  },
  applyPreset: (id) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    cancelAnimationFrame(anim);
    const cur = get();
    const target: ScenarioValues = {
      ...DEFAULT_VALUES,
      horizon: cur.horizon,
      baselineMode: cur.baselineMode,
      marketOverride: cur.marketOverride,
      ...preset.values,
    };
    const keys = (Object.keys(SLIDERS) as NumericKey[]).filter(
      (k) => k !== 'rStar' && k !== 'horizon',
    );
    if (prefersReducedMotion()) {
      set({ ...target, activePreset: id });
      return;
    }
    // Animated transition: tween numeric values over ~350 ms.
    const from = Object.fromEntries(keys.map((k) => [k, cur[k] as number]));
    const start = performance.now();
    const DURATION = 350;
    set({ tab: target.tab, rStar: target.rStar, activePreset: id });
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      const patch: Partial<ScenarioValues> = {};
      for (const k of keys) {
        const a = from[k]!;
        const b = target[k] as number;
        (patch as Record<string, number>)[k] = p === 1 ? b : a + (b - a) * e;
      }
      set(patch);
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  },
}));

export function scenarioValues(s: ScenarioStore): ScenarioValues {
  const { activePreset: _a, set: _s, reset: _r, applyPreset: _p, ...v } = s;
  return v;
}
