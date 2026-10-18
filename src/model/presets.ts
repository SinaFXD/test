import type { ScenarioValues } from '../state/controls';

export type PresetId =
  | 'softLanding'
  | 'stickyInflation'
  | 'hawkish'
  | 'emergencyCut'
  | 'oilShock'
  | 'deanchored'
  | 'recessionScare';

/**
 * One-click scenarios. Each starts from the defaults (horizon, baseline and
 * any pasted market path are kept) and overrides only what it needs.
 */
export const PRESETS: Array<{ id: PresetId; values: Partial<ScenarioValues> }> = [
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
