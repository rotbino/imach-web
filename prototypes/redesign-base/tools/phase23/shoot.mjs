// tools/phase23/shoot.mjs — اسکرین‌شات جایگاه‌های تبلیغاتی هدفمند (سمت خریدار)
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTML = resolve(ROOT, 'tools/phase23/adslot-mock.html');
const OUT = resolve(ROOT, 'png/p23');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 1240 }, deviceScaleFactor: 2 });

await page.goto('file://' + HTML);
await page.waitForTimeout(600);

await page.locator('#shot-saved').screenshot({ path: OUT + '/slot-saved-cats.png' });
await page.locator('#shot-board').screenshot({ path: OUT + '/slot-supply-board.png' });

await browser.close();
console.log('OK → png/p23/slot-saved-cats.png + slot-supply-board.png');
