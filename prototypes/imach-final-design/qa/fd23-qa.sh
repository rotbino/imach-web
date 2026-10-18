#!/bin/bash
# FD-23 QA رفتاری — مفهوم کامل «درخواست تامین» + سطوح تطبیق دوطرفه (۳۲↔۳۱)
# ▸ ۳۲: نوار «شما تأمین‌کنندهٔ این کالاهای موردنیاز این خریدار هستید» + سورت/بج
# ▸ شیت پیشنهاد: قیمت+حداقل هر قلم، مچ خودکار کاتالوگ، ارسال بدون قلم (bare)
# ▸ قلم‌های پیشنهاد همان لحظه به کاتالوگ خودم می‌نشینند
# ▸ شیت افزودن: تک‌مقصد (حالت کاتالوگ حذف شد)
# ▸ ۳۱: «کالاهای موردنیاز تو در این کاتالوگ» + بج «در لیست خریدت»
set -u
cd /home/z/my-project/imach-web/prototypes/imach-final-design

PORT=8180
agent-browser open "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 1.8
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1

q() { agent-browser eval "$1" 2>&1 | tr -d '"' ; }
pass=0; fail=0
chk() {
  if [[ "$2" == *"$3"* ]]; then echo "✓ $1"; pass=$((pass+1));
  else echo "✗ $1 → got: $2"; fail=$((fail+1)); fi
}

echo "─── ۱) ۳۲ دید خودم: نوار تطبیق (کاتالوک من ∩ لیست من) ───"
q "iMach.show('s-buy-list-guest', false); 'ok'" >/dev/null; sleep 0.9
M1=$(q "!document.getElementById('blg-match').hidden ? 'shown' : 'hidden'")
chk "نوار «شما تأمین‌کنندهٔ این کالاهای…» دیده می‌شود" "$M1" "shown"
M2=$(q "document.querySelectorAll('#blg-match-row .ms-chip').length + '|' + document.querySelector('.ms-chip .ms-tx b').textContent + '|' + document.querySelector('.ms-chip .ms-tx small').textContent")
chk "چیپ تطبیق: برنج هاشمی گلستان + قیمت/حداقل من (۲٬۸۵۰٬۰۰۰ · ۵)" "$M2" "1|برنج هاشمی گلستان|۲٬۸۵۰٬۰۰۰ تومان · حداقل ۵"
M3=$(q "var a=document.getElementById('blg-match').getBoundingClientRect().top, b=document.getElementById('blg-srq').getBoundingClientRect().top; a<b?'above':'below'")
chk "نوار تطبیق بالاتر از کادر «درخواست تامین‌کنندگی» (حکم: بیار بالا)" "$M3" "above"
M4=$(q "document.querySelector('.ms-head b').textContent")
chk "عنوان نوار = جملهٔ مالک" "$M4" "شما تأمین‌کنندهٔ این کالاهای موردنیاز این خریدار هستید"
M5=$(q "document.querySelector('#blg-rows .blg-row .row-title').textContent.replace('در کاتالوک تو','*').trim() + ' || ' + document.querySelectorAll('#blg-rows .blg-row .row-title .badge').length")
chk "ردیف مچ‌شده اولِ لیست + نشان «در کاتالوک تو» (سورت بالاتر)" "$M5" "برنج هاشمی گلستان * || 1"
M6=$(q "document.querySelectorAll('#blg-rows .blg-row').length + '|' + document.querySelectorAll('#blg-rows .blg-row.blg-matched').length")
chk "۴ ردیف که ۱ تای آن مچ است" "$M6" "4|1"
M7=$(q "document.querySelector('.srq-sub').textContent")
chk "زیرعنوان کادر مینیمال نو شد (قلم اختیاری)" "$M7" "کالاها و قیمت‌هایت را مشخص کن — یا فقط درخواست بده"

