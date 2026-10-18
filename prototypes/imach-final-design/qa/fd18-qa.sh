#!/bin/bash
# FD-18 QA رفتاری — حلقهٔ کامل سفارش تا بسته‌شدن
# ۰۹/۱۰/۲۸ پویا · پارامتر ردیف · پذیرش با اصلاح · رد · ارسال شد · تأیید تحویل (بسته‌شدن)
# سفارش سبدِ مهمان واقعاً ثبت می‌شود · اعلان‌های پویا · شمارندهٔ میزها · امتیاز اولین سفارش
set -u
cd /home/z/my-project/imach-web/prototypes/imach-final-design

PORT=8160
agent-browser open "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 1.8
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1

q() { agent-browser eval "$1" 2>&1 | tr -d '"' ; }
pass=0; fail=0
chk() {
  if [[ "$2" == *"$3"* ]]; then echo "✓ $1"; pass=$((pass+1));
  else echo "✗ $1 → got: $2"; fail=$((fail+1)); fi
}
clickok() { q "document.querySelector('#dialog button[data-dlg=\"1\"]').click(); 'ok'" >/dev/null; sleep 0.5; }

echo "─── ۱) ۰۹ دفتر فروشنده: رندر پویا و سه بخش ───"
q "iMach.show('s-sell-orders', false); 'ok'" >/dev/null; sleep 0.6
C1=$(q "document.getElementById('sell-orders-sub').textContent")
chk "زیرعنوان: ۲ سفارش جدید" "$C1" "۲ سفارش جدید"
C2=$(q "document.querySelectorAll('#sell-orders-host .row[data-ord-go]').length")
chk "۵ سفارش رندر شده (oi1..oi5)" "$C2" "5"
C3=$(q "document.querySelectorAll('#sell-orders-host .section-title h2')[0].textContent")
chk "بخش ۱ = نیازمند پاسخ" "$C3" "نیازمند پاسخ"
C4=$(q "document.querySelectorAll('#sell-orders-host .section-title h2')[1].textContent")
chk "بخش ۲ = در جریان" "$C4" "در جریان"
C5=$(q "document.querySelectorAll('#sell-orders-host .section-title h2')[2].textContent")
chk "بخش ۳ = بایگانی" "$C5" "بایگانی"
C6=$(q "var r=document.querySelectorAll('#sell-orders-host .row[data-ord-go]'); var oi4=[].slice.call(r).find(function(x){return x.dataset.ordGo==='oi4'}); oi4? oi4.querySelector('.row-title').textContent : 'none'")
chk "سفارش چندقلمی: «روغن · ۴۰ بطری … ۲ قلم»" "$C6" "۲ قلم"

echo "─── ۲) ناوبری پارامتری: هر ردیف → سفارش خودش ───"
q "var r=[].slice.call(document.querySelectorAll('#sell-orders-host .row[data-ord-go]')).find(function(x){return x.dataset.ordGo==='oi4'}); r.click(); 'ok'" >/dev/null; sleep 0.7
C7=$(q "document.getElementById('sov-sub').textContent")
chk "۱۰ برای oi4: «روغن سرخ‌کردنی … + ۱ قلم»" "$C7" "+ ۱ قلم"
C8=$(q "document.querySelectorAll('#sov-host .ord-it').length")
chk "۲ قلم رندر شده در ۱۰" "$C8" "2"
C9=$(q "document.querySelector('#sov-host .ord-total b').textContent")
chk "جمع کل خودکار (۴۰×۹۸۰۰۰ + ۲۴×۶۲۰۰۰ = ۵٬۴۰۸٬۰۰۰)" "$C9" "۵٬۴۰۸٬۰۰۰"
C10=$(q "document.querySelectorAll('#sov-host .otl-st').length")
chk "خط زمانی ۴ گام" "$C10" "4"
C11=$(q "document.querySelector('#sov-host .otl-st.cur b').textContent")
chk "گام جاری oi4 = ارسال کالا" "$C11" "ارسال کالا"
C12=$(q "document.getElementById('sov-chat').hidden === false ? 'yes' : 'no'")
chk "دکمهٔ «گفتگو با مشتری» در حالت sent دیده می‌شود" "$C12" "yes"

