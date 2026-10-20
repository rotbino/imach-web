#!/bin/bash
# FD-28 QA رفتاری — رسپانسیو دسکتاپ مرحلهٔ ۲ (همهٔ صفحه‌ها)
# FD-30 deltas: میزها → کانبان سه‌ستونه (شماره ترتیب حذف) · فرم ۱۳ →
#   ویزارد ۸۶۰ (۶۲۰ تنگ بود) — بقیهٔ چک‌ها همان FD-28/29.
# FD-31 deltas (لندینگ): حذف CTA اپ‌بار + برند iMach/آیمچ + فلت
#   (بدون خط رنگی/قاب عکس/کارت تودرتو) + دکمهٔ «ساخت حساب» +
#   بخش نظرات (۲۴ کارت + لینک کاتالوگ/فهرست + فلش + شیت ثبت نظر).
# FD-34 deltas (مالک): زبان داخل بنر + عکس هیرو بدون برش · ثبت‌نام
#   (هینت کوتاه · صنف=نوع کسب‌وکار ۴۸تایی · سه دکمهٔ ساده + مثال ·
#   su-free حذف · کارت ۷۰۰) · میز فروش (خوشامد→«دسترسی سریع» ·
#   بدنهٔ ۸۱۰ (۳۰%-) · هر تسک یک کارتِ هم‌ارتفاع).
# FD-41 deltas (مالک — هم‌قالب‌سازی میز خرید با میز فروش): کاشی فلت
#   (بدون chev · آیکون لخت · شمار خاکستری · بج قرمز تأمین‌کننده‌ها) ·
#   خوشامد حذف → «دسترسی سریع» · کانبان سه‌ستونه حذف → dsk-tasks ·
#   hint حذف (موبایل و دسکتاپ) · موبایل بدون تزریق.
# ▸ فریم تمام‌عرض برای همهٔ ۴۱ صفحه (data-dk) · بدون سرریز افقی
# ▸ لندینگ FD-31 · ورود/ثبت‌نام · میزها · کاتالوک گرید · چت ۹۰۰
# ▸ جزئیات دوستونه · فرم مرکزی · شیت مودال · موبایل ۳۹۰ دست‌نخورده
set -u
cd /home/z/my-project/imach-web/prototypes/imach-final-design

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

