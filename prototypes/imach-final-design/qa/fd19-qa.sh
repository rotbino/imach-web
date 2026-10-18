#!/bin/bash
# FD-19 QA رفتاری — «پیشنهادهای تامین» بالای لیست خرید (حکم مالک) + حلقهٔ ۳۲ + اعلان‌های استعلام
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

echo "─── ۱) لیست خرید: بخش پیشنهادها بالای کالاها (حکم مالک) ───"
q "iMach.show('s-buy-list', false); 'ok'" >/dev/null; sleep 0.7
C1=$(q "document.getElementById('bl-proposals').hidden === false && document.getElementById('bl-proposals').children.length ? 'yes' : 'no'")
chk "بخش «پیشنهادهای تامین» رندر شده" "$C1" "yes"
C2=$(q "document.querySelectorAll('#bl-proposals .blp-card').length")
chk "۲ کارت پیشنهاد (su4+su5)" "$C2" "2"
C3=$(q "var p=document.getElementById('bl-proposals').getBoundingClientRect().top, r=document.getElementById('buylist-rows').getBoundingClientRect().top; p < r ? 'above' : 'below'")
chk "پیشنهادها بالای کالاها — نه زیرشان (حکم مالک)" "$C3" "above"
C4=$(q "document.querySelector('#bl-proposals .blp-card .blp-tx b').textContent")
chk "کارتی اول: «شالی‌زار طالب»" "$C4" "شالی‌زار طالب"
C5=$(q "document.querySelector('#bl-proposals .blp-card .blp-p').textContent")
chk "قیمت پیشنهادی: ۲٬۷۸۰٬۰۰۰ تومان" "$C5" "۲٬۷۸۰٬۰۰۰"
C6=$(q "document.querySelector('#bl-proposals .blp-card .badge').textContent")
chk "بج «پیشنهاد تامین»" "$C6" "پیشنهاد تامین"

echo "─── ۲) تایید پیشنهاد از لیست خرید ───"
q "document.querySelector('#bl-proposals [data-sup-accept=\"su4\"]').click(); 'ok'" >/dev/null; sleep 0.6
C7=$(q "var s=iMach.data.suppliers.filter(function(x){return x.id==='su4'})[0]; s.isNew + '/' + (s.proposal===null)")
chk "su4 تایید شد (isNew=false، پیشنهاد پاک شد)" "$C7" "false/true"
C8=$(q "var it=iMach.data.shoppingList.filter(function(x){return x.id==='sl1'})[0]; it.suppliersCount")
chk "کالای «برنج هاشمی گلستان» حالا ۴ تأمین‌کننده دارد" "$C8" "4"
C9=$(q "document.querySelectorAll('#bl-proposals .blp-card').length")
chk "۱ کارت پیشنهاد ماند" "$C9" "1"
C10=$(q "var chip=[].slice.call(document.querySelectorAll('#buylist-rows .bl-card')).find(function(c){return c.textContent.indexOf('برنج هاشمی گلستان')>-1}); chip? (chip.textContent.indexOf('۴ تأمین‌کننده')>-1 ? 'live' : 'stale') : 'none'")
chk "چیپ «۴ تأمین‌کننده» در کارت کالا زنده شد" "$C10" "live"

echo "─── ۳) حذف پیشنهاد از لیست خرید ───"
q "document.querySelector('#bl-proposals [data-sup-reject=\"su5\"]').click(); 'ok'" >/dev/null; sleep 0.5
clickok
C11=$(q "iMach.data.suppliers.filter(function(x){return x.id==='su5'}).length")
chk "su5 حذف شد" "$C11" "0"
C12=$(q "document.getElementById('bl-proposals').hidden === true || document.getElementById('bl-proposals').children.length === 0 ? 'empty' : 'notempty'")
chk "بخش پیشنهادها خالی/مخفی شد" "$C12" "empty"

