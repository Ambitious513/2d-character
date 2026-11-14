import type { CharacterSettings, Motion } from './types';

export interface Point { x: number; y: number }
export interface FootPose { ankle: Point; knee: Point; angle: number; contact: boolean }
export interface ArmPose { shoulder: Point; elbow: Point; wrist: Point }
export interface RigPose {
  phase: number;
  cycleFrames: number;
  bob: number;
  lean: number;
  hip: Point;
  shoulder: Point;
  head: Point;
  headTilt: number;
  feet: [FootPose, FootPose];
  arms: [ArmPose, ArmPose];
  distance: number;
  blink: number;
  breath: number;
}

export const FPS = 30;
export const DURATION = 300;
export const WIDTH = 1280;
export const HEIGHT = 720;
export const GROUND_Y = 590;
export const CHARACTER_X = 650;
export const THIGH = 67;
export const SHIN = 67;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Two-bone IK. The bend direction keeps both knees pointing forward. */
export function solveKnee(hip: Point, ankle: Point, upper = THIGH, lower = SHIN): Point {
  const dx = ankle.x - hip.x;
  const dy = ankle.y - hip.y;
  const raw = Math.hypot(dx, dy);
  const d = clamp(raw, Math.abs(upper - lower) + 0.001, upper + lower - 0.001);
  const a = (upper * upper - lower * lower + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, upper * upper - a * a));
  const ux = raw > 0.0001 ? dx / raw : 0;
  const uy = raw > 0.0001 ? dy / raw : 1;
  return { x: hip.x + a * ux + h * uy, y: hip.y + a * uy - h * ux };
}

export function gaitParameters(settings: Pick<CharacterSettings, 'motion' | 'speed' | 'stride'>) {
  const run = settings.motion === 'run';
  const stepLength = (run ? 108 : 74) * clamp(settings.stride, 0.5, 1.6);
  const speed = (run ? 245 : 116) * clamp(settings.speed, 0.25, 2);
  const duty = run ? 0.4 : 0.62;
  const cycleDuration = (2 * stepLength) / speed;
  return { stepLength, speed, duty, cycleDuration, cycleFrames: cycleDuration * FPS };
}

function footPose(phase: number, hip: Point, stepLength: number, duty: number, lift: number, run: boolean): FootPose {
  // Distance the body travels during one foot's stance. Two steps per cycle.
  const reach = 2 * stepLength * duty;
  const contact = phase < duty;
  let x: number;
  let y: number;
  let angle: number;
  if (contact) {
    const u = phase / duty;
    x = reach / 2 - reach * u;
    // Heel strike -> flat foot -> toe roll. The sole stays on the ground.
    angle = u < 0.16 ? -13 * (1 - smooth(u / 0.16)) : u > 0.76 ? 19 * smooth((u - 0.76) / 0.24) : 0;
    const a = rad(angle);
    const heelY = -18 * Math.sin(a) + 13 * Math.cos(a);
    const toeY = 31 * Math.sin(a) + 13 * Math.cos(a);
    y = -Math.max(heelY, toeY);
  } else {
    const u = (phase - duty) / (1 - duty);
    x = -reach / 2 + reach * smooth(u);
    angle = 19 - 32 * smooth(u);
    const a = rad(angle);
    const heelY = -18 * Math.sin(a) + 13 * Math.cos(a);
    const toeY = 31 * Math.sin(a) + 13 * Math.cos(a);
    y = -Math.max(heelY, toeY) - lift * Math.pow(Math.sin(Math.PI * u), run ? 0.85 : 1.15);
  }
  const ankle = { x, y };
  return { ankle, knee: solveKnee(hip, ankle), angle, contact };
}

function armPose(shoulder: Point, angle: number, bend: number): ArmPose {
  const upper = 48;
  const lower = 45;
  const elbow = { x: shoulder.x + Math.sin(rad(angle)) * upper, y: shoulder.y + Math.cos(rad(angle)) * upper };
  const wrist = { x: elbow.x + Math.sin(rad(angle + bend)) * lower, y: elbow.y + Math.cos(rad(angle + bend)) * lower };
  return { shoulder, elbow, wrist };
}

