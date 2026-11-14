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
  /**
   * Actual hip joints the legs are solved from and drawn from. Solving from the
   * hip centre and drawing from an offset joint (the v1 behaviour) silently
   * changed the thigh length, which is what made knees jut forward.
   */
  hips: [Point, Point];
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

/**
 * Standing feet, used by every non-locomotion motion.
 *
 * The ankles sit almost directly under their own hip joint, so the leg reads as
 * a straight weight-bearing column with a whisper of knee bend. `spread` widens
 * the stance for performances that need a base (point, dance).
 */
function standingFeet(
  hips: [Point, Point],
  sk: Skeleton,
  p: Proportions,
  spread = 1,
): [FootPose, FootPose] {
  const far = { x: hips[0].x - 7 * spread * p.footScale, y: sk.ankleY };
  const near = { x: hips[1].x + 10 * spread * p.footScale, y: sk.ankleY };
  return [
    { ankle: far, knee: solveJoint(hips[0], far, p.thigh, p.shin, 1), angle: 0, contact: true },
    { ankle: near, knee: solveJoint(hips[1], near, p.thigh, p.shin, 1), angle: 0, contact: true },
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

  // Speech is resolved up front so gestures can react to the same syllable
  // envelope that drives the mouth — a puppet whose hands ignore its voice
  // reads as two unrelated animations.
  const speech = motion === 'talk'
    ? speechFor(settings.dialogue ?? '', settings.speechRate ?? 1, settings.seed ?? 0)
    : null;
  const mouth: VisemeId = speech ? visemeAt(speech, t).id : 'rest';
  const mouthOpen = speech ? mouthOpenness(speech, t) : 0;

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

  // Standing motions rest on the taller hip height so the figure is upright.
  let hip: Point = { x: 0, y: (moving ? sk.hipY : sk.standHipY) + bob };
  let feet: [FootPose, FootPose];
  let arms: [ArmPose, ArmPose];

  const u = p.torsoLength / 87;
  /** Hip joints, slightly offset from the pelvis centre, as drawn. */
  const hipsOf = (h: Point): [Point, Point] => [
    { x: h.x - 7 * u, y: h.y },
    { x: h.x + 5 * u, y: h.y },
  ];
  const shoulderOf = (h: Point, leanX: number): Point => ({
    x: h.x + leanX,
    y: h.y - p.torsoLength,
  });
  const headOf = (s: Point, extraY = 0): Point => ({
    x: s.x + 6 * p.headScale,
    y: s.y - p.neckLength + extraY,
  });
  /**
   * Shoulder sockets pushed out to the edge of the torso. In v1 they sat at
   * ±10 from the spine, well inside a 66-wide garment, so both arms were drawn
   * on top of the chest and the hands disappeared into the silhouette.
   */
  const sockets = (s: Point): [Point, Point] => [
    { x: s.x - p.shoulderWidth * 0.88, y: s.y + 6 * u },
    { x: s.x + p.shoulderWidth * 0.8, y: s.y + 5 * u },
  ];

  if (moving) {
    const hips = hipsOf(hip);
    const footLift = (run ? 43 : 23) * (0.65 + bounce * 0.35) * unit;
    feet = [
      footPose(phase, hips[0], stepLength, duty, footLift, run, sk, p),
      footPose((phase + 0.5) % 1, hips[1], stepLength, duty, footLift, run, sk, p),
    ];
    const angle = Math.sin(phase * Math.PI * 2) * (run ? 37 : 29) * swing;
    const s = shoulderOf(hip, lean);
    const [far, near] = sockets(s);
    // The elbow trails the swing: it bends more as the arm comes forward.
    const bend = run ? 78 : 14;
    arms = [
      armFK(far, -angle, bend + Math.max(0, -angle) * 0.35, p),
      armFK(near, angle, bend + Math.max(0, angle) * 0.35, p),
    ];
  } else if (motion === 'jump') {
    const period = 1.25 / clamp(settings.speed, 0.5, 2);
    const jp = (((t / period) + seedPhase) % 1 + 1) % 1;
    let air = 0;
    if (jp < 0.28) {
      crouch = Math.sin(Math.PI * (jp / 0.28)) ** 1.2;
    } else if (jp < 0.72) {
      const u2 = (jp - 0.28) / 0.44;
      air = 4 * u2 * (1 - u2);
    } else {
      const u2 = (jp - 0.72) / 0.28;
      crouch = Math.sin(Math.PI * u2) ** 1.2 * 0.85;
    }
    const jumpHeight = 78 * bounce * unit;
    const airLift = -jumpHeight * air;
    lift = airLift + 26 * crouch * unit;
    bob = 0;
    lean = 3 + 4 * air;
    hip = { x: 0, y: sk.standHipY + lift };
    const hips = hipsOf(hip);
    const tuck = 30 * air * unit;
    const spreadAir = lerp(1, 0.7, air);
    feet = standingFeet(hips, sk, p, spreadAir).map((f, i) => {
      const ankle = { x: f.ankle.x, y: sk.ankleY + airLift - tuck };
      return {
        ankle,
        knee: solveJoint(hips[i], ankle, p.thigh, p.shin, 1),
        angle: -14 * air,
        contact: air < 0.02,
      };
    }) as [FootPose, FootPose];
    const s = shoulderOf(hip, lean);
    const [far, near] = sockets(s);
    const armAngle = 10 + 150 * air - 25 * crouch;
    arms = [
      armFK(far, armAngle - 6, 18 - 12 * air, p, 'open'),
      armFK(near, armAngle, 20 - 14 * air, p, 'open'),
    ];
    headTilt = -3 * air + 2 * crouch;
  } else if (motion === 'sit') {
    seated = true;
    seatHeight = (p.shin + 13 * p.footScale) * 0.98;
    bob = Math.sin(t * 1.9 + seedPhase * 6) * 0.9 * bounce;
    lean = -2;
    hip = { x: 0, y: -seatHeight - 4 + bob };
    const hips = hipsOf(hip);
    const mk = (i: 0 | 1, dx: number): FootPose => {
      const ankle = { x: p.thigh * dx, y: sk.ankleY };
      return {
        ankle,
        knee: solveJoint(hips[i], ankle, p.thigh, p.shin, 1),
        angle: 0,
        contact: true,
      };
    };
    feet = [mk(0, 0.78), mk(1, 0.86)];
    const s = shoulderOf(hip, lean);
    const [far, near] = sockets(s);
    arms = [
      armIK(far, { x: feet[0].knee.x - 12, y: feet[0].knee.y - 12 }, p, 'relaxed', 70),
      armIK(near, { x: feet[1].knee.x - 6, y: feet[1].knee.y - 14 }, p, 'relaxed', 70),
    ];
    headTilt = Math.sin(t * 0.9 + seedPhase * 6) * 1.1;
  } else if (motion === 'point') {
    lean = 3;
    const hips = hipsOf(hip);
    feet = standingFeet(hips, sk, p, 1.15);
    const s = shoulderOf(hip, lean);
    const [far, near] = sockets(s);
    const gesture = Math.sin(t * 1.6 + seedPhase * 6) * 5;
    arms = [
      armFK(far, -8, 14, p),
      armFK(near, 84 + gesture, 4, p, 'point'),
    ];
    headTilt = -2 + gesture * 0.15;
  } else if (motion === 'think') {
    lean = -1;
    const hips = hipsOf(hip);
    feet = standingFeet(hips, sk, p, 0.95);
    const s = shoulderOf(hip, lean);
    const [far, near] = sockets(s);
    const h = headOf(s);
    const stroking = Math.sin(t * 1.7 + seedPhase * 6) * 2.2;
    arms = [
      // Far arm folded across the waist, propping up the near elbow.
      armIK(far, { x: s.x + 14, y: s.y + p.torsoLength * 0.5 }, p, 'relaxed', 80),
      armIK(
        near,
        { x: h.x + 16 * p.headScale, y: h.y + 40 * p.headScale + stroking },
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
    hip = { x: Math.sin(w) * 9 * unit, y: sk.standHipY + bob };
    const hips = hipsOf(hip);
    const s = shoulderOf(hip, lean);
    const [far, near] = sockets(s);
    const liftL = Math.max(0, Math.sin(w)) * 12 * unit;
    const liftR = Math.max(0, -Math.sin(w)) * 12 * unit;
    const mk = (i: 0 | 1, dx: number, up: number): FootPose => {
      const ankle = { x: hips[i].x + dx * p.footScale, y: sk.ankleY - up };
      return {
        ankle,
        knee: solveJoint(hips[i], ankle, p.thigh, p.shin, 1),
        angle: -8 * (up > 1 ? 1 : 0),
        contact: up < 1,
      };
    };
    feet = [mk(0, -5, liftL), mk(1, 7, liftR)];
    arms = [
      armFK(far, 120 + Math.sin(w) * 40 * swing, 34, p, 'open'),
      armFK(near, 120 - Math.sin(w) * 40 * swing, 30, p, 'open'),
    ];
    headTilt = Math.sin(w) * 4;
  } else {
    // idle / wave / talk share a breathing stand.
    const hips = hipsOf(hip);
    feet = standingFeet(hips, sk, p);
    const s = shoulderOf(hip, lean);
    const [far, near] = sockets(s);
    if (motion === 'wave') {
      // Upper arm out to the side, forearm raised, hand oscillating. The hand
      // stays clear of the face — waving across your own cheek reads as a
      // salute, which is what v1 did.
      const wave = Math.sin(t * 7.5 + seedPhase * 6) * 13;
      arms = [
        armFK(far, -6, 14, p),
        armFK(near, 100 + wave * 0.25, 60 + wave, p, 'open'),
      ];
      headTilt = -5 + wave * 0.08;
    } else if (motion === 'talk') {
      // One hand leads the line, the other stays low and quiet. Emphasis rides
      // the syllable envelope so the gesture lands on the words.
      const g = t * 2.1 + seedPhase * 6;
      const emphasis = 0.45 + 0.55 * mouthOpen;
      arms = [
        armFK(far, 6 + Math.sin(g + 1.1) * 5 * swing, 22, p),
        armFK(
          near,
          34 + Math.sin(g) * 14 * swing * emphasis,
          54 + Math.sin(g + 0.7) * 16 * emphasis,
          p,
          'open',
        ),
      ];
      headTilt = Math.sin(g * 0.6) * 1.6 - mouthOpen * 1.2;
    } else {
      const drift = Math.sin(t * 1.1 + seedPhase * 6) * 2.2;
      arms = [
        armFK(far, -4 + drift, 12, p),
        armFK(near, 5 + drift, 10, p),
      ];
    }
  }

  const hips = hipsOf(hip);
  const shoulder = shoulderOf(hip, lean);
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
    hips,
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
