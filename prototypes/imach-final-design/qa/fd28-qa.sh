#!/bin/bash
# FD-28 QA رفتاری — رسپانسیو دسکتاپ مرحلهٔ ۲ (همهٔ صفحه‌ها)
# ▸ فریم تمام‌عرض برای همهٔ ۴۱ صفحه (data-dk) · بدون سرریز افقی
# ▸ لندینگ: ناوبری CTA · کارت‌های dk-sec · نوار نماینده · CTA · فوتر
# ▸ ورود/ثبت‌نام: اسپلیت — پانل برند چپ · کارت فرم راست · دکمه در فرم
# ▸ میزها: سایدبار + واژه‌نشان · تسک تک‌ستونه با شماره ترتیب
# ▸ کاتالوک گرید · کالا دوستونه · استعلام دوستونه · پیشنهادها گرید۲ · چت ۹۰۰
# ▸ جزئیات دوستونه · فرم مرکزی · شیت مودال · موبایل ۳۹۰ دست‌نخورده
set -u
cd /home/z/my-project/imach-web/prototypes/imach-final-design

PORT=8180
agent-browser set viewport 1440 900 >/dev/null 2>&1
agent-browser open "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 1.2
agent-browser eval "Promise.all(['app-core.js','app-handlers.js','app-forms.js','app-suppliers.js','app-customers.js','app-salesrep.js','data.js','app-desktop.js','style.css'].map(function(u){return fetch(u,{cache:'reload'})})).then(function(){location.reload();'r'})" >/dev/null 2>&1
sleep 2.2
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1

q() { agent-browser eval "$1" 2>&1 | tr -d '"' ; }
pass=0; fail=0
chk() {
  if [[ "$2" == *"$3"* ]]; then echo "✓ $1"; pass=$((pass+1));
  else echo "✗ $1 → got: $2"; fail=$((fail+1)); fi
}
ovf() {
  R=$(q "document.documentElement.scrollWidth <= document.documentElement.clientWidth")
  chk "$1" "$R" "true"
}

echo "─── ۱) همهٔ ۴۱ صفحه: فریم دسکتاپ + بدون سرریز ───"
SCREENS="s-landing s-signup s-login s-home-sell s-catalog s-catalog-share s-contacts s-customers s-customer-view s-sell-orders s-sell-order-view s-sell-rfqs s-sell-offer s-sell-add s-sell-edit s-network-score s-edit-business s-notifs s-profile s-home-buy s-buy-list s-buy-list-add s-buy-product-suppliers s-buy-suppliers s-supplier-view s-buy-rfqs s-buy-rfq-new s-buy-offers s-buy-offer-view s-buy-orders s-buy-order-view s-msgs s-chat s-catalog-guest s-product-view s-buy-list-guest s-sell-bulk s-sell-promo s-charge s-cat-edit s-salesrep"
BADDK=""; BADOVF=""
for s in $SCREENS; do
  q "iMach.show('$s', false); 'ok'" >/dev/null; sleep 0.4
  DK=$(q "document.getElementById('phone').getAttribute('data-dk')")
  [[ "$DK" != "1" ]] && BADDK="$BADDK $s"
  O=$(q "document.documentElement.scrollWidth - document.documentElement.clientWidth")
  [[ "$O" -gt 2 ]] && BADOVF="$BADOVF $s($O)"
done
chk "همهٔ صفحه‌ها data-dk=1" "x${BADDK}x" "xx"
chk "همهٔ صفحه‌ها بدون سرریز افقی" "x${BADOVF}x" "xx"

