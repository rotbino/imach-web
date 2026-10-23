#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M5 UI e2e: سفارش‌ها و اسناد — حلقهٔ کامل در مرورگر (Atlas)
# سبد کاتالوگ → ثبت → پذیرش با اصلاح → ارسال → تأیید تحویل → سند/سفارش دوباره
# Usage: bash qa-app/m5-ui-e2e.sh  (from imach-web; backend at ../imach-back)
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
SHOTS=$WEB/shots-m5
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
stext() {
  for i in 1 2 3 4 5 6; do
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

echo "── 1. boot servers ──"
cd $BACK
pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null; sleep 1
DATABASE_URL="$MONGO" setsid nohup node dist/main.js > /tmp/imach-back-m5ui.log 2>&1 < /dev/null &
cd $WEB
setsid nohup npm run s > /tmp/imach-web-m5ui.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

echo "── 2. seed via API ──"
STAMP=$(date +%s | tail -c 5)
BUYER_NAT="9$(printf '%09d' $(( $(date +%s) % 1000000000 )))"
SELLER_NAT="9$(printf '%09d' $(( ($(date +%s)+1) % 1000000000 )))"
req() { curl -sf -X $1 $BASE$2 -H "content-type: application/json" -H "authorization: Bearer $3" -d "$4"; }
jqv() { echo "$1" | python3 -c "import json,sys;print(json.load(sys.stdin)$2)"; }

BUYER_JSON=$(req POST /auth/quickRegister "" "{\"phone\":\"$BUYER_NAT\",\"country\":\"IR\"}")
BUYER_TOKEN=$(jqv "$BUYER_JSON" "['accessToken']")
BUYER_BIZ=$(jqv "$BUYER_JSON" "['businesses'][0]['id']")
SELLER_JSON=$(req POST /auth/quickRegister "" "{\"phone\":\"$SELLER_NAT\",\"country\":\"IR\"}")
SELLER_TOKEN=$(jqv "$SELLER_JSON" "['accessToken']")
SELLER_BIZ=$(jqv "$SELLER_JSON" "['businesses'][0]['id']")
SELLER_SLUG=$(jqv "$SELLER_JSON" "['businesses'][0]['slug']")
[ -n "$SELLER_SLUG" ] && ok "seed accounts ($SELLER_SLUG)" || { bad "seed"; exit 1; }

req PATCH /businesses/editBusiness/$BUYER_BIZ $BUYER_TOKEN '{"name":"سوپرمارکت آزمون UI M5","city":"رشت","trade":"سوپرمارکت"}' >/dev/null
req PATCH /businesses/editBusiness/$SELLER_BIZ $SELLER_TOKEN '{"name":"پخش طلایی آزمون UI M5","city":"رشت","trade":"عمده","invoiceTaxId":"12345678901","invoiceNote":"کالای فروخته‌شده برگشت ندارد"}' >/dev/null
GOOD1=$(jqv "$(req POST /goods/createGood $SELLER_TOKEN "{\"name\":\"برنج آزمون UI M5 $STAMP\",\"unit\":\"KILOGRAM\"}")" "['id']")
GOOD2=$(jqv "$(req POST /goods/createGood $SELLER_TOKEN "{\"name\":\"روغن آزمون UI M5 $STAMP\",\"unit\":\"LITER\"}")" "['id']")
req PUT /listings/saveListing $SELLER_TOKEN "{\"businessId\":\"$SELLER_BIZ\",\"goodId\":\"$GOOD1\",\"mode\":\"SELL\",\"title\":\"برنج هاشمی درجه یک\",\"sell\":{\"priceMinor\":2840000,\"stock\":1000,\"minOrder\":5},\"packLabel\":\"کیسه ۵۰ کیلویی\"}" >/dev/null
req PUT /listings/saveListing $SELLER_TOKEN "{\"businessId\":\"$SELLER_BIZ\",\"goodId\":\"$GOOD2\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":1385000,\"stock\":500,\"minOrder\":2}}" >/dev/null
ok "goods + listings seeded"

browser_login() {
  local NAT=$1
  $B cookies clear >/dev/null 2>&1
  $B cookies set imach_locale fa >/dev/null 2>&1
  $B open "http://localhost:3000/login?cc=IR" >/dev/null 2>&1
  sleep 3
  $B fill "//input[contains(@aria-label, \"شماره موبایل\")]" "$NAT" >/dev/null 2>&1
  sleep 1
  xbtn "ورود به آی"
  sleep 9
}

echo "── 3. خریدار: سبد کاتالوگ → ثبت سفارش (۳۱ → POST /orders) ──"
browser_login "$BUYER_NAT"
$B open "http://localhost:3000/c/$SELLER_SLUG" >/dev/null 2>&1; sleep 5
stext "برنج هاشمی درجه یک" && ok "31 public catalog renders" || bad "31 catalog"
stext "در سبد" || true
# + روی کارت اول (قیمت‌دار)
$B eval "(()=>{const b=document.querySelector('button[aria-label=\"افزودن به سبد خرید\"]'); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 1.5
stext "در سبد" && ok "add-to-cart (badge «در سبد»)" || bad "add-to-cart"
stext "سبد خرید" && ok "floating basket bar" || bad "basket bar"
$B screenshot $SHOTS/31-basket.png >/dev/null 2>&1
# شیت سبد: باز کردن با نوار
$B eval "(()=>{const b=document.evaluate(\"//button[contains(., 'ثبت سفارش')]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 2
stext "جمع سبد" && ok "cart sheet + total" || bad "cart sheet"
$B screenshot $SHOTS/31-sheet.png >/dev/null 2>&1
# ثبت سفارش (دکمهٔ arm داخل شیت)
xbtn "ثبت سفارش"
sleep 3
stext "قلم ثبت شد" && ok "order submitted (success view)" || bad "submit order"
$B screenshot $SHOTS/31-success.png >/dev/null 2>&1
xbtn "پیگیری سفارش"
sleep 4
URL=$($B get url 2>/dev/null)
case "$URL" in *"/buy/orders/"*) ok "39 order view opens (deep link)";; *) bad "39 url: $URL";; esac
stext "ثبت‌شده" && ok "39 status NEW badge" || bad "39 status"
stext "آزمون UI M5" && ok "39 frozen item name" || bad "39 item name"
stext "مسیر سفارش" && ok "39 timeline" || bad "39 timeline"
stext "در انتظار پاسخ فروشنده" && ok "39 NEW hint" || bad "39 hint"
$B screenshot $SHOTS/39-new.png >/dev/null 2>&1

echo "── 4. دفتر خریدار (۲۸) ──"
$B open "http://localhost:3000/buy/orders" >/dev/null 2>&1; sleep 4
stext "۱ سفارش جاری" && ok "28 live counter" || bad "28 counter"
stext "پخش طلایی آزمون UI M5" && ok "28 supplier row" || bad "28 row"
$B screenshot $SHOTS/28-list.png >/dev/null 2>&1

echo "── 5. فروشنده: دفتر (۰۹) → پذیرش با اصلاح (۱۰) → ارسال ──"
browser_login "$SELLER_NAT"
$B open "http://localhost:3000/sell/orders" >/dev/null 2>&1; sleep 4
stext "۱ سفارش جدید" && ok "09 new counter" || bad "09 counter"
stext "سوپرمارکت آزمون UI M5" && ok "09 buyer row" || bad "09 row"
$B screenshot $SHOTS/09-list.png >/dev/null 2>&1
# ورود به نمای سفارش (ردیف = دکمه)
$B eval "(()=>{const b=document.evaluate(\"//button[contains(., 'سوپرمارکت آزمون UI M5')]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 4
URL=$($B get url 2>/dev/null)
case "$URL" in *"/sell/orders/"*) ok "10 order view opens";; *) bad "10 url: $URL";; esac
stext "توضیحات مشتری" || true
stext "پذیرش سفارش" && ok "10 accept form present" || bad "10 accept form"
$B screenshot $SHOTS/10-new.png >/dev/null 2>&1
# اصلاح مقدار قلم اول به ۱۲
$B eval "(()=>{const i=document.querySelector('input[aria-label=\"مقدار\"]'); if(i){i.value='12'; i.dispatchEvent(new Event('input',{bubbles:true})); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 0.5
xbtn "پذیرش سفارش"
sleep 2
stext "تأیید و پذیرش" && ok "edit mode opens" || bad "edit mode"
$B eval "(()=>{const i=document.querySelector('input[aria-label=\"مقدار\"]'); if(i){i.value='12'; i.dispatchEvent(new Event('input',{bubbles:true})); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 0.5
xbtn "تأیید و پذیرش"
sleep 3.5
stext "فاکتور شمارهٔ" && ok "accept toast with docNo" || bad "accept toast"
stext "اسناد سفارش" && ok "docs card after accept" || bad "docs card"
stext "ارسال شد" && ok "send action present" || bad "send action"
$B screenshot $SHOTS/10-accepted.png >/dev/null 2>&1
# ارسال
xbtn "ارسال شد"
sleep 2
xbtn "بله، ارسال شد"
sleep 3
stext "در انتظار" && ok "sent state" || bad "sent state"
stext "روز پس از ارسال" && ok "7-day deadline note" || bad "deadline note"
$B screenshot $SHOTS/10-sent.png >/dev/null 2>&1

