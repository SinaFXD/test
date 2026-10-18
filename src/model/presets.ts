import type { ScenarioValues } from '../state/controls';

export type GenericPresetId =
  | 'softLanding'
  | 'stickyInflation'
  | 'hawkish'
  | 'emergencyCut'
  | 'oilShock'
  | 'deanchored'
  | 'recessionScare';

export type HistoryPresetId =
  | 'gfc2008'
  | 'oil2008'
  | 'euro2011'
  | 'taper2013'
  | 'oil2015'
  | 'tax2018'
  | 'trade2019'
  | 'covid2020'
  | 'surge2021'
  | 'hikes2022'
  | 'energy2022'
  | 'svb2023'
  | 'cuts2024'
  | 'tariffs2025';

export type PresetId = GenericPresetId | HistoryPresetId;

export type PresetGroup = 'generic' | 'history';

export interface Preset {
  id: PresetId;
  group: PresetGroup;
  values: Partial<ScenarioValues>;
}

/**
 * One-click scenarios. Each starts from the defaults (horizon, baseline and
 * any pasted market path are kept) and overrides only what it needs.
 */
export const GENERIC_PRESETS: Array<{ id: GenericPresetId; values: Partial<ScenarioValues> }> = [
  {
    // Demand cools gently, supply improves a little, expectations firmly anchored.
    id: 'softLanding',
    values: {
      tab: 'custom',
      demandShock: -0.5,
      inflationShock: -0.5,
      shockPersistence: 0.6,
      lambda: 0.5,
    },
  },
  {
    // Persistent cost pressure with somewhat looser expectations.
    id: 'stickyInflation',
    values: { tab: 'shock', inflationShock: 1, shockPersistence: 0.85, lambda: 0.15 },
  },
  {
    // +100bp above the baseline for 4 quarters, then a more hawkish rule.
    id: 'hawkish',
    values: { tab: 'rate', policyChangeBp: 100, holdQuarters: 4, phiPi: 1 },
  },
  {
    // A sudden demand collapse met by a 150bp emergency cut.
    id: 'emergencyCut',
    values: { tab: 'custom', policyChangeBp: -150, holdQuarters: 4, demandShock: -2 },
  },
  {
    // Oil +40%; the Fed follows its rule.
    id: 'oilShock',
    values: { tab: 'custom', oilShock: 40 },
  },
  {
    // 1970s: weak anchor, dovish Fed, persistent inflation impulse.
    id: 'deanchored',
    values: { tab: 'shock', inflationShock: 1.5, shockPersistence: 0.8, lambda: 0.05, phiPi: 0.1 },
  },
  {
    // Demand drops sharply; the Fed reacts via its rule.
    id: 'recessionScare',
    values: { tab: 'custom', demandShock: -2 },
  },
];

/**
 * Historical episodes, oldest first. Each replays a shock *similar* to the
 * episode on today's economy (today's data are the starting point) — it is an
 * analogy, not a replay of history. Magnitudes are rough readings of the
 * episode (CBO output gap, oil prices, the Fed's actual moves); the copy in
 * `i18n` states what really happened next so users can compare.
 */
