import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CharacterRig, Face } from '../rig/Character';
import { StreetLayer } from '../rig/Street';
import { samplePose, GROUND_Y, CHARACTER_X, WIDTH } from '../rig/gait';
import { DEFAULT_SETTINGS, EMOTIONS, type SceneSettings } from '../rig/types';

export type SceneProps = Partial<SceneSettings>;

export function mergeSettings(props: SceneProps = {}): SceneSettings {
  return { ...DEFAULT_SETTINGS, ...props, colors: { ...DEFAULT_SETTINGS.colors, ...props.colors } };
}

/** Main reusable composition: character + scrolling street, frame-deterministic. */
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
        <StreetLayer distance={settings.followCamera ? worldDistance : 0} direction={settings.direction} environment={settings.environment} parallax={settings.parallax} time={frame / fps} />
        <ellipse cx={x} cy={GROUND_Y + 4} rx={(moving ? 52 : 44) * settings.scale} ry={8 * settings.scale} fill="#26352E" opacity={0.18} />
        {settings.guides && <path d={`M 0 ${GROUND_Y} H 1280`} stroke="#F26B38" strokeWidth={1.5} strokeDasharray="6 6" opacity={0.8} />}
        <g transform={`translate(${x} ${GROUND_Y}) scale(${settings.scale})`}>
          <CharacterRig settings={settings} frame={frame} fps={fps} showGuides={settings.guides} />
        </g>
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
      <StreetLayer distance={pose.distance * settings.scale} direction={settings.direction} environment={settings.environment} parallax={settings.parallax} time={frame / fps} />
    </AbsoluteFill>
  );
}

export function EmotionSheet(props: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settings = mergeSettings(props);
  const pose = samplePose({ ...settings, motion: 'idle' }, frame, fps);
  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F4EF', fontFamily: 'Georgia, serif' }}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <text x={80} y={100} fontSize={44} fill="#26352E">A face for every moment.</text>
        <text x={80} y={140} fontSize={20} fill="#6B7A70" fontFamily="system-ui, sans-serif">Milo · five reusable expressions · deterministic blink</text>
        {EMOTIONS.map((e, i) => (
          <g key={e.id} transform={`translate(${160 + i * 240} 360)`}>
            <circle cx={0} cy={-10} r={100} fill={i === 1 ? '#F6D78B' : '#E8ECE6'} />
            <g transform="scale(1.55)">
              <Face emotion={e.id} colors={settings.colors} glasses={settings.glasses} blink={pose.blink} />
            </g>
            <text x={0} y={150} textAnchor="middle" fontSize={26} fill="#26352E">{e.label}</text>
            <text x={0} y={180} textAnchor="middle" fontSize={15} fill="#6B7A70" fontFamily="system-ui, sans-serif">{e.note}</text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
}
