import type { CharacterColors } from '../types';
import type { RigPose } from '../gait';
import { shade } from '../color';

/**
 * Accessories are split by the space they live in:
 *  - rig space (backpack, scarf) is positioned from the shoulder/hip joints
 *  - head space (cap, headphones) is authored in the same local coords as Face
 */

/** Backpack body — drawn behind the character. */
export function Backpack({ pose, colors }: { pose: RigPose; colors: CharacterColors }) {
  const p = pose.proportions;
  const u = p.torsoLength / 87;
  const s = pose.shoulder;
  const h = pose.hip;
  const outer = -(p.shoulderWidth + 28 * u);
  const inner = -(p.shoulderWidth - 6 * u);
  const top = s.y + 8 * u;
  const bot = h.y - 12 * u;
  const mid = (top + bot) / 2;
  const base = shade(colors.accent, -18);
  return (
    <g data-accessory="backpack">
      <path
        d={`M ${inner - 14 * u} ${top} Q ${outer - 1} ${top + 4 * u} ${outer} ${top + 22 * u}
          L ${outer + 3 * u} ${bot - 15 * u} Q ${outer + 5 * u} ${bot} ${outer + 19 * u} ${bot}
          L ${inner} ${bot - 3 * u} L ${inner - 1} ${top + 6 * u} Q ${inner - 8 * u} ${top - 4 * u} ${inner - 14 * u} ${top} Z`}
        fill={base}
      />
      <path
        d={`M ${outer + 3 * u} ${mid - 12 * u} Q ${inner - 12 * u} ${mid - 19 * u} ${inner} ${mid - 12 * u}
          L ${inner} ${mid + 5 * u} Q ${inner - 14 * u} ${mid + 11 * u} ${outer + 2 * u} ${mid + 4 * u} Z`}
        fill={colors.accent}
      />
      <path
        d={`M ${inner - 13 * u} ${mid + 16 * u} L ${inner - 12 * u} ${bot - 7 * u} M ${outer + 6 * u} ${mid - 1 * u} L ${inner - 3 * u} ${mid - 1 * u}`}
        stroke={shade(base, -34)}
        strokeWidth={2.4 * u}
        strokeLinecap="round"
      />
      <rect x={inner - 17 * u} y={mid + 20 * u} width={13 * u} height={10 * u} rx={3 * u} fill="#F5F0E4" opacity={0.85} />
    </g>
  );
}

/** Shoulder strap — drawn on top of the garment. */
export function BackpackStrap({ pose, colors }: { pose: RigPose; colors: CharacterColors }) {
  const p = pose.proportions;
  const u = p.torsoLength / 87;
  const s = pose.shoulder;
  const h = pose.hip;
  return (
    <path
      data-accessory="backpack-strap"
      d={`M ${s.x - p.shoulderWidth * 0.55} ${s.y - 7 * u} Q ${s.x - p.shoulderWidth * 0.24} ${s.y + 21 * u} ${h.x - p.hipWidth * 0.39} ${h.y - 35 * u}`}
      stroke={shade(colors.accent, -38)}
      strokeWidth={6 * u}
      fill="none"
      strokeLinecap="round"
    />
  );
}

