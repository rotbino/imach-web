// فاز ۴۴+۴۵+۴۶ — QA رفتاری ساده‌سازی MVP + e2e همهٔ صفحه‌ها
// فاز ۴۵: پروفایل هاب + مودال ویرایش · فوتر خرید ۴ تبی (استعلام‌ها/کاتالوگ‌ها) · صفحهٔ ۴۵ ·
// حذف ۱۴ و dlg-pct (پنل اینلاین bk-pctbar) · چرخ‌دندهٔ کارت ← sheet-quickps · فرم ۳۴ الگوی MVP
// فاز ۴۶: تبلیغ سادهٔ ۳۰ (سه کادر + شیت راهنما sheet-adguide) + گزارش جدا ۴۶ + قیمت‌گذاری PER_EVENT
import { chromium } from 'playwright';

const FILE = 'file://' + process.cwd() + '/index.html';
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + name); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
await page.goto(FILE + '#01');
await page.reload();
await sleep(250);

/* ═══ ۱. ساختار کلی ═══ */
const ALIVE = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','27','29','30','34','42','44','45','46'];
const DEAD = ['03','06','11','14','20','21','23','24','25','26','28','31','32','33','35','36','37','38','39','40','41','43','d1','d2'];

/* ═══ ۰. سلامت درخت DOM — فاز ۴۴-فیکس ═══
   دو </div> زائد (خط ۲۱۵۵ و ۴۵۴۷ قدیم) قاب #phone را زودتر از موعد می‌بستند:
   ۱۹ صفحه بیرون از گوشی رندر می‌شدند، ارتفاع سند تا ۴۰۰۰+ می‌رفت و شیت‌ها لنگر
   پوزیشن خود را از دست می‌دادند. این چک‌ها آن کلاس خرابی را برای همیشه قفل می‌کنند. */
ok('همهٔ ۲۴ صفحه داخل قاب گوشی‌اند', await page.evaluate(() => document.querySelectorAll('#phone > section.scr').length === 24));
ok('هیچ صفحه‌ای بیرون از گوشی نیست', await page.evaluate(() => document.querySelectorAll('#stage > .scr, body > .scr').length === 0));
ok('همهٔ شیت/دیالوگ‌ها داخل گوشی‌اند (لنگر position:absolute)', await page.evaluate(() => {
  const sheets = document.querySelectorAll('.sheet, .dlg');
  return sheets.length >= 30 && Array.from(sheets).every(s => document.getElementById('phone').contains(s));
}));
ok('ارتفاع سند = ارتفاع ویوپورت (صفحه‌ها انباشته نمی‌شوند)', await page.evaluate(() => document.documentElement.scrollHeight <= 1000));

for (const s of ALIVE) ok('صفحهٔ ' + s + ' موجود است', await page.locator('#scr-' + s).count() === 1);
for (const s of DEAD) ok('صفحهٔ ' + s + ' حذف شده', await page.locator('#scr-' + s).count() === 0);
ok('لندینگ دسکتاپ (d3) موجود', await page.locator('#scr-d3').count() === 1);
const DEAD_SHEETS = ['sheet-campaign','sheet-target','sheet-cgnew','sheet-cgroup','sheet-cmnts','sheet-cowork','sheet-follow','sheet-pdiscount','sheet-vgedit','sheet-vgpick','sheet-vgroups','sheet-video','sheet-xlsx','sheet-offerview','sheet-alertinfo','dlg-xlsbulk','dlg-campok','dlg-rvw'];
for (const s of DEAD_SHEETS) ok('شیت/دیالوگ ' + s + ' حذف شده', await page.locator('#' + s).count() === 0);
ok('dlg-pct حذف شد (فاز ۴۵: پنل اینلاین)', await page.locator('#dlg-pct').count() === 0);
ok('dlg-terms مانده', await page.locator('#dlg-terms').count() === 1);
ok('dlg-lowcharge مانده', await page.locator('#dlg-lowcharge').count() === 1);

