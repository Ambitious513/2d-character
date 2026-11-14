/**
 * Typed composition factories.
 *
 * Registering a Stride composition by hand means repeating the same six fields
 * and remembering to attach the schema. These factories do it for you, with
 * cast-aware defaults and — for dialogue — a duration derived from the script,
 * so the video is always exactly as long as the conversation.
 *
 *   export const MyRoot = () => (
 *     <>
 *       <SceneComposition id="Hero" character="ada" overrides={{ motion: 'run' }} />
 *       <CharacterComposition id="HeroAlpha" character="ada" />
 *       <DialogueComposition id="Chat" speakers={['milo', 'ada']} script={[...]} />
 *       {CastCompositions()}
 *     </>
 *   );
 *
 * Every factory has a matching `resolve*` function that returns plain data
 * (props + timing) with no React involved, so hosts can build their own
 * `<Composition>` — and so the timing maths is unit-testable.
 */

import { Composition } from 'remotion';
import type { ReactElement } from 'react';
import {
  WalkScene,
  CharacterOnly,
  DialogueScene,
  DEFAULT_SCRIPT,
  type DialogueProps,
} from './Compositions';
import { sceneSchema } from '../rig/schema';
import { castSceneSettings, listCharacters } from '../rig/cast';
import { dialogueDuration } from '../rig/dialogue';
import { FPS, DURATION, WIDTH, HEIGHT } from '../rig/gait';
import type { SceneSettings } from '../rig/types';

/* ------------------------------------------------------------------ */
/* Options + resolved data                                             */
/* ------------------------------------------------------------------ */

export interface SceneCompositionOptions {
  /** Remotion composition id. Must be unique and URL-safe. */
  id: string;
  /** Cast id. Defaults to `milo`. */
  character?: string;
  fps?: number;
  durationInFrames?: number;
  width?: number;
  height?: number;
  /** Any settings overrides; these win over the cast member's defaults. */
  overrides?: Partial<SceneSettings>;
}

export interface ResolvedComposition {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  defaultProps: SceneSettings;
}

/** Cast-aware defaults + frame geometry, as plain data. */
export function resolveSceneComposition(options: SceneCompositionOptions): ResolvedComposition {
  const overrides = options.overrides ?? {};
  const character = overrides.character ?? options.character ?? 'milo';
  return {
    fps: options.fps ?? FPS,
    width: options.width ?? WIDTH,
    height: options.height ?? HEIGHT,
    durationInFrames: options.durationInFrames ?? DURATION,
    defaultProps: castSceneSettings(character, overrides),
  };
}

export interface CharacterCompositionOptions extends SceneCompositionOptions {
  /** Square by default; override both to change the alpha plate size. */
  size?: number;
}

/** Transparent, square character plate — the alpha-export workhorse. */
export function resolveCharacterComposition(
  options: CharacterCompositionOptions,
): ResolvedComposition {
  const size = options.size ?? 720;
  const base = resolveSceneComposition({
    ...options,
    width: options.width ?? size,
    height: options.height ?? size,
  });
  return { ...base, defaultProps: { ...base.defaultProps, guides: false } };
}

export interface DialogueCompositionOptions
  extends Omit<SceneCompositionOptions, 'durationInFrames'> {
  /** Two cast ids: `[left, right]`. */
  speakers?: [string, string];
  /** One line per turn, alternating speakers. */
  script?: string | string[];
  /** Silence between turns, frames. */
  gapFrames?: number;
  /** Override the derived length if you want padding. */
  durationInFrames?: number;
}

export interface ResolvedDialogueComposition extends ResolvedComposition {
  defaultProps: SceneSettings & DialogueProps;
}

/**
 * Dialogue timing is derived from the text itself, so the composition can never
 * cut a line off mid-word. `speechRate` is honoured because it changes how long
 * each line takes to speak.
 */
export function resolveDialogueComposition(
  options: DialogueCompositionOptions,
): ResolvedDialogueComposition {
  const fps = options.fps ?? FPS;
  const gapFrames = options.gapFrames ?? 14;
  const script = options.script ?? DEFAULT_SCRIPT;
  const speakers = options.speakers ?? (['milo', 'ada'] as [string, string]);
  const base = resolveSceneComposition({
    ...options,
    character: options.character ?? speakers[0],
    fps,
    overrides: { scene: 'backdrop', showSubtitles: true, ...(options.overrides ?? {}) },
  });
  const durationInFrames =
    options.durationInFrames ??
    dialogueDuration(script, {
      fps,
      gapFrames,
      speechRate: base.defaultProps.speechRate,
    });
  return {
    ...base,
    durationInFrames,
    defaultProps: { ...base.defaultProps, speakers, script, gapFrames },
  };
}

/* ------------------------------------------------------------------ */
/* Components — drop these straight into a Remotion root                */
/* ------------------------------------------------------------------ */

/** Character + world, scrolling at the speed the feet are planted at. */
export function SceneComposition(options: SceneCompositionOptions): ReactElement {
  const { id, ...config } = { id: options.id, ...resolveSceneComposition(options) };
  return <Composition id={id} component={WalkScene} schema={sceneSchema} {...config} />;
}

/** Transparent character only, for PNG sequences / ProRes 4444 / alpha WebM. */
export function CharacterComposition(options: CharacterCompositionOptions): ReactElement {
  const { id, ...config } = { id: options.id, ...resolveCharacterComposition(options) };
  return <Composition id={id} component={CharacterOnly} schema={sceneSchema} {...config} />;
}

/** Two characters talking; length derived from the script. */
export function DialogueComposition(options: DialogueCompositionOptions): ReactElement {
  const resolved = resolveDialogueComposition(options);
  return (
    <Composition
      id={options.id}
      component={DialogueScene}
      fps={resolved.fps}
      width={resolved.width}
      height={resolved.height}
      durationInFrames={resolved.durationInFrames}
      defaultProps={resolved.defaultProps}
    />
  );
}

export interface CastCompositionsOptions
  extends Omit<SceneCompositionOptions, 'id' | 'character'> {
  /** Prepended to each cast member's name. Defaults to `Walk-`. */
  prefix?: string;
}

/**
 * One composition per registered cast member. Call `registerCharacter()` before
 * your root renders and new members appear here automatically.
 */
export function CastCompositions(options: CastCompositionsOptions = {}): ReactElement[] {
  const { prefix = 'Walk-', ...rest } = options;
  return listCharacters().map((c) => (
    <SceneComposition
      key={c.id}
      id={`${prefix}${c.name}`}
      character={c.id}
      {...rest}
      overrides={{ motion: 'walk', scene: 'street', ...(rest.overrides ?? {}) }}
    />
  ));
}
