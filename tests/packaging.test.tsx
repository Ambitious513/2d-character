/**
 * Phase 4 packaging contract: the public import surface, the versioned preset
 * schema (including v1 migration) and the typed composition factories.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Kit from '../src/index';
import {
  PRESET_SCHEMA_VERSION,
  parsePreset,
  parsePresetOrThrow,
  serializePreset,
  serializePresetJSON,
} from '../src/rig/preset';
import {
  resolveSceneComposition,
  resolveCharacterComposition,
  resolveDialogueComposition,
  CastCompositions,
} from '../src/remotion/factories';
import { sceneSchema as rootSchema } from '../src/remotion/Root';
import { sceneSchema as rigSchema } from '../src/rig/schema';
import { PRESETS } from '../src/rig/presets';
import { CAST, castSceneSettings, getCharacter, listCharacters } from '../src/rig/cast';
import { DEFAULT_SETTINGS, type SceneSettings } from '../src/rig/types';
import { dialogueDuration, dialogueSchedule } from '../src/rig/dialogue';
import pkg from '../package.json';

/** Compare through JSON, so `undefined`-valued keys do not cause false diffs. */
const norm = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/* ------------------------------------------------------------------ */
/* Public surface                                                      */
/* ------------------------------------------------------------------ */

test('the barrel exposes the documented public API', () => {
  const expected = [
    // components
    'CharacterRig', 'Character', 'CharacterHead', 'Face', 'SceneLayer', 'Environment',
    // compositions
    'WalkScene', 'CharacterOnly', 'SceneOnly', 'CastScene', 'CastSheet', 'MotionSheet',
    'EmotionSheet', 'TalkingHead', 'DialogueScene', 'RemotionRoot',
    // factories
    'SceneComposition', 'CharacterComposition', 'DialogueComposition', 'CastCompositions',
    // data + helpers
    'CAST', 'PRESETS', 'DEFAULT_SETTINGS', 'castSceneSettings', 'characterSettings',
    'registerCharacter', 'registerScene', 'samplePose', 'solveJoint', 'buildSpeech',
    'dialogueSchedule', 'mergeSettings', 'stableId', 'shade',
    // schema + presets
    'sceneSchema', 'presetSettingsSchema', 'PRESET_SCHEMA_VERSION',
    'serializePreset', 'parsePreset', 'VERSION',
  ];
  for (const name of expected) {
    assert.ok(name in Kit, `src/index.ts is missing export: ${name}`);
  }
});

test('the schema is shared, not duplicated', () => {
  assert.equal(rootSchema, rigSchema, 'Root must re-export the rig schema, not redefine it');
  assert.equal(Kit.sceneSchema, rigSchema);
});

test('the barrel does not leak the studio UI', () => {
  assert.ok(!('Inspector' in Kit), 'studio UI is an app, not part of the library');
  assert.ok(!('App' in Kit));
});

test('the barrel does not leak the docs UI', () => {
  // `src/docs` is an app consumer, exactly like `src/ui`. A host importing the
  // kit must never pull a docs page, a Player wrapper or a docs control in.
  const docsOnly = [
    'DocsSite', 'DocsPlayer', 'Playground', 'PLAYGROUND_DEFAULT', 'CompositionExplorer',
    'CastMotionExplorer', 'SceneExplorer', 'PresetPanel', 'CodeBlock', 'SectionHead',
    'Segmented', 'Slider', 'Select', 'Switch', 'Group', 'playgroundSnippet', 'propsExpression',
  ];
  for (const name of docsOnly) {
    assert.ok(!(name in Kit), `src/index.ts leaks docs UI: ${name}`);
  }
});

