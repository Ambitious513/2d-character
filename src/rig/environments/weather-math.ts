/**
 * Pure math for the weather layer.
 *
 * Every particle is a pure function of `(index, time, distance, direction)` —
 * no clocks, no `Math.random`, no module counters. Remotion renders frames in
 * parallel and out of order, so anything else would tear the precipitation.
 *
 * `hash01` is an integer avalanche (Murmur-style finaliser): deterministic
 * across JS engines because it only uses 32-bit integer ops via `Math.imul`.
 * Two integer inputs → a stable `[0, 1)` float. Distinct salts per property
 * keep the dimensions decorrelated.
 */

/** Deterministic [0, 1) from an integer pair. Integer avalanche, engine-stable. */
export function hash01(i: number, salt: number): number {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 0x100000000;
}

/** Wrap a value into [0, span) — the same modulo shared.tsx uses for tiling. */
export function wrap(value: number, span: number): number {
  return ((value % span) + span) % span;
}

/** Linear interpolation, clamped t. */
export function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

/** Mix two `#rrggbb` colours. t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const ch = (shift: number) => {
    const ca = (pa >> shift) & 0xff;
    const cb = (pb >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t);
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
