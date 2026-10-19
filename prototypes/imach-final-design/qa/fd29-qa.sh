#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# FD-29 QA — پوستهٔ اپ دسکتاپ + اسکرول مرورگر + ترمیم‌های مالک
# FD-30 فاز ۳ deltas (بخش ۱۰/۱۰ب): الگوی «کاغذ واحد + ردیف مسطح»
#   جایگزین شد با کارت‌های مجزا با فاصلهٔ ۱۲ (حکم مالک: ردیف‌های
#   چسبیده زشت) + گرید موجودیت ۰۸/۲۲ + گرید ۳ستونهٔ ۲۶ + قهرمان
#   افقی ۱۵ + ۴ کاشی/گرید ۳۸.
# FD-30 deltas (بخش ۷): میزها از «تسک تک‌ستونه + شماره ترتیب» به
#   کارتابل سه‌ستونه (Kanban-light) رفتند — سرفصل خوشامد + سه ستون
#   موضوعی + کارت پیشنهاد؛ .dk-ord حذف (گروه ستون جانشین ترتیب خطی).
# FD-36 deltas (بخش ۷ج): ۱۳ افزودن محصول — ویزارد سه‌قرصی حذف شد
#   (حکم مالک: مثل دکمهٔ کلیک‌شدنی بود و گیج می‌کرد؛ طرح مثل موبایل)
#   + ستون‌ها زیرِ هم مثل موبایل + قاب ۸۶۰→۶۸۸ + دکمهٔ افزودن در
#   جریانِ body با فاصلهٔ امن از تهِ صفحه (بخش ۱۲: چک موبایل جدید).
# changed-architecture deltas نسبت به fd28-qa:
#   · سایدبار ۲۵۰→۲۵۶ · چت: بومِ کل‌عرض با ستونِ ۹۰۰ (نه بدنهٔ ۹۰۰)
#   · پروفایل: dkp-side/dkp-main (نه dkd-side)
# ═══════════════════════════════════════════════════════════════
cd "$(dirname "$0")/.."

PORT=8180
agent-browser set viewport 1440 900 >/dev/null 2>&1
agent-browser open "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 1.2
agent-browser eval "Promise.all(['app-core.js','app-handlers.js','app-forms.js','app-suppliers.js','app-customers.js','app-salesrep.js','data.js','app-desktop.js','style.css','screens/04-home-sell.html','screens/05-catalog.html'].map(function(u){return fetch(u,{cache:'reload'})})).then(function(){location.reload();'r'})" >/dev/null 2>&1
sleep 2.2
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1

q() { agent-browser eval "$1" 2>&1 | tr -d '"' ; }
pass=0; fail=0
chk() {
  if [[ "$2" == *"$3"* ]]; then echo "✓ $1"; pass=$((pass+1));
  else echo "✗ $1 → got: $2"; fail=$((fail+1)); fi
}

echo "─── ۱) همهٔ ۴۱ صفحه: فریم دسکتاپ + بدون سرریز ───"
SCREENS="s-landing s-signup s-login s-home-sell s-catalog s-catalog-share s-contacts s-customers s-customer-view s-sell-orders s-sell-order-view s-sell-rfqs s-sell-offer s-sell-add s-sell-edit s-network-score s-edit-business s-notifs s-profile s-home-buy s-buy-list s-buy-list-add s-buy-product-suppliers s-buy-suppliers s-supplier-view s-buy-rfqs s-buy-rfq-new s-buy-offers s-buy-offer-view s-buy-orders s-buy-order-view s-msgs s-chat s-catalog-guest s-product-view s-buy-list-guest s-sell-bulk s-sell-promo s-charge s-cat-edit s-salesrep"
BADDK=""; BADOVF=""; BADSCROLL=""
for s in $SCREENS; do
  q "iMach.show('$s', false); 'ok'" >/dev/null; sleep 0.4
  DK=$(q "document.getElementById('phone').getAttribute('data-dk')")
  [[ "$DK" != "1" ]] && BADDK="$BADDK $s"
  O=$(q "document.documentElement.scrollWidth - document.documentElement.clientWidth")
  [[ "$O" -gt 2 ]] && BADOVF="$BADOVF $s($O)"
  if [[ "$s" != "s-chat" ]]; then
    BV=$(q "(function(){var b=document.querySelector('.screen:not([hidden]) .body');return b?getComputedStyle(b).overflowY:'none'})()")
    [[ "$BV" == "auto" || "$BV" == "scroll" ]] && BADSCROLL="$BADSCROLL $s"
  fi
done
chk "۴۱ صفحه: همه data-dk" "${BADDK:-ok}" "ok"
chk "۴۱ صفحه: بدون سرریز افقی" "${BADOVF:-ok}" "ok"
chk "اسکرول مرورگر (نه کانتینر) — جز چت" "${BADSCROLL:-ok}" "ok"
SH=$(q "(function(){var h=document.getElementById('screen-host');return getComputedStyle(h).overflow})()")
chk "screen-host باز (پیش‌نیاز sticky)" "$SH" "visible"

