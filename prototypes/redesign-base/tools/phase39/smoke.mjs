// tools/phase39/smoke.mjs — اسموک‌تست سریع فاز ۳۹ قبل از QA کامل
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

await page.goto(URL + '#44');
await page.waitForTimeout(300);

// ۱) چیپ‌ها حذف شده؟ آیکون درصد هست؟
const s1 = await page.evaluate(() => ({
  chips: document.querySelectorAll('[data-bkpc]').length,
  pctIcon: !!document.querySelector('#scr-44 .bk-pct'),
  xlsIcon: !!document.querySelector('#scr-44 .bk-xls'),
  reset: !!document.querySelector('.bk-reset2'),
  discToggle: !!document.querySelector('.disc-toggle'),
  discHidden: document.getElementById('bk-disc').hidden,
}));
console.log('structure:', JSON.stringify(s1));

// ۲) باز کردن مدال درصدی + ۳ کلیک روی استپر
await page.click('#scr-44 .bk-pct');
await page.waitForTimeout(250);
const s2 = await page.evaluate(() => ({
  show: document.getElementById('dlg-pct').classList.contains('show'),
  input: document.getElementById('pct-input').value,
  preview: document.getElementById('pct-preview').textContent.slice(0, 40),
}));
console.log('pct modal open:', JSON.stringify(s2));

await page.click('.pct-plus');
await page.click('.pct-plus');
await page.click('.pct-plus');
await page.waitForTimeout(200);
const s3 = await page.evaluate(() => ({
  input: document.getElementById('pct-input').value,
  preview: document.getElementById('pct-preview').textContent.slice(0, 60),
  cls: document.getElementById('pct-preview').className,
}));
console.log('3 clicks +1.5%:', JSON.stringify(s3));

// ۳) ورودی دستی منفی اعشاری
await page.evaluate(() => {
  const i = document.getElementById('pct-input');
  i.value = '-2.5';
  i.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(150);
const s4 = await page.evaluate(() => ({
  preview: document.getElementById('pct-preview').textContent.slice(0, 80),
  cls: document.getElementById('pct-preview').className,
}));
console.log('manual -2.5:', JSON.stringify(s4));

// ۴) اعمال
await page.click('#pct-apply');
await page.waitForTimeout(250);
const s5 = await page.evaluate(() => ({
  closed: !document.getElementById('dlg-pct').classList.contains('show'),
  chg: document.querySelectorAll('#scr-44 .bk-row.chg').length,
  p1: document.querySelector('#scr-44 .bk-row .bk-price').value,
  cnt: document.getElementById('bk-count').textContent,
}));
console.log('apply -2.5%:', JSON.stringify(s5));

// ۵) بازنشانی
await page.click('.bk-reset2');
await page.waitForTimeout(200);
const s6 = await page.evaluate(() => ({
  chg: document.querySelectorAll('#scr-44 .bk-row.chg').length,
  p1: document.querySelector('#scr-44 .bk-row .bk-price').value,
}));
console.log('reset:', JSON.stringify(s6));

// ۶) مدال اکسل — ترتیب دکمه‌ها
await page.click('#scr-44 .bk-xls');
await page.waitForTimeout(250);
const s7 = await page.evaluate(() => {
  const d = document.getElementById('dlg-xlsbulk');
  const up = document.getElementById('xls-import');
  const dn = document.getElementById('xls-export');
  return {
    show: d.classList.contains('show'),
    upFirst: up.getBoundingClientRect().y < dn.getBoundingClientRect().y,
    upH: Math.round(up.getBoundingClientRect().height),
    dnH: Math.round(dn.getBoundingClientRect().height),
    upTxt: up.textContent.replace(/\s+/g, ' ').trim(),
    dnTxt: dn.textContent.replace(/\s+/g, ' ').trim().slice(0, 50),
  };
});
console.log('excel modal:', JSON.stringify(s7));
await page.click('#dlg-xlsbulk [data-close]');

// ۷) تخفیف‌ها — بازشو + ویرایش + شمارنده
await page.click('.disc-toggle');
await page.waitForTimeout(200);
await page.evaluate(() => {
  const inp = document.querySelector('#bk-disc .disc-row [data-discinput]');
  inp.value = '9';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(150);
const s8 = await page.evaluate(() => ({
  visible: !document.getElementById('bk-disc').hidden,
  open: document.querySelector('.disc-toggle').classList.contains('open'),
  chgD: document.querySelectorAll('#bk-disc .disc-row.chg').length,
  cnt: document.getElementById('bk-count').textContent,
  rows: document.querySelectorAll('#bk-disc .disc-row').length,
}));
console.log('discounts:', JSON.stringify(s8));

// ۸) ثبت → شیت‌ها هم‌گام شوند
await page.evaluate(() => { document.getElementById('bk-save').click(); });
await page.waitForTimeout(400);
const s9 = await page.evaluate(() => ({
  cgroup: document.querySelector('#sheet-cgroup .grp-row .pctw input').value,
  cowork: document.querySelector('#sheet-cowork .field input').value,
  cw02: document.getElementById('cw-02') && document.getElementById('cw-02').textContent,
  cw13: document.querySelector('#scr-13 .cowork-line b') && document.querySelector('#scr-13 .cowork-line b').textContent,
  vol1: document.querySelector('#sheet-vol .sheet-row .pctw input').value,
  pt1: document.querySelector('#sheet-ptier .sheet-row .pctw input').value,
  btn: document.getElementById('bk-save') ? document.getElementById('bk-save').textContent.trim() : '(rebuilt)',
}));
console.log('commit sync:', JSON.stringify(s9));

console.log('CONSOLE ERRORS:', errors.length ? errors : 'none');
await browser.close();
