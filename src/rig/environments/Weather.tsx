/**
 * The weather overlay: deterministic rain / snow / fog, in two passes.
 *
 * `SceneLayer` draws the **back** pass (behind the character); compositions
 * draw the exported `WeatherFront` after the character so rain crosses the
 * figure and fog veils it. `weather: 'clear'` renders nothing at all —
 * `SceneLayer` early-returns before this component is ever mounted, which is
 * what keeps v2.2.0 output (and every golden hash) byte-identical.
 *
 * Determinism contract (docs/PHASE-5.1-SPEC.md §4): every particle is a pure
 * function of `(index, time, distance, direction)` via `hash01` — no clocks,
 * no `Math.random`, no `useId`. Gradient ids come from `stableId` over every
 * input that defines them, so they dedupe across render roots.
 *
 * Authored on the 1280 × 720 canvas, ground line `GROUND_Y = 590`. Colours
 * derive from `paletteFor(timeOfDay)` so weather re-lights with the world.
 */

import type { ReactNode } from 'react';
import { GROUND_Y, WIDTH, HEIGHT } from '../gait';
import { stableId } from '../id';
import { paletteFor } from './palette';
import { TILE } from './shared';
import { hash01, wrap, lerp, mix } from './weather-math';
import type { ResolvedEnvironment } from './types';
import type { Weather } from '../types';

/** Particle field extends this far past every edge, so streaks enter/exit off-canvas. */
export const WEATHER_BLEED = 80;
/** Vertical travel span: one wrap covers the canvas plus bleed top and bottom. */
export const WEATHER_SPAN = HEIGHT + 2 * WEATHER_BLEED;

/** Horizontal parallax factor: the front field sits closer to the camera. */
const X_FACTOR: Record<'back' | 'front', number> = { back: 0.85, front: 1.15 };

/** Wind: 90 px/s of rightward drift, drawn as a 12° slant. */
const WIND_PX_S = 90;
const SLANT = Math.tan((12 * Math.PI) / 180);

/** Fixed per-type density — no intensity knob in v1 (spec §5.4). */
const RAIN_BACK = 90;
const RAIN_FRONT = 16;
const SPLASHES = 14;
const SHEEN = 5;
const SNOW_BACK = 70;
const SNOW_FRONT = 12;

/** `room` is indoors. `backdrop` is a cyclorama — a look, not a place — so it takes the full effect. */
export function isIndoorScene(scene: string): boolean {
  return scene === 'room';
}

export type WeatherPass = 'back' | 'front';

export interface WeatherLayerProps {
  weather: Weather;
  timeOfDay?: ResolvedEnvironment['timeOfDay'];
  time?: number;
  distance?: number;
  direction?: 1 | -1;
  pass: WeatherPass;
  indoor?: boolean;
}

interface Particle {
  x: number;
  y: number;
  /** Rain streak length; 0 for snow. */
  len: number;
  /** Rain streak width; 0 for snow. */
  w: number;
  /** Snow flake radius; 0 for rain. */
  r: number;
  opacity: number;
}

/**
 * The moving particle field. Positions are pre-wrapped into `[0, TILE)` ×
 * `[-BLEED, HEIGHT + BLEED)`; the renderer emits the seam copies.
 */
