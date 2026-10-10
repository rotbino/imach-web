// tools/phase35/qa.mjs — QA رفتاری فاز ۳۵: پروفایل‌ها (تم/فاصله/عناوین) + فوتر خرید + فرم کالای بازطراحی‌شده (۰۴)
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

/* ═══ ۱) پروفایل‌ها (۰۷/۱۴): تم + فاصله + حذف عناوین ═══ */
console.log('— پروفایل‌ها (۰۷/۱۴)');
for (const id of ['07', '14']) {
  await nav(id);
  const p = await page.evaluate(i => {
    const scr = document.getElementById('scr-' + i);
    const body = scr.querySelector('.screen-body');
    const txt = body.innerText;
    /* فاصلهٔ عمودی بین فرزندان مستقیم */
    const kids = [...body.children].filter(el => el instanceof HTMLElement && el.offsetParent !== null || !el.hidden);
    const gaps = [];
    for (let k = 0; k < kids.length - 1; k++) {
      const a = kids[k].getBoundingClientRect(), b = kids[k + 1].getBoundingClientRect();
      if (b.top > a.bottom) gaps.push(Math.round(b.top - a.bottom));
    }
    const themeRow = [...body.querySelectorAll('.card div')].find(d => d.textContent.trim().startsWith('تم تاریک / روشن'));
    return {
      txt,
      gaps,
      minGap: gaps.length ? Math.min(...gaps) : 99,
      hasTheme: !!themeRow,
      themeToggle: themeRow ? !!themeRow.querySelector('.toggle') : false,
      themeIcon: themeRow ? themeRow.querySelector('svg use').getAttribute('href') : null,
      ppCap: !!body.querySelector('.pp-cap'),
      bizCap: !!body.querySelector('.biz-cap'),
      bizTop: !!body.querySelector('.biz-top'),
      actsInShowcase: !!body.querySelector('.biz-card .showcase .biz-acts'),
      actsNearName: (() => {
        const acts = body.querySelector('.biz-card .showcase .biz-acts');
        const name = body.querySelector('.biz-card .showcase .name');
        if (!acts || !name) return false;
        const a = acts.getBoundingClientRect(), n = name.getBoundingClientRect();
        return Math.abs(a.top - n.top) < 14;
      })(),
      pencilWired: !!body.querySelector('.biz-edit[data-go="22"]'),
    };
  }, id);
  ok(p.hasTheme && p.themeToggle, `${id}: ردیف «تم تاریک / روشن» + سوییچ`);
  ok(String(p.themeIcon || '').includes('#i-moon'), `${id}: آیکون ماه در ردیف تم`);
  ok(p.minGap >= 11, `${id}: همهٔ باکس‌ها فاصلهٔ عمودی ≥۱۱px دارند (کمینه=${p.minGap})`);
  ok(!p.ppCap, `${id}: عنوان «پروفایل شخصی» حذف شد`);
  ok(!p.bizCap && !p.bizTop, `${id}: عنوان «کسب و کار» حذف شد`);
  ok(p.actsInShowcase && p.actsNearName, `${id}: مداد و کمبو روبروی عنوان کسب‌وکار نشستند`);
  ok(p.pencilWired, `${id}: دکمهٔ مداد همچنان به ویرایش کسب‌وکار (۲۲) وصل است`);
}

/* سوییچ تم کلیک‌پذیر است (سمت ظاهری؛ لازم نیست تم واقعاً عوض شود) */
await nav('07');
const themeFlip = await page.evaluate(() => {
  const row = [...document.querySelectorAll('#scr-07 .screen-body .card div')].find(d => d.textContent.trim().startsWith('تم تاریک / روشن'));
  const tg = row.querySelector('.toggle');
  const before = tg.classList.contains('on');
  tg.click();
  return { before, after: tg.classList.contains('on') };
});
ok(themeFlip.before !== themeFlip.after, '۰۷: سوییچ تم با کلیک برمی‌گردد (فقط ظاهری)');

