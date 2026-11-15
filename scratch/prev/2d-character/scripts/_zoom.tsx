import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterHead, CharacterRig } from '../src/rig/Character';
import { DEFAULT_SETTINGS } from '../src/rig/types';
const base = { ...DEFAULT_SETTINGS, motion: 'idle' as const };
const heads: [string, any][] = [
  ['Headphones', { headphones: true }],
  ['Beard', { beard: true }],
  ['Beard+Fade', { beard: true, hair: 'fade' }],
  ['Cap+Curly', { cap: true }],
  ['Glasses', { glasses: true }],
  ['Freckles', { freckles: true }],
];
const headCells = heads.map(([l, f]) => `<figure><div class="big">${renderToStaticMarkup(<CharacterHead colors={base.colors} emotion="neutral" {...f} />)}</div><figcaption>${l}</figcaption></figure>`).join('');
const feet = Array.from({length:6},(_,i)=>{
  const s = {...base, motion:'walk' as const};
  return `<figure><div class="tall">${renderToStaticMarkup(<svg viewBox="-120 -160 240 180"><line x1="-120" y1="0" x2="120" y2="0" stroke="#F26B38" strokeWidth="1.5"/><CharacterRig settings={s} frame={i*6.4} fps={30} showGuides /></svg>)}</div><figcaption>walk f${(i*6.4).toFixed(1)}</figcaption></figure>`;
}).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
body{background:#F5F4EF;font-family:system-ui;padding:24px;color:#26352E}
h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em}
.row{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:26px}
figure{margin:0;background:#FFFDF6;border:1px solid #E2DFD2;border-radius:12px;padding:10px}
.big{height:260px}.big svg{width:100%;height:100%}
.tall{height:230px}.tall svg{width:100%;height:100%}
figcaption{font-size:12px;text-align:center;padding-top:6px;color:#6B7A70}
</style><h2>Accessory detail</h2><div class="row">${headCells}</div><h2>Ground contact — orange line is y=0</h2><div class="row">${feet}</div>`;
mkdirSync('preview',{recursive:true});
writeFileSync('preview/zoom.html', html);
const { chromium } = await import('@playwright/test');
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:900},deviceScaleFactor:2});
await p.goto(`file://${process.cwd()}/preview/zoom.html`); await p.waitForTimeout(250);
await p.screenshot({path:'preview/zoom.png', fullPage:true}); await b.close();
console.log('ok');