echo "─── ۲) لندینگ FD-31: فلت + برندینگ + نظرات ───"
q "iMach.show('s-landing', false); 'ok'" >/dev/null; sleep 0.9
L1=$(q "var b=document.querySelector('#s-landing .appbar'); (b.querySelector('.dk-nav-cta') ? 'BAD-cta' : 'no-cta') + '|' + b.querySelector('.brand-link .title').textContent + '|' + b.querySelectorAll('.appbar > .btn, .appbar .brand ~ .btn').length")
chk "ناوبری: بدون CTA تزریقی · برند iMach · فقط «ورود»" "$L1" "no-cta|iMach|1"
L2=$(q "document.querySelectorAll('.dk-pad .dk-sec.dk-sec-sell, .dk-pad .dk-sec.dk-sec-buy').length + '|' + document.querySelectorAll('.dk-pad .dk-sec.dk-sec-rep').length + '|' + document.querySelectorAll('.dk-pad .dk-final').length + '|' + document.querySelectorAll('.dk-pad .dk-foot').length")
chk "دو کارت ویژگی + نوار نماینده + CTA + فوتر" "$L2" "2|1|1|1"
L3=$(q "var s=document.querySelector('.dk-sec-sell'), b=document.querySelector('.dk-sec-buy'); Math.round(s.getBoundingClientRect().top) + '=' + Math.round(b.getBoundingClientRect().top)")
chk "کارت فروشنده و خریدار هم‌ردیف" "$L3" "$(q "var s=document.querySelector('.dk-sec-sell'), b=document.querySelector('.dk-sec-buy'); Math.round(s.getBoundingClientRect().top) + '=' + Math.round(b.getBoundingClientRect().top)")"
L4=$(q "(document.querySelector('.dk-sec-rep .dk-lead') ? 'lead' : 'no') + '|' + (document.querySelector('.dk-sec-rep .dk-rep-tag') ? 'tag' : 'no') + '|' + (document.querySelector('.dk-sec-rep .ra-btn') ? 'btn' : 'no') + '|' + document.querySelectorAll('.dk-sec-rep .row').length")
chk "نماینده: سربرگ lead + تگ + دکمه + ۳ گام" "$L4" "lead|tag|btn|3"
L5=$(q "var r=document.querySelector('.dk-sec-rep .row'); getComputedStyle(r).flexDirection + '|' + getComputedStyle(r).backgroundColor + '|' + getComputedStyle(r).borderTopWidth")
chk "گام‌های نماینده: ستونی · بدون کارت تودرتو (فلت)" "$L5" "column|rgba(0, 0, 0, 0)|0px"
L6=$(q "(function(){var o=[]; ['.dk-sec-sell','.dk-sec-buy','.dk-sec-rep'].forEach(function(s){var cs=getComputedStyle(document.querySelector(s)); o.push(cs.borderTopWidth + '=' + cs.borderBottomWidth + '=' + cs.borderLeftWidth)}); var img=document.querySelector('#s-landing .hero .dk-hero-img'); var ic=getComputedStyle(img); o.push(ic.borderTopWidth + '=' + ic.boxShadow); return o.join('|')})()")
chk "فلت FD-31: قاب یکنواخت کارت‌ها (بدون خط رنگی سرِ بخش) · عکس بدون قاب/سایه" "$L6" "1px=1px=1px|1px=1px=1px|1px=1px=1px|0px=none"
L7=$(q "document.querySelector('#s-landing .hero-cta .btn-primary').textContent + '|' + (document.querySelector('#s-landing .hero h1').textContent.indexOf('آیمچ') > -1 && document.querySelector('#s-landing .hero h1').textContent.indexOf('آی‌مچ') === -1 ? 'brand-ok' : 'brand-bad') + '|' + (document.querySelector('#s-landing .hero p').textContent.indexOf('موتور تطبیق') > -1 ? 'new-copy' : 'old-copy')")
chk "هیرو: دکمهٔ «ساخت حساب» · برند «آیمچ» · متن بنر جدید" "$L7" "ساخت حساب|brand-ok|new-copy"
L8=$(q "(function(){var s=document.querySelector('#rv-strip'); return document.querySelectorAll('.rv-strip .rv-card').length + 'cards|' + (document.querySelector('.rv-strip .rv-add') ? 'add' : 'no') + '|' + document.querySelectorAll('.rv-strip [data-go=\"s-catalog-guest\"]').length + 'cat|' + document.querySelectorAll('.rv-strip [data-go=\"s-buy-list-guest\"]').length + 'list'})()")
chk "نظرات FD-32: ۲۵ کارت + کارت ثبت + ۱۴ لینک کاتالوگ + ۱۲ لینک فهرست" "$L8" "25cards|add|14cat|12list"
L8b=$(q "(function(){var c=document.querySelector('.rv-strip .rv-card'); return c.querySelector('.rv-name').textContent + '|' + c.querySelector('.rv-role').textContent + '|' + (c.firstElementChild.className==='rv-name'?'name-first':'bad-order')})()")
chk "کارت نظر: نام (بزرگ/بولد) اول · «مدیر سوپرمارکت آریا» زیرش" "$L8b" "احمد رضایی|مدیر سوپرمارکت آریا|name-first"
L8c=$(q "(function(){var cs=getComputedStyle(document.querySelector('.rv-strip .rv-card .rv-name')); var cr=getComputedStyle(document.querySelector('.rv-strip .rv-card .rv-role')); return cs.fontWeight + '|' + cs.fontSize + '|' + cr.fontWeight + '|' + cr.color})()")
chk "تایپوگرافی کارت: نام ۸۰۰/۱۵px · نقش معمولی و کمرنگ" "$L8c" "800|15px|400|rgb(125, 120, 110)"
L8d=$(q "(function(){var c=document.querySelectorAll('.rv-strip .rv-card')[1]; return c.querySelector('.rv-name').textContent + '|' + c.querySelector('.rv-role').textContent})()")
chk "نظر دوم (مثال مالک): محسن رضایی — بازاریاب شرکت پخش آسمان" "$L8d" "محسن رضایی|بازاریاب شرکت پخش آسمان"
L8e=$(q "(function(){var c=Array.prototype.slice.call(document.querySelectorAll('.rv-strip .rv-card')).filter(function(x){return x.querySelector('.rv-name').textContent==='سعید محمدی'})[0]; return (c.textContent.indexOf('رشد')>-1?'growth':'no') + '|' + c.querySelector('.rv-link').getAttribute('data-go')})()")
chk "سعید محمدی (همکار فروش یدکی): کاتالوگ + رشد درآمد" "$L8e" "growth|s-catalog-guest"
LNG1=$(q "(function(){var lb=document.getElementById('lp-langs'); return lb.querySelectorAll('.lp-lang').length + 'btns|' + lb.querySelector('.lp-lang.active').textContent + '|' + getComputedStyle(lb).justifyContent + '|parent=' + lb.parentElement.className})()")
chk "نوار زبان داخل بنر (FD-34): ۴ دکمه · فارسی فعال · راست‌تراز" "$LNG1" "4btns|فارسی|flex-start|parent=hero"
q "document.querySelector('.lp-lang-more').click(); 'ok'" >/dev/null; sleep 0.7
LNG2=$(q "(function(){var s=document.getElementById('sheet-lp-lang'); return (!s.hidden && s.classList.contains('show') ? 'open' : 'closed') + '|' + s.querySelectorAll('[data-lp-lang]').length + 'rows'})()")
chk "دکمهٔ «سایر» → شیت زبان‌های دیگر (۷ زبان) باز" "$LNG2" "open|7rows"
q "iMach.closeSheet('sheet-lp-lang'); 'ok'" >/dev/null; sleep 0.5
L9=$(q "(function(){var f=document.querySelector('.rv-strip .rv-card'); return f.querySelector('.rv-name').textContent + '|' + f.querySelector('.rv-link').getAttribute('data-go')})()")
chk "نظر اول (احمد رضایی · خریدار): لینک فهرست خرید" "$L9" "احمد رضایی|s-buy-list-guest"
L11=$(q "(function(){var c=Array.prototype.slice.call(document.querySelectorAll('.rv-strip .rv-card')).filter(function(x){return x.querySelector('.rv-name').textContent==='پرویز اکبری'})[0]; return c.querySelectorAll('.rv-link').length + 'links'})()")
chk "پرویز اکبری (هر دو persona): دو لینک" "$L11" "2links"
L12=$(q "getComputedStyle(document.querySelector('.rv-nav')).display + '|' + (function(){var r=document.querySelector('.dk-pad > .dk-sec:has(.rv-strip)'); var cs=getComputedStyle(r); return cs.backgroundColor + '/' + cs.borderTopWidth})()")
chk "فلش‌های نوار نمایان · بخش نظرات فلت (بدون کاغذ بیرونی)" "$L12" "flex|rgba(0, 0, 0, 0)/0px"
q "document.getElementById('rv-next').click(); 'ok'" >/dev/null; sleep 1.1
L13=$(q "(function(){var s=document.getElementById('rv-strip'); window.__rvX=s.scrollLeft; return s.scrollLeft < -50 ? 'moved-left' : 'flat:' + Math.round(s.scrollLeft)})()")
chk "فلش «بعدی»: اسکرول نوار (RTL · چپ/منفی)" "$L13" "moved-left"
q "document.getElementById('rv-prev').click(); 'ok'" >/dev/null; sleep 1.1
L14=$(q "(function(){var s=document.getElementById('rv-strip'); return s.scrollLeft > window.__rvX + 50 ? 'moved-back' : 'no:' + Math.round(s.scrollLeft) + '>' + Math.round(window.__rvX)})()")
chk "فلش «قبلی»: بازگشت به عقب" "$L14" "moved-back"
q "document.querySelector('.rv-strip .rv-add .btn').click(); 'ok'" >/dev/null; sleep 0.7
L15=$(q "(function(){var s=document.getElementById('sheet-review'); return (!s.hidden && s.classList.contains('show') ? 'open' : 'closed')})()")
chk "شیت «ثبت نظر شما» باز می‌شود" "$L15" "open"
q "document.getElementById('rv-name').value='شقایق نوری'; document.getElementById('rv-role').value='مدیر کافی‌شاپ'; document.getElementById('rv-text').value='کاتالوگ تأمین‌کننده‌هایم را یک‌جا ذخیره کرده‌ام.'; 'ok'" >/dev/null
q "document.getElementById('rv-submit').click(); 'ok'" >/dev/null; sleep 0.8
L16=$(q "(function(){var s=document.getElementById('sheet-review'); var c=document.querySelector('.rv-strip .rv-card'); return (s.hidden ? 'closed' : 'open') + '|' + c.querySelector('.rv-name').textContent + '|' + (c.classList.contains('rv-user') && c.querySelector('.rv-wait') ? 'pending' : 'no-wait')})()")
chk "ثبت نظر: شیت بسته · کارت جدید اول نوار · «در انتظار بررسی»" "$L16" "closed|شقایق نوری|pending"
q "document.querySelector('.rv-strip .rv-add .btn').click(); 'ok'" >/dev/null; sleep 0.7
q "document.getElementById('rv-submit').click(); 'ok'" >/dev/null; sleep 0.4
L17=$(q "(function(){var s=document.getElementById('sheet-review'); return (!s.hidden ? 'still-open' : 'closed')})()")
chk "اعتبارسنجی: نام/متن خالی → شیت باز می‌ماند" "$L17" "still-open"
q "iMach.closeSheet('sheet-review'); 'ok'" >/dev/null
q "document.querySelector('.rv-strip [data-go=\"s-catalog-guest\"]').click(); 'ok'" >/dev/null; sleep 1
L18=$(q "document.querySelector('.screen:not([hidden])').id")
chk "لینک «مشاهدهٔ کاتالوگ» → کاتالوگ عمومی (۳۱)" "$L18" "s-catalog-guest"
q "iMach.back(); 'ok'" >/dev/null; sleep 1
L19=$(q "document.querySelector('.screen:not([hidden])').id")
chk "بازگشت → لندینگ" "$L19" "s-landing"
ovf "لندینگ: بدون سرریز"

