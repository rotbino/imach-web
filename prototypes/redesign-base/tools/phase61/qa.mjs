// فاز ۶۱ — QA قطعی «کاتالوگ خصوصی» (گام ۲ پیوت شبکهٔ تجاری خصوصی) — حکم‌های مالک:
//  ۱) همهٔ فروشنده‌ها دوست ندارند قیمت‌هایشان را همه ببینند مگر مشتریانشان — کاتالوگ خصوصی/عمومی
//  ۲) مهمان دکتهٔ «مشاهده قیمت» → شماره + نام و نام خانوادگی → همان لحظه ثبت‌نام + دیدن قیمت‌ها
//  ۳) فروشنده می‌تواند مشتری را از قبل با شماره اضافه کند و لینک بفرستد — «در انتظار عضویت»
//  ۴) لبهٔ دوطرفه: حذف تأمین‌کننده (۱۰) = قفل قیمت‌ها در خصوصی؛ ذخیرهٔ دوباره = بازگشت
//  ۵) رفع باگ فاز ۶۰: تب تکراری «مشتریان» در فوتر ۶۲
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p61';
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const shot = async (n) => { await page.screenshot({ path: SHOTS + '/' + n + '.png', clip: { x: 34, y: 0, width: 402, height: 874 } }); };
let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

/* ═══ ۰. رفع باگ فاز ۶۰ — فوتر ۶۲: دقیقاً ۵ تب با نگاشت درست ═══ */
await page.goto(FILE + '#62'); await page.reload(); await sleep(400);
const tabs62 = await page.locator('#scr-62 .tabbar .tab');
T('۶۲: فوتر ۵ تبی (رفع تب تکراری)', (await tabs62.count()) === 5);
T('۶۲: ترتیب برچسب‌ها کاتالوگ من/مشتریان/سفارشات/پیام‌ها/تنظیمات (فاز ۶۴)', await page.evaluate(() => {
  const t = [...document.querySelectorAll('#scr-62 .tabbar .tab')].map(x => x.textContent.trim());
  return t[0].startsWith('کاتالوگ من') && t[1].startsWith('مشتریان') && t[2].startsWith('سفارشات') && t[3].startsWith('پیام‌ها') && t[4].startsWith('تنظیمات');
}));
T('۶۲: نگاشت data-go درست (تب سوم = ۶۵ سفارشات — فاز ۶۴)', await page.evaluate(() => {
  const t = [...document.querySelectorAll('#scr-62 .tabbar .tab')];
  return t[0].dataset.go === '01' && t[1].dataset.go === '62' && t[2].dataset.go === '65' && t[3].dataset.go === '18' && t[4].dataset.go === '07';
}));
T('۶۲: تب «مشتریان» فعال است و کاتالوگ من نه', await page.evaluate(() => {
  const t = [...document.querySelectorAll('#scr-62 .tabbar .tab')];
  return t[1].classList.contains('active') && !t[0].classList.contains('active');
}));

