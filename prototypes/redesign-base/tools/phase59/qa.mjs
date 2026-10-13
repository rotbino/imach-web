// فاز ۵۹ — QA قطعی، سه حکم مالک:
//  ۱) ۴۵: دو کادر (legend «پیشنهادهای هر استعلام…» + netguide «بدون شبکه هم از تأمین‌کنندگان خودت…»)
//     یکی شد — فقط پاراگراف کوتاه مالک زیر لیست
//  ۲) ۴۸: هدر ثابت «پیشنهادات برای استعلام» (عنوان کالاها در هدر نه — با قلم زیاد هدر می‌شکست)؛
//     بنر خیلی خلاصهٔ استعلام در بدنه + زیرش پیشنهادات؛ «پیشنهاد» جلوی عنوان کارت‌ها
//  ۳) ۰۸: دکته‌های اشتراک + پیشنمایش لیست خرید در یک کادر — عنوان «اشتراک گذاری لیست خرید»
//     روبه‌رویش آیکون اشتراک، زیرعنوان شبکهٔ خرید، دو دکتهٔ [پیشنمایش | اشتراک]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p59';
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

/* ═══ ۱. فرم ۴۵ — دو کادر یکی شد؛ فقط پاراگراف کوتاه زیر لیست ═══ */
await page.goto(FILE + '#45'); await page.reload(); await sleep(400);
T('۱: پاراگراف کوتاه هست', (await page.locator('#inq-note').count()) === 1);
T('۱: دو کادر قبلی (legend + netguide) حذف شدند', (await page.locator('#scr-45 .netguide, #scr-45 .legend').count()) === 0);
const noteTxt = await page.locator('#inq-note').textContent();
T('۱: متن عین مالک (دعوت + استعلام گروهی + قیمت رقابتی)', noteTxt.includes('با اشتراک گذاری لیست خرید خود ، تامین کنندگان خود را به آیمچ دعوت کنید') && noteTxt.includes('استعلام قیمت گروهی بگیرید') && noteTxt.includes('قیمتهای رقابتی خود را برای شما ارسال کنند'));
T('۱: متن‌های قدیمی دو کادر رفته‌اند', !noteTxt.includes('پیشنهادهای هر استعلام') && !(await page.locator('#scr-45').textContent()).includes('بدون شبکه هم از تأمین‌کنندگان خودت') && !(await page.locator('#scr-45').textContent()).includes('گفتگو» فقط وقتی'));
T('۱: پاراگراف زیر لیست‌ها (بعد از «پایان‌یافته») است', await page.evaluate(() => {
  const done = document.querySelector('#scr-45 .inq-done'), n = document.getElementById('inq-note');
  return !!(done && n && done.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
}));
T('۱: قرینهٔ فروشنده (۰۵ netguide) دست‌نخورده ماند', (await page.locator('#rq-guide').count()) === 1);
await shot('01-45-note');

/* ═══ ۲. فرم ۴۸ — هدر ثابت + بنر خلاصه + «پیشنهاد» جلوی عنوان‌ها ═══ */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('#scr-45 .inq-card[data-inq="inq1"]'); await sleep(400);
T('۲: هدر دقیقاً «پیشنهادات برای استعلام»', (await page.locator('#of48-t').textContent()).trim().startsWith('پیشنهادات برای استعلام'));
T('۲: هدر بدون عنوان کالاها', !(await page.locator('#of48-t').textContent()).includes('برنج هاشمی'));
T('۲: زیرنویس هدر فقط شمار پیشنهاد', (await page.locator('#of48-s').textContent()).trim() === '۳ پیشنهاد');
const bnr = await page.locator('#of48-meta').textContent();
T('۲: بنر بدنه شناسهٔ استعلام + مهلت + ارسال', bnr.includes('برنج هاشمی · ۲۰ کیسهٔ ۵۰ کیلویی') && bnr.includes('۳ روز مانده') && bnr.includes('ارسال به ۳ تأمین‌کننده'));
T('۲: بنر بالای لیست پیشنهادات است', await page.evaluate(() => {
  const b = document.getElementById('of48-meta'), l = document.getElementById('of48-list');
  return !!(b && l && b.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING);
}));
T('۲: هر کارت با «پیشنهاد …» شروع می‌شود', await page.evaluate(() => {
  const ns = Array.from(document.querySelectorAll('#of48-list .oc-head .n'));
  return ns.length === 3 && ns.every(n => n.textContent.trim().startsWith('پیشنهاد '));
}));
await shot('02-48-banner');
/* چندقلمی: هدر ثابت می‌ماند؛ بنر استعلام ۳ قلمی را می‌آورد */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('#scr-45 .inq-card[data-inq="inq2"]'); await sleep(400);
T('۲: چندقلمی — هدر همان ثابت است', (await page.locator('#of48-t').textContent()).trim().startsWith('پیشنهادات برای استعلام') && (await page.locator('#of48-s').textContent()).trim() === '۴ پیشنهاد');
T('۲: چندقلمی — بنر «استعلام ۳ قلمی…» + «امروز آخرین روز»', (await page.locator('#of48-meta').textContent()).includes('استعلام ۳ قلمی — روغن، رب گوجه، قند') && (await page.locator('#of48-meta').textContent()).includes('امروز آخرین روز'));
T('۲: چندقلمی — کارت‌ها همه «پیشنهاد » دارند', await page.evaluate(() => {
  const ns = Array.from(document.querySelectorAll('#of48-list .oc-head .n'));
  return ns.length === 4 && ns.every(n => n.textContent.trim().startsWith('پیشنهاد '));
}));
await shot('03-48-multi');

/* ═══ ۳. فرم ۰۸ — کادر «اشتراک گذاری لیست خرید» با دو دکته ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(400);
T('۳: سربرگ فقط تنظیمات ماند (یک آیکون)', (await page.locator('#scr-08 .sec-title .icon-btn').count()) === 1 && (await page.locator('#scr-08 .sec-title [data-go="23"], #scr-08 .sec-title [data-sheet="sheet-lshare"]').count()) === 0);
T('۳: کادر هست + عنوان «اشتراک گذاری لیست خرید»', (await page.locator('#scr-08 .cat-promo').count()) === 1 && (await page.locator('#scr-08 .cat-promo .cp-head b').textContent()).includes('اشتراک گذاری لیست خرید'));
T('۳: آیکون اشتراک روبه‌روی عنوان', (await page.locator('#scr-08 .cat-promo .cp-ic[data-sheet="sheet-lshare"]').count()) === 1);
const sub = await page.locator('#scr-08 .cat-promo small').textContent();
T('۳: زیرعنوان عین مالک (شبکهٔ خرید)', sub.includes('لیست خرید ابزار دریافت قیمت های رقابتی است') && sub.includes('با تامین کنندگان خود به اشتراکش بگذار و شبکه خرید تشکیل بده'));
T('۳: دو دکته: پیشنمایش (۲۳) + اشتراک (lshare)', (await page.locator('#scr-08 .cat-promo .cp-acts .btn[data-go="23"]').count()) === 1 && (await page.locator('#scr-08 .cat-promo .cp-acts .btn[data-sheet="sheet-lshare"]').count()) === 1);
T('۳: متن قدیمی کادر تشویق رفته', !(await page.locator('#scr-08').textContent()).includes('ویترین نیازهای شماست'));
await page.click('#scr-08 .cat-promo .cp-acts [data-go="23"]'); await sleep(350);
T('۳: کلیک پیشنمایش → صفحهٔ ۲۳ (بدون شیت)', await page.locator('#scr-23').isVisible() && (await page.evaluate(() => location.hash)) === '#23' && !(await page.locator('.sheet.show').count()));
await page.click('#scr-23 .subheader .back'); await sleep(300);
await page.click('#scr-08 .cat-promo .cp-acts [data-sheet="sheet-lshare"]'); await sleep(300);
T('۳: کلیک اشتراک → شیت دوگزینه‌ای lshare', await page.locator('#sheet-lshare.show').isVisible() && (await page.locator('#sheet-lshare .sheet-row').count()) === 2);
await page.click('#sheet-lshare .btn[data-close]'); await sleep(250);
await shot('04-08-sharebox');

/* e2e: بدون خطای کنسول/صفحه */
T('e2e: صفر خطای کنسول/صفحه', errors.length === 0);

await browser.close();
console.log('\n═══ فاز ۵۹ ═══');
console.log('PASS: ' + ok + ' / FAIL: ' + bad);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
process.exit(bad ? 1 : 0);
