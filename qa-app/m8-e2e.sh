#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M8 e2e (API): پیام‌رسان، پروفایل و تنظیمات — روی Atlas
# سناریوی DoD کامل:
#   + زمینهٔ گفتگو در ۴ نوع سند (ORDER/OFFER/SUPPLY_PROPOSAL/LISTING)
#     با عنوان زندهٔ «دربارهٔ: …» + یکتایی زمینه‌دار + گفتگوی آزاد جدا
#   + حضور (heartbeat → آنلاین؛ بک‌دیت → آفلاین)
#   + خواندن خودکار + بج نخوانده + lastText denormalized
#   + گیت زوج سند (CONTEXT_MISMATCH) + نوع نامعتبر (BAD_CONTEXT_TYPE)
#   + setPrefs Δ (زبان/ارز ذخیره — D2)
# Usage: bash qa-app/m8-e2e.sh  (from imach-web; backend at ../imach-back)
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
DATABASE_URL="$MONGO" STORAGE_DRIVER=local UPLOAD_PATH="$BACK/uploads" setsid nohup node dist/main.js > /tmp/imach-back-m8.log 2>&1 < /dev/null &
for i in $(seq 1 60); do curl -sf $BASE/getHealth >/dev/null 2>&1 && break; sleep 1; done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }

echo "── 2. seed: S (فروشنده) + X (خریدار) + Z (غریبه) ──"
STAMP=$(date +%s | tail -c 5)
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+$1) % 1000000000 )))"; }
S_NAT=$(mkphone 51); X_NAT=$(mkphone 52); Z_NAT=$(mkphone 53)

SJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$S_NAT\",\"country\":\"IR\"}") && ok "S ثبت‌نام" || { bad "S register"; exit 1; }
ST=$(jget "$SJ" "d['accessToken']"); SB=$(jget "$SJ" "d['businesses'][0]['id']"); SS=$(jget "$SJ" "d['businesses'][0]['slug']")
XJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$X_NAT\",\"country\":\"IR\"}")
XT=$(jget "$XJ" "d['accessToken']"); XB=$(jget "$XJ" "d['businesses'][0]['id']"); XS=$(jget "$XJ" "d['businesses'][0]['slug']")
ZJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$Z_NAT\",\"country\":\"IR\"}")
ZT=$(jget "$ZJ" "d['accessToken']"); ZB=$(jget "$ZJ" "d['businesses'][0]['id']")
req PATCH /businesses/editBusiness/$SB $ST '{"name":"پخش پارس M8","city":"رشت","trade":"پخش مواد غذایی"}' >/dev/null
req PATCH /businesses/editBusiness/$XB $XT '{"name":"سوپرمارکت مهر M8","city":"رشت","trade":"سوپرمارکت"}' >/dev/null