/* ═══ ۲) فوتر خرید: «کارها» اول ═══ */
console.log('— فوتر دستیار خرید');
for (const id of ['08', '39', '31', '14']) {
  await nav(id);
  const f = await page.evaluate(i => [...document.querySelectorAll('#scr-' + i + ' .tabbar .tab')].map(t => (t.dataset.go || '?') + ':' + t.textContent.trim().replace(/\s+/g, ' ')), id);
  ok(f[0].startsWith('39:') && f[1].startsWith('08:'), `${id}: «کارها» اول، «لیست خرید» دوم (${f[0]} | ${f[1]})`);
}
await nav('14');
await page.click('#scr-14 .tabbar .tab:nth-child(1)');
await page.waitForTimeout(300);
ok(await page.evaluate(() => location.hash === '#39'), 'تب اول پروفایل خرید (کارها) → صفحهٔ ۳۹');

/* ۱۸ (keep) با بازوی خرید */
await nav('08');
await nav('18');
await page.waitForTimeout(200);
const t18 = await page.evaluate(() => [...document.querySelectorAll('#scr-18 .tabbar .tab')].map(t => (t.dataset.go || '?') + ':' + t.textContent.trim().replace(/\s+/g, ' ')));
ok(t18[0].startsWith('39:'), '۱۸ (بازوی خرید): «کارها» اول ستِ تب‌ها');

/* ═══ ۳) فرم کالا (۰۴) — هم‌گام فاز ۴۳: الگوی MVP (جستجوی واحد ← انتخاب ← قیمت) ═══ */
console.log('— فرم کالا (۰۴): جستجوی واحد');
await nav('04');
const f04 = await page.evaluate(() => {
  const txt = document.getElementById('scr-04').innerText;
  return {
    txt,
    goodLabel: ((document.getElementById('gf-q') || {}).placeholder || '').includes('چی می‌فروشی'),
    noGood: !txt.includes('گود'),
    noBrandQ: !txt.includes('آیا این کالا برند دارد؟'),
    step1: !document.getElementById('gf-step1').hidden,
    step2Hidden: document.getElementById('gf-step2').hidden,
    barHidden: document.getElementById('gf-bar').hidden,
    pasteCallout: !!document.querySelector('.gf-paste'),
    scanBtn: !!document.querySelector('.gf-scan'),
  };
});
ok(f04.goodLabel && f04.noGood, 'جستجوی واحد «چی می‌فروشی؟» نشست (بدون واژهٔ گود)');
ok(f04.noBrandQ, 'سوال «آیا برند دارد؟» حذف شد — نتایج جستجو خودش برند/فله را جدا می‌کند');
ok(f04.step1 && f04.step2Hidden && f04.barHidden, 'حالت اولیه: گام ۱ باز، گام ۲ و اکشن‌بار بسته');
ok(f04.pasteCallout && f04.scanBtn, 'ورودهای جایگزین: چسباندن لیست قیمت + اسکنر داخل نوار جستجو');

/* جریان: جستجو → انتخاب → فرم قیمت */
await page.fill('#gf-q', 'پفک');
await page.waitForTimeout(150);
const f04b = await page.evaluate(() => ({
  groups: [...document.querySelectorAll('.gf-group')].map(g => g.textContent),
  rows: document.querySelectorAll('#gf-res .gf-row').length,
  newCta: document.querySelectorAll('#gf-res .gf-newcta').length,
}));
ok(f04b.rows >= 2 && f04b.groups.some(g => g.includes('برنددار')), 'نتایج گروه‌بندی‌شده: «فله / بدون برند» + «برنددار»');
ok(f04b.newCta === 1, '«پیدا نکردی؟ ثبت کالای جدید»');
await page.click('#gf-res .gf-row[data-gfpick="good"]');
await page.waitForTimeout(200);
const f04c = await page.evaluate(() => ({
  step2: !document.getElementById('gf-step2').hidden,
  bar: !document.getElementById('gf-bar').hidden,
  save: document.getElementById('gf-save').textContent,
  fields: document.getElementById('gf-step2').innerText,
}));
ok(f04c.step2 && f04c.bar, 'انتخاب کالا → گام ۲ + اکشن‌بار');
ok(f04c.save.includes('افزودن به کاتالوگ'), 'دکمهٔ «افزودن به کاتالوگ»');
ok(f04c.fields.includes('حداقل سفارش') && f04c.fields.includes('موجودی') && f04c.fields.includes('توضیحات'), 'مشخصات فروش: موجودی + حداقل سفارش + توضیحات');

