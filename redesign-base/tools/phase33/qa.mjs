// tools/phase33/qa.mjs — QA فاز ۳۳
// ۱) پروفایل شخصی: کارت در ۰۷/۱۴ (عکس + نام → ۴۲) · صفحهٔ ۴۲ (تصویر + نام/نام خانوادگی +
//    جنسیت + تاریخ تولد + موبایل فقط‌خواندنی) · شیت sheet-photo (گالری/دوربین/حذف) · ذخیرهٔ زنده.
// ۲) نوار «نظر خریداران» لندینگ (۱۵) قبل از «آی‌مچ چیست؟»: ۶ نظر مالک عیناً + هر کاربر فقط
//    «یک» دکمه (کاتالوگ/لیست خرید) + کارت دعوت + لینک «سایر نظرات» بالا.
// ۳) مدال سادهٔ dlg-rvw: اعتبارسنجی + ثبت زنده (نقش → دکمهٔ کارت) · صفحهٔ ۴۳ «سایر نظرات».
// ۴) e2e همهٔ ۴۶ صفحه = صفر خطای کنسول.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p33');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', err => errors.push(String(err)));

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); ok ? pass++ : fail++; };
const nav = async h => { await page.evaluate(x => { location.hash = x; }, '#' + h); await page.waitForTimeout(260); };
const boot = async h => { await page.goto(URL + '#' + h); await page.evaluate(() => localStorage.removeItem('imach-assist')); await page.reload(); await page.waitForTimeout(450); };

/* ═══ ۱) لندینگ — نوار «نظر خریداران» ═══ */
await boot('15');
const L = await page.evaluate(() => {
  const bar = document.getElementById('ts-row-15');
  const intro = document.querySelector('#scr-15 .intro-sep span');
  const cards = [...bar.querySelectorAll('.ts-card')];
  const cta = bar.querySelector('.ts-cta');
  return {
    shown: !document.getElementById('scr-15').hidden,
    order: bar.getBoundingClientRect().top < intro.getBoundingClientRect().top,
    head: (document.querySelector('.ts-head b') || {}).textContent || '',
    morelnk: (document.querySelector('.ts-morelnk') || {}).textContent || '',
    moreGo: (document.querySelector('.ts-morelnk') || {}).dataset ? document.querySelector('.ts-morelnk').dataset.go : '',
    n: cards.length,
    names: cards.map(c => (c.querySelector('.ts-n') || {}).textContent),
    roles: cards.map(c => (c.querySelector('.ts-role') || {}).textContent),
    texts: cards.map(c => (c.querySelector('.ts-tx') || {}).textContent),
    caps: cards.map(c => (c.querySelector('.ts-cap') || {}).textContent.trim()),
    btns: cards.map(c => {
      const b = c.querySelector('.ts-btn');
      return { t: b.textContent.replace(/\s+/g, ' ').trim(), go: b.dataset.go, one: c.querySelectorAll('.ts-btn').length === 1 };
    }),
    ctaT: cta ? (cta.querySelector('b') || {}).textContent : '',
    ctaBtn: cta ? cta.querySelector('.ts-btn').hasAttribute('data-rvwopen') : false,
    scrollable: bar.scrollWidth > bar.clientWidth
  };
});
check('۱۵ باز می‌شود و نوار «نظر خریداران» قبل از «آی‌مچ چیست؟» است', L.shown && L.order);
check('۱۵ سربرگ: «نظر خریداران» + لینک قرمز «سایر نظرات» → ۴۳', L.head === 'نظر خریداران' && L.morelnk.includes('سایر نظرات') && L.moreGo === '43');
check('۱۵ شش کارت نظر + کارت دعوت (جمعاً ۶ کارت + CTA)', L.n === 6 && !!L.ctaT);
check('۱۵ نام‌های شش کاربر مالک به‌ترتیب', JSON.stringify(L.names) === JSON.stringify(['علی محمدی', 'صادق اکبری', 'مهدی رضایی', 'رضا کریمی', 'حسین مرادی', 'امیرحسین احمدی']));
check('۱۵ نقش‌ها عین مالک (پخش لوازم خودرو … توزیع‌کننده محصولات کشاورزی)',
  L.roles[0] === 'پخش لوازم خودرو' && L.roles[2] === 'خریدار عمده مواد اولیه' && L.roles[5] === 'توزیع‌کننده محصولات کشاورزی');
check('۱۵ متن نظر اول و آخر عین مالک',
  L.texts[0].startsWith('با ساخت کاتالوگ محصولات و ارسال لینک اون به خریداران همکار') && L.texts[0].endsWith('یک‌بار قیمت‌ها رو به‌روز می‌کنم و همه می‌بینن.') &&
  L.texts[5].endsWith('تا خریدارها قبل از تماس، اطلاعات بهتری داشته باشن.'));
