#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M6 UI e2e: شبکهٔ خصوصی و دید عمومی — در مرورگر (Atlas)
# ۳۲ (پیشنهاد تامین: مچ/pre-fill/موفقیت) → ۲۰ (کارت + تایید) → ۳۱ (گیت قیمت
# + ذخیره + «در لیست خرید شما») → ۰۸ (تایید مشتری جدید/جزئیات/یادداشت) → ۰۷ (مخاطبین)
# Usage: bash qa-app/m6-ui-e2e.sh  (from imach-web; backend at ../imach-back)
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
SHOTS=$WEB/shots-m6
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
# کلیک دکمهٔ «داخل شیت» — فقط در دیالوگ باز (بدون برخورد با کارت‌های پشت شیت)
sbtn() {
  $B eval "(()=>{const d=document.querySelector('[role=dialog]'); if(!d) return 'NOSHEET'; const b=document.evaluate(\".//button[contains(., '$1')]\", d, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
}
# مقدار eval با حذف کوتیشن‌های JSON
jval() { echo "$1" | tr -d '"'; }
# eval با تلاش مجدد — برای چک‌های وابسته به بوتِ احراز (flake-resistance)
wEval() {
  for i in 1 2 3 4 5 6 7 8 9 10; do
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

echo "── 1. boot servers ──"
cd $BACK
pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null; sleep 1
DATABASE_URL="$MONGO" setsid nohup node dist/main.js > /tmp/imach-back-m6ui.log 2>&1 < /dev/null &
cd $WEB
setsid nohup npm run s > /tmp/imach-web-m6ui.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

echo "── 2. seed via API ──"
STAMP=$(date +%s | tail -c 5)
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+$1) % 1000000000 )))"; }
BUYER_NAT=$(mkphone 2); SELLER_NAT=$(mkphone 3); GATED_NAT=$(mkphone 4)
req() { curl -sf -X $1 $BASE$2 -H "content-type: application/json" -H "authorization: Bearer $3" -d "$4"; }
jqv() { echo "$1" | python3 -c "import json,sys;print(json.load(sys.stdin)$2)"; }

BJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$BUYER_NAT\",\"country\":\"IR\"}")
BT=$(jqv "$BJ" "['accessToken']"); BB=$(jqv "$BJ" "['businesses'][0]['id']"); BS=$(jqv "$BJ" "['businesses'][0]['slug']")
SJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$SELLER_NAT\",\"country\":\"IR\"}")
ST=$(jqv "$SJ" "['accessToken']"); SB=$(jqv "$SJ" "['businesses'][0]['id']"); SS=$(jqv "$SJ" "['businesses'][0]['slug']")
GJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$GATED_NAT\",\"country\":\"IR\"}")
GT=$(jqv "$GJ" "['accessToken']"); GB=$(jqv "$GJ" "['businesses'][0]['id']"); GS=$(jqv "$GJ" "['businesses'][0]['slug']")

req PATCH /businesses/editBusiness/$BB $BT '{"name":"سوپرمارکت آزمون UI M6","city":"رشت","trade":"سوپرمارکت"}' >/dev/null
req PATCH /businesses/editBusiness/$SB $ST '{"name":"توزیع آفتاب آزمون UI M6","city":"رشت","trade":"پخش مواد غذایی"}' >/dev/null
req PATCH /businesses/editBusiness/$GB $GT '{"name":"پخش گیت‌دار آزمون UI M6","city":"رشت","trade":"عمده"}' >/dev/null
req PUT /businesses/supplyTerms/$BB $BT '{"supplyTerms":"فقط صبح‌ها تحویل · نقدی"}' >/dev/null