function particles(
  weather: Weather,
  pass: WeatherPass,
  time: number,
  distance: number,
  direction: 1 | -1,
): Particle[] {
  if (weather !== 'rain' && weather !== 'snow') return [];
  const count = weather === 'rain'
    ? (pass === 'back' ? RAIN_BACK : RAIN_FRONT)
    : (pass === 'back' ? SNOW_BACK : SNOW_FRONT);
  const factor = X_FACTOR[pass];
  const out: Particle[] = [];
  for (let i = 0; i < count; i += 1) {
    const salt = (pass === 'back' ? 0 : 500) + i;
    const x0 = hash01(salt, 1) * TILE;
    const y0 = hash01(salt, 2) * WEATHER_SPAN;
    const speed = weather === 'rain'
      ? lerp(pass === 'back' ? 900 : 1500, pass === 'back' ? 1300 : 1750, hash01(salt, 3))
      : lerp(pass === 'back' ? 60 : 130, pass === 'back' ? 110 : 150, hash01(salt, 3));
    const y = wrap(y0 + speed * time, WEATHER_SPAN) - WEATHER_BLEED;
    const sway = weather === 'snow' ? Math.sin(time * 0.6 + i) * (pass === 'back' ? 18 : 29) : 0;
    const x = wrap(x0 + WIND_PX_S * time - direction * distance * factor + sway, TILE);
    out.push({
      x,
      y,
      len: weather === 'rain' ? lerp(pass === 'back' ? 18 : 44, pass === 'back' ? 34 : 70, hash01(salt, 4)) : 0,
      w: weather === 'rain' ? lerp(pass === 'back' ? 1.6 : 3, pass === 'back' ? 2.4 : 4, hash01(salt, 5)) : 0,
      r: weather === 'snow' ? lerp(pass === 'back' ? 1.6 : 4, pass === 'back' ? 3.2 : 6.5, hash01(salt, 4)) : 0,
      opacity: weather === 'rain'
        ? (pass === 'back' ? lerp(0.18, 0.38, hash01(salt, 6)) : 0.22)
        : lerp(pass === 'back' ? 0.5 : 0.75, pass === 'back' ? 0.85 : 0.75, hash01(salt, 6)),
    });
  }
  return out;
}

/**
 * The weather overlay, one pass. `indoor` scenes (room) get veil-only rain and
 * snow at ×0.35, fog at ×0.45 — zero precipitation particles indoors.
 */
export function WeatherLayer({ weather, timeOfDay = 'day', time = 0, distance = 0, direction = 1, pass, indoor = false }: WeatherLayerProps) {
  if (weather === 'clear') return null;
  const p = paletteFor(timeOfDay);
  const indoorMul = indoor ? 0.35 : 1;
  const list = particles(weather, pass, time, distance, direction);

  const field = () => {
    if (weather === 'rain') {
      const col = mix(p.skyBottom, '#FFFFFF', 0.35);
      const paths: ReactNode[] = [];
      let k = 0;
      for (const q of list) {
        // Seam copies at ±TILE cover the wrap; culled copies keep the node
        // budget honest and keep every drawn streak inside [-TILE, WIDTH + TILE].
        for (let t = -1; t <= 1; t += 1) {
          const xx = q.x + t * TILE;
          if (xx < -60 || xx > WIDTH + 60) continue;
          paths.push(
            <path
              key={`r${k++}`}
              d={`M ${r2(xx)} ${r2(q.y)} L ${r2(xx + SLANT * q.len)} ${r2(q.y + q.len)}`}
              stroke={col}
              strokeWidth={r2(q.w)}
              strokeLinecap="round"
              opacity={r2(q.opacity)}
            />,
          );
        }
      }
      return paths;
    }
    // snow
    const circles: ReactNode[] = [];
    let k = 0;
    for (const s of list) {
      for (let u = -1; u <= 1; u += 1) {
        const sx = s.x + u * TILE;
        if (sx < -20 || sx > WIDTH + 20) continue;
        circles.push(
          <circle key={`s${k++}`} cx={r2(sx)} cy={r2(s.y)} r={r2(s.r)} fill="#F7FBFF" opacity={r2(s.opacity)} />,
        );
      }
    }
    return circles;
  };

  const fogId = stableId('wx', 'fog', pass, p.skyBottom);

  return (
    <g data-weather-pass={pass}>
      {pass === 'back' && weather === 'rain' && (
        <>
          <rect width={WIDTH} height={HEIGHT} fill={p.ink} opacity={r2(0.1 * indoorMul)} />
          {!indoor && (
            <>
              {field()}
              {splashes(time)}
              {sheen(p.skyBottom)}
            </>
          )}
        </>
      )}
      {pass === 'back' && weather === 'snow' && (
        <>
          <rect width={WIDTH} height={HEIGHT} fill="#FFFFFF" opacity={r2(0.06 * indoorMul)} />
          {!indoor && (
            <>
              {field()}
              <rect x={0} y={GROUND_Y - 4} width={WIDTH} height={5} rx={2.5} fill="#F7FBFF" opacity={0.55} />
            </>
          )}
        </>
      )}
      {weather === 'fog' && (
        <defs>
          <linearGradient id={fogId} x1="0" y1="0" x2="0" y2="1">
            {pass === 'back' ? (
              <>
                <stop offset="0" stopColor={p.skyBottom} stopOpacity={1} />
                <stop offset="1" stopColor={p.skyBottom} stopOpacity={0} />
              </>
            ) : (
              <>
                <stop offset="0" stopColor={p.skyBottom} stopOpacity={0} />
                <stop offset="1" stopColor={p.skyBottom} stopOpacity={1} />
              </>
            )}
          </linearGradient>
        </defs>
      )}
      {pass === 'back' && weather === 'fog' && (
        <>
          {FOG_BANDS.map(([y0, y1, alpha, driftMul], b) => {
            const drift = Math.sin(time * 0.05) * 30 * driftMul;
            const m = indoor ? 0.45 : 1;
            return (
              <rect
                key={b}
                x={r2(-40 + drift)}
                y={y0}
                width={WIDTH + 80}
                height={y1 - y0}
                fill={`url(#${fogId})`}
                opacity={r2(alpha * m)}
              />
            );
          })}
        </>
      )}
      {pass === 'front' && weather === 'fog' && (
        <>
          <rect width={WIDTH} height={HEIGHT} fill={p.skyBottom} opacity={r2(0.12 * (indoor ? 0.45 : 1))} />
          <rect y={300} width={WIDTH} height={420} fill={`url(#${fogId})`} opacity={r2(0.22 * (indoor ? 0.45 : 1))} />
        </>
      )}
      {pass === 'front' && weather !== 'fog' && !indoor && field()}
    </g>
  );
}

