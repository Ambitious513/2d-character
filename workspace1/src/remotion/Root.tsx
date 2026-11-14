import { Composition } from 'remotion';
import { WalkScene, CharacterOnly, StreetOnly, EmotionSheet } from './Compositions';
import { DEFAULT_SETTINGS } from '../rig/types';
import { FPS, DURATION, WIDTH, HEIGHT } from '../rig/gait';

export function RemotionRoot() {
  return (
    <>
      <Composition id="WalkScene" component={WalkScene} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={DEFAULT_SETTINGS} />
      <Composition id="CharacterOnly" component={CharacterOnly} durationInFrames={DURATION} fps={FPS} width={720} height={720} defaultProps={{ ...DEFAULT_SETTINGS, guides: false }} />
      <Composition id="StreetOnly" component={StreetOnly} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={DEFAULT_SETTINGS} />
      <Composition id="EmotionSheet" component={EmotionSheet} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={DEFAULT_SETTINGS} />
    </>
  );
}
