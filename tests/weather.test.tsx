/**
 * Weather contract tests — docs/PHASE-5.1-SPEC.md §3, §4, §5.
 *
 * The #1 historical bug class here is nondeterminism (gradient ids shipped
 * broken twice because of render-order-dependent ids), so the tests enforce
 * purity first: clear-identity, frame-order independence, repeat stability,
 * tile continuity. Node budgets and the indoor rule pin the visual spec.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { Internals } from 'remotion';
import { SceneLayer, WeatherLayer, WeatherFront, isIndoorScene } from '../src/rig/environments';
import { hash01, wrap, mix } from '../src/rig/environments/weather-math';
import { TILE } from '../src/rig/environments/shared';
import { paletteFor, PALETTES } from '../src/rig/environments/palette';
import { WalkScene, CharacterOnly, mergeSettings } from '../src/remotion/Compositions';
import { parsePreset, serializePreset, PRESET_SCHEMA_VERSION } from '../src/rig/preset';
import { castSceneSettings } from '../src/rig/cast';
import { SCENES, TIMES_OF_DAY, DEFAULT_SETTINGS } from '../src/rig/types';
import type { SceneId, TimeOfDay, Weather } from '../src/rig/types';

const ACTIVE_WEATHERS: Weather[] = ['rain', 'snow', 'fog'];
const FPS = 30;

/** All element open-tags in a markup fragment. */
function elementCount(markup: string): number {
  return (markup.match(/<(?!\/)[a-zA-Z]/g) ?? []).length;
}

function countTag(markup: string, tag: string): number {
  return (markup.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
}

/** Render one scene plate with a weather setting, exactly as a host would. */
function renderScene(scene: SceneId, timeOfDay: TimeOfDay, weather: Weather, overrides: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <SceneLayer scene={scene} timeOfDay={timeOfDay} weather={weather} distance={320} direction={1} parallax={0.7} time={2} {...overrides} />
    </svg>,
  );
}

/* ------------------------------------------------------------------ */
/* Remotion composition harness (headless, contexts pre-wired)         */
/* ------------------------------------------------------------------ */

const VIDEO = {
  id: 'Probe',
  width: 1280,
  height: 720,
  fps: FPS,
  durationInFrames: 300,
  defaultProps: {},
  props: {},
};

/** Render a composition at a frame without a Remotion Player. */
function renderComposition(comp: React.ReactElement, frame: number): string {
  const contexts = {
    canUseRemotionHooksContext: true,
    videoContext: VIDEO,
    timelineContext: { frame: { [VIDEO.id]: frame } },
    setTimelineContext: () => {},
    sequenceContext: null,
    // The rig's timed sections register themselves as Remotion <Sequence>s;
    // outside a real composition they need no-op manager actions.
    sequenceManagerActionsContext: { registerSequence() {}, updateSequence() {}, unregisterSequence() {} },
  };
  return renderToStaticMarkup(
    <Internals.RemotionContextProvider contexts={contexts as never}>
      {comp}
    </Internals.RemotionContextProvider>,
  );
}

/* ------------------------------------------------------------------ */
/* 1. Clear identity — the acceptance criterion that matters           */
/* ------------------------------------------------------------------ */

test('weather clear is byte-identical to no weather prop, for every scene and lighting pass', () => {
  for (const scene of SCENES) {
    for (const tod of TIMES_OF_DAY) {
      const without = renderToStaticMarkup(
        <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
          <SceneLayer scene={scene.id} timeOfDay={tod.id} distance={320} direction={1} parallax={0.7} time={2} />
        </svg>,
      );
      const clear = renderScene(scene.id, tod.id, 'clear');
      assert.equal(clear, without, `${scene.id}/${tod.id}: clear must not change one byte of markup`);
      assert.ok(!clear.includes('data-weather'), `${scene.id}/${tod.id}: clear must emit no data-weather`);
    }
  }
});