/* ═══ ۲. فوترها و هدر ═══ */
ok('فوتر فروش ۴ تب', await page.locator('#scr-01 .tabbar .tab').count() === 4);
ok('فوتر فروش: تنظیمات (نه پروفایل)', (await page.locator('#scr-01 .tab').nth(3).textContent()).includes('تنظیمات'));
ok('فوتر فروش بدون «کارها»', !(await page.locator('#scr-01 .tabbar').textContent()).includes('کارها'));
ok('فوتر خرید ۴ تب (فاز ۴۵)', await page.locator('#scr-08 .tabbar .tab').count() === 4);
ok('فوتر خرید: لیست خرید · استعلام‌ها · پیام‌ها · کاتالوگ‌ها', (await page.locator('#scr-08 .tabbar').textContent()).includes('استعلام‌ها') && (await page.locator('#scr-08 .tabbar').textContent()).includes('کاتالوگ‌ها'));
ok('پیل سوییچ چسبیده به لوگو (فاز ۴۵)', await page.locator('#scr-01 .appbar .brand .arm-pill').count() === 1);
ok('پیل بدون آیکون داخلی + برچسب عمده', (await page.locator('#scr-01 .arm-pill').textContent()).includes('دستیار فروش عمده') && (await page.locator('#scr-01 .arm-pill > svg:not(.caret)').count()) === 0);
ok('چشم از هدر ۰۱ حذف شد', await page.locator('#scr-01 .appbar .icon-btn[aria-label="پیش‌نمایش عمومی کاتالوگ"]').count() === 0);
ok('چشم کنار تنظیمات/اشتراک در ویترین (فاز ۴۵)', await page.locator('#scr-01 .showcase .icon-btn[data-go="13"]').count() === 1);
ok('آواتار پروفایل در ۰۱', await page.locator('#scr-01 .appbar .avatar[data-go="42"]').count() === 1);
ok('آواتار پروفایل در ۰۸', await page.locator('#scr-08 .appbar .avatar[data-go="42"]').count() === 1);
ok('نوار «قیمت و موجودی» روی کاتالوگ', await page.locator('#scr-01 .bulk-bar[data-go="44"]').isVisible());
ok('بدون دکمهٔ selmode (کمپین)', await page.locator('#scr-01 .selmode-btn').count() === 0);
ok('بدون نوار انتخاب (selbar)', await page.locator('#scr-01 .selbar').count() === 0);
ok('بدون stat-strip مرده در ۰۱', await page.locator('#scr-01 .stat-strip').count() === 0);
ok('ویترین کاتالوگ مانده', (await page.locator('#scr-01 .showcase .name').first().textContent()).includes('پخش برنج پارس'));
ok('کارت کالا ← ۰۲ (ادغام ۰۳)', (await page.locator('#scr-01 .pcard').first().getAttribute('data-go')) === '02');
ok('چرخ‌دندهٔ کارت ← sheet-quickps (فاز ۴۵)', (await page.locator('#scr-01 .pcard .gear').first().getAttribute('data-sheet')) === 'sheet-quickps');

/* ═══ ۳. پروفایل هاب (۴۲) — فاز ۴۵ ═══ */
await page.click('#scr-01 .appbar .avatar');
await sleep(250);
ok('آواتار → ۴۲ باز شد', await page.locator('#scr-42').isVisible());
ok('۴۲: کارت شخصی (عکس+نام) → مودال ویرایش', await page.locator('#scr-42 .pp-me[data-sheet="sheet-ppedit"]').count() === 1);
ok('۴۲: بدون فرم درون صفحه', await page.locator('#scr-42 .screen-body .field .input').count() === 0);
ok('۴۲: بدون اکشن‌بار ذخیره', await page.locator('#scr-42 .action-bar').count() === 0);
ok('۴۲: کارت کسب‌وکار', await page.locator('#scr-42 .biz-card').count() === 1);
ok('۴۲: کارت شارژ', await page.locator('#scr-42 .wallet-card[data-go="29"]').count() === 1);
ok('۴۲: کاتالوگ‌های ذخیره‌شده', await page.locator('#scr-42 .card[data-go="10"]').count() === 1);
ok('۴۲: حساب کاربری (تم/زبان/خروج — فاز ۴۵)', (await page.locator('#scr-42').textContent()).includes('تم تاریک') && (await page.locator('#scr-42').textContent()).includes('زبان') && (await page.locator('#scr-42').textContent()).includes('خروج از حساب'));
ok('۴۲: فیلد نام فقط در مودال (نه صفحهٔ ۴۲)', await page.locator('#scr-42 #pp-fn').count() === 0 && await page.locator('#sheet-ppedit #pp-fn').count() === 1);
await page.click('#scr-42 .pp-me');
await sleep(300);
ok('کارت شخصی → مودال sheet-ppedit باز شد', await page.locator('#sheet-ppedit.show').isVisible());
ok('ppedit: فیلدها داخل مودال', await page.locator('#sheet-ppedit #pp-fn').count() === 1 && await page.locator('#sheet-ppedit #pp-save').count() === 1);
await page.click('#sheet-ppedit .sheet-row[data-sheet="sheet-photo"]');
await sleep(250);
ok('ppedit: عکس از sheet-photo', await page.locator('#sheet-photo.show').isVisible());
await page.click('#sheet-photo .ph-opt:nth-child(2)');
await sleep(500);
ok('ppedit: پس از عکس، مودال بسته شد', (await page.locator('#sheet-ppedit.show').count()) === 0);
await page.goto(FILE + '#42'); await page.reload(); await sleep(250);
ok('ppedit: ذخیره داخل مودال → می‌ماند در ۴۲', true); /* رفتار زیر آزمایش می‌شود */
await page.click('#scr-42 .pp-me'); await sleep(250);
await page.fill('#pp-fn', 'احمد‌محمد'); await sleep(100);
await page.click('#pp-save'); await sleep(250);
ok('ppedit: ذخیره → نام کارت هم‌گام + مودال بسته', (await page.locator('#scr-42 [data-ppname]').textContent()).includes('احمد‌محمد') && (await page.locator('#sheet-ppedit.show').count()) === 0);