/* ═══ ۱. پیش‌فرض عمومی — بدون درگاه ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(400);
T('پیش‌فرض: چیپ «کاتالوگ خصوصی» روی ۰۱ مخفی', await page.locator('#cat-priv-chip').isHidden());
await page.goto(FILE + '#13'); await sleep(400);
T('پیش‌فرض: ۱۳ بدون بنر درگاه', await page.locator('#priv-13').isHidden());
T('پیش‌فرض: قیمت‌ها بدون بلور', (await page.evaluate(() => getComputedStyle(document.querySelector('#scr-13 .pcard .p')).filter)) === 'none');
T('پیش‌فرض: buybar دکتهٔ «ذخیره شد» (مشتری هستید)', (await page.locator('#catsave-13').textContent()).includes('ذخیره شد') && (await page.locator('#catsave-13.catsave-on').count()) === 1);

/* ═══ ۲. روشن کردن خصوصی — سوییچر cset + هم‌گام‌سازی‌ها ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(350);
await page.click('#scr-01 .cat-set'); await sleep(300);
T('cset: ردیف «کاتالوگ خصوصی» + toggle خاموش', await page.locator('#sheet-cset.show').isVisible() && (await page.locator('#catpriv-sw').count()) === 1 && !(await page.locator('#catpriv-sw.on').count()));
T('cset: زیرنویس حالت عمومی', (await page.locator('#catpriv-sub').textContent()).includes('همهٔ خریداران'));
await page.click('#catpriv-sw'); await sleep(300);
T('cset: زیرنویس خصوصی — «فقط مشتریان شما»', (await page.locator('#catpriv-sub').textContent()).includes('فقط مشتریان شما'));
T('cset: زیرنویس اصناف — «در حالت خصوصی مؤثر نیست»', (await page.locator('#trade-sub').textContent()).includes('مؤثر نیست'));
await page.click('#sheet-cset .btn[data-close]'); await sleep(250);
T('۰۱: چیپ «کاتالوگ خصوصی» پیدا شد', await page.locator('#cat-priv-chip').isVisible() && (await page.locator('#cat-priv-chip').textContent()).includes('خصوصی'));
await page.click('#scr-01 .cp-ic[data-sheet="sheet-share"]'); await sleep(300);
T('share: زیرنویس خصوصی — ثبت‌نام از لینک یعنی مشتری شدن', (await page.locator('#share-sub').textContent()).includes('مشتری شدن'));
await page.click('#sheet-share [data-sheet="sheet-cshare"]'); await sleep(300);
T('cshare: یادداشت خصوصی — «قیمت\u200cها را می\u200cبیند»', (await page.locator('#cshare-note').textContent()).includes('قیمت\u200cها را می\u200cبیند'));
await page.click('#sheet-cshare .btn[data-close]'); await sleep(250);
await shot('01-01-chip-cset');

/* ═══ ۳. درگاه پیش‌نمایش مالک (بازوی فروش) = قیف مهمان ═══ */
await page.goto(FILE + '#13'); await sleep(400);
T('۱۳: بنر درگاه ظاهر شد', await page.locator('#priv-13').isVisible());
T('۱۳: عنوان «قیمت\u200cها فقط برای مشتریان این فروشنده»', (await page.locator('.pv13-h').textContent()).includes('فقط برای مشتریان'));
T('۱۳: متن مهمان — ثبت\u200cنام سریع', (await page.locator('#priv13-t').textContent()).includes('ثبت\u200cنام سریع'));
T('۱۳: دکته «مشاهده قیمت\u200cها» برای مهمان', await page.locator('#priv13-reg').isVisible() && await page.locator('#priv13-save').isHidden());
T('۱۳: کلاس priv-gate روی صفحه', await page.evaluate(() => document.getElementById('scr-13').classList.contains('priv-gate')));
T('۱۳: قیمت کارت اول بلور است', (await page.evaluate(() => getComputedStyle(document.querySelector('#scr-13 .pcard .p')).filter)) !== 'none');
await shot('02-13-gate-blur');

/* لمس کارت در حالت درگاه → بنر فلش می\u200cزند، نه ناوبری به ۰۲ */
await page.click('#scr-13 .pcard .info'); await sleep(300);
T('۱۳: لمس کارت در درگاه → ماندن در ۱۳ (نه جزئیات کالا)', (await page.evaluate(() => location.hash)) === '#13' && await page.locator('#scr-13').isVisible());

/* ثبت\u200cنام سریع: خالی → خطا؛ پر → قیمت‌ها باز */
await page.click('#priv13-reg'); await sleep(300);
T('شیت privreg باز + دو فیلد', await page.locator('#sheet-privreg.show').isVisible() && (await page.locator('#priv-tel').count()) === 1 && (await page.locator('#priv-name').count()) === 1);
await page.click('#sheet-privreg [data-privreg]'); await sleep(300);
T('خالی: خطای «شماره موبایل و نام را وارد کنید»', await page.locator('#priv-err').isVisible());
await page.fill('#priv-tel', '۰۹۱۲ ۳۳۳ ۴۴۵۵');
await page.fill('#priv-name', 'رضا محمدی');
await shot('03-privreg-sheet');
await page.click('#sheet-privreg [data-privreg]'); await sleep(450);
T('ثبت\u200cنام: شیت بسته + درگاه برداشته شد', await page.locator('#sheet-privreg.show').isHidden() && (await page.evaluate(() => !document.getElementById('scr-13').classList.contains('priv-gate'))));
T('ثبت\u200cنام: بلور قیمت\u200cها رفته', (await page.evaluate(() => getComputedStyle(document.querySelector('#scr-13 .pcard .p')).filter)) === 'none');
T('ثبت\u200cنام: پیام خوش\u200cآمد با نام مهمان', await page.locator('#priv-ok').isVisible() && (await page.locator('#priv-ok').textContent()).includes('رضا محمدی') && (await page.locator('#priv-ok').textContent()).includes('تأمین\u200cکنندگان من'));
await shot('04-13-unlocked-note');

