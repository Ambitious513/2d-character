/**
 * Motion engine.
 *
 * `samplePose` is a pure function of (settings, frame, fps). No Math.random, no
 * Date, no timers — the same inputs always produce the same pose, which is what
 * makes parallel Remotion renders safe.
 *
 * Locomotion (walk / run) uses a stance-locked gait: during stance the foot
 * travels backwards relative to the body at exactly the ground speed, so the
 * sole never skates. A two-bone IK solver places the knee. Everything else
 * (jump, sit, point, think, talk, dance, wave, idle) is a procedural pose.
 */

import { getCharacter } from './cast';
import { proportionsOf, skeletonOf, BASE_PROPORTIONS, type Skeleton } from './definition';
import { buildSpeech, mouthOpenness, visemeAt, type Speech, type VisemeId } from './lipsync';
import { isLocomotion, type CharacterSettings, type Motion, type Proportions } from './types';

export interface Point {
  x: number;
  y: number;
}
export interface FootPose {
  ankle: Point;
  knee: Point;
  angle: number;
  contact: boolean;
}
export type HandShape = 'relaxed' | 'open' | 'point' | 'fist';
export interface ArmPose {
  shoulder: Point;
  elbow: Point;
  wrist: Point;
  hand: HandShape;
  /** Rotation of the hand art, degrees. */
  handAngle: number;
}

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
  /** Lip-sync shape for this frame. */
  mouth: VisemeId;
  /** Jaw openness 0–1, only non-zero while talking. */
  mouthOpen: number;
  /** 0–1 knee bend from a jump crouch or a seated pose. */
  crouch: number;
  /** True when the rig should draw its stool. */
  seated: boolean;
  /** Seat surface height above ground, rig units. */
  seatHeight: number;
  /** Whole-body vertical offset (jump). Negative is up. */
  lift: number;
  proportions: Proportions;
  skeleton: Skeleton;
}

export const FPS = 30;
export const DURATION = 300;
export const WIDTH = 1280;
export const HEIGHT = 720;
export const GROUND_Y = 590;
export const CHARACTER_X = 650;

/** Kept for backwards compatibility with v1 imports; these are the base rig. */
export const THIGH = BASE_PROPORTIONS.thigh;
export const SHIN = BASE_PROPORTIONS.shin;

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const rad = (deg: number) => (deg * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Two-bone IK. `bend` = +1 keeps knees pointing forward, -1 flips the joint
 * (used for elbows, which bend the other way).
 */
export function solveJoint(
  a: Point,
  b: Point,
  upper: number,
  lower: number,
  bend: 1 | -1 = 1,
): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const raw = Math.hypot(dx, dy);
  const d = clamp(raw, Math.abs(upper - lower) + 0.001, upper + lower - 0.001);
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const perp = Math.sqrt(Math.max(0, upper * upper - along * along));
  const ux = raw > 0.0001 ? dx / raw : 0;
  const uy = raw > 0.0001 ? dy / raw : 1;
  return {
    x: a.x + along * ux + bend * perp * uy,
    y: a.y + along * uy - bend * perp * ux,
  };
}

/** Knee solver — forward-bending. Signature preserved from v1. */
export function solveKnee(
  hip: Point,
  ankle: Point,
  upper = THIGH,
  lower = SHIN,
): Point {
  return solveJoint(hip, ankle, upper, lower, 1);
}

export function gaitParameters(
  settings: Pick<CharacterSettings, 'motion' | 'speed' | 'stride'> &
    Partial<Pick<CharacterSettings, 'build' | 'proportions' | 'character'>>,
) {
  const run = settings.motion === 'run';
  const p = proportionsOf(
    { build: settings.build ?? 'average', proportions: settings.proportions },
    settings.character ? getCharacter(settings.character).proportions : undefined,
  );
  // Shorter legs take shorter steps at the same cadence.
  const legScale = (p.thigh + p.shin) / (BASE_PROPORTIONS.thigh + BASE_PROPORTIONS.shin);
  const stepLength = (run ? 108 : 74) * clamp(settings.stride, 0.5, 1.6) * legScale;
  const speed = (run ? 245 : 116) * clamp(settings.speed, 0.25, 2) * legScale;
  const duty = run ? 0.4 : 0.62;
  const cycleDuration = (2 * stepLength) / speed;
  return { stepLength, speed, duty, cycleDuration, cycleFrames: cycleDuration * FPS, legScale };
}

