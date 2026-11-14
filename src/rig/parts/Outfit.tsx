import type { CharacterColors, Outfit } from '../types';
import type { RigPose } from '../gait';
import { shade } from '../color';

/** How much of the arm the garment covers. Drives the `Arm` renderer. */
export type SleeveLength = 'long' | 'short';

export interface OutfitMeta {
  sleeve: SleeveLength;
  /** Hem offset below the hip joint, in torso units. */
  hem: number;
  label: string;
}

export const OUTFIT_META: Record<Outfit, OutfitMeta> = {
  jacket: { sleeve: 'long', hem: 3, label: 'Jacket' },
  hoodie: { sleeve: 'long', hem: 9, label: 'Hoodie' },
  dress: { sleeve: 'short', hem: 0, label: 'Dress' },
  tee: { sleeve: 'short', hem: 6, label: 'Tee' },
  coat: { sleeve: 'long', hem: 58, label: 'Coat' },
  overalls: { sleeve: 'short', hem: 6, label: 'Overalls' },
};

interface Geo {
  cx: number;
  hcx: number;
  sw: number;
  hw: number;
  top: number;
  bot: number;
  u: number;
}

function geometry(pose: RigPose, outfit: Outfit): Geo {
  const p = pose.proportions;
  const u = p.torsoLength / 87;
  return {
    cx: pose.shoulder.x,
    hcx: pose.hip.x,
    sw: p.shoulderWidth,
    hw: p.hipWidth,
    top: pose.shoulder.y - 15 * u,
    bot: pose.hip.y + OUTFIT_META[outfit].hem * u,
    u,
  };
}

/** The shared garment silhouette: shoulders → waist → hem. */
function bodyPath({ cx, hcx, sw, hw, top, bot }: Geo): string {
  return `M ${cx - sw * 0.88} ${top + 6}
    Q ${cx - sw * 0.36} ${top - 5} ${cx + sw * 0.48} ${top + 2}
    Q ${cx + sw * 1.04} ${top + 7} ${cx + sw} ${top + 26}
    L ${hcx + hw} ${bot - 12}
    Q ${hcx + hw} ${bot} ${hcx + hw - 12} ${bot}
    L ${hcx - hw + 8} ${bot}
    Q ${hcx - hw - 4} ${bot} ${hcx - hw - 4} ${bot - 13}
    L ${cx - sw * 1.03} ${top + 20}
    Q ${cx - sw * 1.06} ${top + 6} ${cx - sw * 0.88} ${top + 6} Z`;
}

/**
 * The garment worn on the torso. Every outfit shares the same underlying
 * silhouette so proportions stay consistent across the cast; only the
 * detailing, hem length and sleeve coverage change.
 */
