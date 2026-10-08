// tools/phase28/qa.mjs — QA فاز ۲۸
// ۲۳: کادر راهنمای گوش به زنگ (متن دقیق مالک) در پایین لیست خرید عمومی
// ۱۱: فقط لیست درخواست‌ها (بدون پیشنهادهای درون‌کارت) · کارت → ۳۶ · آرشیو با آیکون «تکرار درخواست»
// ۳۶: جزئیات درخواست بالا + پیشنهادها با سورت (بهترین آیمچ/ارزان‌ترین/نزدیک‌ترین/جدیدترین) ·
//     کارت پیشنهاد → شیت دیتای کامل + تماس/پیام/کاتالوگ · متوقف/بایگانی + هم‌گامی با ۱۱
// ۳۱: «فروش‌های ویژه تامین‌کنندگان» · حداقل خرید/شهر/آدرس/توضیح فروشنده · تماس/پیام (بدون درخواست خرید)
// ۱۰: مارجین جستجو · حذف متن اضافی · «مشاهده کاتالوگ‌های بیشتر»
// ۱۴: کارت کسب‌وکار مثل کاتالوگ (sheet-biz) · انتخاب از هر دو بازو، کارت‌های ۰۷ و ۱۴ هم‌گام
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p28');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); ok ? pass++ : fail++; };
const hash = () => page.evaluate(() => location.hash);

// ═══ ۲۳ — کادر راهنمای گوش به زنگ ═══
await page.goto(URL + '#23');
await page.waitForTimeout(600);
let t = await page.locator('#scr-23').innerText();
check('۲۳ کادر راهنمای گوش به زنگ (متن مالک — جمله اول)', t.includes('اگر تأمین‌کننده عمده هرکدام از کالاهای موردنیاز این خریدار هستید'));
check('۲۳ جمله دوم (اطلاع‌رسانی + ارسال قیمت)', t.includes('به شما اطلاع داده می‌شود تا قیمت خود را برای این خریدار ارسال کنید'));
const bellBoxPos = await page.$eval('#scr-23 .legend', el => {
  const rows = el.closest('main').querySelector('.rows');
  return rows.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
});
check('۲۳ کادر بعد از ردیف‌های لیست خرید', bellBoxPos === true || !!bellBoxPos);
await page.locator('#phone').screenshot({ path: OUT + '/23-bellbox.png' });

// ═══ ۱۱ — فقط لیست درخواست‌ها ═══
await page.goto(URL + '#11');
await page.waitForTimeout(500);
t = await page.locator('#scr-11').innerText();
check('۱۱ عنوان «درخواست‌های خرید من»', t.includes('درخواست‌های خرید من'));
check('۱۱ بدون پیشنهاد درون‌کارت (حذف «گفتگو»)', !t.includes('گفتگو'));
check('۱۱ بدون دکمهٔ بزرگ «ساخت درخواست مشابه»', !t.includes('ساخت درخواست مشابه'));
const nowCards = await page.$$eval('#prq-now .prq-card', els => els.map(e => ({
  key: e.dataset.reqkey, open: e.hasAttribute('data-reqopen'), img: !!e.querySelector('.thumb img'),
  dl: !!e.querySelector('.prq-deadline'), flag: !!e.querySelector('.rq-stopflag')
})));
check('۱۱ دو کارت جاری (rice/oil)', nowCards.length === 2 && nowCards[0].key === 'rice' && nowCards[1].key === 'oil');
check('۱۱ کارت‌ها عکس + مهلت + باز‌شونده', nowCards.every(c => c.open && c.img && c.dl && c.flag));
const archCards = await page.$$eval('#prq-arch .prq-card', els => els.map(e => ({
  key: e.dataset.reqkey, arch: e.dataset.arch,
  copy: !!e.querySelector('.rq-copy'), copyGo: e.querySelector('.rq-copy') && e.querySelector('.rq-copy').dataset.go,
  copyTitle: e.querySelector('.rq-copy') && e.querySelector('.rq-copy').title
})));
check('۱۱ سه کارت آرشیو (rice2/paste/oil2)', archCards.length === 3 && archCards.map(c => c.key).join() === 'rice2,paste,oil2');
check('۱۱ آرشیو: آیکون کپی «تکرار درخواست» → ۱۲', archCards.every(c => c.copy && c.copyGo === '12' && c.copyTitle === 'تکرار درخواست'));
check('۱۱ آرشیو: بدون دکمهٔ بلاک', !(await page.$('#prq-arch .btn-block')));
await page.locator('#phone').screenshot({ path: OUT + '/11-requests.png' });

