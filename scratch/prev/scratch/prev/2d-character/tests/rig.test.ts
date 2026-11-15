import test from 'node:test';
import assert from 'node:assert/strict';
import { samplePose, solveKnee, gaitParameters, plantedFootVelocity, THIGH, SHIN } from '../src/rig/gait';
import { DEFAULT_SETTINGS, type SceneSettings } from '../src/rig/types';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

test('pose sampling is deterministic', () => {
  for (const motion of ['walk', 'run', 'idle', 'wave'] as const) {
    const s = { ...DEFAULT_SETTINGS, motion };
    assert.deepEqual(samplePose(s, 47), samplePose(s, 47));
  }
});

test('two-bone IK preserves segment lengths for reachable targets', () => {
  const hip = { x: 0, y: -139 };
  for (const x of [-40, -20, 0, 20, 40]) {
    const ankle = { x, y: -13 };
    const knee = solveKnee(hip, ankle);
    assert.ok(Math.abs(dist(hip, knee) - THIGH) < 1e-6);
    assert.ok(Math.abs(dist(knee, ankle) - SHIN) < 1e-6);
    assert.ok(knee.x > Math.min(hip.x, ankle.x) - 1, 'knee bends forward');
  }
});

test('planted feet do not skate in follow or fixed camera, both directions', () => {
  for (const motion of ['walk', 'run'] as const) {
    for (const direction of [1, -1] as const) {
      for (const followCamera of [true, false]) {
        const s: SceneSettings = { ...DEFAULT_SETTINGS, motion, direction, followCamera };
        let max = 0;
        for (let f = 0; f < 300; f += 1) max = Math.max(max, plantedFootVelocity(s, f, 30, followCamera));
        assert.ok(max < 1e-6, `${motion} dir=${direction} follow=${followCamera} max slip ${max}`);
      }
    }
  }
});

test('gait parameters stay finite and positive across the control range', () => {
  for (const speed of [0.25, 0.5, 1, 1.5, 2]) {
    for (const stride of [0.5, 1, 1.6]) {
      for (const motion of ['walk', 'run'] as const) {
        const p = gaitParameters({ ...DEFAULT_SETTINGS, motion, speed, stride });
        assert.ok(p.cycleFrames > 5 && p.cycleFrames < 300);
        assert.ok(p.speed > 0 && p.stepLength > 0);
      }
    }
  }
});

test('no NaN or Infinity across motions, emotions and extreme sliders', () => {
  const motions = ['walk', 'run', 'idle', 'wave'] as const;
  const emotions = ['neutral', 'happy', 'focused', 'surprised', 'sad'] as const;
  for (const motion of motions) for (const emotion of emotions) {
    const s: SceneSettings = { ...DEFAULT_SETTINGS, motion, emotion, speed: 2, stride: 1.6, bounce: 1.5, armSwing: 1.5, scale: 1.6 };
    for (let f = 0; f < 120; f += 7) {
      const json = JSON.stringify(samplePose(s, f));
      assert.ok(!json.includes('null'), 'NaN serializes to null');
      assert.ok(Number.isFinite(JSON.parse(json).distance));
    }
  }
});

test('foot trajectory is continuous at stance/swing and cycle boundaries', () => {
  const s = { ...DEFAULT_SETTINGS, motion: 'walk' as const };
  const { cycleFrames, duty } = { ...gaitParameters(s), duty: 0.62 };
  const eps = 0.0001;
  const at = (phase: number) => samplePose(s, phase * cycleFrames).feet[0].ankle;
  const a = at(duty - eps), b = at(duty + eps);
  assert.ok(dist(a, b) < 0.5, `stance/swing jump ${dist(a, b)}`);
  const c = at(1 - eps), d = at(eps);
  assert.ok(dist(c, d) < 0.5, `cycle wrap jump ${dist(c, d)}`);
});
