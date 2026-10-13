// فاز ۵۹ — راستی‌آزمایی DOM سرریز هدر/بنر فرم ۴۸ (VLM پاسخ مبهم داد؛ ملاک نهایی DOM است)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(FILE + '#45'); await page.reload(); await sleep(400);
await page.click('#scr-45 .inq-card[data-inq="inq2"]'); await sleep(400);

const res = await page.evaluate(() => {
  const out = [];
  const chk = (el, name) => {
    if (!el) { out.push(name + ': MISSING'); return; }
    const r = el.getBoundingClientRect();
    out.push(name + ': scrollW=' + el.scrollWidth + ' clientW=' + el.clientWidth +
      ' overflowX=' + (el.scrollWidth > el.clientWidth) +
      ' right=' + Math.round(r.right) + ' left=' + Math.round(r.left));
  };
  chk(document.querySelector('#scr-48 .subheader'), 'subheader');
  chk(document.querySelector('#of48-t'), 'of48-t');
  chk(document.querySelector('#of48-t small'), 'of48-s');
  chk(document.querySelector('#of48-meta'), 'of48-meta(banner)');
  chk(document.querySelector('#of48-meta .ob-t'), 'banner-title');
  // هدر باید در محدودهٔ صفحه باشد (RTL: 0..402 منهای پدینگ)
  const t = document.querySelector('#of48-t');
  const tr = t.getBoundingClientRect();
  out.push('of48-t in-viewport=' + (tr.left >= 330 && tr.right <= 404 && tr.width > 0));
  return out.join('\n');
});
console.log(res);
await browser.close();
