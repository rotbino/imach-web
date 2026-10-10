// فاز ۴۸ — اسکرین‌شات‌های راستی‌آزمایی بصری (قاب کامل گوشی)
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'shots', 'phase48');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(URL);
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));

const phone = page.locator('#phone');
async function shot(name, hash, pre) {
  await page.goto(URL + '#' + hash);
  await page.reload();
  await page.waitForTimeout(350);
  if (pre) { await pre(); await page.waitForTimeout(450); }
  await phone.screenshot({ path: OUT + '/' + name + '.png' });
  console.log('✓', name);
}

/* ۴۴ — حالت اولیه: دو دکمهٔ انتخاب نیت بالا + گرید قفل + بدون متن اضافی */
await shot('48-44-intent', '44');

/* ۴۴ — بعد از «نیاز به آپدیت قیمت»: گرید باز، دکمهٔ آپدیت محو، تمدید مانده */
await shot('48-44-unlocked', '44', async () => { await page.click('#bk-need'); });

/* ۴۴ — پنل درصدی باز با ۵٫۵٪ + تغییرها: تمدید محو + ثبت تغییرات ظاهر */
await shot('48-44-pct-edit', '44', async () => {
  await page.click('#bk-need');
  await page.waitForTimeout(200);
  await page.click('#bk-pcticon');
  await page.waitForTimeout(200);
  for (let i = 0; i < 11; i++) await page.click('#bk-pctbar .pct-plus');
});

/* ۴۴ — سقف ۹۹: تایپ ۱۵۰ → کادر خودش ۹۹ می‌شود */
await shot('48-44-cap99', '44', async () => {
  await page.click('#bk-need');
  await page.waitForTimeout(200);
  await page.click('#bk-pcticon');
  await page.waitForTimeout(200);
  await page.fill('#pct-input', '۱۵۰');
});

/* ۰۱ — مودال تغییر سریع با سه فیلد (قیمت/موجودی/حداقل خرید) */
await shot('48-01-quickps', '01', async () => { await page.click('#scr-01 .pcard .gear'); });

await browser.close();
console.log('DONE →', OUT);
