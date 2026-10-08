// tools/phase31/qa.mjs — QA فاز ۳۱
// ۳۹: صفحهٔ «کارها · دستیار خرید» — کارهای متفاوت از دستیار فروش (پیشنهادهای رسیده،
//     کامل‌کردن لیست خرید، یادآوری‌ها) — هم راهنما هم محرک برای شروع و ادامهٔ فعالیت خریدار.
// فوتر خرید: «کاتالوک‌ها» (۱۰) حذف شد (از میان‌بر پروفایل ۱۴ در دسترس است) و «کارها» (۳۹) جای آن نشست — ۵ تبی ماند.
// ۱۰: تبدیل به زیرصفحهٔ پروفایل — ساب‌هدر + بازگشت؛ شمارندهٔ زنده در ساب‌هدر.
// ۲۲: کادر «دستیارهای این کسب‌وکار» با دو سوییچ (متن مالک عیناً) — هر دو همزمان خاموش نمی‌شوند.
//     با خاموشی یک دستیار: پیل تعویض دستیار از هدر حذف می‌شود، صفحه‌های بازوی خاموش به خانهٔ بازوی روشن
//     هدایت می‌شوند و وضعیت در localStorage می‌ماند (در پروتوتایپ عملاً دیده می‌شود).
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p31');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); ok ? pass++ : fail++; };
const nav = async h => { await page.evaluate(x => { location.hash = x; }, '#' + h); await page.waitForTimeout(260); };
const boot = async h => { await page.goto(URL + '#' + h); await page.evaluate(() => localStorage.removeItem('imach-assist')); await page.reload(); await page.waitForTimeout(450); };

/* ═══ ۱) صفحهٔ ۳۹ — کارهای دستیار خرید ═══ */
await boot('39');
const p39 = await page.evaluate(() => {
  const s = document.getElementById('scr-39');
  return {
    shown: !s.hidden, arm: s.dataset.arm,
    head: s.querySelector('b').textContent,
    sub: s.querySelector('b + span').textContent,
    secs: [...s.querySelectorAll('.sec-title h2')].map(h => h.textContent.trim().replace(/\s+/g, ' ')),
    rows: s.querySelectorAll('.row-card').length,
    sysBadge: !!s.querySelector('.badge.b-amber'),
    reqKeys: [...s.querySelectorAll('[data-reqkey]')].map(r => r.dataset.reqkey),
    goes: [...s.querySelectorAll('.row-card[data-go]')].map(r => r.dataset.go),
    tabs: [...s.querySelectorAll('.tabbar .tab')].map(t => (t.dataset.go || '?') + ':' + t.textContent.trim().replace(/\s+/g, ' ')),
    activeTab: (s.querySelector('.tabbar .tab.active') || {}).textContent,
    tabBadge: (s.querySelector('.tabbar .tab.active .badge') || {}).textContent
  };
});
check('۳۹ باز می‌شود · بازوی خرید', p39.shown && p39.arm === 'buy');
check('۳۹ عنوان و تاریخ: «کارها» + ۶ کار در انتظار', p39.head === 'کارها' && p39.sub.includes('۶ کار در انتظار'));
check('۳۹ سه بخش: پاسخ‌ها · سیستم · یادآوری‌ها', p39.secs[0] === 'نیاز به پاسخ تو' && p39.secs[1].startsWith('کارهای سیستم') && p39.secs[2] === 'یادآوری‌ها');
check('۳۹ بج «تا انجام حذف نمی‌شود» روی کارهای سیستم', p39.sysBadge);
check('۳۹ شش کار — دو کار پیشنهاد قیمت با کلید rice/oil', p39.rows === 6 && p39.reqKeys.join(',') === 'rice,oil');
check('۳۹ سیم‌کشی کارها: ۰۸ (لیست) · ۲۷ (اعلان) · ۳۳ (مقایسه) · ۱۸ (پیام)', p39.goes.join(',') === '08,27,33,18');
check('۳۹ فوتر ۵ تبی: ۰۸/۳۹/۳۱/۱۸/۱۴ — کارها اکتیو با بج ۶', p39.tabs.join('|') === '08:لیست خرید|39:کارها ۶|31:کمپین‌ها|18:پیام‌ها ۱|14:پروفایل' && p39.activeTab.includes('کارها') && p39.tabBadge === '۶');
await page.locator('#phone').screenshot({ path: OUT + '/39-tasks.png' });