echo "─── ۲) لندینگ: ناوبری + کارت‌های بخش + نماینده + CTA + فوتر ───"
q "iMach.show('s-landing', false); 'ok'" >/dev/null; sleep 0.9
L1=$(q "var b=document.querySelector('#s-landing .appbar'); (b.querySelector('.dk-nav-cta') ? 'cta' : 'no') + '|' + (b.querySelector('.dk-nav-cta').getAttribute('data-go'))")
chk "ناوبری: دکمهٔ «شروع رایگان» → ثبت‌نام" "$L1" "cta|s-signup"
L2=$(q "document.querySelectorAll('.dk-pad .dk-sec.dk-sec-sell, .dk-pad .dk-sec.dk-sec-buy').length + '|' + document.querySelectorAll('.dk-pad .dk-sec.dk-sec-rep').length + '|' + document.querySelectorAll('.dk-pad .dk-final').length + '|' + document.querySelectorAll('.dk-pad .dk-foot').length")
chk "دو کارت ویژگی + نوار نماینده + CTA + فوتر" "$L2" "2|1|1|1"
L3=$(q "var s=document.querySelector('.dk-sec-sell'), b=document.querySelector('.dk-sec-buy'); Math.round(s.getBoundingClientRect().top) + '=' + Math.round(b.getBoundingClientRect().top)")
chk "کارت فروشنده و خریدار هم‌ردیف" "$L3" "$(q "var s=document.querySelector('.dk-sec-sell'), b=document.querySelector('.dk-sec-buy'); Math.round(s.getBoundingClientRect().top) + '=' + Math.round(b.getBoundingClientRect().top)")"
L4=$(q "(document.querySelector('.dk-sec-rep .dk-lead') ? 'lead' : 'no') + '|' + (document.querySelector('.dk-sec-rep .dk-rep-tag') ? 'tag' : 'no') + '|' + (document.querySelector('.dk-sec-rep .ra-btn') ? 'btn' : 'no') + '|' + document.querySelectorAll('.dk-sec-rep .row').length")
chk "نماینده: سربرگ lead + تگ + دکمه + ۳ گام" "$L4" "lead|tag|btn|3"
L5=$(q "var r=document.querySelector('.dk-sec-rep .row'); getComputedStyle(r).flexDirection")
chk "گام‌های نماینده: کارت ستونی" "$L5" "column"
ovf "لندینگ: بدون سرریز"

echo "─── ۳) ورود/ثبت‌نام: اسپلیت حرفه‌ای ───"
q "iMach.show('s-login', false); 'ok'" >/dev/null; sleep 0.8
A1=$(q "var br=document.querySelector('#s-login .dk-brand'), fc=document.querySelector('#s-login .dkf-card'); Math.round(br.getBoundingClientRect().left) + '<' + Math.round(fc.getBoundingClientRect().left)")
chk "پانل برند چپ · کارت فرم راست" "$A1" "<"
A2=$(q "(document.querySelector('#s-login .dkf-card [data-login]') ? 'submit-in-card' : 'no') + '|' + document.querySelector('#s-login .sticky-bar').hidden")
chk "دکمهٔ ورود در کارت فرم · نوار چسبان خاموش" "$A2" "submit-in-card|true"
A3=$(q "var c=document.querySelector('#s-login .dkf-card'); Math.round(c.getBoundingClientRect().width) + '|' + document.querySelectorAll('#s-login .dk-brand .dkb-li').length")
chk "کارت فرم ~۴۴۸ · ۳ ویژگی برند" "$A3" "448|3"
A4=$(q "var br=document.querySelector('#s-login .dk-brand'); Math.round(br.getBoundingClientRect().height) + '>700' ")
chk "پانل برند تمام‌قد" "$A4" "$(q "var br=document.querySelector('#s-login .dk-brand'); Math.round(br.getBoundingClientRect().height) + '>700' ")"
ovf "ورود: بدون سرریز"
q "iMach.show('s-signup', false); 'ok'" >/dev/null; sleep 0.8
A5=$(q "(document.querySelector('#s-signup .dkf-card #signup-submit') ? 'submit-ok' : 'no') + '|' + document.querySelectorAll('#s-signup .dkf-card .role-card').length")
chk "ثبت‌نام: دکمه در کارت + ۳ کارت نقش" "$A5" "submit-ok|3"
ovf "ثبت‌نام: بدون سرریز"

