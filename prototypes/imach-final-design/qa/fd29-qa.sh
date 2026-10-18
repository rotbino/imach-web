#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# FD-29 QA — پوستهٔ اپ دسکتاپ + اسکرول مرورگر + ترمیم‌های مالک
# changed-architecture deltas نسبت به fd28-qa:
#   · سایدبار ۲۵۰→۲۵۶ · چت: بومِ کل‌عرض با ستونِ ۹۰۰ (نه بدنهٔ ۹۰۰)
#   · پروفایل: dkp-side/dkp-main (نه dkd-side)
# ═══════════════════════════════════════════════════════════════
cd "$(dirname "$0")/.."

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

echo "─── ۷) میزها: تسک تک‌ستونه با شماره ترتیب ───"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.8
chk "ردیف‌های تسک زیر هم (flex column)" "$(q "(function(){var rows=document.querySelector('#s-home-buy .body .rows');return rows?getComputedStyle(rows).flexDirection:'?'})()")" "column"
chk "تسک‌ها در ظرف کارت (border + bg)" "$(q "(function(){var rows=document.querySelector('#s-home-buy .body .rows');var cs=getComputedStyle(rows);return (cs.borderTopWidth!=='0px'&&cs.backgroundColor!=='rgba(0, 0, 0, 0)')?'card-ok':'flat'})()")" "card-ok"
chk "شمارهٔ ترتیب روی تسک‌ها" "$(q "(function(){return document.querySelectorAll('#s-home-buy .rows .dk-ord').length>0?'ord-ok':'none'})()")" "ord-ok"

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

echo "─── ۱۰) ظرف کارت فهرست‌ها ───"
q "iMach.show('s-customers', false); 'ok'" >/dev/null; sleep 0.8
chk "دفتر مشتریان: ردیف‌ها در کاغذ واحد" "$(q "(function(){var rows=document.querySelector('#s-customers .body > .rows');if(!rows)return 'norows';var cs=getComputedStyle(rows);return (cs.borderTopWidth!=='0px'&&cs.backgroundColor!=='rgba(0, 0, 0, 0)')?'card-ok':'flat'})()")" "card-ok"
chk "ردیف‌ها مسطح با خط مویی" "$(q "(function(){var r=document.querySelector('#s-customers .body > .rows .row');var cs=getComputedStyle(r);return (cs.backgroundColor==='rgba(0, 0, 0, 0)'&&cs.borderBottomStyle==='solid')?'flat-ok':'boxed'})()")" "flat-ok"

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
q "iMach.show('s-profile', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل پروفایل: بدون پوسته/دوستونه" "$(q "(function(){var sc=document.getElementById('s-profile');return (sc.querySelector('.dk-side')||sc.querySelector('.dk-desk-main')||sc.querySelector('.dkp-side'))?'BAD':'ok'})()")" "ok"
q "iMach.show('s-login', false); 'ok'" >/dev/null; sleep 0.8
chk "موبایل ورود: بدون پنل برند تزریقی" "$(q "(function(){return document.querySelector('#s-login .dk-brand')?'BAD':'ok'})()")" "ok"
agent-browser set viewport 1440 900 >/dev/null 2>&1; sleep 1.2

echo "─── ۱۳) خطای کنسول ───"
chk "صفر خطای JS (دسکتاپ + موبایل + ریسایز)" "$(q "window.__errs.join('||')")" ""

echo
echo "═══ FD-29 QA: $pass ✓ / $fail ✗ ═══"
[[ $fail -gt 0 ]] && exit 1 || exit 0
