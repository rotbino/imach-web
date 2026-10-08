// tools/phase25/qa.mjs — QA فاز ۲۵: بازگرداندن جایگاه «تأمین‌کنندگان ویژهٔ این کالا» (۰۲) + باکس تخفیف همکار + حذف جملهٔ اضافی + بنر ظریف‌تر کاتالوگ (۱۳)
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p25');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); ok ? pass++ : fail++; };

// ═══ ۰۲ — ترتیب: تخفیف حجمی (بدون جملهٔ اضافی) → باکس همکار → تأمین‌کنندگان ویژه ═══
await page.goto(URL + '#02');
await page.waitForTimeout(600);

const kids = await page.evaluate(() => {
  const pad = document.querySelector('#scr-02 main > div[style*="padding"]');
  return [...pad.children].map(c => (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60));
});
const iTier = kids.findIndex(t => t.includes('تخفیف حجمی خرید'));
const iCW = kids.findIndex(t => t.includes('تخفیف برای شما که مشتری همکار هستید'));
const iSup = kids.findIndex(t => t.includes('تأمین‌کنندگان ویژهٔ این کالا'));
check('۰۲ ترتیب درست: تخفیف حجمی → همکار → تأمین‌کنندگان ویژه', iTier >= 0 && iCW === iTier + 1 && iSup === iCW + 1);

const body02 = await page.locator('#scr-02').innerText();
check('۰۲ جملهٔ اضافی «هرچه حجم خرید بیشتر…» حذف شد', !body02.includes('هرچه حجم خرید بیشتر، ارزان‌تر'));
check('۰۲ باکس همکار متن دقیق «تخفیف برای شما که مشتری همکار هستید ۷٪»', body02.includes('تخفیف برای شما که مشتری همکار هستید ۷٪'));
check('۰۲ جایگاه تبلیغاتی: آریو غلات + کیان غلات + نشان «فروشندهٔ ویژه»', body02.includes('آریو غلات') && body02.includes('کیان غلات') && body02.includes('فروشندهٔ ویژه'));
check('۰۲ پله‌های تخفیف حجمی دست‌نخورده (۵/۲۰/۵۰ کیسه)', body02.includes('۵ کیسه به بالا') && body02.includes('۲۰ کیسه به بالا') && body02.includes('۵۰ کیسه به بالا'));

// سرریز افقی نیست و باکس‌ها داخل قاب موبایل می‌گیرند
const overflow = await page.evaluate(() => {
  const phone = document.querySelector('#phone');
  const pr = phone.getBoundingClientRect();
  const bad = [...document.querySelectorAll('#scr-02 main *')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && (r.right > pr.right + 1 || r.left < pr.left - 1);
  });
  return bad.length;
});
check('۰۲ بدون سرریز افقی داخل قاب', overflow === 0);

// ناوبری دکمهٔ «مشاهده تابلوی تأمین» → صفحهٔ ۰۹
await page.locator('#scr-02 button', { hasText: 'مشاهده تابلوی تأمین' }).click();
await page.waitForTimeout(400);
check('دکمهٔ «مشاهده تابلوی تأمین» → صفحهٔ ۰۹ باز می‌شود', (await page.evaluate(() => location.hash)) === '#09' && !(await page.$eval('#scr-09', el => el.hidden)));

// اسکرین‌شات: بلوک‌های جدید
await page.goto(URL + '#02');
await page.waitForTimeout(500);
await page.evaluate(() => {
  const el = [...document.querySelectorAll('#scr-02 div')].find(d => d.textContent.includes('تخفیف برای شما که مشتری همکار هستید') && d.className === '');
  el.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(250);
await page.locator('#phone').screenshot({ path: OUT + '/02-cw-suppliers.png' });

// ═══ ۱۳ — بنر مشتری همکار: ریزتر و ظریف‌تر ═══
await page.goto(URL + '#13');
await page.waitForTimeout(600);
const banner = await page.evaluate(() => {
  const b = document.querySelector('#scr-13 .cust-banner');
  const cs = getComputedStyle(b);
  return { text: b.textContent.replace(/\s+/g, ' ').trim(), font: cs.fontSize, weight: cs.fontWeight, pad: cs.padding, h: b.offsetHeight };
});
check('۱۳ متن بنر: «شما مشتری همکار این کسب و کار هستید. تخفیف برای شما ۷٪»', banner.text === 'شما مشتری همکار این کسب و کار هستید. تخفیف برای شما ۷٪');
check('۱۳ بنر ریزتر (فونت ۱۰px)', banner.font === '10px');
check('۱۳ بنر ظریف‌تر (وزن ۶۰۰ و ارتفاع ≤ ۳۶px)', banner.weight === '600' && banner.h <= 36);
await page.locator('#phone').screenshot({ path: OUT + '/13-cust-banner.png' });

// ═══ سازگاری متن‌های کمپین با جایگاه بازگردانده‌شده ═══
const guideStep2 = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#scr-32 .gstep')].find(g => g.textContent.includes('بخش «کمپین‌ها»'));
  return s ? s.textContent.replace(/\s+/g, ' ').trim() : '';
});
check('۳۲ گام ۲ راهنما: جایگاه «تأمین‌کنندهٔ ویژه» در جزئیات کالای مرتبط ذکر شد', guideStep2.includes('تأمین‌کنندهٔ ویژه') && !guideStep2.includes('جایگاه تبلیغاتی دیگری ندارد'));

const campHint = await page.evaluate(() => {
  const h = document.querySelector('#sheet-campaign .hintnote');
  return h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
});
check('شیت کمپین: جملهٔ نادرست «جایگاه تبلیغاتی دیگری مصرف نمی‌کند» حذف شد', !campHint.includes('جایگاه تبلیغاتی دیگری'));

const dlgText = await page.evaluate(() => {
  const d = document.querySelector('#dlg-campok .dlg-p');
  return d ? d.textContent.replace(/\s+/g, ' ').trim() : '';
});
check('دیالوگ کمپین: «جزئیات کالاهای مرتبط» اضافه شد', dlgText.includes('جزئیات کالاهای مرتبط'));

// ═══ e2e — همهٔ صفحه‌ها بدون خطای کنسول ═══
const ids = await page.evaluate(() => [...document.querySelectorAll('.scr')].map(s => s.id.replace('scr-', '')));
for (const id of ids) {
  await page.goto(URL + '#' + id);
  await page.waitForTimeout(110);
}
console.log('screens visited:', ids.length, '· console errors:', errors.length);
check('e2e: صفر خطای کنسول در همهٔ صفحه‌ها', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5));

await browser.close();
console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
