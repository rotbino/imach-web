#!/bin/bash
# FD-22 QA رفتاری — بازطراحی دید عمومی لیست خرید + ابزارهای لیست/کاتالوگ + تصمیم‌های ۹گانه
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
clickok() { q "document.querySelector('#dialog button[data-dlg=\"1\"]').click(); 'ok'" >/dev/null; sleep 0.5; }

echo "─── ۱) دید عمومی لیست خرید — کادر مینیمال بالا (حکم مالک) ───"
q "iMach.show('s-buy-list-guest', false); 'ok'" >/dev/null; sleep 0.8
C1=$(q "document.querySelector('#s-buy-list-guest .callout') ? 'still-there' : 'removed'")
chk "کادر متنی قدیمی حذف شد (حکم: «این رو بردار»)" "$C1" "removed"
C2=$(q "document.getElementById('blg-srq') ? 'yes' : 'no'")
chk "کادر مینیمال «درخواست تامین‌کنندگی» هست" "$C2" "yes"
C3=$(q "var p=document.getElementById('blg-srq').getBoundingClientRect().top, r=document.getElementById('blg-rows').getBoundingClientRect().top; p<r?'above':'below'")
chk "کادر تامین بالای کالاها (حکم: «بیاری بالا»)" "$C3" "above"
C4=$(q "var t=document.getElementById('blg-srq').textContent; (t.indexOf('خریدار عمده است')>-1 || t.indexOf('کاتالوگت را ذخیره می‌کند')>-1 || t.length>350) ? 'verbose' : 'minimal'")
chk "کادر مینیمال — بدون نوشته‌های اضافه (حکم: نه با همهٔ نوشته‌ها)" "$C4" "minimal"
C5=$(q "document.getElementById('blg-nm').textContent + '|' + document.getElementById('blg-meta').textContent")
chk "هویت خودم: سوپرمارکت آریا / احمد رضایی (یکدستی دو میز)" "$C5" "سوپرمارکت آریا|احمد رضایی · سوپرمارکت · رشت · خریدار عمده"
C6=$(q "!document.getElementById('blg-cond-link').hidden ? 'link' : 'hidden'")
chk "لینک «شرایط درخواست تامین» فقط لینک — دیده می‌شود" "$C6" "link"

echo "─── ۲) دو لیست: استعلام افقی + کالاهای موردنیاز عمودی ───"
C7=$(q "!document.getElementById('blg-inq-sec').hidden && document.querySelectorAll('.blinq-card').length")
chk "«کالاهای در حال استعلام» = ۲ کارت افقی" "$C7" "2"
C8=$(q "document.querySelector('.blinq-card .bi-days').textContent")
chk "نشان مهلت روی کارت استعلام" "$C8" "۳ روز"
C9=$(q "document.querySelectorAll('#blg-rows .blg-row').length")
chk "«کالاهای موردنیاز» = ۴ ردیف عمودی پویا" "$C9" "4"
C10=$(q "document.querySelectorAll('#blg-rows .blg-offer').length")
chk "هر کالا دکمهٔ «پیشنهاد» دارد" "$C10" "4"
C11=$(q "var b=document.querySelector('.blinq'); getComputedStyle(b).overflowX")
chk "نوار استعلام افقی اسکرول می‌شود" "$C11" "auto"
C12=$(q "document.getElementById('blg-st-goods').textContent + '/' + document.getElementById('blg-st-sups').textContent")
chk "آمار زنده: ۴ کالا / ۳ تأمین‌کنندهٔ تاییدشده" "$C12" "۴/۳"

