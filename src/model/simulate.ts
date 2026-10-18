/**
 * Fed Policy Lab model — a small quarterly, backward-looking New-Keynesian-style
 * system inspired by FRB/US (NOT FRB/US). Pure, allocation-light, < 0.1 ms/run.
 *
 * Equations (t = 1..H), see CLAUDE.md for the full write-up:
 *  1. πe_t = λ·π_LR + (1−λ)·π_{t−1}
 *  2. r_t  = i_t − πe_t
 *  3. y_t  = ρy·y_{t−1} − α·mean(r_{t−1..t−4} − r*) + d_t
 *  4. π_t  = γ·π_{t−1} + (1−γ)·πe_t + κ·y_{t−1} + s_t
 *  5. u_t  = u_{t−1} + θ·[(u* − β·y_t) − u_{t−1}]
 *  6. g_t  = gPot + 4·(y_t − y_{t−1})
 *  7. policy: baseline = market path (then rule) or inertial Taylor rule;
 *     scenario = baseline + user change held N quarters, then the rule's
 *     response to every difference from the baseline. ELB: i_t ≥ i_min.
 *  8. financial block computed from the policy paths.
 *
 * Shock convention: the slider value is the shock's IMPACT on the variable.
 * Impulses x_t (inflation: S·ρs^(t−1) + χo·oilπ_t; demand: D·ρd^(t−1) − ηo·oil_t)
 * enter quasi-differenced with the baseline persistence (s_t = x_t − a0·x_{t−1}),
 * so with normal dynamics and no feedback the variable moves by exactly x_t.
 * De-anchored expectations (λ below default) then amplify the same shock.
 */
import { DEFAULT_PARAMS, type ModelParams } from './params';
import {
  PATH_KEYS,
  type InitialConditions,
  type PathSet,
  type ScenarioInputs,
  type SimResult,
} from './types';

/** Extra quarters simulated beyond the horizon so 2y yields can look 8 quarters ahead. */
const LOOKAHEAD = 8;

function emptyPaths(n: number): PathSet {
  return Object.fromEntries(PATH_KEYS.map((k) => [k, new Float64Array(n)])) as PathSet;
}

interface Shocks {
  s: Float64Array; // core inflation term (quasi-differenced)
  d: Float64Array; // demand term (quasi-differenced)
  oilPi: Float64Array; // oil contribution to headline y/y inflation, pp
}

/** Smooth saturation: identity inside 60% of the bounds, tanh-limited beyond. */
export function softClamp(x: number, lo: number, hi: number): number {
  const kHi = 0.6 * hi;
  const kLo = 0.6 * lo;
  if (x > kHi) return kHi + (hi - kHi) * Math.tanh((x - kHi) / (hi - kHi));
  if (x < kLo) return kLo + (lo - kLo) * Math.tanh((x - kLo) / (lo - kLo));
  return x;
}

/** Persistence of inflation under the baseline parameters: γ + (1−γ)(1−λ). */
export const inflationPersistence = (p: ModelParams): number =>
  p.gamma + (1 - p.gamma) * (1 - p.lambda);

function buildShocks(
  inp: ScenarioInputs | null,
  p: ModelParams,
  base: ModelParams,
  n: number,
): Shocks {
  const s = new Float64Array(n);
  const d = new Float64Array(n);
  const oilPi = new Float64Array(n);
  if (inp) {
    const a0 = inflationPersistence(base);
    const xPi = new Float64Array(n);
    const xD = new Float64Array(n);
    const oil = new Float64Array(n);
    for (let t = 1; t < n; t++) {
      oil[t] = inp.oilShock * p.rhoOil ** (t - 1);
      // y/y headline effect of the oil price level (realistic base effects after 4Q)
      oilPi[t] = p.oilPass * (oil[t]! - (t >= 4 ? oil[t - 4]! : 0));
      xPi[t] = inp.inflationShock * inp.shockPersistence ** (t - 1) + p.oilCore * oilPi[t]!;
      xD[t] = inp.demandShock * p.rhoD ** (t - 1) - p.oilGap * oil[t]!;
      s[t] = xPi[t]! - a0 * xPi[t - 1]!;
      d[t] = xD[t]! - base.rhoY * xD[t - 1]!;
    }
  }
  return { s, d, oilPi };
}

