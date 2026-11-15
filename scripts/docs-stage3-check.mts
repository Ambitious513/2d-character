/**
 * Stage 3 verification harness — the docs explorers, exercised in a real browser.
 *
 * Run it against a dev server or a production build:
 *
 *   npm run dev                      # or: npm run build && serve dist/
 *   BASE_URL=http://localhost:5173 npx tsx scripts/docs-stage3-check.mts
 *
 * Expectations are derived from the library itself (`PRESETS`, `MOTIONS`,
 * `listCharacters()`, `resolveDialogueComposition`) rather than hard-coded, so
 * the harness cannot drift away from the API it is checking. 102 checks cover
 * the shell, all five composition tabs, the cast/motion sheets, the scene
 * explorer, the preset panel (including v1 -> v2 migration and the download
 * round-trip) and mobile 390x844 with zero horizontal overflow.
 *
 * Screenshots land in `screenshots/` (gitignored). Exit code is non-zero on any
 * failed check or any console/page error.
 *
 * NOTE: this is the corrected Stage 3 harness, kept as real source so the work
 * is not lost again. Stage 4 promotes it into `scripts/docs-smoke.mjs` +
 * `npm run smoke:docs` + a CI step. It is deliberately not wired into CI yet.
 *
 * Memory: the docs page mounts five Remotion Players at once. On a 1 GB box a
 * dev server plus Chromium OOM-crashes the tab ("Target crashed"); verify
 * against the built `dist/` served statically, which leaves enough headroom.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import {
  DEFAULT_SCRIPT,
  PRESETS,
  MOTIONS,
  listCharacters,
  resolveDialogueComposition,
} from '../src/index';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const errors: string[] = [];
const ok: string[] = [];
const check = (name: string, cond: boolean, extra: string | null = '') => {
  (cond ? ok : errors).push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra ?? ''}`);
};

const cast = listCharacters();
const dialogue = resolveDialogueComposition({ id: 'DocsChat', speakers: ['milo', 'ada'], script: DEFAULT_SCRIPT });

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--renderer-process-limit=1', '--js-flags=--max-old-space-size=320', '--disable-features=Translate,BackForwardCache', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(BASE + '/#/docs/compositions', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-docs-compositions] [data-docs-player]', { timeout: 20000 });
await page.waitForTimeout(1500);

/* ---------------- shell ---------------- */
const navLabels = (await page.locator('.docs-nav a').allTextContents()).join('|');
check('nav lists all nine sections',
  ['Overview', 'Quickstart', 'Playground', 'Compositions', 'Cast & motion', 'Scenes', 'Presets', 'Export', 'Architecture']
    .every((l) => navLabels.includes(l)), navLabels);
const indexes = await page.locator('.docs-index').allTextContents();
check('section numbers sequential 02..09', indexes.join(',') === '02,03,04,05,06,07,08,09', indexes.join(','));
check('every section is in the DOM', await page.locator('.docs-section, .docs-hero').count() === 9,
  String(await page.locator('.docs-section, .docs-hero').count()));