echo "─── ۳) نوار پایین: تماس · گفتگو (ارسال پیام فعال) · پیشنهاد ───"
C13=$(q "document.querySelectorAll('#s-buy-list-guest .gbar .gbar-btn').length")
chk "۳ دکمهٔ نوار پایین مثل کاتالوگ عمومی" "$C13" "3"
q "document.querySelector('[data-blg-chat]').click(); 'ok'" >/dev/null; sleep 0.6
C14=$(q "document.querySelector('.screen:not([hidden])').id + '|' + (!document.getElementById('chat-ctx').hidden ? document.getElementById('chat-ctx-tx').textContent : 'no-ctx')")
chk "گفتگو → چت با زمینهٔ «لیست خرید سوپرمارکت آریا»" "$C14" "s-chat|دربارهٔ: لیست خرید سوپرمارکت آریا"

echo "─── ۴) شیت شرایط (مدال از پایین) ───"
q "iMach.show('s-buy-list-guest', false); 'ok'" >/dev/null; sleep 0.6
q "document.getElementById('blg-cond-link').click(); 'ok'" >/dev/null; sleep 0.5
C15=$(q "document.getElementById('sheet-cond').classList.contains('show') ? 'open' : 'closed'")
chk "شیت شرایط از پایین باز شد" "$C15" "open"
C16=$(q "document.querySelectorAll('#cond-body .cond-row').length")
chk "۴ ردیف شرط تیک‌دار (متن «·» جدا)" "$C16" "4"
q "document.querySelector('[data-sheet-close=\"sheet-cond\"]').click(); 'ok'" >/dev/null; sleep 0.4

echo "─── ۵) لیست نیما (پارامتر buyer از دفتر مشتری) ───"
q "iMach.go('s-buy-list-guest', {buyer:'cu3'}); 'ok'" >/dev/null; sleep 0.8
C17=$(q "document.getElementById('blg-nm').textContent + '|' + document.getElementById('blg-av').textContent")
chk "هویت نیما + آواتار «ن»" "$C17" "سوپرمارکت نیما|ن"
C18=$(q "!document.getElementById('blg-addstrip').hidden ? 'strip' : 'hidden'")
chk "نوار «افزودن کالاهای این لیست» فقط برای لیست دیگری" "$C18" "strip"
C19=$(q "document.querySelectorAll('#blg-rows .blg-row').length")
chk "کالاهای نیما (پفک/گوشت/سبزی/فجر)" "$C19" "4"
C20=$(q "document.querySelectorAll('.blinq-card').length + '|' + document.querySelector('.blinq-card b').textContent")
chk "استعلام‌های نیما (گوشت/سبزی)" "$C20" "2|گوشت چرخ‌کرده"

echo "─── ۶) افزودن کالاهای لیست نیما → لیست خرید من ───"
q "document.getElementById('blg-addstrip').click(); 'ok'" >/dev/null; sleep 0.6
C21=$(q "document.getElementById('sheet-listpick').classList.contains('show') ? 'open' : 'closed'")
chk "شیت listpick باز شد" "$C21" "open"
C22=$(q "document.querySelectorAll('#lp-rows .pl-row').length + '|' + document.querySelectorAll('#lp-rows .pl-row').length")
chk "لیست ردیفی تک‌ستونه + جستجو (۴ ردیف)" "$C22" "4|4"
C23=$(q "document.querySelector('#lp-rows .pl-row').offsetWidth / document.getElementById('lp-rows').offsetWidth > 0.9 ? 'full-row' : 'grid'")
chk "ردیف تمام‌عرض (نه دو ستونی)" "$C23" "full-row"
q "document.querySelector('[data-lp-item=\"nl1\"]').click(); 'ok'" >/dev/null; sleep 0.4
C24=$(q "document.getElementById('lp-add-tx').textContent")
chk "دکمه: «افزودن ۱ کالا به لیست خرید»" "$C24" "افزودن ۱ کالا به لیست خرید"
q "document.getElementById('lp-add').click(); 'ok'" >/dev/null; sleep 0.6
C25=$(q "var s=iMach.data.shoppingList; s.length + '|' + s[s.length-1].name + '|' + s[s.length-1].q")
chk "پفک نمکی با مقدار/دورهٔ خودش به لیست من افزود" "$C25" "5|پفک نمکی|۳۰ کارتن ۵۰ عددی · ماهانه"