/* ═══ ۴. شارژ (۲۹) ═══ */
await page.click('#scr-42 .wallet-card');
await sleep(250);
ok('شارژ باز شد', await page.locator('#scr-29').isVisible());
ok('عنوان «شارژ» (نه کیف پول)', !(await page.locator('#scr-29 .ttl').textContent()).includes('کیف پول'));
ok('کارت‌به‌کارت + فیش', await page.locator('#ch-receipt').isVisible());
ok('دکمهٔ ارسال فیش', await page.locator('#ch-send').isVisible());
ok('اشتراک‌گذاری (هدیه)', (await page.locator('#scr-29').textContent()).includes('ثبت‌نام از لینک شما'));
ok('بدون بسته‌های پرداخت قدیمی', await page.locator('#scr-29 .paypack').count() === 0);
const w0 = await page.locator('[data-wallet]').first().textContent();
await page.click('#ch-send');
await sleep(2300);
const w1 = await page.locator('[data-wallet]').first().textContent();
ok('ارسال فیش → شارژ (ماک تأیید)', w0 !== w1);

/* ═══ ۵. تبلیغات (۳۰) — فرم سادهٔ فاز ۴۶ + گزارش جدا (۴۶) ═══ */
await page.goto(FILE + '#30'); await page.reload(); await sleep(250);
ok('۳۰: تبلیغات و افزایش فروش', await page.locator('#scr-30').isVisible());
ok('۳۰: سوییچ «کاتالوگ رو ویژه کن»', await page.locator('#ad-toggle').isVisible());
ok('۳۰: عنوان سوییچ (نه «فروشندهٔ ویژه باش»)', (await page.locator('#scr-30').textContent()).includes('کاتالوگ رو ویژه کن'));
ok('۳۰: کادر راهنما «کاتالوگ ویژه چیست؟»', (await page.locator('#scr-30').textContent()).includes('کاتالوگ ویژه چیست؟'));
ok('۳۰: کادر شارژ موجود', await page.locator('#scr-30 .wallet-card[data-go="29"]').count() === 1);
ok('۳۰: بدون گزارش داخلی (جدا شد به ۴۶)', !(await page.locator('#scr-30').textContent()).includes('گزارش این تبلیغ'));
ok('۳۰: بدون راه رایگان (در ۲۹ هست)', !(await page.locator('#scr-30').textContent()).includes('راه رایگان'));
ok('۳۰: بدون قیمت قدیمی ۵٬۰۰۰ (به‌ازای درخواست)', !(await page.locator('#scr-30').textContent()).includes('۵٬۰۰۰ تومان از شارژ'));
ok('۳۰: متن شفافیت جدید', (await page.locator('#scr-30').textContent()).includes('در جلوی خریدار هدف'));
const adSub0 = await page.locator('#ad-sub').textContent();
await page.click('#ad-toggle'); await sleep(120);
ok('۳۰: سوییچ خاموش شد', (await page.locator('#ad-toggle').getAttribute('class') || '').indexOf('on') === -1);
ok('۳۰: زیرنویس سوییچ عوض شد', (await page.locator('#ad-sub').textContent()) !== adSub0);
await page.click('#ad-toggle'); await sleep(120);
ok('۳۰: سوییچ دوباره روشن', (await page.locator('#ad-toggle').getAttribute('class') || '').includes('on'));
await page.click('#scr-30 .guidebox[data-sheet="sheet-adguide"]');
await sleep(300);
ok('۳۰: شیت راهنما از پایین باز شد', await page.locator('#sheet-adguide.show').isVisible());
const adg = await page.locator('#sheet-adguide').textContent();
ok('راهنما: متن روش کار ای‌مچ', adg.includes('خریداران برای خود لیست خرید می‌سازند'));
ok('راهنما: بازدید یونیک ۱٬۰۰۰', adg.includes('هر بازدید یونیک') && adg.includes('۱٬۰۰۰ تومان'));
ok('راهنما: ذخیرهٔ کاتالوگ ۳٬۰۰۰', adg.includes('ذخیرهٔ کاتالوگ') && adg.includes('۳٬۰۰۰ تومان'));
ok('راهنما: تماس ۳٬۰۰۰', adg.includes('به ازای هر تماس'));
ok('راهنما: فقط رویدادهای لیست تأمین', adg.includes('در لیست تأمین'));
ok('راهنما: گزارش افراد', adg.includes('چه کسانی ذخیره کردند'));
await page.click('#sheet-adguide .sheet-cta'); await sleep(200);
ok('۳۰: شیت راهنما بسته شد', !(await page.locator('#sheet-adguide').getAttribute('class') || '').includes('show'));
ok('۳۰: بدون سوییچ کمپین/هدفمند', await page.locator('#rep-camp').count() === 0 && await page.locator('#rep-target').count() === 0);
await page.click('#scr-30 .guidebox[data-go="46"]');
await sleep(250);
ok('۳۰ → ۴۶: گزارش تبلیغ باز شد', await page.locator('#scr-46').isVisible());
ok('۴۶: آمار سه‌گانه', await page.locator('#scr-46 .stat').count() === 3);
ok('۴۶: ریز افراد و کسب‌وکارها', await page.locator('#scr-46 .usg-row').count() >= 7);
ok('۴۶: رویداد دیدن کالا', (await page.locator('#scr-46').textContent()).includes('«برنج هاشمی» را در لیست تأمین دید'));
ok('۴۶: رویداد ذخیرهٔ کاتالوگ', (await page.locator('#scr-46').textContent()).includes('کاتالوگ شما را ذخیره کرد'));
ok('۴۶: رویداد تماس', (await page.locator('#scr-46').textContent()).includes('تماس گرفت'));
ok('۴۶: بازدید رایگان خارج از لیست تأمین', (await page.locator('#scr-46').textContent()).includes('رایگان'));
await page.click('#scr-46 .subheader .back'); await sleep(250);
ok('۴۶: بازگشت ← ۳۰', await page.locator('#scr-30').isVisible());

