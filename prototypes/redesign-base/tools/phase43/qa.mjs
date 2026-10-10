// فاز ۴۳ — QA رفتاری فرم افزودن کالا (الگوی MVP) + e2e همهٔ صفحه‌ها
import { chromium } from 'playwright';

const FILE = 'file://' + process.cwd() + '/index.html';
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + name); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
await page.goto(FILE + '#04');
await page.reload();
await sleep(250);

/* ── ۱. ساختار گام ۱ ── */
ok('صفحهٔ ۰۴ باز است', await page.locator('#scr-04').isVisible());
ok('جستجوی واحد دیده می‌شود', await page.locator('#gf-q').isVisible());
ok('دکمهٔ اسکن داخل جستجو', await page.locator('.gf-scan').isVisible());
ok('کال‌اوت چسباندن لیست قیمت', await page.locator('.gf-paste').isVisible());
ok('عنوان مرحله ۱', (await page.locator('#gf-sub').textContent()).includes('مرحلهٔ ۱'));
ok('گام ۲ مخفی', await page.locator('#gf-step2').isHidden());
ok('اکشن‌بار مخفی', await page.locator('#gf-bar').isHidden());

/* ── ۲. حالت خالی: پرتکرار در صنف ── */
let rows = await page.locator('#gf-res .gf-row').count();
ok('حداقل ۵ پیشنهاد پرتکرار', rows >= 5);
ok('سرگروه «پرتکرار در صنف شما»', (await page.locator('#gf-res').innerHTML()).includes('پرتکرار در صنف شما'));

/* ── ۳. جستجوی زنده ── */
await page.fill('#gf-q', 'هاشمی');
await sleep(120);
rows = await page.locator('#gf-res .gf-row').count();
ok('نتیجه برای «هاشمی» ≥ ۲', rows >= 2);
const resHtml = await page.locator('#gf-res').innerHTML();
ok('گروه فله', resHtml.includes('فله / بدون برند'));
ok('گروه برنددار', resHtml.includes('برنددار'));
ok('بدج «در کاتالوگ» برای هاشمی', resHtml.includes('در کاتالوگ'));
ok('دکمهٔ کالای جدید', await page.locator('#gf-res .gf-newcta').count() === 1);

/* ── ۴. جستجوی بی‌نتیجه ── */
await page.fill('#gf-q', 'گوشی سامسونگ');
await sleep(120);
ok('حالت خالی «پیدا نشد»', (await page.locator('#gf-res').innerHTML()).includes('پیدا نشد'));
ok('CTA ثبت کالای جدید با نام جستجو', (await page.locator('#gf-res .gf-newcta').textContent()).includes('گوشی سامسونگ'));

/* ── ۵. انتخاب فله (برنج هاشمی) → گام ۲ ── */
await page.fill('#gf-q', 'هاشمی');
await sleep(120);
await page.locator('.gf-row').first().click(); // good: برنج هاشمی
await sleep(150);
ok('گام ۲ دیده می‌شود', await page.locator('#gf-step2').isVisible());
ok('عنوان مرحله ۲', (await page.locator('#gf-sub').textContent()).includes('مرحلهٔ ۲'));
ok('کارت انتخاب با بج «نوع کالای مرجع»', (await page.locator('#gf-step2 .gf-selcard').innerHTML()).includes('نوع کالای مرجع'));
ok('فیلد عنوان در کاتالوگ (فله)', await page.locator('#gf-title').count() === 1);
ok('چیپ‌های کیفیت', await page.locator('[data-gfgrade]').count() >= 2);
ok('چیپ‌های بسته‌بندی', await page.locator('[data-gfpack]').count() >= 3);
ok('اکشن‌بار: به‌روزرسانی قیمت (تکراری)', (await page.locator('#gf-save').textContent()).includes('به‌روزرسانی'));

/* بستهٔ پیش‌فرض ۱۰ کیلویی → تکراری → بنر + دکمهٔ به‌روزرسانی */
const dupBanner = await page.locator('#gf-step2 .callout').count();
ok('بنر کهنه (کیسه ۱۰ کیلویی تکراری)', dupBanner === 1);
ok('دکمهٔ «به‌روزرسانی قیمت»', (await page.locator('#gf-save').textContent()).includes('به‌روزرسانی'));
const prePrice = await page.inputValue('#gf-price');
ok('قیمت فعلی از کارت پیش‌پر شده', prePrice.includes('۵۹۵'));

/* تغییر بسته → ۵۰ کیلویی (تکراری دیگر) → دوباره ۱۰ */
await page.locator('[data-gfpack="1"]').click(); // کیسه ۵۰ کیلویی
await sleep(120);
ok('پس از تغییر بسته همچنان گام ۲', await page.locator('#gf-step2').isVisible());
ok('برچسب قیمت با بستهٔ تازه', (await page.locator('#gf-plabel').textContent()).includes('۵۰ کیلویی'));