echo "─── ۷) FD-23: شیت تک‌مقصد — حالت کاتالوگ حذف شد (قلم‌های پیشنهاد خودشان می‌نشینند) ───"
q "document.getElementById('blg-addstrip').click(); 'ok'" >/dev/null; sleep 0.5
C26=$(q "document.querySelectorAll('[data-lp-mode]').length + '|' + document.querySelector('#sheet-listpick .sheet-hdr h3').textContent + '|' + document.getElementById('blg-addstrip').querySelector('.as-tx b').textContent")
chk "حالت «به کاتالوگ من» حذف شد — تک‌مقصد (حکم مالک FD-23)" "$C26" "0|افزودن به لیست خرید من|افزودن کالاهای این لیست به لیست خرید من"
q "document.querySelector('[data-lp-item=\"nl3\"]').click(); 'ok'" >/dev/null; sleep 0.4
C27=$(q "document.querySelectorAll('[data-lp-price]').length + '|' + document.querySelectorAll('[data-lp-min]').length + '|' + document.getElementById('lp-add-tx').textContent + '|' + document.getElementById('lp-add').disabled")
chk "انتخاب ساده — بدون فیلد قیمت/حداقل (آن‌ها در پیشنهاد تامین‌اند)" "$C27" "0|0|افزودن ۱ کالا به لیست خرید|false"
q "document.getElementById('lp-add').click(); 'ok'" >/dev/null; sleep 0.6
C29=$(q "var l=iMach.data.listings; var s=iMach.data.shoppingList; l.length + '|' + s.length + '|' + s[s.length-1].name + '|' + l[l.length-1].name")
chk "سبزی خشک به لیست خرید من رفت؛ کاتالوگ دست‌نخورده" "$C29" "4|6|سبزی خشک مخلوط|برنج فجر"

echo "─── ۸) جستجوی شیت ───"
q "document.getElementById('blg-addstrip').click(); 'ok'" >/dev/null; sleep 0.5
q "var e=document.getElementById('lp-search'); e.value='گوشت'; e.dispatchEvent(new Event('input',{bubbles:true})); 'ok'" >/dev/null; sleep 0.4
C30=$(q "document.querySelectorAll('#lp-rows .pl-row').length")
chk "جستجوی «گوشت» ⇒ ۱ ردیف" "$C30" "1"
q "document.querySelector('[data-sheet-close=\"sheet-listpick\"]').click(); 'ok'" >/dev/null; sleep 0.4

echo "─── ۹) پیشنهاد با پیش‌انتخاب (کارت استعلام/دکمهٔ ردیف) ───"
q "document.querySelector('[data-blg-inq]').click(); 'ok'" >/dev/null; sleep 0.5
C31=$(q "document.querySelectorAll('#supply-goods .sprow.on').length + '|' + document.querySelector('#supply-goods .sprow.on b').textContent")
chk "کارت استعلام → شیت پیشنهاد با همان کالا پیش‌انتخاب" "$C31" "1|گوشت چرخ‌کرده"

