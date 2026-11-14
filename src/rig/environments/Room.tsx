import { useId } from 'react';
import { paletteFor } from './palette';
import { Repeating, offset } from './shared';
import { resolveEnvironment, type EnvironmentLayerProps } from './types';
import type { TimeOfDay } from '../types';

/** Interior surfaces per lighting pass. Kept separate from the outdoor palette. */
const ROOM: Record<TimeOfDay, { wall: string; wallLow: string; trim: string; floor: string; floorDark: string; ink: string; glow: string; rug: string; rugAlt: string }> = {
  day: { wall: '#EFE6D5', wallLow: '#DFD2BC', trim: '#FBF7EC', floor: '#C9A87C', floorDark: '#B08F63', ink: '#4A3B2E', glow: '#FFF6D8', rug: '#D9552F', rugAlt: '#F6C65B' },
  golden: { wall: '#F0DCC0', wallLow: '#E0C3A2', trim: '#FDF1DC', floor: '#C09268', floorDark: '#A67B54', ink: '#5A4130', glow: '#FFD9A0', rug: '#C2492B', rugAlt: '#E9B44C' },
  night: { wall: '#3C4356', wallLow: '#333A4C', trim: '#5A6377', floor: '#5A4A3E', floorDark: '#4A3C32', ink: '#20242F', glow: '#F4D35E', rug: '#7A3B2E', rugAlt: '#A8813C' },
};

