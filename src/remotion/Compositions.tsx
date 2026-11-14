/**
 * Registered Remotion compositions.
 *
 * Every composition is a pure function of (props, frame): no timers, no
 * Math.random, no network. That is what makes parallel renders frame-identical.
 *
 * Props are partial — `mergeSettings` fills in the cast member's look and the
 * scene defaults, so `<WalkScene character="ada" motion="run" />` is enough.
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CharacterRig, CharacterHead, Face } from '../rig/Character';
import { SceneLayer } from '../rig/environments';
import { samplePose, GROUND_Y, CHARACTER_X, WIDTH, HEIGHT, FPS } from '../rig/gait';
import { castSceneSettings, getCharacter, listCharacters } from '../rig/cast';
import { DEFAULT_SETTINGS, EMOTIONS, MOTIONS, type CharacterSettings, type SceneSettings } from '../rig/types';
import { dialogueSchedule, turnAt, wrapLines, type DialogueTurn } from '../rig/dialogue';
import { shade } from '../rig/color';

export type SceneProps = Partial<SceneSettings>;

/**
 * Resolve props into a complete settings object.
 * Accepts the v1 `environment` key and maps it onto `timeOfDay`.
 */
export function mergeSettings(props: SceneProps = {}): SceneSettings {
  const { environment, ...rest } = props;
  const base = castSceneSettings(props.character ?? DEFAULT_SETTINGS.character);
  const merged: SceneSettings = {
    ...base,
    ...rest,
    colors: { ...base.colors, ...(props.colors ?? {}) },
  };
  if (environment && !props.timeOfDay) merged.timeOfDay = environment;
  delete merged.environment;
  return merged;
}

/** Largest scale that keeps the whole rig (plus jump clearance) inside `budget`. */
function fitScale(settings: SceneSettings, height: number, budget: number): number {
  const clearance = settings.motion === 'jump' ? 110 : 24;
  return Math.min(settings.scale, budget / (height + clearance));
}

/** Contact shadow. Shrinks and fades while the character is airborne. */
function Shadow({ x, scale, lift = 0, moving = false }: { x: number; scale: number; lift?: number; moving?: boolean }) {
  const air = Math.max(0, Math.min(1, -lift / 150));
  return (
    <ellipse
      cx={x}
      cy={GROUND_Y + 4}
      rx={(moving ? 52 : 44) * scale * (1 - air * 0.35)}
      ry={8 * scale * (1 - air * 0.3)}
      fill="#26352E"
      opacity={0.18 * (1 - air * 0.55)}
    />
  );
}

