#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""make-rapid-demo.py — تولید rapid-demo.html از index.html

دموی سریع = همان اپ + سایدبار «فهرست همهٔ صفحه‌ها و شیت‌ها».
سایدبار به‌صورت زنده از DOM ساخته می‌شود (بدون لیست دستی) → همیشه با
index.html همگام است. برای بازتولید بعد از هر تغییرِ index.html:

    python3 tools/make-rapid-demo.py
"""

import pathlib, sys

BASE = pathlib.Path(__file__).resolve().parent.parent  # redesign-final/
SRC = BASE / 'index.html'
DST = BASE / 'rapid-demo.html'

NAV_PANEL = '''  <!-- v15: سایدبار دموی سریع — فهرست زندهٔ همهٔ صفحه‌ها و شیت‌ها -->
  <aside class="nav-panel">
    <div class="head">
      <img src="assets/logo3.svg" alt="iMatch">
      <div class="t">iMach — دموی سریع</div>
      <div class="s">مرورِ تک‌تکِ صفحه‌ها و شیت‌ها برای یافتنِ سریعِ ایرادها — هر آیتم همان مسیر واقعی محصول را باز می‌کند و آدرسش در hash مرورگر می‌نشیند.</div>
    </div>
    <div class="rd-count" id="rdCount"></div>
    <div class="rd-tools">
      <button onclick="restartDemo()" title="شروع دمو از آنبوردینگ"><svg><use href="#i-spark"/></svg> شروع دمو</button>
      <button id="rdPrev" onclick="rdTogglePreview()" title="تغییر پیش‌نمایش موبایل/دسکتاپ"><svg><use href="#i-globe"/></svg> <span id="rdPrevLbl">پیش‌نمایش موبایل</span></button>
      <a href="index.html" title="بازگشت به دموی محصول"><svg><use href="#i-back"/></svg> محصول</a>
    </div>
    <div class="nav-groups" id="navGroups"></div>
    <div class="foot" id="rdFoot"></div>
  </aside>
'''

RD_SCRIPT = '''<!-- v15: موتور دموی سریع — ناوبری زنده از خودِ DOM ساخته می‌شود -->
<script>
(function () {
  var TITLES = { 'sc-onboard': 'آنبوردینگ' };
  var DESC = {
    'sc-onboard': 'یک انتخاب برای شروع — خریدار یا فروشنده',
    'sc-signup': 'موبایل + OTP → کسب‌وکار و نقش',
    'sc-login': 'OTP پنج‌خانه + رمز عبور',
    'sc-buy-list': 'دفتر قیمت‌های زنده — سیگنال‌ها و دنبال‌شده‌ها',
    'sc-buy-item': 'قیمت‌های دنبال‌شده + تنظیم رصد',
    'sc-board': 'قیمتِ چند تأمین‌کننده برای یک کالا — زنده',
    'sc-suppliers': 'کاتالوگ‌هایی که ذخیره کردی — آمار و دسترسی سریع',
    'sc-offers': 'قیمت‌ها و شرایط رقابتی تأمین‌کنندگان برای درخواست‌های تو',
    'sc-buy-profile': 'قابلیت‌ها — فعال‌سازی بازای فروش',
    'sc-rfq': 'فرم کوتاه — یک بار بپرس، همه جواب بدهند',
    'sc-search': 'کالا و تأمین‌کننده + فیلتر',
    'sc-sell-catalog': 'ویترین + نوار اشتراک + آمار هر کالا',
    'sc-sell-product-owner': 'دنبال‌کنندگان قیمت + کارتِ کمپین ویژه',
    'sc-sell-product-public': 'سه اکشن روشن: دنبال‌کردن / لیست / درخواست',
    'sc-sell-requests': '«به من» + «فرصت‌های بازار»',
    'sc-quote': 'فرم واقعی + دفتر تخفیف‌ها + حالت موفق',
    'sc-discount': 'تب‌بار: تخفیف مشتری · حجمی · پیش‌نمایش — سه سطح اعمال',
    'sc-sell-profile': 'آمار + اشتراک‌گذاری + کیف پول',
    'sc-wallet': 'پول به‌ازای نتیجهٔ هدفمند',
    'sc-charge': 'بستهٔ تومانی + درگاه + رسید',
    'sc-campaign': 'چه کسانی دیدند، چه کسانی دنبال کردند — عددی',
    'sc-msgs': 'فهرست گفتگوها — صفحهٔ مستقل v15',
    'sc-chat': 'گفتگو با تأمین‌کننده/خریدار — صفحهٔ مستقل v15',
    'sc-add-item': 'یک الگو، دو context (خرید/فروش)',
    'sc-empty': 'Cold start — قدم بعدی را نشان می‌دهیم',
    'sc-desktop': 'همان زبان طراحی، چیدمان گسترده',
    'sc-settings': 'اعلان‌ها به‌ازای نوع، زبان، فروشگاه',
    'sc-edit-biz': 'فرم با دیتای پیش‌فرض',
    'sc-catalog-public': 'imatch.ir/k/karon · ذخیرهٔ کاتالوک',
    'sc-list-public': 'خریدار شیر می‌کند · تأمین‌کننده گوش‌به‌زنگ می‌شود'
  };
  var GROUPS = [
    ['شروع و حساب', ['sc-onboard', 'sc-signup', 'sc-login']],
    ['دستیار خرید — سمت تقاضا', ['sc-buy-list', 'sc-buy-item', 'sc-board', 'sc-suppliers', 'sc-offers', 'sc-buy-profile', 'sc-rfq', 'sc-search']],
    ['دستیار فروش — سمت درآمد', ['sc-sell-catalog', 'sc-sell-product-owner', 'sc-sell-product-public', 'sc-sell-requests', 'sc-quote', 'sc-discount', 'sc-sell-profile', 'sc-wallet', 'sc-charge', 'sc-campaign']],
    ['پیام‌ها', ['sc-msgs', 'sc-chat']],
    ['فرم‌ها و حالت‌ها', ['sc-add-item', 'sc-empty', 'sc-desktop', 'sc-settings', 'sc-edit-biz']],
    ['عمومی و شبکه', ['sc-catalog-public', 'sc-list-public']]
  ];
  var SHEET_PARENT = {
    'sheet-switch': 'sc-buy-list', 'sheet-notif': 'sc-buy-list', 'sheet-filter': 'sc-board',
    'sheet-follow': 'sc-board', 'sheet-share': 'sc-sell-catalog', 'sheet-share-product': 'sc-catalog-public',
    'sheet-contacts': 'sc-sell-catalog', 'sheet-savers': 'sc-sell-catalog', 'sheet-followers': 'sc-sell-product-owner',
    'sheet-promote': 'sc-sell-product-owner', 'sheet-rates': 'sc-sell-product-owner', 'sheet-quickprice': 'sc-sell-product-owner',
    'sheet-item-discount': 'sc-sell-product-owner', 'sheet-bulk': 'sc-discount', 'sheet-help-discount': 'sc-discount',
    'sheet-new-group': 'sc-discount', 'sheet-new-good': 'sc-discount', 'sheet-cust-type': 'sc-quote',
    'sheet-rfq-detail': 'sc-sell-requests', 'sheet-offer-status': 'sc-offers', 'sheet-call': 'sc-offers',
    'sheet-share-rfq': 'sc-offers', 'sheet-share-list': 'sc-buy-list', 'sheet-import': 'sc-add-item'
  };

  function fa(n) { return String(n).replace(/\\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function title(id) {
    var sc = document.getElementById(id);
    if (!sc) return id;
    var t = sc.querySelector('.pagehead .tt b') || sc.querySelector('.greet b') || sc.querySelector('.chat-head .cht b');
    return t ? t.textContent.trim() : (TITLES[id] || id);
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  var idx = 0, curTitle = '', curDesc = '';
  function item(btn) {
    return '<button class="nav-item" ' + btn + '><span class="n">' + fa(pad(idx)) + '</span><span>' + curTitle +
      '<span class="d">' + curDesc + '</span></span></button>';
  }

  var frag = [], seen = {};
  GROUPS.forEach(function (g) {
    var ids = g[1].filter(function (id) { return document.getElementById(id); });
    if (!ids.length) return;
    frag.push('<div class="nav-g">' + g[0] + '</div>');
    ids.forEach(function (id) {
      seen[id] = 1; idx++;
      curTitle = title(id); curDesc = DESC[id] || '';
      frag.push(item('data-nav="' + id + '"'));
    });
  });
  /* صفحه‌های تازه که در گروه‌بندی نیستند — هیچ‌وقت گم نمی‌شوند */
  var others = $$('.screen').map(function (s) { return s.id; }).filter(function (id) { return !seen[id]; });
  if (others.length) {
    frag.push('<div class="nav-g">صفحه‌های تازه (خارج از گروه‌بندی)</div>');
    others.forEach(function (id) {
      idx++; curTitle = title(id); curDesc = 'صفحهٔ جدید — توضیح هنوز ثبت نشده';
      frag.push(item('data-nav="' + id + '"'));
    });
  }
  /* شیت‌ها — باز شدن روی صفحهٔ والد */
  frag.push('<div class="nav-g">شیت‌ها — لایهٔ دوم</div>');
  $$('.sheet').forEach(function (sh) {
    idx++;
    var h = sh.querySelector('h3');
    curTitle = 'شیت: ' + (h ? h.textContent.trim() : sh.id);
    var parent = SHEET_PARENT[sh.id] || 'sc-buy-list';
    curDesc = 'روی صفحهٔ «' + title(parent) + '» باز می‌شود';
    frag.push(item('data-goto="' + parent + '" data-sheet="' + sh.id + '"'));
  });

  var ng = document.getElementById('navGroups');
  if (ng) ng.innerHTML = frag.join('');

  var nSc = $$('.screen').length, nSh = $$('.sheet').length;
  var rc = document.getElementById('rdCount');
  if (rc) rc.innerHTML = '<b>' + fa(nSc) + '</b> صفحه · <b>' + fa(nSh) + '</b> شیت — همیشه همگام با index.html';
  var rf = document.getElementById('rdFoot');
  if (rf) rf.innerHTML = 'دموی سریع v15 — از index.html تولید می‌شود: <code>python3 tools/make-rapid-demo.py</code><br>فلش چپ/راست کیبورد = صفحهٔ بعدی/قبلی · آدرس هر صفحه در hash مرورگر';

  /* همگام‌سازی اولیهٔ آیتم فعال (boot قبل از این اسکریپت اجرا شده) */
  $$('.nav-item').forEach(function (n) {
    var key = (typeof DESK_PARENT !== 'undefined' && DESK_PARENT[state.current]) || state.current;
    n.classList.toggle('active', n.dataset.nav === key);
  });

  /* کشوی فهرست در پنجره‌های باریک */
  var fab = document.createElement('button');
  fab.className = 'rd-fab';
  fab.innerHTML = '<svg><use href="#i-list"/></svg> فهرست صفحه‌ها';
  fab.onclick = function () { document.body.classList.toggle('rd-open'); };
  document.body.appendChild(fab);
  document.body.addEventListener('click', function (e) {
    if (document.body.classList.contains('rd-open') && (e.target === document.body || (e.target.closest && e.target.closest('.nav-item')))) {
      document.body.classList.remove('rd-open');
    }
  });

  /* پیش‌نمایش موبایل/دسکتاپ */
  window.rdTogglePreview = function () {
    var on = document.body.classList.toggle('rd-mob');
    var lbl = document.getElementById('rdPrevLbl');
    if (lbl) lbl.textContent = on ? 'پیش‌نمایش دسکتاپ' : 'پیش‌نمایش موبایل';
    var pv = document.getElementById('rdPrev');
    if (pv) pv.classList.toggle('on', on);
    try { if (typeof closeRfqDetail === 'function') closeRfqDetail(); } catch (err) {}
    try {
      var tb = document.querySelector('#dsTabs .tb.on');
      if (tb && [...document.querySelector('#dsTabs').children].indexOf(tb) === 2) tabPick(document.querySelector('#dsTabs .tb'));
    } catch (err) {}
  };

  /* فلش چپ/راست = بعدی/قبلی (جهت خواندن فارسی) */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    var list = $$('#navGroups .nav-item');
    if (!list.length) return;
    var i = list.findIndex(function (n) { return n.classList.contains('active'); });
    if (i < 0) i = 0;
    i = e.key === 'ArrowLeft' ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1);
    list[i].click();
    list[i].scrollIntoView({ block: 'nearest' });
    e.preventDefault();
  });
})();
</script>
'''

html = SRC.read_text(encoding='utf-8')

# ۱) body → rd
assert html.count('<body>') == 1
html = html.replace('<body>', '<body class="rd">', 1)

# ۲) عنوان
html = html.replace('<title>iMach — ریدیزاین فاینال · v15</title>',
                    '<title>iMach — دموی سریع · v15</title>', 1)

# ۳) تزریق سایدبار به ورک‌اسپیس
assert html.count('<div class="workspace">') == 1
html = html.replace('<div class="workspace">', '<div class="workspace">\n' + NAV_PANEL, 1)

# ۴) تزریق اسکریپت بعد از اسکریپت اپ
anchor = '</script>\n</body>'
assert html.count(anchor) == 1
html = html.replace(anchor, '</script>\n' + RD_SCRIPT + '</body>', 1)

DST.write_text(html, encoding='utf-8')
n_sc = html.count('id="sc-') - html.count('id="sc-')  # placeholder, real count below
n_sc = sum(1 for l in html.splitlines() if '<section class="screen"' in l)
n_sh = html.count('class="sheet"') + html.count("class=\"sheet ")
print(f'✓ rapid-demo.html ساخته شد — {len(html)} chars · {n_sc} صفحه · {n_sh} شیت')
