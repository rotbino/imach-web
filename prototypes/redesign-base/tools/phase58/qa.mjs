// فاز ۵۸ — QA قطعی، هشت حکم مالک:
//  ۱) ۰۸: عنوان «استعلام‌های جاری» ریزتر (۱۱px) و کمرنگ‌تر (muted) — متمایز از عنوان اصلی
//  ۲) ۰۸: پیشنمایش → صفحهٔ خرید از دید عمومی (۲۳) — نه شیت تنظیمات لیست (فاز ۵۹: دکته داخل کادر اشتراک)
//  ۳) ۰۸: کادر اشتراک لیست خرید — عنوان/زیرعنوان مالک + دو دکتهٔ [پیشنمایش | اشتراک] (فاز ۵۹)
//  ۴) ۰۸: دکتهٔ اشتراک → شیت دوگزینه‌ای sheet-lshare (مخاطبین + شبکه‌های اجتماعی)
//  ۵) ۲۳: صفحهٔ عمومی بازگشت — هویت/تماس/آمار/درخواست‌ها/زنگوله‌ها + ذخیرهٔ لیست + پیام
//  ۶) ۴۲: سه باکس درباره آیمچ / تماس با آیمچ / راهنما + شیت‌هایشان
//  ۷) ۰۷: دو لینک راهنما + صفحات راهنمای ۶۰/۶۱ (گام‌ها + محتوا + back)
//  ۸) ۳۰/۴۶: هزینهٔ «ارسال درخواست خرید» ۴٬۰۰۰ تومان (adguide + آمار/ردیف/جمع گزارش)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p58';
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const shot = async (n) => { await page.screenshot({ path: SHOTS + '/' + n + '.png', clip: { x: 34, y: 0, width: 402, height: 874 } }); };

let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

await page.goto(FILE + '#01'); await sleep(300);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });

/* ═══ ۱. ۰۸ — عنوان «استعلام‌های جاری» ریزتر و کمرنگ‌تر ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(400);
const inqStyle = await page.evaluate(() => {
  const h = document.querySelector('#scr-08 .bl-inq-title h2');
  const m = document.querySelector('#scr-08 .sec-title:not(.bl-inq-title) h2');
  if (!h || !m) return null;
  const hs = getComputedStyle(h), ms = getComputedStyle(m);
  return { size: hs.fontSize, weight: hs.fontWeight, color: hs.color, msize: ms.fontSize, mcolor: ms.color };
});
T('۱: عنوان استعلام‌های جاری ۱۱px است (قبلاً ۱۲.۵)', inqStyle && inqStyle.size === '11px');
T('۱: فونت ۶۰۰ (کمرنگ‌تر از ۷۰۰)', inqStyle && inqStyle.weight === '600');
T('۱: رنگ muted — متفاوت از عنوان اصلی', inqStyle && inqStyle.color !== inqStyle.mcolor);
T('۱: عنوان اصلی ۱۵px ماند (کاتالوک‌گونه)', inqStyle && inqStyle.msize === '15px');
await shot('01-list-title');

/* ═══ ۲. ۰۸ — پیشنمایش → صفحهٔ ۲۳ (فاز ۵۹: دکته داخل کادر اشتراک، نه سربرگ) ═══ */
T('۲: پیشنمایش data-go="23" دارد (نه شیت)', (await page.locator('#scr-08 .cat-promo .cp-acts [data-go="23"]').count()) === 1 && (await page.locator('#scr-08 .sec-title .icon-btn').count()) === 1);
await page.click('#scr-08 .cat-promo .cp-acts [data-go="23"]'); await sleep(350);
T('۲: کلیک پیشنمایش → صفحهٔ ۲۳ باز شد', await page.locator('#scr-23').isVisible() && (await page.evaluate(() => location.hash)) === '#23');
T('۲: هیچ شیتی باز نشد', !(await page.locator('.sheet.show').count()));
await shot('02-public23');

