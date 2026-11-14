import type { TimeOfDay } from './types';
import { stableId } from './id';

export interface StreetLayerProps {
  distance?: number;
  direction?: 1 | -1;
  /** Lighting pass. Preferred name since v2. */
  timeOfDay?: TimeOfDay;
  /** @deprecated Alias of `timeOfDay`, kept for v1 callers. */
  environment?: TimeOfDay;
  parallax?: number;
  time?: number;
}

const TILE = 1600;

function offset(distance: number, direction: number, factor: number) {
  const raw = (-direction * distance * factor) % TILE;
  return ((raw + TILE) % TILE) - TILE;
}

function Repeating({ x, children }: { x: number; children: React.ReactNode }) {
  return <>{[0, 1, 2].map((i) => <g key={i} transform={`translate(${x + i * TILE} 0)`}>{children}</g>)}</>;
}

const PALETTES = {
  day: { skyTop: '#BFE3E8', skyBottom: '#F3EFD8', sun: '#F6C65B', far: '#A8C4B4', mid: '#7FA391', shopA: '#E9E2CE', shopB: '#DCE7DD', shopC: '#E7D3B8', window: '#6E93A0', leaf: '#6F9B6A', leafDark: '#4E7A55', sidewalk: '#D8D2C2', road: '#8C9B90', line: '#F1E8C9', ink: '#3E5A50' },
  golden: { skyTop: '#E8A9A0', skyBottom: '#F6D78B', sun: '#F28C4B', far: '#C3A3A0', mid: '#9C8A83', shopA: '#F0D9B8', shopB: '#E5CDBD', shopC: '#DDB894', window: '#B77F6E', leaf: '#8E8F5E', leafDark: '#667451', sidewalk: '#DEC2A6', road: '#9C887E', line: '#F6DFA8', ink: '#6B5147' },
  night: { skyTop: '#233B59', skyBottom: '#6A7FA0', sun: '#F1E8C9', far: '#3E5A70', mid: '#34505E', shopA: '#5E6E78', shopB: '#4E6672', shopC: '#6A6F78', window: '#F4D35E', leaf: '#3E665A', leafDark: '#2C4E47', sidewalk: '#7C858C', road: '#3E4C55', line: '#D9CFA8', ink: '#223840' },
} as const;

type Palette = { [K in keyof (typeof PALETTES)['day']]: string };

function Cloud({ x, y, s, opacity }: { x: number; y: number; s: number; opacity: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity} fill="#FFFDF6">
      <ellipse cx={0} cy={0} rx={46} ry={16} />
      <ellipse cx={-22} cy={-8} rx={24} ry={16} />
      <ellipse cx={12} cy={-12} rx={30} ry={20} />
      <ellipse cx={38} cy={-2} rx={22} ry={12} />
    </g>
  );
}

