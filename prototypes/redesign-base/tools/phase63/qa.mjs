// فاز ۶۳ — QA قطعی «فرم‌ها و فرایندهای مهم» — حکم‌های مالک:
//  ۱) فوتر دستیار خرید: «تأمین‌کنندگان» بلافاصله بعد از «لیست خرید» (۰۸/۴۵/۱۸ — TABS/TABSET)
//  ۲) «مدل اینستاگرام» در تابلوی تأمین (۰۹): تابلو خصوصی (قیمت‌های تأمین‌کنندگان خودِ خریدار)
//     + کالای فروشندهٔ ویژهٔ شارژی (شالی‌زار طالب — غیرمشتری) با بج «قیمت کمتر از تأمین‌کنندگان
//     شما» فقط وقتی واقعاً ارزان‌تر است؛ آریو (تأمین‌کنندهٔ خودِ خریدار) از حالت اسپانسری خارج شد
//  ۳) ۰۲: شالی‌زار طالب سومین «تأمین‌کنندهٔ ویژهٔ این کالا» (بج «۳ مورد» واقعی شد)
//  ۴) ۱۰: بج «قیمت کمتر از تأمین‌کنندگان شما» روی کارت اسپانسر (هم‌زبان ۰۹)
//  ۵) ۲۷: نوتیف تپ قلب ماندگاری «قیمت کاتالوگ ذخیره‌شده به‌روز شد» + اصلاح نotif قیمت
//     (ارزان‌ترینِ «تأمین‌کنندگان شما» — پارس؛ نه فروشندهٔ غریبه) + شمار ۳→۴
//  ۶) فرم ۱۲: انسجام شبکهٔ خصوصی — saved = همان ۳ ردیف صفحهٔ ۱۰ (آریو/پارس/کیان)؛
//     تجارت گیل‌رنج ذخیره نیست
//  ۷) قاعدهٔ فاز ۶۲ (متن منفعت‌محور): هیچ «با پرداختِ خودش … دیده می‌شود» روی ۰۹ نماند؛
//     حکم فاز ۳۳ «رتبهٔ آن‌ها خریدنی نیست» دست‌نخورده ماند
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p63';
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const shot = async (n) => { await page.screenshot({ path: SHOTS + '/' + n + '.png', clip: { x: 34, y: 0, width: 402, height: 874 } }); };
let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

/* ═══ ۰. فوتر دستیار خرید — «تأمین‌کنندگان» بلافاصله بعد از «لیست خرید» ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(400);
const t08 = await page.locator('#scr-08 .tabbar .tab').allTextContents();
T('فوتر ۰۸: ۴ تب ماند', t08.length === 4);
T('فوتر ۰۸: ترتیب مالک — لیست خرید · تأمین‌کنندگان · استعلام‌ها · پیام‌ها',
  t08[0].includes('لیست خرید') && t08[1].includes('تأمین‌کنندگان') && t08[2].includes('استعلام‌ها') && t08[3].includes('پیام‌ها'));
T('فوتر ۰۸: تب فعال = لیست خرید', (await page.locator('#scr-08 .tab.active').textContent()).includes('لیست خرید'));
await shot('01-footer08');
await page.click('#scr-08 .tab:has-text("تأمین‌کنندگان")'); await sleep(300);
T('تب تأمین‌کنندگان (جای دوم) ← صفحهٔ ۱۰', await page.locator('#scr-10').isVisible());
await page.goto(FILE + '#08'); await sleep(250);
await page.click('#scr-08 .tab:has-text("استعلام‌ها")'); await sleep(300);
T('تب استعلام‌ها (جای سوم) ← صفحهٔ ۴۵', await page.locator('#scr-45').isVisible());

await page.goto(FILE + '#45'); await page.reload(); await sleep(400);
const t45 = await page.locator('#scr-45 .tabbar .tab').allTextContents();
T('فوتر ۴۵: همان ترتیب ۰۸', t45[1].includes('تأمین‌کنندگان') && t45[2].includes('استعلام‌ها'));
T('فوتر ۴۵: تب فعال = استعلام‌ها', (await page.locator('#scr-45 .tab.active').textContent()).includes('استعلام‌ها'));
await shot('02-footer45');

/* صفحهٔ ۱۸ (پیام‌ها) در بازوی خرید — TABSET همان ترتیب را می‌سازد
   (۱۸ keep است و phone-arm را عوض نمی‌کند؛ بدون reload از ۴۵ِ خرید می‌آییم) */
await page.goto(FILE + '#45'); await sleep(250);
await page.goto(FILE + '#18'); await sleep(350);
const t18 = await page.locator('#scr-18 .tabbar .tab').allTextContents();
T('فوتر ۱۸ (بازوی خرید): تأمین‌کنندگان جای دوم', t18.length === 4 && t18[1].includes('تأمین‌کنندگان'));

