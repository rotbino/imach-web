#!/usr/bin/env node
/**
 * build.mjs — تبدیل redesign-base به پروتوتایپ تعاملی تک‌فایلی
 *
 * اصل طلایی: صفر تغییر بصری.
 *  - css/style.css دست‌نخورده (فقط <link> می‌شود)
 *  - مارک‌آپ هر صفحه عیناً از screens/*.html برداشته می‌شود
 *  - استایل‌های صفحه‌محور با اسکوپ #scr-XX ایمن می‌شوند
 *  - شیت‌های پایین صفحه از screens/90-sheets.html (body عیناً داخل #phone)
 *  - اسپرایت آیکون‌ها ادغام + رفع تضاد id
 *  - لایهٔ ناوبری کاملاً در JS (بدون دست‌زدن به مارک‌آپ)
 *
 * خروجی: redesign-base/index.html
 * اجرا:   node redesign-base/tools/build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCREENS = join(ROOT, 'screens');

const MOBILE = [
  ['01', '01-sell-catalog.html'],
  ['02', '02-product-public.html'],
  ['03', '03-product-owner.html'],
  ['04', '04-product-form.html'],
  ['05', '05-sell-requests.html'],
  ['06', '06-sell-request-detail.html'],
  ['07', '07-sell-profile.html'],
  ['08', '08-buy-list.html'],
  ['09', '09-supply-board.html'],
  ['10', '10-suppliers.html'],
  ['11', '11-suggestions.html'],
  ['12', '12-quote-request.html'],
  ['13', '13-catalog-public.html'],
  ['14', '14-buy-profile.html'],
  ['15', '15-landing.html'],
  ['16', '16-signup.html'],
  ['17', '17-login.html'],
  ['18', '18-msgs.html'],
  ['19', '19-chat.html'],
  ['20', '20-today.html'],
  ['21', '21-buyers.html'],
  ['22', '22-biz-edit.html'],
  ['23', '23-buy-list-public.html'],
  ['24', '24-viewers.html'],
  ['25', '25-savers.html'],
  ['26', '26-goods.html'],
  ['27', '27-notifications.html'],
  ['28', '28-offers.html'],
];
const DESKTOP = [
  ['d1', 'd1-desktop-catalog.html'],
  ['d2', 'd2-desktop-board.html'],
  ['d3', 'd3-desktop-landing.html'],
];
const SHEETS_FILE = '90-sheets.html';

/* ── ابزارها ─────────────────────────────────────────────── */

function extractBody(html) {
  const m = html.match(/<body>\s*([\s\S]*?)\s*<\/body>/);
  if (!m) throw new Error('body not found');
  return m[1];
}

function stripSprite(body) {
  return body.replace(/<svg style="display:none"[^>]*>[\s\S]*?<\/svg>\s*/, '');
}

function extractHeadStyle(html) {
  const m = html.match(/<link rel="stylesheet"[^>]*>\s*<style>([\s\S]*?)<\/style>/);
  return m ? m[1] : '';
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/);
  return m ? m[1] : '';
}

/** محتوای داخل .phone (بدون قاب stage/phone) */
function extractPhoneContent(body) {
  const m = body.match(/^<div class="stage">\s*<div class="phone"[^>]*>([\s\S]*)\n  <\/div>\n<\/div>$/);
  if (!m) throw new Error('phone wrapper not found');
  return m[1];
}

/** data-arm صفحهٔ موبایل */
function extractPhoneArm(body) {
  const m = body.match(/<div class="phone" data-arm="(\w+)"/);
  return m ? m[1] : 'sell';
}

/**
 * اسکوپ‌کردن CSS به یک شناسهٔ صفحه — بدون تغییر مقادیر.
 * @keyframes و @font-face سراسری می‌مانند (نام‌ها یکتا هستند).
 */
