import type { LatestData } from '../data/schema';
import type { InitialConditions } from './types';

/**
 * Build the model's starting point (t = 0) from the published data.
 * Every field has a conservative fallback so a missing series never breaks
 * the simulation (the UI separately marks missing data).
 */
export function initFromData(d: LatestData): InitialConditions {
  const s = (k: string) => d.series[k]?.latest;
  const i0 = d.derived.fedFundsMid.value;
  const pi0 = s('corePce') ?? 2;
  const dgs10 = s('dgs10') ?? 4;
  // Market path is in EFFR terms; shift it to fed-funds-mid terms.
  const shift = d.marketPath ? i0 - d.marketPath.startRate : 0;
  return {
    i0,
    pi0,
    piHeadline0: s('pce') ?? pi0,
    u0: s('unrate') ?? d.derived.nrou?.value ?? 4.2,
    uStar: d.derived.nrou?.value ?? 4.2,
    y0: d.derived.outputGap?.value ?? 0,
    g0: s('gdpGrowth') ?? d.derived.gPot?.value ?? 2,
    rStar: d.derived.rStar.value,
    piLR: d.derived.piLR.value,
    gPot: d.derived.gPot?.value ?? 2,
    dgs2: s('dgs2') ?? i0,
    dgs10,
    mortgageSpread: d.derived.mortgageSpread?.value ?? 2,
    marketPath: d.marketPath?.quarterly.map((q) => q.rate + shift) ?? [],
  };
}