function Bookshelf({ x, y, ink, trim }: { x: number; y: number; ink: string; trim: string }) {
  const books = ['#D9552F', '#365DE6', '#E9B44C', '#4E7A55', '#7FB6D9', '#F26B38'];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={0} width={190} height={9} rx={3} fill={ink} opacity={0.85} />
      {books.map((c, i) => (
        <rect key={i} x={12 + i * 22} y={-40 + (i % 2) * 6} width={15} height={40 - (i % 2) * 6} rx={2} fill={c} opacity={0.9} />
      ))}
      <g transform="translate(150 -34)">
        <path d="M 0 34 L 4 12 H 26 L 30 34 Z" fill={trim} opacity={0.9} />
        <path d="M 15 12 Q 4 -6 -2 -14 M 15 12 Q 26 -8 34 -12 M 15 12 Q 15 -10 16 -20" stroke="#4E7A55" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

function FramedArt({ x, y, w, h, ink, a, b }: { x: number; y: number; w: number; h: number; ink: string; a: string; b: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={3} fill={ink} opacity={0.8} />
      <rect x={6} y={6} width={w - 12} height={h - 12} fill={a} />
      <circle cx={w * 0.36} cy={h * 0.42} r={Math.min(w, h) * 0.16} fill={b} />
      <path d={`M 8 ${h - 10} L ${w * 0.42} ${h * 0.5} L ${w * 0.66} ${h - 14} L ${w - 8} ${h * 0.62} L ${w - 8} ${h - 10} Z`} fill={b} opacity={0.55} />
    </g>
  );
}

function Sofa({ x, y, ink, body, cushion }: { x: number; y: number; ink: string; body: string; cushion: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={-96} width={250} height={62} rx={14} fill={body} />
      <rect x={-12} y={-58} width={274} height={40} rx={12} fill={body} />
      <rect x={-12} y={-70} width={30} height={52} rx={12} fill={cushion} />
      <rect x={232} y={-70} width={30} height={52} rx={12} fill={cushion} />
      <rect x={30} y={-88} width={80} height={38} rx={9} fill={cushion} opacity={0.85} />
      <rect x={132} y={-88} width={80} height={38} rx={9} fill={cushion} opacity={0.7} />
      <rect x={6} y={-18} width={10} height={18} rx={3} fill={ink} />
      <rect x={234} y={-18} width={10} height={18} rx={3} fill={ink} />
    </g>
  );
}

function FloorLamp({ x, y, ink, glow, night }: { x: number; y: number; ink: string; glow: string; night: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {night && <path d="M -34 -186 L -120 0 H 120 L 34 -186 Z" fill={glow} opacity={0.16} />}
      <path d="M -30 -186 H 30 L 22 -228 H -22 Z" fill={night ? glow : '#E8DCC4'} />
      <rect x={-3} y={-186} width={6} height={186} fill={ink} />
      <ellipse cx={0} cy={0} rx={26} ry={7} fill={ink} />
      {night && <ellipse cx={0} cy={-186} rx={30} ry={8} fill={glow} opacity={0.7} />}
    </g>
  );
}

/**
 * Interior scene: wall, window with a light shaft, shelf, sofa and floorboards.
 * Wall furniture drifts slowly, the floor scrolls at ground speed, so a
 * follow-camera walk still reads as travel through a room.
 */
export function RoomLayer(props: EnvironmentLayerProps) {
  const { distance, direction, time, night, px, timeOfDay } = resolveEnvironment(props);
  const uid = useId().replace(/:/g, '');
  const p = paletteFor(timeOfDay);
  const r = ROOM[timeOfDay] ?? ROOM.day;
  const wallId = `room-wall-${uid}`;
  const shaftId = `room-shaft-${uid}`;
  const wallX = offset(distance, direction, 0.28 * px);
  const floorX = offset(distance, direction, 1);
  const sway = Math.sin(time * 0.6) * 2;

  return (
    <g data-scene="room" data-time-of-day={timeOfDay}>
      <defs>
        <linearGradient id={wallId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={r.wall} />
          <stop offset="1" stopColor={r.wallLow} />
        </linearGradient>
        <linearGradient id={shaftId} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={r.glow} stopOpacity={night ? 0.12 : 0.5} />
          <stop offset="1" stopColor={r.glow} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect width={1280} height={720} fill={`url(#${wallId})`} />

      <Repeating x={wallX}>
        {/* window */}
        <g transform="translate(150 150)">
          <rect x={-14} y={-14} width={288} height={288} rx={6} fill={r.trim} />
          <rect width={260} height={260} fill={p.skyTop} />
          <rect y={150} width={260} height={110} fill={p.skyBottom} opacity={0.7} />
          <circle cx={196} cy={62} r={night ? 22 : 32} fill={p.sun} opacity={0.95} />
          {night && <circle cx={205} cy={55} r={19} fill={p.skyTop} />}
          {!night && <g fill="#FFFDF6" opacity={0.75}><ellipse cx={70} cy={70} rx={38} ry={13} /><ellipse cx={96} cy={60} rx={26} ry={15} /></g>}
          <path d="M 0 200 Q 60 168 130 196 Q 200 168 260 200 L 260 260 L 0 260 Z" fill={p.leaf} opacity={0.8} />
          <path d="M 130 0 V 260 M 0 130 H 260" stroke={r.trim} strokeWidth={10} />
          <rect x={-20} y={274} width={300} height={12} rx={4} fill={r.trim} />
          {/* curtains */}
          <path d={`M -14 -14 q ${28 + sway} 140 -4 288 l -34 0 l 0 -288 Z`} fill={r.rug} opacity={0.75} />
          <path d={`M 274 -14 q ${-28 - sway} 140 4 288 l 34 0 l 0 -288 Z`} fill={r.rug} opacity={0.75} />
        </g>
        {/* light shaft on the floor */}
        {!night && <path d="M 150 424 L 410 424 L 620 648 L 250 648 Z" fill={`url(#${shaftId})`} />}
        <FramedArt x={560} y={180} w={130} h={100} ink={r.ink} a={r.trim} b={r.rug} />
        <FramedArt x={716} y={214} w={92} h={124} ink={r.ink} a={r.trim} b={p.leaf} />
        <Bookshelf x={900} y={252} ink={r.ink} trim={r.trim} />
        {/* wall clock */}
        <g transform="translate(1180 200)">
          <circle r={34} fill={r.trim} stroke={r.ink} strokeWidth={5} />
          <path d="M 0 0 L 0 -20 M 0 0 L 14 6" stroke={r.ink} strokeWidth={4} strokeLinecap="round" />
          <circle r={3} fill={r.ink} />
        </g>
        <Sofa x={880} y={556} ink={r.ink} body={r.rug} cushion={r.rugAlt} />
        <FloorLamp x={1420} y={556} ink={r.ink} glow={r.glow} night={night} />
        {/* potted plant */}
        <g transform="translate(520 556)">
          <path d="M -26 0 L -20 -46 H 20 L 26 0 Z" fill={r.rugAlt} />
          <path d="M 0 -46 Q -30 -86 -40 -116 M 0 -46 Q 26 -90 44 -110 M 0 -46 Q 2 -96 4 -132" stroke={p.leafDark} strokeWidth={6} fill="none" strokeLinecap="round" />
          <circle cx={-40} cy={-118} r={13} fill={p.leaf} />
          <circle cx={44} cy={-112} r={14} fill={p.leaf} />
          <circle cx={4} cy={-134} r={15} fill={p.leaf} />
        </g>
      </Repeating>

      {/* skirting + floor */}
      <rect y={540} width={1280} height={16} fill={r.trim} opacity={0.9} />
      <rect y={556} width={1280} height={164} fill={r.floor} />
      <Repeating x={floorX}>
        <g stroke={r.floorDark} strokeWidth={2.5} opacity={0.75}>
          {Array.from({ length: 14 }).map((_, i) => <path key={i} d={`M ${i * 120} 556 L ${i * 120 - 40} 720`} />)}
          <path d="M 0 604 H 1600 M 0 664 H 1600" />
        </g>
        {/* rug */}
        <g transform="translate(300 620)">
          <ellipse cx={330} cy={20} rx={340} ry={54} fill={r.rug} opacity={0.85} />
          <ellipse cx={330} cy={20} rx={300} ry={42} fill="none" stroke={r.rugAlt} strokeWidth={6} opacity={0.9} />
          <ellipse cx={330} cy={20} rx={210} ry={26} fill={r.rugAlt} opacity={0.35} />
        </g>
        <g fill={r.ink} opacity={0.08}>
          <ellipse cx={1180} cy={640} rx={40} ry={6} />
        </g>
      </Repeating>
      <rect y={556} width={1280} height={5} fill={r.ink} opacity={0.22} />

      {/* dust motes in the light */}
      <g opacity={night ? 0.25 : 0.5}>
        {Array.from({ length: 9 }).map((_, i) => {
          const x = 220 + ((i * 149 + time * (6 + i)) % 900);
          const y = 300 + (i % 5) * 60 + Math.sin(time * 0.8 + i) * 12;
          return <circle key={i} cx={x} cy={y} r={1.8} fill={r.glow} />;
        })}
      </g>
    </g>
  );
}

export function Room(props: EnvironmentLayerProps) {
  return (
    <svg viewBox="0 0 1280 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="room environment">
      <RoomLayer {...props} />
    </svg>
  );
}
