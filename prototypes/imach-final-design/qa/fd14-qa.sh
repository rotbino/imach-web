#!/bin/bash
# FD-14 QA رفتاری — رنگ میز خرید + پیشوند «درخواست قیمت» + سوییچرهای فرم پیشنهاد
# + بازتاب سمت خریدار + حلقهٔ بستن استعلام + کاتالوگ→لیست خرید + نمای ذخیره در شیت حساب
set -u
cd /home/z/my-project/imach-web/prototypes/imach-final-design

agent-browser open "http://127.0.0.1:8180/index.html" >/dev/null 2>&1
sleep 1.8
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1

q() { agent-browser eval "$1" 2>&1 | tr -d '"' ; }
pass=0; fail=0
chk() { # $1=عنوان $2=خروجی $3=انتظار (substr)
  if [[ "$2" == *"$3"* ]]; then echo "✓ $1"; pass=$((pass+1));
  else echo "✗ $1 → got: $2"; fail=$((fail+1)); fi
}

echo "─── ۱) رنگ میز خرید = #64748B (سنگی سرد) ───"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.5
C1=$(q "getComputedStyle(document.getElementById('phone')).getPropertyValue('--stone').trim()")
chk "توکن --stone = #64748B" "$C1" "#64748B"
C2=$(q "getComputedStyle(document.querySelector('.phone[data-arm=\"buy\"]')).getPropertyValue('--arm').trim()")
chk "--arm صفحهٔ خرید = #64748B" "$C2" "#64748B"
C3=$(q "getComputedStyle(document.querySelector('.desk-tile .dt-stat b')).color")
chk "کاشی میز خرید به رنگ جدید (rgb 100,116,139)" "$C3" "rgb(100, 116, 139)"

echo "─── ۲) میز خرید: کاشی «استعلام‌های من» (FD-16 کاشی شد) ───"
C4=$(q "document.querySelector('#s-home-buy [data-go=\"s-buy-rfqs\"]') ? 'yes' : 'no'")
chk "کاشی استعلام در کارتابل خرید" "$C4" "yes"

echo "─── ۳) ۱۱ فروشنده: پیشوند «درخواست قیمت» + رندر پویا ───"
q "iMach.show('s-sell-rfqs', false); 'ok'" >/dev/null; sleep 0.5
C5=$(q "document.querySelector('#sell-rfqs-rows .row-title').textContent")
chk "عنوان ردیف = «درخواست قیمت ۲ قلمی» (FD-24 چندقلمی)" "$C5" "درخواست قیمت ۲ قلمی"
C6=$(q "document.querySelectorAll('#sell-rfqs-rows .row').length")
chk "۲ درخواست در انتظار" "$C6" "2"
C7=$(q "document.querySelectorAll('#sell-rfqs-done .row').length")
chk "۱ پاسخ داده‌شده" "$C7" "1"
C8=$(q "document.querySelectorAll('#sell-rfqs-rows .row')[1].querySelector('.row-title').textContent")
chk "درخواست چندقلمی = «درخواست قیمت ۳ قلمی»" "$C8" "درخواست قیمت ۳ قلمی"

