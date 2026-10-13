// فاز ۵۳ — QA رفتاری: سربرگ کاتالوگ ظریف (آیکون‌های روبرو + تنظیمات کنار دو دکمه) · نوار آمار با «دعوت»
// صفحهٔ ۵۳ دعوت‌شدگان (سه‌نشان + ۱۰۰ هزار تومان) · اصناف سوییچر · آیکون + کاتالوگ عمومی + مودال‌های افزودن
// شیت گروهی ردیفی · پیام آماده + QR + اعلان عضو جدید + کیف پول · نudge لحظهٔ تازه‌سازی قیمت
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
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));

/* ═══ ۱. سربرگ کاتالوگ (۰۱) — کادر اشتراک ظریف + آیکون‌های «روبرو» ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
const promoTxt = await page.locator('#scr-01 .cat-promo').textContent();
ok('کادر: عنوان مالک سر جایش است + زیرمتن (فاز ۶۰ — تأمین‌کنندگان من)', promoTxt.includes('کاتالوگ ویترین قیمتهای زنده شماست، به اشتراکش بگذار') && promoTxt.includes('تأمین‌کنندگان من'));
ok('کادر: آیکون چشم حذف شد — پیش‌نمایش = آخرین باکس آمار (فاز ۵۵)', (await page.locator('#scr-01 .cat-promo .cp-ic[data-go="13"]').count()) === 0 && (await page.locator('#scr-01 .cat-stats button[data-go="13"]').count()) === 1);
ok('کادر: آخرین باکس آمار خودِ پیش‌نمایش است', await page.evaluate(() => {
  const btns = document.querySelectorAll('#scr-01 .cat-stats button');
  return btns.length === 4 && btns[3].textContent.includes('پیش‌نمایش') && !btns[0].textContent.includes('پیش‌نمایش');
}));
ok('کادر: آیکون ظریف اشتراک روبروی عنوان', (await page.locator('#scr-01 .cat-promo .cp-ic[data-sheet="sheet-share"]').count()) === 1);
ok('کادر: دکمه‌های زمخت حذف شدند (بدون cp-acts/btn)', (await page.locator('#scr-01 .cat-promo .cp-acts').count()) === 0 && (await page.locator('#scr-01 .cat-promo .btn').count()) === 0);
ok('کادر: تک‌آیکون با عنوان هم‌پوشانی ندارد (فاز ۵۵)', await page.evaluate(() => {
  const b = document.querySelector('#scr-01 .cat-promo .cp-head b');
  const ics = document.querySelectorAll('#scr-01 .cat-promo .cp-ic');
  if (!b || ics.length !== 1) return false;
  const br = b.getBoundingClientRect();
  return Array.from(ics).every(ic => { const r = ic.getBoundingClientRect(); return r.left >= br.right - 1 || r.right <= br.left + 1 || r.top >= br.bottom - 1; }) && Array.from(ics).every(ic => ic.getBoundingClientRect().width <= 32);
}));
ok('کادر: جمع‌ارتفاع ظریف شد (≤ ۱۱۲px؛ قبلاً با دکمه‌ها ~۱۷۰)', await page.evaluate(() => document.querySelector('#scr-01 .cat-promo').getBoundingClientRect().height <= 112));
ok('تنظیمات: آیکون در ردیف دو دکمه (کالای جدید/تمدید قیمت‌ها)', await page.evaluate(() => {
  const set = document.querySelector('#scr-01 .cat-addrow .cat-set[data-sheet="sheet-cset"]');
  const add = document.querySelector('#scr-01 .cat-addrow .add-btn');
  const ren = document.querySelector('#scr-01 .cat-addrow .renew-btn[data-go="44"]');
  return !!set && !!add && !!ren && set.previousElementSibling === ren && ren.previousElementSibling === add;
}));
ok('جستجو: تمام‌عرض — بدون آیکون هم‌ردیف (خودش تمام‌عرض است)', await page.evaluate(() => {
  const sb = document.querySelector('#scr-01 .searchbar');
  if (!sb) return false;
  const sibIcon = Array.from(sb.parentElement.children).some(c => c !== sb && c.classList.contains('icon-btn'));
  return !sibIcon && sb.getBoundingClientRect().width > 340;
}));

/* ═══ ۲. نوار آمار بالای کاتالوگ — با «دعوت» به‌جای «تماس» (سمت فروشنده) ═══ */
const stats = await page.locator('#scr-01 .cat-stats').textContent();
ok('آمار: چهار چیپ پیش‌نمایش/کالا/مشتری/دعوت (فاز ۶۰)', stats.includes('پیش‌نمایش') && stats.includes('کالا') && stats.includes('مشتری') && stats.includes('دعوت'));
ok('آمار: سمت فروشنده «تماس» نیست (فقط کاتالوگ عمومی)', !stats.includes('تماس'));
ok('آمار: چیپ دعوت → صفحهٔ ۵۳', (await page.locator('#scr-01 .cat-stats [data-go="53"]').count()) === 1);
ok('آمار: چیپ مشتری → صفحهٔ ۶۲ (فاز ۶۰)', (await page.locator('#scr-01 .cat-stats [data-go="62"]').count()) === 1);
ok('آمار: چیپ پیش‌نمایش → ۱۳', (await page.locator('#scr-01 .cat-stats [data-go="13"]').count()) === 1);
ok('آمار: چیپ کالا = اسکرول تا گرید (نه ناوبری)', (await page.locator('#scr-01 .cat-stats [data-catcount]').count()) === 1 && (await page.locator('#scr-01 .cat-stats [data-go="02"]').count()) === 0);
ok('آمار: چیپ‌ها داخل قاب می‌گنجند', await page.evaluate(() => {
  const cs = document.querySelector('#scr-01 .cat-stats');
  const body = document.querySelector('#scr-01 .screen-body');
  return !!cs && cs.scrollWidth <= body.clientWidth + 1;
}));
await page.click('#scr-01 .cat-stats [data-go="62"]'); await sleep(300);
ok('آمار: لمس مشتری → صفحهٔ ۶۲ «مشتریان من»', await page.locator('#scr-62').isVisible() && (await page.evaluate(() => location.hash)) === '#62');
await page.goto(FILE + '#01'); await page.reload(); await sleep(250);

