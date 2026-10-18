# Fed Policy Lab — developer guide

Educational, auto-updating Fed policy simulator. Static SPA (Vite + React 18 + TS strict),
data refreshed by a GitHub Action from the FRED API, model runs in the browser.

> Simplified educational model **inspired by** FRB/US. Not FRB/US, not a forecast, not advice.

## Commands

| Command                              | What it does                                          |
| ------------------------------------ | ----------------------------------------------------- |
| `npm run dev`                        | Vite dev server                                       |
| `npm run build`                      | Type-check (`tsc -b`) + production build to `dist/`   |
| `npm test`                           | Vitest (unit + component + model + calibration tests) |
| `npm run lint` / `npm run typecheck` | ESLint (zero warnings) / TypeScript                   |
| `npm run check`                      | lint + typecheck + test + build                       |

_(sections for data pipeline, model and parameters are filled in as milestones land)_

## Model (`src/model/`)

Quarterly, backward-looking, runs in the browser (< 0.1 ms per run; tested < 5 ms).
t = 0 is "today" (latest data); t = 1 is the next calendar quarter. Default horizon 16 (8–20).
All parameters (meaning, default, range, source) are in `src/model/params.ts`.

**Initial conditions** (`from-data.ts`): i0 = fedFundsMid, π0 = core PCE y/y, headline π0 = PCE
y/y, u0 = UNRATE, u* = NROU (current quarter), y0 = output gap, g0 = latest real GDP growth,
r*, π_LR, gPot, DGS2, DGS10, mortgage spread, market path (quarterly, shifted from EFFR to
fed-funds-mid terms).

**Equations** (`simulate.ts`, t = 1..H):

1. πe_t = λ·π_LR + (1−λ)·π_{t−1}
2. r_t = i_t − πe_t (pre-sample real rates held at r_0)
3. y_t = softClamp(ρy·y_{t−1} − α·mean(r_{t−1..t−4} − r*) + d_t, −12, +8)
4. π_t = γ·π_{t−1} + (1−γ)·πe_t + κ·y_{t−1} + s_t
5. u_t = max(u_min, u_{t−1} + θ·[(u* − β·y_t) − u_{t−1}])
6. g_t = gPot + 4·(y_t − y_{t−1})
7. Headline PCE = core + oil y/y contribution + initial headline–core gap·ρ_H^t
8. Policy (ELB: i_t ≥ 0.125):
   - Baseline "rule": i_t = ρi·i_{t−1} + (1−ρi)·[r* + π_t + φπ(π_t − 2) + φy·y_t]
   - Baseline "market": approximate market path for the quarters it covers (2 y), then the rule.
   - Scenario: `i_t = i^b_t + Δ` for t ≤ N if Δ ≠ 0; afterwards the rule's response to every
     difference from the baseline world:
     `i_t = i^b_t + ρi(i_{t−1} − i^b_{t−1}) + (1−ρi)[(r*_s − r*_b) + (1+φπ_s)π_t − (1+φπ_b)π^b_t − 2(φπ_s − φπ_b) + φy(y_t − y^b_t)]`.
     When the baseline is the rule, this is algebraically the plain Taylor rule with the scenario
     parameters (tested). With the market baseline, the Fed follows market pricing plus a rule-based
     reaction to the scenario. Zero inputs ⇒ scenario ≡ baseline exactly (tested).
9. Financial block: 2y_t = mean(i_{t..t+7}) + tp2 (tp2 so that the baseline matches DGS2 at t=0;
   8 look-ahead quarters are simulated beyond H); 10y_t = DGS10 + b10·(2y_t − DGS2) + Δr*;
   mortgage = 10y + today's spread. Satellites (% vs baseline, no feedback to the IS curve):
   dollar = eUSD·Δ2y·ρ_USD^(t−1); S&P = eEq·Δ2y + e_y·Δy; housing and business investment are
   partial-adjustment responses to lagged Δmortgage / Δreal rate plus an output-gap term.