/** Pure, deterministic pose sampler: same frame + settings always gives the same pose. */
export function samplePose(settings: CharacterSettings, frame: number, fps = FPS): RigPose {
  const t = frame / fps;
  const moving = settings.motion === 'walk' || settings.motion === 'run';
  const run = settings.motion === 'run';
  const { stepLength, speed, duty, cycleDuration, cycleFrames } = gaitParameters(settings);
  const phase = moving ? ((t / cycleDuration) % 1 + 1) % 1 : 0;
  const bounce = clamp(settings.bounce, 0, 1.5);
  const bob = moving ? -(run ? 9 : 4.2) * bounce * (0.5 - 0.5 * Math.cos(phase * Math.PI * 4)) : Math.sin(t * 2.2) * 1.25 * bounce;
  const lean = run ? 12 : settings.motion === 'walk' ? 4 : 0;
  const hip = { x: 0, y: -139 + bob };
  const shoulder = { x: lean, y: -226 + bob };
  const head = { x: lean + 6, y: -282 + bob + (moving ? Math.sin(phase * Math.PI * 4 + 0.5) * 1.1 * bounce : 0) };
  const lift = (run ? 43 : 23) * (0.65 + bounce * 0.35);
  const feet: [FootPose, FootPose] = moving
    ? [footPose(phase, hip, stepLength, duty, lift, run), footPose((phase + 0.5) % 1, hip, stepLength, duty, lift, run)]
    : [
        { ankle: { x: 15, y: -13 }, knee: solveKnee(hip, { x: 15, y: -13 }), angle: 0, contact: true },
        { ankle: { x: -17, y: -13 }, knee: solveKnee(hip, { x: -17, y: -13 }), angle: 0, contact: true },
      ];
  const swing = clamp(settings.armSwing, 0, 1.5);
  const angle = Math.sin(phase * Math.PI * 2) * (run ? 37 : 25) * swing;
  const arms: [ArmPose, ArmPose] = [
    armPose({ x: shoulder.x - 9, y: shoulder.y + 4 }, -angle, run ? 78 : 16),
    armPose({ x: shoulder.x + 12, y: shoulder.y + 4 }, angle, run ? 82 : 12),
  ];
  if (settings.motion === 'wave') {
    const wave = Math.sin(t * 7.5) * 13;
    arms[1] = {
      shoulder: { x: shoulder.x + 12, y: shoulder.y + 4 },
      elbow: { x: shoulder.x + 52, y: shoulder.y - 13 },
      wrist: { x: shoulder.x + 61 + wave, y: shoulder.y - 62 },
    };
  }
  const blinkPhase = (t + 0.7) % 4.3;
  const blink = blinkPhase > 4.08 ? Math.sin(((blinkPhase - 4.08) / 0.22) * Math.PI) : 0;
  return {
    phase, cycleFrames, bob, lean, hip, shoulder, head, feet, arms,
    headTilt: moving ? Math.sin(phase * Math.PI * 2) * 1.3 : settings.motion === 'wave' ? -4 : Math.sin(t * 1.3) * 0.7,
    distance: moving ? t * speed : 0,
    blink: clamp(blink, 0, 1),
    breath: moving ? 0 : Math.sin(t * 2.2) * 0.006,
  };
}

/** Screen-space velocity of a planted foot, including camera motion. Should be zero. */
export function plantedFootVelocity(settings: CharacterSettings, frame: number, fps = FPS, followCamera = true): number {
  if (settings.motion !== 'walk' && settings.motion !== 'run') return 0;
  const a = samplePose(settings, frame, fps);
  const b = samplePose(settings, frame + 0.01, fps);
  const travel = b.distance - a.distance;
  // Follow camera: foot screen delta = dAnkle, ground delta = -travel.
  // Fixed camera: foot screen delta = dAnkle + travel, ground delta = 0.
  // In both cases the slip relative to the ground is dAnkle + travel.
  const errors = a.feet.map((foot, i) => foot.contact && b.feet[i].contact
    ? Math.abs(((b.feet[i].ankle.x - foot.ankle.x) + travel) * settings.direction * settings.scale) / 0.01
    : 0);
  return Math.max(...errors);
}

export function motionLabel(motion: Motion) {
  return { walk: 'Walk cycle', run: 'Run cycle', idle: 'Idle breathing', wave: 'Friendly wave' }[motion];
}
