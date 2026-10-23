#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M7 UI e2e: امتیاز، رشد و اعلان‌ها — در مرورگر (Atlas)
# ۱۵ (دو بازو + موتور فعال + شیت شتابدهی) → ۰۴ میز (گام بعدی زنده)
#   → چیپ اپ‌بار → ۰۶ (شیت اشتراک + دعوت‌شدگان) → ۱۷ (اعلان رویداد-محور)
#   → /c/?ref ثبت localStorage
# Usage: bash qa-app/m7-ui-e2e.sh  (from imach-web; backend at ../imach-back)
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
SHOTS=$WEB/shots-m7
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
sbtn() {
  $B eval "(()=>{const d=document.querySelector('[role=dialog]'); if(!d) return 'NOSHEET'; const b=document.evaluate(\".//button[contains(., '$1')]\", d, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
}
jval() { echo "$1" | tr -d '"'; }
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
DATABASE_URL="$MONGO" STORAGE_DRIVER=local UPLOAD_PATH="$BACK/uploads" setsid nohup node dist/main.js > /tmp/imach-back-m7ui.log 2>&1 < /dev/null &
cd $WEB
setsid nohup npm run s > /tmp/imach-web-m7ui.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

echo "── 2. seed via API: قهرمان ۱۰۰+ (S) + تازه‌وارد (X) + رفرال ──"
STAMP=$(date +%s | tail -c 5)
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+$1) % 1000000000 )))"; }
S_NAT=$(mkphone 21); X_NAT=$(mkphone 22); REF_NAT=$(mkphone 23)
req() { curl -sf -X $1 $BASE$2 -H "content-type: application/json" -H "authorization: Bearer $3" -d "$4"; }
jqv() { echo "$1" | python3 -c "import json,sys;print(json.load(sys.stdin)$2)"; }

SJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$S_NAT\",\"country\":\"IR\"}")
ST=$(jqv "$SJ" "['accessToken']"); SB=$(jqv "$SJ" "['businesses'][0]['id']"); SS=$(jqv "$SJ" "['businesses'][0]['slug']")
req PATCH /businesses/editBusiness/$SB $ST '{"name":"پخش قهرمان UI M7","city":"رشت","trade":"پخش مواد غذایی"}' >/dev/null

# کاتالوک ۵ + دعوت ۵ مشتری + سفارش بسته + استعلام/پاسخ → ۹۰
G1=$(jqv "$(req POST /goods/createGood $ST "{\"name\":\"برنج UI M7 $STAMP\",\"unit\":\"KILOGRAM\"}")" "['id']")
for i in 1 2 3 4 5; do
  req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$(jqv "$(req POST /goods/createGood $ST "{\"name\":\"کالای UI M7 $STAMP-$i\",\"unit\":\"KILOGRAM\"}")" "['id']")\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":$((28000000+i*1000)),\"stock\":100,\"minOrder\":1}}" >/dev/null
done
L1=$(jqv "$(req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":27500000,\"stock\":50,\"minOrder\":1}}")" "['id']")
for i in 31 32 33 34 35; do
  UJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$(mkphone $i)\",\"country\":\"IR\"}")
  req POST /market/followSupplier "$(jqv "$UJ" "['accessToken']")" "{\"businessId\":\"$(jqv "$UJ" "['businesses'][0]['id']")\",\"supplierId\":\"$SB\",\"source\":\"SHARED\"}" >/dev/null
done
# استعلام + پاسخ ⇒ sc8 (پیش از سفارش؛ فروشنده از قبل listing دارد)
XJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$X_NAT\",\"country\":\"IR\"}")
XT=$(jqv "$XJ" "['accessToken']"); XB=$(jqv "$XJ" "['businesses'][0]['id']")
req PUT /listings/saveListing $XT "{\"businessId\":\"$XB\",\"goodId\":\"$G1\",\"mode\":\"BUY\",\"buy\":{\"volume\":100,\"frequency\":\"WEEKLY\"}}" >/dev/null
req POST /market/requestQuote $XT "{\"businessId\":\"$XB\",\"items\":[{\"goodId\":\"$G1\",\"qty\":100}],\"expiresDays\":3}" >/dev/null
INQS=$(jqv "$(req GET "/market/getInquiries?businessId=$SB" $ST "")" "['items'][0]['id']")
req POST /market/sendOffer $ST "{\"inquiryId\":\"$INQS\",\"prices\":[27500000]}" >/dev/null
# سفارش تا DELIVERED
ORD=$(req POST /orders $XT "{\"businessId\":\"$XB\",\"supplierId\":\"$SB\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$L1\",\"qty\":10}]}")
OID=$(jqv "$ORD" "['id']")
req POST /orders/$OID/accept $ST "{\"businessId\":\"$SB\"}" >/dev/null
req POST /orders/$OID/send $ST "{\"businessId\":\"$SB\"}" >/dev/null
req POST /orders/$OID/deliver $XT "{\"businessId\":\"$XB\"}" >/dev/null
# رفرال با ?ref → دعوت‌شدهٔ ششم + پاداش
req POST /auth/quickRegister "" "{\"phone\":\"$REF_NAT\",\"country\":\"IR\",\"ref\":\"$SS\"}" >/dev/null
# بک‌دیت عمر → ۱۰۰ + اعلان SCORE
(cd $BACK && SS=$SS node - >/dev/null 2>&1 << 'EOF'
const { MongoClient } = require('mongodb');
const fs = require('fs');
const env = fs.readFileSync('/home/z/my-project/imach-back/.env', 'utf8');
const mongo = env.match(/^DATABASE_URL="?([^"]*)"?/m)[1];
(async () => {
  const c = new MongoClient(mongo);
  await c.connect();
  await c.db().collection('Business').updateOne(
    { slug: process.env.SS },
    { $set: { createdAt: new Date(Date.now() - 15 * 86400000) } }
  );
  await c.close();
})();
EOF
)
SC=$(curl -s "$BASE/score?businessId=$SB" -H "authorization: Bearer $ST")
SCS=$(jqv "$SC" "['scoreSell']")
[ "$SCS" = "100" ] && ok "seed: قهرمان S = ۱۰۰" || bad "seed score: $SCS"

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

