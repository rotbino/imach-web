// tools/phase32/qa.mjs — QA فاز ۳۲
// ۴۰/۴۱: راهنمای دستیار خرید/فروش — نوار افقی فیلم‌های آموزشی (عکس + عنوان + لمس = پخش)
//        + سوال و جواب کاربران با متن مالک عیناً (دو نمونهٔ فروشنده عیناً از پیام مالک).
// شیت پخش (sheet-video): ماک پخش‌کننده — پخش/توقف/پیشرفت/پایان/دوباره + توقف خودکار با بستن شیت.
// ۲۳: عنوان بخش دوم «لیست خرید معمول».
// ۰۶: «بایگانی» بی‌معنا بود → «انصراف» = بازگشت به مبدأ (۲۳ از شیت درخواست · ۰۵ از کارت درخواست).
// ۰۳: کادر شلوغ «مدیریت این کالا» → سه کادر «مدیریت قیمت» · «موجودی و ویرایش» · «تبلیغات و کمپین».
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p32');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); ok ? pass++ : fail++; };
const nav = async h => { await page.evaluate(x => { location.hash = x; }, '#' + h); await page.waitForTimeout(260); };
const boot = async h => { await page.goto(URL + '#' + h); await page.evaluate(() => localStorage.removeItem('imach-assist')); await page.reload(); await page.waitForTimeout(450); };

/* ═══ ۱) صفحهٔ ۴۰ — راهنمای دستیار خرید ═══ */
await boot('40');
const p40 = await page.evaluate(() => {
  const s = document.getElementById('scr-40');
  return {
    shown: !s.hidden, arm: s.dataset.arm,
    title: s.querySelector('.subheader .ttl').childNodes[0].textContent,
    small: s.querySelector('.subheader .ttl small').textContent,
    secs: [...s.querySelectorAll('.sec-title h2')].map(h => h.textContent.trim().replace(/\s+/g, ' ')),
    ask: (s.querySelector('.gd-ask p') || {}).textContent || '',
    cards: [...s.querySelectorAll('#vd-row-40 .vd-card')].map(c => ({
      img: !!c.querySelector('.vd-thumb img'),
      play: !!c.querySelector('.vd-pl svg'),
      len: c.querySelector('.vd-len').textContent,
      t: c.querySelector('.vd-t').textContent
    })),
    formBtn: (s.querySelector('[data-fbsend="40"]') || {}).textContent || '',
    ph: (s.querySelector('#fb-text-40') || {}).placeholder || '',
    items: s.querySelectorAll('#fb-list-40 .fb-item').length,
    count: document.getElementById('fb-count-40').textContent
  };
});
check('۴۰ باز می‌شود · بازوی خرید', p40.shown && p40.arm === 'buy');
check('۴۰ عنوان: «راهنمای دستیار خرید» + زیرعنوان فیلم‌ها و پرسش‌وپاسخ', p40.title === 'راهنمای دستیار خرید' && p40.small === 'فیلم‌های آموزشی و پرسش‌وپاسخ');
check('۴۰ دو بخش: «فیلم‌های آموزشی» + «سوال و جواب کاربران»', p40.secs[0] === 'فیلم‌های آموزشی' && p40.secs[1] === 'سوال و جواب کاربران');
check('۴۰ متن مالک عیناً بالای سوال و جواب', p40.ask.trim() === 'اگر همچنان بعد از دیدن فیلمها ابهامی یا سوالی دارید اینجا سوال خود را مطرح کنید تا سایر کاربران به شما پاسخ دهند.');
check('۴۰ پنج فیلم: عکس + نشان پخش + مدت + عنوان زیر عکس', p40.cards.length === 5 && p40.cards.every(c => c.img && c.play && c.len));
check('۴۰ فیلم‌های خواستهٔ مالک: «شروع کار با دستیار خرید» و «آموزش درخواست خرید»', p40.cards.some(c => c.t === 'شروع کار با دستیار خرید') && p40.cards.some(c => c.t === 'آموزش درخواست خرید'));
check('۴۰ فرم سوال: «ثبت سوال» + placeholder سوال', p40.formBtn.includes('ثبت سوال') && p40.ph.includes('سوالتون'));
check('۴۰ سه سوال نمونه + شمارندهٔ «۳ سوال»', p40.items === 3 && p40.count === '۳ سوال');
await page.locator('#phone').screenshot({ path: OUT + '/40-buyer-guide.png' });

