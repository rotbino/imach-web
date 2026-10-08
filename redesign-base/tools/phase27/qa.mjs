// tools/phase27/qa.mjs — QA فاز ۲۷: لیست خرید (۰۸) · فرم افزودن کالا (۳۴) · لیست خرید از دید فروشنده (۲۳)
// ۰۸: نام یکدست «لیست خرید» در فوتر · لینک «درخواست‌های خرید من» مشکی+آیکون+بج قرمز/سفید ·
//     کارت مینیمال عکس‌دار (~۱۰۰px، مقدار+دوره، فراداده آیکون+عدد) · گروه‌بندی · اشتراک+تنظیمات ·
//     افزودن کالا → ۳۴ (حجم+دوره) · بدون «دنبال کردن» روی قند · متن راهنمای جدید
// ۳۴: انتخاب کالا → «چقدر و چه دوره‌ای؟» · استپر +/- فارسی · افزودن → ۰۸
// ۲۳: عنوان = اسم لیست + آیکون اشتراک (بدون بج «عمومی») · چیپ شهر · تماس+پیام · آمار · ذخیرهٔ لیست ·
//     درخواست‌های خرید جاری (کارت اینستاگرامی → شیت کارت درخواست خرید) · لیست معمول با زنگولهٔ گوش به زنگ → شیت
// شیت‌ها: listset (۳ ردیف) · listedit (لوگو/نام/توضیح/نقش) · rolebuy (۴ نقش) · rolesell (۷ نقش از cedit) ·
//     lgroups (گروه‌های کالا) · alertinfo (گوش به زنگ) · reqview (کارت درخواست خرید)
// ۰۷+۳۵: کارت «لیست خریداران ذخیره‌شده» → صفحهٔ دفترچهٔ خریداران
// نام سراسری: «درخواست قیمت» → «درخواست خرید» (۰۲/۰۵/۰۹/۱۱/۱۲/۲۱/۲۸/۲۹/۳۰/۳۱/۳۲/۳۳ + فوترها «لیست خرید»)
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p27');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); ok ? pass++ : fail++; };
const hash = () => page.evaluate(() => location.hash);
const vis = async sel => !(await page.$eval(sel, el => el.hidden));

// ═══ ۰۸ — لیست خرید ═══
await page.goto(URL + '#08');
await page.waitForTimeout(600);
let t = await page.locator('#scr-08').innerText();
check('۰۸ عنوان: «لیست خرید من»', t.includes('لیست خرید من'));
check('۰۸ بدون واژهٔ «دفتر خرید» در متن', !t.includes('دفتر خرید'));

// فاز ۲۹ — بخش «درخواست‌های خرید جاری» (کارت‌های افقی + لینک «همه درخواستها» ← جایگزین باکس prqlink)
const prq = page.locator('#scr-08 .morelnk');
check('۰۸ لینک «همه درخواستها» موجود', await prq.count() === 1);
const prqInfo = await page.$eval('#scr-08 .morelnk', el => {
  const cs = getComputedStyle(el);
  return { color: cs.color, weight: cs.fontWeight, go: el.dataset.go };
});
const rfqCards = await page.$$eval('#scr-08 .bl-rfq', els => els.map(e => ({
  key: e.dataset.reqkey, img: !!e.querySelector('.bl-rfq-img img'),
  dl: e.querySelector('.dl') && e.querySelector('.dl').textContent.trim(),
  n: e.querySelector('.bl-rfq-n') && e.querySelector('.bl-rfq-n').textContent.trim()
})));
check('۰۸ دو کارت افقی جاری (rice/oil) با عکس و مهلت', rfqCards.length === 2 && rfqCards[0].key === 'rice' && rfqCards[1].key === 'oil' && rfqCards.every(c => c.img && c.dl));
check('۰۸ تعداد پیشنهاد روی کارت (۵/۳)', rfqCards[0].n.includes('۵') && rfqCards[1].n.includes('۳'));
check('۰۸ لینک «همه درخواستها» قرمز بولد (color=' + prqInfo.color + ')', prqInfo.color === 'rgb(220, 38, 38)' && prqInfo.weight === '800');
check('۰۸ لینک → ۱۱', prqInfo.go === '11');

