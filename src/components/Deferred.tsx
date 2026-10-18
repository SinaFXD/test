import { useEffect, useState, type ReactNode } from 'react';

const idle = (cb: () => void): (() => void) => {
  if ('requestIdleCallback' in globalThis) {
    const id = requestIdleCallback(cb, { timeout: 1200 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(cb, 60);
  return () => clearTimeout(id);
};

/**
 * Mounts below-the-fold content once the browser is idle after first paint,
 * splitting the initial render into smaller tasks (lower Total Blocking Time).
 */
export function Deferred({
  children,
  minHeight = 240,
}: {
  children: ReactNode;
  minHeight?: number;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => idle(() => setReady(true)), []);
  return ready ? (
    <>{children}</>
  ) : (
    <div className="skeleton" style={{ minHeight }} aria-hidden="true" />
  );
}
