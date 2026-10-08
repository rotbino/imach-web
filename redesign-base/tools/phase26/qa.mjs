// tools/phase26/qa.mjs — QA فاز ۲۶: بازطراحی دستیار خرید
// دفتر خرید (۰۸: لینک قرمز «درخواست‌های قیمت من» + بج‌های استعلام + کارت→لیست مقایسه) ·
// صفحهٔ جدید ۱۱ «درخواست‌های قیمت من» (جاری/آرشیو · مهلت · متوقف/بایگانی · ساخت درخواست مشابه)
//     — فاز ۲۷: نام «درخواست‌های خرید من» · فاز ۲۸: ۱۱ فقط لیست؛ جزئیات/پیشنهادها/مدیریت در ۳۶؛ آرشیو: «تکرار درخواست» با آیکون کپی ·
// فرم ۱۲ (مهلت ۱/۳/۵ + سایر تا ۳۰ روز · ارسال→۱۱) · صفحهٔ جدید ۳۳ «لیست مقایسه» (گرید قیمت دنبال‌شده
// + جزئیات ۰۲ + پیشنهاد تطابق با بج «فروشندهٔ ویژه» + استعلام گروهی + کادر تأمین‌کنندگان دیگر→۰۹) ·
// تابلوی ۰۹ (کارت «۲٫۵٪ ارزان‌تر» + جایگزین + بج فروشندهٔ ویژه) · دفترچهٔ تلفن ۱۰ (کاتالوگ‌های
// ذخیره‌شدهٔ من · جستجو · تماس/کاتالوگ/سه‌نقطه+حذف · مرتبط بیشتر) · فوتر استاندارد ۵ تبی در همهٔ صفحات خرید
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p26');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); ok ? pass++ : fail++; };
const hash = () => page.evaluate(() => location.hash);

// ═══ ۰۸ — لیست خرید (نام فاز ۲۷؛ سابقاً دفتر خرید) ═══
await page.goto(URL + '#08');
await page.waitForTimeout(600);
let t = await page.locator('#scr-08').innerText();
check('۰۸ لینک «درخواست‌های خرید من» (نام فاز ۲۷)', t.includes('درخواست‌های خرید من'));
const linkStyle = await page.$eval('#scr-08 .prqlink', el => {
  const cs = getComputedStyle(el);
  return { color: cs.color, weight: cs.fontWeight };
});
check('۰۸ لینک مشکی (color=' + linkStyle.color + ')', linkStyle.color === 'rgb(42, 39, 35)');
check('۰۸ لینک بولد (وزن ' + linkStyle.weight + ')', linkStyle.weight === '700');
check('۰۸ فرادادهٔ استعلام روی برنج: ۳ آیکون+عدد (فاز ۲۷)', (await page.$$eval('#scr-08 .bl-card:first-child .mm', els => els.length)) === 3);
check('۰۸ فرادادهٔ استعلام روی روغن: ۳ آیکون+عدد (فاز ۲۷)', (await page.$$eval('#scr-08 .bl-card:nth-child(2) .mm', els => els.length)) === 3);
const tabs8 = await page.$$eval('#scr-08 .tabbar .tab', els => els.map(e => e.textContent.trim()));
check('۰۸ فوتر ۵ تبی: لیست خرید · کاتالوگ‌ها · کمپین‌ها · پیام‌ها · پروفایل', tabs8.length === 5 && tabs8.join('|').includes('کمپین‌ها') && !tabs8.join('|').includes('پیشنهادها'));
await page.locator('#phone').screenshot({ path: OUT + '/08-buy-notebook.png' });

// ۰۸ → ۱۱
await page.locator('#scr-08 .prqlink').click();
await page.waitForTimeout(350);
check('۰۸ کلیک لینک → صفحهٔ ۱۱', (await hash()) === '#11' && !(await page.$eval('#scr-11', el => el.hidden)));

