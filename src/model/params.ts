/**
 * Every model parameter in one place. Each entry documents: meaning, default,
 * plausible range and source. Defaults were tuned with `npm run calibrate`
 * so a +100bp tightening lands in FRB/US-like response ranges (see CLAUDE.md).
 *
 * This is a SIMPLIFIED educational model inspired by FRB/US — not FRB/US.
 */

export interface ParamMeta {
  value: number;
  min: number;
  max: number;
  symbol: string;
  fa: string;
  en: string;
  source: string;
}

export const PARAM_META = {
  // ── IS curve: y_t = ρy·y_{t−1} − α·mean(r_{t−1..t−4} − r*) + d_t ─────────
  rhoY: {
    value: 0.8,
    min: 0.6,
    max: 0.95,
    symbol: 'ρ_y',
    fa: 'ماندگاری شکاف تولید',
    en: 'Output-gap persistence',
    source:
      'Typical estimates 0.8–0.9 (Rudebusch–Svensson 1999; Laubach–Williams 2003). Brief’s guess 0.85; 0.80 moves the output trough from Q9 to Q8.',
  },
  alpha: {
    value: 0.35,
    min: 0.05,
    max: 0.4,
    symbol: 'α',
    fa: 'حساسیت تقاضا به نرخ بهرهٔ واقعی',
    en: 'Demand sensitivity to the real rate',
    source:
      'Rudebusch–Svensson ≈0.1 per quarter on a 4-quarter average (brief’s guess 0.12). Raised to 0.35 by `npm run calibrate` so +100bp gives an FRB/US-like output trough of ≈ −1pp after ~2 years; it stands in for the wealth, credit and exchange-rate channels that this small model omits.',
  },
  // ── Phillips curve: π_t = γ·π_{t−1} + (1−γ)·πe_t + κ·y_{t−1} + s_t ───────
  gamma: {
    value: 0.75,
    min: 0.4,
    max: 0.95,
    symbol: 'γ',
    fa: 'اینرسی تورم',
    en: 'Inflation inertia',
    source:
      'Backward-looking weight in hybrid Phillips curves 0.5–0.8 (Galí–Gertler 1999; Fuhrer 2010).',
  },
  kappa: {
    value: 0.06,
    min: 0.01,
    max: 0.2,
    symbol: 'κ',
    fa: 'شیب منحنی فیلیپس',
    en: 'Phillips-curve slope',
    source:
      'Quarterly slope on the output gap 0.02–0.1; flat recent estimates (Hazell et al. 2022).',
  },
  // ── Expectations: πe_t = λ·π_LR + (1−λ)·π_{t−1} ──────────────────────────
  lambda: {
    value: 0.3,
    min: 0,
    max: 1,
    symbol: 'λ',
    fa: 'لنگر انتظارات تورمی',
    en: 'Expectations anchoring',
    source:
      'Weight on the long-run anchor. 0 = purely backward-looking (1970s), 1 = fully anchored. 0.3 gives an inflation half-life ≈ 9 quarters.',
  },
  // ── Okun's law: u_t = u_{t−1} + θ·[(u* − β·y_t) − u_{t−1}] ──────────────
  beta: {
    value: 0.5,
    min: 0.3,
    max: 0.7,
    symbol: 'β',
    fa: 'ضریب اوکان',
    en: 'Okun coefficient',
    source:
      'Okun’s law: ≈0.5pp of unemployment per 1pp of output gap (Ball, Leigh & Loungani 2017).',
  },
  theta: {
    value: 0.4,
    min: 0.1,
    max: 1,
    symbol: 'θ',
    fa: 'سرعت تعدیل بازار کار',
    en: 'Labour-market adjustment speed',
    source: 'Partial adjustment per quarter; hiring/firing lags make unemployment trail output.',
  },
  // ── Policy rule (inertial Taylor) ────────────────────────────────────────
  rhoI: {
    value: 0.85,
    min: 0.5,
    max: 0.95,
    symbol: 'ρ_i',
    fa: 'تدریجی بودن سیاست فدرال',
    en: 'Policy inertia',
    source: 'Estimated interest-rate smoothing 0.8–0.9 per quarter (Clarida, Galí & Gertler 2000).',
  },
  phiPi: {
    value: 0.5,
    min: 0,
    max: 1.5,
    symbol: 'φ_π',
    fa: 'سخت‌گیری فدرال در برابر تورم',
    en: 'Fed hawkishness (inflation response)',
    source: 'Taylor (1993) = 0.5 on the inflation gap (total response 1.5).',
  },
  phiY: {
    value: 0.5,
    min: 0,
    max: 1.5,
    symbol: 'φ_y',
    fa: 'واکنش فدرال به شکاف تولید',
    en: 'Output-gap response',
    source: 'Taylor (1993) = 0.5.',
  },
  // ── Financial block ──────────────────────────────────────────────────────
  b10: {
    value: 0.4,
    min: 0.2,
    max: 0.7,
    symbol: 'b_10',
    fa: 'انتقال بازده ۲ ساله به ۱۰ ساله',
    en: '2y → 10y pass-through',
    source:
      'Event studies: 10y moves ≈0.3–0.5bp per 1bp of 2y on policy news (Hanson & Stein 2015).',
  },
  eUSD: {
    value: 3,
    min: 1,
    max: 6,
    symbol: 'e_USD',
    fa: 'حساسیت دلار (٪ به ازای ۱۰۰ واحد پایه)',
    en: 'Dollar sensitivity (% per 100bp of 2y)',
    source: 'Broad dollar +2–4% per 100bp policy surprise (Rogers, Scotti & Wright 2014; FRB/US).',
  },
  usdPersist: {
    value: 0.95,
    min: 0.7,
    max: 1,
    symbol: 'ρ_USD',
    fa: 'ماندگاری اثر دلار',
    en: 'Dollar effect persistence',
    source:
      'Gradual erosion of the exchange-rate effect via trade and price adjustment (assumption).',
  },
  eEq: {
    value: -5,
    min: -10,
    max: -2,
    symbol: 'e_Eq',
    fa: 'حساسیت سهام (٪ به ازای ۱۰۰ واحد پایه)',
    en: 'Equity sensitivity (% per 100bp of 2y)',
    source: 'S&P 500 −4% to −6% per 100bp policy surprise (Bernanke & Kuttner 2005).',
  },
  eqGap: {
    value: 1.5,
    min: 0,
    max: 4,
    symbol: 'e_y',
    fa: 'اثر شکاف تولید بر سهام',
    en: 'Equity link to output gap (% per pp)',
    source:
      'Earnings channel: weaker activity weighs on prices as the rate effect fades (assumption).',
  },
  hS: {
    value: 17,
    min: 5,
    max: 25,
    symbol: 'h_m',
    fa: 'حساسیت ساخت مسکن به نرخ وام',
    en: 'Housing starts per 1pp mortgage rate (%)',
    source:
      'Housing starts fall ≈10–20% within a year per 1pp rise in mortgage rates (range of empirical estimates); 17 hits the −3% to −6% Q4 target.',
  },
  hY: {
    value: 2,
    min: 0,
    max: 5,
    symbol: 'h_y',
    fa: 'اثر شکاف تولید بر مسکن',
    en: 'Housing link to output gap (% per pp)',
    source: 'Cyclical income effect on housing demand (assumption).',
  },
  rhoH: {
    value: 0.5,
    min: 0,
    max: 0.9,
    symbol: 'ρ_h',
    fa: 'تأخیر واکنش مسکن',
    en: 'Housing adjustment lag',
    source: 'Partial adjustment; housing responds within 2–4 quarters (Bernanke & Gertler 1995).',
  },
  iS: {
    value: 3.5,
    min: 1,
    max: 8,
    symbol: 'i_r',
    fa: 'حساسیت سرمایه‌گذاری به نرخ واقعی',
    en: 'Business investment per 1pp real rate (%)',
    source: 'User-cost elasticity: investment −2% to −4% after a year per 100bp (FRB/US-style).',
  },
  iY: {
    value: 2,
    min: 0,
    max: 4,
    symbol: 'i_y',
    fa: 'اثر شتاب‌دهنده بر سرمایه‌گذاری',
    en: 'Investment accelerator (% per pp gap)',
    source: 'Investment swings ≈2–3× GDP over the cycle (accelerator).',
  },
  rhoInv: {
    value: 0.6,
    min: 0,
    max: 0.9,
    symbol: 'ρ_I',
    fa: 'تأخیر واکنش سرمایه‌گذاری',
    en: 'Investment adjustment lag',
    source: 'Planning and delivery lags of 2–4 quarters.',
  },
  // ── Shocks ───────────────────────────────────────────────────────────────
  rhoD: {
    value: 0.7,
    min: 0,
    max: 0.95,
    symbol: 'ρ_d',
    fa: 'ماندگاری شوک تقاضا',
    en: 'Demand-shock persistence',
    source: 'Assumption: demand shocks fade by half in ~2 quarters.',
  },
  rhoOil: {
    value: 0.8,
    min: 0.5,
    max: 0.95,
    symbol: 'ρ_o',
    fa: 'ماندگاری شوک نفت',
    en: 'Oil-price shock persistence',
    source: 'Oil price deviations decay with a half-life of ~3 quarters (futures curves).',
  },
  oilPass: {
    value: 0.02,
    min: 0.01,
    max: 0.04,
    symbol: 'ω_o',
    fa: 'اثر نفت بر تورم کل (واحد درصد به ازای ۱٪)',
    en: 'Oil → headline PCE (pp per 1%)',
    source:
      '10% oil ≈ +0.2pp headline PCE over a year (energy weight ≈4%, gasoline pass-through ≈50%).',
  },
  oilCore: {
    value: 0.1,
    min: 0,
    max: 0.3,
    symbol: 'χ_o',
    fa: 'اثر غیرمستقیم نفت بر تورم هسته',
    en: 'Oil → core (share of headline effect)',
    source: 'Indirect effects via transport and input costs are small (Clark & Terry 2010).',
  },
  oilGap: {
    value: 0.012,
    min: 0,
    max: 0.03,
    symbol: 'η_o',
    fa: 'اثر نفت بر شکاف تولید',
    en: 'Oil → output gap (pp per 1%)',
    source: '10% oil ≈ −0.1 to −0.2% GDP (Hamilton 2009; Kilian 2009).',
  },
  rhoHeadline: {
    value: 0.6,
    min: 0,
    max: 0.9,
    symbol: 'ρ_H',
    fa: 'میرایی فاصلهٔ تورم کل و هسته',
    en: 'Headline–core gap decay',
    source: 'Food/energy wedges mean-revert within a few quarters (assumption).',
  },
  // ── Safety bounds (inactive in normal ranges; keep extreme scenarios finite) ─
  gapMax: {
    value: 8,
    min: 4,
    max: 12,
    symbol: 'y_max',
    fa: 'سقف نرم شکاف تولید',
    en: 'Soft cap on output gap',
    source:
      'Capacity limits: the U.S. gap rarely exceeds +5%. Soft-saturates beyond 60% of the cap.',
  },
  gapMin: {
    value: -12,
    min: -20,
    max: -6,
    symbol: 'y_min',
    fa: 'کف نرم شکاف تولید',
    en: 'Soft floor on output gap',
    source: 'Deepest post-war quarterly gap ≈ −10% (2020 Q2).',
  },
  uMin: {
    value: 2,
    min: 1,
    max: 3,
    symbol: 'u_min',
    fa: 'کف نرخ بیکاری',
    en: 'Unemployment floor',
    source: 'Frictional unemployment: the U.S. rate has not fallen below 2.5% since 1953.',
  },
  // ── Institutional ────────────────────────────────────────────────────────
  elb: {
    value: 0.125,
    min: 0,
    max: 0.5,
    symbol: 'i_min',
    fa: 'کف مؤثر نرخ بهره',
    en: 'Effective lower bound',
    source: 'Midpoint of the 0–0.25% range used in 2008–15 and 2020–22.',
  },
  piTarget: {
    value: 2,
    min: 2,
    max: 2,
    symbol: 'π*',
    fa: 'هدف تورم فدرال',
    en: 'Fed inflation target',
    source: 'FOMC Statement on Longer-Run Goals (PCE inflation 2%).',
  },
} as const satisfies Record<string, ParamMeta>;

export type ParamKey = keyof typeof PARAM_META;
export type ModelParams = { [K in ParamKey]: number };

export const DEFAULT_PARAMS: ModelParams = Object.fromEntries(
  Object.entries(PARAM_META).map(([k, m]) => [k, m.value]),
) as ModelParams;

/**
 * Approximate ~70% uncertainty bands (± pp) from typical historical forecast
 * errors at 4 and 8 quarters ahead (in the spirit of the SEP's historical
 * projection-error table). Interpolated/extrapolated by `fanHalfWidth`.
 */
export const FAN_ERRORS = {
  gdpGrowth: { q4: 1.5, q8: 2.1 },
  corePce: { q4: 0.8, q8: 1.2 },
  unemployment: { q4: 0.5, q8: 0.9 },
  policyRate: { q4: 0.8, q8: 1.4 },
} as const;

export type FanVariable = keyof typeof FAN_ERRORS;
