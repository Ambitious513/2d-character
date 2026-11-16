/**
 * Docs smoke test — the whole `#/docs` site, exercised in a real browser.
 *
 *   npm run smoke:docs                       # against `npm run dev`  (:5173)
 *   BASE_URL=http://localhost:4173 npm run smoke:docs   # against `vite preview`
 *
 * This is the Stage 3 verification harness (`docs-stage3-check.mts`) promoted
 * into the permanent gate, and widened to cover the parts of Stages 1 and 2
 * that had only ever been checked by hand: the shell, the hero Player's
 * transport, deep links + scrollspy, every playground control and all four
 * playground actions, the export/architecture sections and the studio
 * round-trip.
 *
 * Expectations are derived from the library itself (`PRESETS`, `MOTIONS`,
 * `listCharacters()`, `resolveDialogueComposition`, `speechFrames`,
 * `parsePreset`) rather than hard-coded, so the harness cannot drift away from
 * the API it is checking. Counts that are product decisions (nine nav
 * sections, seven accessory chips) are asserted as the spec they are.
 *
 * Screenshots land in `screenshots/docs-*.png` (gitignored, uploaded by CI).
 * Every check is printed as it runs, so a crash still leaves a usable log.
 * Exit code is non-zero on any failed check or any console/page error.
 *
 * Memory: the docs page mounts five Remotion Players at once. On a 1 GB box a
 * dev server plus Chromium OOM-crashes the tab ("Target crashed"); verify
 * against the built `dist/` served statically, which leaves enough headroom.
 * Only one page is open at a time here for the same reason. CI's larger
 * runners are unaffected either way.
 */
import { chromium, type Browser, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import {
  BUILDS,
  DEFAULT_SCRIPT,
  EMOTIONS,
  HAIR_STYLES,
  MOTIONS,
  OUTFITS,
  PRESETS,
  SCENES,
  TIMES_OF_DAY,
  VERSION,
  WEATHERS,
  listCharacters,
  parsePreset,
  resolveDialogueComposition,
  speechFrames,
} from '../src/index';
import { EXPORT_RECIPES } from '../src/docs/snippets';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const SHOTS = 'screenshots';

let passed = 0;
const failures: string[] = [];
let step = 'boot';

/** Print immediately: a mid-run crash must not swallow the log. */
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}${extra ? ` — ${extra}` : ''}`);
  } else {
    failures.push(`${name}${extra ? ` — ${extra}` : ''}`);
    console.log(`FAIL ${name}${extra ? ` — ${extra}` : ''}`);
  }
};

const text = async (loc: Locator): Promise<string> => (await loc.textContent()) ?? '';
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/docs-${name}.png` });
const banner = (title: string) => {
  step = title;
  console.log(`\n── ${title} ──`);
};

/** The nine sections of plan §5, in nav order. */
const NAV = ['Overview', 'Quickstart', 'Playground', 'Compositions', 'Cast & motion', 'Scenes', 'Presets', 'Export', 'Architecture'];

const PG = '[data-docs-playground]';
const CE = '[data-docs-compositions]';
const CM = '[data-docs-cast]';
const SE = '[data-docs-scenes]';
const PP = '[data-docs-presets]';

const SELECTS = ['character', 'motion', 'emotion', 'scene', 'hair', 'outfit', 'build'] as const;
const SLIDERS = ['speed', 'stride', 'bounce', 'armswing', 'scale', 'seed', 'parallax', 'speechrate'] as const;
const SWITCHES = ['Follow camera', 'Rig guides', 'Subtitles'] as const;
const ACCESSORIES = ['Backpack', 'Glasses', 'Cap', 'Scarf', 'Headphones', 'Beard', 'Freckles'] as const;
const COLORS = ['jacket', 'pants', 'skin', 'hair', 'shoes', 'accent'] as const;

const cast = listCharacters();
const dialogue = resolveDialogueComposition({ id: 'DocsChat', speakers: ['milo', 'ada'], script: DEFAULT_SCRIPT });