/* ═══ ۳. صفحهٔ ۵۳ — دعوت‌شدگان (سه‌نشان + آمار + هدف + لیست) ═══ */
await page.goto(FILE + '#53'); await page.reload(); await sleep(300);
const t53 = await page.locator('#scr-53').textContent();
ok('۵۳: عنوان سه‌نشان عین مالک', t53.includes('با اشتراک‌گذاری کاتالوگ، با یک تیر سه نشان بزنید'));
ok('۵۳: نشان ۱ — حل مشکل تغییرات قیمت', t53.includes('حل مشکل تغییرات قیمت') && t53.includes('او همیشه به قیمت‌های به‌روزتان دسترسی دارد'));
ok('۵۳: نشان ۲ — جذب مشتری جدید', t53.includes('جذب مشتری جدید') && t53.includes('به‌صورت خودکار برایش ذخیره می‌شود'));
ok('۵۳: نشان ۳ — ۱۰۰ هزار تومان شارژ', t53.includes('کسب شارژ رایگان') && t53.includes('۱۰۰ هزار تومان شارژ'));
ok('۵۳: آمار ۱۲ دعوت + ۱٬۲۰۰٬۰۰۰ شارژ', t53.includes('۱۲') && t53.includes('۱٬۲۰۰٬۰۰۰'));
ok('۵۳: هدف کوچک «برای ۳ مشتری بفرست»', t53.includes('۳ مشتری'));
ok('۵۳: لیست نام + کسب‌وکار (خواروبار امید / علی مرادی)', t53.includes('خواروبار امید') && t53.includes('علی مرادی'));
ok('۵۳: چند شهر واقعی در لیست', t53.includes('مشهد') && t53.includes('قزوین') && t53.includes('رشت'));
ok('۵۳: چیپ +۱۰۰٬۰۰۰ روی ردیف‌ها', (await page.locator('#scr-53 .inv-chip').count()) === 5);
ok('۵۳: باقی‌ماندهٔ ۷ کسب‌وکار', t53.includes('۷ کسب‌وکار دیگر'));
ok('۵۳: CTA ارسال لینک → شیت اشتراک', (await page.locator('#scr-53 [data-sheet="sheet-share"]').count()) >= 1);
await page.click('#scr-53 .subheader .back'); await sleep(300);
ok('۵۳: بازگشت → کاتالوگ ۰۱', await page.locator('#scr-01').isVisible());