interface PolicyCtx {
  kind: 'baseline' | 'scenario';
  mode: 'market' | 'rule';
  marketPath: readonly number[];
  /** Baseline paths + params (scenario only). */
  base?: PathSet;
  baseRStar?: number;
  basePhiPi?: number;
  policyChange?: number;
  holdQuarters?: number;
}

function runCore(
  p: ModelParams,
  init: InitialConditions,
  rStar: number,
  shocks: Shocks,
  ctx: PolicyCtx,
  n: number,
): PathSet {
  const P = emptyPaths(n);
  const { i, r, pie, pi, piH, y, u, g } = P;
  const { lambda, gamma, kappa, rhoY, alpha, beta, theta, rhoI, phiPi, phiY, elb, piTarget } = p;
  const headlineGap0 = init.piHeadline0 - init.pi0;

  i[0] = init.i0;
  pi[0] = init.pi0;
  piH[0] = init.piHeadline0;
  y[0] = init.y0;
  u[0] = init.u0;
  g[0] = init.g0;
  pie[0] = lambda * init.piLR + (1 - lambda) * init.pi0;
  r[0] = i[0] - pie[0];

  // Pre-sample real rates are held at today's level.
  const rLag = (k: number) => (k >= 0 ? r[k]! : r[0]!);

  for (let t = 1; t < n; t++) {
    pie[t] = lambda * init.piLR + (1 - lambda) * pi[t - 1]!;
    const stance = (rLag(t - 1) + rLag(t - 2) + rLag(t - 3) + rLag(t - 4)) / 4 - rStar;
    y[t] = softClamp(rhoY * y[t - 1]! - alpha * stance + shocks.d[t]!, p.gapMin, p.gapMax);
    pi[t] = gamma * pi[t - 1]! + (1 - gamma) * pie[t]! + kappa * y[t - 1]! + shocks.s[t]!;
    piH[t] = pi[t]! + shocks.oilPi[t]! + headlineGap0 * p.rhoHeadline ** t;
    u[t] = Math.max(p.uMin, u[t - 1]! + theta * (init.uStar - beta * y[t]! - u[t - 1]!));
    g[t] = init.gPot + 4 * (y[t]! - y[t - 1]!);

    let rate: number;
    if (ctx.kind === 'baseline') {
      const m = ctx.marketPath[t - 1];
      if (ctx.mode === 'market' && m !== undefined) {
        rate = m;
      } else {
        const target = rStar + pi[t]! + phiPi * (pi[t]! - piTarget) + phiY * y[t]!;
        rate = rhoI * i[t - 1]! + (1 - rhoI) * target;
      }
    } else {
      const b = ctx.base!;
      const hold = ctx.policyChange !== 0 && t <= ctx.holdQuarters!;
      if (hold) {
        rate = b.i[t]! + ctx.policyChange!;
      } else {
        // The rule's response to every difference from the baseline world —
        // identical to the plain Taylor rule when the baseline is the rule.
        const bPhi = ctx.basePhiPi!;
        const response =
          rStar -
          ctx.baseRStar! +
          (1 + phiPi) * pi[t]! -
          (1 + bPhi) * b.pi[t]! -
          piTarget * (phiPi - bPhi) +
          phiY * (y[t]! - b.y[t]!);
        rate = b.i[t]! + rhoI * (i[t - 1]! - b.i[t - 1]!) + (1 - rhoI) * response;
      }
    }
    i[t] = Math.max(elb, rate);
    r[t] = i[t]! - pie[t]!;
  }
  return P;
}

/** Forward-looking 2y yield: average policy rate over the next 8 quarters + term premium. */
function twoYear(i: Float64Array, t: number, tp2: number): number {
  let s = 0;
  for (let k = 0; k < LOOKAHEAD; k++) s += i[Math.min(t + k, i.length - 1)]!;
  return s / LOOKAHEAD + tp2;
}