echo "─── ۳) ورود/ثبت‌نام: اسپلیت + ثبت‌نام دو مرحله‌ای FD-32 ───"
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
q "iMach.show('s-signup', false); 'ok'" >/dev/null; sleep 1
SU1=$(q "(function(){var s1=document.getElementById('signup-step-1'), s2=document.getElementById('signup-step-2'), sb=document.getElementById('signup-submit'); return (s1&&!s1.hidden?'step1':'hid1') + '|' + (s2&&!s2.hidden?'step2':'hid2') + '|' + (sb&&!sb.hidden?'sub':'hidsub') + '|' + document.querySelectorAll('#s-signup .role-card.active').length + 'active|' + document.querySelectorAll('#s-signup .dkf-card .role-card').length + 'cards'})()")
chk "گام ۱ نمایان · گام ۲ و دکمه مخفی · بدون پیش‌فرض · ۳ کارت" "$SU1" "step1|hid2|hidsub|0active|3cards"
SU2=$(q "(document.querySelector('#s-signup .dkb-li:nth-child(1) span:last-child').textContent) + '|' + (document.querySelector('#s-signup .dkb-li:nth-child(2) span:last-child').textContent) + '|' + (document.querySelector('#s-signup .dkb-li:nth-child(3) span:last-child').textContent)")
chk "باکس نارنجی FD-32: رایگان · دو میز · روشن‌کردن از پروفایل" "$SU2" "امکانات آیمچ همیشه رایگان خواهد بود|هم میز خرید عمده داری و هم میز فروش عمده|روشن کردن هر دو میز از طریق پروفایل در دسترس است"
SU3=$(q "(document.querySelector('#s-signup .dkf-card .field label') ? document.querySelectorAll('#s-signup #signup-step-1 .field').length + 'f' : 'x') + '|' + (document.querySelector('#s-signup #signup-step-1 .linklike[data-go=s-login]') ? 'login-link' : 'no')")
chk "گام ۱: شماره + نام · لینک «قبلاً ثبت‌نام کرده‌ام — ورود»" "$SU3" "2f|login-link"
q "document.getElementById('signup-next').click(); 'ok'" >/dev/null; sleep 0.6
SU0=$(q "(function(){var c=document.querySelector('#s-signup .dkf-card'); var b=document.querySelector('#s-signup .dkf-card #signup-submit'); return Math.round(c.getBoundingClientRect().width) + '|btn' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)})()")
chk "کارت ثبت‌نام ۷۰۰ (FD-34: ۲۵٪+) · دکمهٔ تمام‌عرض ~۶۰۲×۵۴" "$SU0" "700|btn602x54"
SU4=$(q "(function(){var s1=document.getElementById('signup-step-1'), s2=document.getElementById('signup-step-2'), sb=document.getElementById('signup-submit'); return (s2&&!s2.hidden?'step2':'hid2') + '|' + (sb&&!sb.hidden?'sub':'hidsub') + '|' + (s1&&s1.hidden?'back-ok':'no')})()")
chk "«ادامه» → گام ۲ + دکمهٔ ساخت حساب نمایان" "$SU4" "step2|sub|back-ok"
SU5=$(q "(document.querySelector('#signup-biz') ? 'biz' : 'x') + '|' + (document.querySelector('#s-signup .hint').textContent.indexOf('نقش شما مهم است')>-1?'fd34-hint':'old') + '|' + document.querySelectorAll('[data-su-role]').length + 'roles|' + document.querySelectorAll('#su-ind-list .sheet-row').length + 'ind0' + '|' + (document.querySelector('#s-signup .su-free') ? 'free-BAD' : 'free-gone') + '|' + document.querySelectorAll('#s-signup .su-modes .role-card').length + 'modes'")
chk "گام ۲: هینت FD-34 · ۹ نقش · صنف‌ها (۴۹) · su-free حذف · ۳ دکمهٔ ساده" "$SU5" "biz|fd34-hint|9roles|49ind0|free-gone|3modes"
q "document.getElementById('signup-role').click(); 'ok'" >/dev/null; sleep 0.7
SU6=$(q "(function(){var s=document.getElementById('sheet-signup-role'); return (!s.hidden?'open':'closed') + '|centered:' + (Math.abs((s.getBoundingClientRect().left+s.getBoundingClientRect().right)/2-window.innerWidth/2)<80?'yes':'no')})()")
chk "شیت نقش: مودال مرکزی دسکتاپ · ۹ نقش" "$SU6" "open|centered:yes"
q "document.querySelectorAll('[data-su-role]')[4].click(); 'ok'" >/dev/null; sleep 0.5
SU7=$(q "document.getElementById('signup-role-val').textContent + '|' + document.getElementById('sheet-signup-role').hidden")
chk "انتخاب نقش (بازاریاب) → مقدار در فرم + شیت بسته" "$SU7" "بازاریاب|true"
q "document.getElementById('signup-industry').click(); 'ok'" >/dev/null; sleep 0.7
q "var i=document.getElementById('su-ind-search'); i.value='قنادی'; i.dispatchEvent(new Event('input',{bubbles:true})); 'ok'" >/dev/null; sleep 0.4
SU8=$(q "(function(){var rows=Array.prototype.map.call(document.querySelectorAll('#su-ind-list [data-su-ind] b'),function(x){return x.textContent}); return rows.join(',') + '|' + rows.length})()")
chk "جستجوی صنف «قنادی» → فقط قنادی (صنف=نوع کسب‌وکار FD-34)" "$SU8" "قنادی|1"
q "document.getElementById('su-ind-addopen').click(); document.getElementById('su-ind-new').value='تجهیزات دریایی'; document.getElementById('su-ind-add').click(); 'ok'" >/dev/null; sleep 0.5
SU9=$(q "document.getElementById('signup-industry-val').textContent + '|' + document.getElementById('sheet-signup-industry').hidden")
chk "صنف جدید ثبت می‌شود → مقدار در فرم + شیت بسته" "$SU9" "تجهیزات دریایی|true"
q "document.querySelectorAll('#s-signup .role-card')[0].click(); 'ok'" >/dev/null; sleep 0.4
SU9b=$(q "(function(){var ex=document.getElementById('su-mode-ex');var b=document.querySelector('#s-signup .su-modes .role-card.active');return b.textContent.trim()+'|'+(!ex.hidden&&ex.textContent.indexOf('بازاریابان')>-1?'ex-ok':'ex-BAD')})()")
chk "انتخاب «فروش عمده» → مثالِ همان حالت زیر دکمه‌ها (FD-34)" "$SU9b" "فروش عمده|ex-ok"
q "document.getElementById('signup-submit').click(); 'ok'" >/dev/null; sleep 1.2
SU10=$(q "document.querySelector('.screen:not([hidden])').id")
chk "فروش عمده → میز فروش (باگ اسکوپ role-card رفع شد)" "$SU10" "s-home-sell"
# ثبت‌نام sell-only بازوی خرید را خاموش می‌کند (رفتار درست محصول) —
# برای ادامهٔ تست‌ها هر دو بازو دوباره روشن شود.
q "iMach.assist.sell=true; iMach.assist.buy=true; iMach.applyArms(); 'ok'" >/dev/null; sleep 0.3
ovf "ثبت‌نام: بدون سرریز"

