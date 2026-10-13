// فاز ۵۰ — QA قطعی: ثبت‌نام تک‌بازو + پنهان‌شدن سوییچر + گارد بازوی خاموش + سازگاری مهلت
// فاز ۵۶: پیل‌های «فعالیت شما در بازار» → دو سوییچر «کدام دستیار فعال باشد» + حداقل یکی + مودال اینفو
// سناریوها: فروش عمده → فرود ۰۱ بدون پیل · خرید عمده → فرود ۰۸ بدون پیل · هر دو → ۰۱ با پیل ·
// خاموش‌کردن از ۲۲ + گارد صفحات بازوی خاموش + روشن‌کردن دوباره از ۲۲ · ورود (۱۷) احترام به ASSIST ·
// کارت inq3 «۴ روز مانده» (رفع «بدون مهلت») + e2e هر ۲۷ صفحه صفر خطا
import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = 'file://' + process.cwd() + '/index.html';
const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..'); /* redesign-base — مستقل از cwd */
const has = (p) => existsSync(resolve(RB, p));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const shot = async (n) => { await page.screenshot({ path: '/home/z/my-project/shots-p50/' + n + '.png', clip: { x: 34, y: 0, width: 402, height: 874 } }); };

let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };
const assist = () => page.evaluate(() => JSON.parse(localStorage.getItem('imach-assist') || 'null'));

/* ═══ ۰. گاردهای ساختاری ═══ */
const ALIVE = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','27','29','30','34','42','43','44','45','46','48','53'];
await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
await page.goto(FILE + '#16');
await page.reload();
await sleep(300);
T('ساختار: ۳۳ صفحه داخل گوشی (فاز ۶۰: +۶۲ · فاز ۶۴: +۶۴/۶۵ سفارش‌ها)', await page.evaluate(() => document.querySelectorAll('#phone > section.scr').length === 33));
T('ساختار: هیچ scr بیرون از گوشی/استیج', await page.evaluate(() => document.querySelectorAll('#stage > .scr, body > .scr').length === 0));
T('ساختار: ارتفاع سند ≤ ۱۰۰۰', await page.evaluate(() => document.documentElement.scrollHeight <= 1000));
T('۱۶: عنوان «کدام دستیار برای کسب و کار شما فعال باشد»', (await page.locator('#scr-16 .lbl-row label').textContent()) === 'کدام دستیار برای کسب و کار شما فعال باشد');
T('۱۶: دو سوییچر خرید/فروش (فاز ۵۶)', await page.locator('#su-assist .toggle[data-suarm]').count() === 2);
T('۱۶: پیش‌فرض فروش روشن، خرید خاموش', await page.locator('#su-assist .toggle[data-suarm="sell"].on').count() === 1 && await page.locator('#su-assist .toggle[data-suarm="buy"]:not(.on)').count() === 1);
T('۱۶: آیکون اینفو → مودال توضیح (فاز ۵۶)', await page.locator('#scr-16 .info-ic[data-sheet="dlg-suinfo"]').count() === 1 && await page.locator('#dlg-suinfo').count() === 1);
T('۱۶: دکمهٔ «ساخت حساب و ورود» → ۰۱ سیم‌شده', await page.locator('#scr-16 [data-go="01"]').count() === 1);
await shot('00-signup');

/* ═══ ۱. ثبت‌نام تک‌بازو — فروش عمده (پیش‌فرض) ═══ */
await page.evaluate(() => localStorage.removeItem('imach-assist'));
await page.goto(FILE + '#16'); await page.reload(); await sleep(300);
await page.click('#scr-16 [data-go="01"]'); await sleep(300);
T('فروش: فرود روی ۰۱', await page.evaluate(() => location.hash === '#01' && !document.getElementById('scr-01').hidden));
T('فروش: ASSIST = فقط sell', (await assist()).sell === true && (await assist()).buy === false);
T('فروش: پیل تعویض دستیار مخفی', await page.locator('#scr-01 .arm-pill').isHidden());
await shot('01-sell-only');

