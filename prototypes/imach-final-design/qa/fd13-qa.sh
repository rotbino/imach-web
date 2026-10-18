#!/bin/bash
# FD-13 QA رفتاری — بازارِ باز (قیمت برای همه) + سبد مهمان + گیت حساب در سفارش
# + کارت مشتری + تخفیف‌ها + سوییچ ۳۶ + آمار سفارش + حداقل خرید + استپر ۴۲px
set -u
cd /home/z/my-project/imach-web/prototypes/imach-final-design

agent-browser open "http://127.0.0.1:8124/index.html" >/dev/null 2>&1
sleep 1.4
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1

q() { agent-browser eval "$1" 2>&1 | tr -d '"' ; }
pass=0; fail=0
chk() { # $1=عنوان $2=خروجی واقعی $3=انتظار (substr)
  if [[ "$2" == *"$3"* ]]; then echo "✓ $1"; pass=$((pass+1));
  else echo "✗ $1 → got: $2"; fail=$((fail+1)); fi
}

echo "─── ۱) ۳۱ مهمان در بازارِ باز (پیش‌فرض): قیمت‌ها و سبد برای همه ───"
q "iMach.show('s-catalog-guest', false)" >/dev/null; sleep 0.6
CHK1=$(q "document.querySelector('#s-catalog-guest').classList.contains('open-market')")
chk "کلاس open-market روی صفحه" "$CHK1" "true"
CHK2=$(q "getComputedStyle(document.querySelector('#guest-grid .pprice')).display")
chk "قیمت کارت: پیداست" "$CHK2" "block"
CHK3=$(q "getComputedStyle(document.querySelector('#guest-grid .price-cta')).display")
chk "«مشاهده قیمت» (فقط حالت gated): مخفی" "$CHK3" "none"
CHK4=$(q "getComputedStyle(document.querySelector('#guest-grid .addcart-btn')).display")
chk "دکمهٔ + روی کارت برای مهمان: پیداست" "$CHK4" "grid"
CHK5=$(q "getComputedStyle(document.querySelector('#guest-cart-btn')).display")
chk "دکمهٔ سبد نوار پایین برای مهمان: پیداست" "$CHK5" "flex"
CHK6=$(q "document.querySelector('#guest-save-btn').hidden")
chk "دکمهٔ ذخیره (مهمان): پیداست" "$CHK6" "false"
CHK7=$(q "document.querySelector('#guest-cust-card').hidden")
chk "کارت مشتری (مهمان): مخفی" "$CHK7" "true"
CHK8=$(q "document.querySelector('.card[style*=\"gap: 8px\"]').textContent.indexOf('سفارش') > -1 ? 'yes' : 'no'")
chk "نوار آمار: «سفارش» جای «تماس»" "$CHK8" "yes"
CHK9=$(q "document.querySelectorAll('#guest-grid .pmin').length")
chk "«حداقل خرید» روی ۴ کارت" "$CHK9" "4"
CHK10=$(q "document.querySelector('button.brand-link') ? 'yes' : 'no'")
chk "برند = دکمهٔ کلیک‌پذیر" "$CHK10" "yes"
CHK11=$(q "document.querySelector('button.brand-link').getAttribute('data-go')")
chk "کلیک برند → ورود به پنل (s-login)" "$CHK11" "s-login"
CHK12=$(q "document.querySelector('.brand-logo use') ? document.querySelector('.brand-logo use').getAttribute('href') : 'none'")
chk "لوگوی M کج (i-logo) در برند" "$CHK12" "#i-logo"