/* کارت پیشنهاد قیمت → صفحهٔ ۳۶ (پیشنهادات درخواست) */
await page.click('#scr-39 .row-card[data-reqkey="rice"]');
await page.waitForTimeout(300);
check('۳۹ کارت «تجارت گیل‌رنج» → صفحهٔ ۳۶ پیشنهادات', await page.evaluate(() => location.hash === '#36' && !document.getElementById('scr-36').hidden));

/* ═══ ۲) فوتر خرید همه‌جا: کارها جای کاتالوک‌ها ═══ */
for (const id of ['08', '14', '31']) {
  await nav(id);
  const f = await page.evaluate(i => [...document.querySelectorAll('#scr-' + i + ' .tabbar .tab')].map(t => (t.dataset.go || '?') + ':' + t.textContent.trim().replace(/\s+/g, ' ')), id);
  check(id + ' فوتر: کارها (۳۹) جای کاتالوک‌ها — ۵ تبی', f.join('|') === '08:لیست خرید|39:کارها ۶|31:کمپین‌ها|18:پیام‌ها ۱|14:پروفایل');
}
await nav('08');
await page.click('#scr-08 .tabbar .tab:nth-child(2)');
await page.waitForTimeout(300);
check('کلیک تب «کارها» در ۰۸ → صفحهٔ ۳۹', await page.evaluate(() => location.hash === '#39'));

/* پیام‌های مشترک (۱۸) با بازوی خرید — ستِ تب همان فوتر */
await nav('08');
await nav('18');
const t18 = await page.evaluate(() => [...document.querySelectorAll('#scr-18 .tabbar .tab')].map(t => (t.dataset.go || '?') + ':' + t.textContent.trim().replace(/\s+/g, ' ')));
check('۱۸ (بازوی خرید): کارها در ستِ تب‌ها', t18.join('|').includes('39:کارها'));

/* فوتر فروش دست‌نخورده */
await nav('01');
const f01 = await page.evaluate(() => [...document.querySelectorAll('#scr-01 .tabbar .tab')].map(t => (t.dataset.go || '?') + ':' + t.textContent.trim().replace(/\s+/g, ' ')));
check('۰۱ فوتر فروش بدون تغییر: ۲۰/۰۱/۰۵/۱۸/۰۷', f01.join('|') === '20:کارها ۶|01:کاتالوگ من|05:درخواست‌ها ۳|18:پیام‌ها ۱|07:پروفایل');

/* ═══ ۳) صفحهٔ ۱۰ — زیرصفحهٔ پروفایل ═══ */
await nav('10');
const p10 = await page.evaluate(() => {
  const s = document.getElementById('scr-10');
  return {
    sub: !!s.querySelector('header.subheader'), appbar: !!s.querySelector('header.appbar'),
    tabbar: !!s.querySelector('.tabbar'),
    ttl: s.querySelector('.subheader .ttl').textContent.trim().replace(/\s+/g, ' '),
    cnt: document.getElementById('saved-cats-count').textContent,
    cntInSub: !!document.querySelector('.subheader #saved-cats-count'),
    back: !!s.querySelector('.subheader .back')
  };
});
check('۱۰ ساب‌هدر با بازگشت — اپ‌بار و تبار حذف شدند', p10.sub && !p10.appbar && !p10.tabbar && p10.back);
check('۱۰ عنوان + شمارندهٔ زنده در ساب‌هدر', p10.ttl.includes('کاتالوگ‌های ذخیره‌شدهٔ من') && p10.cnt === '۳ کاتالوگ' && p10.cntInSub);
await page.locator('#phone').screenshot({ path: OUT + '/10-subpage.png' });
/* مسیر واقعی کاربر: بوت تازه در پروفایل (۱۴) → میان‌بر → ۱۰ → بازگشت → ۱۴ */
await page.goto(URL + '#14');
await page.reload();
await page.waitForTimeout(450);
await page.evaluate(() => { document.querySelector('#scr-14 [data-go="10"]').click(); });
await page.waitForTimeout(300);
check('۱۴ میان‌بر → صفحهٔ ۱۰', await page.evaluate(() => location.hash === '#10'));
await page.click('#scr-10 .subheader .back');
await page.waitForTimeout(300);
check('۱۰ بازگشت → پروفایل خرید (۱۴)', await page.evaluate(() => location.hash === '#14'));
const lnk14 = await page.evaluate(() => !!document.querySelector('#scr-14 [data-go="10"]'));
check('۱۴ میان‌بر «کاتالوک‌های ذخیره‌شدهٔ من» همچنان → ۱۰', lnk14);