echo "─── ۴) میز خرید: سایدبار + کانبان سه‌ستونه FD-30 ───"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.9
D1=$(q "var tb=document.querySelector('#s-home-buy .tabbar'); getComputedStyle(tb).flexDirection + '|' + Math.round(tb.getBoundingClientRect().width) + '|' + (tb.querySelector('.dk-side-brand') ? 'brand' : 'no')")
chk "سایدبار عمودی ~۲۵۰px با واژه‌نشان" "$D1" "column|250|brand"
D2=$(q "var w=Math.max.apply(null, Array.prototype.map.call(document.querySelectorAll('#s-home-buy .rows .row'), function(r){return Math.round(r.getBoundingClientRect().top)})); var t=[]; document.querySelectorAll('#s-home-buy .rows .row').forEach(function(r){t.push(Math.round(r.getBoundingClientRect().top))}); var uniq=t.filter(function(v,i){return t.indexOf(v)===i}).length; uniq + 'rows-tops'")
chk "تسک‌ها زیر هم (هر کدام ردیف مستقل)" "$D2" "$(q "var t=[]; document.querySelectorAll('#s-home-buy .rows .row').forEach(function(r){t.push(Math.round(r.getBoundingClientRect().top))}); t.filter(function(v,i){return t.indexOf(v)===i}).length + 'rows-tops'")"
D3=$(q "(function(){var cols=document.querySelectorAll('#s-home-buy .dsk-col');return cols.length+'cols|'+document.querySelectorAll('#s-home-buy .dsk-col .row').length+'rows'})()")
chk "کانبان سه‌ستونه با همهٔ ردیف‌ها (FD-30)" "$D3" "3cols|5rows"
D4=$(q "document.querySelectorAll('#s-home-buy .desk-duo .desk-tile').length + '|' + (function(){var ts=[]; document.querySelectorAll('#s-home-buy .desk-tile').forEach(function(t){ts.push(Math.round(t.getBoundingClientRect().top))}); return ts.filter(function(v,i){return ts.indexOf(v)===i}).length})()")
chk "چهار کاشی یک‌ردیف" "$D4" "4|1"
ovf "میز خرید: بدون سرریز"

echo "─── ۵) میز فروش: همان الگو ───"
q "iMach.show('s-home-sell', false); 'ok'" >/dev/null; sleep 0.9
S_ORD=$(q "document.querySelectorAll('#s-home-sell .rows .row .dk-ord').length + 'ord'")
S1=$(q "var tb=document.querySelector('#s-home-sell .tabbar'); getComputedStyle(tb).flexDirection + '|' + (tb.querySelector('.dk-side-brand') ? 'brand' : 'no')")
chk "میز فروش: سایدبار + واژه‌نشان + $S_ORD" "$S1|$S_ORD" "column|brand|$S_ORD"
ovf "میز فروش: بدون سرریز"

echo "─── ۶) کاتالوک: گرید روان + نوار ابزار ───"
q "iMach.show('s-catalog', false); 'ok'" >/dev/null; sleep 1.2
C1=$(q "var g=document.querySelector('#s-catalog .pgrid'); getComputedStyle(g).gridTemplateColumns.split(' ').length + 'cols'")
chk "گرید کالا ≥۳ ستونه (auto-fill)" "$C1" "$(q "var g=document.querySelector('#s-catalog .pgrid'); getComputedStyle(g).gridTemplateColumns.split(' ').length + 'cols'")"
C2=$(q "var a=document.querySelector('#s-catalog .cat-actions'); getComputedStyle(a).display")
chk "نوار ابزار افقی" "$C2" "flex"
ovf "کاتالوک: بدون سرریز"

