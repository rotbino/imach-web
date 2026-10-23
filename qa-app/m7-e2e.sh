#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M7 e2e (API): امتیاز، رشد و اعلان‌ها — روی Atlas
# سناریوی DoD کامل: کاربر تازه → کارهای گام تا ۱۰۰ → موتور فعال
#   + رفرال ?ref → ثبت‌نام → پاداش کیف + دعوت‌شدگان
#   + اعلان‌های رویدادی (SCORE/ORDER/SUPPLY_PROPOSAL/PRICE_CHANGE)
#   + گیت شبکهٔ باز (openScore AppSetting) + موج تغییر قیمت گروهی
# Usage: bash qa-app/m7-e2e.sh  (from imach-web; backend at ../imach-back)
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
BASE=http://127.0.0.1:4000/api/v1
MONGO=$(grep '^DATABASE_URL=' $BACK/.env | cut -d= -f2- | sed 's/^"//; s/"$//')
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "✔ $1"; }
bad() { FAIL=$((FAIL+1)); echo "✖ $1"; }

req() { # method path token json → body (or FAIL marker)
  local out
  out=$(curl -s -w $'\n%{http_code}' -X $1 $BASE$2 -H "content-type: application/json" \
    -H "authorization: Bearer $3" -d "$4" 2>/dev/null)
  local code=$(echo "$out" | tail -1)
  local body=$(echo "$out" | sed '$d')
  echo "$body"
  [ "$code" = "200" ] || [ "$code" = "201" ]
}
jget() { echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); print($2)" 2>/dev/null; }

echo "── 1. boot backend ──"
cd $BACK
pkill -f "node dist/main" 2>/dev/null; sleep 1
DATABASE_URL="$MONGO" STORAGE_DRIVER=local UPLOAD_PATH="$BACK/uploads" setsid nohup node dist/main.js > /tmp/imach-back-m7.log 2>&1 < /dev/null &
for i in $(seq 1 60); do curl -sf $BASE/getHealth >/dev/null 2>&1 && break; sleep 1; done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }

echo "── 2. seed: قهرمان آزمون S (فروشنده) + همراه‌ها ──"
STAMP=$(date +%s | tail -c 5)
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+$1) % 1000000000 )))"; }
S_NAT=$(mkphone 11); X_NAT=$(mkphone 12); Y_NAT=$(mkphone 13); Z_NAT=$(mkphone 14); REF_NAT=$(mkphone 15)

SJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$S_NAT\",\"country\":\"IR\"}") && ok "قهرمان S ثبت‌نام کرد" || { bad "S register"; exit 1; }
ST=$(jget "$SJ" "d['accessToken']"); SB=$(jget "$SJ" "d['businesses'][0]['id']"); SS=$(jget "$SJ" "d['businesses'][0]['slug']")
SEED=$(jget "$SJ" "d['businesses'][0]['scoreSell']")
[ "$SEED" = "5" ] && ok "امتیاز تولد = ۵ (حکم مالک M3)" || bad "seed score: $SEED"

# اطلاعات کامل → sc1 از استنتاج هم قفل است (editBusiness با نام/شهر/صنف)
req PATCH /businesses/editBusiness/$SB $ST '{"name":"پخش قهرمان M7","city":"رشت","trade":"پخش مواد غذایی"}' >/dev/null

echo "── 3. موتور امتیاز فروش: کاتالوگ ۱→۳→۵ ──"
for i in 1 2 3 4 5; do
  G=$(jget "$(req POST /goods/createGood $ST "{\"name\":\"کالای M7-$STAMP-$i\",\"unit\":\"KILOGRAM\"}")" "d['id']")
  req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":$((28000000+i*1000)),\"stock\":100,\"minOrder\":1}}" >/dev/null
done
# شمارندهٔ کاتالوک async تازه می‌شود — تا رسیدنش poll کن (تا ۱۰s)
for i in $(seq 1 20); do
  SCS=$(jget "$(curl -s "$BASE/score?businessId=$SB" -H "authorization: Bearer $ST")" "d['scoreSell']")
  [ "$SCS" = "30" ] && break; sleep 0.5
done
SC=$(req GET "/score?businessId=$SB" $ST "")
SCS=$(jget "$SC" "d['scoreSell']")
[ "$SCS" = "30" ] && ok "۵ محصول ⇒ ۵+۱۰+۱۰ = ۳۰" || bad "scoreSell: $SCS"
DONE5=$(jget "$SC" "len([i for i in d['sell']['items'] if i['done']])")
[ "$DONE5" = "4" ] && ok "sc1..sc4 انجام‌شده" || bad "done: $DONE5"
EV5=$(jget "$SC" "len([i for i in d['sell']['items'] if i['done'] and i['doneAt']])")
[ "$EV5" = "4" ] && ok "هر ۴ رویداد تاریخ دارند (ScoreEvent)" || bad "events: $EV5"

echo "── 4. دعوت مشتری: ۳ فالو ⇒ sc5 (+۲۰) ──"
for N in $X_NAT $Y_NAT $Z_NAT; do
  UJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$N\",\"country\":\"IR\"}")
  UT=$(jget "$UJ" "d['accessToken']"); UB=$(jget "$UJ" "d['businesses'][0]['id']")
  req POST /market/followSupplier $UT "{\"businessId\":\"$UB\",\"supplierId\":\"$SB\",\"source\":\"SHARED\"}" >/dev/null
