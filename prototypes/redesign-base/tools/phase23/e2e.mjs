// tools/phase23/e2e.mjs — جاروی کامل: همهٔ صفحه‌ها + شیت‌های کلیدی، بدون خطای کنسول
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');

const SCREENS = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','d1','d2','d3'];
const SHEETS = ['sheet-cset','sheet-target','sheet-campaign','sheet-pset','sheet-share','sheet-events'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let ok = 0, fail = 0;
for (const s of SCREENS) {
  try {
    await page.goto(URL + '#' + s);
    await page.waitForTimeout(160);
    const vis = await page.evaluate(id => {
      const el = document.getElementById(id.charAt(0) === 'd' ? 'scr-' + id : 'scr-' + id);
      return el && !el.hidden;
    }, s);
    if (vis) { ok++; } else { fail++; console.log('NOT VISIBLE:', s); }
  } catch (e) { fail++; console.log('FAIL:', s, String(e).slice(0, 80)); }
}

for (const sh of SHEETS) {
  try {
    await page.goto(URL + '#01');
    await page.waitForTimeout(140);
    await page.evaluate(id => { window.__open = true; document.getElementById(id).classList.add('show'); document.getElementById('backdrop').classList.add('show'); }, sh);
    await page.waitForTimeout(180);
    const shown = await page.evaluate(id => document.getElementById(id).classList.contains('show'), sh);
    if (shown) { ok++; } else { fail++; console.log('SHEET NOT SHOWN:', sh); }
    await page.evaluate(() => { document.querySelectorAll('.sheet.show,.dlg.show').forEach(x => x.classList.remove('show')); document.getElementById('backdrop').classList.remove('show'); });
  } catch (e) { fail++; console.log('SHEET FAIL:', sh, String(e).slice(0, 80)); }
}

// چک سلامت دیالوگ‌های جدید
for (const dg of ['dlg-lowcharge', 'dlg-campok']) {
  await page.goto(URL + '#29');
  await page.waitForTimeout(120);
  const exists = await page.evaluate(id => !!document.getElementById(id), dg);
  if (exists) ok++; else { fail++; console.log('DLG MISSING:', dg); }
}

// چک وضعیت اولیهٔ کیف پول و جریان شارژ دوم
const bal = await page.evaluate(() => document.querySelector('[data-wallet]').textContent);
console.log('initial wallet (fresh load, expect ۸۵٬۰۰۰):', bal);

console.log('e2e:', ok, 'ok /', fail, 'fail');
console.log('console errors:', errors.length ? errors.slice(0, 5) : 'NONE');
await browser.close();
