#!/bin/bash
# FD-24 QA رفتاری — استعلام چندقلمی (حکم مالک: «قیمت‌گیری باید چندکالایی را
# ساپورت کنه؛ یک کالا پیش‌فرض + افزودن کالاهای بعدی؛ خرده‌فروش‌ها قیمت چند
# کالا را در یک استعلام می‌گیرند — نه استعلامِ جدا به‌ازای هر کالا»)
# ▸ ۲۵: قلم پیش‌فرض + شیت انتخاب + استپر + حذف + گیرندگانِ اجتماع با بج پوشش
# ▸ ۱۲: قیمت هر قلم + «در کاتالوک تو» + ارسال با جمع چندقلمی
# ▸ ۲۶/۲۷: مقایسهٔ پوشش/جمع + جزئیات قلم‌به‌قلم + پذیرش + سفارش با قیمت هر قلم
# ▸ ۳۲: کارت استعلام چندقلمی «نام + n قلم»
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

echo "─── ۱) ۲۵ پیش‌فرض تک‌قلمی: قلم از لیست خرید + گیرندگان داده‌محور ───"
q "iMach.show('s-buy-rfq-new', false); 'ok'" >/dev/null; sleep 0.9
A1=$(q "document.querySelectorAll('.rfq-item').length + '|' + document.getElementById('rfq-count').textContent + '|' + document.getElementById('rfq-sub').textContent")
chk "۱ قلم پیش‌فرض (برنج هاشمی گلستان از لیست خرید)" "$A1" "1|۱ قلم|برنج هاشمی گلستان · ارسال به تأمین‌کننده‌ها"
A2=$(q "document.querySelectorAll('#rfq-recips .checkrow').length + '|' + document.querySelectorAll('#rfq-recips .checkbox.on').length")
chk "۵ گیرندهٔ دارندِ برنج، ۳ تای تاییدشده روشن" "$A2" "5|3"
A3=$(q "document.querySelectorAll('#rfq-recips .badge.b-amber').length + '|' + document.getElementById('rfq-locknote').hidden")
chk "۲ «در انتظار تایید» خاموش + بدون نوت قفل (تک‌قلمی)" "$A3" "2|true"
A4=$(q "document.getElementById('rfq-send-btn').disabled + '|' + document.getElementById('rfq-send-btn').textContent")
chk "دکمه: «ارسال استعلام ۱ قلمی به ۳ تأمین‌کننده»" "$A4" "false|ارسال استعلام ۱ قلمی به ۳ تأمین‌کننده"
A5=$(q "document.querySelector('.rfq-stv').textContent.replace(/\s+/g,'')")
chk "مقدار پیش‌فرض از q لیست خرید (۲۰ کیسه)" "$A5" "۲۰کیسه"

echo "─── ۲) شیت افزودن کالا: دو گروه + ضدتکرار ───"
q "document.getElementById('rfq-add-btn').click(); 'ok'" >/dev/null; sleep 0.6
B1=$(q "document.querySelectorAll('#rfp-grid .pl-group-t').length + '|' + document.querySelectorAll('#rfp-grid .pl-row').length")
chk "دو گروه (لیست من + پرتکرار صنف) با ۸ ردیف" "$B1" "2|8"
B2=$(q "document.querySelectorAll('#rfp-grid .pl-row.in-list').length + '|' + document.querySelector('#rfp-grid .pl-row.in-list .badge').textContent")
chk "قلم موجود = «در استعلام» غیرقابل انتخاب" "$B2" "1|در استعلام"
q "document.querySelector('[data-rfp-item=\"sl2\"]').click(); 'ok'" >/dev/null; sleep 0.4
B3=$(q "document.querySelectorAll('.rfq-item').length + '|' + document.getElementById('rfq-sub').textContent + '|' + document.getElementById('rfq-add-tx').textContent")
chk "افزودن روغن ⇒ «استعلام چندقلمی · ۲ قلم» + «افزودن کالای دیگر»" "$B3" "2|استعلام چندقلمی · ۲ قلم|افزودن کالای دیگر"
q "document.getElementById('rfp-done').click(); 'ok'" >/dev/null; sleep 0.4