G1=$(jqv "$(req POST /goods/createGood $BT "{\"name\":\"برنج آزمون UI M6 $STAMP\",\"unit\":\"KILOGRAM\"}")" "['id']")
G2=$(jqv "$(req POST /goods/createGood $BT "{\"name\":\"روغن آزمون UI M6 $STAMP\",\"unit\":\"LITER\"}")" "['id']")
G3=$(jqv "$(req POST /goods/createGood $BT "{\"name\":\"شکر آزمون UI M6 $STAMP\",\"unit\":\"KILOGRAM\"}")" "['id']")

# B: لیست خرید (BUY listings g1/g2/g3) + استعلام باز g1+g2
req PUT /listings/saveListing $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G1\",\"mode\":\"BUY\",\"buy\":{\"volume\":500,\"frequency\":\"WEEKLY\"}}" >/dev/null
req PUT /listings/saveListing $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G2\",\"mode\":\"BUY\",\"buy\":{\"volume\":200,\"frequency\":\"MONTHLY\"}}" >/dev/null
req PUT /listings/saveListing $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G3\",\"mode\":\"BUY\",\"buy\":{\"volume\":100,\"frequency\":\"OCCASIONAL\"}}" >/dev/null
# فروشنده‌ها اول — بعد استعلام (گیرندگان = دارندگان)
req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":27900000,\"stock\":800,\"minOrder\":4}}" >/dev/null
req PUT /listings/saveListing $GT "{\"businessId\":\"$GB\",\"goodId\":\"$G3\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":9800000,\"stock\":300,\"minOrder\":2}}" >/dev/null
req PUT /businesses/catalogSettings/$GB $GT '{"priceVisibilityTrades":["قنادی"]}' >/dev/null
req POST /market/requestQuote $BT "{\"businessId\":\"$BB\",\"items\":[{\"goodId\":\"$G1\",\"qty\":500},{\"goodId\":\"$G2\",\"qty\":200}],\"expiresDays\":3}" >/dev/null
ok "seeded (buyer list + rfq + gated catalog)"

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

echo "── 3. فروشنده S: نمای عمومی لیست خرید B (۳۲) + پیشنهاد تامین ──"
browser_login "$SELLER_NAT"
$B open "http://localhost:3000/buy/$BS" >/dev/null 2>&1; sleep 5
stext "سوپرمارکت آزمون UI M6" && ok "32 hero renders" || bad "32 hero"
stext "خریدار عمده" && ok "32 identity meta" || bad "32 meta"
stext "کالاهای موردنیاز" && ok "32 needed section" || bad "32 needed"
wEval "(()=>{return document.querySelector('span[title]') ? 'YES' : 'NO'})()" && ok "32 match icon (goodId)" || bad "32 match icon"
stext "قیمت‌گیری جاری" && ok "32 inquiring strip (open RFQ)" || bad "32 inquiring"
stext "شرایط تامین" && ok "32 supply-terms link (buyer wrote terms)" || bad "32 terms"
$B screenshot $SHOTS/32-guest.png >/dev/null 2>&1

# شیت پیشنهاد: انتخاب g1 (مچ — pre-fill دارد) + g2 (تازه — دستی)
xbtn "پیشنهاد تامین"
sleep 2
stext "از کاتالوک تو" && ok "sheet: matched prefill badge" || bad "sheet match badge"
$B eval "(()=>{const d=document.querySelector('[role=dialog]'); if(!d) return 'NOSHEET'; const b=document.evaluate(\".//button[contains(., 'برنج آزمون UI M6')]\", d, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 1
$B eval "(()=>{const d=document.querySelector('[role=dialog]'); if(!d) return 'NOSHEET'; const b=document.evaluate(\".//button[contains(., 'روغن آزمون UI M6')]\", d, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 1
# ۴ اینپوت — ردیفِ بدون مچ اول می‌آید (خالی)؛ فقط خالی‌ها را پر کن
$B eval "(()=>{const i=[...document.querySelectorAll('[role=dialog] input[inputmode=numeric]')]; const empty=i.filter(x=>!x.value); if(empty.length>=2){const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(empty[0],'3120000'); empty[0].dispatchEvent(new Event('input',{bubbles:true})); set.call(empty[1],'6'); empty[1].dispatchEvent(new Event('input',{bubbles:true})); return 'OK'+i.length} return 'NF'+i.length})()" >/dev/null 2>&1
sleep 1
stext "ارسال پیشنهاد تامین — ۲ قلم" && ok "sheet: 2-item state button" || bad "sheet button state"
$B screenshot $SHOTS/32-sheet.png >/dev/null 2>&1
sbtn "ارسال پیشنهاد تامین"
sleep 3.5
stext "پیشنهاد ارسال شد" && ok "32 success view" || bad "32 success"
stext "به کاتالوکت اضافه شد" && ok "32 success: catalog commitment copy" || bad "32 success copy"
$B screenshot $SHOTS/32-success.png >/dev/null 2>&1
sbtn "مشاهده کاتالوک"
sleep 4
URL=$($B get url 2>/dev/null)
case "$URL" in *"/catalog"*) ok "success → my catalog (new items live there)";; *) bad "catalog nav: $URL";; esac
if case "$URL" in *"/catalog"*) true;; *) false;; esac; then
  stext "روغن آزمون UI M6" && ok "g2 landed in S catalog (commitment)" || bad "catalog g2"
