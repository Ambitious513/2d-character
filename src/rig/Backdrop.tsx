import type { TimeOfDay } from './types';
import { stableId } from './id';

export interface BackdropLayerProps {
  timeOfDay?: TimeOfDay;
  /** Horizon height as a fraction of the frame, 0–1. */
  horizon?: number;
  width?: number;
  height?: number;
}

const PALETTES = {
  day: { top: '#EDEFE8', bottom: '#DDE3DA', floor: '#CBD4C9', glow: '#FFFDF6' },
  golden: { top: '#F6E2C6', bottom: '#EFCFA8', floor: '#E0B891', glow: '#FFF3DA' },
  night: { top: '#2B3A4A', bottom: '#3C4E5E', floor: '#33434F', glow: '#6E8698' },
} as const;

/**
 * A clean studio cyclorama — the neutral plate you want behind a character when
 * you are compositing, keying, or presenting a single performance. Deliberately
 * free of detail so the character carries all the contrast.
 */
export function BackdropLayer({
  timeOfDay = 'day',
  horizon = 0.82,
  width = 1280,
  height = 720,
}: BackdropLayerProps) {
  const p = PALETTES[timeOfDay];
  const wallId = stableId('backdrop-wall', p.top, p.bottom);
  const glowId = stableId('backdrop-glow', p.glow, width, height);
  const floorId = stableId('backdrop-floor', p.floor, p.bottom);
  const hy = height * horizon;

  return (
    <g data-backdrop={timeOfDay}>
      <defs>
        <linearGradient id={wallId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.top} />
          <stop offset="1" stopColor={p.bottom} />
        </linearGradient>
        <radialGradient id={glowId} cx="0.5" cy="0.62" r="0.62">
          <stop offset="0" stopColor={p.glow} stopOpacity={timeOfDay === 'night' ? 0.35 : 0.75} />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={floorId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bottom} />
          <stop offset="1" stopColor={p.floor} />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill={`url(#${wallId})`} />
      <rect width={width} height={height} fill={`url(#${glowId})`} />
      {/* curved cove where wall meets floor */}
      <path
        d={`M 0 ${hy} Q ${width / 2} ${hy - height * 0.045} ${width} ${hy} L ${width} ${height} L 0 ${height} Z`}
        fill={`url(#${floorId})`}
      />
      <path
        d={`M 0 ${hy} Q ${width / 2} ${hy - height * 0.045} ${width} ${hy}`}
        fill="none"
        stroke={p.floor}
        strokeWidth={2}
        opacity={0.5}
      />
    </g>
  );
}

export function Backdrop(props: BackdropLayerProps) {
  const { width = 1280, height = 720 } = props;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${props.timeOfDay ?? 'day'} studio backdrop`}>
      <BackdropLayer {...props} />
    </svg>
  );
}