test('DEFAULT_SETTINGS and resolved environments default to clear', () => {
  assert.equal(DEFAULT_SETTINGS.weather, 'clear');
  assert.equal(castSceneSettings('milo').weather, 'clear');
  assert.equal(mergeSettings({ scene: 'park' }).weather, 'clear');
});

/* ------------------------------------------------------------------ */
/* 2. Frame-order independence                                         */
/* ------------------------------------------------------------------ */

test('rain renders identically no matter which order frames are drawn in', () => {
  const frames = [90, 0, 37, 7];
  const renderAt = (f: number) =>
    renderScene('street', 'day', 'rain', { distance: f * 2.2, time: f / FPS });
  const firstPass = new Map(frames.map((f) => [f, renderAt(f)]));
  const secondPass = new Map([...frames].sort((a, b) => a - b).map((f) => [f, renderAt(f)]));
  for (const f of frames) {
    assert.equal(firstPass.get(f), secondPass.get(f), `frame ${f} drifted — the field reads a clock or a counter`);
  }
});

/* ------------------------------------------------------------------ */
/* 3. Repeat-render stability (both passes)                            */
/* ------------------------------------------------------------------ */

test('same inputs twice produce identical markup, back and front pass', () => {
  for (const weather of ACTIVE_WEATHERS) {
    for (const tod of TIMES_OF_DAY) {
      const a = renderScene('park', tod.id, weather);
      const b = renderScene('park', tod.id, weather);
      assert.equal(a, b, `${weather}/${tod.id} back pass is not byte-stable`);
      const fa = renderToStaticMarkup(
        <WeatherFront weather={weather} timeOfDay={tod.id} time={1.5} distance={220} direction={1} />,
      );
      const fb = renderToStaticMarkup(
        <WeatherFront weather={weather} timeOfDay={tod.id} time={1.5} distance={220} direction={1} />,
      );
      assert.equal(fa, fb, `${weather}/${tod.id} front pass is not byte-stable`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* 4. Tile continuity                                                  */
/* ------------------------------------------------------------------ */

test('the particle field at distance d and d + TILE/factor is the same set', () => {
  const time = 1.7;
  for (const [weather, factor] of [['rain', 0.85], ['snow', 0.85], ['rain', 1.15], ['snow', 1.15]] as const) {
    const pass = factor === 0.85 ? 'back' : 'front';
    const markupAt = (d: number) =>
      renderToStaticMarkup(
        <WeatherLayer weather={weather} timeOfDay="day" time={time} distance={d} direction={1} pass={pass} />,
      );
    const d = 940;
    assert.equal(
      markupAt(d),
      markupAt(d + TILE / factor),
      `${weather} ${pass}: field does not loop seamlessly after one tile of travel`,
    );
  }
});

test('no particle lands outside [-TILE, WIDTH + TILE]', () => {
  for (const weather of ['rain', 'snow'] as const) {
    for (const pass of ['back', 'front'] as const) {
      const markup = renderToStaticMarkup(
        <WeatherLayer weather={weather} timeOfDay="day" time={4.2} distance={5000} direction={-1} pass={pass} />,
      );
      const xs = [
        ...[...markup.matchAll(/ cx="(-?[\d.]+)"/g)].map((m) => Number(m[1])),
        ...[...markup.matchAll(/[ML] (-?[\d.]+) /g)].map((m) => Number(m[1])),
      ];
      assert.ok(xs.length > 0, `${weather}/${pass}: expected drawn geometry`);
      for (const x of xs) {
        assert.ok(
          x >= -TILE && x <= 1280 + TILE,
          `${weather}/${pass}: particle at x=${x} is outside the tile bounds`,
        );
      }
    }
  }
});

/* ------------------------------------------------------------------ */
/* 5. Node budgets (spec §5.4)                                         */
/* ------------------------------------------------------------------ */

test('per-pass node budgets: rain ≤ 130, snow ≤ 100, fog ≤ 10', () => {
  for (const pass of ['back', 'front'] as const) {
    const count = (weather: Weather) =>
      elementCount(
        renderToStaticMarkup(
          <WeatherLayer weather={weather} timeOfDay="day" time={2.5} distance={300} direction={1} pass={pass} />,
        ),
      );
    assert.ok(count('rain') <= 130, `rain ${pass} uses ${count('rain')} nodes (budget 130)`);
    assert.ok(count('snow') <= 100, `snow ${pass} uses ${count('snow')} nodes (budget 100)`);
    assert.ok(count('fog') <= 10, `fog ${pass} uses ${count('fog')} nodes (budget 10)`);
  }
  // sanity: the budgets are not trivially passing on empty output (the drawn
  // count sits below the nominal 90 because offscreen seam copies are culled)
  assert.ok(elementCount(renderToStaticMarkup(<WeatherLayer weather="rain" timeOfDay="day" time={1} distance={0} direction={1} pass="back" />)) >= 70);
});

/* ------------------------------------------------------------------ */
/* 6. The indoor rule                                                  */
/* ------------------------------------------------------------------ */

test('room is indoors: zero precipitation particles, veil only', () => {
  for (const weather of ['rain', 'snow'] as const) {
    const markup = renderScene('room', 'day', weather);
    const weatherGroup = markup.slice(markup.indexOf('data-weather-pass='));
    assert.ok(weatherGroup.includes('data-weather'), 'weather wrapper missing');
    assert.equal(countTag(weatherGroup, 'path'), 0, `${weather}: room emitted streak geometry`);
    assert.equal(countTag(weatherGroup, 'circle'), 0, `${weather}: room emitted flake geometry`);
    assert.equal(countTag(weatherGroup, 'ellipse'), 0, `${weather}: room emitted splash/sheen geometry`);
  }
  // fog indoors is allowed, at reduced opacity
  assert.ok(renderScene('room', 'day', 'fog').includes('data-weather-pass="front"') === false, 'front veil is drawn by compositions, not SceneLayer');
  assert.equal(isIndoorScene('room'), true);
  assert.equal(isIndoorScene('street'), false);
  assert.equal(isIndoorScene('backdrop'), false, 'backdrop is a cyclorama — a look, not a place');
});

test('outdoor scenes do draw precipitation', () => {
  const rain = renderScene('street', 'day', 'rain');
  assert.ok(countTag(rain, 'path') > 50, 'street rain drew no streaks');
  const snow = renderScene('park', 'golden', 'snow');
  assert.ok(countTag(snow, 'circle') > 50, 'park snow drew no flakes');
});

/* ------------------------------------------------------------------ */
/* 7. Palette orthogonality                                            */
/* ------------------------------------------------------------------ */

test('weather never mutates the palettes and derives its colours from them', () => {
  const before = JSON.stringify(PALETTES);
  for (const scene of SCENES) {
    for (const tod of TIMES_OF_DAY) {
      for (const w of ACTIVE_WEATHERS) renderScene(scene.id, tod.id, w);
    }
  }
  assert.equal(JSON.stringify(PALETTES), before, 'weather mutated PALETTES');
  assert.deepEqual(paletteFor('night'), PALETTES.night);

  // Rain streak colour is mix(skyBottom, white, .35) of the active palette.
  const p = paletteFor('golden');
  const expected = mix(p.skyBottom, '#FFFFFF', 0.35);
  assert.ok(
    renderScene('street', 'golden', 'rain').includes(expected),
    `rain streaks should use ${expected}`,
  );
});

/* ------------------------------------------------------------------ */
/* 8. Composition integration + alpha-plate purity                     */
/* ------------------------------------------------------------------ */

test('WalkScene draws both passes around the character; fog veils it', () => {
  const settings = mergeSettings({ scene: 'street', weather: 'rain' });
  const markup = renderComposition(<WalkScene weather="rain" />, 42);
  assert.ok(markup.includes('data-weather="rain"'), 'WalkScene lost the weather wrapper');
  // Front pass streaks are drawn after the rig: their opacity (.22) is unique to that pass.
  assert.ok(
    markup.includes('stroke-linecap="round"') && markup.includes('opacity="0.22"'),
    'WalkScene is missing the front rain pass',
  );
  // The character is still present between the passes.
  assert.ok(markup.includes(`data-character="${settings.character}"`), 'character missing');

  const fog = renderComposition(<WalkScene scene="street" weather="fog" />, 42);
  assert.ok(fog.includes('data-weather="fog"'), 'fog wrapper missing');
});

test('CharacterOnly never gets weather at any setting', () => {
  for (const w of ACTIVE_WEATHERS) {
    const markup = renderComposition(<CharacterOnly weather={w} />, 33);
    assert.ok(!markup.includes('data-weather'), `alpha plate leaked weather ${w}`);
    assert.ok(!markup.includes('data-weather-pass'), `alpha plate leaked a weather pass (${w})`);
    assert.ok(!markup.includes('stride-wx'), `alpha plate leaked a weather gradient id (${w})`);
  }
});

/* ------------------------------------------------------------------ */
/* 9. Schema / preset                                                  */
/* ------------------------------------------------------------------ */

test('presets: additive weather field, v2 stays v2, invalid values rejected', () => {
  assert.equal(PRESET_SCHEMA_VERSION, 2, 'schema version must stay 2');

  const minimal = parsePreset({ character: 'kwame' });
  assert.ok(minimal.ok);
  if (minimal.ok) assert.equal(minimal.preset.settings.weather, 'clear', 'missing weather must default to clear');

  const v1 = parsePreset({ version: 1, name: 'old', settings: { character: 'ada', environment: 'golden' } });
  assert.ok(v1.ok);
  if (v1.ok) {
    assert.equal(v1.preset.settings.weather, 'clear', 'v1 envelope must degrade to clear');
    assert.equal(v1.preset.settings.timeOfDay, 'golden');
  }

  const snow = serializePreset(castSceneSettings('milo', { weather: 'snow' }), { name: 'Snowy' });
  assert.equal(snow.settings.weather, 'snow', 'serializePreset must emit weather');
  const roundTrip = parsePreset(JSON.stringify(snow));
  assert.ok(roundTrip.ok);
  if (roundTrip.ok) assert.equal(roundTrip.preset.settings.weather, 'snow');

  const bad = parsePreset({ character: 'milo', weather: 'hail' });
  assert.ok(!bad.ok, "weather: 'hail' must be rejected");
  if (!bad.ok) assert.ok(bad.errors.some((e) => e.toLowerCase().includes('weather')), `errors not readable: ${bad.errors.join('; ')}`);
});

/* ------------------------------------------------------------------ */
/* 10. Determinism audit — the grep is the backstop                    */
/* ------------------------------------------------------------------ */

test('no clocks, randomness or hook ids anywhere in the render path', () => {
  const banned = /Math\.random|Date\.now|performance\.now|useId\(/;
  const offenders: string[] = [];
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith('.d.ts')) {
        const src = stripComments(readFileSync(full, 'utf8'));
        if (banned.test(src)) offenders.push(full);
      }
    }
  };
  walk('src/rig');
  walk('src/remotion');
  assert.deepEqual(offenders, [], `nondeterminism in the render path: ${offenders.join(', ')}`);
});

/* ------------------------------------------------------------------ */
/* 11. hash01 / wrap sanity (the primitives everything leans on)       */
/* ------------------------------------------------------------------ */

test('hash01 is stable, in-range and decorrelated by salt', () => {
  assert.equal(hash01(123, 4), hash01(123, 4), 'same inputs must give the same value');
  assert.notEqual(hash01(123, 4), hash01(123, 5), 'salts must decorrelate');
  for (let i = 0; i < 500; i += 1) {
    const v = hash01(i, i % 7);
    assert.ok(v >= 0 && v < 1, `hash01 out of range: ${v}`);
  }
  assert.equal(wrap(-5, 100), 95);
  assert.equal(wrap(205, 100), 5);
  assert.equal(wrap(1600 * 3 + 12, 1600), 12);
});