// ═══ ۱۱ — درخواست‌های خرید من (نام فاز ۲۷؛ فاز ۲۸: فقط لیست — جزئیات/پیشنهادها در ۳۶) ═══
t = await page.locator('#scr-11').innerText();
const t11all = await page.$eval('#scr-11', el => el.textContent);
check('۱۱ صفحهٔ کامل با هدر بازگشت (subheader، بدون تب‌بار)', !!(await page.$('#scr-11 .subheader .back')) && !(await page.$('#scr-11 .tabbar')));
check('۱۱ عنوان + سوییچ جاری/آرشیو', t.includes('درخواست‌های خرید من') && t.includes('جاری') && t.includes('آرشیو'));
check('۱۱ مهلت‌ها: «۳ روز مانده» (برنج) و «امروز آخرین روز» (روغن)', t.includes('۳ روز مانده') && t.includes('امروز آخرین روز'));
check('۱۱ فقط لیست (فاز ۲۸): بهترین روی کارت، بدون پیشنهاد درون‌کارت', t.includes('بهترین:') && t.includes('۲٬۷۸۰٬۰۰۰') && !t.includes('گفتگو'));
check('۱۱ مدیریت منتقل به ۳۶ (فاز ۲۸: بدون متوقف/بایگانی روی کارت‌های ۱۱)', !t.includes('متوقف کردن'));
check('۱۱ آرشیو: «تکرار درخواست» با آیکون کپی (فاز ۲۸)', t11all.includes('تکرار درخواست'));
await page.locator('#phone').screenshot({ path: OUT + '/11-prq-now.png' });

// ۱۱ — سوییچ آرشیو و بازگشت
await page.locator('#prq-tabs button[data-prqtab="arch"]').click();
await page.waitForTimeout(250);
check('۱۱ سوییچ جاری ↔ آرشیو', (await page.$eval('#prq-arch', el => !el.hidden)) && (await page.$eval('#prq-now', el => el.hidden)));
await page.locator('#phone').screenshot({ path: OUT + '/11-prq-arch.png' });
await page.locator('#prq-tabs button[data-prqtab="now"]').click();
await page.waitForTimeout(250);

// ۱۱ → ۳۶ (فاز ۲۸) — جزئیات + پیشنهادها + مدیریت
await page.locator('#prq-now .prq-card').first().click();
await page.waitForTimeout(400);
check('۱۱ کارت → صفحهٔ ۳۶ (پیشنهادات درخواست)', (await hash()) === '#36');
t = await page.locator('#scr-36').innerText();
check('۳۶ پیشنهادهای رسیده با قیمت (تجارت گیل‌رنج ۲٬۷۸۰٬۰۰۰ بهترین آیمچ)', t.includes('تجارت گیل‌رنج') && t.includes('۲٬۷۸۰٬۰۰۰') && t.includes('بهترین آیمچ'));
check('۳۶ مدیریت: «متوقف کردن» + «بایگانی»', t.includes('متوقف کردن') && t.includes('بایگانی'));

// ۳۶ — بایگانی: کارت ۱۱ به آرشیو منتقل می‌شود + شمارنده‌ها
const archBefore = await page.$$eval('#prq-arch .prq-card', els => els.length);
await page.locator('#po-acts [data-prqarch]').click();
await page.waitForTimeout(300);
check('۳۶ بایگانی → کارت ۱۱ به آرشیو منتقل شد (' + archBefore + '→' + (archBefore + 1) + ')', (await page.$$eval('#prq-arch .prq-card', els => els.length)) === archBefore + 1);
const sub11 = await page.$eval('#prq-sub', el => el.textContent.trim());
check('۱۱ شمارندهٔ سرصفحه به‌روز: ' + sub11, sub11.includes('۱ جاری') && sub11.includes('۴ آرشیو'));

// ۳۶ — متوقف کردن (کارت جاری باقی‌مانده: روغن)
await page.goto(URL + '#11');
await page.waitForTimeout(350);
await page.locator('#prq-now .prq-card').first().click();
await page.waitForTimeout(400);
await page.locator('#po-acts [data-prqpause]').click();
await page.waitForTimeout(250);
const pausedState = await page.$eval('#po-req', c => {
  const b = document.getElementById('po-stop');
  const btn = c.querySelector('[data-prqpause]');
  return { shown: b && !b.hidden, label: btn.textContent.trim() };
});
check('۳۶ متوقف → بج «متوقف» + دکمه «شروع مجدد»', pausedState.shown && pausedState.label === 'شروع مجدد');
await page.locator('#po-acts [data-prqpause]').click();
await page.waitForTimeout(200);