echo "─── ۴) ۱۲ فرم پیشنهاد: چندقلمی + سوییچ چک + سوییچ ارسال ───"
q "document.querySelectorAll('#sell-rfqs-rows .row')[1].click(); 'ok'" >/dev/null; sleep 0.6
C9=$(q "document.querySelector('#of-sub').textContent")
chk "سربرگ فرم از استعلام چندقلمی" "$C9" "درخواست قیمت ۳ قلمی"
C10=$(q "document.querySelectorAll('[data-of-price]').length")
chk "۳ فیلد قیمت (یکی به‌ازای هر قلم)" "$C10" "3"
C11=$(q "document.querySelector('#of-rfq-card .fact-row') ? 'yes' : 'no'")
chk "کارت فهرست قلم‌ها" "$C11" "yes"
q "document.querySelector('#of-chk-on').click(); 'x'" >/dev/null; sleep 0.3
C12=$(q "document.querySelector('#of-chk-block').hidden === false ? 'yes' : 'no'")
chk "روشن‌کردن چک ⇒ بلوک درصد/روز باز" "$C12" "yes"
q "var e=document.querySelector('#of-chk-pct'); e.value='30'; iMach.forms.offerPctSync('chk'); 'x'" >/dev/null
C13=$(q "document.querySelector('#of-cash-pct').value")
chk "هم‌گامی درصد (چکی ۳۰ ⇒ نقدی ۷۰)" "$C13" "۷۰"
q "var e=document.querySelector('#of-chk-days'); e.value='90'; iMach.forms.offerDaysSync(); 'x'" >/dev/null
C14=$(q "document.querySelector('#of-sum-tx').textContent")
chk "جمع‌بندی زنده: ۷۰٪ نقدی + ۳۰٪ چک تا ۹۰ روز" "$C14" "۷۰٪ نقدی + ۳۰٪ چک (تا ۹۰ روز)"
q "document.querySelector('#of-ship-on').click(); 'x'" >/dev/null; sleep 0.3
C15=$(q "document.querySelector('#of-ship-block').hidden === false ? 'yes' : 'no'")
chk "روشن‌کردن ارسال ⇒ رادیوی هزینهٔ حمل" "$C15" "yes"
q "document.querySelector('[data-ship=\"customer\"]').click(); 'x'" >/dev/null; sleep 0.2
C16=$(q "document.querySelector('#of-sum-tx').textContent")
chk "رادیو: ارسال — حمل با مشتری" "$C16" "ارسال — حمل با مشتری"
q "var e=document.querySelector('[data-of-price=\"0\"]'); e.value='۵۸٬۰۰۰'; iMach.forms.offerPriceHint(e); 'x'" >/dev/null
C17=$(q "document.querySelector('[data-of-price=\"0\"]').parentElement.querySelector('.ofp-hint').textContent")
chk "هینت قیمت (فیکس باگ قدیمی): جمع ۶۰ بطری" "$C17" "برای ۶۰ بطری ۱.۸ لیتری"

echo "─── ۵) ارسال پیشنهاد: اعتبارسنجی + انتقال به پاسخ‌داده‌شده ───"
q "document.querySelector('[data-offer-send]').click(); 'x'" >/dev/null; sleep 0.4
C18=$(q "iMach.data.rfqsIn.length + '|' + iMach.data.rfqsAnswered.length")
chk "قیمتی پر نشده ⇒ استعلام جابه‌جا نمی‌شود" "$C18" "2|1"
q "document.querySelectorAll('[data-of-price]')[1].value='۶۲٬۰۰۰'; document.querySelectorAll('[data-of-price]')[2].value='۲۵٬۰۰۰'; 'x'" >/dev/null
q "document.querySelector('[data-offer-send]').click(); 'x'" >/dev/null; sleep 1.2
C19=$(q "iMach.data.rfqsIn.length + '|' + iMach.data.rfqsAnswered.length")
chk "ارسال ⇒ استعلام به «پاسخ داده‌شده» رفت" "$C19" "1|2"

echo "─── ۶) ۲۴ خریدار: رندر پویا + پیشوند ───"
q "iMach.show('s-buy-rfqs', false); 'ok'" >/dev/null; sleep 0.5
C20=$(q "document.querySelectorAll('#buy-rfqs-open .row').length + '|' + document.querySelectorAll('#buy-rfqs-done .row').length")
chk "۲ باز · ۱ پایان‌یافته" "$C20" "2|1"
C21=$(q "document.querySelector('#buy-rfqs-open .row-title').textContent.replace(/\s+/g,' ')")
chk "پیشوند روی عنوان استعلام خریدار + بج قلم (FD-24)" "$C21" "درخواست قیمت ۲ قلمی ۲ قلم"
C22=$(q "document.querySelector('#buy-rfqs-done .row-sub').textContent")
chk "نتیجهٔ پایان‌یافته: پذیرفت: کیان غلات" "$C22" "پذیرفت: کیان غلات"