/* ═══ ۲) شیت پخش فیلم — پخش / توقف / پیشرفت / بستن ═══ */
await page.click('#vd-row-40 .vd-card');
await page.waitForTimeout(300);
const vs1 = await page.evaluate(() => ({
  shown: document.getElementById('sheet-video').classList.contains('show'),
  title: document.getElementById('vdv-title').textContent,
  sub: document.getElementById('vdv-sub').textContent,
  learn: document.querySelectorAll('#vdv-learn .li').length,
  time: document.getElementById('vdv-time').textContent,
  fill: document.getElementById('vdv-fill').style.width
}));
check('لمس آموزش اول → شیت پخش با عنوان و مدت', vs1.shown && vs1.title === 'شروع کار با دستیار خرید' && vs1.sub.includes('۲:۱۴'));
check('شیت: «در این فیلم می‌بینید» سه ردیف + زمان صفر', vs1.learn === 3 && vs1.time.startsWith('۰:۰۰') && vs1.fill === '0%');
await page.click('#sheet-video .vd-big');
await page.waitForTimeout(1100);
const vs2 = await page.evaluate(() => ({
  time: document.getElementById('vdv-time').textContent,
  fill: parseFloat(document.getElementById('vdv-fill').style.width),
  bigHidden: document.getElementById('vdv-big').hidden,
  toggle: document.getElementById('vdv-toggle').innerHTML
}));
check('پخش: زمان جلو می‌رود + نوار پیشرفت پر می‌شود', !vs2.time.startsWith('۰:۰۰') && vs2.fill > 8);
check('پخش: دکمهٔ بزرگ پنهان + آیکون توقف', vs2.bigHidden && vs2.toggle.includes('i-pause'));
await page.click('#sheet-video .vd-ctrl .vbtn');
await page.waitForTimeout(900);
const vs3 = await page.evaluate(() => document.getElementById('vdv-time').textContent);
check('توقف: زمان ثابت می‌ماند', vs3 === vs2.time);
await page.mouse.click(540, 150); /* بستن شیت از بک‌دراپ */
await page.waitForTimeout(800);
const vs4 = await page.evaluate(() => ({
  closed: !document.getElementById('sheet-video').classList.contains('show')
}));
await page.waitForTimeout(900);
const vs5 = await page.evaluate(() => document.getElementById('vdv-time').textContent);
check('بستن شیت → پخش خودکار قطع می‌شود', vs4.closed && vs5 === vs3);
/* فیلم دیگر → ریست کامل */
await page.click('#vd-row-40 .vd-card:nth-child(2)');
await page.waitForTimeout(300);
const vs6 = await page.evaluate(() => ({
  title: document.getElementById('vdv-title').textContent,
  time: document.getElementById('vdv-time').textContent,
  learn: document.querySelectorAll('#vdv-learn .li').length
}));
check('آموزش دوم: عنوان و زمان از صفر', vs6.title === 'آموزش درخواست خرید' && vs6.time.startsWith('۰:۰۰') && vs6.learn === 3);
await page.mouse.click(540, 150);
await page.waitForTimeout(300);

/* ═══ ۳) صفحهٔ ۴۱ — راهنمای دستیار فروش + دو سوال نمونهٔ مالک عیناً ═══ */
await boot('41');
const p41 = await page.evaluate(() => {
  const s = document.getElementById('scr-41');
  return {
    shown: !s.hidden, arm: s.dataset.arm,
    title: s.querySelector('.subheader .ttl').childNodes[0].textContent,
    cards: s.querySelectorAll('#vd-row-41 .vd-card').length,
    items: [...s.querySelectorAll('#fb-list-41 .fb-item')].map(i => ({
      q: i.querySelector('.fb-tx').textContent,
      who: i.querySelector('.fb-head .who').textContent,
      replies: [...i.querySelectorAll('.fb-reply')].map(r => ({ n: r.querySelector('.rh').textContent, tx: r.querySelector('.rt').textContent }))
    })),
    count: document.getElementById('fb-count-41').textContent
  };
});
check('۴۱ باز می‌شود · بازوی فروش · پنج فیلم', p41.shown && p41.arm === 'sell' && p41.cards === 5);
check('۴۱ عنوان: «راهنمای دستیار فروش»', p41.title === 'راهنمای دستیار فروش');
check('۴۱ سوال ۱ مالک عیناً: کمپین فروش', p41.items[0].q === 'کسی تا حالا کمپین فروش برگزار کرده؟ آیا نتیجهٔ خوبی هم گرفتین؟');
check('۴۱ پاسخ ۱ عیناً (علی محمدی · پخش هگمتان · دیروز)', p41.items[0].replies[0].n.includes('علی محمدی · پخش هگمتان') && p41.items[0].replies[0].n.includes('دیروز') && p41.items[0].replies[0].tx === 'بله من تا حالا چهار بار کمپین فروش برگزار کردم و نتیجه خیلی خوبی هم گرفتم. در کل هزینه‌ای که می‌دی در برابر فروشی که کردم واقعا ناچیز بود');
check('۴۱ سوال ۲ مالک عیناً: لیست اکسل', p41.items[1].q === 'خواستم با لیست اکسل کالاهامو ثبت کنم نشد؟ می‌گه لیستت استاندارد نیست. چیکار کنم؟');
check('۴۱ پاسخ ۲ عیناً (رضا عسگری · تولید موارد غذایی غزال)', p41.items[1].replies[0].n.includes('رضا عسگری · تولید موارد غذایی غزال') && p41.items[1].replies[0].tx.includes('پرامپتی که آیمچ بهت میده') && p41.items[1].replies[0].tx.endsWith('نه اکسل خام خودت رو'));
check('۴۱ شمارندهٔ «۲ سوال»', p41.count === '۲ سوال');
await page.locator('#phone').screenshot({ path: OUT + '/41-seller-guide.png' });

