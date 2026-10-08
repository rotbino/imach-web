// tools/phase30/qa.mjs — QA فاز ۳۰
// ۱۴: آیکون‌های کارت کسب‌وکار دیگر غول‌آسا نیستند (استایل‌ها به #scr-14 تعمیم یافت).
// sheet-listset: سوییچ «امکان پیام از لیست خرید» → دکمهٔ پیام لیست عمومی (۲۳) پنهان/آشکار.
// ۲۳ (پیش‌نمایش): نوار آمار مارجین‌تاپ + وسط‌چین؛ گردی سه دکمهٔ تماس/پیام/ذخیره کمتر (۷px).
// اسکرول‌بار: باریک (thin) در دسکتاپ + مخفی در موبایل (<480px) برای شیت‌ها/دیالوگ‌ها.
// ۰۲: «مشاهده تابلوی تأمین» حذف؛ هر تأمین‌کنندهٔ ویژه دکمهٔ «کاتالوگ» → ۱۳.
// ۳۷/۳۸: صفحات بازخورد خریداران/فروشندگان — متن مالک عیناً + فرم ساده + پست/لایک/پاسخ (تیم آیمچ).
// ۰۷: شیت «نمای عمومی» با امتیاز زندهٔ کاتالوگ؛ sheet-cmnts: پاسخ فروشنده به نظرات.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p30');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); ok ? pass++ : fail++; };
const hash = () => page.evaluate(() => location.hash);

// ═══ ۱۴ — آیکون‌های کارت کسب‌وکار: دیگر غول‌آسا نیستند ═══
await page.goto(URL + '#14');
await page.waitForTimeout(500);
const biz14 = await page.$eval('#scr-14 .biz-card', el => {
  const capSvg = el.querySelector('.biz-cap svg');
  const editSvg = el.querySelector('.biz-edit svg');
  const dd = el.querySelector('.biz-dd');
  const card = el.getBoundingClientRect();
  return {
    cap: capSvg ? capSvg.getBoundingClientRect().width : 0,
    edit: editSvg ? editSvg.getBoundingClientRect().width : 0,
    dd: dd ? dd.getBoundingClientRect().width : 0,
    cardH: card.height
  };
});
check('۱۴ آیکون کسب‌وکار ۱۳px (نه غول‌آسا)', biz14.cap === 13);
check('۱۴ آیکون مداد ۱۵px + شِوران ۱۵px', biz14.edit === 15 && biz14.dd === 15);
check('۱۴ کارت کسب‌وکار ارتفاع منطقی (< 130px)', biz14.cardH > 60 && biz14.cardH < 130);
const over14 = await page.evaluate(() => {
  const pr = document.querySelector('#phone').getBoundingClientRect();
  return [...document.querySelectorAll('#scr-14 main *')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && (r.right > pr.right + 1 || r.left < pr.left - 1);
  }).length;
});
check('۱۴ بدون سرریز افقی (آیکون‌ها صفحه را نگرفته‌اند)', over14 === 0);
await page.locator('#phone').screenshot({ path: OUT + '/14-bizcard.png' });

// ═══ sheet-listset — دو سوییچ تماس + پیام ═══
await page.goto(URL + '#08');
await page.waitForTimeout(400);
await page.click('#scr-08 .sec-title [data-sheet="sheet-listset"]');
await page.waitForTimeout(400);
const lsTxt = await page.locator('#sheet-listset').innerText();
check('listset: ردیف «امکان تماس از لیست خرید»', lsTxt.includes('امکان تماس از لیست خرید'));
check('listset: ردیف «امکان پیام از لیست خرید» (فاز ۳۰)', lsTxt.includes('امکان پیام از لیست خرید'));
check('listset: هر دو سوییچ روشن (پیش‌فرض)', await page.$eval('#sheet-listset [data-contacttoggle]', el => el.classList.contains('on')) && await page.$eval('#sheet-listset [data-msgtoggle]', el => el.classList.contains('on')));
await page.locator('#phone').screenshot({ path: OUT + '/listset-both.png' });
// خاموش‌کردن پیام → دکمهٔ پیام ۲۳ پنهان
await page.click('#sheet-listset [data-msgtoggle]');
await page.waitForTimeout(250);
check('listset: پیام خاموش → دکمهٔ پیام (۲۳) پنهان', await page.$eval('#scr-23 [data-msgbtn]', el => el.hidden));
check('listset: تماس هنوز روشن (مستقل از پیام)', await page.$eval('#scr-23 [data-contactbtn]', el => !el.hidden));
// خاموش‌کردن تماس هم → هر دو پنهان
await page.click('#sheet-listset [data-contacttoggle]');
await page.waitForTimeout(250);
check('listset: تماس هم خاموش → هر دو پنهان', await page.$eval('#scr-23 [data-contactbtn]', el => el.hidden) && await page.$eval('#scr-23 [data-msgbtn]', el => el.hidden));
// برگرداندن هر دو
await page.click('#sheet-listset [data-contacttoggle]');
await page.click('#sheet-listset [data-msgtoggle]');
await page.waitForTimeout(250);
check('listset: برگشت هر دو → هر دو دکمه آشکار', !(await page.$eval('#scr-23 [data-contactbtn]', el => el.hidden)) && !(await page.$eval('#scr-23 [data-msgbtn]', el => el.hidden)));
await page.click('#sheet-listset [data-close]');
await page.waitForTimeout(300);