function scopeCss(css, scope) {
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    // کامنت
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += css.slice(i, stop);
      i = stop;
      continue;
    }
    const ch = css[i];
    if (/\s/.test(ch)) { out += ch; i++; continue; }
    // انتخابگر تا {
    const brace = css.indexOf('{', i);
    if (brace === -1) { out += css.slice(i); break; }
    const sel = css.slice(i, brace).trim();
    // بلوک متناظر (با عمق)
    let depth = 0, j = brace;
    for (; j < n; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') { depth--; if (depth === 0) break; }
    }
    const block = css.slice(brace, j + 1);
    if (sel.startsWith('@media')) {
      const inner = block.slice(block.indexOf('{') + 1, block.length - 1);
      out += sel + ' {' + scopeCss(inner, scope) + '}';
    } else if (sel.startsWith('@')) {
      // keyframes و امثال آن — سراسری و دست‌نخورده (نام‌ها یکتایند)
      out += sel + ' ' + block;
    } else {
      const scoped = sel.split(',').map(s => `${scope} ${s.trim()}`).join(',\n');
      out += scoped + ' ' + block;
    }
    i = j + 1;
  }
  return out;
}

/* ── ۱) جمع‌آوری نمادها + رفع تضاد ─────────────────────────── */

const symbolFirst = new Map();   // id -> content (id بازنویسی‌شده)
const symbolVariants = new Map(); // id -> Set(content)
const variantIdByContent = new Map(); // content خام -> newId (جلوگیری از واریانت تکراری)
const perFileRemap = new Map();  // file -> {oldId: newId}

const ALL_FILES = [...MOBILE, ...DESKTOP, ['90', SHEETS_FILE]];
for (const [id, file] of ALL_FILES) {
  const html = readFileSync(join(SCREENS, file), 'utf8');
  const body = extractBody(html);
  const remap = {};
  const re = /<symbol id="([^"]+)"[^>]*>[\s\S]*?<\/symbol>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const symId = m[0].match(/id="([^"]+)"/)[1];
    const content = m[0];
    if (!symbolFirst.has(symId)) {
      symbolFirst.set(symId, content);
    } else if (symbolFirst.get(symId) !== content) {
      // تضاد — واریانت (اگر همین محتوا قبلاً واریانت شده، همان را بازاستفاده کن)
      let newId = variantIdByContent.get(content);
      if (!newId) {
        const variants = symbolVariants.get(symId) || new Set();
        variants.add(content);
        symbolVariants.set(symId, variants);
        newId = `${symId}-v${variants.size + 1}`;
        variantIdByContent.set(content, newId);
        symbolFirst.set(newId, content.replace(`id="${symId}"`, `id="${newId}"`));
      }
      remap[symId] = newId;
    }
  }
  if (Object.keys(remap).length) perFileRemap.set(file, remap);
}

const conflicts = [...symbolVariants.entries()].map(([id, v]) => `${id} (${v.size + 1} واریانت)`);
console.log('تضادهای آیکون رفع‌شده:', conflicts.length ? conflicts.join(' · ') : '—');

/* ── ۲) مونتاژ صفحه‌ها ─────────────────────────────────────── */

const sections = [];
const scopedStyles = [];
const titles = {};

for (const [id, file] of MOBILE) {
  const html = readFileSync(join(SCREENS, file), 'utf8');
  let body = extractBody(html);
  const arm = extractPhoneArm(body);
  let content = extractPhoneContent(stripSprite(body));

  // مسیر asset ها: ../x → x
  content = content.replaceAll('src="../', 'src="');

  // ریمپ آیکون‌های متناقض (فقط همین صفحه)
  const remap = perFileRemap.get(file);
  if (remap) for (const [oldId, newId] of Object.entries(remap)) {
    content = content.replaceAll(`href="#${oldId}"`, `href="#${newId}"`);
  }

  const style = extractHeadStyle(html);
  if (style) scopedStyles.push(`/* ── استایل صفحهٔ ${id} (${file}) ── */\n` + scopeCss(style, `#scr-${id}`));

  titles[id] = extractTitle(html);
  sections.push(`    <section class="scr" id="scr-${id}" data-arm="${arm}" hidden>\n${content}\n    </section>`);
}