echo "─── ۲) سرصفحهٔ چسبان ───"
q "iMach.show('s-customers', false); 'ok'" >/dev/null; sleep 0.8
q "window.scrollTo(0,900); 'y'" >/dev/null; sleep 0.5
chk "ساب‌هدر بعد از اسکرول چسبانِ بالای پنجره" "$(q "(function(){var r=document.querySelector('#s-customers .subheader').getBoundingClientRect();return Math.round(r.y)})()")" "0"
q "window.scrollTo(0,0); 'y'" >/dev/null

echo "─── ۳) پوستهٔ اپ: ۵ صفحهٔ اصلی ───"
for s in s-home-buy s-home-sell s-msgs s-chat s-profile; do
  q "iMach.show('$s', false); 'ok'" >/dev/null; sleep 0.5
  R=$(q "(function(){
    var sc=document.getElementById('$s');
    var side=sc.querySelector('.dk-side'), main=sc.querySelector('.dk-desk-main');
    if(!side||!main) return 'missing';
    var act=side.querySelector('.tab.active');
    return 'side|'+(act?act.getAttribute('data-tab-home'):'none')+'|chip='+(side.querySelector('.dk-user')?'y':'n');
  })()")
  chk "$s: سایدبار + ستون اصلی" "$R" "side|"
done
chk "فعال: میز خرید" "$(q "iMach.show('s-home-buy', false);'ok'" >/dev/null; sleep 0.5; q "(function(){var a=document.querySelector('#s-home-buy .dk-side .tab.active');return a?a.getAttribute('data-tab-home'):'?'})()")" "s-home-buy"
chk "فعال: چت زیر پیام‌ها" "$(q "iMach.show('s-chat', false);'ok'" >/dev/null; sleep 0.5; q "(function(){var a=document.querySelector('#s-chat .dk-side .tab.active');return a?a.getAttribute('data-tab-home'):'?'})()")" "s-msgs"
chk "فعال: پروفایل" "$(q "iMach.show('s-profile', false);'ok'" >/dev/null; sleep 0.5; q "(function(){var a=document.querySelector('#s-profile .dk-side .tab.active');return a?a.getAttribute('data-tab-home'):'?'})()")" "s-profile"

echo "─── ۴) سایدبار چسبان در اسکرول ───"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.8
q "window.scrollTo(0,700); 'y'" >/dev/null; sleep 0.5
chk "سایدبار میز در اسکرول بالای پنجره" "$(q "(function(){return Math.round(document.querySelector('#s-home-buy .dk-side').getBoundingClientRect().y)})()")" "0"
chk "اپ‌بار میز در اسکرول بالای پنجره" "$(q "(function(){return Math.round(document.querySelector('#s-home-buy .dk-desk-main .appbar').getBoundingClientRect().y)})()")" "0"
q "window.scrollTo(0,0); 'y'" >/dev/null

echo "─── ۵) لندینگ: عرض واقعی زیر بنر (حکم مالک FD-29) ───"
q "iMach.show('s-landing', false); 'ok'" >/dev/null; sleep 0.9
chk "کانتینر بدنه ۱۲۸۰ (۸۹٪)" "$(q "(function(){return Math.round(document.querySelector('.dk-pad').getBoundingClientRect().width)})()")" "1280"
chk "پدینگ ثابت ۵۶ (رفت باگ ۱۹۶)" "$(q "(function(){return getComputedStyle(document.querySelector('.dk-pad')).paddingRight})()")" "56px"
chk "کارت فروشنده ≥۵۶۰" "$(q "(function(){var w=Math.round(document.querySelector('.dk-sec-sell').getBoundingClientRect().width);return w>=560?w:'thin:'+w})()")" "5"
chk "کارت خریدار ≥۵۶۰" "$(q "(function(){var w=Math.round(document.querySelector('.dk-sec-buy').getBoundingClientRect().width);return w>=560?w:'thin:'+w})()")" "5"
chk "نوار نماینده ≥۱۱۰۰" "$(q "(function(){var w=Math.round(document.querySelector('.dk-sec-rep').getBoundingClientRect().width);return w>=1100?w:'thin:'+w})()")" "11"
chk "CTA پایانی ≥۹۴۰" "$(q "(function(){var w=Math.round(document.querySelector('.dk-final').getBoundingClientRect().width);return w>=940?w:'thin:'+w})()")" "9"