echo "─── ۴) میز خرید FD-41: سایدبار + ستون یگانهٔ dsk-tasks (هم‌قالب میز فروش) ───"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.9
D1=$(q "var tb=document.querySelector('#s-home-buy .tabbar'); getComputedStyle(tb).flexDirection + '|' + Math.round(tb.getBoundingClientRect().width) + '|' + (tb.querySelector('.dk-side-brand') ? 'brand' : 'no')")
chk "سایدبار عمودی ۲۵۶px با واژه‌نشان (FD-28: گرید ۲۵۶)" "$D1" "column|256|brand"
D2=$(q "var w=Math.max.apply(null, Array.prototype.map.call(document.querySelectorAll('#s-home-buy .rows .row'), function(r){return Math.round(r.getBoundingClientRect().top)})); var t=[]; document.querySelectorAll('#s-home-buy .rows .row').forEach(function(r){t.push(Math.round(r.getBoundingClientRect().top))}); var uniq=t.filter(function(v,i){return t.indexOf(v)===i}).length; uniq + 'rows-tops'")
chk "تسک‌ها زیر هم (هر کدام ردیف مستقل)" "$D2" "$(q "var t=[]; document.querySelectorAll('#s-home-buy .rows .row').forEach(function(r){t.push(Math.round(r.getBoundingClientRect().top))}); t.filter(function(v,i){return t.indexOf(v)===i}).length + 'rows-tops'")"
# FD-41: کانبان سه‌ستونهٔ FD-30 حذف — dsk-tasksِ میز فروش؛ ردیف‌ها فرزند مستقیم .rows
D3=$(q "(function(){var s=document.getElementById('s-home-buy');var r=s.querySelector('.body > .rows');var direct=r.children.length&&r.children[0].classList.contains('row')?'direct':'wrapped';return (r.classList.contains('dsk-tasks')?'tasks':'other')+'|'+document.querySelectorAll('#s-home-buy .dsk-col').length+'cols|'+direct+'|'+(s.querySelector('.dk-greet')?'greet-BAD':'nogreet')+'|'+(s.querySelector('.dk-quick')?'quick':'noquick')+'|'+s.querySelectorAll('.hint-line').length+'hint'})()")
chk "FD-41: dsk-tasks · بدون کانبان/خوشامد/hint · «دسترسی سریع»" "$D3" "tasks|0cols|direct|nogreet|quick|0hint"
D4=$(q "document.querySelectorAll('#s-home-buy .desk-duo .desk-tile').length + '|' + (function(){var ts=[]; document.querySelectorAll('#s-home-buy .desk-tile').forEach(function(t){ts.push(Math.round(t.getBoundingClientRect().top))}); return ts.filter(function(v,i){return ts.indexOf(v)===i}).length})()")
chk "چهار کاشی یک‌ردیف" "$D4" "4|1"
ovf "میز خرید: بدون سرریز"

