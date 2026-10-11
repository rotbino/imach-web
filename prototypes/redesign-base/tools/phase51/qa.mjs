// فاز ۵۱ — QA قطعی: ساده‌سازی شرایط پیشنهاد (سوییچر چک + تحویل در محل) · کارت فشردهٔ ۴۸ +
// شیت جزئیات پیشنهاد · مهلت ۱-۴ + سایر (۹۹) · اعتبار قیمتهای کاتالوگ · تازگی در تابلوی ۰۹ ·
// حلقهٔ بستهٔ فروشنده→خریدار · سازگاری شمار ۴۵ · e2e هر ۲۵ صفحه صفر خطا
import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = 'file://' + process.cwd() + '/index.html';
const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const has = (p) => existsSync(resolve(RB, p));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const shot = async (n) => { await page.screenshot({ path: '/home/z/my-project/shots-p51/' + n + '.png', clip: { x: 34, y: 0, width: 402, height: 874 } }); };

let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

/* ═══ ۰. گاردهای ساختاری ═══ */
const ALIVE = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','27','29','30','34','42','44','45','46','48'];
await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
await page.goto(FILE + '#48'); await page.reload(); await sleep(300);
T('ساختار: ۲۵ صفحه داخل گوشی', await page.evaluate(() => document.querySelectorAll('#phone > section.scr').length === 25));
T('ساختار: ۳۷ شیت (۳۶ + ofview)', await page.evaluate(() => document.querySelectorAll('.sheet').length === 37));
T('ساختار: sheet-ofview موجود', await page.evaluate(() => !!document.getElementById('sheet-ofview')));
T('ساختار: ارتفاع سند ≤ ۱۰۰۰', await page.evaluate(() => document.documentElement.scrollHeight <= 1000));
T('reqview: پیل‌های پرداخت/حمل حذف شدند', await page.locator('#reqv-pay, #reqv-ship').count() === 0);
T('reqview: دو ردیف سوییچر (چک/تحویل)', await page.locator('#sheet-reqview .sw-row').count() === 2);
T('reqview: جعبهٔ چک (درصد نقدی/چک + مدت + خلاصه)', await page.locator('#reqv-cash').count() === 1 && await page.locator('#reqv-chq').count() === 1 && await page.locator('#reqv-chqdays').count() === 1 && await page.locator('#reqv-paysum').count() === 1);

/* ═══ ۱. ۴۸ — کارت خلاصهٔ استعلام + کارت‌های فشرده ═══ */
T('۴۸: هدر کوچک = «۳ پیشنهاد»', (await page.locator('#of48-s').textContent()).includes('۳ پیشنهاد'));
const metaTxt = await page.locator('#of48-meta').textContent();
T('۴۸: عنوان استعلام درشت در کارت خلاصه', metaTxt.includes('برنج هاشمی · ۲۰ کیسهٔ ۵۰ کیلویی') && metaTxt.includes('۳ روز مانده') && metaTxt.includes('ارسال به ۳ تأمین‌کننده'));
T('۴۸: بندانگشتی در کارت خلاصه', await page.locator('#of48-meta .thumb img').count() === 1);
T('۴۸: سه کارت فشرده با data-ofv', await page.locator('#of48-list .oc-row[data-ofv]').count() === 3);
T('۴۸: اکشن‌ها از کارت‌ها رفتند (به شیت)', await page.locator('#of48-list .oc-acts').count() === 0);
T('۴۸: راهنمای «جزئیات و تماس» روی کارت', (await page.locator('#of48-list .oc-row').first().textContent()).includes('جزئیات و تماس'));
T('۴۸: بج «کمترین مجموع» فقط روی یک کارت', await page.locator('#of48-list .oc-row:has-text("کمترین مجموع")').count() === 1);
T('۴۸: بج روی کیان غلات (ارزان‌ترین ۵۵٫۸م)', (await page.locator('#of48-list .oc-row:has-text("کمترین مجموع")').textContent()).includes('کیان غلات'));
const firstCard = await page.locator('#of48-list .oc-row').first().textContent();
T('۴۸: چیپ پرداخت ساخت‌یافته (پخش: ۳۰٪ نقدی · بقیه چک ۳۰ روزه)', firstCard.includes('۳۰٪ نقدی · بقیه چک ۳۰ روزه'));
T('۴۸: چیپ «تحویل در محل» روی پخش', (await page.locator('#of48-list .oc-row').first().innerHTML()).includes('cond loc'));
T('۴۸: چیپ نقدی خالص برای کیان', (await page.locator('#of48-list .oc-row').nth(2).textContent()).includes('نقدی'));
T('۴۸: حداقل سفارش در ردیف مجموع', firstCard.includes('حداقل ۵ کیسه'));
await shot('00-48-compact');

