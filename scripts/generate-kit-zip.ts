/**
 * Regenerate `public/stride-remotion-kit.zip` from the current source tree.
 *
 *   npm run kit:zip
 *
 * The studio's "Download project ZIP" button serves that file, so it must be
 * regenerated before a release — otherwise users download a stale snapshot
 * (this happened once: the shipped ZIP was a v1.0.0 pre-restructure tree).
 *
 * The archive is deterministic: files are sorted and stamped with a fixed
 * mtime, so running the script twice on an unchanged tree produces identical
 * bytes. Only git-tracked files are included, which keeps node_modules, build
 * output and recovery archives out.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync } from 'fflate';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'public', 'stride-remotion-kit.zip');

/** Fixed timestamp so the archive is byte-reproducible. */
const FIXED_MTIME = new Date('2020-01-01T00:00:00.000Z');

/** Paths that never belong in a distributable kit. */
const EXCLUDED_PREFIXES = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  'out/',
  '.remotion/',
  'renders/',
  'screenshots/',
  'handoff/',
  'recovered/',
  'preview/',
  // Conversation artefacts, not project source (see .gitignore).
  'uploads/',
  'scratch/',
];

const EXCLUDED_EXACT = new Set([
  'public/stride-remotion-kit.zip',
  'public/.DS_Store',
]);

const EXCLUDED_SUFFIXES = ['.tar.gz', '.bundle', '.log'];

function isExcluded(path: string): boolean {
  if (EXCLUDED_EXACT.has(path)) return true;
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  if (EXCLUDED_SUFFIXES.some((suffix) => path.endsWith(suffix))) return true;
  return false;
}

/**
 * The authoritative manifest: every file that belongs in the kit, sorted.
 *
 * Exported so `tests/kit-zip.test.ts` can compare the shipped archive against
 * the *whole* tree using the exact same rules. The test used to check only a
 * hand-picked list of required files, which let a genuinely stale archive pass
 * (1788c4f shipped a ZIP missing a tracked file). One definition, two callers.
 */
export function listSourceFiles(): string[] {
  // `--others --exclude-standard` picks up files that are not committed yet,
  // so the archive reflects the working tree rather than the last commit.
  // `--exclude-standard` still honours .gitignore (node_modules, dist, …).
  const raw = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return raw
    .split('\0')
    .filter((path) => path.length > 0 && !isExcluded(path))
    .sort((a, b) => a.localeCompare(b));
}

function main(): void {
  const paths = listSourceFiles();
  if (paths.length === 0) {
    throw new Error(`No source files found under ${ROOT}. Run this from the repository.`);
  }

  const entries: Record<string, Uint8Array> = {};
  for (const path of paths) {
    const absolute = join(ROOT, path);
    if (!existsSync(absolute)) throw new Error(`Tracked file is missing on disk: ${path}`);
    entries[path] = readFileSync(absolute);
  }

  const zip = zipSync(entries, { level: 9, mtime: FIXED_MTIME });
  writeFileSync(OUTPUT, zip);

  // Read it back: a corrupt archive is worse than no archive.
  const verified = unzipSync(zip);
  const missing = paths.filter((path) => !(path in verified));
  if (missing.length > 0) {
    throw new Error(`ZIP verification failed, missing: ${missing.join(', ')}`);
  }

  const kb = (zip.length / 1024).toFixed(1);
  console.log(`Wrote ${paths.length} files (${kb} KB) → ${relative(ROOT, OUTPUT)}`);
}

// Write only when invoked as a script (`npm run kit:zip`). Importing this module
// — as `tests/kit-zip.test.ts` does to read the manifest — must never rewrite the
// archive, or the test would silently "fix" the very staleness it checks for.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