echo "─── ۵) میز فروش: همان الگو ───"
q "iMach.show('s-home-sell', false); 'ok'" >/dev/null; sleep 0.9
S_ORD=$(q "document.querySelectorAll('#s-home-sell .rows .row .dk-ord').length + 'ord'")
S1=$(q "var tb=document.querySelector('#s-home-sell .tabbar'); getComputedStyle(tb).flexDirection + '|' + (tb.querySelector('.dk-side-brand') ? 'brand' : 'no')")
chk "میز فروش: سایدبار + واژه‌نشان + $S_ORD" "$S1|$S_ORD" "column|brand|$S_ORD"
ovf "میز فروش: بدون سرریز"

echo "─── ۵ب) میز فروش FD-34: کاشی فلت + کارت‌های تسک مجزا ───"
S2=$(q "(function(){var ic=document.querySelector('#s-home-sell .desk-tile .dt-ic');var cs=getComputedStyle(ic);return document.querySelectorAll('#s-home-sell .dt-chev').length+'chev|bg='+cs.backgroundColor+'|w='+cs.width})()")
chk "کاشی: بدون chevron · آیکون لخت (بدون قاب نارنجی؛ ۱۹px FD-34)" "$S2" "0chev|bg=rgba(0, 0, 0, 0)|w=19px"
S3=$(q "(function(){var b=document.querySelector('#s-home-sell .dt-stat b');var cs=getComputedStyle(b);var arm=getComputedStyle(document.querySelector('#s-home-sell .score-chip b')).color;return cs.fontSize+'|'+(cs.color!==arm?'gray':'arm-colored')})()")
chk "کاشی: شمار کوچک و غیررنگی (FD-34: ۱۱.۵px)" "$S3" "11.5px|gray"
S4=$(q "(function(){var b=document.getElementById('desk-cust-badge');if(!b)return 'nobadge';var cs=getComputedStyle(b);var top=Math.round(b.getBoundingClientRect().top)<Math.round(document.querySelector('#s-home-sell .desk-duo').getBoundingClientRect().top);return b.hidden+'|'+b.textContent+'|'+cs.backgroundColor+'|above='+top})()")
chk "نشان قرمز «۱» بالای کاشی مشتریان" "$S4" "false|۱|rgb(220, 38, 38)|above=true"
S5=$(q "(function(){var s=document.getElementById('s-home-sell');var r=s.querySelector('.body > .rows');return s.querySelectorAll('.hint-line').length+'hint|'+(r.classList.contains('dsk-tasks')?'tasks':'other')+'|'+(s.querySelector('.dk-greet')?'greet-BAD':'nogreet')+'|'+(s.querySelector('.dk-quick')?'quick':'noquick')})()")
chk "hint حذف · خوشامد حذف → «دسترسی سریع» (FD-34) · dsk-tasks" "$S5" "0hint|tasks|nogreet|quick"
S6=$(q "(function(){var rows=document.querySelectorAll('#s-home-sell .rows.dsk-tasks .row:not([hidden])');var cards=0;var w=Math.round(rows[0].getBoundingClientRect().width);rows.forEach(function(r){var cs=getComputedStyle(r);if(cs.borderLeftWidth!=='0px')cards++});var body=document.querySelector('#s-home-sell .dk-desk-main .body');return rows.length+'rows|cards='+cards+'|w='+w+'|bodyW='+Math.round(body.getBoundingClientRect().width)})()")
chk "هر تسک یک کارت (FD-34) · ستون یگانه ~۷۲۸ · بدنهٔ ۸۱۰ (۳۰%-, FD-35: ۲px قاب کاغذ)" "$S6" "4rows|cards=4|w=728|bodyW=810"
S6b=$(q "(function(){var hs=Array.prototype.map.call(document.querySelectorAll('#s-home-sell .rows.dsk-tasks .row:not([hidden])'),function(r){return Math.round(r.getBoundingClientRect().height)});var gap=getComputedStyle(document.querySelector('#s-home-sell .rows.dsk-tasks')).rowGap;return hs.join(',')+'|gap='+gap})()")
chk "ارتفاع همهٔ کارت‌ها یکسان (۸۴) · فاصلهٔ ۱۲ (FD-34)" "$S6b" "84,84,84,84|gap=12px"
S7=$(q "document.querySelector('#s-home-sell .st-b').textContent + '|' + (function(){var t=document.querySelector('#s-home-sell .rows.dsk-tasks .row:not([hidden]) .thumb');var cs=getComputedStyle(t);return cs.backgroundColor+'|'+cs.width})()")
chk "نشان «تکمیل اطلاعات» · آیکون ردیف‌ها هم لخت" "$S7" "تکمیل اطلاعات|rgba(0, 0, 0, 0)|22px"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.8
S9=$(q "(function(){var s=document.getElementById('s-home-buy');var ic=s.querySelector('.desk-tile .dt-ic');var bg=getComputedStyle(ic).backgroundColor;var b=document.getElementById('buy-desk-sup-badge');var num=s.querySelector('.desk-tile .dt-stat b');var numCs=getComputedStyle(num);return document.querySelectorAll('#s-home-buy .dt-chev').length+'chev|'+(bg!=='rgba(0, 0, 0, 0)'?'boxed':'bare')+'|'+document.querySelectorAll('#s-home-buy .dsk-col').length+'cols|badge='+(b&&!b.hidden?b.textContent:'none')+'|'+numCs.fontSize+'|'+(numCs.color!==getComputedStyle(s.querySelector('.score-chip b')).color?'gray':'arm-colored')})()")
chk "میز خرید FD-41: کاشی فلت مثل فروش — بدون chev · آیکون لخت · شمار کوچک خاکستری" "$S9" "0chev|bare|0cols|badge=۲|11.5px|gray"
S9b=$(q "(function(){var rows=document.querySelectorAll('#s-home-buy .rows.dsk-tasks .row');var cards=0;rows.forEach(function(r){var cs=getComputedStyle(r);if(cs.borderLeftWidth!=='0px')cards++});var vis=document.querySelectorAll('#s-home-buy .rows.dsk-tasks .row:not([hidden])');var hs=Array.prototype.map.call(vis,function(r){return Math.round(r.getBoundingClientRect().height)});var eq=hs.every(function(h){return h===hs[0]})&&hs[0]>=84?'equal84+':'unequal';var body=document.querySelector('#s-home-buy .dk-desk-main .body');return rows.length+'rows|cards='+cards+'|'+eq+'|gap='+getComputedStyle(document.querySelector('#s-home-buy .rows.dsk-tasks')).rowGap+'|bodyW='+Math.round(body.getBoundingClientRect().width)})()")
chk "میز خرید FD-41: هر تسک یک کارت · هم‌ارتفاع · فاصلهٔ ۱۲ · بدنهٔ ۸۱۰" "$S9b" "5rows|cards=5|equal84+|gap=12px|bodyW=810"
ovf "میز فروش FD-34: بدون سرریز"

