# Fed Policy Lab — developer guide

Educational, auto-updating Fed policy simulator. Static SPA (Vite 7 + React 18 + TS strict), data
refreshed by GitHub Actions from the FRED API, model runs in the browser. Hosted on GitHub Pages.

> Simplified educational model **inspired by** FRB/US. Not FRB/US, not a forecast, not advice.
> These honesty notes must stay visible in the UI (footer, Learn drawer, PNG/CSV exports).

## Commands

| Command                                       | What it does                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                                 | Vite dev server (works without a key: uses committed `public/data`)               |
| `npm run build`                               | `tsc -b` + production build to `dist/`                                            |
| `npm test`                                    | Vitest: unit, model, calibration, component tests                                 |
| `npm run lint` / `typecheck` / `format:check` | ESLint (zero warnings) / TypeScript / Prettier                                    |
| `npm run check`                               | lint + typecheck + test + build                                                   |
| `npm run calibrate`                           | +100bp experiment vs target ranges; exits 1 if any check fails                    |
| `npm run fetch-data [-- --dry-run]`           | FRED + FOMC calendar → `public/data/` + `src/data/fallback.json`                  |
| `npm run validate-data`                       | Validate data files + snapshots; scan `public/`, `src/data/`, `dist/` for the key |
| `npm run e2e`                                 | Builds with base `/`, runs Playwright (desktop + mobile)                          |
| `UPDATE_DOCS_SCREENSHOTS=1 npm run e2e`       | Also refresh README images in `docs/screenshots/`                                 |

Never pipe a gating command into `grep` in an `&&` chain — the pipe hides the exit code.

## Repository map

```
scripts/            fetch-data.ts, validate-data.ts, calibrate.ts, lib/{fred,http,fomc,build-series,history,fs,env}.ts
src/banks/          types.ts (BankConfig/SeriesSpec) · fed/{index,series}.ts — everything Fed-specific
src/data/           schema.ts (zod, shared) · derive.ts · market-path.ts · dates.ts · staleness.ts ·
                    validate.ts · override.ts · load.ts (zod, lazy) · client.ts · data.worker.ts ·
                    fomc-dates.json · fallback.json (generated)
src/model/          params.ts · simulate.ts · types.ts · from-data.ts · calibration.ts · uncertainty.ts · presets.ts
src/insights/       analysis.ts — peaks, transmission stages, summary inputs, market rules of thumb
src/state/          prefs · scenario (URL/localStorage) · controls (values ↔ model inputs) · data · sim (driver) · view
src/charts/         echarts.ts (tree-shaken) · EChart.tsx (lazy wrapper) · options.ts · theme.ts · crosshair.ts · registry.ts
src/components/     layout/ (Header, Banner, BottomSheet, Footer, Toast) · controls/ · results/ · learn/ (lazy)
src/i18n/           fa.ts (source of truth) · en.ts · index.ts (useT) · format.ts
e2e/                smoke.spec.ts (smoke + export + 8 screenshots)
.github/workflows/  ci.yml · deploy.yml · update-data.yml
```

## Data pipeline (`scripts/fetch-data.ts`)

**All-or-nothing**: any fetch or validation error → nothing written, exit 1, previous data stays live.

1. **FOMC calendar** — scrape `federalreserve.gov/monetarypolicy/fomccalendars.htm`
   (`scripts/lib/fomc.ts`). A year is trusted only if it parses to 7–10 meetings; other years come
   from `src/data/fomc-dates.json`, which is rewritten when the official page changes. Dates are
   decision days (second day); `*` → `sep: true`; notation votes/unscheduled entries skipped;
   meetings > 450 days old dropped.
2. **FRED** (`scripts/lib/fred.ts`) — `fred/series` (metadata) then `fred/series/observations`
   with `units` (`lin|pc1|pca|chg`). ≤ 4 concurrent requests, ≥ 300 ms between starts, 5 retries
   with exponential backoff + jitter on 429/5xx/network errors. `"."` values dropped. The key is
   redacted from every logged string. EFFR falls back to DFF.
3. **Series** (`src/banks/fed/series.ts`, `scripts/lib/build-series.ts`) — per series: id, title,
   units, frequency, kind, lastUpdated, lastObservationDate, latest, previous, change, history
   (daily → 3 y downsampled to one point per week; monthly/quarterly → 15 y). CBO projections
   (NROU, GDPPOT): "latest" = current quarter. SEP annual medians: "latest" = current year.
