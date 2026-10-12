// فاز ۴۹ — QA قطعی: تکمیل فرایند استعلام و پاسخ
// ۱۲ (مودال کالا + مهلت ۱-۵ + تأمین‌کننده‌های داده‌محور + مودال بیشتر) · ارسال → کارت تازه در ۴۵ ·
// ۴۸ empty-state · ۰۵ (کارت‌های بازطراحی + حذف «تقاضای منطبق») · مودال درخواست با فرم پیشنهاد (جذب ۴۷) ·
// گاردهای ساختاری + e2e همهٔ ۲۵ صفحه
import { chromium } from 'playwright';

const FILE = 'file://' + process.cwd() + '/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
await page.goto(FILE + '#12');
await page.reload();
await sleep(300);

const shot = async (n) => { await page.screenshot({ path: '/home/z/my-project/shots-p49/' + n + '.png', clip: { x: 34, y: 0, width: 402, height: 874 } }); };

let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

/* ═══ ۰. گاردهای ساختاری ═══ */
const ALIVE = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','27','29','30','34','42','44','45','46','48'];
T('ساختار: ۲۷ صفحه داخل گوشی (فاز ۵۶: +۴۳ سایر نظرات)', await page.evaluate(() => document.querySelectorAll('#phone > section.scr').length === 27));
T('ساختار: هیچ scr بیرون از گوشی/استیج', await page.evaluate(() => document.querySelectorAll('#stage > .scr, body > .scr').length === 0));
T('ساختار: ارتفاع سند ≤ ۱۰۰۰', await page.evaluate(() => document.documentElement.scrollHeight <= 1000));
T('ساختار: صفحهٔ ۴۷ حذف شده (جذب مودال)', await page.locator('#scr-47').count() === 0);
T('ساختار: دو مودال فاز ۴۹ لنگر در #phone (suppick فاز ۵۴ حذف شد)', await page.evaluate(() => ['sheet-iqpick', 'sheet-reqview'].every(id => { const e = document.getElementById(id); return e && e.closest('#phone') && e.classList.contains('tall'); })) && await page.locator('#sheet-suppick').count() === 0);
T('ساختار: sheet-suppick از DOM حذف شده (فاز ۵۴)', await page.locator('#sheet-suppick').count() === 0);
for (const s of ALIVE) T('صفحهٔ ' + s + ' موجود', await page.locator('#scr-' + s).count() === 1);

/* ═══ فرم ۱۲ ═══ */
T('۱۲: ۵ تأمین‌کننده رندر شده', await page.locator('#iq-recips .checkrow').count() === 5);
T('۱۲: اولی بج فروشندهٔ ویژه', (await page.locator('#iq-recips .checkrow').first().textContent()).includes('فروشندهٔ ویژه'));
T('۱۲: ۳ تیک پیش‌فرض', await page.locator('#iq-recips .checkbox.on').count() === 3);
T('۱۲: دکمهٔ ارسال = ۳', (await page.locator('#rfq-send').textContent()).includes('۳'));
T('۱۲: مهلت پیش‌فرض ۳ روز (فاز ۵۷)', (await page.locator('#iq-deadline .pill.active').textContent()).includes('۳ روز') && await page.locator('#iq-dlbox.open').count() === 0);
T('۱۲: دکمهٔ تأمین‌کنندگان بیشتر هست', await page.locator('#iq-more').count() === 1);
T('۱۲: ۱ قلم پیش‌فرض (برنج هاشمی)', (await page.locator('#iq-count').textContent()).includes('۱'));

/* ═══ «تأمین‌کنندگان بیشتر» — فاز ۵۴: درجا باز می‌شود (مودال حذف شد)؛ حالت تک‌قلمی (تیک آزاد) ═══ */
await page.click('#iq-more'); await sleep(350);
T('۱۲: «بیشتر» درجا +۵ شد = ۱۰ ردیف (فاز ۵۷)', await page.locator('#iq-recips .checkrow').count() === 10);
T('۱۲: دکتهٔ «تأمین‌کنندگان بیشتر» هنوز هست', !(await page.locator('#iq-more').evaluate(b => b.hidden)));
T('۱۲: هشتمی فروشندهٔ ویژه (غلات زرین دشت)', (await page.locator('#iq-recips .checkrow').nth(7).textContent()).includes('فروشندهٔ ویژه'));
await page.click('#iq-recips .checkrow:nth-child(6)'); await sleep(200);
T('۱۲: تیک زدن شمارندهٔ ارسال را بالا برد', (await page.locator('#rfq-send').textContent()).includes('۴'));
await shot('02-more-inline');
await page.click('#iq-more'); await sleep(300);
T('۱۲: لمس دوم +۵ → همهٔ ۱۲ ردیف', await page.locator('#iq-recips .checkrow').count() === 12);
T('۱۲: آخر لیست = دکتهٔ بیشتر مخفی شد', await page.locator('#iq-more').evaluate(b => b.hidden));