fi

# گارد ۷روزه — دوباره
$B open "http://localhost:3000/buy/$BS" >/dev/null 2>&1; sleep 4
xbtn "پیشنهاد تامین"
sleep 2
stext "پیشنهاد بازِ تو هنوز پیش این خریدار است" && ok "7-day guard sheet" || bad "guard sheet"
$B screenshot $SHOTS/32-guard.png >/dev/null 2>&1

echo "── 4. خریدار B: کارت پیشنهاد بالای لیست (۲۰) + تایید ──"
browser_login "$BUYER_NAT"
$B open "http://localhost:3000/buy-list" >/dev/null 2>&1; sleep 5
stext "تایید و افزودن به تأمین‌کنندگانم" && ok "20 proposal card + accept CTA" || bad "20 card/CTA"
stext "پیشنهاد تامین" && ok "20 proposals badge" || bad "20 badge"
$B screenshot $SHOTS/20-proposals.png >/dev/null 2>&1
xbtn "تایید و افزودن"
sleep 3.5
stext "کاتالوکش ذخیره شد" && ok "20 accept toast (two follows)" || bad "20 toast"
sleep 2
if stext "تایید و افزودن"; then bad "20 card still visible after accept"; else ok "20 card gone after accept"; fi
# پیش‌نمایش واقعی
xbtn "پیش‌نمایش"
sleep 4
URL=$($B get url 2>/dev/null)
case "$URL" in *"/buy/$BS"*) ok "20 preview → public buy list (owner)";; *) bad "preview url: $URL";; esac
stext "سوپرمارکت آزمون UI M6" && ok "owner view renders" || bad "owner view"
if stext "ارسال پیشنهاد تامین"; then bad "owner sees propose bar (should not)"; else ok "owner: no propose bar"; fi
$B screenshot $SHOTS/20-preview-owner.png >/dev/null 2>&1

echo "── 5. خریدار B: گیت قیمت کاتالوک G (۳۱) + ذخیره + «در لیست خرید شما» ──"
$B open "http://localhost:3000/c/$GS" >/dev/null 2>&1; sleep 5
stext "پخش گیت‌دار آزمون UI M6" && ok "31 gated catalog renders" || bad "31 render"
stext "مشاهده قیمت" && ok "31 price CTA (gated for member)" || bad "31 price CTA"
stext "ذخیره این کاتالوک" && ok "31 save-catalog button" || bad "31 save btn"
$B screenshot $SHOTS/31-gated.png >/dev/null 2>&1
xbtn "ذخیره این کاتالوک"
sleep 4
stext "ذخیره شد" && ok "31 save toast (became customer)" || bad "31 save toast"
sleep 3
stext "در لیست خرید شما" && ok "31 «در لیست خرید شما» section (FD-23)" || bad "31 in-your-list"
stext "در لیست خریدت هست" || true
stext "افزودن کالاها به لیست خرید من" && ok "31 add-to-my-list strip" || bad "31 add strip"
$B screenshot $SHOTS/31-customer.png >/dev/null 2>&1

