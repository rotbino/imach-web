#!/bin/bash
# FD-15 QA رفتاری — هدر میزها با نام کسب‌وکار + ابزارهای ثبت سریع (اسکنر/متن)
# + سایرِ کنار‌هم + غیب‌شدن کادرهای سوییچ + گرید پویای کاتالوگ + ذخیرهٔ توضیحات + حذف واقعی
set -u
cd /home/z/my-project/imach-web/prototypes/imach-final-design

agent-browser open "http://127.0.0.1:8140/index.html" >/dev/null 2>&1
sleep 1.8
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1

q() { agent-browser eval "$1" 2>&1 | tr -d '"' ; }
pass=0; fail=0
chk() { # $1=عنوان $2=خروجی $3=انتظار (substr)
  if [[ "$2" == *"$3"* ]]; then echo "✓ $1"; pass=$((pass+1));
  else echo "✗ $1 → got: $2"; fail=$((fail+1)); fi
}

echo "─── ۱) هدر میزها: نام کسب‌وکار (حکم مالک) ───"
q "iMach.show('s-home-sell', false); 'ok'" >/dev/null; sleep 0.5
T1=$(q "document.querySelector('#s-home-sell .appbar .title').textContent.trim()")
chk "میز فروش: عنوان = میز فروش سوپرمارکت آریا" "$T1" "میز فروش سوپرمارکت آریا"
L1=$(q "document.querySelector('#s-home-sell .brand-logo').textContent.trim()")
chk "میز فروش: لوگو = آ" "$L1" "آ"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.5
T2=$(q "document.querySelector('#s-home-buy .appbar .title').textContent.trim()")
chk "میز خرید: عنوان = میز خرید سوپرمارکت آریا" "$T2" "میز خرید سوپرمارکت آریا"

echo "─── ۲) یکسان‌سازی شخصیت دمو (b1 = سوپرمارکت آریا) ───"
q "iMach.show('s-cat-edit', false); 'ok'" >/dev/null; sleep 0.6
N1=$(q "document.getElementById('cate-pv-name').textContent.trim()")
chk "۳۶ پیش‌نمایش: سوپرمارکت آریا" "$N1" "سوپرمارکت آریا"
q "iMach.show('s-edit-business', false); 'ok'" >/dev/null; sleep 0.5
N2=$(q "document.querySelector('#s-edit-business .field .input').value")
chk "۱۶ ویرایش کسب‌وکار: سوپرمارکت آریا" "$N2" "سوپرمارکت آریا"

echo "─── ۳) گرید پویای کاتالوگ (۴ محصول از دیتا) ───"
q "iMach.show('s-catalog', false); 'ok'" >/dev/null; sleep 0.7
C1=$(q "document.querySelectorAll('#cat-grid .pcard').length + '|' + document.querySelector('#cat-count').textContent")
chk "۴ کارت + شمار «۴ محصول»" "$C1" "4|۴ محصول"
C2=$(q "document.querySelector('#cat-grid .pcard[data-lid=\\\"l2\\\"]').className.indexOf('stale')>-1 ? 'stale-ok':'no'")
chk "کارت l2 منقضی (stale) از دیتا" "$C2" "stale-ok"

echo "─── ۴) ابزارهای ثبت سریع روی جستجو ───"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.6
U1=$(q "document.querySelectorAll('.search-row .sr-tool').length")
chk "سه آیکون (اسکنر + متن + کپی — FD-22) ته سرچ‌باکس" "$U1" "3"

echo "─── ۵) اسکنر بارکد ───"
q "document.getElementById('add-scan-open').click(); 'ok'" >/dev/null; sleep 0.5
S1=$(q "var sh=document.getElementById('sheet-scan'); (!sh.hidden && sh.classList.contains('show')) ? 'open':'no'")
chk "شیت اسکنر باز" "$S1" "open"
q "document.getElementById('scan-demo').click(); 'ok'" >/dev/null; sleep 0.3
S2=$(q "document.getElementById('scan-result').querySelector('.nm').textContent")
chk "بارکد نمونه ⇒ پفک اشی مشی ۱۰۰ گرمی" "$S2" "پفک اشی مشی ۱۰۰ گرمی"
q "document.getElementById('scan-continue').click(); 'ok'" >/dev/null; sleep 0.6
S3=$(q "(!document.getElementById('add-step-3').hidden) + '|' + document.querySelector('#add-final-card .nm').textContent")
chk "ادامه ⇒ گام ۳ با محصول پرشده" "$S3" "true|پفک اشی مشی"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.5
q "document.getElementById('add-scan-open').click(); 'ok'" >/dev/null; sleep 0.4
q "var i=document.getElementById('scan-code'); i.value='111122223333'; iMach.forms.scanGo(); 'ok'" >/dev/null; sleep 0.2
S4=$(q "document.getElementById('scan-result').textContent.indexOf('پیدا نشد')>-1 ? 'hint-ok':'no'")
chk "بارکد ناشناس ⇒ راهنمایی جستجو/ثبت دستی" "$S4" "hint-ok"