echo "─── ۲) سبد مهمان: حداقل خرید + استپر بزرگ ───"
q "document.querySelector('[data-add-cart=\"l1\"]').click()" >/dev/null; sleep 0.4
CHK13=$(q "document.querySelector('#guest-cart-badge').textContent")
chk "نشان سبد = حداقل سفارش (۵)" "$CHK13" "۵"
q "document.querySelector('#guest-cart-btn').click()" >/dev/null; sleep 0.5
CHK14=$(q "document.querySelector('#cart-list .cart-it .ci-top') ? 'yes' : 'no'")
chk "چیدمان دوطبقه: طبقهٔ بالا (عنوان/توضیح)" "$CHK14" "yes"
CHK15=$(q "document.querySelector('#cart-list .cart-it .ci-bottom') ? 'yes' : 'no'")
chk "طبقهٔ پایین (قیمت/استپر)" "$CHK15" "yes"
CHK16=$(q "document.querySelector('#cart-list .cart-it .bk-step').getBoundingClientRect().width")
chk "استپر ± سبد = ۴۲px (قاعدهٔ لمس)" "$CHK16" "42"
CHK17=$(q "document.querySelector('#cart-list .ci-tx small').textContent.indexOf('حداقل ۵') > -1 ? 'yes' : 'no'")
chk "توضیح کارت: «حداقل ۵ کیسه»" "$CHK17" "yes"
CHK18=$(q "document.querySelector('#cart-total').textContent.replace(/[^۰-۹٬]/g,'')")
chk "جمع کل بدون تخفیف (۵×۲٬۸۵۰٬۰۰۰)" "$CHK18" "۱۴٬۲۵۰٬۰۰۰"
q "document.querySelector('[data-cart-step=\"-1\"]').click()" >/dev/null; sleep 0.3
CHK19=$(q "document.querySelector('#cart-list .ci-n').value")
chk "کاهش زیر حداقل: رد می‌شود (۵ می‌ماند)" "$CHK19" "۵"
CHK20=$(q "Array.from(document.querySelectorAll('.toast')).map(function(t){return t.textContent}).join('|').indexOf('حداقل سفارش همین مقدار است') > -1 ? 'yes' : 'no'")
chk "پیام «حداقل سفارش همین مقدار است»" "$CHK20" "yes"
q "document.querySelector('[data-cart-step=\"1\"]').click()" >/dev/null; sleep 0.3
CHK21=$(q "document.querySelector('#cart-list .ci-n').value")
chk "افزایش: ۶" "$CHK21" "۶"

echo "─── ۳) ثبت سفارش مهمان → حساب (زمینهٔ order) → موفقیت → میز خرید ───"
q "document.querySelector('#cart-order').click()" >/dev/null; sleep 0.5
CHK22=$(q "!document.querySelector('#sheet-account').hidden")
chk "شیت حساب باز شد (گیت در سفارش، نه در سبد)" "$CHK22" "true"
CHK23=$(q "document.querySelector('#acc-title').textContent")
chk "عنوان = «ساخت حساب و ثبت سفارش»" "$CHK23" "ساخت حساب و ثبت سفارش"
CHK24=$(q "document.querySelector('#acc-submit').textContent.indexOf('ثبت سفارش') > -1 ? 'yes' : 'no'")
chk "دکمه = «ساخت حساب و ثبت سفارش»" "$CHK24" "yes"
q "document.querySelector('#acc-phone').value='۰۹۱۲۳۴۵۶۷۸۹'; document.querySelector('#acc-name').value='رضا کریمی'; document.querySelector('#acc-biz').value='سوپرمارکت رضا'; 'ok'" >/dev/null
q "document.querySelector('#acc-submit').click()" >/dev/null; sleep 1.0
CHK25=$(q "!document.querySelector('#sheet-cart').hidden")
chk "شیت سبد با نمای موفقیت باز شد" "$CHK25" "true"
CHK26=$(q "document.querySelector('#cart-success .ok-ttl').textContent")
chk "عنوان موفقیت = «سفارش شما ارسال شد»" "$CHK26" "سفارش شما ارسال شد"
CHK27=$(q "document.querySelector('#cart-success .ok-sub').textContent")
chk "بدنه = «برای پیگیری سفارش، به میز خرید خود در آیمچ بروید.»" "$CHK27" "برای پیگیری سفارش، به میز خرید خود در آیمچ بروید"
CHK28=$(q "document.querySelector('#cart-track').textContent.trim()")
chk "دکمه = «پیگیری سفارش در میز خرید»" "$CHK28" "پیگیری سفارش در میز خرید"
CHK29=$(q "document.querySelector('#guest-cust-card').hidden")
chk "کاتالوگ خودکار ذخیره شد → کارت مشتری پیداست" "$CHK29" "false"
CHK30=$(q "document.querySelector('#gcc-title').textContent")
chk "کارت مشتری = «سبد خرید رضا کریمی» (نام ثبت‌نام)" "$CHK30" "سبد خرید رضا کریمی"
CHK31=$(q "document.querySelector('#gcc-group').textContent")
chk "نوع مشتری تازه = معمولی" "$CHK31" "معمولی"
CHK32=$(q "document.querySelector('#gcc-disc').hidden")
chk "خط تخفیف برای معمولی (۰٪): مخفی" "$CHK32" "true"
CHK33=$(q "document.querySelector('#guest-save-btn').hidden")
chk "دکمهٔ ذخیره در حالت مشتری: مخفی" "$CHK33" "true"
CHK34=$(q "document.querySelector('#guest-save-box').hidden")
chk "کادر ذخیره در حالت مشتری: مخفی" "$CHK34" "true"
q "document.querySelector('#cart-track').click()" >/dev/null; sleep 0.8
CHK35=$(q "document.querySelector('.screen:not([hidden]).id') === null ? document.querySelector('.screen:not([hidden])').id : 'none'")
chk "دکمهٔ پیگیری → میز خرید" "$CHK35" "s-home-buy"