/* فاز ۴۴: «کمترین قیمت بازار» و «قیمت نرمال‌شده» از فرم حذف شدند — مقایسه فقط سمت خریدار (تابلو) */
ok('بدون کمترین بازار (حذف فاز ۴۴)', !(await page.locator('#gf-step2').innerHTML()).includes('کمترین قیمت بازار'));
ok('بدون خط قیمت نرمال‌شده (حذف فاز ۴۴)', await page.locator('#gf-unithint').count() === 0);
await page.fill('#gf-price', '۲٬۹۵۰٬۰۰۰');
await sleep(120);

/* ── ۷. ذخیرهٔ بدون قیمت (رَد) ── */
await page.fill('#gf-price', '');
await sleep(80);
const before = await page.locator('#scr-01 .pcard').count();
await page.locator('#gf-save').click();
await sleep(120);
ok('بدون قیمت ذخیره نمی‌شود', await page.locator('#gf-step2').isVisible());
ok('هشدار قیمت لازم', await page.locator('#gf-noprice').isVisible());
ok('کارت جدیدی اضافه نشد', (await page.locator('#scr-01 .pcard').count()) === before);

/* ── ۸. ذخیرهٔ درست (به‌روزرسانی ۵۰ کیلویی) ── */
await page.fill('#gf-price', '۲٬۹۵۰٬۰۰۰');
await sleep(80);
await page.locator('#gf-save').click();
await sleep(200);
ok('بازگشت به گام ۱', await page.locator('#gf-step1').isVisible());
ok('بنر «به‌روز شد»', (await page.locator('#gf-okbox').textContent()).includes('به‌روز شد'));
const card50 = await page.evaluate(() => {
  const c = [...document.querySelectorAll('#scr-01 .pcard')].find(x => (x.querySelector('.u')||{}).textContent?.includes('۵۰ کیلویی') && (x.querySelector('.n')||{}).textContent?.includes('هاشمی'));
  return c ? c.querySelector('.p').textContent : '';
});
ok('کارت کاتالوگ قیمت تازه گرفت', card50.includes('۲٬۹۵۰٬۰۰۰'));
ok('شمار کالا همان ۴ ماند (به‌روزرسانی، نه افزودن)', (await page.locator('#scr-01 .pcard').count()) === before);

/* ── ۹. افزودن کالای تازه (روغن) ── */
await page.fill('#gf-q', 'روغن لادن');
await sleep(120);
await page.locator('.gf-row').first().click(); // ref
await sleep(150);
ok('بج «کالای مرجع آیمچ»', (await page.locator('#gf-step2 .gf-selcard').innerHTML()).includes('کالای مرجع آیمچ'));
ok('برچسب قیمت هر کارتن', (await page.locator('#gf-plabel').textContent()).includes('کارتن'));
await page.fill('#gf-price', '۲٬۴۵۰٬۰۰۰');
await page.fill('#gf-stock', '۸');
await page.fill('#gf-min', '۱');
await sleep(80);
await page.locator('#gf-save').click();
await sleep(200);
ok('بنر «اضافه شد»', (await page.locator('#gf-okbox').textContent()).includes('اضافه شد'));
const cnt = await page.locator('#scr-01 .pcard').count();
ok('کارت جدید در کاتالوگ (۵)', cnt === 5);
const newCard = await page.evaluate(() => {
  const c = [...document.querySelectorAll('#scr-01 .pcard')].find(x => (x.querySelector('.n')||{}).textContent?.includes('لادن'));
  return c ? c.innerHTML : '';
});
ok('کارت جدید با قیمت/موجودی کم', newCard.includes('۲٬۴۵۰٬۰۰۰') && newCard.includes('موجودی کم'));
/* فاز ۴۴: صفحهٔ ۲۶ حذف شد — لیست کالاها همان گرید ۴۴ است */

/* ── ۱۰. «تغییر» → بازگشت به گام ۱ با حفظ جستجو ── */
await page.locator('.gf-row').first().click();
await sleep(150);
await page.locator('[data-gfreset]').click();
await sleep(120);
ok('بازگشت به گام ۱ با «تغییر»', await page.locator('#gf-step1').isVisible());
ok('جستجو حفظ شد', (await page.inputValue('#gf-q')).includes('روغن'));

/* ── ۱۱. کالای جدید ── */
await page.fill('#gf-q', 'رب روژین');
await sleep(120);
await page.locator('.gf-newcta').click();
await sleep(150);
ok('فرم کالای جدید: نام پیش‌پر', (await page.inputValue('#gf-newname')).includes('روژین'));
ok('چیپ‌های نوع کالا (حدس: رب)', (await page.locator('[data-gfnewgood]').textContent()).includes('رب'));
await page.locator('[data-gfnewgood]').first().click();
await sleep(120);
ok('واحد نوع کالا در «مقدار کل بسته»', (await page.locator('#gf-newqty ~ .suffix, #gf-step2 .field .suffix').filter({ hasText: 'کیلوگرم' }).count()) >= 1);
await page.fill('#gf-newqty', '۰٫۸');
await page.fill('#gf-price', '۱۹۵٬۰۰۰');
await sleep(80);
await page.locator('#gf-save').click();
await sleep(200);
const rozhin = await page.evaluate(() => {
  const c = [...document.querySelectorAll('#scr-01 .pcard')].find(x => (x.querySelector('.n')||{}).textContent?.includes('روژین'));
  return c ? c.innerHTML : '';
});
ok('کالای جدید با بج «در انتظار تأیید»', rozhin.includes('در انتظار تأیید'));