// ═══ ۲۳ — نوار آمار + گردی دکمه‌ها ═══
await page.goto(URL + '#23');
await page.waitForTimeout(500);
const strip = await page.$eval('#scr-23 .insight-strip', el => {
  const cs = getComputedStyle(el);
  const mt = parseInt(cs.marginTop, 10);
  const spans = [...el.children];
  /* وسط‌چین: هر آیتم flex:1 است و محتوایش درون خودش justify-content:center دارد (ستون‌های هم‌عرض، محتوا وسط) */
  const centered = spans.every(s => {
    const sc = getComputedStyle(s);
    return sc.display.includes('flex') && sc.justifyContent === 'center';
  });
  const ws = spans.map(s => s.getBoundingClientRect().width);
  const equal = Math.max(...ws) - Math.min(...ws) < 2;
  return { mt, n: spans.length, centered, equal, justify: cs.justifyContent };
});
check('۲۳ نوار آمار: مارجین‌تاپ از نوار تماس (≥ ۱۰px)', strip.mt >= 10);
check('۲۳ نوار آمار: ۳ آیتم وسط‌چین (flex:1 + center)', strip.n === 3 && strip.centered && strip.equal && strip.justify === 'center');
const radii = await page.$$eval('#scr-23 .contact-row .btn', els => els.map(e => parseInt(getComputedStyle(e).borderRadius, 10)));
check('۲۳ گردی سه دکمه کمتر شد (۷px)', radii.length === 3 && radii.every(r => r <= 7));
const gapOk = await page.evaluate(() => {
  const cr = document.querySelector('#scr-23 .contact-row').getBoundingClientRect();
  const is_ = document.querySelector('#scr-23 .insight-strip').getBoundingClientRect();
  return is_.top - cr.bottom >= 8;
});
check('۲۳ نوار آمار دیگر به نوار تماس نچسبیده (فاصله ≥ ۸px)', gapOk);
await page.locator('#phone').screenshot({ path: OUT + '/23-stats-row.png' });

// ═══ اسکرول‌بار — باریک/مخفی ═══
await page.goto(URL + '#13');
await page.waitForTimeout(400);
await page.click('#scr-13 .subheader [data-sheet="sheet-cmnts"]');
await page.waitForTimeout(400);
const sbDesk = await page.$eval('#sheet-cmnts', el => getComputedStyle(el).scrollbarWidth);
check('اسکرول‌بار شیت در دسکتاپ باریک است (thin)', sbDesk === 'thin');
await page.click('#sheet-cmnts [data-close]');
await page.waitForTimeout(300);
// نمای موبایل — مخفی
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
mob.on('pageerror', err => errors.push(String(err)));
await mob.goto(URL + '#13');
await mob.waitForTimeout(500);
await mob.click('#scr-13 .subheader [data-sheet="sheet-cmnts"]');
await mob.waitForTimeout(400);
const sbMob = await mob.$eval('#sheet-cmnts', el => getComputedStyle(el).scrollbarWidth);
check('اسکرول‌بار شیت در موبایل مخفی است (none)', sbMob === 'none');
await mob.close();