/* ═══ ۴. تنظیمات کاتالوگ + اصناف سوییچر ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
await page.click('#scr-01 .cat-addrow .cat-set'); await sleep(300);
const csetTxt = await page.locator('#sheet-cset').textContent();
ok('cset: برچسب جدید «چه اصنافی قیمت‌ها را ببینند»', csetTxt.includes('چه اصنافی قیمت‌ها را ببینند'));
ok('cset: ردیف دعوت‌شدگان با شمار → ۵۳', csetTxt.includes('دعوت‌شدگان') && csetTxt.includes('۱۲ ثبت‌نام از لینک شما') && (await page.locator('#sheet-cset [data-go="53"]').count()) === 1);
await page.click('#sheet-cset [data-sheet="sheet-trade"]'); await sleep(300);
ok('trade: عنوان «چه اصنافی قیمت‌ها را ببینند»', (await page.locator('#sheet-trade h3').textContent()).includes('چه اصنافی قیمت‌ها را ببینند'));
const tgN = await page.locator('#sheet-trade .toggle').count();
const tgOn = await page.locator('#sheet-trade .toggle.on').count();
ok('trade: ۸ صنف، همهٔ سوییچرها پیش‌فرض روشن', tgN === 8 && tgOn === 8);
ok('trade: سوییچ کلیِ «همه ببینند» حذف شد', !(await page.locator('#sheet-trade').textContent()).includes('قیمت‌ها را همه ببینند'));
ok('trade: تیک‌های قدیمی نیست (سوییچر است)', (await page.locator('#sheet-trade .check').count()) === 0);
await page.click('#sheet-trade .sheet-row .toggle >> nth=3'); await sleep(200);
ok('trade: لمس، همان صنف را خاموش می‌کند', (await page.locator('#sheet-trade .toggle.on').count()) === 7);
await page.click('#sheet-trade .sheet-row .toggle >> nth=3'); await sleep(200);
ok('trade: دوباره روشن می‌شود', (await page.locator('#sheet-trade .toggle.on').count()) === 8);
await page.click('#sheet-trade .sheet-cta'); await sleep(250);

/* ═══ ۵. کاتالوگ عمومی (۱۳) — آیکون + روی کارت‌ها + مودال تک‌کالا + شیت گروهی ردیفی ═══ */
/* فاز ۵۵: ۱۳ «keep» شد (پیش‌نمایش فروشنده) — سفر خریدار از بازوی خرید شروع می‌شود */
await page.goto(FILE + '#08'); await page.reload(); await sleep(300);
await page.evaluate(() => { location.hash = '#13'; }); await sleep(350);
ok('۱۳: آیکون + روی همهٔ کارت‌ها', (await page.locator('#scr-13 .pcard .addls').count()) === 4);
ok('۱۳: آمار عمومی همان «تماس» ماند', (await page.locator('#scr-13 .pub-stats').textContent()).includes('تماس'));
await page.click('#scr-13 .pcard:nth-child(1) .addls'); await sleep(300);
ok('addls: مودال باز شد + پرسش عین مالک', await page.locator('#dlg-addls.show').isVisible() && (await page.locator('#dlg-addls .dlg-q').textContent()).includes('آیا خریدار عمده این کالا هستی و می‌خواهی این کالا را به لیست خریدت اضافه کنی؟'));
ok('addls: نام کالا از کارت پر شد', (await page.locator('#addls-name').textContent()) === 'برنج هاشمی');
ok('addls: «افزودن به صورت گروهی» زیر دکمهٔ تأیید', (await page.locator('#dlg-addls [data-sheet="sheet-pick"]').count()) === 1 && (await page.locator('#dlg-addls [data-sheet="sheet-pick"]').textContent()).includes('افزودن به صورت گروهی'));
await page.click('#addls-ok'); await sleep(250);
ok('addls: تأیید → پیام «به لیست خرید اضافه شد»', (await page.locator('#addls-ok').textContent()).includes('به لیست خرید اضافه شد'));
ok('addls: آیکون کارت سبز/تیک شد', (await page.locator('#scr-13 .pcard:nth-child(1) .addls.on').count()) === 1);
await sleep(1000);
ok('addls: مودال بسته شد', await page.locator('#dlg-addls.show').count() === 0);
/* گروهی از مسیر مودال تک‌کالا */
await page.click('#scr-13 .pcard:nth-child(2) .addls'); await sleep(300);
await page.click('#dlg-addls [data-sheet="sheet-pick"]'); await sleep(350);
ok('گروهی: شیت از پایین باز شد (نه مودال مرکزی)', await page.locator('#sheet-pick.show.sheet').isVisible() && (await page.locator('#sheet-pick.dlg').count()) === 0);
const pkTxt = await page.locator('#sheet-pick').textContent();
ok('گروهی: متن جدید «خریدار گرامی…» عین مالک', pkTxt.includes('خریدار گرامی، کالاهایی را که خرید عمده داری رو تیک بزن تا به لیست خریدت اضافه بشن.'));
ok('گروهی: متن قدیمی حذف شد', !pkTxt.includes('همه با هم اضافه می‌شوند'));
ok('گروهی: ردیفی است نه شبکه‌ای (۴ pk-row، بدون ggrid)', (await page.locator('#sheet-pick .pk-row').count()) === 4 && (await page.locator('#sheet-pick .ggrid').count()) === 0 && (await page.locator('#sheet-pick .gcell').count()) === 0);
ok('گروهی: هر ردیف عکس + نام کالا', (await page.locator('#sheet-pick .pk-row .pk-th img').count()) === 4 && pkTxt.includes('برنج طارم') && pkTxt.includes('برنج فجر'));
ok('گروهی: ۲ ردیف پیش‌فرض روشن', (await page.locator('#sheet-pick .pk-row.on').count()) === 2);
ok('گروهی: دکمهٔ زنده «افزودن ۲ کالا»', (await page.locator('#pk-add').textContent()).includes('۲'));
await page.click('#sheet-pick .pk-row:nth-child(3)'); await sleep(200);
ok('گروهی: لمس ردیف → شمار ۳ شد', (await page.locator('#sheet-pick .pk-row.on').count()) === 3 && (await page.locator('#pk-add').textContent()).includes('۳'));
await page.click('#pk-add'); await sleep(250);
ok('گروهی: تأیید → «به لیست خرید اضافه شد ✓»', (await page.locator('#pk-add').textContent()).includes('به لیست خرید اضافه شد'));
await sleep(900);
ok('گروهی: شیت بسته شد', await page.locator('#sheet-pick.show').count() === 0);
/* ورود مستقیم از دکمهٔ ms-btn */
await page.click('#scr-13 .ms-btn'); await sleep(350);
ok('گروهی: ورود از دکمهٔ انتخاب چند کالا هم کار می‌کند', await page.locator('#sheet-pick.show').isVisible());
await page.click('#sheet-pick .btn[data-close]'); await sleep(250);

