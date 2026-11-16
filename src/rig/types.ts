/**
 * Public type vocabulary for the Stride character kit.
 *
 * Everything a composition accepts lives here. All fields are plain JSON so a
 * settings object can be round-tripped through `defaultProps`, a preset file,
 * localStorage or the Remotion Studio props editor without loss.
 */

export type Motion =
  | 'walk'
  | 'run'
  | 'idle'
  | 'wave'
  | 'talk'
  | 'jump'
  | 'sit'
  | 'point'
  | 'think'
  | 'dance';

export type Emotion =
  | 'neutral'
  | 'happy'
  | 'focused'
  | 'surprised'
  | 'sad'
  | 'angry'
  | 'excited';

/** Lighting pass applied to any environment. */
export type TimeOfDay = 'day' | 'golden' | 'night';

/** Atmospheric overlay drawn over any scene. 'clear' renders nothing at all. */
export type Weather = 'clear' | 'rain' | 'snow' | 'fog';

/**
 * @deprecated v1 called the lighting pass `Environment`. Kept as an alias so
 * older imports (`import type { Environment } from './rig/types'`) still work.
 */
export type Environment = TimeOfDay;

/** Which environment is drawn behind the character. */
export type SceneId = 'street' | 'park' | 'room' | 'backdrop';

export type HairStyle =
  | 'curly'
  | 'ponytail'
  | 'fade'
  | 'bob'
  | 'bun'
  | 'spiky'
  | 'long'
  | 'bald';

export type Outfit = 'jacket' | 'hoodie' | 'dress' | 'tee' | 'coat' | 'overalls';

/** Coarse body preset; each one maps to a set of proportion overrides. */
export type Build = 'slim' | 'average' | 'broad' | 'petite' | 'child';

export type ViewMode = 'scene' | 'character' | 'cast' | 'motion' | 'reference';

export interface CharacterColors {
  skin: string;
  hair: string;
  /** Main garment colour — used by every outfit, not just the jacket. */
  jacket: string;
  pants: string;
  shoes: string;
  /** Trim / detail colour (zip pulls, stripes, dress belt, cap logo…). */
  accent: string;
}

/**
 * Per-character instance settings.
 *
 * `character` selects a cast member (see `cast.ts`) which supplies proportion
 * overrides and a default look. Every visual field below can still be
 * overridden per instance, so one cast member can be recoloured or re-dressed
 * without touching the registry.
 */
export interface CharacterSettings {
  /** Cast id, e.g. `milo`. Unknown ids fall back to the default cast member. */
  character: string;
  motion: Motion;
  emotion: Emotion;
  /** 0.25–2 speed multiplier (locomotion only). */
  speed: number;
  /** 0.5–1.6 stride-length multiplier (locomotion only). */
  stride: number;
  /** 0–1.5 vertical bounce / lift amount. */
  bounce: number;
  /** 0–1.5 arm-swing amplitude. */
  armSwing: number;
  /** Uniform scale applied to the whole rig. */
  scale: number;
  /** 1 faces right, -1 faces left. */
  direction: 1 | -1;
  colors: CharacterColors;
  hair: HairStyle;
  outfit: Outfit;
  build: Build;
  backpack: boolean;
  glasses: boolean;
  cap: boolean;
  scarf: boolean;
  headphones: boolean;
  beard: boolean;
  freckles: boolean;
  /** Line spoken when `motion === 'talk'`; drives deterministic lip-sync. */
  dialogue: string;
  /** 0.5–2 syllable rate multiplier for lip-sync. */
  speechRate: number;
  /** Deterministic per-instance variation (gait phase offset, idle drift). */
  seed: number;
  /** Optional fine-grained proportion overrides on top of `build`. */
  proportions?: Partial<Proportions>;
}

export interface SceneSettings extends CharacterSettings {
  scene: SceneId;
  timeOfDay: TimeOfDay;
  /** 0–1 parallax depth. 0 = flat background, 1 = full depth separation. */
  parallax: number;
  /** Atmospheric overlay. Defaults to 'clear', which draws nothing. */
  weather: Weather;
  /** Draw IK skeleton / ground guides. */
  guides: boolean;
  /** true = character held centre-frame and the world scrolls past. */
  followCamera: boolean;
  /** Burn subtitles into the frame when dialogue is present. */
  showSubtitles: boolean;
  /**
   * @deprecated Use `timeOfDay`. Still accepted and mapped by `mergeSettings`
   * so v1 presets keep working.
   */
  environment?: TimeOfDay;
}

/**
 * Shape of the skeleton, in rig units. The rig origin is the ground point
 * between the feet, +x is forward, -y is up.
 */