echo "─── ۶) ورود/ثبت‌نام: اسپلیت دو نیمهٔ کنار‌هم ───"
q "iMach.show('s-login', false); 'ok'" >/dev/null; sleep 0.8
R=$(q "(function(){
  var f=document.querySelector('#s-login .dk-auth-form').getBoundingClientRect();
  var b=document.querySelector('#s-login .dk-brand').getBoundingClientRect();
  return 'side:'+(b.x<f.x&&Math.abs(b.y-f.y)<5)+'|bw='+Math.round(b.width)+'|fw='+Math.round(f.width);
})()")
chk "برند چپ + فرم راست، هم‌تراز عمودی" "$R" "side:true"
chk "ساب‌هدر موبایل حذف در دسکتاپ" "$(q "(function(){var s=document.querySelector('#s-login .subheader');return s?getComputedStyle(s).display:'gone'})()")" "none"
chk "لینک بازگشت در پانل برند" "$(q "(function(){return document.querySelector('#s-login .dkb-back')?'y':'n'})()")" "y"
q "document.querySelector('#s-login .dkb-back').click(); 'c'" >/dev/null; sleep 1.2
chk "بازگشت → لندینگ" "$(q "(function(){return document.querySelector('.screen:not([hidden])').id})()")" "s-landing"
q "iMach.show('s-signup', false); 'ok'" >/dev/null; sleep 0.8
chk "ثبت‌نام: اسپلیت برقرار" "$(q "(function(){var f=document.querySelector('#s-signup .dk-auth-form').getBoundingClientRect();var b=document.querySelector('#s-signup .dk-brand').getBoundingClientRect();return (b.x<f.x&&Math.abs(b.y-f.y)<5)?'split-ok':'broken'})()")" "split-ok"

echo "─── ۷) میزها FD-30: کارتابل سه‌ستونه + خوشامد + کارت پیشنهاد ───"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.8
chk "کارتابل: گرید سه‌ستونه" "$(q "(function(){var r=document.querySelector('#s-home-buy .body > .rows');return getComputedStyle(r).display+'|'+getComputedStyle(r).gridTemplateColumns.split(' ').length})()")" "grid|3"
chk "سربرگ سه ستون (شروع/در انتظار/عملیات)" "$(q "(function(){return document.querySelectorAll('#s-home-buy .dsk-col-h').length})()")" "3"
chk "ستون‌ها کاغذند (border+bg)" "$(q "(function(){var c=document.querySelector('#s-home-buy .dsk-col');var cs=getComputedStyle(c);return (cs.borderTopWidth!=='0px'&&cs.backgroundColor!=='rgba(0, 0, 0, 0)')?'card-ok':'flat'})()")" "card-ok"
chk "ردیف‌ها داخل ستون‌ها (نه فهرست خام)" "$(q "(function(){return document.querySelectorAll('#s-home-buy .dsk-col .row').length>=4?'in-cols':'flat'})()")" "in-cols"
chk "سرفصل خوشامد (تزریق دسکتاپی)" "$(q "(function(){return document.querySelector('#s-home-buy .dk-greet')?'y':'n'})()")" "y"
chk "کارت پیشنهاد (hint در کاغذ)" "$(q "(function(){var h=document.querySelector('#s-home-buy .hint-line.dsk-hint');var cs=getComputedStyle(h);return (cs.borderTopWidth!=='0px'&&cs.backgroundColor!=='rgba(0, 0, 0, 0)')?'card-ok':'flat'})()")" "card-ok"
q "iMach.show('s-home-sell', false); 'ok'" >/dev/null; sleep 0.8
chk "میز فروش: خوشامد حذف → «دسترسی سریع» + کارتابل کارت‌های مجزا (FD-34)" "$(q "(function(){var r=document.querySelector('#s-home-sell .body > .rows');return (r.classList.contains('dsk-tasks')?'tasks':'other')+'|'+document.querySelectorAll('#s-home-sell .dsk-col').length+'cols|'+(document.querySelector('#s-home-sell .dk-greet')?'greet-BAD':'nogreet')+'|'+(document.querySelector('#s-home-sell .dk-quick')?document.querySelector('#s-home-sell .dk-quick').textContent.trim():'noquick')})()")" "tasks|0cols|nogreet|دسترسی سریع"
chk "میز فروش: هر تسک یک کارت · هم‌ارتفاع · بدنهٔ ۳۰٪ باریک‌تر (FD-34)" "$(q "(function(){var rows=document.querySelectorAll('#s-home-sell .rows.dsk-tasks .row:not([hidden])');var cards=0;var hs=Array.prototype.map.call(rows,function(r){return Math.round(r.getBoundingClientRect().height)});rows.forEach(function(r){var cs=getComputedStyle(r);if(cs.borderLeftWidth!=='0px')cards++});var body=document.querySelector('#s-home-sell .dk-desk-main .body');return rows.length+'rows|cards='+cards+'|hs='+hs.join(',')+'|bodyW='+Math.round(body.getBoundingClientRect().width)})()")" "4rows|cards=4|hs=84,84,84,84|bodyW=810"
chk "میزها: شماره ترتیب FD-28 حذف شد" "$(q "(function(){return document.querySelectorAll('#s-home-sell .dk-ord, #s-home-buy .dk-ord').length===0?'ord-gone':'leftover'})()")" "ord-gone"

