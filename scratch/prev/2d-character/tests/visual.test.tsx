/**
 * Visual-regression snapshots.
 *
 * The rig is a pure function of `(settings, frame, fps)`, so static markup is
 * a faithful, cheap snapshot: it needs no browser and cannot be OOM-killed.
 * Each render is hashed and compared against `tests/__golden__/visual-hashes.json`.
 *
 * These catch *drawing* regressions the behavioural tests cannot see — a limb
 * that moves, a gradient that changes, a scene layer that disappears. When a
 * diff is intentional, regenerate with `npm run update:visual-goldens` and
 * review the hash change in the commit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CHARACTER_EMOTIONS,
  CHARACTER_MOTIONS,
  GOLDEN_ENTRY_COUNT,
  GOLDEN_PATH,
  buildGoldenEntries,
  goldenMeta,
  renderCharacterRig,
  renderSceneLayer,
} from './visual-goldens';
import { CAST } from '../src/rig/cast';
import { SCENES, TIMES_OF_DAY } from '../src/rig/types';

type GoldenFile = ReturnType<typeof goldenMeta> & { entries: Record<string, string> };

function loadGolden(): GoldenFile {
  let raw: string;
  try {
    raw = readFileSync(GOLDEN_PATH, 'utf8');
  } catch {
    assert.fail(`Missing golden file ${GOLDEN_PATH}. Run \`npm run update:visual-goldens\`.`);
  }
  return JSON.parse(raw) as GoldenFile;
}

test('visual snapshots match the stored golden hashes', () => {
  const golden = loadGolden();
  const meta = goldenMeta();

  // Metadata first: a changed frame/viewBox/matrix must be a conscious
  // regenerating decision, not a silent hash drift.
  assert.equal(golden.version, meta.version, 'golden format version changed');
  assert.equal(golden.frame, meta.frame, 'golden frame changed — regenerate goldens');
  assert.equal(golden.fps, meta.fps, 'golden fps changed — regenerate goldens');
  assert.equal(golden.characterViewBox, meta.characterViewBox, 'character viewBox changed');
  assert.equal(golden.sceneViewBox, meta.sceneViewBox, 'scene viewBox changed');
  assert.deepEqual(golden.scene, meta.scene, 'scene snapshot inputs changed');
  assert.deepEqual(golden.motions, [...meta.motions], 'motion matrix changed');
  assert.deepEqual(golden.emotions, [...meta.emotions], 'emotion matrix changed');

  const actual = buildGoldenEntries();
  const expected = golden.entries;
  assert.equal(
    Object.keys(actual).length,
    GOLDEN_ENTRY_COUNT,
    `snapshot matrix produced ${Object.keys(actual).length} entries, expected ${GOLDEN_ENTRY_COUNT}`,
  );

  const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  assert.deepEqual(
    keys,
    Object.keys(actual).sort(),
    'golden file is missing entries or contains stale ones — run `npm run update:visual-goldens`',
  );

  const mismatched = keys.filter((key) => expected[key] !== actual[key]);
  assert.deepEqual(
    mismatched,
    [],
    `visual regression in: ${mismatched.join(', ')}.\n` +
      'If the change was intentional, regenerate with `npm run update:visual-goldens`.',
  );
});

test('snapshot markup is well-formed and keeps each cast palette', () => {
  // Guard against a "golden" that was regenerated from broken output: the
  // snapshots must still draw the right character and finite geometry.
  for (const c of CAST) {
    const markup = renderCharacterRig(c.id, CHARACTER_MOTIONS[0], CHARACTER_EMOTIONS[0]);
    assert.match(markup, new RegExp(`data-character="${c.id}"`), `${c.id} rig has the wrong identity`);
    assert.ok(
      markup.toLowerCase().includes(c.colors.jacket.toLowerCase()),
      `${c.id} lost its jacket colour ${c.colors.jacket}`,
    );
    for (const bad of ['NaN', 'undefined', 'Infinity']) {
      assert.ok(!markup.includes(bad), `${c.id} markup contains ${bad}`);
    }
  }

  for (const scene of SCENES) {
    for (const timeOfDay of TIMES_OF_DAY) {
      const markup = renderSceneLayer(scene.id, timeOfDay.id);
      for (const bad of ['NaN', 'undefined', 'Infinity']) {
        assert.ok(!markup.includes(bad), `${scene.id}/${timeOfDay.id} markup contains ${bad}`);
      }
    }
  }
});