echo "─── ۴) ورود (سعید محمدی — همکار ٪۵): کارت مشتری و تخفیف‌ها ───"
agent-browser reload >/dev/null 2>&1; sleep 1.6
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1
q "iMach.show('s-catalog-guest', false)" >/dev/null; sleep 0.6
q "document.querySelector('#guest-login-btn').click()" >/dev/null; sleep 0.5
CHK36=$(q "document.querySelector('#acc-title').textContent")
chk "عنوان نمای ورود = «ورود و ذخیره کاتالوگ»" "$CHK36" "ورود و ذخیره کاتالوگ"
q "document.querySelector('#acc-lphone').value='۰۹۱۲۵۵۵۲۹۱۳'; document.querySelector('#acc-lpass').value='secret123'; 'ok'" >/dev/null
q "document.querySelector('#acc-login-submit').click()" >/dev/null; sleep 0.9
CHK37=$(q "document.querySelector('#guest-cust-card').hidden")
chk "بعد از ورود: کارت مشتری پیداست" "$CHK37" "false"
CHK38=$(q "document.querySelector('#gcc-title').textContent")
chk "کارت = «سبد خرید سعید محمدی»" "$CHK38" "سبد خرید سعید محمدی"
CHK39=$(q "document.querySelector('#gcc-group').textContent")
chk "نوع مشتری = همکار" "$CHK39" "همکار"
CHK40=$(q "document.querySelector('#gcc-disc').hidden")
chk "خط «تخفیف اختصاصی اعمال شده»: پیداست" "$CHK40" "false"
CHK41=$(q "document.querySelector('#gcc-disc').textContent")
chk "متن خط تخفیف (فونت کمرنگ‌تر)" "$CHK41" "تخفیف اختصاصی برای شما روی کالاها اعمال شده"
CHK42=$(q "document.querySelector('#gcc-count').textContent")
chk "شمار قلم سبد روی کارت = ۰" "$CHK42" "۰"
CHK43=$(q "document.querySelector('#guest-login-btn').hidden")
chk "قرص «ورود» بعد از ورود: مخفی" "$CHK43" "true"

echo "─── ۵) تخفیف در سبد و جزئیات کالا (۳۷) ───"
q "document.querySelector('[data-add-cart=\"l1\"]').click()" >/dev/null; sleep 0.3
q "document.querySelector('[data-add-cart=\"l2\"]').click()" >/dev/null; sleep 0.3
q "document.querySelector('#guest-cart-btn').click()" >/dev/null; sleep 0.5
CHK44=$(q "document.querySelector('#cart-list .ci-base') ? document.querySelector('#cart-list .ci-base').textContent : 'none'")
chk "قیمت پایه خط‌خورده (۲٬۸۵۰٬۰۰۰)" "$CHK44" "۲٬۸۵۰٬۰۰۰"
CHK45=$(q "Array.from(document.querySelectorAll('#cart-list .ci-price b')).map(function(b){return b.textContent}).join('|')")
chk "قیمت با تخفیف: l1 ٪۷ مخصوص محصول + l2 ٪۵ گروه" "$CHK45" "۲٬۶۵۱٬۰۰۰|۲٬۶۱۳٬۰۰۰"
CHK46=$(q "Array.from(document.querySelectorAll('#cart-list .badge.b-green')).map(function(b){return b.textContent}).join('|')")
chk "بج تخفیف: «٪۷ همکار|٪۵ همکار»" "$CHK46" "٪۷ همکار|٪۵ همکار"
CHK47=$(q "document.querySelector('#cart-total').textContent.replace(/[^۰-۹٬]/g,'')")
chk "جمع با تخفیف (۵×۲٬۶۵۱٬۰۰۰ + ۵×۲٬۶۱۳٬۰۰۰)" "$CHK47" "۲۶٬۳۲۰٬۰۰۰"
q "iMach.show('s-product-view', true, {id:'l1'})" >/dev/null; sleep 0.6
CHK48=$(q "document.querySelector('#pv-disc').hidden")
chk "ردیف «قیمت برای تو» در ۳۷: پیداست" "$CHK48" "false"
CHK49=$(q "document.querySelector('#pv-disc-grp').textContent")
chk "برچسب تخفیف = «(تخفیف همکار ٪۷)»" "$CHK49" "(تخفیف همکار ٪۷)"
CHK50=$(q "document.querySelector('#pv-disc-price').textContent")
chk "قیمت برای تو = ۲٬۶۵۱٬۰۰۰" "$CHK50" "۲٬۶۵۱٬۰۰۰"