function financialBlock(
  p: ModelParams,
  init: InitialConditions,
  base: PathSet,
  scen: PathSet,
  anchorShift: number,
  n: number,
): void {
  const tp2 = init.dgs2 - twoYear(base.i, 0, 0);
  for (const P of [base, scen]) {
    const shift = P === scen ? anchorShift : 0;
    P.y2[0] = init.dgs2;
    for (let t = 1; t < n; t++) P.y2[t] = twoYear(P.i, t, tp2);
    for (let t = 0; t < n; t++) {
      P.y10[t] = init.dgs10 + p.b10 * (P.y2[t]! - init.dgs2) + (t > 0 ? shift : 0);
      P.mort[t] = P.y10[t]! + init.mortgageSpread;
    }
  }
  // Satellite indicators: % deviation of the scenario from the baseline (no feedback to the IS curve).
  let houseRaw = 0;
  let invRaw = 0;
  for (let t = 1; t < n; t++) {
    const d2 = scen.y2[t]! - base.y2[t]!;
    const dy = scen.y[t]! - base.y[t]!;
    scen.usd[t] = softClamp(p.eUSD * d2 * p.usdPersist ** (t - 1), -40, 40);
    scen.eq[t] = softClamp(p.eEq * d2 + p.eqGap * dy, -70, 70);
    const dMort = scen.mort[t - 1]! - base.mort[t - 1]!;
    const dyLag = scen.y[t - 1]! - base.y[t - 1]!;
    const dr = scen.r[t - 1]! - base.r[t - 1]!;
    houseRaw = p.rhoH * houseRaw + (1 - p.rhoH) * (-p.hS * dMort + p.hY * dyLag);
    invRaw = p.rhoInv * invRaw + (1 - p.rhoInv) * (-p.iS * dr + p.iY * dyLag);
    scen.house[t] = softClamp(houseRaw, -80, 80);
    scen.inv[t] = softClamp(invRaw, -60, 60);
  }
}

function trim(P: PathSet, len: number): PathSet {
  return Object.fromEntries(PATH_KEYS.map((k) => [k, P[k].slice(0, len)])) as PathSet;
}

export function simulate(
  init: InitialConditions,
  inp: ScenarioInputs,
  params: ModelParams = DEFAULT_PARAMS,
): SimResult {
  const H = Math.max(1, Math.round(inp.horizon));
  const n = H + 1 + LOOKAHEAD;

  const baseParams = params;
  const scenParams: ModelParams = {
    ...params,
    phiPi: inp.phiPi ?? params.phiPi,
    lambda: inp.lambda ?? params.lambda,
  };
  const rStarBase = init.rStar;
  const rStarScen = inp.rStar ?? init.rStar;

  const base = runCore(
    baseParams,
    init,
    rStarBase,
    buildShocks(null, baseParams, baseParams, n),
    {
      kind: 'baseline',
      mode: inp.baselineMode,
      marketPath: init.marketPath,
    },
    n,
  );

  const scen = runCore(
    scenParams,
    init,
    rStarScen,
    buildShocks(inp, scenParams, baseParams, n),
    {
      kind: 'scenario',
      mode: inp.baselineMode,
      marketPath: init.marketPath,
      base,
      baseRStar: rStarBase,
      basePhiPi: baseParams.phiPi,
      policyChange: inp.policyChange,
      holdQuarters: Math.max(0, Math.round(inp.holdQuarters)),
    },
    n,
  );

  // Long-run anchor shift for the 10y: Δ(π_LR + r*) between scenario and data.
  financialBlock(baseParams, init, base, scen, rStarScen - rStarBase, n);

  return { horizon: H, baseline: trim(base, H + 1), scenario: trim(scen, H + 1) };
}

export const ZERO_SCENARIO: Omit<ScenarioInputs, 'horizon' | 'baselineMode'> = {
  policyChange: 0,
  holdQuarters: 4,
  inflationShock: 0,
  shockPersistence: 0.5,
  demandShock: 0,
  oilShock: 0,
};
