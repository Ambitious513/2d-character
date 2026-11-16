/**
 * The settings schema — one source of truth for validation.
 *
 * `sceneSchema` drives the Remotion Studio props editor AND validates preset
 * files, so the editor and the loader can never disagree about what a valid
 * settings object is.
 *
 * It used to live in `remotion/Root.tsx`, which meant a host app could not
 * validate a preset without importing the whole composition root. It lives in
 * the rig now; `Root.tsx` re-exports it for backwards compatibility.
 */

import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const characterColorsSchema = z.object({
  skin: zColor(),
  hair: zColor(),
  jacket: zColor(),
  pants: zColor(),
  shoes: zColor(),
  accent: zColor(),
});

/** Fine-grained proportion overrides. Every field optional. */
export const proportionsSchema = z.object({
  thigh: z.number().positive(),
  shin: z.number().positive(),
  upperArm: z.number().positive(),
  foreArm: z.number().positive(),
  torsoLength: z.number().positive(),
  shoulderWidth: z.number().positive(),
  hipWidth: z.number().positive(),
  headScale: z.number().positive(),
  neckLength: z.number().positive(),
  legWidth: z.number().positive(),
  armWidth: z.number().positive(),
  footScale: z.number().positive(),
  handScale: z.number().positive(),
}).partial();

export const timeOfDaySchema = z.enum(['day', 'golden', 'night']);

export const weatherSchema = z.enum(['clear', 'rain', 'snow', 'fog']);

/**
 * Studio-editable schema. Every field maps 1:1 to `SceneSettings`, so the props
 * editor in Remotion Studio can drive the whole library without custom UI.
 */
export const sceneSchema = z.object({
  character: z.string(),
  motion: z.enum(['walk', 'run', 'idle', 'wave', 'talk', 'jump', 'sit', 'point', 'think', 'dance']),
  emotion: z.enum(['neutral', 'happy', 'focused', 'surprised', 'sad', 'angry', 'excited']),
  speed: z.number().min(0.25).max(2),
  stride: z.number().min(0.5).max(1.6),
  bounce: z.number().min(0).max(1.5),
  armSwing: z.number().min(0).max(1.5),
  scale: z.number().min(0.4).max(2.5),
  direction: z.union([z.literal(1), z.literal(-1)]),
  colors: characterColorsSchema,
  hair: z.enum(['curly', 'ponytail', 'fade', 'bob', 'bun', 'spiky', 'long', 'bald']),
  outfit: z.enum(['jacket', 'hoodie', 'dress', 'tee', 'coat', 'overalls']),
  build: z.enum(['slim', 'average', 'broad', 'petite', 'child']),
  backpack: z.boolean(),
  glasses: z.boolean(),
  cap: z.boolean(),
  scarf: z.boolean(),
  headphones: z.boolean(),
  beard: z.boolean(),
  freckles: z.boolean(),
  dialogue: z.string(),
  speechRate: z.number().min(0.5).max(2),
  seed: z.number(),
  scene: z.enum(['street', 'park', 'room', 'backdrop']),
  timeOfDay: timeOfDaySchema,
  weather: weatherSchema,
  parallax: z.number().min(0).max(1),
  guides: z.boolean(),
  followCamera: z.boolean(),
  showSubtitles: z.boolean(),
});

/**
 * Preset-file schema: everything optional, plus the two keys the Studio editor
 * does not expose (`proportions`) and the v1 spelling of the lighting pass
 * (`environment`). Missing fields are filled from the cast registry by
 * `parsePreset`, so a hand-written preset only needs the fields it cares about.
 */
export const presetSettingsSchema = sceneSchema
  .extend({
    proportions: proportionsSchema.optional(),
    /** @deprecated v1 name for `timeOfDay`. Migrated on load. */
    environment: timeOfDaySchema.optional(),
  })
  .partial();

export type SceneSchema = z.infer<typeof sceneSchema>;
export type PresetSettingsInput = z.infer<typeof presetSettingsSchema>;
