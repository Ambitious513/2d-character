import type { CharacterColors, Emotion } from '../types';
import type { VisemeId } from '../lipsync';
import { shade } from '../color';

export const INK = '#26352E';

export interface FaceProps {
  emotion: Emotion;
  colors: CharacterColors;
  glasses?: boolean;
  blink?: number;
  /** Lip-sync shape. `rest` defers to the emotion's mouth. */
  mouth?: VisemeId;
  /** Jaw openness 0–1 while talking. */
  mouthOpen?: number;
  beard?: boolean;
  freckles?: boolean;
}

/** Emotion-driven brow / eye geometry. */
function expressionGeometry(emotion: Emotion) {
  switch (emotion) {
    case 'surprised':
      return { browY: -19, eyeRy: 6.4, browKind: 'raised' as const };
    case 'sad':
      return { browY: -15, eyeRy: 4.8, browKind: 'sad' as const };
    case 'focused':
      return { browY: -13, eyeRy: 3.4, browKind: 'flat' as const };
    case 'angry':
      return { browY: -12, eyeRy: 3.8, browKind: 'angry' as const };
    case 'excited':
      return { browY: -21, eyeRy: 6, browKind: 'raised' as const };
    case 'happy':
      return { browY: -16, eyeRy: 4.8, browKind: 'soft' as const };
    default:
      return { browY: -16, eyeRy: 4.8, browKind: 'soft' as const };
  }
}