echo "─── ۷ب) ۳۶ ویرایش کاتالوگ: Form + Preview (FD-30) ───"
q "iMach.show('s-cat-edit', false); 'ok'" >/dev/null; sleep 0.9
chk "دوستونه: فرم راست + پیش‌نمایش چپ (RTL)" "$(q "(function(){var m=document.querySelector('#s-cat-edit .cev-main').getBoundingClientRect();var s=document.querySelector('#s-cat-edit .cev-side').getBoundingClientRect();return (s.x<m.x&&Math.abs(s.y-m.y)<40)?'two-col':'stacked'})()")" "two-col"
chk "پیش‌نمایش چسبان (sticky)" "$(q "(function(){return getComputedStyle(document.querySelector('#s-cat-edit .cev-side')).position})()")" "sticky"
chk "فرم در کاغذ واحد" "$(q "(function(){var cs=getComputedStyle(document.querySelector('#s-cat-edit .cev-main'));return (cs.borderTopWidth!=='0px'&&cs.backgroundColor!=='rgba(0, 0, 0, 0)')?'card-ok':'flat'})()")" "card-ok"
chk "سربرگ «خریداران این را می‌بینند»" "$(q "(function(){var c=document.querySelector('#s-cat-edit .cev-cap');return c&&c.textContent.indexOf('خریداران')>-1?'cap-ok':'none'})()")" "cap-ok"
chk "پیش‌نمایش زنده سر جایش (cate-pv-name در ستون)" "$(q "(function(){var n=document.getElementById('cate-pv-name');return n&&n.closest('.cev-side')?'in-side':'lost'})()")" "in-side"
chk "دکمهٔ ذخیره در جریان (dk-inflow)" "$(q "(function(){var sb=document.querySelector('#s-cat-edit .sticky-bar');return sb&&sb.classList.contains('dk-inflow')?'inflow':'sticky'})()")" "inflow"

