import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1.4 });
await p.goto(`file://${process.cwd()}/preview/contact-sheet.html`);
await p.waitForTimeout(300);
const secs = await p.$$('section');
for (let i = 0; i < secs.length; i++) {
  const title = await secs[i].$eval('h2', e => e.firstChild.textContent.trim());
  await secs[i].screenshot({ path: `preview/sec-${i}-${title.replace(/\W+/g,'')}.png` });
  console.log(i, title);
}
await b.close();