// دکمه‌های اشتراک و تنظیمات کنار نام
check('۰۸ دکمهٔ اشتراک‌گذاری (→ sheet-contacts)', !!(await page.$('#scr-08 .sec-title [data-sheet="sheet-contacts"]')));
check('۰۸ دکمهٔ تنظیمات (→ sheet-listset)', !!(await page.$('#scr-08 .sec-title [data-sheet="sheet-listset"]')));

// افزودن کالا → ۳۴
check('۰۸ «افزودن کالا» → ۳۴', !!(await page.$('#scr-08 button[data-go="34"]')));

// گروه‌بندی
const groups = await page.$$eval('#scr-08 .bl-groups .chip', els => els.map(e => e.textContent.trim()));
check('۰۸ گروه‌بندی: همه/غلات/روغن/کنسرو', groups.join('|').includes('غلات') && groups.join('|').includes('روغن') && groups.join('|').includes('کنسرو'));
check('۰۸ مدیریت گروه‌ها (→ sheet-lgroups)', !!(await page.$('#scr-08 .chip-manage[data-sheet="sheet-lgroups"]')));

// کارت‌های مینیمال
const cards = await page.$$eval('#scr-08 .bl-card', els => els.map(e => ({
  img: !!e.querySelector('.bl-thumb img'),
  w: e.querySelector('.bl-thumb') && e.querySelector('.bl-thumb').offsetWidth,
  title: e.querySelector('.bl-t') && e.querySelector('.bl-t').textContent.trim(),
  q: e.querySelector('.bl-q') && e.querySelector('.bl-q').textContent.trim(),
  mm: e.querySelectorAll('.mm').length,
  go: e.dataset.go
})));
check('۰۸ چهار کارت مینیمال', cards.length === 4);
check('۰۸ همهٔ کارت‌ها عکس دارند', cards.every(c => c.img));
check('۰۸ عکس ~۱۰۰px (w=' + Math.min(...cards.map(c => c.w)) + '…' + Math.max(...cards.map(c => c.w)) + ')', cards.every(c => c.w >= 95 && c.w <= 105));
check('۰۸ عنوان کامل + مقدار/دوره (برنج: «۲۰ کیسهٔ ۵۰ کیلویی · ماهانه»)', cards[0].title === 'برنج هاشمی' && cards[0].q.includes('۲۰ کیسه') && cards[0].q.includes('ماهانه'));
check('۰۸ فراداده آیکون+عدد (برنج: ۳ عدد mm)', cards[0].mm === 3);
check('۰۸ کارت‌ها → لیست مقایسه ۳۳', cards.every(c => c.go === '33'));
check('۰۸ بدون «دنبال کردن» روی قند', !t.includes('دنبال کردن'));
check('۰۸ متن راهنمای جدید', t.includes('به لیست خرید شما اضافه می‌شود') && t.includes('افزودن کالا') && t.includes('مشاهده و مقایسه کنید'));
const tabs8 = await page.$$eval('#scr-08 .tabbar .tab', els => els.map(e => e.textContent.trim()));
check('۰۸ فوتر: «لیست خرید» (نه دفتر خرید)', tabs8[0] === 'لیست خرید');
await page.locator('#phone').screenshot({ path: OUT + '/08-buy-list.png' });

// شیت تنظیمات لیست خرید
await page.click('#scr-08 .sec-title [data-sheet="sheet-listset"]');
await page.waitForTimeout(400);
let ls = await page.locator('#sheet-listset').innerText();
check('sheet-listset: ۳ ردیف (تنظیمات لیست خرید / گروه‌های کالا / پیش‌نمایش عمومی)', ls.includes('تنظیمات لیست خرید') && ls.includes('گروه‌های کالا') && ls.includes('پیش‌نمایش عمومی'));
await page.locator('#phone').screenshot({ path: OUT + '/sheet-listset.png' });

// → ویرایش لیست (لوگو/نام/توضیح/نقش)
await page.click('#sheet-listset [data-sheet="sheet-listedit"]');
await page.waitForTimeout(400);
let le = await page.locator('#sheet-listedit').innerText();
check('sheet-listedit: لوگو + نام + توضیح + نقش', le.includes('لوگوی لیست خرید') && le.includes('نام لیست') && le.includes('توضیح کوتاه') && le.includes('نقش شما در کسب‌وکار'));
check('sheet-listedit: نقش فعلی «مسئول خرید»', le.includes('مسئول خرید'));
await page.locator('#phone').screenshot({ path: OUT + '/sheet-listedit.png' });