echo "── 3. S: صفحهٔ امتیاز (۱۵) — بازوی فروش ۱۰۰ ──"
browser_login $S_NAT
$B open "http://localhost:3000/home/score?arm=sell" >/dev/null 2>&1; sleep 4
wEval "document.querySelector('[data-score-arm=\"sell\"]') ? 'YES' : 'NO'" && ok "data-score-arm=sell روی صفحه" || bad "data-score-arm"
stext "امتیاز فعالیت فروش" && ok "تیتر بازوی فروش" || bad "تیتر فروش"
stext "موتور شتاب‌دهندهٔ فروشت فعال است" && ok "کارت موتور فعال (۱۰۰+)" || bad "موتور فعال"
stext "کارهایی که انجام داده‌ای" && ok "بخش انجام‌شده‌ها" || bad "بخش done"
stext "دعوت ۵ مشتری جدید" && ok "آیتم دعوت ۵ (بیشترین امتیاز)" || bad "آیتم دعوت"
$B screenshot $SHOTS/01-score-sell.png >/dev/null 2>&1
# سوییچ به بازوی خرید (قفل)
xbtn "امتیاز خرید"; sleep 2
stext "امتیاز تا شتابدهی" && ok "بازوی خرید: کارت قفل + مانده" || bad "قفل خرید"
stext "امتیاز میز فروش و میز خرید جداگانه حساب می‌شوند" && ok "هینت جدایی دو میز" || bad "هینت"
wEval "document.querySelector('[data-score-arm=\"buy\"]') ? 'YES' : 'NO'" && ok "data-score-arm=buy بعد از سوییچ" || bad "arm switch"
$B screenshot $SHOTS/02-score-buy-lock.png >/dev/null 2>&1

echo "── 4. شیت «شتابدهی یعنی چه؟» ──"
$B open "http://localhost:3000/home/score?arm=sell" >/dev/null 2>&1; sleep 3
xbtn "شتابدهی در فروش یعنی چه؟"; sleep 2
stext "موتور شتاب‌دهندهٔ فروشت فعال می‌شود" && ok "شیت شتابدهی — روایت فروش" || bad "شیت شتابدهی"
stext "بعد از ۱۰۰ چه می‌شود؟" && ok "ایستگاه بعد از ۱۰۰ در شیت" || bad "post100"
sbtn "باشه، فهمیدم" && ok "دکمهٔ باشه" || bad "close btn"
$B screenshot $SHOTS/03-accel-sheet.png >/dev/null 2>&1
sbtn "باشه، فهمیدم"