function Brows({ kind, y, hair }: { kind: ReturnType<typeof expressionGeometry>['browKind']; y: number; hair: string }) {
  if (kind === 'sad') {
    return (
      <>
        <path d={`M 2 ${y + 2} Q 8 ${y - 3} 15 ${y - 4}`} stroke={hair} strokeWidth={3.4} fill="none" strokeLinecap="round" />
        <path d={`M 27 ${y - 4} Q 33 ${y - 3} 38 ${y + 1}`} stroke={hair} strokeWidth={3.2} fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (kind === 'angry') {
    return (
      <>
        <path d={`M 1 ${y - 4} L 16 ${y + 3}`} stroke={hair} strokeWidth={4} strokeLinecap="round" />
        <path d={`M 26 ${y + 3} L 39 ${y - 4}`} stroke={hair} strokeWidth={3.8} strokeLinecap="round" />
      </>
    );
  }
  if (kind === 'flat') {
    return (
      <>
        <path d={`M 2 ${y - 2} L 15 ${y + 1}`} stroke={hair} strokeWidth={3.4} strokeLinecap="round" />
        <path d={`M 27 ${y + 1} L 38 ${y - 2}`} stroke={hair} strokeWidth={3.2} strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <path d={`M 2 ${y} Q 8 ${y - 3} 15 ${y - 1}`} stroke={hair} strokeWidth={3.2} fill="none" strokeLinecap="round" />
      <path d={`M 27 ${y - 1} Q 33 ${y - 3} 38 ${y}`} stroke={hair} strokeWidth={3} fill="none" strokeLinecap="round" />
    </>
  );
}

/** The static, emotion-only mouth. Used whenever the character is not talking. */
function EmotionMouth({ emotion }: { emotion: Emotion }) {
  switch (emotion) {
    case 'happy':
      return (
        <>
          <path d="M 9 17 Q 23 25 36 15 Q 32 34 19 32 Q 11 28 9 17 Z" fill={INK} />
          <path d="M 12 19 Q 23 24 33 18 L 31 23 Q 22 27 14 23 Z" fill="#FFFDF6" />
          <path d="M 18 30 Q 24 26 30 29 Q 25 33 18 30 Z" fill="#E88B73" />
        </>
      );
    case 'excited':
      return (
        <>
          <path d="M 7 15 Q 23 24 38 13 Q 35 37 20 36 Q 9 31 7 15 Z" fill={INK} />
          <path d="M 11 18 Q 23 23 34 16 L 32 22 Q 22 26 13 22 Z" fill="#FFFDF6" />
          <path d="M 16 33 Q 24 28 32 32 Q 25 37 16 33 Z" fill="#E88B73" />
        </>
      );
    case 'surprised':
      return <ellipse cx={24} cy={23} rx={7} ry={9} fill={INK} />;
    case 'sad':
      return <path d="M 13 27 Q 23 19 34 26" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'angry':
      return (
        <>
          <path d="M 12 25 Q 23 18 34 24" stroke={INK} strokeWidth={3.4} fill="none" strokeLinecap="round" />
          <path d="M 15 22 L 32 21" stroke="#FFFDF6" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
        </>
      );
    case 'focused':
      return <path d="M 14 23 L 32 22" stroke={INK} strokeWidth={3} strokeLinecap="round" />;
    default:
      return <path d="M 14 21 Q 24 27 34 20" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
  }
}

/**
 * Viseme mouths. Each shape is a real mouth silhouette rather than a scaled
 * ellipse, so lip-sync reads clearly even at small sizes.
 */
function VisemeMouth({ id, open }: { id: VisemeId; open: number }) {
  const k = 0.45 + 0.55 * Math.min(1, Math.max(0, open));
  const cx = 23;
  const cy = 23;
  const teeth = (w: number, y: number) => (
    <path d={`M ${cx - w} ${y} Q ${cx} ${y + 2.4} ${cx + w} ${y} L ${cx + w - 1} ${y + 3.4} Q ${cx} ${y + 5.4} ${cx - w + 1} ${y + 3.4} Z`} fill="#FFFDF6" />
  );
  const tongue = (w: number, y: number) => (
    <path d={`M ${cx - w} ${y} Q ${cx} ${y - 4} ${cx + w} ${y} Q ${cx} ${y + 4} ${cx - w} ${y} Z`} fill="#E88B73" />
  );

  switch (id) {
    case 'AA':
      return (
        <g>
          <ellipse cx={cx} cy={cy + 1} rx={9.5} ry={11 * k} fill={INK} />
          {teeth(7.4, cy - 11 * k + 1.4)}
          {tongue(6, cy + 11 * k - 3)}
        </g>
      );
    case 'EE':
      return (
        <g>
          <path d={`M ${cx - 13} ${cy - 1} Q ${cx} ${cy - 5 * k} ${cx + 13} ${cy - 2} Q ${cx} ${cy + 8 * k} ${cx - 13} ${cy - 1} Z`} fill={INK} />
          {teeth(10.5, cy - 4 * k)}
        </g>
      );
    case 'IH':
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={8.6} ry={5.4 * k} fill={INK} />
          {teeth(6.6, cy - 5.4 * k + 0.8)}
        </g>
      );
    case 'OH':
      return (
        <g>
          <ellipse cx={cx} cy={cy + 1} rx={7.6} ry={9.4 * k} fill={INK} />
          {tongue(4.6, cy + 9.4 * k - 2.6)}
        </g>
      );
    case 'OO':
      return (
        <g>
          <ellipse cx={cx + 1} cy={cy + 1} rx={5.2} ry={6.2 * k} fill={INK} />
          <ellipse cx={cx + 1} cy={cy + 1} rx={5.2} ry={6.2 * k} fill="none" stroke={shade('#B87952', -30)} strokeWidth={1.4} opacity={0.5} />
        </g>
      );
    case 'MBP':
      return (
        <g>
          <path d={`M ${cx - 10} ${cy} Q ${cx} ${cy + 2.6} ${cx + 10} ${cy - 0.6}`} stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <path d={`M ${cx - 7} ${cy + 4} Q ${cx} ${cy + 6} ${cx + 7} ${cy + 3.4}`} stroke={shade('#B87952', -26)} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.55} />
        </g>
      );
    case 'FV':
      return (
        <g>
          <path d={`M ${cx - 9} ${cy - 2} Q ${cx} ${cy + 1} ${cx + 9} ${cy - 3}`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d={`M ${cx - 7} ${cy - 3} Q ${cx} ${cy - 0.4} ${cx + 7} ${cy - 4} L ${cx + 6} ${cy + 1.6} Q ${cx} ${cy + 3.6} ${cx - 6} ${cy + 1} Z`} fill="#FFFDF6" />
        </g>
      );
    case 'LTH':
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={8.2} ry={6.6 * k} fill={INK} />
          {teeth(6.2, cy - 6.6 * k + 0.8)}
          <path d={`M ${cx - 3.4} ${cy + 1} Q ${cx} ${cy - 4.4 * k} ${cx + 3.4} ${cy + 1} Q ${cx} ${cy + 4} ${cx - 3.4} ${cy + 1} Z`} fill="#E88B73" />
        </g>
      );
    case 'SZ':
      return (
        <g>
          <path d={`M ${cx - 10} ${cy - 1} Q ${cx} ${cy - 3.4 * k} ${cx + 10} ${cy - 1.6} Q ${cx} ${cy + 4.4 * k} ${cx - 10} ${cy - 1} Z`} fill={INK} />
          {teeth(8.4, cy - 3 * k)}
          <path d={`M ${cx - 8} ${cy + 2.4 * k} Q ${cx} ${cy + 4 * k} ${cx + 8} ${cy + 1.8 * k}`} stroke="#FFFDF6" strokeWidth={1.6} fill="none" opacity={0.8} />
        </g>
      );
    default:
      return null;
  }
}

/**
 * The character's head art, authored around a local origin near eye level.
 * Drawn at scale 1 and scaled by `proportions.headScale` by the rig.
 */
export function Face({
  emotion,
  colors,
  glasses = false,
  blink = 0,
  mouth = 'rest',
  mouthOpen = 0,
  beard = false,
  freckles = false,
}: FaceProps) {
  const skin = colors.skin;
  const hair = colors.hair;
  const eyeScale = Math.max(0.06, 1 - blink);
  const geo = expressionGeometry(emotion);
  const talking = mouth !== 'rest';
  const smiling = emotion === 'happy' || emotion === 'excited';

  return (
    <g data-face={emotion} data-mouth={mouth}>
      {/* neck */}
      <path d="M -13 29 L -15 61 Q 2 70 17 59 L 13 27 Z" fill={shade(skin, -22)} />
      {/* ear */}
      <ellipse cx={-35} cy={9} rx={12} ry={15} fill={skin} />
      <path d="M -39 4 Q -31 1 -31 11" fill="none" stroke={shade(skin, -42)} strokeWidth={2.4} strokeLinecap="round" />
      {/* three-quarter face with a soft nose silhouette */}
      <path d="M -38 -24 C -39 -49 -12 -60 14 -53 C 35 -48 42 -30 40 -13 L 47 -4 Q 52 3 43 7 L 39 8 C 37 30 24 43 5 43 C -18 43 -35 28 -38 9 Z" fill={skin} />
      <path d="M -38 -20 C -35 8 -30 30 -8 39 C -24 36 -36 25 -38 8 Z" fill={shade(skin, -16)} opacity={0.55} />
      {/* cheeks */}
      <ellipse cx={4} cy={13} rx={8} ry={5} fill="#E88B73" opacity={smiling ? 0.42 : 0.25} />
      <ellipse cx={34} cy={12} rx={6} ry={4} fill="#E88B73" opacity={smiling ? 0.4 : 0.22} />
      {freckles && (
        <g fill={shade(skin, -46)} opacity={0.5}>
          {[[1, 8], [7, 11], [13, 7], [30, 7], [35, 10], [40, 6]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1.15} />
          ))}
        </g>
      )}
      {beard && (
        <g fill={hair}>
          <path d="M -30 6 C -28 30 -14 45 6 45 C 24 45 36 32 38 12 C 34 26 22 34 6 34 C -10 34 -24 24 -30 6 Z" opacity={0.95} />
          <path d="M 12 14 Q 23 10 34 13 Q 23 18 12 14 Z" opacity={0.9} />
        </g>
      )}
      <Brows kind={geo.browKind} y={geo.browY} hair={hair} />
      {/* eyes */}
      {smiling && blink < 0.5 && !talking ? (
        <>
          <path d="M 3 -5 Q 9 -11 15 -5" stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <path d="M 27 -5 Q 33 -11 39 -5" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx={9} cy={-6} rx={geo.eyeRy > 5.5 ? 4.6 : 3.5} ry={geo.eyeRy * eyeScale} fill={INK} />
          <ellipse cx={33} cy={-6} rx={geo.eyeRy > 5.5 ? 4.2 : 3.2} ry={geo.eyeRy * eyeScale} fill={INK} />
          {eyeScale > 0.4 && (
            <>
              <circle cx={10.2} cy={-7.6} r={1.15} fill="#FFFDF6" />
              <circle cx={34.1} cy={-7.6} r={1.05} fill="#FFFDF6" />
            </>
          )}
          {emotion === 'excited' && eyeScale > 0.6 && (
            <>
              <circle cx={7.2} cy={-4.2} r={0.7} fill="#FFFDF6" opacity={0.8} />
              <circle cx={31.4} cy={-4.2} r={0.65} fill="#FFFDF6" opacity={0.8} />
            </>
          )}
        </>
      )}
      {/* nose */}
      <path d="M 37 1 Q 42 4 37 6" stroke={shade(skin, -46)} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* mouth: lip-sync wins over the emotion mouth while talking */}
      {talking ? <VisemeMouth id={mouth} open={mouthOpen} /> : <EmotionMouth emotion={emotion} />}
      {glasses && (
        <g stroke={INK} strokeWidth={2.6} fill="#FFFDF6" fillOpacity={0.14}>
          <rect x={0} y={-14} width={19} height={16} rx={6} />
          <rect x={25} y={-14} width={18} height={16} rx={6} />
          <path d="M 19 -7 L 25 -7 M 0 -8 L -25 -12" fill="none" />
        </g>
      )}
    </g>
  );
}
