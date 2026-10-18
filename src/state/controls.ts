/**
 * Scenario values (what the user controls), their slider specs and the mapping
 * to model inputs. One flat object so it serializes cleanly to the URL.
 */
import { DEFAULT_PARAMS } from '../model/params';
import type { BaselineMode, ScenarioInputs } from '../model/types';

export type Tab = 'rate' | 'shock' | 'custom';

export interface ScenarioValues {
  tab: Tab;
  policyChangeBp: number;
  holdQuarters: number;
  inflationShock: number;
  shockPersistence: number;
  demandShock: number;
  oilShock: number;
  phiPi: number;
  lambda: number;
  /** null ⇒ use the data-derived r*. */
  rStar: number | null;
  horizon: number;
  baselineMode: BaselineMode;
  /** Raw pasted market path (URL + localStorage only). */
  marketOverride: string;
}

export type NumericKey =
  Exclude<keyof ScenarioValues, 'tab' | 'baselineMode' | 'marketOverride' | 'rStar'> | 'rStar';

export interface SliderSpec {
  min: number;
  max: number;
  step: number;
  def: number;
}

export const SLIDERS: Record<NumericKey, SliderSpec> = {
  policyChangeBp: { min: -300, max: 300, step: 25, def: 0 },
  holdQuarters: { min: 1, max: 8, step: 1, def: 4 },
  inflationShock: { min: -2, max: 3, step: 0.25, def: 0 },
  shockPersistence: { min: 0, max: 0.95, step: 0.05, def: 0.5 },
  demandShock: { min: -3, max: 3, step: 0.25, def: 0 },
  oilShock: { min: -50, max: 50, step: 5, def: 0 },
  phiPi: { min: 0, max: 1.5, step: 0.05, def: DEFAULT_PARAMS.phiPi },
  lambda: { min: 0, max: 1, step: 0.05, def: DEFAULT_PARAMS.lambda },
  rStar: { min: 0, max: 2.5, step: 0.05, def: 1 },
  horizon: { min: 8, max: 20, step: 1, def: 16 },
};

export const DEFAULT_VALUES: ScenarioValues = {
  tab: 'rate',
  policyChangeBp: 0,
  holdQuarters: 4,
  inflationShock: 0,
  shockPersistence: 0.5,
  demandShock: 0,
  oilShock: 0,
  phiPi: DEFAULT_PARAMS.phiPi,
  lambda: DEFAULT_PARAMS.lambda,
  rStar: null,
  horizon: 16,
  baselineMode: 'market',
  marketOverride: '',
};

export function clampToSpec(key: NumericKey, v: unknown): number {
  const s = SLIDERS[key];
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return s.def;
  return Math.min(s.max, Math.max(s.min, n));
}

/** Sanitize anything (URL, localStorage) into valid scenario values. */
export function sanitize(raw: Partial<Record<keyof ScenarioValues, unknown>>): ScenarioValues {
  const v: ScenarioValues = { ...DEFAULT_VALUES };
  if (raw.tab === 'rate' || raw.tab === 'shock' || raw.tab === 'custom') v.tab = raw.tab;
  if (raw.baselineMode === 'market' || raw.baselineMode === 'rule')
    v.baselineMode = raw.baselineMode;
  if (typeof raw.marketOverride === 'string') v.marketOverride = raw.marketOverride.slice(0, 2000);
  for (const k of Object.keys(SLIDERS) as NumericKey[]) {
    if (raw[k] === undefined) continue;
    if (k === 'rStar' && (raw.rStar === null || raw.rStar === '')) {
      v.rStar = null;
      continue;
    }
    (v as unknown as Record<string, number>)[k] = clampToSpec(k, raw[k]);
  }
  v.holdQuarters = Math.round(v.holdQuarters);
  v.horizon = Math.round(v.horizon);
  return v;
}

/** Map UI values to model inputs; tabs act as lenses over the same values. */
export function toModelInputs(v: ScenarioValues): ScenarioInputs {
  const useRate = v.tab !== 'shock';
  const useShock = v.tab !== 'rate';
  return {
    policyChange: useRate ? v.policyChangeBp / 100 : 0,
    holdQuarters: v.holdQuarters,
    inflationShock: useShock ? v.inflationShock : 0,
    shockPersistence: v.shockPersistence,
    demandShock: v.demandShock,
    oilShock: v.oilShock,
    phiPi: v.phiPi,
    lambda: v.lambda,
    rStar: v.rStar ?? undefined,
    horizon: v.horizon,
    baselineMode: v.baselineMode,
  };
}

/** True when the effective inputs equal the baseline (nothing to compare). */
export function isNeutral(v: ScenarioValues): boolean {
  const m = toModelInputs(v);
  return (
    m.policyChange === 0 &&
    m.inflationShock === 0 &&
    m.demandShock === 0 &&
    m.oilShock === 0 &&
    m.phiPi === DEFAULT_PARAMS.phiPi &&
    m.lambda === DEFAULT_PARAMS.lambda &&
    m.rStar === undefined
  );
}