echo "─── ۶) سوییچ ۳۶: «مشاهده قیمت‌ها فقط برای مشتریان» واقعاً کار می‌کند ───"
# رفرش = کاربرِ تازه (مهمان)؛ تنظیم فروشنده مستقیم ست می‌شود (مثل ذخیرهٔ ۳۶)
agent-browser reload >/dev/null 2>&1; sleep 1.6
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1
q "DATA.catalogSettings.pricesCustomersOnly = true; 'ok'" >/dev/null
q "iMach.show('s-catalog-guest', false)" >/dev/null; sleep 0.6
CHK56=$(q "document.querySelector('#s-catalog-guest').classList.contains('gated')")
chk "۳۱ مهمان در حالت «قیمت فقط مشتریان»: gated" "$CHK56" "true"
CHK57=$(q "getComputedStyle(document.querySelector('#guest-grid .pprice')).display")
chk "قیمت برای مهمان: مخفی" "$CHK57" "none"
CHK58=$(q "getComputedStyle(document.querySelector('#guest-grid .price-cta')).display")
chk "«مشاهده قیمت» برای مهمان: پیداست" "$CHK58" "flex"
CHK59=$(q "getComputedStyle(document.querySelector('#guest-grid .addcart-btn')).display")
chk "دکمهٔ + برای مهمان: مخفی (قاعدهٔ FD-12)" "$CHK59" "none"
CHK60=$(q "getComputedStyle(document.querySelector('#guest-cart-btn')).display")
chk "سبد نوار پایین برای مهمان: مخفی" "$CHK60" "none"
# ویرایش کاتالوگ: سوییچ باید «روشن» را نشان دهد و با کلیک خاموش کند
q "iMach.show('s-cat-edit', false)" >/dev/null; sleep 0.6
CHK51=$(q "document.querySelector('#cate-prices-only') ? 'yes' : 'no'")
chk "سوییچ در ویرایش کاتالوگ هست" "$CHK51" "yes"
CHK52=$(q "document.querySelector('#cate-prices-only').classList.contains('on')")
chk "حالت ذخیره‌شده: روشن (از تنظیمات زنده)" "$CHK52" "true"
CHK53=$(q "document.querySelector('#cate-prices-hint').textContent.indexOf('روشن') > -1 ? 'yes' : 'no'")
chk "هینت حالت روشن" "$CHK53" "yes"
q "document.querySelector('#cate-prices-only').click()" >/dev/null; sleep 0.3
CHK54=$(q "DATA.catalogSettings.pricesCustomersOnly")
chk "کلیک سوییچ: خاموش شد (دیتا)" "$CHK54" "false"
CHK55=$(q "document.querySelector('#cate-prices-hint').textContent.indexOf('خاموش') > -1 ? 'yes' : 'no'")
chk "هینت حالت خاموش (قیمت برای همه)" "$CHK55" "yes"
q "iMach.show('s-catalog-guest', false)" >/dev/null; sleep 0.6
CHK61=$(q "document.querySelector('#s-catalog-guest').classList.contains('open-market')")
chk "۳۱ بعد از خاموش‌کردن: بازارِ باز" "$CHK61" "true"
CHK61b=$(q "getComputedStyle(document.querySelector('#guest-grid .pprice')).display")
chk "قیمت برای مهمان در بازارِ باز: پیداست" "$CHK61b" "block"

echo "─── ۷) پیش‌نمایش فروشنده (دید عمومی) سالم است ───"
q "iMach.show('s-catalog-guest', true, {preview:1})" >/dev/null; sleep 0.6
CHK62=$(q "getComputedStyle(document.querySelector('#guest-grid .pprice')).display")
chk "پیش‌نمایش: قیمت‌ها پیداست" "$CHK62" "block"
CHK63=$(q "getComputedStyle(document.querySelector('#guest-save-btn')).display")
chk "پیش‌نمایش: دکمهٔ ذخیره مخفی" "$CHK63" "none"
CHK64=$(q "getComputedStyle(document.querySelector('#guest-grid .addcart-btn')).display")
chk "پیش‌نمایش: دکمهٔ + مخفی" "$CHK64" "none"
CHK65=$(q "getComputedStyle(document.querySelector('#guest-cust-card')).display")
chk "پیش‌نمایش: کارت مشتری مخفی" "$CHK65" "none"

echo "─── ۸) خطاهای درون‌صفحه‌ای ───"
CHK66=$(q "window.__errs.length + ' خطا'")
chk "صفر خطای JS در کل جریان" "$CHK66" "0 خطا"

echo ""
echo "═══ نتیجه: $pass ✓ / $fail ✗ ═══"
exit 0