// ═══ ۱۱ → ۳۶ — باز شدن صفحهٔ پیشنهادات ═══
await page.click('#prq-now .prq-card[data-reqkey="rice"]');
await page.waitForTimeout(500);
check('کارت برنج → صفحهٔ ۳۶', (await hash()) === '#36');
t = await page.locator('#scr-36').innerText();
check('۳۶ عنوان صفحه «پیشنهادات درخواست»', t.includes('پیشنهادات درخواست'));
check('۳۶ جزئیات درخواست (عنوان + مقدار + ارسال به ۳ فروشنده)', (await page.$eval('#po-title', el => el.textContent)) === 'برنج هاشمی' && t.includes('۲۰ کیسهٔ ۵۰ کیلویی') && t.includes('ارسال به ۳ فروشنده'));
check('۳۶ مهلت درخواست', (await page.$eval('#po-dl', el => el.textContent)) === '۳ روز مانده');
check('۳۶ دکمه‌های متوقف/بایگانی روی کارت درخواست', !!(await page.$('#po-acts [data-prqpause]')) && !!(await page.$('#po-acts [data-prqarch]')));
check('۳۶ بدون دکمهٔ تکرار (درخواست جاری است)', (await page.$eval('#po-repeat', el => el.hidden)) === true);
const offers = await page.$$eval('#po-list .offer-card', els => els.map(e => ({
  name: e.querySelector('.t').textContent.trim(), city: !!e.querySelector('.city-chip'),
  price: e.querySelector('.oprice .p').textContent.trim()
})));
check('۳۶ پنج پیشنهاد رندر شد', offers.length === 5);
check('۳۶ شهر همهٔ کارت‌ها با چیپ', offers.every(o => o.city));
const sortChips = await page.$$eval('#po-sort .chip', els => els.map(e => e.textContent.trim()));
check('۳۶ چهار سورت (بهترین آیمچ/ارزان‌ترین/نزدیک‌ترین/جدیدترین)', sortChips.join('|') === 'بهترین آیمچ|ارزان‌ترین|نزدیک‌ترین|جدیدترین');
const bestBadge = await page.$eval('#po-list .offer-card:first-child .t', el => el.textContent);
check('۳۶ بهترین آیمچ: تجارت گیل‌رنج اول (بج)', bestBadge.includes('تجارت گیل‌رنج') && bestBadge.includes('بهترین آیمچ'));
const sameCityBadge = await page.$$eval('#po-list .offer-card', els => els.filter(e => e.textContent.includes('تجارت گیل‌رنج')).map(e => e.textContent));
check('۳۶ نشان هم‌شهری + خرید قبلی روی کارت‌ها', t.includes('هم‌شهری') && t.includes('خرید قبلی'));
await page.locator('#phone').screenshot({ path: OUT + '/36-offers-best.png' });

// سورت ارزان‌ترین → شالی‌زار طالب (۲٬۷۴۰٬۰۰۰) اول
await page.click('#po-sort [data-posort="cheap"]');
await page.waitForTimeout(300);
const firstCheap = await page.$eval('#po-list .offer-card:first-child .t', el => el.textContent);
check('سورت ارزان‌ترین: شالی‌زار طالب اول', firstCheap.includes('شالی‌زار طالب'));
await page.locator('#phone').screenshot({ path: OUT + '/36-offers-cheap.png' });

// سورت جدیدترین → تجارت گیل‌رنج (۲ ساعت) اول
await page.click('#po-sort [data-posort="new"]');
await page.waitForTimeout(300);
const firstNew = await page.$eval('#po-list .offer-card:first-child .t', el => el.textContent);
check('سورت جدیدترین: تجارت گیل‌رنج اول', firstNew.includes('تجارت گیل‌رنج'));