echo "─── ۱۰) ضدفیلتر پیشنهاد (تصمیم ۵/۹) — FD-23: فیلدهای قیمت/حداقل ───"
q "var p=document.querySelector('[data-spg-price=\"nl2\"]'); p.value='100000'; p.dispatchEvent(new Event('input',{bubbles:true})); var m=document.querySelector('[data-spg-min=\"nl2\"]'); m.value='3'; m.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('supply-send').click(); 'ok'" >/dev/null; sleep 0.6
C32=$(q "var s=iMach.data.suppliers; s.length + '|' + s[s.length-1].name + '|' + s[s.length-1].proposal.items[0].price + '|' + iMach.data.listings.length")
chk "پیشنهاد اول ثبت شد + قلم تازه به کاتالوگم نشست (۶/آفتاب/۱۰۰۰۰۰/۵)" "$C32" "6|توزیع آفتاب|100000|5"
q "document.querySelector('[data-sheet-close=\"sheet-supply\"]').click(); 'ok'" >/dev/null; sleep 0.5
q "iMach.suppliers.supplyOpen('nl1'); 'ok'" >/dev/null; sleep 0.4
q "var p=document.querySelector('[data-spg-price=\"nl1\"]'); p.value='90000'; p.dispatchEvent(new Event('input',{bubbles:true})); var m=document.querySelector('[data-spg-min=\"nl1\"]'); m.value='2'; m.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('supply-send').click(); 'ok'" >/dev/null; sleep 0.5
C33=$(q "iMach.data.suppliers.length + '|' + document.getElementById('supply-ok').hidden")
chk "پیشنهاد دوم رد شد — یک پیشنهاد باز به ازای لیست" "$C33" "6|true"
q "document.querySelector('[data-sheet-close=\"sheet-supply\"]').click(); 'ok'" >/dev/null; sleep 0.4

echo "─── ۱۱) ۳۱: شیت انتخاب ردیفی + مقدار/دورهٔ الزامی ───"
q "iMach.show('s-catalog-guest', false); 'ok'" >/dev/null; sleep 0.7
q "iMach.forms.picklistOpen(); 'ok'" >/dev/null; sleep 0.6
C34=$(q "document.querySelectorAll('#pl-grid .pl-row').length + '|' + document.querySelectorAll('#pl-grid .pl-item').length")
chk "لیست ردیفی (نه گرید دوستونی) — ۵ ردیف (سبزیِ تازه + ۴)" "$C34" "5|0"
q "document.querySelector('[data-pl-item=\"l3\"]').click(); 'ok'" >/dev/null; sleep 0.4
C35=$(q "document.querySelector('[data-pl-qty=\"l3\"]').value")
chk "مقدار پیش‌فرض = حداقل خرید (۱۰)" "$C35" "10"
C36=$(q "document.getElementById('pl-add-tx').textContent + '|' + document.getElementById('pl-add').disabled")
chk "بدون دوره: «مقدار و دورهٔ ۱ کالا…» خاموش" "$C36" "مقدار و دورهٔ ۱ کالا را مشخص کن|true"
q "document.querySelector('[data-pl-per=\"l3\"][data-val=\"ماهانه\"]').click(); 'ok'" >/dev/null; sleep 0.4
C37=$(q "document.getElementById('pl-add-tx').textContent + '|' + document.getElementById('pl-add').disabled")
chk "با دوره: «افزودن ۱ کالا به لیست خرید» روشن" "$C37" "افزودن ۱ کالا به لیست خرید|false"
q "document.getElementById('pl-add').click(); 'ok'" >/dev/null; sleep 0.6
C38=$(q "var s=iMach.data.shoppingList; s[s.length-1].name + '|' + s[s.length-1].q")
chk "q = «۱۰ کیسه ۱۰ کیلویی · ماهانه» (مقدار+دوره)" "$C38" "برنج هاشمی گلستان|۱۰ کیسه ۱۰ کیلویی · ماهانه"
q "document.querySelector('[data-sheet-close=\"sheet-picklist\"]').click(); 'ok'" >/dev/null; sleep 0.4