echo "─── ۷ج) فرم‌های FD-30/۳۱: ۱۶ دوستونه · ۱۲ پیشنهاد · ۱۳ مثل موبایل ───"
q "iMach.show('s-edit-business', false); 'ok'" >/dev/null; sleep 0.8
chk "۱۶: فرم ۷۶۰ در کاغذ" "$(q "(function(){var b=document.querySelector('#s-edit-business .body');var cs=getComputedStyle(b);return Math.round(b.getBoundingClientRect().width)+'|'+(cs.borderTopWidth!=='0px'?'paper':'flat')})()")" "760|paper"
chk "۱۶: نام+شهر کنار هم (دو ستون)" "$(q "(function(){var f1=document.querySelector('#s-edit-business .body > .field:nth-child(1)').getBoundingClientRect();var f2=document.querySelector('#s-edit-business .body > .field:nth-child(2)').getBoundingClientRect();return (Math.abs(f1.top-f2.top)<10&&f1.x!==f2.x)?'pair-ok':'stacked'})()")" "pair-ok"
q "iMach.show('s-sell-offer', false); 'ok'" >/dev/null; sleep 1
chk "۱۲: قیمت‌ها راست + شرایط چسبان چپ" "$(q "(function(){var m=document.querySelector('#s-sell-offer .ofv-main');var s=document.querySelector('#s-sell-offer .ofv-side');if(!m||!s)return 'missing';var mr=m.getBoundingClientRect(),sr=s.getBoundingClientRect();return (sr.x<mr.x&&getComputedStyle(s).position==='sticky')?'two-col':'broken'})()")" "two-col"
chk "۱۲: جمع‌بندی زنده در پنل شرایط" "$(q "(function(){var s=document.querySelector('#s-sell-offer .ofv-side');return s&&s.contains(document.getElementById('of-sum-tx'))?'in-side':'lost'})()")" "in-side"
chk "۱۲: فیلدهای قیمت در ستون اصلی" "$(q "(function(){var m=document.querySelector('#s-sell-offer .ofv-main');return m&&m.contains(document.getElementById('of-prices'))?'in-main':'lost'})()")" "in-main"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.9
chk "۱۳: نوار پیشرفت FD-38 — موجود و غیرکلیکی (pointer-events:none)" "$(q "(function(){var p=document.querySelector('#s-sell-add #add-progress');if(!p)return 'missing';var cs=getComputedStyle(p);var steps=document.querySelectorAll('#s-sell-add .addp-st').length;return (cs.pointerEvents==='none'?'noclick':'clickable')+'|'+steps+'st'})()")" "noclick|3st"
chk "۱۳: قاب ۶۸۸ وسچ (۲۰٪ باریک‌تر از ۸۶۰)" "$(q "(function(){var w=Math.round(document.querySelector('#s-sell-add .body').getBoundingClientRect().width);return (w>660&&w<715)?'w688':'w'+w})()")" "w688"
chk "۱۳: نتایج ستونی مثل موبایل (نه گرید جدا)" "$(q "(function(){var r=document.querySelector('#s-sell-add #add-results');return r?getComputedStyle(r).display:'?'})()")" "block"
chk "۱۳: کارت کالا هم‌عرض سرچ‌باکس" "$(q "(function(){var s=document.querySelector('#s-sell-add .search-row').getBoundingClientRect().width;var p=document.querySelector('#s-sell-add .pick-row');return p?Math.round(Math.abs(p.getBoundingClientRect().width-s))+'px':'norow'})()")" "0px"
# FD-38: گام ۱ فقط «کالا» — یک گروه (کالاها)، بدون محصولات مرجع
chk "۱۳: گام ۱ فقط کالا — یک گروه، بدون ردیف محصول مرجع" "$(q "(function(){var t=document.querySelectorAll('#s-sell-add #add-results > .pick-group-title');var refs=document.querySelectorAll('#s-sell-add #add-results [data-pick-ref]').length;var goods=document.querySelectorAll('#s-sell-add #add-results [data-pick-good]').length;return ((t.length===1&&t[0].textContent.trim()==='کالاها')?'goods-only':'groups'+t.length)+'|refs='+refs+'|goods='+goods})()")" "goods-only|refs=0|goods=4"
q "document.querySelector('#s-sell-add .pick-row[data-pick-good]').click(); 'ok'" >/dev/null; sleep 0.6
chk "۱۳: گام ۲ — کالای منتخب + محصولات همان کالا" "$(q "(function(){var c=document.querySelector('#s-sell-add #add-type-name');var r=document.querySelector('#s-sell-add #add-refs .pick-row');return (c&&c.textContent.trim()!=='—'&&r)?'step2-ok':'broken'})()")" "step2-ok"
q "document.querySelector('#s-sell-add .pick-row[data-pick-ref]').click(); 'ok'" >/dev/null; sleep 0.6
chk "۱۳: دکمهٔ افزودن در جریانِ بدنه، دور از تهِ صفحه" "$(q "(function(){var b=document.getElementById('add-bar');if(!b)return 'nobar';var inb=b.closest('.body')?'inbody':'out';var gap=Math.round(document.documentElement.scrollHeight-b.getBoundingClientRect().bottom);return inb+'|'+((gap>=40)?'air-ok':'gap'+gap)})()")" "inbody|air-ok"
chk "۱۳: گام ۳ فلت روی کاغذِ body — بدون کاغذ تودرتو" "$(q "(function(){var s=document.querySelector('#s-sell-add #add-step-3');var cs=getComputedStyle(s);var b=document.querySelector('#s-sell-add .body');var bs=getComputedStyle(b);return ((cs.borderTopWidth==='0px'&&cs.backgroundColor==='rgba(0, 0, 0, 0)')?'flat':'nested')+'|'+((bs.borderTopWidth!=='0px'&&bs.backgroundColor!=='rgba(0, 0, 0, 0)')?'paper':'nopaper')})()")" "flat|paper"

echo "─── ۸) پروفایل: دوستونه + هویت در راست ───"
q "iMach.show('s-profile', false); 'ok'" >/dev/null; sleep 0.8
chk "۴ کارت هویت در ستون چسبان" "$(q "(function(){var s=document.querySelector('#s-profile .dkp-side');return s?s.children.length+'cards':'missing'})()")" "4cards"
chk "ستون هویت راستِ تنظیمات (RTL)" "$(q "(function(){var s=document.querySelector('#s-profile .dkp-side').getBoundingClientRect();var m=document.querySelector('#s-profile .dkp-main').getBoundingClientRect();return s.x>m.x?'right-ok':'wrong'})()")" "right-ok"
chk "بدنه پروفایل: گرید دوستونه" "$(q "(function(){return getComputedStyle(document.querySelector('#s-profile .body')).display})()")" "grid"

echo "─── ۹) چت: پیام‌رسان تمام‌قد در پوسته ───"
q "iMach.show('s-chat', false); 'ok'" >/dev/null; sleep 0.8
chk "ارتفاع ثابت ۱۰۰vh (بدون اسکرول صفحه)" "$(q "(function(){return Math.round(document.getElementById('s-chat').getBoundingClientRect().height)})()")" "900"
chk "پیام‌ها: اسکرول داخلی" "$(q "(function(){return getComputedStyle(document.querySelector('#s-chat .dk-desk-main .body')).overflowY})()")" "auto"
chk "نوار تایپ کفِ ستون" "$(q "(function(){var f=document.querySelector('#s-chat .chat-foot').getBoundingClientRect();return Math.abs(f.bottom-window.innerHeight)<3?'bottom-ok':'y='+Math.round(f.bottom)})()")" "bottom-ok"
chk "بوم گفتگو: پس‌زمینهٔ مشخص" "$(q "(function(){var bg=getComputedStyle(document.querySelector('#s-chat .dk-desk-main .body')).backgroundColor;return bg!=='rgba(0, 0, 0, 0)'?'canvas-ok':'clear'})()")" "canvas-ok"