/* ورود دوباره = قیف از ابتدا (CATPRIV.reg ریست) */
await page.goto(FILE + '#01'); await sleep(250);
await page.goto(FILE + '#13'); await sleep(350);
T('ورود دوباره ۱۳: درگاه دوباره بسته است (قیف تکرارشدنی)', await page.locator('#priv-13').isVisible());

/* ═══ ۴. سمت خریدار — لبهٔ دوطرفهٔ واقعی ═══ */
/* ورود به ۰۸ خودش بازوی خرید را فعال می‌کند (data-arm=buy) — بدون reload که state خصوصی را می‌شوید */
await page.goto(FILE + '#08'); await sleep(400);
T('بازوی خرید فعال شد', (await page.evaluate(() => document.getElementById('phone').dataset.arm)) === 'buy');
await page.goto(FILE + '#13'); await sleep(400);
T('خریدارِ مشتری: قیمت\u200cها بدون درگاه', await page.locator('#priv-13').isHidden() && (await page.evaluate(() => !document.getElementById('scr-13').classList.contains('priv-gate'))));
T('خریدارِ مشتری: buybar «ذخیره شد» سبز', (await page.locator('#catsave-13.catsave-on').count()) === 1);
await shot('05-13-buy-customer');

/* حذف پخش برنج پارس از تأمین\u200cکنندگان من (۱۰) = کشتن لبه */
await page.goto(FILE + '#10'); await sleep(400);
await page.click('#saved-cats .row-card [data-sheet="sheet-catmenu"] >> nth=0'); await sleep(300);
T('catmenu: عنوان ردیف اول (پخش برنج پارس)', (await page.locator('#catmenu-title').textContent()).includes('پخش برنج پارس'));
await page.click('#sheet-catmenu [data-catdel]'); await sleep(350);
T('۱۰: ردیف پخش برنج پارس حذف شد (۳→۲)', (await page.locator('#saved-cats > .row-card:not(.sup-wait)').count()) === 2 && (await page.locator('#saved-cats-count').textContent()).includes('۲ تأمین\u200cکننده'));

/* حالا کاتالوگ خصوصی برای خریدارِ غیرمشتری قفل است */
await page.goto(FILE + '#13'); await sleep(400);
T('خریدارِ غیرمشتری: درگاه ظاهر شد', await page.locator('#priv-13').isVisible() && await page.evaluate(() => document.getElementById('scr-13').classList.contains('priv-gate')));
T('درگاه عضو: متن «کاتالوگ را ذخیره کنید تا مشتری شوید»', (await page.locator('#priv13-t').textContent()).includes('ذخیره کنید تا مشتری شوید'));
T('درگاه عضو: دکته «ذخیره کاتالوگ» (نه ثبت\u200cنام)', await page.locator('#priv13-save').isVisible() && await page.locator('#priv13-reg').isHidden());
T('خریدارِ غیرمشتری: قیمت\u200cها بلور', (await page.evaluate(() => getComputedStyle(document.querySelector('#scr-13 .pcard .p')).filter)) !== 'none');
await shot('06-13-buy-locked');

/* ذخیرهٔ دوباره از خود درگاه = بازگشت لبه */
await page.click('#priv13-save'); await sleep(450);
T('ذخیره از درگاه: قفل باز شد + پیام ذخیره', await page.evaluate(() => !document.getElementById('scr-13').classList.contains('priv-gate')) && (await page.locator('#priv-ok').textContent()).includes('ذخیره شد'));
T('buybar: «ذخیره شد» برگشت', (await page.locator('#catsave-13.catsave-on').count()) === 1);
await page.goto(FILE + '#10'); await sleep(350);
T('۱۰: ردیف پخش برنج پارس برگشت (۲→۳)', (await page.locator('#saved-cats > .row-card:not(.sup-wait)').count()) === 3 && (await page.locator('#saved-cats-count').textContent()).includes('۳ تأمین\u200cکننده'));

