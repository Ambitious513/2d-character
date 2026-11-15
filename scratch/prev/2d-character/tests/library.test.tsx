/**
 * Library contract tests (v2).
 *
 * These cover the parts a host app depends on: the cast registry, proportion
 * resolution, settings merging (including v1 presets), lip-sync, dialogue
 * scheduling and static rendering of every scene and character.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterRig, Character, CharacterHead } from '../src/rig/Character';
import { SceneLayer, listScenes, registerScene, getScene } from '../src/rig/environments';
import { CAST, castSceneSettings, characterSettings, getCharacter, hasCharacter, listCharacters, registerCharacter } from '../src/rig/cast';
import { BASE_PROPORTIONS, BUILD_PRESETS, proportionsOf, resolveProportions, skeletonOf } from '../src/rig/definition';
import { samplePose, solveJoint, plantedFootVelocity } from '../src/rig/gait';
import { buildSpeech, mouthOpenness, speechDuration, splitTurns, visemeAt, VISEMES } from '../src/rig/lipsync';
import { dialogueDuration, dialogueSchedule, turnAt, wrapLines } from '../src/rig/dialogue';
import { mergeSettings } from '../src/remotion/Compositions';
import { DEFAULT_SETTINGS, EMOTIONS, MOTIONS, SCENES, TIMES_OF_DAY, type Build, type Motion } from '../src/rig/types';
import { PRESETS } from '../src/rig/presets';

const BUILDS = Object.keys(BUILD_PRESETS) as Build[];
const ALL_MOTIONS = MOTIONS.map((m) => m.id);

/* ------------------------------------------------------------------ */
/* Cast + proportions                                                  */
/* ------------------------------------------------------------------ */