/* ═══ ۴) فرم ویرایش کسب‌وکار (۲۲) — کادر دستیارها ═══ */
await nav('22');
const p22 = await page.evaluate(() => {
  const s = document.getElementById('scr-22');
  return {
    arm: s.dataset.arm,
    card: !!s.querySelector('.as-card'),
    rows: [...s.querySelectorAll('.as-row .tx b')].map(b => b.textContent.trim()),
    hint: (s.querySelector('.as-hint') || {}).textContent,
    toggles: s.querySelectorAll('[data-asst]').length,
    on: [...s.querySelectorAll('[data-asst]')].map(t => t.classList.contains('on')),
    err: !!document.getElementById('as-err') && document.getElementById('as-err').hidden
  };
});
check('۲۲ بازوی خنثی (keep) — از هر دو دستیار باز می‌شود', p22.arm === 'keep');
check('۲۲ کادر «دستیارهای این کسب‌وکار» با دو سوییچ روشن', p22.card && p22.toggles === 2 && p22.on.every(Boolean));
check('۲۲ برچسب‌ها عیناً: «دستیار فروش روشن باشد» / «دستیار خرید روشن باشد»',
  p22.rows[0] === 'دستیار فروش روشن باشد' && p22.rows[1] === 'دستیار خرید روشن باشد');
check('۲۲ متن مالک عیناً زیر سوییچ‌ها',
  p22.hint === 'اگر در کسب و کار خود خرید عمده یا فروش عمده همزمان ندارید، یا نمی خواهید فعلا هر دو را استفاده کنید می توانید یکی از دستیارها را خاموش کنید');
check('۲۲ خطای «حداقل یکی» از ابتدا پنهان است', p22.err);
await page.locator('#phone').screenshot({ path: OUT + '/22-assist.png' });

/* ═══ ۵) خاموش‌کردن دستیار خرید (در بازوی خرید) → پرش به خانهٔ فروش + پیل مخفی ═══ */
await page.evaluate(() => localStorage.removeItem('imach-assist'));
await nav('08'); /* بازوی خرید */
await nav('22');
await page.click('#scr-22 [data-asst="buy"]');
await page.waitForTimeout(400);
const off1 = await page.evaluate(() => ({
  hash: location.hash,
  shown: !document.getElementById('scr-01').hidden,
  pillHidden: document.querySelector('#scr-01 .arm-pill').hidden,
  stored: localStorage.getItem('imach-assist'),
  sheetSub: document.querySelector('#sheet-switch .sub').textContent
}));
check('خرید خاموش → فوری خانهٔ فروش (۰۱)', off1.hash === '#01' && off1.shown);
check('خرید خاموش → پیل «تعویض دستیار» از هدر حذف شد', off1.pillHidden);
check('خرید خاموش → وضعیت در localStorage ماند', off1.stored === JSON.stringify({ sell: true, buy: false }));
check('خرید خاموش → زیرعنوان شیت سوییچ هم‌گام شد', off1.sheetSub.includes('فقط دستیار فروش'));
await page.locator('#phone').screenshot({ path: OUT + '/01-pill-hidden.png' });

/* گارد صفحه‌های بازوی خاموش */
await nav('08');
check('گارد: #۰۸ با خریدِ خاموش → ۰۱', await page.evaluate(() => location.hash === '#01'));
await nav('39');
check('گارد: #۳۹ با خریدِ خاموش → ۰۱', await page.evaluate(() => location.hash === '#01'));
await nav('15');
check('لندینگ (۱۵) مستقل از گارد — در دسترس می‌ماند', await page.evaluate(() => location.hash === '#15' && !document.getElementById('scr-15').hidden));
await nav('17');
await page.evaluate(() => { [...document.querySelectorAll('#scr-17 button, #scr-17 span, #scr-17 b')].find(e => e.textContent.trim() === 'ورود به ای‌مچ').click(); });
await page.waitForTimeout(300);
check('ورود با خریدِ خاموش → خانهٔ فروش (۰۱)', await page.evaluate(() => location.hash === '#01'));

/* ═══ ۶) هر دو همزمان خاموش نمی‌شوند ═══ */
await nav('22');
await page.click('#scr-22 [data-asst="sell"]');
await page.waitForTimeout(200);
const blk = await page.evaluate(() => ({
  sellOn: document.querySelector('#scr-22 [data-asst="sell"]').classList.contains('on'),
  buyOn: document.querySelector('#scr-22 [data-asst="buy"]').classList.contains('on'),
  err: !document.getElementById('as-err').hidden,
  stored: localStorage.getItem('imach-assist')
}));
check('آخرین دستیار روشن خاموش نمی‌شود + خطا پیدا است', blk.sellOn && blk.buyOn === false && blk.err);
check('وضعیت تغییری نکرد', blk.stored === JSON.stringify({ sell: true, buy: false }));
await page.waitForTimeout(2600);
check('خطا خودش پنهان می‌شود', await page.evaluate(() => document.getElementById('as-err').hidden));

