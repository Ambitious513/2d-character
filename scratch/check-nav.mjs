import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.goto('http://localhost:5173/#/docs', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-docs-player="WalkScene"]');
await page.waitForTimeout(1200);
for (const id of ['compositions','cast','scenes','presets','export','architecture','quickstart','playground']) {
  await page.locator(`.docs-nav a[href="#/docs/${id}"]`).click();
  await page.waitForTimeout(2200);
  const active = await page.locator('.docs-nav a.active').textContent();
  const top = await page.evaluate((sid) => Math.round(document.getElementById('docs-'+sid).getBoundingClientRect().top), id);
  console.log(id.padEnd(14), '-> active:', active.padEnd(18), 'section top:', top);
}
await browser.close();