echo "─── ۲) ۳۲ لیست نیما: تطبیق برنج فجر ───"
q "iMach.go('s-buy-list-guest', {buyer:'cu3'}); 'ok'" >/dev/null; sleep 0.9
M8=$(q "document.querySelector('.ms-chip .ms-tx b').textContent + '|' + document.querySelector('.ms-chip .ms-tx small').textContent")
chk "چیپ نیما: برنج فجر + ۲٬۴۸۰٬۰۰۰ · حداقل ۵" "$M8" "برنج فجر|۲٬۴۸۰٬۰۰۰ تومان · حداقل ۵"
M9=$(q "document.querySelector('#blg-rows .blg-row .row-title').textContent.replace('در کاتالوک تو','*').trim()")
chk "برنج فجر اول شد + نشان" "$M9" "برنج فجر *"
M10=$(q "document.querySelector('#blg-addstrip .as-tx b').textContent")
chk "نوار افزودن: فقط «به لیست خرید من» (مقصد کاتالوگ حذف)" "$M10" "افزودن کالاهای این لیست به لیست خرید من"

echo "─── ۳) شیت پیشنهاد v۲: مچ خودکار + فیلدها + گیتِ دکمه ───"
q "document.querySelector('.ms-chip').click(); 'ok'" >/dev/null; sleep 0.7
M11=$(q "document.querySelectorAll('#supply-goods .sprow.on').length + '|' + document.querySelector('.sprow.on .sprow-mb').textContent.trim()")
chk "چیپ → همان کالا پیش‌انتخاب + نشان «از کاتالوک تو»" "$M11" "1|از کاتالوک تو"
M12=$(q "document.querySelector('[data-spg-price=\"nl4\"]').value + '|' + document.querySelector('[data-spg-min=\"nl4\"]').value")
chk "قیمت/حداقل از کاتالوگ pre-fill (۲۴۸۰۰۰۰/۵)" "$M12" "2480000|5"
M13=$(q "document.getElementById('supply-send').disabled + '|' + document.getElementById('supply-send-tx').textContent")
chk "دکمه: «ارسال پیشنهاد تامین — ۱ قلم» روشن" "$M13" "false|ارسال پیشنهاد تامین — ۱ قلم"
q "document.querySelector('[data-spg=\"nl2\"]').click(); 'ok'" >/dev/null; sleep 0.4
M14=$(q "document.getElementById('supply-send').disabled + '|' + document.getElementById('supply-send-tx').textContent")
chk "قلم تازه بدون قیمت/حداقل ⇒ خاموش + راهنما" "$M14" "true|قیمت و حداقل ۱ کالا را وارد کن"
q "var p=document.querySelector('[data-spg-price=\"nl2\"]'); p.value='500000'; p.dispatchEvent(new Event('input',{bubbles:true})); 'ok'" >/dev/null; sleep 0.2
M15=$(q "document.getElementById('supply-send').disabled")
chk "فقط قیمت (بدون حداقل) هنوز خاموش" "$M15" "true"
q "var m=document.querySelector('[data-spg-min=\"nl2\"]'); m.value='2'; m.dispatchEvent(new Event('input',{bubbles:true})); 'ok'" >/dev/null; sleep 0.2
M16=$(q "document.getElementById('supply-send').disabled + '|' + document.getElementById('supply-send-tx').textContent")
chk "کامل ⇒ «ارسال پیشنهاد تامین — ۲ قلم»" "$M16" "false|ارسال پیشنهاد تامین — ۲ قلم"
q "var p2=document.querySelector('[data-spg-price=\"nl4\"]'); p2.value='2500000'; p2.dispatchEvent(new Event('input',{bubbles:true})); 'ok'" >/dev/null; sleep 0.2
M17=$(q "document.getElementById('supply-send').disabled + '|' + document.querySelector('[data-spg-price=\"nl4\"]').value")
chk "ویرایش فقط قیمتِ قلمِ مچ ⇒ حداقل کاتالوکی نمی‌ریزد (ادغام)" "$M17" "false|2500000"
q "document.querySelector('[data-sheet-close=\"sheet-supply\"]').click(); 'ok'" >/dev/null; sleep 0.4

