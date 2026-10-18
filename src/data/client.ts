/**
 * Main-thread entry for data loading. Uses a module worker when available and
 * falls back to loading in-thread (tests, old browsers, worker failures).
 */
import type { DataSource } from './load';
import type { LatestData, Snapshot } from './schema';

export type { DataSource };
type Result = { data: LatestData; source: DataSource; error?: string };

const direct = () => import('./load').then((m) => m.loadLatestDirect());

export function loadLatest(): Promise<Result> {
  if (typeof Worker === 'undefined') return direct();
  return new Promise<Result>((resolve) => {
    let settled = false;
    let worker: Worker | null = null;
    const finish = (p: Promise<Result> | Result) => {
      if (settled) return;
      settled = true;
      worker?.terminate();
      resolve(p);
    };
    try {
      worker = new Worker(new URL('./data.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<{ ok: boolean; result?: Result }>) =>
        finish(e.data.ok && e.data.result ? e.data.result : direct());
      worker.onerror = () => finish(direct());
      worker.postMessage('latest');
      setTimeout(() => finish(direct()), 15_000);
    } catch {
      finish(direct());
    }
  });
}

export function loadSnapshot(asOf: string, daysAgo: number): Promise<Snapshot | null> {
  return import('./load').then((m) => m.loadSnapshot(asOf, daysAgo));
}