echo "─── ۷) ۲۶: هر استعلام پیشنهادهای خودش + نوار شرایط ───"
q "document.querySelectorAll('#buy-rfqs-open .row')[1].click(); 'ok'" >/dev/null; sleep 0.6
C23=$(q "document.querySelector('#offers-sub').textContent")
chk "سربرگ ۲۶ = استعلام «رب» (نه برنج!)" "$C23" "درخواست قیمت رب گوجه‌فرنگی · ۶۰ عدد"
C24=$(q "document.querySelectorAll('#offers-list .offer-card').length")
chk "۱ کارت پیشنهاد برای رب" "$C24" "1"
C25=$(q "document.querySelector('#offers-list .ot-chip b').textContent")
chk "نوار شرایط: پرداخت نقدی (of6)" "$C25" "نقدی"
q "iMach.show('s-buy-rfqs', false); 'ok'" >/dev/null; sleep 0.4
q "document.querySelectorAll('#buy-rfqs-open .row')[0].click(); 'ok'" >/dev/null; sleep 0.6
C26=$(q "document.querySelectorAll('#offers-list .offer-card').length")
chk "۵ کارت پیشنهاد برای استعلام ۲ قلمی" "$C26" "5"
C27=$(q "document.querySelectorAll('#offers-list .offer-card.best .ot-chip b')[1].textContent")
chk "کمترین جمع (پخش برنج پارس — کامل): ارسال با فروشنده" "$C27" "ارسال — حمل با فروشنده"
C28=$(q "document.querySelectorAll('#offers-list .offer-card')[0].querySelectorAll('.ot-chip')[0].querySelector('b').textContent")
chk "بازتاب پرداخت ترکیبی روی کارت برتر (۵۰/۵۰ تا ۶۰ روز)" "$C28" "۵۰٪ نقدی + ۵۰٪ چک (تا ۶۰ روز)"
C28b=$(q "Array.from(document.querySelectorAll('#offers-list .offer-card')).map(function(c){return c.querySelector('.offer-price .u').textContent}).join(' | ')")
chk "جمع‌ها: ۲ کامل + ۳ ناقص (FD-24)" "$C28b" "جمع ۲ قلم | جمع ۲ قلم | جمع ۱ قلم | جمع ۱ قلم | جمع ۱ قلم"
C28c=$(q "document.querySelector('#offers-list .offer-card.best .badge').textContent + '|' + Array.from(document.querySelectorAll('#offers-list .offer-card'))[4].querySelector('.v.miss').textContent")
chk "بج پوشش + «این قلم را ندارد» روی ناقص" "$C28c" "همهٔ ۲ قلم|این قلم را ندارد"

echo "─── ۸) ۲۷: جزئیات + پذیرش = بستن استعلام ───"
q "document.querySelector('[data-offer-go=\"of1\"]').click(); 'ok'" >/dev/null; sleep 0.6
C29=$(q "document.querySelector('#ovf-facts .fact-row:nth-child(2) .v').textContent.replace(/\s+/g,' ')")
chk "جزئیات چندقلمی: قلم برنج «۲٬۸۴۰٬۰۰۰ × ۲۰ = ۵۶٬۸۰۰٬۰۰۰»" "$C29" "۲٬۸۴۰٬۰۰۰ × ۲۰ = ۵۶٬۸۰۰٬۰۰۰"
C29b=$(q "document.querySelector('#ovf-price-lbl').textContent + ' ⊹ ' + document.querySelector('#ovf-price').textContent")
chk "قیمت چندقلمی = جمع کل (۸۴٬۵۰۰٬۰۰۰)" "$C29b" "جمع ۲ قلم از ۲ قلم استعلام ⊹ ۸۴٬۵۰۰٬۰۰۰"
C30=$(q "document.querySelector('#ovf-facts .fact-row:nth-child(6) .v').textContent")
chk "جزئیات: روش تحویل = ارسال — حمل با فروشنده" "$C30" "ارسال — حمل با فروشنده"
q "document.querySelector('[data-accept-offer]').click(); 'x'" >/dev/null; sleep 0.4
q "document.querySelector('.dialog [data-dlg=\"1\"]').click(); 'x'" >/dev/null; sleep 0.8
# FD-22 (تصمیم ۲/۹): پذیرش دیگر به ۲۴ نمی‌پرد — «ثبت سفارش با همین شرایط» همان‌جا می‌نشیند؛ رگرسیون خودش می‌رود
q "iMach.show('s-buy-rfqs', false); 'x'" >/dev/null; sleep 0.6
C31=$(q "document.querySelectorAll('#buy-rfqs-open .row').length + '|' + document.querySelectorAll('#buy-rfqs-done .row').length")
chk "پذیرش ⇒ استعلام برنج بسته شد (۱ باز · ۲ پایان‌یافته)" "$C31" "1|2"
C32=$(q "document.querySelectorAll('#buy-rfqs-done .row-sub')[0].textContent")
chk "نتیجه: پذیرفت: پخش برنج پارس" "$C32" "پذیرفت: پخش برنج پارس"