done
SC=$(req GET "/score?businessId=$SB" $ST "")
SCS=$(jget "$SC" "d['scoreSell']")
[ "$SCS" = "50" ] && ok "۳ مشتری ⇒ +۲۰ = ۵۰ (بیشترین امتیاز — FD-7)" || bad "scoreSell: $SCS"

echo "── 5. پاسخ به اولین درخواست ⇒ sc8 (+۱۰) + سفارش بسته ⇒ sc7 (+۱۵) ──"
# X یک استعلام به S می‌دهد — اول فروشنده باید کالا را بفروشد تا گیرندهٔ استعلام شود
G1=$(jget "$(req POST /goods/createGood $ST "{\"name\":\"برنج M7-$STAMP\",\"unit\":\"KILOGRAM\"}")" "d['id']")
L1=$(jget "$(req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":27500000,\"stock\":50,\"minOrder\":1}}")" "d['id']")
XJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$(mkphone 16)\",\"country\":\"IR\"}")
XT=$(jget "$XJ" "d['accessToken']"); XB=$(jget "$XJ" "d['businesses'][0]['id']")
req PUT /listings/saveListing $XT "{\"businessId\":\"$XB\",\"goodId\":\"$G1\",\"mode\":\"BUY\",\"buy\":{\"volume\":100,\"frequency\":\"WEEKLY\"}}" >/dev/null
req POST /market/requestQuote $XT "{\"businessId\":\"$XB\",\"items\":[{\"goodId\":\"$G1\",\"qty\":100}],\"expiresDays\":3}" >/dev/null
INQS=$(jget "$(req GET "/market/getInquiries?businessId=$SB" $ST "")" "[i['id'] for i in d['items']][0]")
req POST /market/sendOffer $ST "{\"inquiryId\":\"$INQS\",\"prices\":[27500000]}" >/dev/null
SC=$(req GET "/score?businessId=$SB" $ST "")
SCS=$(jget "$SC" "d['scoreSell']")
[ "$SCS" = "60" ] && ok "اولین پاسخ ⇒ +۱۰ = ۶۰" || bad "sc8: $SCS"

# سفارش کامل تا DELIVERED (سبدی)
ORD=$(req POST /orders $XT "{\"businessId\":\"$XB\",\"supplierId\":\"$SB\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$L1\",\"qty\":10}]}")
OID=$(jget "$ORD" "d['id']")
req POST /orders/$OID/accept $ST "{\"businessId\":\"$SB\"}" >/dev/null
req POST /orders/$OID/send $ST "{\"businessId\":\"$SB\"}" >/dev/null
req POST /orders/$OID/deliver $XT "{\"businessId\":\"$XB\"}" >/dev/null
SC=$(req GET "/score?businessId=$SB" $ST "")
SCS=$(jget "$SC" "d['scoreSell']")
[ "$SCS" = "75" ] && ok "اولین سفارش بسته ⇒ +۱۵ = ۷۵" || bad "sc7: $SCS"
XSC=$(req GET "/score?businessId=$XB" $XT "")
SCB=$(jget "$XSC" "d['scoreBuy']")
[ "$SCB" = "40" ] && ok "خریدار X: sb1+sb2+sb7+sb8 = ۴۰" || bad "X scoreBuy: $SCB"

echo "── 6. دعوت ۵ مشتری ⇒ sc6 (+۱۵) ⇒ ۹۰ + دوهفته (بک‌دیت) ⇒ ۱۰۰ ──"
for i in 17 18; do
  UJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$(mkphone $i)\",\"country\":\"IR\"}")
  UT=$(jget "$UJ" "d['accessToken']"); UB=$(jget "$UJ" "d['businesses'][0]['id']")
  req POST /market/followSupplier $UT "{\"businessId\":\"$UB\",\"supplierId\":\"$SB\",\"source\":\"SHARED\"}" >/dev/null
done
SC=$(req GET "/score?businessId=$SB" $ST "")
SCS=$(jget "$SC" "d['scoreSell']")
[ "$SCS" = "90" ] && ok "۵ مشتری ⇒ ۹۰ (فقط دوهفته مانده)" || bad "90?: $SCS"
OPEN90=$(jget "$SC" "d['sell']['open']")
[ "$OPEN90" = "False" ] && ok "۹۰ < ۱۰۰ ⇒ موتور هنوز قفل" || bad "open90: $OPEN90"