// ═══ ۰۲ — تأمین‌کنندگان ویژه: کاتالوک به‌جای تابلوی تأمین ═══
await page.goto(URL + '#02');
await page.waitForTimeout(500);
const sp = await page.$$eval('#scr-02 .sp-row', els => els.map(e => ({
  t: e.querySelector('.sp-t').textContent.replace(/\s+/g, ' ').trim(),
  p: e.querySelector('.sp-p').textContent.replace(/\s+/g, ' ').trim(),
  btn: e.querySelector('.btn') ? e.querySelector('.btn').textContent.trim() : '',
  go: e.querySelector('.btn') ? e.querySelector('.btn').getAttribute('data-go') : ''
})));
check('۰۲ دو ردیف تأمین‌کنندهٔ ویژه (آریو/کیان) با قیمت', sp.length === 2 && sp[0].t.includes('آریو غلات') && sp[1].t.includes('کیان غلات') && sp[0].p.includes('۲٬۹۲۰٬۰۰۰'));
check('۰۲ هر ردیف دکمهٔ «کاتالوک» → ۱۳ دارد', sp.every(s => s.btn.includes('کاتالوگ') && s.go === '13'));
check('۰۲ دکمهٔ «مشاهده تابلوی تأمین» حذف شد', !(await page.locator('#scr-02 button', { hasText: 'مشاهده تابلوی تأمین' }).count()));
await page.locator('#scr-02 .sp-row .btn').first().click();
await page.waitForTimeout(400);
check('۰۲ کاتالوک آریو غلات → کاتالوگ عمومی (۱۳)', (await hash()) === '#13');
await page.locator('#phone').screenshot({ path: OUT + '/02-sp-catalog.png' });

// ═══ ۳۷ — بازخورد خریداران عمده ═══
await page.goto(URL + '#37');
await page.waitForTimeout(500);
let t37 = await page.locator('#scr-37').innerText();
check('۳۷ متن مالک: «کمک کن دستیار خرید رو برات مفیدتر کنیم!»', t37.includes('کمک کن دستیار خرید رو برات مفیدتر کنیم!'));
check('۳۷ متن مالک: «چطور می‌تونیم دستیار خرید رو برای شما بهتر کنیم؟»', t37.includes('چطور می‌تونیم دستیار خرید رو برای شما بهتر کنیم؟'));
check('۳۷ متن مالک: پاراگراف «هنگام استفاده از دستیار خرید…»', t37.includes('هنگام استفاده از دستیار خرید برای خرید عمده، چه چیزی براتون سخت، پیچیده یا ناکارآمده؟ چه چیزی می‌تونه کار با آیمچ رو براتون راحت‌تر و مفیدتر کنه؟'));
check('۳۷ متن مالک: پاراگراف «از تجربه‌تون بگید…»', t37.includes('از تجربه‌تون بگید؛ چه مشکلی داشتید، چه چیزی انتظارتون رو برآورده نکرده یا دوست دارید چه چیزی تغییر کنه. یا چه چیزی به دستیار خرید اضافه بشه. چه ایده ای دارید؟'));
check('۳۷ متن مالک: «ایده و نظر بدید تا دیگران لایک کنن و نظر اونارم بدونید»', t37.includes('ایده و نظر بدید تا دیگران لایک کنن و نظر اونارم بدونید'));
check('۳۷ پست‌های نمونه + پاسخ تیم آیمچ', t37.includes('تیم آیمچ') && t37.includes('سوپرمارکت نگین'));
await page.locator('#phone').screenshot({ path: OUT + '/37-buyer.png' });
// ثبت خالی → خطا
await page.click('#scr-37 [data-fbsend]');
await page.waitForTimeout(250);
check('۳۷ ثبت خالی → پیام خطا', !(await page.$eval('#fb-err-37', el => el.hidden)));
// ثبت پر → پست جدید بالای لیست
await page.fill('#fb-text-37', 'کاش سبد خرید چند فروشنده‌ای یک‌جا تسویه می‌شد.');
await page.click('#scr-37 [data-fbsend]');
await page.waitForTimeout(300);
t37 = await page.locator('#scr-37').innerText();
check('۳۷ ثبت → پست «سوپرمارکت آریا · همین حالا» بالای لیست', t37.includes('سوپرمارکت آریا') && t37.includes('همین حالا') && t37.includes('کاش سبد خرید چند فروشنده‌ای یک‌جا تسویه می‌شد.'));
check('۳۷ شمارندهٔ نظر به‌روز شد (۴ نظر)', (await page.locator('#fb-count-37').innerText()).includes('۴'));
check('۳۷ خطا و فرم خالی شد', await page.$eval('#fb-err-37', el => el.hidden) && (await page.inputValue('#fb-text-37')) === '');
// لایک
const like0 = await page.locator('#scr-37 .fb-item').first().locator('.fb-like').innerText();
await page.locator('#scr-37 .fb-item').first().locator('[data-fblike]').click();
await page.waitForTimeout(250);
const like1 = await page.locator('#scr-37 .fb-item').first().locator('.fb-like').innerText();
check('۳۷ لایک روشن شد + شمارش +۱ (۰ → ۱)', like0.includes('۰') && like1.includes('۱'));
// پاسخ
await page.locator('#scr-37 .fb-item').first().locator('[data-fbreply]').click();
await page.waitForTimeout(250);
check('۳۷ «پاسخ» → جعبهٔ پاسخ باز شد', !!(await page.$('#scr-37 .fb-rbox input')));
await page.fill('#scr-37 .fb-rbox input', 'منم همین مشکل را دارم.');
await page.locator('#scr-37 .fb-rbox [data-fbrsend]').click();
await page.waitForTimeout(250);
t37 = await page.locator('#scr-37').innerText();
check('۳۷ ارسال پاسخ → پاسخ زیر همان پست', t37.includes('منم همین مشکل را دارم.'));
// لینک از پروفایل خریدار
await page.goto(URL + '#14');
await page.waitForTimeout(400);
const fbLink14 = await page.$eval('#scr-14 [data-go="37"]', el => el.textContent.replace(/\s+/g, ' ').trim());
check('۱۴ لینک «نظر و ایده دربارهٔ دستیار خرید» → ۳۷', fbLink14.includes('نظر و ایده دربارهٔ دستیار خرید'));
await page.click('#scr-14 [data-go="37"]');
await page.waitForTimeout(400);
check('۱۴ کلیک → صفحهٔ ۳۷', (await hash()) === '#37');
// بازگشت → ۱۴
await page.click('#scr-37 .subheader .back');
await page.waitForTimeout(400);
check('۳۷ بازگشت → پروفایل خریدار (۱۴)', (await hash()) === '#14');

