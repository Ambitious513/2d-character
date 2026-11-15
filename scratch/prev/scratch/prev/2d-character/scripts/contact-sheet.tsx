/**
 * Contact sheet generator.
 *
 * Renders every cast member, motion, outfit, hair style, emotion and viseme to
 * static SVG, lays them out in an HTML grid and (if Chromium is available)
 * screenshots it. Used to eyeball rig changes without opening the studio.
 *
 *   npm run contact-sheet            # writes preview/contact-sheet.{html,png}
 *   npm run contact-sheet -- --no-shot
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterRig, CharacterHead } from '../src/rig/Character';
import { CAST, characterSettings } from '../src/rig/cast';
import {
  DEFAULT_SETTINGS,
  EMOTIONS,
  HAIR_STYLES,
  MOTIONS,
  OUTFITS,
  type CharacterSettings,
} from '../src/rig/types';
import { VISEMES } from '../src/rig/lipsync';

const OUT_DIR = 'preview';

function cell(label: string, sub: string, inner: string): string {
  return `<figure class="cell"><div class="art">${inner}</div><figcaption><b>${label}</b><span>${sub}</span></figcaption></figure>`;
}

function rigSvg(settings: CharacterSettings, frame: number, guides = false): string {
  // Render the whole <svg> through React so SVG attribute casing is preserved.
  return renderToStaticMarkup(
    <svg viewBox="-150 -430 300 450" xmlns="http://www.w3.org/2000/svg">
      <CharacterRig settings={settings} frame={frame} fps={30} showGuides={guides} />
    </svg>,
  );
}

function headSvg(settings: CharacterSettings, extra: Partial<Parameters<typeof CharacterHead>[0]> = {}): string {
  return renderToStaticMarkup(
    <CharacterHead
      emotion={settings.emotion}
      colors={settings.colors}
      glasses={settings.glasses}
      beard={settings.beard}
      freckles={settings.freckles}
      hair={settings.hair}
      cap={settings.cap}
      headphones={settings.headphones}
      {...extra}
    />,
  );
}

function row(title: string, note: string, cells: string[]): string {
  return `<section><h2>${title}<small>${note}</small></h2><div class="grid">${cells.join('')}</div></section>`;
}

const base = { ...DEFAULT_SETTINGS, motion: 'idle' as const, backpack: false };

const castRow = row(
  'Cast',
  'six data-driven characters, one rig',
  CAST.map((c) => cell(c.name, c.build, rigSvg({ ...characterSettings(c.id), motion: 'idle' }, 12))),
);

const motionRow = row(
  'Motions',
  'Milo · frame 14',
  MOTIONS.map((m) =>
    cell(m.label, m.note, rigSvg({ ...base, motion: m.id, dialogue: 'Hello there, friend!' }, 14)),
  ),
);

const walkRow = row(
  'Walk cycle',
  'Milo · one full cycle, guides on',
  Array.from({ length: 8 }, (_, i) =>
    cell(`phase ${(i / 8).toFixed(2)}`, 'stance lock', rigSvg({ ...base, motion: 'walk' }, i * 4.8, true)),
  ),
);

const outfitRow = row(
  'Outfits',
  'same skeleton, different garments',
  OUTFITS.map((o) => cell(o.label, o.id, rigSvg({ ...base, outfit: o.id }, 12))),
);

const hairRow = row(
  'Hair',
  'head space, back + front layers',
  HAIR_STYLES.map((h) => cell(h.label, h.id, headSvg({ ...base, hair: h.id }))),
);

const emotionRow = row(
  'Emotions',
  'seven expressions',
  EMOTIONS.map((e) => cell(e.label, e.note, headSvg({ ...base, emotion: e.id }))),
);

const visemeRow = row(
  'Visemes',
  'deterministic lip-sync shapes',
  VISEMES.map((v) => cell(v.label, v.id, headSvg(base, { mouth: v.id, mouthOpen: v.open }))),
);

const accessoryRow = row(
  'Accessories',
  'composable flags',
  (
    [
      ['Backpack', { backpack: true }],
      ['Glasses', { glasses: true }],
      ['Cap', { cap: true }],
      ['Scarf', { scarf: true }],
      ['Headphones', { headphones: true }],
      ['Beard', { beard: true }],
      ['Freckles', { freckles: true }],
      ['All on', { backpack: true, glasses: true, cap: true, scarf: true, beard: true, freckles: true }],
    ] as [string, Partial<CharacterSettings>][]
  ).map(([label, flags]) => cell(label, 'flag', rigSvg({ ...base, ...flags }, 12))),
);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Stride contact sheet</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; padding:28px 32px 48px; background:#F5F4EF; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif; color:#26352E; }
  h1 { font-size:26px; margin:0 0 4px; }
  .lede { margin:0 0 26px; color:#6B7A70; font-size:14px; }
  section { margin-bottom:30px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:.09em; margin:0 0 12px; display:flex; align-items:baseline; gap:12px; }
  h2 small { text-transform:none; letter-spacing:0; font-weight:400; color:#8A968D; font-size:12px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; }
  .cell { margin:0; background:#FFFDF6; border:1px solid #E2DFD2; border-radius:12px; padding:8px; }
  .art { height:190px; display:flex; align-items:flex-end; justify-content:center; }
  .art svg { width:100%; height:100%; }
  figcaption { display:flex; flex-direction:column; gap:1px; padding:6px 2px 2px; }
  figcaption b { font-size:13px; }
  figcaption span { font-size:11px; color:#8A968D; }
</style></head>
<body>
<h1>Stride — rig contact sheet</h1>
<p class="lede">Generated by <code>npm run contact-sheet</code>. Every panel is the same deterministic rig at a fixed frame.</p>
${castRow}${motionRow}${walkRow}${outfitRow}${hairRow}${emotionRow}${visemeRow}${accessoryRow}
</body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/contact-sheet.html`, html);
console.log(`Wrote ${OUT_DIR}/contact-sheet.html`);

if (!process.argv.includes('--no-shot')) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1.5 });
  await page.goto(`file://${process.cwd()}/${OUT_DIR}/contact-sheet.html`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/contact-sheet.png`, fullPage: true });
  await browser.close();
  console.log(`Wrote ${OUT_DIR}/contact-sheet.png`);
}