/* ═══ ۵. صفحهٔ ۲۳ — ساختار کامل عمومی ═══ */
T('۵: ۲۳ عنوان لیست خرید سوپرمارکت آریا', (await page.locator('#scr-23 .subheader .ttl').textContent()).includes('لیست خرید سوپرمارکت آریا'));
T('۵: هویت خریدار + آنلاین', (await page.locator('#scr-23 .biz-head .biz-name').textContent()).includes('سوپرمارکت آریا') && (await page.locator('#scr-23 .presence.on').count()) === 1);
T('۵: نقش «مسئول خرید» نمایش داده می‌شود', (await page.locator('#scr-23 .biz-meta .owner').textContent()).includes('مسئول خرید'));
T('۵: نوار سه‌اکشنی تماس/پیام/ذخیره', (await page.locator('#scr-23 .contact-row .btn').count()) === 3);
T('۵: آمار ۴ کالا · ۱۲ تأمین‌کننده (فاز ۶۰) · ۸۶ بازدید', (await page.locator('#scr-23 .insight-strip').textContent()).includes('۴') && (await page.locator('#scr-23 .insight-strip').textContent()).includes('۱۲') && (await page.locator('#scr-23 .insight-strip').textContent()).includes('۸۶'));
T('۵: دو کارت درخواست خرید جاری', (await page.locator('#scr-23 .rfq-card').count()) === 2);
T('۵: چهار ردیف لیست با زنگوله', (await page.locator('#scr-23 .row-card').count()) === 4 && (await page.locator('#scr-23 .alert-bell').count()) === 4);
T('۵: راهنمای زنگولهٔ گوش به زنگ (متن مالک فاز ۲۸)', (await page.locator('#scr-23 .legend').textContent()).includes('زنگوله') && (await page.locator('#scr-23 .legend').textContent()).includes('باخبر شوید'));
/* ذخیرهٔ لیست */
await page.click('#scr-23 [data-savelist]'); await sleep(250);
T('۵: «ذخیرهٔ لیست» → ذخیره شد (سبز)', (await page.locator('#scr-23 [data-savelist].saved').count()) === 1 && (await page.locator('#scr-23 [data-savelist]').textContent()).includes('ذخیره شد'));
/* پیام → ۱۹ */
await page.click('#scr-23 [data-msgbtn]'); await sleep(350);
T('۵: پیام → گفتگو (۱۹)', await page.locator('#scr-19').isVisible());
await page.click('#scr-19 .subheader .back'); await sleep(300);
T('۵: back از ۱۹ → ۲۳', await page.locator('#scr-23').isVisible());
/* اشتراک هدر ۲۳ → lshare */
await page.click('#scr-23 .subheader [data-sheet="sheet-lshare"]'); await sleep(300);
T('۵: اشتراک هدر ۲۳ → شیت دوگزینه‌ای', await page.locator('#sheet-lshare.show').isVisible());
await page.click('#sheet-lshare .btn[data-close]'); await sleep(250);
await page.click('#scr-23 .subheader .back'); await sleep(300);
T('۵: back از ۲۳ → ۰۸', await page.locator('#scr-08').isVisible());

/* ═══ ۳+۴. ۰۸ — کادر اشتراک لیست خرید (فاز ۵۹: عنوان/زیرعنوان مالک + دو دکته) + شیت دوگزینه‌ای ═══ */
T('۳: کادر cat-promo روی ۰۸ هست', (await page.locator('#scr-08 .cat-promo').count()) === 1);
T('۳: عنوان کادر «اشتراک گذاری لیست خرید» + آیکون روبه‌رو', (await page.locator('#scr-08 .cat-promo .cp-head b').textContent()).includes('اشتراک گذاری لیست خرید') && (await page.locator('#scr-08 .cat-promo .cp-ic').count()) === 1);
T('۳: زیرعنوان شبکهٔ خرید (متن مالک فاز ۵۹)', (await page.locator('#scr-08 .cat-promo small').textContent()).includes('شبکه خرید') && (await page.locator('#scr-08 .cat-promo small').textContent()).includes('قیمت های رقابتی'));
T('۳: دو دکتهٔ پیشنمایش/اشتراک داخل کادر (فاز ۵۹)', (await page.locator('#scr-08 .cat-promo .cp-acts .btn').count()) === 2);
T('۴: دکتهٔ اشتراک کادر → lshare (نه مستقیم مخاطبین)', (await page.locator('#scr-08 .cat-promo .cp-acts [data-sheet="sheet-lshare"]').count()) === 1 && (await page.locator('#scr-08 .cat-promo [data-sheet="sheet-contacts"]').count()) === 0);
await page.click('#scr-08 .cat-promo .cp-acts [data-sheet="sheet-lshare"]'); await sleep(300);
T('۴: شیت lshare باز شد — دو گزینه دقیقاً', await page.locator('#sheet-lshare.show').isVisible() && (await page.locator('#sheet-lshare .sheet-row').count()) === 2);
T('۴: گزینهٔ اول «اشتراک گذاری با مخاطبین»', (await page.locator('#sheet-lshare .sheet-row').first().textContent()).includes('اشتراک گذاری با مخاطبین'));
T('۴: گزینهٔ دوم «اشتراک گذاری در شبکه‌های اجتماعی»', (await page.locator('#sheet-lshare .sheet-row').nth(1).textContent()).includes('اشتراک گذاری در شبکه\u200cهای اجتماعی'));
const hasNative = await page.evaluate(() => !!navigator.share);
if (!hasNative) {
  await page.click('#sheet-lshare [data-nativeshare]'); await sleep(300);
  T('۴: nativeshare → بازخورد موقت (بدون navigator.share)', (await page.locator('#sheet-lshare [data-nativeshare] b').textContent()).includes('باز شد'));
  await sleep(1100);
  T('۴: شیت بعد از بازخورد بسته شد', !(await page.locator('#sheet-lshare.show').count()));
  await sleep(200);
} else {
  T('۴: nativeshare (مرورگر پشتیبان دارد — بررسی ساختاری)', (await page.locator('#sheet-lshare [data-nativeshare]').count()) === 1);
  await page.click('#sheet-lshare .btn[data-close]'); await sleep(250);
}
await page.click('#scr-08 .cat-promo .cp-acts [data-sheet="sheet-lshare"]'); await sleep(300);
await page.click('#sheet-lshare [data-sheet="sheet-contacts"]'); await sleep(300);
T('۴: مخاطبین از گزینهٔ اول باز می‌شود', await page.locator('#sheet-contacts.show').isVisible());
await page.click('#sheet-contacts .btn[data-close]'); await sleep(250);
await shot('03-lshare-flow');

