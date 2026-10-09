// tools/phase39/geo.mjs — چک هندسی استپر درصدی (سمت دکمه‌ها در RTL)
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
await page.goto(URL + '#44');
await page.waitForTimeout(300);
await page.click('#scr-44 .bk-pct');
await page.waitForTimeout(300);
const geo = await page.evaluate(() => {
  const minus = document.querySelector('.pct-minus');
  const plus = document.querySelector('.pct-plus');
  const val = document.querySelector('.pct-val');
  const rm = minus.getBoundingClientRect(), rp = plus.getBoundingClientRect(), rv = val.getBoundingClientRect();
  const dlg = document.getElementById('dlg-pct');
  return {
    dir: getComputedStyle(dlg).direction,
    minusX: Math.round(rm.x), plusX: Math.round(rp.x), valX: Math.round(rv.x),
    minusIsRight: rm.x > rp.x,
    valBetween: rv.x < Math.max(rm.x, rp.x) && rv.right > Math.min(rm.x, rp.x),
    previewHtml: document.getElementById('pct-preview').innerHTML.slice(0, 130),
    inputW: Math.round(rv.width),
    modalW: Math.round(dlg.getBoundingClientRect().width),
    overflow: dlg.scrollWidth > dlg.clientWidth + 1,
  };
});
console.log(JSON.stringify(geo, null, 2));
await browser.close();
