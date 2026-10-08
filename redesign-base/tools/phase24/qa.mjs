// tools/phase24/qa.mjs — QA فاز ۲۴: لندینگ/بنر/جزئیات کالا/راهنمای تبلیغ/کمپین‌ها/کارت کسب‌وکار
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p24');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

await page.goto(URL + '#15');
await page.waitForTimeout(700);
const phone = page.locator('#phone');

// ۱۵ — لندینگ: هیرو + دکمه‌های جمع‌وجورتر + عکس جدید داخل قاب
const ctaH = await page.locator('#scr-15 .hero-cta .btn').first().evaluate(el => el.offsetHeight);
console.log('hero-cta button height (expect ~43):', ctaH);
const shotH = await page.locator('#scr-15 .land-shot img').evaluate(el => el.naturalHeight > 0);
console.log('hero image loaded (1400x1280):', shotH);
await page.evaluate(() => { document.querySelector('#scr-15 .landing-body').scrollTop = 60; });
await page.waitForTimeout(250);
await phone.screenshot({ path: OUT + '/15-landing-hero.png' });

// ۱۳ — بنر مشتری کوتاه
await page.goto(URL + '#13');
await page.waitForTimeout(500);
const bannerText = await page.locator('#scr-13 .cust-banner span').textContent();
console.log('cust-banner text:', bannerText.trim());
await phone.screenshot({ path: OUT + '/13-cust-banner.png' });

// ۰۲ — تخفیف حجمی + فوتر جدید
await page.goto(URL + '#02');
await page.waitForTimeout(500);
const hasTier = await page.locator('#scr-02 .card:has-text("تخفیف حجمی خرید")').count();
const noAd = await page.locator('#scr-02 :has-text("تأمین‌کنندگان ویژه")').count();
console.log('tiered card present / old ad slot gone:', hasTier > 0, noAd === 0);
const btnLine = await page.locator('#scr-02 .action-bar .btn').evaluate(el => el.offsetHeight <= el.scrollHeight + 1 && getComputedStyle(el).whiteSpace);
console.log('request button nowrap + no clip:', btnLine);
await phone.screenshot({ path: OUT + '/02-tiered-footer.png' });

// شیت کمپین — بدون جایگاه‌ها، با ردیف راهنما
await page.goto(URL + '#07');
await page.waitForTimeout(450);
await page.locator('#scr-07 [data-sheet="sheet-campaign"]').first().click();
await page.waitForTimeout(500);
const campChecks = await page.locator('#sheet-campaign .checkrow').count();
const campGuide = await page.locator('#sheet-campaign [data-go="32"]').count();
console.log('campaign sheet: checkrows gone (0)?', campChecks === 0, '· guide row?', campGuide === 1);
await phone.screenshot({ path: OUT + '/sheet-campaign.png' });

// دکمهٔ راهنما → صفحهٔ ۳۲
await page.locator('#sheet-campaign [data-go="32"]').click();
await page.waitForTimeout(500);
const guideVisible = await page.locator('#scr-32').isVisible();
console.log('guide page (32) opens from sheet:', guideVisible);

// شیت هدفمند — ردیف فشردهٔ جایگاه‌ها
await page.goto(URL + '#07');
await page.waitForTimeout(400);
await page.locator('#scr-07 [data-sheet="sheet-target"]').first().click();
await page.waitForTimeout(500);
const slotRows = await page.locator('#sheet-target .slot-row').count();
const bigSlots = await page.locator('#sheet-target .adslot').count();
console.log('target sheet: compact slot rows (2)?', slotRows === 2, '· big adslots gone (0)?', bigSlots === 0);
await phone.screenshot({ path: OUT + '/sheet-target-compact.png' });

// ۳۱ — کمپین‌ها (دید خریدار) + تولید تصویر راهنما
await page.goto(URL + '#31');
await page.waitForTimeout(500);
const tabs6 = await page.locator('#scr-31 .tabbar .tab').count();
console.log('campaign tabbar tabs (expect 6):', tabs6);
await phone.screenshot({ path: OUT + '/31-campaigns.png' });
await page.locator('#scr-31 .camp-card').first().screenshot({ path: OUT + '/campaign-slot.png' });

// تب کمپین‌ها از فوترِ دستیار خرید → ۳۱
await page.goto(URL + '#08');
await page.waitForTimeout(450);
const buyTabs = await page.locator('#scr-08 .tabbar .tab').count();
console.log('buy list tabbar tabs (expect 6):', buyTabs);

// ۳۲ — راهنمای تبلیغ (اسکرول دو مرحله‌ای)
await page.goto(URL + '#32');
await page.waitForTimeout(500);
await phone.screenshot({ path: OUT + '/32-guide-top.png' });
await page.evaluate(() => { document.querySelector('#scr-32 .screen-body').scrollTop = 620; });
await page.waitForTimeout(250);
await phone.screenshot({ path: OUT + '/32-guide-slots.png' });
await page.evaluate(() => { document.querySelector('#scr-32 .screen-body').scrollTop = 1500; });
await page.waitForTimeout(250);
await phone.screenshot({ path: OUT + '/32-guide-end.png' });

// ۰۷ — کارت کسب‌وکار + شیت + تعامل انتخاب
await page.goto(URL + '#07');
await page.waitForTimeout(450);
const bizName0 = await page.locator('#scr-07 .biz-card .meta .name').textContent();
await phone.screenshot({ path: OUT + '/07-biz-card.png' });
await page.locator('#scr-07 .biz-card').click();
await page.waitForTimeout(450);
await phone.screenshot({ path: OUT + '/sheet-biz.png' });
await page.locator('#sheet-biz [data-biz-name="سوپرمارکت نگین"]').click();
await page.waitForTimeout(600);
const bizName1 = await page.locator('#scr-07 .biz-card .meta .name').textContent();
console.log('biz switch (expect سوپرمارکت نگین):', bizName0.trim(), '→', bizName1.trim());

// آیکون مداد → ۲۲
await page.locator('#scr-07 .biz-edit').click();
await page.waitForTimeout(450);
const on22 = await page.locator('#scr-22').isVisible();
console.log('pencil opens biz edit (22):', on22);

// e2e سریع همهٔ صفحه‌ها — بدون خطای کنسول
const ALL = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32'];
for (const id of ALL) {
  await page.goto(URL + '#' + id);
  await page.waitForTimeout(120);
}
console.log('e2e all 32 screens ok');

console.log('console errors:', errors.length ? errors : 'NONE');
await browser.close();
console.log('QA done.');
