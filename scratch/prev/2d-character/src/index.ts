/**
 * Stride — public API.
 *
 * One import surface for the whole kit:
 *
 *   import { CharacterRig, WalkScene, castSceneSettings, PRESETS } from './src';
 *
 * Copy `src/rig` + `src/remotion` into your project (or publish this package)
 * and import from here rather than reaching into individual files, so internal
 * reorganisations do not break your code.
 *
 * The studio UI (`src/ui`, `src/App.tsx`) is deliberately NOT exported: it is an
 * app built on top of this library, not part of it.
 *
 * Note on `Environment`: the name belongs to the environment *component*. The
 * deprecated v1 *type* alias `Environment = TimeOfDay` is still available from
 * `./rig/types` for old imports, but is not re-exported here to avoid the clash.
 */

/* ------------------------------------------------------------------ */
/* Types, vocabularies and defaults                                    */
/* ------------------------------------------------------------------ */
export {
  DEFAULT_COLORS,
  DEFAULT_SETTINGS,
  EMOTIONS,
  MOTIONS,
  LOCOMOTION,
  isLocomotion,
  HAIR_STYLES,
  OUTFITS,
  BUILDS,
  SCENES,
  TIMES_OF_DAY,
} from './rig/types';
export type {
  Motion,
  Emotion,
  TimeOfDay,
  SceneId,
  HairStyle,
  Outfit,
  Build,
  ViewMode,
  CharacterColors,
  CharacterSettings,
  SceneSettings,
  Proportions,
} from './rig/types';

/* ------------------------------------------------------------------ */
/* Body model                                                          */
/* ------------------------------------------------------------------ */
export {
  BASE_PROPORTIONS,
  BUILD_PRESETS,
  resolveProportions,
  proportionsOf,
  skeletonOf,
} from './rig/definition';
export type { Skeleton } from './rig/definition';

/* ------------------------------------------------------------------ */
/* Cast registry                                                       */
/* ------------------------------------------------------------------ */
export {
  CAST,
  registerCharacter,
  listCharacters,
  getCharacter,
  hasCharacter,
  characterSettings,
  castSceneSettings,
} from './rig/cast';
export type { CharacterDefinition, AccessoryFlags } from './rig/cast';

/* ------------------------------------------------------------------ */
/* Character components                                                */
/* ------------------------------------------------------------------ */
export { CharacterRig, Character, CharacterHead, Face, INK } from './rig/Character';
export type { CharacterRigProps, CharacterHeadProps } from './rig/Character';
export { HairBack, HairFront } from './rig/parts/Hair';
export { Torso, OUTFIT_META } from './rig/parts/Outfit';
export type { OutfitMeta, SleeveLength } from './rig/parts/Outfit';
export { Backpack, BackpackStrap, Scarf, Cap, Headphones, Stool } from './rig/parts/Accessories';
export type { FaceProps } from './rig/parts/Face';

/* ------------------------------------------------------------------ */
/* Motion engine                                                       */
/* ------------------------------------------------------------------ */
export {
  samplePose,
  solveJoint,
  solveKnee,
  gaitParameters,
  plantedFootVelocity,
  motionLabel,
  clamp,
  FPS,
  DURATION,
  WIDTH,
  HEIGHT,
  GROUND_Y,
  CHARACTER_X,
  THIGH,
  SHIN,
} from './rig/gait';
export type { Point, FootPose, ArmPose, HandShape, RigPose } from './rig/gait';

/* ------------------------------------------------------------------ */
/* Speech                                                              */
/* ------------------------------------------------------------------ */
export {
  VISEMES,
  buildSpeech,
  visemeAt,
  mouthOpenness,
  speechDuration,
  speechFrames,
  splitTurns,
} from './rig/lipsync';
export type { VisemeId, VisemeCue, Speech } from './rig/lipsync';
export { dialogueSchedule, dialogueDuration, turnAt, wrapLines } from './rig/dialogue';
export type { DialogueTurn, ScheduleOptions } from './rig/dialogue';

/* ------------------------------------------------------------------ */
/* Environments                                                        */
/* ------------------------------------------------------------------ */
export {
  SceneLayer,
  Environment,
  registerScene,
  listScenes,
  getScene,
  StreetLayer,
  Street,
  ParkLayer,
  Park,
  RoomLayer,
  Room,
  BackdropLayer,
  Backdrop,
  PALETTES,
  paletteFor,
  resolveEnvironment,
} from './rig/environments';
export type {
  SceneRenderer,
  SceneLayerProps,
  EnvironmentLayerProps,
  Palette,
} from './rig/environments';
export type { ResolvedEnvironment } from './rig/environments/types';

/* ------------------------------------------------------------------ */
/* Presets, schema and validation                                      */
/* ------------------------------------------------------------------ */
export { PRESETS, DEFAULT_PRESET } from './rig/presets';
export type { ScenePreset } from './rig/presets';
export {
  PRESET_SCHEMA_VERSION,
  serializePreset,
  serializePresetJSON,
  parsePreset,
  parsePresetOrThrow,
} from './rig/preset';
export type { PresetFile, PresetMeta, PresetParseResult } from './rig/preset';
export {
  sceneSchema,
  characterColorsSchema,
  proportionsSchema,
  presetSettingsSchema,
  timeOfDaySchema,
} from './rig/schema';
export type { SceneSchema, PresetSettingsInput } from './rig/schema';

/* ------------------------------------------------------------------ */
/* Remotion compositions                                               */
/* ------------------------------------------------------------------ */
export {
  WalkScene,
  CharacterOnly,
  SceneOnly,
  StreetOnly,
  CastScene,
  CastSheet,
  MotionSheet,
  EmotionSheet,
  TalkingHead,
  DialogueScene,
  Subtitles,
  mergeSettings,
  DEFAULT_SCRIPT,
} from './remotion/Compositions';
export type { SceneProps, TalkingHeadProps, DialogueProps } from './remotion/Compositions';

export {
  SceneComposition,
  CharacterComposition,
  DialogueComposition,
  CastCompositions,
  resolveSceneComposition,
  resolveCharacterComposition,
  resolveDialogueComposition,
} from './remotion/factories';
export type {
  SceneCompositionOptions,
  CharacterCompositionOptions,
  DialogueCompositionOptions,
  CastCompositionsOptions,
  ResolvedComposition,
  ResolvedDialogueComposition,
} from './remotion/factories';

/** Ready-made root: every composition, foldered. `registerRoot(RemotionRoot)`. */
export { RemotionRoot } from './remotion/Root';

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */
export { shade } from './rig/color';
export { stableId } from './rig/id';

/** Library version, kept in step with package.json. */
export const VERSION = '2.2.0';