echo "─── ۶) کاتالوک: گرید روان + نوار ابزار FD-35 ───"
q "iMach.show('s-catalog', false); 'ok'" >/dev/null; sleep 1.2
C1=$(q "var g=document.querySelector('#s-catalog .pgrid'); getComputedStyle(g).gridTemplateColumns.split(' ').length + 'cols'")
chk "گرید کالا ≥۳ ستونه (auto-fill)" "$C1" "$(q "var g=document.querySelector('#s-catalog .pgrid'); getComputedStyle(g).gridTemplateColumns.split(' ').length + 'cols'")"
# FD-39v2: چهار اکشن حالا ستونِ عمودیِ سایدبارند (موبایل همچنان گرید)
C2=$(q "var a=document.querySelector('#s-catalog .cat-actions'); getComputedStyle(a).display + '/' + getComputedStyle(a).flexDirection")
chk "FD-39: چهار اکشن = لیستِ عمودی در سایدبار" "$C2" "flex/column"
# FD-39v2: بدنه دیگر دوستونه نیست — نوار ابزار اولین فرزندِ خودِ بادی است
C3=$(q "(function(){var t=document.querySelector('#s-catalog .cat-toolbar');var sr=t.querySelector('.search-row');var add=t.querySelector('.cat-add');var first=document.querySelector('#s-catalog .dk-desk-main .body').firstElementChild;return (t&&first===t?'toolbar-first':'BAD-pos')+'|'+Math.round(sr.getBoundingClientRect().height)+'/'+Math.round(add.getBoundingClientRect().height)+'|'+getComputedStyle(add).backgroundColor+'|'+getComputedStyle(add.querySelector('.ca-tx')).color})()")
chk "FD-35: جستجو + محصول جدید تم‌پر ۴۸px — بالای ستون اصلی" "$C3" "toolbar-first|48/48|rgb(249, 115, 22)|rgb(255, 255, 255)"
C4=$(q "(function(){var a=document.querySelectorAll('#s-catalog .cat-actions .cat-act');var pb=document.getElementById('promo-box');return a.length+'btn|promo='+(pb&&pb.classList.contains('cat-act')?'compact':'BAD')+'|'+pb.textContent.trim()+'|oldbox='+document.querySelectorAll('#s-catalog .promo-box').length})()")
chk "FD-35: ویژه کردن فشرده میان دکمه‌ها — کادر تبلیغات حذف" "$C4" "4btn|promo=compact|ویژه کردن|oldbox=0"
# FD-39v2: سایدبار «مثل سایدبار اصلی» — راستِ صفحه، تمام‌قد، تخت،
# بیرون از کاغذِ محتوا (پوستهٔ dk-desk، نه کارتِ داخل بادی)
C4b=$(q "(function(){var side=document.querySelector('#s-catalog .cat-side');if(!side)return 'no-side';var links=side.querySelectorAll('.cat-actions .cat-act');var inMain=document.querySelectorAll('#s-catalog .dk-desk-main .cat-actions .cat-act').length;var secCols=getComputedStyle(document.getElementById('s-catalog')).gridTemplateColumns.split(' ').length;var st=getComputedStyle(side);var r=side.getBoundingClientRect();var brand=side.querySelector('.dk-side-brand')?1:0;var usr=side.querySelector('.dk-user')?1:0;return links.length+'links|inMain='+inMain+'|cols='+secCols+'|'+st.position+'/h'+Math.round(r.height)+'|right'+Math.round(r.right)+'|brand='+brand+'|user='+usr+'|frame='+st.borderRadius})()")
chk "FD-39v2: سایدبار مثل اصلی — ۴ لینک، ستون راست تمام‌قد، بی‌قاب" "$C4b" "4links|inMain=0|cols=2|sticky/h900|right1440|brand=1|user=1|frame=0px"
q "iMach.data.user.catalogPromo=true; 'ok'" >/dev/null; q "iMach.show('s-catalog', false); 'ok'" >/dev/null; sleep 1.1
C5=$(q "(function(){var pb=document.getElementById('promo-box');var cs=getComputedStyle(pb);var bd=[].map.call(document.querySelectorAll('#s-catalog .promo-badge'),function(b){return b.hidden?'h':'v'}).join('');iMach.data.user.catalogPromo=false;return pb.className+'|'+cs.backgroundColor+'|'+document.getElementById('promo-t').textContent+'|badges='+bd})()")
chk "FD-35: حالت ویژه — دکمهٔ سبز + بج روی کارت‌ها" "$C5" "cat-act on|rgb(240, 253, 244)|ویژه فعال است|badges=vvvv"
ovf "کاتالوک: بدون سرریز"