/* نظرات لندینگ: دکتهٔ خریدار حالا صفحهٔ ۲۳ را باز می‌کند (قبلاً مرده بود) */
await page.goto(FILE + '#15'); await page.reload(); await sleep(400);
T('۵-ب: دکتهٔ «مشاهده لیست خرید» نظر خریدار → ۲۳', (await page.locator('#ts-row-15 .ts-btn[data-go="23"]').count()) >= 1);

/* ═══ ۶. پروفایل (۴۲) — سه باکس + شیت‌ها ═══ */
await page.goto(FILE + '#42'); await page.reload(); await sleep(400);
T('۶: باکس «درباره آیمچ»', (await page.locator('#scr-42 [data-sheet="sheet-about"]').count()) === 1);
T('۶: باکس «تماس با آیمچ»', (await page.locator('#scr-42 [data-sheet="sheet-contact"]').count()) === 1);
T('۶: باکس «راهنما»', (await page.locator('#scr-42 [data-sheet="sheet-guides"]').count()) === 1);
await shot('04-profile-boxes');
await page.click('#scr-42 [data-sheet="sheet-about"]'); await sleep(300);
T('۶: شیت درباره — پیام منفعت‌محور (همگام فاز ۶۲)', await page.locator('#sheet-about.show').isVisible() && (await page.locator('#sheet-about .adg-p').nth(1).textContent()).includes('لیست مشتریانش') && !(await page.locator('#sheet-about').textContent()).includes('بدون شبکه'));
await page.click('#sheet-about .btn[data-close]'); await sleep(250);
await page.click('#scr-42 [data-sheet="sheet-contact"]'); await sleep(300);
T('۶: شیت تماس — تلفن/ایمیل/سایت', (await page.locator('#sheet-contact .sheet-row').count()) === 3 && (await page.locator('#sheet-contact').textContent()).includes('۰۲۱'));
await page.click('#sheet-contact [data-dial]'); await sleep(250);
T('۶: «تماس» → در حال تماس…', (await page.locator('#sheet-contact [data-dial]').textContent()).includes('در حال تماس'));
await page.click('#sheet-contact .btn[data-close]'); await sleep(250);
await page.click('#scr-42 [data-sheet="sheet-guides"]'); await sleep(300);
T('۶: شیت راهنما — دو راهنما', (await page.locator('#sheet-guides .sheet-row[data-go]').count()) === 2);
await shot('05-guides-sheet');
await page.click('#sheet-guides .sheet-row[data-go="60"]'); await sleep(400);
T('۶: راهنمای خرید از شیت → صفحهٔ ۶۰', await page.locator('#scr-60').isVisible() && (await page.evaluate(() => location.hash)) === '#60');