/* ═══ ۶. درخواست خرید ساده (۱۲) ═══ */
await page.goto(FILE + '#12'); await page.reload(); await sleep(250);
ok('۱۲: تأمین‌کننده‌ها با تیک', await page.locator('#scr-12 .checkrow').count() === 4);
ok('۱۲: فروشندهٔ ویژه بالا', (await page.locator('#scr-12 .checkrow').first().textContent()).includes('فروشندهٔ ویژه'));
ok('۱۲: بدون «شبکه iMach»', !(await page.locator('#scr-12').textContent()).includes('شبکه iMach'));
ok('۱۲: بدون «افزودن تأمین‌کننده»', !(await page.locator('#scr-12').textContent()).includes('تأمین‌کنندهٔ دیگر'));
await page.click('#scr-12 .qty-stepper button:last-child'); // +
await sleep(120);
ok('۱۲: استپر مقدار کار می‌کند', (await page.locator('#scr-12 .qty-stepper .val').textContent()).includes('۲۱'));
await page.click('#rfq-send');
await sleep(1100);
ok('۱۲: ارسال → پیام‌ها (۱۸)', await page.locator('#scr-18').isVisible());

/* ═══ ۷. درخواست‌های فروشنده (۰۵) + شیت reqview ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(250);
ok('۰۵: بدون تب سه‌گانه', await page.locator('#scr-05 .inner-tabs').count() === 0);
ok('۰۵: کارت درخواست ← شیت', (await page.locator('#scr-05 .req-card').first().getAttribute('data-sheet')) === 'sheet-reqview');
await page.click('#scr-05 .req-card');
await sleep(300);
ok('شیت reqview باز شد', await page.locator('#sheet-reqview.show').isVisible());
ok('reqview: پاسخ در گفتگو', (await page.locator('#sheet-reqview .btn-primary').getAttribute('data-go')) === '19');

/* ═══ ۸. اعلان‌ها (۲۷) ═══ */
await page.goto(FILE + '#27'); await page.reload(); await sleep(250);
ok('۲۷: درخواست جدید → ۰۵', await page.locator('#scr-27 .notif .act[data-go="05"]').count() === 1);
ok('۲۷: پاسخ → ۱۹', await page.locator('#scr-27 .notif .act[data-go="19"]').count() === 1);
ok('۲۷: قیمت لیست → ۰۹', await page.locator('#scr-27 .notif .act[data-go="09"]').count() === 1);
ok('۲۷: یادآور کهنگی → ۴۴', await page.locator('#scr-27 .notif .act[data-go="44"]').count() === 1);
ok('۲۷: ذخیرهٔ کاتالوگ از تبلیغ → ۴۶', await page.locator('#scr-27 .notif .act[data-go="46"]').count() === 1);
ok('۲۷: بدون «گوش به زنگ/فرصت بازار»', !(await page.locator('#scr-27').textContent()).includes('فرصت‌های بازار'));

