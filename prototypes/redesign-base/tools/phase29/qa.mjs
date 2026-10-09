// tools/phase29/qa.mjs — QA فاز ۲۹
// ۱۳: نظرات و امتیاز کاتالوگ — آیکون گفتگو در هدر کنار اشتراک‌گذاری؛ شیت با خلاصهٔ امتیاز
//     (میانگین + تعداد) + نظرات با ستارهٔ هر نظر + فرم ثبت (ستاره‌سِلکت ۱-۵ + متن) که همان لحظه
//     نظر را بالای لیست می‌نشاند و میانگین/تعداد را به‌روز می‌کند.
// ۱۳: تخفیف همکار فلت (بدون باکس سبز) + متن کوتاه «تخفیف همکار شما ۷٪» + مارجین پایین.
// ۰۸: بخش «درخواست‌های خرید جاری» (کارت‌های افقی — ایدهٔ ۲۳) + لینک «همه درخواستها» → ۱۱؛
//     کارت → صفحهٔ پیشنهادات همان درخواست (۳۶).
// ۲۳: سه اکشن تماس / پیام / ذخیرهٔ لیست در یک ردیف — فشرده، هرکدام رنگ خودش.
// sheet-listset: تنظیم «امکان تماس» → دکمهٔ تماس لیست عمومی (۲۳) پنهان/آشکار می‌شود.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p29');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); ok ? pass++ : fail++; };
const hash = () => page.evaluate(() => location.hash);

// ═══ ۱۳ — نظرات و امتیاز کاتالوگ ═══
await page.goto(URL + '#13');
await page.waitForTimeout(600);
const hdr13 = await page.$eval('#scr-13 .subheader', el => {
  const btns = [...el.querySelectorAll('.icon-btn')];
  return {
    n: btns.length,
    cmnt: btns.find(b => b.getAttribute('data-sheet') === 'sheet-cmnts'),
    cmntIcon: btns.find(b => b.querySelector('svg use')?.getAttribute('href') === '#i-comment'),
    shareIcon: btns.find(b => b.querySelector('svg use')?.getAttribute('href') === '#i-share')
  };
});
check('۱۳ دو آیکون در هدر: نظرات + اشتراک‌گذاری', hdr13.n === 2 && !!hdr13.cmnt && !!hdr13.shareIcon);
check('۱۳ آیکون نظرات = i-comment (کنار اشتراک‌گذاری)', !!hdr13.cmntIcon);
await page.locator('#phone').screenshot({ path: OUT + '/13-header.png' });

// باز شدن شیت نظرات
await page.click('#scr-13 .subheader [data-sheet="sheet-cmnts"]');
await page.waitForTimeout(400);
check('۱۳ کلیک آیکون → شیت نظرات باز شد', await page.$eval('#sheet-cmnts', el => el.classList.contains('show')));
const cmSheet = await page.locator('#sheet-cmnts').innerText();
check('شیت: عنوان «نظرات و امتیاز کاتالوگ»', cmSheet.includes('نظرات و امتیاز کاتالوگ'));
check('شیت: خلاصهٔ امتیاز (میانگین ۴٫۴ از ۲۴ نظر)', cmSheet.includes('۴٫۴') && cmSheet.includes('از ۲۴ نظر'));
check('شیت: نظرات خریداران (نگین/بهار/سفید/مرکزی)', cmSheet.includes('سوپرمارکت نگین') && cmSheet.includes('رستوران سنتی بهار') && cmSheet.includes('هایپر سفید') && cmSheet.includes('خواربار مرکزی'));
// ستارهٔ کنار هر نظر (mini) + ستاره‌های خلاصه (big)
const cmStars = await page.$$eval('#sheet-cmnts .cm-item .who .stars', els => els.map(e => e.querySelectorAll('svg.on').length));
check('شیت: ستارهٔ هر نظر (۵/۴/۵/۳)', cmStars.join('|') === '5|4|5|3');
const avgStars = await page.$$eval('#sheet-cmnts #cm-avgstars svg.on', els => els.length);
check('شیت: ستاره‌های میانگین (۴ از ۵)', avgStars === 4);
await page.locator('#phone').screenshot({ path: OUT + '/13-cmnts-sheet.png' });

