import { useId } from 'react';
import type { CharacterColors, CharacterSettings, Emotion } from './types';
import { DEFAULT_SETTINGS } from './types';
import { samplePose, type ArmPose, type FootPose, type Point } from './gait';
import { shade } from './color';

export interface CharacterRigProps {
  settings?: CharacterSettings;
  frame?: number;
  fps?: number;
  showGuides?: boolean;
}

interface FaceProps {
  emotion: Emotion;
  colors: CharacterColors;
  glasses?: boolean;
  blink?: number;
}

const INK = '#26352E';

export function Face({ emotion, colors, glasses = false, blink = 0 }: FaceProps) {
  const skin = colors.skin;
  const hair = colors.hair;
  const eyeScale = Math.max(0.06, 1 - blink);
  const happy = emotion === 'happy';
  const surprised = emotion === 'surprised';
  const sad = emotion === 'sad';
  const focused = emotion === 'focused';
  const browY = surprised ? -19 : sad ? -15 : focused ? -13 : -16;
  const eyeRy = surprised ? 6.4 : focused ? 3.4 : 4.8;
  return (
    <g data-face={emotion}>
      {/* neck */}
      <path d="M -13 29 L -15 61 Q 2 70 17 59 L 13 27 Z" fill={shade(skin, -22)} />
      {/* ear */}
      <ellipse cx={-35} cy={9} rx={12} ry={15} fill={skin} />
      <path d="M -39 4 Q -31 1 -31 11" fill="none" stroke={shade(skin, -42)} strokeWidth={2.4} strokeLinecap="round" />
      {/* three-quarter face with a soft nose silhouette */}
      <path d="M -38 -24 C -39 -49 -12 -60 14 -53 C 35 -48 42 -30 40 -13 L 47 -4 Q 52 3 43 7 L 39 8 C 37 30 24 43 5 43 C -18 43 -35 28 -38 9 Z" fill={skin} />
      <path d="M -38 -20 C -35 8 -30 30 -8 39 C -24 36 -36 25 -38 8 Z" fill={shade(skin, -16)} opacity={0.55} />
      {/* cheeks */}
      <ellipse cx={4} cy={13} rx={8} ry={5} fill="#E88B73" opacity={happy ? 0.42 : 0.25} />
      <ellipse cx={34} cy={12} rx={6} ry={4} fill="#E88B73" opacity={happy ? 0.4 : 0.22} />
      {/* brows */}
      {sad ? (
        <>
          <path d={`M 2 ${browY + 2} Q 8 ${browY - 3} 15 ${browY - 4}`} stroke={hair} strokeWidth={3.4} fill="none" strokeLinecap="round" />
          <path d={`M 27 ${browY - 4} Q 33 ${browY - 3} 38 ${browY + 1}`} stroke={hair} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        </>
      ) : focused ? (
        <>
          <path d={`M 2 ${browY - 2} L 15 ${browY + 1}`} stroke={hair} strokeWidth={3.4} strokeLinecap="round" />
          <path d={`M 27 ${browY + 1} L 38 ${browY - 2}`} stroke={hair} strokeWidth={3.2} strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d={`M 2 ${browY} Q 8 ${browY - 3} 15 ${browY - 1}`} stroke={hair} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <path d={`M 27 ${browY - 1} Q 33 ${browY - 3} 38 ${browY}`} stroke={hair} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      )}
      {/* eyes */}
      {happy && blink < 0.5 ? (
        <>
          <path d="M 3 -5 Q 9 -11 15 -5" stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <path d="M 27 -5 Q 33 -11 39 -5" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx={9} cy={-6} rx={surprised ? 4.6 : 3.5} ry={eyeRy * eyeScale} fill={INK} />
          <ellipse cx={33} cy={-6} rx={surprised ? 4.2 : 3.2} ry={eyeRy * eyeScale} fill={INK} />
          {eyeScale > 0.4 && <><circle cx={10.2} cy={-7.6} r={1.15} fill="#FFFDF6" /><circle cx={34.1} cy={-7.6} r={1.05} fill="#FFFDF6" /></>}
        </>
      )}
      {/* nose */}
      <path d="M 37 1 Q 42 4 37 6" stroke={shade(skin, -46)} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* mouth */}
      {happy ? (
        <>
          <path d="M 9 17 Q 23 25 36 15 Q 32 34 19 32 Q 11 28 9 17 Z" fill={INK} />
          <path d="M 12 19 Q 23 24 33 18 L 31 23 Q 22 27 14 23 Z" fill="#FFFDF6" />
          <path d="M 18 30 Q 24 26 30 29 Q 25 33 18 30 Z" fill="#E88B73" />
        </>
      ) : surprised ? (
        <ellipse cx={24} cy={23} rx={7} ry={9} fill={INK} />
      ) : sad ? (
        <path d="M 13 27 Q 23 19 34 26" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      ) : focused ? (
        <path d="M 14 23 L 32 22" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      ) : (
        <path d="M 14 21 Q 24 27 34 20" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      )}
      {/* curly hair */}
      <path d="M -42 9 C -55 -8 -51 -34 -39 -45 C -44 -58 -27 -67 -15 -60 C -7 -73 12 -71 20 -61 C 35 -67 48 -54 43 -42 C 54 -34 46 -20 34 -22 C 24 -17 15 -28 8 -30 C -3 -22 -15 -29 -22 -17 L -26 9 Z" fill={hair} />
      <circle cx={-35} cy={-42} r={11} fill={hair} />
      <circle cx={-18} cy={-55} r={12} fill={hair} />
      <circle cx={2} cy={-59} r={12} fill={hair} />
      <circle cx={22} cy={-52} r={12} fill={hair} />
      <circle cx={36} cy={-40} r={10} fill={hair} />
      <path d="M -30 -46 Q -24 -54 -15 -52 M -4 -58 Q 4 -63 12 -57 M 20 -50 Q 28 -53 33 -46" stroke={shade(hair, 38)} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.7} />
      <path d="M -26 -14 Q -20 -20 -16 -12 L -18 4 Q -24 2 -26 -14 Z" fill={hair} />
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