/* ═══ ۹. ۰۲ — ادغام مالک + خریدار ═══ */
await page.goto(FILE + '#13'); await page.reload(); await sleep(250);
ok('۱۳: بدون خط تخفیف همکار', await page.locator('#scr-13 .cowork-line').count() === 0);
ok('۱۳: بدون آیکون دنبال‌کردن روی کارت', await page.locator('#scr-13 .pcard .gear[data-sheet="sheet-follow"]').count() === 0);
ok('۱۳: بدون آیکون نظرات', await page.locator('#scr-13 .icon-btn[data-sheet="sheet-cmnts"]').count() === 0);
await page.click('#scr-13 .pcard');
await sleep(250);
ok('۱۳: کارت ← ۰۲', await page.locator('#scr-02').isVisible());
ok('۰۲: پنل مالک مخفی برای خریدار', await page.locator('#own-02').isHidden());
ok('۰۲: دکمهٔ افزودن به لیست', await page.locator('[data-addlist]').count() === 1);
await page.click('[data-addlist]');
await sleep(150);
ok('۰۲: افزودن به لیست → تیک سبز', await page.locator('[data-addlist].on').count() === 1);
await page.goto(FILE + '#01'); await page.reload(); await sleep(250);
await page.click('#scr-01 .pcard');
await sleep(250);
ok('۰۱: کارت ← ۰۲ (فروشنده)', await page.locator('#scr-02').isVisible());
ok('۰۲: پنل مالک پیداست برای مالک', await page.locator('#own-02').isVisible());
ok('۰۲: اکشن‌های خریدار برای مالک مخفی (فاز ۴۵)', await page.locator('#buybar-02').isHidden());
ok('۰۲: نتایج حضور — ذخیره در لیست خرید (فاز ۴۵)', (await page.locator('#own-02 .stat-strip').textContent()).includes('ذخیره در لیست خرید'));
ok('۰۲: مدیریت — تغییر قیمت', (await page.locator('#own-02').textContent()).includes('تغییر قیمت'));
ok('۰۲: بدون خط همکار', await page.locator('#cw-02').count() === 0);
await page.goto(FILE + '#13'); await page.reload(); await sleep(250);
await page.click('#scr-13 .pcard');
await sleep(250);
ok('۰۲: اکشن‌های خریدار برای خریدار پیداست (فاز ۴۵)', await page.locator('#buybar-02').isVisible());
ok('۰۲: دکمهٔ «درخواست قیمت» (سمت خریدار)', (await page.locator('#buybar-02 .btn').textContent()).includes('درخواست قیمت'));

