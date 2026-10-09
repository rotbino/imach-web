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

/* ═══ ۳) فرم کالا (۰۴) — واژگان و جریان ═══ */
console.log('— فرم کالا (۰۴): واژگان');
await nav('04');
const f04 = await page.evaluate(() => {
  const txt = document.getElementById('scr-04').innerText;
  return {
    txt,
    goodLabel: !!txt.match(/نوع کالا/),
    noGood: !txt.includes('گود'),
    noRefWord: !txt.includes('کالای مرجع'),
    q: txt.includes('آیا این کالا برند دارد؟'),
    optBrand: txt.includes('برند دارد'),
    optFelle: txt.includes('فله یا بدون برند'),
    activePills: [...document.querySelectorAll('#scr-04 .pillchoice .pill[data-gmode].active')].length,
    felleHidden: document.getElementById('gf-felle').hidden,
    brandHidden: document.getElementById('gf-brand').hidden,
    noBrandHint: !txt.includes('برندت در فهرست نیست'),
    productsLabel: txt.includes('محصولات برند'),
    noUnitGood: !txt.includes('واحد مصرف‌کنندهٔ گود'),
  };
});
ok(f04.goodLabel && f04.noGood, '«نوع کالا» جای «گود» نشست (بدون واژهٔ گود در متن)');
ok(f04.noRefWord, 'واژهٔ «کالای مرجع» در فرم نیست — «محصولات برند»');
ok(f04.q && f04.optBrand && f04.optFelle, 'سوال «آیا این کالا برند دارد؟» + گزینه‌های درست');
ok(f04.activePills === 0 && f04.felleHidden && f04.brandHidden, 'حالت اولیه: هیچ گزینه‌ای انتخاب نیست و هیچ بخشی لود نشده');
ok(f04.noBrandHint, 'راهنمای «برندت در فهرست نیست؟…» حذف شد');
ok(f04.noUnitGood, '«واحد مصرف‌کنندهٔ گود» از کنار قیمت حذف شد');

/* جریان: انتخاب گزینه بخش مربوط را باز می‌کند */
await page.click('#scr-04 .pill[data-gmode="brand"]');
await page.waitForTimeout(120);
const brandOn = await page.evaluate(() => ({
  brand: !document.getElementById('gf-brand').hidden,
  felle: document.getElementById('gf-felle').hidden,
  act: document.querySelector('#scr-04 .pill[data-gmode="brand"]').classList.contains('active'),
}));
ok(brandOn.brand && brandOn.felle && brandOn.act, '«برند دارد» → بخش برند و محصولات باز شد');

await page.click('#scr-04 .pill[data-gmode="felle"]');
await page.waitForTimeout(120);
const felleOn = await page.evaluate(() => ({
  felle: !document.getElementById('gf-felle').hidden,
  brand: document.getElementById('gf-brand').hidden,
  act: document.querySelector('#scr-04 .pill[data-gmode="felle"]').classList.contains('active'),
}));
ok(felleOn.felle && felleOn.brand && felleOn.act, '«فله یا بدون برند» → مسیر فله باز شد');

/* انتخاب نوع کالا از شیت → سوال از نو بی‌پاسخ می‌شود */
await page.click('#scr-04 [data-sheet="sheet-goodpick"]');
await page.waitForTimeout(250);
const gpSheet = await page.evaluate(() => {
  const sh = document.getElementById('sheet-goodpick');
  const txt = sh.innerText;
  return {
    title: sh.querySelector('h3').textContent,
    sub: sh.querySelector('.sub').textContent,
    noGood: !txt.includes('گود'),
    open: sh.classList.contains('show'),
  };
});
ok(gpSheet.open && gpSheet.title === 'انتخاب نوع کالا', 'شیت نوع کالا: عنوان «انتخاب نوع کالا»');
ok(gpSheet.noGood && !gpSheet.sub.includes('گود یعنی'), 'شیت نوع کالا: بدون واژهٔ گود و بدون توضیح تعریف');