echo "─── ۶) سایر بسته‌بندی: دو فیلد کنار هم ───"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.5
q "iMach.forms.addPickRef('r1'); 'ok'" >/dev/null; sleep 0.3
q "var o=[].filter.call(document.querySelectorAll('#add-pack-chips .chip'),function(c){return c.textContent.trim()==='سایر'})[0]; o.click(); 'ok'" >/dev/null; sleep 0.2
P1=$(q "var a=document.getElementById('add-pack-label').getBoundingClientRect(), b=document.getElementById('add-pack-qty').getBoundingClientRect(); Math.abs(a.top-b.top)<2 ? 'row-ok':'stacked'")
chk "بسته‌بندی + تعداد در بسته در یک ردیف" "$P1" "row-ok"

echo "─── ۷) تبدیل متن به کالا ───"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.5
q "document.getElementById('add-text-open').click(); 'ok'" >/dev/null; sleep 0.5
q "document.getElementById('tx-demo').click(); document.getElementById('tx-parse').click(); 'ok'" >/dev/null; sleep 0.4
X1=$(q "document.querySelectorAll('#tx-rows .tx-row').length + '|' + document.getElementById('tx-review-sub').textContent")
chk "۶ کالا خوانده شد — ۴ تاییدشده" "$X1" "6|۶ کالا از متن خوانده شد — ۴ تاییدشده"
X2=$(q "var st=[].map.call(document.querySelectorAll('#tx-rows .tx-status'),function(s){return s.className.replace('tx-status ','')}); st.join(',')")
chk "وضعیت‌ها: تطبیق/تکرار/ناقص (ok+dup+err)" "$X2" "ok,dup,ok,ok,ok,err"
q "document.querySelector('[data-tx-chk=\\\"3\\\"]').click(); 'ok'" >/dev/null; sleep 0.2
X3=$(q "document.getElementById('tx-confirm-tx').textContent")
chk "تیک خاموش ⇒ «۳ کالای تاییدشده»" "$X3" "۳ کالای تاییدشده"
q "document.querySelector('[data-tx-chk=\\\"3\\\"]').click(); 'ok'" >/dev/null; sleep 0.2
q "document.getElementById('tx-back').click(); 'ok'" >/dev/null; sleep 0.2
X4=$(q "!document.getElementById('tx-paste').hidden && document.getElementById('tx-input').value.length>0 ? 'keep-ok':'no'")
chk "«اصلاح متن» ⇒ برگشت با حفظ متن" "$X4" "keep-ok"
q "document.getElementById('tx-parse').click(); document.getElementById('tx-confirm').click(); 'ok'" >/dev/null; sleep 1.0
X5=$(q "document.querySelectorAll('#cat-grid .pcard').length + '|' + document.querySelector('#cat-count').textContent + '|' + [].filter.call(document.querySelectorAll('#cat-grid .pcard'),function(c){return c.textContent.indexOf('تازه افزوده')>-1}).length")
chk "۴ کالا اضافه شد ⇒ ۸ محصول + ۴ نشان «تازه افزوده»" "$X5" "8|۸ محصول|4"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.5
q "document.getElementById('add-text-open').click(); 'ok'" >/dev/null; sleep 0.4
q "document.getElementById('tx-demo').click(); document.getElementById('tx-parse').click(); 'ok'" >/dev/null; sleep 0.4
X6=$(q "[].filter.call(document.querySelectorAll('#tx-rows .tx-status'),function(s){return s.classList.contains('dup')}).length + '|' + document.getElementById('tx-confirm').disabled")
chk "تکرارِ متن یکسان ⇒ ۵ تکراری + دکمهٔ خاموش" "$X6" "5|true"

