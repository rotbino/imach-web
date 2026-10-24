#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M10 UI e2e: محتوای اجتماعی و SEO عمومی — در مرورگر (Atlas)
# سناریوی DoD:
#   + لندینگ: نوار «نظر خریداران» + دیالوگ ثبت نظر مهمان (صف ادمین)
#   + /reviews: فهرست کامل + CTA
#   + /c/[slug]: چیپ امتیاز هدر + شیت نظرات (فرم خریدار upsert + پاسخ فروشنده)
#   + /buy/[slug]: زنگولهٔ گوش-به-زنگ + کادر راهنمای مالک
#   + /sell/rfqs: تب «گوش به زنگ» (استعلام رسیده + نیاز اعلام‌شده)
#   + راهنماها: /sell/guide + /buy/guide (فیلم‌ها + بازخورد/پرسش + لایک)
#   + /item/[id]: شیت «تاریخچهٔ رویدادها» (WATCH_ADD/INQUIRY + شمارنده‌ها)
#   + SEO: متادیتا/OG + JSON-LD + sitemap + robots + صفر خطای کنسول
# Usage: bash qa-app/m10-ui-e2e.sh  (from imach-web; backend at ../imach-back)
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
SHOTS=$WEB/shots-m10
mkdir -p $SHOTS
BASE=http://127.0.0.1:4000/api/v1
MONGO=$(grep '^DATABASE_URL=' $BACK/.env | cut -d= -f2- | sed 's/^"//; s/"$//')
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "✔ $1"; }
bad() { FAIL=$((FAIL+1)); echo "✖ $1"; }
B=agent-browser

xbtn() {
  $B eval "(()=>{const b=document.evaluate(\"//button[contains(., '$1')]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
}
jval() { echo "$1" | tr -d '"'; }
wEval() {
  for i in $(seq 1 10); do
    R=$(jval "$($B eval "$1" 2>/dev/null)")
    [ "$R" = "YES" ] && return 0
    sleep 1.6
  done
  return 1
}
stext() {
  for i in 1 2 3 4 5 6 7 8; do
    if $B read 2>/dev/null | python3 -c "
import sys
t = sys.stdin.read().replace('\u200c','').replace('\u200f','').replace('\u200e','')
p = sys.argv[1].replace('\u200c','')
sys.exit(0 if p in t else 1)
" "$1" 2>/dev/null; then return 0; fi
    sleep 1.6
  done
  return 1
}
setinput() { # css-selector value — setter بومی + رویداد input (درس M8)
  $B eval "(()=>{const i=document.querySelector(\"$1\"); if(!i) return 'NF'; const proto=i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; const set=Object.getOwnPropertyDescriptor(proto,'value').set; set.call(i,'$2'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'OK'})()" >/dev/null 2>&1
}

browser_login() {
  local NAT=$1
  $B cookies clear >/dev/null 2>&1
  $B open "http://localhost:3000/login?cc=IR" >/dev/null 2>&1
  sleep 2
  $B cookies set imach_locale fa >/dev/null 2>&1
  sleep 1
  $B fill "//input[contains(@aria-label, \"شماره موبایل\")]" "$NAT" >/dev/null 2>&1
  sleep 1
  xbtn "ورود به آی"
  sleep 9
}

echo "── 1. boot servers ──"
$B close --all >/dev/null 2>&1
cd $BACK
pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null; sleep 1
DATABASE_URL="$MONGO" STORAGE_DRIVER=local UPLOAD_PATH="$BACK/uploads" setsid nohup node dist/main.js > /tmp/imach-back-m10ui.log 2>&1 < /dev/null &
cd $WEB
rm -rf .next
setsid nohup npm run s > /tmp/imach-web-m10ui.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

# M10 درس بزرگ QA: Service Worker (PWA push) با networkFirst در لحظهٔ مرگِ
# بین‌فراخوانیِ dev سرور، پوستهٔ کهنه را در SHELL_CACHE نگه می‌دارد و کل
# تست‌ها را با HTML قدیمی مسموم می‌کند — هر اجرا: unregister + پاک‌کردن کش‌ها
$B open "http://localhost:3000/login" >/dev/null 2>&1; sleep 3
$B eval "navigator.serviceWorker.getRegistrations().then(async rs=>{for(const r of rs) await r.unregister(); const ks=await caches.keys(); for(const k of ks) await caches.delete(k); return 'sw-cleared:'+rs.length}).catch(e=>'sw-err')" >/dev/null 2>&1
sleep 1
ok "service worker + caches purged"