const deskWrappers = [];
for (const [id, file] of DESKTOP) {
  const html = readFileSync(join(SCREENS, file), 'utf8');
  let body = stripSprite(extractBody(html));
  body = body.replaceAll('src="../', 'src="');
  const remap = perFileRemap.get(file);
  if (remap) for (const [oldId, newId] of Object.entries(remap)) {
    body = body.replaceAll(`href="#${oldId}"`, `href="#${newId}"`);
  }
  const style = extractHeadStyle(html);
  if (style) scopedStyles.push(`/* ── استایل صفحهٔ ${id} (${file}) ── */\n` + scopeCss(style, `#scr-${id}`));
  titles[id] = extractTitle(html);
  deskWrappers.push(`<div id="scr-${id}" hidden>\n${body}\n</div>`);
}

/* شیت‌های پایین صفحه — از 90-sheets.html */
const sheetsHtml = readFileSync(join(SCREENS, SHEETS_FILE), 'utf8');
let sheetsBody = extractBody(sheetsHtml);
const sheetsStyle = extractHeadStyle(sheetsHtml); // سراسری (بدون اسکوپ) — مثل فایل مستقل
sheetsBody = stripSprite(sheetsBody).replaceAll('src="../', 'src="');
{
  const remap = perFileRemap.get(SHEETS_FILE);
  if (remap) for (const [oldId, newId] of Object.entries(remap)) {
    sheetsBody = sheetsBody.replaceAll(`href="#${oldId}"`, `href="#${newId}"`);
  }
}

const sprite = [...symbolFirst.values()].join('\n');

/* ── ۳) موتور ناوبری (تنها لایهٔ جدید — کاملاً رفتاری) ──────── */

