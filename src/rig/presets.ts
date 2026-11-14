/**
 * Seeded looks. Each preset is a full `SceneSettings` object, so it can be
 * dropped straight into `defaultProps`, saved as JSON, or loaded in the studio.
 *
 * Presets are derived from the cast registry: change a cast member and every
 * preset that uses them follows.
 */

import { castSceneSettings } from './cast';
import type { SceneSettings } from './types';

export interface ScenePreset {
  name: string;
  note: string;
  settings: SceneSettings;
}

export const PRESETS: ScenePreset[] = [
  {
    name: 'Morning stroll',
    note: 'Milo · street · day',
    settings: castSceneSettings('milo', {
      motion: 'walk',
      emotion: 'happy',
      scene: 'street',
      timeOfDay: 'day',
      followCamera: true,
    }),
  },
  {
    name: 'Golden hour run',
    note: 'Ada · street · golden',
    settings: castSceneSettings('ada', {
      motion: 'run',
      emotion: 'focused',
      scene: 'street',
      timeOfDay: 'golden',
      speed: 1.2,
      bounce: 0.9,
      armSwing: 1.1,
    }),
  },
  {
    name: 'Night shift',
    note: 'Kwame · street · night',
    settings: castSceneSettings('kwame', {
      motion: 'walk',
      emotion: 'neutral',
      scene: 'street',
      timeOfDay: 'night',
      speed: 0.8,
      parallax: 0.85,
    }),
  },
  {
    name: 'Park loop',
    note: 'Juno · park · day',
    settings: castSceneSettings('juno', {
      motion: 'walk',
      emotion: 'excited',
      scene: 'park',
      timeOfDay: 'day',
      speed: 1.15,
    }),
  },
  {
    name: 'Studio interview',
    note: 'Ravi · backdrop · talking',
    settings: castSceneSettings('ravi', {
      motion: 'talk',
      emotion: 'focused',
      scene: 'backdrop',
      timeOfDay: 'day',
      dialogue: 'Here is the thing about good animation: it is all in the timing.',
      showSubtitles: true,
      parallax: 0.2,
    }),
  },
  {
    name: 'Living room sit',
    note: 'Milo · room · golden',
    settings: castSceneSettings('milo', {
      motion: 'sit',
      emotion: 'happy',
      scene: 'room',
      timeOfDay: 'golden',
      parallax: 0.35,
      backpack: false,
    }),
  },
  {
    name: 'Pip pops up',
    note: 'Pip · park · jump',
    settings: castSceneSettings('pip', {
      motion: 'jump',
      emotion: 'excited',
      scene: 'park',
      timeOfDay: 'day',
      bounce: 1.15,
    }),
  },
  {
    name: 'Night wave',
    note: 'Ada · street · night wave',
    settings: castSceneSettings('ada', {
      motion: 'wave',
      emotion: 'happy',
      scene: 'street',
      timeOfDay: 'night',
      glasses: true,
    }),
  },
];

export const DEFAULT_PRESET = PRESETS[0];