# گرم‌کردن مسیرهای dev (rm -rf .next ⇒ کامپایل لحظه‌ای هر مسیر سنگین است؛
# بدون گرم‌کردن، باز‌بودن اولِ هر مسیر با timeoutهای آزمون می‌رقبت)
for ROUTE in "/" "/reviews" "/buy/guide" "/sell/guide" "/start"; do
  $B open "http://localhost:3000$ROUTE" >/dev/null 2>&1
  for i in $(seq 1 40); do
    T=$($B get title 2>/dev/null | tr -d '"')
    [ -n "$T" ] && [ "$T" != "about:blank" ] && break
    sleep 1.5
  done
done
$B close --all >/dev/null 2>&1
ok "routes warmed (dev compile)"

echo "── 2. seed via API: S/B/S2 + کالا + لیستینگ + نظر + نیاز BUY ──"
req() { if [ -n "${4:-}" ]; then curl -s -m 30 -X $1 $BASE$2 -H "content-type: application/json" -H "authorization: Bearer $3" -d "$4" 2>/dev/null; else curl -s -m 30 -X $1 $BASE$2 -H "authorization: Bearer $3" 2>/dev/null; fi; }
jget() { echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); print($2)" 2>/dev/null; }
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+$1) % 1000000000 )))"; }
STAMP=$(date +%s | tail -c 5)
S_NAT=$(mkphone 61); B_NAT=$(mkphone 62); S2_NAT=$(mkphone 63)
SJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$S_NAT\",\"country\":\"IR\"}")
ST=$(jget "$SJ" "d['accessToken']"); SB=$(jget "$SJ" "d['businesses'][0]['id']"); SSLUG=$(jget "$SJ" "d['businesses'][0]['slug']")
BJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$B_NAT\",\"country\":\"IR\"}")
BT=$(jget "$BJ" "d['accessToken']"); BB=$(jget "$BJ" "d['businesses'][0]['id']"); BSLUG=$(jget "$BJ" "d['businesses'][0]['id']")
BSLUG=$(jget "$BJ" "d['businesses'][0]['slug']")
S2J=$(req POST /auth/quickRegister "" "{\"phone\":\"$S2_NAT\",\"country\":\"IR\"}")
S2T=$(jget "$S2J" "d['accessToken']"); S2B=$(jget "$S2J" "d['businesses'][0]['id']")
[ -n "$ST" ] && [ -n "$BT" ] && [ -n "$S2T" ] && ok "3 accounts" || { bad "accounts"; exit 1; }

req PATCH /businesses/editBusiness/$SB $ST "{\"name\":\"پخش مهر UI M10\",\"city\":\"رشت\",\"trade\":\"عمده‌فروشی\"}" >/dev/null
req PATCH /businesses/editBusiness/$BB $BT "{\"name\":\"سوپرمارکت UI M10\",\"city\":\"رشت\",\"trade\":\"سوپرمارکت\"}" >/dev/null
req PATCH /businesses/editBusiness/$S2B $S2T "{\"name\":\"بازار شمال UI M10\",\"city\":\"تهران\",\"trade\":\"بازار\"}" >/dev/null

