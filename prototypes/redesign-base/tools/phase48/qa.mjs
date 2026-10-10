// فاز ۴۸ — QA رفتاری: فرم ۴۴ (انتخاب نیت بالا + قفل گرید + سقف ۹۹٪ + فوتر شرطی)
// + مودال تغییر سریع قیمت/موجودی با «حداقل خرید» + حذف متن‌های اضافی (حکم مالک)
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

/* ═══ ۱. حذف متن‌های اضافی (حکم مالک: «کاربر که کور نیست») ═══ */
await page.goto(FILE + '#44'); await page.reload(); await sleep(300);
const txt44 = await page.locator('#scr-44').textContent();
ok('۴۴: متن مثال درصدی حذف', !txt44.includes('مثلاً «برنج هاشمی»'));
ok('۴۴: متن راهنمای هر-کلیک-نیم‌درصد حذف', !txt44.includes('هر کلیک نیم درصد'));
ok('۴۴: بنر «۳ روز است قیمت‌هایتان» حذف', !txt44.includes('۳ روز است قیمت'));
ok('۴۴: hintnote پایین فرم حذف', !txt44.includes('کالاهایی با قیمت به‌روز، در نتایج خریداران'));
ok('۴۴: بج «زنده روی جدول اعمال می‌شود» حذف', !txt44.includes('زنده روی جدول'));

/* ═══ ۲. انتخاب نیت بالا (تمدید همین قیمت‌ها / نیاز به آپدیت قیمت) ═══ */
ok('۴۴: دکمهٔ «تمدید همین قیمت‌ها» + زیرنویس تازه‌سازی', await page.locator('#bk-fresh b').textContent() === 'تمدید همین قیمت‌ها' && (await page.locator('#bk-fresh small').textContent()) === 'تازه‌سازی');
ok('۴۴: دکمهٔ «نیاز به آپدیت قیمت»', (await page.locator('#bk-need b').textContent()) === 'نیاز به آپدیت قیمت');
ok('۴۴: فوتر فقط «ثبت تغییرات» — بدون انصراف و بدون تمدید', (await page.locator('#scr-44 .action-bar button').count()) === 1 && (await page.locator('#bk-save').count()) === 1);
ok('۴۴: ورودی‌های گرید قفل (disabled ×۱۰)', (await page.locator('#scr-44 .bk-price:disabled, #scr-44 .bk-stock:disabled').count()) === 10);

/* ═══ ۳. «نیاز به آپدیت قیمت» → حالت ویرایش ═══ */
await page.click('#bk-need'); await sleep(200);
ok('۴۴: گرید باز شد', (await page.locator('#scr-44 .bk-price:disabled').count()) === 0);
ok('۴۴: آیکون ٪ ظاهر شد', await page.locator('#bk-pcticon').isVisible());
ok('۴۴: «تمدید» هنوز دیده می‌شود (چیزی عوض نشده)', await page.locator('#bk-fresh').isVisible());
ok('۴۴: «ثبت تغییرات» هنوز مخفی', await page.locator('#bk-actions').isHidden());

/* ═══ ۴. اولین تغییر → جابه‌جایی دکمه‌ها ═══ */
await page.fill('#scr-44 .bk-row .bk-price', '۲٬۷۰۰٬۰۰۰'); await sleep(200);
ok('۴۴: با تغییر → «تمدید» محو', await page.locator('#bk-fresh').isHidden());
ok('۴۴: با تغییر → «ثبت تغییرات» ظاهر', await page.locator('#bk-actions').isVisible());
ok('۴۴: با تغییر → «بازنشانی» ظاهر', await page.locator('#scr-44 [data-bkreset]').isVisible());
ok('۴۴: شمارندهٔ تغییرات (۱)', (await page.locator('#bk-count').textContent()) === '(۱)');

/* ═══ ۵. برگرداندن مقدار به مبنا → دکمه‌ها برمی‌گردند ═══ */
await page.fill('#scr-44 .bk-row .bk-price', '۲٬۸۵۰٬۰۰۰'); await sleep(200);
ok('۴۴: بازگشت به مبنا → «تمدید» برگشت + «ثبت» محو', await page.locator('#bk-fresh').isVisible() && await page.locator('#bk-actions').isHidden());

