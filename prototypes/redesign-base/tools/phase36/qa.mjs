// tools/phase36/qa.mjs — QA رفتاری فاز ۳۶: به‌روزرسانی گروهی قیمت/موجودی (۴۴ + اکسل) + متن‌های لندینگ + فونت/عنوان فرم کالا
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

/* ═══ ۱) صفحهٔ ۴۴ — ساختار گرید ═══ */
console.log('— صفحهٔ ۴۴: گرید قیمت/موجودی');
await nav('44');
const grid = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#scr-44 .bk-row')];
  const body = document.querySelector('#scr-44 .screen-body');
  return {
    rows: rows.length,
    priceX: new Set(rows.map(r => Math.round(r.querySelector('.bk-price').getBoundingClientRect().x))).size,
    stockX: new Set(rows.map(r => Math.round(r.querySelector('.bk-stock').getBoundingClientRect().x))).size,
    overflow: body.scrollWidth > body.clientWidth + 1,
    head: document.querySelector('.bk-head').textContent.replace(/\s+/g, ' ').trim(),
    chips: document.querySelectorAll('[data-bkpc]').length,
    reset: !!document.querySelector('[data-bkreset]'),
    save: !!document.getElementById('bk-save'),
    xlsBtn: !!document.querySelector('#scr-44 .bk-xls'),
    xlsIcon: document.querySelector('#scr-44 .bk-xls use') ? document.querySelector('#scr-44 .bk-xls use').getAttribute('href') : null,
    cnt: document.getElementById('bk-count').textContent,
    dirtyVisible: [...document.querySelectorAll('#scr-44 .bk-dirty')].filter(d => d.getClientRects().length > 0).length,
  };
});
ok(grid.rows === 5, `۵ ردیف کالا در گرید (${grid.rows})`);
ok(grid.priceX === 1 && grid.stockX === 1, 'ستون قیمت/موجودی در همهٔ ردیف‌ها تراز است');
ok(!grid.overflow, 'بدون سرریز افقی');
ok(/کالا/.test(grid.head) && /قیمت/.test(grid.head) && /موجودی/.test(grid.head), 'سرستون‌ها: کالا · قیمت · موجودی');
/* فاز ۳۹: چیپ‌ها حذف شدند — آیکون ٪ + لینک بازنشانی جایگزین */
ok(grid.chips === 0 && grid.reset, 'چیپ‌های درصدی حذف شده + بازنشانی (لینک زیر گرید)');
ok(grid.save && grid.cnt === '(۰)', 'دکمهٔ «ثبت تغییرات (۰)» از ابتدا');
ok(grid.dirtyVisible === 0, 'نشان «ویرایش شد» در حالت اولیه پنهان است');

/* بازگشت ۴۴ → ۰۱ */
await page.click('#scr-44 .subheader .back');
await page.waitForTimeout(220);
ok(await page.evaluate(() => location.hash === '#01'), 'بازگشت ۴۴ → کاتالوگ (۰۱)');

/* ═══ ۲) تغییر درصدی (فاز ۴۵: پنل اینلاین bk-pctbar — اعمال زنده) + بازنشانی ═══ */
console.log('— تغییر درصدی (پنل اینلاین فاز ۴۵) و بازنشانی');
await nav('44');
/* +۵٪ = ۱۰ کلیک روی دکمهٔ زیاد — هر کلیک همان لحظه روی جدول می‌نشیند */
await page.click('#scr-44 .bk-pct');
await page.waitForTimeout(280);
for (let i = 0; i < 10; i++) await page.click('.pct-plus');
await page.waitForTimeout(200);
ok(await page.evaluate(() => document.getElementById('pct-input').value === '۵'), '۱۰ کلیک روی + → ورودی ۵٪ (گام ۰٫۵)');
await page.waitForTimeout(250);
const afterPc = await page.evaluate(() => ({
  chg: document.querySelectorAll('#scr-44 .bk-row.chg').length,
  cnt: document.getElementById('bk-count').textContent,
  p1: document.querySelector('#scr-44 .bk-row .bk-price').value,
  dirty: [...document.querySelectorAll('#scr-44 .bk-row.chg .bk-dirty')].filter(d => d.getClientRects().length > 0).length,
}));
ok(afterPc.chg === 5 && afterPc.cnt === '(۵)', `+۵٪ → هر ۵ ردیف تغییر (${afterPc.cnt})`);
ok(afterPc.p1 === '۲٬۹۹۲٬۵۰۰', `۲٬۸۵۰٬۰۰۰ × ۱٫۰۵ = ${afterPc.p1}`);
ok(afterPc.dirty === 5, 'نشان «ویرایش شد» روی ردیف‌های تغییرکرده پیداست');