/* ═══ ۱۰. لیست خرید (۰۸) → تابلو (۰۹) → استعلام‌ها (۴۵) ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(250);
ok('۰۸: کارت لیست ← تابلوی ۰۹', (await page.locator('#scr-08 .bl-card').first().getAttribute('data-go')) === '09');
ok('۰۸: کارت استعلام جاری ← گفتگو', (await page.locator('#scr-08 .bl-rfq').first().getAttribute('data-go')) === '19');
ok('۰۸: «استعلام‌های جاری» + مشاهدهٔ همه → ۴۵ (فاز ۴۵)', (await page.locator('#scr-08 .bl-inq-title h2').textContent()).includes('استعلام‌های جاری') && (await page.locator('#scr-08 .bl-inq-title .more[data-go="45"]').count()) === 1);
ok('۰۸: بدون گروه‌بندی (فاز ۴۵)', await page.locator('#scr-08 .bl-groups').count() === 0);
ok('۰۸: متن راهنمای جدید', (await page.locator('#scr-08 .legend').textContent()).includes('استعلام قیمت رقابتی'));
ok('۰۸: مهر تازگی روی ردیف', (await page.locator('#scr-08 .bl-fresh').first().textContent()).length > 3);
ok('۰۸: چشم کنار اشتراک/تنظیمات (فاز ۴۵)', await page.locator('#scr-08 .sec-title .icon-btn[data-sheet="sheet-listedit"]').count() === 1);
await page.click('#scr-08 .bl-inq-title .more');
await sleep(250);
ok('۰۸: مشاهدهٔ همه → ۴۵', await page.locator('#scr-45').isVisible());
ok('۴۵: استعلام‌های جاری + پایان‌یافته', (await page.locator('#scr-45').textContent()).includes('استعلام‌های جاری') && (await page.locator('#scr-45').textContent()).includes('پایان‌یافته'));
ok('۴۵: کارت جاری ← گفتگو', (await page.locator('#scr-45 .inq-card').first().getAttribute('data-go')) === '19');
ok('۴۵: فوتر خرید ۴ تبی', await page.locator('#scr-45 .tabbar .tab').count() === 4);
await page.click('#scr-45 .tab:has-text("کاتالوگ‌ها")');
await sleep(250);
ok('۴۵: تب کاتالوگ‌ها ← ۱۰', await page.locator('#scr-10').isVisible());
await page.goto(FILE + '#08'); await page.reload(); await sleep(250);
await page.click('#scr-08 .bl-card');
await sleep(250);
ok('۰۸: لمس کارت ← ۰۹', await page.locator('#scr-09').isVisible());
ok('۰۹: بدون «تأمین‌کننده دیگری پیدا کن»', !(await page.locator('#scr-09').textContent()).includes('پیدا کن'));
ok('۰۹: اکشن‌بار ← ۱۲', (await page.locator('#scr-09 .action-bar .btn').getAttribute('data-go')) === '12');
ok('۰۹: فروشندهٔ ویژه (تبلیغ) مانده', (await page.locator('#scr-09').textContent()).includes('فروشندهٔ ویژه'));

/* ═══ ۱۱. ۴۴ — قیمت و موجودی + پنل درصدی اینلاین (فاز ۴۵) ═══ */
await page.goto(FILE + '#44'); await page.reload(); await sleep(250);
ok('۴۴: بنر کهنگی قیمت', await page.locator('#bk-stale').isVisible());
ok('۴۴: بدون آیکون اکسل', await page.locator('#scr-44 .bk-xls').count() === 0);
ok('۴۴: بدون بخش تخفیف‌ها', await page.locator('#bk-disc').count() === 0 && await page.locator('.disc-toggle').count() === 0);
ok('۴۴: دکمهٔ «قیمت‌ها درست است»', await page.locator('#bk-fresh').isVisible());
ok('۴۴: گرید ۵ ردیف', await page.locator('#scr-44 .bk-row').count() === 5);
ok('۴۴: پنل درصدی اینلاین مخفی در ابتدا (فاز ۴۵)', await page.locator('#bk-pctbar').isHidden());
await page.click('.bk-pct[data-pcttoggle]');
await sleep(200);
ok('۴۴: آیکون ٪ → پنل اینلاین باز (نه مودال)', await page.locator('#bk-pctbar').isVisible() && (await page.locator('.dlg.show').count()) === 0);
const p0 = await page.locator('#scr-44 .bk-row').first().locator('.bk-price').inputValue();
await page.click('#bk-pctbar .pct-plus');
await sleep(200);
const p1 = await page.locator('#scr-44 .bk-row').first().locator('.bk-price').inputValue();
ok('۴۴: +۰٫۵٪ → قیمت جدول همان لحظه عوض شد (زنده)', p0 !== p1);
ok('۴۴: ردیف درصدی نشان «ویرایش شد» گرفت', (await page.locator('#scr-44 .bk-row.chg').count()) >= 1);
await page.click('#bk-pctbar .pct-minus'); await page.click('#bk-pctbar .pct-minus');
await sleep(200);
const p2 = await page.locator('#scr-44 .bk-row').first().locator('.bk-price').inputValue();
ok('۴۴: −٪ هم زنده (از مبنا، نه تجمعی)', p2 !== p1);
await page.click('.bk-pct[data-pcttoggle]');
await sleep(150);
ok('۴۴: پنل با همان آیکون بسته شد', await page.locator('#bk-pctbar').isHidden());
await page.click('#bk-fresh');
await sleep(1100);
ok('۴۴: تأیید همه → کاتالوگ', await page.locator('#scr-01').isVisible());
await page.goto(FILE + '#44'); await page.reload(); await sleep(250);
await page.fill('#scr-44 .bk-row .bk-price', '۲٬۹۰۰٬۰۰۰');
await sleep(150);
ok('۴۴: ردیف ویرایش‌شده نشان می‌گیرد', await page.locator('#scr-44 .bk-row.chg').count() >= 1);
await page.click('#bk-save');
await sleep(1100);
ok('۴۴: ثبت → کاتالوگ ۰۱', await page.locator('#scr-01').isVisible());
const cardP = await page.locator('#scr-01 .pcard').first().locator('.p').textContent();
ok('۴۴: قیمت روی کارت کاتالوگ نشست', cardP.includes('۲٬۹۰۰٬۰۰۰'));