await page.click('#sheet-goodpick .sheet-row[data-gname="برنج هاشمی"]');
await page.waitForTimeout(200);
const afterGood = await page.evaluate(() => ({
  name: document.getElementById('gf-good').textContent,
  path: document.getElementById('gf-good-path').textContent,
  active: [...document.querySelectorAll('#scr-04 .pillchoice .pill[data-gmode].active')].length,
  felleHidden: document.getElementById('gf-felle').hidden,
  brandHidden: document.getElementById('gf-brand').hidden,
  scope: document.getElementById('gf-brand-scope').textContent,
}));
ok(afterGood.name === 'برنج هاشمی' && afterGood.path.includes('برنج'), 'انتخاب نوع کالا: نام و مسیر به‌روز شد');
ok(afterGood.active === 0 && afterGood.felleHidden && afterGood.brandHidden, 'بعد از نوع کالای تازه: سوال برند از نو بی‌پاسخ است');
ok(afterGood.scope.includes('برنج هاشمی'), 'برچسب برند هم‌گام شد («برندهای مرتبط با «برنج هاشمی»»)');

/* ═══ ۴) محصولات برند: تیک چندگانه + ساخت محصول جدید ═══ */
console.log('— محصولات برند (چندانتخابی)');
await page.click('#scr-04 .pill[data-gmode="brand"]');
await page.waitForTimeout(120);
const bp0 = await page.evaluate(() => ({
  rows: document.querySelectorAll('#bp-list .bp-item').length,
  noneOn: document.querySelectorAll('#bp-list .bp-item.on').length,
  specsHidden: [...document.querySelectorAll('#bp-list .bp-specs')].every(s => s.hidden),
}));
ok(bp0.rows === 2 && bp0.noneOn === 0 && bp0.specsHidden, 'محصولات برند: ۲ ردیف، هیچ‌کدام تیک‌خورده، مشخصات بسته');

await page.click('#bp-list .bp-item:first-child .bp-row');
await page.waitForTimeout(120);
const bp1 = await page.evaluate(() => {
  const items = [...document.querySelectorAll('#bp-list .bp-item')];
  return {
    firstOn: items[0].classList.contains('on'),
    firstSpecs: !items[0].querySelector('.bp-specs').hidden,
    secondOn: items[1].classList.contains('on'),
    secondSpecs: items[1].querySelector('.bp-specs').hidden,
    fields: items[0].querySelector('.bp-specs').innerText,
  };
});
ok(bp1.firstOn && bp1.firstSpecs, 'تیک اول: همان ردیف تیک خورد و مشخصات فروش زیرش باز شد');
ok(!bp1.secondOn && bp1.secondSpecs, 'ردیف دوم هنوز دست‌نخورده است');
ok(bp1.fields.includes('قیمت') && bp1.fields.includes('حداقل حجم') && bp1.fields.includes('موجودی') && bp1.fields.includes('توضیحات'), 'مشخصات فروش: قیمت + حداقل حجم + موجودی + توضیحات');

await page.click('#bp-list .bp-item:nth-child(2) .bp-row');
await page.waitForTimeout(120);
const bp2 = await page.evaluate(() => [...document.querySelectorAll('#bp-list .bp-item')].every(i => i.classList.contains('on') && !i.querySelector('.bp-specs').hidden));
ok(bp2, 'تیک دوم: هر دو محصول همزمان انتخاب و باز شدند (ثبت همزمان)');

await page.click('#bp-list .bp-item:first-child .bp-row');
await page.waitForTimeout(120);
const bp3 = await page.evaluate(() => {
  const items = [...document.querySelectorAll('#bp-list .bp-item')];
  return { off: !items[0].classList.contains('on'), specsHidden: items[0].querySelector('.bp-specs').hidden, secondStillOn: items[1].classList.contains('on') };
});
ok(bp3.off && bp3.specsHidden && bp3.secondStillOn, 'برداشتن تیک: مشخصات همان ردیف بسته شد، بقیه ماندند');

