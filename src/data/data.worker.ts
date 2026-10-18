/// <reference lib="webworker" />
/**
 * Fetches and validates latest.json off the main thread (JSON parse + zod),
 * keeping the main bundle free of zod and the first render responsive.
 */
import { loadLatestDirect } from './load';

self.onmessage = async () => {
  try {
    self.postMessage({ ok: true, result: await loadLatestDirect() });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