echo "─── ۱۰) فهرست‌ها FD-30: ردیف‌های جدا با فاصله + گرید موجودیت ───"
q "iMach.show('s-customers', false); 'ok'" >/dev/null; sleep 0.9
chk "مارجین بین ردیف‌ها = ۱۲ (حکم مالک)" "$(q "(function(){return getComputedStyle(document.querySelector('#s-customers .body > .rows')).gap})()")" "12px"
chk "ردیف = کارت مجزا (قاب + شعاع ۱۶)" "$(q "(function(){var r=document.querySelector('#s-customers .body > .rows .row');var cs=getComputedStyle(r);return (cs.borderTopWidth!=='0px'&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&cs.borderRadius==='16px')?'card-ok':'flat'})()")" "card-ok"
chk "تناسب ارتفاع: مینیمم ۸۸" "$(q "(function(){var r=document.querySelector('#s-customers .body > .rows .row');return (r.getBoundingClientRect().height>=88)?'tall-ok':'h'+Math.round(r.getBoundingClientRect().height)})()")" "tall-ok"
chk "دفتر مشتریان: گرید موجودیت ۳ستونه" "$(q "(function(){return getComputedStyle(document.querySelector('#s-customers .body > .rows')).gridTemplateColumns.split(' ').length})()")" "3"
chk "دعوت: قرص جمع (≤۴۶۰) نه ۱۰۸۰" "$(q "(function(){var b=document.getElementById('cust-invite-2');return Math.round(b.getBoundingClientRect().width)<=460?'pill-ok':'w'+Math.round(b.getBoundingClientRect().width)})()")" "pill-ok"
q "iMach.show('s-buy-suppliers', false); 'ok'" >/dev/null; sleep 0.9
chk "تأمین‌کنندگان: گرید موجودیت ۳ستونه" "$(q "(function(){return getComputedStyle(document.querySelector('#s-buy-suppliers .body > .rows')).gridTemplateColumns.split(' ').length})()")" "3"
q "iMach.show('s-sell-orders', false); 'ok'" >/dev/null; sleep 0.9
chk "سفارش‌ها: ردیف‌های جدا با فاصلهٔ ۱۲ (حتی داخل host)" "$(q "(function(){var r=document.querySelector('#s-sell-orders .body .rows');return r?getComputedStyle(r).gap:'norows'})()")" "12px"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.8
chk "کانبان: ردیف‌ها با فاصلهٔ ۸ در ستون" "$(q "(function(){return getComputedStyle(document.querySelector('#s-home-buy .dsk-col')).gap})()")" "8px"
chk "کانبان: ردیف کارت سفید روی ستونِ تینت" "$(q "(function(){var col=getComputedStyle(document.querySelector('#s-home-buy .dsk-col'));var row=getComputedStyle(document.querySelector('#s-home-buy .dsk-col .row'));return (col.backgroundColor!=='rgba(0, 0, 0, 0)'&&row.backgroundColor!=='rgba(0, 0, 0, 0)'&&row.borderTopWidth!=='0px')?'notion-ok':'flat'})()")" "notion-ok"