await page.click('.bk-reset2');
await page.waitForTimeout(200);
const afterRs = await page.evaluate(() => ({
  chg: document.querySelectorAll('#scr-44 .bk-row.chg').length,
  p1: document.querySelector('#scr-44 .bk-row .bk-price').value,
}));
ok(afterRs.chg === 0 && afterRs.p1 === '۲٬۸۵۰٬۰۰۰', 'بازنشانی → مقدار اولیه و صفر تغییر');

/* ترکیبی: +۵٪ سپس −۵٪ (فاز ۴۵: پنل اینلاین — بازمحاسبه از مبنا، نه تجمعی) */
if (await page.locator('#bk-pctbar').isHidden()) { await page.click('#scr-44 .bk-pct'); await page.waitForTimeout(260); }
for (let i = 0; i < 10; i++) await page.click('.pct-plus');
await page.waitForTimeout(150);
/* +۵ → صفر → −۵: هر تغییر از مبنا بازمحاسبه می‌شود */
for (let i = 0; i < 20; i++) await page.click('.pct-minus');
await page.waitForTimeout(220);
const comp = await page.evaluate(() => document.querySelector('#scr-44 .bk-row .bk-price').value);
ok(comp === '۲٬۷۰۷٬۵۰۰', `درصد از مبنا: ۲٬۸۵۰٬۰۰۰×۰٫۹۵ = ${comp}`);
await page.click('.bk-reset2');
await page.waitForTimeout(120);

/* ═══ ۳) ویرایش دستی — نشان هوشمند ═══ */
const manual = await page.evaluate(() => {
  const row = document.querySelectorAll('#scr-44 .bk-row')[1];
  const si = row.querySelector('.bk-stock');
  si.value = '۲۵';
  si.dispatchEvent(new Event('input', { bubbles: true }));
  return { chg: row.classList.contains('chg') };
});
ok(manual.chg, 'تایپ در موجودی → ردیف «ویرایش شد»');
const back2orig = await page.evaluate(() => {
  const row = document.querySelectorAll('#scr-44 .bk-row')[1];
  const si = row.querySelector('.bk-stock');
  si.value = '۲۸';
  si.dispatchEvent(new Event('input', { bubbles: true }));
  return { chg: row.classList.contains('chg') };
});
ok(!back2orig.chg, 'برگشت به مقدار اولیه → نشان «ویرایش شد» برداشته می‌شود');

