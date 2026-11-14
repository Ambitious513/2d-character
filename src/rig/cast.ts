/**
 * The cast registry.
 *
 * A `CharacterDefinition` is pure data: pick a build, a hair style, an outfit,
 * a palette and a few accessory flags. Add an entry here and the character
 * immediately appears in the studio, in `CastSheet`, and in every composition
 * that takes a `character` prop. No new SVG required.
 *
 * To add your own character, append to `CAST` (or call `registerCharacter`).
 */

import {
  DEFAULT_COLORS,
  DEFAULT_SETTINGS,
  type SceneSettings,
  type CharacterColors,
  type CharacterSettings,
  type Emotion,
  type HairStyle,
  type Motion,
  type Outfit,
  type Build,
  type Proportions,
} from './types';

export interface AccessoryFlags {
  backpack?: boolean;
  glasses?: boolean;
  cap?: boolean;
  scarf?: boolean;
  headphones?: boolean;
  beard?: boolean;
  freckles?: boolean;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  tagline: string;
  build: Build;
  /** Fine tuning on top of the build preset. */
  proportions?: Partial<Proportions>;
  hair: HairStyle;
  outfit: Outfit;
  colors: CharacterColors;
  accessories?: AccessoryFlags;
  /** Suggested performance defaults when this character is selected. */
  performance?: {
    motion?: Motion;
    emotion?: Emotion;
    speed?: number;
    stride?: number;
    bounce?: number;
    armSwing?: number;
    scale?: number;
    seed?: number;
    dialogue?: string;
  };
}

const colors = (over: Partial<CharacterColors>): CharacterColors => ({
  ...DEFAULT_COLORS,
  ...over,
});

export const CAST: CharacterDefinition[] = [
  {
    id: 'milo',
    name: 'Milo',
    tagline: 'The original — easygoing, always mid-stroll.',
    build: 'average',
    hair: 'curly',
    outfit: 'jacket',
    colors: colors({
      skin: '#B87952',
      hair: '#26352E',
      jacket: '#F26B38',
      pants: '#2D5B52',
      shoes: '#F5F0E4',
      accent: '#F6C65B',
    }),
    accessories: { backpack: true },
    performance: {
      motion: 'walk',
      emotion: 'happy',
      scale: 1.18,
      dialogue: 'Hey! Good to see you.',
    },
  },
  {
    id: 'ada',
    name: 'Ada',
    tagline: 'Fast talker, faster walker. Lives in a hoodie.',
    build: 'slim',
    hair: 'ponytail',
    outfit: 'hoodie',
    colors: colors({
      skin: '#E0AC8B',
      hair: '#8A4B2A',
      jacket: '#365DE6',
      pants: '#233C59',
      shoes: '#FFFDF6',
      accent: '#7FB6D9',
    }),
    accessories: { glasses: true },
    performance: {
      motion: 'walk',
      emotion: 'focused',
      speed: 1.15,
      scale: 1.16,
      seed: 11,
      dialogue: 'Okay so — hear me out on this one.',
    },
  },
  {
    id: 'kwame',
    name: 'Kwame',
    tagline: 'Broad shoulders, warm laugh, unhurried.',
    build: 'broad',
    hair: 'fade',
    outfit: 'coat',
    colors: colors({
      skin: '#6B4226',
      hair: '#1E1E24',
      jacket: '#4E7A55',
      pants: '#3E4C55',
      shoes: '#D9CFA8',
      accent: '#E9B44C',
    }),
    accessories: { beard: true },
    performance: {
      motion: 'walk',
      emotion: 'neutral',
      speed: 0.85,
      stride: 1.1,
      scale: 1.2,
      seed: 23,
      dialogue: 'Take your time. We have plenty of it.',
    },
  },
  {
    id: 'juno',
    name: 'Juno',
    tagline: 'Small, quick, permanently delighted.',
    build: 'petite',
    hair: 'bob',
    outfit: 'dress',
    colors: colors({
      skin: '#F0C9A8',
      hair: '#2B2B33',
      jacket: '#D9552F',
      pants: '#6B5147',
      shoes: '#26352E',
      accent: '#F6D78B',
    }),
    accessories: { freckles: true },
    performance: {
      motion: 'walk',
      emotion: 'excited',
      speed: 1.25,
      stride: 0.9,
      bounce: 0.85,
      scale: 1.22,
      seed: 37,
      dialogue: 'Wait, wait — look at this!',
    },
  },
  {
    id: 'ravi',
    name: 'Ravi',
    tagline: 'Thinks before he speaks. Then speaks a lot.',
    build: 'average',
    proportions: { torsoLength: 90, shoulderWidth: 34 },
    hair: 'bun',
    outfit: 'tee',
    colors: colors({
      skin: '#A9713F',
      hair: '#241C16',
      jacket: '#E9B44C',
      pants: '#5A4632',
      shoes: '#8C9B90',
      accent: '#4E7A55',
    }),
    accessories: { beard: true, glasses: true },
    performance: {
      motion: 'think',
      emotion: 'focused',
      scale: 1.18,
      seed: 53,
      dialogue: 'Hmm. Let me think about that for a second.',
    },
  },
  {
    id: 'pip',
    name: 'Pip',
    tagline: 'Half the height, twice the energy.',
    build: 'child',
    hair: 'spiky',
    outfit: 'overalls',
    colors: colors({
      skin: '#D9A066',
      hair: '#5A3A22',
      jacket: '#F6C65B',
      pants: '#365DE6',
      shoes: '#F26B38',
      accent: '#FFFDF6',
    }),
    accessories: { freckles: true },
    performance: {
      motion: 'jump',
      emotion: 'excited',
      bounce: 1.1,
      scale: 1.3,
      seed: 71,
      dialogue: 'Can I go again? Please?',
    },
  },
];