**Baseline vs scenario parameters**: the baseline always uses the defaults (and the data's r*);
the scenario uses the user's φπ, λ and r*. So "Fed hawkishness" alone already changes the
scenario. A higher scenario r* loosens the IS stance _and_ enters the scenario Fed's rule.

**Shock convention**: slider value = impact on the variable. Inflation impulse
x_t = S·ρs^(t−1) + χo·oilπ_t and demand impulse D·ρd^(t−1) − ηo·oil_t enter quasi-differenced
with the baseline persistence (a0 = γ + (1−γ)(1−λ) for inflation, ρy for demand). Without
feedback the variable moves by exactly x_t; de-anchored expectations amplify the same shock.
(The naive additive form turned "+1pp" into +3pp of inflation.) Oil: % change in the oil price,
decaying at ρo; headline effect ωo·(oil_t − oil_{t−4}) gives realistic base effects.

**Uncertainty fan** (`uncertainty.ts`): ±half-width through the brief's 4Q/8Q errors (GDP 1.5/2.1,
core PCE 0.8/1.2, unemployment 0.5/0.9, policy 0.8/1.4) with a power law; beyond 8Q it widens at
half the rate. Labeled as an approximate ~70% band.

### Calibration (`npm run calibrate`, `src/model/calibration.ts`)

Experiment: neutral steady state (y=0, π=π_LR=2, i=3, r*=1), **+100bp vs the rule baseline at
t=1, held 4 quarters, then the inertial Taylor rule**; response = scenario − baseline. The model
is linear away from the ELB, so responses don't depend on the starting point. Results:

| Check                          | Model                                        | Target             |
| ------------------------------ | -------------------------------------------- | ------------------ |
| Output gap trough              | −1.07 pp @ Q8                                | −0.8…−1.4 @ Q5–Q9  |
| Unemployment peak              | +0.48 pp @ Q10                               | +0.3…+0.6 @ Q6–Q12 |
| Core PCE reached by Q8–Q12     | −0.35 pp (Q12)                               | −0.2…−0.5          |
| Core PCE trough (any Q)        | −0.37 pp @ Q14                               | −0.2…−0.5          |
| 2y / 10y on impact             | +75 / +30 bp                                 | +60…100 / +20…45   |
| Dollar / S&P 500 in Q1         | +2.2% / −3.7%                                | +1.5…4 / −3…−8     |
| Housing / investment by Q4     | −3.7% / −3.0%                                | −3…−6 / −2…−4      |
| Order (half-peak quarter)      | markets 1 → housing 2 → jobs 6 → inflation 9 | as listed          |
| Inflation half-life (α=0, y=0) | 8.9 quarters                                 | 6–10               |

Tuned vs the brief's initial guesses: ρy 0.85→0.80, α 0.12→0.35, housing sensitivity 17.
**Interpretation note**: the brief's "core inflation −0.2 to −0.5pp around Q8–Q12" is checked
as the effect _reached_ within Q8–Q12 plus the overall trough staying in range. A trough located
inside Q8–Q12 proved incompatible (grid search) with a 6–10-quarter inflation half-life plus an
output trough in Q5–Q9 unless ρy ≈ 0.6 — slow inflation dynamics are also what FRB/US shows.

**Model tests** (`model.test.ts`): every calibration check; zero shock ⇒ scenario ≡ baseline
(both baselines, neutral and real data); market baseline follows the market path; rule identity;
±100bp mirror; ELB respected; all 2¹¹ combinations of slider extremes × 2 starting points stay
finite and within plausibility bounds; shock-impact convention; speed.

## Conventions

- Node 22 LTS (Node 20 reached end-of-life in April 2026).
- Strict TS; no `any`. Prettier: single quotes, 100 cols.
- All UI strings live in `src/i18n/fa.ts` (source of truth) and `src/i18n/en.ts` (same shape, type-checked).
- Theme is driven by `<html data-theme>`; colors are CSS variables in `src/index.css`, exposed to Tailwind via `@theme inline`.
- Use logical Tailwind utilities (`ms-*`, `pe-*`, `start-*`, `text-start`) so RTL/LTR both work.