/* ═══ ۴) ثبت → به‌روزرسانی زندهٔ کاتالوگ (۰۱) و لیست (۲۶) ═══ */
console.log('— ثبت تغییرات → کاتالوگ');
await page.evaluate(() => {
  const row = document.querySelectorAll('#scr-44 .bk-row')[0];
  const pi = row.querySelector('.bk-price');
  pi.value = '۳۱۰۰۰۰۰';
  pi.dispatchEvent(new Event('input', { bubbles: true }));
  const si = row.querySelector('.bk-stock');
  si.value = '۰';
  si.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.evaluate(() => { document.getElementById('bk-save').click(); });
await page.waitForTimeout(250);
const saved = await page.evaluate(() => ({
  btn: document.getElementById('bk-save').textContent.trim(),
}));
ok(/ثبت شد/.test(saved.btn), 'دکمه بعد از ثبت «ثبت شد …» می‌شود');
await page.waitForTimeout(900);
const afterSave = await page.evaluate(() => ({
  hash: location.hash,
  card1: document.querySelector('#scr-01 .pcard .p').textContent.replace(/\s+/g, ' ').trim(),
  badge1: document.querySelector('#scr-01 .pcard .mm .badge').textContent.trim(),
  badge1Cls: document.querySelector('#scr-01 .pcard .mm .badge').className,
}));
ok(afterSave.hash === '#01', 'بعد از ثبت به کاتالوگ (۰۱) برمی‌گردد');
ok(afterSave.card1.includes('۳٬۱۰۰٬۰۰۰'), `قیمت کارت اول کاتالوگ به‌روز شد (${afterSave.card1})`);
ok(afterSave.badge1 === 'تمام شد', `موجودی ۰ → نشان «تمام شد» (${afterSave.badge1} / ${afterSave.badge1Cls})`);


/* موجودی کم → amber */
await nav('44');
await page.evaluate(() => {
  const row = document.querySelectorAll('#scr-44 .bk-row')[1];
  const si = row.querySelector('.bk-stock');
  si.value = '۵';
  si.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.evaluate(() => { document.getElementById('bk-save').click(); });
await page.waitForTimeout(1100);
const badge2 = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#scr-01 .pcard')];
  const c = cards.find(x => x.querySelector('.n').textContent.trim() === 'برنج طارم');
  return c.querySelector('.mm .badge').className + '|' + c.querySelector('.mm .badge').textContent.trim();
});
ok(/b-amber\|موجودی کم/.test(badge2), `موجودی ۵ → «موجودی کم» کهربایی (${badge2})`);

/* ═══ ۵) نقاط ورود ═══ */
console.log('— نقاط ورود');
await nav('01');
const bar01 = await page.evaluate(() => {
  const b = document.querySelector('#scr-01 .bulk-bar');
  if (!b) return null;
  return { go: b.dataset.go, vis: b.getClientRects().length > 0, txt: b.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) };
});
ok(bar01 && bar01.go === '44' && bar01.vis, `نوار «قیمت و موجودی» روی کاتالوگ → ۴۴ (${bar01 && bar01.txt})`);
await page.click('#scr-01 .bulk-bar');
await page.waitForTimeout(220);
ok(await page.evaluate(() => location.hash === '#44'), 'کلیک نوار → صفحهٔ ۴۴');

await nav('01');
await page.evaluate(() => { document.querySelector('#scr-01 .showcase [data-sheet="sheet-cset"]').click(); });
await page.waitForTimeout(320);
const cset = await page.evaluate(() => {
  const rows = document.querySelectorAll('#sheet-cset .sheet-row');
  const first = rows[0];
  return { n: rows.length, txt: first.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), go: first.dataset.go };
});
/* فاز ۴۴: به‌روزرسانی گروهی به خودِ کاتالوگ رفت (نوار «قیمت و موجودی»)؛ ردیف اول cset = تبلیغات و افزایش فروش */
ok(/تبلیغات و افزایش فروش/.test(cset.txt) && cset.go === '30', `ردیف اولِ تنظیمات کاتالوگ = «تبلیغات و افزایش فروش» → ۳۰`);
await page.click('#sheet-cset .sheet-row');
await page.waitForTimeout(220);
ok(await page.evaluate(() => location.hash === '#30'), 'کلیک ردیف تنظیمات → صفحهٔ ۳۰');


/* ═══ ۷) متن‌های لندینگ (۱۵ + d3) ═══ */
console.log('— متن‌های صفحهٔ اول');
await nav('15');
const hero = await page.evaluate(() => ({
  h1: document.querySelector('#scr-15 .hero-land h1').textContent.trim(),
  sub: document.querySelector('#scr-15 .hero-land .sub').textContent.trim(),
  strong: document.querySelector('#scr-15 .hero-land .strong-line').textContent.trim(),
  em: document.querySelector('#scr-15 .hero-land h1 em').textContent.trim(),
}));
ok(hero.h1 === 'تامین کالا، مساله اکثر کسب و کارهاست' && hero.em === 'تامین کالا', `h1: «${hero.h1}»`);
/* فاز ۳۹: متن مالک (کامیت Saeed changes) — «خرید عمده کالا»؛ d3 هم هم‌گام شد */
ok(hero.sub === 'از مغازه‌ای کوچک تا کارخانه‌ای بزرگ، از کسب‌وکارهای خدماتی تا شرکت‌های بازرگانی، نیاز به خرید عمده کالا از تامین کنندگان مناسب دارند.', 'جملهٔ اول کامل شد (متن جدید مالک)');
ok(hero.strong === 'آیمچ، با پیشنهاد دقیق، انتخاب تأمین‌کننده مناسب را آسان می‌کند.', 'جملهٔ دوم جدید');
await nav('d3');
const heroD = await page.evaluate(() => ({
  h1: document.querySelector('#scr-d3 .dl-hero h1').textContent.replace(/\s+/g, ' ').trim(),
  strong: document.querySelector('#scr-d3 .dl-hero .strong-line').textContent.trim(),
}));
ok(heroD.h1.includes('تامین کالا') && heroD.h1.includes('مساله اکثر کسب و کارهاست'), `d3 h1 هماهنگ: «${heroD.h1}»`);
ok(heroD.strong.includes('انتخاب تأمین‌کننده مناسب را آسان می‌کند'), 'd3 جملهٔ دوم هماهنگ');

