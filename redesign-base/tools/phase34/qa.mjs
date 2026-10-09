// tools/phase34/qa.mjs — QA رفتاری فاز ۳۴: اسکرول نوارهای افقی + بازگشت ۱۶/۱۷ + پروگرس مینیمال + مدال شرایط + «فعالیت شما در بازار»
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

/* ═══ ۱) اسکرول افقی نوار «نظر خریداران» (۱۵) ═══ */
await page.goto(URL + '#15');
await page.waitForTimeout(500);

const wrapInfo = await page.evaluate(() => {
  const row = document.getElementById('ts-row-15');
  const wrap = row && row.parentElement;
  return {
    wrapped: !!(wrap && wrap.classList.contains('hs-wrap')),
    arrows: wrap ? wrap.querySelectorAll('.hs-arrow').length : 0,
    canNext: wrap ? wrap.classList.contains('can-next') : false,
    canPrev: wrap ? wrap.classList.contains('can-prev') : false,
    max: row ? row.scrollWidth - row.clientWidth : 0,
    fullBleed: row ? Math.abs(row.getBoundingClientRect().width - 390) < 2 : false,
  };
});
console.log('— نوار نظرات (۱۵)');
ok(wrapInfo.wrapped, 'نوار داخل hs-wrap نشسته (قاب فلش‌ها)');
ok(wrapInfo.arrows === 2, 'دو فلش مینیمال تزریق شده');
ok(wrapInfo.fullBleed, 'نوار همچنان فول‌بلید ۳۹۰px است (مارجین منفی حفظ شد)');
ok(wrapInfo.canNext && !wrapInfo.canPrev && wrapInfo.max > 1000, 'ابتدای نوار: فقط فلش «بعدی» فعال');

/* درگ ماوس — can-prev بعد از یک فریم (رویداد scroll + rAF) هم‌گام می‌شود */
const afterDrag = await page.evaluate(() => {
  const row = document.getElementById('ts-row-15');
  const r = row.getBoundingClientRect();
  const x = r.right - 80, y = r.top + r.height / 2;
  const o = { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, clientX: x, clientY: y };
  row.dispatchEvent(new PointerEvent('pointerdown', o));
  row.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x - 150 }));
  window.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: x - 150, buttons: 0 }));
  return new Promise(res => setTimeout(() => res({ sl: Math.abs(row.scrollLeft), canPrev: row.parentElement.classList.contains('can-prev') }), 150));
});
ok(afterDrag.sl > 100, `درگ ماوس نوار را می‌چرخاند (scrollLeft=${Math.round(afterDrag.sl)})`);
ok(afterDrag.canPrev, 'بعد از درگ، فلش «قبلی» هم ظاهر شد');

/* درگ تمام‌شده نباید کلیک/ناوبری ثبت کند */
const navAfterDrag = await page.evaluate(() => {
  const row = document.getElementById('ts-row-15');
  const btn = row.querySelector('.ts-card .ts-btn');
  const r = btn.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, pointerId: 8, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, clientX: r.x + 10, clientY: r.y + 5 };
  row.dispatchEvent(new PointerEvent('pointerdown', o));
  row.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: o.clientX - 60 }));
  window.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: o.clientX - 60, buttons: 0 }));
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return location.hash;
});
ok(navAfterDrag === '#15', 'درگ روی دکمهٔ کارت، ناوبری نمی‌سازد (کلیک خورده شد)');

/* چرخ عمودی → افقی */
const afterWheel = await page.evaluate(() => {
  const row = document.getElementById('ts-row-15');
  row.scrollLeft = 0;
  row.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 }));
  return Math.abs(row.scrollLeft);
});
ok(afterWheel > 50, `چرخ عمودی نوار را جلو می‌برد (scrollLeft=${Math.round(afterWheel)})`);