echo "─── ۳) پذیرش با اصلاح مقدار/قیمت (oi1) ───"
q "iMach.go('s-sell-order-view', {id:'oi1'}); 'ok'" >/dev/null; sleep 0.7
C13=$(q "document.querySelectorAll('[data-ov-qty]').length")
chk "فرم اصلاح (۱ قلم) در وضعیت new" "$C13" "1"
q "document.querySelector('[data-ov-qty=\"0\"]').value='18'; document.querySelector('[data-ov-price=\"0\"]').value='2800000'; document.getElementById('ov-note').value='ارسال فردا صبح'; 'ok'" >/dev/null
q "document.getElementById('sov-accept').click(); 'ok'" >/dev/null; sleep 0.6
C14=$(q "iMach.data.ordersIn[0].status")
chk "oi1 → accepted" "$C14" "accepted"
C15=$(q "iMach.data.ordersIn[0].items[0].qty")
chk "مقدار اصلاح‌شده ذخیره شد (۱۸)" "$C15" "18"
C16=$(q "iMach.data.ordersIn[0].items[0].unitPrice")
chk "قیمت اصلاح‌شده ذخیره شد (۲٬۸۰۰٬۰۰۰)" "$C16" "2800000"
C17=$(q "iMach.data.ordersIn[0].history.length")
chk "رویداد پذیرش به تاریخچه افزود (۲)" "$C17" "2"
C18=$(q "iMach.data.notifications[0].title")
chk "اعلان «سفارش پذیرفته شد» ساخت" "$C18" "سفارش پذیرفته شد"
C19=$(q "document.getElementById('sov-send').hidden === false ? 'yes' : 'no'")
chk "۱۰ حالا «ارسال شد» نشان می‌دهد" "$C19" "yes"

echo "─── ۴) رد سفارش (oi2) ───"
q "iMach.go('s-sell-order-view', {id:'oi2'}); 'ok'" >/dev/null; sleep 0.7
q "document.getElementById('sov-reject').click(); 'ok'" >/dev/null; sleep 0.5
clickok
C20=$(q "var o=iMach.data.ordersIn.filter(function(x){return x.id==='oi2'})[0]; o.status")
chk "oi2 → rejected" "$C20" "rejected"
C21=$(q "document.getElementById('sov-bar').hidden === true ? 'yes' : 'no'")
chk "نوار اکشن در حالت بسته مخفی" "$C21" "yes"

echo "─── ۵) ارسال شد (oi1) ───"
q "iMach.go('s-sell-order-view', {id:'oi1'}); 'ok'" >/dev/null; sleep 0.7
q "document.getElementById('sov-send').click(); 'ok'" >/dev/null; sleep 0.5
clickok
C22=$(q "iMach.data.ordersIn[0].status")
chk "oi1 → sent" "$C22" "sent"
C23=$(q "iMach.data.notifications[0].title")
chk "اعلان «سفارش ارسال شد» ساخت" "$C23" "سفارش ارسال شد"

echo "─── ۶) ۲۸ دفتر خریدار: پویا + منوی سه‌نقطه ───"
q "iMach.show('s-buy-orders', false); 'ok'" >/dev/null; sleep 0.6
C24=$(q "document.querySelectorAll('#buy-orders-host .row[data-ord-side=\"buy\"]').length")
chk "۲ سفارش خریدار (oo1+oo2)" "$C24" "2"
C25=$(q "document.querySelectorAll('#buy-orders-host .row[data-ord-side=\"buy\"] [data-order-cancel]').length")
chk "منوی گزینه‌ها برای سفارش لغوکردنی (oo1=accepted → ۱)" "$C25" "1"