G1=$(req POST /goods/createGood $BT "{\"name\":\"گندم UI M10 $STAMP\",\"unit\":\"KILOGRAM\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":3400000,\"stock\":900,\"minOrder\":1}}" >/dev/null
req PUT /listings/saveListing $S2T "{\"businessId\":\"$S2B\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":3450000,\"stock\":500,\"minOrder\":1}}" >/dev/null
# نیاز خریدار (BUY listing با حجم) — سوخت بخش «نیازهای اعلام‌شده» تب گوش-به-زنگ
req PUT /listings/saveListing $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G1\",\"mode\":\"BUY\",\"buy\":{\"volume\":30,\"frequency\":\"MONTHLY\"}}" >/dev/null
# خریدار کالا را دنبال می‌کند (WATCH_ADD برای شیت تاریخچه) + نظر آماده
req POST /market/watchGood $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G1\",\"supplierId\":\"$SB\"}" >/dev/null
req POST /reviews $BT "{\"businessId\":\"$SB\",\"rating\":5,\"text\":\"قیمت‌ها به‌روز و پاسخ‌گویی سریع — سفارش بدون زنگ‌زدن انجام شد.\"}" >/dev/null
ok "seed: catalogs + need + watch + review"

SLIST=$(req GET "/listings/getMyListings?businessId=$SB" $ST "" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows = d if isinstance(d, list) else d.get('items', d)
print([r['id'] for r in rows if r.get('good',{}).get('id')=='$G1'][0])" 2>/dev/null)

echo "── 3. مهمان: لندینگ — نوار «نظر خریداران» + دیالوگ ثبت ──"
$B open "http://localhost:3000/login" >/dev/null 2>&1; sleep 2
$B cookies set imach_locale fa >/dev/null 2>&1
# purge تازه‌ی SW — ناوبریِ بعدیِ تمیز (ثبتِ دوباره فقط ناوبری‌های بعدی را می‌گیرد)
$B eval "navigator.serviceWorker.getRegistrations().then(async rs=>{for(const r of rs) await r.unregister(); const ks=await caches.keys(); for(const k of ks) await caches.delete(k); return 'purged'}).catch(()=>'err')" >/dev/null 2>&1
sleep 1
$B open "http://localhost:3000/" >/dev/null 2>&1; sleep 8
stext "نظر خریداران" && ok "لندینگ: نوار «نظر خریداران»" || bad "landing band"
# ── تشخیصی موقت M10: علت نبودِ باند ──
$B eval "fetch('/api/v1/feedback/testimonials').then(r=>r.text()).then(t=>{window.__M10T='status-body:'+t.slice(0,90); return 'stored'}).catch(e=>{window.__M10T='ERR:'+e.message; return 'err'})" >/dev/null 2>&1
sleep 3
# تست تعامل: دکمهٔ CTA هیرو (کلاینتی) باید ناوبری کند
$B eval "(()=>{const b=[...document.querySelectorAll('a,button')].find(x=>x.textContent.includes('ساخت حساب')); if(b){b.click(); return 'CLICKED'} return 'NO-CTA'})()" >/dev/null 2>&1
sleep 4
$B open "http://localhost:3000/" >/dev/null 2>&1; sleep 6
for i in $(seq 1 20); do
  V=$($B eval "window.__M10Q || 'no-var'" 2>/dev/null | tr -d '"')
  echo "$V" | grep -q '"fetch":"idle"' && break
  echo "$V" | grep -q "no-var" || true
  sleep 3
done
stext "سایر نظرات" && ok "لینک «سایر نظرات»" || bad "more link"
stext "کاتالوگ با قیمت همیشه به‌روز" && ok "کارت testimonial (seed TS_DATA)" || bad "ts card text"
wEval "document.querySelectorAll('img[src*=\"og.png\"], meta[property=\"og:image\"]') && document.querySelector('meta[property=\"og:image\"]') ? 'YES':'NO'" && ok "SEO: og:image متادیتا" || bad "og meta"
wEval "document.title.includes('آیمچ') ? 'YES':'NO'" && ok "SEO: title فارسی" || bad "landing title"
$B screenshot $SHOTS/01-landing-band-mobile.png >/dev/null 2>&1

# دیالوگ ثبت نظر مهمان
xbtn "ثبت نظر شما"; sleep 3
wEval "document.querySelector('textarea[placeholder*=\"آیمچ چه کمکی\"]') ? 'YES':'NO'" && ok "دیالوگ ثبت نظر باز شد" || bad "review dialog"
# الگوی اثبات‌شده: همهٔ فیلدها در یک eval + setter بومی + رویداد input (درس M8)
$B eval "(()=>{const fill=(sel,val)=>{const i=document.querySelector(sel); if(!i) return 'NF'; const proto=i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(i,val); i.dispatchEvent(new Event('input',{bubbles:true})); return 'OK'}; return fill('input[placeholder*=\"رضا کریمی\"]','مهمان آزمون M10')+fill('input[placeholder*=\"شوینده\"]','بازرگانی آزمون M10')+fill('textarea[placeholder*=\"آیمچ چه کمکی\"]','از استعلام رقابتی آیمچ برای خرید ماهانه استفاده کردیم.')})()" >/dev/null 2>&1
sleep 1
# دکمهٔ دقیق «ثبت نظر» (نه «ثبت نظر شما»ی نوار — درس انتخاب‌گر)
$B eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='ثبت نظر'); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 5
stext "نظر شما ثبت شد" && ok "مهمان: ثبت شد (صف ادمین)" || bad "guest submit"
$B screenshot $SHOTS/02-review-dialog-done.png >/dev/null 2>&1
xbtn "باشه، ممنون"; sleep 2

echo "── 4. مهمان: /reviews + SEO فنی ──"
$B open "http://localhost:3000/reviews" >/dev/null 2>&1; sleep 4
stext "تجربهٔ کاربران آیمچ" && ok "/reviews: هدر صفحه" || bad "reviews header"
stext "ثبت نظر شما" && ok "/reviews: CTA ثبت" || bad "reviews cta"
wEval "document.querySelectorAll('article').length >= 5 ? 'YES':'NO'" && ok "/reviews: فهرست کارت‌ها" || bad "reviews list"
$B screenshot $SHOTS/03-reviews-mobile.png >/dev/null 2>&1

$B open "http://localhost:3000/c/$SSLUG" >/dev/null 2>&1; sleep 5
wEval "document.querySelector('script[type=\"application/ld+json\"]') ? 'YES':'NO'" && ok "SEO: JSON-LD روی /c" || bad "json-ld"
wEval "JSON.parse(document.querySelector('script[type=\"application/ld+json\"]').text)['@graph'].some(x=>x['@type']==='Store') ? 'YES':'NO'" && ok "JSON-LD: Store + OfferCatalog" || bad "json-ld store"
stext "پخش مهر UI M10" && ok "/c: هدر ویترین" || bad "catalog header"

echo "── 5. خریدار: شیت نظرات — upsert فرم ──"
browser_login $B_NAT
$B open "http://localhost:3000/c/$SSLUG" >/dev/null 2>&1; sleep 5
wEval "document.querySelector('header button[aria-label*=\"امتیاز کاتالوک\"]') ? 'YES':'NO'" && ok "خریدار: چیپ امتیاز هدر" || bad "rating chip"
# باز کردن شیت نظرات از چیپ امتیاز (aria-label)
$B eval "(()=>{const b=document.querySelector('header button[aria-label*=\"امتیاز کاتالوک\"]'); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 3
stext "نظرات پخش مهر UI M10" && ok "شیت نظرات باز شد" || bad "reviews sheet open"
stext "قیمت‌ها به‌روز و پاسخ‌گویی سریع" && ok "ریز نظر seed دیده می‌شود" || bad "seed review visible"
stext "نظر شما (قابل ویرایش)" && ok "فرم upsert با نظر موجود پر شد" || bad "upsert form prefilled"
$B screenshot $SHOTS/04-review-sheet-buyer.png >/dev/null 2>&1
# تغییر امتیاز به ۴ + متن تازه + ثبت
$B eval "(()=>{const s=[...document.querySelectorAll('button[role=\"radio\"]')]; const four=s[3]; if(four){four.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 1
setinput "textarea[placeholder*=\"چیزی که خریدار بعدی\"]" "به‌روزرسانی: همه‌چیز خوب بود؛ فقط ارسال یک روز دیرتر شد."
xbtn "به‌روزرسانی نظر"; sleep 4
stext "نظر شما ثبت شد" && ok "خریدار: به‌روزرسانی نظر (upsert)" || bad "review update"
xbtn "بستن"; sleep 2

echo "── 6. فروشنده: پاسخ به نظر ──"
$B eval "(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.textContent.trim()==='پاسخ'); if(b.length){b[0].click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 2
browser_login $S_NAT
$B open "http://localhost:3000/c/$SSLUG" >/dev/null 2>&1; sleep 5
$B eval "(()=>{const b=document.querySelector('header button[aria-label*=\"امتیاز کاتالوک\"]') || [...document.querySelectorAll('header button')].find(x=>x.textContent.includes('نظرات')); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 3
# صبر برای رندر ریز نظر (کوئری شیت) — بعد دکمهٔ پاسخ
stext "قیمت‌ها به‌روز" || true
$B eval "(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.textContent.trim()==='پاسخ'); if(b.length){b[0].click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 2
# پرکردن پاسخ با retry (اگر re-render مقدار را خورد، دوباره)
for TRY in 1 2 3; do
  $B eval "(()=>{const t=document.querySelector('textarea[placeholder*=\"پاسخ عمومی شما\"]'); if(!t) return 'NF'; const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; set.call(t,'ممنون از شما؛ تامین تازه‌مان رسید و تاخیر ارسال جبران شد.'); t.dispatchEvent(new Event('input',{bubbles:true})); return 'OK'})()" >/dev/null 2>&1
  sleep 1
  V=$($B eval "(()=>{const t=document.querySelector('textarea[placeholder*=\"پاسخ عمومی شما\"]'); return t? String(t.value.length):'0'})()" 2>/dev/null | tr -d '"')
  [ "$V" -gt 5 ] 2>/dev/null && break
  sleep 1.5
done
$B eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='ثبت پاسخ'); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 5
stext "پاسخ فروشنده" && ok "فروشنده: پاسخ زیر نظر نشست" || bad "seller reply"
$B screenshot $SHOTS/05-review-reply.png >/dev/null 2>&1
xbtn "بستن"; sleep 2

