import { Composition, Folder } from 'remotion';
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
import { CastCompositions } from './factories';
import { DEFAULT_SETTINGS, type SceneSettings } from '../rig/types';
import { sceneSchema } from '../rig/schema';
import { dialogueDuration } from '../rig/dialogue';
import { FPS, DURATION, WIDTH, HEIGHT } from '../rig/gait';

/**
 * The Studio-editable schema now lives in `rig/schema.ts` so preset validation
 * and the props editor share one definition. Re-exported here because v2.0/v2.1
 * hosts imported it from this module.
 */
export { sceneSchema } from '../rig/schema';

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

      <Folder name="Cast">{CastCompositions()}</Folder>
    </>
  );
}