/** Burned-in subtitles, wrapped deterministically. */
export function Subtitles({ text, y = 664, maxChars = 46 }: { text: string; y?: number; maxChars?: number }) {
  if (!text.trim()) return null;
  const lines = wrapLines(text, maxChars, 2);
  const w = Math.min(1120, Math.max(...lines.map((l) => l.length)) * 15 + 64);
  const h = lines.length * 34 + 26;
  return (
    <g data-subtitles="true">
      <rect x={(WIDTH - w) / 2} y={y - h + 22} width={w} height={h} rx={12} fill="#1B241F" opacity={0.78} />
      {lines.map((l, i) => (
        <text
          key={i}
          x={WIDTH / 2}
          y={y - (lines.length - 1 - i) * 34}
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
          fontSize={26}
          fontWeight={600}
          fill="#FFFDF6"
        >
          {l}
        </text>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Scene compositions                                                  */
/* ------------------------------------------------------------------ */

/** Main reusable composition: character + scrolling world, frame-deterministic. */
export function WalkScene(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const pose = samplePose(settings, frame, fps);
  const worldDistance = pose.distance * settings.scale;
  const startX = settings.direction === 1 ? 180 : WIDTH - 180;
  const x = settings.followCamera ? CHARACTER_X : startX + settings.direction * worldDistance;
  const moving = settings.motion === 'walk' || settings.motion === 'run';
  return (
    <AbsoluteFill style={{ backgroundColor: '#BFE3E8' }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <SceneLayer
          scene={settings.scene}
          distance={settings.followCamera ? worldDistance : 0}
          direction={settings.direction}
          timeOfDay={settings.timeOfDay}
          parallax={settings.parallax}
          time={frame / fps}
        />
        <Shadow x={x} scale={settings.scale} lift={pose.lift} moving={moving} />
        {settings.guides && <path d={`M 0 ${GROUND_Y} H ${WIDTH}`} stroke="#F26B38" strokeWidth={1.5} strokeDasharray="6 6" opacity={0.8} />}
        <g transform={`translate(${x} ${GROUND_Y}) scale(${settings.scale})`}>
          <CharacterRig settings={settings} frame={frame} fps={fps} showGuides={settings.guides} />
        </g>
        {settings.showSubtitles && settings.dialogue ? <Subtitles text={settings.dialogue} /> : null}
      </svg>
    </AbsoluteFill>
  );
}

/** Transparent character-only composition for PNG sequences / alpha video. */
export function CharacterOnly(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const pose = samplePose(settings, frame, fps);
  const fit = fitScale(settings, pose.skeleton.height, 660) * 1.55;
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <svg viewBox="0 0 720 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <g transform={`translate(360 690) scale(${fit})`}>
          <CharacterRig settings={settings} frame={frame} fps={fps} showGuides={settings.guides} />
        </g>
      </svg>
    </AbsoluteFill>
  );
}

/** Environment-only plate. `scene` picks the world; defaults to the street. */
export function SceneOnly(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const pose = samplePose(settings, frame, fps);
  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <SceneLayer
          scene={settings.scene}
          distance={pose.distance * settings.scale}
          direction={settings.direction}
          timeOfDay={settings.timeOfDay}
          parallax={settings.parallax}
          time={frame / fps}
        />
      </svg>
    </AbsoluteFill>
  );
}

/** @deprecated v1 name for `SceneOnly`. */
export const StreetOnly = SceneOnly;

/* ------------------------------------------------------------------ */
/* Sheets — reference grids for a library, not a single video          */
/* ------------------------------------------------------------------ */

const SANS = 'system-ui, -apple-system, Segoe UI, sans-serif';
const SERIF = 'Georgia, serif';

/** Every expression, laid out 4 + 3 so all seven fit the frame. */
export function EmotionSheet(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const pose = samplePose({ ...settings, motion: 'idle' }, frame, fps);
  const def = getCharacter(settings.character);
  const cols = [220, 480, 740, 1000];
  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F4EF' }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <text x={72} y={86} fontSize={42} fill="#26352E" fontFamily={SERIF}>A face for every moment.</text>
        <text x={72} y={120} fontSize={19} fill="#6B7A70" fontFamily={SANS}>
          {def.name} · {EMOTIONS.length} reusable expressions · deterministic blink
        </text>
        {EMOTIONS.map((e, i) => {
          const row = i < 4 ? 0 : 1;
          const x = row === 0 ? cols[i] : 350 + (i - 4) * 260;
          const y = row === 0 ? 268 : 520;
          return (
            <g key={e.id} transform={`translate(${x} ${y})`}>
              <circle cx={0} cy={-6} r={86} fill={e.id === settings.emotion ? '#F6D78B' : '#E8ECE6'} />
              <g transform="scale(1.22)">
                <Face
                  emotion={e.id}
                  colors={settings.colors}
                  glasses={settings.glasses}
                  blink={pose.blink}
                  beard={settings.beard}
                  freckles={settings.freckles}
                />
              </g>
              <text x={0} y={116} textAnchor="middle" fontSize={25} fill="#26352E" fontFamily={SERIF}>{e.label}</text>
              <text x={0} y={142} textAnchor="middle" fontSize={14} fill="#6B7A70" fontFamily={SANS}>{e.note}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

/** The whole cast, labelled. Drop new members into `cast.ts` and they appear. */
export function CastSheet(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const cast = listCharacters();
  const slot = WIDTH / cast.length;
  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F4EF' }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <SceneLayer scene="backdrop" timeOfDay={settings.timeOfDay} parallax={0} distance={0} time={frame / fps} />
        <text x={72} y={84} fontSize={42} fill="#26352E" fontFamily={SERIF}>The cast.</text>
        <text x={72} y={118} fontSize={19} fill="#6B7A70" fontFamily={SANS}>
          {cast.length} characters · one rig · every look is data
        </text>
        {cast.map((c, i) => {
          const s = castSceneSettings(c.id, { motion: 'idle', backpack: c.accessories?.backpack ?? false });
          const x = slot * (i + 0.5);
          const scale = 0.78;
          return (
            <g key={c.id}>
              <ellipse cx={x} cy={556} rx={44 * scale} ry={7 * scale} fill="#26352E" opacity={0.16} />
              <g transform={`translate(${x} 552) scale(${scale})`}>
                <CharacterRig settings={s} frame={frame} fps={fps} />
              </g>
              <text x={x} y={604} textAnchor="middle" fontSize={26} fill="#26352E" fontFamily={SERIF}>{c.name}</text>
              <text x={x} y={630} textAnchor="middle" fontSize={13} fill="#6B7A70" fontFamily={SANS}>{c.build} · {c.hair} · {c.outfit}</text>
              <text x={x} y={654} textAnchor="middle" fontSize={12} fill="#8A968D" fontFamily={SANS}>
                {wrapLines(c.tagline, 30, 2)[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

/** The cast walking through a static street plate — feet stay locked. */
export function CastScene(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const cast = listCharacters();
  return (
    <AbsoluteFill style={{ backgroundColor: '#BFE3E8' }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <SceneLayer scene={settings.scene} distance={0} direction={1} timeOfDay={settings.timeOfDay} parallax={settings.parallax} time={frame / fps} />
        {cast.map((c, i) => {
          const s = castSceneSettings(c.id, { motion: 'walk', scale: 0.92 });
          const pose = samplePose(s, frame, fps);
          const x = 150 + i * -190 + pose.distance * s.scale;
          return (
            <g key={c.id}>
              <Shadow x={x} scale={s.scale} moving />
              <g transform={`translate(${x} ${GROUND_Y}) scale(${s.scale})`}>
                <CharacterRig settings={s} frame={frame} fps={fps} />
              </g>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

/** Every motion in one grid — the animation vocabulary of the rig. */
export function MotionSheet(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const cols = 5;
  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F4EF' }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <text x={72} y={72} fontSize={40} fill="#26352E" fontFamily={SERIF}>Ten ways to move.</text>
        <text x={72} y={104} fontSize={18} fill="#6B7A70" fontFamily={SANS}>
          One procedural rig · stance-locked IK · frame-deterministic
        </text>
        {MOTIONS.map((m, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = 140 + col * 256;
          const ground = row === 0 ? 352 : 668;
          const s: SceneSettings = {
            ...settings,
            motion: m.id,
            dialogue: m.id === 'talk' ? settings.dialogue || 'Hello there, nice to meet you.' : settings.dialogue,
            followCamera: false,
          };
          const scale = 0.44;
          return (
            <g key={m.id}>
              <ellipse cx={x} cy={ground + 3} rx={40 * scale} ry={6 * scale} fill="#26352E" opacity={0.15} />
              <g transform={`translate(${x} ${ground}) scale(${scale})`}>
                <CharacterRig settings={s} frame={frame} fps={fps} />
              </g>
              <text x={x} y={ground + 30} textAnchor="middle" fontSize={22} fill="#26352E" fontFamily={SERIF}>{m.label}</text>
              <text x={x} y={ground + 52} textAnchor="middle" fontSize={12} fill="#6B7A70" fontFamily={SANS}>{m.note}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ */
/* Speech                                                              */
/* ------------------------------------------------------------------ */

export interface TalkingHeadProps extends SceneProps {
  /** Background plate colour; 'transparent' for compositing. */
  background?: string;
}

/** Close-up head with text-driven lip-sync. Great for reaction shots. */
export function TalkingHead(props: TalkingHeadProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings({ motion: 'talk', ...props });
  const pose = samplePose(settings, frame, fps);
  const def = getCharacter(settings.character);
  const background = props.background ?? '#F5F4EF';
  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <svg viewBox="0 0 720 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <circle cx={360} cy={300} r={210} fill={shade(settings.colors.jacket, 60)} opacity={0.35} />
        <g transform="translate(360 320) scale(2.5)">
          <CharacterHead
            emotion={settings.emotion}
            colors={settings.colors}
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
        <text x={360} y={588} textAnchor="middle" fontSize={30} fill="#26352E" fontFamily={SERIF}>{def.name}</text>
        {settings.showSubtitles && settings.dialogue ? (
          <g transform="translate(-280 0)">
            <Subtitles text={settings.dialogue} y={664} maxChars={34} />
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
}

export interface DialogueProps extends SceneProps {
  /** Two cast ids: `[left, right]`. */
  speakers?: [string, string];
  /** One line per turn, alternating between the speakers. */
  script?: string | string[];
  /** Silence between turns, frames. */
  gapFrames?: number;
}

export const DEFAULT_SCRIPT = [
  'Hey! Good to see you.',
  'You too. How is the new rig coming along?',
  'Ten motions, seven faces, and it never skates.',
  'Sold. Let us put it in the next video.',
];

/**
 * Two characters talking, with lip-sync, subtitles and a speaker highlight.
 * Timing is derived from the text, so the whole scene is deterministic.
 */
export function DialogueScene(props: DialogueProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const [leftId, rightId] = props.speakers ?? ['milo', 'ada'];
  const script = props.script ?? DEFAULT_SCRIPT;
  const gapFrames = props.gapFrames ?? 14;
  const turns = dialogueSchedule(script, { fps, speechRate: settings.speechRate, gapFrames, seeds: [3, 17] });
  const active = turnAt(turns, frame);
  const scale = 1.02;

  const performer = (id: string, index: 0 | 1, direction: 1 | -1, x: number) => {
    const speaking = active?.speaker === index;
    const base = castSceneSettings(id, { scale, direction, backpack: false });
    const s: CharacterSettings = speaking
      ? { ...base, motion: 'talk', emotion: 'happy', dialogue: active!.text, seed: index === 0 ? 3 : 17 }
      : { ...base, motion: 'idle', emotion: index === 0 ? 'neutral' : 'focused', seed: index === 0 ? 3 : 17 };
    // The speaker's clock starts at their turn so visemes line up with the text.
    const localFrame = speaking ? frame - active!.startFrame : frame;
    return (
      <g>
        <Shadow x={x} scale={scale} />
        <g transform={`translate(${x} ${GROUND_Y}) scale(${scale})`} opacity={speaking || !active ? 1 : 0.92}>
          <CharacterRig settings={s} frame={localFrame} fps={fps} />
        </g>
        <text x={x} y={GROUND_Y + 44} textAnchor="middle" fontSize={18} fill="#26352E" fontFamily={SANS} opacity={0.75}>
          {getCharacter(id).name}
        </text>
      </g>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#BFE3E8' }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <SceneLayer scene={settings.scene} distance={0} direction={1} timeOfDay={settings.timeOfDay} parallax={settings.parallax * 0.4} time={frame / fps} />
        {performer(leftId, 0, 1, 430)}
        {performer(rightId, 1, -1, 850)}
        {settings.showSubtitles !== false && active ? <Subtitles text={active.text} y={690} /> : null}
      </svg>
    </AbsoluteFill>
  );
}

export { FPS };
