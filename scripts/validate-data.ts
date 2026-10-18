/**
 * Validate the published data files. Used in CI after fetch-data and before
 * deploy; exits non-zero on any problem.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SnapshotIndexSchema, SnapshotSchema } from '../src/data/schema';
import { validateLatest } from '../src/data/validate';
import { loadEnv } from './lib/env';
import { snapshotPath } from './lib/history';

loadEnv();

const errors: string[] = [];
const readJSON = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

for (const file of ['public/data/latest.json', 'src/data/fallback.json']) {
  try {
    const r = validateLatest(readJSON(file));
    errors.push(...r.errors.map((e) => `${file}: ${e}`));
  } catch (err) {
    errors.push(`${file}: ${String(err)}`);
  }
}

try {
  const index = SnapshotIndexSchema.parse(readJSON('public/data/history/index.json'));
  for (const date of index.dates) {
    const snap = SnapshotSchema.safeParse(readJSON(snapshotPath('public/data/history', date)));
    if (!snap.success) errors.push(`snapshot ${date}: ${snap.error.issues[0]?.message}`);
    else if (snap.data.date !== date) errors.push(`snapshot ${date}: date mismatch`);
  }
  console.info(`Checked ${index.dates.length} snapshots.`);
} catch (err) {
  errors.push(`history index: ${String(err)}`);
}

// The FRED key must never be published: scan data files and (if built) dist/.
const key = process.env.FRED_API_KEY?.trim();
if (key) {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  const files = ['public', 'src/data', ...(existsSync('dist') ? ['dist'] : [])].flatMap(walk);
  const leaked = files.filter((f) => readFileSync(f).includes(key));
  if (leaked.length) errors.push(`FRED_API_KEY found in: ${leaked.join(', ')}`);
  else console.info(`Scanned ${files.length} files: no API key present.`);
}

if (errors.length) {
  console.error(`✖ Data validation failed:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.info('✔ Data files valid.');