echo "─── ۷) ۳۹ نمای خریدار: تأیید تحویل = بسته‌شدن کامل ───"
q "iMach.go('s-buy-order-view', {id:'oo1'}); 'ok'" >/dev/null; sleep 0.7
C26=$(q "document.getElementById('bov-sub').textContent")
chk "۳۹ برای oo1: «برنج طارم · ۱۰ کیسه»" "$C26" "برنج طارم · ۱۰ کیسه"
C27=$(q "document.getElementById('bov-deliver').hidden === false ? 'yes' : 'no'")
chk "oo1 در وضعیت accepted → «تأیید تحویل» مخفی (فقط sent)" "$C27" "no"
q "iMach.data.ordersOut[0].status='sent'; iMach.forms.buyOrderViewRender(); 'ok'" >/dev/null; sleep 0.4
C28=$(q "document.getElementById('bov-deliver').hidden === false ? 'yes' : 'no'")
chk "در وضعیت sent → «تأیید تحویل» دیده می‌شود" "$C28" "yes"
q "document.getElementById('bov-deliver').click(); 'ok'" >/dev/null; sleep 0.5
clickok
C29=$(q "iMach.data.ordersOut[0].status")
chk "oo1 → delivered (بسته شد)" "$C29" "delivered"
C30=$(q "iMach.data.notifications[0].title")
chk "اعلان «سفارش تحویل شد» ساخت" "$C30" "سفارش تحویل شد"
C31=$(q "document.getElementById('bov-reorder').hidden === false ? 'yes' : 'no'")
chk "در بایگانی → «سفارش دوباره» ظاهر شد" "$C31" "yes"

echo "─── ۸) حلقهٔ امتیاز: اولین سفارش موفق ───"
C32=$(q "iMach.data.scoreItemsSell.filter(function(x){return x.id==='sc7'})[0].done")
chk "sc7 «اولین سفارش فروش» انجام‌شده" "$C32" "true"
C33=$(q "iMach.data.scoreItemsBuy.filter(function(x){return x.id==='sb7'})[0].done")
chk "sb7 «اولین سفارش خرید» انجام‌شده" "$C33" "true"

echo "─── ۹) اعلان‌ها پویا ───"
q "iMach.show('s-notifs', false); 'ok'" >/dev/null; sleep 0.6
C34=$(q "document.querySelectorAll('#notifs-host .row').length >= 6 ? 'yes' : 'no'")
chk "اعلان‌های رویدادی رندر شدند (۳ اولیه + ۳ تازه)" "$C34" "yes"
C35=$(q "document.getElementById('notifs-sub').textContent")
chk "شمارندهٔ اعلان تازه" "$C35" "اعلان تازه"

echo "─── ۱۰) شمارندهٔ زندهٔ میزها ───"
q "iMach.show('s-home-sell', false); 'ok'" >/dev/null; sleep 0.6
C36=$(q "document.getElementById('sell-desk-orders-t').textContent")
chk "میز فروش: ۰ سفارش جدید (هر دو پاسخ داده شدند)" "$C36" "۰ سفارش جدید"
C37=$(q "document.getElementById('sell-desk-orders-row').hidden === true ? 'yes' : 'no'")
chk "ردیف سفارش تازه مخفی شد (کار تمام)" "$C37" "yes"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.6
C38=$(q "document.getElementById('buy-desk-orders-t').textContent")
chk "میز خرید: ۰ سفارش جاری (بسته شد)" "$C38" "۰ سفارش جاری"

