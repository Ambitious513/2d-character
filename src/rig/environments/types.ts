/**
 * The contract every environment implements.
 *
 * Scenes are authored on a 1280 × 720 canvas with the walking ground line at
 * y = 590 (`GROUND_Y`), so a character can be dropped into any scene without
 * re-framing. `distance` is screen-space travel in pixels: pass
 * `pose.distance * settings.scale` and the world scrolls at exactly the speed
 * the feet are planted at.
 */

import type { TimeOfDay } from '../types';

export interface EnvironmentLayerProps {
  /** Screen pixels travelled. 0 = static plate. */
  distance?: number;
  /** 1 = world scrolls left (character faces right), -1 = mirrored. */
  direction?: 1 | -1;
  timeOfDay?: TimeOfDay;
  /** @deprecated v1 name for `timeOfDay`. Still honoured. */
  environment?: TimeOfDay;
  /** 0 = flat, 1 = full depth separation. */
  parallax?: number;
  /** Seconds, for ambient drift (clouds, leaves, water). */
  time?: number;
}

/** Props plus the resolved lighting pass, handed to each scene renderer. */
export interface ResolvedEnvironment extends Required<Omit<EnvironmentLayerProps, 'environment'>> {
  night: boolean;
  /** Parallax clamped to 0–1. */
  px: number;
}

export function resolveEnvironment(props: EnvironmentLayerProps): ResolvedEnvironment {
  const timeOfDay = props.timeOfDay ?? props.environment ?? 'day';
  const parallax = props.parallax ?? 0.7;
  return {
    distance: props.distance ?? 0,
    direction: props.direction ?? 1,
    timeOfDay,
    parallax,
    time: props.time ?? 0,
    night: timeOfDay === 'night',
    px: Math.max(0, Math.min(1, parallax)),
  };
}