G1=$(jget "$(req POST /goods/createGood $ST "{\"name\":\"برنج هاشمی M8-$STAMP\",\"unit\":\"KILOGRAM\"}")" "d['id']")
G2=$(jget "$(req POST /goods/createGood $ST "{\"name\":\"روغن سرخ‌کردنی M8-$STAMP\",\"unit\":\"BAG\"}")" "d['id']")
L1=$(jget "$(req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":27500000,\"stock\":100,\"minOrder\":1}}")" "d['id']")
L2=$(jget "$(req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G2\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":3100000,\"stock\":80,\"minOrder\":2}}")" "d['id']")

echo "── 3. heartbeat + حضور ──"
HB=$(req POST /chat/heartbeat $XT "{}")
echo "$HB" | grep -q '"ok"' && ok "heartbeat X" || bad "heartbeat: $HB"
HBS=$(req POST /chat/heartbeat $ST "{}")
echo "$HBS" | grep -q '"ok"' && ok "heartbeat S" || bad "heartbeat S: $HBS"

echo "── 4. زمینهٔ ORDER: گفتگو از دلِ سفارش (تصمیم ۸ FD-22) ──"
ORD=$(req POST /orders $XT "{\"businessId\":\"$XB\",\"supplierId\":\"$SB\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$L1\",\"qty\":10},{\"listingId\":\"$L2\",\"qty\":4}]}")
OID=$(jget "$ORD" "d['id']")
[ -n "$OID" ] && ok "سفارش دو-قلمی ساخته شد" || { bad "order: $ORD"; exit 1; }
R=$(req POST /chat/startThread $XT "{\"businessId\":\"$XB\",\"withBusinessId\":\"$SB\",\"contextType\":\"ORDER\",\"contextRefId\":\"$OID\"}")
TID=$(jget "$R" "d['id']")
CTY=$(jget "$R" "d['context']['type']"); CCR=$(jget "$R" "d['context']['refId']")
[ -n "$TID" ] && [ "$(jget "$R" "d['created']")" = "True" ] && ok "گفتگوی زمینه‌دار ORDER ساخته شد" || bad "start: $R"
[ "$CTY" = "ORDER" ] && [ "$CCR" = "$OID" ] && ok "context = ORDER:orderId" || bad "context: $CTY/$CCR"

# یکتایی زمینه‌دار — دوباره همان سند = همان گفتگو
R2=$(req POST /chat/startThread $XT "{\"businessId\":\"$XB\",\"withBusinessId\":\"$SB\",\"contextType\":\"ORDER\",\"contextRefId\":\"$OID\"}")
[ "$(jget "$R2" "d['id']")" = "$TID" ] && [ "$(jget "$R2" "d['created']")" = "False" ] && ok "idempotent — همان گفتگو برمی‌گردد" || bad "idem: $R2"

# گفتگوی آزاد همان زوج — جدا از زمینه‌دار
R3=$(req POST /chat/startThread $XT "{\"businessId\":\"$XB\",\"withBusinessId\":\"$SB\"}")
[ "$(jget "$R3" "d['id']")" != "$TID" ] && [ "$(jget "$R3" "d['created']")" = "True" ] && ok "گفتگوی آزاد جداست (کلید «»)" || bad "plain: $R3"
FREE_TID=$(jget "$R3" "d['id']")

echo "── 5. پیام‌ها + عنوان زندهٔ زمینه + خواندن خودکار ──"
req POST /chat/sendMessage $XT "{\"threadId\":\"$TID\",\"text\":\"سلام — این سفارش را برای امروز می‌خواهم\"}" >/dev/null
D=$(req GET "/chat/getThread/$TID" $ST "")
TTL=$(jget "$D" "d['context']['title']")
echo "$TTL" | grep -q "سفارش برنج هاشمی" && ok "عنوان زمینه: «$TTL»" || bad "title: $TTL"
echo "$TTL" | grep -q "۱ قلم دیگر" && ok "دو قلم ⇒ «و ۱ قلم دیگر»" || bad "multi-item title: $TTL"
MINE=$(jget "$D" "len([m for m in d['messages'] if not m['mine']])")
[ "$MINE" = "1" ] && ok "پیام X برای S غیرِ-mine" || bad "mine flag: $MINE"
# X هنوز نخوانده (S پیامی نفرستاده) — بعد از ارسال S، بج X را می‌سنجیم
req POST /chat/sendMessage $ST "{\"threadId\":\"$TID\",\"text\":\"سلام — ارسال امروز انجام می‌شود\"}" >/dev/null
LSTX=$(req GET "/chat/getThreads" $XT "")
UX=$(jget "$LSTX" "sum(i['unread'] for i in d['items'])")
[ "$UX" = "1" ] && ok "بج نخواندهٔ X = ۱" || bad "unread X: $UX"
LT=$(jget "$LSTX" "[i['lastText'] for i in d['items'] if i['id']=='$TID'][0]")
echo "$LT" | grep -q "ارسال امروز" && ok "lastText denormalized تازه" || bad "lastText: $LT"
DX=$(req GET "/chat/getThread/$TID" $XT "")
UX2=$(jget "$(req GET "/chat/getThreads" $XT "")" "sum(i['unread'] for i in d['items'])")
[ "$UX2" = "0" ] && ok "باز کردن گفتگو = خواندن (بج صفر)" || bad "unread after read: $UX2"

echo "── 6. حضور در لیست و گفتگو ──"
ROWON=$(jget "$LSTX" "[i['other']['online'] for i in d['items'] if i['id']=='$TID'][0]")
[ "$ROWON" = "True" ] && ok "S آنلاین (heartbeat تازه) در ردیف X" || bad "row online: $ROWON"
DON=$(jget "$D" "d['other']['online']")
[ "$DON" = "True" ] && ok "S آنلاین در getThread" || bad "thread online: $DON"
# بک‌دیت حضور S → آفلاین (ادمین/تعمیر داده — بدون انتظار واقعی ۹۰s)
BD=$(S_NAT="$S_NAT" node -e "
const { MongoClient } = require('mongodb');
const fs = require('fs');
const env = fs.readFileSync('/home/z/my-project/imach-back/.env', 'utf8');
const mongo = env.match(/^DATABASE_URL=\"?([^\"\n]*)\"?/m)[1];
(async () => {
  const c = new MongoClient(mongo);
  await c.connect();
  const r = await c.db().collection('User').updateOne({ phone: '98' + process.env.S_NAT }, { \$set: { lastSeenAt: new Date(Date.now() - 300000) } });
  console.log(r.modifiedCount);
  await c.close();
})();
" 2>/dev/null)
[ "$BD" = "1" ] && ok "بک‌دیت حضور S (۵ دقیقه قبل)" || bad "backdate: $BD"
DON2=$(jget "$(req GET "/chat/getThread/$TID" $XT "")" "d['other']['online']")
[ "$DON2" = "False" ] && ok "بعد از بک‌دیت: آفلاین (آستانهٔ ۹۰s)" || bad "offline: $DON2"

echo "── 7. زمینهٔ OFFER: گفتگو از دلِ پیشنهاد ──"
req PUT /listings/saveListing $XT "{\"businessId\":\"$XB\",\"goodId\":\"$G1\",\"mode\":\"BUY\",\"buy\":{\"volume\":100,\"frequency\":\"WEEKLY\"}}" >/dev/null
req POST /market/requestQuote $XT "{\"businessId\":\"$XB\",\"items\":[{\"goodId\":\"$G1\",\"qty\":100}],\"expiresDays\":3}" >/dev/null
INQ=$(jget "$(req GET "/market/getInquiries?businessId=$SB" $ST "")" "d['items'][0]['id']")
OFF=$(req POST /market/sendOffer $ST "{\"inquiryId\":\"$INQ\",\"prices\":[27400000]}")
OFID=$(jget "$OFF" "d['id']")
[ -n "$OFID" ] && ok "پیشنهاد فرستاده شد" || bad "offer: $OFF"
RO=$(req POST /chat/startThread $XT "{\"businessId\":\"$XB\",\"withBusinessId\":\"$SB\",\"contextType\":\"OFFER\",\"contextRefId\":\"$OFID\"}")
TOID=$(jget "$RO" "d['id']")
[ -n "$TOID" ] && [ "$(jget "$RO" "d['created']")" = "True" ] && ok "گفتگوی زمینه‌دار OFFER" || bad "offer thread: $RO"
TTO=$(jget "$(req GET "/chat/getThread/$TOID" $XT "")" "d['context']['title']")
echo "$TTO" | grep -q "پیشنهاد برنج هاشمی" && ok "عنوان: «$TTO»" || bad "offer title: $TTO"

echo "── 8. زمینهٔ SUPPLY_PROPOSAL: گفتگو از دلِ پیشنهاد تامین ──"
SP=$(req POST /supply-proposals $ST "{\"businessId\":\"$SB\",\"buyerSlug\":\"$XS\",\"items\":[{\"goodId\":\"$G1\",\"priceMinor\":27200000,\"minOrder\":4},{\"goodId\":\"$G2\",\"priceMinor\":3050000,\"minOrder\":6}],\"note\":\"تحویل همان روز\"}")
SPID=$(jget "$SP" "d['id']")
[ -n "$SPID" ] && ok "پیشنهاد تامین ۲-قلمی" || bad "proposal: $SP"
RP=$(req POST /chat/startThread $XT "{\"businessId\":\"$XB\",\"withBusinessId\":\"$SB\",\"contextType\":\"SUPPLY_PROPOSAL\",\"contextRefId\":\"$SPID\"}")
TPID=$(jget "$RP" "d['id']")
[ -n "$TPID" ] && [ "$(jget "$RP" "d['created']")" = "True" ] && ok "گفتگوی زمینه‌دار SUPPLY_PROPOSAL" || bad "sp thread: $RP"
TTP=$(jget "$(req GET "/chat/getThread/$TPID" $XT "")" "d['context']['title']")
echo "$TTP" | grep -q "پیشنهاد تأمین برنج هاشمی" && ok "عنوان: «$TTP»" || bad "sp title: $TTP"

echo "── 9. زمینهٔ LISTING: گفتگو از دلِ آگهی ──"
RL=$(req POST /chat/startThread $XT "{\"businessId\":\"$XB\",\"withBusinessId\":\"$SB\",\"contextType\":\"LISTING\",\"contextRefId\":\"$L1\"}")
TLID=$(jget "$RL" "d['id']")
[ -n "$TLID" ] && ok "گفتگوی زمینه‌دار LISTING" || bad "listing thread: $RL"
TTL2=$(jget "$(req GET "/chat/getThread/$TLID" $XT "")" "d['context']['title']")
echo "$TTL2" | grep -q "برنج هاشمی" && ok "عنوان آگهی = نام کالا: «$TTL2»" || bad "listing title: $TTL2"

echo "── 10. گیت‌های اعتبارسنجی زمینه ──"
MM=$(curl -s -X POST $BASE/chat/startThread -H "content-type: application/json" -H "authorization: Bearer $ZT" -d "{\"businessId\":\"$ZB\",\"withBusinessId\":\"$SB\",\"contextType\":\"ORDER\",\"contextRefId\":\"$OID\"}")
echo "$MM" | grep -q "CONTEXT_MISMATCH" && ok "زوج نامربوط ⇒ CONTEXT_MISMATCH" || bad "mismatch: $(echo $MM | head -c 90)"
BT=$(curl -s -X POST $BASE/chat/startThread -H "content-type: application/json" -H "authorization: Bearer $XT" -d "{\"businessId\":\"$XB\",\"withBusinessId\":\"$SB\",\"contextType\":\"MAGIC\",\"contextRefId\":\"$OID\"}")
echo "$BT" | grep -q "BAD_CONTEXT_TYPE" && ok "نوع نامعتبر ⇒ BAD_CONTEXT_TYPE" || bad "bad type: $(echo $BT | head -c 90)"
NF=$(curl -s -X POST $BASE/chat/startThread -H "content-type: application/json" -H "authorization: Bearer $XT" -d "{\"businessId\":\"$XB\",\"withBusinessId\":\"$SB\",\"contextType\":\"ORDER\",\"contextRefId\":\"666666666666666666666666\"}")
echo "$NF" | grep -q "CONTEXT_NOT_FOUND" && ok "سند نایافته ⇒ CONTEXT_NOT_FOUND" || bad "not found: $(echo $NF | head -c 90)"

echo "── 11. setPrefs Δ — ذخیره ولی UI فقط fa/IRT (D2) ──"
P=$(req POST /auth/setPrefs $ST "{\"lang\":\"en\",\"currency\":\"USD\"}")
echo "$P" | grep -q '"lang": *"en"' && ok "lang=en ذخیره شد" || bad "prefs lang: $P"
P2=$(req POST /auth/setPrefs $ST "{\"lang\":\"fa\",\"currency\":\"IRT\"}")
echo "$P2" | grep -q '"lang": *"fa"' && ok "بازگشت به fa/IRT" || bad "prefs revert: $P2"

echo "── 12. فهرست پیام‌ها: همهٔ گفتگوهای زمینه‌دار + آزاد ──"
LS=$(req GET "/chat/getThreads" $XT "")
CNT=$(jget "$LS" "len(d['items'])")
[ "$CNT" -ge "4" ] && ok "X دست‌کم ۴ گفتگو دارد (ORDER/OFFER/SP/LISTING یا آزاد)" || bad "threads count: $CNT"
TOT=$(jget "$LS" "d['unreadTotal']")
[ "$TOT" = "0" ] && ok "unreadTotal صفر (همه خوانده)" || bad "total: $TOT"

pkill -f "node dist/main" 2>/dev/null
echo ""
echo "══ M8 E2E: $PASS pass / $FAIL fail ══"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "HAS FAILURES ✖"
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