/* بسته‌بندی فروش عمده: بسته‌های نوع کالا + «سایر…» */
const pkg0 = await page.evaluate(() => ({
  chips: [...document.querySelectorAll('[data-gfpack]')].map(c => c.textContent.trim()),
  other: document.querySelector('[data-gfpack="other"]') !== null,
  label: document.getElementById('gf-plabel').textContent,
}));
ok(pkg0.chips.length >= 3 && pkg0.other, `بسته‌بندی: بسته‌های نوع کالا + «سایر…» (${pkg0.chips.join('|')})`);
await page.click('[data-gfpack="other"]');
await page.waitForTimeout(150);
const pkg1 = await page.evaluate(() => ({
  input: document.getElementById('gf-customqty') !== null,
  ph: (document.getElementById('gf-customqty') || {}).placeholder || '',
}));
ok(pkg1.input && pkg1.ph.includes('چند'), '«سایر…» → ورودی مقدار دلخواه («چند کیلوگرم؟»)');

/* عنوان در کاتالوگ (فاز ۳۶) در مسیر فله */
const felleTitle = await page.evaluate(() => {
  const t = document.getElementById('gf-title');
  return !!t && (t.placeholder || '') !== '';
});
ok(felleTitle, 'مسیر فله: فیلد «عنوان در کاتالوگ»');

/* فیلد توضیحات */
const felleNotes = await page.evaluate(() => {
  const ta = [...document.querySelectorAll('#gf-step2 textarea.input')];
  return ta.length > 0 && ta.every(t => (t.placeholder || '').includes('توضیحات اختیاری'));
});
ok(felleNotes, 'فرم: فیلد توضیحات با پلیس‌هولدر مناسب');

/* ═══ ۶) کاتالوگ (۰۲): هماهنگی فیلدها ═══ */
console.log('— کاتالوگ (۰۲)');
await nav('02');
const c02 = await page.evaluate(() => {
  const txt = document.getElementById('scr-02').innerText;
  return { hasNotes: txt.includes('توضیحات فروشنده'), hasSample: txt.includes('ارسال روزانه از انبار رشت') };
});
ok(c02.hasNotes && c02.hasSample, 'جزئیات کالا: کارت «توضیحات فروشنده» (همان فیلد فرم ۰۴)');

/* ═══ ۷) e2e — همهٔ صفحات بدون خطای کنسول ═══ */
console.log('— e2e همهٔ صفحه‌ها');
const SCREENS = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','d1','d2','d3'];
let visOk = 0, visFail = 0;
for (const s of SCREENS) {
  await page.goto(URL + '#' + s);
  await page.waitForTimeout(110);
  const vis = await page.evaluate(id => { const el = document.getElementById('scr-' + id); return el && !el.hidden; }, s);
  if (vis) visOk++; else { visFail++; console.log('  NOT VISIBLE:', s); }
}
ok(visFail === 0, `e2e: ${visOk}/${SCREENS.length} صفحه نمایان`);
ok(errors.length === 0, 'صفر خطای کنسول' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));

console.log('\nRESULT:', pass, 'pass /', fail, 'fail');
await browser.close();
process.exit(fail ? 1 : 0);
