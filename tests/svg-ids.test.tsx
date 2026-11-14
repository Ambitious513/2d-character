/**
 * SVG resource-id contract.
 *
 * REGRESSION GUARD — read this before touching gradient ids.
 *
 * Every `<linearGradient>` / `<radialGradient>` id must be derived from the
 * *content* of the resource (see `src/rig/id.ts`), never from `useId()`.
 *
 * `useId()` restarts its counter per React render root. Rendering six cast
 * members through six separate `renderToStaticMarkup` calls therefore emitted
 * six gradients all called `garment-R0`. When those fragments are placed in one
 * document (a contact sheet, a scene sheet, an SVG sprite, a Remotion frame with
 * several rigs) the browser resolves `url(#garment-R0)` to the FIRST definition
 * and every character wears Milo's jacket. The same applies to environment
 * skies: day / golden / night all collapsed onto the day gradient.
 *
 * This happened once and was fixed; a later commit deleted `id.ts` and silently
 * reintroduced it because nothing tested for it. These tests are that thing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterRig, Character } from '../src/rig/Character';
import { SceneLayer } from '../src/rig/environments';
import { CAST, castSceneSettings, characterSettings } from '../src/rig/cast';
import { stableId } from '../src/rig/id';
import { SCENES, TIMES_OF_DAY } from '../src/rig/types';

/** Every `id="…"` declared in a markup fragment. */
function declaredIds(markup: string): string[] {
  return [...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
}

/** Every `url(#…)` paint reference in a markup fragment. */
function referencedIds(markup: string): string[] {
  return [...markup.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
}

/**
 * The core invariant: a fragment must be self-contained. Every paint reference
 * it makes must resolve to a definition inside that same fragment.
 */
function assertSelfContained(markup: string, label: string): void {
  const declared = new Set(declaredIds(markup));
  for (const ref of referencedIds(markup)) {
    assert.ok(declared.has(ref), `${label}: url(#${ref}) has no matching definition in its own root`);
  }
}

/* ------------------------------------------------------------------ */
/* stableId itself                                                     */
/* ------------------------------------------------------------------ */

test('stableId is a pure content hash: same inputs, same id', () => {
  assert.equal(stableId('garment', '#F26B38'), stableId('garment', '#F26B38'));
  assert.notEqual(stableId('garment', '#F26B38'), stableId('garment', '#365DE6'));
  assert.notEqual(stableId('garment', '#F26B38'), stableId('sky', '#F26B38'));
});

test('stableId is namespaced and safe to use as an SVG id', () => {
  const id = stableId('garment', '#F26B38', 0.5, 'x|y');
  assert.match(id, /^stride-garment-[a-z0-9]+$/);
  // Must not contain characters that need escaping inside url(#…).
  assert.ok(!/[ :#()]/.test(id), id);
});

test('stableId separates parts unambiguously', () => {
  // Joining on '|' means these must not collide.
  assert.notEqual(stableId('p', 'a', 'bc'), stableId('p', 'ab', 'c'));
});

/* ------------------------------------------------------------------ */
/* Character rigs                                                      */
/* ------------------------------------------------------------------ */

test('cast members rendered in separate roots get distinct gradient ids', () => {
  const ids = CAST.map((c) => {
    const markup = renderToStaticMarkup(
      <svg>
        <CharacterRig settings={{ ...characterSettings(c.id), motion: 'idle' }} frame={12} />
      </svg>,
    );
    assertSelfContained(markup, c.id);
    const gradients = [...markup.matchAll(/linearGradient id="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(gradients.length, 1, `${c.id} should declare exactly one garment gradient`);
    return gradients[0];
  });
  assert.equal(
    new Set(ids).size,
    CAST.length,
    `gradient ids collided across render roots: ${ids.join(', ')}`,
  );
});

test('each cast member keeps its own jacket colour in its own root', () => {
  // The visible symptom of the collision: every character rendered orange.
  for (const c of CAST) {
    const markup = renderToStaticMarkup(
      <svg>
        <CharacterRig settings={{ ...characterSettings(c.id), motion: 'idle' }} frame={12} />
      </svg>,
    );
    const stops = [...markup.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1].toUpperCase());
    assert.ok(
      stops.includes(c.colors.jacket.toUpperCase()),
      `${c.id} lost its jacket colour ${c.colors.jacket}; stops were ${stops.join(', ')}`,
    );
  }
});

test('a multi-character document declares no duplicate ids', () => {
  // This is what CastSheet / the contact sheet actually produce.
  const markup = renderToStaticMarkup(
    <svg>
      {CAST.map((c) => (
        <CharacterRig key={c.id} settings={{ ...characterSettings(c.id), motion: 'idle' }} frame={12} />
      ))}
    </svg>,
  );
  const ids = declaredIds(markup);
  assert.equal(new Set(ids).size, ids.length, `duplicate ids in one document: ${ids.join(', ')}`);
  assertSelfContained(markup, 'cast document');
});

test('identical palettes deduplicate to one shared id', () => {
  const a = renderToStaticMarkup(<CharacterRig settings={characterSettings('milo')} frame={3} />);
  const b = renderToStaticMarkup(<CharacterRig settings={characterSettings('milo')} frame={90} />);
  const idOf = (s: string) => s.match(/linearGradient id="([^"]+)"/)?.[1];
  assert.equal(idOf(a), idOf(b), 'same palette at different frames must share one gradient id');
});

test('recolouring a character changes its gradient id', () => {
  const base = characterSettings('milo');
  const a = renderToStaticMarkup(<CharacterRig settings={base} frame={3} />);
  const b = renderToStaticMarkup(
    <CharacterRig settings={{ ...base, colors: { ...base.colors, jacket: '#123456' } }} frame={3} />,
  );
  const idOf = (s: string) => s.match(/linearGradient id="([^"]+)"/)?.[1];
  assert.notEqual(idOf(a), idOf(b));
});

test('rig markup is byte-stable across repeated renders', () => {
  const s = castSceneSettings('ada', { motion: 'walk' });
  const once = renderToStaticMarkup(<CharacterRig settings={s} frame={41} />);
  const twice = renderToStaticMarkup(<CharacterRig settings={s} frame={41} />);
  assert.equal(once, twice, 'ids must not depend on render order or a hook counter');
});

test('standalone Character SVG is self-contained', () => {
  const markup = renderToStaticMarkup(<Character settings={castSceneSettings('kwame')} frame={20} />);
  assertSelfContained(markup, 'Character');
});

test('concatenated separate roots keep their own palettes (contact-sheet case)', () => {
  // The real-world failure: scripts/contact-sheet.tsx renders each panel with
  // its own renderToStaticMarkup call, then joins the HTML into one document.
  // With useId() every panel referenced #garment-R0, so the browser resolved
  // them all to the first panel's gradient and the whole cast wore orange.
  const fragments = CAST.map((c) =>
    renderToStaticMarkup(
      <svg>
        <CharacterRig settings={{ ...characterSettings(c.id), motion: 'idle' }} frame={12} />
      </svg>,
    ),
  );
  const document = fragments.join('');

  // First definition of each id wins in a browser; emulate that resolution.
  const firstDef = new Map<string, string>();
  for (const m of document.matchAll(/<linearGradient id="([^"]+)"[^>]*>(.*?)<\/linearGradient>/gs)) {
    if (!firstDef.has(m[1])) firstDef.set(m[1], m[2]);
  }

  CAST.forEach((c, i) => {
    const ref = fragments[i].match(/url\(#([^)]+)\)/)?.[1];
    assert.ok(ref, `${c.id} makes no paint reference`);
    const resolved = firstDef.get(ref!) ?? '';
    assert.ok(
      resolved.toUpperCase().includes(c.colors.jacket.toUpperCase()),
      `${c.id} resolved to another character's gradient (expected ${c.colors.jacket})`,
    );
  });
});

/* ------------------------------------------------------------------ */
/* Environments                                                        */
/* ------------------------------------------------------------------ */

test('every scene keeps a distinct gradient per lighting pass across roots', () => {
  for (const scene of SCENES) {
    const ids: string[] = [];
    for (const t of TIMES_OF_DAY) {
      const markup = renderToStaticMarkup(
        <svg>
          <SceneLayer scene={scene.id} timeOfDay={t.id} distance={320} time={1.5} />
        </svg>,
      );
      assertSelfContained(markup, `${scene.id}/${t.id}`);
      ids.push(...[...markup.matchAll(/(?:linear|radial)Gradient id="([^"]+)"/g)].map((m) => m[1]));
    }
    assert.ok(ids.length > 0, `${scene.id} declares no gradients`);
    assert.equal(
      new Set(ids).size,
      ids.length,
      `${scene.id} reused gradient ids across lighting passes: ${ids.join(', ')}`,
    );
  }
});

test('scene + character in one document resolve every paint reference', () => {
  for (const scene of SCENES) {
    for (const t of TIMES_OF_DAY) {
      const markup = renderToStaticMarkup(
        <svg>
          <SceneLayer scene={scene.id} timeOfDay={t.id} distance={100} />
          <CharacterRig settings={castSceneSettings('juno', { scene: scene.id, timeOfDay: t.id })} frame={17} />
        </svg>,
      );
      assertSelfContained(markup, `${scene.id}/${t.id} + juno`);
      const ids = declaredIds(markup);
      assert.equal(new Set(ids).size, ids.length, `${scene.id}/${t.id} duplicate ids`);
    }
  }
});

test('environment markup is byte-stable across repeated renders', () => {
  for (const scene of SCENES) {
    const a = renderToStaticMarkup(<SceneLayer scene={scene.id} timeOfDay="golden" distance={64} time={2} />);
    const b = renderToStaticMarkup(<SceneLayer scene={scene.id} timeOfDay="golden" distance={64} time={2} />);
    assert.equal(a, b, `${scene.id} is not byte-stable`);
  }
});