/* ═══ ۷. صفحات راهنما ۶۰/۶۱ + ورود از تنظیمات ۰۷ ═══ */
T('۷: ۶۰ شش گام دارد', (await page.locator('#scr-60 .gd-row').count()) === 6);
T('۷: ۶۰ کارت آغاز + قانون رایگان', (await page.locator('#scr-60 .gd-lead').count()) === 1 && (await page.locator('#scr-60 .legend').textContent()).includes('رایگان'));
T('۷: ۶۰ گام ششم — قیمت‌های همیشه تازه (همگام فاز ۶۲)', (await page.locator('#scr-60 .gd-row').nth(5).textContent()).includes('قیمت‌های همیشه تازه') && !(await page.locator('#scr-60 .gd-row').nth(5).textContent()).includes('بدون شبکه'));
await shot('06-guide60');
await page.click('#scr-60 .subheader .back'); await sleep(300);
T('۷: back از ۶۰ (ورود از ۴۲) → پروفایل', await page.locator('#scr-42').isVisible());
/* ورود از تنظیمات ۰۷ */
await page.goto(FILE + '#07'); await page.reload(); await sleep(400);
T('۷: ۰۷ دو لینک راهنما', (await page.locator('#scr-07 [data-go="60"]').count()) === 1 && (await page.locator('#scr-07 [data-go="61"]').count()) === 1);
await page.click('#scr-07 [data-go="61"]'); await sleep(350);
T('۷: راهنمای فروش → صفحهٔ ۶۱', await page.locator('#scr-61').isVisible());
T('۷: ۶۱ شش گام دارد', (await page.locator('#scr-61 .gd-row').count()) === 6);
T('۷: ۶۱ گام تبلیغ با چهار قیمت (۴٬۰۰۰ درخواست)', (await page.locator('#scr-61 .gd-row').nth(4).textContent()).includes('۴٬۰۰۰'));
await shot('07-guide61');
await page.click('#scr-61 .subheader .back'); await sleep(300);
T('۷: back از ۶۱ (ورود از ۰۷) → تنظیمات', await page.locator('#scr-07').isVisible());

/* ═══ ۸. تبلیغ/گزارش — «ارسال درخواست خرید» ۴٬۰۰۰ تومان ═══ */
await page.goto(FILE + '#30'); await page.reload(); await sleep(400);
await page.click('#scr-30 [data-sheet="sheet-adguide"]'); await sleep(300);
T('۸: adguide چهار رویداد هزینه‌دار', (await page.locator('#sheet-adguide .adg-row').count()) === 4);
T('۸: ردیف ۴ «ارسال درخواست خرید — ۴٬۰۰۰ تومان»', (await page.locator('#sheet-adguide .adg-row').nth(3).textContent()).includes('ارسال درخواست خرید') && (await page.locator('#sheet-adguide .adg-row').nth(3).textContent()).includes('۴٬۰۰۰'));
T('۸: متن گزارشِ کامل، درخواست‌ها را هم شامل شد', (await page.locator('#sheet-adguide .adg-p').nth(4).textContent()).includes('درخواست خرید فرستادند'));
await shot('08-adguide');
await page.click('#sheet-adguide .btn[data-close]'); await sleep(250);
await page.goto(FILE + '#46'); await page.reload(); await sleep(400);
T('۸: آمار «۳ درخواست خرید»', (await page.locator('#scr-46 .stat-strip .stat').count()) === 4 && (await page.locator('#scr-46 .stat-strip').textContent()).includes('درخواست خرید'));
T('۸: جمع مصرف ۱۹۲٬۰۰۰ (۱۲۰×۱+۱۴×۳+۶×۳+۳×۴ هزار)', (await page.locator('#scr-46 .price-chips').textContent()).includes('۱۹۲٬۰۰۰'));
T('۸: ردیف نمونهٔ «− ۴٬۰۰۰» در ریز رویدادها', (await page.locator('#scr-46 .usg-row').first().textContent()).includes('درخواست خرید فرستاد') && (await page.locator('#scr-46 .usg-row').first().textContent()).includes('۴٬۰۰۰'));
await shot('09-report46');

/* ═══ e2e — صفر خطا ═══ */
T('e2e: هیچ خطای JS در کل مسیر', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5));

console.log('\n═══ فاز ۵۸ ═══');
console.log('PASS: ' + ok + ' / FAIL: ' + bad);
await browser.close();
process.exit(bad ? 1 : 0);
