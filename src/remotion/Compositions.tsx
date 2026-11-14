import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CharacterRig, CharacterHeadArt } from '../rig/Character';
import { EnvironmentLayer } from '../rig/Environment';
import { StreetLayer } from '../rig/Street';
import { samplePose, GROUND_Y, CHARACTER_X, WIDTH } from '../rig/gait';
import { CAST, characterSettings, getCharacter } from '../rig/cast';
import { buildSpeech, splitTurns, visemeAt } from '../rig/lipsync';
import {
  DEFAULT_SETTINGS,
  EMOTIONS,
  type CharacterSettings,
  type SceneSettings,
} from '../rig/types';

export type SceneProps = Partial<SceneSettings>;

/**
 * Merge user props over the defaults.
 *
 * v1 presets carried `environment`; v2 renamed it to `timeOfDay`. Both are
 * accepted, with `timeOfDay` winning when a caller supplies both.
 */
export function mergeSettings(props: SceneProps = {}): SceneSettings {
  const { environment, ...rest } = props;
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    timeOfDay: props.timeOfDay ?? environment ?? DEFAULT_SETTINGS.timeOfDay,
    colors: { ...DEFAULT_SETTINGS.colors, ...props.colors },
  };
}

/** Ground shadow, sized by how much of the body is in contact. */
function ContactShadow({ x, scale, moving, lift = 0 }: { x: number; scale: number; moving: boolean; lift?: number }) {
  const airborne = Math.max(0, -lift);
  const spread = (moving ? 52 : 44) * scale * (1 + airborne / 260);
  return (
    <ellipse
      cx={x}
      cy={GROUND_Y + 4}
      rx={spread}
      ry={8 * scale * Math.max(0.45, 1 - airborne / 200)}
      fill="#26352E"
      opacity={0.18 * Math.max(0.25, 1 - airborne / 170)}
    />
  );
}

/** Main reusable composition: character + scrolling environment. */
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
      <svg viewBox="0 0 1280 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <EnvironmentLayer
          scene={settings.scene}
          timeOfDay={settings.timeOfDay}
          distance={settings.followCamera ? worldDistance : 0}
          direction={settings.direction}
          parallax={settings.parallax}
          time={frame / fps}
        />
        <ContactShadow x={x} scale={settings.scale} moving={moving} lift={pose.lift} />
        {settings.guides && <path d={`M 0 ${GROUND_Y} H 1280`} stroke="#F26B38" strokeWidth={1.5} strokeDasharray="6 6" opacity={0.8} />}
        <g transform={`translate(${x} ${GROUND_Y}) scale(${settings.scale})`}>
          <CharacterRig settings={settings} frame={frame} fps={fps} showGuides={settings.guides} />
        </g>
        {settings.showSubtitles && settings.dialogue && (
          <Subtitle text={settings.dialogue} time={frame / fps} rate={settings.speechRate} seed={settings.seed} />
        )}
      </svg>
    </AbsoluteFill>
  );
}

/** Transparent character-only composition for PNG sequences / ProRes alpha. */
export function CharacterOnly(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <svg viewBox="0 0 720 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <g transform={`translate(360 650) scale(${settings.scale * 1.55})`}>
          <CharacterRig settings={settings} frame={frame} fps={fps} showGuides={settings.guides} />
        </g>
      </svg>
    </AbsoluteFill>
  );
}

export function StreetOnly(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const pose = samplePose(settings, frame, fps);
  return (
    <AbsoluteFill>
      <StreetLayer
        distance={pose.distance * settings.scale}
        direction={settings.direction}
        timeOfDay={settings.timeOfDay}
        parallax={settings.parallax}
        time={frame / fps}
      />
    </AbsoluteFill>
  );
}

