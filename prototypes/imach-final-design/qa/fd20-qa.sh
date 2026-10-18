#!/bin/bash
# FD-20 QA رفتاری — تنظیمات زبان/ارز در طرح (بدون عملکرد واقعی — حکم مالک)
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

echo "─── ۱) بخش تنظیمات در پروفایل ───"
q "iMach.show('s-profile', false); 'ok'" >/dev/null; sleep 0.7
C1=$(q "document.getElementById('set-lang-row') && document.getElementById('set-currency-row') ? 'yes' : 'no'")
chk "ردیف‌های «زبان» و «ارز نمایش» در پروفایل" "$C1" "yes"
C2=$(q "document.getElementById('set-lang-val').textContent + '|' + document.getElementById('set-currency-val').textContent")
chk "مقادیر فعلی: فارسی | تومان (IRT)" "$C2" "فارسی|تومان (IRT)"

echo "─── ۲) شیت زبان ───"
q "document.getElementById('set-lang-row').click(); 'ok'" >/dev/null; sleep 0.6
C3=$(q "document.getElementById('sheet-lang').classList.contains('show') ? 'open' : 'closed'")
chk "شیت زبان باز شد" "$C3" "open"
C4=$(q "document.querySelectorAll('#sheet-lang [data-set-lang]').length")
chk "۳ گزینهٔ زبان (fa/en/ar)" "$C4" "3"
C5=$(q "document.querySelectorAll('#sheet-lang .badge.b-gray').length")
chk "۲ گزینه با نشان «به‌زودی»" "$C5" "2"
C6=$(q "document.querySelector('#sheet-lang [data-set-lang=\"fa\"]').classList.contains('selected') ? 'sel' : 'nosel'")
chk "فارسی انتخاب‌شده (تیک سبز)" "$C6" "sel"

echo "─── ۳) گزینهٔ غیرفعال انتخاب نمی‌شود ───"
q "document.querySelector('#sheet-lang [data-set-lang=\"en\"]').click(); 'ok'" >/dev/null; sleep 0.5
C7=$(q "document.querySelector('#sheet-lang [data-set-lang=\"en\"]').classList.contains('selected') ? 'changed' : 'unchanged'")
chk "English انتخاب نشد — فقط خبر" "$C7" "unchanged"
C8=$(q "document.getElementById('sheet-lang').classList.contains('show') ? 'still-open' : 'closed'")
chk "شیت باز ماند (انتخابی نبود)" "$C8" "still-open"
q "document.querySelector('#sheet-lang [data-sheet-close=\"sheet-lang\"]').click(); 'ok'" >/dev/null; sleep 0.4

echo "─── ۴) شیت ارز ───"
q "document.getElementById('set-currency-row').click(); 'ok'" >/dev/null; sleep 0.6
C9=$(q "document.getElementById('sheet-currency').classList.contains('show') ? 'open' : 'closed'")
chk "شیت ارز باز شد" "$C9" "open"
C10=$(q "document.querySelectorAll('#sheet-currency [data-set-currency]').length")
chk "۳ گزینهٔ ارز (IRT/USD/AED)" "$C10" "3"
C11=$(q "document.querySelector('#sheet-currency .sub').textContent")
chk "قاعدهٔ داده در زیرمتن: «قیمت‌ها همیشه به تومان ذخیره می‌شوند»" "$C11" "تومان ذخیره"
q "document.querySelector('#sheet-currency [data-set-currency=\"USD\"]').click(); 'ok'" >/dev/null; sleep 0.5
C12=$(q "document.querySelector('#sheet-currency [data-set-currency=\"USD\"]').classList.contains('selected') ? 'changed' : 'unchanged'")
chk "دلار انتخاب نشد — فقط خبر" "$C12" "unchanged"
q "document.querySelector('#sheet-currency [data-set-currency=\"IRT\"]').click(); 'ok'" >/dev/null; sleep 0.5
C13=$(q "iMach.data.user.settings.currency")
chk "انتخاب تومان ثبت شد (settings.currency=IRT)" "$C13" "IRT"
C14=$(q "document.getElementById('sheet-currency').classList.contains('show') ? 'open' : 'closed'")
chk "شیت بعد از انتخاب فعال بسته شد" "$C14" "closed"

echo "─── ۵) دیتای تنظیمات ───"
C15=$(q "iMach.data.user.settings.lang + '/' + iMach.data.user.settings.currency")
chk "settings = lang:fa / currency:IRT" "$C15" "fa/IRT"

echo "─── ۶) صفر خطا ───"
C16=$(q "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'")
chk "کل جلسه بدون خطا" "$C16" "CLEAN"

echo ""
echo "=== FD-20 QA: $pass OK / $fail FAIL ==="
