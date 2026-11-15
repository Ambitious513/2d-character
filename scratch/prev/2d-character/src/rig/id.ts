/**
 * Deterministic, collision-safe SVG ids.
 *
 * A `<linearGradient>` is completely described by its inputs, so two gradients
 * built from the same inputs are byte-identical and can safely share one id.
 * Hashing the inputs therefore gives us three properties at once:
 *
 *  1. **Deterministic** — the same props always produce the same id, so
 *     `renderToStaticMarkup` output is byte-stable and Remotion frames match.
 *  2. **Collision-safe across roots** — unlike `useId`, the id does not restart
 *     per render root. Rendering six characters through six separate
 *     `renderToStaticMarkup` calls used to emit six gradients all called
 *     `garment-R0`; the first one won and every character wore Milo's jacket.
 *  3. **Self-deduplicating** — identical gradients collapse to one definition.
 *
 * Ids are namespaced so they cannot clash with unrelated SVG on the host page.
 */

/** FNV-1a, 32-bit. Small, fast, and stable across JS engines. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Build a stable id from a prefix and the values that fully define the resource.
 * Every value that affects the rendered result MUST be passed in.
 */
export function stableId(prefix: string, ...parts: (string | number)[]): string {
  return `stride-${prefix}-${fnv1a(parts.join('|')).toString(36)}`;
}