/* ---------------- composition explorer ---------------- */
const CE = '[data-docs-compositions]';
check('five composition tabs', await page.locator(`${CE} .docs-tab`).count() === 5);
const expected: Record<string, { slate: string; snippet: string; keyProp: string }> = {
  walk: { slate: '1280×720', snippet: 'WalkScene', keyProp: 'followCamera' },
  character: { slate: '720×720', snippet: 'CharacterOnly', keyProp: 'colors' },
  // SceneOnly genuinely takes four props — scene, timeOfDay, parallax, direction.
  scene: { slate: '1280×720', snippet: 'SceneOnly', keyProp: 'parallax' },
  dialogue: { slate: `${dialogue.width}×${dialogue.height}`, snippet: 'DialogueComposition', keyProp: 'gapFrames' },
  head: { slate: '720×720', snippet: 'TalkingHead', keyProp: 'background' },
};
for (const [id, want] of Object.entries(expected)) {
  await page.locator(`#comp-tab-${id}`).click();
  await page.waitForSelector(`${CE} [data-docs-comp-panel="${id}"]`);
  await page.waitForTimeout(700);
  check(`${id}: exactly one player mounted`, await page.locator(`${CE} [data-docs-player]`).count() === 1);
  check(`${id}: slate geometry`, (await page.locator(`${CE} .docs-slate`).textContent())!.includes(want.slate),
    (await page.locator(`${CE} .docs-slate`).textContent())!);
  check(`${id}: snippet matches tab`, (await page.locator(`${CE} .docs-code pre`).textContent())!.includes(want.snippet));
  const chipTexts = await page.locator(`${CE} .docs-chips .chip`).allTextContents();
  check(`${id}: prop chips present`, chipTexts.length >= 4, chipTexts.join(','));
  check(`${id}: chips are tab-specific`, chipTexts.some((t) => t.includes(want.keyProp)), chipTexts.join(','));
  check(`${id}: no player error`, await page.locator(`${CE} .docs-player-error`).count() === 0);
}
// dialogue duration is derived, not typed
await page.locator('#comp-tab-dialogue').click();
await page.waitForSelector(`${CE} [data-docs-comp-panel="dialogue"]`);
await page.waitForTimeout(800);
const dial = await page.locator(`${CE} [data-docs-frame]`).textContent();
check('dialogue duration derived from the script', dial!.endsWith(`/ ${dialogue.durationInFrames}`), `${dial} vs ${dialogue.durationInFrames}`);
check('dialogue note quotes the same number',
  (await page.locator(`${CE} .docs-note`).textContent())!.includes(`durationInFrames: ${dialogue.durationInFrames}`));
// secondary examples start paused, and play on demand
await page.waitForTimeout(600);
const held = await page.locator(`${CE} [data-docs-frame]`).textContent();
await page.waitForTimeout(500);
check('secondary example does not autoplay', held === await page.locator(`${CE} [data-docs-frame]`).textContent(), held!);
await page.locator(`${CE} .docs-play-btn`).click();
await page.waitForTimeout(700);
check('secondary example plays on demand', held !== await page.locator(`${CE} [data-docs-frame]`).textContent());
await page.locator(`${CE} .docs-play-btn`).click();
await page.locator(`${CE} .docs-code-copy`).click();
await page.waitForTimeout(250);
check('composition copy toast', (await page.locator('.docs-toast').textContent())!.includes('copied'));
await page.locator('#comp-tab-walk').click();
await page.waitForTimeout(600);
await page.locator('#docs-compositions').scrollIntoViewIfNeeded();
await page.screenshot({ path: 'screenshots/s3-compositions.png' });

/* ---------------- cast & motion ---------------- */
const CM = '[data-docs-cast]';
await page.locator('#docs-cast').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
check('one card per cast member', await page.locator(`${CM} .cast-card`).count() === cast.length, String(cast.length));
check('cards draw a real head svg', await page.locator(`${CM} .cast-head svg`).count() === cast.length);
check('cards carry palette swatches', await page.locator(`${CM} .cast-card`).first().locator('.swatches i').count() === 5);
check('cast sheet tab is default', await page.locator(`${CM} [data-docs-sheet-panel="cast"]`).count() === 1);
check('cast sheet needs no character picker', await page.locator('#sheet-character').count() === 0);
await page.locator('#sheet-tab-motion').click();
await page.waitForSelector(`${CM} [data-docs-sheet-panel="motion"]`);
await page.waitForTimeout(700);
check('motion sheet lists all ten motions', await page.locator(`${CM} .docs-chips .chip`).count() === MOTIONS.length,
  String(await page.locator(`${CM} .docs-chips .chip`).count()));
check('motion sheet offers a character picker', await page.locator('#sheet-character').count() === 1);
await page.selectOption('#sheet-character', 'juno');
await page.waitForTimeout(700);
check('sheet snippet follows the character',
  (await page.locator(`${CM} .docs-code pre`).textContent())!.includes("castSceneSettings('juno'"));
