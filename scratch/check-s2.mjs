import { chromium } from '@playwright/test';
import fs from 'node:fs';
const BASE = 'http://localhost:5173';
const errors = [];
const ok = [];
const check = (name, cond, extra='') => { (cond ? ok : errors).push(`${cond?'PASS':'FAIL'} ${name} ${extra}`); };
const browser = await chromium.launch({ args: ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
page.on('console', m => { if (m.type()==='error') errors.push('console: '+m.text()); });
page.on('pageerror', e => errors.push('pageerror: '+e.message));
await page.goto(BASE + '/#/docs/playground', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-docs-playground] [data-docs-player="Playground"]', { timeout: 20000 });
await page.waitForTimeout(1500);
const PG = '[data-docs-playground]';
const stage = `${PG} .docs-player-stage`;
check('playground player mounted', await page.locator(`${PG} [data-docs-player="Playground"]`).count() === 1);
check('hero player still unique', await page.locator('[data-docs-player="WalkScene"]').count() === 1);
check('nav has playground', (await page.locator('.docs-nav a').allTextContents()).join('|').includes('Playground'));
const indexes = await page.locator('.docs-index').allTextContents();
check('section numbering sequential', indexes.join(',') === indexes.map((_, i) => String(i + 2).padStart(2, '0')).join(','), indexes.join(','));
const frame1 = await page.locator('[data-docs-frame="Playground"]').textContent();
await page.waitForTimeout(600);
check('playground autoplays', frame1 !== await page.locator('[data-docs-frame="Playground"]').textContent(), frame1);

// character
await page.selectOption('#pg-character', 'ada');
await page.waitForSelector(`${stage} [data-character="ada"]`);
check('character select updates rig', true);
// motion + emotion
await page.selectOption('#pg-motion', 'run');
await page.selectOption('#pg-emotion', 'surprised');
await page.waitForSelector(`${stage} [data-face="surprised"]`);
check('emotion select updates face', true);
// scene + lighting
await page.selectOption('#pg-scene', 'park');
await page.waitForSelector(`${stage} [data-scene="park"]`);
await page.locator(`${PG} .pg-seg[aria-label="Time of day"] button`, { hasText: 'Night' }).click();
await page.waitForSelector(`${stage} [data-scene="park"][data-time-of-day="night"]`);
check('scene + time of day update environment', true);
// sliders
await page.locator('#pg-speed').fill('1.75');
await page.locator('#pg-parallax').fill('0.3');
await page.waitForTimeout(250);
const snip = await page.locator(`${PG} .docs-code pre`).last().textContent();
check('snippet reflects speed', snip.includes('speed: 1.75'), '');
check('snippet reflects parallax', snip.includes('parallax: 0.3'));
check('snippet reflects cast', snip.includes("castSceneSettings('ada'"));
check('slider output shows value', (await page.locator('label[for="pg-speed"] output').textContent()) === '1.75×');
// direction
await page.locator(`${PG} .pg-seg[aria-label="Direction"] button`, { hasText: 'Left' }).click();
await page.waitForSelector(`${stage} [data-character="ada"][transform="scale(-1 1)"]`);
check('direction toggle flips rig', true);
// guides
await page.getByRole('switch', { name: 'Rig guides' }).click();
await page.waitForSelector(`${stage} [data-rig-guides="true"]`);
check('guides switch draws skeleton', true);
await page.getByRole('switch', { name: 'Rig guides' }).click();
// accessories
const glasses = page.getByRole('button', { name: 'Glasses', exact: true });
const wasPressed = await glasses.getAttribute('aria-pressed');
await glasses.click();
check('accessory chip toggles', await glasses.getAttribute('aria-pressed') !== wasPressed, `${wasPressed} -> ${await glasses.getAttribute('aria-pressed')}`);
await glasses.click();
check('accessory chip toggles back', await glasses.getAttribute('aria-pressed') === wasPressed);
// colours
await page.locator('#pg-color-jacket').fill('#365de6');
await page.waitForTimeout(200);
check('colour picker in snippet', (await page.locator(`${PG} .docs-code pre`).last().textContent()).includes('#365de6'));
// speech
await page.selectOption('#pg-motion', 'talk');
await page.locator('#pg-dialogue').fill('Determinism is the whole product.');
await page.getByRole('switch', { name: 'Subtitles' }).click();
await page.waitForTimeout(400);
check('subtitles burned in', (await page.locator(`${stage}`).textContent()).includes('Determinism'));
check('speech frames derived', /frames of lip-sync/.test(await page.locator(`${PG} .pg-group-title`, { hasText: 'Speech' }).textContent()), await page.locator(`${PG} .pg-group-title`, { hasText: 'Speech' }).textContent());
// follow camera
await page.getByRole('switch', { name: 'Follow camera' }).click();
check('follow camera switch off', await page.getByRole('switch', { name: 'Follow camera' }).getAttribute('aria-checked') === 'false');
await page.screenshot({ path: 'screenshots/s2-playground-scene.png' });

// alpha plate
await page.locator(`${PG} .pg-seg[aria-label="Playground preview"] button`, { hasText: 'Alpha plate' }).click();
await page.waitForSelector(`${PG} .docs-player-stage.checkerboard`);
await page.waitForTimeout(700);
check('alpha plate checkerboard', true);
check('alpha snippet uses CharacterOnly', (await page.locator(`${PG} .docs-code pre`).last().textContent()).includes('CharacterOnly'));
check('alpha plate has no scene', await page.locator(`${stage} [data-scene]`).count() === 0);
await page.screenshot({ path: 'screenshots/s2-playground-alpha.png' });

// back to the scene view for the action checks
await page.locator(`${PG} .pg-seg[aria-label="Playground preview"] button`, { hasText: 'Scene' }).click();
await page.waitForSelector(`${stage} [data-scene]`);

// actions
await page.getByRole('button', { name: 'Copy props', exact: true }).click();
await page.waitForTimeout(250);
check('copy props toast', (await page.locator('.docs-toast').textContent()).includes('copied'));
const dl = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download preset', exact: true }).click();
const file = await dl;
const body = JSON.parse(fs.readFileSync(await file.path(), 'utf8'));
check('preset download is v2 envelope', body.version === 2 && body.settings.character === 'ada', file.suggestedFilename());
check('preset carries edits', body.settings.colors.jacket === '#365de6' && body.settings.motion === 'talk');
await page.getByRole('button', { name: 'Randomize', exact: true }).click();
await page.waitForTimeout(400);
check('randomize toast', (await page.locator('.docs-toast').textContent()).includes('rolled'));
check('randomize marked custom', (await page.locator(`${PG} .pg-stage-bar`).textContent()).includes('Custom'));
await page.getByRole('button', { name: 'Reset', exact: true }).click();
await page.waitForTimeout(600);
await page.waitForSelector(`${stage} [data-character="milo"]`);
check('reset restores milo', true);
check('reset restores scene', await page.locator(`${stage} [data-scene="street"][data-time-of-day="day"]`).count() === 1);
check('reset restores sliders', await page.locator('#pg-speed').inputValue() === '1');
check('reset toast', (await page.locator('.docs-toast').textContent()).includes('reset'));
// keyboard operability
await page.locator('#pg-bounce').focus();
await page.keyboard.press('ArrowRight');
check('slider keyboard operable', await page.locator('#pg-bounce').inputValue() !== '0.65', await page.locator('#pg-bounce').inputValue());
await page.close();

// mobile
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
m.on('pageerror', e => errors.push('mobile pageerror: '+e.message));
m.on('console', c => { if (c.type()==='error') errors.push('mobile console: '+c.text()); });
await m.goto(BASE + '/#/docs/playground', { waitUntil: 'domcontentloaded' });
await m.waitForSelector('[data-docs-playground] [data-docs-player="Playground"]');
await m.waitForTimeout(1200);
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('mobile no horizontal overflow', overflow <= 1, 'overflow='+overflow);
await m.locator('#pg-scene').scrollIntoViewIfNeeded();
await m.selectOption('#pg-scene', 'room');
await m.waitForSelector('[data-docs-playground] [data-scene="room"]');
check('mobile controls reachable + live', true);
await m.screenshot({ path: 'screenshots/s2-mobile-playground.png' });
await m.locator('#docs-playground .pg-actions').scrollIntoViewIfNeeded();
await m.screenshot({ path: 'screenshots/s2-mobile-actions.png' });
await browser.close();
console.log(ok.join('\n'));
console.log(errors.length ? '\nERRORS:\n' + errors.join('\n') : '\nno console/page errors, all checks passed');
process.exit(errors.length ? 1 : 0);