export function CharacterHead({ emotion = 'neutral', colors = DEFAULT_SETTINGS.colors, glasses = false, blink = 0, className }: FaceProps & { className?: string }) {
  return (
    <svg viewBox="-62 -78 124 150" className={className} role="img" aria-label={`${emotion} expression`}>
      <Face emotion={emotion} colors={colors} glasses={glasses} blink={blink} />
    </svg>
  );
}

function Limb({ a, b, c, width, color, highlight }: { a: Point; b: Point; c: Point; width: number; color: string; highlight?: string }) {
  return (
    <g>
      <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      {highlight && <path d={`M ${a.x - width * 0.18} ${a.y} L ${b.x - width * 0.18} ${b.y}`} fill="none" stroke={highlight} strokeWidth={width * 0.22} strokeLinecap="round" opacity={0.5} />}
    </g>
  );
}

function Shoe({ foot, colors, far }: { foot: FootPose; colors: CharacterColors; far?: boolean }) {
  const sole = far ? shade(colors.shoes, -34) : colors.shoes;
  return (
    <g transform={`translate(${foot.ankle.x} ${foot.ankle.y}) rotate(${foot.angle})`}>
      <path d="M -12 -6 Q -2 -10 6 -4 L 14 2 Q 24 3 30 8 L 31 13 L -15 13 Q -19 13 -18 8 L -16 0 Z" fill={sole} />
      <path d="M -18 10 L 31 10 L 31 13 L -15 13 Q -19 13 -18 10 Z" fill={far ? '#C97850' : '#F26B38'} />
      <path d="M 2 -3 L 10 1 M 7 -1 L 15 3" stroke={shade(sole, -55)} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M -14 -2 L -12 7" stroke={shade(sole, -30)} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function Leg({ hip, foot, colors, far }: { hip: Point; foot: FootPose; colors: CharacterColors; far?: boolean }) {
  const pants = far ? shade(colors.pants, -24) : colors.pants;
  return (
    <g data-leg={far ? 'far' : 'near'}>
      <Limb a={hip} b={foot.knee} c={foot.ankle} width={far ? 27 : 29} color={pants} highlight={far ? undefined : shade(pants, 26)} />
      <circle cx={foot.ankle.x} cy={foot.ankle.y - 2} r={far ? 11 : 12} fill={pants} />
      <Shoe foot={foot} colors={colors} far={far} />
    </g>
  );
}

function Arm({ pose, colors, skin, far, waving }: { pose: ArmPose; colors: CharacterColors; skin: string; far?: boolean; waving?: boolean }) {
  const sleeve = far ? shade(colors.jacket, -30) : colors.jacket;
  const hand = far ? shade(skin, -20) : skin;
  const cuff = { x: pose.elbow.x + (pose.wrist.x - pose.elbow.x) * 0.82, y: pose.elbow.y + (pose.wrist.y - pose.elbow.y) * 0.82 };
  return (
    <g data-arm={far ? 'far' : 'near'}>
      <Limb a={pose.shoulder} b={pose.elbow} c={cuff} width={far ? 24 : 26} color={sleeve} highlight={far ? undefined : shade(sleeve, 24)} />
      <path d={`M ${cuff.x} ${cuff.y} L ${pose.wrist.x} ${pose.wrist.y}`} stroke={hand} strokeWidth={13} strokeLinecap="round" />
      {waving ? (
        <g transform={`translate(${pose.wrist.x} ${pose.wrist.y}) rotate(-12)`}>
          <ellipse cx={0} cy={-5} rx={9} ry={11} fill={hand} />
          <path d="M -6 -10 L -8 -20 M -2 -13 L -3 -24 M 3 -13 L 4 -23 M 7 -10 L 10 -19" stroke={hand} strokeWidth={4.4} strokeLinecap="round" />
        </g>
      ) : (
        <circle cx={pose.wrist.x} cy={pose.wrist.y} r={9.5} fill={hand} />
      )}
      <circle cx={cuff.x} cy={cuff.y} r={far ? 11 : 12} fill={shade(sleeve, -18)} />
    </g>
  );
}

/** Reusable SVG character rig. Origin is the ground point between the feet. */
export function CharacterRig({ settings = DEFAULT_SETTINGS, frame = 0, fps = 30, showGuides = false }: CharacterRigProps) {
  const uid = useId().replace(/:/g, '');
  const pose = samplePose(settings, frame, fps);
  const { colors } = settings;
  const jacketId = `jacket-${uid}`;
  const s = pose.shoulder;
  const lean = pose.lean;
  const bob = pose.bob;
  const torso = `M ${-29 + lean * 0.6} -231
    Q ${-12 + lean} -242 ${16 + lean} -234
    Q ${34 + lean} -229 ${33 + lean * 0.5} -205
    L 31 -149 Q 31 -137 19 -137
    L -23 -137 Q -35 -137 -35 -150
    L ${-34 + lean * 0.6} -211 Q ${-35 + lean * 0.6} -225 ${-29 + lean * 0.6} -231 Z`;
  return (
    <g data-character="milo" transform={`scale(${settings.direction} 1)`}>
      <defs>
        <linearGradient id={jacketId} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={shade(colors.jacket, 22)} />
          <stop offset="0.55" stopColor={colors.jacket} />
          <stop offset="1" stopColor={shade(colors.jacket, -18)} />
        </linearGradient>
      </defs>
      {settings.backpack && (
        <g transform={`translate(${lean * 0.5} ${bob})`}>
          <path d="M -49 -218 Q -62 -214 -61 -196 L -58 -166 Q -56 -151 -42 -151 L -27 -154 L -28 -212 Q -36 -222 -49 -218 Z" fill="#D9A94C" />
          <path d="M -58 -201 Q -45 -208 -29 -201 L -29 -184 Q -45 -178 -59 -185 Z" fill="#E9C46A" />
          <path d="M -48 -178 L -47 -158 M -55 -194 L -34 -194" stroke="#B98735" strokeWidth={2.4} strokeLinecap="round" />
          <rect x={-52} y={-174} width={13} height={10} rx={3} fill="#F5F0E4" opacity={0.85} />
        </g>
      )}
      <Arm pose={pose.arms[0]} colors={colors} skin={colors.skin} far />
      <Leg hip={{ x: pose.hip.x - 7, y: pose.hip.y }} foot={pose.feet[0]} colors={colors} far />
      <Leg hip={{ x: pose.hip.x + 5, y: pose.hip.y }} foot={pose.feet[1]} colors={colors} />
      {/* neck behind collar */}
      <path d={`M ${pose.head.x - 12} ${pose.head.y + 30} L ${pose.head.x - 14} ${-222 + bob} Q ${pose.head.x + 2} ${-214 + bob} ${pose.head.x + 16} ${-224 + bob} L ${pose.head.x + 12} ${pose.head.y + 28} Z`} fill={shade(colors.skin, -22)} />
      <g transform={`translate(0 ${bob}) scale(1 ${1 + pose.breath})`}>
        <path d={torso} fill={`url(#${jacketId})`} />
        {/* cream tee + collar */}
        <path d={`M ${-12 + lean} ${-235} Q ${2 + lean} ${-228} ${16 + lean} ${-234} L ${10 + lean} ${-211} L ${-4 + lean} ${-211} Z`} fill="#F5F0E4" />
        <path d={`M ${-14 + lean} ${-236} L ${-2 + lean} ${-214} L ${-10 + lean} ${-208} L ${-22 + lean} ${-228} Z`} fill={shade(colors.jacket, -24)} />
        <path d={`M ${17 + lean} ${-235} L ${6 + lean} ${-214} L ${14 + lean} ${-207} L ${27 + lean} ${-227} Z`} fill={shade(colors.jacket, -14)} />
        {/* zip, pocket, hem */}
        <path d={`M ${3 + lean * 0.7} ${-212} Q ${5 + lean * 0.3} ${-178} 3 ${-141}`} stroke={shade(colors.jacket, -48)} strokeWidth={2} fill="none" opacity={0.65} />
        <path d={`M 12 ${-176} Q 22 ${-172} 25 ${-160} L 13 ${-158} Z`} fill={shade(colors.jacket, -20)} opacity={0.7} />
        <path d={`M -33 ${-146} Q -2 ${-140} 30 ${-147} L 30 ${-138} Q 0 ${-132} -32 ${-139} Z`} fill={shade(colors.jacket, -30)} />
        <path d={`M ${-27 + lean * 0.6} ${-222} Q ${-31 + lean * 0.4} ${-190} -29 ${-161}`} stroke={shade(colors.jacket, 40)} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.45} />
        {settings.backpack && <path d={`M ${-18 + lean} ${-233} Q ${-8 + lean} ${-205} -12 ${-174}`} stroke="#B98735" strokeWidth={6} fill="none" strokeLinecap="round" />}
      </g>
      <g transform={`translate(${pose.head.x} ${pose.head.y}) rotate(${pose.headTilt})`}>
        <Face emotion={settings.emotion} colors={colors} glasses={settings.glasses} blink={pose.blink} />
      </g>
      <Arm pose={pose.arms[1]} colors={colors} skin={colors.skin} waving={settings.motion === 'wave'} />
      {showGuides && (
        <g data-rig-guides="true" fill="none" stroke="#F26B38" strokeWidth={1.2} opacity={0.9}>
          <path d={`M -90 0 L 90 0`} strokeDasharray="4 4" />
          {pose.feet.map((f, i) => (
            <g key={i}>
              <path d={`M ${pose.hip.x} ${pose.hip.y} L ${f.knee.x} ${f.knee.y} L ${f.ankle.x} ${f.ankle.y}`} />
              <circle cx={f.knee.x} cy={f.knee.y} r={4} fill={f.contact ? '#F26B38' : '#FFFDF6'} />
              <circle cx={f.ankle.x} cy={f.ankle.y} r={3} fill="#FFFDF6" />
            </g>
          ))}
          <path d={`M ${s.x} ${s.y} L ${pose.hip.x} ${pose.hip.y}`} strokeDasharray="3 3" />
          <circle cx={pose.hip.x} cy={pose.hip.y} r={4} fill="#FFFDF6" />
        </g>
      )}
    </g>
  );
}

/** Standalone, transparent SVG component for any Remotion composition. */
export function Character({ settings = DEFAULT_SETTINGS, frame = 0, fps = 30, showGuides = false, style }: CharacterRigProps & { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 400 480" width="100%" height="100%" style={style} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Milo, a reusable 2D character">
      <g transform={`translate(200 440) scale(${settings.scale})`}>
        <CharacterRig settings={settings} frame={frame} fps={fps} showGuides={showGuides} />
      </g>
    </svg>
  );
}