await page.locator('#sheet-tab-emotion').click();
await page.waitForSelector(`${CM} [data-docs-sheet-panel="emotion"]`);
await page.waitForTimeout(700);
check('emotion sheet mounts', await page.locator(`${CM} [data-docs-player]`).count() === 1);
check('emotion sheet no error', await page.locator(`${CM} .docs-player-error`).count() === 0);
await page.screenshot({ path: 'screenshots/s3-cast.png' });

// clicking a cast card loads the playground and scrolls there
await page.locator(`${CM} .cast-card`, { hasText: 'Kwame' }).click();
await page.waitForTimeout(1800);
check('cast card routes to the playground', await page.evaluate(() => location.hash) === '#/docs/playground',
  await page.evaluate(() => location.hash));
check('cast card loads that character', await page.locator('#pg-character').inputValue() === 'kwame',
  await page.locator('#pg-character').inputValue());
check('cast card names the preset', (await page.locator('[data-docs-playground] .pg-stage-bar').textContent())!.includes('Kwame'));
check('cast card toast', (await page.locator('.docs-toast').textContent())!.includes('Kwame'));
check('playground renders the loaded cast', await page.locator('[data-docs-playground] [data-character="kwame"]').count() === 1);

/* ---------------- scenes ---------------- */
const SE = '[data-docs-scenes]';
await page.locator('#docs-scenes').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
const sceneStage = `${SE} .docs-player-stage`;
check('scene plate mounts', await page.locator(`${SE} [data-docs-player="SceneOnly"]`).count() === 1);
check('scene plate draws no character', await page.locator(`${sceneStage} [data-character]`).count() === 0);
check('scene defaults to street/golden', await page.locator(`${sceneStage} [data-scene="street"][data-time-of-day="golden"]`).count() === 1);
for (const s of ['park', 'room', 'backdrop', 'street']) {
  await page.locator(`${SE} .pg-seg[aria-label="Scene"] button`, { hasText: new RegExp(`^${s}$`, 'i') }).click();
  await page.waitForSelector(`${sceneStage} [data-scene="${s}"]`);
  check(`scene ${s} renders`, true);
}
const dayPalette = await page.locator(`${SE} .scene-swatch i`).first().getAttribute('style');
await page.locator(`${SE} .pg-seg[aria-label="Time of day"] button`, { hasText: 'Night' }).click();
await page.waitForSelector(`${sceneStage} [data-time-of-day="night"]`);
check('lighting switch re-lights the plate', true);
check('palette swatches follow the lighting',
  dayPalette !== await page.locator(`${SE} .scene-swatch i`).first().getAttribute('style'),
  `${dayPalette} -> ${await page.locator(`${SE} .scene-swatch i`).first().getAttribute('style')}`);
check('palette is labelled with the lookup', (await page.locator(`${SE} .pg-group-title`).textContent())!.includes("paletteFor('night')"));
await page.locator('#scene-parallax').fill('0.25');
await page.locator('#scene-speed').fill('1.5');
await page.locator(`${SE} .pg-seg[aria-label="Direction"] button`, { hasText: 'Left' }).click();
await page.waitForTimeout(400);
const sceneSnip = (await page.locator(`${SE} .docs-code pre`).textContent())!;
check('scene snippet reflects parallax', sceneSnip.includes('parallax={0.25}'));
check('scene snippet reflects non-default speed', sceneSnip.includes('speed={1.5}'));
check('scene snippet reflects direction', sceneSnip.includes('direction={-1}'));
check('scene slider output shows value', (await page.locator('label[for="scene-speed"] output').textContent()) === '1.50×');
await page.screenshot({ path: 'screenshots/s3-scenes.png' });

// send to playground keeps the character, replaces the scene fields
await page.locator(`${SE} .pg-seg[aria-label="Scene"] button`, { hasText: 'Park' }).click();
await page.getByRole('button', { name: 'Send to playground' }).click();
await page.waitForTimeout(1800);
check('send-to-playground routes back', await page.evaluate(() => location.hash) === '#/docs/playground');
check('send keeps the character', await page.locator('#pg-character').inputValue() === 'kwame', await page.locator('#pg-character').inputValue());
check('send applies the scene', await page.locator('#pg-scene').inputValue() === 'park', await page.locator('#pg-scene').inputValue());
check('send applies the lighting',
  await page.locator('[data-docs-playground] .pg-seg[aria-label="Time of day"] button[aria-pressed="true"]').textContent() === 'Night');