echo "─── ۱۰ب) ۲۶/۱۵/۳۸: گرید پیشنهادها + قهرمان افقی + نماینده ───"
q "iMach.show('s-buy-offers', false); 'ok'" >/dev/null; sleep 1
chk "پیشنهادها: گرید ≥۳ستونه (نه لولهٔ ۲ستونه)" "$(q "(function(){var n=getComputedStyle(document.querySelector('#offers-list')).gridTemplateColumns.split(' ').length;return n>=3?n+'cols':'only'+n})()")" "3cols"
chk "پیشنهادها: کارت نفس‌دار (پدینگ ۱۸/۲۰)" "$(q "(function(){var c=document.querySelector('.offer-card');var cs=getComputedStyle(c);return cs.paddingTop+' '+cs.paddingLeft})()")" "18px 20px"
chk "پیشنهادها: عرض کارت ≤۴۲۰ (تناسب)" "$(q "(function(){var w=Math.round(document.querySelector('.offer-card').getBoundingClientRect().width);return w<=420?'prop-ok':'w'+w})()")" "prop-ok"
q "iMach.show('s-network-score', false); 'ok'" >/dev/null; sleep 0.9
chk "امتیاز: قهرمان افقی (دایره کنار متن)" "$(q "(function(){return getComputedStyle(document.querySelector('#s-network-score .score-hero')).flexDirection})()")" "row"
chk "امتیاز: بدنه دوستونه (مسیر | کارها)" "$(q "(function(){var b=getComputedStyle(document.querySelector('#s-network-score .body'));return b.display+'|'+b.gridTemplateColumns.split(' ').length})()")" "grid|2"
chk "امتیاز: مسیر چسبان در ستون راست" "$(q "(function(){var p=document.querySelector('#s-network-score .score-path');var w=document.querySelector('#s-network-score #sc-done-wrap');return (p.getBoundingClientRect().x>w.getBoundingClientRect().x&&getComputedStyle(p).position==='sticky')?'right-sticky':'no'})()")" "right-sticky"
q "iMach.show('s-salesrep', false); 'ok'" >/dev/null; sleep 0.9
chk "نماینده: ۴ کاشی یک‌ردیف" "$(q "(function(){var ts=[];document.querySelectorAll('#s-salesrep .rep-duo .desk-tile').forEach(function(t){ts.push(Math.round(t.getBoundingClientRect().top))});return ts.filter(function(v,i){return ts.indexOf(v)===i}).length})()")" "1"
chk "نماینده: گرید کسب‌وکارها ≥۳ستونه" "$(q "(function(){var n=getComputedStyle(document.querySelector('#s-salesrep .rep-biz-list')).gridTemplateColumns.split(' ').length;return n>=3?n+'cols':'only'+n})()")" "3cols"
chk "نماینده: ردیف سفارش‌ها با فاصلهٔ ۱۲" "$(q "(function(){var r=document.querySelector('#s-salesrep .body > .rows');return r?getComputedStyle(r).gap:'norows'})()")" "12px"

echo "─── ۱۱) شیت: مودال مرکزیِ fixed ───"
q "iMach.show('s-profile', false); 'ok'" >/dev/null; sleep 0.7
q "document.getElementById('set-lang-row').click(); 'c'" >/dev/null; sleep 0.8
chk "شیت: position fixed" "$(q "(function(){return getComputedStyle(document.getElementById('sheet-lang')).position})()")" "fixed"
chk "شیت: وسچِ پنجره" "$(q "(function(){var r=document.getElementById('sheet-lang').getBoundingClientRect();return (Math.abs((r.x+r.width/2)-window.innerWidth/2)<40)?'center-ok':'off'})()")" "center-ok"
q "(function(){var s=document.getElementById('sheet-lang');var x=s.querySelector('[data-close],[data-sheet-close]');if(!x){var b=s.querySelectorAll('button');x=b[b.length-1];}if(x)x.click();return 'c'})()" >/dev/null; sleep 0.5

