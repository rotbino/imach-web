// فاز ۴۳ — اسکرین‌شات‌های فرم جدید افزودن کالا
import { chromium } from 'playwright';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const FILE = 'file://' + process.cwd() + '/index.html';
const OUT = 'png/p43/';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
await page.goto(FILE + '#04');
await page.reload();
await sleep(300);

await page.screenshot({ path: OUT + '04-step1-empty.png' });

await page.fill('#gf-q', 'هاشمی');
await sleep(150);
await page.screenshot({ path: OUT + '04-step1-search.png' });

await page.locator('.gf-row').first().click();
await sleep(200);
await page.screenshot({ path: OUT + '04-step2-good-dup.png' });

await page.locator('[data-gfreset]').click();
await sleep(120);
await page.fill('#gf-q', 'روغن لادن');
await sleep(150);
await page.locator('.gf-row').first().click();
await sleep(200);
await page.fill('#gf-price', '۲٬۴۵۰٬۰۰۰');
await page.fill('#gf-stock', '۸');
await page.fill('#gf-min', '۱');
await sleep(150);
await page.screenshot({ path: OUT + '04-step2-ref.png' });

await page.locator('[data-gfreset]').click();
await sleep(120);
await page.fill('#gf-q', 'رب روژین');
await sleep(150);
await page.locator('.gf-newcta').click();
await sleep(200);
await page.locator('[data-gfnewgood]').first().click();
await sleep(150);
await page.screenshot({ path: OUT + '04-step2-new.png' });

await page.locator('[data-gfreset]').click();
await sleep(120);
await page.locator('.gf-paste').click();
await sleep(300);
await page.locator('#paste-sample').click();
await sleep(120);
await page.locator('#paste-run').click();
await sleep(300);
await page.screenshot({ path: OUT + '04-paste-matched.png' });

await browser.close();
console.log('shots done → ' + OUT);
