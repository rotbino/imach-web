// فاز ۵۳ — شات‌های بازبینی: سربرگ ظریف ۰۱ · نوار آمار · نudge · دعوت‌شدگان ۵۳ · اصناف سوییچر
// آیکون + کاتالوگ عمومی · مودال تک‌کالا · شیت گروهی ردیفی · پیام آماده/QR · کیف پول · اعلان
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(ROOT, '..', '..', '..', 'shots-p53');
mkdirSync(OUT, { recursive: true });
const FILE = 'file://' + resolve(ROOT, 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(FILE);
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));

async function shot(name, hash, setup) {
  await page.goto(FILE + '#' + hash); await page.reload(); await sleep(350);
  if (setup) await setup();
  await sleep(420);
  await page.screenshot({ path: OUT + '/' + name + '.png' });
  console.log('✓', name);
}

/* ۰۱ — سربرگ جدید: ویترین + نوار آمار + کادر ظریف + سه‌دکمه/تنظیمات + جستجوی تمام‌عرض */
await shot('00-01-header', '01');

/* ۰۱ — نudge «قیمت‌ها به‌روز شد» بعد از ذخیرهٔ ۴۴ */
await shot('01-01-nudge', '44', async () => {
  await page.click('#bk-need'); await sleep(200);
  await page.fill('#scr-44 .bk-row:nth-child(2) .bk-price', '۲٬۷۶۰٬۰۰۰'); await sleep(250);
  await page.click('#bk-save'); await sleep(1150);
});

/* ۰۱ — چیپ ذخیره‌کننده → شیت reach */
await shot('02-01-reach', '01', async () => {
  await page.click('#scr-01 .cat-stats [data-sheet="sheet-reach"]'); await sleep(350);
});

/* ۵۳ — دعوت‌شدگان: سه‌نشان + آمار + هدف کوچک */
await shot('03-53-invites', '53');

/* ۵۳ — پایین صفحه: لیست نام/کسب‌وکار + چیپ‌های ۱۰۰ هزار */
await shot('04-53-list', '53', async () => {
  await page.evaluate(() => { const sb = document.querySelector('#scr-53 .screen-body'); if (sb) sb.scrollTop = 340; });
});

/* cset — ردیف اصناف + دعوت‌شدگان */
await shot('05-cset', '01', async () => {
  await page.click('#scr-01 .cat-addrow .cat-set'); await sleep(350);
});

/* trade — سوییچر اصناف، همه روشن */
await shot('06-trade', '01', async () => {
  await page.click('#scr-01 .cat-addrow .cat-set'); await sleep(300);
  await page.click('#sheet-cset [data-sheet="sheet-trade"]'); await sleep(350);
});

/* ۱۳ — آیکون + روی کارت‌ها + آمار عمومی (تماس ماند) */
await shot('07-13-cards', '13');

/* مودال تک‌کالا: پرسش عین مالک + گروهی */
await shot('08-addls', '13', async () => {
  await page.click('#scr-13 .pcard:nth-child(1) .addls'); await sleep(350);
});

/* شیت گروهی ردیفی — از مسیر «افزودن به صورت گروهی» */
await shot('09-sheet-pick', '13', async () => {
  await page.click('#scr-13 .pcard:nth-child(1) .addls'); await sleep(300);
  await page.click('#dlg-addls [data-sheet="sheet-pick"]'); await sleep(400);
});

/* شیت اشتراک — پیام آماده اول + QR */
await shot('10-share', '01', async () => {
  await page.click('#scr-01 .cat-promo .cp-ic[data-sheet="sheet-share"]'); await sleep(350);
});

/* شیت QR */
await shot('11-qr', '01', async () => {
  await page.click('#scr-01 .cat-promo .cp-ic[data-sheet="sheet-share"]'); await sleep(300);
  await page.click('#sheet-share [data-sheet="sheet-qr"]'); await sleep(400);
});

/* ۲۹ — کارت سه‌نشان + دعوت‌شدگان */
await shot('12-wallet', '29', async () => {
  await page.evaluate(() => { const sb = document.querySelector('#scr-29 .screen-body'); if (sb) sb.scrollTop = 300; });
});

/* ۲۷ — اعلان عضو جدید اول لیست */
await shot('13-notif', '27');

await browser.close();
console.log('OUT:', OUT);
