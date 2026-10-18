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

## Conventions

- Node 22 LTS (Node 20 reached end-of-life in April 2026).
- Strict TS; no `any`. Prettier: single quotes, 100 cols.
- All UI strings live in `src/i18n/fa.ts` (source of truth) and `src/i18n/en.ts` (same shape, type-checked).
- Theme is driven by `<html data-theme>`; colors are CSS variables in `src/index.css`, exposed to Tailwind via `@theme inline`.
- Use logical Tailwind utilities (`ms-*`, `pe-*`, `start-*`, `text-start`) so RTL/LTR both work.