echo "─── ۳) حالت چندقلمی: اجتماع + بج پوشش + تیک قفل ───"
C1=$(q "document.getElementById('rfq-locknote').hidden + '|' + document.querySelectorAll('#rfq-recips .checkbox.on').length")
chk "نوت قفل دیده + همهٔ دارندگان روشن (اجتماع ۵ نفر)" "$C1" "false|5"
C2=$(q "Array.from(document.querySelectorAll('#rfq-recips .checkrow')).map(function(r){return (r.textContent.match(/همهٔ ۲ قلم|۱ از ۲ قلم/)||['-'])[0]}).join(' | ') + ' ⊹ ' + document.querySelectorAll('#rfq-recips .badge.b-amber').length")
chk "پوشش نزولی: ۲ کامل اول، ۳ ناقص بعد + ۲ در انتظار" "$C2" "همهٔ ۲ قلم | همهٔ ۲ قلم | ۱ از ۲ قلم | ۱ از ۲ قلم | ۱ از ۲ قلم ⊹ 2"
C3=$(q "document.querySelector('#rfq-recips .checkrow').click(); document.querySelectorAll('#rfq-recips .checkbox.on').length")
chk "تیک قفل با لمس عوض نمی‌شود" "$C3" "5"
C4=$(q "document.getElementById('rfq-recip-count').textContent + '|' + document.getElementById('rfq-send-btn').textContent")
chk "شمارنده: «هر که ۲ کالایی که دارد» + دکمهٔ ۵ گیرنده" "$C4" "هر که ۲ کالایی که دارد|ارسال استعلام ۲ قلمی به ۵ تأمین‌کننده"

echo "─── ۴) استپر مقدار + حذف قلم ───"
q "document.querySelector('[data-rfq-qty=\"1\"][data-dir=\"1\"]').click(); 'ok'" >/dev/null; sleep 0.3
q "document.querySelector('[data-rfq-qty=\"1\"][data-dir=\"1\"]').click(); 'ok'" >/dev/null; sleep 0.3
D1=$(q "document.querySelectorAll('.rfq-item')[1].querySelector('.rfq-stv').textContent.replace(/\s+/g,'')")
chk "استپر +۲ ⇒ روغن ۴۲ بسته" "$D1" "۴۲بسته"
q "document.querySelector('[data-rfq-rm=\"1\"]').click(); 'ok'" >/dev/null; sleep 0.3
D2=$(q "document.querySelectorAll('.rfq-item').length + '|' + document.getElementById('rfq-locknote').hidden")
chk "حذف قلم ⇒ تک‌قلمی + نوت قفل رفت" "$D2" "1|true"
D3=$(q "document.querySelectorAll('#rfq-recips .checkbox.on').length")
chk "تیک‌های جلسه بعد از حذف قلم حفظ شدند (۵ روشن)" "$D3" "5"

echo "─── ۵) ارسال واقعی چندقلمی ⇒ ۲۴ با بج قلم ───"
q "iMach.show('s-buy-rfq-new', false); 'ok'" >/dev/null; sleep 0.5
q "document.getElementById('rfq-add-btn').click(); 'ok'" >/dev/null; sleep 0.4
q "document.querySelector('[data-rfp-item=\"sl2\"]').click(); 'ok'" >/dev/null; sleep 0.3
q "document.getElementById('rfp-done').click(); 'ok'" >/dev/null; sleep 0.3
q "document.querySelector('[data-rfq-send]').click(); 'ok'" >/dev/null; sleep 1.4
E1=$(q "var r=iMach.data.rfqsOut[0]; r.itemName + '|' + r.items.map(function(i){return i.name+':'+i.qty}).join(',') + '|sentTo:' + r.sentTo + '|' + r.supplierIds.join(',')")
chk "rfqsOut: ۲ قلم با مقدار + sentTo=5 (اجتماع دارندگان)" "$E1" "۲ قلمی|برنج هاشمی گلستان:20,روغن سرخ‌کردنی:40|sentTo:5|su1,su5,su4,su3,su2"
E2=$(q "document.querySelector('#buy-rfqs-open .row-title').textContent.replace(/\s+/g,' ')")
chk "۲۴: ردیف تازه «درخواست قیمت ۲ قلمی» + بج «۲ قلم»" "$E2" "درخواست قیمت ۲ قلمی ۲ قلم"