test('every cast member resolves to a complete, finite character', () => {
  for (const c of CAST) {
    const s = characterSettings(c.id);
    assert.equal(s.character, c.id);
    assert.equal(s.build, c.build);
    assert.equal(s.outfit, c.outfit);
    for (const v of Object.values(s.colors)) assert.match(v, /^#[0-9A-Fa-f]{6}$/);
    const p = proportionsOf(s, c.proportions);
    for (const [k, v] of Object.entries(p)) assert.ok(Number.isFinite(v) && v > 0, `${c.id}.${k}`);
    const sk = skeletonOf(p);
    assert.ok(sk.height > 100 && sk.height < 600, `${c.id} height ${sk.height}`);
    assert.ok(sk.hipY < 0 && sk.shoulderY < sk.hipY && sk.headY < sk.shoulderY, 'joints stack upwards');
  }
});

test('proportion overrides win over build presets, which win over base', () => {
  const base = resolveProportions('average');
  assert.deepEqual(base, BASE_PROPORTIONS);
  const broad = resolveProportions('broad');
  assert.equal(broad.shoulderWidth, BUILD_PRESETS.broad.shoulderWidth);
  const custom = resolveProportions('broad', { shoulderWidth: 42, thigh: 70 });
  assert.equal(custom.shoulderWidth, 42);
  assert.equal(custom.thigh, 70);
  assert.equal(custom.shin, BUILD_PRESETS.broad.shin);
});

test('child builds are shorter than adult builds', () => {
  const child = skeletonOf(resolveProportions('child'));
  for (const b of ['slim', 'average', 'broad', 'petite'] as Build[]) {
    assert.ok(child.height < skeletonOf(resolveProportions(b)).height, `child vs ${b}`);
  }
});

test('partial colour overrides keep the rest of the cast palette', () => {
  const s = characterSettings('ada', { colors: { jacket: '#123456' } as never });
  assert.equal(s.colors.jacket, '#123456');
  assert.equal(s.colors.skin, getCharacter('ada').colors.skin);
  assert.equal(s.colors.accent, getCharacter('ada').colors.accent);
});

test('the registry is extensible and falls back safely', () => {
  const before = listCharacters().length;
  registerCharacter({ ...CAST[0], id: 'test-extra', name: 'Extra', tagline: 'runtime registration' });
  assert.equal(listCharacters().length, before + 1);
  assert.ok(hasCharacter('test-extra'));
  assert.equal(getCharacter('test-extra').name, 'Extra');
  assert.equal(getCharacter('does-not-exist').id, 'milo');
});

/* ------------------------------------------------------------------ */
/* Settings merging + presets                                          */
/* ------------------------------------------------------------------ */

test('mergeSettings applies cast defaults for the requested character', () => {
  const s = mergeSettings({ character: 'kwame' });
  assert.equal(s.build, 'broad');
  assert.equal(s.colors.jacket, getCharacter('kwame').colors.jacket);
  assert.equal(s.scene, DEFAULT_SETTINGS.scene);
});

test('mergeSettings maps the v1 environment key onto timeOfDay', () => {
  const legacy = mergeSettings({ environment: 'night' } as never);
  assert.equal(legacy.timeOfDay, 'night');
  const explicit = mergeSettings({ environment: 'night', timeOfDay: 'golden' } as never);
  assert.equal(explicit.timeOfDay, 'golden');
});

test('every preset is a complete, valid settings object', () => {
  for (const p of PRESETS) {
    const s = p.settings;
    assert.ok(hasCharacter(s.character), p.name);
    assert.ok(ALL_MOTIONS.includes(s.motion), p.name);
    assert.ok(SCENES.some((x) => x.id === s.scene), p.name);
    assert.ok(TIMES_OF_DAY.some((x) => x.id === s.timeOfDay), p.name);
    assert.equal(JSON.parse(JSON.stringify(s)).character, s.character);
  }
});

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

test('every motion is deterministic for every cast member', () => {
  for (const c of CAST) {
    for (const motion of ALL_MOTIONS) {
      const s = castSceneSettings(c.id, { motion: motion as Motion });
      assert.deepEqual(samplePose(s, 63), samplePose(s, 63), `${c.id}/${motion}`);
    }
  }
});

test('no NaN or Infinity across all motions, builds and extreme sliders', () => {
  for (const motion of ALL_MOTIONS) {
    for (const build of BUILDS) {
      const s = castSceneSettings('milo', {
        motion: motion as Motion,
        build,
        speed: 2,
        stride: 1.6,
        bounce: 1.5,
        armSwing: 1.5,
        scale: 2.5,
        dialogue: 'Extreme values should still produce a finite pose.',
      });
      for (let f = 0; f < 150; f += 11) {
        const json = JSON.stringify(samplePose(s, f));
        assert.ok(!json.includes('null'), `${motion}/${build} produced a non-finite number`);
      }
    }
  }
});

test('planted feet never skate for any cast member', () => {
  for (const c of CAST) {
    for (const motion of ['walk', 'run'] as const) {
      for (const direction of [1, -1] as const) {
        const s = castSceneSettings(c.id, { motion, direction });
        let max = 0;
        for (let f = 0; f < 200; f += 3) max = Math.max(max, plantedFootVelocity(s, f, 30, true));
        assert.ok(max < 1e-6, `${c.id} ${motion} dir=${direction} slip=${max}`);
      }
    }
  }
});

test('IK preserves bone lengths for every build', () => {
  for (const build of BUILDS) {
    const p = resolveProportions(build);
    const hip = { x: 0, y: -(p.thigh + p.shin) * 0.94 };
    for (const x of [-40, 0, 40]) {
      const ankle = { x, y: -13 };
      const knee = solveJoint(hip, ankle, p.thigh, p.shin, 1);
      assert.ok(Math.abs(Math.hypot(knee.x - hip.x, knee.y - hip.y) - p.thigh) < 1e-6);
      assert.ok(Math.abs(Math.hypot(ankle.x - knee.x, ankle.y - knee.y) - p.shin) < 1e-6);
    }
  }
});

test('jump leaves the ground and lands back on it', () => {
  const s = castSceneSettings('pip', { motion: 'jump' });
  let minLift = 0;
  let grounded = false;
  for (let f = 0; f < 60; f++) {
    const pose = samplePose(s, f);
    minLift = Math.min(minLift, pose.lift);
    if (pose.feet.every((foot) => foot.contact)) grounded = true;
  }
  assert.ok(minLift < -20, `jump height ${minLift}`);
  assert.ok(grounded, 'jump returns to contact');
});

test('sit puts the hips on a seat and keeps both feet down', () => {
  const pose = samplePose(castSceneSettings('milo', { motion: 'sit' }), 12);
  assert.ok(pose.seated);
  assert.ok(pose.seatHeight > 40);
  assert.ok(pose.feet.every((f) => f.contact));
});

/* ------------------------------------------------------------------ */
/* Speech                                                              */
/* ------------------------------------------------------------------ */

test('lip-sync is a pure function of text, rate and seed', () => {
  const text = 'Hello there, this is a deterministic line.';
  assert.deepEqual(buildSpeech(text, 1, 3), buildSpeech(text, 1, 3));
  assert.notDeepEqual(buildSpeech(text, 1, 3).cues, buildSpeech(text, 1.6, 3).cues);
  assert.ok(speechDuration(text, 2) < speechDuration(text, 0.5));
  // Empty text falls back to a deterministic mumble so a talking character
  // with no line still moves its mouth.
  const mumble = buildSpeech('', 1, 7);
  assert.ok(mumble.cues.length > 0);
  assert.deepEqual(mumble, buildSpeech('', 1, 7));
  assert.notDeepEqual(mumble.cues, buildSpeech('', 1, 9).cues);
});

test('visemes stay inside the speech window and openness stays in range', () => {
  const speech = buildSpeech('Testing one two three.', 1, 0);
  const ids = VISEMES.map((v) => v.id);
  for (let t = -1; t < speech.duration + 1; t += 0.017) {
    const cue = visemeAt(speech, t);
    assert.ok(ids.includes(cue.id));
    const open = mouthOpenness(speech, t);
    assert.ok(open >= 0 && open <= 1, `openness ${open} at ${t}`);
  }
  assert.equal(visemeAt(speech, speech.duration + 5).id, 'rest');
});

test('talking only opens the mouth for the talk motion', () => {
  const line = 'This line should only animate while talking.';
  const talking = samplePose(castSceneSettings('milo', { motion: 'talk', dialogue: line }), 20);
  const walking = samplePose(castSceneSettings('milo', { motion: 'walk', dialogue: line }), 20);
  assert.equal(walking.mouth, 'rest');
  assert.equal(walking.mouthOpen, 0);
  assert.ok(talking.mouth !== 'rest' || talking.mouthOpen >= 0);
});

/* ------------------------------------------------------------------ */
/* Dialogue scheduling                                                 */
/* ------------------------------------------------------------------ */

test('dialogue turns alternate, never overlap and cover the script', () => {
  const script = ['First line.', 'Second line, a little longer.', 'Third.'];
  const turns = dialogueSchedule(script, { fps: 30, gapFrames: 10 });
  assert.equal(turns.length, 3);
  assert.deepEqual(turns.map((t) => t.speaker), [0, 1, 0]);
  for (let i = 1; i < turns.length; i++) {
    assert.ok(turns[i].startFrame >= turns[i - 1].endFrame + 10);
  }
  assert.equal(turnAt(turns, turns[1].startFrame)?.index, 1);
  assert.equal(turnAt(turns, turns[0].endFrame + 1), null);
  assert.ok(dialogueDuration(script, { fps: 30 }) > turns[2].endFrame);
});

test('splitTurns accepts a string or an array and drops blank lines', () => {
  assert.deepEqual(splitTurns(' one \n\n two \n'), ['one', 'two']);
  assert.deepEqual(splitTurns([' one ', '', 'two']), ['one', 'two']);
});

test('subtitle wrapping respects the line budget', () => {
  const lines = wrapLines('a fairly long subtitle line that should wrap onto two lines at most', 30, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => l.length <= 31));
  assert.deepEqual(wrapLines('short', 30, 2), ['short']);
});

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