/** Foot placement for one leg at a given cycle phase. */
function footPose(
  phase: number,
  hip: Point,
  stepLength: number,
  duty: number,
  lift: number,
  run: boolean,
  sk: Skeleton,
  p: Proportions,
): FootPose {
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
  } else {
    const u = (phase - duty) / (1 - duty);
    x = -reach / 2 + reach * smooth(u);
    angle = 19 - 32 * smooth(u);
    const a = rad(angle);
    const heelY = sk.heelX * Math.sin(a) + sk.soleY * Math.cos(a);
    const toeY = sk.toeX * Math.sin(a) + sk.soleY * Math.cos(a);
    y = -Math.max(heelY, toeY) - lift * Math.pow(Math.sin(Math.PI * u), run ? 0.85 : 1.15);
    const ankle = { x, y };
    return { ankle, knee: solveJoint(hip, ankle, p.thigh, p.shin, 1), angle, contact };
  }
  const a = rad(angle);
  const heelY = sk.heelX * Math.sin(a) + sk.soleY * Math.cos(a);
  const toeY = sk.toeX * Math.sin(a) + sk.soleY * Math.cos(a);
  y = -Math.max(heelY, toeY);
  const ankle = { x, y };
  return { ankle, knee: solveJoint(hip, ankle, p.thigh, p.shin, 1), angle, contact };
}

/** Forward-kinematic arm from a shoulder angle and an elbow bend. */
function armFK(
  shoulder: Point,
  angle: number,
  bend: number,
  p: Proportions,
  hand: HandShape = 'relaxed',
): ArmPose {
  const elbow = {
    x: shoulder.x + Math.sin(rad(angle)) * p.upperArm,
    y: shoulder.y + Math.cos(rad(angle)) * p.upperArm,
  };
  const wrist = {
    x: elbow.x + Math.sin(rad(angle + bend)) * p.foreArm,
    y: elbow.y + Math.cos(rad(angle + bend)) * p.foreArm,
  };
  return { shoulder, elbow, wrist, hand, handAngle: angle + bend };
}

/** Reverse-kinematic arm: place the hand, let the elbow fall where it must. */
function armIK(
  shoulder: Point,
  wrist: Point,
  p: Proportions,
  hand: HandShape = 'relaxed',
  handAngle = 0,
): ArmPose {
  return {
    shoulder,
    elbow: solveJoint(shoulder, wrist, p.upperArm, p.foreArm, -1),
    wrist,
    hand,
    handAngle,
  };
}

/* ------------------------------------------------------------------ */
/* Speech memoisation — buildSpeech is pure, so caching is safe.        */
/* ------------------------------------------------------------------ */
const speechCache = new Map<string, Speech>();
function speechFor(text: string, rate: number, seed: number): Speech {
  const key = `${text}|${rate}|${seed}`;
  const hit = speechCache.get(key);
  if (hit) return hit;
  const built = buildSpeech(text, rate, seed);
  if (speechCache.size > 64) speechCache.clear();
  speechCache.set(key, built);
  return built;
}

/** Standing feet, used by every non-locomotion motion. */
function standingFeet(
  hip: Point,
  sk: Skeleton,
  p: Proportions,
  spread = 1,
): [FootPose, FootPose] {
  const far = { x: -17 * spread * p.footScale, y: sk.ankleY };
  const near = { x: 15 * spread * p.footScale, y: sk.ankleY };
  return [
    { ankle: far, knee: solveJoint(hip, far, p.thigh, p.shin, 1), angle: 0, contact: true },
    { ankle: near, knee: solveJoint(hip, near, p.thigh, p.shin, 1), angle: 0, contact: true },
  ];
}

/**
 * The pose sampler. Deterministic for a given (settings, frame, fps).
 */
