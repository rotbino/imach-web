// فاز ۵۵ — QA رفتاری (نسخهٔ ادغام‌شده روی فازهای ۵۲–۵۴): حکم‌های مالک روی سربرگ کاتالوگ و اشتراک —
// پیش‌نمایش = آخرین باکس آمار · حذف چشم از کادر اشتراک + متن جدید · کادر اعلان تازگی عمودی
// (دکته زیر متن، «اشتراک گذاری برای مشتریان جدید» + آیکون) · حذف «پیام آماده» از منو + مخاطبین اول
// · شیت کامل مخاطبین سه‌حالته · پیش‌نمایش ۱۳ برای خود فروشنده (تک‌بازو هم)
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

/* ═══ ۱. سربرگ کاتالوگ (۰۱) — آمار + پیش‌نمایش (آخرین باکس) + کادر اشتراک ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
const statBtns = page.locator('#scr-01 .cat-stats button');
ok('۰۱: نوار آمار ۴ باکس', (await statBtns.count()) === 4);
const lastStat = await statBtns.nth(3).textContent();
const firstStat = await statBtns.nth(0).textContent();
ok('۰۱: پیش‌نمایش = آخرین باکس ردیف آمار (حکم فاز ۵۵)', lastStat.includes('پیش‌نمایش') && !firstStat.includes('پیش‌نمایش'));
ok('۰۱: ترتیب کالا/ذخیره‌کننده/دعوت/پیش‌نمایش', firstStat.includes('کالا') && (await statBtns.nth(1).textContent()).includes('ذخیره') && (await statBtns.nth(2).textContent()).includes('دعوت'));
ok('۰۱: باکس پیش‌نمایش دکمهٔ چشمی به ۱۳', (await statBtns.nth(3).getAttribute('data-go')) === '13' && (await statBtns.nth(3).locator('svg use[href="#i-eye"]').count()) === 1);
const promo = await page.locator('#scr-01 .cat-promo').textContent();
ok('۰۱: کادر اشتراک بدون آیکون چشم (حکم فاز ۵۵)', (await page.locator('#scr-01 .cat-promo svg use[href="#i-eye"]').count()) === 0 && (await page.locator('#scr-01 .cat-promo .cp-ic[data-sheet="sheet-share"]').count()) === 1);
ok('۰۱: متن جدید کادر اشتراک عیناً از مالک', promo.includes('از آنها بخواهید تا برای داشتن قیمتهای زنده شما') && promo.includes('کاتالوگهای مورد علاقه خود ذخیره کنند') && !promo.includes('لیست ذخیره خود داشته باشند'));
ok('۰۱: کادر تازگی در حالت عادی مخفی', await page.locator('#cat-fresh').isHidden());

/* ═══ ۲. کادر تازگی — طراحی عمودی (حکم فاز ۵۵: دکته زیر متن) ═══ */
await page.click('#scr-01 .pcard .gear'); await sleep(350);
await page.fill('#qp-price', '۲٬۹۰۰٬۰۰۰'); await sleep(150);
await page.click('#qp-ok'); await sleep(400);
ok('کادر: بعد از تغییر سریع قیمت ظاهر شد', await page.locator('#cat-fresh').isVisible());
const fnTx = await page.locator('#cat-fresh .fn-tx').textContent();
ok('کادر: متن عیناً از مالک', fnTx.includes('۴۱ کسب‌وکار کاتالوگ شما را ذخیره کرده‌اند') && fnTx.includes('همان لحظه می‌بینند') && fnTx.includes('این قیمتها را به بقیه مشتریانت هم ارسال کن') && !fnTx.includes('پیام آماده'));
const fnBtn = await page.locator('#cat-fresh .fn-share').textContent();
ok('کادر: دکته «اشتراک گذاری برای مشتریان جدید» + آیکون اشتراک', fnBtn.includes('اشتراک گذاری برای مشتریان جدید') && (await page.locator('#cat-fresh .fn-share svg use[href="#i-share"]').count()) === 1);
const fnBox = await page.locator('#cat-fresh').boundingBox();
const fnBtnBox = await page.locator('#cat-fresh .fn-share').boundingBox();
const fnTxBox = await page.locator('#cat-fresh .fn-tx').boundingBox();
ok('کادر: دکته زیر متن است (نه کنارش — حکم فاز ۵۵)', fnBtnBox.y > fnTxBox.y + 20 && fnBtnBox.width > 240 && fnTxBox.width > 250);

