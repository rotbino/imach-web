// فاز ۴۴ — اسکرین‌شات صفحه‌های کلیدی برای داوری VLM
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const FILE = 'file://' + process.cwd() + '/index.html';
const OUT = 'png/p44';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const shots = [
  ['01', '01-catalog'],
  ['42', '42-profile-hub'],
  ['29', '29-charge'],
  ['30', '30-ads'],
  ['12', '12-request'],
  ['27', '27-notifs'],
  ['08', '08-buy-list'],
  ['07', '07-settings-sell'],
];

for (const [hash, name] of shots) {
  await page.goto(FILE + '#' + hash);
  await page.reload();
  await sleep(320);
  await page.screenshot({ path: OUT + '/' + name + '.png' });
  console.log('shot', name);
}

// ۰۲ در حالت مالک (از ۰۱)
await page.goto(FILE + '#01'); await page.reload(); await sleep(250);
await page.click('#scr-01 .pcard'); await sleep(350);
await page.screenshot({ path: OUT + '/02-owner.png' });
console.log('shot 02-owner');

// ۰۲ در حالت خریدار (از ۱۳)
await page.goto(FILE + '#13'); await page.reload(); await sleep(250);
await page.click('#scr-13 .pcard'); await sleep(350);
await page.screenshot({ path: OUT + '/02-buyer.png' });
console.log('shot 02-buyer');

// ۰۴ گام ۲ (فرم قیمت)
await page.goto(FILE + '#04'); await page.reload(); await sleep(250);
await page.fill('#gf-q', 'هاشمی'); await sleep(200);
await page.click('.gf-row'); await sleep(300);
await page.screenshot({ path: OUT + '/04-step2.png' });
console.log('shot 04-step2');

// ۴۴
await page.goto(FILE + '#44'); await page.reload(); await sleep(300);
await page.screenshot({ path: OUT + '/44-bulk.png' });
console.log('shot 44-bulk');

await browser.close();
console.log('done');