export function samplePose(
  settings: CharacterSettings,
  frame: number,
  fps = FPS,
): RigPose {
  const def = getCharacter(settings.character);
  const p = proportionsOf(settings, def.proportions);
  const sk = skeletonOf(p);
  const t = frame / fps;
  const motion = settings.motion;
  const moving = isLocomotion(motion);
  const run = motion === 'run';
  const unit = (p.thigh + p.shin) / (BASE_PROPORTIONS.thigh + BASE_PROPORTIONS.shin);
  const seedPhase = ((settings.seed ?? 0) % 100) / 100;

  const { stepLength, speed, duty, cycleDuration, cycleFrames } = gaitParameters(settings);
  const phase = moving ? (((t / cycleDuration) + seedPhase) % 1 + 1) % 1 : 0;
  const bounce = clamp(settings.bounce, 0, 1.5);
  const swing = clamp(settings.armSwing, 0, 1.5);

  let bob = moving
    ? -(run ? 9 : 4.2) * bounce * unit * (0.5 - 0.5 * Math.cos(phase * Math.PI * 4))
    : Math.sin(t * 2.2 + seedPhase * 6) * 1.25 * bounce * unit;
  let lean = run ? 12 : motion === 'walk' ? 4 : 0;
  let crouch = 0;
  let lift = 0;
  let seated = false;
  let seatHeight = 0;
  let headTilt = moving
    ? Math.sin(phase * Math.PI * 2) * 1.3
    : motion === 'wave'
      ? -4
      : Math.sin(t * 1.3 + seedPhase * 6) * 0.7;

  let hip: Point = { x: 0, y: sk.hipY + bob };
  let feet: [FootPose, FootPose];
  let arms: [ArmPose, ArmPose];

  const shoulderOf = (h: Point, leanX: number): Point => ({
    x: h.x + leanX,
    y: h.y - p.torsoLength,
  });
  const headOf = (s: Point, extraY = 0): Point => ({
    x: s.x + 6 * p.headScale,
    y: s.y - p.neckLength + extraY,
  });

  if (moving) {
    const footLift = (run ? 43 : 23) * (0.65 + bounce * 0.35) * unit;
    feet = [
      footPose(phase, hip, stepLength, duty, footLift, run, sk, p),
      footPose((phase + 0.5) % 1, hip, stepLength, duty, footLift, run, sk, p),
    ];
    const angle = Math.sin(phase * Math.PI * 2) * (run ? 37 : 25) * swing;
    const s = shoulderOf(hip, lean);
    arms = [
      armFK({ x: s.x - 9, y: s.y + 4 }, -angle, run ? 78 : 16, p),
      armFK({ x: s.x + 12, y: s.y + 4 }, angle, run ? 82 : 12, p),
    ];
  } else if (motion === 'jump') {
    const period = 1.25 / clamp(settings.speed, 0.5, 2);
    const jp = (((t / period) + seedPhase) % 1 + 1) % 1;
    let air = 0;
    if (jp < 0.28) {
      crouch = Math.sin(Math.PI * (jp / 0.28)) ** 1.2;
    } else if (jp < 0.72) {
      const u = (jp - 0.28) / 0.44;
      air = 4 * u * (1 - u);
    } else {
      const u = (jp - 0.72) / 0.28;
      crouch = Math.sin(Math.PI * u) ** 1.2 * 0.85;
    }
    const jumpHeight = 78 * bounce * unit;
    const airLift = -jumpHeight * air;
    lift = airLift + 26 * crouch * unit;
    bob = 0;
    lean = 3 + 4 * air;
    hip = { x: 0, y: sk.hipY + lift };
    const tuck = 30 * air * unit;
    const spreadAir = lerp(1, 0.7, air);
    feet = standingFeet(hip, sk, p, spreadAir).map((f) => {
      const ankle = { x: f.ankle.x, y: sk.ankleY + airLift - tuck };
      return {
        ankle,
        knee: solveJoint(hip, ankle, p.thigh, p.shin, 1),
        angle: -14 * air,
        contact: air < 0.02,
      };
    }) as [FootPose, FootPose];
    const s = shoulderOf(hip, lean);
    const armAngle = 10 + 150 * air - 25 * crouch;
    arms = [
      armFK({ x: s.x - 10, y: s.y + 4 }, armAngle - 6, 18 - 12 * air, p, 'open'),
      armFK({ x: s.x + 12, y: s.y + 4 }, armAngle, 20 - 14 * air, p, 'open'),
    ];
    headTilt = -3 * air + 2 * crouch;
  } else if (motion === 'sit') {
    seated = true;
    seatHeight = (p.shin + 13 * p.footScale) * 0.98;
    bob = Math.sin(t * 1.9 + seedPhase * 6) * 0.9 * bounce;
    lean = -2;
    hip = { x: 0, y: -seatHeight - 4 + bob };
    const mk = (dx: number): FootPose => {
      const ankle = { x: p.thigh * dx, y: sk.ankleY };
      return {
        ankle,
        knee: solveJoint(hip, ankle, p.thigh, p.shin, 1),
        angle: 0,
        contact: true,
      };
    };
    feet = [mk(0.78), mk(0.86)];
    const s = shoulderOf(hip, lean);
    arms = [
      armIK({ x: s.x - 9, y: s.y + 4 }, { x: feet[0].knee.x - 12, y: feet[0].knee.y - 12 }, p, 'relaxed', 70),
      armIK({ x: s.x + 12, y: s.y + 4 }, { x: feet[1].knee.x - 6, y: feet[1].knee.y - 14 }, p, 'relaxed', 70),
    ];
    headTilt = Math.sin(t * 0.9 + seedPhase * 6) * 1.1;
  } else if (motion === 'point') {
    lean = 3;
    feet = standingFeet(hip, sk, p);
    const s = shoulderOf(hip, lean);
    const gesture = Math.sin(t * 1.6 + seedPhase * 6) * 5;
    arms = [
      armFK({ x: s.x - 9, y: s.y + 4 }, -8, 14, p),
      armFK({ x: s.x + 12, y: s.y + 4 }, 78 + gesture, 4, p, 'point'),
    ];
    headTilt = -2 + gesture * 0.15;
  } else if (motion === 'think') {
    lean = -1;
    feet = standingFeet(hip, sk, p, 0.92);
    const s = shoulderOf(hip, lean);
    const h = headOf(s);
    const stroking = Math.sin(t * 1.7 + seedPhase * 6) * 2.2;
    arms = [
      // Far arm folded across the waist, supporting the near elbow.
      armIK({ x: s.x - 9, y: s.y + 4 }, { x: s.x + 16, y: s.y + p.torsoLength * 0.52 }, p, 'relaxed', 80),
      armIK(
        { x: s.x + 12, y: s.y + 4 },
        { x: h.x + 19 * p.headScale, y: h.y + 37 * p.headScale + stroking },
        p,
        'fist',
        -20,
      ),
    ];
    headTilt = -6 + Math.sin(t * 0.9 + seedPhase * 6) * 1.6;
  } else if (motion === 'dance') {
    const period = 0.92 / clamp(settings.speed, 0.5, 2);
    const dp = (((t / period) + seedPhase) % 1 + 1) % 1;
    const w = dp * Math.PI * 2;
    bob = -Math.abs(Math.sin(w)) * 9 * bounce * unit;
    lean = Math.sin(w) * 6;
    hip = { x: Math.sin(w) * 9 * unit, y: sk.hipY + bob };
    const s = shoulderOf(hip, lean);
    const liftL = Math.max(0, Math.sin(w)) * 12 * unit;
    const liftR = Math.max(0, -Math.sin(w)) * 12 * unit;
    feet = [
      { ankle: { x: -18 * p.footScale, y: sk.ankleY - liftL }, knee: solveJoint(hip, { x: -18 * p.footScale, y: sk.ankleY - liftL }, p.thigh, p.shin, 1), angle: -8 * (liftL > 1 ? 1 : 0), contact: liftL < 1 },
      { ankle: { x: 16 * p.footScale, y: sk.ankleY - liftR }, knee: solveJoint(hip, { x: 16 * p.footScale, y: sk.ankleY - liftR }, p.thigh, p.shin, 1), angle: -8 * (liftR > 1 ? 1 : 0), contact: liftR < 1 },
    ];
    arms = [
      armFK({ x: s.x - 10, y: s.y + 4 }, 120 + Math.sin(w) * 40 * swing, 34, p, 'open'),
      armFK({ x: s.x + 12, y: s.y + 4 }, 120 - Math.sin(w) * 40 * swing, 30, p, 'open'),
    ];
    headTilt = Math.sin(w) * 4;
  } else {
    // idle / wave / talk share a breathing stand.
    feet = standingFeet(hip, sk, p);
    const s = shoulderOf(hip, lean);
    if (motion === 'wave') {
      const wave = Math.sin(t * 7.5 + seedPhase * 6) * 13;
      arms = [
        armFK({ x: s.x - 9, y: s.y + 4 }, -6, 14, p),
        {
          shoulder: { x: s.x + 12, y: s.y + 4 },
          elbow: { x: s.x + 12 + p.upperArm * 0.83, y: s.y - p.upperArm * 0.27 },
          wrist: { x: s.x + 12 + p.upperArm * 1.02 + wave, y: s.y - p.upperArm * 1.29 },
          hand: 'open',
          handAngle: -12,
        },
      ];
    } else if (motion === 'talk') {
      const g = t * 2.1 + seedPhase * 6;
      arms = [
        armFK({ x: s.x - 9, y: s.y + 4 }, 12 + Math.sin(g + 1.1) * 12 * swing, 34 + Math.sin(g) * 10, p),
        armFK({ x: s.x + 12, y: s.y + 4 }, 20 + Math.sin(g) * 16 * swing, 42 + Math.sin(g + 0.7) * 12, p, 'open'),
      ];
    } else {
      const drift = Math.sin(t * 1.1 + seedPhase * 6) * 2.2;
      arms = [
        armFK({ x: s.x - 9, y: s.y + 4 }, -4 + drift, 12, p),
        armFK({ x: s.x + 12, y: s.y + 4 }, 5 + drift, 10, p),
      ];
    }
  }

  const shoulder = shoulderOf(hip, lean);
  const speech = motion === 'talk' ? speechFor(settings.dialogue ?? '', settings.speechRate ?? 1, settings.seed ?? 0) : null;
  const mouth: VisemeId = speech ? visemeAt(speech, t).id : 'rest';
  const mouthOpen = speech ? mouthOpenness(speech, t) : 0;
  // Small nod on syllable peaks makes talking read as speech, not a puppet.
  const talkNod = speech ? mouthOpen * 1.6 : 0;
  const head = headOf(shoulder, (moving ? Math.sin(phase * Math.PI * 4 + 0.5) * 1.1 * bounce : 0) - talkNod);

  const blinkPhase = (t + 0.7 + seedPhase * 4.3) % 4.3;
  const blink = blinkPhase > 4.08 ? Math.sin(((blinkPhase - 4.08) / 0.22) * Math.PI) : 0;

  return {
    phase,
    cycleFrames,
    bob,
    lean,
    hip,
    shoulder,
    head,
    headTilt,
    feet,
    arms,
    distance: moving ? t * speed : 0,
    blink: clamp(blink, 0, 1),
    breath: moving ? 0 : Math.sin(t * 2.2 + seedPhase * 6) * 0.006,
    mouth,
    mouthOpen,
    crouch,
    seated,
    seatHeight,
    lift,
    proportions: p,
    skeleton: sk,
  };
}