check('۱۵ هر کاربر فقط «یک» دکمه دارد — ۵ کاتالوگ + ۱ لیست خرید', L.btns.every(b => b.one) && L.btns.filter(b => b.t === 'مشاهده کاتالوگ').length === 5 && L.btns.filter(b => b.t === 'مشاهده لیست خرید').length === 1);
check('۱۵ دکمهٔ مهدی رضایی (خریدار) «مشاهده لیست خرید» → ۲۳ · بقیه «مشاهده کاتالوگ» → ۱۳',
  L.btns[2].t === 'مشاهده لیست خرید' && L.btns[2].go === '23' && L.btns.filter(b => b.go === '13').length === 5);
check('۱۵ کارت دعوت: «آیمچ به شما هم کمک کرده؟» + دکمهٔ ثبت نظر (data-rvwopen)', L.ctaT === 'آیمچ به شما هم کمک کرده؟' && L.ctaBtn === true);
check('۱۵ نوار افقی اسکرولی است (محتوای بیشتر از قاب)', L.scrollable);
await page.evaluate(() => { document.querySelector('.ts-head').scrollIntoView({ block: 'center' }); });
await page.waitForTimeout(250);
await page.locator('#phone').screenshot({ path: OUT + '/15-testimonials-bar.png' });

/* ═══ ۲) مدال سادهٔ ثبت نظر ═══ */
await page.click('#ts-row-15 .ts-cta .ts-btn');
await page.waitForTimeout(320);
const dlgOpen = await page.evaluate(() => document.getElementById('dlg-rvw').classList.contains('show'));
check('مدال dlg-rvw از کارت دعوت باز می‌شود', dlgOpen);
const dlgFields = await page.evaluate(() => ({
  h: document.querySelector('#dlg-rvw h3').textContent,
  q: document.querySelector('#dlg-rvw .dlg-q').textContent,
  inputs: ['rvw-name', 'rvw-biz', 'rvw-text'].map(i => !!document.getElementById(i)),
  pills: [...document.querySelectorAll('#dlg-rvw .pillchoice .pill')].map(p => ({ t: p.textContent, r: p.dataset.rrole, on: p.classList.contains('active') })),
  err: !!document.getElementById('rvw-err')
}));
check('مدال: عنوان «ثبت نظر شما» + سوال + ۳ فیلد + ۲ pill نقش', dlgFields.h === 'ثبت نظر شما' && dlgFields.q.includes('آیمچ چه کمکی') && dlgFields.inputs.every(Boolean) && dlgFields.pills.length === 2);
check('مدال: نقش پیش‌فرض «فروشنده‌ام»', dlgFields.pills[0].on && dlgFields.pills[0].r === 'sell' && !dlgFields.pills[1].on);

/* اعتبارسنجی — فرم خالی */
await page.click('#dlg-rvw [data-rvwsend]');
await page.waitForTimeout(150);
const errShown = await page.evaluate(() => !document.getElementById('rvw-err').hidden && document.getElementById('dlg-rvw').classList.contains('show'));
check('فرم خالی → خطا «نام، کسب‌وکار و متن نظر را کامل کنید» بدون بستن مودال', errShown);

