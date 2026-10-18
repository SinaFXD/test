/**
 * localStorage wrapper that never throws (private mode, blocked storage,
 * quota errors, sandboxed iframes). Values are JSON-encoded.
 */
export function readJSON<T>(key: string): T | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — settings simply won't persist */
  }
}

export function removeKey(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
}