// ═══ ۳۸ — بازخورد فروشندگان ═══
await page.goto(URL + '#38');
await page.waitForTimeout(500);
let t38 = await page.locator('#scr-38').innerText();
check('۳۸ متن مالک: «چطور می‌تونیم دسیتار فروش رو برای شما بهتر کنیم؟»', t38.includes('چطور می‌تونیم دسیتار فروش رو برای شما بهتر کنیم؟'));
check('۳۸ متن مالک: پاراگراف «هنگام استفاده از آیمچ…»', t38.includes('هنگام استفاده از آیمچ برای فروش عمده، چه چیزی براتون سخت، پیچیده یا ناکارآمده؟ چه چیزی می‌تونه کار با آیمچ رو براتون راحت‌تر و مفیدتر کنه؟'));
check('۳۸ متن مالک: پاراگراف «از تجربه‌تون بگید…»', t38.includes('از تجربه‌تون بگید؛ چه مشکلی داشتید، چه چیزی انتظاراتون رو برآورده نکرده یا دوست دارید چه چیزی تغییر کنه. یا چه چیزی اضافه یا کم بشه؟ آیا ایده خاصی دارید؟'));
check('۳۸ متن مالک: «ایده و نظر بدید تا دیگران لایک کنن و نظر اونارم بدونید»', t38.includes('ایده و نظر بدید تا دیگران لایک کنن و نظر اونارم بدونید'));
await page.locator('#phone').screenshot({ path: OUT + '/38-seller.png' });
// ثبت پست فروشنده
await page.fill('#fb-text-38', 'کاش گزارش گوش به زنگ‌ها هم جدا می‌آمد.');
await page.click('#scr-38 [data-fbsend]');
await page.waitForTimeout(300);
t38 = await page.locator('#scr-38').innerText();
check('۳۸ ثبت → پست «پخش برنج پارس · همین حالا» بالای لیست', t38.includes('پخش برنج پارس') && t38.includes('کاش گزارش گوش به زنگ‌ها هم جدا می‌آمد.'));
// لینک از پروفایل فروش
await page.goto(URL + '#07');
await page.waitForTimeout(400);
const fbLink07 = await page.$eval('#scr-07 [data-go="38"]', el => el.textContent.replace(/\s+/g, ' ').trim());
check('۰۷ لینک «نظر و ایده دربارهٔ دستیار فروش» → ۳۸', fbLink07.includes('نظر و ایده دربارهٔ دستیار فروش'));
await page.click('#scr-07 [data-go="38"]');
await page.waitForTimeout(400);
check('۰۷ کلیک → صفحهٔ ۳۸', (await hash()) === '#38');
await page.click('#scr-38 .subheader .back');
await page.waitForTimeout(400);
check('۳۸ بازگشت → پروفایل فروش (۰۷)', (await hash()) === '#07');