/** Every expression, laid out to fit the frame regardless of set size. */
export function EmotionSheet(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const pose = samplePose({ ...settings, motion: 'idle' }, frame, fps);
  const n = EMOTIONS.length;
  const margin = 96;
  const slot = (WIDTH - margin * 2) / n;
  const faceScale = Math.min(1.55, (slot * 0.78) / 100);
  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F4EF' }}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <text x={margin} y={104} fontSize={44} fill="#26352E" fontFamily="Georgia, serif">A face for every moment.</text>
        <text x={margin} y={142} fontSize={20} fill="#6B7A70" fontFamily="system-ui, sans-serif">
          {getCharacter(settings.character).name} · {n} reusable expressions · deterministic blink
        </text>
        {EMOTIONS.map((e, i) => (
          <g key={e.id} transform={`translate(${margin + slot * (i + 0.5)} 380)`}>
            <circle cx={0} cy={-10} r={slot * 0.42} fill={i === 1 ? '#F6D78B' : '#E8ECE6'} />
            <g transform={`scale(${faceScale})`}>
              <CharacterHeadArt
                emotion={e.id}
                colors={settings.colors}
                glasses={settings.glasses}
                beard={settings.beard}
                freckles={settings.freckles}
                hair={settings.hair}
                blink={pose.blink}
              />
            </g>
            <text x={0} y={150} textAnchor="middle" fontSize={24} fill="#26352E" fontFamily="Georgia, serif">{e.label}</text>
            <text x={0} y={178} textAnchor="middle" fontSize={14} fill="#6B7A70" fontFamily="system-ui, sans-serif">{e.note}</text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
}

/**
 * The whole cast, side by side, walking in place. Each member keeps their own
 * build, palette, hair and outfit — this is the composition that proves the rig
 * is genuinely data-driven.
 */
export function CastScene(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const n = CAST.length;
  const margin = 110;
  const slot = (WIDTH - margin * 2) / n;
  return (
    <AbsoluteFill style={{ backgroundColor: '#BFE3E8' }}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <EnvironmentLayer
          scene={settings.scene}
          timeOfDay={settings.timeOfDay}
          distance={frame * 2.4}
          direction={1}
          parallax={settings.parallax}
          time={frame / fps}
        />
        {CAST.map((c, i) => {
          const cs: CharacterSettings = characterSettings(c.id, {
            motion: settings.motion === 'idle' ? 'idle' : 'walk',
            emotion: settings.emotion,
            direction: 1,
          });
          const scale = Math.min(cs.scale, 1.05);
          const x = margin + slot * (i + 0.5);
          return (
            <g key={c.id}>
              <ContactShadow x={x} scale={scale} moving />
              <g transform={`translate(${x} ${GROUND_Y}) scale(${scale})`}>
                <CharacterRig settings={cs} frame={frame} fps={fps} />
              </g>
              <text x={x} y={GROUND_Y + 52} textAnchor="middle" fontSize={22} fill="#26352E" fontFamily="Georgia, serif">{c.name}</text>
              <text x={x} y={GROUND_Y + 76} textAnchor="middle" fontSize={13} fill="#3E5A50" fontFamily="system-ui, sans-serif">{c.build}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

export interface DialogueSceneProps extends SceneProps {
  /** One line per turn, or an array of lines. Speakers alternate. */
  script?: string | string[];
  /** Cast ids for the two speakers. */
  speakers?: [string, string];
}

/** Burned-in subtitle, highlighted word by word from the same speech timing. */
function Subtitle({ text, time, rate, seed, y = 660 }: { text: string; time: number; rate: number; seed: number; y?: number }) {
  const speech = buildSpeech(text, rate, seed);
  if (time > speech.duration) return null;
  const cue = visemeAt(speech, time);
  return (
    <g>
      <rect x={WIDTH / 2 - 460} y={y - 34} width={920} height={54} rx={12} fill="#26352E" opacity={0.82} />
      <text x={WIDTH / 2} y={y} textAnchor="middle" fontSize={26} fill="#FFFDF6" fontFamily="system-ui, sans-serif">
        {text}
      </text>
      <rect x={WIDTH / 2 - 460} y={y + 16} width={920 * Math.min(1, time / Math.max(0.001, speech.duration))} height={3} rx={1.5} fill="#F6C65B" opacity={cue.id === 'rest' ? 0.4 : 0.95} />
    </g>
  );
}

/**
 * Two characters taking turns on a script. Turn timing comes from the same
 * deterministic lip-sync model that drives the mouths, so subtitles, mouths and
 * speaker changes can never drift apart.
 */
export function DialogueScene({ script, speakers = ['milo', 'ada'], ...rest }: DialogueSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(rest);
  const lines = splitTurns(script ?? [
    'Hey! Good to see you.',
    'Okay so — hear me out on this one.',
  ]);
  const t = frame / fps;

  // Accumulate turn start times from the speech model.
  let cursor = 0;
  const turns = lines.map((line, i) => {
    const speaker = speakers[i % speakers.length];
    const cs = characterSettings(speaker);
    const speech = buildSpeech(line, cs.speechRate, cs.seed);
    const start = cursor;
    cursor += speech.duration;
    return { line, speaker, cs, speech, start, end: cursor };
  });
  const activeIndex = turns.findIndex((turn) => t >= turn.start && t < turn.end);
  const active = activeIndex >= 0 ? turns[activeIndex] : null;

  return (
    <AbsoluteFill style={{ backgroundColor: '#BFE3E8' }}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <EnvironmentLayer scene={settings.scene} timeOfDay={settings.timeOfDay} distance={0} parallax={settings.parallax} time={t} />
        {turns.length > 0 && [0, 1].map((slot) => {
          const turn = turns.find((x) => speakers.indexOf(x.speaker) === slot) ?? turns[slot % turns.length];
          const speakerId = speakers[slot];
          const isActive = active?.speaker === speakerId;
          const cs: CharacterSettings = characterSettings(speakerId, {
            motion: isActive ? 'talk' : 'idle',
            emotion: isActive ? 'happy' : 'neutral',
            dialogue: isActive ? active!.line : '',
            direction: slot === 0 ? 1 : -1,
          });
          // Restart the speaking character's clock at the turn boundary so the
          // mouth aligns with the first syllable.
          const localFrame = isActive ? Math.round((t - active!.start) * fps) : frame;
          const scale = Math.min(cs.scale, 1.12);
          const x = slot === 0 ? 400 : 880;
          return (
            <g key={speakerId}>
              <ContactShadow x={x} scale={scale} moving={false} />
              <g transform={`translate(${x} ${GROUND_Y}) scale(${scale})`} opacity={isActive ? 1 : 0.94}>
                <CharacterRig settings={cs} frame={localFrame} fps={fps} />
              </g>
            </g>
          );
        })}
        {active && (
          <Subtitle text={active.line} time={t - active.start} rate={active.cs.speechRate} seed={active.cs.seed} />
        )}
      </svg>
    </AbsoluteFill>
  );
}