// سورت نزدیک‌ترین → هم‌شهری‌ها اول
await page.click('#po-sort [data-posort="near"]');
await page.waitForTimeout(300);
const firstNear = await page.$eval('#po-list .offer-card:first-child .t', el => el.textContent);
check('سورت نزدیک‌ترین: هم‌شهری اول (رشتی)', firstNear.includes('رشت') === false && (firstNear.includes('تجارت گیل‌رنج') || firstNear.includes('پخش برنج پارس') || firstNear.includes('برنج یکتا')));

// ═══ ۳۶ — شیت کارت پیشنهاد ═══
await page.click('#po-sort [data-posort="best"]');
await page.waitForTimeout(200);
await page.click('#po-list .offer-card:first-child');
await page.waitForTimeout(400);
const ov = await page.locator('#sheet-offerview').innerText();
check('شیت پیشنهاد: عنوان + کسب‌وکار + شهر', ov.includes('پیشنهاد قیمت — تجارت گیل‌رنج') && ov.includes('پخش برنج') && ov.includes('رشت'));
check('شیت پیشنهاد: قیمت واحد + مجموع ۲۰ کیسه', ov.includes('۲٬۷۸۰٬۰۰۰') && ov.includes('۵۵٬۶۰۰٬۰۰۰') && ov.includes('مجموع برای ۲۰ کیسه'));
check('شیت پیشنهاد: حداقل سفارش + اعتبار + تحویل + توضیح', ov.includes('۸ کیسه') && ov.includes('۴۸ ساعت') && ov.includes('ارسال رایگان · ۲ روز کاری') && ov.includes('توضیح فروشنده'));
const ovBtns = await page.$$eval('#sheet-offerview .contact-row .btn', els => els.map(b => b.textContent.trim()));
check('شیت پیشنهاد: دکمه‌های تماس/پیام/کاتالوگ', ovBtns.join('|') === 'تماس|پیام|کاتالوگ');
const ovMsgGo = await page.$eval('#sheet-offerview .contact-row .btn:nth-child(2)', el => el.dataset.go);
const ovCatGo = await page.$eval('#sheet-offerview .contact-row .btn:nth-child(3)', el => el.dataset.go);
check('شیت پیشنهاد: پیام → ۱۹ · کاتالوگ → ۱۳', ovMsgGo === '19' && ovCatGo === '13');
await page.locator('#phone').screenshot({ path: OUT + '/sheet-offerview.png' });
await page.click('#sheet-offerview [data-close]');
await page.waitForTimeout(300);

// ═══ ۳۶ — متوقف کردن (هم‌گام با ۱۱) ═══
await page.click('#po-acts [data-prqpause]');
await page.waitForTimeout(300);
check('متوقف: بج روی کارت ۳۶', (await page.$eval('#po-stop', el => el.hidden)) === false);
check('متوقف: متن دکمه «شروع مجدد»', (await page.$eval('#po-acts [data-prqpause]', el => el.textContent.trim())) === 'شروع مجدد');
check('متوقف: بج روی کارت ۱۱ هم‌گام', (await page.$eval('#scr-11 .prq-card[data-reqkey="rice"] .rq-stopflag', el => el.hidden)) === false);
await page.click('#po-acts [data-prqpause]');
await page.waitForTimeout(200);
check('شروع مجدد: بج‌ها پنهان شدند', (await page.$eval('#po-stop', el => el.hidden)) === true && (await page.$eval('#scr-11 .prq-card[data-reqkey="rice"] .rq-stopflag', el => el.hidden)) === true);

// ═══ ۳۶ — بایگانی (کارت ۱۱ به آرشیو می‌رود) ═══
await page.click('#po-acts [data-prqarch]');
await page.waitForTimeout(300);
check('بایگانی: بج وضعیت «بایگانی شد»', (await page.$eval('#po-dl', el => el.textContent)) === 'بایگانی شد');
check('بایگانی: دکمهٔ «تکرار درخواست» روی کارت ۳۶', (await page.$eval('#po-repeat', el => el.hidden)) === false && (await page.$eval('#po-repeat', el => el.textContent.includes('تکرار درخواست'))));
check('بایگانی: شمارنده‌های ۱۱ (۱ جاری · ۴ آرشیو)', (await page.$eval('#prq-sub', el => el.textContent)) === '۱ جاری · ۴ آرشیو');
check('بایگانی: کارت آرشیوِ ساخته‌شده روی ۱۱ آیکون کپی دارد', !!(await page.$('#prq-arch .prq-card[data-reqkey="rice"] .rq-copy')));

