// tools/phase23/qa.mjs — QA فاز ۲۳ (مدل درآمدی): ناوبری + تعامل + اسکرین‌شات
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p23');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

await page.goto(URL + '#29');
await page.waitForTimeout(700);
const phone = page.locator('#phone');

// ۲۹ — کیف پول
await phone.screenshot({ path: OUT + '/29-wallet-top.png' });
await page.evaluate(() => { document.querySelector('#scr-29 .screen-body').scrollTop = 900; });
await page.waitForTimeout(250);
await phone.screenshot({ path: OUT + '/29-wallet-usage.png' });

// شارژ تعاملی: بستهٔ ۳۰۰ هزار + پرداخت
await page.locator('[data-pack="300000"]').click();
await page.locator('#wallet-charge').click();
await page.waitForTimeout(300);
const walletAfter = await page.locator('[data-wallet]').first().textContent();
console.log('wallet after charge (expect ۳۸۵٬۰۰۰):', walletAfter);

// ۳۰ — گزارش تبلیغ (کمپین)
await page.goto(URL + '#30');
await page.waitForTimeout(500);
await phone.screenshot({ path: OUT + '/30-report-camp.png' });

// سوییچ به هدفمند
await page.locator('[data-rep="target"]').click();
await page.waitForTimeout(300);
await phone.screenshot({ path: OUT + '/30-report-target.png' });
const tgtVisible = await page.locator('#rep-target').isVisible();
const campHidden = await page.locator('#rep-camp').isHidden();
console.log('report switch (target visible, camp hidden):', tgtVisible, campHidden);

// ۰۷ — پروفایل: کارت کیف پول + بخش تبلیغات
await page.goto(URL + '#07');
await page.waitForTimeout(450);
await phone.screenshot({ path: OUT + '/07-profile-wallet.png' });

// شیت تبلیغات هدفمند (جایگاه‌ها با تصویر)
await page.locator('#scr-07 [data-sheet="sheet-target"]').first().click();
await page.waitForTimeout(500);
await phone.screenshot({ path: OUT + '/sheet-target-slots.png' });
await page.locator('#backdrop').click({ position: { x: 20, y: 20 } });
await page.waitForTimeout(300);

// دیالوگ کمبود شارژ از شیت هدفمند
await page.goto(URL + '#03');
await page.waitForTimeout(400);
await page.locator('#scr-03 [data-sheet="sheet-target"]').click();
await page.waitForTimeout(400);
await page.locator('#sheet-target .sheet-cta').click();
await page.waitForTimeout(400);
await phone.screenshot({ path: OUT + '/dlg-lowcharge.png' });

// دیالوگ راه‌اندازی کمپین
await page.locator('#dlg-lowcharge [data-go="30"]').first().click();
await page.waitForTimeout(400);
await page.locator('#scr-30 .icon-btn[data-go="29"]').click();
await page.waitForTimeout(300);
await page.locator('#scr-29 .btn[data-sheet="sheet-campaign"]').click();
await page.waitForTimeout(400);
await page.locator('#sheet-campaign .sheet-cta').click();
await page.waitForTimeout(400);
await phone.screenshot({ path: OUT + '/dlg-campok.png' });
await page.locator('#dlg-campok [data-close]').click();
await page.waitForTimeout(200);

// ۰۱ — حالت انتخاب چندکالا
await page.goto(URL + '#01');
await page.waitForTimeout(450);
await page.locator('[data-selmode]').click();
await page.waitForTimeout(300);
const pcards = page.locator('#scr-01 .pcard');
await pcards.nth(0).click();
await pcards.nth(1).click();
await pcards.nth(3).click();
await page.waitForTimeout(250);
const selCount = await page.locator('[data-sel-count]').textContent();
console.log('selected count (expect ۳):', selCount);
await phone.screenshot({ path: OUT + '/01-selmode.png' });

// باز کردن شیت هدفمند از نوار انتخاب
await page.locator('[data-selgo="sheet-target"]').click();
await page.waitForTimeout(450);
await phone.screenshot({ path: OUT + '/01-selmode-sheet.png' });

// ۱۰ — سمت خریدار: کارت تبلیغ هدفمند
await page.goto(URL + '#10');
await page.waitForTimeout(450);
await phone.screenshot({ path: OUT + '/10-buyer-targeted.png' });

// ۲۰ — کارتابل: کار سیستم تبلیغ
await page.goto(URL + '#20');
await page.evaluate(() => { document.querySelector('#scr-20 .screen-body').scrollTop = 1100; });
await page.waitForTimeout(300);
await phone.screenshot({ path: OUT + '/20-taskboard-ad.png' });

// ۲۷ — اعلان کیف پول
await page.goto(URL + '#27');
await page.waitForTimeout(400);
await phone.screenshot({ path: OUT + '/27-notif-wallet.png' });

// ۰۳ — پنل مدیریت ۹ دکمه‌ای
await page.goto(URL + '#03');
await page.waitForTimeout(400);
await phone.screenshot({ path: OUT + '/03-manage-panel.png' });

// شیت تنظیمات کاتالوگ (ردیف‌های جدید)
await page.goto(URL + '#01');
await page.waitForTimeout(400);
await page.locator('#scr-01 [data-sheet="sheet-cset"]').click();
await page.waitForTimeout(450);
await phone.screenshot({ path: OUT + '/sheet-cset-ads.png' });

console.log('console errors:', errors.length ? errors : 'NONE');
await browser.close();
console.log('QA done.');