// → شیت نقش‌های خرید (۴ نقش) + انتخاب + بازگشت به شیت والد
await page.click('#sheet-listedit [data-sheet="sheet-rolebuy"]');
await page.waitForTimeout(400);
let rb = await page.locator('#sheet-rolebuy').innerText();
check('sheet-rolebuy: ۴ نقش خرید (صاحب/مدیرعامل/مسئول خرید/واسطه خرید)', rb.includes('صاحب کسب‌وکار') && rb.includes('مدیرعامل') && rb.includes('مسئول خرید') && rb.includes('واسطه خرید'));
check('sheet-rolebuy: توضیح نمایش در لیست عمومی', (await page.$eval('#sheet-rolebuy .sub', el => el.textContent)).includes('لیست خرید عمومی'));
await page.locator('#phone').screenshot({ path: OUT + '/sheet-rolebuy.png' });
await page.click('#sheet-rolebuy [data-rolepick]:has-text("واسطه خرید")');
await page.waitForTimeout(400);
const roleLbl = await page.$eval('#rolebuy-label', el => el.textContent.trim());
check('انتخاب «واسطه خرید» → برچسب به‌روز + بازگشت به شیت والد', roleLbl === 'واسطه خرید' && (await page.$eval('#sheet-listedit', el => el.classList.contains('show'))));
await page.click('#sheet-listedit [data-close]');
await page.waitForTimeout(300);

// ═══ ۳۴ — فرم افزودن کالا به لیست خرید ═══
await page.goto(URL + '#34');
await page.waitForTimeout(500);
t = await page.locator('#scr-34').innerText();
check('۳۴ عنوان: افزودن کالا · حجم و دورهٔ خرید', t.includes('افزودن کالا') && t.includes('حجم و دورهٔ خرید'));
check('۳۴ جستجو + ۳ کالا + «کالای جدید بساز»', t.includes('کالا را پیدا کن یا بساز') && t.includes('کالای جدید بساز'));
check('۳۴ «چقدر و چه دوره‌ای؟» ابتدا مخفی', !(await vis('#gqty-34')));
await page.locator('#phone').screenshot({ path: OUT + '/34-add-item.png' });
await page.click('#scr-34 [data-gpick]:has-text("برنج هاشمی")');
await page.waitForTimeout(300);
check('۳۴ انتخاب کالا → نمایش «چقدر و چه دوره‌ای؟»', await vis('#gqty-34'));
check('۳۴ کالا انتخاب‌شده هایلایت', await page.$eval('#scr-34 [data-gpick]:has-text("برنج هاشمی")', el => el.classList.contains('picked')));
// استپر: − − سپس + (۲۰→۱۸→۱۹)
await page.click('#qs-34 button:first-of-type');
await page.click('#qs-34 button:first-of-type');
await page.click('#qs-34 button:last-of-type');
const stv = await page.$eval('#qs-34', el => el.dataset.val);
check('۳۴ استپر: ۲۰ → ۱۸ → ۱۹ (data-val=' + stv + ')', stv === '19');
const stTxt = await page.$eval('#qs-34 .val', el => el.textContent.trim());
check('۳۴ استپر عدد فارسی («۱۹»)', stTxt.startsWith('۱۹'));
const t34b = await page.locator('#scr-34').innerText();
check('۳۴ دورهٔ خرید: هفتگی/دوهفتگی/ماهانه', t34b.includes('هفتگی') && t34b.includes('دوهفتگی') && t34b.includes('ماهانه'));
await page.locator('#phone').screenshot({ path: OUT + '/34-qty.png' });
await page.click('#scr-34 .action-bar button');
await page.waitForTimeout(350);
check('۳۴ «افزودن به لیست خرید» → بازگشت به ۰۸', (await hash()) === '#08' && (await vis('#scr-08')));