// آرشیو → باز شدن ۳۶ در حالت آرشیو (اول به ۱۱ و تب آرشیو برمی‌گردیم)
await page.goto(URL + '#11');
await page.waitForTimeout(400);
await page.click('[data-prqtab="arch"]');
await page.waitForTimeout(300);
await page.click('#prq-arch .prq-card[data-reqkey="rice"]');
await page.waitForTimeout(400);
check('کارت آرشیو → ۳۶', (await hash()) === '#36');
check('۳۶ حالت آرشیو: «وضعیت» + پایان مهلت', (await page.$eval('#po-dl-cap', el => el.textContent)) === 'وضعیت' && (await page.$eval('#po-dl', el => el.textContent)) === 'بایگانی شد');
check('۳۶ حالت آرشیو: تکرار درخواست (نه متوقف/بایگانی)', (await page.$eval('#po-repeat', el => el.hidden)) === false && (await page.$eval('#po-acts', el => el.hidden)) === true);

// آرشیو استاتیک: rice2 (۴ پیشنهاد)
await page.goto(URL + '#11');
await page.waitForTimeout(400);
await page.click('[data-prqtab="arch"]');
await page.waitForTimeout(300);
await page.click('#prq-arch .prq-card[data-reqkey="rice2"]');
await page.waitForTimeout(400);
check('آرشیو استاتیک rice2 → ۳۶ با ۴ پیشنهاد', (await page.$$eval('#po-list .offer-card', els => els.length)) === 4);
check('آرشیو استاتیک: وضعیت «پایان مهلت»', (await page.$eval('#po-dl', el => el.textContent)) === 'پایان مهلت');
await page.locator('#phone').screenshot({ path: OUT + '/36-archived.png' });

// ═══ ۳۱ — فروش‌های ویژهٔ تامین‌کنندگان ═══
await page.goto(URL + '#31');
await page.waitForTimeout(500);
t = await page.locator('#scr-31').innerText();
check('۳۱ عنوان «فروش‌های ویژه تامین‌کنندگان»', t.includes('فروش‌های ویژه تامین‌کنندگان'));
check('۳۱ بدون عنوان قدیمی «کمپین‌های فروشندگان»', !t.includes('کمپین‌های فروشندگان'));
check('۳۱ بدون زیرعنوان توضیحی (حذف — متن مالک)', !t.includes('جدا از نتایج طبیعی'));
check('۳۱ بدون متن شفافیت پایانی', !t.includes('هزینه‌اش بر عهدهٔ فروشنده'));
check('۳۱ بدون دکمهٔ «درخواست خرید»', !t.includes('درخواست خرید'));
check('۳۱ حداقل خرید روی کارت‌ها', t.includes('حداقل خرید: ۱۰ کیسه') && t.includes('حداقل خرید: ۲۰ کیسه'));
check('۳۱ آدرس روی کارت‌ها', t.includes('بلوار امام خمینی، مرکز توزیع میلاد') && t.includes('خیابان استاد مطهری'));
check('۳۱ توضیح فروشنده روی کارت‌ها', t.includes('توضیح فروشنده:'));
const c31 = await page.$$eval('#scr-31 .camp-card', els => els.map(e => ({
  city: !!e.querySelector('.city-chip'), same: e.textContent.includes('هم‌شهری'),
  btns: [...e.querySelectorAll('.btn')].map(b => b.textContent.trim()),
  msgGo: e.querySelector('[data-go="19"]') ? true : false
})));
check('۳۱ چیپ شهر + بج هم‌شهری', c31.every(c => c.city && c.same));
check('۳۱ دکمه‌های تماس/پیام/کاتالوگ', c31.every(c => c.btns.join('|') === 'تماس|پیام|کاتالوگ'));
check('۳۱ پیام → ۱۹ · کاتالوگ → ۱۳', c31.every(c => c.msgGo) && !!(await page.$('#scr-31 [data-go="13"]')));
await page.locator('#phone').screenshot({ path: OUT + '/31-special-sales.png' });