4. **Derived values** (`src/data/derive.ts`, unit-tested): `fedFundsMid = (DFEDTARU+DFEDTARL)/2`;
   `outputGap = 100·(GDPC1/GDPPOT − 1)` at the latest common quarter; `rStar = FEDTARMDLR − 2`
   (fallback 1.0); `piLR = clamp(T5YIFR − 0.3, 1.5, 3.5)` (`PI_LR_WEDGE`); `gPot` = average
   annualized CBO potential growth over the next 8 quarters; `nrou` = NROU for the current
   quarter; `mortgageSpread = MORTGAGE30US − DGS10` (same week).
5. **Approximate market path** (`src/data/market-path.ts`, unit-tested): CMT yields → continuous
   zero rates; EFFR (ACT/360) → continuous ACT/365. Unknowns = one policy level after each FOMC
   meeting within 2 years; the rate before the next meeting is pinned to EFFR (front-end anchor).
   Each zero rate (1m, 3m, 6m, 1y, 2y) must equal the time-average of the step path to its
   maturity; least squares with a tiny smoothness penalty (`1e-3`, first move unpenalized) picks
   the smoothest path that reprices the curve (errors < 0.1 bp). Full calendar quarters inside the
   2-year horizon feed the "market" baseline. Includes term premium and bill/fed-funds basis →
   labeled "approximate". Users can paste their own path (Advanced; URL + localStorage only).
6. **Validation** (`src/data/validate.ts`): zod schema + plausible range per series, ascending
   history, no future observations, fed funds range width, EFFR inside range, market-path sanity,
   ≥ 4 future FOMC meetings, output gap / NROU / gPot computable.
7. **Snapshots** (`public/data/history/YYYY-MM-DD.json`, keyed by the curve date) — key
   indicators + market path; `index.json` lists dates; > 400 days pruned. Missing business days in
   the last 45 days are **reconstructed** from FRED daily history (market data only, current
   vintage, `reconstructed: true`) so the 1-week / 1-month overlays work immediately.
8. **Outputs** — `public/data/latest.json` and an identical `src/data/fallback.json` (lazy chunk,
   used only if `latest.json` fails to load/validate → visible banner). Atomic writes.

**Staleness** (`src/data/staleness.ts`): measured from FRED `last_updated` (the source's last
publication), not the observation date — otherwise every monthly series would look stale (August
PCE is published at the end of September). Daily > 4 d, weekly > 10 d, monthly > 45 d,
quarterly > 120 d; DTWEXBGS 10 d (H.10 is weekly). Projections and SEP are never stale.

**Series vs the brief**: all 37 IDs verified with `fred/series` on 2026-10-18 — all valid. Added
**JCXFEMD** (SEP median for _core_ PCE) so SEP dots match the model's core PCE. NROU's FRED title
is now "Noncyclical Rate of Unemployment" (same CBO concept).

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
     parameters (tested). With the market baseline, the Fed follows market pricing plus a
     rule-based reaction to the scenario. Zero inputs ⇒ scenario ≡ baseline exactly (tested).
9. Financial block: 2y_t = mean(i_{t..t+7}) + tp2 (tp2 so the baseline matches DGS2 at t=0;
   8 look-ahead quarters are simulated beyond H); 10y_t = DGS10 + b10·(2y_t − DGS2) + Δr*;
   mortgage = 10y + today's spread. Satellites (% vs baseline, no feedback to the IS curve):
   dollar = eUSD·Δ2y·ρ_USD^(t−1); S&P = eEq·Δ2y + e_y·Δy; housing and business investment are
   partial-adjustment responses to lagged Δmortgage / Δreal rate plus an output-gap term.