function Tree({ x, y, s, leaf, dark }: { x: number; y: number; s: number; leaf: string; dark: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -5 0 L -3 -92 L 4 -92 L 7 0 Z" fill="#7A6248" />
      <path d="M 0 -60 L -22 -82 M 2 -70 L 22 -92" stroke="#7A6248" strokeWidth={5} strokeLinecap="round" />
      <circle cx={-24} cy={-92} r={28} fill={dark} />
      <circle cx={22} cy={-98} r={32} fill={leaf} />
      <circle cx={-2} cy={-118} r={34} fill={leaf} />
      <circle cx={-12} cy={-104} r={26} fill={dark} opacity={0.5} />
      <path d="M -18 -124 Q -4 -136 12 -128" stroke="#FFFDF6" strokeWidth={3} opacity={0.18} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Shop({ x, w, h, color, awning, sign, kind, p, night }: { x: number; w: number; h: number; color: string; awning: string; sign: string; kind: 'cafe' | 'flower' | 'record'; p: Palette; night: boolean }) {
  const y = 548 - h;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} fill={color} />
      <rect x={0} y={0} width={w} height={10} fill={p.ink} opacity={0.18} />
      <rect x={14} y={22} width={w - 28} height={34} rx={4} fill={p.ink} opacity={0.85} />
      <text x={w / 2} y={45} textAnchor="middle" fontFamily="Georgia, serif" fontSize={17} letterSpacing={2} fill="#F5F0E4">{sign}</text>
      {/* upper windows */}
      {h > 250 && [0, 1].map((i) => (
        <g key={i} transform={`translate(${24 + i * (w - 70)} 72)`}>
          <rect width={38} height={48} rx={3} fill={p.window} opacity={night ? 0.95 : 0.7} />
          <path d="M 19 0 V 48 M 0 24 H 38" stroke={color} strokeWidth={3} />
          <rect x={-4} y={48} width={46} height={5} fill={p.ink} opacity={0.25} />
        </g>
      ))}
      {/* storefront */}
      <rect x={16} y={h - 142} width={w - 32} height={126} rx={4} fill={p.window} opacity={night ? 0.9 : 0.75} />
      <rect x={24} y={h - 132} width={w - 48} height={106} fill={night ? '#F6D78B' : '#CFE3DF'} opacity={night ? 0.55 : 0.6} />
      <path d={`M ${w / 2} ${h - 142} V ${h - 16}`} stroke={p.ink} strokeWidth={5} opacity={0.6} />
      <rect x={16} y={h - 16} width={w - 32} height={8} fill={p.ink} opacity={0.3} />
      {/* awning */}
      <g transform={`translate(10 ${h - 158})`}>
        <path d={`M 0 0 H ${w - 20} L ${w - 8} 26 H -8 Z`} fill={awning} />
        {Array.from({ length: Math.floor((w - 20) / 28) }).map((_, i) => (
          <path key={i} d={`M ${i * 28 + 14} 0 H ${i * 28 + 28} L ${i * 28 + 34} 26 H ${i * 28 + 20} Z`} fill="#F5F0E4" opacity={0.85} />
        ))}
        <path d={`M -8 26 H ${w - 8} V 34 Q ${w / 2} 40 -8 34 Z`} fill={awning} opacity={0.9} />
      </g>
      {kind === 'cafe' && (
        <g transform={`translate(${w - 70} ${h - 70})`} fill={p.ink} opacity={0.75}>
          <path d="M 0 0 H 26 V 18 Q 26 28 13 28 Q 0 28 0 18 Z" />
          <path d="M 26 4 Q 40 4 38 14 Q 36 22 26 20" fill="none" stroke={p.ink} strokeWidth={4} />
          <path d="M 6 -8 Q 10 -14 6 -20 M 16 -8 Q 20 -14 16 -20" fill="none" stroke={p.ink} strokeWidth={2} opacity={0.6} />
        </g>
      )}
      {kind === 'flower' && (
        <g transform={`translate(26 ${h - 56})`}>
          <rect x={0} y={18} width={44} height={22} rx={3} fill="#B98735" />
          {[-2, 10, 22, 34].map((fx, i) => (
            <g key={i}>
              <path d={`M ${fx + 6} 20 L ${fx + 4} ${-6 - (i % 2) * 8}`} stroke={p.leafDark} strokeWidth={3} />
              <circle cx={fx + 4} cy={-8 - (i % 2) * 8} r={7} fill={['#F26B38', '#F6C65B', '#E8A9A0', '#F5F0E4'][i]} />
            </g>
          ))}
        </g>
      )}
      {kind === 'record' && (
        <g transform={`translate(${w / 2 - 22} ${h - 96})`}>
          <circle cx={22} cy={22} r={22} fill={p.ink} />
          <circle cx={22} cy={22} r={8} fill="#F26B38" />
          <circle cx={22} cy={22} r={2.5} fill="#F5F0E4" />
        </g>
      )}
    </g>
  );
}