/* ═══ ۲. ۴۸ — شیت جزئیات پیشنهاد ═══ */
await page.click('#of48-list .oc-row[data-ofv="0"]'); await sleep(350);
T('شیت جزئیات باز شد', await page.locator('#sheet-ofview.show').count() === 1);
const ofvTxt = await page.locator('#sheet-ofview').textContent();
T('شیت: نام فروشنده + شهر', ofvTxt.includes('پخش برنج پارس') && ofvTxt.includes('رشت'));
T('شیت: قیمت واحد درشت', (await page.locator('#sheet-ofview .ofv-price .p').textContent()).includes('۲٬۸۴۰٬۰۰۰'));
T('شیت: شرایط پرداخت', ofvTxt.includes('پرداخت') && ofvTxt.includes('۳۰٪ نقدی · بقیه چک ۳۰ روزه'));
T('شیت: تحویل در محل شما', ofvTxt.includes('در محل شما'));
T('شیت: حداقل سفارش ۵ کیسه', ofvTxt.includes('حداقل سفارش') && ofvTxt.includes('۵ کیسه'));
T('شیت: توضیح فروشنده', ofvTxt.includes('توضیح فروشنده') && ofvTxt.includes('برنج امسال'));
T('شیت: سه دکمهٔ تماس/گفتگو/کاتالوگ', await page.locator('#sheet-ofview .ofv-acts .btn').count() === 3 && ofvTxt.includes('تماس') && ofvTxt.includes('گفتگو') && ofvTxt.includes('کاتالوگ'));
await shot('01-ofview');

/* چندقلمی: پوشش + بدون بج (فقط یک پوشش کامل) */
await page.click('#sheet-ofview [data-close]'); await sleep(250);
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('#scr-45 [data-inq="inq2"]'); await sleep(400);
T('۴۸ چندقلمی: ۴ کارت فشرده', await page.locator('#of48-list .oc-row').count() === 4);
T('۴۸ چندقلمی: بدون بج کمترین مجموع (تنها یک پوشش کامل)', await page.locator('#of48-list .oc-row:has-text("کمترین مجموع")').count() === 0);
const inq2Card1 = await page.locator('#of48-list .oc-row').first().textContent();
T('۴۸ چندقلمی: بج «همهٔ ۳ قلم» روی تجارت گیل‌رنج', inq2Card1.includes('همهٔ ۳ قلم') && inq2Card1.includes('تجارت گیل'));
T('۴۸ چندقلمی: ردیف قیمت هر قلم + «ندارد»', inq2Card1.includes('قند یکتا') && (await page.locator('#of48-list .oc-row').nth(1).textContent()).includes('ندارد'));
T('۴۸ چندقلمی: پرداخت ۴۰٪ نقدی چک ۶۰ روزه (آریو، ردیف دوم)', (await page.locator('#of48-list .oc-row').nth(1).textContent()).includes('۴۰٪ نقدی · بقیه چک ۶۰ روزه'));
await page.click('#of48-list .oc-row[data-ofv="0"]'); await sleep(350);
const ofv2 = await page.locator('#sheet-ofview').textContent();
T('شیت چندقلمی: قیمت هر قلم + مجموع', ofv2.includes('قیمت هر قلم') && ofv2.includes('مجموع ۳ قلم') && ofv2.includes('۱۷۸٬۶۰۰٬۰۰۰'));
await page.click('#sheet-ofview [data-close]'); await sleep(250);