/* ═══ ۶. شیت اشتراک — فاز ۵۵: مخاطبین اول، بدون «پیام آماده» (حکم مالک) + QR ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
await page.click('#scr-01 .cat-promo .cp-ic[data-sheet="sheet-share"]'); await sleep(300);
ok('share: «اشتراک با مخاطبین» اول لیست (فاز ۵۵)', await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#sheet-share .sheet-row'));
  const iCts = rows.findIndex(r => (r.getAttribute('data-sheet') || '') === 'sheet-cshare');
  const iCopy = rows.findIndex(r => r.hasAttribute('data-copy'));
  return iCts === 0 && iCopy === 1;
}));
ok('share: آیتم «پیام آماده» حذف شد (حکم فاز ۵۵)', (await page.locator('#sheet-share [data-copymsg]').count()) === 0 && !(await page.locator('#sheet-share').textContent()).includes('پیام آماده'));
ok('share: مخاطبین → شیت cshare سه‌حالته', await page.click('#sheet-share [data-sheet="sheet-cshare"]').then(() => true).catch(() => false));
await sleep(350);
ok('share: cshare باز — غیرعضو با پیامک', (await page.locator('#sheet-cshare.show').isVisible()) && (await page.locator('#sheet-cshare .cts-out').count()) === 2);
ok('share: ذخیره‌کرده‌ها نشان سبز دارند', (await page.locator('#sheet-cshare .cts-saved').count()) === 2);
await page.click('#sheet-cshare .btn[data-close]'); await sleep(250);
await page.click('#scr-01 .cat-promo .cp-ic[data-sheet="sheet-share"]'); await sleep(300);
await page.click('#sheet-share [data-sheet="sheet-qr"]'); await sleep(350);
ok('QR: شیت باز شد + الگو رندر شده', await page.locator('#sheet-qr.show').isVisible() && (await page.locator('#qr-svg rect').count()) > 60);
ok('QR: متن چاپ روی فاکتور/پیشخوان/کارت ویزیت', (await page.locator('#sheet-qr').textContent()).includes('کارت ویزیت') && (await page.locator('#sheet-qr').textContent()).includes('فاکتور'));
ok('QR: پاداش ۱۰۰ هزار تومانی در توضیح', (await page.locator('#sheet-qr').textContent()).includes('۱۰۰ هزار تومان'));
await page.click('#sheet-qr .btn[data-close]'); await sleep(250);

/* ═══ ۷. اعلان عضو جدید (۲۷) ═══ */
await page.goto(FILE + '#27'); await page.reload(); await sleep(300);
const n27 = await page.locator('#scr-27 .notif').first().textContent();
ok('۲۷: اعلان «عضو جدید با لینک شما» اول است + +۱۰۰٬۰۰۰', n27.includes('عضو جدید با لینک شما') && n27.includes('+ ۱۰۰٬۰۰۰'));
ok('۲۷: نام واقعی و شهر (علی مرادی از مشهد)', n27.includes('علی مرادی از مشهد'));
ok('۲۷: اکشن → دعوت‌شدگان (۵۳)', (await page.locator('#scr-27 .notif').first().locator('[data-go="53"]').count()) === 1);