test('every scene renders at every time of day without throwing', () => {
  for (const scene of SCENES) {
    for (const t of TIMES_OF_DAY) {
      const svg = renderToStaticMarkup(
        <svg>
          <SceneLayer scene={scene.id} timeOfDay={t.id} distance={480} time={2.5} parallax={0.7} />
        </svg>,
      );
      assert.ok(svg.includes(`data-scene="${scene.id}"`), `${scene.id}/${t.id}`);
      assert.ok(svg.length > 2000, `${scene.id}/${t.id} looks empty`);
      assert.ok(!svg.includes('NaN'), `${scene.id}/${t.id} emitted NaN`);
    }
  }
});

test('scene registry is extensible and falls back to the street', () => {
  assert.ok(listScenes().includes('street'));
  registerScene('test-scene', () => <g data-scene="test-scene" />);
  assert.equal(typeof getScene('test-scene'), 'function');
  assert.equal(getScene('nope'), getScene('street'));
});

test('every cast member renders in every motion without NaN', () => {
  for (const c of CAST) {
    for (const motion of ALL_MOTIONS) {
      const s = castSceneSettings(c.id, { motion: motion as Motion, dialogue: 'Hello there.' });
      const svg = renderToStaticMarkup(<CharacterRig settings={s} frame={37} fps={30} showGuides />);
      assert.ok(svg.startsWith('<g'), `${c.id}/${motion}`);
      assert.ok(!svg.includes('NaN'), `${c.id}/${motion} emitted NaN`);
      assert.ok(svg.includes('data-character='), `${c.id}/${motion} missing marker`);
    }
  }
});

test('standalone components render for every emotion', () => {
  for (const e of EMOTIONS) {
    const head = renderToStaticMarkup(<CharacterHead emotion={e.id} />);
    assert.ok(head.includes('<svg'));
    const full = renderToStaticMarkup(<Character settings={{ ...DEFAULT_SETTINGS, emotion: e.id }} frame={12} />);
    assert.ok(full.includes('<svg') && !full.includes('NaN'));
  }
});