/* ساخت محصول جدید (اشی مشی ۴ نوع پفک دارد، ۲ تای آن لیست است) */
await page.click('#gf-refs [data-reveal="bp-newprod"]');
await page.waitForTimeout(120);
const revealShown = await page.evaluate(() => !document.getElementById('bp-newprod').hidden);
ok(revealShown, '«محصول جدید این برند…» فرم نام را باز کرد');
await page.fill('#bp-newprod-input', 'پفک اشی مشی · بسته خانواده');
await page.click('[data-bpnew]');
await page.waitForTimeout(150);
const bpNew = await page.evaluate(() => {
  const items = [...document.querySelectorAll('#bp-list .bp-item')];
  const last = items[items.length - 1];
  return {
    count: items.length,
    on: last.classList.contains('on'),
    specsOpen: !last.querySelector('.bp-specs').hidden,
    name: last.querySelector('.bp-meta b').textContent,
    hasPhoto: !!last.querySelector('.bp-specs .gallery-add'),
    hasUnit: last.querySelector('.bp-specs').innerText.includes('واحد فروش عمده'),
    revealHidden: document.getElementById('bp-newprod').hidden,
    inputCleared: document.getElementById('bp-newprod-input').value === '',
  };
});
ok(bpNew.count === 3 && bpNew.name === 'پفک اشی مشی · بسته خانواده', 'محصول جدید به فهرست اضافه شد');
ok(bpNew.on && bpNew.specsOpen && bpNew.hasPhoto && bpNew.hasUnit, 'محصول جدید تیک‌خورده با عکس + واحد فروش عمده + قیمت باز شد');
ok(bpNew.revealHidden && bpNew.inputCleared, 'فرم نام بسته و پاک شد');

/* برند بدون محصول (چیتوز) — متن جدید مالک */
await page.click('#scr-04 [data-sheet="sheet-brandpick"]');
await page.waitForTimeout(250);
const brSheet = await page.evaluate(() => {
  const sh = document.getElementById('sheet-brandpick');
  return { title: sh.querySelector('h3').textContent, sub: sh.querySelector('.sub').textContent, open: sh.classList.contains('show') };
});
ok(brSheet.open && brSheet.title === 'انتخاب یا ثبت برند', 'شیت برند: عنوان «انتخاب یا ثبت برند»');
ok(brSheet.sub === 'اگر برند مورد نظرت در لیست نیست، خودت ثبتش کن', 'شیت برند: متن جدید مالک');
await page.click('#sheet-brandpick .sheet-row[data-bname="چیتوز"]');
await page.waitForTimeout(200);
const noRefs = await page.evaluate(() => ({
  nof: !document.getElementById('gf-norefs').hidden,
  refs: document.getElementById('gf-refs').hidden,
  txt: document.getElementById('gf-norefs').innerText,
}));
ok(noRefs.nof && noRefs.refs, 'برند بدون محصول → فرم ورود دستی باز شد');
ok(noRefs.txt.includes('برای این برند هنوز محصولی ثبت نشده است. لطفا خودت عکس و مشخصات این کالا رو ثبت کن.'), 'متن جدید «هنوز محصولی ثبت نشده» عیناً');
ok(noRefs.txt.includes('توضیحات'), 'فرم ورود دستی هم فیلد توضیحات دارد');

/* ═══ ۵) بسته‌بندی فروش عمده: نوع + تعداد + سایر ═══ */
console.log('— بسته‌بندی فروش عمده');
await page.click('#scr-04 .pill[data-gmode="felle"]');
await page.waitForTimeout(120);
const pkg0 = await page.evaluate(() => {
  const pills = [...document.querySelectorAll('#scr-04 .pill[data-pack]')].map(p => p.textContent.trim());
  const num = document.querySelector('.pkg-num');
  return {
    pills,
    label: document.getElementById('gf-pkg-label').textContent,
    numW: num ? num.getBoundingClientRect().width : 0,
    unit: document.querySelector('.pkg-unit').textContent,
    hint: [...document.querySelectorAll('#gf-felle .hint')].some(h => h.textContent.includes('واحد پایه')),
  };
});
ok(pkg0.pills.join('|') === 'گونی|کارتن|کیسه|سایر…', `انواع بسته‌بندی: گونی/کارتن/کیسه/سایر (${pkg0.pills.join('|')})`);
ok(pkg0.label === 'تعداد در کارتن' && pkg0.numW > 40 && pkg0.numW < 100, `«تعداد در کارتن» با تکست‌باکس کم‌عرض (${Math.round(pkg0.numW)}px)`);
ok(pkg0.unit === 'کیلوگرم' && pkg0.hint, 'واحد پایه از نوع کالا می‌آید (کیلوگرم) + راهنمای قیمت خودکار');