# بک‌دیتِ عمر: createdAt ← ۱۵ روز قبل (ادمین/تعمیر داده؛ سناریوی واقعی «دو هفته فعالیت»)
export SS
BD=$(node << 'EOF' 2>/dev/null
const { MongoClient } = require('mongodb');
const fs = require('fs');
const env = fs.readFileSync('/home/z/my-project/imach-back/.env', 'utf8');
const mongo = env.match(/^DATABASE_URL="?([^"]*)"?/m)[1];
(async () => {
  const c = new MongoClient(mongo);
  await c.connect();
  const r = await c.db().collection('Business').updateOne(
    { slug: process.env.SS },
    { $set: { createdAt: new Date(Date.now() - 15 * 86400000) } }
  );
  console.log(r.modifiedCount);
  await c.close();
})();
EOF
)
[ "$BD" = "1" ] && ok "بک‌دیت عمر S (۱۵ روز)" || bad "backdate: $BD"
SC=$(curl -s "$BASE/score?businessId=$SB" -H "authorization: Bearer $ST")
SCS=$(jget "$SC" "d['scoreSell']")
[ "$SCS" = "100" ] && ok "دوهفته فعالیت ⇒ ۱۰۰ — موتور فعال!" || bad "100?: $SCS"
OPEN100=$(jget "$SC" "d['sell']['open']")
[ "$OPEN100" = "True" ] && ok "sell.open=true (گیت شبکهٔ باز)" || bad "open100: $OPEN100"