echo "─── ۶ب) FD-35: بوم + کاغذ سراسری (همهٔ صفحه‌ها) ───"
B1=$(q "(function(){var c=getComputedStyle(document.getElementById('phone')).backgroundColor;return c})()")
chk "بوم #phone = surface-3" "$B1" "rgb(240, 238, 232)"
q "iMach.show('s-contacts', false); 'ok'" >/dev/null; sleep 0.9
B2=$(q "(function(){var b=document.querySelector('#s-contacts .body');var c=getComputedStyle(b);return c.backgroundColor+'|bor='+(c.borderTopWidth!=='0px')+'|rad='+c.borderRadius+'|mt='+c.marginTop+'|w='+Math.round(b.getBoundingClientRect().width)})()")
chk "کاغذ dk-page (مخاطبین): bg/قاب/۲۲px/مارجین ۱۶" "$B2" "rgb(252, 251, 248)|bor=true|rad=22px|mt=16px|w=1120"
q "iMach.show('s-home-sell', false); 'ok'" >/dev/null; sleep 0.9
B3=$(q "(function(){var b=document.querySelector('#s-home-sell .dk-desk-main .body');var c=getComputedStyle(b);return c.backgroundColor+'|bor='+(c.borderTopWidth!=='0px')+'|mt='+c.marginTop+'|w='+Math.round(b.getBoundingClientRect().width)})()")
chk "کاغذ میز فروش (سایدباردار): قاب + ۸۱۰" "$B3" "rgb(252, 251, 248)|bor=true|mt=16px|w=810"
q "iMach.show('s-charge', false); 'ok'" >/dev/null; sleep 0.9
B4=$(q "(function(){var b=document.querySelector('#s-charge .body');var c=getComputedStyle(b);return c.backgroundColor+'|bor='+(c.borderTopWidth!=='0px')+'|pad='+c.paddingTop+'/'+c.paddingLeft+'|w='+Math.round(b.getBoundingClientRect().width)})()")
chk "کاغذ فرم dk-form (شارژ): ۶۲۰ + پدینگ کف" "$B4" "rgb(252, 251, 248)|bor=true|pad=36px/26px|w=620"
q "iMach.show('s-notifs', false); 'ok'" >/dev/null; sleep 0.9
B5=$(q "(function(){var b=document.querySelector('#s-notifs .body');return Math.round(b.getBoundingClientRect().width)+'|'+(getComputedStyle(b).borderTopWidth!=='0px'?'sheet':'flat')})()")
chk "کاغذ ستون باریک (اعلان‌ها): ۷۶۰" "$B5" "760|sheet"
q "iMach.show('s-landing', false); 'ok'" >/dev/null; sleep 1.2
B6=$(q "(function(){var s=document.getElementById('s-landing');var b=s.querySelector('.body');return getComputedStyle(s).backgroundColor+'|body-bor='+getComputedStyle(b).borderTopWidth+'|w='+Math.round(b.getBoundingClientRect().width)})()")
chk "استثنا — لندینگ: بوم کرم خودش، بدون کاغذ" "$B6" "rgb(252, 251, 248)|body-bor=0px|w=1440"
q "iMach.show('s-login', false); 'ok'" >/dev/null; sleep 0.8
B7=$(q "(function(){var b=document.querySelector('#s-login .body');return 'bor='+getComputedStyle(b).borderTopWidth+'|mt='+getComputedStyle(b).marginTop})()")
chk "استثنا — ورود: بدون کاغذ (اسپلیت dk-auth)" "$B7" "bor=0px|mt=0px"
q "iMach.show('s-chat', false); 'ok'" >/dev/null; sleep 0.8
B8=$(q "(function(){var b=document.querySelector('#s-chat .body');return 'bor='+getComputedStyle(b).borderTopWidth+'|bg='+getComputedStyle(b).backgroundColor})()")
chk "استثنا — چت: بوم surface-2 خودش" "$B8" "bor=0px|bg=rgb(247, 246, 242)"

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
CH1=$(q "var b=document.querySelector('#s-chat .body'); var c=getComputedStyle(b); var w=Math.round(b.clientWidth - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight)); (w > 850 && w < 950 ? 'col900' : 'w' + w) + '|' + Math.round(b.getBoundingClientRect().left)")
chk "بدنهٔ چت ~۹۰۰ وسچ (FD-35: ستونِ محتوا پس از رفعِ باگ کسکید)" "$CH1" "col900|0"
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
V3=$(q "var s=document.querySelector('#s-profile .dkp-side'); (s && s.querySelector('.card') ? 'profile-side' : 'no')")
chk "پروفایل: کارت پروفایل در ستون راست (dkp-side FD-30)" "$V3" "profile-side"