**Baseline vs scenario parameters**: the baseline always uses the defaults (and the data's r*);
the scenario uses the user's φπ, λ and r*. So "Fed hawkishness" alone already changes the
scenario. A higher scenario r* loosens the IS stance _and_ enters the scenario Fed's rule.

**Policy slider semantics**: the change is **relative to the baseline path** (so 0 ⇒ baseline),
held N quarters, then the rule takes over.

**Shock convention**: slider value = impact on the variable. Inflation impulse
x_t = S·ρs^(t−1) + χo·oilπ_t and demand impulse D·ρd^(t−1) − ηo·oil_t enter quasi-differenced with
the baseline persistence (a0 = γ + (1−γ)(1−λ) for inflation, ρy for demand). Without feedback the
variable moves by exactly x_t; de-anchored expectations amplify the same shock. (The naive
additive form turned "+1pp" into +3pp of inflation.) Oil: % change in the oil price, decaying at
ρo; headline effect ωo·(oil_t − oil_{t−4}) gives realistic base effects.

**Safety bounds** (inactive in normal ranges): soft clamp on the output gap (−12/+8), unemployment
floor 2%, soft clamps on satellite % deviations — keep slider-extreme corners finite.

**Uncertainty fan** (`uncertainty.ts`): ±half-width through the brief's 4Q/8Q errors (GDP 1.5/2.1,
core PCE 0.8/1.2, unemployment 0.5/0.9, policy 0.8/1.4) with a power law; beyond 8Q it widens at
half the rate. Labeled as an approximate ~70% band.

### Calibration (`npm run calibrate`, `src/model/calibration.ts`)

Experiment: neutral steady state (y=0, π=π_LR=2, i=3, r*=1), **+100bp vs the rule baseline at
t=1, held 4 quarters, then the inertial Taylor rule**; response = scenario − baseline. The model is
linear away from the ELB, so responses don't depend on the starting point. Results:

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
**Interpretation note**: "core inflation −0.2 to −0.5pp around Q8–Q12" is checked as the effect
_reached_ within Q8–Q12 plus the overall trough staying in range. A trough located inside Q8–Q12
proved incompatible (grid search) with a 6–10-quarter inflation half-life plus an output trough in
Q5–Q9 unless ρy ≈ 0.6 — slow inflation dynamics are also what FRB/US shows.

**Model tests** (`model.test.ts`): every calibration check; zero shock ⇒ scenario ≡ baseline (both
baselines, neutral and real data); market baseline follows the market path; rule identity; ±100bp
mirror; ELB respected; all 2¹¹ combinations of slider extremes × 2 starting points stay finite and
within plausibility bounds; shock-impact convention; speed.

## UI architecture

- **Data flow**: `useData.load()` → `data/client.ts` spawns `data.worker.ts` (fetch + JSON parse +
  zod validation off the main thread; falls back to in-thread `load.ts`, then to the bundled
  snapshot). `state/sim.ts` is the single simulation driver: it subscribes to the scenario and
  data stores and recomputes **at most once per animation frame**, publishing `{result, quarters}`.
- **Scenario state** (`state/scenario.ts`, `state/controls.ts`): one flat object; tabs are lenses
  (rate tab ignores the inflation shock, shock tab ignores the rate change). Persisted to
  localStorage (`fpl:scenario`, try/catch) and the URL (short keys, non-defaults only,
  `history.replaceState`, debounced). URL wins over localStorage on load. `lang`/`theme` URL params
  apply once, are saved, then stripped. Presets tween numeric values over 350 ms (instant with
  reduced motion).
- **Layout**: desktop = sticky controls aside (inline-start) + results; mobile = results first,
  controls in a modal bottom sheet (focus trap, Esc). KPI strip is a swipeable row on phones.
- **Charts** (`src/charts/`): ECharts modular build, loaded lazily (idle) off the critical path.
  `EChart.tsx` initializes when near the viewport and applies option updates only while visible.
  Crosshair sync is **value-based** (`crosshair.ts` + a `graphic` line) because ECharts `connect`
  forwards pixel coordinates (misaligned across charts of different widths). PNG export calls
  `initAllCharts()` first, then composes `getConnectedDataURL` with a title band and disclaimer.
- **Palette**: chart series use the dataviz reference palette's first three slots (validated
  all-pairs for CVD in both modes on our surfaces): market = blue, scenario = orange, SEP = aqua;
  baseline and reference lines are neutral gray and always dashed + labeled (never color alone).
  Accent text uses a darker/lighter token (`--c-accent-text`) for AA contrast.
- **Insights** (`src/insights/analysis.ts`): transmission stages (onset = half-peak quarter,
  lit during Play), summary inputs, market rules of thumb — all pure and unit-tested.
- **Learn / Sources** are lazy chunks; Expert mode lazy-loads KaTeX.

## i18n & RTL rules

