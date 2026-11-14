import { paletteFor } from './palette';
import { stableId } from '../id';
import { Cloud, Repeating, Tree, offset } from './shared';
import { resolveEnvironment, type EnvironmentLayerProps } from './types';

/** Rolling hill silhouette; `w` is the tile width so it repeats seamlessly. */
function Hill({ x, y, w, h, fill, opacity = 1 }: { x: number; y: number; w: number; h: number; fill: string; opacity?: number }) {
  return (
    <path
      d={`M ${x} ${y} Q ${x + w * 0.25} ${y - h} ${x + w * 0.5} ${y - h * 0.35} Q ${x + w * 0.78} ${y - h * 1.15} ${x + w} ${y} Z`}
      fill={fill}
      opacity={opacity}
    />
  );
}

function Bush({ x, y, s, leaf, dark }: { x: number; y: number; s: number; leaf: string; dark: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={-18} cy={-14} r={18} fill={dark} />
      <circle cx={16} cy={-16} r={20} fill={leaf} />
      <circle cx={-2} cy={-26} r={22} fill={leaf} />
      <path d="M -14 -32 Q 0 -42 14 -34" stroke="#FFFDF6" strokeWidth={2.6} opacity={0.2} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Flower({ x, y, petal, stem }: { x: number; y: number; petal: string; stem: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M 0 0 L -1 -16" stroke={stem} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={-1} cy={-19} r={4.6} fill={petal} />
      <circle cx={-1} cy={-19} r={1.8} fill="#F6C65B" />
    </g>
  );
}

function ParkLamp({ x, ink, night }: { x: number; ink: string; night: boolean }) {
  return (
    <g transform={`translate(${x} 566)`}>
      {night && <path d="M 0 -168 L -62 0 H 62 Z" fill="#F4D35E" opacity={0.13} />}
      <rect x={-3.5} y={-172} width={7} height={172} rx={3} fill={ink} />
      <path d="M -13 -172 H 13 L 8 -192 H -8 Z" fill={ink} />
      <rect x={-7} y={-188} width={14} height={14} rx={3} fill={night ? '#F4D35E' : '#CFE3DF'} />
      <rect x={-10} y={-5} width={20} height={7} rx={3} fill={ink} />
    </g>
  );
}

/**
 * Park scene: hills, tree line, pond, hedge and a gravel path.
 * The path surface sits at the same y = 590 ground line as the street.
 */
export function ParkLayer(props: EnvironmentLayerProps) {
  const { distance, direction, time, night, px, timeOfDay } = resolveEnvironment(props);
  const p = paletteFor(timeOfDay);
  const skyId = stableId('park-sky', p.skyTop, p.skyBottom);
  const pondId = stableId('park-pond', p.window, p.skyBottom);
  const hillX = offset(distance, direction, 0.1 * px);
  const treeX = offset(distance, direction, 0.3 * px);
  const midX = offset(distance, direction, 0.55 + 0.35 * px);
  const groundX = offset(distance, direction, 1);
  const drift = Math.sin(time * 0.1) * 20;

  return (
    <g data-scene="park" data-time-of-day={timeOfDay}>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
        <linearGradient id={pondId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.window} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
      </defs>
      <rect width={1280} height={720} fill={`url(#${skyId})`} />
      <circle cx={1020} cy={130} r={night ? 30 : 50} fill={p.sun} opacity={night ? 0.95 : 0.9} />
      {night && <circle cx={1032} cy={121} r={26} fill={p.skyTop} />}
      {!night && <circle cx={1020} cy={130} r={68} fill={p.sun} opacity={0.16} />}
      {night && [[140, 80], [300, 140], [470, 66], [640, 118], [820, 74], [1140, 96], [1220, 176]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2 : 1.3} fill="#F5F0E4" opacity={0.45 + 0.4 * Math.sin(time * 1.3 + i)} />
      ))}
      <Cloud x={220 + drift} y={110} s={1.05} opacity={night ? 0.12 : 0.7} />
      <Cloud x={640 - drift * 0.6} y={74} s={0.78} opacity={night ? 0.1 : 0.55} />
      <Cloud x={1130 + drift * 0.4} y={196} s={0.9} opacity={night ? 0.1 : 0.5} />

      {/* distant hills */}
      <Repeating x={hillX}>
        <g>
          <Hill x={-40} y={500} w={520} h={150} fill={p.far} opacity={0.65} />
          <Hill x={420} y={500} w={620} h={190} fill={p.far} opacity={0.8} />
          <Hill x={980} y={500} w={560} h={140} fill={p.far} opacity={0.7} />
        </g>
      </Repeating>

      {/* grass bank the pond sits on */}
      <rect y={508} width={1280} height={212} fill={p.leaf} opacity={night ? 0.55 : 0.85} />

      {/* pond, sitting just behind the hedge */}
      <Repeating x={offset(distance, direction, 0.22 * px)}>
        <g transform="translate(760 534)">
          <ellipse cx={0} cy={0} rx={210} ry={30} fill={`url(#${pondId})`} opacity={0.9} />
          <ellipse cx={0} cy={0} rx={210} ry={30} fill="none" stroke={p.leafDark} strokeWidth={3} opacity={0.5} />
          {[-120, -40, 46, 130].map((x, i) => (
            <path key={i} d={`M ${x} ${-4 + (i % 2) * 8} q 22 -5 44 0`} stroke="#FFFDF6" strokeWidth={2} fill="none" opacity={0.35 + 0.2 * Math.sin(time * 1.6 + i)} />
          ))}
          <g stroke={p.leafDark} strokeWidth={3} strokeLinecap="round">
            <path d="M -196 4 L -200 -30 M -186 6 L -184 -24 M 190 4 L 196 -28" />
          </g>
        </g>
      </Repeating>

      {/* tree line */}
      <Repeating x={treeX}>
        <Tree x={90} y={552} s={1.4} leaf={p.leaf} dark={p.leafDark} />
        <Tree x={430} y={548} s={1.05} leaf={p.leaf} dark={p.leafDark} />
        <Tree x={1180} y={554} s={1.55} leaf={p.leaf} dark={p.leafDark} />
        <Tree x={1420} y={548} s={1.15} leaf={p.leaf} dark={p.leafDark} />
      </Repeating>

      <Repeating x={midX}>
        <g>
          <Bush x={120} y={556} s={1} leaf={p.leaf} dark={p.leafDark} />
          <Bush x={520} y={552} s={0.85} leaf={p.leaf} dark={p.leafDark} />
          <Bush x={980} y={556} s={1.1} leaf={p.leaf} dark={p.leafDark} />
          <Bush x={1330} y={552} s={0.9} leaf={p.leaf} dark={p.leafDark} />
          {/* fence */}
          <g stroke={p.ink} strokeWidth={4} opacity={0.5}>
            {Array.from({ length: 20 }).map((_, i) => <path key={i} d={`M ${i * 80 + 20} 556 L ${i * 80 + 20} 520`} />)}
            <path d="M 0 530 H 1600 M 0 546 H 1600" />
          </g>
        </g>
      </Repeating>

      {/* gravel path — the walking surface */}
      <rect y={556} width={1280} height={92} fill={p.sidewalk} />
      <rect y={556} width={1280} height={4} fill={p.ink} opacity={0.18} />
      <Repeating x={groundX}>
        <g fill={p.ink} opacity={0.12}>
          {Array.from({ length: 40 }).map((_, i) => (
            <ellipse key={i} cx={(i * 137) % 1600} cy={566 + ((i * 53) % 74)} rx={3 + (i % 3)} ry={1.8} />
          ))}
        </g>
        <g fill={p.ink} opacity={0.07}>
          <ellipse cx={260} cy={620} rx={30} ry={4} />
          <ellipse cx={1040} cy={578} rx={22} ry={3} />
        </g>
        <ParkLamp x={340} ink={p.ink} night={night} />
        <ParkLamp x={1180} ink={p.ink} night={night} />
        {/* bench */}
        <g transform="translate(700 566)" fill={p.ink} opacity={0.85}>
          <rect x={0} y={-40} width={90} height={6} rx={3} />
          <rect x={0} y={-29} width={90} height={6} rx={3} />
          <rect x={-4} y={-17} width={98} height={7} rx={3} />
          <rect x={6} y={-10} width={6} height={12} />
          <rect x={78} y={-10} width={6} height={12} />
          <rect x={4} y={-46} width={5} height={32} />
          <rect x={81} y={-46} width={5} height={32} />
        </g>
      </Repeating>

      {/* foreground grass */}
      <rect y={648} width={1280} height={72} fill={p.leafDark} opacity={night ? 0.75 : 0.9} />
      <Repeating x={offset(distance, direction, 1.18)}>
        <g>
          {Array.from({ length: 26 }).map((_, i) => (
            <path key={i} d={`M ${i * 62} 720 q 6 -26 ${(i % 2 ? 12 : -10)} -34`} stroke={p.leaf} strokeWidth={3} fill="none" opacity={0.7} strokeLinecap="round" />
          ))}
          {[80, 300, 560, 820, 1090, 1360].map((x, i) => (
            <Flower key={x} x={x} y={700} petal={['#F26B38', '#F6C65B', '#E8A9A0', '#FFFDF6'][i % 4]} stem={p.leaf} />
          ))}
        </g>
      </Repeating>

      {/* drifting petals / fireflies */}
      <g opacity={night ? 0.8 : 0.7}>
        {Array.from({ length: 8 }).map((_, i) => {
          const x = ((i * 197 + time * (12 + i * 2) * direction) % 1400 + 1400) % 1400 - 60;
          const y = 380 + (i % 4) * 52 + Math.sin(time * 1.1 + i) * 18;
          return night
            ? <circle key={i} cx={x} cy={y} r={2.4} fill="#F4D35E" opacity={0.4 + 0.5 * Math.abs(Math.sin(time * 2 + i))} />
            : <ellipse key={i} cx={x} cy={y} rx={5} ry={2.6} fill={i % 2 ? '#F6C65B' : '#E8A9A0'} transform={`rotate(${time * 36 + i * 30} ${x} ${y})`} />;
        })}
      </g>
    </g>
  );
}

export function Park(props: EnvironmentLayerProps) {
  return (
    <svg viewBox="0 0 1280 720" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="park environment">
      <ParkLayer {...props} />
    </svg>
  );
}