echo "─── ۶) ۱۱/۱۲ سمت فروشنده: درخواست ۲ قلمی + قیمت هر قلم از کاتالوک ───"
q "iMach.show('s-sell-rfqs', false); 'ok'" >/dev/null; sleep 0.8
F1=$(q "document.querySelector('#sell-rfqs-rows .row-title').textContent.replace(/\s+/g,' ')")
chk "۱۱: «درخواست قیمت ۲ قلمی» + بج «۲ قلم»" "$F1" "درخواست قیمت ۲ قلمی ۲ قلم"
q "document.querySelector('[data-rfq-go=\"ri1\"]').click(); 'ok'" >/dev/null; sleep 0.8
F2=$(q "document.querySelectorAll('[data-of-price]').length")
chk "۱۲: ۲ فیلد قیمت (یکی به‌ازای هر قلم)" "$F2" "2"
F3=$(q "document.querySelector('#of-prices .field .badge.b-green').textContent + '|' + document.querySelector('[data-of-price=\"0\"]').placeholder")
chk "قلم مچ: «در کاتالوک تو» + جای‌گذاری قیمت کاتالوک (۲٬۸۵۰٬۰۰۰)" "$F3" "در کاتالوک تو|کاتالوک تو: ۲٬۸۵۰٬۰۰۰"
q "var a=document.querySelectorAll('[data-of-price]'); a[0].value='2820000'; a[1].value='1350000'; a[0].dispatchEvent(new Event('input',{bubbles:true})); 'ok'" >/dev/null; sleep 0.3
F4=$(q "document.querySelector('[data-of-price=\"0\"]').parentElement.querySelector('.ofp-hint').innerHTML")
chk "هینت زنده: معادل کیلویی قلم اول" "$F4" "هر کیلوگرم ≈ <b>۵۶٬۴۰۰ تومان</b>"
q "document.querySelector('[data-offer-send]').click(); 'ok'" >/dev/null; sleep 1
F5=$(q "var r=iMach.data.rfqsAnswered[0]; r.itemName + ' | ' + r.myOffer + ' ⊹ ' + iMach.data.rfqsIn.length")
chk "پاسخ: «۲ قلم · جمع ۸۳٬۴۰۰٬۰۰۰ تومان» + از انتظار رفت" "$F5" "۲ قلمی | ۲ قلم · جمع ۸۳٬۴۰۰٬۰۰۰ تومان ⊹ 1"

echo "─── ۷) ۲۶ مقایسهٔ چندقلمی: پوشش اول، بعد جمع ───"
q "iMach.go('s-buy-offers', {rfq:'ro1'}); 'ok'" >/dev/null; sleep 0.9
G1=$(q "document.getElementById('offers-sub').textContent + ' ⊹ ' + Array.from(document.querySelectorAll('#offers-list .offer-card')).map(function(c){return c.querySelector('.avatar').nextElementSibling.firstChild.textContent.trim()}).join(' → ')")
chk "«درخواست قیمت ۲ قلمی · ۵ پیشنهاد»: پارس → سبزدشت → شالی → کیان → آریو" "$G1" "درخواست قیمت ۲ قلمی · ۵ پیشنهاد ⊹ پخش برنج پارس → غلات سبزدشت → شالی‌زار طالب → کیان غلات → آریو غلات"
G2=$(q "Array.from(document.querySelectorAll('#offers-list .offer-card')).map(function(c){return c.querySelector('.offer-price .p').textContent + '(' + c.querySelector('.offer-price .u').textContent + ')'}).join(' | ')")
chk "جمع‌ها: ۸۴٬۵۰۰٬۰۰۰ → ۸۷٬۱۶۰٬۰۰۰ → ناقص‌ها صعودی" "$G2" "۸۴٬۵۰۰٬۰۰۰(جمع ۲ قلم) | ۸۷٬۱۶۰٬۰۰۰(جمع ۲ قلم) | ۵۵٬۶۰۰٬۰۰۰(جمع ۱ قلم) | ۵۵٬۸۰۰٬۰۰۰(جمع ۱ قلم) | ۵۷٬۹۰۰٬۰۰۰(جمع ۱ قلم)"
G3=$(q "Array.from(document.querySelectorAll('#offers-list .offer-card.best .badge')).map(function(b){return b.textContent}).join(' | ')")
chk "کارت برتر: «همهٔ ۲ قلم | کمترین جمع | آشنای من»" "$G3" "همهٔ ۲ قلم | کمترین جمع | آشنای من"
G4=$(q "Array.from(document.querySelectorAll('#offers-list .offer-card'))[0].querySelectorAll('.of-it').length + '|' + Array.from(document.querySelectorAll('#offers-list .offer-card'))[4].querySelector('.v.miss').textContent")
chk "ردیف قلم روی کارت‌ها + «این قلم را ندارد» روی ناقص" "$G4" "2|این قلم را ندارد"