await page.click('#scr-04 .pill[data-pack="گونی"]');
await page.waitForTimeout(100);
const pkg1 = await page.evaluate(() => ({
  label: document.getElementById('gf-pkg-label').textContent,
  active: document.querySelector('#scr-04 .pill[data-pack="گونی"]').classList.contains('active'),
}));
ok(pkg1.label === 'تعداد در گونی' && pkg1.active, 'انتخاب «گونی» → برچسب «تعداد در گونی»');

/* «سایر…» → شیت واحدها */
await page.click('#scr-04 .pill[data-pack="سایر"]');
await page.waitForTimeout(250);
const upSheet = await page.evaluate(() => {
  const pill = document.querySelector('#scr-04 .pill[data-pack="سایر"]');
  const sh = document.getElementById('sheet-unitpick');
  return {
    open: sh.classList.contains('show'),
    pillActive: pill.classList.contains('active'),
    rows: sh.querySelectorAll('[data-unitpick]').length,
    hasNew: !!sh.querySelector('[data-unitnew]'),
  };
});
ok(upSheet.open && upSheet.pillActive, '«سایر…» شیت واحدها را باز کرد و پیل فعال شد');
ok(upSheet.rows >= 4 && upSheet.hasNew, `شیت واحدها: ${upSheet.rows} واحد + ساخت واحد جدید`);
await page.click('#sheet-unitpick [data-unitpick="جعبه"]');
await page.waitForTimeout(150);
const up1 = await page.evaluate(() => {
  const other = document.querySelector('#scr-04 .pill.pkg-other');
  return {
    txt: other ? other.textContent.trim() : null,
    active: other ? other.classList.contains('active') : false,
    label: document.getElementById('gf-pkg-label').textContent,
    keepsPicker: other ? other.hasAttribute('data-sheet') : false,
    closed: !document.getElementById('sheet-unitpick').classList.contains('show'),
  };
});
ok(up1.txt === 'جعبه' && up1.active && up1.closed, 'انتخاب «جعبه» → پیل سایر تبدیل به «جعبه» شد');
ok(up1.label === 'تعداد در جعبه', 'برچسب به «تعداد در جعبه» هم‌گام شد');
ok(up1.keepsPicker, 'لمس دوبارهٔ پیل سفارشی، شیت واحدها را دوباره باز می‌کند');

/* واحد جدید از شیت — لمس دوبارهٔ همان پیل سفارشی، شیت را باز می‌کند */
await page.click('#scr-04 .pill.pkg-other');
await page.waitForTimeout(250);
ok(await page.evaluate(() => document.getElementById('sheet-unitpick').classList.contains('show')), 'پیل «جعبه» (سفارشی) دوباره شیت واحدها را باز کرد');
await page.click('#sheet-unitpick [data-reveal="up-new"]');
await page.waitForTimeout(100);
await page.fill('#up-new-input', 'خرجی');
await page.click('#sheet-unitpick [data-unitnew]');
await page.waitForTimeout(150);
const up2 = await page.evaluate(() => {
  const other = document.querySelector('#scr-04 .pill.pkg-other');
  return {
    txt: other ? other.textContent.trim() : null,
    label: document.getElementById('gf-pkg-label').textContent,
    closed: !document.getElementById('sheet-unitpick').classList.contains('show'),
  };
});
ok(up2.txt === 'خرجی' && up2.label === 'تعداد در خرجی' && up2.closed, 'ساخت واحد جدید «خرجی» → پیل و برچسب هم‌گام شدند');

/* فیلد توضیحات در مسیر فله */
const felleNotes = await page.evaluate(() => {
  const ta = [...document.querySelectorAll('#gf-felle textarea.input')];
  return ta.length > 0 && ta.every(t => (t.placeholder || '').includes('توضیحات اختیاری'));
});
ok(felleNotes, 'مسیر فله: فیلد توضیحات با پلیس‌هولدر مناسب');

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