const runtime = String.raw`
(function () {
  'use strict';
  /* موتور پروتوتایپ — فقط رفتار؛ هیچ عنصری از دیزاین تغییر نمی‌کند */
  var ARM_HOME = { sell: '01', buy: '08' };
  var TABS = { sell: ['20', '01', '05', '18', '07'], buy: ['08', '10', '11', '18', '14'] };
  /* ست کامل تب‌ها برای صفحهٔ مشترک ۱۸ (پیام‌ها) — بر اساس بازوی فعال رندر می‌شود */
  var TABSET = {
    sell: [
      ['20', 'کارها', '<svg><use href="#i-tasks"/></svg>', '<span class="badge">۶</span>'],
      ['01', 'کاتالوگ من', '<svg><use href="#i-store"/></svg>', ''],
      ['05', 'درخواست‌ها', '<svg><use href="#i-inbox"/></svg>', '<span class="badge">۳</span>'],
      ['18', 'پیام‌ها', '<svg><use href="#i-msg"/></svg>', '<span class="badge">۱</span>'],
      ['07', 'پروفایل', '<svg><use href="#i-user"/></svg>', '']
    ],
    buy: [
      ['08', 'دفتر خرید', '<svg><use href="#i-list"/></svg>', ''],
      ['10', 'کاتالوگ‌ها', '<svg><use href="#i-building"/></svg>', ''],
      ['11', 'پیشنهادها', '<svg><use href="#i-sparkles"/></svg>', ''],
      ['18', 'پیام‌ها', '<svg><use href="#i-msg"/></svg>', '<span class="badge">۱</span>'],
      ['14', 'پروفایل', '<svg><use href="#i-user"/></svg>', '']
    ]
  };
  var DEFAULT_BACK = {
    '02': '13', '03': '01', '04': '03', '06': '05', '09': '08',
    '12': '09', '13': '09', '16': '15', '17': '15', '19': '18',
    '20': '01', '21': '03', '22': '01', '23': '08', '24': '01', '25': '01', '26': '01',
    '27': '01', '28': '05'
  };
  var BTN = {
    '01': [['افزودن کالا', '04']],
    '02': [['درخواست قیمت', '12'], ['مشاهده تابلوی تأمین', '09']],
    '03': [['ویرایش کامل کالا', '04'], ['مشاهده و پاسخ', '06']],
    '04': [['ذخیره در کاتالوگ', '01']],
    '06': [['ارسال پیشنهاد', '28'], ['بایگانی', '05']],
    '07': [['نمای عمومی', '13'], ['خروج از حساب', '15']],
    '08': [['دنبال کردن', '13'], ['افزودن کالا', '13']],
    '09': [['درخواست قیمت', '12'], ['کاتالوگ', '13'], ['درخواست قیمت از تأمین‌کننده‌های انتخابی', '12']],
    '10': [['کاتالوگ', '13']],
    '11': [['افزودن به تابلو', '09'], ['مشاهده کاتالوگ', '13'], ['افزودن به لیست', '08'], ['مشاهده', '02']],
    '12': [['ارسال به ۲ فروشنده + شبکه iMach', '08']],
    '14': [['خروج از حساب', '15']],
    '15': [['ساخت حساب', '16'], ['ورود', '17']],
    '16': [['ساخت حساب و ورود', '01'], ['وارد شوید', '17']],
    '17': [['ورود به ای‌مچ', '01'], ['ساخت حساب', '16']],
    '22': [['ذخیره تغییرات', '01']],
    '23': [['ارسال پیشنهاد قیمت', '12']],
    '24': [['اشتراک‌گذاری کاتالوگ', 'sheet-share-share']],
    '25': [['اشتراک‌گذاری کاتالوگ', 'sheet-share-share']],
    '28': [['مشاهده و پاسخ', '06']],
    'd3': [['ساخت حساب', '16'], ['ورود', '17']]
  };
  var CARDS = { '01': '03', '05': '06', '08': '09', '13': '02', '18': '19', '21': '06', '24': '06', '25': '06', '26': '03' };
  var TITLES = __TITLES__;

  var stack = [];
  var current = null;

  function el(id) { return document.getElementById('scr-' + id); }
  function isDesk(id) { return id.charAt(0) === 'd'; }
  function phoneArm() { return document.getElementById('phone').dataset.arm || 'sell'; }

  /* ── شیت‌های پایین صفحه (الگوی فاز ۱۷ — تعمیم‌یافته فاز ۱۸) ── */
  function closeSheet() {
    document.getElementById('backdrop').classList.remove('show');
    document.querySelectorAll('.sheet.show, .dlg.show').forEach(function (s) { s.classList.remove('show'); });
  }
  function openSheet(id) {
    closeSheet();
    var sh = document.getElementById(id);
    if (!sh) return;
    document.getElementById('backdrop').classList.add('show');
    sh.classList.add('show');
  }

  /* کروم مشترک صفحهٔ ۱۸ (پیام‌ها): تب‌بار و پیل و چشمِ پیش‌نمایش بر اساس بازوی فعال */
  function renderKeepChrome(target) {
    if (!target || target.dataset.arm !== 'keep') return;
    var arm = phoneArm();
    var set = TABSET[arm] || TABSET.buy;
    var bar = target.querySelector('.tabbar');
    if (bar) {
      bar.dataset.cols = String(set.length);
      var tabs = bar.querySelector('.tabs');
      if (tabs) {
        tabs.innerHTML = set.map(function (t) {
          return '<button class="tab' + (t[0] === '18' ? ' active' : '') + '" data-go="' + t[0] + '">' + t[2] + t[1] + t[3] + '</button>';
        }).join('');
      }
    }
    var pill = target.querySelector('.arm-pill');
    if (pill) {
      var ic = arm === 'sell' ? '#i-store' : '#i-basket';
      var lb = arm === 'sell' ? 'دستیار فروش' : 'دستیار خرید';
      pill.innerHTML = '<svg><use href="' + ic + '"/></svg> ' + lb +
        ' <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>';
    }
    var eye = target.querySelector('.eye-preview');
    if (eye) eye.dataset.go = arm === 'sell' ? '13' : '23';
  }

  function show(id) {
    var target = el(id);
    if (!target) { id = '15'; target = el(id); }
    document.querySelectorAll('.scr').forEach(function (s) { s.hidden = true; });
    document.querySelectorAll('body > div[id^="scr-d"]').forEach(function (s) { s.hidden = true; });
    target.hidden = false;
    document.getElementById('stage').hidden = isDesk(id);
    closeSheet();
    if (!isDesk(id)) {
      var arm = target.dataset.arm;
      if (arm && arm !== 'keep') document.getElementById('phone').dataset.arm = arm;
      renderKeepChrome(target);
      var sb = target.querySelector('.screen-body');
      if (sb) sb.scrollTop = 0;
    } else {
      var main = target.querySelector('.desk-main, .dl-main');
      if (main) main.scrollTop = 0;
    }
    current = id;
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    if (TITLES[id]) document.title = TITLES[id] + ' · پروتوتایپ iMach';
  }

  function go(id, push) {
    if (!el(id)) return;
    if (push !== false && current && current !== id) stack.push(current);
    show(id);
  }

  function back() {
    var prev = stack.pop() || DEFAULT_BACK[current] || '15';
    show(prev);
  }

  /* ── سیم‌کشی ناوبری (فقط data-*، بدون دست‌زدن به کلاس‌های دیزاین) ── */
  function wire() {
    document.querySelectorAll('.scr').forEach(function (sec) {
      var id = sec.id.slice(4);
      var arm = sec.dataset.arm;

      var tabs = sec.querySelectorAll('.tabbar .tabs .tab');
      (TABS[arm] || []).forEach(function (t, i) { if (tabs[i]) tabs[i].dataset.go = t; });

      sec.querySelectorAll('.subheader .back').forEach(function (b) { b.dataset.back = '1'; });

      (BTN[id] || []).forEach(function (pair) {
        sec.querySelectorAll('button, span, b, [style*="cursor:pointer"]').forEach(function (elm) {
          if (elm.textContent.trim() === pair[0]) elm.dataset.go = pair[1];
        });
      });

      if (CARDS[id]) {
        sec.querySelectorAll('.pcard').forEach(function (c) { c.dataset.go = CARDS[id]; });
        sec.querySelectorAll('.row-card').forEach(function (c) {
          if (c.getAttribute('style') && c.getAttribute('style').includes('dashed') && id === '08') return; // ردیف «قند» تابلویی ندارد
          c.dataset.go = CARDS[id];
        });
      }
    });

    ['d1', 'd2'].forEach(function (id) {
      var sec = el(id);
      if (!sec) return;
      sec.querySelectorAll('.desk-arm-switch button').forEach(function (b, i) {
        b.dataset.go = i === 0 ? 'd1' : 'd2';
      });
    });

    /* دسکتاپ‌ها هم دکمه‌های هدف‌دار خودشان را می‌گیرند (مثل d3: ساخت حساب/ورود) */
    ['d1', 'd2', 'd3'].forEach(function (id) {
      var sec = el(id);
      if (!sec) return;
      (BTN[id] || []).forEach(function (pair) {
        sec.querySelectorAll('button, span, b, [style*="cursor:pointer"]').forEach(function (elm) {
          if (elm.textContent.trim() === pair[0]) elm.dataset.go = pair[1];
        });
      });
    });
  }

  /* ── تعامل‌های ریز — فقط کلاس‌های موجود خود دیزاین ── */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;

    /* زبان‌ها (لندینگ) — فقط نمایشی؛ «سایر» دراپ‌داun باز/بسته می‌شود */
    var langMore = t.closest('.lang-more');
    if (langMore) {
      var dd = langMore.parentElement.querySelector('.lang-dd');
      if (dd) dd.classList.toggle('open');
      return;
    }
    var langWrap = t.closest('.land-lang');
    if (langWrap) {
      var d2 = langWrap.querySelector('.lang-dd');
      if (d2) d2.classList.remove('open');
    }

    /* شیت سوییچ دستیار */
    var ap = t.closest('.arm-pill');
    if (ap) {
      var sw = document.getElementById('sheet-switch');
      if (sw) {
        var arm = phoneArm();
        sw.querySelectorAll('.check').forEach(function (c) {
          c.style.display = (c.dataset.check === arm) ? 'block' : 'none';
        });
      }
      openSheet('sheet-switch'); return;
    }
    if (t.closest('#backdrop')) { closeSheet(); return; }

    /* ── فاز ۲۰: انتخاب گروه تخفیف (دراپ‌داون حجمی) ── */
    var vgs = t.closest('[data-vgsel]');
    if (vgs) {
      var vlbl = document.getElementById('vol-group-name');
      if (vlbl) vlbl.textContent = vgs.dataset.vgsel;
      closeSheet(); return;
    }

    /* ── فاز ۲۰: گرید انتخاب کالا (گروه تخفیف / انتخاب چندتایی) ── */
    var gc = t.closest('.gcell');
    if (gc) { gc.classList.toggle('on'); return; }

    /* ── فاز ۲۰: سطح مشتری (رادیویی) ── */
    var lr = t.closest('.lvl-row');
    if (lr) {
      lr.parentElement.querySelectorAll('.lvl-row').forEach(function (r) { r.classList.remove('active'); });
      lr.classList.add('active'); return;
    }

    /* ── فاز ۲۰: اطلاعات بازشو (آیکون ℹ) ── */
    var infoEl = t.closest('[data-info]');
    if (infoEl) {
      var host = infoEl.closest('.field') || infoEl.closest('.dlg') || infoEl.parentElement;
      var blk = host && host.querySelector('.info-block');
      if (blk) blk.hidden = !blk.hidden;
      return;
    }

    /* ── فاز ۲۰: تأیید دنبال کردن قیمت ── */
    var fol = t.closest('[data-followed]');
    if (fol) {
      fol.classList.add('followed');
      fol.innerHTML = 'به لیست خرید اضافه شد ✓';
      setTimeout(closeSheet, 900);
      return;
    }

    /* ── فاز ۲۰: آپلود مدرک (نمایشی) ── */
    var up = t.closest('.up-box');
    if (up) {
      up.classList.toggle('done');
      var upb = up.querySelector('.tx b');
      var ups = up.querySelector('.tx span');
      var upp = up.querySelector('.pick');
      if (up.classList.contains('done')) {
        if (ups && !ups.dataset.orig) { ups.dataset.orig = ups.textContent; ups.textContent = 'بارگذاری شد —' + ' فایل انتخاب شد'; }
        if (upp) upp.textContent = 'تغییر';
      } else {
        if (ups && ups.dataset.orig) ups.textContent = ups.dataset.orig;
        if (upp) upp.textContent = 'انتخاب فایل';
      }
      return;
    }

    var srow = t.closest('.sheet-row[data-arm-go]');
    if (srow) {
      var want = srow.dataset.armGo;
      closeSheet();
      if (want !== phoneArm()) go(ARM_HOME[want]);
      return;
    }
    if (t.closest('#sheet-close')) { closeSheet(); return; }

    /* شیت‌ها — بستن / بازکردن / کپی لینک / ارسال به مخاطب */
    var closeEl = t.closest('[data-close]');
    if (closeEl) { closeSheet(); return; }

    var sheetOpen = t.closest('[data-sheet]');
    if (sheetOpen) { openSheet(sheetOpen.dataset.sheet); return; }

    var copyEl = t.closest('[data-copy]');
    if (copyEl) {
      var crow = copyEl.closest('.sheet-row');
      if (crow) crow.classList.add('done');
      var clb = copyEl.querySelector('[data-copy-label]');
      if (clb) clb.textContent = 'لینک کپی شد';
      setTimeout(closeSheet, 900);
      return;
    }

    var sendEl = t.closest('[data-send]');
    if (sendEl) {
      sendEl.textContent = 'ارسال شد';
      sendEl.classList.add('done-send');
      return;
    }

    var goEl = t.closest('[data-go]');
    if (goEl) { go(goEl.dataset.go); return; }

    var backEl = t.closest('[data-back]');
    if (backEl) { back(); return; }

    var chip = t.closest('.chip');
    if (chip && chip.parentElement && chip.parentElement.classList.contains('chips')) {
      chip.parentElement.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active'); return;
    }

    var pill = t.closest('.pill');
    if (pill) {
      pill.parentElement.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('active'); });
      pill.classList.add('active');
      /* فاز ۲۰ — دامنهٔ تخفیف حجمی: فقط با «کالاهای خاص» گروه نشان داده می‌شود */
      if (pill.parentElement.id === 'vol-scope') {
        var blk2 = document.getElementById('vol-group-block');
        if (blk2) blk2.style.display = pill.textContent.indexOf('خاص') >= 0 ? 'block' : 'none';
      }
      return;
    }

    var itab = t.closest('.inner-tabs button');
    if (itab) {
      itab.parentElement.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      itab.classList.add('active'); return;
    }

    var cr = t.closest('.checkrow');
    if (cr) { var cb = cr.querySelector('.checkbox'); if (cb) cb.classList.toggle('on'); return; }

    var tg = t.closest('.toggle');
    if (tg) { tg.classList.toggle('on'); return; }

    var qq = t.closest('.qq');
    if (qq) {
      var fi = qq.parentElement;
      if (fi && (fi.classList.contains('faq-item') || fi.classList.contains('dl-faq'))) {
        fi.classList.toggle('open'); return;
      }
    }
  });

  window.addEventListener('hashchange', function () {
    var h = location.hash.slice(1);
    if (h && h !== current && el(h)) { if (current) stack.push(current); show(h); }
  });

  wire();
  var init = (location.hash || '').slice(1);
  go(el(init) ? init : '15', false);
})();
`.replace('__TITLES__', JSON.stringify(titles));

