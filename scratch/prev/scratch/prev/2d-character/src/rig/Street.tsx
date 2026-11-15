/**
 * Back-compat entry point. The street now lives in `environments/Street` and is
 * one of several scenes behind `SceneLayer`. Existing imports keep working:
 *
 *   import { StreetLayer, Street } from './rig/Street';
 */
export { StreetLayer, Street } from './environments/Street';
export type { EnvironmentLayerProps as StreetLayerProps } from './environments/types';