/* ═══ مودال افزودن کالا ═══ */
await page.click('#iq-add'); await sleep(350);
T('مودال کالا باز شد', await page.locator('#sheet-iqpick.show').count() === 1);
T('مودال: بخش «در لیست خرید من»', (await page.locator('#iqp-res').textContent()).includes('در لیست خرید من'));
T('مودال: ۸ ردیف (۴ لیست + ۴ پرتکرار)', await page.locator('#iqp-res [data-iqpick]').count() === 8);
T('مودال: بج «+ به لیست خرید» برای پرتکرارها', (await page.locator('#iqp-res').textContent()).includes('+ به لیست خرید'));
T('مودال: قلم در استعلام نشان‌دار', (await page.locator('#iqp-res [data-iqpick].picked').count()) === 1);
await shot('01-iqpick');
/* افزودن پفک مینو r4 (پرتکرار، نه در لیست) */
await page.click('[data-iqid="r4"]'); await sleep(200);
T('مودال: پس از افزودن، ۲ قلم', (await page.locator('#iqp-count').textContent()).includes('۲'));
T('مودال: بج + به لیست خرید فقط برای ۳ قلم دیگر ماند', await page.locator('#iqp-res .iqp-add').count() === 3);
/* جستجو */
await page.fill('#iqp-q', 'طارم'); await sleep(250);
T('مودال: جستجو کار می‌کند', (await page.locator('#iqp-res').textContent()).includes('برنج طارم'));
await page.fill('#iqp-q', ''); await sleep(250);
/* بستن با تأیید */
await page.click('#sheet-iqpick .iqp-bar .btn'); await sleep(300);
T('۱۲: بعد از تأیید مودال، ۲ قلم در فرم', (await page.locator('#iq-count').textContent()).includes('۲'));
T('۱۲: چندقلمی → همه تیک + بج پوشش', (await page.locator('#iq-recips .checkbox.on').count()) === 12 && (await page.locator('#iq-recips .iq-cov:not([hidden])').count()) >= 1);

/* ═══ چندقلمی در فرم — اجماع فاز ۴۷ (فاز ۵۴: درجا + data-lock) ═══ */
T('۱۲: چندقلمی → متن اجماع دیده می‌شود', (await page.locator('#iq-recips').textContent()).includes('استعلام چندقلمی به همهٔ کسانی'));
T('۱۲: چندقلمی → ردیف‌ها قفل‌اند (data-lock)', await page.locator('#iq-recips [data-lock]').count() === 12);
await page.click('#iq-recips .checkrow:nth-child(2)'); await sleep(200);
T('۱۲: چندقلمی → تیک قفل (کلیک خاموشش نمی‌کند)', await page.locator('#iq-recips .checkbox.on').count() === 12);

/* ═══ مهلت + ارسال ═══ */
await page.click('#iq-deadline .pill:nth-child(2)'); await sleep(150);
T('۱۲: مهلت ۲ روز انتخاب شد', (await page.locator('#iq-deadline .pill.active').textContent()).includes('۲ روز'));
T('۱۲: با ۲ روز ورودی «بیشتر» جمع شد (فاز ۵۱)', await page.locator('#iq-dlbox.open').count() === 0);
await page.click('#iq-dlmore'); await sleep(150);
T('۱۲: «بیشتر» دوباره ورودی را باز کرد', await page.locator('#iq-dlbox.open').count() === 1);
await page.fill('#iq-dlnum', '۱۲'); await sleep(200);
T('۱۲: ورودی دلخواه ۱۲ روز (فاز ۵۱)', (await page.locator('#iq-dlnum').inputValue()) === '۱۲');
await page.fill('#iq-dlnum', '۱۲۰'); await sleep(200);
T('۱۲: بیش از ۲ رقم کلمپ (فاز ۵۱)', ((await page.locator('#iq-dlnum').inputValue()).length) <= 2);
await page.fill('#iq-dlnum', '۲'); await sleep(150);
T('۱۲: برگشت به ۲ روز', (await page.locator('#iq-dlnum').inputValue()) === '۲');
await page.click('#rfq-send'); await sleep(400);
T('۱۲: بازخورد ارسال', (await page.locator('#rfq-send').textContent()).includes('ارسال شد'));
await shot('03-sent');
await sleep(700);
T('ناوبری به ۴۵', await page.locator('#scr-45:not([hidden])').count() === 1);
T('۴۵: کارت استعلام تازه نشسته', await page.locator('#scr-45 [data-inq="new1"]').count() === 1);
T('۴۵: بج ۲ روز مهلت', (await page.locator('#scr-45 [data-inq="new1"] .badge').textContent()).includes('۲ روز'));
T('۴۵: شمار جاری ۴ شد', (await page.locator('#scr-45 .sec-title .cnt').first().textContent()).includes('۴'));
await shot('04-inq45');

