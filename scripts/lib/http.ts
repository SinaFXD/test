import { redact } from './env';

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Concurrency + spacing limiter: at most `concurrency` requests in flight and
 * at least `minSpacingMs` between request starts (FRED allows ~120 req/min).
 */
export function createLimiter(concurrency: number, minSpacingMs: number) {
  let active = 0;
  let lastStart = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    const wait = Math.max(0, lastStart + minSpacingMs - Date.now());
    if (wait > 0) {
      setTimeout(next, wait);
      return;
    }
    active++;
    lastStart = Date.now();
    queue.shift()!();
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/** GET with timeout and exponential backoff (+ jitter) on 429/5xx/network errors. */
export async function getWithRetry(url: string, opts: RetryOptions = {}): Promise<string> {
  const { retries = 5, baseDelayMs = 1000, timeoutMs = 30_000, headers } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      const body = await res.text();
      if (res.ok) return body;
      const retryable = res.status === 429 || res.status >= 500;
      const detail = body.slice(0, 300).replace(/\s+/g, ' ');
      lastErr = new HttpError(
        `HTTP ${res.status} for ${redact(url)}: ${detail}`,
        res.status,
        retryable,
      );
      if (!retryable) throw lastErr;
    } catch (err) {
      if (err instanceof HttpError && !err.retryable) throw err;
      lastErr = err;
    }
    if (attempt < retries) {
      const delay = baseDelayMs * 2 ** attempt * (0.75 + Math.random() * 0.5);
      await sleep(delay);
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Request failed after ${retries + 1} attempts: ${redact(msg)}`);
}
