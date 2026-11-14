/**
 * Environment dispatcher.
 *
 * One component that swaps the plate behind a character, so a composition can
 * change scene without changing its structure. Every layer draws into the same
 * 1280×720 space and shares the `TimeOfDay` lighting vocabulary.
 */

import { StreetLayer } from './Street';
import { BackdropLayer } from './Backdrop';
import type { SceneId, TimeOfDay } from './types';

export interface EnvironmentLayerProps {
  scene?: SceneId;
  timeOfDay?: TimeOfDay;
  /** World travel in screen pixels, used for parallax. */
  distance?: number;
  direction?: 1 | -1;
  parallax?: number;
  /** Seconds, for ambient drift (clouds, leaves, water). */
  time?: number;
}

/**
 * Scenes implemented so far. `park` and `room` are declared in the type but
 * arrive in Phase 3; until then they render the street plate rather than
 * silently rendering nothing.
 */
export const IMPLEMENTED_SCENES: readonly SceneId[] = ['street', 'backdrop'];

export function EnvironmentLayer({
  scene = 'street',
  timeOfDay = 'day',
  distance = 0,
  direction = 1,
  parallax = 0.7,
  time = 0,
}: EnvironmentLayerProps) {
  if (scene === 'backdrop') {
    return <BackdropLayer timeOfDay={timeOfDay} />;
  }
  return (
    <StreetLayer
      distance={distance}
      direction={direction}
      timeOfDay={timeOfDay}
      parallax={parallax}
      time={time}
    />
  );
}