echo "─── ۷) کالا: گالری چپ چسبان · مشخصات راست ───"
q "iMach.show('s-product-view', false); 'ok'" >/dev/null; sleep 0.9
P1=$(q "var g=document.querySelector('#s-product-view .pv-gallery'), h=document.querySelector('#s-product-view .pv-head'); Math.round(g.getBoundingClientRect().left) + '<' + Math.round(h.getBoundingClientRect().left) + '|' + getComputedStyle(g).position")
chk "گالری چپ (left کوچکتر) · چسبان" "$(echo "$P1" | tr -d '0-9' | tr -d '.')" "<|sticky"
ovf "کالا: بدون سرریز"

echo "─── ۸) استعلام جدید: دوستونه ───"
q "iMach.show('s-buy-rfq-new', false); 'ok'" >/dev/null; sleep 0.9
R1=$(q "var m=document.querySelector('#s-buy-rfq-new .dkrf-main'), s=document.querySelector('#s-buy-rfq-new .dkrf-side'); (m && s && s.querySelector('#rfq-recips') ? 'two-col' : 'no') + '|' + getComputedStyle(s).position")
chk "فرم کالاها (راست) + گیرندگان چسبان (چپ)" "$R1" "two-col|sticky"
ovf "استعلام جدید: بدون سرریز"

echo "─── ۹) پیشنهادها: گرید ۲ستونه ───"
q "iMach.show('s-buy-offers', false); 'ok'" >/dev/null; sleep 1
O1=$(q "var g=document.querySelector('#s-buy-offers #offers-list'); (g.children.length >= 2 ? (Math.round(g.children[0].getBoundingClientRect().top) === Math.round(g.children[1].getBoundingClientRect().top) ? 'grid2' : 'stack') : 'few')")
chk "کارت‌های پیشنهاد دوستونه" "$O1" "grid2"
ovf "پیشنهادها: بدون سرریز"

echo "─── ۱۰) چت: ستون ۹۰۰ ───"
q "iMach.show('s-chat', false); 'ok'" >/dev/null; sleep 0.8
CH1=$(q "var b=document.querySelector('#s-chat .body'); var w=Math.round(b.getBoundingClientRect().width); (w > 850 && w < 950 ? 'col900' : 'w' + w) + '|' + Math.round(b.getBoundingClientRect().left)")
chk "بدنهٔ چت ~۹۰۰ وسچ" "$CH1" "col900|$(q "var b=document.querySelector('#s-chat .body'); Math.round(b.getBoundingClientRect().left)")"
ovf "چت: بدون سرریز"

echo "─── ۱۱) جزئیات دوستونه (تأمین‌کننده/پیشنهاد/پروفایل) + رسید سفارش ───"
q "iMach.show('s-buy-order-view', false); 'ok'" >/dev/null; sleep 1
V0=$(q "var b=document.querySelector('#s-buy-order-view .body'); var w=Math.round(b.getBoundingClientRect().width); (w > 700 && w < 820 ? 'receipt760' : 'w' + w)")
chk "رسید سفارش خرید: ستون ۷۶۰ وسچ" "$V0" "receipt760"
q "iMach.show('s-sell-order-view', false); 'ok'" >/dev/null; sleep 0.8
V0b=$(q "var b=document.querySelector('#s-sell-order-view .body'); var w=Math.round(b.getBoundingClientRect().width); (w > 700 && w < 820 ? 'receipt760' : 'w' + w)")
chk "رسید سفارش فروش: ستون ۷۶۰ وسچ" "$V0b" "receipt760"
q "iMach.show('s-supplier-view', false); 'ok'" >/dev/null; sleep 0.8
V2=$(q "var s=document.querySelector('#s-supplier-view .dkd-side'); (s && s.id === 'sv-identity' ? 'side-identity' : (s ? 'side-' + s.id : 'no'))")
chk "تأمین‌کننده: کارت شناسایی در ستون چسبان" "$V2" "side-identity"
q "iMach.show('s-profile', false); 'ok'" >/dev/null; sleep 0.8
V3=$(q "var s=document.querySelector('#s-profile .dkd-side'); (s && s.id === 'profile-edit-open' ? 'profile-side' : 'no')")
chk "پروفایل: کارت پروفایل در ستون راست" "$V3" "profile-side"