/* سورت ارزان‌ترین (روی inq1): کیان اول */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('#scr-45 [data-inq="inq1"]'); await sleep(400);
await page.click('[data-ofsort="cheap"]'); await sleep(250);
T('۴۸: سورت ارزان‌ترین → کیان اول', (await page.locator('#of48-list .oc-row').first().textContent()).includes('کیان غلات'));
await page.click('[data-ofsort="imch"]'); await sleep(200);

/* ═══ ۳. ۴۵ — شمار درست پیشنهادها ═══ */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
T('۴۵: کارت inq1 = «۳ پیشنهاد» (نه ۵)', (await page.locator('#scr-45 [data-inq="inq1"]').textContent()).includes('۳ پیشنهاد') && !(await page.locator('#scr-45 [data-inq="inq1"]').textContent()).includes('۵ پیشنهاد'));

/* ═══ ۴. ۱۲ — مهلت ۱-۴ + سایر ═══ */
await page.goto(FILE + '#12'); await page.reload(); await sleep(400);
T('۱۲: ۵ پیل (۱-۴ + سایر)', await page.locator('#iq-deadline .pill').count() === 5);
T('۱۲: پیش‌فرض ۴ روز فعال', (await page.locator('#iq-deadline .pill.active').textContent()).includes('۴ روز'));
T('۱۲: ورودی «سایر» در ابتدا مخفی', await page.locator('#iq-dl-custom').isHidden());
await page.click('#iq-dl-more'); await sleep(250);
T('۱۲: «سایر» → ورودی نمایان و از ۴ شروع', await page.locator('#iq-dl-custom').isVisible() && (await page.locator('#iq-dl-custom').inputValue()) === '۴');
await page.fill('#iq-dl-custom', '7'); await sleep(200);
T('۱۲: ورود ۷ در ورودی', (await page.locator('#iq-dl-custom').inputValue()) === '7');
await page.fill('#iq-dl-custom', '999'); await sleep(200);
T('۱۲: سه رقم بریده می‌شود (سقف ۹۹)', (await page.locator('#iq-dl-custom').inputValue()).length === 2);
await page.click('#iq-deadline .pill:nth-child(2)'); await sleep(200);
T('۱۲: پیل ۲ روز → ورودی مخفی', await page.locator('#iq-dl-custom').isHidden());

/* رفتار واقعی مهلت دلخواه: قلم پیش‌فرض هست؛ استعلام ۷ روزه → بج کارت ۴۵ */
await page.click('#iq-dl-more'); await sleep(200);
await page.fill('#iq-dl-custom', '7'); await sleep(150);
await page.click('#rfq-send'); await sleep(1300);
T('۱۲→۴۵: بج «۷ روز مهلت» روی کارت تازه (رفتار سایر)', (await page.locator('#scr-45 [data-inq="new1"] .badge').first().textContent()).includes('۷ روز مهلت'));

/* ═══ ۵. فرم پیشنهاد — سوییچر چک (rq1 تازه) ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(300);
await page.click('#scr-05 .req-card[data-req="rq1"]'); await sleep(400);
T('reqview (rq1): چک خاموش + جعبهٔ مخفی', !(await page.locator('#reqv-cheque').getAttribute('class') || '').includes('on') && await page.locator('#reqv-cheq-box').isHidden());
T('reqview (rq1): تحویل در محل خاموش', !(await page.locator('#reqv-local').getAttribute('class') || '').includes('on'));
await page.click('#sheet-reqview .sw-row >> nth=0'); await sleep(250);
T('لمس ردیف = روشن‌شدن چک + بازشدن جعبه', (await page.locator('#reqv-cheque').getAttribute('class')).includes('on') && await page.locator('#reqv-cheq-box').isVisible());
T('پیش‌فرض منطقی ۲۰/۸۰/۳۰', (await page.locator('#reqv-cash').inputValue()) === '۲۰' && (await page.locator('#reqv-chq').inputValue()) === '۸۰' && (await page.locator('#reqv-chqdays').inputValue()) === '۳۰');
T('خلاصهٔ زنده: «۲۰٪ نقدی و بقیه چک · حداکثر ۳۰ روزه»', (await page.locator('#reqv-paysum').textContent()).includes('۲۰٪ نقدی و بقیه چک') && (await page.locator('#reqv-paysum').textContent()).includes('۳۰ روزه'));
await page.fill('#reqv-cash', '50'); await sleep(200);
T('درصد مکمل: نقدی ۵۰ → چک ۵۰', (await page.locator('#reqv-chq').inputValue()) === '۵۰' && (await page.locator('#reqv-paysum').textContent()).includes('۵۰٪ نقدی'));
await page.fill('#reqv-cash', '150'); await sleep(200);
T('سقف ۱۰۰: تایپ ۱۵۰ → ۱۰۰/۰ + «همه نقدی»', (await page.locator('#reqv-cash').inputValue()) === '۱۰۰' && (await page.locator('#reqv-chq').inputValue()) === '۰' && (await page.locator('#reqv-paysum').textContent()).includes('همه نقدی'));
await page.fill('#reqv-cash', '20'); await sleep(150);
await page.click('#sheet-reqview .sw-row >> nth=0'); await sleep(200); /* خاموش */
T('خاموش‌کردن چک → جعبه جمع + خلاصه پاک', await page.locator('#reqv-cheq-box').isHidden() && await page.locator('#reqv-paysum').isHidden());
await shot('02-reqview-off');