/* ثبت سوال زنده — هویت فروشنده */
await page.fill('#fb-text-41', 'کمپین برای کالای تازه هم جواب می‌ده؟');
await page.click('#scr-41 [data-fbsend="41"]');
await page.waitForTimeout(200);
const p41b = await page.evaluate(() => ({
  count: document.getElementById('fb-count-41').textContent,
  first: document.querySelector('#fb-list-41 .fb-item .fb-tx').textContent,
  who: document.querySelector('#fb-list-41 .fb-item .who').textContent
}));
check('ثبت سوال زنده: پست بالای لیست با هویت فروشنده (پخش برنج پارس)', p41b.count === '۳ سوال' && p41b.first === 'کمپین برای کالای تازه هم جواب می‌ده؟' && p41b.who.includes('پخش برنج پارس'));

/* ═══ ۴) لینک‌های راهنما در پروفایل‌ها + بازگشت ═══ */
await boot('14');
const l14 = await page.evaluate(() => {
  const c = document.querySelector('#scr-14 [data-go="40"]');
  return c ? { t: c.textContent.trim().replace(/\s+/g, ' '), ok: true } : { ok: false };
});
check('۱۴ میان‌بر «راهنمای دستیار خرید» → ۴۰', l14.ok && l14.t.includes('راهنمای دستیار خرید'));
await page.click('#scr-14 [data-go="40"]');
await page.waitForTimeout(300);
check('کلیک میان‌بر ۱۴ → صفحهٔ ۴۰', await page.evaluate(() => location.hash === '#40' && !document.getElementById('scr-40').hidden));
await page.click('#scr-40 .subheader .back');
await page.waitForTimeout(300);
check('بازگشت از ۴۰ → پروفایل خرید (۱۴)', await page.evaluate(() => location.hash === '#14'));

await boot('07');
const l07 = await page.evaluate(() => {
  const c = document.querySelector('#scr-07 [data-go="41"]');
  return c ? { t: c.textContent.trim().replace(/\s+/g, ' '), ok: true } : { ok: false };
});
check('۰۷ میان‌بر «راهنمای دستیار فروش» → ۴۱', l07.ok && l07.t.includes('راهنمای دستیار فروش'));
await page.click('#scr-07 [data-go="41"]');
await page.waitForTimeout(300);
check('کلیک میان‌بر ۰۷ → صفحهٔ ۴۱', await page.evaluate(() => location.hash === '#41' && !document.getElementById('scr-41').hidden));
await page.click('#scr-41 .subheader .back');
await page.waitForTimeout(300);
check('بازگشت از ۴۱ → پروفایل فروش (۰۷)', await page.evaluate(() => location.hash === '#07'));

/* ═══ ۵) ۲۳ — «لیست خرید معمول» + انصراف ۰۶ از مسیر شیت درخواست ═══ */
await boot('23');
const t23 = await page.evaluate(() => [...document.querySelectorAll('#scr-23 .sec-title h2')].map(h => h.textContent.trim().replace(/\s+/g, ' ')));
check('۲۳ بخش دوم: «لیست خرید معمول» (زیر درخواست‌های خرید جاری)', t23[0] === 'درخواست‌های خرید جاری' && t23[1] === 'لیست خرید معمول');
await page.locator('#phone').screenshot({ path: OUT + '/23-normal-list.png' });
await page.click('#scr-23 .rfq-card');
await page.waitForTimeout(300);
await page.click('#sheet-reqview [data-go="06"]');
await page.waitForTimeout(300);
check('شیت درخواست → فرم پیشنهاد (۰۶)', await page.evaluate(() => location.hash === '#06'));
const b06 = await page.evaluate(() => [...document.querySelectorAll('#scr-06 .action-bar .btn')].map(b => b.textContent.trim().replace(/\s+/g, ' ')));
check('۰۶ دکمه‌ها: «ارسال پیشنهاد» + «انصراف» (بایگانی حذف شد)', b06.join('|') === 'ارسال پیشنهاد|انصراف');
await page.locator('#phone').screenshot({ path: OUT + '/06-cancel.png' });
await page.click('#scr-06 [data-cancel]');
await page.waitForTimeout(300);
check('انصراف از مسیر ۲۳ → بازگشت به لیست خرید (۲۳)', await page.evaluate(() => location.hash === '#23' && !document.getElementById('scr-23').hidden));

