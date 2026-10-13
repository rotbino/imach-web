// فاز ۵۷ — QA قطعی، دوازده حکم مالک:
//  ۱) کادر راهنمای پایین ۰۵ (فروشنده — فاز ۶۲: پیام منفعت‌محور) ۲) کادر راهنمای پایین ۴۵ (خریدار)
//  ۳) استعلام تک‌کالایی: دکتهٔ ردیف لیست خرید (۰۸) + اکشن‌بار ۰۹ → کالا پیش‌فرض در ۱۲
//  ۴) توضیح برای فروشنده دو برابر (۶ سطر، بدون اسکرول پیش‌فرض) ۵) مهلت پاسخ پیش‌فرض ۳
//  ۶) «ارسال به چه کسانی؟» ۵تای اول + دکتهٔ «تأمین‌کنندگان بیشتر» (+۵ هر لمس، بدون «مشاهدهٔ»)
//  ۷) نوار فیلتر ظریف: منطبق‌ترین/ذخیره‌شده‌ها/نزدیک‌ترین/ارزان‌ترین
//  ۸) آیکون اینفوی ۱۶: بزرگ‌تر، نارنجی، بدون دایره
//  ۹) مودال پیشنهاد: دکتهٔ اصلی + دو کوچک آرشیو/حذف؛ آرشیو پایین ۰۵
// ۱۰) بنر کاتالوگ: چیپ شهر → مودال لوکیشن + سوییچر نمایش (پیش‌فرض روشن)
// ۱۱) منوی اشتراک: «ارسال در پیام‌های ای‌مچ» → کارت ویزیت با QR + ارسال کارت
// ۱۲) تنظیمات: گروه‌های کالا مستقیم + کلمهٔ «تنظیمات» کنار آیکون + فونت ریزتر سه دکته
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const shot = async (n) => { await page.screenshot({ path: '/home/z/my-project/shots-p57/' + n + '.png', clip: { x: 34, y: 0, width: 402, height: 874 } }); };

let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

await page.goto(FILE + '#01'); await sleep(300);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });

/* ═══ ۱. ۰۵ — کادر راهنما + بخش آرشیو + دکته‌های مودال ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(400);
T('۵: عنوان «درخواست‌های خرید جاری»', (await page.locator('#scr-05 .sec-title h2').first().textContent()).includes('جاری'));
T('۵: بخش «درخواست‌های آرشیو» زیر جاری‌ها', await page.locator('#scr-05 #rq-arch').count() === 1);
T('۵: آرشیو بعد از جاری در DOM است', await page.evaluate(() => {
  const cur = document.getElementById('rq-cur'), arch = document.getElementById('rq-arch');
  return !!(cur && arch && cur.compareDocumentPosition(arch) & Node.DOCUMENT_POSITION_FOLLOWING);
}));
T('۵: یک نمونهٔ آرشیوِ از پیش موجود', (await page.locator('#rq-arch .req-done').count()) === 1);
T('۵: کادر راهنما — پیام منفعت‌محور (همگام فاز ۶۲)', await page.evaluate(() => {
  const g = document.getElementById('rq-guide');
  return !!g && g.textContent.includes('با دعوت از مشتریانت، لیست مشتریانت را بساز') && g.textContent.includes('قیمت‌های همیشه تازه');
}));
await shot('01-sell05-guide');

/* مودال پیشنهاد: دکتهٔ بزرگ ارسال + دو کوچک آرشیو/حذف */
await page.click('#scr-05 [data-req="rq1"]'); await sleep(350);
T('مودال: دکتهٔ اصلی «ارسال پیشنهاد» (btn-primary)', await page.locator('#reqv-send.btn-primary').count() === 1);
T('مودال: دکتهٔ کوچک «آرشیو درخواست»', (await page.locator('#reqv-side [data-rqarch]').count()) === 1 && (await page.locator('#reqv-side [data-rqarch]').textContent()).includes('آرشیو'));
T('مودال: دکتهٔ کوچک «حذف»', (await page.locator('#reqv-side [data-rqdel]').count()) === 1 && (await page.locator('#reqv-side [data-rqdel]').textContent()).includes('حذف'));
await shot('02-reqview-side');
/* آرشیو کردن rq1 */
await page.click('[data-rqarch]'); await sleep(450);
T('آرشیو: کارت rq1 به بخش آرشیو رفت', (await page.locator('#rq-arch [data-req="rq1"]').count()) === 1);
T('آرشیو: شمار جاری ۲ شد', (await page.locator('#rq-cur > .req-card').count()) === 2 && (await page.locator('#scr-05 .sec-title .cnt').first().textContent()).includes('۲'));
T('آرشیو: بج کارت «آرشیو»', (await page.locator('#rq-arch [data-req="rq1"] .req-top .badge').textContent()).includes('آرشیو'));
T('آرشیو: شیت بسته شد', !(await page.locator('#sheet-reqview.show').count()));
/* حذف rq2 */
await page.click('#scr-05 [data-req="rq2"]'); await sleep(350);
await page.click('[data-rqdel]'); await sleep(450);
T('حذف: کارت rq2 کلاً رفت', (await page.locator('#scr-05 [data-req="rq2"]').count()) === 0);
T('حذف: شمار جاری ۱ شد', (await page.locator('#rq-cur > .req-card').count()) === 1 && (await page.locator('#scr-05 .sec-title .cnt').first().textContent()).includes('۱'));
await page.reload(); await sleep(400); /* بازنشانی دمو برای شات */
await shot('03-sell05-after');

