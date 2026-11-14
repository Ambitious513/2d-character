import { useId } from 'react';
import { Repeating, offset } from './shared';
import { resolveEnvironment, type EnvironmentLayerProps } from './types';
import type { TimeOfDay } from '../types';

const SWEEP: Record<TimeOfDay, { top: string; bottom: string; floor: string; mark: string; vignette: string }> = {
  day: { top: '#F7F4EA', bottom: '#E4E7DE', floor: '#D7DBD2', mark: '#B9C0B5', vignette: '#8C9B90' },
  golden: { top: '#FBE7C6', bottom: '#F0CBA4', floor: '#E3BB93', mark: '#C79A6E', vignette: '#A8763F' },
  night: { top: '#2A3346', bottom: '#3D4759', floor: '#333C4C', mark: '#4C5769', vignette: '#161C27' },
};

/**
 * Clean studio cyclorama — a seamless sweep with a soft floor shadow.
 * Use it when you want the character to read on its own (product shots,
 * explainer videos, transparent-adjacent plates).
 */
export function BackdropLayer(props: EnvironmentLayerProps) {
  const { distance, direction, px, timeOfDay } = resolveEnvironment(props);
  const uid = useId().replace(/:/g, '');
  const s = SWEEP[timeOfDay] ?? SWEEP.day;
  const sweepId = `bd-sweep-${uid}`;
  const vignetteId = `bd-vig-${uid}`;
  const floorX = offset(distance, direction, 1);

  return (
    <g data-scene="backdrop" data-time-of-day={timeOfDay}>
      <defs>
        <linearGradient id={sweepId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.top} />
          <stop offset="0.62" stopColor={s.bottom} />
          <stop offset="1" stopColor={s.floor} />
        </linearGradient>
        <radialGradient id={vignetteId} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor={s.vignette} stopOpacity={0} />
          <stop offset="1" stopColor={s.vignette} stopOpacity={0.28} />
        </radialGradient>
      </defs>
      <rect width={1280} height={720} fill={`url(#${sweepId})`} />
      {/* the curve where wall meets floor */}
      <path d="M 0 520 Q 640 596 1280 520 L 1280 720 L 0 720 Z" fill={s.floor} opacity={0.55} />
      <path d="M 0 520 Q 640 596 1280 520" fill="none" stroke={s.mark} strokeWidth={2} opacity={0.5} />
      {/* floor registration marks scroll at ground speed */}
      <Repeating x={floorX}>
        <g stroke={s.mark} strokeWidth={2} opacity={0.45 * (0.4 + 0.6 * px)}>
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} d={`M ${i * 100 + 40} 612 h 34`} />
          ))}
        </g>
        <g fill={s.mark} opacity={0.3}>
          <ellipse cx={420} cy={660} rx={46} ry={6} />
          <ellipse cx={1120} cy={676} rx={38} ry={5} />
        </g>
      </Repeating>
      <rect width={1280} height={720} fill={`url(#${vignetteId})`} />
    </g>
  );
}

export function Backdrop(props: EnvironmentLayerProps) {
  return (
    <svg viewBox="0 0 1280 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="studio backdrop">
      <BackdropLayer {...props} />
    </svg>
  );
}