echo "─── ۴) حلقهٔ فروشنده: ارسال پیشنهاد از لیست عمومی (۳۲) ───"
q "iMach.show('s-buy-list-guest', false); 'ok'" >/dev/null; sleep 0.7
q "document.getElementById('supply-propose').click(); 'ok'" >/dev/null; sleep 0.6
C13=$(q "document.getElementById('sheet-supply').classList.contains('show') ? 'open' : 'closed'")
chk "شیت «پیشنهاد تامین» باز شد" "$C13" "open"
# FD-23: اولین ردیف = برنج هاشمی گلستان (مچ با کاتالوگ — سورت بالاتر)؛
# فیلدهای قیمت/حداقل زیر ردیف باز می‌شوند و قیمت از کاتالوگ pre-fill است.
q "document.querySelector('.sprow').click(); 'ok'" >/dev/null; sleep 0.3
q "var p=document.querySelector('[data-spg-price=\"sl1\"]'); p.value='2900000'; p.dispatchEvent(new Event('input',{bubbles:true})); 'ok'" >/dev/null; sleep 0.2
q "document.getElementById('supply-send').click(); 'ok'" >/dev/null; sleep 0.6
C14=$(q "var s=iMach.data.suppliers[iMach.data.suppliers.length-1]; s.name + '/' + s.isNew + '/' + s.proposal.items[0].price + '/' + s.proposal.items[0].min")
chk "تأمین‌کنندهٔ جدید «توزیع آفتاب» با پیشنهاد ۲۹۰۰۰۰۰ ثبت شد" "$C14" "توزیع آفتاب/true/2900000/5"
C15=$(q "iMach.data.notifications[0].title + '|' + iMach.data.notifications[0].type")
chk "اعلان «پیشنهاد تامین جدید» (type=supply)" "$C15" "پیشنهاد تامین جدید|supply"
q "iMach.show('s-buy-list', false); 'ok'" >/dev/null; sleep 0.7
C16=$(q "document.querySelectorAll('#bl-proposals .blp-card').length")
chk "پیشنهاد تازه بالای لیست خرید نشست (جلوی چشم)" "$C16" "1"

echo "─── ۵) اعلان‌های استعلام (نکتهٔ باز FD-14) ───"
q "iMach.go('s-buy-offer-view', {offer:'of1'}); 'ok'" >/dev/null; sleep 0.7
q "document.querySelector('[data-accept-offer]').click(); 'ok'" >/dev/null; sleep 0.5
clickok
C17=$(q "iMach.data.notifications[0].title")
chk "اعلان «پیشنهاد پذیرفته شد» به فروشنده" "$C17" "پیشنهاد پذیرفته شد"
C18=$(q "var r=iMach.data.rfqsOut.filter(function(x){return x.id==='ro1'})[0]; r.status + '/' + (r.result||'').slice(0,12)")
chk "استعلام ro1 بسته شد با نتیجهٔ پذیرش" "$C18" "done/پذیرفت: پخش"
sleep 1.2  # پذیرش بعد از ۰.۷ث خودش به ۲۴ می‌رود — قبل از ناوبری بعدی صبر کن
q "iMach.go('s-buy-offers', {rfq:'ro2'}); 'ok'" >/dev/null; sleep 0.8
q "document.querySelector('[data-close-rfq]').click(); 'ok'" >/dev/null; sleep 0.5
clickok
C19=$(q "iMach.data.notifications[0].title")
chk "اعلان «استعلام بسته شد» به تأمین‌کنندگان" "$C19" "استعلام بسته شد"

echo "─── ۶) اعلان‌ها صفحهٔ ۱۷ همه را نشان می‌دهد ───"
q "iMach.show('s-notifs', false); 'ok'" >/dev/null; sleep 0.6
C20=$(q "document.querySelectorAll('#notifs-host .row').length >= 5 ? 'yes' : 'no'")
chk "اعلان‌های زنده رندر شدند (۵+)" "$C20" "yes"
C21=$(q "document.querySelector('#notifs-host .row .row-title').textContent")
chk "تازه‌ترین اعلان اولِ فهرست" "$C21" "استعلام بسته شد"

echo "─── ۷) صفر خطا ───"
C22=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "کل جلسه بدون خطا" "$C22" "CLEAN"

echo ""
echo "=== FD-19 QA: $pass OK / $fail FAIL ==="