/* فلش «بعدی» */
const afterNext = await page.evaluate(() => {
  document.querySelector('#ts-row-15').parentElement.querySelector('.hs-next').click();
  return new Promise(res => setTimeout(() => res(Math.abs(document.getElementById('ts-row-15').scrollLeft)), 500));
});
ok(afterNext > 200, `فلش «بعدی» اسکرول نرم می‌کند (${Math.round(afterNext)})`);

/* بقیهٔ نوارها هم تجهیز شدند */
const rowsAll = await page.evaluate(() => ({
  vd: document.querySelectorAll('.vd-row').length,
  vdWrapped: Array.from(document.querySelectorAll('.vd-row')).every(r => r.parentElement.classList.contains('hs-wrap')),
  blWrapped: !!document.querySelector('#scr-08 .bl-rfq-row') && document.querySelector('#scr-08 .bl-rfq-row').parentElement.classList.contains('hs-wrap'),
}));
console.log('— نوارهای دیگر');
ok(rowsAll.vd === 2 && rowsAll.vdWrapped, 'دو نوار فیلم آموزشی (۴۰/۴۱) تجهیز شدند');
ok(rowsAll.blWrapped, 'نوار درخواست‌های خرید جاری (۰۸) تجهیز شد');

/* ═══ ۲) صفحه ساخت حساب (۱۶) ═══ */
await page.goto(URL + '#16');
await page.waitForTimeout(300);
console.log('— ساخت حساب (۱۶)');

const s16 = await page.evaluate(() => {
  const back = document.querySelector('#scr-16 .subheader .back');
  const use = back && back.querySelector('use');
  const prog = document.querySelector('#scr-16 .mini-prog');
  const labels = Array.from(document.querySelectorAll('#scr-16 .form-card label')).map(l => l.textContent.trim());
  const pills = Array.from(document.querySelectorAll('#scr-16 .pillchoice .pill')).map(p => ({ t: p.textContent.trim(), a: p.classList.contains('active') }));
  const lnk = document.querySelector('#scr-16 .terms-lnk');
  const cs = lnk ? getComputedStyle(lnk) : null;  return {
    backHref: use ? use.getAttribute('href') : null,
    backTag: back ? back.tagName : null,
    stepsGone: !document.querySelector('#scr-16 .steps-ind'),
    progSegs: prog ? prog.querySelectorAll('i').length : 0,
    progH: prog ? getComputedStyle(prog.querySelector('i')).height : null,
    hasLabel: labels.includes('فعالیت شما در بازار'),
    oldLabelGone: !labels.includes('شما در ای‌مچ چه می‌کنید؟'),
    pills,
    lnkText: lnk ? lnk.textContent.trim() : null,
    lnkColor: lnk ? getComputedStyle(lnk).color : null,
    redColor: (() => { const p = document.createElement('i'); p.style.color = 'var(--red)'; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; })(),
    lnkUnderline: lnk ? getComputedStyle(lnk).textDecorationLine : null,
    fullText: document.querySelector('#scr-16 .checkrow span').textContent.trim(),
  };
});
ok(s16.backHref === '#i-back' && s16.backTag === 'BUTTON', 'آیکون بازگشت راست‌گرد استاندارد (#i-back)');
ok(s16.stepsGone && s16.progSegs === 2 && s16.progH === '4px', 'اندیکاتور گام‌ها حذف؛ نوار پیشرفت مینیمال ۲ قطعه‌ای ۴px');
ok(s16.hasLabel && s16.oldLabelGone, 'عنوان فیلد: «فعالیت شما در بازار»');
ok(s16.pills.length === 3 && s16.pills[0].t === 'خرید عمده' && s16.pills[1].t === 'فروش عمده' && s16.pills[1].a && s16.pills[2].t === 'هر دو', 'گزینه‌ها: خرید عمده / فروش عمده (فعال) / هر دو');
ok(s16.lnkText === 'شرایط استفاده' && s16.fullText === 'شرایط استفاده از آیمچ را می‌پذیرم', 'متن: «شرایط استفاده از آیمچ را می‌پذیرم»');
ok(s16.lnkColor && s16.redColor && s16.lnkColor === s16.redColor && (s16.lnkUnderline || '').includes('underline'), `لینک شرایط: رنگ متمایز var(--red) (${s16.lnkColor}) + زیرخط`);