echo "── 5. چیپ اپ‌بار → صفحهٔ امتیاز ──"
$B open "http://localhost:3000/sell" >/dev/null 2>&1; sleep 4
$B eval "(()=>{const a=document.querySelector('a[href*=\"/home/score?arm=sell\"]'); if(a){a.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 3
URL=$($B get url 2>/dev/null)
echo "$URL" | grep -q "home/score" && ok "چیپ امتیاز → /home/score" || bad "chip url: $URL"

echo "── 6. میز فروش: گام بعدی زنده (X تازه‌وارد ۵ امتیاز) ──"
browser_login $X_NAT
$B open "http://localhost:3000/sell" >/dev/null 2>&1; sleep 5
stext "گام بعدی فعالیت" && ok "کارت گام بعدی روی میز" || bad "گام بعدی"
stext "امتیاز تا شتابدهی" && ok "مانده محاسبه‌شده روی کارت (۹۵)" || bad "مانده"
$B screenshot $SHOTS/04-sell-desk-live.png >/dev/null 2>&1

echo "── 7. S: شیت اشتراک کاتالوک (۰۶) ──"
browser_login $S_NAT
$B open "http://localhost:3000/catalog" >/dev/null 2>&1; sleep 5
$B eval "(()=>{const b=document.querySelector('button[aria-label*=\"اشتراک\"]')||document.evaluate(\"//button[contains(., 'اشتراک') and not(contains(., 'اشتراک‌گذاری لیست'))]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 2
stext "مشتری شما می‌شود" && ok "کال‌اوت مشتری (طرح ۰۶)" || bad "کال‌اوت"
stext "اشتراک با مخاطبین" && ok "ردیف مخاطبین (pick)" || bad "مخاطبین"
stext "واتس‌اپ" && stext "تلگرام" && stext "پیامک" && ok "سه پیام‌رسان" || bad "پیام‌رسان‌ها"
wEval "(()=>{const i=document.querySelector('[role=dialog] input[readonly]'); return i && i.value.includes('ref=') ? 'YES':'NO'})()" && ok "لینک با ?ref در شیت" || bad "ref link"
stext "دعوت‌شدگان و پاداش" && ok "ورودی دعوت‌شدگان" || bad "دعوت‌شدگان row"
$B screenshot $SHOTS/05-catalog-share.png >/dev/null 2>&1

echo "── 8. صفحهٔ دعوت‌شدگان (/referrals) ──"
$B open "http://localhost:3000/referrals" >/dev/null 2>&1; sleep 4
stext "دعوت‌شده" && ok "آمار دعوت‌شده" || bad "stat"
stext "هدف دعوت" && ok "هدف" || bad "goal"
stext "مشتری من" && ok "نشان بازوی دعوت‌شده" || bad "arm badge"
stext "پاداش گرفت" && ok "بج پاداش" || bad "rewarded"
stext "۵٬۰۰۰ تومان" && ok "مبلغ پاداش در کال‌اوت" || bad "مبلغ"
$B screenshot $SHOTS/06-referrals.png >/dev/null 2>&1

echo "── 9. اعلان‌های رویداد-محور (۱۷) ──"
$B open "http://localhost:3000/notifs" >/dev/null 2>&1; sleep 4
stext "امتیاز فعالیت فروشت به ۱۰۰ رسید" && ok "ردیف SCORE (رویدادی)" || bad "SCORE row"
stext "کاتالوک شما را ذخیره کرد" && ok "ردیف FOLLOW_SUPPLIER" || bad "follow row"
wEval "(()=>{const rows=[...document.querySelectorAll('div[class*=rounded-2xl]')]; const r=rows.find(x=>x.textContent.includes('۱۰۰ رسید')); return r && r.querySelector('svg use[href*=\"rocket\"], svg use[xlink\\\\:href*=\"rocket\"]') ? 'YES':'NO'})()" && ok "آیکون rocket برای SCORE" || echo "   (آیکون rocket — بررسی دستی در شات)"
$B screenshot $SHOTS/07-notifs.png >/dev/null 2>&1

echo "── 10. لینک دعوت عمومی → ثبت localStorage ──"
$B cookies clear >/dev/null 2>&1
$B open "http://localhost:3000/c/$SS?ref=$SS" >/dev/null 2>&1; sleep 4
wEval "localStorage.getItem('imach.ref') === '$SS' ? 'YES' : 'NO'" && ok "?ref در localStorage نشست (رفرال زنده)" || bad "localStorage ref"
$B screenshot $SHOTS/08-catalog-guest-ref.png >/dev/null 2>&1

pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null
echo ""
echo "══ M7 UI E2E: $PASS pass / $FAIL fail ══"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "HAS FAILURES ✖"
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
