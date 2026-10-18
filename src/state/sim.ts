/**
 * Single simulation driver: recomputes the model at most once per animation
 * frame whenever the scenario or data change, and publishes the result.
 * Also persists the scenario to localStorage and the URL (debounced).
 */
import { create } from 'zustand';
import { addQuarters, quarterMid, quarterOf } from '../data/dates';
import { overrideToQuarterly, parseOverride, type OverrideResult } from '../data/override';
import type { LatestData } from '../data/schema';
import { quarterLabel } from '../i18n/format';
import { writeJSON } from '../lib/storage';
import { initFromData } from '../model/from-data';
import { simulate } from '../model/simulate';
import type { InitialConditions, SimResult } from '../model/types';
import { toModelInputs } from './controls';
import { useData } from './data';
import { SCENARIO_KEY, scenarioValues, useScenario } from './scenario';
import { buildUrl } from './url-state';

export interface QuarterMeta {
  t: number;
  /** x position on time axes (asOf for t = 0, quarter midpoint otherwise). */
  date: string;
  year: number;
  q: number;
  /** "Q1 2027" (t = 0 is labelled "now" at render time). */
  label: string;
}

interface SimStore {
  result: SimResult | null;
  init: InitialConditions | null;
  quarters: QuarterMeta[];
  asOf: string;
  marketSource: 'computed' | 'override';
  override: OverrideResult | null;
}

export const useSim = create<SimStore>(() => ({
  result: null,
  init: null,
  quarters: [],
  asOf: '',
  marketSource: 'computed',
  override: null,
}));

export function modelAsOf(d: LatestData): string {
  return d.marketPath?.asOf ?? d.generatedAt.slice(0, 10);
}

export function quarterMeta(asOf: string, horizon: number): QuarterMeta[] {
  const q0 = quarterOf(asOf);
  return Array.from({ length: horizon + 1 }, (_, t) => {
    const qt = addQuarters(q0, t);
    return {
      t,
      date: t === 0 ? asOf : quarterMid(qt),
      year: qt.year,
      q: qt.q,
      label: quarterLabel(qt.year, qt.q),
    };
  });
}

let cachedInit: { data: LatestData; init: InitialConditions } | null = null;

export function recompute(): void {
  const { data } = useData.getState();
  if (!data) return;
  if (cachedInit?.data !== data) cachedInit = { data, init: initFromData(data) };
  const base = cachedInit.init;
  const v = scenarioValues(useScenario.getState());
  const asOf = modelAsOf(data);

  let init = base;
  let marketSource: SimStore['marketSource'] = 'computed';
  let override: OverrideResult | null = null;
  if (v.marketOverride.trim()) {
    override = parseOverride(v.marketOverride, asOf);
    if (override.ok) {
      init = { ...base, marketPath: overrideToQuarterly(override.meetings, asOf, base.i0) };
      marketSource = 'override';
    }
  }
  const result = simulate(init, toModelInputs(v));
  useSim.setState({
    result,
    init,
    quarters: quarterMeta(asOf, result.horizon),
    asOf,
    marketSource,
    override,
  });
}

let started = false;

export function startSimulationDriver(): void {
  if (started) return;
  started = true;
  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      recompute();
    });
  };
  useScenario.subscribe(schedule);
  useData.subscribe(schedule);
  recompute();

  let timer: ReturnType<typeof setTimeout> | undefined;
  useScenario.subscribe((s) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const v = scenarioValues(s);
      writeJSON(SCENARIO_KEY, v);
      try {
        history.replaceState(history.state, '', buildUrl(v, location.href));
      } catch {
        /* sandboxed iframes may forbid replaceState */
      }
    }, 300);
  });
}
