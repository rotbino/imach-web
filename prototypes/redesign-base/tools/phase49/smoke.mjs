// فاز ۴۹ — اسموک‌تست رفتاری: استعلام → مودال کالا → تأمین‌کننده → ارسال → ۴۵/۴۸ · ۰۵ → مودال پیشنهاد
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

/* ═══ فرم ۱۲ ═══ */
T('۱۲: ۵ تأمین‌کننده رندر شده', await page.locator('#iq-recips .checkrow').count() === 5);
T('۱۲: اولی بج فروشندهٔ ویژه', (await page.locator('#iq-recips .checkrow').first().textContent()).includes('فروشندهٔ ویژه'));
T('۱۲: ۳ تیک پیش‌فرض', await page.locator('#iq-recips .checkbox.on').count() === 3);
T('۱۲: دکمهٔ ارسال = ۳', (await page.locator('#rfq-send').textContent()).includes('۳'));
T('۱۲: مهلت پیش‌فرض ۳ روز (فاز ۵۷)', (await page.locator('#iq-deadline .pill.active').textContent()).includes('۳ روز') && await page.locator('#iq-dlbox.open').count() === 0);
T('۱۲: دکمهٔ تأمین‌کنندگان بیشتر هست', await page.locator('#iq-more').count() === 1);
T('۱۲: ۱ قلم پیش‌فرض (برنج هاشمی)', (await page.locator('#iq-count').textContent()).includes('۱'));

await page.click('#iq-more'); await sleep(350);
T('۱۲: «بیشتر» +۵ → ۱۰ ردیف (فاز ۵۷)', await page.locator('#iq-recips .checkrow').count() === 10);
await page.click('#iq-recips .checkrow:nth-child(6)'); await sleep(200);
T('۱۲: تیک زدن شمارندهٔ ارسال را بالا برد', (await page.locator('#rfq-send').textContent()).includes('۴'));
await page.click('#iq-more'); await sleep(300);
T('۱۲: لمس دوم +۵ → همهٔ ۱۲ ردیف (فاز ۵۷ — جمع‌کردن حذف شد)', await page.locator('#iq-recips .checkrow').count() === 12);

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
T('۱۲: چندقلمی → متن اجماع + ردیف‌های قفل', (await page.locator('#iq-recips').textContent()).includes('استعلام چندقلمی به همهٔ کسانی') && await page.locator('#iq-recips [data-lock]').count() === 12);
await page.click('#iq-recips .checkrow:nth-child(2)'); await sleep(200);
T('۱۲: چندقلمی → تیک قفل (کلیک خاموشش نمی‌کند)', await page.locator('#iq-recips .checkbox.on').count() === 12);

/* ═══ مهلت + ارسال ═══ */
await page.click('#iq-deadline .pill:nth-child(2)'); await sleep(150);
T('۱۲: مهلت ۲ روز انتخاب شد', (await page.locator('#iq-deadline .pill.active').textContent()).includes('۲ روز'));
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

/* ═══ e2e صفر خطا ═══ */
console.log('\n----');
console.log('PASS: ' + ok + ' · FAIL: ' + bad);
console.log('JS errors: ' + (errors.length ? errors.join(' | ') : 'none'));
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
