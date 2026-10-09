// tools/phase39/geo2.mjs — چک هندسی پنل تخفیف‌ها + وضعیت ویرایش
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
await page.goto(URL + '#44');
await page.waitForTimeout(300);

// باز کردن پنل
await page.click('.disc-toggle');
await page.waitForTimeout(250);

const geo = await page.evaluate(() => {
  const sec = document.querySelectorAll('#bk-disc .disc-sec');
  const rows = document.querySelectorAll('#bk-disc .disc-row');
  const first = rows[0];
  const inp = first.querySelector('.pctw input');
  const ir = inp.getBoundingClientRect();
  const card = document.getElementById('bk-disc');
  return {
    sections: sec.length,
    rows: rows.length,
    headers: [...sec].map(s => s.querySelector('.disc-h').childNodes[0].textContent.trim()),
    inputW: Math.round(ir.width),
    inputX: Math.round(ir.x),
    rowRight: Math.round(first.getBoundingClientRect().right),
    cardW: Math.round(card.getBoundingClientRect().width),
    overflow: card.scrollWidth > card.clientWidth + 1,
    bodyOverflow: document.querySelector('#scr-44 .screen-body').scrollWidth > document.querySelector('#scr-44 .screen-body').clientWidth + 1,
    dirtyVisible0: [...document.querySelectorAll('.d-dirty')].filter(d => d.getClientRects().length > 0 && !d.closest('.disc-row.chg')).length,
  };
});
console.log(JSON.stringify(geo, null, 2));

// ویرایش دومی → نشان + شمارنده
await page.evaluate(() => {
  const rows = document.querySelectorAll('#bk-disc .disc-row');
  const inp = rows[1].querySelector('[data-discinput]');
  inp.value = '۸';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
const st = await page.evaluate(() => ({
  chg: document.querySelectorAll('#bk-disc .disc-row.chg').length,
  dirtyVis: [...document.querySelectorAll('.disc-row.chg .d-dirty')].filter(d => d.getClientRects().length > 0).length,
  cnt: document.getElementById('bk-count').textContent,
  bg: getComputedStyle(document.querySelector('.disc-row.chg')).backgroundColor,
}));
console.log('after edit:', JSON.stringify(st));

// برگشت به مقدار اولیه → نشان برداشته شود
await page.evaluate(() => {
  const rows = document.querySelectorAll('#bk-disc .disc-row');
  const inp = rows[1].querySelector('[data-discinput]');
  inp.value = '۷';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
const st2 = await page.evaluate(() => ({
  chg: document.querySelectorAll('#bk-disc .disc-row.chg').length,
  cnt: document.getElementById('bk-count').textContent,
}));
console.log('revert:', JSON.stringify(st2));

await browser.close();
