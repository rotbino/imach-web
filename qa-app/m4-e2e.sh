#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M4 e2e: استعلام چندقلمی → پوشش → پیشنهاد کامل/ناقص → پذیرش
# (browser + real API روی Atlas) — سرورها باید داخل همین فراخوان بمانند.
# Usage: bash qa-app/m4-e2e.sh  (from imach-web; backend at ../imach-back)
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
SHOTS=$WEB/shots-m4
mkdir -p $SHOTS
BASE=http://127.0.0.1:4000/api/v1
MONGO='mongodb://uniqu434343:MirAli%40434343%2A@megancluster-shard-00-00.jm46r.mongodb.net:27017,megancluster-shard-00-01.jm46r.mongodb.net:27017,megancluster-shard-00-02.jm46r.mongodb.net/imach_online_db?ssl=true&replicaSet=atlas-10bcqm-shard-0&authSource=admin&appName=MeganCluster'
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "✔ $1"; }
bad() { FAIL=$((FAIL+1)); echo "✖ $1"; }
B=agent-browser

# کلیک دکمهٔ فارسی — از eval+document.evaluate (انتقال متن فارسی در selector CLI خراب است)
xbtn() {
  $B eval "(()=>{const b=document.evaluate(\"//button[contains(., '$1')]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
}
# کلیک دکمه یا لینک
xany() {
  $B eval "(()=>{const b=document.evaluate(\"//*[self::button or self::a][contains(., '$1')]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
}
# چک متن روی خروجی read با حذف ZWNJ/RLM از هر دو سو + poll تا ~۸ ثانیه
stext() { local q=""; [ "$1" = "-q" ] && q="y"; local txt="$2"; [ -z "$txt" ] && txt="$1";
  for i in 1 2 3 4 5; do
    if $B read 2>/dev/null | python3 -c "
import sys
t = sys.stdin.read().replace('\u200c','').replace('\u200f','').replace('\u200e','')
p = sys.argv[1].replace('\u200c','')
sys.exit(0 if p in t else 1)
" "$txt" 2>/dev/null; then return 0; fi
    sleep 1.6
  done
  return 1
}
pagetext() { $B read 2>/dev/null; }

echo "── 1. boot servers ──"
cd $BACK
pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null; sleep 1
DATABASE_URL="$MONGO" setsid nohup node dist/main.js > /tmp/imach-back-m4.log 2>&1 < /dev/null &
cd $WEB
setsid nohup npm run s > /tmp/imach-web-m4.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

echo "── 2. seed: buyer + 2 sellers + 2 goods + buy-list ──"
STAMP=$(date +%s | tail -c 5)
BUYER_NAT="9$(printf '%09d' $(( $(date +%s) % 1000000000 )))"
SELLA_NAT="9$(printf '%09d' $(( ($(date +%s)+1) % 1000000000 )))"
SELLB_NAT="9$(printf '%09d' $(( ($(date +%s)+2) % 1000000000 )))"

req() { curl -sf -X $1 $BASE$2 -H "content-type: application/json" -H "authorization: Bearer $3" -d "$4"; }

BUYER_JSON=$(req POST /auth/quickRegister "" "{\"phone\":\"$BUYER_NAT\",\"country\":\"IR\"}")
BUYER_TOKEN=$(echo "$BUYER_JSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['accessToken'])")
BUYER_BIZ=$(echo "$BUYER_JSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['businesses'][0]['id'])")
SELLA_JSON=$(req POST /auth/quickRegister "" "{\"phone\":\"$SELLA_NAT\",\"country\":\"IR\"}")
SELLA_TOKEN=$(echo "$SELLA_JSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['accessToken'])")
SELLA_BIZ=$(echo "$SELLA_JSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['businesses'][0]['id'])")
SELLB_JSON=$(req POST /auth/quickRegister "" "{\"phone\":\"$SELLB_NAT\",\"country\":\"IR\"}")
SELLB_TOKEN=$(echo "$SELLB_JSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['accessToken'])")
SELLB_BIZ=$(echo "$SELLB_JSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['businesses'][0]['id'])")
[ -n "$BUYER_TOKEN" ] && [ -n "$SELLA_TOKEN" ] && [ -n "$SELLB_TOKEN" ] && ok "3 accounts" || { bad "accounts"; exit 1; }