echo "─── ۴) ارسال با قلم (لیست خودم): قلم تازه به کاتالوکم می‌نشیند ───"
# پارامتر buyerِ نیما پاک می‌شود تا بافت به لیست خودم برگردد
q "iMach.setSCREENParams('s-buy-list-guest', {}); iMach.show('s-buy-list-guest', false); 'ok'" >/dev/null; sleep 0.8
q "document.getElementById('supply-propose').click(); 'ok'" >/dev/null; sleep 0.6
q "document.querySelector('[data-spg=\"sl1\"]').click(); 'ok'" >/dev/null; sleep 0.4
q "document.querySelector('[data-spg=\"sl2\"]').click(); 'ok'" >/dev/null; sleep 0.4
q "var p=document.querySelector('[data-spg-price=\"sl2\"]'); p.value='980000'; p.dispatchEvent(new Event('input',{bubbles:true})); var m=document.querySelector('[data-spg-min=\"sl2\"]'); m.value='4'; m.dispatchEvent(new Event('input',{bubbles:true})); 'ok'" >/dev/null; sleep 0.3
M18=$(q "document.getElementById('supply-send').disabled + '|' + document.querySelector('[data-spg-price=\"sl1\"]').value")
chk "sl1 (مچ) خودکار کامل + sl2 پر شد ⇒ روشن" "$M18" "false|2850000"
q "document.getElementById('supply-send').click(); 'ok'" >/dev/null; sleep 0.8
M19=$(q "iMach.data.listings.length + '|' + iMach.data.listings[iMach.data.listings.length-1].name + '/' + iMach.data.listings[iMach.data.listings.length-1].price + '/' + iMach.data.listings[iMach.data.listings.length-1].min + '/' + iMach.data.listings[iMach.data.listings.length-1].justAdded")
chk "روغن سرخ‌کردنی به کاتالوگم افزود (۹۸۰۰۰۰/۴/justAdded)" "$M19" "5|روغن سرخ‌کردنی/980000/4/true"
M20=$(q "var s=iMach.data.suppliers[iMach.data.suppliers.length-1]; s.name + '|' + s.proposal.items.map(function(i){return i.name+':'+i.price+'/'+i.min}).join(',')")
chk "پیشنهاد آفتاب: ۲ قلم با قیمت/حداقل (مچ دست‌نخورده ۲۸۵۰/۵)" "$M20" "توزیع آفتاب|برنج هاشمی گلستان:2850000/5,روغن سرخ‌کردنی:980000/4"
M21=$(q "document.getElementById('supply-ok-ttl').textContent + ' ⊹ ' + document.getElementById('supply-ok-sub').textContent")
chk "نمای موفقیت: خریدار + ۲ قلم + «۱ کالای تازه به کاتالوک»" "$M21" "پیشنهاد تامینت ارسال شد ⊹ سوپرمارکت آریا ۲ قلم قیمتت را یک‌جا می‌بیند — ۱ کالای تازه هم به کاتالوگت اضافه شد"
M22=$(q "var n=iMach.data.notifications[0]; n.title + '|' + n.body")
chk "اعلان چندقلمی" "$M22" "پیشنهاد تامین جدید|«توزیع آفتاب» برای ۲ قلم کالا قیمت داد — بالای لیست خریدت."
q "document.querySelector('[data-sheet-close=\"sheet-supply\"]').click(); 'ok'" >/dev/null; sleep 0.4

echo "─── ۵) کارت چندقلمی در ۲۰ + تایید ⇒ شمار تأمین‌کنندهٔ کالاها ───"
q "iMach.go('s-buy-list'); 'ok'" >/dev/null; sleep 0.8
M23=$(q "document.querySelectorAll('#bl-proposals .blp-card').length + '|' + document.querySelectorAll('#bl-proposals .blp-it').length")
chk "۳ کارت پیشنهاد (su4 تک‌قلم + su5 دوقلم + آفتاب دوقلم = ۴ ردیف قلم)" "$M23" "3|4"
M24=$(q "var c=document.querySelectorAll('#bl-proposals .blp-card'); var last=c[c.length-1]; Array.from(last.querySelectorAll('.blp-it')).map(function(r){return r.textContent.replace(/\\s+/g,' ').trim()}).join(' ;; ')")
chk "ردیف‌های قلم: نام/بسته + حداقل + قیمت" "$M24" "برنج هاشمی گلستان کیسه ۵۰ کیلوییحداقل ۵۲٬۸۵۰٬۰۰۰ تومان ;; روغن سرخ‌کردنی بسته ۱۰ لیتریحداقل ۴۹۸۰٬۰۰۰ تومان"
q "var btns=document.querySelectorAll('#bl-proposals [data-sup-accept]'); btns[btns.length-1].click(); 'ok'" >/dev/null; sleep 0.7
M25=$(q "iMach.data.shoppingList.map(function(i){return i.name+':'+i.suppliersCount}).join(' | ')")
chk "تایید ⇒ شمار تأمین‌کنندهٔ هر دو کالا زنده شد (۳→۴ و ۲→۳)" "$M25" "برنج هاشمی گلستان:4 | روغن سرخ‌کردنی:3 | رب گوجه‌فرنگی:1 | قند:0"
M26=$(q "document.querySelectorAll('#bl-proposals .blp-card').length")
chk "کارت پذیرفته‌شده از فهرست رفت (۲ کارت ماند)" "$M26" "2"

