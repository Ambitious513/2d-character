import { Composition, Folder } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';
import {
  WalkScene,
  CharacterOnly,
  SceneOnly,
  CastScene,
  CastSheet,
  MotionSheet,
  EmotionSheet,
  TalkingHead,
  DialogueScene,
  DEFAULT_SCRIPT,
} from './Compositions';
import { DEFAULT_SETTINGS, type SceneSettings } from '../rig/types';
import { castSceneSettings, listCharacters } from '../rig/cast';
import { dialogueDuration } from '../rig/dialogue';
import { FPS, DURATION, WIDTH, HEIGHT } from '../rig/gait';

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
  colors: z.object({
    skin: zColor(),
    hair: zColor(),
    jacket: zColor(),
    pants: zColor(),
    shoes: zColor(),
    accent: zColor(),
  }),
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
  timeOfDay: z.enum(['day', 'golden', 'night']),
  parallax: z.number().min(0).max(1),
  guides: z.boolean(),
  followCamera: z.boolean(),
  showSubtitles: z.boolean(),
});

const defaults: SceneSettings = DEFAULT_SETTINGS;

const dialogueFrames = dialogueDuration(DEFAULT_SCRIPT, { fps: FPS, gapFrames: 14 });

export function RemotionRoot() {
  return (
    <>
      <Folder name="Scenes">
        <Composition id="WalkScene" component={WalkScene} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={defaults} schema={sceneSchema} />
        <Composition id="DialogueScene" component={DialogueScene} durationInFrames={dialogueFrames} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ ...defaults, scene: 'backdrop', showSubtitles: true }} />
        <Composition id="CastScene" component={CastScene} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={defaults} />
        <Composition id="SceneOnly" component={SceneOnly} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={defaults} />
      </Folder>

      <Folder name="Character">
        <Composition id="CharacterOnly" component={CharacterOnly} durationInFrames={DURATION} fps={FPS} width={720} height={720} defaultProps={{ ...defaults, guides: false }} schema={sceneSchema} />
        <Composition id="TalkingHead" component={TalkingHead} durationInFrames={180} fps={FPS} width={720} height={720} defaultProps={{ ...defaults, motion: 'talk', dialogue: 'Hey! Good to see you.', showSubtitles: true, scene: 'backdrop' }} />
      </Folder>

      <Folder name="Sheets">
        <Composition id="CastSheet" component={CastSheet} durationInFrames={120} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={defaults} />
        <Composition id="MotionSheet" component={MotionSheet} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={defaults} />
        <Composition id="EmotionSheet" component={EmotionSheet} durationInFrames={180} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={defaults} />
      </Folder>

      <Folder name="Cast">
        {listCharacters().map((c) => (
          <Composition
            key={c.id}
            id={`Walk-${c.name}`}
            component={WalkScene}
            durationInFrames={DURATION}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
            defaultProps={castSceneSettings(c.id, { motion: 'walk', scene: 'street' })}
            schema={sceneSchema}
          />
        ))}
      </Folder>
    </>
  );
}