/* مدال شرایط */
await page.click('#scr-16 .terms-lnk');
await page.waitForTimeout(320);
const tmodal = await page.evaluate(() => {
  const d = document.getElementById('dlg-terms');
  const body = d.querySelector('.tm-body');
  const h4s = body.querySelectorAll('h4');
  return {
    shown: d.classList.contains('show'),
    backdrop: document.getElementById('backdrop').classList.contains('show'),
    h4: h4s.length,
    lastH4: h4s[h4s.length - 1].textContent.trim(),
    bullets: body.querySelectorAll('ul li').length,
    scrollable: body.scrollHeight > body.clientHeight,
    checkboxStillOn: document.querySelector('#scr-16 .checkrow .checkbox').classList.contains('on'),
  };
});
ok(tmodal.shown && tmodal.backdrop, 'کلیک لینک → مدال توافق‌نامه باز می‌شود');
ok(tmodal.checkboxStillOn, 'کلیک روی لینک تیک چک‌باکس را برنمی‌گرداند');
ok(tmodal.h4 === 13 && tmodal.lastH4 === 'ماده ۱۲ ـ پذیرش توافق‌نامه', 'کل توافق‌نامه: مقدمه + ۱۲ ماده');
ok(tmodal.bullets === 6, 'فهرست بولتی ماده ۳ بند ۴ (۶ آیتم)');
ok(tmodal.scrollable, 'بدنهٔ مدال اسکرولی است (سربرگ/پاص ثابت)');

/* بستن با × → تیک دست‌نخورده */
await page.click('#dlg-terms .tm-x');
await page.waitForTimeout(250);
const t1 = await page.evaluate(() => ({
  closed: !document.getElementById('dlg-terms').classList.contains('show'),
  on: document.querySelector('#scr-16 .checkrow .checkbox').classList.contains('on'),
}));
ok(t1.closed && t1.on, '«×» فقط می‌بندد؛ تیک دست‌نخورده');

/* تیک با خود چک‌باکس برمی‌گردد (نه با لینک) */
await page.evaluate(() => { document.querySelector('#scr-16 .checkrow .checkbox').click(); });
const t2 = await page.evaluate(() => !document.querySelector('#scr-16 .checkrow .checkbox').classList.contains('on'));
ok(t2, 'کلیک روی خود چک‌باکس (نه لینک) تیک را برمی‌گرداند');

/* «مطالعه کردم و می‌پذیرم» */
await page.click('#scr-16 .terms-lnk');
await page.waitForTimeout(300);
await page.click('#dlg-terms [data-termsok]');
await page.waitForTimeout(250);
const t3 = await page.evaluate(() => ({
  closed: !document.getElementById('dlg-terms').classList.contains('show'),
  on: document.querySelector('#scr-16 .checkrow .checkbox').classList.contains('on'),
}));
ok(t3.closed && t3.on, '«مطالعه کردم و می‌پذیرم»: تیک روشن + بستن');

/* ═══ ۳) صفحه ورود (۱۷) ═══ */
await page.goto(URL + '#17');
await page.waitForTimeout(250);
console.log('— ورود (۱۷)');
const s17 = await page.evaluate(() => {
  const use = document.querySelector('#scr-17 .subheader .back use');
  return use ? use.getAttribute('href') : null;
});
ok(s17 === '#i-back', 'آیکون بازگشت ورود هم راست‌گرد شد');
const noV2 = await page.evaluate(() => !document.querySelector('#i-back-v2'));
ok(noV2, 'سیمبل چپ‌گرد اشتباه i-back-v2 حذف شد');

/* ═══ ۴) e2e — همهٔ صفحات بدون خطای کنسول ═══ */
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