echo "─── ۶) فقط‌درخواست (bare): بدون هیچ قلم و قیمتی ───"
q "iMach.go('s-buy-list-guest', {buyer:'cu3'}); 'ok'" >/dev/null; sleep 0.8
q "document.getElementById('supply-propose').click(); 'ok'" >/dev/null; sleep 0.6
M27=$(q "document.getElementById('supply-send').disabled + '|' + document.getElementById('supply-send-tx').textContent")
chk "صفر قلم ⇒ «ارسال درخواست تامین‌کنندگی» روشن (قلم اختیاری)" "$M27" "false|ارسال درخواست تامین‌کنندگی"
q "document.getElementById('supply-send').click(); 'ok'" >/dev/null; sleep 0.7
M28=$(q "var s=iMach.data.suppliers[iMach.data.suppliers.length-1]; s.name + '|' + s.proposal.bare + '|' + s.proposal.items.length")
chk "پیشنهاد bare ثبت شد (items=[] bare=true)" "$M28" "توزیع آفتاب|true|0"
M29=$(q "document.getElementById('supply-ok-ttl').textContent + ' ⊹ ' + (iMach.data.notifications[0].title + '|' + iMach.data.notifications[0].body)")
chk "موفقیت + اعلان «درخواست تامین‌کنندگی جدید»" "$M29" "درخواست تامین‌کنندگی‌ات ارسال شد ⊹ درخواست تامین‌کنندگی جدید|«توزیع آفتاب» درخواست تامین‌کنندگی داد — بدون قلم قیمت؛ کاتالوگش را می‌بینی."
q "document.querySelector('[data-sheet-close=\"sheet-supply\"]').click(); 'ok'" >/dev/null; sleep 0.4
q "iMach.go('s-buy-suppliers'); 'ok'" >/dev/null; sleep 0.7
M30=$(q "Array.from(document.querySelectorAll('#sup-list .cust-req .row-sub')).map(function(r){return r.textContent.trim()}).join(' ;; ')")
chk "دفتر ۲۲: سه شکل زیرمتن (تک‌قلم/چندقلمی/بدون‌قلم)" "$M30" "پیشنهاد تامین: برنج هاشمی — ۲٬۷۸۰٬۰۰۰ تومان ;; پیشنهاد تامین: ۲ قلم — برنج هاشمی · روغن سرخ‌کردنی ;; درخواست تامین‌کنندگی — بدون قلم قیمت"
q "var rows=document.querySelectorAll('#sup-list .cust-req .row'); rows[rows.length-1].click(); 'ok'" >/dev/null; sleep 0.8
M31=$(q "document.querySelector('#sv-pending .sv-prop-tx b').textContent + ' / ' + document.querySelector('#sv-pending .sv-prop-tx span').textContent")
chk "جزئیات ۲۳: کارت در انتظارِ بدون‌قلم + راهنمای کاتالوگ" "$M31" "فقط درخواست تامین‌کنندگی — بدون قلم قیمت / کاتالوک او را ببین؛ کالاهایش را از همین‌جا به لیستت اضافه کن"
q "iMach.go('s-buy-list'); 'ok'" >/dev/null; sleep 0.7
M32=$(q "document.querySelector('#bl-proposals .blp-bare') ? 'bare-card' : 'no'")
chk "کارت «فقط درخواست» در ۲۰ (بدون ردیف قلم/قیمت)" "$M32" "bare-card"