function Lamp({ x, p, night }: { x: number; p: Palette; night: boolean }) {
  return (
    <g transform={`translate(${x} 548)`}>
      {night && <path d="M 0 -196 L -70 0 H 70 Z" fill="#F4D35E" opacity={0.12} />}
      <rect x={-4} y={-200} width={8} height={200} rx={3} fill={p.ink} />
      <path d="M -16 -200 H 16 L 10 -224 H -10 Z" fill={p.ink} />
      <rect x={-9} y={-220} width={18} height={16} rx={3} fill={night ? '#F4D35E' : '#CFE3DF'} />
      <rect x={-12} y={-6} width={24} height={8} rx={3} fill={p.ink} />
    </g>
  );
}

function Bench({ x, p }: { x: number; p: Palette }) {
  return (
    <g transform={`translate(${x} 548)`} fill={p.ink}>
      <rect x={0} y={-42} width={92} height={7} rx={3} />
      <rect x={0} y={-30} width={92} height={7} rx={3} />
      <rect x={-4} y={-18} width={100} height={8} rx={3} />
      <rect x={6} y={-12} width={6} height={14} />
      <rect x={80} y={-12} width={6} height={14} />
      <rect x={4} y={-48} width={5} height={34} />
      <rect x={83} y={-48} width={5} height={34} />
    </g>
  );
}