/** Mutable registry so host apps can add characters at runtime. */
const registry = new Map<string, CharacterDefinition>(
  CAST.map((c) => [c.id, c]),
);

export function registerCharacter(def: CharacterDefinition): void {
  registry.set(def.id, def);
}

export function listCharacters(): CharacterDefinition[] {
  return [...registry.values()];
}

export function getCharacter(id: string): CharacterDefinition {
  return registry.get(id) ?? registry.get('milo') ?? CAST[0];
}

export function hasCharacter(id: string): boolean {
  return registry.has(id);
}

/**
 * Build a full settings object for a cast member, keeping any overrides the
 * caller already chose. Fields the user explicitly set always win.
 */
export function characterSettings(
  id: string,
  overrides: Partial<CharacterSettings> = {},
): CharacterSettings {
  const def = getCharacter(id);
  const a = def.accessories ?? {};
  const p = def.performance ?? {};
  return {
    character: def.id,
    motion: p.motion ?? 'idle',
    emotion: p.emotion ?? 'neutral',
    speed: p.speed ?? 1,
    stride: p.stride ?? 1,
    bounce: p.bounce ?? 0.65,
    armSwing: p.armSwing ?? 0.8,
    scale: p.scale ?? 1.18,
    direction: 1,
    hair: def.hair,
    outfit: def.outfit,
    build: def.build,
    backpack: a.backpack ?? false,
    glasses: a.glasses ?? false,
    cap: a.cap ?? false,
    scarf: a.scarf ?? false,
    headphones: a.headphones ?? false,
    beard: a.beard ?? false,
    freckles: a.freckles ?? false,
    dialogue: p.dialogue ?? '',
    speechRate: 1,
    seed: p.seed ?? 0,
    proportions: def.proportions,
    ...overrides,
    // Palette is merged key-by-key so a partial `colors` override keeps the
    // rest of the cast member's look instead of falling back to defaults.
    colors: { ...def.colors, ...(overrides.colors ?? {}) },
  };
}

/**
 * Scene-level settings for a cast member: `characterSettings` plus the
 * environment defaults. Handy for `defaultProps` in a composition.
 */
export function castSceneSettings(
  id: string,
  overrides: Partial<SceneSettings> = {},
): SceneSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...characterSettings(id, overrides),
    ...overrides,
    colors: { ...getCharacter(id).colors, ...(overrides.colors ?? {}) },
  };
}