req PATCH /businesses/editBusiness/$BUYER_BIZ $BUYER_TOKEN '{"name":"سوپرمارکت آزمون M4","city":"رشت","trade":"سوپرمارکت"}' >/dev/null
req PATCH /businesses/editBusiness/$SELLA_BIZ $SELLA_TOKEN '{"name":"پخش طلایی آزمون M4","city":"رشت","trade":"عمده‌فروشی"}' >/dev/null
req PATCH /businesses/editBusiness/$SELLB_BIZ $SELLB_TOKEN '{"name":"بازار جنوب آزمون M4","city":"تهران","trade":"بازار"}' >/dev/null

GOOD1=$(req POST /goods/createGood $BUYER_TOKEN "{\"name\":\"برنج آزمون UI $STAMP\",\"unit\":\"KILOGRAM\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
GOOD2=$(req POST /goods/createGood $BUYER_TOKEN "{\"name\":\"روغن آزمون UI $STAMP\",\"unit\":\"LITER\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
[ -n "$GOOD1" ] && [ -n "$GOOD2" ] && ok "2 fresh goods" || bad "goods seed"

req PUT /listings/saveListing $SELLA_TOKEN "{\"businessId\":\"$SELLA_BIZ\",\"goodId\":\"$GOOD1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":2840000,\"stock\":1000,\"minOrder\":1}}" >/dev/null
req PUT /listings/saveListing $SELLA_TOKEN "{\"businessId\":\"$SELLA_BIZ\",\"goodId\":\"$GOOD2\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":1385000,\"stock\":1000,\"minOrder\":1}}" >/dev/null
req PUT /listings/saveListing $SELLB_TOKEN "{\"businessId\":\"$SELLB_BIZ\",\"goodId\":\"$GOOD1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":2790000,\"stock\":1000,\"minOrder\":1}}" >/dev/null
ok "catalogs: A(brinj+roghan) B(brinj)"

# لیست خرید خریدار — قلم پیش‌فرض فرم ۲۵ + شیت انتخاب
req POST /market/watchGood $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"goodId\":\"$GOOD1\"}" >/dev/null
req PUT /listings/saveListing $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"goodId\":\"$GOOD1\",\"mode\":\"BUY\",\"buy\":{\"volume\":20,\"frequency\":\"MONTHLY\"}}" >/dev/null
ok "buyer watch-list seeded (qty 20)"

browser_login() {
  local NAT=$1
  $B cookies clear >/dev/null 2>&1
  $B cookies set imach_locale fa >/dev/null 2>&1
  # cc=IR — کشور قطعی ایران (بدون وابستگی به حدس locale)
  $B open "http://localhost:3000/login?cc=IR" >/dev/null 2>&1
  sleep 3
  $B fill "//input[contains(@aria-label, \"شماره موبایل\")]" "$NAT" >/dev/null 2>&1
  sleep 1
xbtn "ورود به آی"
  sleep 9
}

echo "── 3. buyer: فرم ۲۵ (چندقلمی) ──"
browser_login "$BUYER_NAT"
URL=$($B get url 2>/dev/null)
case "$URL" in *"/home"*|*"/sell"*|*"/start"*|*"/me"*) ok "buyer logged in";; *) bad "buyer login: $URL";; esac