test('nothing reachable from the barrel imports an app layer', () => {
  // Stronger than the name checks above: walk the real relative-import graph
  // from src/index.ts and prove no path reaches src/docs, src/ui or the app
  // entry points. A re-export or a dynamic import would be caught here even if
  // the leaked symbol were renamed.
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
  const entry = join(srcRoot, 'index.ts');
  const appLayers = [join(srcRoot, 'docs'), join(srcRoot, 'ui')];
  const appFiles = [join(srcRoot, 'App.tsx'), join(srcRoot, 'main.tsx')];

  /** Resolve a relative specifier the way the bundler does (ts/tsx/index). */
  const resolveModule = (from: string, spec: string): string | null => {
    if (!spec.startsWith('.')) return null; // bare package, not our code
    const base = resolve(dirname(from), spec);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
  };

  const seen = new Set<string>();
  const queue = [entry];
  const offenders: string[] = [];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (appFiles.includes(file) || appLayers.some((dir) => file.startsWith(dir + sep))) {
      offenders.push(relative(srcRoot, file));
      continue;
    }
    const source = readFileSync(file, 'utf8');
    // Static imports, re-exports, side-effect imports and lazy import().
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s*)['"]([^'"]+)['"]/gm)) {
      const resolved = resolveModule(file, match[1]);
      if (resolved) queue.push(resolved);
    }
  }

  assert.deepEqual(offenders, [], `the public barrel reaches app code: ${offenders.join(', ')}`);
  assert.ok(seen.size >= 20, `import walk only visited ${seen.size} files — the scan is broken, not the code clean`);
});

test('the exported VERSION matches package.json', () => {
  // These drifted apart once (barrel said 2.2.0, package.json said 2.1.0).
  // A host that logs Kit.VERSION must be reporting the real package version.
  assert.equal(
    Kit.VERSION,
    pkg.version,
    'src/index.ts VERSION and package.json version must be bumped together',
  );
});

/* ------------------------------------------------------------------ */
/* Preset envelope + round trip                                        */
/* ------------------------------------------------------------------ */

test('serialize wraps settings in the current version envelope', () => {
  const settings = castSceneSettings('ada', { motion: 'run' });
  const file = serializePreset(settings, { name: 'Ada runs', note: 'test' });
  assert.equal(file.version, PRESET_SCHEMA_VERSION);
  assert.equal(file.name, 'Ada runs');
  assert.equal(file.note, 'test');
  assert.ok(!('environment' in file.settings), 'legacy key must not be written out');
});

test('a serialized preset round-trips without loss', () => {
  for (const c of CAST) {
    const settings = castSceneSettings(c.id, { motion: 'talk', dialogue: 'Round trip me.' });
    const json = serializePresetJSON(settings, { name: `${c.name} look` });
    const result = parsePreset(json);
    assert.ok(result.ok, `${c.id}: ${result.ok ? '' : result.errors.join('; ')}`);
    if (result.ok) {
      assert.deepEqual(norm(result.preset.settings), norm(settings), c.id);
      assert.equal(result.migratedFrom, null, 'a current-version file is not a migration');
    }
  }
});

test('every built-in preset survives a round trip', () => {
  for (const p of PRESETS) {
    const result = parsePreset(serializePreset(p.settings, { name: p.name, note: p.note }));
    assert.ok(result.ok, p.name);
    if (result.ok) assert.deepEqual(norm(result.preset.settings), norm(p.settings), p.name);
  }
});

/* ------------------------------------------------------------------ */
/* Migration of every historical shape                                 */
/* ------------------------------------------------------------------ */

test('v1 bare settings are upgraded and environment maps to timeOfDay', () => {
  // Exactly what v1's "Export props JSON" button produced.
  const v1 = { ...DEFAULT_SETTINGS, environment: 'night' as const };
  delete (v1 as Partial<SceneSettings>).timeOfDay;
  const result = parsePreset(v1);
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.preset.version, PRESET_SCHEMA_VERSION);
    assert.equal(result.preset.settings.timeOfDay, 'night');
    assert.ok(!('environment' in result.preset.settings));
    assert.equal(result.migratedFrom, 1);
  }
});

test('explicit timeOfDay beats the legacy environment key', () => {
  const result = parsePreset({ character: 'milo', environment: 'night', timeOfDay: 'golden' });
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.preset.settings.timeOfDay, 'golden');
});