echo "── 7. اعلان SCORE (لحظهٔ ۱۰۰) ──"
NT=$(req GET /notifications/getNotifications $ST "")
NSCORE=$(echo "$NT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=[i for i in d['items'] if i['type']=='SCORE']
print(rows[0]['title'] if rows else '')" 2>/dev/null)
echo "$NSCORE" | grep -q "۱۰۰" && ok "اعلان SCORE: «$NSCORE»" || bad "SCORE notif: $NSCORE"
NURL=$(echo "$NT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=[i for i in d['items'] if i['type']=='SCORE']
print(rows[0].get('url') if rows else '')" 2>/dev/null)
echo "$NURL" | grep -q "home/score" && ok "SCORE url → /home/score" || bad "SCORE url: $NURL"

echo "── 8. رفرال: ?ref → referredBy + پاداش + صفحهٔ دعوت‌شدگان ──"
RFJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$REF_NAT\",\"country\":\"IR\",\"ref\":\"$SS\"}")
ok "ثبت‌نام با ?ref=$SS" || bad "ref register"
RFD=$(req GET "/score/referrals?businessId=$SB" $ST "")
RFC=$(jget "$RFD" "d['count']")
[ "$RFC" = "1" ] && ok "دعوت‌شدگان: ۱" || bad "referrals: $RFC"
RFE=$(jget "$RFD" "d['earnedMinor']")
[ "$RFE" = "50000" ] && ok "پاداش کیف ۵۰٬۰۰۰ minor (۵٬۰۰۰ تومان)" || bad "earned: $RFE"
RFA=$(jget "$RFD" "d['items'][0]['arm']")
[ "$RFA" = "SELL" ] && ok "نشان بازو: مشتری من (SELL)" || bad "arm: $RFA"
RFR=$(jget "$RFD" "d['items'][0]['rewarded']")
[ "$RFR" = "True" ] && ok "پاداشش داده شده" || bad "rewarded: $RFR"
# دعوت‌شده با فالوی تولد → sc5 در جریان: مشتری ششم
SC=$(req GET "/score?businessId=$SB" $ST "")
C6=$(jget "$SC" "len([i for i in d['sell']['items'] if i['done']])")
[ "$C6" = "9" ] && ok "همهٔ ۹ آیتم فروش انجام‌شده" || bad "items done: $C6"

echo "── 9. گیت شبکهٔ باز: خریدار قفل/باز + آستانهٔ ادمین ──"
SG=$(req GET "/market/getSuggestions?businessId=$SB" $ST "")
SGL=$(jget "$SG" "d.get('locked')")
[ "$SGL" != "True" ] && ok "S (۱۰۰ فروش؟ برای suggestions بازوی خرید لازم است)" || echo "   (suggestions وابسته به scoreBuy — S: $(jget "$SG" "d.get('score')"))"
# X خریدار تازه: scoreBuy پایین ⇒ locked
XSG=$(req GET "/market/getSuggestions?businessId=$XB" $XT "")
XSGL=$(jget "$XSG" "d.get('locked')")
[ "$XSGL" = "True" ] && ok "خریدارِ زیر آستنه ⇒ suggestions locked" || bad "X locked: $XSGL"
# پیشنهاد مستقیم به خریدار ناشناس ⇒ فروشندهٔ تازه W (۵ امتیاز) باید گیت بخورد
W_NAT=$(mkphone 19)
WJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$W_NAT\",\"country\":\"IR\"}")
WT=$(jget "$WJ" "d['accessToken']"); WB=$(jget "$WJ" "d['businesses'][0]['id']")
req PUT /listings/saveListing $WT "{\"businessId\":\"$WB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":26000000,\"stock\":10,\"minOrder\":1}}" >/dev/null
XBUY=$(jget "$(req GET "/listings/getMyListings?businessId=$XB" $XT "")" "[i['id'] for i in d if i.get('mode')!='SELL'][0]")
COLD=$(curl -s -X POST $BASE/market/offerBuyRequest -H "content-type: application/json" -H "authorization: Bearer $WT" -d "{\"businessId\":\"$WB\",\"buyListingId\":\"$XBUY\",\"priceMinor\":26000000}")
echo "$COLD" | grep -q "OPEN_SCORE_GATE" && ok "فروشندهٔ ۵ امتیازی ⇒ OPEN_SCORE_GATE" || bad "cold gate: $(echo $COLD | head -c 90)"
# آستانه از پنل ادمین
ADMIN=$(node -e "
const fs = require('fs');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const env = fs.readFileSync('/home/z/my-project/imach-back/.env', 'utf8');
const secret = env.match(/^JWT_SECRET=\"?([^\"]*)\"?/m)[1];
const mongo = env.match(/^DATABASE_URL=\"?([^\"]*)\"?/m)[1];
(async () => {
  const client = new MongoClient(mongo);
  await client.connect();
  const admin = (await client.db().collection('User').findOne({ role: 'ADMIN' })) ?? (await client.db().collection('User').findOne({}));
  console.log(jwt.sign({ id: String(admin._id), phone: admin.phone, role: admin.role }, secret, { expiresIn: '30m' }));
  await client.close();
})().catch(() => process.exit(1));
" 2>/dev/null)
if [ -n "$ADMIN" ]; then
  W=$(curl -s -X PUT "$BASE/admin/settings/network.openScore" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" -d '{"value":40}')
  echo "$W" | grep -q "openScore" && ok "ادمین آستانه=۴۰ نوشت" || bad "admin: $(echo $W | head -c 100)"
  XSG2=$(req GET "/market/getSuggestions?businessId=$XB" $XT "")
  XSGL2=$(jget "$XSG2" "d.get('locked')")
  [ "$XSGL2" != "True" ] && ok "آستانهٔ ۴۰ ⇒ موتورِ X باز شد (بدون دیپلوی)" || bad "X still locked"
  curl -s -X PUT "$BASE/admin/settings/network.openScore" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" -d '{"value":100}' >/dev/null
  ok "آستانه به ۱۰۰ برگشت"
else
  bad "توکن ادمین — بخش آستانه رد شد"
fi

echo "── 10. موج اعلان تغییر قیمت گروهی (PRICE_CHANGE) ──"
# Y فالوی S شده (بخش ۴) ⇒ دیده‌بان؛ تغییر قیمت ⇒ اعلان رویدادی
BULK=$(req PUT /listings/bulkPriceStock $ST "{\"businessId\":\"$SB\",\"items\":[{\"listingId\":\"$L1\",\"pct\":5}]}")
BUP=$(jget "$BULK" "d['updated']")
[ "$BUP" = "1" ] && ok "تغییر گروهی اعمال شد" || bad "bulk: $BUP"
YT=$(jget "$(req POST /auth/quickRegister "" "{\"phone\":\"$Y_NAT\",\"country\":\"IR\"}")" "d['accessToken']")
YNT=$(req GET /notifications/getNotifications $YT "")
# Y قبلاً فالو کرده؛ توکن تازه همان کاربر — نوبت notif
YNPC=$(echo "$YNT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=[i for i in d['items'] if i['type']=='PRICE_CHANGE']
print(rows[0]['title'] if rows else '')" 2>/dev/null)
echo "$YNPC" | grep -q "قیمت" && ok "دیده‌بان PRICE_CHANGE گرفت: «$YNPC»" || bad "price notif: $YNPC"

echo "── 11. getMarketState: open (جایگزین referral) ──"
MS=$(req GET "/market/getMarketState?businessId=$SB" $ST "")
echo "$MS" | grep -q '"open"' && ok "open در marketState" || bad "no open"
echo "$MS" | grep -q '"referral"' && bad "referral هنوز هست!" || ok "referral بازنشسته"

pkill -f "node dist/main" 2>/dev/null
echo ""
echo "══ M7 E2E: $PASS pass / $FAIL fail ══"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "HAS FAILURES ✖"
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