echo "─── ۱۱) سفارش سبد مهمان واقعاً ثبت می‌شود ───"
q "iMach.show('s-catalog-guest', false); 'ok'" >/dev/null; sleep 0.8
q "document.querySelector('[data-add-cart]').click(); 'ok'" >/dev/null; sleep 0.4
q "document.getElementById('guest-cart-btn').click(); 'ok'" >/dev/null; sleep 0.6
q "document.getElementById('cart-order').click(); 'ok'" >/dev/null; sleep 0.6
C39=$(q "document.getElementById('sheet-account').classList.contains('show') || document.getElementById('sheet-account').hidden === false ? 'yes' : 'no'")
chk "گیت حساب در ثبت سفارش باز شد" "$C39" "yes"
q "document.getElementById('acc-phone').value='09121110000'; document.getElementById('acc-name').value='مهدی کاظمی'; document.getElementById('acc-submit').click(); 'ok'" >/dev/null; sleep 0.9
C40=$(q "iMach.data.ordersOut[0].status")
chk "سفارش جدید سبد → new" "$C40" "new"
C41=$(q "iMach.data.ordersOut[0].items.length")
chk "سفارش سبد با اقلام واقعی" "$C41" "1"
C42=$(q "document.getElementById('cart-success').hidden === false ? 'yes' : 'no'")
chk "نمای موفقیت سبد" "$C42" "yes"
q "document.getElementById('cart-track').click(); 'ok'" >/dev/null; sleep 0.8
C43=$(q "document.querySelector('.screen:not([hidden])').id")
chk "پیگیری → دفتر سفارش‌های خریدار (۲۸)" "$C43" "s-buy-orders"
C44=$(q "document.querySelectorAll('#buy-orders-host .row[data-ord-side=\"buy\"] [data-order-cancel]').length")
chk "سفارش تازه (new) منوی لغو دارد" "$C44" "1"

echo "─── ۱۲) لغو سفارش از شیت گزینه‌ها ───"
q "document.querySelector('#buy-orders-host [data-order-cancel]').click(); 'ok'" >/dev/null; sleep 0.5
C45=$(q "document.getElementById('sheet-ord-menu').classList.contains('show') ? 'yes' : 'no'")
chk "شیت گزینه‌های سفارش باز شد" "$C45" "yes"
q "document.querySelector('#ocm-list [data-ocm-act=\"cancel\"]').click(); 'ok'" >/dev/null; sleep 0.5
clickok
C46=$(q "iMach.data.ordersOut[0].status")
chk "سفارش سبد → cancelled" "$C46" "cancelled"

echo "─── ۱۳) فیلتر مشتری از دفتر مشتریان (۰۸) ───"
# ثبت‌نام مهمانِ بخش ۱۱ دستیار فروش را خاموش کرده (نقش خرید) — دموی
# چندنقشی: هر دو بازو روشن می‌شود تا صفحهٔ فروش هم قابل آزمایش باشد
q "iMach.assist.sell = true; iMach.assist.buy = true; iMach.applyArms(); 'ok'" >/dev/null; sleep 0.4
q "iMach.show('s-customers', false); 'ok'" >/dev/null; sleep 0.6
q "var b=[].slice.call(document.querySelectorAll('#s-customers [data-cust-menu]')).find(function(x){return x.dataset.custMenu.indexOf('رستوران مهر')>-1}); b&&b.click(); 'ok'" >/dev/null; sleep 0.6
q "document.querySelector('#ccm-list [data-ccm=\"orders\"]').click(); 'ok'" >/dev/null; sleep 0.7
C47=$(q "document.querySelector('.screen:not([hidden])').id")
chk "ناوبری به دفتر سفارش" "$C47" "s-sell-orders"
C48=$(q "document.getElementById('sell-orders-sub').textContent")
chk "زیرعنوان فیلتر: «فقط رستوران مهر»" "$C48" "فقط رستوران مهر"
C49=$(q "document.querySelectorAll('#sell-orders-host .row[data-ord-go]').length")
chk "فقط سفارش‌های همان مشتری (۲)" "$C49" "2"

echo "─── ۱۴) صفر خطای JS ───"
C50=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "کل جلسه بدون خطا" "$C50" "CLEAN"

echo ""
echo "=== FD-18 QA: $pass OK / $fail FAIL ==="