echo "── 6. خریدار: تأیید تحویل + اسناد + سفارش دوباره ──"
browser_login "$BUYER_NAT"
$B open "http://localhost:3000/buy/orders" >/dev/null 2>&1; sleep 4
$B eval "(()=>{const b=document.evaluate(\"//button[contains(., 'پخش طلایی آزمون UI M5')]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 4
stext "کالا در راه است" && ok "39 sent hint" || bad "39 sent hint"
xbtn "تأیید تحویل"
sleep 2
xbtn "بله، تحویل گرفتم"
sleep 3.5
stext "تحویل شد و بسته است" && ok "delivered callout" || bad "delivered callout"
stext "سفارش دوباره" && ok "reorder CTA" || bad "reorder"
$B screenshot $SHOTS/39-delivered.png >/dev/null 2>&1

echo "── 7. اسناد: فاکتور (۴۰) + برگهٔ ارسال (۴۱) ──"
URL=$($B get url 2>/dev/null)
OID=$(echo "$URL" | sed 's#.*/buy/orders/##; s#/.*##')
$B open "http://localhost:3000/buy/orders/$OID/doc/invoice" >/dev/null 2>&1; sleep 4
stext "فاکتور فروش" && ok "40 invoice title" || bad "40 title"
stext "شمارهٔ مالیاتی" && ok "40 tax id printed" || bad "40 tax"
stext "جمع کل" && ok "40 total" || bad "40 total"
stext "چاپ / PDF" && ok "40 print button" || bad "40 print"
$B screenshot $SHOTS/40-invoice.png >/dev/null 2>&1
$B open "http://localhost:3000/buy/orders/$OID/doc/slip" >/dev/null 2>&1; sleep 4
stext "برگهٔ ارسال" && ok "41 slip title" || bad "41 title"
stext "امضای گیرنده" && ok "41 signature lines" || bad "41 signs"
stext "اقلام بار" && ok "41 items checklist" || bad "41 items checklist"
$B screenshot $SHOTS/41-slip.png >/dev/null 2>&1