echo "─── ۸) متن فاصلهٔ تکی (واتساپ خام) ───"
q "document.querySelector('#sheet-textlist .mg').click(); 'ok'" >/dev/null; sleep 0.4
q "document.getElementById('add-text-open').click(); 'ok'" >/dev/null; sleep 0.4
q "document.getElementById('tx-input').value='پفک نمکی اشی مشی کارتن ۲۴ عددی ۱۱۵۰۰۰۰ ۳\nشیر پرچرب پگاه بسته ۱۲ عددی ۹۶۰۰۰۰'; document.getElementById('tx-parse').click(); 'ok'" >/dev/null; sleep 0.4
W1=$(q "document.querySelector('#tx-rows .tx-row .tx-info b').textContent + ' / ' + document.querySelector('#tx-rows .tx-row .tx-info small').textContent")
chk "تجزیهٔ فاصلهٔ تکی: نام/برند/بسته/قیمت/حداقل" "$W1" "پفک نمکی · اشی مشی / کارتن ۲۴ عددی — قیمت هر بسته: ۱٬۱۵۰٬۰۰۰"

echo "─── ۹) ویرایش: سوییچ‌ها کادرها را غیب می‌کنند + توضیحات ───"
q "iMach.go('s-sell-edit',{id:'l1'}); 'ok'" >/dev/null; sleep 0.7
E1=$(q "document.getElementById('edit-note').value.indexOf('انبار رشت')>-1 ? 'note-ok':'no'")
chk "توضیحات از دیتا پر می‌شود" "$E1" "note-ok"
q "document.getElementById('ed-vol-on').click(); 'ok'" >/dev/null; sleep 0.3
E2=$(q "document.getElementById('ed-vol-list').offsetParent===null && document.getElementById('ed-vol-add').offsetParent===null ? 'hidden-ok':'visible'")
chk "سوییچ حجمی خاموش ⇒ کادرها غیب" "$E2" "hidden-ok"
q "document.getElementById('ed-grp-on').click(); 'ok'" >/dev/null; sleep 0.3
E3=$(q "document.getElementById('egd-list').offsetParent===null ? 'hidden-ok':'visible'")
chk "سوییچ گروهی خاموش ⇒ کادرها غیب" "$E3" "hidden-ok"
q "document.getElementById('ed-vol-on').click(); 'ok'" >/dev/null; sleep 0.3
E4=$(q "document.getElementById('ed-vol-list').offsetParent!==null && iMach.data.listings[0].volumeTiers.length>0 ? 'back-ok':'no'")
chk "روشن‌کردن دوباره ⇒ کادرها برمی‌گردند + دادهٔ حفظ‌شده" "$E4" "back-ok"
q "document.getElementById('edit-note').value='تست FD-15: توضیح جدید'; document.querySelector('[data-edit-save]').click(); 'ok'" >/dev/null; sleep 0.9
E5=$(q "var l=iMach.data.listings.filter(function(x){return x.id==='l1'})[0]; l.note")
chk "ذخیرهٔ توضیحات در دیتا" "$E5" "تست FD-15: توضیح جدید"

echo "─── ۱۰) حذف واقعی محصول ───"
q "iMach.go('s-sell-edit',{id:'l4'}); 'ok'" >/dev/null; sleep 0.7
q "document.querySelector('[data-delete-item]').click(); 'ok'" >/dev/null; sleep 0.5
q "var d=document.querySelector('.dialog.show'); [].filter.call(d.querySelectorAll('button'),function(b){return b.textContent.indexOf('حذف محصول')>-1})[0].click(); 'ok'" >/dev/null; sleep 0.9
D1=$(q "!iMach.data.listings.some(function(l){return l.id==='l4'}) + '|' + document.querySelectorAll('#cat-grid .pcard').length")
chk "l4 از دیتا حذف + کارت‌ها تازه شدند" "$D1" "true|7"

echo "─── ۱۱) صفر خطای جاوااسکریپت ───"
Z1=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "بدون خطای JS" "$Z1" "CLEAN"

echo ""
echo "═══ FD-15 QA: $pass ✓ / $fail ✗ ═══"