/* ═══ ۳. کادر → شیت مخاطبین؛ ✕ می‌بندد؛ ثبت ۴۴ هم می‌آورد ═══ */
await page.click('#cat-fresh .fn-share'); await sleep(350);
ok('کادر: دکته مستقیم شیت «اشتراک با مخاطبین» را باز می‌کند', await page.locator('#sheet-cshare.show').isVisible());
await page.click('#sheet-cshare .btn[data-close]'); await sleep(250);
ok('کادر: بعد از ارسال، پرچم افتاد (مخفی)', await page.locator('#cat-fresh').isHidden());
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
ok('کادر: با ورود دوباره هم مخفی ماند', await page.locator('#cat-fresh').isHidden());
await page.goto(FILE + '#44'); await page.reload(); await sleep(300);
await page.click('#bk-need'); await sleep(250);
await page.fill('#scr-44 .bk-row .bk-price', '۲٬۷۰۰٬۰۰۰'); await sleep(250);
await page.click('#bk-save'); await sleep(1400);
ok('کادر: ثبت ۴۴ → بازگشت به کاتالوگ + کادر', await page.evaluate(() => location.hash === '#01') && await page.locator('#cat-fresh').isVisible());
await page.click('#cat-fresh .fn-x'); await sleep(200);
ok('کادر: ✕ می‌بندد', await page.locator('#cat-fresh').isHidden());

/* ═══ ۴. منوی اشتراک — مخاطبین اول؛ بدون «پیام آماده» (حکم فاز ۵۵)؛ QR مانده ═══ */
await page.click('#scr-01 .cat-promo .cp-ic[data-sheet="sheet-share"]'); await sleep(350);
ok('منو: از آیکون کادر اشتراک باز شد', await page.locator('#sheet-share.show').isVisible());
const shareRows = await page.locator('#sheet-share .sheet-row b').allTextContents();
ok('منو: «اشتراک با مخاطبین» اول لیست (حکم فاز ۵۵)', shareRows[0] === 'اشتراک با مخاطبین');
ok('منو: بدون «پیام آماده» (حکم فاز ۵۵)', !(shareRows.join(' ').includes('پیام آماده')));
ok('منو: کپی لینک و QR و کارت ویزیت (فاز ۵۷ — جای ای‌مچ)', shareRows.includes('کپی لینک کاتالوگ') && shareRows.includes('کد QR کاتالوگ') && shareRows.includes('کارت ویزیت') && !shareRows.includes('ارسال در پیام‌های ای‌مچ'));
await page.click('#sheet-share .sheet-row[data-sheet="sheet-cshare"]'); await sleep(300);
ok('منو: مخاطبین → شیت cshare', await page.locator('#sheet-cshare.show').isVisible() && (await page.locator('#sheet-share.show').count()) === 0);

/* ═══ ۵. شیت اشتراک کاتالوگ با مخاطبین — سه حالت ردیف (حکم فاز ۵۵) ═══ */
const cs = await page.locator('#sheet-cshare').textContent();
ok('مخاطبین: زیرنویس دو کانال (ای‌مچ / پیامک)', cs.includes('اعضای ای‌مچ') && cs.includes('پیامک'));
ok('مخاطبین: گروه «عضو ای‌مچ» و «عضو نیستند»', cs.includes('عضو ای‌مچ نیستند'));
ok('مخاطبین: دو نشان سبز «کاتالوگ را ذخیره کرده»', (await page.locator('#sheet-cshare .cts-saved').count()) === 2);
ok('مخاطبین: ذخیره‌کرده‌ها همان‌های reach (رستوران مهر/نگین)', cs.includes('رستوران مهر') && cs.includes('سوپرمارکت نگین'));
ok('مخاطبین: عضوِ بدون ذخیره «ارسال کاتالوگ»', (await page.locator('#sheet-cshare [data-send]').count()) === 2);
ok('مخاطبین: غیرعضو ۲ ردیف متمایز', (await page.locator('#sheet-cshare .cts-out').count()) === 2);
ok('مخاطبین: غیرعضو «اشتراک گذاری کاتالوگ»', (await page.locator('#sheet-cshare [data-smssend]').count()) === 2);
await page.click('#sheet-cshare [data-send]'); await sleep(200);
ok('مخاطبین: «ارسال کاتالوگ» → ارسال شد', (await page.locator('#sheet-cshare [data-send]').first().textContent()).includes('ارسال شد'));
await page.click('#sheet-cshare [data-smssend]'); await sleep(200);
ok('مخاطبین: غیرعضو → «پیامک شد»', (await page.locator('#sheet-cshare [data-smssend]').first().textContent()).includes('پیامک شد'));
await page.click('#sheet-cshare .btn[data-close]'); await sleep(250);