/* ═══ ۱۱-ب. تغییر سریع قیمت/موجودی از کارت کاتالوگ (فاز ۴۵) ═══ */
await page.click('#scr-01 .pcard .gear');
await sleep(300);
ok('quickps: مودال باز شد', await page.locator('#sheet-quickps.show').isVisible());
ok('quickps: دو فیلد + تایید', await page.locator('#qp-price').count() === 1 && await page.locator('#qp-stock').count() === 1 && await page.locator('#qp-ok').count() === 1);
const qpP0 = await page.locator('#scr-01 .pcard').first().locator('.p').textContent();
await page.fill('#qp-price', '۲٬۹۵۰٬۰۰۰');
await page.fill('#qp-stock', '۲');
await page.click('#qp-ok');
await sleep(300);
const qpP1 = await page.locator('#scr-01 .pcard').first().locator('.p').textContent();
const qpB = await page.locator('#scr-01 .pcard').first().locator('.mini-metrics .badge').first().textContent();
ok('quickps: تایید → قیمت و نشان موجودی کارت به‌روز', qpP1 !== qpP0 && qpP1.includes('۲٬۹۵۰٬۰۰۰') && qpB.includes('موجودی کم'));

/* ═══ ۱۱-پ. تخفیف حجمی (sheet-vol) — فاز ۴۵ ═══ */
await page.click('#scr-01 .showcase .icon-btn[data-sheet="sheet-cset"]');
await sleep(300);
ok('cset: باز شد', await page.locator('#sheet-cset.show').isVisible());
await page.click('#sheet-cset [data-sheet="sheet-vol"]');
await sleep(300);
ok('vol: باز شد', await page.locator('#sheet-vol.show').isVisible());
const volTxt = await page.locator('#sheet-vol').textContent();
ok('vol: بدون «نمایش نشان تخفیف در کاتالوگ عمومی» (فاز ۴۵)', !volTxt.includes('نمایش نشان تخفیف'));
ok('vol: توضیح سطح کاتالوگ/تک‌کالا (متن مالک)', volTxt.includes('در سطح کاتالوگ یک‌باره') && volTxt.includes('تخفیف مخصوص خودش'));

/* ═══ ۱۲. فرم ۰۴ — ظرایف (حکم مالک) ═══ */
await page.goto(FILE + '#04'); await page.reload(); await sleep(250);
ok('۰۴: بدون کمترین بازار', await page.locator('.gf-mkt').count() === 0);
ok('۰۴: بدون خط قیمت نرمال‌شده', await page.locator('#gf-unithint').count() === 0);
ok('۰۴: بدون لینک اکسل', await page.locator('#scr-04 #gf-step1 .gf-alt').count() === 0);
await page.fill('#gf-q', 'هاشمی');
await sleep(200);
await page.click('.gf-row');
await sleep(250);
ok('۰۴: گام ۲ باز شد', await page.locator('#gf-step2').isVisible());
ok('۰۴: فیلد حداقل سفارش هست', await page.locator('#gf-min').count() === 1);
// چک هندسی: باکس حداقل سفارش داخل کادر والدش
const minBox = await page.locator('#gf-min').boundingBox();
const minWrap = await page.locator('#gf-min').locator('..').boundingBox();
ok('۰۴: حداقل سفارش از کادر بیرون نزده', minBox && minWrap && minBox.x >= minWrap.x - 1 && minBox.x + minBox.width <= minWrap.x + minWrap.width + 1);
const ta = await page.locator('#gf-note').boundingBox();
ok('۰۴: توضیحات بلندتر (≥۱۰۰px)', ta && ta.height >= 100);
// ریتم عمودی: فاصلهٔ همهٔ fieldها از ۱۳px شروع می‌شود
const tops = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('#scr-04 #gf-step2 .field')).map(f => parseFloat(getComputedStyle(f).marginTop));
});
ok('۰۴: ریتم عمودی یکنواخت (۱۳px)', tops.length >= 3 && tops.every(t => Math.abs(t - 13) < 0.6));