// ۱۱ — بازگشت → ۰۸ (از ناوبری تازه)
await page.goto(URL + '#08');
await page.waitForTimeout(300);
await page.goto(URL + '#11');
await page.waitForTimeout(350);
await page.locator('#scr-11 .subheader .back').click();
await page.waitForTimeout(350);
check('۱۱ دکمهٔ بازگشت → ۰۸', (await hash()) === '#08');

// ═══ ۱۲ — فرم استعلام گروهی + مهلت ═══
await page.goto(URL + '#12');
await page.waitForTimeout(500);
t = await page.locator('#scr-12').innerText();
check('۱۲ زیرعنوان «ارسال به چند تأمین‌کننده» (نام فاز ۲۷)', t.includes('ارسال به چند تأمین‌کننده'));
check('۱۲ فیلد «مهلت پاسخ‌گویی» با گزینه‌های ۱/۳/۵/سایر', t.includes('مهلت پاسخ‌گویی') && t.includes('۱ روز') && t.includes('۳ روز') && t.includes('۵ روز') && t.includes('سایر'));
check('۱۲ سقف ۳۰ روز ذکر شده', t.includes('حداکثر ۳۰ روز'));
check('۱۲ جملهٔ مهلت: پس از پایان، نمایش به فروشندگان متوقف', t.includes('نمایش داده نمی‌شود'));
await page.locator('#dl-choice .pill[data-deadline="other"]').click();
await page.waitForTimeout(200);
check('۱۲ «سایر» → ورودی روز دلخواه ظاهر شد', (await page.$eval('#dl-custom', el => !el.hidden)));
await page.locator('#phone').screenshot({ path: OUT + '/12-deadline.png' });

// ۱۲ — ارسال → ۱۱
await page.locator('#scr-12 .action-bar .btn-stone').click();
await page.waitForTimeout(350);
check('۱۲ «ارسال به ۲ فروشنده + شبکه iMach» → صفحهٔ ۱۱', (await hash()) === '#11');