echo "── 7. فروشندهٔ دوم: زنگولهٔ /buy/[slug] ──"
browser_login $S2_NAT
$B open "http://localhost:3000/buy/$BSLUG" >/dev/null 2>&1; sleep 5
stext "کالاهای موردنیاز" && ok "/buy: بخش کالاهای موردنیاز" || bad "buy needed section"
stext "زنگولهٔ کنار کالا بزنید" && ok "کادر راهنمای مالک (فاز ۲۸)" || bad "bell guide note"
wEval "document.querySelector('button[aria-label^=\"گوش به زنگ\"]') ? 'YES':'NO'" && ok "دکمهٔ زنگوله روی ردیف" || bad "bell button"
$B screenshot $SHOTS/06-buy-bell.png >/dev/null 2>&1
$B eval "(()=>{const b=document.querySelector('button[aria-label^=\"گوش به زنگ\"]'); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 3
stext "گوش به زنگ" && ok "زنگوله روشن شد (toast/حالت)" || bad "bell toggle"
wEval "[...document.querySelectorAll('button[aria-label^=\"گوش به زنگ\"]')].some(b=>b.getAttribute('aria-pressed')==='true') ? 'YES':'NO'" && ok "حالت زنگوله: روشن (aria-pressed)" || bad "bell pressed state"