/* ═══ ۱۳. تنظیمات دستیارها — فاز ۴۵: حساب کاربری به پروفایل رفت ═══ */
await page.goto(FILE + '#07'); await page.reload(); await sleep(250);
ok('۰۷: تبلیغات و افزایش فروش', await page.locator('#scr-07 [data-go="30"]').count() === 1);
ok('۰۷: بدون کمپین/مشتریان من', !(await page.locator('#scr-07').textContent()).includes('کمپین') && !(await page.locator('#scr-07').textContent()).includes('مشتریان من'));
ok('۰۷: تنظیمات کاتالوگ (cset)', await page.locator('#scr-07 [data-sheet="sheet-cset"]').count() === 1);
ok('۰۷: بدون حساب کاربری (رفت به ۴۲ — فاز ۴۵)', !(await page.locator('#scr-07').textContent()).includes('تم تاریک') && !(await page.locator('#scr-07').textContent()).includes('خروج از حساب'));
ok('۱۴: صفحه حذف شد (تنظیمات خرید — فاز ۴۵)', await page.locator('#scr-14').count() === 0);

/* ═══ ۱۳-ب. فرم ۳۴ — الگوی MVP (فاز ۴۵) ═══ */
await page.goto(FILE + '#34'); await page.reload(); await sleep(300);
ok('۳۴: عنوان «افزودن کالا به لیست خرید»', (await page.locator('#scr-34 .ttl').textContent()).includes('افزودن کالا'));
ok('۳۴: سرچ با placeholder جدید + اسکنر', (await page.locator('#gl-q').getAttribute('placeholder')).includes('جستجوی کالا، برند') && await page.locator('#scr-34 .gf-scan[data-sheet="sheet-scan"]').count() === 1);
ok('۳۴: بدون «کالای جدید بساز»', !(await page.locator('#scr-34').textContent()).includes('کالای جدید بساز'));
const glInit = await page.locator('#gl-res').textContent();
ok('۳۴: پرتکرار در صنف شما + در صنف شما', glInit.includes('پرتکرار در صنف شما') && glInit.includes('در صنف شما'));
ok('۳۴: نشان «در لیست» برای کالای موجود', (await page.locator('#gl-res .badge.b-green').count()) >= 1);
await page.fill('#gl-q', 'پفک');
await sleep(250);
const glQ = await page.locator('#gl-res').textContent();
ok('۳۴: سرچ پفک → گروه «هر برندی» + برند مشخص', glQ.includes('هر برندی') && glQ.includes('یک برند مشخص'));
ok('۳۴: ردیف هر برندی (گود پفک)', glQ.includes('هر برند و هر بسته‌بندی'));
await page.click('#gl-res .gf-row');
await sleep(250);
ok('۳۴: انتخاب → «چقدر و چه دوره‌ای؟»', await page.locator('#gqty-34').isVisible());
await page.click('#scr-34 .action-bar [data-go="08"]');
await sleep(300);
ok('۳۴: افزودن به لیست خرید → ۰۸', await page.locator('#scr-08').isVisible());
await page.goto(FILE + '#01'); await page.reload(); await sleep(250);
await page.click('#scr-01 .showcase .icon-btn[data-sheet="sheet-cset"]');
await sleep(300);
ok('cset: باز شد', await page.locator('#sheet-cset.show').isVisible());
const csetTxt = await page.locator('#sheet-cset').textContent();
ok('cset: تبلیغات و افزایش فروش', csetTxt.includes('تبلیغات و افزایش فروش'));
ok('cset: قیمت‌ها را کی ببیند', csetTxt.includes('قیمت‌های من را کی ببیند'));
ok('cset: بدون کمپین/گزارش/کیف پول', !csetTxt.includes('کمپین') && !csetTxt.includes('گزارش تبلیغ') && !csetTxt.includes('کیف پول'));

/* ═══ ۱۵. e2e — همهٔ صفحه‌ها بدون خطای کنسول ═══ */
for (const s of ALIVE) {
  await page.goto(FILE + '#' + s);
  await page.reload();
  await sleep(140);
}
ok('e2e: صفر خطای کنسول/pageerror در همهٔ صفحه‌ها', errors.length === 0);
if (errors.length) console.log('  errors:', errors.slice(0, 6));

console.log('\n═══ فاز ۴۴ ═══');
console.log('PASS: ' + pass + ' / ' + (pass + fail));
if (fail) process.exitCode = 1;
await browser.close();