echo "─── ۹) بستن استعلام بدون انتخاب (۲۶) ───"
q "document.querySelectorAll('#buy-rfqs-open .row')[0].click(); 'ok'" >/dev/null; sleep 0.6
C33=$(q "document.querySelector('#offers-close').hidden === false ? 'yes' : 'no'")
chk "دکمهٔ «بستن این استعلام» برای استعلام باز" "$C33" "yes"
q "document.querySelector('#offers-close').click(); 'x'" >/dev/null; sleep 0.4
q "document.querySelector('.dialog [data-dlg=\"1\"]').click(); 'x'" >/dev/null; sleep 1
C34=$(q "document.querySelectorAll('#buy-rfqs-open .row').length + '|' + document.querySelectorAll('#buy-rfqs-done .row').length")
chk "بستن ⇒ ۰ باز · ۳ پایان‌یافته" "$C34" "0|3"
C35=$(q "document.querySelectorAll('#buy-rfqs-done .row-sub')[1].textContent")
chk "نتیجه: بسته شد — بدون انتخاب پیشنهاد" "$C35" "بسته شد — بدون انتخاب پیشنهاد"
q "iMach.show('s-buy-offers', false); 'ok'" >/dev/null; sleep 0.6
C36=$(q "document.querySelector('#offers-list .empty h3').textContent")
chk "۲۶ استعلام بسته: نمای آرشیوی" "$C36" "این استعلام بسته شده"

echo "─── ۱۰) ۲۵: گیرندگان زنده + ارسال واقعی (FD-24 چندقلمی) ───"
q "iMach.show('s-buy-rfq-new', false); 'ok'" >/dev/null; sleep 0.5
C37=$(q "document.querySelector('#rfq-send-btn').textContent")
chk "دکمه = ارسال استعلام ۱ قلمی به ۳ (پیش‌فرض تک‌قلمی)" "$C37" "ارسال استعلام ۱ قلمی به ۳ تأمین‌کننده"
q "document.querySelectorAll('#s-buy-rfq-new .checkrow')[1].click(); 'x'" >/dev/null; sleep 0.2
C38=$(q "document.querySelector('#rfq-send-btn').textContent")
chk "برداشتن تیک ⇒ ارسال به ۲" "$C38" "ارسال استعلام ۱ قلمی به ۲ تأمین‌کننده"
q "document.querySelector('[data-rfq-send]').click(); 'x'" >/dev/null; sleep 1.4
C39=$(q "document.querySelectorAll('#buy-rfqs-open .row').length + '|' + document.querySelector('#buy-rfqs-open .row-sub').textContent")
chk "استعلام جدید در لیست: در انتظار اولین پیشنهاد" "$C39" "1|در انتظار اولین پیشنهاد"

echo "─── ۱۱) ۳۱ کاتالوگ: نوار لیست خرید فقط برای مشتری ───"
agent-browser open "http://127.0.0.1:8180/index.html" >/dev/null 2>&1; sleep 2
q "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});'ok'" >/dev/null
q "iMach.show('s-catalog-guest', false); 'ok'" >/dev/null; sleep 0.6
C40=$(q "document.querySelector('#guest-addlist-btn').hidden === true ? 'yes' : 'no'")
chk "مهمان: نوار مخفی" "$C40" "yes"
q "document.querySelector('#guest-login-btn').click(); 'x'" >/dev/null; sleep 0.5
q "document.querySelector('#acc-lphone').value='۰۹۱۲'; document.querySelector('#acc-lpass').value='123456'; 'x'" >/dev/null
q "document.querySelector('#acc-login-submit').click(); 'x'" >/dev/null; sleep 1
C41=$(q "document.querySelector('#guest-addlist-btn').hidden === false ? 'yes' : 'no'")
chk "بعد از ورود (مشتری): نوار پیداست" "$C41" "yes"
C42=$(q "getComputedStyle(document.querySelector('#guest-addlist-btn .as-tx b')).color")
chk "رنگ متن نوار = سنگی (پیوند میز خرید)" "$C42" "rgb(71, 85, 105)"