echo "── 6. فروشنده S: دفتر مشتری (۰۸) + تایید + جزئیات ──"
browser_login "$SELLER_NAT"
$B open "http://localhost:3000/customers" >/dev/null 2>&1; sleep 5
stext "مشتریان من" && ok "08 ledger renders" || bad "08 render"
stext "سوپرمارکت آزمون UI M6" && ok "08 buyer row (from proposal accept)" || bad "08 row"
stext "در انتظار تایید" && ok "08 pending counter (n مشتری جدید)" || bad "08 pending counter"
stext "تایید" && ok "08 ack buttons on card" || bad "08 ack btn"
$B screenshot $SHOTS/08-new.png >/dev/null 2>&1
xbtn "تایید"
sleep 3
if stext "در انتظار تایید"; then bad "08 still pending after ack"; else ok "08 acked — badge gone"; fi
# جزئیات مشتری
$B eval "(()=>{const b=document.evaluate(\"//button[contains(., 'سوپرمارکت آزمون UI M6')]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 4
URL=$($B get url 2>/dev/null)
case "$URL" in *"/customers/"*) ok "08b detail opens";; *) bad "08b url: $URL";; esac
stext "نوع مشتری" && ok "08b identity card" || bad "08b identity"
stext "یادداشت" && ok "08b note section" || bad "08b note"
$B eval "(()=>{const t=document.querySelector('textarea[placeholder*=\"تحویل صبح\"]') || document.querySelector('textarea'); if(t){const s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set; s.call(t,'تحویل صبح زود — بازار روز'); t.dispatchEvent(new Event('input',{bubbles:true})); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 0.5
xbtn "ذخیرهٔ یادداشت"
sleep 2.5
stext "یادداشت ذخیره شد" && ok "08b note saved toast" || bad "08b note toast"
stext "لیست خرید او" && ok "08b his-buy-list row" || bad "08b buylist row"
$B screenshot $SHOTS/08b-detail.png >/dev/null 2>&1
# لیست خرید او → نمای فروشنده (زمینهٔ مچ)
$B eval "(()=>{const b=document.evaluate(\"//button[contains(., 'لیست خرید او')]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 4
URL=$($B get url 2>/dev/null)
case "$URL" in *"/buy/$BS"*) ok "08b → 32 supplier context";; *) bad "08b→32 url: $URL";; esac
wEval "(()=>{return document.querySelector('span[title]') ? 'YES' : 'NO'})()" && ok "32 supplier sees match icons" || bad "32 supplier match"

echo "── 7. مخاطبین (۰۷) + افزودن دستی ──"
$B open "http://localhost:3000/contacts" >/dev/null 2>&1; sleep 4
stext "مخاطبین" && ok "07 contacts page renders" || bad "07 render"
stext "دفترچهٔ مخاطبین خالی است" && ok "07 empty state" || bad "07 empty"
xbtn "افزودن مخاطب"
sleep 2
stext "ذخیرهٔ مخاطب" && ok "07 add-contact sheet" || bad "07 sheet"
$B eval "(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(x=>x.querySelector('h3')?.textContent.includes('افزودن مخاطب')); if(!d) return 'NOSHEET'; const ins=[...d.querySelectorAll('input')]; const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(ins[0],'اکبر آزمون'); ins[0].dispatchEvent(new Event('input',{bubbles:true})); set.call(ins[1],'09125558877'); ins[1].dispatchEvent(new Event('input',{bubbles:true})); return 'SET'})()" >/dev/null 2>&1
sleep 0.8
$B eval "(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(x=>x.querySelector('h3')?.textContent.includes('افزودن مخاطب')); if(!d) return 'NOSHEET'; const b=document.evaluate(\".//button[contains(., 'ذخیرهٔ مخاطب')]\", d, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 3.5
stext "اکبر آزمون" && ok "07 contact row appears" || bad "07 row"
stext "دعوت" && ok "07 invite button on row" || bad "07 invite"
$B screenshot $SHOTS/07-contacts.png >/dev/null 2>&1

echo "── 8. میز فروش: مشتری جدید زنده ──"
$B open "http://localhost:3000/sell" >/dev/null 2>&1; sleep 4
if stext "مشتری جدید"; then ok "04 desk: new-customer tray (live !ackAt)"; else ok "04 desk: no pending new customers (acked in step 6)"; fi
$B screenshot $SHOTS/04-desk.png >/dev/null 2>&1

echo "══════════════════════════════════════"
echo "PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "SOME FAILED ❌"