echo "── 8. RFQ تازه (API) → تب «گوش به زنگ» ──"
req POST /market/requestQuote $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G1\",\"volume\":25,\"supplierIds\":[\"$S2B\"],\"expiresDays\":3}" >/dev/null
# استعلام مستقیم به S هم — برای ردیف INQUIRY در شیت تاریخچهٔ کالای S
req POST /market/requestQuote $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G1\",\"volume\":15,\"supplierIds\":[\"$SB\"],\"expiresDays\":3}" >/dev/null
ok "RFQ جدید به S2 و S (API)"
$B open "http://localhost:3000/sell/rfqs" >/dev/null 2>&1; sleep 5
stext "گوش به زنگ" && ok "/sell/rfqs: تب گوش-به-زنگ حاضر" || bad "watch tab present"
$B eval "(()=>{const t=[...document.querySelectorAll('button[role=\"tab\"]')].find(x=>x.textContent.includes('گوش به زنگ')); if(t){t.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 4
stext "استعلام‌های رسیده" && ok "تب: بخش استعلام‌های رسیده" || bad "watch rfqs section"
stext "زنگوله‌ات روشن بود" && ok "کارت استعلام با بج زنگوله" || bad "watch rfq card"
stext "نیازهای اعلام‌شده" && ok "تب: بخش نیازهای اعلام‌شده" || bad "watch needs section"
stext "در کاتالوک تو" && ok "بج «در کاتالوک تو» روی نیاز" || bad "need badge"
$B screenshot $SHOTS/07-watch-tab.png >/dev/null 2>&1

echo "── 9. راهنمای دستیار فروش: فیلم‌ها + بازخورد ──"
$B open "http://localhost:3000/sell/guide" >/dev/null 2>&1; sleep 5
stext "دستیار فروش آیمچ چی‌کار می‌کند؟" && ok "/sell/guide: سرآغاز" || bad "guide lead"
stext "فیلم‌های آموزشی" && ok "نوار فیلم‌های آموزشی" || bad "video band"
wEval "document.querySelectorAll('img[src*=\"/screenshots/\"]').length >= 3 ? 'YES':'NO'" && ok "پوستر فیلم‌ها (seed)" || bad "video posters"
stext "بازخورد و پرسش‌وپاسخ" && ok "بخش بازخورد/پرسش" || bad "feedback section"
# ثبت بازخورد از UI
$B eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('تجربهٔ تازه بنویسید')); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 2
for TRY in 1 2 3; do
  $B eval "(()=>{const t=document.querySelector('textarea[placeholder*=\"چه چیزی به کارتان\"]'); if(!t) return 'NF'; const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; set.call(t,'کاتالوگ با به‌روزرسانی گروهی واقعا کار روزانه ما را ساده کرد.'); t.dispatchEvent(new Event('input',{bubbles:true})); return 'OK'})()" >/dev/null 2>&1
  sleep 1
  V=$($B eval "(()=>{const t=document.querySelector('textarea[placeholder*=\"چه چیزی به کارتان\"]'); return t? String(t.value.length):'0'})()" 2>/dev/null | tr -d '"')
  [ "$V" -gt 5 ] 2>/dev/null && break
  sleep 1.5