$B open http://localhost:3000/buy/rfqs/new >/dev/null 2>&1; sleep 4
$B wait --text "کالاهای استعلام" >/dev/null 2>&1 && ok "25 form opens (کالاهای استعلام)" || bad "25 form missing"
sleep 2
# قلم پیش‌فرض از لیست خرید (برنج · ۲۰)
stext -q "برنج آزمون UI" && ok "default item from buy-list (برنج)" || bad "default item missing"
stext -q "۲۰" && ok "default qty=20 from buy-list" || bad "default qty"
$B screenshot $SHOTS/25-form-default.png >/dev/null 2>&1

# افزودن قلم دوم از شیت
xbtn "افزودن کالا" && ok "pick sheet opens" || bad "pick sheet"
sleep 2.5
$B fill "//input[contains(@placeholder, \"جستجوی کالا\")]" "روغن آزمون UI $STAMP" >/dev/null 2>&1
sleep 2.5
xbtn "روغن آزمون UI" >/dev/null 2>&1
stext -q "در استعلام" && ok "item#2 picked (روغن)" || bad "item#2 pick"
sleep 1.5
xbtn "تأیید و بازگشت"
sleep 2
stext -q "۲ قلم" && ok "basket = ۲ قلم" || bad "basket count"
# گیرندگان: قفل + بج پوشش
stext -q "همهٔ ۲ قلم" && ok "recipient A badge: همهٔ ۲ قلم" || bad "recipient A badge"
stext -q "۱ از ۲ قلم" && ok "recipient B badge: ۱ از ۲ قلم" || bad "recipient B badge"
stext -q "قفل" && ok "lock note visible (چندقلمی)" || bad "lock note"
# مهلت ۵ روز
xbtn "۵ روز" >/dev/null 2>&1 && ok "deadline=۵ روز" || bad "deadline pill"
$B screenshot $SHOTS/25-form-multi.png >/dev/null 2>&1

stext -q "ارسال استعلام ۲ قلمی به ۲ تأمین‌کننده" && ok "live CTA: «ارسال استعلام ۲ قلمی به ۲ تأمین‌کننده»" || bad "live CTA text"
xbtn "ارسال استعلام ۲ قلمی" >/dev/null 2>&1; sleep 8
URL=$($B get url 2>/dev/null)
echo "$URL" | grep -q "/buy/rfqs/" && ok "sent → offers page (۲۶)" || bad "after-send url: $URL"
GROUP_ID=$(echo "$URL" | sed 's|.*/buy/rfqs/||; s|/$||')
$B screenshot $SHOTS/26-empty.png >/dev/null 2>&1
stext -q "هنوز پیشنهادی نرسیده" && ok "26 waiting state" || bad "26 waiting"

echo "── 4. buyer: لیست ۲۴ ──"
$B open http://localhost:3000/buy/rfqs >/dev/null 2>&1; sleep 4
stext -q "درخواست قیمت ۲ قلمی" && ok "24 row title «درخواست قیمت ۲ قلمی»" || bad "24 row title"
stext -q "در انتظار اولین پیشنهاد" && ok "24 row sub waiting" || bad "24 row sub"
stext -q "۵ روز مانده" && ok "24 deadline badge ۵ روز" || bad "24 deadline badge"
$B screenshot $SHOTS/24-list.png >/dev/null 2>&1