echo "─── ۸) ۲۷ جزئیات چندقلمی + پذیرش + سفارش با قیمت هر قلم ───"
q "iMach.go('s-buy-offer-view', {offer:'of1'}); 'ok'" >/dev/null; sleep 0.9
H1=$(q "document.getElementById('ovf-price-lbl').textContent + ' ⊹ ' + document.getElementById('ovf-price').textContent")
chk "قیمت = جمع کل ۸۴٬۵۰۰٬۰۰۰ (۲ قلم از ۲ قلم)" "$H1" "جمع ۲ قلم از ۲ قلم استعلام ⊹ ۸۴٬۵۰۰٬۰۰۰"
H2=$(q "document.querySelector('#ovf-facts .fact-row:nth-child(2) .v').textContent.replace(/\s+/g,' ') + ' ⊹ ' + document.querySelector('#ovf-facts .fact-row:nth-child(3) .v').textContent.replace(/\s+/g,' ')")
chk "قلم‌به‌قلم: ۲٬۸۴۰٬۰۰۰ × ۲۰ = ۵۶٬۸۰۰٬۰۰۰ / ۱٬۳۸۵٬۰۰۰ × ۲۰ = ۲۷٬۷۰۰٬۰۰۰" "$H2" "۲٬۸۴۰٬۰۰۰ × ۲۰ = ۵۶٬۸۰۰٬۰۰۰ تومان ⊹ ۱٬۳۸۵٬۰۰۰ × ۲۰ = ۲۷٬۷۰۰٬۰۰۰ تومان"
q "document.getElementById('ovf-accept').click(); 'ok'" >/dev/null; sleep 0.5
q "document.querySelector('.dialog [data-dlg=\"1\"]').click(); 'ok'" >/dev/null; sleep 0.9
H3=$(q "var r=iMach.data.rfqsOut.filter(function(x){return x.id==='ro1'})[0]; r.status + ' | ' + r.result")
chk "پذیرش ⇒ نتیجه با جمع: «پذیرفت: پخش برنج پارس — جمع ۸۴٬۵۰۰٬۰۰۰ ت»" "$H3" "done | پذیرفت: پخش برنج پارس — جمع ۸۴٬۵۰۰٬۰۰۰ ت"
q "document.querySelector('[data-offer-order]').click(); 'ok'" >/dev/null; sleep 1
H4=$(q "document.querySelector('.screen:not([hidden])').id + '|' + iMach.data.ordersOut[0].items.map(function(i){return i.name+':'+i.qty+'×'+i.unitPrice}).join(' | ')")
chk "سفارش: ۲ قلم با قیمت فریزِ هر قلم (۲۰×۲٬۸۴۰٬۰۰۰ | ۲۰×۱٬۳۸۵٬۰۰۰)" "$H4" "s-buy-order-view|برنج هاشمی گلستان:20×2840000 | روغن سرخ‌کردنی لادن:20×1385000"
H5=$(q "iMach.data.ordersIn[0].items.length + ' قلم — جمع ' + iMach.data.ordersIn[0].items.reduce(function(s,i){return s+i.qty*i.unitPrice},0)")
chk "سمت فروشنده هم ۲ قلم همان قیمت‌ها را می‌بیند (جمع ۸۴٬۵۰۰٬۰۰۰)" "$H5" "2 قلم — جمع 84500000"

echo "─── ۹) ۳۲ نوار استعلام عمومی: «برنج هاشمی گلستان +۱ قلم» ───"
q "iMach.show('s-buy-list-guest', false); 'ok'" >/dev/null; sleep 0.9
I1=$(q "Array.from(document.querySelectorAll('.blinq-card')).map(function(c){return c.querySelector('b').textContent}).join(' ;; ')")
chk "کارت استعلام چندقلمی: نام قلم اول + «+۱ قلم»" "$I1" "برنج هاشمی گلستان +۱ قلم ;; رب گوجه‌فرنگی"

echo "─── ۱۰) صفر خطا ───"
J1=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "کل جلسه بدون خطا" "$J1" "CLEAN"

echo ""
echo "=== FD-24 QA: $pass OK / $fail FAIL ==="
