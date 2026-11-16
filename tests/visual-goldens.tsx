/**
 * Visual-regression snapshot definitions.
 *
 * The rig is byte-deterministic, so a static markup render is a perfect
 * snapshot: no browser, no WebGL, no RAM ceiling. `tests/visual.test.tsx`
 * asserts the current render against the SHA-256 hashes in
 * `tests/__golden__/visual-hashes.json`; `scripts/update-visual-goldens.ts`
 * regenerates that file after an *intentional* visual change.
 *
 * The matrix lives here — not in the test and not in the generator — so the
 * two can never drift apart. Rendering with `renderToStaticMarkup` also keeps
 * the snapshots honest: whatever a host gets from the same props at the same
 * frame is what gets hashed.
 */
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterRig } from '../src/rig/Character';
import { SceneLayer } from '../src/rig/environments';
import { CAST, castSceneSettings } from '../src/rig/cast';
import { SCENES, TIMES_OF_DAY } from '../src/rig/types';
import type { Emotion, Motion, SceneId, TimeOfDay, Weather } from '../src/rig/types';

/** Bump when the snapshot format itself changes (not for visual changes). */
export const VISUAL_GOLDEN_VERSION = 1;

/** Fixed evaluation point. Changing this requires regenerating the goldens. */
export const VISUAL_FRAME = 60;
export const VISUAL_FPS = 30;

export const CHARACTER_MOTIONS: readonly Motion[] = ['idle', 'walk', 'run'];
export const CHARACTER_EMOTIONS: readonly Emotion[] = ['neutral', 'happy'];

/** Fixed environment inputs, so a golden captures parallax and ambient drift too. */
export const SCENE_PRESETS = {
  distance: 320,
  direction: 1 as const,
  parallax: 0.7,
  time: 2,
} as const;

const CHARACTER_VIEW_BOX = '-160 -470 320 490';
const SCENE_VIEW_BOX = '0 0 1280 720';

export const GOLDEN_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '__golden__',
  'visual-hashes.json',
);

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Render one rig inside a real `<svg>` root, exactly as a host would. */
export function renderCharacterRig(id: string, motion: Motion, emotion: Emotion): string {
  const settings = castSceneSettings(id, { motion, emotion });
  return renderToStaticMarkup(
    <svg viewBox={CHARACTER_VIEW_BOX} xmlns="http://www.w3.org/2000/svg">
      <CharacterRig settings={settings} frame={VISUAL_FRAME} fps={VISUAL_FPS} />
    </svg>,
  );
}

/** Weathers that draw an overlay — the scene golden cross (spec §5.5). */
export const GOLDEN_WEATHERS: readonly Weather[] = ['rain', 'snow', 'fog'];

/** Render one environment plate inside a real `<svg>` root. */
export function renderSceneLayer(id: SceneId, timeOfDay: TimeOfDay, weather: Weather = 'clear'): string {
  return renderToStaticMarkup(
    <svg viewBox={SCENE_VIEW_BOX} xmlns="http://www.w3.org/2000/svg">
      <SceneLayer scene={id} timeOfDay={timeOfDay} weather={weather} {...SCENE_PRESETS} />
    </svg>,
  );
}

export interface VisualGoldenMeta {
  version: number;
  frame: number;
  fps: number;
  characterViewBox: string;
  sceneViewBox: string;
  scene: typeof SCENE_PRESETS;
  motions: readonly Motion[];
  emotions: readonly Emotion[];
}

export function goldenMeta(): VisualGoldenMeta {
  return {
    version: VISUAL_GOLDEN_VERSION,
    frame: VISUAL_FRAME,
    fps: VISUAL_FPS,
    characterViewBox: CHARACTER_VIEW_BOX,
    sceneViewBox: SCENE_VIEW_BOX,
    scene: SCENE_PRESETS,
    motions: CHARACTER_MOTIONS,
    emotions: CHARACTER_EMOTIONS,
  };
}

/**
 * Every snapshot in the matrix, keyed for readable diffs:
 * `rig:milo:walk:happy` and `scene:street:golden`.
 */
export function buildGoldenEntries(): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const c of CAST) {
    for (const motion of CHARACTER_MOTIONS) {
      for (const emotion of CHARACTER_EMOTIONS) {
        entries[`rig:${c.id}:${motion}:${emotion}`] = sha256(renderCharacterRig(c.id, motion, emotion));
      }
    }
  }
  for (const scene of SCENES) {
    for (const timeOfDay of TIMES_OF_DAY) {
      entries[`scene:${scene.id}:${timeOfDay.id}`] = sha256(renderSceneLayer(scene.id, timeOfDay.id));
      for (const weather of GOLDEN_WEATHERS) {
        entries[`scene:${scene.id}:${timeOfDay.id}:${weather}`] = sha256(renderSceneLayer(scene.id, timeOfDay.id, weather));
      }
    }
  }
  return entries;
}

export const GOLDEN_ENTRY_COUNT =
  CAST.length * CHARACTER_MOTIONS.length * CHARACTER_EMOTIONS.length +
  SCENES.length * TIMES_OF_DAY.length * (1 + GOLDEN_WEATHERS.length);
