import { Composition } from 'remotion';
import {
  WalkScene,
  CharacterOnly,
  StreetOnly,
  EmotionSheet,
  CastScene,
  DialogueScene,
} from './Compositions';
import { DEFAULT_SETTINGS } from '../rig/types';
import { PRESETS } from '../rig/presets';
import { FPS, DURATION, WIDTH, HEIGHT } from '../rig/gait';

/**
 * Every composition the kit ships. Ids here are the names you pass to
 * `remotion render` / `remotion still`, and they match the npm scripts.
 */
export function RemotionRoot() {
  return (
    <>
      <Composition id="WalkScene" component={WalkScene} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={DEFAULT_SETTINGS} />
      <Composition id="CharacterOnly" component={CharacterOnly} durationInFrames={DURATION} fps={FPS} width={720} height={720} defaultProps={{ ...DEFAULT_SETTINGS, guides: false }} />
      <Composition id="StreetOnly" component={StreetOnly} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={DEFAULT_SETTINGS} />
      <Composition id="EmotionSheet" component={EmotionSheet} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={DEFAULT_SETTINGS} />
      <Composition id="CastScene" component={CastScene} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ ...DEFAULT_SETTINGS, scene: 'backdrop' }} />
      <Composition
        id="DialogueScene"
        component={DialogueScene}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          ...DEFAULT_SETTINGS,
          scene: 'backdrop',
          script: ['Hey! Good to see you.', 'Okay so — hear me out on this one.'],
          speakers: ['milo', 'ada'] as [string, string],
        }}
      />
      <Composition id="GoldenHour" component={WalkScene} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={PRESETS[1].settings} />
      <Composition id="NightShift" component={WalkScene} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={PRESETS[2].settings} />
    </>
  );
}
