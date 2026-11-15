import type { HairStyle } from '../types';
import { shade } from '../color';

/**
 * Hair is split into two layers so styles with volume behind the head
 * (ponytail, long, bun) sit correctly behind the face, while the fringe/cap
 * sits on top of the forehead.
 *
 * All styles are authored in the same head-local space as `Face`:
 * skull top ≈ y -58, left edge ≈ x -40, right edge ≈ x 42.
 */

export function HairBack({ style, color }: { style: HairStyle; color: string }) {
  const dark = shade(color, -26);
  switch (style) {
    case 'ponytail':
      return (
        <g data-hair-back={style}>
          <path
            d="M -34 -34 C -62 -30 -76 -4 -70 24 C -67 42 -54 48 -46 40 C -56 26 -56 4 -44 -12 C -38 -20 -34 -26 -34 -34 Z"
            fill={dark}
          />
          <path d="M -60 -6 C -66 8 -66 24 -60 34" stroke={shade(color, 26)} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.5} />
        </g>
      );
    case 'long':
      return (
        <g data-hair-back={style}>
          <path d="M -46 -28 C -52 -60 -10 -72 16 -60 C 46 -48 52 -14 48 22 L 52 88 L -50 88 L -46 22 Z" fill={dark} />
          <path d="M -38 6 C -42 34 -42 62 -40 84 M 40 6 C 44 34 44 62 42 84" stroke={shade(color, 22)} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.45} />
        </g>
      );
    case 'bun':
      return (
        <g data-hair-back={style}>
          <circle cx={-44} cy={-46} r={17} fill={dark} />
          <circle cx={-44} cy={-46} r={17} fill="none" stroke={shade(color, 30)} strokeWidth={2.2} opacity={0.5} />
          <path d="M -54 -52 Q -44 -60 -34 -52" stroke={shade(color, 34)} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.6} />
        </g>
      );
    case 'bob':
      return (
        <g data-hair-back={style}>
          <path d="M -46 -20 C -50 -52 -8 -64 16 -56 C 46 -46 50 -14 47 26 L 36 28 C 40 -8 34 -30 16 -36 C -6 -42 -30 -30 -34 28 L -46 26 Z" fill={dark} />
        </g>
      );
    default:
      return null;
  }
}

export function HairFront({ style, color }: { style: HairStyle; color: string }) {
  const light = shade(color, 38);
  switch (style) {
    case 'curly':
      return (
        <g data-hair={style}>
          <path
            d="M -42 9 C -55 -8 -51 -34 -39 -45 C -44 -58 -27 -67 -15 -60 C -7 -73 12 -71 20 -61 C 35 -67 48 -54 43 -42 C 54 -34 46 -20 34 -22 C 24 -17 15 -28 8 -30 C -3 -22 -15 -29 -22 -17 L -26 9 Z"
            fill={color}
          />
          <circle cx={-35} cy={-42} r={11} fill={color} />
          <circle cx={-18} cy={-55} r={12} fill={color} />
          <circle cx={2} cy={-59} r={12} fill={color} />
          <circle cx={22} cy={-52} r={12} fill={color} />
          <circle cx={36} cy={-40} r={10} fill={color} />
          <path d="M -30 -46 Q -24 -54 -15 -52 M -4 -58 Q 4 -63 12 -57 M 20 -50 Q 28 -53 33 -46" stroke={light} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.7} />
          <path d="M -26 -14 Q -20 -20 -16 -12 L -18 4 Q -24 2 -26 -14 Z" fill={color} />
        </g>
      );
    case 'fade':
      return (
        <g data-hair={style}>
          <path
            d="M -40 -6 C -44 -46 -16 -62 12 -55 C 36 -49 44 -32 42 -16 L 38 -21 C 33 -36 21 -43 5 -41 C -13 -39 -31 -29 -36 -8 Z"
            fill={color}
          />
          <path d="M -34 -22 C -26 -34 -8 -40 8 -38" stroke={light} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.45} />
          <path d="M -38 -6 Q -34 2 -32 8 L -28 6 Q -31 -2 -33 -10 Z" fill={color} opacity={0.85} />
        </g>
      );
    case 'ponytail':
      return (
        <g data-hair={style}>
          <path
            d="M -40 -6 C -44 -46 -14 -63 14 -54 C 36 -47 44 -30 41 -14 C 34 -34 20 -42 2 -40 C -16 -38 -32 -28 -36 -6 Z"
            fill={color}
          />
          <path d="M -32 -26 C -20 -38 2 -42 20 -36" stroke={light} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.5} />
          <path d="M -38 -30 Q -46 -26 -44 -18 Q -36 -20 -34 -26 Z" fill={shade(color, -40)} />
        </g>
      );
    case 'bob':
      return (
        <g data-hair={style}>
          <path
            d="M -44 26 C -52 -16 -40 -60 6 -58 C 46 -56 50 -18 46 26 L 34 24 C 38 -8 34 -26 30 -32 C 20 -22 2 -20 -14 -26 C -26 -20 -32 -2 -32 24 Z"
            fill={color}
          />
          <path d="M -24 -40 Q -4 -52 18 -44" stroke={light} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.5} />
        </g>
      );
    case 'bun':
      return (
        <g data-hair={style}>
          <path
            d="M -40 -4 C -44 -46 -14 -63 14 -54 C 36 -47 44 -30 41 -14 C 36 -36 18 -45 -2 -40 C -20 -36 -34 -26 -38 -4 Z"
            fill={color}
          />
          <path d="M -34 -24 C -22 -38 0 -44 20 -37 M -30 -14 C -18 -30 2 -36 24 -30" stroke={light} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.4} />
        </g>
      );
    case 'spiky':
      return (
        <g data-hair={style}>
          <path
            d="M -40 -10 L -45 -40 L -30 -32 L -31 -58 L -14 -42 L -8 -67 L 4 -44 L 14 -65 L 22 -42 L 34 -57 L 36 -32 L 45 -38 L 41 -14 C 34 -34 18 -42 0 -40 C -18 -38 -32 -28 -40 -10 Z"
            fill={color}
          />
          <path d="M -24 -34 L -20 -46 M -2 -40 L 1 -52 M 18 -36 L 22 -48" stroke={light} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
        </g>
      );
    case 'long':
      return (
        <g data-hair={style}>
          <path
            d="M -42 -8 C -46 -46 -16 -63 12 -55 C 36 -49 44 -30 41 -12 C 36 -34 22 -42 4 -40 C -6 -38 -12 -32 -16 -24 C -22 -34 -32 -26 -36 -8 Z"
            fill={color}
          />
          <path d="M -18 -30 Q -4 -44 14 -40" stroke={light} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.45} />
        </g>
      );
    case 'bald':
      return (
        <g data-hair={style}>
          <path d="M -22 -40 Q -6 -52 12 -46" stroke="#FFFDF6" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.18} />
        </g>
      );
    default:
      return null;
  }
}