/* ═══ ۱. مدل اینستاگرام — تابلوی تأمین ۰۹ ═══ */
await page.goto(FILE + '#09'); await page.reload(); await sleep(400);
T('۰۹: ساب‌تایتل «۳ تأمین‌کنندهٔ شما» (تابلو خصوصی)', (await page.locator('#scr-09 .ttl small').textContent()).includes('۳ تأمین‌کنندهٔ شما'));
T('۰۹: دقیقاً یک کارت اسپانسری (شالی‌زار طالب)', (await page.locator('#scr-09 .supplier-card.sponsored').count()) === 1
  && (await page.locator('#scr-09 .supplier-card.sponsored').textContent()).includes('شالی‌زار طالب'));
const spTxt = await page.locator('#scr-09 .supplier-card.sponsored').textContent();
T('۰۹: کارت اسپانسری = نشان «فروشندهٔ ویژه»', spTxt.includes('فروشندهٔ ویژه'));
T('۰۹: بج منفعت‌محور «قیمت کمتر از تأمین‌کنندگان شما»', spTxt.includes('قیمت کمتر از تأمین‌کنندگان شما'));
T('۰۹: قیمت اسپانسری ۲٬۷۸۰٬۰۰۰', spTxt.includes('۲٬۷۸۰٬۰۰۰'));
T('۰۹: شرط هوشمندی — قیمت اسپانسری < بهترینِ خودِ خریدار (پارس ۲٬۸۵۰٬۰۰۰)',
  await page.evaluate(() => {
    const fa = s => +String(s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^\d]/g, '');
    const sp = document.querySelector('#scr-09 .supplier-card.sponsored .price');
    const best = document.querySelector('#scr-09 .supplier-card.best .price');
    return sp && best && fa(sp.textContent) < fa(best.textContent) && fa(best.textContent) === 2850000;
  }));
T('۰۹: سازگاری حجم — «حداقل ۵ کیسه» (خریدار ۲۰ کیسه ماهانه می‌خرد)', spTxt.includes('حداقل ۵ کیسه'));
T('۰۹: آریو غلات = کارت عادیِ تأمین‌کنندهٔ خودِ خریدار (بدون تگ اسپانسری)',
  (await page.locator('#scr-09 .supplier-card:not(.sponsored):not(.stale)').count()) === 2
  && (await page.locator('#scr-09 .supplier-card').nth(2).textContent()).includes('آریو غلات')
  && (await page.locator('#scr-09 .supplier-card').nth(2).locator('.sponsor-tag').count()) === 0);
T('۰۹: چیپ «تأمین‌کنندهٔ من» روی کارت آریو', (await page.locator('#scr-09 .supplier-card').nth(2).textContent()).includes('تأمین‌کنندهٔ من'));
const leg09 = (await page.locator('#scr-09 .legend').textContent());
T('۰۹: legend — تابلو از تأمین‌کنندگان خودتان', leg09.includes('از تأمین‌کنندگان خودتان می‌آید'));
T('۰۹: legend — شرط هوشمند دیده‌شدن فروشندهٔ ویژه', leg09.includes('قیمتش از همهٔ تأمین‌کنندگان شما کمتر باشد'));
T('۰۹: legend — حکم فاز ۳۳ ماند: «رتبهٔ آن‌ها خریدنی نیست»', leg09.includes('رتبهٔ آن‌ها خریدنی نیست'));
T('۰۹: legend — بدون «با پرداختِ خودش» (قاعدهٔ فاز ۶۲: بجِ قیمت، نه پرداخت)', !leg09.includes('با پرداخت'));
T('۰۹: stale-bar و جایگزین دست‌نخورده', (await page.locator('#scr-09 .stale-bar').count()) === 1
  && (await page.locator('#scr-09 .price-stale').count()) === 1
  && (await page.locator('#scr-09 .badge.b-orange').filter({ hasText: 'جایگزین' }).count()) === 1);
await page.evaluate(() => { document.querySelector('#scr-09 .supplier-card.sponsored').scrollIntoView({ block: 'center' }); });
await shot('03-board09-sponsored');
await page.evaluate(() => { document.querySelector('#scr-09 .legend').scrollIntoView({ block: 'center' }); });
await shot('04-board09-legend');

/* ═══ ۲. صفحهٔ ۰۲ — سومین تأمین‌کنندهٔ ویژهٔ همین کالا ═══ */
await page.goto(FILE + '#02'); await page.reload(); await sleep(400);
T('۰۲: جعبه «تأمین‌کنندگان ویژهٔ این کالا» = ۳ ردیف', (await page.locator('#scr-02 .sp-row').count()) === 3);
const sp02 = await page.locator('#scr-02 .sp-row').allTextContents();
T('۰۲: ردیف‌ها = آریو · کیان · شالی‌زار طالب',
  sp02[0].includes('آریو غلات') && sp02[1].includes('کیان غلات') && sp02[2].includes('شالی‌زار طالب'));
