/**
 * Environment registry.
 *
 * `SceneLayer` is the single entry point compositions use: give it a `scene` id
 * and it draws the matching world behind the character. Host apps can add their
 * own scenes with `registerScene` — no fork required.
 *
 *   registerScene('rooftop', (props) => <MyRooftopLayer {...props} />);
 */

import type { ComponentType } from 'react';
import type { SceneId } from '../types';
import { StreetLayer, Street } from './Street';
import { ParkLayer, Park } from './Park';
import { RoomLayer, Room } from './Room';
import { BackdropLayer, Backdrop } from './Backdrop';
import { resolveEnvironment, type EnvironmentLayerProps } from './types';
import { WeatherLayer, isIndoorScene } from './Weather';

export type SceneRenderer = ComponentType<EnvironmentLayerProps>;

const registry = new Map<string, SceneRenderer>([
  ['street', StreetLayer],
  ['park', ParkLayer],
  ['room', RoomLayer],
  ['backdrop', BackdropLayer],
]);

export function registerScene(id: string, renderer: SceneRenderer): void {
  registry.set(id, renderer);
}

export function listScenes(): string[] {
  return [...registry.keys()];
}

export function getScene(id: string): SceneRenderer {
  return registry.get(id) ?? StreetLayer;
}

export interface SceneLayerProps extends EnvironmentLayerProps {
  scene?: SceneId | string;
}

/**
 * The world behind the character, as an SVG `<g>` on a 1280 × 720 canvas.
 *
 * With `weather: 'clear'` (the default) this renders **byte-identical to
 * v2.2.0** — the early return below means no wrapper `<g>`, no `data-weather`
 * attribute, no extra node. Any active weather wraps the scene plus the back
 * weather pass; compositions draw `WeatherFront` after the character.
 */
export function SceneLayer({ scene = 'street', ...rest }: SceneLayerProps) {
  const Renderer = getScene(scene);
  const { weather } = resolveEnvironment(rest);
  if (weather === 'clear') return <Renderer {...rest} />;
  return (
    <g data-weather={weather}>
      <Renderer {...rest} />
      <WeatherLayer {...resolveEnvironment(rest)} pass="back" indoor={isIndoorScene(scene)} />
    </g>
  );
}

/** Standalone environment SVG (no character). */
export function Environment({ scene = 'street', ...rest }: SceneLayerProps & { className?: string }) {
  const { timeOfDay } = resolveEnvironment(rest);
  return (
    <svg
      viewBox="0 0 1280 720"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${scene} environment, ${timeOfDay}`}
    >
      <SceneLayer scene={scene} {...rest} />
    </svg>
  );
}

export { StreetLayer, Street, ParkLayer, Park, RoomLayer, Room, BackdropLayer, Backdrop };
export { WeatherLayer, WeatherFront, isIndoorScene, type WeatherLayerProps, type WeatherFrontProps, type WeatherPass } from './Weather';
export { paletteFor, PALETTES, type Palette } from './palette';
export { resolveEnvironment } from './types';
export type { EnvironmentLayerProps } from './types';