echo "─── ۱۲) کپی از کاتالوگ (۱۳) ───"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.7
C39=$(q "document.querySelectorAll('.sr-tools .sr-tool').length")
chk "آیکون سوم کنار اسکن/متن" "$C39" "3"
q "document.getElementById('add-copy-open').click(); 'ok'" >/dev/null; sleep 0.5
q "document.getElementById('cc-phone').value='0912'; document.getElementById('cc-find-btn').click(); 'ok'" >/dev/null; sleep 0.4
C40=$(q "document.querySelector('#cc-result .notfound-line') ? 'hint' : 'none'")
chk "شمارهٔ ناقص → راهنما (نه کارت)" "$C40" "hint"
q "document.getElementById('cc-phone').value='09122203361'; document.getElementById('cc-find-btn').click(); 'ok'" >/dev/null; sleep 0.5
C41=$(q "document.querySelector('#cc-result .ccat-found .nm').textContent.trim() + '|' + document.querySelector('#cc-result .ccat-count b').textContent")
chk "کاتالوگ پیدا شد: پخش برنج پارس · ۶ کالا" "$C41" "پخش برنج پارس|۶"
C42=$(q "document.getElementById('cc-copy-btn').textContent.trim()")
chk "دکمهٔ «کپی ۴ کالا» (۲ تکراری رد)" "$C42" "کپی ۴ کالا به کاتالوگ من"
q "document.getElementById('cc-copy-btn').click(); 'ok'" >/dev/null; sleep 0.6
C43=$(q "iMach.data.listings.length + '|' + !document.getElementById('cc-done').hidden + '|' + document.getElementById('cc-done-ttl').textContent")
chk "۴ کالا کپی شد (۹ محصول) + نمای موفقیت" "$C43" "9|true|۴ کالا کپی شد"
q "document.getElementById('cc-go-catalog').click(); 'ok'" >/dev/null; sleep 0.8
C44=$(q "document.querySelector('.screen:not([hidden])').id + '|' + document.getElementById('cat-count').textContent")
chk "رفتن به کاتالوگ → ۹ محصول زنده" "$C44" "s-catalog|۹ محصول"

echo "─── ۱۳) ویرایش شرایط (۲۰ — سمت خریدار) ───"
q "iMach.show('s-buy-list', false); 'ok'" >/dev/null; sleep 0.7
C45=$(q "document.querySelectorAll('#s-buy-list .cat-actions .cat-act').length")
chk "باکس دکمه‌ها چهارتایی شد (شرایط تامین رسید)" "$C45" "4"
q "document.getElementById('buylist-cond').click(); 'ok'" >/dev/null; sleep 0.5
C46=$(q "(document.getElementById('sheet-buycond').classList.contains('show')) + '|' + (document.getElementById('buycond-text').value.indexOf('تأمین‌کننده‌های رشت و حومه') > -1)")
chk "شیت ویرایش شرایط با متن فعلی" "$C46" "true|true"
q "document.getElementById('buycond-text').value='فقط رشت · فاکتور رسمی'; document.getElementById('buycond-save').click(); 'ok'" >/dev/null; sleep 0.5
C47=$(q "iMach.data.buyListInfo.conditions")
chk "ذخیرهٔ شرایط در دیتا" "$C47" "فقط رشت · فاکتور رسمی"
q "iMach.setSCREENParams('s-buy-list-guest', {}); iMach.show('s-buy-list-guest', false); 'ok'" >/dev/null; sleep 0.6
q "document.getElementById('blg-cond-link').click(); 'ok'" >/dev/null; sleep 0.5
C48=$(q "document.querySelectorAll('#cond-body .cond-row').length")
chk "دید عمومی = متن تازه (۲ شرط)" "$C48" "2"
q "document.querySelector('[data-sheet-close=\"sheet-cond\"]').click(); 'ok'" >/dev/null; sleep 0.4