/**
 * Screen-space slip of a planted foot, including camera motion. Should be zero.
 * Follow camera: foot screen delta = dAnkle, ground delta = -travel.
 * Fixed camera: foot screen delta = dAnkle + travel, ground delta = 0.
 * In both cases slip relative to the ground is dAnkle + travel.
 */
export function plantedFootVelocity(
  settings: CharacterSettings,
  frame: number,
  fps = FPS,
  followCamera = true,
): number {
  if (!isLocomotion(settings.motion)) return 0;
  const a = samplePose(settings, frame, fps);
  const b = samplePose(settings, frame + 0.01, fps);
  const travel = b.distance - a.distance;
  const errors = a.feet.map((foot, i) =>
    foot.contact && b.feet[i].contact
      ? Math.abs((b.feet[i].ankle.x - foot.ankle.x + travel) * settings.direction * settings.scale) / 0.01
      : 0,
  );
  return Math.max(...errors);
}

export function motionLabel(motion: Motion): string {
  const labels: Record<Motion, string> = {
    walk: 'Walk cycle',
    run: 'Run cycle',
    idle: 'Idle breathing',
    wave: 'Friendly wave',
    talk: 'Talking',
    jump: 'Jump loop',
    sit: 'Seated idle',
    point: 'Pointing',
    think: 'Thinking',
    dance: 'Dance loop',
  };
  return labels[motion] ?? motion;
}