/* ═══ ۲. ۴۵ — پاراگراف راهنمای خریدار (فاز ۵۹: دو کادر legend+netguide یکی شد) ═══ */
await page.goto(FILE + '#45'); await page.reload(); await sleep(400);
T('۴۵: پاراگراف راهنمای خریدار هست (دو کادر قبلی حذف)', await page.locator('#inq-note').count() === 1 && await page.locator('#scr-45 .netguide, #scr-45 .legend').count() === 0);
T('۴۵: متن عین مالک (دعوت تأمین‌کنندگان + استعلام گروهی + قیمت‌های رقابتی)', await page.evaluate(() => {
  const g = document.getElementById('inq-note');
  return !!g && g.textContent.includes('با اشتراک گذاری لیست خرید خود') &&
    g.textContent.includes('استعلام قیمت گروهی بگیرید') &&
    g.textContent.includes('قیمتهای رقابتی خود را برای شما ارسال کنند');
}));
T('۴۵: پاراگراف بعد از «پایان‌یافته» در DOM است', await page.evaluate(() => {
  const done = document.querySelector('#scr-45 .inq-done'), g = document.getElementById('inq-note');
  return !!(done && g && done.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING);
}));
await shot('04-inq45-guide');

/* ═══ ۳. استعلام تک‌کالایی از لیست خرید (۰۸) و تابلوی تأمین (۰۹) ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(400);
T('۸: چهار ردیف، هرکدام دکتهٔ «استعلام قیمت»', await page.locator('#scr-08 .bl-inq').count() === 4);
T('۸: دکته‌ها به کالای درست وصل‌اند', await page.evaluate(() => {
  const ids = Array.from(document.querySelectorAll('#scr-08 .bl-inq')).map(b => b.dataset.binq).join(',');
  return ids === 'g1,r2,r6,r5';
}));
await page.click('[data-binq="r6"]'); await sleep(350);
T('۸→۱۲: صفحهٔ ۱۲ باز شد', await page.locator('#scr-12:not([hidden])').count() === 1);
T('۸→۱۲: رب چین‌چین ۸۰۰ گرمی پیش‌فرض ادد شد', (await page.locator('#iq-items .iq-item b').first().textContent()).includes('رب چین‌چین'));
T('۸→۱۲: مهلت همان پیش‌فرض ۳ روز', (await page.locator('#iq-deadline .pill.active').textContent()).includes('۳ روز'));
await shot('05-single-item-inq');
await page.goto(FILE + '#09'); await page.reload(); await sleep(400);
await page.click('.action-bar [data-iqgood]'); await sleep(350);
T('۹→۱۲: برنج هاشمی (کالای تابلوی همین صفحه) پیش‌فرض ادد شد', (await page.locator('#iq-items .iq-item b').first().textContent()).includes('برنج هاشمی'));

/* ═══ ۴-۷. فرم ۱۲ — توضیح بلندتر · مهلت ۳ · +۵ بیشتر · نوار فیلتر ═══ */
await page.goto(FILE + '#12'); await page.reload(); await sleep(400);
T('۱۲: توضیح برای فروشنده ۶ سطر (دو برابر)', (await page.locator('#iq-note').getAttribute('rows')) === '6');
T('۱۲: بدون اسکرولِ پیش‌فرض', await page.evaluate(() => {
  const t = document.getElementById('iq-note');
  return t.scrollHeight <= t.clientHeight + 2;
}));
T('۱۲: مهلت پیش‌فرض = «۳ روز» فعال', (await page.locator('#iq-deadline .pill.active').textContent()).includes('۳ روز'));
T('۱۲: ورودی «بیشتر» بسته است', await page.locator('#iq-dlbox.open').count() === 0);
T('۱۲: ۵ تأمین‌کنندهٔ اول به‌صورت پیش‌فرض', await page.locator('#iq-recips .iq-recip').count() === 5);
T('۱۲: برچسب دکته = «تأمین‌کنندگان بیشتر» (بدون «مشاهدهٔ»)', (await page.locator('#iq-more span').textContent()).trim() === 'تأمین‌کنندگان بیشتر');
await page.click('#iq-more'); await sleep(300);
T('۱۲: لمس اول +۵ → ۱۰ ردیف', await page.locator('#iq-recips .iq-recip').count() === 10);
T('۱۲: دکته بعد از +۵ هنوز هست (حکم مالک)', !(await page.locator('#iq-more').evaluate(b => b.hidden)));
await page.click('#iq-more'); await sleep(300);
T('۱۲: لمس دوم → همهٔ ۱۲ ردیف', await page.locator('#iq-recips .iq-recip').count() === 12);
T('۱۲: آخر لیست = دکته مخفی', await page.locator('#iq-more').evaluate(b => b.hidden));