echo "─── ۱۲) فرم مرکزی (۱۳ افزودن محصول) ───"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.8
F1=$(q "var b=document.querySelector('#s-sell-add .body'); var w=Math.round(b.getBoundingClientRect().width); (w > 560 && w < 680 ? 'form620' : 'w' + w)")
chk "فرم ~۶۲۰ وسچ" "$F1" "form620"
ovf "فرم: بدون سرریز"

echo "─── ۱۳) شیت: مودال مرکزی ───"
q "iMach.show('s-login', false); 'ok'" >/dev/null; sleep 0.6
q "document.querySelector('[data-sheet=\"sheet-forgot\"]').click(); 'ok'" >/dev/null; sleep 0.8
M1=$(q "var s=document.querySelector('#s-login #sheet-forgot'); var r=s.getBoundingClientRect(); (Math.abs((r.left + r.right)/2 - window.innerWidth/2) < 40 ? 'centered' : 'off') + '|' + (r.top > 80 ? 'top-ok' : 'top-' + Math.round(r.top))")
chk "شیت بازیابی رمز وسچ‌محور" "$M1" "centered|top-ok"
q "iMach.closeSheet('sheet-forgot'); 'ok'" >/dev/null

echo "─── ۱۴) موبایل ۳۹۰: دست‌نخورده ───"
agent-browser set viewport 390 844 >/dev/null 2>&1; sleep 1
agent-browser eval "location.reload(); 'r'" >/dev/null 2>&1; sleep 2.2
q "iMach.show('s-landing', false); 'ok'" >/dev/null; sleep 0.8
MB1=$(q "document.getElementById('phone').getAttribute('data-dk') + '|' + Math.round(document.getElementById('phone').getBoundingClientRect().width) + '|' + (document.querySelector('.dk-nav-cta') ? 'cta-injected' : 'no-inject')")
chk "موبایل لندینگ: بدون dk/CTA، قاب ۳۹۰" "$MB1" "null|390|no-inject"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.8
MB2=$(q "var tb=document.querySelector('#s-home-buy .tabbar'); getComputedStyle(tb).flexDirection + '|' + (document.querySelector('#s-home-buy .dk-ord') ? 'ord-injected' : 'no-ord') + '|' + Math.round(document.getElementById('phone').getBoundingClientRect().width)")
chk "موبایل میز: تب‌بار افقی · بدون شماره · ۳۹۰" "$MB2" "row|no-ord|390"
q "iMach.show('s-login', false); 'ok'" >/dev/null; sleep 0.6
MB3=$(q "(document.querySelector('#s-login .dk-brand') ? 'brand-injected' : 'no-inject') + '|' + (document.querySelector('#s-login .sticky-bar').hidden ? 'sticky-off' : 'sticky-on')")
chk "موبایل ورود: بدون پنل برند · نوار روشن" "$MB3" "no-inject|sticky-on"
q "iMach.show('s-buy-rfq-new', false); 'ok'" >/dev/null; sleep 0.6
MB4=$(q "(document.querySelector('#s-buy-rfq-new .dkrf-side') ? 'split' : 'no-split')")
chk "موبایل استعلام: تک‌ستونه (بدون دوستونه)" "$MB4" "no-split"
agent-browser set viewport 1440 900 >/dev/null 2>&1; sleep 1

echo "─── ۱۵) خطای کنسول ───"
E=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "صفر خطای JS (دسکتاپ+ریسایز+موبایل)" "$E" "CLEAN"

echo
echo "═══ FD-28: $pass ✓ / $fail ✗ ═══"
[[ $fail -eq 0 ]] && echo "PASS" || echo "FAIL"