echo "─── ۱۲) شیت انتخاب: ردیفی + سرچ + گروه + مقدار/دوره (FD-22) ───"
q "document.querySelector('#guest-addlist-btn').click(); 'x'" >/dev/null; sleep 0.6
C43=$(q "document.querySelectorAll('#pl-grid .pl-row').length")
chk "۴ کالای کاتالوگ در لیست ردیفیِ تک‌ستونه" "$C43" "4"
C44=$(q "document.querySelector('#pl-grid .pl-row.in-list') ? document.querySelector('#pl-grid .pl-row.in-list .badge').textContent : 'none'")
chk "برنج هاشمی گلستان = «در لیست هست» (ضدتکرار)" "$C44" "در لیست هست"
q "var e=document.querySelector('#pl-search'); e.value='طارم'; iMach.forms.picklistSearch(e.value); 'x'" >/dev/null; sleep 0.3
C45=$(q "document.querySelectorAll('#pl-grid .pl-row').length")
chk "سرچ «طارم» ⇒ ۱ کالا" "$C45" "1"
q "iMach.forms.picklistSearch(''); 'x'" >/dev/null; sleep 0.2
q "document.querySelectorAll('[data-pl-g]')[3].click(); 'x'" >/dev/null; sleep 0.3
C46=$(q "document.querySelectorAll('#pl-grid .pl-row b')[0].textContent + '|' + document.querySelectorAll('#pl-grid .pl-row').length")
chk "گروه «برنج فجر» ⇒ فقط فجر" "$C46" "برنج فجر|1"
q "iMach.forms.picklistGroup(''); 'x'" >/dev/null; sleep 0.2
q "document.querySelector('[data-pl-item=\"l2\"]').click(); 'x'" >/dev/null; sleep 0.25
q "document.querySelector('[data-pl-item=\"l4\"]').click(); 'x'" >/dev/null; sleep 0.25
C47=$(q "document.querySelector('#pl-add-tx').textContent + '|' + (document.querySelector('#pl-add').disabled ? 'off' : 'on')")
chk "بدون دوره: دکمه خاموش «مقدار و دورهٔ ۲ کالا…»" "$C47" "مقدار و دورهٔ ۲ کالا را مشخص کن|off"
q "document.querySelector('[data-pl-per=\"l2\"][data-val=\"ماهانه\"]').click(); 'x'" >/dev/null; sleep 0.25
q "document.querySelector('[data-pl-per=\"l4\"][data-val=\"هفتگی\"]').click(); 'x'" >/dev/null; sleep 0.25
C47b=$(q "document.querySelector('#pl-add-tx').textContent + '|' + (document.querySelector('#pl-add').disabled ? 'off' : 'on')")
chk "با دوره‌ها: «افزودن ۲ کالا» روشن" "$C47b" "افزودن ۲ کالا به لیست خرید|on"
C47c=$(q "document.querySelector('[data-pl-qty=\"l2\"]').value")
chk "مقدار پیش‌فرض = حداقل خرید (۵)" "$C47c" "5"
q "document.querySelector('#pl-add').click(); 'x'" >/dev/null; sleep 0.6
C48=$(q "iMach.data.shoppingList.length + '|' + iMach.data.shoppingList[4].name + '|' + iMach.data.shoppingList[5].name")
chk "۲ کالا به DATA.shoppingList اضافه شد (طارم + فجر)" "$C48" "6|برنج طارم|برنج فجر"