check('send applies parallax', await page.locator('#pg-parallax').inputValue() === '0.25', await page.locator('#pg-parallax').inputValue());
check('send marks the look custom', (await page.locator('[data-docs-playground] .pg-stage-bar').textContent())!.includes('Custom'));
check('send toast', (await page.locator('.docs-toast').textContent())!.includes('applied'));

/* ---------------- presets ---------------- */
const PP = '[data-docs-presets]';
await page.locator('#docs-presets').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
check('one card per built-in preset', await page.locator(`${PP} .preset-card`).count() === PRESETS.length, String(PRESETS.length));
const night = PRESETS.find((p) => p.name === 'Night shift')!;
await page.locator(`${PP} .preset-card`, { hasText: 'Night shift' }).click();
await page.waitForTimeout(1800);
check('preset card routes to the playground', await page.evaluate(() => location.hash) === '#/docs/playground');
check('preset card loads its character', await page.locator('#pg-character').inputValue() === night.settings.character);
check('preset card loads its motion', await page.locator('#pg-motion').inputValue() === night.settings.motion);
check('preset name shows in the stage bar', (await page.locator('[data-docs-playground] .pg-stage-bar').textContent())!.includes('Night shift'));
check('preset card marked active', await page.locator(`${PP} .preset-card.active`).textContent().then((t) => (t ?? '').includes('Night shift')));

await page.locator('#docs-presets').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
// empty
await page.getByRole('button', { name: 'Validate', exact: true }).click();
await page.waitForSelector(`${PP} [data-docs-preset-result="bad"]`);
check('empty import is rejected', (await page.locator(`${PP} .preset-result.bad`).textContent())!.includes('Paste a preset first'));
// malformed
await page.locator('#preset-json').fill('{ not json');
await page.getByRole('button', { name: 'Validate', exact: true }).click();
await page.waitForTimeout(300);
check('malformed JSON reports the parser error',
  (await page.locator(`${PP} .preset-result.bad`).textContent())!.includes('Not valid JSON'));
// unknown character
await page.locator('#preset-json').fill('{"version":2,"settings":{"character":"nobody"}}');
await page.getByRole('button', { name: 'Validate', exact: true }).click();
await page.waitForTimeout(300);
check('unknown character is reported with the fix',
  (await page.locator(`${PP} .preset-result.bad`).textContent())!.includes('registerCharacter'));
// bad enum
await page.locator('#preset-json').fill('{"version":2,"settings":{"character":"ada","motion":"teleport"}}');
await page.getByRole('button', { name: 'Validate', exact: true }).click();
await page.waitForTimeout(300);
check('bad enum is reported', await page.locator(`${PP} .preset-result.bad li`).count() >= 1,
  await page.locator(`${PP} .preset-result.bad`).textContent().then((t) => (t ?? '').slice(0, 90)));
// v1 migration
await page.getByRole('button', { name: 'Paste v1 example' }).click();
await page.getByRole('button', { name: 'Validate', exact: true }).click();
await page.waitForSelector(`${PP} [data-docs-preset-result="ok"]`);
check('v1 example validates', (await page.locator(`${PP} .preset-result.ok`).textContent())!.includes('Legacy look'));
check('migration note shown', (await page.locator(`${PP} [data-docs-migration]`).textContent())!.includes('Migrated v1 → v2'),
  await page.locator(`${PP} [data-docs-migration]`).textContent());
await page.screenshot({ path: 'screenshots/s3-presets.png' });
await page.locator(`${PP} .preset-result.ok`).getByRole('button', { name: 'Load into playground' }).click();
await page.waitForTimeout(1800);
check('imported preset loads its character', await page.locator('#pg-character').inputValue() === 'kwame');
check('v1 environment migrated to timeOfDay',
  await page.locator('[data-docs-playground] .pg-seg[aria-label="Time of day"] button[aria-pressed="true"]').textContent() === 'Night');