// ═══ ۳۳ — لیست مقایسه ═══
await page.goto(URL + '#33');
await page.waitForTimeout(500);
t = await page.locator('#scr-33').innerText();
check('۳۳ عنوان: «لیست مقایسه · ۳ فروشندهٔ دنبال‌شده»', t.includes('لیست مقایسه') && t.includes('۳ فروشندهٔ دنبال‌شده'));
check('۳۳ سه قیمت مرتب زیر هم: ۲٬۸۵۰٬۰۰۰ → ۲٬۹۲۰٬۰۰۰ → ۳٬۰۰۰٬۰۰۰', t.includes('۲٬۸۵۰٬۰۰۰') && t.includes('۲٬۹۲۰٬۰۰۰') && t.includes('۳٬۰۰۰٬۰۰۰'));
const order33 = await page.$$eval('#scr-33 .rows > .row-card', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
check('۳۳ ترتیب صعودی قیمت در DOM + برجسته‌سازی ارزان‌ترین', order33[0].includes('۲٬۸۵۰٬۰۰۰') && order33[1].includes('۲٬۹۲۰٬۰۰۰') && order33[2].includes('۳٬۰۰۰٬۰۰۰') && order33[0].includes('ارزان‌ترین'));
check('۳۳ پیشنهاد تطابق iMach زیر لیست + بج «فروشندهٔ ویژه» (شالی‌زار طالب تبلیغی بالاتر)', t.includes('پیشنهاد تطابق iMach') && t.includes('فروشندهٔ ویژه') && t.includes('شالی‌زار طالب'));
check('۳۳ نتیجهٔ طبیعی تطابق با درجهٔ تطبیق ۸۷٪ (تجارت گیل‌رنج)', t.includes('۸۷٪') && t.includes('تجارت گیل‌رنج'));
check('۳۳ درخواست خرید از ۳ فروشندهٔ دنبال‌شده (نام فاز ۲۷)', t.includes('درخواست خرید از ۳ فروشندهٔ دنبال‌شده'));
check('۳۳ کادر «تأمین‌کنندگان دیگر این کالا»', t.includes('تأمین‌کنندگان دیگر این کالا'));
await page.locator('#phone').screenshot({ path: OUT + '/33-compare.png' });

// ۳۳ — لمس رکورد → ۰۲ (همان فرم جزئیات کاتالوگ)
await page.locator('#scr-33 .rows .row-card').first().click();
await page.waitForTimeout(350);
check('۳۳ لمس رکورد → جزئیات کالا (۰۲) — همان فرم کاتالوگ', (await hash()) === '#02');
check('۰۲ از این مسیر هم به کاتالوگ فروشنده می‌رسد (کارت فروشنده کلیک‌شو)', !!(await page.$('#scr-02 [data-go="13"][style*="cursor"]')));
await page.locator('#scr-02 [data-go="13"][style*="cursor"]').first().click();
await page.waitForTimeout(350);
check('۰۲ کارت فروشنده → کاتالوگ (۱۳)', (await hash()) === '#13');

// ۳۳ — استعلام گروهی → ۱۲
await page.goto(URL + '#33');
await page.waitForTimeout(400);
await page.locator('#scr-33 button', { hasText: 'درخواست خرید از ۳ فروشندهٔ دنبال‌شده' }).click();
await page.waitForTimeout(350);
check('۳۳ درخواست خرید گروهی → فرم ۱۲', (await hash()) === '#12');

// ۳۳ — کادر تأمین‌کنندگان دیگر → ۰۹
await page.goto(URL + '#33');
await page.waitForTimeout(400);
await page.locator('#scr-33 [data-go="09"]').click();
await page.waitForTimeout(350);
check('۳۳ کادر «تأمین‌کنندگان دیگر این کالا» → تابلوی تأمین ۰۹', (await hash()) === '#09');

// ═══ ۰۹ — تابلوی تأمین ═══
t = await page.locator('#scr-09').innerText();
check('۰۹ کارت «قیمت بهتر»: ۲٫۵٪ ارزان‌تر از تأمین‌کنندگان فعلی شما (منتقل از پیشنهادها)', t.includes('۲٫۵٪ ارزان‌تر از تأمین‌کنندگان فعلی شما'));
check('۰۹ بج یکدست «فروشندهٔ ویژه» (به‌جای «ویژهٔ لیست خرید شما»)', t.includes('فروشندهٔ ویژه') && !t.includes('ویژهٔ لیست خرید شما'));
check('۰۹ کارت «جایگزین» برنج طارم (منتقل از پیشنهادها)', t.includes('جایگزین') && t.includes('برنج طارم'));
await page.locator('#phone').screenshot({ path: OUT + '/09-supply-board.png' });
await page.locator('#scr-09 button', { hasText: 'افزودن به لیست مقایسه' }).click();
await page.waitForTimeout(350);
check('۰۹ «افزودن به لیست مقایسه» → ۳۳', (await hash()) === '#33');

// ═══ ۰۸ کارت → ۳۳ (نه ۰۹) ═══
await page.goto(URL + '#08');
await page.waitForTimeout(400);
await page.locator('#scr-08 .bl-card').first().click(); /* فاز ۲۷: کارت مینیمال bl-card */
await page.waitForTimeout(350);
check('۰۸ کارت برنج → لیست مقایسه (۳۳) — نه تابلوی تأمین', (await hash()) === '#33');

// ═══ ۱۰ — کاتالوگ‌های ذخیره‌شدهٔ من (دفترچهٔ تلفن) ═══
await page.goto(URL + '#10');
await page.waitForTimeout(500);
t = await page.locator('#scr-10').innerText();
check('۱۰ عنوان «کاتالوگ‌های ذخیره‌شدهٔ من» (به‌جای «تأمین‌کنندگان»)', t.includes('کاتالوگ‌های ذخیره‌شدهٔ من'));
check('۱۰ جستجوی «نام شخص یا کسب و کار»', t.includes('جستجوی نام شخص یا کسب و کار'));
check('۱۰ تب‌های «مرتبط با من / ذخیره‌شده» حذف شدند', !(await page.$('#scr-10 .inner-tabs')));
check('۱۰ سه‌نقطه در هر ۳ ردیف ذخیره‌شده', (await page.$$('#saved-cats .row-card [data-sheet="sheet-catmenu"]')).length === 3);
check('۱۰ شماره تلفن در ردیف‌ها (دفترچهٔ تلفن)', t.includes('۰۹۱۱ ۲۳۴ ۵۶۷۸'));
check('۱۰ بخش «مشاهده کاتالوگ‌های بیشتر» (نام فاز ۲۸ — محتوای تب قدیمی مرتبط با من)', t.includes('مشاهده کاتالوگ‌های بیشتر'));
await page.locator('[data-reveal="rel-cats"]').click();
await page.waitForTimeout(250);
const relShown = await page.$eval('#rel-cats', el => !el.hidden);
const relText = await page.$eval('#rel-cats', el => el.textContent);
check('۱۰ بازشدن مرتبط‌ها: شالی‌زار طالب (فروشندهٔ ویژه) + تجارت گیل‌رنج + نگین گلستان', relShown && relText.includes('شالی‌زار طالب') && relText.includes('فروشندهٔ ویژه') && relText.includes('تجارت گیل‌رنج') && relText.includes('نگین گلستان'));
await page.locator('#phone').screenshot({ path: OUT + '/10-phonebook.png' });

// ۱۰ — سه‌نقطه → شیت → حذف
await page.locator('[data-sheet="sheet-catmenu"]').first().click();
await page.waitForTimeout(400);
check('۱۰ سه‌نقطه → شیت منو با گزینهٔ حذف', (await page.$eval('#sheet-catmenu', el => el.classList.contains('show'))) && !!(await page.$('#sheet-catmenu [data-catdel]')));
const sheetTitle = await page.$eval('#catmenu-title', el => el.textContent.trim());
check('۱۰ عنوان شیت هم‌گام با ردیف: ' + sheetTitle, sheetTitle.includes('پخش برنج پارس'));
const cntBefore = await page.$$eval('#saved-cats > .row-card', els => els.length);
await page.locator('#sheet-catmenu [data-catdel]').click();
await page.waitForTimeout(300);
const cntAfter = await page.$$eval('#saved-cats > .row-card', els => els.length);
check('۱۰ حذف → ردیف حذف شد (' + cntBefore + '→' + cntAfter + ')', cntAfter === cntBefore - 1);
const cntLabel = await page.$eval('#saved-cats-count', el => el.textContent.trim());
check('۱۰ شمارندهٔ «۲ کاتالوگ» به‌روز شد', cntLabel.includes('۲'));

// ═══ فوتر ۵ تبی در همهٔ صفحات خرید ═══
for (const id of ['08', '10', '14', '31']) {
  await page.goto(URL + '#' + id);
  await page.waitForTimeout(300);
  const tabs = await page.$$eval('#scr-' + id + ' .tabbar .tab', els => els.map(e => e.textContent.trim()));
  check(id + ' فوتر ۵ تبی بدون «پیشنهادها»', tabs.length === 5 && !tabs.join('|').includes('پیشنهادها'));
}
await page.goto(URL + '#18');
await page.waitForTimeout(400);
const keepTabs = await page.$$eval('#scr-18 .tabbar .tab', els => els.map(e => e.textContent.trim()));
check('۱۸ (خرید) فوتر پویا ۵ تبی', keepTabs.length === 5 && !keepTabs.join('|').includes('پیشنهادها'));

// ═══ سازگاری راهنما (۳۲) و شیت هدفمند ═══
t = await page.locator('#scr-32').innerText();
check('۳۲ راهنما: جایگاه ۲ با زبان «فروشندهٔ ویژه»', t.includes('فروشندهٔ ویژه') && !t.includes('ویژهٔ لیست خرید شما'));
const tgtText = await page.$eval('#sheet-target', el => el.textContent);
check('شیت هدفمند: «با نشان فروشندهٔ ویژه»', tgtText.includes('فروشندهٔ ویژه'));

// ═══ e2e — همهٔ صفحه‌ها بدون خطای کنسول ═══
const ids = await page.evaluate(() => [...document.querySelectorAll('.scr')].map(s => s.id.replace('scr-', '')));
for (const id of ids) {
  await page.goto(URL + '#' + id);
  await page.waitForTimeout(110);
}
console.log('screens visited:', ids.length, '· console errors:', errors.length);
check('e2e: صفر خطای کنسول در همهٔ صفحه‌ها', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5));

await browser.close();
console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
