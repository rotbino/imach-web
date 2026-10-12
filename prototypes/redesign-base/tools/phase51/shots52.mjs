// فاز ۵۲ — شات اسکرول‌شده تا کارت طارم (بج قیمت منقضی کنار چرخ‌دنده)
import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', 'shots', 'phase51');
const FILE = 'file://' + resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(FILE + '#01');
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));
await page.reload();
await sleep(400);
await page.evaluate(() => {
  const bd = document.querySelector('#scr-01 .stale-bdg');
  if (bd) bd.scrollIntoView({ block: 'center' });
});
await sleep(400);
await page.screenshot({ path: OUT + '/52-01-stale-badge.png' });
console.log('✓ 52-01-stale-badge');
await browser.close();
