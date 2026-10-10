// فاز ۴۵ — اسکرین‌شات‌های راستی‌آزمایی بصری (قاب کامل گوشی)
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'shots', 'phase45');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(URL);
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));

const phone = page.locator('#phone');
async function shot(name, hash, pre) {
  await page.goto(URL + '#' + hash);
  await page.reload();
  await page.waitForTimeout(350);
  if (pre) { await pre(); await page.waitForTimeout(400); }
  await phone.screenshot({ path: OUT + '/' + name + '.png' });
  console.log('✓', name);
}

await shot('45-01-catalog', '01');
await shot('45-08-buylist', '08');
await shot('45-45-inquiries', '45');
await shot('45-34-additem', '34');
await shot('45-34-search', '34', async () => { await page.fill('#gl-q', 'پفک'); });
await shot('45-42-profile', '42');
await shot('45-42-ppedit', '42', async () => { await page.click('#scr-42 .pp-me'); });
await shot('45-44-grid', '44');
await shot('45-44-pctpanel', '44', async () => {
  await page.click('.bk-pct[data-pcttoggle]');
  await page.waitForTimeout(200);
  await page.click('#bk-pctbar .pct-plus');
  await page.click('#bk-pctbar .pct-plus');
  await page.click('#bk-pctbar .pct-plus');
});
await shot('45-01-quickps', '01', async () => { await page.click('#scr-01 .pcard .gear'); });
await shot('45-12-rfq', '12');
await shot('45-02-owner', '02');

await browser.close();
console.log('DONE →', OUT);