echo "─── ۱۴) پیشنهاد پذیرفته‌شده ← سفارش (تصمیم ۲/۹) ───"
q "iMach.go('s-buy-offer-view', {offer:'of1'}); 'ok'" >/dev/null; sleep 0.8
q "document.getElementById('ovf-accept').click(); 'ok'" >/dev/null; sleep 0.5
clickok
sleep 0.8
C49=$(q "document.querySelector('.screen:not([hidden])').id + '|' + !document.getElementById('ovf-order').hidden")
chk "پذیرش: همان‌جا ماند + دکمهٔ «ثبت سفارش با همین شرایط»" "$C49" "s-buy-offer-view|true"
q "document.querySelector('[data-offer-order]').click(); 'ok'" >/dev/null; sleep 0.9
C50=$(q "document.querySelector('.screen:not([hidden])').id + '|' + iMach.data.ordersOut[0].supplier + '|' + iMach.data.ordersOut[0].items[0].qty + '|' + iMach.data.ordersOut[0].items[0].unitPrice + '|' + iMach.data.rfqsOut.filter(function(x){return x.id==='ro1'})[0].ordered")
chk "سفارش واقعی: پخش برنج پارس · ۲۰ کیسه × ۲٬۸۴۰٬۰۰۰" "$C50" "s-buy-order-view|پخش برنج پارس|20|2840000|true"
C51=$(q "iMach.data.ordersIn[0].buyer + '|' + iMach.data.ordersIn[0].status")
chk "سمت فروشنده هم سفارش را می‌بیند (جدید)" "$C51" "سوپرمارکت آریا|new"

echo "─── ۱۵) مهلت ۷ روزهٔ خودکار (تصمیم ۱/۹) ───"
q "iMach.data.ordersOut[0].status='sent'; iMach.go('s-buy-order-view', {id: iMach.data.ordersOut[0].id}); 'ok'" >/dev/null; sleep 0.8
C52=$(q "document.querySelector('.dl-deadline span').textContent")
chk "یادآوری ۷ روز در نمای خریدار" "$C52" "۷ روز پس از ارسال اگر تأیید نکنی، سفارش خودکار بسته می‌شود"
q "iMach.data.ordersIn[0].status='sent'; iMach.go('s-sell-order-view', {id: iMach.data.ordersIn[0].id}); 'ok'" >/dev/null; sleep 0.8
C53=$(q "document.querySelector('#s-sell-order-view .dl-deadline span') ? 'seller-too' : 'missing'")
chk "همان یادآوری در نمای فروشنده" "$C53" "seller-too"

echo "─── ۱۶) بارکد ناشناس ⇒ ساخت کالا (تصمیم ۷/۹) ───"
q "iMach.show('s-sell-add', false); 'ok'" >/dev/null; sleep 0.7
q "iMach.forms.scanOpen(); 'ok'" >/dev/null; sleep 0.4
q "document.getElementById('scan-code').value='1234567890123'; iMach.forms.scanGo(); 'ok'" >/dev/null; sleep 0.4
C54=$(q "document.getElementById('scan-newprod') ? document.getElementById('scan-newprod').textContent.trim() : 'missing'")
chk "CTA «ساخت کالا با همین بارکد»" "$C54" "ساخت کالا با همین بارکد"
q "document.getElementById('scan-newprod').click(); 'ok'" >/dev/null; sleep 0.6
C55=$(q "document.getElementById('sheet-new-good').classList.contains('show') + '|' + document.getElementById('ng-barcode-tx').textContent")
chk "شیت کالای جدید + chip بارکد الصاقی" "$C55" "true|1234567890123"

echo "─── ۱۷) بازیابی رمز = پشتیبانی انسانی (تصمیم ۶/۹) ───"
q "iMach.show('s-login', false); 'ok'" >/dev/null; sleep 0.7
q "document.querySelector('[data-sheet=\"sheet-forgot\"]').click(); 'ok'" >/dev/null; sleep 0.5
C56=$(q "(document.getElementById('sheet-forgot').classList.contains('show') && document.querySelector('#sheet-forgot [data-dial]')) ? 'support-sheet' : 'no'")
chk "شیت بازیابی با تماس/واتس‌اپ پشتیبانی" "$C56" "support-sheet"

echo "─── ۱۸) صفر خطا ───"
C57=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "کل جلسه بدون خطا" "$C57" "CLEAN"

echo ""
echo "=== FD-22 QA: $pass OK / $fail FAIL ==="