/* انصراف از مسیر ۰۵ → بازگشت به درخواست‌های خرید فروشنده */
await boot('05');
await page.click('#scr-05 .req-card');
await page.waitForTimeout(300);
await page.click('#scr-06 [data-cancel]');
await page.waitForTimeout(300);
check('انصراف از مسیر ۰۵ → بازگشت به درخواست‌های خرید (۰۵)', await page.evaluate(() => location.hash === '#05'));

/* ═══ ۶) ۰۳ — سه کادر مدیریت ═══ */
await boot('03');
const m03 = await page.evaluate(() => {
  const boxes = [];
  document.querySelectorAll('#scr-03 main > div > .card').forEach(c => {
    const h = c.querySelector('div[style*="font-size:12.5px"]');
    if (h) boxes.push({ title: h.textContent.trim().replace(/\s+/g, ' '), btns: [...c.querySelectorAll('.btn')].map(b => b.textContent.trim().replace(/\s+/g, ' ')), sheets: [...c.querySelectorAll('.btn')].map(b => b.dataset.sheet || '') });
  });
  return { boxes, total: document.querySelectorAll('#scr-03 main .card .btn-outline').length, old: document.getElementById('scr-03').textContent.includes('مدیریت این کالا') };
});
check('۰۳ سه کادر: مدیریت قیمت · موجودی و ویرایش · تبلیغات و کمپین', m03.boxes.length === 3 && m03.boxes.map(b => b.title).join('|') === 'مدیریت قیمت|موجودی و ویرایش|تبلیغات و کمپین');
check('۰۳ کادر قیمت: تغییر قیمت (تمام‌عرض) + تخفیف پلکانی + تخفیف همکار', m03.boxes[0].btns.join('|') === 'تغییر قیمت|تخفیف پلکانی|تخفیف همکار');
check('۰۳ کادر موجودی و ویرایش: تغییر موجودی + اتمام موجودی + ویرایش جزئیات + عدم نمایش', m03.boxes[1].btns.join('|') === 'تغییر موجودی|اتمام موجودی|ویرایش جزئیات|عدم نمایش');
check('۰۳ کادر تبلیغات و کمپین: تبلیغ هدفمند + ایجاد کمپین', m03.boxes[2].btns.join('|') === 'تبلیغ هدفمند|ایجاد کمپین');
check('۰۳ هر ۹ دکمهٔ قبلی حفظ شده + همه به شیت خودشان وصل‌اند', m03.total === 9 && m03.boxes.every(b => b.btns.length === b.sheets.filter(Boolean).length) && !m03.old);
await page.evaluate(() => { document.querySelector('#scr-03 .screen-body').scrollTop = 40; });
await page.waitForTimeout(250);
await page.locator('#phone').screenshot({ path: OUT + '/03-manage-three.png' });
await page.click('#scr-03 .card [data-sheet="sheet-price"]');
await page.waitForTimeout(350);
check('۰۳ «تغییر قیمت» شیت خودش را باز می‌کند', await page.evaluate(() => document.getElementById('sheet-price').classList.contains('show')));
await page.mouse.click(540, 150);
await page.waitForTimeout(300);

/* ═══ ۷) گارد دستیارها: صفحهٔ راهنمای بازوی خاموش → خانهٔ بازوی روشن ═══ */
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: false })));
await page.goto(URL + '#40');
await page.reload();
await page.waitForTimeout(600);
check('خرید خاموش → ۴۰ به خانهٔ فروش (۰۱) هدایت می‌شود', await page.evaluate(() => location.hash === '#01'));
await page.evaluate(() => localStorage.removeItem('imach-assist'));

/* ═══ ۸) e2e — همهٔ ۴۴ صفحه بدون خطای کنسول ═══ */
const ALL = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','d1','d2','d3'];
for (const id of ALL) { await nav(id); }
check('e2e: همهٔ ۴۴ صفحه باز شد — صفر خطای کنسول', errors.length === 0);
if (errors.length) console.log('ERRORS:', errors.slice(0, 6));

console.log('\n═══ نتیجه: ' + pass + ' PASS · ' + fail + ' FAIL ═══');
await browser.close();
process.exit(fail ? 1 : 0);