/* ═══ ۲. ثبت‌نام تک‌بازو — خرید عمده (سوییچر: خرید روشن، بعد فروش خاموش) ═══ */
await page.goto(FILE + '#16'); await page.reload(); await sleep(300);
await page.click('#su-assist .toggle[data-suarm="buy"]'); await sleep(150);
await page.click('#su-assist .toggle[data-suarm="sell"]'); await sleep(150);
await page.click('#scr-16 [data-go="01"]'); await sleep(300);
T('خرید: فرود روی ۰۸', await page.evaluate(() => location.hash === '#08' && !document.getElementById('scr-08').hidden));
T('خرید: ASSIST = فقط buy', (await assist()).buy === true && (await assist()).sell === false);
T('خرید: پیل تعویض دستیار مخفی روی ۰۸', await page.locator('#scr-08 .arm-pill').isHidden());
await shot('02-buy-only');

/* ═══ ۳. گارد صفحات بازوی خاموش ═══ */
await page.evaluate(() => location.hash = '#01'); await sleep(400);
T('گارد: تلاش برای ۰۱ → بازگشت به ۰۸', await page.evaluate(() => location.hash === '#08' && !document.getElementById('scr-08').hidden));
await page.evaluate(() => location.hash = '#05'); await sleep(400);
T('گارد: تلاش برای ۰۵ (فروش) → بازگشت به ۰۸', await page.evaluate(() => location.hash === '#08'));
await page.evaluate(() => location.hash = '#09'); await sleep(400);
T('گارد: تلاش برای ۰۹ (خرید) مجاز', await page.evaluate(() => location.hash === '#09'));

/* ═══ ۴. ثبت‌نام — هر دو (سوییچر خرید را هم روشن کن) ═══ */
await page.goto(FILE + '#16'); await page.reload(); await sleep(300);
await page.click('#su-assist .toggle[data-suarm="buy"]'); await sleep(150);
await page.click('#scr-16 [data-go="01"]'); await sleep(300);
T('هر دو: فرود روی ۰۱', await page.evaluate(() => location.hash === '#01'));
T('هر دو: ASSIST هر دو روشن', (await assist()).sell === true && (await assist()).buy === true);
T('هر دو: پیل تعویض دستیار نمایان', await page.locator('#scr-01 .arm-pill').isVisible());
await shot('03-both-pill');

/* ═══ ۴-ب. حداقل یکی — خاموش‌کردن آخرین دستیار در ۱۶ رد می‌شود (فاز ۵۶) ═══ */
await page.goto(FILE + '#16'); await page.reload(); await sleep(300);
await page.click('#su-assist .toggle[data-suarm="sell"]'); await sleep(250);
T('۱۶: آخرین دستیار روشن می‌ماند', await page.locator('#su-assist .toggle[data-suarm="sell"].on').count() === 1);
T('۱۶: پیام خطا دیده شد (su-err)', await page.evaluate(() => { var e = document.getElementById('su-err'); return e && e.hidden === false; }));

/* ═══ ۵. خاموش/روشن از فرم ۲۲ (ویرایش کسب‌وکار) ═══ */
await page.goto(FILE + '#22'); await page.reload(); await sleep(300);
await page.click('[data-asst="buy"]'); await sleep(300);
T('۲۲: خاموش‌کردن خرید → ASSIST فقط فروش', (await assist()).sell === true && (await assist()).buy === false);
T('۲۲: چون بازوی جاری (فروش) روشن است، جابه‌جایی نمی‌خواهد', await page.evaluate(() => location.hash === '#22'));
await page.evaluate(() => location.hash = '#08'); await sleep(400);
T('گارد پس از خاموشی: ۰۸ → بازگشت به ۰۱ (خانهٔ فروش)', await page.evaluate(() => location.hash === '#01'));
T('۲۲: پیل مخفی شد', await page.locator('#scr-01 .arm-pill').isHidden());
await page.goto(FILE + '#22'); await page.reload(); await sleep(300);
T('۲۲: سوییچ خرید خاموش است', await page.evaluate(() => !document.querySelector('[data-asst="buy"]').classList.contains('on')));
await page.click('[data-asst="buy"]'); await sleep(300);
T('۲۲: روشن‌کردن دوباره خرید → هر دو روشن', (await assist()).sell === true && (await assist()).buy === true);
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
T('۲۲: پیل دوباره نمایان روی ۰۱', await page.locator('#scr-01 .arm-pill').isVisible());
/* حداقل یکی روشن: خاموش‌کردن آخرین دستیار رد می‌شود */
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: false })); });
await page.goto(FILE + '#22'); await page.reload(); await sleep(300);
await page.click('[data-asst="sell"]'); await sleep(250);
T('۲۲: آخرین دستیار روشن می‌ماند', (await assist()).sell === true && (await assist()).buy === false);
T('۲۲: پیام خطا دیده شد', await page.evaluate(() => { var e = document.getElementById('as-err'); return e && e.hidden === false; }));

