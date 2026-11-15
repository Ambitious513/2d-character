/**
 * The studio's "Download project ZIP" must serve the current source tree.
 *
 * This guards the regression that shipped a v1.0.0 pre-restructure snapshot
 * while the repo was at 2.2.0. The archive is produced by
 * `scripts/generate-kit-zip.ts` (`npm run kit:zip`); this test opens it and
 * compares it against the **whole** manifest, not a hand-picked subset.
 *
 * Why the full comparison: commit 1788c4f shipped a ZIP that was missing a
 * tracked file, and the old required-files spot check passed anyway. The
 * manifest now comes from the generator itself, so the two cannot drift.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import pkg from '../package.json';
import { listSourceFiles } from '../scripts/generate-kit-zip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZIP_PATH = join(ROOT, 'public', 'stride-remotion-kit.zip');

function readZip(): Record<string, Uint8Array> {
  assert.ok(existsSync(ZIP_PATH), `Missing ${ZIP_PATH}. Run \`npm run kit:zip\`.`);
  return unzipSync(new Uint8Array(readFileSync(ZIP_PATH)));
}

test('the downloadable project ZIP is the current source tree', () => {
  const files = readZip();
  const names = Object.keys(files);

  // Archive-slip guard: every entry must be a safe relative path.
  for (const name of names) {
    assert.ok(!name.startsWith('/'), `absolute path in ZIP: ${name}`);
    assert.ok(!/^[A-Za-z]:[\\/]/.test(name), `drive-qualified path in ZIP: ${name}`);
    assert.ok(!name.split('/').includes('..'), `path traversal in ZIP: ${name}`);
  }

  const required = [
    'package.json',
    'README.md',
    'src/index.ts',
    'src/rig/id.ts',
    'src/rig/environments/index.tsx',
    'src/remotion/Compositions.tsx',
    'tests/svg-ids.test.tsx',
    'tests/visual.test.tsx',
    'tests/__golden__/visual-hashes.json',
  ];
  for (const path of required) {
    assert.ok(path in files, `ZIP is missing ${path} — run \`npm run kit:zip\``);
  }

  const manifest = JSON.parse(Buffer.from(files['package.json']).toString('utf8')) as {
    name: string;
    version: string;
  };
  assert.equal(manifest.version, pkg.version, 'ZIP package.json version is stale');
  assert.equal(manifest.name, pkg.name, 'ZIP package.json name is stale');

  const forbidden = ['node_modules/', '.git/', 'renders/', 'public/stride-remotion-kit.zip'];
  for (const path of forbidden) {
    assert.ok(
      !names.some((name) => name === path || name.startsWith(path)),
      `ZIP must not contain ${path}`,
    );
  }
});

test('the ZIP contains exactly the current source tree — no missing or extra file', () => {
  const files = readZip();
  const shipped = Object.keys(files).sort((a, b) => a.localeCompare(b));
  // Same rule set the generator uses, so a new tracked file cannot be forgotten.
  const expected = listSourceFiles();

  const missing = expected.filter((path) => !(path in files));
  const extra = shipped.filter((path) => !expected.includes(path));

  assert.deepEqual(
    missing,
    [],
    `ZIP is missing ${missing.length} tracked file(s) — run \`npm run kit:zip\`: ${missing.join(', ')}`,
  );
  assert.deepEqual(
    extra,
    [],
    `ZIP ships ${extra.length} file(s) that are not in the tree — run \`npm run kit:zip\`: ${extra.join(', ')}`,
  );
  assert.equal(shipped.length, expected.length, 'ZIP file count differs from the source tree');
  // Guard the guard: an empty or truncated manifest must not read as "in sync".
  assert.ok(expected.length > 50, `manifest only lists ${expected.length} files — the scan is broken`);
});

test('every shipped file is byte-identical to the working tree', () => {
  const files = readZip();
  const stale: string[] = [];
  for (const path of listSourceFiles()) {
    const inZip = files[path];
    if (!inZip) continue; // reported by the manifest test above
    const onDisk = new Uint8Array(readFileSync(join(ROOT, path)));
    if (inZip.length !== onDisk.length || !inZip.every((byte, i) => byte === onDisk[i])) {
      stale.push(path);
    }
  }
  assert.deepEqual(
    stale,
    [],
    `ZIP content is stale for ${stale.length} file(s) — run \`npm run kit:zip\`: ${stale.join(', ')}`,
  );
});