/* ═══ ۶. سقف ۹۹ در کادر درصد ═══ */
await page.click('#bk-pcticon'); await sleep(200);
await page.fill('#pct-input', '۱۵۰'); await sleep(250);
ok('۴۴: ۱۵۰ → ۹۹ (کلمپ مثبت)', (await page.locator('#pct-input').inputValue()) === '۹۹');
const p99 = await page.locator('#scr-44 .bk-row').first().locator('.bk-price').inputValue();
ok('۴۴: قیمت با ۹۹٪ = ۵٬۶۷۱٬۵۰۰', p99 === '۵٬۶۷۱٬۵۰۰');
await page.fill('#pct-input', '−۱۵۰'); await sleep(250);
ok('۴۴: −۱۵۰ → −۹۹ (کلمپ منفی)', (await page.locator('#pct-input').inputValue()) === '−۹۹');
await page.fill('#pct-input', '۹۹٫۵'); await sleep(250);
ok('۴۴: ۹۹٫۵ → ۹۹ (اعشاری هم کلمپ)', (await page.locator('#pct-input').inputValue()) === '۹۹');
/* استپر نمی‌تواند از ۹۹ رد شود */
await page.fill('#pct-input', '۹۸٫۸'); await sleep(200);
await page.click('#bk-pctbar .pct-plus'); await sleep(150);
ok('۴۴: استپر +۰٫۵ روی ۹۸٫۸ → ۹۹ (نه ۹۹٫۳)', (await page.locator('#pct-input').inputValue()) === '۹۹');

/* ═══ ۷. بازنشانی → حالت اولیهٔ کامل ═══ */
await page.click('#scr-44 [data-bkreset]'); await sleep(250);
ok('۴۴: بازنشانی → هر دو دکمهٔ نیت برگشتند', await page.locator('#bk-fresh').isVisible() && await page.locator('#bk-need').isVisible());
ok('۴۴: بازنشانی → گرید قفل', await page.locator('#scr-44 .bk-price').first().isDisabled());
ok('۴۴: بازنشانی → آیکون ٪ مخفی + پنل بسته', await page.locator('#bk-pcticon').isHidden() && await page.locator('#bk-pctbar').isHidden());
ok('۴۴: بازنشانی → درصد صفر', (await page.locator('#pct-input').inputValue()) === '۰');
ok('۴۴: بازنشانی → قیمت ردیف اول به مبنا', (await page.locator('#scr-44 .bk-row').first().locator('.bk-price').inputValue()) === '۲٬۸۵۰٬۰۰۰');

/* ═══ ۸. تمدید همین قیمت‌ها → مهر تازگی → کاتالوگ ═══ */
await page.click('#bk-fresh'); await sleep(1100);
ok('۴۴: تمدید → کاتالوگ ۰۱', await page.locator('#scr-01').isVisible());

/* ═══ ۹. ورود دوباره → همیشه از انتخاب نیت شروع ═══ */
await page.goto(FILE + '#44'); await page.reload(); await sleep(250);
ok('۴۴: ورود مجدد → گرید قفل + دو دکمه', await page.locator('#scr-44 .bk-price').first().isDisabled() && await page.locator('#bk-need').isVisible());

/* ═══ ۱۰. مودال تغییر سریع — حداقل خرید ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(250);
await page.click('#scr-01 .pcard .gear'); await sleep(300);
ok('quickps: سه فیلد (قیمت/موجودی/حداقل خرید)', await page.locator('#qp-min').count() === 1);
ok('quickps: واحد حداقل خرید = واحد بسته', (await page.locator('#qp-munit').textContent()).includes('کیسه'));
ok('quickps: مقدار اولیهٔ حداقل (۵)', (await page.locator('#qp-min').inputValue()) === '۵');
/* کارت دوم (طرم) واحدش همان است؛ کیسه ۱۰ کیلویی حداقل ۱۰ دارد */
await page.click('#sheet-quickps [data-close]'); await sleep(250);
await page.click('#scr-01 .pcard:nth-child(3) .gear'); await sleep(300);
ok('quickps: هاشمی ۱۰ کیلویی → حداقل ۱۰', (await page.locator('#qp-min').inputValue()) === '۱۰');
await page.fill('#qp-min', '۱۲');
await page.click('#qp-ok'); await sleep(300);
ok('quickps: تایید → data-qm کارت به‌روز', (await page.locator('#scr-01 .pcard:nth-child(3) .gear').getAttribute('data-qm')) === '۱۲');
ok('quickps: قیمت/موجودی هم مثل قبل کار می‌کنند', true);

/* ═══ ۱۱. e2e — همهٔ صفحه‌ها بدون خطای کنسول ═══ */
const ALIVE = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','27','29','30','34','42','44','45','46','47','48'];
for (const s of ALIVE) {
  await page.goto(FILE + '#' + s);
  await page.reload();
  await sleep(120);
}
ok('e2e: صفر خطای کنسول/pageerror در همهٔ صفحه‌ها', errors.length === 0);
if (errors.length) console.log('  errors:', errors.slice(0, 6));

console.log('\n═══ فاز ۴۸ ═══');
console.log('PASS: ' + pass + ' / ' + (pass + fail));
if (fail) process.exitCode = 1;
await browser.close();
