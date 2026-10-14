// فاز ۶۶ (قدم نهایی) — راستی‌آزمایی جامع بستن مهاجرت:
//  ۱) جاروی همهٔ ۳۴ صفحه (فاز ۶۷: +۱۴ تنظیمات خرید): صفر خطای کنسول/صفحه + صفر سرریز افقی
//  ۲) باگ‌های صف قدیمی: ۵۴۶ (مدال شرایط ۱۶ باز می‌شود؟) · ۵۸۲ (چشم ۰۸ → ۲۳)
//  ۳) انسجام اسکلت: شمار صفحات/شیت‌ها/دیالوگ‌ها + فوترهای اصلی
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p66';
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

/* ═══ ۱. جاروی کامل ۳۴ صفحه ═══ */
const ids = await (async () => {
  await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
  return await page.evaluate(() => [...document.querySelectorAll('#phone > section.scr')].map(s => s.id.slice(4)));
})();
T('۳۴ صفحه در گوشی (فاز ۶۷: +۱۴)', ids.length === 34);
const overflowPages = [];
for (const id of ids) {
  await page.goto(FILE + '#' + id); await sleep(220);
  const of = await page.evaluate(() => {
    const scr = document.querySelector('.scr:not([hidden])');
    return scr ? scr.scrollWidth > scr.clientWidth + 1 : false;
  });
  if (of) overflowPages.push(id);
}
T('صفر سرریز افقی در همهٔ ۳۴ صفحه', overflowPages.length === 0);
console.log(overflowPages.length ? '  overflow on: ' + overflowPages.join(',') : '  all pages fit');
T('جاروی ۳۴ صفحه: صفر خطای کنسول/صفحه', errors.length === 0);
if (errors.length) console.log('  ' + errors.slice(0, 5).join('\n  '));

await page.screenshot({ path: SHOTS + '/01-sweep-01.png', clip: { x: 34, y: 0, width: 402, height: 874 } });

/* ═══ ۲. باگ‌های صف قدیمی ═══ */
/* ۵۴۶ — مدال شرایط در فرم ۱۶ */
await page.goto(FILE + '#16'); await page.reload(); await sleep(400);
const termsBtn = await page.locator('#scr-16 [data-termsopen]').count();
T('۵۴۶: لینک «شرایط استفاده» در فرم ۱۶ هست', termsBtn >= 1);
if (termsBtn > 0) {
  await page.locator('#scr-16 [data-termsopen]').first().click(); await sleep(350);
  T('۵۴۶: مدال شرایط باز می‌شود', await page.locator('#dlg-terms').isVisible());
  await page.screenshot({ path: SHOTS + '/02-16-terms.png', clip: { x: 34, y: 0, width: 402, height: 874 } });
  await page.click('#dlg-terms .tm-x').catch(() => {}); await sleep(250);
}
/* ۵۸۲ — چشم/پیش‌نمایش ۰۸ → صفحهٔ ۲۳ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(400);
const prevBtn = await page.locator('#scr-08 [data-go="23"]').count();
T('۵۸۲: دکتهٔ پیش‌نمایش ۰۸ → ۲۳ موجود', prevBtn >= 1);
if (prevBtn > 0) {
  await page.locator('#scr-08 [data-go="23"]').first().click(); await sleep(350);
  T('۵۸۲: کلیک → صفحهٔ ۲۳ (نه شیت تنظیمات)', page.url().endsWith('#23'));
}

/* ═══ ۳. انسجام اسکلت ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
const counts = await page.evaluate(() => ({
  sheets: new Set([...document.querySelectorAll('.sheet')].map(s => s.id)).size,
  dlgs: new Set([...document.querySelectorAll('.dlg')].map(s => s.id)).size,
  pages: document.querySelectorAll('#phone > section.scr').length
}));
T('اسکلت: ۳۴ صفحه · ۶۴ شیت · ۹ دیالوگ (فاز ۶۸: +فیلتر/مدیریت/تغییرنام +دیالوگ حذف گروه)', counts.pages === 34 && counts.sheets === 64 && counts.dlgs === 9);
T('فوتر فروش ۰۱: ۵ تب (کاتالوک/مشتریان/سفارش‌ها/پیام/تنظیم)', await page.evaluate(() => {
  const t = [...document.querySelectorAll('#scr-01 .tabbar .tab')];
  return t.length === 5 && t[2].textContent.includes('سفارش‌ها');
}));
await page.goto(FILE + '#08'); await sleep(300);
T('فوتر خرید ۰۸: ۵ تب (لیست/تأمین‌کنندگان/سفارش‌های من/پیام/تنظیمات — فاز ۶۷)', await page.evaluate(() => {
  const t = [...document.querySelectorAll('#scr-08 .tabbar .tab')];
  return t.length === 5 && t.some(x => x.textContent.includes('سفارش\u200cهای من')) && t.some(x => x.textContent.includes('تأمین\u200cکنندگان')) && t[4].textContent.includes('تنظیمات');
}));
T('۰۵/۴۵ بدون فوتر (تنزل استعلام)', await page.evaluate(async () => {
  const r = [];
  for (const id of ['05', '45']) {
    location.hash = '#' + id;
    await new Promise(r2 => setTimeout(r2, 250));
    r.push(document.querySelector('#scr-' + id + ' .tabbar') === null);
  }
  return r.every(Boolean);
}));

console.log('\nRESULT: ' + ok + '/' + (ok + bad));
await browser.close();
process.exit(bad ? 1 : 0);