/** Reusable, deterministic street layer. `distance` is in screen pixels. */
export function StreetLayer({ distance = 0, direction = 1, timeOfDay, environment, parallax = 0.7, time = 0 }: StreetLayerProps) {
  const tod: TimeOfDay = timeOfDay ?? environment ?? 'day';
  const p = PALETTES[tod];
  const night = tod === 'night';
  const px = Math.max(0, Math.min(1, parallax));
  const skyId = stableId('sky', p.skyTop, p.skyBottom);
  const farX = offset(distance, direction, 0.12 * px);
  const treeX = offset(distance, direction, 0.32 * px);
  const shopX = offset(distance, direction, 0.55 + 0.45 * px);
  const groundX = offset(distance, direction, 1);
  const drift = Math.sin(time * 0.12) * 18;
  return (
    <g data-street={tod}>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
      </defs>
      <rect width={1280} height={720} fill={`url(#${skyId})`} />
      {/* sun / moon */}
      <circle cx={960} cy={142} r={night ? 34 : 54} fill={p.sun} opacity={night ? 0.95 : 0.9} />
      {night && <circle cx={974} cy={132} r={30} fill={p.skyTop} />}
      {!night && <circle cx={960} cy={142} r={72} fill={p.sun} opacity={0.18} />}
      {night && [
        [120, 90], [260, 150], [420, 70], [600, 120], [760, 60], [1100, 90], [1180, 180], [80, 210],
      ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2 : 1.3} fill="#F5F0E4" opacity={0.5 + 0.4 * Math.sin(time * 1.4 + i)} />)}
      <Cloud x={180 + drift} y={120} s={1.1} opacity={night ? 0.12 : 0.75} />
      <Cloud x={520 - drift * 0.7} y={80} s={0.8} opacity={night ? 0.1 : 0.6} />
      <Cloud x={1120 + drift * 0.5} y={210} s={0.9} opacity={night ? 0.1 : 0.55} />
      {/* distant skyline */}
      <Repeating x={farX}>
        <g fill={p.far} opacity={0.75}>
          <rect x={0} y={300} width={130} height={248} />
          <rect x={150} y={250} width={110} height={298} />
          <rect x={280} y={330} width={160} height={218} />
          <rect x={470} y={220} width={90} height={328} />
          <rect x={590} y={290} width={150} height={258} />
          <rect x={770} y={260} width={120} height={288} />
          <rect x={920} y={320} width={180} height={228} />
          <rect x={1130} y={240} width={100} height={308} />
          <rect x={1260} y={300} width={160} height={248} />
          <rect x={1450} y={270} width={150} height={278} />
        </g>
        <g fill={p.skyBottom} opacity={0.35}>
          {Array.from({ length: 24 }).map((_, i) => <rect key={i} x={30 + i * 66} y={310 + (i % 4) * 28} width={16} height={24} rx={2} />)}
        </g>
      </Repeating>
      <Repeating x={treeX}>
        <Tree x={120} y={548} s={1.25} leaf={p.leaf} dark={p.leafDark} />
        <Tree x={690} y={548} s={1.5} leaf={p.leaf} dark={p.leafDark} />
        <Tree x={1240} y={548} s={1.15} leaf={p.leaf} dark={p.leafDark} />
      </Repeating>
      {/* storefronts */}
      <Repeating x={shopX}>
        <Shop x={40} w={280} h={300} color={p.shopA} awning="#F26B38" sign="CORNER CAFÉ" kind="cafe" p={p} night={night} />
        <Shop x={360} w={250} h={262} color={p.shopB} awning="#6F9B6A" sign="FLOWERS" kind="flower" p={p} night={night} />
        <Shop x={820} w={300} h={320} color={p.shopC} awning="#E9B44C" sign="RECORDS" kind="record" p={p} night={night} />
        <Shop x={1170} w={260} h={276} color={p.shopA} awning="#7FB6D9" sign="BOOKS" kind="record" p={p} night={night} />
        <Lamp x={740} p={p} night={night} />
        <Lamp x={1520} p={p} night={night} />
        <Bench x={640} p={p} />
        <g transform="translate(1130 548)">
          <rect x={-10} y={-34} width={20} height={34} rx={4} fill="#F26B38" />
          <rect x={-14} y={-40} width={28} height={10} rx={4} fill="#D9552F" />
          <rect x={-18} y={-26} width={36} height={7} rx={3} fill="#D9552F" />
        </g>
      </Repeating>
      {/* sidewalk */}
      <rect y={548} width={1280} height={92} fill={p.sidewalk} />
      <rect y={548} width={1280} height={5} fill={p.ink} opacity={0.22} />
      <Repeating x={groundX}>
        <g stroke={p.ink} strokeWidth={2} opacity={0.16}>
          {Array.from({ length: 11 }).map((_, i) => <path key={i} d={`M ${i * 160} 553 L ${i * 160 - 26} 640`} />)}
          <path d="M 0 600 H 1600" />
        </g>
        <g fill={p.ink} opacity={0.08}>
          <ellipse cx={220} cy={615} rx={26} ry={4} />
          <ellipse cx={900} cy={575} rx={18} ry={3} />
          <ellipse cx={1340} cy={622} rx={30} ry={4} />
        </g>
      </Repeating>
      {/* curb + road */}
      <rect y={640} width={1280} height={14} fill={p.ink} opacity={0.35} />
      <rect y={654} width={1280} height={66} fill={p.road} />
      <Repeating x={groundX}>
        <g fill={p.line} opacity={0.8}>
          {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={i * 280 + 40} y={690} width={120} height={6} rx={3} />)}
        </g>
      </Repeating>
      {/* drifting leaves */}
      <g opacity={night ? 0.35 : 0.7}>
        {Array.from({ length: 7 }).map((_, i) => {
          const x = ((i * 211 + time * (14 + i * 2) * direction) % 1400 + 1400) % 1400 - 60;
          const y = 360 + (i % 4) * 55 + Math.sin(time * 1.2 + i) * 16;
          return <ellipse key={i} cx={x} cy={y} rx={5} ry={2.6} fill={i % 2 ? p.leaf : '#E9B44C'} transform={`rotate(${time * 40 + i * 30} ${x} ${y})`} />;
        })}
      </g>
    </g>
  );
}

export function Street(props: StreetLayerProps) {
  return (
    <svg viewBox="0 0 1280 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${props.timeOfDay ?? props.environment ?? 'day'} street environment`}>
      <StreetLayer {...props} />
    </svg>
  );
}