// ═══ ۰۸ → ۱۱ (لینک) ═══
await page.goto(URL + '#08');
await page.waitForTimeout(400);
await page.click('#scr-08 .morelnk');
await page.waitForTimeout(350);
check('۰۸ کلیک لینک → صفحهٔ ۱۱', (await hash()) === '#11' && (await vis('#scr-11')));
t = await page.locator('#scr-11').innerText();
check('۱۱ عنوان جدید: «درخواست‌های خرید من»', t.includes('درخواست‌های خرید من'));
check('۱۱ بدون «درخواست‌های قیمت من»', !t.includes('درخواست‌های قیمت من'));
check('۱۱ مهلت: «۳ روز مانده» + «امروز آخرین روز»', t.includes('۳ روز مانده') && t.includes('امروز آخرین روز'));

// ═══ ۱۲ — عنوان جدید ═══
await page.goto(URL + '#12');
await page.waitForTimeout(400);
t = await page.locator('#scr-12').innerText();
check('۱۲ عنوان: «درخواست خرید» + ارسال به چند تأمین‌کننده', t.includes('درخواست خرید') && t.includes('ارسال به چند تأمین‌کننده'));
check('۱۲ لجند: «درخواست‌های خرید من»', t.includes('درخواست‌های خرید من'));

// ═══ ۲۳ — لیست خرید از دید فروشنده ═══
await page.goto(URL + '#23');
await page.waitForTimeout(500);
t = await page.locator('#scr-23').innerText();
const t23all = await page.$eval('#scr-23', el => el.textContent);
check('۲۳ عنوان: «لیست خرید سوپرمارکت آریا»', t.includes('لیست خرید سوپرمارکت آریا'));
check('۲۳ بدون «پیش‌نمایش عمومی» در هدر', !(await page.$eval('#scr-23 .subheader .ttl', el => el.textContent)).includes('پیش‌نمایش'));
check('۲۳ بدون بج «عمومی» و جملهٔ حذف‌شده', !t.includes('هرچه لیستت کامل‌تر باشد') && (await page.$$eval('#scr-23 .subheader .badge', els => els.length === 0)));
check('۲۳ آیکون اشتراک در هدر (→ sheet-contacts)', !!(await page.$('#scr-23 .subheader [data-sheet="sheet-contacts"]')));
check('۲۳ چیپ شهر رشت با آیکون لوکیشن', !!(await page.$('#scr-23 .city-chip')) && t23all.includes('رشت'));
check('۲۳ تماس + پیام + ذخیرهٔ لیست در یک ردیف (فاز ۲۹)', t.includes('تماس') && t.includes('پیام') && t.includes('ذخیرهٔ لیست'));
check('۲۳ سه دکمه در یک contact-row', (await page.$$eval('#scr-23 .contact-row .btn', els => els.length)) === 3);
check('۲۳ بدون نوار top-act جداگانه', (await page.$$('#scr-23 .top-act')).length === 0);
check('۲۳ آمار: ۴ کالا · ۱۲ ذخیره‌کننده · ۸۶ بازدید', t.includes('۴') && t.includes('۱۲') && t.includes('۸۶'));
check('۲۳ دکمهٔ «ذخیرهٔ لیست»', t.includes('ذخیرهٔ لیست'));
check('۲۳ دو بخش: «درخواست‌های خرید جاری» + «لیست خرید»', t.includes('درخواست‌های خرید جاری') && t.includes('لیست خرید'));
await page.locator('#phone').screenshot({ path: OUT + '/23-list-public.png' });

// کارت‌های اینستاگرامی
const rfqs = await page.$$eval('#scr-23 .rfq-card', els => els.map(e => ({
  img: !!e.querySelector('.rfq-img img'),
  dl: e.querySelector('.dl') && e.querySelector('.dl').textContent.trim(),
  t: e.querySelector('.rfq-t').textContent.trim(),
  q: e.querySelector('.rfq-q').textContent.trim()
})));
check('۲۳ دو کارت اینستاگرامی با عکس', rfqs.length === 2 && rfqs.every(r => r.img));
check('۲۳ مهلت روی کارت (۳ روز مانده / امروز آخرین روز)', rfqs[0].dl.includes('۳ روز مانده') && rfqs[1].dl.includes('امروز آخرین روز'));
check('۲۳ مقدار مورد نیاز زیر عکس', rfqs[0].q.includes('۲۰ کیسه') && rfqs[1].q.includes('۴۰ عدد'));
await page.click('#scr-23 .rfq-card:first-child');
await page.waitForTimeout(400);
let rv = await page.locator('#sheet-reqview').innerText();
check('۲۳ لمس کارت → شیت «درخواست خرید — برنج هاشمی»', rv.includes('درخواست خرید — برنج هاشمی'));
check('۲۳ شیت: مقدار + مهلت + دوره + ارسال پیشنهاد قیمت', rv.includes('مقدار مورد نیاز') && rv.includes('۳ روز مانده') && rv.includes('دورهٔ خرید') && rv.includes('ارسال پیشنهاد قیمت'));
await page.locator('#phone').screenshot({ path: OUT + '/sheet-reqview.png' });
await page.click('#sheet-reqview [data-close]');
await page.waitForTimeout(300);