/* rq3 (پاسخ داده‌شده): شرایط قبلی برگشته */
await page.click('#sheet-reqview [data-close]'); await sleep(250);
await page.click('#scr-05 .req-card[data-req="rq3"]'); await sleep(400);
T('reqview (rq3): چک روشن با ۲۰٪ نقدی ۳۰ روزه', (await page.locator('#reqv-cheque').getAttribute('class') || '').includes('on') && (await page.locator('#reqv-cash').inputValue()) === '۲۰' && (await page.locator('#reqv-chqdays').inputValue()) === '۳۰');
T('reqview (rq3): تحویل در محل روشن', (await page.locator('#reqv-local').getAttribute('class') || '').includes('on'));
await page.click('#sheet-reqview [data-close]'); await sleep(250);

/* ═══ ۶. حلقهٔ بسته: فروشنده پیشنهاد می‌دهد → سمت خریدار به‌روز ═══ */
await page.click('#scr-05 .req-card[data-req="rq1"]'); await sleep(400);
await page.click('#sheet-reqview .sw-row >> nth=0'); await sleep(250); /* چک روشن */
await page.fill('#reqv-cash', '25'); await sleep(150);
await page.fill('#sheet-reqview .reqv-price', '2900000'); await sleep(250);
T('مجموع زندهٔ جدید = ۵۸٬۰۰۰٬۰۰۰', (await page.locator('#reqv-sum').textContent()).includes('۵۸٬۰۰۰٬۰۰۰'));
await page.click('#sheet-reqview .sw-row >> nth=1'); await sleep(150); /* تحویل در محل روشن */
await page.fill('#reqv-note2', 'برنج امسال — ارسال با ما'); await sleep(150);
await page.click('#reqv-send'); await sleep(1100);
T('پس از ارسال: کارت ۰۵ «پاسخ داده‌شده»', (await page.locator('#scr-05 .req-card[data-req="rq1"] .req-top .badge').textContent()).includes('پاسخ داده‌شده'));
/* بدون reload — دادهٔ زندهٔ حافظه باید منتقل شود (رفتار واقعی اپ) */
await page.evaluate(() => { location.hash = '#45'; }); await sleep(400);
await page.click('#scr-45 [data-inq="inq1"]'); await sleep(400);
const parsCard = await page.locator('#of48-list .oc-row:has-text("پخش برنج پارس")').textContent();
T('حلقهٔ بسته: قیمت ۲٬۹۰۰٬۰۰۰ همین حالا در ۴۸', parsCard.includes('۲٬۹۰۰٬۰۰۰'));
T('حلقهٔ بسته: پرداخت ۲۵٪ نقدی · بقیه چک ۳۰ روزه', parsCard.includes('۲۵٪ نقدی · بقیه چک ۳۰ روزه'));
T('حلقهٔ بسته: مجموع ۵۸٬۰۰۰٬۰۰۰', parsCard.includes('۵۸٬۰۰۰٬۰۰۰'));
T('حلقهٔ بسته: بج کمترین مجموع ماند روی کیان (۵۵٫۸م)', (await page.locator('#of48-list .oc-row:has-text("کمترین مجموع")').textContent()).includes('کیان غلات'));
await page.click('#of48-list .oc-row:has-text("پخش برنج پارس")'); await sleep(350);
const ofv3 = await page.locator('#sheet-ofview').textContent();
T('حلقهٔ بسته: شیت جزئیات هم شرایط تازه را نشان می‌دهد', ofv3.includes('۲۵٪ نقدی · بقیه چک ۳۰ روزه') && ofv3.includes('در محل شما') && ofv3.includes('برنج امسال — ارسال با ما'));
await shot('03-closed-loop');
await page.click('#sheet-ofview [data-close]'); await sleep(250);

