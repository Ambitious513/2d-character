/**
 * Large-format rig inspection. Renders a few characters big enough to judge
 * silhouette, limb separation and hand readability.
 *
 *   npx tsx scripts/inspect.tsx
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterRig } from '../src/rig/Character';
import { characterSettings, CAST } from '../src/rig/cast';
import type { CharacterSettings } from '../src/rig/types';

const OUT = 'preview';

function panel(label: string, s: CharacterSettings, frame: number, guides = false) {
  const art = renderToStaticMarkup(
    <svg viewBox="-140 -400 280 420" xmlns="http://www.w3.org/2000/svg">
      <CharacterRig settings={s} frame={frame} fps={30} showGuides={guides} />
    </svg>,
  );
  return `<figure><div class="art">${art}</div><figcaption>${label}</figcaption></figure>`;
}

const items: string[] = [];
for (const c of CAST) {
  items.push(panel(`${c.name} · idle`, characterSettings(c.id, { motion: 'idle' }), 12));
}
for (const m of ['idle', 'wave', 'talk', 'walk', 'think', 'point'] as const) {
  items.push(panel(`Milo · ${m}`, characterSettings('milo', { motion: m, dialogue: 'Hello there, friend!' }), 14, true));
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:#F5F4EF;font-family:ui-sans-serif,system-ui,sans-serif;color:#26352E}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
figure{margin:0;background:#FFFDF6;border:1px solid #E2DFD2;border-radius:14px;padding:10px}
.art{height:420px}.art svg{width:100%;height:100%}
figcaption{font-size:14px;padding-top:8px;text-align:center;font-weight:600}
</style></head><body><div class="grid">${items.join('')}</div></body></html>`;

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/inspect.html`, html);

const { chromium } = await import('@playwright/test');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.6 });
await page.goto(`file://${process.cwd()}/${OUT}/inspect.html`);
await page.waitForTimeout(250);
const figs = await page.$$('figure');
for (let i = 0; i < figs.length; i++) {
  await figs[i].screenshot({ path: `${OUT}/big-${String(i).padStart(2, '0')}.png` });
}
await browser.close();
console.log(`Wrote ${figs.length} panels to ${OUT}/big-*.png`);