/* نوار فیلتر ظریف */
T('۱۲: نوار فیلتر ۴ چیپ', await page.locator('#iq-fbar .chip').count() === 4);
T('۱۲: پیش‌فرض = منطبق‌ترین', (await page.locator('#iq-fbar .chip.active').textContent()).includes('منطبق‌ترین'));
await page.click('[data-iqf="saved"]'); await sleep(250);
T('فیلتر ذخیره‌شده‌ها: سه سaved اول', await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#iq-recips .iq-recip'));
  return rows.length >= 4 && rows.slice(0, 3).every(r => r.dataset.saved === '1') && !rows[3].dataset.saved;
}));
T('فیلتر ذخیره‌شده‌ها: بج «ذخیره‌شده» روی ردیف‌ها', (await page.locator('#iq-recips .iq-sv').count()) === 3);
await page.click('[data-iqf="near"]'); await sleep(250);
T('فیلتر نزدیک‌ترین: هم‌شهری‌ها اول', await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#iq-recips .iq-recip')).map(r => r.querySelector('.cs').textContent);
  return rows.slice(0, 3).every(t => t.includes('هم‌شهری'));
}));
await page.click('[data-iqf="cheap"]'); await sleep(250);
T('فیلتر ارزان‌ترین: s4 (۲٬۷۸۰٬۰۰۰) اول', (await page.locator('#iq-recips .iq-recip').first().getAttribute('data-sid')) === 's4');
T('فیلتر: توضیح مرتب‌سازی هم‌گام شد', (await page.locator('#iq-sorthint').textContent()).includes('آخرین قیمت'));
await page.click('[data-iqf="match"]'); await sleep(250);
T('بازگشت به منطبق‌ترین: s1 (۹۶٪) اول', (await page.locator('#iq-recips .iq-recip').first().getAttribute('data-sid')) === 's1');
await shot('06-iq12-fbar');