export function Torso({
  pose,
  colors,
  outfit,
  gradientId,
}: {
  pose: RigPose;
  colors: CharacterColors;
  outfit: Outfit;
  gradientId: string;
}) {
  const g = geometry(pose, outfit);
  const { cx, hcx, sw, hw, top, bot, u } = g;
  const fill = `url(#${gradientId})`;
  const dark = shade(colors.jacket, -24);
  const darker = shade(colors.jacket, -40);
  const light = shade(colors.jacket, 40);
  const waist = pose.hip.y - 10 * u;

  const sideHighlight = (
    <path
      d={`M ${cx - sw * 0.82} ${top + 9} Q ${cx - sw * 0.94} ${top + 40 * u} ${hcx - hw * 0.94} ${bot - 22 * u}`}
      stroke={light}
      strokeWidth={3 * u}
      fill="none"
      strokeLinecap="round"
      opacity={0.45}
    />
  );

  if (outfit === 'dress') {
    const skirtBot = pose.hip.y + 62 * u;
    const flare = hw * 1.95;
    return (
      <g data-outfit={outfit}>
        {/* skirt */}
        <path
          d={`M ${hcx - hw * 0.8} ${waist}
            L ${hcx + hw * 0.8} ${waist}
            Q ${hcx + flare * 0.9} ${skirtBot - 18 * u} ${hcx + flare} ${skirtBot}
            Q ${hcx} ${skirtBot + 9 * u} ${hcx - flare} ${skirtBot}
            Q ${hcx - flare * 0.9} ${skirtBot - 18 * u} ${hcx - hw * 0.8} ${waist} Z`}
          fill={fill}
        />
        <path
          d={`M ${hcx - flare * 0.55} ${waist + 12 * u} L ${hcx - flare * 0.72} ${skirtBot - 3 * u}
              M ${hcx} ${waist + 10 * u} L ${hcx} ${skirtBot + 2 * u}
              M ${hcx + flare * 0.55} ${waist + 12 * u} L ${hcx + flare * 0.72} ${skirtBot - 3 * u}`}
          stroke={darker}
          strokeWidth={2 * u}
          opacity={0.35}
          fill="none"
          strokeLinecap="round"
        />
        {/* bodice */}
        <path
          d={`M ${cx - sw * 0.86} ${top + 6}
            Q ${cx - sw * 0.34} ${top - 5} ${cx + sw * 0.46} ${top + 2}
            Q ${cx + sw} ${top + 7} ${cx + sw * 0.94} ${top + 26}
            L ${hcx + hw * 0.8} ${waist}
            L ${hcx - hw * 0.8} ${waist}
            L ${cx - sw} ${top + 20}
            Q ${cx - sw * 1.04} ${top + 6} ${cx - sw * 0.86} ${top + 6} Z`}
          fill={fill}
        />
        {/* neckline + belt */}
        <path d={`M ${cx - sw * 0.42} ${top + 4} Q ${cx + 2} ${top + 16 * u} ${cx + sw * 0.5} ${top + 2} Q ${cx + 2} ${top + 9 * u} ${cx - sw * 0.42} ${top + 4} Z`} fill={shade(colors.skin, -18)} />
        <rect x={hcx - hw * 0.84} y={waist - 6 * u} width={hw * 1.68} height={9 * u} rx={3 * u} fill={colors.accent} />
        <circle cx={hcx + 2} cy={waist - 1.5 * u} r={3.4 * u} fill={shade(colors.accent, -40)} />
        {sideHighlight}
      </g>
    );
  }

  if (outfit === 'coat') {
    return (
      <g data-outfit={outfit}>
        <path d={bodyPath(g)} fill={fill} />
        {/* open front */}
        <path d={`M ${cx + 2} ${top + 12 * u} L ${hcx + 4} ${bot - 4 * u}`} stroke={darker} strokeWidth={2.4 * u} opacity={0.7} />
        <path d={`M ${cx - sw * 0.44} ${top + 3} L ${cx - 4} ${top + 40 * u} L ${cx - sw * 0.62} ${top + 30 * u} L ${cx - sw * 0.78} ${top + 8} Z`} fill={dark} />
        <path d={`M ${cx + sw * 0.5} ${top + 1} L ${cx + 8} ${top + 40 * u} L ${cx + sw * 0.66} ${top + 28 * u} L ${cx + sw * 0.84} ${top + 6} Z`} fill={shade(colors.jacket, -14)} />
        {/* belt + buttons */}
        <rect x={hcx - hw * 1.02} y={pose.hip.y - 12 * u} width={hw * 2.04} height={10 * u} rx={3 * u} fill={darker} opacity={0.85} />
        <rect x={hcx - 5 * u} y={pose.hip.y - 13 * u} width={11 * u} height={12 * u} rx={2.5 * u} fill={colors.accent} />
        {[0, 1].map((i) => (
          <circle key={i} cx={cx + 12} cy={top + (52 + i * 22) * u} r={3 * u} fill={colors.accent} opacity={0.9} />
        ))}
        {/* pockets */}
        <path d={`M ${hcx - hw * 0.8} ${pose.hip.y + 16 * u} L ${hcx - hw * 0.3} ${pose.hip.y + 18 * u}`} stroke={darker} strokeWidth={2.6 * u} strokeLinecap="round" opacity={0.7} />
        <path d={`M ${hcx + hw * 0.3} ${pose.hip.y + 18 * u} L ${hcx + hw * 0.8} ${pose.hip.y + 16 * u}`} stroke={darker} strokeWidth={2.6 * u} strokeLinecap="round" opacity={0.7} />
        {sideHighlight}
      </g>
    );
  }

  if (outfit === 'hoodie') {
    return (
      <g data-outfit={outfit}>
        {/* hood resting behind the neck */}
        <path
          d={`M ${cx - sw * 0.78} ${top + 12} Q ${cx - sw * 0.2} ${top - 24 * u} ${cx + sw * 0.8} ${top + 8} Q ${cx} ${top + 26 * u} ${cx - sw * 0.78} ${top + 12} Z`}
          fill={shade(colors.jacket, -34)}
        />
        <path d={bodyPath(g)} fill={fill} />
        {/* neck opening */}
        <path d={`M ${cx - sw * 0.44} ${top + 4} Q ${cx + 2} ${top + 20 * u} ${cx + sw * 0.52} ${top + 2} Q ${cx + 2} ${top + 11 * u} ${cx - sw * 0.44} ${top + 4} Z`} fill={shade(colors.jacket, -46)} />
        {/* drawstrings */}
        <path d={`M ${cx - 6} ${top + 14 * u} L ${cx - 8} ${top + 40 * u} M ${cx + 8} ${top + 14 * u} L ${cx + 11} ${top + 36 * u}`} stroke={colors.accent} strokeWidth={2.6 * u} strokeLinecap="round" />
        <circle cx={cx - 8} cy={top + 41 * u} r={2.4 * u} fill={colors.accent} />
        <circle cx={cx + 11} cy={top + 37 * u} r={2.4 * u} fill={colors.accent} />
        {/* kangaroo pocket */}
        <path
          d={`M ${hcx - hw * 0.66} ${bot - 36 * u} Q ${hcx} ${bot - 28 * u} ${hcx + hw * 0.66} ${bot - 36 * u}
            L ${hcx + hw * 0.6} ${bot - 12 * u} Q ${hcx} ${bot - 5 * u} ${hcx - hw * 0.6} ${bot - 12 * u} Z`}
          fill={shade(colors.jacket, -18)}
          opacity={0.75}
        />
        {/* ribbed hem */}
        <path d={`M ${hcx - hw - 3} ${bot - 8 * u} Q ${hcx} ${bot - 2 * u} ${hcx + hw} ${bot - 9 * u} L ${hcx + hw - 12} ${bot} L ${hcx - hw + 8} ${bot} Q ${hcx - hw - 4} ${bot} ${hcx - hw - 3} ${bot - 8 * u} Z`} fill={shade(colors.jacket, -30)} />
        {sideHighlight}
      </g>
    );
  }

  if (outfit === 'tee') {
    return (
      <g data-outfit={outfit}>
        <path d={bodyPath(g)} fill={fill} />
        {/* crew neck */}
        <path d={`M ${cx - sw * 0.4} ${top + 4} Q ${cx + 2} ${top + 15 * u} ${cx + sw * 0.48} ${top + 2} Q ${cx + 2} ${top + 8 * u} ${cx - sw * 0.4} ${top + 4} Z`} fill={shade(colors.skin, -18)} />
        <path d={`M ${cx - sw * 0.42} ${top + 4} Q ${cx + 2} ${top + 16 * u} ${cx + sw * 0.5} ${top + 2}`} stroke={shade(colors.jacket, -34)} strokeWidth={3 * u} fill="none" strokeLinecap="round" />
        {/* chest stripe */}
        <path d={`M ${cx - sw * 0.9} ${top + 46 * u} Q ${hcx} ${top + 52 * u} ${cx + sw * 0.92} ${top + 44 * u}`} stroke={colors.accent} strokeWidth={6 * u} fill="none" opacity={0.85} strokeLinecap="round" />
        <path d={`M ${hcx - hw - 2} ${bot - 7 * u} Q ${hcx} ${bot - 1 * u} ${hcx + hw} ${bot - 8 * u}`} stroke={shade(colors.jacket, -28)} strokeWidth={2.4 * u} fill="none" opacity={0.6} />
        {sideHighlight}
      </g>
    );
  }

  if (outfit === 'overalls') {
    const bibTop = top + 34 * u;
    return (
      <g data-outfit={outfit}>
        {/* tee underneath */}
        <path d={bodyPath(g)} fill={fill} />
        <path d={`M ${cx - sw * 0.4} ${top + 4} Q ${cx + 2} ${top + 15 * u} ${cx + sw * 0.48} ${top + 2} Q ${cx + 2} ${top + 8 * u} ${cx - sw * 0.4} ${top + 4} Z`} fill={shade(colors.skin, -18)} />
        {/* bib */}
        <path
          d={`M ${hcx - hw * 0.62} ${bibTop} L ${hcx + hw * 0.62} ${bibTop}
            L ${hcx + hw} ${bot - 12} Q ${hcx + hw} ${bot} ${hcx + hw - 12} ${bot}
            L ${hcx - hw + 8} ${bot} Q ${hcx - hw - 4} ${bot} ${hcx - hw - 4} ${bot - 13} Z`}
          fill={colors.pants}
        />
        {/* straps */}
        <path d={`M ${hcx - hw * 0.56} ${bibTop + 2} Q ${cx - sw * 0.62} ${top + 14 * u} ${cx - sw * 0.7} ${top + 6}`} stroke={colors.pants} strokeWidth={7 * u} fill="none" strokeLinecap="round" />
        <path d={`M ${hcx + hw * 0.56} ${bibTop + 2} Q ${cx + sw * 0.66} ${top + 14 * u} ${cx + sw * 0.74} ${top + 5}`} stroke={colors.pants} strokeWidth={7 * u} fill="none" strokeLinecap="round" />
        <circle cx={hcx - hw * 0.56} cy={bibTop + 3} r={3.2 * u} fill={colors.accent} />
        <circle cx={hcx + hw * 0.56} cy={bibTop + 3} r={3.2 * u} fill={colors.accent} />
        {/* pocket */}
        <path d={`M ${hcx - hw * 0.34} ${bibTop + 12 * u} L ${hcx + hw * 0.34} ${bibTop + 12 * u} L ${hcx + hw * 0.3} ${bibTop + 28 * u} L ${hcx - hw * 0.3} ${bibTop + 28 * u} Z`} fill={shade(colors.pants, 22)} opacity={0.8} />
      </g>
    );
  }

  // jacket — the original look
  return (
    <g data-outfit={outfit}>
      <path d={bodyPath(g)} fill={fill} />
      <path d={`M ${cx - sw * 0.36} ${top + 1} Q ${cx + 2} ${top + 8 * u} ${cx + sw * 0.48} ${top + 2} L ${cx + sw * 0.3} ${top + 25 * u} L ${cx - sw * 0.12} ${top + 25 * u} Z`} fill="#F5F0E4" />
      <path d={`M ${cx - sw * 0.42} ${top} L ${cx - 2} ${top + 22 * u} L ${cx - sw * 0.3} ${top + 28 * u} L ${cx - sw * 0.66} ${top + 8} Z`} fill={dark} />
      <path d={`M ${cx + sw * 0.51} ${top + 1} L ${cx + 6} ${top + 22 * u} L ${cx + sw * 0.42} ${top + 29 * u} L ${cx + sw * 0.82} ${top + 9} Z`} fill={shade(colors.jacket, -14)} />
      <path d={`M ${cx * 0.7 + 3} ${top + 24 * u} Q ${cx * 0.3 + 5} ${top + 58 * u} ${hcx + 3} ${bot - 5 * u}`} stroke={shade(colors.jacket, -48)} strokeWidth={2 * u} fill="none" opacity={0.65} />
      <path d={`M ${hcx + hw * 0.38} ${bot - 40 * u} Q ${hcx + hw * 0.7} ${bot - 36 * u} ${hcx + hw * 0.8} ${bot - 24 * u} L ${hcx + hw * 0.42} ${bot - 22 * u} Z`} fill={shade(colors.jacket, -20)} opacity={0.7} />
      <path d={`M ${hcx - hw - 2} ${bot - 10 * u} Q ${hcx} ${bot - 4 * u} ${hcx + hw} ${bot - 11 * u} L ${hcx + hw} ${bot - 2 * u} Q ${hcx} ${bot + 4 * u} ${hcx - hw - 1} ${bot - 3 * u} Z`} fill={shade(colors.jacket, -30)} />
      {sideHighlight}
    </g>
  );
}
