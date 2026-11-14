/**
 * Proportion model — the single source of truth for body shape.
 *
 * The original hand-authored rig ("Milo") is expressed as `BASE_PROPORTIONS`,
 * so every other character is a delta from a known-good silhouette. Nothing in
 * the renderer hard-codes a limb length; it all flows from here.
 */

import type { Build, CharacterSettings, Proportions } from './types';

export const BASE_PROPORTIONS: Proportions = {
  thigh: 67,
  shin: 67,
  upperArm: 48,
  foreArm: 45,
  torsoLength: 87,
  shoulderWidth: 33,
  hipWidth: 31,
  headScale: 1,
  neckLength: 56,
  legWidth: 29,
  armWidth: 26,
  footScale: 1,
  handScale: 1,
};

/**
 * Build presets. `average` is intentionally empty so it stays byte-identical to
 * the original rig.
 */
export const BUILD_PRESETS: Record<Build, Partial<Proportions>> = {
  average: {},
  slim: {
    thigh: 68,
    shin: 68,
    torsoLength: 88,
    shoulderWidth: 29,
    hipWidth: 27,
    legWidth: 26,
    armWidth: 23,
    upperArm: 47,
    foreArm: 44,
    headScale: 0.97,
  },
  broad: {
    thigh: 68,
    shin: 68,
    torsoLength: 90,
    shoulderWidth: 39,
    hipWidth: 34,
    legWidth: 33,
    armWidth: 30,
    upperArm: 50,
    foreArm: 47,
    neckLength: 54,
    headScale: 0.98,
    footScale: 1.06,
  },
  petite: {
    thigh: 58,
    shin: 58,
    torsoLength: 76,
    shoulderWidth: 28,
    hipWidth: 27,
    legWidth: 25,
    armWidth: 22,
    upperArm: 42,
    foreArm: 39,
    neckLength: 50,
    footScale: 0.92,
    handScale: 0.94,
  },
  child: {
    thigh: 44,
    shin: 44,
    torsoLength: 60,
    shoulderWidth: 24,
    hipWidth: 23,
    legWidth: 22,
    armWidth: 19,
    upperArm: 33,
    foreArm: 31,
    neckLength: 40,
    headScale: 1.12,
    footScale: 0.85,
    handScale: 0.9,
  },
};

/** Merge base → build preset → explicit overrides. Always returns a full set. */
export function resolveProportions(
  build: Build = 'average',
  overrides?: Partial<Proportions>,
): Proportions {
  return {
    ...BASE_PROPORTIONS,
    ...(BUILD_PRESETS[build] ?? {}),
    ...(overrides ?? {}),
  };
}

/** Joint positions derived from proportions, before any animation is applied. */
export interface Skeleton {
  /** Resting ankle height above the ground. */
  ankleY: number;
  hipY: number;
  shoulderY: number;
  headY: number;
  /** Total drawn height, ground to top of the hair. Useful for framing. */
  height: number;
  /** Half-span of the shoe, used by the foot-lock maths. */
  heelX: number;
  toeX: number;
  soleY: number;
}

/**
 * The 0.94 factor keeps a soft bend in the knee at rest — legs are never drawn
 * perfectly straight, which reads as more organic than a locked joint.
 */
export function skeletonOf(p: Proportions): Skeleton {
  const ankleY = -13 * p.footScale;
  const hipY = ankleY - (p.thigh + p.shin) * 0.94;
  const shoulderY = hipY - p.torsoLength;
  const headY = shoulderY - p.neckLength;
  return {
    ankleY,
    hipY,
    shoulderY,
    headY,
    height: Math.abs(headY) + 78 * p.headScale,
    heelX: -18 * p.footScale,
    toeX: 31 * p.footScale,
    soleY: 13 * p.footScale,
  };
}

/** Convenience: proportions for a settings object, honouring cast overrides. */
export function proportionsOf(
  settings: Pick<CharacterSettings, 'build' | 'proportions'>,
  castOverrides?: Partial<Proportions>,
): Proportions {
  return resolveProportions(settings.build, {
    ...(castOverrides ?? {}),
    ...(settings.proportions ?? {}),
  });
}