echo "── 5. seller A: صندوق ۱۱ + فرم ۱۲ (کامل) ──"
browser_login "$SELLA_NAT"
$B open http://localhost:3000/sell/rfqs >/dev/null 2>&1; sleep 4
stext -q "درخواست قیمت ۲ قلمی" && ok "11 row: درخواست قیمت ۲ قلمی" || bad "11 row title"
stext -q "هر درخواست یک" && ok "11 deadline callout" || bad "11 callout"
# ردیف NEW — دکمه‌ای که عنوان را دارد و disabled نیست
xbtn "درخواست قیمت ۲ قلمی" >/dev/null 2>&1
sleep 5
$B get url 2>/dev/null | grep -q "/sell/rfqs/" && ok "12 form opens" || bad "12 url"
stext -q "در کاتالوک تو" && ok "12: «در کاتالوک تو» (placeholder)" || bad "12 catalog badge"
stext -q "سوپرمارکت آزمون M4" && ok "12: buyer name on card" || bad "12 buyer name"
# قیمت‌های A — دو فیلد تومانی (placeholder «کاتالوک تو: …»)
PXS=$($B snapshot -i 2>/dev/null | python3 -c "
import sys, re
s = sys.stdin.read()
refs = re.findall(r'textbox \"([^\"]*کاتالوک تو[^\"]*)\" \[ref=(e\d+)\]', s)
for name, ref in refs[:2]:
    print(ref)
")
echo "  price fields: $(echo $PXS | tr '\n' ' ')"
i=0
for PR in $PXS; do
  if [ $i -eq 0 ]; then $B fill @$PR "284000" >/dev/null 2>&1
  else $B fill @$PR "138500" >/dev/null 2>&1; fi
  i=$((i+1))
done
sleep 1
stext -q "برای ۲۰ بسته" && ok "live line-total hint (تومان)" || bad "line hint"
# سوییچ چک
# سوییچ چک — دکمهٔ خالی از متن؛ با role=switch (اولین = چک، دومی = ارسال)
$B eval "(()=>{const b=document.evaluate(\"(//button[@role='switch'])[1]\", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if(b){b.click(); return 'OK'} return 'NF'})()" 2>/dev/null | grep -q OK && ok "check switch on" || bad "check switch"
sleep 1.5
stext -q "درصد پرداخت چکی" && ok "pct block opens" || bad "pct block"
# جمع‌بندی زنده
stext -q "خریدار این شرایط را می‌بیند" && ok "live summary line" || bad "summary line"
$B screenshot $SHOTS/12-form.png >/dev/null 2>&1
xbtn "ارسال پیشنهاد" >/dev/null 2>&1 && ok "offer A sent" || bad "offer A send"
sleep 8
$B get url 2>/dev/null | grep -qE "/sell/rfqs$" && ok "back to 11 after send" || bad "after send url"
stext -q "پاسخ داده‌شده" && ok "11: moved to پاسخ داده‌شده" || bad "11 answered"

echo "── 6. seller B: فرم ۱۲ (ناقص — ندارد) ──"
browser_login "$SELLB_NAT"
$B open http://localhost:3000/sell/rfqs >/dev/null 2>&1; sleep 4
stext -q "۱ از ۲ قلم نزد تو" && ok "11 B: «۱ از ۲ قلم نزد تو»" || bad "11 B coverage"
xbtn "درخواست قیمت ۲ قلمی" >/dev/null 2>&1
sleep 5
stext -q "در کاتالوک تو نیست" && ok "12 B: partial note «در کاتالوک تو نیست»" || bad "12 B partial note"
PRICEB=$($B snapshot -i 2>/dev/null | python3 -c "
import sys, re
s = sys.stdin.read()
m = re.search(r'textbox \"([^\"]*کاتالوک تو[^\"]*)\" \[ref=(e\d+)\]', s)
print(m.group(2) if m else '')
")
[ -n "$PRICEB" ] && $B fill @$PRICEB "279000" >/dev/null 2>&1 && ok "B price filled (تومان)" || bad "B price"
xbtn "ارسال پیشنهاد" >/dev/null 2>&1; sleep 8
stext -q "پاسخ داده‌شده" && ok "offer B sent (partial) → پاسخ داده‌شده" || bad "offer B send"

echo "── 7. buyer: مقایسهٔ ۲۶ (مرتب + بج‌ها) ──"
browser_login "$BUYER_NAT"
$B open http://localhost:3000/buy/rfqs/$GROUP_ID >/dev/null 2>&1; sleep 5
stext -q "۲ پیشنهاد" && ok "26: ۲ پیشنهاد" || bad "26 offer count"
FIRST_SELLER=$(pagetext | grep -oE 'پخش طلایی آزمون M4|بازار جنوب آزمون M4' | head -1)
[ "$FIRST_SELLER" = "پخش طلایی آزمون M4" ] && ok "26 sort: کامل (A) اول" || bad "26 sort first=$FIRST_SELLER"
stext -q "کمترین جمع" && ok "26: بج «کمترین جمع» بین کامل‌ها" || bad "best badge"
stext -q "این قلم را ندارد" && ok "26: «این قلم را ندارد» روی ناقص" || bad "miss row"
stext -q "بستن این استعلام" && ok "26: «بستن این استعلام» حاضر" || bad "close btn"
$B screenshot $SHOTS/26-compare.png >/dev/null 2>&1

echo "── 8. buyer: جزئیات ۲۷ + پذیرش ──"
# کلیک روی کارت کامل (اولین کارت — A)
xbtn "پخش طلایی آزمون M4" >/dev/null 2>&1 && ok "card → 27 detail" || bad "card click"
sleep 5
$B get url 2>/dev/null | grep -q "/o/" && ok "27 opens" || bad "27 url"
stext -q "جمع ۲ قلم از ۲ قلم استعلام" && ok "27: «جمع ۲ قلم از ۲ قلم استعلام»" || bad "27 price label"
stext -q "راه‌های ارتباط" && ok "27: راه‌های ارتباط" || bad "27 contact"
$B screenshot $SHOTS/27-detail.png >/dev/null 2>&1
xbtn "پذیرش پیشنهاد" >/dev/null 2>&1 && ok "accept sheet opens" || bad "accept btn"
sleep 2
xbtn "بله، می" >/dev/null 2>&1 && ok "accepted" || bad "accept confirm"
sleep 7
stext -q "این پیشنهاد را پذیرفتی" && ok "27: post-accept callout" || bad "post-accept callout"
stext -q "ثبت سفارش با همین شرایط" && ok "27: «ثبت سفارش» کال‌اوت (M5)" || bad "order callout"
$B screenshot $SHOTS/27-accepted.png >/dev/null 2>&1

echo "── 9. buyer: ۲۴ پایان‌یافته + نتیجه ──"
$B open http://localhost:3000/buy/rfqs >/dev/null 2>&1; sleep 4
stext -q "پایان‌یافته" && ok "24: بخش پایان‌یافته" || bad "24 done section"
stext -q "پذیرفت: پخش طلایی" && ok "24: نتیجه «پذیرفت: …»" || bad "24 result"
$B screenshot $SHOTS/24-done.png >/dev/null 2>&1

echo "── 10. cleanup ──"
node -e "
const { MongoClient } = require('$BACK/node_modules/mongodb');
(async () => {
  const c = new MongoClient('$MONGO'); await c.connect();
  const db = c.db();
  const bizs = ['$BUYER_BIZ', '$SELLA_BIZ', '$SELLB_BIZ'];
  for (const b of bizs) {
    await db.collection('Inquiry').deleteMany({ \$or: [{ buyerId: b }, { sellerId: b }] });
    await db.collection('Offer').deleteMany({ \$or: [{ buyerId: b }, { sellerId: b }] });
    await db.collection('Listing').deleteMany({ businessId: b });
    await db.collection('WatchedGood').deleteMany({ businessId: b });
    await db.collection('Business').deleteMany({ id: b });
    await db.collection('Page').deleteMany({ businessId: b });
  }
  await db.collection('Good').deleteMany({ id: { \$in: ['$GOOD1', '$GOOD2'] } });
  await db.collection('User').deleteMany({ phone: { \$in: ['98$BUYER_NAT', '98$SELLA_NAT', '98$SELLB_NAT'] } });
  await c.close();
  console.log('cleanup ok');
})();
" && ok "test data cleaned" || bad "cleanup"

pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null
echo ""
echo "═══ نتیجه: $PASS ✔ · $FAIL ✖ ═══"
[ $FAIL -eq 0 ] || exit 1