/* ═══ ۸. کیف پول (۲۹) — سه‌نشان + دعوت‌شدگان + ۱۰۰ هزار تومانی ═══ */
await page.goto(FILE + '#29'); await page.reload(); await sleep(300);
const t29 = await page.locator('#scr-29').textContent();
ok('۲۹: پاداش ۱۰۰ هزار تومانی (متن قدیمی ۵٬۰۰۰ِ هدیه حذف)', t29.includes('۱۰۰ هزار تومان شارژ') && !t29.includes('شارژ هدیه می‌گیرید')); /* دقت: «۱٬۳۱۵٬۰۰۰» شامل زیررشتهٔ ۵٬۰۰۰ است — چک با عبارت کامل متن قدیمی */
ok('۲۹: سه نشان داخل کارت اشتراک', t29.includes('حل مشکل تغییرات قیمت') && t29.includes('جذب مشتری جدید') && t29.includes('کسب شارژ رایگان'));
ok('۲۹: آمار ۱۲ ثبت‌نام + ۱٬۲۰۰٬۰۰۰ تومان', t29.includes('ثبت‌نام از لینک شما') && t29.includes('۱٬۲۰۰٬۰۰۰'));
ok('۲۹: ردیف دعوت‌شدگان → ۵۳', (await page.locator('#scr-29 [data-go="53"]').count()) === 1);
ok('۲۹: ریز مصرف هدیه +۱۰۰٬۰۰۰', (await page.locator('#scr-29 .cost.plus').first().textContent()).includes('۱۰۰٬۰۰۰'));