export const HISTORY_PRESETS: Array<{ id: HistoryPresetId; values: Partial<ScenarioValues> }> = [
  {
    // 2007–09: housing bust + Lehman. Gap ≈ −6pp and slow to heal; oil $147 → $35;
    // the Fed cut 500bp to zero within 15 months.
    id: 'gfc2008',
    values: {
      tab: 'custom',
      demandShock: -6,
      demandPersistence: 0.9,
      oilShock: -50,
      policyChangeBp: -300,
      holdQuarters: 4,
    },
  },
  {
    // 2007–08: oil roughly doubled to $147; headline PCE ≈ 4.5% while core stayed ≈ 2.4%.
    id: 'oil2008',
    values: { tab: 'custom', oilShock: 100, inflationShock: 0.25, shockPersistence: 0.5 },
  },
  {
    // 2010–12: euro-area debt crisis and the 2011 U.S. downgrade — a moderate, lasting drag.
    id: 'euro2011',
    values: { tab: 'custom', demandShock: -1.25, demandPersistence: 0.8 },
  },
  {
    // 2013: markets priced an earlier exit (QE taper). Proxy: a tighter expected path.
    id: 'taper2013',
    values: { tab: 'rate', policyChangeBp: 50, holdQuarters: 8 },
  },
  {
    // 2014–16: Brent $115 → $30, strong dollar, energy-capex slump; Fed delayed liftoff.
    id: 'oil2015',
    values: { tab: 'custom', oilShock: -70, demandShock: -0.5, demandPersistence: 0.8 },
  },
  {
    // 2017–18: tax cuts + spending deal boost demand; the Fed hikes four times in 2018.
    id: 'tax2018',
    values: { tab: 'custom', demandShock: 1, demandPersistence: 0.8 },
  },
  {
    // 2018–19: tariffs weigh on investment and lift goods prices; three 25bp "insurance" cuts.
    id: 'trade2019',
    values: {
      tab: 'custom',
      demandShock: -0.75,
      demandPersistence: 0.8,
      inflationShock: 0.25,
      shockPersistence: 0.5,
      policyChangeBp: -75,
      holdQuarters: 4,
    },
  },
  {
    // 2020: a huge but short collapse (fiscal support → fast healing); oil −60%;
    // emergency cuts of 150bp to zero, held there for two years.
    id: 'covid2020',
    values: {
      tab: 'custom',
      demandShock: -6,
      demandPersistence: 0.5,
      oilShock: -60,
      policyChangeBp: -150,
      holdQuarters: 6,
    },
  },
  {
    // 2021: supply bottlenecks + stimulus; the Fed calls it "transitory" and waits.
    id: 'surge2021',
    values: {
      tab: 'custom',
      inflationShock: 2.5,
      shockPersistence: 0.85,
      demandShock: 1.5,
      demandPersistence: 0.8,
      policyChangeBp: -100,
      holdQuarters: 4,
      lambda: 0.15,
    },
  },
  {
    // 2022–23: the same inflation shock, but the Fed front-loads 525bp of hikes.
    id: 'hikes2022',
    values: {
      tab: 'custom',
      inflationShock: 2.5,
      shockPersistence: 0.85,
      policyChangeBp: 300,
      holdQuarters: 4,
      phiPi: 1,
    },
  },
  {
    // 2022: Russia invades Ukraine — oil +60%, food and commodity prices jump.
    id: 'energy2022',
    values: {
      tab: 'custom',
      oilShock: 60,
      inflationShock: 0.5,
      shockPersistence: 0.6,
      demandShock: -0.5,
      demandPersistence: 0.7,
    },
  },
  {
    // 2023: SVB and other bank failures tighten credit — worth roughly a rate hike or two.
    id: 'svb2023',
    values: { tab: 'custom', demandShock: -1, demandPersistence: 0.85 },
  },
  {
    // 2024: inflation cools, the job market softens; the Fed cuts 100bp (starting with 50).
    id: 'cuts2024',
    values: {
      tab: 'custom',
      demandShock: -0.5,
      demandPersistence: 0.7,
      inflationShock: -0.5,
      shockPersistence: 0.6,
      policyChangeBp: -100,
      holdQuarters: 4,
    },
  },
  {
    // 2025: broad tariffs — a one-time rise in goods prices plus an uncertainty drag;
    // the Fed waits longer than markets expected before cutting.
    id: 'tariffs2025',
    values: {
      tab: 'custom',
      inflationShock: 0.75,
      shockPersistence: 0.6,
      demandShock: -0.75,
      demandPersistence: 0.8,
      policyChangeBp: 25,
      holdQuarters: 3,
    },
  },
];

export const PRESETS: Preset[] = [
  ...GENERIC_PRESETS.map((p) => ({ ...p, group: 'generic' as const })),
  ...HISTORY_PRESETS.map((p) => ({ ...p, group: 'history' as const })),
];

export const isHistoryPreset = (id: PresetId | null): id is HistoryPresetId =>
  id !== null && PRESETS.some((p) => p.id === id && p.group === 'history');