/* ═══ ۸. ۱۶ — آیکون اینفو: بزرگ‌تر، نارنجی، بدون دایره ═══ */
await page.goto(FILE + '#16'); await page.reload(); await sleep(400);
T('۱۶: آیکون اینفو بدون دایره (پس‌زمینهٔ شفاف)', await page.evaluate(() => {
  const cs = getComputedStyle(document.querySelector('#scr-16 .lbl-row .info-ic'));
  return cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.borderRadius === '0px';
}));
T('۱۶: نارنجی (رنگ primary-strong)', await page.evaluate(() => {
  const svg = document.querySelector('#scr-16 .lbl-row .info-ic svg');
  return getComputedStyle(svg).color === 'rgb(234, 88, 12)';
}));
T('۱۶: بزرگ‌تر شد (۱۹px، قبلاً ۱۲.۵)', await page.evaluate(() => {
  const svg = document.querySelector('#scr-16 .lbl-row .info-ic svg');
  return parseFloat(getComputedStyle(svg).width) >= 18;
}));
await page.click('#scr-16 .info-ic'); await sleep(350);
T('۱۶: مودال توضیح هنوز باز می‌شود', await page.locator('#dlg-suinfo.show').count() === 1);
await page.click('#dlg-suinfo [data-close]'); await sleep(250);
await shot('07-suinfo-icon');

/* ═══ ۱۰. بنر کاتالوگ — چیپ شهر → مودال لوکیشن + سوییچر نمایش ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(400);
T('۱: چیپ شهر دکمه شد (data-sheet=locat)', await page.locator('#cat-loc-1[data-sheet="sheet-locat"]').count() === 1);
await page.click('#cat-loc-1'); await sleep(350);
T('۱: مودال «انتخاب لوکیشن» باز شد', await page.locator('#sheet-locat.show').count() === 1);
T('۱: ردیف شهرها + جستجو', await page.locator('#sheet-locat [data-locat]').count() === 7 && await page.locator('#locat-q').count() === 1);
T('۱: ردیف رشت (شهر فعلی) تیک دارد', await page.locator('#sheet-locat .sheet-row.current[data-locat="رشت"]').count() === 1);
T('۱: سوییچر «نمایش لوکیشن» پایین مودال — روشن', await page.evaluate(() => {
  const sw = document.getElementById('locat-sw');
  return !!sw && sw.classList.contains('on') && !!(sw.closest('.sheet').compareDocumentPosition(document.querySelector('#sheet-locat .sheet-cta')) & Node.DOCUMENT_POSITION_FOLLOWING);
}));
await shot('08-locat-sheet');
await page.click('#sheet-locat [data-locat="تهران"]'); await sleep(450);
T('۱: چیپ بنر «تهران» شد', (await page.locator('#cat-loc-name').textContent()) === 'تهران');
T('۱۳: کاتالوگ عمومی هم «تهران» شد', (await page.evaluate(() => document.getElementById('cat-loc-13').textContent)) === 'تهران');
/* سوییچر: خاموش کردن نمایش */
await page.click('#cat-loc-1'); await sleep(350);
await page.click('#locat-sw'); await sleep(300);
T('سوییچر خاموش: چیپ بنر مخفی شد', await page.locator('#cat-loc-1').evaluate(e => e.hidden));
T('سوییچر خاموش: شهر ۱۳ هم مخفی شد', await page.locator('#cat-loc-13').evaluate(e => e.hidden));
await page.click('#locat-sw'); await sleep(300);
T('سوییچر روشن: چیپ برگشت (نام شهر سر جایش)', await page.evaluate(() => {
  const c = document.getElementById('cat-loc-1');
  return !c.hidden && document.getElementById('cat-loc-name').textContent === 'تهران';
}));
await page.click('#sheet-locat [data-close]'); await sleep(300);
/* حالت «انتخاب نشده» — استایل چیپ خط‌چین نارنجی (کلاس unset از catLocSync وقتی شهری نیست) */
await page.evaluate(() => {
  const c = document.getElementById('cat-loc-1');
  c.classList.add('unset');
  document.getElementById('cat-loc-name').textContent = 'لوکیشن را انتخاب کنید';
});
T('بدون شهر: چیپ نارنجی خط‌چین «لوکیشن را انتخاب کنید»', await page.evaluate(() => {
  const cs = getComputedStyle(document.getElementById('cat-loc-1'));
  return cs.borderStyle === 'dashed' && cs.color === 'rgb(234, 88, 12)';
}));
await shot('11-locat-unset');
await page.reload(); await sleep(400); /* بازنشانی دمو: رشت */