echo "─── ۱۲) موبایل ۳۹۰: دست‌نخورده ───"
agent-browser set viewport 390 844 >/dev/null 2>&1; sleep 1
q "iMach.show('s-landing', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل: قاب ۳۹۰ بدون dk" "$(q "(function(){var p=document.getElementById('phone');return Math.round(p.getBoundingClientRect().width)+'|'+p.getAttribute('data-dk')})()")" "390|null"
chk "موبایل: اسکرول داخلی body (auto)" "$(q "(function(){return getComputedStyle(document.querySelector('#s-landing .body')).overflowY})()")" "auto"
chk "موبایل لندینگ: بدون کلاس dk-pad" "$(q "(function(){return document.querySelector('#s-landing .dk-pad')?'BAD-dkpad':'clean'})()")" "clean"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل میز: تب‌بار افقی، بدون سایدبار/شماره" "$(q "(function(){var sc=document.getElementById('s-home-buy');var tb=sc.querySelector('.tabbar');return getComputedStyle(tb).flexDirection+'|side='+(sc.querySelector('.dk-side')?'BAD':'ok')+'|ord='+(sc.querySelectorAll('.dk-ord').length?'BAD':'ok')})()")" "row|side=ok|ord=ok"
chk "موبایل میز: بدون کانبان/خوشامد/کارتِ تزریقی" "$(q "(function(){var sc=document.getElementById('s-home-buy');return (sc.querySelector('.dsk-col')||sc.querySelector('.dsk-rows')||sc.querySelector('.dk-greet')||sc.querySelector('.dsk-hint'))?'BAD':'ok'})()")" "ok"
chk "موبایل میز: ردیف‌ها فرزند مستقیم .rows" "$(q "(function(){var rs=document.querySelector('#s-home-buy .body > .rows');return (rs && rs.children.length && rs.children[0].classList.contains('row'))?'flat-ok':'wrapped'})()")" "flat-ok"
q "iMach.show('s-home-sell', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل میز فروش: بدون عنوان تزریقی/کارتِ دسکتاپی (FD-34)" "$(q "(function(){var sc=document.getElementById('s-home-sell');return (sc.querySelector('.dk-quick')||sc.querySelector('.dsk-tasks')||sc.querySelector('.dk-greet')||sc.querySelector('.dsk-col'))?'BAD':'ok'})()")" "ok"
q "iMach.show('s-profile', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل پروفایل: بدون پوسته/دوستونه" "$(q "(function(){var sc=document.getElementById('s-profile');return (sc.querySelector('.dk-side')||sc.querySelector('.dk-desk-main')||sc.querySelector('.dkp-side'))?'BAD':'ok'})()")" "ok"
q "iMach.show('s-login', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل ورود: بدون پنل برند تزریقی" "$(q "(function(){return document.querySelector('#s-login .dk-brand')?'BAD':'ok'})()")" "ok"
q "iMach.show('s-cat-edit', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل کاتالوک-ویرایش: بدون ستون تزریقی" "$(q "(function(){var sc=document.getElementById('s-cat-edit');return (sc.querySelector('.cev-side')||sc.querySelector('.cev-main')||sc.querySelector('.cev-cap'))?'BAD':'ok'})()")" "ok"
chk "موبایل کاتالوگ-ویرایش: پیش‌نمایش فرزند مستقیم body" "$(q "(function(){var p=document.getElementById('cate-logo');return p&&p.closest('.body')&&p.parentElement.classList.contains('card')&&p.closest('.body').firstElementChild.classList.contains('card')?'first-card-ok':'moved'})()")" "first-card-ok"
q "iMach.show('s-customers', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل مشتریان: فهرست ستونی (بدون گرید)" "$(q "(function(){var r=document.querySelector('#s-customers .body > .rows');return getComputedStyle(r).display+'|'+getComputedStyle(r).flexDirection})()")" "flex|column"
chk "موبایل مشتریان: gap ۸ همیشگی موبایل" "$(q "(function(){return getComputedStyle(document.querySelector('#s-customers .body > .rows')).gap})()")" "8px"
q "iMach.show('s-buy-offers', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل پیشنهادها: بدون گرید دسکتاپی" "$(q "(function(){return getComputedStyle(document.querySelector('#offers-list')).display})()")" "block"
q "iMach.show('s-network-score', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل امتیاز: قهرمان عمودی (همان موبایل)" "$(q "(function(){return getComputedStyle(document.querySelector('#s-network-score .score-hero')).flexDirection})()")" "column"
q "iMach.show('s-catalog', false); 'ok'" >/dev/null; sleep 0.9
chk "موبایل کاتالوک FD-35: نوار جستجو+محصول جدید (۴۴/۴۴ تم‌پر)" "$(q "(function(){var t=document.querySelector('#s-catalog .cat-toolbar');var sr=t.querySelector('.search-row');var add=t.querySelector('.cat-add');return Math.round(sr.getBoundingClientRect().height)+'/'+Math.round(add.getBoundingClientRect().height)+'|'+getComputedStyle(add).backgroundColor+'|'+getComputedStyle(add.querySelector('.ca-tx')).color})()")" "44/44|rgb(249, 115, 22)|rgb(255, 255, 255)"
chk "موبایل کاتالوک FD-35: ۴ دکمه ۲ستونی · کادر تبلیغات حذف · بدون کاغذ" "$(q "(function(){var a=document.querySelector('#s-catalog .cat-actions');var b=document.querySelector('#s-catalog .body');var c=getComputedStyle(b);return a.querySelectorAll('.cat-act').length+'btn/'+getComputedStyle(a).gridTemplateColumns.split(' ').length+'col|oldbox='+document.querySelectorAll('#s-catalog .promo-box').length+'|sheet='+(c.borderTopWidth!=='0px'||c.marginTop!=='0px'?'BAD':'none')+'|ovf='+((b.scrollWidth-b.clientWidth>2)?'OVF':'ok')})()")" "4btn/2col|oldbox=0|sheet=none|ovf=ok"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل افزودن: بدون ویزارد، نوار فرزندِ section" "$(q "(function(){var sc=document.getElementById('s-sell-add');return (sc.querySelector('.wiz')?'BAD-wiz':'ok')+'|bar='+((document.getElementById('add-bar').parentElement===sc)?'section':'moved')})()")" "ok|bar=section"
agent-browser set viewport 1440 900 >/dev/null 2>&1; sleep 1.2

echo "─── ۱۳) خطای کنسول ───"
chk "صفر خطای JS (دسکتاپ + موبایل + ریسایز)" "$(q "window.__errs.join('||')")" ""

echo
echo "═══ FD-29 QA: $pass ✓ / $fail ✗ ═══"
[[ $fail -gt 0 ]] && exit 1 || exit 0