/* ═══ ۴۸ — empty-state ═══ */
await page.click('#scr-45 [data-inq="new1"]'); await sleep(350);
T('۴۸ باز شد', await page.locator('#scr-48:not([hidden])').count() === 1);
T('۴۸: empty-state هنوز پیشنهادی نرسیده', (await page.locator('#of48-list').textContent()).includes('هنوز پیشنهادی نرسیده'));
await shot('05-of48-empty');

/* ═══ سمت فروشنده: ۰۵ ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(300);
T('۰۵: ۳ کارت درخواست', await page.locator('#scr-05 .req-card').count() === 3);
T('۰۵: «تقاضای منطبق با تو» حذف شد', !(await page.locator('#scr-05').textContent()).includes('تقاضای منطبق'));
T('۰۵: «۲ از ۳ قلم نزد شما» ماند', (await page.locator('#scr-05').textContent()).includes('۲ از ۳ قلم'));
await shot('06-sell05');

/* ═══ مودال درخواست + پیشنهاد (rq2 — چندقلمی) ═══ */
await page.click('#scr-05 [data-req="rq2"]'); await sleep(400);
T('مودال درخواست باز شد', await page.locator('#sheet-reqview.show').count() === 1);
const rqTxt = await page.locator('#sheet-reqview').textContent();
T('مودال: توضیح خریدار دیده می‌شود', rqTxt.includes('توضیح خریدار') && rqTxt.includes('لادن'));
T('مودال: ۲ قلم قابل قیمت', await page.locator('#sheet-reqview .reqv-price').count() === 2);
T('مودال: قلم غایب اعلام شد', rqTxt.includes('در کاتالوگ شما نیست'));
T('مودال: مهلت + دوره + محل تحویل', rqTxt.includes('امروز آخرین روز') && rqTxt.includes('ماهانه') && rqTxt.includes('قزوین'));
await shot('07-reqview');
await page.fill('#sheet-reqview .reqv-price >> nth=0', '2520000'); await sleep(150);
await page.fill('#sheet-reqview .reqv-price >> nth=1', '1105000'); await sleep(250);
T('مودال: مجموع زنده = ۱۶۷٬۱۰۰٬۰۰۰', (await page.locator('#reqv-sum').textContent()).includes('۱۶۷٬۱۰۰٬۰۰۰'));
await shot('08-reqview-filled');
await page.click('#reqv-send'); await sleep(400);
T('مودال: بازخورد ارسال پیشنهاد', (await page.locator('#reqv-send').textContent()).includes('ارسال شد'));
await sleep(700);
T('مودال بسته شد', await page.locator('#sheet-reqview.show').count() === 0);
T('۰۵: کارت rq2 همان لحظه «پاسخ داده‌شده» شد', (await page.locator('#scr-05 [data-req="rq2"] .req-top .badge').textContent()).includes('پاسخ داده‌شده'));
await shot('09-rq2-answered');

/* ═══ rq3 — پیشنهاد ارسال‌شده: ویرایش ═══ */
await page.click('#scr-05 [data-req="rq3"]'); await sleep(400);
T('rq3: قیمت پیش‌فرض پر شده', await page.locator('#sheet-reqview .reqv-price').count() === 1 && !!(await page.locator('#sheet-reqview .reqv-price').first().getAttribute('value')));
T('rq3: دکمهٔ «به‌روزرسانی پیشنهاد»', (await page.locator('#reqv-send').textContent()).includes('به‌روزرسانی'));
await shot('10-rq3-edit');
await page.click('#sheet-reqview .mg'); await sleep(250);

/* ═══ استعلام جدید از ۴۵ → مودال کالا مستقیم باز می‌شود ═══ */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('#inq-new'); await sleep(400);
T('۴۵: استعلام جدید → ۱۲ + مودال کالا مستقیم باز', await page.locator('#scr-12:not([hidden])').count() === 1 && await page.locator('#sheet-iqpick.show').count() === 1);
T('۱۲ تازه: فرم خالی (۰ قلم)', (await page.locator('#iq-count').textContent()).includes('۰'));
await page.click('#sheet-iqpick .mg'); await sleep(250);

/* ═══ e2e — همهٔ ۲۵ صفحه بدون خطا ═══ */
for (const s of ALIVE) {
  await page.goto(FILE + '#' + s); await page.reload(); await sleep(120);
}
T('e2e: صفر خطای کنسول در همهٔ صفحه‌ها', errors.length === 0);
if (errors.length) console.log('  errors:', errors.slice(0, 8));

console.log('\n════ فاز ۴۹: ' + ok + ' PASS / ' + bad + ' FAIL ════');
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