echo "─── ۱۲) فرم مرکزی (۱۳ افزودن محصول) ───"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.8
F1=$(q "var b=document.querySelector('#s-sell-add .body'); var w=Math.round(b.getBoundingClientRect().width); (w > 660 && w < 715 ? 'add688' : 'w' + w)")
chk "فرم افزودن ~۶۸۸ وسچ (FD-36: مثل موبایل، ۲۰٪ باریک‌تر از ۸۶۰)" "$F1" "add688"
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
MB1b=$(q "document.querySelectorAll('.rv-strip .rv-card').length + 'cards|' + getComputedStyle(document.querySelector('.rv-nav')).display + '|' + (document.querySelector('#s-landing .hero-shot') ? 'flat-img' : 'no-img') + '|' + document.querySelector('#s-landing .hero-cta .btn-primary').textContent + '|' + document.querySelectorAll('#lp-langs .lp-lang').length + 'lang'")
chk "موبایل: ۲۵ کارت نظر · بدون فلش · عکس فلت · «ساخت حساب» · نوار زبان" "$MB1b" "25cards|none|flat-img|ساخت حساب|4lang"
MB1c=$(q "(function(){var l=document.getElementById('lp-langs');return 'lang-in='+l.parentElement.className+'|'+getComputedStyle(l).justifyContent})()")
chk "موبایل لندینگ FD-34: زبان داخل بنر · وسط‌چین" "$MB1c" "lang-in=hero|center"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.8
MB2=$(q "var tb=document.querySelector('#s-home-buy .tabbar'); getComputedStyle(tb).flexDirection + '|' + (document.querySelector('#s-home-buy .dk-ord') ? 'ord-injected' : 'no-ord') + '|' + Math.round(document.getElementById('phone').getBoundingClientRect().width)")
chk "موبایل میز: تب‌بار افقی · بدون شماره · ۳۹۰" "$MB2" "row|no-ord|390"
# FD-41: موبایل میز خرید هم کاشی فلت گرفت (تعمیم FD-33) و hint حذف شد
MB2a=$(q "(function(){var s=document.getElementById('s-home-buy');var ic=s.querySelector('.desk-tile .dt-ic');var b=document.getElementById('buy-desk-sup-badge');var t=s.querySelector('.desk-tile');var h=Math.round(t.getBoundingClientRect().height);return document.querySelectorAll('#s-home-buy .dt-chev').length+'chev|'+getComputedStyle(ic).backgroundColor+'|badge='+(b&&!b.hidden?b.textContent:'none')+'|'+(h<=68?'compact':'h'+h)+'|hint='+s.querySelectorAll('.hint-line').length})()")
chk "موبایل میز خرید FD-41: آیکون لخت · بج ۲ · کاشی جمع · حذف hint" "$MB2a" "0chev|rgba(0, 0, 0, 0)|badge=۲|compact|hint=0"
MB2a2=$(q "(function(){var s=document.getElementById('s-home-buy');return ((s.querySelector('.dk-quick')||s.querySelector('.dsk-tasks'))?'inject-BAD':'clean')+'|'+getComputedStyle(s.querySelector('.body > .rows')).rowGap})()")
chk "موبایل میز خرید: بدون تزریق دسکتاپی FD-41 · gap ۸" "$MB2a2" "clean|8px"
q "iMach.show('s-home-sell', false); 'ok'" >/dev/null; sleep 0.8
MB2b=$(q "(function(){var s=document.getElementById('s-home-sell');var ic=s.querySelector('.desk-tile .dt-ic');var b=document.getElementById('desk-cust-badge');var t=s.querySelector('.desk-tile');var h=Math.round(t.getBoundingClientRect().height);return document.querySelectorAll('#s-home-sell .dt-chev').length+'chev|'+getComputedStyle(ic).backgroundColor+'|badge='+(b&&!b.hidden?b.textContent:'none')+'|'+(h<=68?'compact':'h'+h)+'|hint='+s.querySelectorAll('.hint-line').length})()")
chk "موبایل میز فروش FD-33: آیکون لخت · بج ۱ · کاشی جمع · حذف hint" "$MB2b" "0chev|rgba(0, 0, 0, 0)|badge=۱|compact|hint=0"
MB2c=$(q "(function(){var s=document.getElementById('s-home-sell');return ((s.querySelector('.dk-quick')||s.querySelector('.dsk-tasks'))?'inject-BAD':'clean')+'|'+getComputedStyle(s.querySelector('.body > .rows')).rowGap})()")
chk "موبایل میز فروش: بدون تزریق دسکتاپی FD-34 · gap ۸" "$MB2c" "clean|8px"
q "iMach.show('s-signup', false); 'ok'" >/dev/null; sleep 0.8
MB2d=$(q "(function(){q=document.querySelectorAll('#s-signup .su-modes .role-card'); return q.length+'modes|'+getComputedStyle(document.querySelector('#s-signup .su-modes')).flexDirection+'|'+(document.getElementById('su-mode-ex').hidden?'ex-hidden':'ex-BAD')+'|'+(document.querySelector('#s-signup .su-free')?'free-BAD':'free-gone')})()")
chk "موبایل ثبت‌نام: ۳ دکمهٔ کنار هم · مثال مخفی · su-free حذف (FD-34)" "$MB2d" "3modes|row|ex-hidden|free-gone"
q "iMach.show('s-login', false); 'ok'" >/dev/null; sleep 0.6
MB3=$(q "(document.querySelector('#s-login .dk-brand') ? 'brand-injected' : 'no-inject') + '|' + (document.querySelector('#s-login .sticky-bar').hidden ? 'sticky-off' : 'sticky-on')")
chk "موبایل ورود: بدون پنل برند · نوار روشن" "$MB3" "no-inject|sticky-on"
q "iMach.show('s-buy-rfq-new', false); 'ok'" >/dev/null; sleep 0.6
MB4=$(q "(document.querySelector('#s-buy-rfq-new .dkrf-side') ? 'split' : 'no-split')")
chk "موبایل استعلام: تک‌ستونه (بدون دوستونه)" "$MB4" "no-split"
q "iMach.show('s-catalog', false); 'ok'" >/dev/null; sleep 0.9
MB5=$(q "(function(){var t=document.querySelector('#s-catalog .cat-toolbar');var sr=t.querySelector('.search-row');var add=t.querySelector('.cat-add');var a=document.querySelector('#s-catalog .cat-actions');var b=document.querySelector('#s-catalog .body');var c=getComputedStyle(b);return Math.round(sr.getBoundingClientRect().height)+'/'+Math.round(add.getBoundingClientRect().height)+'|'+getComputedStyle(add).backgroundColor+'|'+a.querySelectorAll('.cat-act').length+'btn/'+getComputedStyle(a).gridTemplateColumns.split(' ').length+'col|oldbox='+document.querySelectorAll('#s-catalog .promo-box').length+'|sheet='+(c.borderTopWidth!=='0px'||c.marginTop!=='0px'?'BAD':'none')+'|ovf='+((b.scrollWidth-b.clientWidth>2)?'OVF':'ok')})()")
chk "موبایل کاتالوک FD-35: نوار ۴۴/۴۴ تم‌پر · ۴ دکمه ۲ستونی · بدون کادر تبلیغات و کاغذ" "$MB5" "44/44|rgb(249, 115, 22)|4btn/2col|oldbox=0|sheet=none|ovf=ok"
agent-browser set viewport 1440 900 >/dev/null 2>&1; sleep 1

echo "─── ۱۵) خطای کنسول ───"
E=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "صفر خطای JS (دسکتاپ+ریسایز+موبایل)" "$E" "CLEAN"

echo
echo "═══ FD-28: $pass ✓ / $fail ✗ ═══"
[[ $fail -eq 0 ]] && echo "PASS" || echo "FAIL"