/* ثبت واقعی — نقش خریدار */
await page.fill('#rvw-name', 'پیمان شریفی');
await page.fill('#rvw-biz', 'رستوران زیتون');
await page.fill('#rvw-text', 'با درخواست خرید یک‌فرمه، مواد اولیه هفته‌ام رو یک‌جا از چند تأمین‌کننده می‌گیرم.');
await page.click('#dlg-rvw .pillchoice .pill[data-rrole="buy"]');
await page.click('#dlg-rvw [data-rvwsend]');
await page.waitForTimeout(400);
const after = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#ts-row-15 .ts-card')];
  const cta = document.querySelector('#ts-row-15 .ts-cta');
  const lc = cards[cards.length - 1];
  const lbtn = lc.querySelector('.ts-btn');
  return {
    closed: !document.getElementById('dlg-rvw').classList.contains('show'),
    n: cards.length,
    last: {
      n: lc.querySelector('.ts-n').textContent,
      role: lc.querySelector('.ts-role').textContent,
      fresh: lc.classList.contains('fresh'),
      btnT: lbtn.textContent.replace(/\s+/g, ' ').trim(),
      btnGo: lbtn.dataset.go
    },
    order: !!(cta && lc.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING),
    errHidden: document.getElementById('rvw-err').hidden,
    vals: ['rvw-name', 'rvw-biz', 'rvw-text'].map(i => document.getElementById(i).value)
  };
});
check('ثبت → مودال بسته + فرم خالی + خطا مخفی', after.closed && after.errHidden && after.vals.every(v => !v));
check('ثبت → کارت تازهٔ «پیمان شریفی · رستوران زیتون» سبز (fresh) در انتها — قبل از کارت دعوت', after.n === 7 && after.last.n === 'پیمان شریفی' && after.last.role === 'رستوران زیتون' && after.last.fresh && after.order);
check('ثبت با نقش خریدار → دکمهٔ کارت تازه «مشاهده لیست خرید» → ۲۳', after.last.btnT === 'مشاهده لیست خرید' && after.last.btnGo === '23');
await page.waitForTimeout(600); /* اسکرول به کارت تازه */
const barVis = await page.evaluate(() => {
  const bar = document.getElementById('ts-row-15');
  const cards = bar.querySelectorAll('.ts-card');
  const lc = cards[cards.length - 1];
  const br = bar.getBoundingClientRect(), cr = lc.getBoundingClientRect();
  const vis = cr.right > br.left && cr.left < br.right;
  return { vis, scrolled: Math.abs(bar.scrollLeft) > 10 || bar.scrollLeft > 10 };
});
check('ثبت → نوار به کارت تازه اسکرول می‌شود (کارت تازه داخل قاب)', barVis.vis && barVis.scrolled);
await page.locator('#phone').screenshot({ path: OUT + '/15-review-submitted.png' });

/* ═══ ۳) صفحهٔ ۴۳ «سایر نظرات» ═══ */
await page.click('#scr-15 .ts-morelnk');
await page.waitForTimeout(320);
const P43 = await page.evaluate(() => ({
  shown: !document.getElementById('scr-43').hidden,
  title: document.querySelector('#scr-43 .subheader .ttl').childNodes[0].textContent,
  items: document.querySelectorAll('#ts-list-43 .ts-item').length,
  first: (document.querySelector('#ts-list-43 .ts-item .ts-n') || {}).textContent,
  firstFresh: document.querySelector('#ts-list-43 .ts-item').classList.contains('fresh'),
  whens: [...document.querySelectorAll('#ts-list-43 .ts-when')].length,
  ask: (document.querySelector('#scr-43 .gd-ask p') || {}).textContent || '',
  barBtn: (document.querySelector('#scr-43 .action-bar [data-rvwopen]') || {}).textContent || ''
}));
check('لینک «سایر نظرات» → صفحهٔ ۴۳ با عنوان درست', P43.shown && P43.title === 'سایر نظرات');
check('۴۳: نظر تازهٔ ثبت‌شده اول لیست (سبز) + مجموع ۱۱ (۶+۴+۱)', P43.firstFresh && P43.first === 'پیمان شریفی' && P43.items === 11);
check('۴۳: هر آیتم زمان دارد + متن دعوت + دکمهٔ «ثبت نظر شما» در اکشن‌بار', P43.whens === 11 && P43.ask.includes('نظرتان را ثبت کنید') && P43.barBtn.includes('ثبت نظر شما'));
const p43btns = await page.evaluate(() => [...document.querySelectorAll('#ts-list-43 .ts-item')].map(i => ({ one: i.querySelectorAll('.ts-btn').length === 1, go: i.querySelector('.ts-btn').dataset.go })));
check('۴۳: هر کاربر فقط یک دکمه (کاتالوگ ۱۳ / لیست خرید ۲۳)', p43btns.every(b => b.one) && p43btns.every(b => b.go === '13' || b.go === '23'));
await page.locator('#phone').screenshot({ path: OUT + '/43-more-reviews.png' });

/* بازگشت از ۴۳ → ۱۵ */
await page.click('#scr-43 .subheader .back');
await page.waitForTimeout(300);
const back15 = await page.evaluate(() => !document.getElementById('scr-15').hidden);
check('بازگشت از ۴۳ → لندینگ (۱۵)', back15);

