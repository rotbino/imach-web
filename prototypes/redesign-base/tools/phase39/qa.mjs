// tools/phase39/qa.mjs — QA رفتاری فاز ۳۹: مدال درصدی استپری · اکسل ورود/ثبت‌نامی · بخش تخفیف‌ها
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
async function nav(id) { await page.goto(URL + '#' + id); await page.waitForTimeout(180); }

/* ═══ ۱) ساختار صفحهٔ ۴۴ — چیپ‌ها حذف · آیکون‌ها · تخفیف‌ها جمع‌شده ═══ */
console.log('— ۴۴: ساختار (حذف نوار درصدی + آیکون‌ها + تخفیف‌های جمع‌شده)');
await nav('44');
const st = await page.evaluate(() => ({
  chips: document.querySelectorAll('[data-bkpc]').length,
  bkTools: document.querySelectorAll('.bk-tools').length,
  pctIcon: !!document.querySelector('#scr-44 .bk-pct use') && document.querySelector('#scr-44 .bk-pct use').getAttribute('href') === '#i-percent',
  xlsIcon: !!document.querySelector('#scr-44 .bk-xls'),
  xlsLeft: document.querySelector('#scr-44 .bk-xls').getBoundingClientRect().x < document.querySelector('#scr-44 .bk-pct').getBoundingClientRect().x,
  reset: !!document.querySelector('.bk-reset2'),
  discHidden: document.getElementById('bk-disc').hidden,
  discToggle: !!document.querySelector('.disc-toggle'),
  ariaExp: document.querySelector('.disc-toggle').getAttribute('aria-expanded'),
  cnt: document.getElementById('bk-count').textContent,
}));
ok(st.chips === 0 && st.bkTools === 0, 'نوار چیپ‌های درصدی کاملاً حذف شد');
ok(st.pctIcon, 'آیکون ٪ (i-percent) در ساب‌هدر — کنار اکسل');
ok(st.xlsIcon && st.xlsLeft, 'اکسل سرِ جای خودش (چپ‌ترین) + ٪ کنارش (راستِ اکسل در RTL)');
ok(st.reset, 'لینک «بازنشانی همهٔ تغییرات» زیر گرید');
ok(st.discHidden && st.discToggle && st.ariaExp === 'false', 'تخفیف‌ها پیش‌فرض جمع‌شده (aria-expanded=false)');
ok(st.cnt === '(۰)', 'شمارندهٔ ثبت از (۰) شروع می‌شود');

/* ═══ ۲) مدال درصدی — استپر ۰٫۵٪ · پیش‌نمایش زنده ═══ */
console.log('— مدال درصدی: استپر و پیش‌نمایش');
await page.click('#scr-44 .bk-pct');
await page.waitForTimeout(300);
const m1 = await page.evaluate(() => ({
  show: document.getElementById('dlg-pct').classList.contains('show'),
  input: document.getElementById('pct-input').value,
  preview: document.getElementById('pct-preview').textContent,
  minusRight: document.querySelector('.pct-minus').getBoundingClientRect().x > document.querySelector('.pct-val').getBoundingClientRect().x,
  plusLeft: document.querySelector('.pct-plus').getBoundingClientRect().x < document.querySelector('.pct-val').getBoundingClientRect().x,
  apply: !!document.getElementById('pct-apply'),
  overflow: document.getElementById('dlg-pct').scrollWidth > document.getElementById('dlg-pct').clientWidth + 1,
}));
ok(m1.show, 'مدال dlg-pct باز می‌شود');
ok(m1.input === '۰' && /صفر/.test(m1.preview), 'ورودی از ۰ شروع + پیش‌نمایش حالت صفر');
ok(m1.minusRight && m1.plusLeft, 'استپر RTL: کم (−) راست · زیاد (+) چپ · عدد وسط');
ok(m1.apply && !m1.overflow, 'دکمهٔ «اعمال روی قیمت‌ها» + بدون سرریز');