/* ═══ ۷) روشن‌کردن دوباره → پیل برمی‌گردد ═══ */
await page.click('#scr-22 [data-asst="buy"]');
await page.waitForTimeout(300);
await nav('08');
check('روشن‌کردن دوباره → پیل تعویض دستیار برگشت', await page.evaluate(() => !document.querySelector('#scr-08 .arm-pill').hidden));
check('وضعیت هر دو روشن ذخیره شد', await page.evaluate(() => localStorage.getItem('imach-assist') === JSON.stringify({ sell: true, buy: true })));

/* ═══ ۸) ذخیرهٔ فرم ۲۲ → خانهٔ همان دستیاری که از آن آمدیم ═══ */
await nav('08'); /* بازوی خرید */
await nav('22');
await page.click('#scr-22 .action-bar .btn-primary');
await page.waitForTimeout(300);
check('ذخیرهٔ ۲۲ از بازوی خرید → خانهٔ خرید (۰۸)', await page.evaluate(() => location.hash === '#08'));
await nav('01'); /* بازوی فروش */
await nav('22');
await page.click('#scr-22 .action-bar .btn-primary');
await page.waitForTimeout(300);
check('ذخیرهٔ ۲۲ از بازوی فروش → کاتالوگ فروش (۰۱)', await page.evaluate(() => location.hash === '#01'));

/* ═══ ۹) بوت تازه با فقط-خرید (خرده‌فروش) ═══ */
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: false, buy: true })));
await page.goto(URL + '#01');
await page.reload();
await page.waitForTimeout(500);
const bootBuyOnly = await page.evaluate(() => ({
  hash: location.hash, arm: document.getElementById('phone').dataset.arm,
  pill: document.querySelector('#scr-08 .arm-pill') ? document.querySelector('#scr-08 .arm-pill').hidden : null,
  t22: null
}));
check('بوت با فروشِ خاموش: #۰۱ → خانهٔ خرید (۰۸)', bootBuyOnly.hash === '#08' && bootBuyOnly.arm === 'buy');
check('بوت با فروشِ خاموش: پیل از همان اول مخفی است', bootBuyOnly.pill === true);
await nav('22');
const sync22 = await page.evaluate(() => ({
  sellOn: document.querySelector('#scr-22 [data-asst="sell"]').classList.contains('on'),
  buyOn: document.querySelector('#scr-22 [data-asst="buy"]').classList.contains('on')
}));
check('سوییچ‌های ۲۲ با وضعیت ذخیره هم‌گام (فروش✗ خرید✓)', !sync22.sellOn && sync22.buyOn);

/* شیت سوییچ: ردیف بازوی خاموش انتخاب نمی‌شود */
await page.evaluate(() => { document.querySelector('#scr-20 .arm-pill') || 0; });
await nav('39');
await page.evaluate(() => { document.querySelector('#scr-39 .arm-pill').click(); });
await page.waitForTimeout(300);
const swGuard = await page.evaluate(() => {
  document.querySelector('#sheet-switch .sheet-row[data-arm-go="sell"]').click();
  return { hash: location.hash, sheetOpen: document.getElementById('sheet-switch').classList.contains('show') };
});
await page.waitForTimeout(300);
check('شیت سوییچ: انتخاب بازوی خاموش بی‌اثر است', swGuard.hash === '#39');
await page.evaluate(() => { document.querySelector('#sheet-switch [data-close]').click(); });

/* ═══ ۱۰) e2e — همهٔ صفحه‌ها (وضعیت پیش‌فرض) بدون خطای کنسول ═══ */
await page.evaluate(() => localStorage.removeItem('imach-assist'));
await page.goto(URL + '#15');
await page.reload();
await page.waitForTimeout(500);
const ids = [...Array(39)].map((_, i) => String(i + 1).padStart(2, '0')).concat(['d1', 'd2', 'd3']);
for (const id of ids) {
  await nav(id);
}
await page.waitForTimeout(300);
check('e2e: هر ۴۲ صفحه بدون خطای کنسول', errors.length === 0);
if (errors.length) console.log('ERRORS:', JSON.stringify(errors, null, 1));

await page.evaluate(() => localStorage.removeItem('imach-assist'));
console.log('────────');
console.log('RESULT: ' + pass + ' PASS / ' + fail + ' FAIL');
await browser.close();
process.exit(fail ? 1 : 0);