/** Everything the playground controls hold, for the Reset fidelity check. */
async function playgroundSnapshot(page: Page) {
  const pg = page.locator(PG);
  const read = async (locs: Locator[]) => Promise.all(locs.map((l) => l.inputValue()));
  return {
    selects: await read(SELECTS.map((id) => pg.locator(`#pg-${id}`))),
    sliders: await read(SLIDERS.map((id) => pg.locator(`#pg-${id}`))),
    dialogue: await pg.locator('#pg-dialogue').inputValue(),
    colors: await read(COLORS.map((id) => pg.locator(`#pg-color-${id}`))),
    switches: await Promise.all(
      SWITCHES.map((name) => pg.getByRole('switch', { name }).getAttribute('aria-checked')),
    ),
    segments: await Promise.all(
      ['Direction', 'Time of day', 'Weather'].map((label) =>
        pg.locator(`.pg-seg[aria-label="${label}"] button[aria-pressed="true"]`).textContent(),
      ),
    ),
    accessories: await Promise.all(
      ACCESSORIES.map((name) => pg.locator(`.pg-toggle[aria-label="${name}"]`).getAttribute('aria-pressed')),
    ),
    snippet: await text(pg.locator('.docs-code pre').first()),
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser: Browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--renderer-process-limit=1',
      '--js-flags=--max-old-space-size=320',
      '--disable-features=Translate,BackForwardCache',
      '--mute-audio',
    ],
  });

  try {
    /* ================================================================ */
    banner('shell, hero and quickstart (desktop 1440×960)');
    /* ================================================================ */
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      acceptDownloads: true,
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') failures.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));

    await page.goto(`${BASE}/#/docs`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.docs-hero [data-docs-player]', { timeout: 30000 });
    await page.waitForTimeout(1500);

    check('docs route sets its own title', (await page.title()) === 'Stride — docs & live examples', await page.title());
    const navLabels = (await page.locator('.docs-nav a').allTextContents()).join('|');
    check('nav lists all nine sections', NAV.every((l) => navLabels.includes(l)), navLabels);
    check('nav numbers are sequential 01..09',
      (await page.locator('.docs-nav-num').allTextContents()).join(',') === '01,02,03,04,05,06,07,08,09');
    const indexes = await page.locator('.docs-index').allTextContents();
    check('section numbers sequential 02..09', indexes.join(',') === '02,03,04,05,06,07,08,09', indexes.join(','));
    check('every section is in the DOM', await page.locator('.docs-section, .docs-hero').count() === 9,
      String(await page.locator('.docs-section, .docs-hero').count()));
    check('brand shows the library version', (await text(page.locator('.docs-brand em'))) === `v${VERSION}`, VERSION);
    const footer = await text(page.locator('.docs-footer'));
    check('footer stats come from the library',
      footer.includes(`${cast.length} characters`) && footer.includes(`${MOTIONS.length} motions`)
      && footer.includes(`${EMOTIONS.length} emotions`) && footer.includes(`${PRESETS.length} presets`), footer.slice(0, 120));

    // Hero: a live WalkScene, not a video.
    const hero = page.locator('.docs-hero');
    const heroStage = hero.locator('.docs-player-stage');
    check('hero mounts a live WalkScene', await hero.locator('[data-docs-player="WalkScene"]').count() === 1);
    check('hero player has no error', await hero.locator('.docs-player-error').count() === 0);
    check('hero renders Ada', await heroStage.locator('[data-character="ada"]').count() === 1);
    check('hero renders street at golden hour',
      await heroStage.locator('[data-scene="street"][data-time-of-day="golden"]').count() === 1);
    check('hero stats are derived from the registry',
      (await hero.locator('.hero-stats .stat b').allTextContents()).join('|')
      === [cast.length, MOTIONS.length, EMOTIONS.length, `${SCENES.length}×${TIMES_OF_DAY.length}×${WEATHERS.length}`].join('|'),
      (await hero.locator('.hero-stats .stat b').allTextContents()).join('|'));
    check('hero primary CTA opens the playground',
      await hero.locator('.hero-cta a', { hasText: 'Open playground' }).getAttribute('href') === '#/docs/playground');

    const heroFrame = () => text(hero.locator('[data-docs-frame]'));
    const f0 = await heroFrame();
    await page.waitForTimeout(700);
    check('hero autoplays', f0 !== (await heroFrame()), `${f0} -> ${await heroFrame()}`);
    await hero.locator('.docs-play-btn').click();
    await page.waitForTimeout(200);
    const held = await heroFrame();
    await page.waitForTimeout(500);
    check('hero pause holds the frame', held === (await heroFrame()), held);
    await hero.getByRole('button', { name: 'WalkScene restart' }).click();
    await page.waitForTimeout(200);
    check('hero restart seeks to frame 0', (await heroFrame()).startsWith('000'), await heroFrame());
    await hero.getByRole('slider', { name: 'WalkScene timeline' }).fill('150');
    await page.waitForTimeout(250);
    check('hero scrubber seeks', (await heroFrame()).startsWith('150'), await heroFrame());
    check('hero frame readout shows the duration', (await heroFrame()).endsWith('/ 300'), await heroFrame());
    await shot(page, '01-hero');

    // Deep links + scrollspy.
    await page.locator('.docs-nav a', { hasText: 'Export' }).click();
    await page.waitForTimeout(1200);
    check('nav click writes the deep link', await page.evaluate(() => location.hash) === '#/docs/export',
      await page.evaluate(() => location.hash));
    const exportTop = await page.locator('#docs-export').evaluate((el) => el.getBoundingClientRect().top);
    const barHeight = await page.locator('.docs-topbar').evaluate((el) => el.getBoundingClientRect().height);
    check('deep link lands below the fixed topbar', exportTop >= barHeight - 8 && exportTop < 400,
      `top=${Math.round(exportTop)} bar=${Math.round(barHeight)}`);
    check('scrollspy marks the current section',
      await page.locator('.docs-nav a.active', { hasText: 'Export' }).count() === 1);
    check('current nav link is aria-current',
      await page.locator('.docs-nav a[aria-current="true"]', { hasText: 'Export' }).count() === 1);

    // Quickstart.
    await page.locator('#docs-quickstart').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    check('quickstart has five steps', await page.locator('#docs-quickstart .step').count() === 5);
    await page.locator('#docs-quickstart .docs-code-copy').first().click();
    await page.waitForTimeout(300);
    check('quickstart copy toast', (await text(page.locator('.docs-toast'))).includes('Snippet copied'));
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    check('clipboard really holds the snippet', clip.includes('src/rig'), clip.slice(0, 60));
    await shot(page, '02-quickstart');

    /* ================================================================ */
    banner('playground — every control writes into the live Player');
    /* ================================================================ */
    await page.locator('.docs-nav a', { hasText: 'Playground' }).click();
    await page.waitForSelector(`${PG} [data-docs-player]`);
    await page.waitForTimeout(1200);
    const pg = page.locator(PG);
    // Page-level selector: already scoped by PG, so never re-scope it with pg.locator().
    const pgStage = `${PG} .docs-player-stage`;
    const pgSnippet = () => text(pg.locator('.docs-code pre').first());
    const opening = await playgroundSnapshot(page);

    check('control region is permanently visible', await pg.locator('[data-docs-controls]').isVisible());
    check('no modal or disclosure hides the controls', await pg.locator('dialog, details').count() === 0);
    check('playground mounts one Player', await pg.locator('[data-docs-player]').count() === 1);
    check('playground opens on the scene view',
      (await text(pg.locator('.pg-stage-bar'))).includes('WalkScene · 1280×720'));
    check('opening look is named', (await text(pg.locator('.pg-stage-bar'))).includes('Morning stroll'));

    // Option lists are the registry, not a copy of it.
    const optionCount = async (id: string) => pg.locator(`#pg-${id} option`).count();
    check('character options = cast registry', await optionCount('character') === cast.length, String(cast.length));
    check('motion options = MOTIONS', await optionCount('motion') === MOTIONS.length, String(MOTIONS.length));
    check('emotion options = EMOTIONS', await optionCount('emotion') === EMOTIONS.length, String(EMOTIONS.length));
    check('scene options = SCENES', await optionCount('scene') === SCENES.length, String(SCENES.length));
    check('hair options = HAIR_STYLES', await optionCount('hair') === HAIR_STYLES.length, String(HAIR_STYLES.length));
    check('outfit options = OUTFITS', await optionCount('outfit') === OUTFITS.length, String(OUTFITS.length));
    check('build options = BUILDS', await optionCount('build') === BUILDS.length, String(BUILDS.length));
    check('eight labelled sliders', await pg.locator('.pg-controls input[type="range"]').count() === SLIDERS.length);
    check('three labelled switches', await pg.locator('.pg-controls [role="switch"]').count() === SWITCHES.length);
    check('seven accessory chips', await pg.locator('.pg-toggle').count() === ACCESSORIES.length);
    check('six colour pickers', await pg.locator('.pg-colors input[type="color"]').count() === COLORS.length);
    check('every slider is labelled',
      (await Promise.all(SLIDERS.map((id) => pg.locator(`#pg-${id}`).getAttribute('aria-label')))).every(Boolean));

    // Cast & performance.
    await pg.locator('#pg-character').selectOption('juno');
    await page.waitForSelector(`${pgStage} [data-character="juno"]`);
    check('character select redraws the rig', true);
    check('character select rewrites the snippet', (await pgSnippet()).includes("castSceneSettings('juno'"));
    await pg.locator('#pg-motion').selectOption('run');
    await page.waitForTimeout(400);
    check('motion select reaches the snippet', (await pgSnippet()).includes("motion: 'run'"));
    await pg.locator('#pg-emotion').selectOption('surprised');
    await page.waitForSelector(`${pgStage} [data-face="surprised"]`);
    check('emotion select redraws the face', true);
    await pg.locator('.pg-seg[aria-label="Direction"] button', { hasText: 'Left' }).click();
    await page.waitForSelector(`${pgStage} [data-character="juno"][transform="scale(-1 1)"]`);
    check('direction flips the rig', true);
    check('touched look is marked Custom', (await text(pg.locator('.pg-stage-bar'))).includes('Custom'));

    // Motion tuning — value, readout and snippet.
    const slider = async (id: string, value: string, output: string, snippet: string) => {
      await pg.locator(`#pg-${id}`).fill(value);
      await page.waitForTimeout(250);
      check(`${id} slider readout`, (await text(pg.locator(`label[for="pg-${id}"] output`))) === output,
        await text(pg.locator(`label[for="pg-${id}"] output`)));
      check(`${id} slider reaches the snippet`, (await pgSnippet()).includes(snippet), snippet);
    };
    await slider('speed', '1.5', '1.50×', 'speed: 1.5');
    await slider('stride', '1.2', '1.20×', 'stride: 1.2');
    await slider('bounce', '0.8', '0.80', 'bounce: 0.8');
    await slider('armswing', '1.1', '1.10', 'armSwing: 1.1');
    await slider('scale', '1.4', '1.40×', 'scale: 1.4');
    await slider('seed', '42', '42', 'seed: 42');
    await pg.locator('#pg-speed').focus();
    await pg.locator('#pg-speed').press('ArrowRight');
    await page.waitForTimeout(250);
    check('sliders are keyboard operable', await pg.locator('#pg-speed').inputValue() === '1.55',
      await pg.locator('#pg-speed').inputValue());

    // Scene & camera.
    await pg.locator('#pg-scene').selectOption('park');
    await page.waitForSelector(`${pgStage} [data-scene="park"]`);
    check('scene select re-lights the world', true);
    await pg.locator('.pg-seg[aria-label="Time of day"] button', { hasText: 'Night' }).click();
    await page.waitForSelector(`${pgStage} [data-time-of-day="night"]`);
    check('time-of-day segment re-lights the world', true);

    // Weather — the overlay rides the scene view; the SVG reports its state.
    check('playground weather segment has every option',
      await pg.locator('.pg-seg[aria-label="Weather"] button').count() === WEATHERS.length);
    await pg.locator('.pg-seg[aria-label="Weather"] button', { hasText: 'Snow' }).click();
    await page.waitForSelector(`${pgStage} [data-weather="snow"]`);
    check('weather segment draws the overlay', true);
    check('weather segment reaches the snippet', (await pgSnippet()).includes("weather: 'snow'"));
    await pg.locator('.pg-seg[aria-label="Weather"] button', { hasText: 'Clear' }).click();
    await page.waitForTimeout(400);
    check('clear weather draws no overlay', await page.locator(`${pgStage} [data-weather]`).count() === 0);
    await slider('parallax', '0.3', '0.30', 'parallax: 0.3');
    await pg.getByRole('switch', { name: 'Follow camera' }).click();
    await page.waitForTimeout(300);
    check('follow-camera switch flips aria-checked',
      await pg.getByRole('switch', { name: 'Follow camera' }).getAttribute('aria-checked') === 'false');
    check('follow-camera switch reaches the snippet', (await pgSnippet()).includes('followCamera: false'));
    await pg.getByRole('switch', { name: 'Rig guides' }).click();
    await page.waitForSelector(`${pgStage} [data-rig-guides="true"]`);
    check('rig guides draw the skeleton', true);

    // Speech — the frame count must be the library's own derivation.
    const line = 'Hello from the docs smoke test.';
    await pg.locator('#pg-motion').selectOption('talk');
    await pg.locator('#pg-dialogue').fill(line);
    await page.waitForTimeout(500);
    const rate = Number(await pg.locator('#pg-speechrate').inputValue());
    const wantFrames = speechFrames(line, 30, rate, 42);
    const speechGroup = pg.locator('.pg-group', { hasText: 'Speech' });
    check('lip-sync frame count comes from speechFrames()',
      (await text(speechGroup.locator('.pg-hint b').first())) === String(wantFrames), `${wantFrames} frames`);
    await slider('speechrate', '0.8', '0.80×', 'speechRate: 0.8');
    check('speech rate changes the derived frame count',
      (await text(speechGroup.locator('.pg-hint b').first())) === String(speechFrames(line, 30, 0.8, 42)),
      `${speechFrames(line, 30, 0.8, 42)} frames`);
    await pg.getByRole('switch', { name: 'Subtitles' }).click();
    await page.waitForSelector(`${pgStage} [data-subtitles="true"]`);
    check('subtitles burn into the frame', true);

    // Look.
    const hair = HAIR_STYLES[3].id;
    await pg.locator('#pg-hair').selectOption(hair);
    await page.waitForSelector(`${pgStage} [data-hair="${hair}"]`);
    check('hair select redraws the hair', true, hair);
    const outfit = OUTFITS[2].id;
    await pg.locator('#pg-outfit').selectOption(outfit);
    await page.waitForSelector(`${pgStage} [data-outfit="${outfit}"]`);
    check('outfit select redraws the outfit', true, outfit);
    const build = BUILDS[1].id;
    await pg.locator('#pg-build').selectOption(build);
    await page.waitForTimeout(300);
    check('build select reaches the snippet', (await pgSnippet()).includes(`build: '${build}'`), build);
    await pg.locator('.pg-toggle[aria-label="Backpack"]').click();
    await page.waitForSelector(`${pgStage} [data-accessory="backpack"]`);
    check('accessory chip draws the accessory', true);
    check('accessory chip is aria-pressed',
      await pg.locator('.pg-toggle[aria-label="Backpack"]').getAttribute('aria-pressed') === 'true');
    await pg.locator('.pg-toggle[aria-label="Backpack"]').click();
    await page.waitForSelector(`${pgStage} [data-accessory="backpack"]`, { state: 'detached' });
    check('accessory chip toggles back off', true);

    // Palette — the colour must reach the rendered SVG, not just the label.
    await pg.locator('#pg-color-jacket').fill('#365de6');
    await page.waitForTimeout(500);
    check('colour picker updates its hex label',
      (await text(pg.locator('label[for="pg-color-jacket"] code'))) === '#365DE6');
    check('colour picker reaches the snippet', (await pgSnippet()).includes("jacket: '#365de6'"));
    check('colour picker repaints the live rig',
      (await pg.locator('.docs-player-stage svg').first().innerHTML()).toLowerCase().includes('#365de6'));
    await shot(page, '03-playground');

    // Alpha plate switch.
    await pg.locator('.pg-seg[aria-label="Playground preview"] button', { hasText: 'Alpha plate' }).click();
    await page.waitForSelector(`${PG} .checkerboard`);
    await page.waitForTimeout(700);
    check('alpha plate is 720×720', (await text(pg.locator('.docs-slate'))).includes('720×720'));
    check('alpha plate draws no environment', await page.locator(`${pgStage} [data-scene]`).count() === 0);
    check('alpha plate draws no weather overlay', await page.locator(`${pgStage} [data-weather-pass]`).count() === 0);
    await page.waitForSelector(`${pgStage} [data-character="juno"]`, { timeout: 15000 });
    check('alpha plate keeps the character', await page.locator(`${pgStage} [data-character="juno"]`).count() === 1);
    check('alpha snippet switches composition', (await pgSnippet()).includes('CharacterOnly'));
    await shot(page, '04-alpha-plate');
    await pg.locator('.pg-seg[aria-label="Playground preview"] button', { hasText: 'Scene' }).click();
    await page.waitForSelector(`${pgStage} [data-scene="park"]`);
    await page.waitForTimeout(600);
    check('scene view restores the world', (await text(pg.locator('.docs-slate'))).includes('1280×720'));
    check('scene snippet switches back', (await pgSnippet()).includes('WalkScene'));

    // Actions.
    await pg.locator('.pg-seg[aria-label="Weather"] button', { hasText: 'Fog' }).click();
    await page.waitForSelector(`${pgStage} [data-weather="fog"]`);
    await pg.getByRole('button', { name: 'Copy props', exact: true }).click();
    await page.waitForTimeout(300);
    check('copy props toast', (await text(page.locator('.docs-toast'))).includes('inputProps copied'));
    check('clipboard holds a props expression',
      (await page.evaluate(() => navigator.clipboard.readText())).startsWith('castSceneSettings('));

    const presetDl = page.waitForEvent('download');
    await pg.getByRole('button', { name: 'Download preset', exact: true }).click();
    const presetFile = await presetDl;
    const presetBody = JSON.parse(fs.readFileSync(await presetFile.path(), 'utf8'));
    check('download filename tracks the look', presetFile.suggestedFilename() === 'stride-juno-talk.json',
      presetFile.suggestedFilename());
    check('download is a v2 envelope', presetBody.version === 2, `v${presetBody.version}`);
    const reparsed = parsePreset(presetBody);
    check('downloaded preset validates with parsePreset', reparsed.ok,
      reparsed.ok ? '' : reparsed.errors.join('; '));
    check('downloaded preset round-trips the live look',
      reparsed.ok && reparsed.preset.settings.character === 'juno'
      && reparsed.preset.settings.motion === 'talk' && reparsed.preset.settings.colors.jacket === '#365de6');
    check('downloaded preset round-trips weather',
      reparsed.ok && reparsed.preset.settings.weather === 'fog',
      reparsed.ok ? reparsed.preset.settings.weather : 'not ok');

    const beforeRoll = await playgroundSnapshot(page);
    await pg.getByRole('button', { name: 'Randomize', exact: true }).click();
    await page.waitForTimeout(800);
    check('randomize toast', (await text(page.locator('.docs-toast'))).includes('New look rolled'));
    const afterRoll = await playgroundSnapshot(page);
    check('randomize actually changes the look', JSON.stringify(beforeRoll) !== JSON.stringify(afterRoll));
    check('randomize keeps the Player alive', await pg.locator('.docs-player-error').count() === 0
      && await pg.locator('[data-docs-player]').count() === 1);

    await pg.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.waitForTimeout(900);
    check('reset toast', (await text(page.locator('.docs-toast'))).includes('reset to the opening look'));
    const afterReset = await playgroundSnapshot(page);
    check('reset restores every control and the snippet',
      JSON.stringify(afterReset) === JSON.stringify(opening),
      JSON.stringify(afterReset) === JSON.stringify(opening) ? '' : 'snapshot differs');
    check('reset restores the preset name', (await text(pg.locator('.pg-stage-bar'))).includes('Morning stroll'));

    /* ================================================================ */
    banner('composition explorer');
    /* ================================================================ */
    await page.locator('.docs-nav a', { hasText: 'Compositions' }).click();
    await page.waitForSelector(`${CE} [data-docs-player]`);
    await page.waitForTimeout(1200);
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
      check(`${id}: slate geometry`, (await text(page.locator(`${CE} .docs-slate`))).includes(want.slate),
        await text(page.locator(`${CE} .docs-slate`)));
      check(`${id}: snippet matches tab`, (await text(page.locator(`${CE} .docs-code pre`))).includes(want.snippet));
      const chipTexts = await page.locator(`${CE} .docs-chips .chip`).allTextContents();
      check(`${id}: prop chips present`, chipTexts.length >= 4, chipTexts.join(','));
      check(`${id}: chips are tab-specific`, chipTexts.some((t) => t.includes(want.keyProp)), chipTexts.join(','));
      check(`${id}: no player error`, await page.locator(`${CE} .docs-player-error`).count() === 0);
    }
    // dialogue duration is derived, not typed
    await page.locator('#comp-tab-dialogue').click();
    await page.waitForSelector(`${CE} [data-docs-comp-panel="dialogue"]`);
    await page.waitForTimeout(800);
    const dial = await text(page.locator(`${CE} [data-docs-frame]`));
    check('dialogue duration derived from the script', dial.endsWith(`/ ${dialogue.durationInFrames}`),
      `${dial} vs ${dialogue.durationInFrames}`);
    check('dialogue note quotes the same number',
      (await text(page.locator(`${CE} .docs-note`))).includes(`durationInFrames: ${dialogue.durationInFrames}`));
    // secondary examples start paused, and play on demand
    await page.waitForTimeout(600);
    const heldComp = await text(page.locator(`${CE} [data-docs-frame]`));
    await page.waitForTimeout(500);
    check('secondary example does not autoplay', heldComp === (await text(page.locator(`${CE} [data-docs-frame]`))), heldComp);
    await page.locator(`${CE} .docs-play-btn`).click();
    await page.waitForTimeout(700);
    check('secondary example plays on demand', heldComp !== (await text(page.locator(`${CE} [data-docs-frame]`))));
    await page.locator(`${CE} .docs-play-btn`).click();
    await page.locator(`${CE} .docs-code-copy`).click();
    await page.waitForTimeout(250);
    check('composition copy toast', (await text(page.locator('.docs-toast'))).includes('copied'));
    await page.locator('#comp-tab-walk').click();
    await page.waitForTimeout(600);
    await page.locator('#docs-compositions').scrollIntoViewIfNeeded();
    await shot(page, '05-compositions');

    /* ================================================================ */
    banner('cast & motion explorer');
    /* ================================================================ */
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
      (await text(page.locator(`${CM} .docs-code pre`))).includes("castSceneSettings('juno'"));
    await page.locator('#sheet-tab-emotion').click();
    await page.waitForSelector(`${CM} [data-docs-sheet-panel="emotion"]`);
    await page.waitForTimeout(700);
    check('emotion sheet mounts', await page.locator(`${CM} [data-docs-player]`).count() === 1);
    check('emotion sheet no error', await page.locator(`${CM} .docs-player-error`).count() === 0);
    await shot(page, '06-cast');

    // clicking a cast card loads the playground and scrolls there
    await page.locator(`${CM} .cast-card`, { hasText: 'Kwame' }).click();
    await page.waitForTimeout(1800);
    check('cast card routes to the playground', await page.evaluate(() => location.hash) === '#/docs/playground',
      await page.evaluate(() => location.hash));
    check('cast card loads that character', await page.locator('#pg-character').inputValue() === 'kwame',
      await page.locator('#pg-character').inputValue());
    check('cast card names the preset', (await text(page.locator(`${PG} .pg-stage-bar`))).includes('Kwame'));
    check('cast card toast', (await text(page.locator('.docs-toast'))).includes('Kwame'));
    check('playground renders the loaded cast', await page.locator(`${PG} [data-character="kwame"]`).count() === 1);

    /* ================================================================ */
    banner('scene explorer');
    /* ================================================================ */
    await page.locator('#docs-scenes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const sceneStage = `${SE} .docs-player-stage`;
    check('scene plate mounts', await page.locator(`${SE} [data-docs-player="SceneOnly"]`).count() === 1);
    check('scene plate draws no character', await page.locator(`${sceneStage} [data-character]`).count() === 0);
    check('scene defaults to street/golden',
      await page.locator(`${sceneStage} [data-scene="street"][data-time-of-day="golden"]`).count() === 1);
    const sceneOrder: string[] = [...SCENES.map((s) => s.id).filter((id) => id !== 'street'), 'street'];
    for (const s of sceneOrder) {
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
    check('palette is labelled with the lookup',
      (await text(page.locator(`${SE} .pg-group-title`))).includes("paletteFor('night')"));
    await page.locator('#scene-parallax').fill('0.25');
    await page.locator('#scene-speed').fill('1.5');
    await page.locator(`${SE} .pg-seg[aria-label="Direction"] button`, { hasText: 'Left' }).click();
    await page.waitForTimeout(400);
    const sceneSnip = await text(page.locator(`${SE} .docs-code pre`));
    check('scene snippet reflects parallax', sceneSnip.includes('parallax={0.25}'));
    check('scene snippet reflects non-default speed', sceneSnip.includes('speed={1.5}'));
    check('scene snippet reflects direction', sceneSnip.includes('direction={-1}'));

    // Weather — the explorer opens on rain, so the snippet carries it.
    check('scene explorer weather segment has every option',
      await page.locator(`${SE} .pg-seg[aria-label="Weather"] button`).count() === WEATHERS.length);
    check('scene snippet emits the active weather', sceneSnip.includes('weather="rain"'));
    await page.locator(`${SE} .pg-seg[aria-label="Weather"] button`, { hasText: 'Clear' }).click();
    await page.waitForTimeout(400);
    check('clear weather removes the overlay', await page.locator(`${sceneStage} [data-weather]`).count() === 0);
    const sceneSnipClear = await text(page.locator(`${SE} .docs-code pre`));
    check('clear weather is absent from the snippet', !sceneSnipClear.includes('weather='));
    await page.locator(`${SE} .pg-seg[aria-label="Weather"] button`, { hasText: 'Snow' }).click();
    await page.waitForSelector(`${sceneStage} [data-weather="snow"]`);
    check('scene weather switch updates the plate', true);
    check('scene slider output shows value',
      (await text(page.locator('label[for="scene-speed"] output'))) === '1.50×');
    await shot(page, '07-scenes');

    // send to playground keeps the character, replaces the scene fields
    await page.locator(`${SE} .pg-seg[aria-label="Scene"] button`, { hasText: 'Park' }).click();
    await page.getByRole('button', { name: 'Send to playground' }).click();
    await page.waitForTimeout(1800);
    check('send-to-playground routes back', await page.evaluate(() => location.hash) === '#/docs/playground');
    check('send keeps the character', await page.locator('#pg-character').inputValue() === 'kwame',
      await page.locator('#pg-character').inputValue());
    check('send applies the scene', await page.locator('#pg-scene').inputValue() === 'park',
      await page.locator('#pg-scene').inputValue());
    check('send applies the lighting',
      await text(page.locator(`${PG} .pg-seg[aria-label="Time of day"] button[aria-pressed="true"]`)) === 'Night');
    check('send applies the weather',
      await text(page.locator(`${PG} .pg-seg[aria-label="Weather"] button[aria-pressed="true"]`)) === 'Snow');
    check('send applies parallax', await page.locator('#pg-parallax').inputValue() === '0.25',
      await page.locator('#pg-parallax').inputValue());
    check('send marks the look custom', (await text(page.locator(`${PG} .pg-stage-bar`))).includes('Custom'));
    check('send toast', (await text(page.locator('.docs-toast'))).includes('applied'));

    /* ================================================================ */
    banner('preset panel');
    /* ================================================================ */
    await page.locator('#docs-presets').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    check('one card per built-in preset', await page.locator(`${PP} .preset-card`).count() === PRESETS.length,
      String(PRESETS.length));
    const night = PRESETS.find((p) => p.name === 'Night shift')!;
    await page.locator(`${PP} .preset-card`, { hasText: 'Night shift' }).click();
    await page.waitForTimeout(1800);
    check('preset card routes to the playground', await page.evaluate(() => location.hash) === '#/docs/playground');
    check('preset card loads its character', await page.locator('#pg-character').inputValue() === night.settings.character);
    check('preset card loads its motion', await page.locator('#pg-motion').inputValue() === night.settings.motion);
    check('preset name shows in the stage bar', (await text(page.locator(`${PG} .pg-stage-bar`))).includes('Night shift'));
    check('preset card marked active',
      (await text(page.locator(`${PP} .preset-card.active`))).includes('Night shift'));

    await page.locator('#docs-presets').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    // empty
    await page.getByRole('button', { name: 'Validate', exact: true }).click();
    await page.waitForSelector(`${PP} [data-docs-preset-result="bad"]`);
    check('empty import is rejected', (await text(page.locator(`${PP} .preset-result.bad`))).includes('Paste a preset first'));
    // malformed
    await page.locator('#preset-json').fill('{ not json');
    await page.getByRole('button', { name: 'Validate', exact: true }).click();
    await page.waitForTimeout(300);
    check('malformed JSON reports the parser error',
      (await text(page.locator(`${PP} .preset-result.bad`))).includes('Not valid JSON'));
    // unknown character
    await page.locator('#preset-json').fill('{"version":2,"settings":{"character":"nobody"}}');
    await page.getByRole('button', { name: 'Validate', exact: true }).click();
    await page.waitForTimeout(300);
    check('unknown character is reported with the fix',
      (await text(page.locator(`${PP} .preset-result.bad`))).includes('registerCharacter'));
    // bad enum
    await page.locator('#preset-json').fill('{"version":2,"settings":{"character":"ada","motion":"teleport"}}');
    await page.getByRole('button', { name: 'Validate', exact: true }).click();
    await page.waitForTimeout(300);
    check('bad enum is reported', await page.locator(`${PP} .preset-result.bad li`).count() >= 1,
      (await text(page.locator(`${PP} .preset-result.bad`))).slice(0, 90));
    // v1 migration
    await page.getByRole('button', { name: 'Paste v1 example' }).click();
    await page.getByRole('button', { name: 'Validate', exact: true }).click();
    await page.waitForSelector(`${PP} [data-docs-preset-result="ok"]`);
    check('v1 example validates', (await text(page.locator(`${PP} .preset-result.ok`))).includes('Legacy look'));
    check('migration note shown',
      (await text(page.locator(`${PP} [data-docs-migration]`))).includes('Migrated v1 → v2'),
      await text(page.locator(`${PP} [data-docs-migration]`)));
    await shot(page, '08-presets');
    await page.locator(`${PP} .preset-result.ok`).getByRole('button', { name: 'Load into playground' }).click();
    await page.waitForTimeout(1800);
    check('imported preset loads its character', await page.locator('#pg-character').inputValue() === 'kwame');
    check('v1 environment migrated to timeOfDay',
      await text(page.locator(`${PG} .pg-seg[aria-label="Time of day"] button[aria-pressed="true"]`)) === 'Night');
    // current-version envelope: no migration note
    await page.locator('#docs-presets').scrollIntoViewIfNeeded();
    await page.locator('#preset-json').fill(JSON.stringify({ version: 2, name: 'Current', settings: { character: 'pip', motion: 'jump' } }));
    await page.getByRole('button', { name: 'Validate', exact: true }).click();
    await page.waitForTimeout(300);
    check('v2 envelope needs no migration',
      (await text(page.locator(`${PP} .preset-result.ok`))).includes('no migration needed'));
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
    check('downloaded preset is a v2 envelope', body.version === 2 && body.settings.character === 'pip',
      file.suggestedFilename());
    check('downloaded preset carries the imported motion', body.settings.motion === 'jump');
    check('download filename tracks the look', file.suggestedFilename() === 'stride-pip-jump.json', file.suggestedFilename());
    check('preset API snippet present', (await text(page.locator(`${PP} .docs-code pre`))).includes('serializePresetJSON'));

    /* ================================================================ */
    banner('export, architecture and the studio round-trip');
    /* ================================================================ */
    await page.locator('#docs-export').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    check('one card per export recipe',
      await page.locator('#docs-export .recipe').count() === EXPORT_RECIPES.length, String(EXPORT_RECIPES.length));
    const recipeText = await text(page.locator('#docs-export .recipe-grid'));
    check('every recipe names its npm script',
      EXPORT_RECIPES.every((r) => recipeText.includes(r.command)));
    check('alpha recipes all pass --image-format=png',
      EXPORT_RECIPES.filter((r) => r.id !== 'mp4').every((r) => r.flags.includes('--image-format=png'))
      && recipeText.includes('--image-format=png'));
    check('alpha gotcha callout is present',
      (await text(page.locator('#docs-export .docs-note.warn'))).includes('Alpha needs PNG frames'));
    check('CI honesty note is present',
      (await page.locator('#docs-export .docs-note').allTextContents()).join(' ').includes('render-smoke'));
    const zipHref = await page.locator('#docs-export a[download]').getAttribute('href');
    check('kit ZIP link points at the built asset', zipHref === '/stride-remotion-kit.zip', String(zipHref));
    const zipResponse = await page.request.get(`${BASE}/stride-remotion-kit.zip`);
    const zipBytes = await zipResponse.body();
    check('kit ZIP is actually served', zipResponse.status() === 200 && zipBytes.length > 100_000,
      `${zipResponse.status()} · ${(zipBytes.length / 1024).toFixed(0)} KB`);
    check('kit ZIP really is a ZIP', zipBytes.subarray(0, 2).toString() === 'PK');
    const exportCopy = page.locator('#docs-export .docs-code-copy').first();
    await exportCopy.click();
    await page.waitForTimeout(250);
    // Export blocks carry no toast handler by design — the button owns the state.
    check('export copy button confirms in place', (await text(exportCopy)) === 'Copied', await text(exportCopy));
    check('export copy puts the command on the clipboard',
      (await page.evaluate(() => navigator.clipboard.readText())) === EXPORT_RECIPES[0].command);
    await shot(page, '09-export');

    await page.locator('#docs-architecture').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    check('layer stack shows the four layers', await page.locator('#docs-architecture .layer').count() === 4);
    check('architecture states the determinism rules',
      await page.locator('#docs-architecture .arch-list').first().locator('li').count() === 5);
    const coverage = (await page.locator('#docs-architecture .arch-list').last().allTextContents()).join(' ');
    check('coverage lists unit tests, goldens and both browser smokes',
      coverage.includes('unit tests') && coverage.includes('golden')
      && coverage.includes('studio') && coverage.includes('docs'), coverage.slice(0, 160));
    await shot(page, '10-architecture');

    await page.locator('.docs-top-actions a', { hasText: 'Studio' }).click();
    await page.waitForSelector('.app [data-character], [data-character="milo"]', { timeout: 20000 });
    await page.waitForTimeout(800);
    check('back-to-studio unmounts the docs', await page.locator('.docs-root').count() === 0);
    check('studio still renders its rig', await page.locator('[data-character="milo"]').count() >= 1);
    await page.locator('.nav-docs-link').click();
    await page.waitForSelector('.docs-hero [data-docs-player]', { timeout: 20000 });
    check('studio Docs link returns to the docs', await page.locator('.docs-root').count() === 1);

    await context.close();

    /* ================================================================ */
    banner('mobile 390×844');
    /* ================================================================ */
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const m = await mobileContext.newPage();
    m.on('pageerror', (e) => failures.push(`mobile pageerror: ${e.message}`));
    m.on('console', (c) => {
      if (c.type() === 'error') failures.push(`mobile console: ${c.text()}`);
    });
    await m.goto(`${BASE}/#/docs/compositions`, { waitUntil: 'domcontentloaded' });
    await m.waitForSelector(`${CE} [data-docs-player]`, { timeout: 30000 });
    await m.waitForTimeout(1500);
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('mobile no horizontal overflow', overflow <= 1, `overflow=${overflow}`);
    check('mobile nav is reachable', await m.locator('.docs-nav').isVisible()
      && await m.locator('.docs-nav a').count() === NAV.length);
    await m.locator('#comp-tab-head').click();
    await m.waitForSelector(`${CE} [data-docs-comp-panel="head"]`);
    await m.waitForTimeout(700);
    check('mobile composition tabs work', await m.locator(`${CE} [data-docs-player]`).count() === 1);
    await shot(m, '11-mobile-compositions');
    await m.locator('#docs-cast').scrollIntoViewIfNeeded();
    await m.waitForTimeout(700);
    const castCols = await m.evaluate(() => getComputedStyle(document.querySelector('.cast-cards')!).gridTemplateColumns.split(' ').length);
    check('mobile cast cards stack', castCols === 1, String(castCols));
    await shot(m, '12-mobile-cast');
    await m.locator('#docs-scenes').scrollIntoViewIfNeeded();
    await m.locator(`${SE} .pg-seg[aria-label="Scene"] button`, { hasText: 'Room' }).click();
    await m.waitForSelector(`${SE} [data-scene="room"]`);
    check('mobile scene controls live', true);
    await shot(m, '13-mobile-scenes');
    await m.locator('#docs-presets').scrollIntoViewIfNeeded();
    await m.locator('#preset-json').scrollIntoViewIfNeeded();
    await m.locator('#preset-json').fill('{"version":1,"settings":{"character":"ada","environment":"golden"}}');
    await m.getByRole('button', { name: 'Validate', exact: true }).click();
    await m.waitForSelector(`${PP} [data-docs-preset-result="ok"]`);
    check('mobile import works', true);
    await shot(m, '14-mobile-presets');

    // The playground must be usable on a phone, not just visible.
    await m.locator('#docs-playground').scrollIntoViewIfNeeded();
    await m.waitForTimeout(900);
    check('mobile controls are reachable', await m.locator(`${PG} [data-docs-controls]`).isVisible());
    await m.locator('#pg-character').scrollIntoViewIfNeeded();
    await m.locator('#pg-character').selectOption('ada');
    await m.waitForSelector(`${PG} .docs-player-stage [data-character="ada"]`);
    check('mobile select drives the Player', true);
    await m.locator('#pg-speed').scrollIntoViewIfNeeded();
    await m.locator('#pg-speed').fill('1.75');
    await m.waitForTimeout(400);
    check('mobile slider drives the snippet',
      (await text(m.locator(`${PG} .docs-code pre`).first())).includes('speed: 1.75'));
    await shot(m, '15-mobile-playground');
    const overflow2 = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('mobile still no overflow after interaction', overflow2 <= 1, `overflow=${overflow2}`);
    await mobileContext.close();

    /* ================================================================ */
    banner('prefers-reduced-motion');
    /* ================================================================ */
    const calmContext = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    const calm = await calmContext.newPage();
    calm.on('pageerror', (e) => failures.push(`reduced-motion pageerror: ${e.message}`));
    calm.on('console', (c) => {
      if (c.type() === 'error') failures.push(`reduced-motion console: ${c.text()}`);
    });
    await calm.goto(`${BASE}/#/docs`, { waitUntil: 'domcontentloaded' });
    await calm.waitForSelector('.docs-hero [data-docs-player]', { timeout: 30000 });
    await calm.waitForTimeout(1500);
    const calmFrame = await text(calm.locator('.docs-hero [data-docs-frame]'));
    await calm.waitForTimeout(900);
    check('reduced motion disables hero autoplay',
      calmFrame === (await text(calm.locator('.docs-hero [data-docs-frame]'))), calmFrame);
    check('reduced motion still offers playback',
      await calm.locator('.docs-hero').getByRole('button', { name: 'WalkScene play' }).count() === 1);
    await calm.locator('.docs-hero .docs-play-btn').click();
    await calm.waitForTimeout(800);
    check('reduced motion plays on demand',
      calmFrame !== (await text(calm.locator('.docs-hero [data-docs-frame]'))));
    // Weather renders statically under reduced motion — no autoplay needed.
    await calm.locator('#docs-scenes').scrollIntoViewIfNeeded();
    await calm.waitForSelector(`${SE} [data-weather="rain"]`, { timeout: 15000 });
    check('reduced motion still renders weather', true);
    await calmContext.close();
  } finally {
    await browser.close();
  }
}

try {
  await main();
} catch (err) {
  failures.push(`harness crashed during "${step}": ${err instanceof Error ? err.message : String(err)}`);
}

console.log(`\n${passed} checks passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFAILURES:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(`Docs smoke passed: shell, hero, playground, explorers, presets, export, mobile and reduced motion — no console/page errors. Screenshots in ${SHOTS}/docs-*.png`);