T('۰۲: بج «۳ مورد» حالا واقعی است', (await page.locator('#scr-02 .badge.b-orange').filter({ hasText: '۳ مورد' }).count()) === 1);
T('۰۲: قیمت شالی‌زار همان ۰۹/۱۰ — ۲٬۷۸۰٬۰۰۰', sp02[2].includes('۲٬۷۸۰٬۰۰۰'));
await page.evaluate(() => { document.querySelectorAll('#scr-02 .sp-row')[2]?.closest('.card')?.scrollIntoView({ block: 'center' }); });
await shot('05-item02-special');

/* ═══ ۳. صفحهٔ ۱۰ — بج اسپانسر هم‌زبان ۰۹ ═══ */
await page.goto(FILE + '#10'); await page.reload(); await sleep(400);
T('۱۰: شمارندهٔ شبکه دست‌نخورده — «۳ تأمین‌کننده»', (await page.locator('#saved-cats-count').textContent()).includes('۳ تأمین‌کننده'));
T('۱۰: تأمین‌کنندگان ذخیره = پارس · آریو · کیان (شالی‌زار میان آن‌ها نیست)',
  (await page.locator('#saved-cats > .row-card:not(.sup-wait)').count()) === 3
  && !(await page.locator('#saved-cats').textContent()).includes('شالی‌زار طالب'));
await page.click('[data-reveal="rel-cats"]'); await sleep(300);
const sp10 = (await page.locator('#rel-cats .row-card').first().textContent());
T('۱۰: کارت اسپانسر شالی‌زار طالب + بج «قیمت کمتر از تأمین‌کنندگان شما»',
  sp10.includes('شالی‌زار طالب') && sp10.includes('قیمت کمتر از تأمین‌کنندگان شما'));
T('۱۰: دلیل مرتبط‌بودن ماند — «در لیست خرید شماست»', sp10.includes('لیست خرید شماست'));
await page.evaluate(() => { document.querySelector('#rel-cats .row-card')?.scrollIntoView({ block: 'center' }); });
await shot('06-suppliers10-sponsor');

/* ═══ ۴. اعلان‌ها (۲۷) — تپ قلب ماندگاری خریدار ═══ */
await page.goto(FILE + '#27'); await page.reload(); await sleep(400);
T('۲۷: شمار خوانده‌نشده ۳→۴', (await page.locator('#scr-27 .ttl small').textContent()).includes('۴ اعلان خوانده‌نشده'));
T('۲۷: ۹ نوتیف (۸ قبلی + ۱ تازه)', (await page.locator('#scr-27 .notif').count()) === 9);
const nt = await page.locator('#scr-27 .notif').allTextContents();
const fresh = nt.find(x => x.includes('قیمت کاتالوگ ذخیره‌شده به‌روز شد'));
T('۲۷: نوتیف تازه — «قیمت کاتالوگ ذخیره‌شده به‌روز شد» + بج «جدید»',
  !!fresh && fresh.includes('جدید'));
T('۲۷: بدنهٔ نوتیف — آریو غلات · برنج هاشمی · ۲٬۹۲۰٬۰۰۰ (قیمت تازه در کاتالوگ ذخیره‌شده نشست)',
  !!fresh && fresh.includes('آریو غلات') && fresh.includes('برنج هاشمی') && fresh.includes('۲٬۹۲۰٬۰۰۰') && fresh.includes('کاتالوگ ذخیره‌شدهٔ شما'));
T('۲۷: اکشن نوتیف ← کاتالوک (۱۳)', (await page.locator('#scr-27 .notif .act[data-go="13"]').count()) === 1);
T('۲۷: نوتیف قیمت — «پخش برنج پارس» ارزان‌ترینِ «تأمین‌کنندگان شما» (اصلاح انسجام فاز ۶۳)',
  nt.some(x => x.includes('قیمت لیست خریدتان پایین آمد') && x.includes('پخش برنج پارس') && x.includes('تأمین‌کنندگان شماست')));
T('۲۷: فروشندهٔ غریبه (تجارت گیل‌رنج) در نوتیف قیمت نیست', !nt.some(x => x.includes('قیمت لیست خریدتان پایین آمد') && x.includes('تجارت گیل‌رنج')));
T('۲۷: نوتیف تازه بدون افشای سیاست (بدون «شبکه»)', !fresh || !fresh.includes('شبکه'));
await page.evaluate(() => { const n = [...document.querySelectorAll('#scr-27 .notif')].find(x => x.textContent.includes('قیمت کاتالوگ ذخیره‌شده')); n?.scrollIntoView({ block: 'center' }); });
await shot('07-notif27-fresh');