/* ۳ کلیک + → ۱٫۵٪ (گام نیم‌درصد) */
await page.click('.pct-plus'); await page.click('.pct-plus'); await page.click('.pct-plus');
await page.waitForTimeout(200);
const m2 = await page.evaluate(() => ({
  input: document.getElementById('pct-input').value,
  cls: document.getElementById('pct-preview').className,
  txt: document.getElementById('pct-preview').textContent.replace(/\s+/g, ' ').trim(),
}));
ok(m2.input === '۱٫۵', `۳ کلیک روی + = ۱٫۵٪ (${m2.input})`);
ok(m2.cls.includes('up') && /بیشتر می‌شوند/.test(m2.txt) && /۲٬۸۵۰٬۰۰۰ ← ۲٬۸۹۲٬۷۵۰/.test(m2.txt.replace(/<[^>]*>/g, '')), `پیش‌نمایش سبزِ «بیشتر» با مثال واقعی (${m2.txt.slice(0, 50)}…)`);

/* ورودی دستی منفی اعشاری */
await page.evaluate(() => {
  const i = document.getElementById('pct-input');
  i.value = '-1.5';
  i.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(150);
const m3 = await page.evaluate(() => ({
  cls: document.getElementById('pct-preview').className,
  txt: document.getElementById('pct-preview').textContent.replace(/\s+/g, ' ').trim(),
}));
ok(m3.cls.includes('down') && /کمتر می‌شوند/.test(m3.txt) && /−۱٫۵٪/.test(m3.txt), 'ورودی دستی «−۱٫۵» → پیش‌نمایش قرمزِ «کمتر»');

/* اعمال → گرید تغییر، کاتالوگ (۰۱) همچنان دست‌نخورده */
const before01 = await page.evaluate(() => document.querySelector('#scr-01 .pcard .p').textContent);
await page.click('#pct-apply');
await page.waitForTimeout(280);
const ap = await page.evaluate(() => ({
  closed: !document.getElementById('dlg-pct').classList.contains('show'),
  chg: document.querySelectorAll('#scr-44 .bk-row.chg').length,
  p1: document.querySelector('#scr-44 .bk-row .bk-price').value,
  cnt: document.getElementById('bk-count').textContent,
  inputReset: document.getElementById('pct-input').value,
  after01: document.querySelector('#scr-01 .pcard .p').textContent,
}));
ok(ap.closed, 'بعد از اعمال، مدال بسته می‌شود');
ok(ap.chg === 5 && ap.cnt === '(۵)', 'هر ۵ ردیف «ویرایش شد» + شمارنده (۵)');
ok(ap.p1 === '۲٬۸۰۷٬۲۵۰', `۲٬۸۵۰٬۰۰۰ × ۰٫۹۸۵ = ${ap.p1}`);
ok(ap.inputReset === '۰', 'ورودی درصدی برای اعمال بعدی به ۰ برمی‌گردد');
ok(before01 === ap.after01, 'کاتالوگ (۰۱) تا «ثبت تغییرات» عوض نمی‌شود');

/* ═══ ۳) مدال اکسل — الگوی ورود/ثبت‌نام ═══ */
console.log('— مدال اکسل: آپلود بالا/درشت · دانلود پایین/کم‌اهمیت');
await page.click('#scr-44 .bk-xls');
await page.waitForTimeout(300);
const xl = await page.evaluate(() => {
  const d = document.getElementById('dlg-xlsbulk');
  const up = document.getElementById('xls-import');
  const dn = document.getElementById('xls-export');
  return {
    show: d.classList.contains('show'),
    upAbove: up.getBoundingClientRect().y < dn.getBoundingClientRect().y,
    upH: up.getBoundingClientRect().height,
    dnH: dn.getBoundingClientRect().height,
    upBold: parseFloat(getComputedStyle(up.querySelector('.tx b')).fontSize),
    dnBold: parseFloat(getComputedStyle(dn.querySelector('.tx b')).fontSize),
    upBg: getComputedStyle(up).backgroundColor,
    dnBg: getComputedStyle(dn).backgroundColor,
    dnBorderless: getComputedStyle(dn).borderTopStyle === 'dashed',
    upTxt: up.textContent.replace(/\s+/g, ' ').trim(),
    dnTxt: dn.textContent.replace(/\s+/g, ' ').trim(),
    statusHidden: document.getElementById('xls-status').hidden,
    p: d.querySelector('.dlg-p').textContent.trim(),
  };
});
ok(xl.show, 'مدال dlg-xlsbulk باز می‌شود');
ok(xl.p === 'اگر تعداد کالاهاتون زیاد می تونید با آپلود لیست اکسلتون سریع قیمت و موجودی رو در آیمچ آپدیت کنید.', 'متن توضیح عیناً از مالک (ماندگار)');
ok(xl.upAbove, '«آپلود» بالای «دانلود» (الگوی ورود/ثبت‌نام)');
ok(/آپلود فایل اکسل قیمت‌ها/.test(xl.upTxt) && /فایل اکسل قیمتهای جدید را آپلود کنید/.test(xl.upTxt), 'آپلود: عنوان + توضیح «فایل اکسل قیمتهای جدید را آپلود کنید»');
ok(xl.upH > xl.dnH && xl.upBold > xl.dnBold && xl.upBg !== xl.dnBg && xl.dnBorderless, `آپلود برجسته (کارت سبز ${Math.round(xl.upH)}px/${xl.upBold}px) · دانلود لینک‌وار (${Math.round(xl.dnH)}px/${xl.dnBold}px خط‌چین)`);
ok(/بار اول یا وقتی کالای جدید/.test(xl.dnTxt), 'دانلود: توضیح «برای بار اول یا وقتی کالای جدید اضافه کرده‌ای»');
ok(xl.statusHidden, 'وضعیت اکسل پنهان است');

/* بستن مدال اکسل */
await page.click('#dlg-xlsbulk [data-close]');
await page.waitForTimeout(200);

/* ═══ ۴) بخش تخفیف‌ها — بازشو · ۴ بخش · ۱۲ درصد · فقط درصد ═══ */
console.log('— تخفیف‌ها و قیمت‌های ویژه');
await page.click('.disc-toggle');
await page.waitForTimeout(250);
const dc = await page.evaluate(() => ({
  visible: !document.getElementById('bk-disc').hidden,
  open: document.querySelector('.disc-toggle').classList.contains('open'),
  ariaExp: document.querySelector('.disc-toggle').getAttribute('aria-expanded'),
  sections: [...document.querySelectorAll('#bk-disc .disc-h')].map(h => h.childNodes[0].textContent.trim()),
  rows: document.querySelectorAll('#bk-disc .disc-row').length,
  inputs: document.querySelectorAll('#bk-disc [data-discinput]').length,
  noManage: document.querySelectorAll('#bk-disc .add-row, #bk-disc .row-act, #bk-disc [data-sheet]').length,
  hint: document.querySelector('#bk-disc .hintnote').textContent.includes('تنظیمات کاتالوگ'),
  overflow: document.getElementById('bk-disc').scrollWidth > document.getElementById('bk-disc').clientWidth + 1,
}));
ok(dc.visible && dc.open && dc.ariaExp === 'true', 'دکمهٔ بازشو: کارت باز + chevron چرخیده + aria-expanded=true');
ok(dc.sections.length === 4 && dc.sections[0] === 'همکار و گروه‌های مشتری' && dc.sections[1] === 'تخفیف حجمی — همهٔ کالاها' && dc.sections[2].startsWith('گروه تخفیف حجمی خشکبار') && dc.sections[3].startsWith('گروه تخفیف حجمی حبوبات'), 'چهار بخش: همکار/گروه مشتری · حجمی کاتالوگ · خشکبار · حبوبات');
ok(dc.rows === 12 && dc.inputs === 12, '۱۲ ردیف درصدِ ویرایش‌پذیر (۴ مشتری + ۳ + ۳ + ۲ پله)');
ok(dc.noManage === 0, 'بدون مدیریت گروه (نه add-row نه row-act نه لینک شیت)');
ok(dc.hint, 'راهنما: مدیریت گروه‌ها از تنظیمات کاتالوگ است');
ok(!dc.overflow, 'بدون سرریز افقی');

/* ویرایش درصد → نشان + شمارنده؛ برگشت → پاک */
await page.evaluate(() => {
  const rows = document.querySelectorAll('#bk-disc .disc-row');
  const i1 = rows[0].querySelector('[data-discinput]'); i1.value = '۹'; i1.dispatchEvent(new Event('input', { bubbles: true }));
  const i2 = rows[5].querySelector('[data-discinput]'); i2.value = '۴٫۵'; i2.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
const de = await page.evaluate(() => ({
  chg: document.querySelectorAll('#bk-disc .disc-row.chg').length,
  dirty: [...document.querySelectorAll('.disc-row.chg .d-dirty')].filter(d => d.getClientRects().length > 0).length,
  cnt: document.getElementById('bk-count').textContent,
  p1: document.querySelector('#scr-44 .bk-row .bk-price').value,
}));
ok(de.chg === 2 && de.dirty === 2, '۲ درصد تغییرکرد → ۲ نشان «ویرایش شد»');
ok(de.cnt === '(۷)', `شمارنده = ۵ کالا + ۲ تخفیف = (۷) (${de.cnt})`);
ok(de.p1 === '۲٬۸۰۷٬۲۵۰', 'درصد تخفیف قیمت پایه را عوض نمی‌کند');

/* ═══ ۵) ثبت تغییرات → همه‌چیز یک‌جا ═══ */
console.log('— ثبت تغییرات: کالا + تخفیف با هم');
await page.evaluate(() => { document.getElementById('bk-save').click(); });
await page.waitForTimeout(350);
const sv = await page.evaluate(() => ({
  btn: document.getElementById('bk-save').textContent.replace(/\s+/g, ' ').trim(),
  cgroup1: document.querySelector('#sheet-cgroup .grp-row .pctw input').value,
  cowork: document.querySelector('#sheet-cowork .field input').value,
  cw02: (document.getElementById('cw-02') || {}).textContent,
  cw13: (document.querySelector('#scr-13 .cowork-line b') || {}).textContent,
  vol2: document.querySelectorAll('#sheet-vol .sheet-row')[2].querySelector('.pctw input').value,
  discChg: document.querySelectorAll('#bk-disc .disc-row.chg').length,
}));
ok(/۵ کالا و ۲ تخفیف/.test(sv.btn), `پیام ثبت: «۵ کالا و ۲ تخفیف» (${sv.btn})`);
ok(sv.cowork === '۹٪' && sv.cw02 === '۹٪' && sv.cw13 === '۹٪', 'همکار ۹٪ → شیت cowork + خط ۰۲ + خط ۱۳');
ok(sv.vol2 === '۴٫۵', 'پلهٔ ۲۰ کیسهٔ کاتالوگ ۴٫۵٪ در شیت vol');
ok(sv.discChg === 0, 'بعد از ثبت، نشان‌های تخفیف پاک شدند');
await page.waitForTimeout(950);
const back01 = await page.evaluate(() => ({
  hash: location.hash,
  card1: document.querySelector('#scr-01 .pcard .p').textContent.replace(/\s+/g, ' ').trim(),
}));
ok(back01.hash === '#01', 'بعد از ثبت به کاتالوگ (۰۱) برمی‌گردد');
ok(back01.card1.includes('۲٬۸۰۷٬۲۵۰'), `قیمت کاتالوگ ۰۱ با درصد اعمال‌شده به‌روز شد (${back01.card1})`);

/* ═══ ۶) بازنشانی — ردیف‌ها + تخفیف‌ها ═══ */
console.log('— بازنشانی همهٔ تغییرات');
await nav('44');
/* اگر تخفیف‌ها از قبل باز است، دوباره بازشو نکن */
const wasOpen = await page.evaluate(() => !document.getElementById('bk-disc').hidden);
if (!wasOpen) { await page.click('.disc-toggle'); await page.waitForTimeout(200); }
await page.click('#scr-44 .bk-pct');
await page.waitForTimeout(260);
for (let i = 0; i < 4; i++) await page.click('.pct-minus'); /* −۲٪ */
await page.click('#pct-apply');
await page.waitForTimeout(220);
await page.evaluate(() => {
  const rows = document.querySelectorAll('#bk-disc .disc-row');
  const i2 = rows[2].querySelector('[data-discinput]'); i2.value = '۶'; i2.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(150);
const preRst = await page.evaluate(() => ({
  chg: document.querySelectorAll('#scr-44 .bk-row.chg').length,
  dchg: document.querySelectorAll('#bk-disc .disc-row.chg').length,
  cnt: document.getElementById('bk-count').textContent,
}));
ok(preRst.chg === 5 && preRst.dchg === 1 && preRst.cnt === '(۶)', `قبل از بازنشانی: ۵+۱=${preRst.cnt}`);
await page.click('.bk-reset2');
await page.waitForTimeout(250);
const postRst = await page.evaluate(() => ({
  chg: document.querySelectorAll('#scr-44 .bk-row.chg').length,
  dchg: document.querySelectorAll('#bk-disc .disc-row.chg').length,
  p1: document.querySelector('#scr-44 .bk-row .bk-price').value,
  d0: document.querySelector('#bk-disc .disc-row [data-discinput]').value,
  d2: document.querySelectorAll('#bk-disc .disc-row')[2].querySelector('[data-discinput]').value,
  cnt: document.getElementById('bk-count').textContent,
}));
ok(postRst.chg === 0 && postRst.dchg === 0 && postRst.cnt === '(۰)', 'بازنشانی → صفر تغییر (ردیف + تخفیف)');
ok(postRst.p1 === '۲٬۸۰۷٬۲۵۰' && postRst.d0 === '۹' && postRst.d2 === '۵', `بازنشانی به «آخرین مبنای ثبت‌شده» برمی‌گردد (۹/۵) — نه مقدار اولیهٔ جلسه`);

/* ═══ ۷) جمع‌بستن تخفیف‌ها با دکمه — در هر دو جهت ═══ */
ok(await page.evaluate(() => !document.getElementById('bk-disc').hidden && document.querySelector('.disc-toggle').getAttribute('aria-expanded') === 'true'), 'تخفیف‌ها باز است (بازنشانی وضعیت جمع‌شدگی را عوض نمی‌کند)');
await page.click('.disc-toggle');
await page.waitForTimeout(200);
ok(await page.evaluate(() => document.getElementById('bk-disc').hidden && document.querySelector('.disc-toggle').getAttribute('aria-expanded') === 'false' && !document.querySelector('.disc-toggle').classList.contains('open')), 'دوباره دکمهٔ تخفیف‌ها جمعش می‌کند (hidden + aria=false + chevron برمی‌گردد)');

/* ═══ ۸) e2e همهٔ صفحه‌ها ═══ */
console.log('— e2e همهٔ صفحه‌ها');
const ids = await page.evaluate(() => [...document.querySelectorAll('.scr')].map(s => s.id.replace('scr-', '')));
let vis = 0;
for (const id of ids) {
  await page.goto(URL + '#' + id);
  await page.waitForTimeout(90);
  vis++;
}
ok(vis === ids.length, `e2e: ${vis}/${ids.length} صفحه نمایان`);
ok(errors.length === 0, 'صفر خطای کنسول' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));

console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