export interface Proportions {
  thigh: number;
  shin: number;
  upperArm: number;
  foreArm: number;
  /** Hip joint to shoulder joint. */
  torsoLength: number;
  /** Half-width of the shoulder line. */
  shoulderWidth: number;
  /** Half-width of the hip line. */
  hipWidth: number;
  /** Head art is authored at 1.0 and scaled by this. */
  headScale: number;
  /** Shoulder joint to head origin. */
  neckLength: number;
  legWidth: number;
  armWidth: number;
  footScale: number;
  handScale: number;
}

export const DEFAULT_COLORS: CharacterColors = {
  skin: '#B87952',
  hair: '#26352E',
  jacket: '#F26B38',
  pants: '#2D5B52',
  shoes: '#F5F0E4',
  accent: '#F6C65B',
};

export const DEFAULT_SETTINGS: SceneSettings = {
  character: 'milo',
  motion: 'walk',
  emotion: 'happy',
  speed: 1,
  stride: 1,
  bounce: 0.65,
  armSwing: 0.8,
  scale: 1.18,
  direction: 1,
  colors: { ...DEFAULT_COLORS },
  hair: 'curly',
  outfit: 'jacket',
  build: 'average',
  backpack: true,
  glasses: false,
  cap: false,
  scarf: false,
  headphones: false,
  beard: false,
  freckles: false,
  dialogue: '',
  speechRate: 1,
  seed: 0,
  scene: 'street',
  timeOfDay: 'day',
  parallax: 0.7,
  weather: 'clear',
  guides: false,
  followCamera: true,
  showSubtitles: false,
};

export const EMOTIONS: { id: Emotion; label: string; note: string }[] = [
  { id: 'neutral', label: 'Neutral', note: 'Easy & unbothered' },
  { id: 'happy', label: 'Happy', note: 'A little extra joy' },
  { id: 'focused', label: 'Focused', note: 'On a mission' },
  { id: 'surprised', label: 'Surprised', note: 'Oh, hello there!' },
  { id: 'sad', label: 'Sad', note: 'A slower kind of day' },
  { id: 'angry', label: 'Angry', note: 'Not having it' },
  { id: 'excited', label: 'Excited', note: 'Cannot sit still' },
];

export const MOTIONS: { id: Motion; label: string; note: string }[] = [
  { id: 'walk', label: 'Walk', note: 'Grounded IK walk cycle' },
  { id: 'run', label: 'Run', note: 'Longer stride, flight phase' },
  { id: 'idle', label: 'Idle', note: 'Breathing stand' },
  { id: 'wave', label: 'Wave', note: 'Friendly hello' },
  { id: 'talk', label: 'Talk', note: 'Lip-synced from dialogue' },
  { id: 'jump', label: 'Jump', note: 'Crouch, launch, land' },
  { id: 'sit', label: 'Sit', note: 'Seated on a stool' },
  { id: 'point', label: 'Point', note: 'Directing attention' },
  { id: 'think', label: 'Think', note: 'Hand on chin' },
  { id: 'dance', label: 'Dance', note: 'Loose rhythmic groove' },
];

/** Motions that translate the character through the world. */
export const LOCOMOTION: readonly Motion[] = ['walk', 'run'];

export const isLocomotion = (m: Motion): boolean =>
  m === 'walk' || m === 'run';

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'curly', label: 'Curly' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'fade', label: 'Fade' },
  { id: 'bob', label: 'Bob' },
  { id: 'bun', label: 'Bun' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'long', label: 'Long' },
  { id: 'bald', label: 'Bald' },
];

export const OUTFITS: { id: Outfit; label: string }[] = [
  { id: 'jacket', label: 'Jacket' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'dress', label: 'Dress' },
  { id: 'tee', label: 'Tee' },
  { id: 'coat', label: 'Coat' },
  { id: 'overalls', label: 'Overalls' },
];

export const BUILDS: { id: Build; label: string }[] = [
  { id: 'slim', label: 'Slim' },
  { id: 'average', label: 'Average' },
  { id: 'broad', label: 'Broad' },
  { id: 'petite', label: 'Petite' },
  { id: 'child', label: 'Child' },
];

export const SCENES: { id: SceneId; label: string; note: string }[] = [
  { id: 'street', label: 'Street', note: 'Shops, sidewalk, lamps' },
  { id: 'park', label: 'Park', note: 'Trees, pond, hills' },
  { id: 'room', label: 'Room', note: 'Interior with window' },
  { id: 'backdrop', label: 'Backdrop', note: 'Clean studio cyclorama' },
];

export const TIMES_OF_DAY: { id: TimeOfDay; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'golden', label: 'Golden' },
  { id: 'night', label: 'Night' },
];

export const WEATHERS: { id: Weather; label: string; note: string }[] = [
  { id: 'clear', label: 'Clear', note: 'No overlay — byte-identical to v2.2.0' },
  { id: 'rain', label: 'Rain', note: 'Slanted streaks, splashes, wet sheen' },
  { id: 'snow', label: 'Snow', note: 'Swaying flakes, ground accumulation' },
  { id: 'fog', label: 'Fog', note: 'Drifting banded haze, veils the character' },
];