// ═══ ۰۷ — شیت نمای عمومی با امتیاز کاتالوگ ═══
await page.goto(URL + '#07');
await page.waitForTimeout(400);
await page.click('#scr-07 [data-sheet="sheet-pubview"]');
await page.waitForTimeout(400);
const pvTxt = await page.locator('#sheet-pubview').innerText();
check('شیت نمای عمومی: باز شد از «نمای عمومی»', await page.$eval('#sheet-pubview', el => el.classList.contains('show')));
check('شیت نمای عمومی: امتیاز ۴٫۴ + از ۲۴ نظر خریدار', pvTxt.includes('۴٫۴') && pvTxt.includes('از ۲۴ نظر خریدار'));
const pvStars = await page.$$eval('#sheet-pubview #pv-avgstars svg.on', els => els.length);
check('شیت نمای عمومی: ۴ ستارهٔ روشن', pvStars === 4);
check('شیت نمای عمومی: دکمهٔ «مشاهدهٔ کامل کاتالوگ» → ۱۳', !!(await page.$eval('#sheet-pubview .sheet-cta[data-go="13"]', el => true)));
await page.locator('#phone').screenshot({ path: OUT + '/07-pubview.png' });
// هم‌گامی زنده: بعد از ثبت نظر در ۱۳، امتیاز شیت هم به‌روز می‌شود
await page.goto(URL + '#13');
await page.waitForTimeout(400);
await page.click('#scr-13 .subheader [data-sheet="sheet-cmnts"]');
await page.waitForTimeout(400);
await page.click('#sheet-cmnts [data-cstar="5"]');
await page.fill('#sheet-cmnts #cm-text', 'ارسال و بسته‌بندی عالی بود.');
await page.click('#sheet-cmnts [data-cmnt-send]');
await page.waitForTimeout(300);
await page.click('#sheet-cmnts [data-close]');
await page.waitForTimeout(250);
await page.goto(URL + '#07');
await page.waitForTimeout(350);
await page.click('#scr-07 [data-sheet="sheet-pubview"]');
await page.waitForTimeout(350);
const pvTxt2 = await page.locator('#sheet-pubview').innerText();
check('نمای عمومی: بعد از ثبت نظر، امتیاز هم‌گام شد (از ۲۵ نظر)', pvTxt2.includes('از ۲۵ نظر خریدار'));

// ═══ sheet-cmnts — پاسخ فروشنده به نظرات ═══
await page.goto(URL + '#13');
await page.waitForTimeout(400);
await page.click('#scr-13 .subheader [data-sheet="sheet-cmnts"]');
await page.waitForTimeout(400);
let cmTxt = await page.locator('#sheet-cmnts').innerText();
check('نظرات: پاسخ‌های ازپیش‌موجود فروشنده (نشان «فروشنده»)', cmTxt.includes('فروشنده') && cmTxt.includes('ممنون از اعتماد شما'));
check('نظرات: دکمهٔ «پاسخ» زیر هر نظر', (await page.$$('#sheet-cmnts [data-cmreply]')).length >= 5);
// باز کردن جعبهٔ پاسخ روی نظر بدون پاسخ (رستوران سنتی بهار) و ارسال
await page.locator('#sheet-cmnts [data-cmreply="1"]').click();
await page.waitForTimeout(250);
check('نظرات: «پاسخ» → جعبهٔ پاسخ باز شد', !!(await page.$('#cm-rin')));
await page.fill('#cm-rin', 'ممنون از بازخورد؛ ارسال‌های این هفته به پیک اختصاصی سپرده شده است.');
await page.locator('#sheet-cmnts [data-cmrsend="1"]').click();
await page.waitForTimeout(300);
cmTxt = await page.locator('#sheet-cmnts').innerText();
check('نظرات: ارسال → پاسخ فروشنده زیر همان نظر نشست', cmTxt.includes('ممنون از بازخورد؛ ارسال‌های این هفته به پیک اختصاصی سپرده شده است.'));
await page.locator('#phone').screenshot({ path: OUT + '/13-seller-reply.png' });
await page.click('#sheet-cmnts [data-close]');
await page.waitForTimeout(250);

// ═══ e2e — همهٔ صفحه‌ها بدون خطای کنسول ═══
const ids = [];
for (let i = 1; i <= 38; i++) ids.push(String(i));
ids.push('d1', 'd2', 'd3');
for (const id of ids) {
  await page.goto(URL + '#' + id);
  await page.waitForTimeout(110);
}
check('e2e: صفر خطای کنسول در ' + ids.length + ' صفحه (' + errors.length + ' خطا)', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5).join('\n'));

console.log('\n═══ نتیجه: ' + pass + ' PASS · ' + fail + ' FAIL ═══');
await browser.close();
process.exit(fail ? 1 : 0);