test('a v1 envelope is accepted and flagged as migrated', () => {
  const result = parsePreset({ version: 1, name: 'Old', settings: { character: 'kwame', environment: 'golden' } });
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.migratedFrom, 1);
    assert.equal(result.preset.settings.timeOfDay, 'golden');
    assert.equal(result.preset.settings.build, 'broad');
  }
});

test('the studio ScenePreset shape (name/note/settings, no version) loads', () => {
  const result = parsePreset({ name: 'Studio look', note: 'saved locally', settings: { character: 'juno' } });
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.preset.name, 'Studio look');
    assert.equal(result.preset.note, 'saved locally');
    assert.equal(result.preset.settings.character, 'juno');
  }
});

test('a minimal preset is filled from the cast registry, not flat defaults', () => {
  const result = parsePreset({ character: 'kwame' });
  assert.ok(result.ok);
  if (result.ok) {
    const s = result.preset.settings;
    assert.equal(s.build, 'broad');
    assert.equal(s.hair, getCharacter('kwame').hair);
    assert.equal(s.colors.jacket, getCharacter('kwame').colors.jacket);
    assert.equal(s.beard, true);
    // Every required field is present and finite.
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SceneSettings)[]) {
      assert.ok(key in s, `missing ${key}`);
    }
  }
});

test('cast proportion overrides survive parsing', () => {
  const result = parsePreset({ character: 'ravi' });
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.preset.settings.proportions?.torsoLength, 90);
    assert.equal(result.preset.settings.proportions?.shoulderWidth, 34);
  }
});

test('explicit proportion overrides win over the cast', () => {
  const result = parsePreset({ character: 'ravi', proportions: { torsoLength: 100 } });
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.preset.settings.proportions?.torsoLength, 100);
});

test('unknown keys are dropped rather than smuggled through', () => {
  const result = parsePreset({ character: 'milo', somethingMadeUp: 42 });
  assert.ok(result.ok);
  if (result.ok) assert.ok(!('somethingMadeUp' in result.preset.settings));
});

test('a malformed settings envelope is an error, not a silent default', () => {
  for (const bad of [{ settings: 5 }, { settings: null }, { settings: 'x' }, { settings: [] }]) {
    const result = parsePreset(bad);
    assert.ok(!result.ok, `accepted malformed envelope: ${JSON.stringify(bad)}`);
  }
});

/* ------------------------------------------------------------------ */
/* Failure modes — parsePreset must never throw                        */
/* ------------------------------------------------------------------ */

test('invalid values produce readable errors instead of throwing', () => {
  const bad = parsePreset({ character: 'milo', speed: 99 });
  assert.ok(!bad.ok);
  if (!bad.ok) assert.ok(bad.errors.some((e) => e.includes('speed')), bad.errors.join('; '));
});

test('an unknown character is rejected with a helpful message', () => {
  const result = parsePreset({ character: 'nobody' });
  assert.ok(!result.ok);
  if (!result.ok) assert.match(result.errors[0], /Unknown character/);
});

test('a preset from a newer version is refused', () => {
  const result = parsePreset({ version: PRESET_SCHEMA_VERSION + 1, settings: { character: 'milo' } });
  assert.ok(!result.ok);
  if (!result.ok) assert.match(result.errors[0], /newer than this build/);
});

test('junk input is rejected, never thrown', () => {
  for (const junk of [null, undefined, 42, 'not json', '[]', [], true, { settings: 5 }]) {
    const result = parsePreset(junk);
    assert.ok(!result.ok, `accepted junk: ${JSON.stringify(junk)}`);
  }
  assert.throws(() => parsePresetOrThrow({ speed: -1 }), /Invalid preset/);
});

test('a JSON string is accepted directly', () => {
  const result = parsePreset('{"character":"pip","motion":"jump"}');
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.preset.settings.motion, 'jump');
});

/* ------------------------------------------------------------------ */
/* Composition factories                                               */
/* ------------------------------------------------------------------ */