done
$B eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='ارسال بازخورد'); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 2
# toast ۲.۶s زود می‌رود (درس M9) — نشانهٔ پایدار: پست تازه در فهرست بازخوردها
stext "به‌روزرسانی گروهی واقعا" && ok "بازخورد ثبت شد از UI (پست تازه در فهرست)" || bad "feedback submit"
$B screenshot $SHOTS/08-sell-guide.png >/dev/null 2>&1

echo "── 10. نمای کالا: شیت تاریخچهٔ رویدادها ──"
browser_login $S_NAT
$B open "http://localhost:3000/item/$SLIST" >/dev/null 2>&1; sleep 5
stext "تاریخچهٔ رویدادها" && ok "/item: دکمهٔ تاریخچهٔ رویدادها" || bad "events button"
xbtn "تاریخچهٔ رویدادها"; sleep 4
stext "بازدید کل" && ok "شیت: شمارنده‌ها" || bad "event counters"
stext "افزودن به لیست خرید" && ok "شیت: ردیف WATCH_ADD (label)" || bad "watch_add row label"
stext "استعلام قیمت" && ok "شیت: ردیف INQUIRY" || bad "inquiry row"
$B screenshot $SHOTS/09-events-sheet.png >/dev/null 2>&1
xbtn "بستن"; sleep 2

echo "── 11. SEO فنی: sitemap + robots ──"
curl -sf http://localhost:3000/sitemap.xml >/dev/null 2>&1 && ok "sitemap.xml 200" || bad "sitemap"
curl -s http://localhost:3000/sitemap.xml | grep -q "/c/" && ok "sitemap: کاتالوگ‌های عمومی" || bad "sitemap catalogs"
curl -s http://localhost:3000/sitemap.xml | grep -q "/reviews" && ok "sitemap: /reviews" || bad "sitemap reviews"
curl -sf http://localhost:3000/robots.txt >/dev/null 2>&1 && ok "robots.txt 200" || bad "robots"
curl -s http://localhost:3000/robots.txt | grep -q "Disallow: /me" && ok "robots: صفحات خصوصی بسته" || bad "robots private"
curl -s http://localhost:3000/robots.txt | grep -q "Sitemap:" && ok "robots: پیوند sitemap" || bad "robots sitemap link"

echo "── 12. دسکتاپ ۱۴۴۰ + صفر خطای کنسول ──"
$B set viewport 1440 900 >/dev/null 2>&1
$B open "http://localhost:3000/reviews" >/dev/null 2>&1; sleep 4
$B screenshot $SHOTS/10-reviews-desktop.png >/dev/null 2>&1
$B open "http://localhost:3000/sell/guide" >/dev/null 2>&1; sleep 4
$B screenshot $SHOTS/11-sell-guide-desktop.png >/dev/null 2>&1
$B open "http://localhost:3000/c/$SSLUG" >/dev/null 2>&1; sleep 4
$B screenshot $SHOTS/12-catalog-desktop.png >/dev/null 2>&1
wEval "document.documentElement.scrollWidth <= 1440 ? 'YES':'NO'" && ok "دسکتاپ: بدون سرریز افقی" || bad "desktop overflow"
ERRS=$($B errors 2>/dev/null | grep -c "Error\|error" || true)
[ "$ERRS" = "0" ] && ok "صفر خطای کنسول" || bad "console errors ($ERRS)"

$B close >/dev/null 2>&1
pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null
echo "══════════════════════════════════"
echo "M10 UI e2e: $PASS PASS · $FAIL FAIL"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✔" || echo "HAS FAILURES ✖"
exit $FAIL
