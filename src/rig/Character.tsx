import type { CharacterColors, CharacterSettings, Emotion } from './types';
import { DEFAULT_SETTINGS } from './types';
import { samplePose, type ArmPose, type FootPose, type Point, type HandShape, type RigPose } from './gait';
import { shade } from './color';
import { stableId } from './id';
import { Face, INK } from './parts/Face';
import { HairBack, HairFront } from './parts/Hair';
import { OUTFIT_META, Torso } from './parts/Outfit';
import { Backpack, BackpackStrap, Cap, Headphones, Scarf, Stool } from './parts/Accessories';
import type { VisemeId } from './lipsync';

export interface CharacterRigProps {
  settings?: CharacterSettings;
  frame?: number;
  fps?: number;
  showGuides?: boolean;
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Limb({
  a,
  b,
  c,
  width,
  color,
  highlight,
  separation,
}: {
  a: Point;
  b: Point;
  c: Point;
  width: number;
  color: string;
  highlight?: string;
  /**
   * Soft contact shadow drawn under the limb. A near arm is the same colour as
   * the garment it hangs against, so without this it visually fuses into the
   * torso and the character reads as an armless blob.
   */
  separation?: boolean;
}) {
  return (
    <g>
      {separation && (
        <path
          d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`}
          fill="none"
          stroke={shade(color, -70)}
          strokeWidth={width + 3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.22}
        />
      )}
      <path
        d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {highlight && (
        <path
          d={`M ${a.x - width * 0.18} ${a.y} L ${b.x - width * 0.18} ${b.y}`}
          fill="none"
          stroke={highlight}
          strokeWidth={width * 0.22}
          strokeLinecap="round"
          opacity={0.5}
        />
      )}
    </g>
  );
}

function Shoe({ foot, colors, far, scale }: { foot: FootPose; colors: CharacterColors; far?: boolean; scale: number }) {
  const sole = far ? shade(colors.shoes, -34) : colors.shoes;
  return (
    <g transform={`translate(${foot.ankle.x} ${foot.ankle.y}) rotate(${foot.angle}) scale(${scale})`}>
      <path d="M -12 -6 Q -2 -10 6 -4 L 14 2 Q 24 3 30 8 L 31 13 L -15 13 Q -19 13 -18 8 L -16 0 Z" fill={sole} />
      <path d="M -18 10 L 31 10 L 31 13 L -15 13 Q -19 13 -18 10 Z" fill={far ? shade(colors.accent, -34) : colors.accent} />
      <path d="M 2 -3 L 10 1 M 7 -1 L 15 3" stroke={shade(sole, -55)} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M -14 -2 L -12 7" stroke={shade(sole, -30)} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function Leg({ hip, foot, colors, far, pose }: { hip: Point; foot: FootPose; colors: CharacterColors; far?: boolean; pose: RigPose }) {
  const p = pose.proportions;
  const pants = far ? shade(colors.pants, -24) : colors.pants;
  const width = far ? p.legWidth - 2 : p.legWidth;
  return (
    <g data-leg={far ? 'far' : 'near'}>
      <Limb a={hip} b={foot.knee} c={foot.ankle} width={width} color={pants} highlight={far ? undefined : shade(pants, 26)} separation={!far} />
      <circle cx={foot.ankle.x} cy={foot.ankle.y - 2} r={width * 0.41} fill={pants} />
      <Shoe foot={foot} colors={colors} far={far} scale={p.footScale} />
    </g>
  );
}

/** Hands are authored pointing along +x, then rotated to follow the forearm. */
function Hand({ shape, at, angle, color, scale }: { shape: HandShape; at: Point; angle: number; color: string; scale: number }) {
  const line = shade(color, -40);
  if (shape === 'open') {
    return (
      <g transform={`translate(${at.x} ${at.y}) rotate(${angle}) scale(${scale})`}>
        <ellipse cx={2} cy={0} rx={11} ry={9} fill={color} />
        <path d="M 8 -6 L 19 -8 M 11 -2 L 23 -3 M 11 2 L 23 3 M 8 6 L 19 8" stroke={color} strokeWidth={4.4} strokeLinecap="round" />
        <path d="M 2 -8 L 0 -15" stroke={color} strokeWidth={4.2} strokeLinecap="round" />
      </g>
    );
  }
  if (shape === 'point') {
    return (
      <g transform={`translate(${at.x} ${at.y}) rotate(${angle}) scale(${scale})`}>
        <ellipse cx={0} cy={0} rx={9} ry={8} fill={color} />
        <path d="M 5 -1 L 21 -1.5" stroke={color} strokeWidth={5.2} strokeLinecap="round" />
        <path d="M 2 5 Q 7 7 10 4" stroke={line} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.6} />
      </g>
    );
  }
  if (shape === 'fist') {
    return (
      <g transform={`translate(${at.x} ${at.y}) rotate(${angle}) scale(${scale})`}>
        <ellipse cx={0} cy={0} rx={9.5} ry={8.5} fill={color} />
        <path d="M -4 -4 Q 0 -6 4 -4 M -4 0 Q 0 -2 4 0 M -4 4 Q 0 2 4 4" stroke={line} strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.5} />
      </g>
    );
  }
  return <circle cx={at.x} cy={at.y} r={9.5 * scale} fill={color} />;
}

function Arm({ arm, colors, settings, far, rig }: { arm: ArmPose; colors: CharacterColors; settings: CharacterSettings; far?: boolean; rig: RigPose }) {
  const p = rig.proportions;
  const sleeve = far ? shade(colors.jacket, -30) : colors.jacket;
  const skin = far ? shade(colors.skin, -20) : colors.skin;
  const width = far ? p.armWidth - 2 : p.armWidth;
  const meta = OUTFIT_META[settings.outfit];
  const angle = (Math.atan2(arm.wrist.y - arm.elbow.y, arm.wrist.x - arm.elbow.x) * 180) / Math.PI;
  const lerpPt = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  return (
    <g data-arm={far ? 'far' : 'near'}>
      {meta.sleeve === 'long' ? (
        <>
          {(() => {
            const cuff = lerpPt(arm.elbow, arm.wrist, 0.82);
            return (
              <>
                <Limb a={arm.shoulder} b={arm.elbow} c={cuff} width={width} color={sleeve} highlight={far ? undefined : shade(sleeve, 24)} separation={!far} />
                <path d={`M ${cuff.x} ${cuff.y} L ${arm.wrist.x} ${arm.wrist.y}`} stroke={skin} strokeWidth={width * 0.5} strokeLinecap="round" />
                <circle cx={cuff.x} cy={cuff.y} r={width * 0.46} fill={shade(sleeve, -18)} />
              </>
            );
          })()}
        </>
      ) : (
        <>
          {!far && (
            <path
              d={`M ${arm.shoulder.x} ${arm.shoulder.y} L ${arm.elbow.x} ${arm.elbow.y} L ${arm.wrist.x} ${arm.wrist.y}`}
              fill="none"
              stroke={shade(skin, -70)}
              strokeWidth={width * 0.74 + 3.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.2}
            />
          )}
          <path
            d={`M ${arm.shoulder.x} ${arm.shoulder.y} L ${arm.elbow.x} ${arm.elbow.y} L ${arm.wrist.x} ${arm.wrist.y}`}
            fill="none"
            stroke={skin}
            strokeWidth={width * 0.74}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {(() => {
            const cap = lerpPt(arm.shoulder, arm.elbow, 0.62);
            return (
              <>
                {!far && (
                  <path d={`M ${arm.shoulder.x} ${arm.shoulder.y} L ${cap.x} ${cap.y}`} stroke={shade(sleeve, -70)} strokeWidth={width + 3.4} strokeLinecap="round" opacity={0.22} />
                )}
                <path d={`M ${arm.shoulder.x} ${arm.shoulder.y} L ${cap.x} ${cap.y}`} stroke={sleeve} strokeWidth={width} strokeLinecap="round" />
                <circle cx={cap.x} cy={cap.y} r={width * 0.5} fill={shade(sleeve, -14)} />
              </>
            );
          })()}
        </>
      )}
      <Hand shape={arm.hand} at={arm.wrist} angle={angle} color={skin} scale={p.handScale} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Head                                                                */
/* ------------------------------------------------------------------ */

export interface CharacterHeadProps {
  emotion?: Emotion;
  colors?: CharacterColors;
  glasses?: boolean;
  blink?: number;
  mouth?: VisemeId;
  mouthOpen?: number;
  beard?: boolean;
  freckles?: boolean;
  hair?: CharacterSettings['hair'];
  cap?: boolean;
  headphones?: boolean;
  className?: string;
}

/**
 * The head as a plain `<g>`, authored around a local origin near eye level.
 *
 * Use this when the head goes inside an existing `<svg>` (expression sheets,
 * avatars laid out on a canvas). Use {@link CharacterHead} when you want a
 * standalone, self-sizing SVG element.
 */
export function CharacterHeadArt({
  emotion = 'neutral',
  colors = DEFAULT_SETTINGS.colors,
  glasses = false,
  blink = 0,
  mouth = 'rest',
  mouthOpen = 0,
  beard = false,
  freckles = false,
  hair = 'curly',
  cap = false,
  headphones = false,
}: Omit<CharacterHeadProps, 'className'>) {
  return (
    <g data-head={emotion}>
      <HairBack style={hair} color={colors.hair} />
      <Face emotion={emotion} colors={colors} glasses={glasses} blink={blink} mouth={mouth} mouthOpen={mouthOpen} beard={beard} freckles={freckles} />
      <HairFront style={hair} color={colors.hair} />
      {cap && <Cap colors={colors} />}
      {headphones && <Headphones colors={colors} />}
    </g>
  );
}

/** Head-only SVG, for expression sheets, avatars and reaction shots. */
export function CharacterHead({ className, ...rest }: CharacterHeadProps) {
  return (
    <svg viewBox="-66 -86 132 162" className={className} role="img" aria-label={`${rest.emotion ?? 'neutral'} expression`}>
      <CharacterHeadArt {...rest} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Full rig                                                            */
/* ------------------------------------------------------------------ */

/**
 * Reusable SVG character rig. The origin is the ground point between the feet,
 * +x is the facing direction, -y is up. Drop it inside any `<svg>` and position
 * it with a transform.
 */
export function CharacterRig({ settings = DEFAULT_SETTINGS, frame = 0, fps = 30, showGuides = false }: CharacterRigProps) {
  const pose = samplePose(settings, frame, fps);
  const { colors } = settings;
  const p = pose.proportions;
  // Hashed from the gradient's own stops: identical garments share one def,
  // different garments can never collide, and the id is stable across renders.
  const jacketId = stableId('garment', colors.jacket);
  const s = pose.shoulder;
  const u = p.torsoLength / 87;

  return (
    <g data-character={settings.character} transform={`scale(${settings.direction} 1)`}>
      <defs>
        <linearGradient id={jacketId} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={shade(colors.jacket, 22)} />
          <stop offset="0.55" stopColor={colors.jacket} />
          <stop offset="1" stopColor={shade(colors.jacket, -18)} />
        </linearGradient>
      </defs>

      {pose.seated && <Stool pose={pose} colors={colors} />}
      {settings.backpack && <Backpack pose={pose} colors={colors} />}

      <Arm arm={pose.arms[0]} colors={colors} settings={settings} far rig={pose} />
      <Leg hip={pose.hips[0]} foot={pose.feet[0]} colors={colors} far pose={pose} />
      <Leg hip={pose.hips[1]} foot={pose.feet[1]} colors={colors} pose={pose} />

      {/* neck, behind the collar */}
      <path
        d={`M ${pose.head.x - 12 * p.headScale} ${pose.head.y + 30 * p.headScale}
          L ${pose.head.x - 14 * p.headScale} ${s.y + 4 * u}
          Q ${pose.head.x + 2} ${s.y + 12 * u} ${pose.head.x + 16 * p.headScale} ${s.y + 2 * u}
          L ${pose.head.x + 12 * p.headScale} ${pose.head.y + 28 * p.headScale} Z`}
        fill={shade(colors.skin, -22)}
      />

      <g transform={`translate(0 ${pose.bob}) scale(1 ${1 + pose.breath}) translate(0 ${-pose.bob})`}>
        <Torso pose={pose} colors={colors} outfit={settings.outfit} gradientId={jacketId} />
        {settings.backpack && <BackpackStrap pose={pose} colors={colors} />}
      </g>
      {settings.scarf && <Scarf pose={pose} colors={colors} />}

      <g transform={`translate(${pose.head.x} ${pose.head.y}) rotate(${pose.headTilt}) scale(${p.headScale})`}>
        <CharacterHeadArt
          emotion={settings.emotion}
          colors={colors}
          glasses={settings.glasses}
          blink={pose.blink}
          mouth={pose.mouth}
          mouthOpen={pose.mouthOpen}
          beard={settings.beard}
          freckles={settings.freckles}
          hair={settings.hair}
          cap={settings.cap}
          headphones={settings.headphones}
        />
      </g>

      <Arm arm={pose.arms[1]} colors={colors} settings={settings} rig={pose} />

      {showGuides && (
        <g data-rig-guides="true" fill="none" stroke="#F26B38" strokeWidth={1.2} opacity={0.9}>
          <path d="M -90 0 L 90 0" strokeDasharray="4 4" />
          {pose.feet.map((f, i) => (
            <g key={i}>
              <path d={`M ${pose.hips[i].x} ${pose.hips[i].y} L ${f.knee.x} ${f.knee.y} L ${f.ankle.x} ${f.ankle.y}`} />
              <circle cx={f.knee.x} cy={f.knee.y} r={4} fill={f.contact ? '#F26B38' : '#FFFDF6'} />
              <circle cx={f.ankle.x} cy={f.ankle.y} r={3} fill="#FFFDF6" />
            </g>
          ))}
          <path d={`M ${s.x} ${s.y} L ${pose.hip.x} ${pose.hip.y}`} strokeDasharray="3 3" />
          <path d={`M ${s.x} ${s.y} L ${pose.head.x} ${pose.head.y}`} strokeDasharray="3 3" />
          {pose.arms.map((a, i) => (
            <path key={i} d={`M ${a.shoulder.x} ${a.shoulder.y} L ${a.elbow.x} ${a.elbow.y} L ${a.wrist.x} ${a.wrist.y}`} stroke="#365DE6" />
          ))}
          <circle cx={pose.hip.x} cy={pose.hip.y} r={4} fill="#FFFDF6" />
          <circle cx={s.x} cy={s.y} r={4} fill="#FFFDF6" />
          <circle cx={pose.head.x} cy={pose.head.y} r={4} fill="#FFFDF6" />
        </g>
      )}
    </g>
  );
}

/**
 * Standalone transparent SVG. The viewBox is tall enough to contain a jump, and
 * the scale is clamped so the character can never be cropped by the frame.
 */
export function Character({
  settings = DEFAULT_SETTINGS,
  frame = 0,
  fps = 30,
  showGuides = false,
  style,
}: CharacterRigProps & { style?: React.CSSProperties }) {
  const pose = samplePose(settings, frame, fps);
  const headroom = pose.skeleton.height + 95;
  const fit = Math.min(settings.scale, 560 / headroom);
  return (
    <svg
      viewBox="0 0 400 620"
      width="100%"
      height="100%"
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${settings.character}, a reusable 2D character`}
    >
      <g transform={`translate(200 580) scale(${fit})`}>
        <CharacterRig settings={settings} frame={frame} fps={fps} showGuides={showGuides} />
      </g>
    </svg>
  );
}

export { Face } from './parts/Face';
export { INK };