/* ═══ ۸) ورودهای سریع — هم‌گام فاز ۴۳: اسکن داخل جستجو + چسباندن لیست + اکسل ═══ */
await nav('04');
const entries = await page.evaluate(() => {
  const c = document.querySelector('#scr-04 .gf-paste');
  return {
    pasteTxt: c ? c.textContent.replace(/\s+/g, ' ').trim() : '',
    scan: !!document.querySelector('#scr-04 .gf-scan[data-sheet="sheet-scan"]'),
  };
});
ok(entries.pasteTxt.includes('بچسبونش') && entries.pasteTxt.includes('واتس‌اپ'), 'کال‌اوت «چسباندن لیست قیمت» با متن مالک‌پسند');
ok(entries.scan, 'اسکنر داخل نوار جستجو (فاز ۴۴: لینک اکسل حذف شد)');

/* ═══ ۹) فرم کالا — هم‌گام فاز ۴۳: عنوان در کاتالوگ (فله) + نام کالای جدید ═══ */
console.log('— فرم کالا (۰۴)');
await page.fill('#gf-q', 'پفک');
await page.waitForTimeout(150);
await page.click('#gf-res .gf-row[data-gfpick="good"]');
await page.waitForTimeout(200);
const felle = await page.evaluate(() => {
  const inp = document.getElementById('gf-title');
  const blk = document.getElementById('gf-step2');
  return { exists: !!inp, visible: !blk.hidden, label: inp ? inp.closest('.field').querySelector('label').textContent : '' };
});
ok(felle.exists && felle.visible, 'فله: فیلد «عنوان در کاتالوگ» در فرم قیمت');
ok(/عنوان در کاتالوگ/.test(felle.label), 'لیبل = «عنوان در کاتالوگ … همین عنوان را خریداران می‌بینند»');

/* کالای جدید: نام کاربر + «در انتظار تأیید» */
await page.locator('[data-gfreset]').click();
await page.waitForTimeout(120);
await page.fill('#gf-q', 'پفک اشی مشی بسته خانواده');
await page.waitForTimeout(150);
await page.click('#gf-res .gf-newcta');
await page.waitForTimeout(200);
const newprod = await page.evaluate(() => {
  const inp = document.getElementById('gf-newname');
  const blk = document.getElementById('gf-step2');
  return {
    visible: !blk.hidden,
    hasName: !!inp,
    val: inp ? inp.value : '',
    pending: blk.innerText.includes('در انتظار تأیید'),
    goodChips: document.querySelectorAll('[data-gfnewgood]').length,
  };
});
ok(newprod.visible && newprod.hasName && newprod.val.includes('پفک'), 'کالای جدید: نام کاربر پیش‌پر شد');
ok(newprod.pending, 'کالای جدید: نشان «در انتظار تأیید»');
ok(newprod.goodChips >= 1, 'کالای جدید: چیپ‌های «نوع کالا» برای اتصال به مرجع');

/* ═══ ۱۰) e2e — ۴۷ صفحه بدون خطای کنسول ═══ */
console.log('— e2e همهٔ صفحه‌ها');
const SCREENS = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','27','29','30','34','42','44','45','d3']; /* فاز ۴۵: ۲۳ صفحه + d3 (۱۴ حذف، ۴۵ اضافه) */
let visOk = 0, visFail = 0;
for (const s of SCREENS) {
  await page.goto(URL + '#' + s);
  await page.waitForTimeout(110);
  const vis = await page.evaluate(id => { const el = document.getElementById('scr-' + id); return el && !el.hidden; }, s);
  if (vis) visOk++; else { visFail++; console.log('  NOT VISIBLE:', s); }
}
ok(visFail === 0, `e2e: ${visOk}/${SCREENS.length} صفحه نمایان (۲۴ صفحهٔ فاز ۴۴)`);
ok(errors.length === 0, 'صفر خطای کنسول' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));

console.log('\nRESULT:', pass, 'pass /', fail, 'fail');
await browser.close();
process.exit(fail ? 1 : 0);