/* ═══ ۴) کارت پروفایل شخصی در ۰۷ و ۱۴ ═══ */
await nav('07');
const C7 = await page.evaluate(() => {
  const c = document.querySelector('#scr-07 .pp-card');
  return {
    card: !!c,
    go: c.dataset.go,
    cap: (c.querySelector('.pp-cap') || {}).textContent.trim(),
    name: (c.querySelector('.pp-name') || {}).textContent,
    sub: (c.querySelector('.pp-sub') || {}).textContent,
    img: (c.querySelector('.pp-av img') || {}).src || '',
    beforeBiz: c.compareDocumentPosition(document.querySelector('#scr-07 .biz-card')) & Node.DOCUMENT_POSITION_FOLLOWING
  };
});
check('۰۷: کارت «پروفایل شخصی» با عکس + نام «احمد رضایی» → ۴۲ — بالای کارت کسب‌وکار',
  C7.card && C7.go === '42' && C7.cap === 'پروفایل شخصی' && C7.name === 'احمد رضایی' && C7.img.includes('png/users/me.jpg') && C7.beforeBiz);
await page.locator('#phone').screenshot({ path: OUT + '/07-personal-card.png' });

await nav('14');
const C14 = await page.evaluate(() => {
  const c = document.querySelector('#scr-14 .pp-card');
  return { card: !!c, go: c ? c.dataset.go : '', img: c && c.querySelector('.pp-av img') ? c.querySelector('.pp-av img').src.includes('png/users/me.jpg') : false };
});
check('۱۴: همان کارت پروفایل شخصی (عکس + ۴۲) — بالای کارت کسب‌وکار', C14.card && C14.go === '42' && C14.img);

/* ═══ ۵) صفحهٔ ۴۲ — فرم مشخصات شخصی ═══ */
await page.click('#scr-14 .pp-card');
await page.waitForTimeout(320);
const P42 = await page.evaluate(() => {
  const s = document.getElementById('scr-42');
  return {
    shown: !s.hidden, arm: s.dataset.arm,
    title: s.querySelector('.subheader .ttl').childNodes[0].textContent,
    small: s.querySelector('.subheader .ttl small').textContent,
    big: (s.querySelector('[data-ppbig] img') || {}).src || '',
    changeBtn: !!s.querySelector('[data-sheet="sheet-photo"]'),
    fn: document.getElementById('pp-fn').value,
    ln: document.getElementById('pp-ln').value,
    bd: document.getElementById('pp-bd').value,
    pills: [...s.querySelectorAll('.pillchoice .pill')].map(p => ({ t: p.textContent, on: p.classList.contains('active') })),
    phone: s.querySelectorAll('.field').length,
    phoneTxt: s.textContent.includes('۰۹۱۲ ۳۴۵ ۶۷۸۹'),
    save: !!document.getElementById('pp-save')
  };
});
check('کلیک کارت → صفحهٔ ۴۲ «پروفایل شخصی» باز می‌شود (keep)', P42.shown && P42.arm === 'keep' && P42.title === 'پروفایل شخصی');
check('۴۲: عکس بزرگ + دکمهٔ «تغییر تصویر» + نام/نام خانوادگی/تاریخ تولد', P42.big.includes('png/users/me.jpg') && P42.changeBtn && P42.fn === 'احمد' && P42.ln === 'رضایی' && P42.bd === '۱۳۶۲/۰۴/۱۵');
check('۴۲: جنسیت دوگزینه (مرد فعال) + شمارهٔ موبایل فقط‌خواندنی + ذخیره', P42.pills.length === 2 && P42.pills[0].t === 'مرد' && P42.pills[0].on && P42.phoneTxt && P42.save);
await page.locator('#phone').screenshot({ path: OUT + '/42-personal-profile.png' });

/* جنسیت — جابه‌جایی pill */
await page.click('#scr-42 .pillchoice .pill[data-pgender="f"]');
await page.waitForTimeout(120);
const gen = await page.evaluate(() => {
  const ps = [...document.querySelectorAll('#scr-42 .pillchoice .pill')];
  return ps[1].classList.contains('active') && !ps[0].classList.contains('active');
});
check('۴۲: جنسیت قابل تغییر است (زن فعال می‌شود)', gen);
await page.click('#scr-42 .pillchoice .pill[data-pgender="m"]');
await page.waitForTimeout(120);

/* ═══ ۶) شیت انتخاب تصویر ═══ */
await page.click('#scr-42 [data-sheet="sheet-photo"]');
await page.waitForTimeout(320);
const SH = await page.evaluate(() => {
  const s = document.getElementById('sheet-photo');
  return {
    show: s.classList.contains('show'),
    opts: [...s.querySelectorAll('.ph-opt')].map(o => ({ img: !!o.querySelector('img'), on: o.classList.contains('on'), ph: o.dataset.pphoto })),
    cam: !!s.querySelector('[data-pphoto="next"]'),
    rm: !!s.querySelector('[data-pphoto="remove"]')
  };
});
check('شیت sheet-photo باز می‌شود — ۳ گزینهٔ گالری + دوربین + حذف', SH.show && SH.opts.length === 3 && SH.opts.every(o => o.img) && SH.cam && SH.rm);
check('گزینهٔ «عکس فعلی» در شیت روشن است', SH.opts[0].on && SH.opts[0].ph.includes('me.jpg'));
await page.locator('#phone').screenshot({ path: OUT + '/42-sheet-photo.png' });

