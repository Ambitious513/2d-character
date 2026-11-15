/**
 * Guards the alpha-export recipes in `docs/EXPORT.md` and `package.json`.
 *
 * These recipes are easy to get subtly wrong in ways that do NOT fail loudly:
 * a ProRes profile without an alpha channel renders happily and hands you a
 * black background, and a JPEG frame format silently discards transparency.
 * So we assert the invariants here rather than trusting prose.
 *
 * Where possible we cross-check against Remotion's own validators, which is the
 * authoritative answer for the pinned version. Those live behind private dist
 * paths, so if a future Remotion moves them we fall back to the invariants
 * below instead of failing spuriously.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** Load a private Remotion module, or null if this version moved it. */
function remotionInternal<T>(file: string): T | null {
  try {
    return require(path.join(here, '../node_modules/@remotion/renderer/dist/', file)) as T;
  } catch {
    return null;
  }
}

/** The only pixel formats that carry an alpha channel. */
const ALPHA_PIXEL_FORMATS = ['yuva420p', 'yuva444p10le'];
/** The only ProRes profiles that carry an alpha channel. */
const ALPHA_PRORES_PROFILES = ['4444', '4444-xq'];

/** Pull `--flag=value` out of an npm script string. */
const flag = (script: string, name: string): string | null =>
  script.match(new RegExp(`--${name}[= ]([^\\s]+)`))?.[1] ?? null;

const scripts = pkg.scripts as Record<string, string>;
const alphaScripts = Object.entries(scripts).filter(
  ([, cmd]) => flag(cmd, 'pixel-format') !== null && ALPHA_PIXEL_FORMATS.includes(flag(cmd, 'pixel-format')!),
);

test('the alpha export recipes exist', () => {
  assert.ok(scripts['render:alpha'], 'PNG-sequence recipe is missing');
  assert.ok(scripts['render:alpha:prores'], 'ProRes 4444 recipe is missing');
  assert.ok(scripts['render:alpha:webm'], 'WebM alpha recipe is missing');
  assert.equal(alphaScripts.length, 2, 'expected exactly two alpha-video recipes');
});

test('every alpha recipe forces PNG frames (config defaults to JPEG)', () => {
  // remotion.config.ts sets Config.setVideoImageFormat('jpeg'); JPEG has no
  // alpha, so an alpha render MUST override it on the command line.
  for (const [name, cmd] of alphaScripts) {
    assert.equal(flag(cmd, 'image-format'), 'png', `${name} must pass --image-format=png`);
  }
  assert.equal(flag(scripts['render:alpha'], 'image-format'), 'png');
  assert.ok(scripts['render:alpha'].includes('--sequence'), 'PNG recipe must emit a sequence');
});

test('the ProRes recipe uses an alpha-capable profile and pixel format', () => {
  const cmd = scripts['render:alpha:prores'];
  assert.equal(flag(cmd, 'codec'), 'prores');
  assert.ok(
    ALPHA_PRORES_PROFILES.includes(flag(cmd, 'prores-profile') ?? ''),
    'ProRes hq/standard/light/proxy have NO alpha channel — must be 4444 or 4444-xq',
  );
  assert.equal(flag(cmd, 'pixel-format'), 'yuva444p10le');
});

test('the WebM recipe uses an alpha-capable codec and pixel format', () => {
  const cmd = scripts['render:alpha:webm'];
  assert.ok(['vp8', 'vp9'].includes(flag(cmd, 'codec') ?? ''), 'h264/h265 cannot carry alpha');
  assert.equal(flag(cmd, 'pixel-format'), 'yuva420p');
});

test('alpha recipes target the transparent composition', () => {
  for (const [name, cmd] of [...alphaScripts, ['render:alpha', scripts['render:alpha']]]) {
    assert.ok(cmd.includes('CharacterOnly'), `${name} should render CharacterOnly (transparent)`);
  }
});

test('recipes agree with Remotion\'s own validators', (t) => {
  const imageFormat = remotionInternal<{
    validateSelectedPixelFormatAndImageFormatCombination: (p: string, i: string) => string;
  }>('image-format.js');
  const prores = remotionInternal<{
    getProResProfileName: (c: string, p: string) => string | null;
  }>('get-prores-profile-name.js');
  const codecs = remotionInternal<{ validCodecs: string[] }>('codec.js');

  if (!imageFormat || !prores || !codecs) {
    t.skip('Remotion internals moved; invariant checks above still apply');
    return;
  }

  for (const [name, cmd] of alphaScripts) {
    const codec = flag(cmd, 'codec')!;
    assert.ok(codecs.validCodecs.includes(codec), `${name}: unknown codec ${codec}`);
    // Throws if the pixel-format / image-format pair cannot produce alpha.
    imageFormat.validateSelectedPixelFormatAndImageFormatCombination(
      flag(cmd, 'pixel-format')!,
      flag(cmd, 'image-format')!,
    );
  }

  // 4444 maps to ffmpeg profile 4; hq maps to 3 (422 HQ, no alpha).
  assert.equal(prores.getProResProfileName('prores', '4444'), '4');
  assert.equal(prores.getProResProfileName('prores', 'hq'), '3');

  // Negative control: the exact mistake the docs warn about must be rejected.
  assert.throws(
    () => imageFormat.validateSelectedPixelFormatAndImageFormatCombination('yuva444p10le', 'jpeg'),
    /image format is not PNG/,
    'alpha + JPEG must be rejected, otherwise the documented gotcha is wrong',
  );
});
