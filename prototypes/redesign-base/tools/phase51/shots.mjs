// فاز ۵۱ — شات‌های VLM: پرداخت چک، تحویل در محل، جزئیات پیشنهاد، اعتبار قیمت، ردیف ویرایش ۴۴، قیمت منقضی ۰۹
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', 'shots', 'phase51');
mkdirSync(OUT, { recursive: true });
const FILE = 'file://' + resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(FILE);
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));

async function shot(name, hash, setup) {
  await page.goto(FILE + '#' + hash); await page.reload(); await sleep(350);
  if (setup) await setup();
  await sleep(400);
  await page.screenshot({ path: OUT + '/' + name + '.png' });
  console.log('✓', name);
}

/* ۱۲ — مهلت: ۱-۴ + بیشتر با ورودی */
await shot('51-12-deadline', '12', async () => {
  await page.click('#iq-dlmore'); await sleep(150);
  await page.fill('#iq-dlnum', '۷'); await sleep(200);
});

/* فرم پیشنهاد — چک روشن با درصد پیوسته + جمع‌بندی خوانا */
await shot('51-reqview-pay', '05', async () => {
  await page.click('#scr-05 .req-card[data-req="rq1"]'); await sleep(350);
  await page.click('#reqv-chk'); await sleep(200);
  await page.fill('#reqv-cash', '۲۰'); await sleep(250);
});

/* ۴۸ — هدر برجسته + کارت‌های مقایسه‌ای */
await shot('51-48-list', '45', async () => {
  await page.click('#scr-45 .inq-card[data-inq="inq1"]'); await sleep(450);
});

/* شیت جزئیات پیشنهاد */
await shot('51-ofview', '45', async () => {
  await page.click('#scr-45 .inq-card[data-inq="inq1"]'); await sleep(450);
  await page.click('#of48-list .card[data-ofv="0"]'); await sleep(400);
});

/* quickps — قیمت + اعتبار */
await shot('51-quickps', '01', async () => {
  await page.click('#scr-01 .pcard .gear'); await sleep(350);
});

/* ۴۴ — ردیف ویرایش + اعتبار + پنل درصد */
await shot('51-44-editbar', '44', async () => {
  await page.click('#bk-need'); await sleep(200);
  await page.click('#bk-editbar .bk-pctbtn'); await sleep(200);
  await page.click('#bk-pctbar .pct-plus'); await sleep(200);
});

/* ۰۹ — قیمت منقضی گشوده */
await shot('51-09-stale', '09', async () => {
  await page.click('#scr-09 .stale-bar'); await sleep(250);
});

/* ۰۷ — کاتالوگ شما نزد خریداران + شیت reach */
await shot('51-07-reach', '07');
await shot('51-sheet-reach', '07', async () => {
  await page.click('#scr-07 [data-sheet="sheet-reach"]'); await sleep(350);
});

/* ۱۳ — آمار تماس */
await shot('51-13-stats', '13');

/* ۰۲ — پلهٔ حداقل خرید در تخفیف حجمی */
await shot('51-02-tiers', '02');

await browser.close();
console.log('DONE →', OUT);