// current-version envelope: no migration note
await page.locator('#docs-presets').scrollIntoViewIfNeeded();
await page.locator('#preset-json').fill(JSON.stringify({ version: 2, name: 'Current', settings: { character: 'pip', motion: 'jump' } }));
await page.getByRole('button', { name: 'Validate', exact: true }).click();
await page.waitForTimeout(300);
check('v2 envelope needs no migration',
  (await page.locator(`${PP} .preset-result.ok`).textContent())!.includes('no migration needed'));
// "Download current preset" exports the PLAYGROUND's look, not the textarea.
// Load the validated v2 envelope first so the round-trip is actually proven.
await page.locator(`${PP} .preset-result.ok`).getByRole('button', { name: 'Load into playground' }).click();
await page.waitForTimeout(1800);
check('v2 import loads into the playground', await page.locator('#pg-character').inputValue() === 'pip');
check('v2 import loads the motion', await page.locator('#pg-motion').inputValue() === 'jump');
await page.locator('#docs-presets').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const dl = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download current preset' }).click();
const file = await dl;
const body = JSON.parse(fs.readFileSync(await file.path(), 'utf8'));
check('downloaded preset is a v2 envelope', body.version === 2 && body.settings.character === 'pip', file.suggestedFilename());
check('downloaded preset carries the imported motion', body.settings.motion === 'jump');
check('download filename tracks the look', file.suggestedFilename() === 'stride-pip-jump.json', file.suggestedFilename());
check('preset API snippet present', (await page.locator(`${PP} .docs-code pre`).textContent())!.includes('serializePresetJSON'));

/* ---------------- mobile ---------------- */
await page.close();
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
m.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
m.on('console', (c) => { if (c.type() === 'error') errors.push('mobile console: ' + c.text()); });
await m.goto(BASE + '/#/docs/compositions', { waitUntil: 'domcontentloaded' });
await m.waitForSelector('[data-docs-compositions] [data-docs-player]');
await m.waitForTimeout(1500);
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('mobile no horizontal overflow', overflow <= 1, 'overflow=' + overflow);
await m.locator('#comp-tab-head').click();
await m.waitForSelector('[data-docs-comp-panel="head"]');
await m.waitForTimeout(700);
check('mobile composition tabs work', await m.locator('[data-docs-compositions] [data-docs-player]').count() === 1);
await m.screenshot({ path: 'screenshots/s3-mobile-compositions.png' });
await m.locator('#docs-cast').scrollIntoViewIfNeeded();
await m.waitForTimeout(700);
const castCols = await m.evaluate(() => getComputedStyle(document.querySelector('.cast-cards')!).gridTemplateColumns.split(' ').length);
check('mobile cast cards stack', castCols === 1, String(castCols));
await m.screenshot({ path: 'screenshots/s3-mobile-cast.png' });
await m.locator('#docs-scenes').scrollIntoViewIfNeeded();
await m.locator('[data-docs-scenes] .pg-seg[aria-label="Scene"] button', { hasText: 'Room' }).click();
await m.waitForSelector('[data-docs-scenes] [data-scene="room"]');
check('mobile scene controls live', true);
await m.screenshot({ path: 'screenshots/s3-mobile-scenes.png' });
await m.locator('#docs-presets').scrollIntoViewIfNeeded();
await m.locator('#preset-json').scrollIntoViewIfNeeded();
await m.locator('#preset-json').fill('{"version":1,"settings":{"character":"ada","environment":"golden"}}');
await m.getByRole('button', { name: 'Validate', exact: true }).click();
await m.waitForSelector('[data-docs-presets] [data-docs-preset-result="ok"]');
check('mobile import works', true);
await m.screenshot({ path: 'screenshots/s3-mobile-presets.png' });
const overflow2 = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('mobile still no overflow after interaction', overflow2 <= 1, 'overflow=' + overflow2);
await browser.close();

console.log(ok.join('\n'));
console.log(errors.length ? '\nERRORS:\n' + errors.join('\n') : `\nno console/page errors, ${ok.length} checks passed`);
process.exit(errors.length ? 1 : 0);