// ═══ ۱۰ — اصلاحات دفترچهٔ کاتالوگ‌ها ═══
await page.goto(URL + '#10');
await page.waitForTimeout(500);
t = await page.locator('#scr-10').innerText();
const sbMargin = await page.$eval('#scr-10 .searchbar', el => getComputedStyle(el).marginBottom);
check('۱۰ مارجین پایین جستجو (mb=' + sbMargin + ')', parseInt(sbMargin) >= 10);
check('۱۰ «مشاهده کاتالوگ‌های بیشتر» (نام جدید)', t.includes('مشاهده کاتالوگ‌های بیشتر') && !t.includes('کاتالوگ‌های مرتبط بیشتر'));
check('۱۰ بدون متن شفافیت (حذف — متن مالک)', !t.includes('مثل دفترچهٔ تلفن عمل می‌کنند'));
await page.locator('#phone').screenshot({ path: OUT + '/10-saved-cats.png' });

// ═══ ۱۴ — کارت کسب‌وکار مثل کاتالوگ ═══
await page.goto(URL + '#14');
await page.waitForTimeout(500);
t = await page.locator('#scr-14').innerText();
check('۱۴ کارت کسب‌وکار (فعال از شیت)', t.includes('کسب و کار') && t.includes('سوپرمارکت نگین'));
const biz14 = await page.$eval('#scr-14 .biz-card', el => ({ sheet: el.dataset.sheet, edit: !!el.querySelector('.biz-edit') }));
check('۱۴ کارت → sheet-biz + دکمهٔ ویرایش (۲۲)', biz14.sheet === 'sheet-biz' && biz14.edit);
await page.click('#scr-14 .biz-card');
await page.waitForTimeout(400);
check('۱۴ باز شدن شیت کسب‌وکارها', (await page.$eval('#sheet-biz', el => el.classList.contains('show'))));
const bizCur = await page.$eval('#sheet-biz .sheet-row.current', el => el.textContent);
check('شیت biz: بازوی خرید → «سوپرمارکت نگین» فعال', bizCur.includes('سوپرمارکت نگین'));
const bizSub = await page.$eval('#sheet-biz .sub', el => el.textContent);
check('شیت biz: هر کسب‌وکار دو دستیار دارد', bizSub.includes('یک دستیار خرید و یک دستیار فروش'));
await page.locator('#phone').screenshot({ path: OUT + '/14-profile-biz.png' });
// انتخاب «پخش برنج پارس» → هر دو کارت ۰۷ و ۱۴ هم‌گام
await page.click('#sheet-biz [data-bizpick]:has-text("پخش برنج پارس")');
await page.waitForTimeout(500);
check('انتخاب: کارت ۱۴ → پخش برنج پارس', (await page.$eval('#scr-14 .biz-card .meta .name', el => el.textContent)) === 'پخش برنج پارس');
check('انتخاب: کارت ۰۷ هم‌گام شد', (await page.$eval('#scr-07 .biz-card .meta .name', el => el.textContent)) === 'پخش برنج پارس');
// بازوی فروش → «فعال» روی پخش برنج پارس
await page.goto(URL + '#07');
await page.waitForTimeout(400);
await page.click('#scr-07 .biz-card');
await page.waitForTimeout(400);
const bizCur2 = await page.$eval('#sheet-biz .sheet-row.current', el => el.textContent);
check('شیت biz: بازوی فروش → «پخش برنج پارس» فعال', bizCur2.includes('پخش برنج پارس'));
await page.click('#sheet-biz [data-close]');
await page.waitForTimeout(300);

// ═══ e2e — همهٔ صفحه‌ها بدون خطای کنسول ═══
const ids = [];
for (let i = 1; i <= 36; i++) ids.push(String(i));
ids.push('d1', 'd2', 'd3');
for (const id of ids) {
  await page.goto(URL + '#' + id);
  await page.waitForTimeout(120);
}
check('e2e: صفر خطای کنسول در ' + ids.length + ' صفحه (' + errors.length + ' خطا)', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5).join('\n'));

console.log('\n═══ نتیجه: ' + pass + ' PASS · ' + fail + ' FAIL ═══');
await browser.close();
process.exit(fail ? 1 : 0);
