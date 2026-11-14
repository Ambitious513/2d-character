/**
 * Built-in scene presets.
 *
 * Presets live here rather than in `types.ts` because they are composed from the
 * cast registry, and `cast.ts` already depends on `types.ts`. Keeping the
 * dependency one-directional avoids an import cycle.
 *
 * A preset is a complete, JSON-serialisable `SceneSettings`, so it can be used
 * directly as a Remotion `defaultProps`, saved to disk, or loaded in the studio.
 */

import { characterSettings, listCharacters } from './cast';
import { DEFAULT_SETTINGS, type SceneSettings } from './types';

export interface ScenePreset {
  id: string;
  name: string;
  note: string;
  settings: SceneSettings;
}

/** Wrap per-character settings into full scene settings. */
function scene(
  character: string,
  overrides: Partial<SceneSettings> = {},
): SceneSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...characterSettings(character, overrides),
    ...overrides,
    colors: {
      ...characterSettings(character).colors,
      ...(overrides.colors ?? {}),
    },
  };
}

export const PRESETS: ScenePreset[] = [
  {
    id: 'morning-stroll',
    name: 'Morning stroll',
    note: 'Milo · daylight sidewalk',
    settings: scene('milo', {
      motion: 'walk',
      emotion: 'happy',
      scene: 'street',
      timeOfDay: 'day',
    }),
  },
  {
    id: 'golden-hour',
    name: 'Golden hour',
    note: 'Kwame · warm backlight',
    settings: scene('kwame', {
      motion: 'walk',
      emotion: 'neutral',
      scene: 'street',
      timeOfDay: 'golden',
      parallax: 0.85,
    }),
  },
  {
    id: 'night-shift',
    name: 'Night shift',
    note: 'Ada · lit windows',
    settings: scene('ada', {
      motion: 'run',
      emotion: 'focused',
      scene: 'street',
      timeOfDay: 'night',
      speed: 1.1,
    }),
  },
  {
    id: 'say-hello',
    name: 'Say hello',
    note: 'Juno · waving, alpha-ready',
    settings: scene('juno', {
      motion: 'wave',
      emotion: 'excited',
      scene: 'backdrop',
      timeOfDay: 'day',
      followCamera: true,
    }),
  },
  {
    id: 'take-a-line',
    name: 'Take a line',
    note: 'Ravi · lip-synced dialogue',
    settings: scene('ravi', {
      motion: 'talk',
      emotion: 'focused',
      scene: 'backdrop',
      showSubtitles: true,
      dialogue: 'Hmm. Let me think about that for a second.',
    }),
  },
  {
    id: 'playtime',
    name: 'Playtime',
    note: 'Pip · jumping for joy',
    settings: scene('pip', {
      motion: 'jump',
      emotion: 'excited',
      scene: 'street',
      timeOfDay: 'day',
    }),
  },
];

/** One preset per cast member, useful for galleries and contact sheets. */
export function castPresets(): ScenePreset[] {
  return listCharacters().map((c) => ({
    id: `cast-${c.id}`,
    name: c.name,
    note: c.tagline,
    settings: scene(c.id),
  }));
}

export function getPreset(id: string): ScenePreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
