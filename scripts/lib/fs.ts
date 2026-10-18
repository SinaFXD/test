import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Write via temp file + rename so readers never see a half-written file. */
export function writeFileAtomic(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

export const toJSON = (v: unknown, pretty = false): string =>
  `${JSON.stringify(v, null, pretty ? 2 : 0)}\n`;