/* انتخاب از گالری → هر سه آواتار به‌روز */
await page.click('.ph-opt[data-pphoto="png/users/alt-1.jpg"]');
await page.waitForTimeout(500);
const gal = await page.evaluate(() => ({
  big: document.querySelector('[data-ppbig] img').src,
  closed: !document.getElementById('sheet-photo').classList.contains('show')
}));
check('انتخاب گالری → عکس بزرگ ۴۲ همان لحظه عوض می‌شود + شیت بسته', gal.big.includes('alt-1.jpg') && gal.closed);
await nav('07');
const gal07 = await page.evaluate(() => document.querySelector('#scr-07 .pp-av img').src.includes('alt-1.jpg'));
check('عکس انتخاب‌شده در کارت ۰۷ هم به‌روز است', gal07);

/* دوربین = عکس بعدی */
await nav('42');
await page.click('#scr-42 [data-sheet="sheet-photo"]');
await page.waitForTimeout(320);
await page.click('#sheet-photo [data-pphoto="next"]');
await page.waitForTimeout(500);
const cam = await page.evaluate(() => document.querySelector('[data-ppbig] img').src.includes('alt-2.jpg'));
check('«گرفتن عکس با دوربین» → عکس بعدی (alt-2) در ماک', cam);

/* حذف تصویر → حرف اول نام */
await page.click('#scr-42 [data-sheet="sheet-photo"]');
await page.waitForTimeout(320);
await page.click('#sheet-photo [data-pphoto="remove"]');
await page.waitForTimeout(500);
const rmv = await page.evaluate(() => {
  const big = document.querySelector('[data-ppbig]');
  return { noImg: !big.querySelector('img'), ch: big.textContent.trim() };
});
check('حذف تصویر → حرف اول نام در آواتار', rmv.noImg && rmv.ch === 'ا');
await page.locator('#phone').screenshot({ path: OUT + '/42-photo-removed.png' });

/* ═══ ۷) ذخیرهٔ نام → کارت‌های ۰۷/۱۴ به‌روز + بازگشت به مبدأ ═══ */
await page.fill('#pp-fn', 'بهرام');
await page.click('#pp-save');
await page.waitForTimeout(350);
const saved = await page.evaluate(() => ({
  back07: !document.getElementById('scr-07').hidden,
  name: (document.querySelector('#scr-07 .pp-name') || {}).textContent,
  av: document.querySelector('#scr-07 .pp-av').textContent.trim()
}));
check('ذخیره → بازگشت به پروفایل مبدأ (۰۷) + نام جدید در کارت', saved.back07 && saved.name === 'بهرام رضایی');
check('ذخیره → آواتار بدون عکس حرف اول نام جدید را نشان می‌دهد', saved.av === 'ب');
await nav('14');
const saved14 = await page.evaluate(() => (document.querySelector('#scr-14 .pp-name') || {}).textContent);
check('نام جدید در کارت ۱۴ هم به‌روز است', saved14 === 'بهرام رضایی');

/* ═══ ۸) هم‌گامی ثبت‌نام ═══ */
await nav('16');
const nm16 = await page.evaluate(() => {
  const f = [...document.querySelectorAll('#scr-16 .field')].find(x => x.querySelector('label').textContent.includes('نام و نام خانوادگی'));
  return f.querySelector('.input span').textContent;
});
check('۱۶: نام ثبت‌نام با پروفایل شخصی هم‌گام («احمد رضایی»)', nm16 === 'احمد رضایی');

/* ═══ ۹) e2e همهٔ صفحه‌ها — صفر خطای کنسول ═══ */
const ids = await page.evaluate(() => [...document.querySelectorAll('.scr')].map(s => s.id.slice(4)).concat(['d1', 'd2', 'd3']));
const before = errors.length;
for (const id of ids) {
  await page.goto(URL + '#' + id);
  await page.evaluate(() => localStorage.removeItem('imach-assist'));
  await page.reload();
  await page.waitForTimeout(300);
}
check('e2e هر ' + faNum(ids.length) + ' صفحه بدون خطای کنسول', errors.length === before);
function faNum(n) { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'.charAt(+d)); }

console.log('\n═══ نتیجه: ' + pass + ' PASS · ' + fail + ' FAIL ═══');
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
await browser.close();
process.exit(fail ? 1 : 0);