echo "── 8. سفارش دوباره → سبد کاتالوگ سیدشده ──"
$B open "http://localhost:3000/buy/orders/$OID" >/dev/null 2>&1; sleep 4
xbtn "سفارش دوباره"
sleep 5
URL=$($B get url 2>/dev/null)
case "$URL" in *"/c/$SELLER_SLUG"*) ok "reorder → supplier catalog";; *) bad "reorder url: $URL";; esac
# توست سید هنگام mount زده می‌شود (پیش از پالینگ) — نشانهٔ پایدار: سبد پرشده
stext "در سبد" && ok "basket re-seeded" || bad "basket seed"

echo "── 9. اعلان‌های فروشنده (ORDER رخداد-محور) ──"
browser_login "$SELLER_NAT"
$B open "http://localhost:3000/notifs" >/dev/null 2>&1; sleep 4
stext "سفارش جدید ثبت شد" && ok "seller ORDER notif (event title)" || bad "seller notif"
stext "پذیرفت" || true
stext "سفارش خودکار بسته شد" || true
$B screenshot $SHOTS/17-notifs.png >/dev/null 2>&1

echo ""
echo "════ M5 UI e2e: $PASS passed / $FAIL failed ════"
pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null
exit $([ "$FAIL" = "0" ] && echo 0 || echo 1)