echo "─── ۷) شیت افزودن: تک‌مقصد ───"
q "iMach.go('s-buy-list-guest', {buyer:'cu3'}); 'ok'" >/dev/null; sleep 0.8
q "document.getElementById('blg-addstrip').click(); 'ok'" >/dev/null; sleep 0.5
M33=$(q "document.querySelectorAll('[data-lp-mode]').length + '|' + document.querySelector('#sheet-listpick .sheet-hdr h3').textContent")
chk "تب‌های مقصد حذف شدند — تک‌مقصد «افزودن به لیست خرید من»" "$M33" "0|افزودن به لیست خرید من"
q "document.querySelector('[data-lp-item=\"nl3\"]').click(); 'ok'" >/dev/null; sleep 0.4
M34=$(q "document.querySelectorAll('[data-lp-price]').length + '|' + document.getElementById('lp-add-tx').textContent + '|' + document.getElementById('lp-add').disabled")
chk "بدون فیلد قیمت/حداقل (آن‌ها فقط در پیشنهاد تامین‌اند)" "$M34" "0|افزودن ۱ کالا به لیست خرید|false"
q "document.getElementById('lp-add').click(); 'ok'" >/dev/null; sleep 0.5
M35=$(q "iMach.data.shoppingList.length + '|' + iMach.data.listings.length")
chk "افزودن به لیست خرید؛ کاتالوگ فقط از پیشنهاد رشد کرد (۵/۵)" "$M35" "5|5"

echo "─── ۸) ۳۱ کاتالوک: «کالاهای موردنیاز تو در این کاتالوگ» ───"
q "iMach.show('s-catalog-guest', false); 'ok'" >/dev/null; sleep 0.8
M36=$(q "document.getElementById('guest-needs-sec').hidden + '|' + document.getElementById('guest-all-title').textContent.replace(/\\s+/g,' ').trim() + '|' + document.querySelectorAll('#guest-grid .pcard').length")
chk "مهمان: بدون بخش نیاز — کاتالوک تمیز (قاعدهٔ FD-12)" "$M36" "true|محصولات این فروشنده|4"
q "iMach.forms.guestEnterAsCustomer('سوپرمارکت آریا'); 'ok'" >/dev/null; sleep 0.5
M37=$(q "document.getElementById('guest-needs-sec').hidden + '|' + document.querySelectorAll('#guest-needs-grid .pcard').length + '|' + document.getElementById('gn-count').textContent")
chk "مشتری: بخش نیاز با ۲ کارت (برنج هاشمی گلستان در دو بسته)" "$M37" "false|2|۲ کالا"
M38=$(q "document.getElementById('guest-all-title').textContent.replace(/\\s+/g,' ').trim() + '|' + document.querySelectorAll('#guest-grid .pcard:not(.hide-need)').length")
chk "بقیه زیر «سایر محصولات این فروشنده ۲ محصول»" "$M38" "سایر محصولات این فروشنده ۲ محصول|2"
M39=$(q "document.querySelector('#guest-needs-grid .b-need').textContent.trim() + ' + ' + document.querySelector('#guest-needs-grid .pprice').textContent.trim()")
chk "بج «در لیست خریدت» + قیمت هم‌زبانِ کارت‌ها" "$M39" "در لیست خریدت + ۲٬۸۵۰٬۰۰۰ تومان"
q "document.querySelector('#guest-needs-grid [data-add-cart]').click(); 'ok'" >/dev/null; sleep 0.5
M40=$(q "document.getElementById('guest-cart-badge').textContent + '|' + document.querySelector('#guest-needs-grid .addcart-btn').classList.contains('added')")
chk "سبد از کارتِ بخش نیاز کار می‌کند (حداقل ۵)" "$M40" "۵|true"

echo "─── ۹) پیش‌نمایش فروشنده نمی‌بیند ───"
q "iMach.go('s-catalog-guest', {preview:true}); 'ok'" >/dev/null; sleep 0.8
M41=$(q "document.getElementById('guest-needs-sec').hidden")
chk "پیش‌نمایش فروشنده: بخش نیاز مخفی (دید دیگران)" "$M41" "true"

echo "─── ۱۰) صفر خطا ───"
M42=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "کل جلسه بدون خطا" "$M42" "CLEAN"

echo ""
echo "=== FD-23 QA: $pass OK / $fail FAIL ==="