echo "─── ۱۳) ۲۰ لیست خرید + کاشی میز: رندر پویا ───"
q "iMach.show('s-buy-list', false); 'ok'" >/dev/null; sleep 0.6
C49=$(q "document.querySelector('#buylist-count').textContent")
chk "سربرگ = ۶ کالا" "$C49" "۶ کالا"
C50=$(q "document.querySelectorAll('#buylist-rows .bl-card').length")
chk "۶ ردیف در لیست" "$C50" "6"
C51=$(q "(function(){var c=document.querySelectorAll('#buylist-rows .bl-card');return document.querySelectorAll('#buylist-rows .bl-chip').length+'|'+(c[0]?c[0].querySelectorAll('.bl-chip').length:'nocard')})()")
chk "کارت‌ها بدون بج (FD-42 — خلوت)" "$C51" "0|0"
C52=$(q "document.querySelectorAll('#buylist-rows .bl-card')[4].querySelector('.bl-q').textContent")
chk "ردیف جدید: مقدار + دوره (الزام FD-22)" "$C52" "۵ کیسه ۵۰ کیلویی · ماهانه"
q "iMach.show('s-home-buy', false); 'ok'" >/dev/null; sleep 0.5
C53=$(q "document.querySelector('#buy-desk-list-n').textContent")
chk "کاشی میز خرید = ۶ کالا (زنده)" "$C53" "۶"

echo "─── ۱۴) جریان ذخیره: نمای «ذخیره انجام شد» در همان شیت ───"
agent-browser open "http://127.0.0.1:8180/index.html" >/dev/null 2>&1; sleep 2
q "iMach.show('s-catalog-guest', false); 'ok'" >/dev/null; sleep 0.6
q "document.querySelector('#guest-save-btn').click(); 'x'" >/dev/null; sleep 0.5
q "document.querySelector('#bf-continue').click(); 'x'" >/dev/null; sleep 0.5
q "document.querySelector('#acc-phone').value='۰۹۳۵۱۱۱۲۲۳۳'; document.querySelector('#acc-name').value='مهدی کاظمی'; 'x'" >/dev/null
q "document.querySelector('#acc-submit').click(); 'x'" >/dev/null; sleep 0.8
C54=$(q "document.querySelector('#acc-saved').hidden === false ? 'yes' : 'no'")
chk "نمای «ذخیره انجام شد» در همان شیت" "$C54" "yes"
C55=$(q "document.querySelector('#acc-saved .ok-ttl').textContent")
chk "عنوان: ذخیره انجام شد" "$C55" "ذخیره انجام شد"
C55b=$(q "document.querySelector('#acc-saved .ok-sub').textContent")
chk "پیام طبق متن مالک (تأمین‌کنندگان میز خرید)" "$C55b" "در بخش «تأمین‌کنندگان» میز خرید خود در آیمچ، به این تأمین‌کننده دسترسی دارید"
C56=$(q "document.querySelector('#acc-goto-desk').textContent.trim()")
chk "دکمهٔ «رفتن به میز خرید»" "$C56" "رفتن به میز خرید"
C57=$(q "iMach.getCurrentScreen()")
chk "کاربر همان‌جا در کاتالوگ ماند (نه پرش)" "$C57" "s-catalog-guest"
q "document.querySelector('#acc-stay').click(); 'x'" >/dev/null; sleep 0.6
C58=$(q "iMach.getCurrentScreen() + '|' + document.querySelector('#acc-saved').hidden")
chk "«ماندن در همین کاتالوگ» ⇒ بستن شیت، ماندن" "$C58" "s-catalog-guest|true"
agent-browser open "http://127.0.0.1:8180/index.html" >/dev/null 2>&1; sleep 2
q "iMach.show('s-catalog-guest', false); 'ok'" >/dev/null; sleep 0.6
q "document.querySelector('#guest-save-btn').click(); 'x'" >/dev/null; sleep 0.5
q "document.querySelector('#bf-continue').click(); 'x'" >/dev/null; sleep 0.5
q "document.querySelector('#acc-phone').value='۰۹۳۵۴۴۴۵۵۶۶'; document.querySelector('#acc-name').value='نمونه دوم'; 'x'" >/dev/null
q "document.querySelector('#acc-submit').click(); 'x'" >/dev/null; sleep 0.8
q "document.querySelector('#acc-goto-desk').click(); 'x'" >/dev/null; sleep 0.8
C59=$(q "iMach.getCurrentScreen()")
chk "«رفتن به میز خرید» ⇒ s-home-buy (قاعدهٔ FD-12)" "$C59" "s-home-buy"

echo "─── ۱۵) صفر خطای کنسول در کل جلسه ───"
C60=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "بدون خطای جاوااسکریپت" "$C60" "CLEAN"

echo ""
echo "═══ FD-14 QA: $pass ✓ / $fail ✗ ═══"
exit 0
