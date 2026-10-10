// tools/qa.mjs — QA رفتاری mvp-final: ۶ قابلیت جدید + رگرسیون جریان‌های mvp-design
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'file://' + resolve(ROOT, 'index.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
async function nav(h) { await page.goto(URL + '#' + h); await page.waitForTimeout(160); }
const txt = async () => page.locator('#app').innerText();

/* ═══ ۱. لندینگ — چهرهٔ بیس ═══ */
await nav('/');
{
  const t = await txt();
  ok(t.includes('قیمت عمده') && t.includes('واقعاً'), 'لندینگ: هیرو با تأکید نارنجی');
  ok(await page.locator('.hero-cta .btn').count() === 2, 'لندینگ: دو CTA هیرو');
  ok(await page.locator('.land-shot .collage img').count() === 4, 'لندینگ: کلاژ ۴ عکس کالای MVP');
  ok(t.includes('آی‌مچ چیست؟') && t.includes('کالای مرجع'), 'لندینگ: intro-sep + intro-card');
  ok(t.includes('برای خریدار عمده') && t.includes('برای فروشندهٔ عمده'), 'لندینگ: دو بخش مزایا');
  ok(await page.locator('.final-cta').count() === 1 && t.includes('رایگان'), 'لندینگ: CTA پایانی گرادیانی');
  ok(await page.locator('.land-cta-bar').count() === 1, 'لندینگ: نوار چسبان CTA');
  ok(t.includes('خبردار شدن از ارزان‌شدن'), 'لندینگ: وعدهٔ اعلان (قابلیت ۳) در مزایا');
}

/* ═══ ۲. ورود — چهرهٔ auth بیس ═══ */
await page.locator('.land-cta-bar .btn').first().click(); await page.waitForTimeout(160);
{
  const t = await txt();
  ok(await page.locator('.auth-logo img').count() === 1, 'ورود: لوگوی وسط (الگوی بیس)');
  ok(t.includes('۹۸+') && await page.locator('.phone-input input').count() === 1, 'ورود: ورودی شماره با پیشوند ۹۸+');
  ok(await page.locator('.action-bar .btn.primary').count() === 1, 'ورود: اکشن‌بار چسبان');
}
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(200);
{
  const t = await txt();
  ok(await page.locator('.otp-row input').count() === 4, 'ورود: ۴ خانهٔ OTP بیس‌استایل');
  ok(/۰[۱-۹]:[۰-۹]{2}/.test(t), 'ورود: تایمر واقعی شمارش‌معکوس');
}
for (const i of [0, 1, 2, 3]) await page.locator('.otp-row input').nth(i).fill('7');
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(260);
{
  const t = await txt();
  ok(t.includes('کاتالوگ من'), 'ورود: حساب نمونه → کاتالوگ');
}

/* ═══ ۳. اعلان‌های کاهش قیمت — واقعی و بذری ═══ */
{
  const dot = await page.locator('.icon-btn .dot').first().innerText().catch(() => '');
  ok(dot.trim() === '۲', 'اعلان: بج زنگ = ۲ خبر بذری');
}
await nav('/notes');
{
  const t = await txt();
  ok(await page.locator('.note-card').count() === 2, 'اعلان: دو کارت خبر');
  ok(t.includes('ارزان شد') && t.includes('تجارت گیل‌برنج') && t.includes('پخش سپهر'), 'اعلان: متن خبر با نام فروشنده');
  ok(t.includes('دیدن تابلو'), 'اعلان: دکمهٔ رفتن به تابلو');
  ok(t.includes('فقط کاهش قیمت'), 'اعلان: یادداشت اعتماد');
}
await nav('/catalog');
{
  const dot = await page.locator('.icon-btn .dot').count();
  ok(dot === 0, 'اعلان: بج پس از خواندن صفر شد');
}

/* ═══ ۴. مهر تازگی + کاتالوگ ═══ */
{
  const t = await txt();
  ok((t.match(/امروز|دیروز|روز پیش/g) || []).length >= 5, 'تازگی: مهر روی همهٔ ردیف‌ها');
  ok(t.includes('بیش از ۳ روزه'), 'کاتالوگ: بنر کهنه‌شدگی');
}

/* ═══ ۵. واحد مصرف‌کننده — تابلوی برند «هر عدد» ═══ */
await nav('/board/r:r1');
{
  const t = await txt();
  ok(t.includes('هر عدد'), 'تابلو r1: مقایسه با «هر عدد»');
  ok(t.includes('۳۹۶٬۶۶۷'), 'تابلو r1: قیمت هر بطری لادن (۲,۳۸۰,۰۰۰ ÷ ۶)');
  ok(t.includes('در لیست خریدت هست') && t.includes('خبردار می‌شی'), 'تابلو: وعدهٔ خبردار شدن');
}
await nav('/board/g:g4');
{
  const t = await txt();
  ok(t.includes('هر لیتر'), 'تابلو g4: مقایسه با «هر لیتر» (تبدیل از هر عدد)');
  ok(t.includes('گلان'), 'تابلو g4: روغن گلان ۲٫۵ لیتری حاضر');
}
await nav('/board/r:r7');
{
  const t = await txt();
  ok(t.includes('هر کیسه'), 'تابلو r7: برنج برند‌دار با «هر کیسه»');
}

/* ═══ ۶. دید قیمت — b3 فقط سوپرمارکت و خواروبار ═══ */
await nav('/shop/b3');
{
  const t = await txt();
  ok(t.includes('سوپرمارکت و خواروبار'), 'دید قیمت: بنر برچسب صنف‌ها');
  ok(t.includes('قیمت برای صنف تو نیست'), 'دید قیمت: قیمت‌ها قفل');
  ok(t.includes('تماس'), 'دید قیمت: تماس باز است');
}
await nav('/board/g:g3');
{
  const t = await txt();
  ok(t.includes('قیمت‌های نمایش‌داده‌نشده'), 'دید قیمت: بخش شفافیت در تابلو');
  ok(t.includes('آریو غلات'), 'دید قیمت: فروشندهٔ قفل‌شده معرفی می‌شود');
  ok(t.includes('هنوز فروشنده‌ای نیست') && t.includes('خبردار شو'), 'خالی: تابلو بدون فروشندهٔ قابل‌دیدن + CTA خبردار شو');
}

/* ═══ ۷. استپر درصدی داخل فرم ═══ */
await nav('/prices');
{
  const t = await txt();
  ok(await page.locator('.stepper .st-btn').count() === 2, 'استپر: دکمه‌های − / +');
  ok(!t.includes('+۵٪') && !t.includes('−۵٪'), 'استپر: چیپ‌های قلابی حذف شدند');
  ok(t.includes('مثلاً'), 'استپر: پیش‌نمایش زنده');
}
await page.locator('.st-btn[data-d="0.5"]').click(); await page.waitForTimeout(80);
await page.locator('.st-btn[data-d="0.5"]').click(); await page.waitForTimeout(80);
{
  const v = await page.locator('#pctIn').inputValue();
  ok(v === '۱', 'استپر: دو بار + = ۱٪');
}
await page.locator('.pct-apply, [data-act="pct-apply"]').click(); await page.waitForTimeout(120);
await page.locator('#bulkSave').click(); await page.waitForTimeout(200);
{
  const t = await txt();
  ok(t.includes('کاتالوگ من'), 'استپر: اعمال + ذخیره → بازگشت به کاتالوگ');
}

/* ═══ ۸. پرتکرار در صنف — واقعی ═══ */
await nav('/add');
{
  const t = await txt();
  ok(t.includes('پرتکرار در صنف شما (پخش و توزیع)'), 'پرتکرار: از آگهی هم‌صنف‌ها محاسبه شد');
  ok(await page.locator('#res .list').first().locator('.row').count() === 5, 'پرتکرار: ۵ نتیجه');
}

/* ═══ ۹. جستجو → فرم قیمت با بازار ═══ */
await page.locator('#q').fill('گلان'); await page.waitForTimeout(150);
await page.locator('#res .row.res').first().click(); await page.waitForTimeout(150);
await page.locator('#price').fill('۳۱۰۰۰۰۰'); await page.waitForTimeout(120);
{
  const t = await txt();
  ok(t.includes('گلان ۲٫۵ لیتری'), 'فرم: کالای مرجع گلان انتخاب شد');
  ok(t.includes('کمترین قیمت بازار') && t.includes('هر عدد'), 'فرم: کمترین قیمت بازار با واحد درست');
}
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(150);
{
  const t = await txt();
  ok(t.includes('گلان ۲٫۵ لیتری') && t.includes('اضافه شد'), 'فرم: افزودن گلان به کاتالوگ');
}

/* ═══ ۱۰. تنظیم دید قیمت خودم ═══ */
await nav('/profile');
{
  const t = await txt();
  ok(t.includes('قیمت‌های من را کی ببیند؟') && t.includes('همهٔ خریداران'), 'تنظیمات: ردیف دید قیمت با پیش‌فرض همه');
}
await page.locator('[data-act="vis-open"]').click(); await page.waitForTimeout(150);
await page.locator('[data-act="vis-mode"][data-m="some"]').click(); await page.waitForTimeout(120);
await page.locator('[data-act="vis-ind"][data-i="super"]').click(); await page.waitForTimeout(80);
await page.locator('[data-act="vis-ind"][data-i="grocery"]').click(); await page.waitForTimeout(80);
{
  const t = await page.locator('.sheet').innerText();
  ok(t.includes('سوپرمارکت، خواروبار'), 'تنظیمات: پیش‌نمایش صنف‌های انتخابی');
}
await page.locator('[data-act="vis-save"]').click(); await page.waitForTimeout(150);
{
  const t = await txt();
  ok(t.includes('فقط سوپرمارکت و خواروبار'), 'تنظیمات: ذخیره و نمایش حالت جدید');
}
await nav('/shop/b1');
{
  const t = await txt();
  ok(t.includes('فقط سوپرمارکت و خواروبار') && t.includes('می‌بینن'), 'نمای مشتری: بنر تنظیم دید');
}

/* ═══ ۱۱. کاربر تازه: ثبت‌نام با تیپ و صنف ═══ */
await nav('/profile');
await page.locator('[data-act="logout"]').click(); await page.waitForTimeout(150);
await nav('/login');
await page.locator('#phoneIn').fill('09351112233'); await page.waitForTimeout(60);
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(160);
for (const i of [0, 1, 2, 3]) await page.locator('.otp-row input').nth(i).fill('1');
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(220);
{
  const t = await txt();
  ok(t.includes('قدم دوم از دو') && await page.locator('.mini-prog i').count() === 2, 'ثبت‌نام: مینی‌پروگرس بیس');
  ok(await page.locator('.verified-phone').count() === 1 && t.includes('تایید شد'), 'ثبت‌نام: شمارهٔ تأییدشده');
  ok(t.includes('فعالیت شما در بازار') && t.includes('خریدارم'), 'ثبت‌نام: انتخاب تیپ (قابلیت ۱)');
}
await page.locator('[data-act="login-citypick"]').click(); await page.waitForTimeout(120);
await page.locator('[data-act="login-city"][data-c="رشت"]').click(); await page.waitForTimeout(120);
await page.locator('[data-act="login-indpick"]').click(); await page.waitForTimeout(120);
await page.locator('[data-act="login-ind"][data-i="super"]').click(); await page.waitForTimeout(140);
await page.locator('#bizName').fill('سوپرمارکت آفتاب'); await page.waitForTimeout(80);
await page.locator('[data-act="login-role"][data-r="buyer"]').click(); await page.waitForTimeout(100);
{
  const v = await page.locator('#bizName').inputValue();
  ok(v === 'سوپرمارکت آفتاب', 'ثبت‌نام: اسم با بازرندر حفظ می‌شود');
}
await page.locator('[data-act="login-terms"]').click(); await page.waitForTimeout(80);
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(220);
{
  const t = await txt();
  ok(t.includes('کاتالوگت هنوز خالیه'), 'کاربر تازه: کاتالوگ خالی با CTA');
}
/* صنف سوپرمارکت → قیمت‌های b3 حالا دیده می‌شود */
await nav('/shop/b3');
{
  const t = await txt();
  ok(!t.includes('قیمت برای صنف تو نیست'), 'دی seen قیمت: سوپرمارکت قیمت‌های b3 را می‌بیند');
  ok(/[۰-۹]{3}[٬,][۰-۹]{3}/.test(t), 'دید قیمت: اعداد قیمت نمایان');
}
await nav('/board/g:g3');
{
  const t = await txt();
  ok(t.includes('آریو غلات') && !t.includes('قیمت‌های نمایش‌داده‌نشده'), 'تابلو g3: فروشندهٔ قفل‌شده حالا باز است');
}

/* ═══ ۱۲. جستجوی بی‌نتیجه در خرید → درخواست افزودن ═══ */
await nav('/buy-add');
await page.locator('#bq').fill('نوشابه'); await page.waitForTimeout(150);
{
  const t = await txt();
  ok(t.includes('پیدا نشد') && t.includes('درخواست افزودن'), 'خالی: جستجوی بی‌نتیجه + راه خروج');
}

/* ═══ ۱۳. درباره: فهرست صادق ═══ */
await nav('/profile');
await page.locator('[data-act="about"]').click(); await page.waitForTimeout(140);
{
  const t = await page.locator('.sheet').innerText();
  ok(t.includes('اعلان کاهش قیمت') && t.includes('مهر تازگی') && t.includes('قیمت‌های من را کی ببیند'), 'درباره: ۶ قابلیت فهرست شده');
  ok(t.includes('هر عدد'), 'درباره: قاعدهٔ واحد مصرف‌کننده توضیح داده شده');
}

/* ═══ ۱۴. سازگاری: بوت دوباره بدون خطا ═══ */
await page.goto('about:blank'); await page.goto(URL + '#/buy'); await page.waitForTimeout(200);
{
  const t = await txt();
  ok(t.includes('لیست خرید من'), 'بوت مجدد: ورود خودکار با وضعیت ذخیره');
}
ok(errors.length === 0, 'صفر خطای کنسول در کل سناریو' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));

console.log(`\n═══ mvp-final QA: ${pass} PASS / ${fail} FAIL ═══`);
await browser.close();
process.exit(fail ? 1 : 0);