/* ═══ ۷. تنظیمات کاتالوگ — اعتبار قیمتهای کاتالوگ ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(400);
await page.click('[aria-label="تنظیمات کاتالوگ"]'); await sleep(350);
T('cset: «اعتبار قیمتهای کاتالوگ» موجود', (await page.locator('#sheet-cset').textContent()).includes('اعتبار قیمتهای کاتالوگ'));
T('cset: ۵ پیل روز (۱-۵)', await page.locator('#cset-fresh .pill').count() === 5);
T('cset: پیش‌فرض ۵ روز فعال', (await page.locator('#cset-fresh .pill.active').textContent()).includes('۵ روز'));
const hintTxt = await page.locator('#sheet-cset .hint').textContent();
T('cset: توضیح مالک (نمایش داده نمی\u200cشه + بالاتر قرار می\u200cگیرند)', hintTxt.includes('نمایش داده نمی\u200cشه') && hintTxt.includes('بالاتر قرار می\u200cگیرند'));
await page.click('#cset-fresh .pill:nth-child(3)'); await sleep(200);
T('cset: تعویض به ۳ روز فعال', (await page.locator('#cset-fresh .pill.active').textContent()).includes('۳ روز'));
await shot('04-cset-fresh');
await page.click('#sheet-cset [data-close]'); await sleep(250);

/* ═══ ۸. تابلوی تأمین (۰۹) — قیمت ناتازه خط‌خورده ═══ */
await page.goto(FILE + '#09'); await page.reload(); await sleep(300);
T('۰۹: کارت شبح stale موجود', await page.locator('#scr-09 .supplier-card.stale').count() === 1);
const staleTxt = await page.locator('#scr-09 .supplier-card.stale').textContent();
T('۰۹: قیمت خط‌خورده + «در مقایسه نیست»', await page.locator('#scr-09 .price.old').count() === 1 && staleTxt.includes('در مقایسه نیست'));
T('۰۹: هشدار «۱۱ روز است قیمتش تازه نشده»', staleTxt.includes('۱۱ روز است قیمتش تازه نشده'));
T('۰۹: کارت شبح بدون چیپ شرایط/ذخیره', await page.locator('#scr-09 .supplier-card.stale .cond').count() === 0 && !staleTxt.includes('ذخیره'));
T('۰۹: تماس/کاتالوگ مانده‌اند', staleTxt.includes('تماس') && staleTxt.includes('کاتالوگ'));
T('۰۹: قانون تازگی در legend', (await page.locator('#scr-09').textContent()).includes('اعتبارش گذشته'));
const order = await page.locator('#scr-09 .supplier-card .n').allTextContents();
T('۰۹: ترتیب تازه‌ها بالاتر (پخش/آریو اول، شبح آخر)', order[0].includes('پخش برنج پارس') && order[1].includes('آریو') && order[2].includes('کیان'));
await shot('05-09-stale');

/* ═══ ۹. e2e — هر ۲۵ صفحه بدون خطا ═══ */
for (const id of ALIVE) {
  await page.goto(FILE + '#' + id); await page.reload(); await sleep(160);
}
T('e2e: هر ۲۵ صفحه صفر خطای JS', errors.length === 0);
if (errors.length) console.log('  errors:', errors.slice(0, 5).join(' | '));

await browser.close();
console.log('\n════ فاز ۵۱ QA: ' + ok + ' PASS / ' + bad + ' FAIL ════');
process.exit(bad ? 1 : 0);
