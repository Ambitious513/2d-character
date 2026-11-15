/**
 * Regenerate the visual-regression goldens.
 *
 *   npm run update:visual-goldens
 *
 * Run this only after an *intentional* visual change, then review the hash
 * diff. The test itself (`tests/visual.test.tsx`) fails on any mismatch and
 * points back here.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { GOLDEN_PATH, buildGoldenEntries, goldenMeta } from '../tests/visual-goldens';

const payload = { ...goldenMeta(), entries: buildGoldenEntries() };
mkdirSync(dirname(GOLDEN_PATH), { recursive: true });
writeFileSync(GOLDEN_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${Object.keys(payload.entries).length} visual goldens → ${GOLDEN_PATH}`);