// فرم: اول بدون ستاره/متن → خطا
await page.click('#sheet-cmnts [data-cmnt-send]');
await page.waitForTimeout(200);
check('فرم: بدون ستاره و متن → پیام خطا', await page.$eval('#cm-err', el => !el.hidden));
// ستاره‌سِلکت: ستارهٔ ۴
await page.click('#cm-picker [data-cstar="4"]');
await page.waitForTimeout(200);
const pickOn = await page.$$eval('#cm-picker svg.on', els => els.length);
check('فرم: لمس ستارهٔ ۴ → چهار ستاره روشن', pickOn === 4);
check('فرم: خطا پاک شد', await page.$eval('#cm-err', el => el.hidden));
await page.fill('#cm-text', 'کیفیت خوب و ارسال به‌موقع — چهار ستاره از من.');
await page.click('#sheet-cmnts [data-cmnt-send]');
await page.waitForTimeout(300);
const cmAfter = await page.locator('#sheet-cmnts').innerText();
check('ثبت: نظر سوپرمارکت آریا بالای لیست نشست', cmAfter.includes('سوپرمارکت آریا') && cmAfter.includes('همین حالا') && cmAfter.includes('چهار ستاره از من'));
check('ثبت: تعداد به‌روز (۲۴ → ۲۵ نظر)', cmAfter.includes('از ۲۵ نظر'));
check('ثبت: فرم خالی شد', (await page.$eval('#cm-text', el => el.value)) === '' && (await page.$$eval('#cm-picker svg.on', els => els.length)) === 0);
const firstStars = await page.$eval('#cm-list .cm-item:first-child .who .stars', el => el.querySelectorAll('svg.on').length);
check('ثبت: نظر جدید با ۴ ستاره', firstStars === 4);
await page.locator('#phone').screenshot({ path: OUT + '/13-cmnts-after.png' });
await page.click('#sheet-cmnts [data-close]');
await page.waitForTimeout(300);

// ═══ ۱۳ — تخفیف همکار فلت ═══
const cw = await page.evaluate(() => {
  const b = document.querySelector('#scr-13 .cowork-line');
  const cs = getComputedStyle(b);
  const btnRow = b.nextElementSibling;
  const btnTop = btnRow ? btnRow.getBoundingClientRect().top : 0;
  return {
    text: b.textContent.replace(/\s+/g, ' ').trim(),
    bg: cs.backgroundColor, border: cs.borderTopWidth, font: cs.fontSize,
    gap: btnTop - b.getBoundingClientRect().bottom
  };
});
check('۱۳ تخفیف همکار: متن کوتاه «تخفیف همکار شما ۷٪»', cw.text === 'تخفیف همکار شما ۷٪');
check('۱۳ فلت — بدون پس‌زمینه و حاشیه', cw.bg === 'rgba(0, 0, 0, 0)' && cw.border === '0px');
check('۱۳ مارجین پایین — به دکمه‌های زیر نمی‌چسبد (فاصله ≥ ۱۰px)', cw.gap >= 10);
check('۱۳ باکس سبز قدیمی (cust-banner) حذف شد', (await page.$$('#scr-13 .cust-banner')).length === 0);

// ═══ ۰۸ — درخواست‌های خرید جاری (کارت‌های افقی) ═══
await page.goto(URL + '#08');
await page.waitForTimeout(600);
let t = await page.locator('#scr-08').innerText();
check('۰۸ بخش «درخواست‌های خرید جاری»', t.includes('درخواست‌های خرید جاری'));
check('۰۸ بدون باکس قدیمی «درخواست‌های خرید من»', !t.includes('درخواست‌های خرید من') && (await page.$$('#scr-08 .prqlink')).length === 0);
check('۰۸ لینک «همه درخواستها» کنار عنوان', t.includes('همه درخواستها'));
const blRfq = await page.$$eval('#scr-08 .bl-rfq', els => els.map(e => ({
  key: e.dataset.reqkey,
  img: !!e.querySelector('.bl-rfq-img img'),
  dl: e.querySelector('.dl') && e.querySelector('.dl').textContent.trim(),
  q: e.querySelector('.bl-rfq-q').textContent.trim(),
  n: e.querySelector('.bl-rfq-n').textContent.trim()
})));
check('۰۸ دو کارت افقی (برنج/روغن) با عکس', blRfq.length === 2 && blRfq.every(c => c.img));
check('۰۸ کلیدهای درخواست (rice/oil) برای باز شدن ۳۶', blRfq[0].key === 'rice' && blRfq[1].key === 'oil');
check('۰۸ بج مهلت روی عکس (۳ روز مانده / امروز آخرین روز)', blRfq[0].dl.includes('۳ روز مانده') && blRfq[1].dl.includes('امروز آخرین روز'));
check('۰۸ مقدار نیاز + تعداد پیشنهاد (۵/۳)', blRfq[0].q.includes('۲۰ کیسه') && blRfq[0].n.includes('۵') && blRfq[1].n.includes('۳'));
const rowDir = await page.$eval('#scr-08 .bl-rfq-row', el => getComputedStyle(el).overflowX);
check('۰۸ لیست افقی (اسکرول افقی)', rowDir === 'auto' || rowDir === 'scroll');
await page.locator('#phone').screenshot({ path: OUT + '/08-current-requests.png' });

// کارت → صفحهٔ پیشنهادات همان درخواست (۳۶)
await page.click('#scr-08 .bl-rfq:first-child');
await page.waitForTimeout(450);
check('۰۸ لمس کارت برنج → صفحهٔ ۳۶ (پیشنهادات درخواست)', (await hash()) === '#36' && !(await page.$eval('#scr-36', el => el.hidden)));
const poT = await page.locator('#scr-36').innerText();
check('۳۶ عنوان درخواست برنج + ۵ پیشنهاد', poT.includes('برنج هاشمی') && poT.includes('۵ پیشنهاد'));