/* ═══ ۱۱. منوی اشتراک — کارت ویزیت (جای «ارسال در پیام‌های ای‌مچ») ═══ */
await page.click('#scr-01 .cat-promo [data-sheet="sheet-share"]'); await sleep(350);
const shareRows = await page.locator('#sheet-share .sheet-row b').allTextContents();
T('اشتراک: مخاطبین اول', shareRows[0] === 'اشتراک با مخاطبین');
T('اشتراک: «ارسال در پیام‌های ای‌مچ» حذف شد', !shareRows.includes('ارسال در پیام‌های ای‌مچ'));
T('اشتراک: ردیف «کارت ویزیت» آمد', shareRows.includes('کارت ویزیت'));
await page.click('#sheet-share [data-sheet="sheet-bcard"]'); await sleep(350);
T('کارت ویزیت: شیت باز شد', await page.locator('#sheet-bcard.show').count() === 1);
T('کارت ویزیت: نام و تماس فروشنده', await page.evaluate(() => {
  const tx = document.querySelector('#sheet-bcard .bcard').textContent;
  return tx.includes('پخش برنج پارس') && tx.includes('۰۹۱۲ ۳۴۵ ۶۷۸۹') && tx.includes('imach.ir/c/pars-rice');
}));
T('کارت ویزیت: QR رندر شد (بذر متفاوت از QR کاتالوگ)', await page.evaluate(() => {
  const a = document.getElementById('bqr-svg').innerHTML, b = document.getElementById('qr-svg').innerHTML;
  return a.length > 50 && a !== b;
}));
await shot('09-bcard');
await page.click('[data-bcardsend]'); await sleep(250);
T('کارت ویزیت: «ارسال کارت ویزیت» → تأیید', (await page.locator('[data-bcardsend]').textContent()).includes('کارت ویزیت ارسال شد'));
await sleep(1300);
T('کارت ویزیت: دکته برگشت', (await page.locator('[data-bcardsend]').textContent()).includes('ارسال کارت ویزیت'));
await page.click('#sheet-bcard [data-close]'); await sleep(300);

/* ═══ ۱۲. تنظیمات کاتالوگ — گروه‌های کالا + کلمهٔ «تنظیمات» + فونت ریزتر ═══ */
T('۱: کنار آیکون تنظیمات کلمهٔ «تنظیمات»', (await page.locator('.cat-addrow .cat-set .cs-lbl').textContent()) === 'تنظیمات');
T('۱: فونت سه دکته ریزتر شد (۱۱px)', await page.evaluate(() => {
  const f = getComputedStyle(document.querySelector('.cat-addrow .btn')).fontSize;
  return parseFloat(f) <= 11.5;
}));
T('۱: هر سه دکته در یک ردیف جا شدند', await page.evaluate(() => {
  const r = document.querySelector('.cat-addrow');
  return r.scrollWidth <= r.clientWidth + 1;
}));
await page.click('.cat-addrow .cat-set'); await sleep(350);
T('تنظیمات: منوی cset باز شد', await page.locator('#sheet-cset.show').count() === 1);
T('تنظیمات: ردیف مستقیم «گروه‌های کالا»', await page.locator('#sheet-cset [data-sheet="sheet-pgroups"]').count() === 1);
await shot('10-cset-groups');
await page.click('#sheet-cset [data-sheet="sheet-pgroups"]'); await sleep(350);
T('تنظیمات: گروه‌های کالا باز می‌شود', await page.locator('#sheet-pgroups.show').count() === 1);
T('تنظیمات: شیت گروه‌ها ردیف ویرایش/حذف دارد', (await page.locator('#sheet-pgroups .grp-row').count()) === 3);
await page.click('#sheet-pgroups [data-close]'); await sleep(250);

/* ═══ e2e — صفر خطا ═══ */
T('e2e: صفر خطای کنسول در کل مسیر', errors.length === 0);
if (errors.length) console.log(errors.join('\n'));

console.log('\n═══ فاز ۵۷ ═══\nPASS: ' + ok + ' / FAIL: ' + bad);
await browser.close();
process.exit(bad ? 1 : 0);
