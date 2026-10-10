import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const FILE = 'file://' + process.cwd() + '/index.html';
const OUT = 'png/p47';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (const s of ['02', '13', '16', '44', '34', '29']) {
  await page.goto(FILE + '#' + s); await page.reload(); await sleep(320);
  await page.screenshot({ path: OUT + '/reg-' + s + '.png' });
  console.log('shot reg-' + s);
}
await browser.close();
console.log('done');
