/**
 * Runs the standard +100bp tightening experiment and checks every response
 * against the FRB/US-like target ranges. Exits non-zero if any check fails.
 */
import { calibrationChecks, responses } from '../src/model/calibration';

const fmt = (x: number) => (Math.abs(x) < 1e-9 ? '0' : x.toFixed(2));

const d = responses();
console.info('+100bp for 4 quarters, then inertial Taylor rule — scenario minus baseline\n');
console.table(
  Array.from({ length: 13 }, (_, q) => ({
    Q: q,
    'policy (pp)': fmt(d.i[q]!),
    '2y (bp)': fmt(d.y2[q]! * 100),
    '10y (bp)': fmt(d.y10[q]! * 100),
    'dollar %': fmt(d.usd[q]!),
    'S&P %': fmt(d.eq[q]!),
    'housing %': fmt(d.house[q]!),
    'invest %': fmt(d.inv[q]!),
    'gap pp': fmt(d.y[q]!),
    'unemp pp': fmt(d.u[q]!),
    'core PCE pp': fmt(d.pi[q]!),
  })),
);

const checks = calibrationChecks();
console.table(
  checks.map((c) => ({
    check: c.name,
    value: `${fmt(c.value)} ${c.unit}`,
    quarter: c.quarter ?? '',
    target: c.unit
      ? `${c.range[0]} … ${c.range[1]} ${c.unit}${c.quarterRange ? ` @ Q${c.quarterRange[0]}–Q${c.quarterRange[1]}` : ''}`
      : '',
    pass: c.pass ? '✔' : '✖',
  })),
);

const failed = checks.filter((c) => !c.pass);
if (failed.length) {
  console.error(`✖ ${failed.length} calibration check(s) failed.`);
  process.exit(1);
}
console.info('✔ All calibration checks pass.');