- `src/i18n/fa.ts` is the source of truth; `en.ts` must match its shape (compiler-enforced).
  Copy uses **Latin digits**; `useT()` converts standalone digits to Persian when the user
  enables "Persian digits" (IDs like `GDPC1`, `5y5y` untouched; input-format examples exempt).
- In Persian, **signed numbers and percentages are wrapped in LRI…PDI isolates** — `useT()` does
  it for copy, `useFmt()` for formatted numbers. Without it "+100" renders as "100+".
  Number + Latin unit (`+5 bp`) is isolated as one run.
- **Canvas text ignores bidi isolates**: labels drawn inside charts must be single-direction
  (Persian without digits, e.g. `legend.targetChart`). Charts always use Latin digits; time axes
  run left→right in both languages; tooltips (HTML) set `direction` per language.
- Dates: Gregorian everywhere; Jalali (`fa-IR-u-ca-persian`) in tooltips/titles. Intl formatters
  are **cached** (`dtf()`) — constructing them per call cost ~400 ms on throttled phones.
- Use logical Tailwind utilities (`ms-*`, `pe-*`, `start-*`, `text-start`).

## Performance & accessibility

Lighthouse (local preview, gzip): mobile Performance 91–93, desktop 100; Accessibility 100 and
Best Practices 100 on both. Levers: static skeleton in `index.html` (first paint before JS),
zod + data parsing in a worker (main bundle ≈ 92 KB gzip), ECharts/KaTeX/fallback/Learn lazy,
below-the-fold sections mounted at idle (`Deferred`), data table rendered only when opened,
`scrollbar-gutter: stable` (no CLS), cached Intl formatters, rAF-throttled recompute.
A11y: sliders expose spoken `aria-valuetext` (Persian digits in FA), visible focus rings,
radiogroup/tablist keyboard support with RTL-aware arrows, focus-trapped dialogs, table views
(scrubber card + full data table), status colors always paired with an icon + label,
`prefers-reduced-motion` disables CSS and chart animations.

## Deploy & automation

- `ci.yml` (PRs / non-main pushes): lint, format, typecheck, tests, calibrate, validate-data,
  build, Playwright.
- `deploy.yml` (push to main): checks + build + `validate-data` (key scan of `dist/`) → Pages.
- `update-data.yml` (cron `45 13 * * 1-5`, `15 22 * * 1-5`, manual): fetch → validate → commit
  only if `public/data`/`src/data` changed → build → key scan → deploy. Pushes made with
  `GITHUB_TOKEN` don't trigger other workflows, hence the deploy inside this workflow. Shared
  concurrency group `pages`. Failures never commit or deploy.
- Vite `base` comes from `GITHUB_REPOSITORY` (`/test/` now); `VITE_BASE` overrides.
- Required once: secret `FRED_API_KEY`; Settings → Pages → Source: GitHub Actions; merge to main.
- Action majors pinned to releases ≥ 2 weeks old at setup (checkout@v6, setup-node@v6,
  upload-pages-artifact@v5, deploy-pages@v5, upload-artifact@v6).

## Decisions log (deviations from the brief)

- Node 22 LTS instead of 20 (EOL April 2026). Vitest 3.2 (npm 10 arborist crash with Vitest 4).
- Policy slider is relative to the baseline path; scenario after the hold = baseline + rule
  response to deviations (keeps zero ⇒ baseline in both baseline modes).
- Shock sliders = impact (quasi-differenced impulses); soft safety bounds for extreme corners.
- Market path = smooth least-squares step path at FOMC dates (raw forward segments jumped at 1y).
- Staleness measured from FRED `last_updated`; JCXFEMD added.
- KPI sparklines are SVG (an ECharts instance per KPI would be heavy).
- Satellite charts (dollar, S&P, housing, investment) show % difference vs baseline — the model
  doesn't forecast market levels.
- Gold and EUR/USD are qualitative only (no free gold series on FRED; brief asked for rules of thumb).

## Adding another central bank

Create `src/banks/<id>/` with a `BankConfig` (series specs, inflation target, ELB, calendar URL),
add a calendar parser in `scripts/lib/`, and generalize `scripts/fetch-data.ts` to loop over banks
(output `public/data/<id>/latest.json`). The model, charts and UI only consume `LatestData` +
`InitialConditions`; bank-specific labels live in the bank config and i18n files.