// زنگولهٔ گوش به زنگ
const bells = await page.$$eval('#scr-23 .alert-bell', els => els.map(e => e.classList.contains('on')));
check('۲۳ زنگوله روی ۴ ردیف (اولی فعال)', bells.length === 4 && bells[0] === true && bells.slice(1).every(b => !b));
await page.click('#scr-23 .alert-bell:not(.on)');
await page.waitForTimeout(400);
let ai = await page.locator('#sheet-alertinfo').innerText();
check('۲۳ زنگوله → شیت گوش به زنگ با متن دقیق مالک', ai.includes('گوش به زنگ') && ai.includes('درخواست‌های خرید این خریدار را در بخش «گوش به زنگ» دستیار فروش خود خواهید دید'));
await page.locator('#phone').screenshot({ path: OUT + '/sheet-alertinfo.png' });
await page.click('#sheet-alertinfo [data-alerton]');
await page.waitForTimeout(300);
const bells2 = await page.$$eval('#scr-23 .alert-bell', els => els.map(e => e.classList.contains('on')));
check('۲۳ فعال‌سازی → زنگوله سبز شد', bells2.filter(Boolean).length === 2);

// ذخیرهٔ لیست (فاز ۲۹: دکمهٔ فشرده در ردیف سه‌اکشنی — متن کوتاه)
await page.click('#scr-23 [data-savelist]');
await page.waitForTimeout(300);
const savedTxt = await page.$eval('#scr-23 [data-savelist]', el => el.textContent.trim());
check('۲۳ «ذخیرهٔ لیست» → «ذخیره شد» (فشرده)', savedTxt.includes('ذخیره شد') && savedTxt.includes('لیست خریداران') === false);

// ═══ ۰۷ — کارت دفترچهٔ خریداران ═══
await page.goto(URL + '#07');
await page.waitForTimeout(500);
t = await page.locator('#scr-07').innerText();
check('۰۷ کارت «لیست خریداران ذخیره‌شده»', t.includes('لیست خریداران ذخیره‌شده'));
await page.locator('#phone').screenshot({ path: OUT + '/07-sell-profile.png' });
await page.click('#scr-07 [data-go="35"]');
await page.waitForTimeout(350);
check('۰۷ → صفحهٔ ۳۵', (await hash()) === '#35' && (await vis('#scr-35')));
t = await page.locator('#scr-35').innerText();
check('۳۵ دفترچهٔ خریداران: جستجو + ۲ خریدار + گوش به زنگ', t.includes('جستجوی نام خریدار') && t.includes('سوپرمارکت آریا') && t.includes('رستوران مهر') && t.includes('گوش به زنگ'));
check('۳۵ چیپ شهر (رشت/تهران)', (await page.$eval('#scr-35', el => el.textContent)).includes('رشت') && !!(await page.$('#scr-35 .city-chip')));
await page.locator('#phone').screenshot({ path: OUT + '/35-saved-buyers.png' });
await page.click('#scr-35 .row-card:first-child');
await page.waitForTimeout(350);
check('۳۵ ردیف خریدار → لیست او (۲۳)', (await hash()) === '#23' && (await vis('#scr-23')));