test('scene factory resolves cast-aware defaults and geometry', () => {
  const r = resolveSceneComposition({ id: 'Hero', character: 'ada', overrides: { motion: 'run' } });
  assert.equal(r.fps, 30);
  assert.equal(r.width, 1280);
  assert.equal(r.height, 720);
  assert.equal(r.durationInFrames, 300);
  assert.equal(r.defaultProps.character, 'ada');
  assert.equal(r.defaultProps.motion, 'run');
  assert.equal(r.defaultProps.outfit, 'hoodie');
});

test('scene factory honours explicit geometry and overrides.character', () => {
  const r = resolveSceneComposition({
    id: 'Custom',
    character: 'milo',
    fps: 24,
    width: 1920,
    height: 1080,
    durationInFrames: 90,
    overrides: { character: 'pip', scale: 1.4 },
  });
  assert.equal(r.fps, 24);
  assert.equal(r.width, 1920);
  assert.equal(r.height, 1080);
  assert.equal(r.durationInFrames, 90);
  assert.equal(r.defaultProps.character, 'pip');
  assert.equal(r.defaultProps.scale, 1.4);
});

test('character factory is square, transparent-ready and hides guides', () => {
  const r = resolveCharacterComposition({ id: 'Alpha', character: 'juno', overrides: { guides: true } });
  assert.equal(r.width, 720);
  assert.equal(r.height, 720);
  assert.equal(r.defaultProps.guides, false, 'alpha plates must never bake in rig guides');
  const big = resolveCharacterComposition({ id: 'Big', size: 1080 });
  assert.equal(big.width, 1080);
  assert.equal(big.height, 1080);
});

test('dialogue factory derives a duration that covers the whole script', () => {
  const script = ['Hello there.', 'A slightly longer second line for timing.', 'Bye.'];
  const r = resolveDialogueComposition({ id: 'Chat', script, gapFrames: 10 });
  const turns = dialogueSchedule(script, { fps: r.fps, gapFrames: 10, speechRate: r.defaultProps.speechRate });
  assert.ok(
    r.durationInFrames >= turns[turns.length - 1].endFrame,
    `duration ${r.durationInFrames} truncates the script (ends ${turns[turns.length - 1].endFrame})`,
  );
  assert.equal(
    r.durationInFrames,
    dialogueDuration(script, { fps: r.fps, gapFrames: 10, speechRate: r.defaultProps.speechRate }),
  );
  assert.deepEqual(r.defaultProps.script, script);
  assert.deepEqual(r.defaultProps.speakers, ['milo', 'ada']);
  assert.equal(r.defaultProps.gapFrames, 10);
});

test('dialogue duration responds to speechRate and explicit overrides', () => {
  const script = ['One two three four five six seven eight.'];
  const slow = resolveDialogueComposition({ id: 'S', script, overrides: { speechRate: 0.6 } });
  const fast = resolveDialogueComposition({ id: 'F', script, overrides: { speechRate: 1.8 } });
  assert.ok(slow.durationInFrames > fast.durationInFrames, 'slower speech must be longer');
  const pinned = resolveDialogueComposition({ id: 'P', script, durationInFrames: 500 });
  assert.equal(pinned.durationInFrames, 500);
});

test('dialogue factory defaults to a backdrop with subtitles on', () => {
  const r = resolveDialogueComposition({ id: 'Chat' });
  assert.equal(r.defaultProps.scene, 'backdrop');
  assert.equal(r.defaultProps.showSubtitles, true);
});

test('cast factory produces one composition per registered member', () => {
  const elements = CastCompositions();
  assert.equal(elements.length, listCharacters().length);
  const ids = elements.map((e) => (e.props as { id: string }).id);
  assert.deepEqual(ids, listCharacters().map((c) => `Walk-${c.name}`));
  assert.equal(new Set(ids).size, ids.length, 'composition ids must be unique');
  const custom = CastCompositions({ prefix: 'Stroll-' });
  assert.equal((custom[0].props as { id: string }).id, 'Stroll-Milo');
});