const FOG_BANDS: [number, number, number, number][] = [
  [300, 420, 0.18, 1],
  [420, 540, 0.26, -1.4],
  [540, 650, 0.34, 1.9],
];

/** Ground splashes: 0.35 s arc cycles, deterministic phase per slot. */
function splashes(time: number): ReactNode[] {
  const out: ReactNode[] = [];
  for (let i = 0; i < SPLASHES; i += 1) {
    const sx = hash01(i, 11) * WIDTH;
    const ph = wrap(time * 2.85 + hash01(i, 12), 1);
    if (ph >= 0.55) continue;
    const rr = lerp(6, 10, hash01(i, 13));
    const spread = rr * ph * 2;
    out.push(
      <path
        key={`sp${i}`}
        d={`M ${r2(sx - spread)} ${GROUND_Y + 6} Q ${r2(sx)} ${r2(GROUND_Y + 6 - spread * 2.4)} ${r2(sx + spread)} ${GROUND_Y + 6}`}
        stroke="#FFFFFF"
        strokeWidth={1.4}
        fill="none"
        opacity={r2(0.3 * (1 - ph / 0.55))}
      />,
    );
  }
  return out;
}

/** Wet sheen on the sidewalk: static ellipses, rain only, outdoors only. */
function sheen(skyBottom: string): ReactNode[] {
  const out: ReactNode[] = [];
  for (let j = 0; j < SHEEN; j += 1) {
    const px = hash01(j, 14) * WIDTH;
    out.push(
      <ellipse
        key={`sh${j}`}
        cx={r2(px)}
        cy={r2(568 + hash01(j, 15) * 62)}
        rx={r2(lerp(30, 70, hash01(j, 16)))}
        ry={r2(lerp(3, 6, hash01(j, 17)))}
        fill={skyBottom}
        opacity={0.12}
      />,
    );
  }
  return out;
}

/** Round to 2 decimals so markup (and goldens) stay compact and stable. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface WeatherFrontProps {
  weather: Weather;
  timeOfDay?: ResolvedEnvironment['timeOfDay'];
  time?: number;
  distance?: number;
  direction?: 1 | -1;
  indoor?: boolean;
}

/**
 * Thin convenience wrapper for compositions: the front weather pass, drawn
 * after the character. Renders nothing when weather is `'clear'`.
 */
export function WeatherFront({ weather, timeOfDay = 'day', time = 0, distance = 0, direction = 1, indoor = false }: WeatherFrontProps) {
  if (weather === 'clear') return null;
  return <WeatherLayer weather={weather} timeOfDay={timeOfDay} time={time} distance={distance} direction={direction} pass="front" indoor={indoor} />;
}