// ═══ sheet-cedit — نقش فروش ═══
await page.goto(URL + '#01');
await page.waitForTimeout(400);
await page.click('#scr-01 [data-sheet="sheet-cset"]');
await page.waitForTimeout(350);
await page.click('#sheet-cset [data-sheet="sheet-cedit"]');
await page.waitForTimeout(350);
let ce = await page.locator('#sheet-cedit').innerText();
check('sheet-cedit: فیلد «نقش شما در کسب‌وکار» فروش', ce.includes('نقش شما در کسب‌وکار'));
await page.click('#sheet-cedit [data-sheet="sheet-rolesell"]');
await page.waitForTimeout(350);
let rs = await page.locator('#sheet-rolesell').innerText();
check('sheet-rolesell: ۷ نقش فروش (صاحب/مدیرعامل/مدیر فروش/فروشنده/ویزیتور/بازاریاب/واسطه فروش)',
  rs.includes('صاحب کسب‌وکار') && rs.includes('مدیرعامل') && rs.includes('مدیر فروش') && rs.includes('فروشنده') && rs.includes('ویزیتور') && rs.includes('بازاریاب') && rs.includes('واسطه فروش'));
await page.locator('#phone').screenshot({ path: OUT + '/sheet-rolesell.png' });
await page.click('#sheet-rolesell [data-rolepick]:has-text("مدیر فروش")');
await page.waitForTimeout(350);
const sellLbl = await page.$eval('#rolesell-label', el => el.textContent.trim());
check('انتخاب «مدیر فروش» → برچسب cedit به‌روز', sellLbl === 'مدیر فروش');
await page.click('#sheet-cedit [data-close]');
await page.waitForTimeout(300);

// ═══ sheet-lgroups ═══
await page.goto(URL + '#08');
await page.waitForTimeout(400);
await page.click('#scr-08 .chip-manage');
await page.waitForTimeout(350);
let lg = await page.locator('#sheet-lgroups').innerText();
check('sheet-lgroups: غلات/روغن/کنسرو + افزودن گروه کالا', lg.includes('غلات') && lg.includes('روغن') && lg.includes('کنسرو') && lg.includes('افزودن گروه کالا'));
await page.locator('#phone').screenshot({ path: OUT + '/sheet-lgroups.png' });
await page.click('#sheet-lgroups [data-close]');
await page.waitForTimeout(300);

// ═══ نام سراسری «درخواست خرید» — نمونه‌ها ═══
// فاز ۲۸: ۳۱ عمداً هیچ‌کدام را ندارد (دکمه‌های کمپین → تماس/پیام) — فقط «درخواست قیمت» نباید باشد
for (const [scr, needle] of [['02', 'درخواست خرید'], ['09', 'درخواست خرید'], ['05', 'درخواست خرید'], ['28', 'درخواست خرید'], ['33', 'درخواست خرید'], ['21', 'درخواست']]) {
  await page.goto(URL + '#' + scr);
  await page.waitForTimeout(400);
  const txt = await page.$eval('#scr-' + scr, el => el.textContent);
  const ok = txt.includes(needle) && !txt.includes('درخواست قیمت');
  check(scr + ' واژهٔ واحد «درخواست خرید» (بدون «درخواست قیمت»)', ok);
}
await page.goto(URL + '#31');
await page.waitForTimeout(350);
check('31 بدون «درخواست قیمت» (دکمه‌های کمپین فاز ۲۸: تماس/پیام)', !(await page.$eval('#scr-31', el => el.textContent)).includes('درخواست قیمت'));
// فوتر همهٔ صفحات خرید
for (const scr of ['10', '14', '18', '31']) {
  await page.goto(URL + '#' + scr);
  await page.waitForTimeout(350);
  const foot = await page.$eval('#scr-' + scr + ' .tabbar', el => el.textContent);
  check(scr + ' فوتر: «لیست خرید» + بدون «پیشنهادها»', foot.includes('لیست خرید') && !foot.includes('پیشنهادها'));
}

// ═══ e2e — همهٔ صفحه‌ها بدون خطای کنسول ═══
const ALL = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','d1','d2','d3'];
let allShown = true;
for (const id of ALL) {
  await page.goto(URL + '#' + id);
  await page.waitForTimeout(260);
  const shown = await page.$eval('#scr-' + id, el => !el.hidden);
  if (!shown) { check('e2e ' + id + ' نمایش', false); allShown = false; }
}
check('e2e همهٔ ۳۸ صفحهٔ نمایش داده شدند (۰۱–۳۵ + d1–d3)', allShown);
check('بدون خطای کنسول/JS (' + errors.length + ')', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 6).join('\n'));

await browser.close();
console.log('\n═══ نتیجه: ' + pass + ' PASS · ' + fail + ' FAIL ═══');
process.exit(fail ? 1 : 0);