/* ═══ ۶. ورود (۱۷) احترام به وضعیت دستیارها ═══ */
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: false, buy: true })); });
await page.goto(FILE + '#17'); await page.reload(); await sleep(300);
await page.evaluate(() => location.hash = '#01'); await sleep(400);
T('ورود با فروشِ خاموش → فرود ۰۸ نه ۰۱', await page.evaluate(() => location.hash === '#08'));

/* ═══ ۷. سازگاری مهلت — کارت inq3 ═══ */
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
const cards = page.locator('#scr-45 .inq-card');
T('۴۵: هیچ «بدون مهلت» نیست', !(await page.locator('#scr-45').textContent()).includes('بدون مهلت'));
T('۴۵: کارت سوم «۴ روز مانده»', (await cards.nth(2).textContent()).includes('۴ روز مانده'));
await page.click('#scr-45 .inq-card:nth-child(1)'); await sleep(300);
T('۴۵ → ۴۸ ناوبری کارت', await page.evaluate(() => location.hash === '#48'));
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('.inq-card[data-inq="inq3"]'); await sleep(350);
T('۴۸: inq3 مهلت «۴ روز مانده» در خلاصه', await page.evaluate(() => location.hash === '#48') && (await page.locator('#of48-meta').textContent()).includes('۴ روز مانده'));

/* ═══ ۸. پاکسازی — فایل‌های طراحی قدیمی حذف شده‌اند ═══ */
T('پاکسازی: prototypes/redesign-old حذف', !has('../redesign-old'));
T('پاکسازی: prototypes/mvp-design حذف', !has('../mvp-design'));
T('پاکسازی: prototypes/mvp-final حذف', !has('../mvp-final'));
T('پاکسازی: shots/ (ریشهٔ ریپو) حذف', !has('../../shots'));
T('پاکسازی: screens/ قدیمی حذف', !has('screens'));
T('پاکسازی: build.mjs مرده حذف', !has('tools/build.mjs'));
T('پاکسازی: gallery/overview/architecture حذف', !has('gallery.html') && !has('overview.html') && !has('architecture.html'));
T('پاکسازی: ابزارهای QA فقط زنده‌اند (۹ پوشه)', ['phase36','phase43','phase44','phase45','phase46','phase47','phase48','phase49','phase50'].every(p => has('tools/' + p)));
T('پاکسازی: فقط تصاویر مرجع‌شده مانده‌اند', ['01-sell-catalog.png','09-supply-board.png','d3-desktop-landing.jpg','map-flat.jpg','goods','users'].every(f => has('png/' + f)) && !has('png/p44'));

/* ═══ ۹. e2e — هر ۲۵ صفحه صفر خطا (هر دو دستیار روشن) ═══ */
for (const s of ALIVE) {
  await page.goto(FILE + '#' + s); await page.reload(); await sleep(260);
}
T('e2e: صفر خطای کنسول در ۳۰ صفحه', errors.length === 0);
if (errors.length) console.log('  errors:', errors.slice(0, 5));

await browser.close();
console.log('\n════ فاز ۵۰: ' + ok + ' PASS / ' + bad + ' FAIL ════');
process.exit(bad ? 1 : 0);