/* ═══ ۶. جریان لیست خرید (۰۸) — فاز ۵۸: دکتهٔ اشتراک شیت دوگزینه‌ای lshare را باز می‌کند ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(300);
await page.click('#scr-08 .cat-promo .cp-acts [data-sheet="sheet-lshare"]'); await sleep(300);
ok('۰۸: شیت دوگزینه‌ای اشتراک لیست (فاز ۵۸)', await page.locator('#sheet-lshare.show').isVisible() && (await page.locator('#sheet-lshare .sheet-row').count()) === 2);
await page.click('#sheet-lshare [data-sheet="sheet-contacts"]'); await sleep(300);
ok('۰۸: مخاطبین از گزینهٔ اول — همان شیت قدیمی', await page.locator('#sheet-contacts.show').isVisible() && (await page.locator('#sheet-contacts .sub').textContent()).includes('لینک لیست خرید'));
await page.click('#sheet-contacts .btn[data-close]'); await sleep(250);

/* ═══ ۷. پیش‌نمایش ۱۳ — حالت فروشنده (نوار خریدار مخفی + نوار پیش‌نمایش) ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
await page.click('#scr-01 .cat-stats button[data-go="13"]'); await sleep(400);
ok('پیش‌نمایش: باکس آخر ردیف آمار به ۱۳ می‌رود', await page.evaluate(() => location.hash === '#13'));
ok('پیش‌نمایش: نوار «پیش‌نمایش — کاتالوگ شما…» برای فروشنده', await page.locator('#own-13').isVisible());
ok('پیش‌نمایش: اکشن‌های خریدار برای خودِ فروشنده مخفی', await page.locator('#buybar-13').isHidden());
ok('پیش‌نمایش: افزودن به لیست کارت‌ها برای فروشنده مخفی', !(await page.locator('#scr-13 .pcard .addls').first().isVisible()));
await page.click('#scr-13 .subheader .back'); await sleep(300);

/* ═══ ۸. ۱۳ از دید خریدار واقعی ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(300);
await page.evaluate(() => { location.hash = '#13'; }); await sleep(350);
ok('۱۳ خریدار: نوار پیش‌نمایش مخفی', await page.locator('#own-13').isHidden());
ok('۱۳ خریدار: ذخیره/پیام/تماس نمایان', await page.locator('#buybar-13').isVisible());

/* ═══ ۹. فروشندهٔ تک‌بازو هم پیش‌نمایش را می‌بیند ═══ */
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: false })));
await page.goto(FILE + '#01'); await page.reload(); await sleep(350);
await page.click('#scr-01 .cat-stats button[data-go="13"]'); await sleep(400);
ok('تک‌بازو: فروشندهٔ بدون دستیار خرید هم به ۱۳ می‌رسد', await page.evaluate(() => location.hash === '#13'));
ok('تک‌بازو: حالت پیش‌نمایش فعال', await page.locator('#own-13').isVisible() && await page.locator('#buybar-13').isHidden());
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));

/* ═══ ۱۰. مدال «شرایط استفاده» (بازسازی فاز ۵۴ — راستی‌آزمایی پس از ادغام) ═══ */
await page.goto(FILE + '#16'); await page.reload(); await sleep(300);
await page.click('[data-termsopen]'); await sleep(300);
ok('شرایط: مدال باز می‌شود', await page.locator('#dlg-terms.show').isVisible());
await page.click('#dlg-terms .tm-x'); await sleep(250);
ok('شرایط: ✕ فقط می‌بندد', (await page.locator('#dlg-terms.show').count()) === 0);
await page.click('[data-termsopen]'); await sleep(300);
await page.evaluate(() => { document.querySelector('#scr-16 .checkbox').classList.remove('on'); });
await page.click('[data-termsok]'); await sleep(250);
ok('شرایط: «مطالعه کردم و می‌پذیرم» تیک را روشن می‌کند', (await page.locator('#scr-16 .checkbox.on').count()) === 1 && (await page.locator('#dlg-terms.show').count()) === 0);

/* ═══ ۱۱. ساختار + کنسول — همهٔ صفحه‌ها ═══ */
const ALIVE = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','27','29','30','34','42','44','45','46','48','53'];
for (const s of ALIVE) { await page.evaluate((id) => { location.hash = '#' + id; }, s); await sleep(140); }
ok('ساختار: شیت‌ها داخل #phone', (await page.locator('body > .sheet').count()) === 0);
ok('ساختار: cshare + cat-fresh + بدون copymsg', (await page.locator('#sheet-cshare').count()) === 1 && (await page.locator('#cat-fresh').count()) === 1 && (await page.locator('[data-copymsg]').count()) === 0);
console.log('  شیت‌ها: ' + (await page.locator('.sheet').count()));
ok('کنسول: بدون خطا در همهٔ صفحه‌ها', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5));

await browser.close();
console.log('\n═══ فاز ۵۵ (ادغام روی ۵۲–۵۴) ═══');
console.log('PASS: ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