/* ═══ ۹. نudge لحظهٔ تازه‌سازی — حلقهٔ ۴۴ → ۰۱ و quickps ═══ */
await page.goto(FILE + '#44'); await page.reload(); await sleep(300);
await page.click('#bk-need'); await sleep(200);
await page.fill('#scr-44 .bk-row:nth-child(2) .bk-price', '۲٬۷۶۰٬۰۰۰'); await sleep(250);
ok('۴۴: ذخیره بعد از تغییر انیبل', !(await page.locator('#bk-save').isDisabled()));
await page.click('#bk-save'); await sleep(1100);
ok('نudge: بعد از ذخیرهٔ ۴۴ روی ۰۱ پیدا است', await page.locator('#cat-fresh').isVisible());
ok('نudge: متن «قیمت‌ها به‌روز شد — به مشتری‌هات خبر بده»', (await page.locator('#cat-fresh .fn-top b').textContent()).includes('قیمت‌ها به‌روز شد'));
ok('نudge: متن جدید مالک (فاز ۵۵) — بدون «پیام آماده»', (await page.locator('#cat-fresh .fn-tx').textContent()).includes('۴۱ کسب‌وکار کاتالوگ شما را ذخیره کرده‌اند') && (await page.locator('#cat-fresh .fn-tx').textContent()).includes('این قیمتها را به بقیه مشتریانت هم ارسال کن') && !(await page.locator('#cat-fresh').textContent()).includes('پیام آماده'));
ok('نudge: دکته زیر متن (فاز ۵۵)', await page.evaluate(() => {
  const tx = document.querySelector('#cat-fresh .fn-tx');
  const btn = document.querySelector('#cat-fresh .fn-share');
  if (!tx || !btn) return false;
  return btn.getBoundingClientRect().top > tx.getBoundingClientRect().bottom - 4;
}));
await page.click('#cat-fresh [data-freshshare]'); await sleep(300);
ok('نudge: «اشتراک گذاری برای مشتریان جدید» → شیت مخاطبین (فاز ۵۵)', await page.locator('#sheet-cshare.show').isVisible());
ok('نudge: پس از ارسال جمع شد', await page.locator('#cat-fresh').isHidden());
await page.click('#sheet-cshare .btn[data-close]'); await sleep(250);
await page.goto(FILE + '#44'); await page.reload(); await sleep(300);
ok('نudge: دفعهٔ بعد (بدون تازه‌سازی) نمی‌آید', await page.locator('#cat-fresh').isHidden());
/* مسیر quickps */
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
await page.click('#scr-01 .pcard .gear'); await sleep(350);
await page.click('#qp-ok'); await sleep(300);
ok('نudge: تأیید تغییر سریع قیمت هم نudge می‌آورد', await page.locator('#cat-fresh').isVisible());
await page.click('#cat-fresh [data-freshx]'); await sleep(150);
ok('نudge: بستن با × کار می‌کند', await page.locator('#cat-fresh').isHidden());

/* ═══ ۱۰. ساختار + کنسول ═══ */
ok('ساختار: همهٔ scr داخل #phone (۳۱ صفحه — فاز ۶۰: +۶۲ مشتریان)', await page.evaluate(() => {
  const phone = document.getElementById('phone');
  return Array.from(document.querySelectorAll('.scr')).every(s => phone.contains(s)) && document.querySelectorAll('.scr').length === 31;
}));
ok('ساختار: شیت/دیالوگ جدید داخل #phone', await page.evaluate(() => {
  const phone = document.getElementById('phone');
  return phone.contains(document.getElementById('sheet-qr')) && phone.contains(document.getElementById('dlg-addls')) && phone.contains(document.getElementById('scr-53'));
}));
const sheetCount = await page.locator('.sheet').count();
const dlgCount = await page.locator('.dlg').count();
console.log('  شیت‌ها: ' + sheetCount + ' · دیالوگ‌ها: ' + dlgCount);
ok('کنسول: بدون خطا', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5));

await browser.close();
console.log('\n═══ فاز ۵۳ ═══');
console.log('PASS: ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