/* ═══ ۵. افزودن مشتری با شماره (۶۲) — ورود به ۶۲ خودش بازوی فروش را فعال می‌کند ═══ */
await page.goto(FILE + '#62'); await sleep(400);
T('۶۲: دکته «افزودن مشتری — با شماره موبایل»', await page.locator('#cust-add').isVisible() && (await page.locator('#cust-add').textContent()).includes('افزودن مشتری'));
await page.click('#cust-add'); await sleep(300);
T('شیت custadd باز + دو فیلد', await page.locator('#sheet-custadd.show').isVisible() && (await page.locator('#cua-tel').count()) === 1 && (await page.locator('#cua-name').count()) === 1);
await page.click('#sheet-custadd [data-custadd]'); await sleep(300);
T('خالی: خطای افزودن', await page.locator('#cua-err').isVisible());
await page.fill('#cua-tel', '۰۹۳۵ ۱۲۳ ۴۵۶۷');
await page.fill('#cua-name', 'رضا محمدی');
await shot('07-custadd-sheet');
await page.click('#sheet-custadd [data-custadd]'); await sleep(450);
T('افزودن: ردیف «در انتظار عضویت» اول لیست', (await page.locator('#cust-rows .cust-wait').count()) === 1 && (await page.locator('#cust-rows .row-card').first().textContent()).includes('رضا محمدی'));
T('افزودن: بج «در انتظار عضویت» + شماره + «امروز اضافه شد»', (await page.locator('#cust-rows .cust-wait').textContent()).includes('در انتظار عضویت') && (await page.locator('#cust-rows .cust-wait').textContent()).includes('۰۹۳۵') && (await page.locator('#cust-rows .cust-wait').textContent()).includes('اضافه شد'));
T('افزودن: در شمار مشتریان نمی\u200cنشیند (۴۱ می\u200cماند)', (await page.locator('#cust-n').textContent()) === '۴۱');
T('افزودن: بج «جدید» نمی\u200cگیرد (خود فروشنده ساخت)', !(await page.locator('#cust-rows .cust-wait .cust-new').count()));
await shot('08-62-waitrow');

/* منوی ردیف در انتظار عضویت */
await page.click('#cust-rows .cust-wait [data-cdots]'); await sleep(300);
T('custwait: شیت باز + عنوان هم\u200cگام', await page.locator('#sheet-custwait.show').isVisible() && (await page.locator('#custwait-title').textContent()).includes('رضا محمدی'));
T('custwait: ارسال دوبارهٔ لینک + حذف', (await page.locator('#sheet-custwait [data-smssend]').count()) === 1 && (await page.locator('#sheet-custwait [data-custwaitdel]').count()) === 1);
await page.click('#sheet-custwait [data-smssend]'); await sleep(300);
T('custwait: ارسال دوباره → «پیامک شد ✓»', (await page.locator('#sheet-custwait [data-smssend]').textContent()).includes('پیامک شد'));
await page.click('#sheet-custwait [data-custwaitdel]'); await sleep(400);
T('حذف انتظار: ردیف رفت (۷→۶) + شمارنده ۴۱ سالم', (await page.locator('#cust-rows .row-card').count()) === 6 && !(await page.locator('#cust-rows .cust-wait').count()) && (await page.locator('#cust-n').textContent()) === '۴۱');

/* ═══ ۶. خاموش کردن خصوصی ═══ */
await page.goto(FILE + '#01'); await sleep(300);
await page.click('#scr-01 .cat-set'); await sleep(300);
await page.click('#catpriv-sw'); await sleep(300);
T('خاموش: زیرنویس cset برگشت عمومی', (await page.locator('#catpriv-sub').textContent()).includes('همهٔ خریداران'));
T('خاموش: زیرنویس اصناف برگشت', (await page.locator('#trade-sub').textContent()).includes('پیش\u200cفرض: همه'));
await page.click('#sheet-cset .btn[data-close]'); await sleep(250);
T('خاموش: چیپ ۰۱ مخفی شد', await page.locator('#cat-priv-chip').isHidden());
await page.goto(FILE + '#13'); await sleep(400);
T('خاموش: ۱۳ بدون درگاه و بدون بلور', await page.locator('#priv-13').isHidden() && (await page.evaluate(() => getComputedStyle(document.querySelector('#scr-13 .pcard .p')).filter)) === 'none');

/* ریلود: همه\u200cچیز به حالت اولیه (دموی تکرارشدنی) */
await page.goto(FILE + '#62'); await page.reload(); await sleep(350);
T('ریلود: ۶ ردیف مشتری اولیه', (await page.locator('#cust-rows .row-card').count()) === 6);

/* e2e */
T('e2e: صفر خطای کنسول/صفحه', errors.length === 0);

await browser.close();
console.log('\n═══ فاز ۶۱ ═══');
console.log('PASS: ' + ok + ' / FAIL: ' + bad);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
process.exit(bad ? 1 : 0);