/* ═══ ۵. فرم ۱۲ — انسجام شبکهٔ خصوصی ═══ */
await page.goto(FILE + '#12'); await page.reload(); await sleep(400);
T('۱۲: ۵ ردیف اول = آریو · پارس · کیان · گیل‌رنج · سبزدشت', await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#iq-recips .iq-recip')];
  const names = rows.map(r => r.textContent);
  return rows.length >= 5 && names[0].includes('آریو غلات') && names[1].includes('پخش برنج پارس')
    && names[2].includes('کیان غلات') && names[3].includes('تجارت گیل‌رنج');
}));
T('۱۲: بج «ذخیره‌شده» = ۳ (آریو/پارس/کیان — همان ردیف‌های صفحهٔ ۱۰)', (await page.locator('#iq-recips .iq-sv').count()) === 3);
T('۱۲: آریو (s1) ذخیره‌شده شد — هم‌تراز «تأمین‌کنندگان من»', await page.evaluate(() => {
  const r = document.querySelector('#iq-recips .iq-recip[data-sid="s1"]');
  return r && r.dataset.saved === '1' && r.textContent.includes('ذخیره‌شده');
}));
T('۱۲: تجارت گیل‌رنج (s4) ذخیره نیست — فقط معرفی iMach', await page.evaluate(() => {
  const r = document.querySelector('#iq-recips .iq-recip[data-sid="s4"]');
  return r && !r.dataset.saved;
}));
T('۱۲: پیش‌فرض انتخاب = ۳ تأمین‌کنندهٔ خودِ خریدار (s1/s2/s3)', await page.evaluate(() => {
  const sel = [...document.querySelectorAll('#iq-recips .iq-recip .checkbox.on')];
  return sel.length === 3;
}));
T('۱۲: برچسب ارسال «۳ تأمین‌کننده»', (await page.locator('#rfq-send').textContent()).includes('۳'));
await page.evaluate(() => { document.querySelector('#iq-recips')?.scrollIntoView({ block: 'center' }); });
await shot('08-form12-recips');

/* ═══ ۶. گشت ایمن — همهٔ ۳۱ صفحه بدون خطا ═══ */
const PAGES = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','23','27','29','30','34','42','43','44','45','46','48','53','60','61','62'];
for (const h of PAGES) {
  await page.goto(FILE + '#' + h); await sleep(180);
}
T('گشت: ۳۱ صفحه بدون هیچ خطای JS', errors.length === 0);

/* ═══ ۷. سرریز افقی — نقاط تغییر قطعی (جایگزین VLM) ═══ */
const ovf = async (sel, label) => {
  const good = await page.evaluate((s) => {
    const el = document.querySelector(s);
    const sb = el?.closest('.screen-body') || el;
    return !!el && el.scrollWidth <= el.clientWidth + 1 && sb.scrollWidth <= sb.clientWidth + 1;
  }, sel);
  T('سرریز: ' + label, good);
};
await page.goto(FILE + '#09'); await page.reload(); await sleep(400);
await ovf('#scr-09 .supplier-card.sponsored', 'کارت اسپانسری ۰۹ (بج بلند)');
await ovf('#scr-09 .supplier-card:not(.sponsored):not(.stale)', 'کارت آریو ۰۹ (چیپ تأمین‌کنندهٔ من)');
await ovf('#scr-09 .legend', 'legend تازهٔ ۰۹');
await page.goto(FILE + '#02'); await page.reload(); await sleep(350);
await ovf('#scr-02 .sp-row:last-of-type', 'ردیف سوم ویژهٔ ۰۲');
await page.goto(FILE + '#10'); await page.reload(); await sleep(350);
await page.click('[data-reveal="rel-cats"]'); await sleep(250);
await ovf('#rel-cats .row-card', 'کارت اسپانسر ۱۰ (بج تازه)');
await page.goto(FILE + '#27'); await page.reload(); await sleep(350);
await ovf('#scr-27 .notif:nth-of-type(4)', 'نوتیف تازهٔ ۲۷');
await page.goto(FILE + '#12'); await page.reload(); await sleep(350);
await ovf('#iq-recips', 'ردیف‌های گیرندهٔ فرم ۱۲');
await page.goto(FILE + '#60'); await page.reload(); await sleep(350);
await ovf('#scr-60 .ttl', 'زیرعنوان تازهٔ راهنمای ۶۰');

await browser.close();
console.log('\n═══ فاز ۶۳ ═══');
console.log('PASS: ' + ok + ' / FAIL: ' + bad);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
process.exit(bad ? 1 : 0);