// لینک «همه درخواستها» → ۱۱
await page.goto(URL + '#08');
await page.waitForTimeout(400);
await page.click('#scr-08 .morelnk');
await page.waitForTimeout(350);
check('۰۸ «همه درخواستها» → صفحهٔ ۱۱', (await hash()) === '#11' && !(await page.$eval('#scr-11', el => el.hidden)));

// ═══ ۲۳ — سه اکشن در یک ردیف ═══
await page.goto(URL + '#23');
await page.waitForTimeout(600);
t = await page.locator('#scr-23').innerText();
check('۲۳ سه دکمه: تماس · پیام · ذخیرهٔ لیست', t.includes('تماس') && t.includes('پیام') && t.includes('ذخیرهٔ لیست'));
const acts23 = await page.$$eval('#scr-23 .contact-row .btn', els => els.map(e => ({
  txt: e.textContent.trim(),
  cls: e.className,
  sheet: e.getAttribute('data-sheet') || '',
  go: e.getAttribute('data-go') || '',
  fs: getComputedStyle(e).fontSize,
  h: e.offsetHeight
})));
check('۲۳ همه در یک contact-row (۳ دکمه)', acts23.length === 3);
check('۲۳ ترتیب: تماس → پیام → ذخیرهٔ لیست', acts23[0].txt.includes('تماس') && acts23[1].txt.includes('پیام') && acts23[2].txt.includes('ذخیرهٔ لیست'));
check('۲۳ رنگ‌های متمایز (outline / primary / save)', acts23[0].cls.includes('btn-outline') && acts23[1].cls.includes('btn-primary') && acts23[2].cls.includes('btn-save'));
check('۲۳ فشرده (فونت ۱۲٫۵px، ارتفاع ≤ ۴۶px)', acts23.every(a => a.fs === '12.5px' && a.h <= 46));
check('۲۳ تماس → sheet-contacts · پیام → ۱۹', acts23[0].sheet === 'sheet-contacts' && acts23[1].go === '19');
check('۲۳ بدون نوار top-act', (await page.$$('#scr-23 .top-act')).length === 0);
const sameRow = await page.$eval('#scr-23 .contact-row', el => {
  const tops = [...el.querySelectorAll('.btn')].map(b => b.getBoundingClientRect().top);
  return Math.max(...tops) - Math.min(...tops) < 2;
});
check('۲۳ سه دکمه هم‌ردیف (بدون شکست)', sameRow);
await page.locator('#phone').screenshot({ path: OUT + '/23-actions-row.png' });

// ذخیرهٔ لیست — متن فشرده
await page.click('#scr-23 [data-savelist]');
await page.waitForTimeout(300);
const savedTxt = await page.$eval('#scr-23 [data-savelist]', el => el.textContent.trim());
check('۲۳ ذخیرهٔ لیست → «ذخیره شد» (متن فشرده)', savedTxt.includes('ذخیره شد') && !savedTxt.includes('لیست خریداران'));

// ═══ sheet-listset — امکان تماس ═══
await page.goto(URL + '#08');
await page.waitForTimeout(400);
await page.click('#scr-08 .sec-title [data-sheet="sheet-listset"]');
await page.waitForTimeout(400);
const lsTxt = await page.locator('#sheet-listset').innerText();
check('listset: ردیف «امکان تماس از لیست خرید»', lsTxt.includes('امکان تماس از لیست خرید'));
const tgOn = await page.$eval('#sheet-listset [data-contacttoggle]', el => el.classList.contains('on'));
check('listset: toggle امکان تماس روشن (پیش‌فرض)', tgOn);
await page.locator('#phone').screenshot({ path: OUT + '/listset-contact.png' });
// خاموش کردن → دکمهٔ تماس ۲۳ پنهان
await page.click('#sheet-listset [data-contacttoggle]');
await page.waitForTimeout(250);
check('listset: toggle خاموش شد', !(await page.$eval('#sheet-listset [data-contacttoggle]', el => el.classList.contains('on'))));
const cHidden = await page.$eval('#scr-23 [data-contactbtn]', el => el.hidden);
check('listset: دکمهٔ تماس لیست عمومی (۲۳) پنهان شد', cHidden);
// روشن کردن → برگشت
await page.click('#sheet-listset [data-contacttoggle]');
await page.waitForTimeout(250);
check('listset: toggle دوباره روشن → تماس برگشت', !(await page.$eval('#scr-23 [data-contactbtn]', el => el.hidden)));
await page.click('#sheet-listset [data-close]');
await page.waitForTimeout(300);

// ═══ رگرسیون ریز — جریان ۰۸ → ۳۶ هنوز سالم ═══
await page.goto(URL + '#08');
await page.waitForTimeout(350);
await page.click('#scr-08 .bl-rfq:nth-child(2)');
await page.waitForTimeout(450);
const poT2 = await page.locator('#scr-36').innerText();
check('۰۸ لمس کارت روغن → ۳۶ (۳ پیشنهاد)', poT2.includes('روغن سرخ‌کردنی') && poT2.includes('۳ پیشنهاد'));

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
