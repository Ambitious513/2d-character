/**
 * The studio's "Download project ZIP" must serve the current source tree.
 *
 * This guards the regression that shipped a v1.0.0 pre-restructure snapshot
 * while the repo was at 2.2.0. The archive is produced by
 * `scripts/generate-kit-zip.ts` (`npm run kit:zip`); this test opens it and
 * checks the manifest version, the files a host actually needs, and that no
 * build output or recovery junk slipped in.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import pkg from '../package.json';

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