/* ── ۱۲. شیت چسباندن لیست قیمت ── */
await page.locator('.gf-paste').click();
await sleep(250);
ok('شیت paste باز شد', await page.locator('#sheet-paste.show').isVisible());
await page.locator('#paste-sample').click();
await sleep(120);
ok('متن نمونه پر شد', (await page.inputValue('#pasteText')).includes('برنج هاشمی'));
await page.locator('#paste-run').click();
await sleep(250);
const prows = await page.locator('.gf-prow').count();
ok('۶ ردیف تطبیق', prows === 6);
ok('خلاصهٔ سبز/کهربایی تطبیق', await page.locator('.gf-psum').count() === 1);
const phtml = await page.locator('#paste-res').innerHTML();
ok('ردیف «پیدا نشد» (نوشابه)', phtml.includes('پیدا نشد'));
ok('ردیف «مطمئن»', phtml.includes('مطمئن'));
ok('برچسب دکمهٔ تعداد', (await page.locator('#paste-run').textContent()).includes('افزودن'));
/* ردیف پیدا-نشده: تیک → خطا */
const noneIdx = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.gf-prow')];
  return rows.findIndex(r => r.innerHTML.includes('پیدا نشد'));
});
await page.locator('.gf-prow').nth(noneIdx).locator('.gf-ptoggle').click();
await sleep(150);
ok('تیک ردیف بدون کالا → پیام خطا', (await page.locator('.gf-prow').nth(noneIdx).innerHTML()).includes('اول کالا'));
/* انتخاب دستی: جستجو داخل ردیف */
await page.locator('.gf-prow').nth(noneIdx).locator('.gf-newcta').click();
await sleep(150);
ok('جعبهٔ انتخاب باز شد', await page.locator('.gf-choosebox').count() >= 1);
await page.fill('[data-gfpsq="' + noneIdx + '"]', 'پفک');
await sleep(150);
await page.locator('.gf-prow').nth(noneIdx).locator('.gf-psrow').first().click();
await sleep(150);
ok('انتخاب دستی → بج مطمئن + روشن', (await page.locator('.gf-prow').nth(noneIdx).getAttribute('class')).includes('on'));
/* قیمت ردیف به‌روز شود و ردیف روشن بماند */
await page.fill('[data-gfpprice="' + noneIdx + '"]', '۵۹۰٬۰۰۰');
await sleep(100);
ok('ردیف پس از قیمت همچنان روشن', (await page.locator('.gf-prow').nth(noneIdx).getAttribute('class')).includes('on'));
/* commit */
const cntBefore = await page.locator('#scr-01 .pcard').count();
await page.locator('#paste-run').click();
await sleep(300);
const cntAfter = await page.locator('#scr-01 .pcard').count();
ok('کالاها از لیست چسبانده شدند', cntAfter > cntBefore);
ok('شیت بسته شد', await page.locator('#sheet-paste.show').count() === 0);
ok('بنر موفقیت چسباندن', (await page.locator('#gf-okbox').textContent()).includes('کالا به کاتالوگ اضافه شد'));

/* ── ۱۳. شیت‌های اسکن/اکسل/قیمت پایه ── */
await page.locator('.gf-scan').click();
await sleep(200);
ok('شیت اسکنر باز می‌شود', await page.locator('#sheet-scan.show').isVisible());
await page.locator('#backdrop').click({ position: { x: 200, y: 20 } });
await sleep(250);
await page.locator('.gf-row').first().click();
await sleep(150);
await page.locator('#gf-step2 .info-i').click();
await sleep(200);
ok('مدال «قیمت پایه چیست؟» باز می‌شود', await page.locator('#sheet-priceinfo.show').isVisible());

/* ── ۱۴. ورود از کاتالوگ ۰۱ و بازگشت ── */
await page.goto(FILE + '#01');
await page.reload();
await sleep(250);
await page.evaluate(() => { document.querySelectorAll('#scr-01 button').forEach(b => { if (b.textContent.trim() === 'افزودن کالا') b.click(); }); });
await sleep(200);
ok('دکمهٔ «افزودن کالا» ۰۱ → صفحهٔ ۰۴', await page.locator('#scr-04').isVisible());

/* ── ۱۵. e2e همهٔ صفحه‌ها ── */
const screens = await page.evaluate(() => [...document.querySelectorAll('.scr')].map(s => s.id.slice(4)));
for (const s of screens) {
  await page.goto(FILE + '#' + s);
  await page.reload();
  await sleep(140);
}
ok('e2e: ' + screens.length + ' صفحه بدون خطای کنسول', errors.length === 0);
if (errors.length) console.log('  خطاها:', errors.slice(0, 6));

console.log('\n════ فاز ۴۳ QA: ' + pass + ' PASS / ' + fail + ' FAIL ════');
await browser.close();
process.exit(fail ? 1 : 0);
