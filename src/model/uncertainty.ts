import { FAN_ERRORS, type FanVariable } from './params';

/**
 * Approximate ±half-width of the ~70% uncertainty band h quarters ahead.
 * A power law through the 4- and 8-quarter error sizes; beyond 8 quarters the
 * band keeps widening but at half the rate (errors saturate as variables
 * mean-revert). Labeled "approximate" in the UI.
 */
export function fanHalfWidth(variable: FanVariable, h: number): number {
  if (h <= 0) return 0;
  const { q4, q8 } = FAN_ERRORS[variable];
  const b = Math.log(q8 / q4) / Math.log(2);
  if (h <= 8) return q4 * (h / 4) ** b;
  return q8 * (h / 8) ** (b / 2);
}

export function fanBands(
  path: ArrayLike<number>,
  variable: FanVariable,
  floor = -Infinity,
): { lower: number[]; upper: number[] } {
  const lower: number[] = [];
  const upper: number[] = [];
  for (let t = 0; t < path.length; t++) {
    const w = fanHalfWidth(variable, t);
    lower.push(Math.max(floor, path[t]! - w));
    upper.push(path[t]! + w);
  }
  return { lower, upper };
}