/* ── ۴) خروجی ─────────────────────────────────────────────── */

const html = `<!doctype html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iMach — پروتوتایپ طرح بیس</title>
<link rel="stylesheet" href="css/style.css">
<style>
/* ═══ پروتوتایپ — چسب ساختاری فقط ═══
   این قواعد هیچ ویژگی بصری‌ای اضافه نمی‌کنند؛ فقط قاب مشترک گوشی را
   برای بخش‌های تعویض‌شونده حفظ می‌کنند (همان رفتاری که در فایل‌های
   جداگانۀ screens/*. وجود داشت). */
.scr { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.scr[hidden] { display: none; }
body > div[id^="scr-d"][hidden] { display: none; }

__SHEETS_STYLE__

__SCOPED__
</style>
</head>
<body>

<!-- ═══ اسپرایت واحد (ادغام همهٔ آیکون‌های همهٔ صفحه‌ها — عیناً همان symbolها) ═══ -->
<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
__SPRITE__
</svg>

<!-- ═══ قاب موبایل مشترک — همان .stage/.phone طرح بیس ═══ -->
<div class="stage" id="stage">
  <div class="phone" id="phone" data-arm="sell">

__SECTIONS__

<!-- ═══ شیت‌های پایین صفحه — فایل screens/90-sheets.html (فاز ۱۷ + ۱۸ + ۱۹) ═══ -->
__SHEETS__

  </div>
</div>

<!-- ═══ قاب‌های دسکتاپ (عین فایل‌های d1/d2/d3) ═══ -->
__DESKTOPS__

<script>
__RUNTIME__
</script>
</body>
</html>
`;

const out = html
  .replace('__SHEETS_STYLE__', sheetsStyle.trim())
  .replace('__SCOPED__', scopedStyles.join('\n\n'))
  .replace('__SPRITE__', sprite)
  .replace('__SECTIONS__', sections.join('\n\n'))
  .replace('__SHEETS__', sheetsBody.trim())
  .replace('__DESKTOPS__', deskWrappers.join('\n\n'))
  .replace('__RUNTIME__', runtime);

writeFileSync(join(ROOT, 'index.html'), out);
console.log('✅ نوشته شد:', join(ROOT, 'index.html'), `(${(out.length / 1024).toFixed(0)} KB)`);
console.log('   بخش‌ها:', MOBILE.length, 'موبایل +', DESKTOP.length, 'دسکتاپ · نمادها:', symbolFirst.size);
