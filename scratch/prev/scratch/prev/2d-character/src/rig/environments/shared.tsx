/**
 * Shared environment primitives: seamless tiling, clouds and trees.
 * Everything is a pure function of its props — no clocks, no randomness.
 */

export const TILE = 1600;

export function offset(distance: number, direction: number, factor: number) {
  const raw = (-direction * distance * factor) % TILE;
  return ((raw + TILE) % TILE) - TILE;
}

export function Repeating({ x, children }: { x: number; children: React.ReactNode }) {
  return <>{[0, 1, 2].map((i) => <g key={i} transform={`translate(${x + i * TILE} 0)`}>{children}</g>)}</>;
}

export function Cloud({ x, y, s, opacity }: { x: number; y: number; s: number; opacity: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity} fill="#FFFDF6">
      <ellipse cx={0} cy={0} rx={46} ry={16} />
      <ellipse cx={-22} cy={-8} rx={24} ry={16} />
      <ellipse cx={12} cy={-12} rx={30} ry={20} />
      <ellipse cx={38} cy={-2} rx={22} ry={12} />
    </g>
  );
}

export function Tree({ x, y, s, leaf, dark }: { x: number; y: number; s: number; leaf: string; dark: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -5 0 L -3 -92 L 4 -92 L 7 0 Z" fill="#7A6248" />
      <path d="M 0 -60 L -22 -82 M 2 -70 L 22 -92" stroke="#7A6248" strokeWidth={5} strokeLinecap="round" />
      <circle cx={-24} cy={-92} r={28} fill={dark} />
      <circle cx={22} cy={-98} r={32} fill={leaf} />
      <circle cx={-2} cy={-118} r={34} fill={leaf} />
      <circle cx={-12} cy={-104} r={26} fill={dark} opacity={0.5} />
      <path d="M -18 -124 Q -4 -136 12 -128" stroke="#FFFDF6" strokeWidth={3} opacity={0.18} fill="none" strokeLinecap="round" />
    </g>
  );
}

