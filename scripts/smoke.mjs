import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const errors = [];
fs.mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
// `reducedMotion: 'reduce'` is load-bearing, not cosmetic: src/styles.css de-animates
// every element under that media query (`* { animation-duration: .01ms !important }`),
// so `.modal` (pop .18s) and `.modal-backdrop` (fade .15s) never move a bounding box
// while Playwright is trying to click inside them. Without it the export-modal click
// is a timing lottery on a slow runner ("element is not stable"). scripts/docs-smoke.mts
// already does this for its calm context; the two harnesses now agree.
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-character="milo"]', { timeout: 15000 });
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/desktop-studio.png', fullPage: true });

// Playback controls
await page.getByRole('button', { name: 'Pause', exact: true }).click();
await page.waitForTimeout(120);
const f1 = await page.locator('.frame-readout').textContent();
await page.waitForTimeout(350);
const f2 = await page.locator('.frame-readout').textContent();
if (f1 !== f2) errors.push(`pause did not hold frame: ${f1} -> ${f2}`);
await page.getByRole('button', { name: 'Next frame' }).click();
await page.getByRole('button', { name: 'Play', exact: true }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'Pause', exact: true }).click();

// Live controls
await page.getByRole('button', { name: /Surprised Oh, hello there!/ }).click();
await page.waitForSelector('[data-face="surprised"]');
await page.locator('input[aria-label="Speed"]').fill('1.5');
await page.getByRole('switch', { name: 'Rig guides' }).click();
await page.waitForSelector('[data-rig-guides="true"]');
await page.getByRole('button', { name: 'Night', exact: true }).click();
await page.waitForSelector('[data-scene="street"][data-time-of-day="night"]');
await page.getByRole('button', { name: '← Left' }).click();
await page.waitForSelector('[data-character="milo"][transform="scale(-1 1)"]');
await page.getByRole('button', { name: 'Run', exact: true }).click();
await page.waitForTimeout(150);
if (!(await page.locator('.stage-meta').textContent()).includes('Run cycle')) errors.push('motion label not updated');

// Weather (the wrapper attribute is on the stage; the overlay rides the scene view)
await page.getByRole('button', { name: 'Rain', exact: true }).click();
await page.waitForSelector('.player-wrap[data-weather="rain"]');
await page.getByRole('button', { name: 'Clear', exact: true }).click();
await page.waitForSelector('.player-wrap[data-weather="clear"]');
if (await page.locator('svg [data-weather-pass]').count()) errors.push('clear weather still drew an overlay');
await page.getByRole('button', { name: 'Character only' }).click();
await page.waitForSelector('.checkerboard [data-character="milo"]');
await page.screenshot({ path: 'screenshots/character-only.png', fullPage: true });
await page.getByRole('button', { name: 'Street', exact: true }).click();

// Reference overlay
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await page.locator('input[type="file"]').setInputFiles({ name: 'ref.png', mimeType: 'image/png', buffer: png });
await page.waitForSelector('.reference-overlay');
await page.locator('input[aria-label="Reference opacity"]').fill('0.6');
await page.getByRole('button', { name: 'Remove all references' }).click();
await page.waitForSelector('.reference-overlay', { state: 'detached' });

// Presets
await page.getByRole('button', { name: 'Save preset' }).click();
await page.locator('.save-modal input').fill('Smoke test look');
await page.getByRole('button', { name: 'Save preset', exact: true }).last().click();
await page.waitForSelector('.toast');
// `.toast` is position:fixed at the bottom centre and can sit on top of the next
// click target. Wait for it to leave the DOM rather than padding with a sleep.
await page.waitForSelector('.toast', { state: 'detached' });
await page.locator('select[aria-label="Load preset"]').selectOption({ label: 'Smoke test look' });
await page.getByRole('button', { name: 'Delete preset' }).click();
await page.waitForSelector('.toast');
await page.waitForSelector('.toast', { state: 'detached' });

// Export dialog
await page.getByRole('button', { name: /Export kit/ }).click();
await page.waitForSelector('.export-modal');
// Belt and braces: let any entrance animation finish before the first in-modal click.
await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
await page.getByRole('button', { name: 'SVG frame' }).click();
await page.waitForSelector('.svg-preview svg');
const dl = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download SVG' }).click();
const download = await dl;
if (!download.suggestedFilename().endsWith('.svg')) errors.push('SVG download filename wrong');
await page.getByRole('button', { name: 'Props JSON' }).click();
await page.getByRole('button', { name: 'Close export dialog' }).click();

// Secondary views
await page.getByRole('button', { name: 'Components' }).click();
await page.waitForSelector('.component-grid');
if (await page.locator('.component-card').count() !== 4) errors.push('expected 4 component cards');
await page.screenshot({ path: 'screenshots/components.png', fullPage: true });
await page.getByRole('button', { name: 'Remotion guide' }).click();
await page.waitForSelector('.guide-steps');
if (await page.locator('.guide-step').count() !== 6) errors.push('expected 6 guide steps');
await page.screenshot({ path: 'screenshots/guide.png', fullPage: true });

// Mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
mobile.on('console', (m) => { if (m.type() === 'error') errors.push(`mobile console: ${m.text()}`); });
mobile.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`));
await mobile.goto(BASE, { waitUntil: 'networkidle' });
await mobile.waitForSelector('[data-character="milo"]');
await mobile.waitForTimeout(400);
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (overflow > 1) errors.push(`mobile horizontal overflow ${overflow}px`);
await mobile.screenshot({ path: 'screenshots/mobile-studio.png', fullPage: true });
await mobile.getByRole('button', { name: /Happy/ }).click();
await mobile.waitForSelector('[data-face="happy"]');
await mobile.locator('.inspector').scrollIntoViewIfNeeded();
await mobile.screenshot({ path: 'screenshots/mobile-inspector.png', fullPage: true });

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Smoke test passed: desktop + mobile, playback, controls, reference overlay, presets, export, secondary views.');