/** Scarf — rig space, sits over the collar and under the chin. */
export function Scarf({ pose, colors }: { pose: RigPose; colors: CharacterColors }) {
  const p = pose.proportions;
  const u = p.torsoLength / 87;
  const s = pose.shoulder;
  const c = colors.accent;
  const sway = Math.sin(pose.phase * Math.PI * 2) * 4;
  return (
    <g data-accessory="scarf">
      <path
        d={`M ${s.x - p.shoulderWidth * 0.6} ${s.y - 12 * u}
          Q ${s.x} ${s.y + 4 * u} ${s.x + p.shoulderWidth * 0.62} ${s.y - 14 * u}
          Q ${s.x + p.shoulderWidth * 0.5} ${s.y + 12 * u} ${s.x} ${s.y + 16 * u}
          Q ${s.x - p.shoulderWidth * 0.5} ${s.y + 12 * u} ${s.x - p.shoulderWidth * 0.6} ${s.y - 12 * u} Z`}
        fill={c}
      />
      <path
        d={`M ${s.x - p.shoulderWidth * 0.34} ${s.y + 12 * u}
          Q ${s.x - p.shoulderWidth * 0.7 + sway} ${s.y + 34 * u} ${s.x - p.shoulderWidth * 0.5 + sway} ${s.y + 56 * u}
          L ${s.x - p.shoulderWidth * 0.06 + sway} ${s.y + 52 * u}
          Q ${s.x - p.shoulderWidth * 0.16} ${s.y + 30 * u} ${s.x + p.shoulderWidth * 0.06} ${s.y + 14 * u} Z`}
        fill={shade(c, -22)}
      />
      <path
        d={`M ${s.x - p.shoulderWidth * 0.5 + sway} ${s.y + 54 * u} L ${s.x - p.shoulderWidth * 0.46 + sway} ${s.y + 62 * u}
          M ${s.x - p.shoulderWidth * 0.3 + sway} ${s.y + 53 * u} L ${s.x - p.shoulderWidth * 0.26 + sway} ${s.y + 61 * u}`}
        stroke={shade(c, -34)}
        strokeWidth={2.4 * u}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Baseball cap — head space. */
export function Cap({ colors }: { colors: CharacterColors }) {
  const c = colors.jacket;
  return (
    <g data-accessory="cap">
      <path d="M -42 -16 C -45 -48 -14 -64 14 -56 C 36 -50 45 -32 43 -16 Z" fill={c} />
      <path d="M -42 -16 Q 0 -24 43 -16 L 43 -11 Q 0 -19 -42 -11 Z" fill={shade(c, -30)} />
      <path d="M 36 -19 Q 68 -22 73 -11 Q 62 -4 36 -12 Z" fill={shade(c, -18)} />
      <path d="M -12 -58 Q 4 -64 20 -56" stroke={shade(c, 40)} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.5} />
      <circle cx={2} cy={-58} r={3.4} fill={colors.accent} />
    </g>
  );
}

/** Over-ear headphones — head space. */
export function Headphones({ colors }: { colors: CharacterColors }) {
  const c = shade(colors.pants, -10);
  return (
    <g data-accessory="headphones">
      <path d="M -42 -4 C -45 -50 -8 -68 24 -57" stroke={c} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d="M -42 -4 C -45 -50 -8 -68 24 -57" stroke={shade(c, 40)} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.45} />
      <rect x={-50} y={-8} width={23} height={30} rx={9} fill={c} />
      <rect x={-46} y={-3} width={15} height={20} rx={7} fill={colors.accent} opacity={0.85} />
      <rect x={26} y={-52} width={16} height={20} rx={7} fill={c} transform="rotate(18 34 -42)" />
    </g>
  );
}

/** Simple stool drawn by the rig when the character is seated. */
export function Stool({ pose, colors }: { pose: RigPose; colors: CharacterColors }) {
  const p = pose.proportions;
  const u = p.torsoLength / 87;
  const h = pose.seatHeight;
  const w = p.hipWidth * 1.5;
  const wood = shade(colors.pants, -6);
  return (
    <g data-accessory="stool">
      <rect x={-w} y={-h - 8 * u} width={w * 2} height={9 * u} rx={4 * u} fill={wood} />
      <rect x={-w} y={-h - 8 * u} width={w * 2} height={3.4 * u} rx={2 * u} fill={shade(wood, 26)} opacity={0.7} />
      <path
        d={`M ${-w * 0.72} ${-h} L ${-w * 0.86} 0 M ${w * 0.72} ${-h} L ${w * 0.86} 0`}
        stroke={shade(wood, -22)}
        strokeWidth={6 * u}
        strokeLinecap="round"
      />
      <path d={`M ${-w * 0.8} ${-h * 0.42} L ${w * 0.8} ${-h * 0.42}`} stroke={shade(wood, -22)} strokeWidth={4 * u} strokeLinecap="round" />
    </g>
  );
}
