export type Motion = 'walk' | 'run' | 'idle' | 'wave';
export type Emotion = 'neutral' | 'happy' | 'focused' | 'surprised' | 'sad';
export type Environment = 'day' | 'golden' | 'night';
export type ViewMode = 'scene' | 'character' | 'reference';

export interface CharacterColors {
  skin: string;
  hair: string;
  jacket: string;
  pants: string;
  shoes: string;
}

export interface CharacterSettings {
  motion: Motion;
  emotion: Emotion;
  speed: number;
  stride: number;
  bounce: number;
  armSwing: number;
  scale: number;
  direction: 1 | -1;
  colors: CharacterColors;
  backpack: boolean;
  glasses: boolean;
}

export interface SceneSettings extends CharacterSettings {
  environment: Environment;
  parallax: number;
  guides: boolean;
  followCamera: boolean;
}

export const DEFAULT_SETTINGS: SceneSettings = {
  motion: 'walk',
  emotion: 'happy',
  speed: 1,
  stride: 1,
  bounce: 0.65,
  armSwing: 0.8,
  scale: 1.18,
  direction: 1,
  colors: {
    skin: '#B87952',
    hair: '#26352E',
    jacket: '#F26B38',
    pants: '#2D5B52',
    shoes: '#F5F0E4',
  },
  backpack: true,
  glasses: false,
  environment: 'day',
  parallax: 0.7,
  guides: false,
  followCamera: true,
};

export const EMOTIONS: { id: Emotion; label: string; note: string }[] = [
  { id: 'neutral', label: 'Neutral', note: 'Easy & unbothered' },
  { id: 'happy', label: 'Happy', note: 'A little extra joy' },
  { id: 'focused', label: 'Focused', note: 'On a mission' },
  { id: 'surprised', label: 'Surprised', note: 'Oh, hello there!' },
  { id: 'sad', label: 'Sad', note: 'A slower kind of day' },
];

export const MOTIONS: { id: Motion; label: string }[] = [
  { id: 'walk', label: 'Walk' },
  { id: 'run', label: 'Run' },
  { id: 'idle', label: 'Idle' },
  { id: 'wave', label: 'Wave' },
];

export const PRESETS: { name: string; settings: SceneSettings }[] = [
  { name: 'Morning stroll', settings: { ...DEFAULT_SETTINGS } },
  {
    name: 'Golden hour',
    settings: { ...DEFAULT_SETTINGS, environment: 'golden', speed: 0.8, emotion: 'neutral', colors: { ...DEFAULT_SETTINGS.colors, jacket: '#E9B44C' } },
  },
  {
    name: 'Night runner',
    settings: { ...DEFAULT_SETTINGS, environment: 'night', motion: 'run', speed: 1.25, emotion: 'focused', backpack: false, colors: { ...DEFAULT_SETTINGS.colors, jacket: '#7FB6D9' } },
  },
];
