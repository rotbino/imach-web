#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M5 e2e (API): سفارش‌ها و اسناد — حلقهٔ کامل روی Atlas
# سبد → پذیرش با اصلاح (شماره سند) → ارسال (مهلت ۷روزه) → تحویل → بایگانی
# + مسیر پیشنهاد→سفارش (قلم بی‌قیمت نمی‌آید) + بستنِ تنبل + گاردها
# Usage: bash qa-app/m5-e2e.sh  (from imach-web; backend at ../imach-back)
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
DATABASE_URL="$MONGO" setsid nohup node dist/main.js > /tmp/imach-back-m5.log 2>&1 < /dev/null &
for i in $(seq 1 60); do curl -sf $BASE/getHealth >/dev/null 2>&1 && break; sleep 1; done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }

echo "── 2. seed: buyer + seller + 2 goods + listings ──"
STAMP=$(date +%s | tail -c 5)
BUYER_NAT="9$(printf '%09d' $(( $(date +%s) % 1000000000 )))"
SELLER_NAT="9$(printf '%09d' $(( ($(date +%s)+1) % 1000000000 )))"

BUYER_JSON=$(req POST /auth/quickRegister "" "{\"phone\":\"$BUYER_NAT\",\"country\":\"IR\"}") && ok "buyer account" || { bad "buyer account"; exit 1; }
BUYER_TOKEN=$(jget "$BUYER_JSON" "d['accessToken']")
BUYER_BIZ=$(jget "$BUYER_JSON" "d['businesses'][0]['id']")
SELLER_JSON=$(req POST /auth/quickRegister "" "{\"phone\":\"$SELLER_NAT\",\"country\":\"IR\"}") && ok "seller account" || { bad "seller account"; exit 1; }
SELLER_TOKEN=$(jget "$SELLER_JSON" "d['accessToken']")
SELLER_BIZ=$(jget "$SELLER_JSON" "d['businesses'][0]['id']")

req PATCH /businesses/editBusiness/$BUYER_BIZ $BUYER_TOKEN '{"name":"سوپرمارکت آزمون M5","city":"رشت","trade":"سوپرمارکت"}' >/dev/null
req PATCH /businesses/editBusiness/$SELLER_BIZ $SELLER_TOKEN '{"name":"پخش طلایی آزمون M5","city":"رشت","trade":"عمده‌فروشی","invoiceTaxId":"12345678901","invoiceNote":"کالای فروخته‌شده برگشت ندارد"}' >/dev/null
ok "businesses named + invoice fields"

GOOD1=$(jget "$(req POST /goods/createGood $BUYER_TOKEN "{\"name\":\"برنج آزمون M5 $STAMP\",\"unit\":\"KILOGRAM\"}")" "d['id']") && ok "good1" || bad "good1"
GOOD2=$(jget "$(req POST /goods/createGood $BUYER_TOKEN "{\"name\":\"روغن آزمون M5 $STAMP\",\"unit\":\"LITER\"}")" "d['id']") && ok "good2" || bad "good2"

# آگهی فروش: قلم ۱ حداقل ۵ (گیت FD-26)، قلم ۲ حداقل ۱ + عنوان شخصی + بسته
L1=$(jget "$(req PUT /listings/saveListing $SELLER_TOKEN "{\"businessId\":\"$SELLER_BIZ\",\"goodId\":\"$GOOD1\",\"mode\":\"SELL\",\"title\":\"برنج هاشمی درجه یک\",\"sell\":{\"priceMinor\":2840000,\"stock\":1000,\"minOrder\":5},\"packLabel\":\"کیسه ۵۰ کیلویی\"}")" "d['id']") && ok "listing1 (minOrder 5 + title + pack)" || bad "listing1"
L2=$(jget "$(req PUT /listings/saveListing $SELLER_TOKEN "{\"businessId\":\"$SELLER_BIZ\",\"goodId\":\"$GOOD2\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":1385000,\"stock\":500,\"minOrder\":1}}")" "d['id']") && ok "listing2" || bad "listing2"

echo "── 3. سبد کاتالوک → سفارش (پایه) ──"
# گیت حداقل سفارش سمت سرور
MINREJ=$(req POST /orders $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"supplierId\":\"$SELLER_BIZ\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$L1\",\"qty\":2}]}")
echo "$MINREJ" | grep -q "MIN_ORDER" && ok "min-order gate (qty 2 < 5 rejected)" || bad "min-order gate: $MINREJ"

ORDER_JSON=$(req POST /orders $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"supplierId\":\"$SELLER_BIZ\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$L1\",\"qty\":10},{\"listingId\":\"$L2\",\"qty\":3}],\"note\":\"پنجشنبه صبح تحویل بگیرم\"}") && ok "basket order created" || { bad "basket order: $ORDER_JSON"; exit 1; }
OID=$(jget "$ORDER_JSON" "d['id']")
ST=$(jget "$ORDER_JSON" "d['status']"); [ "$ST" = "NEW" ] && ok "status NEW" || bad "status: $ST"
NITEMS=$(jget "$ORDER_JSON" "len(d['items'])"); [ "$NITEMS" = "2" ] && ok "2 items frozen" || bad "items: $NITEMS"
TOT=$(jget "$ORDER_JSON" "d['totalMinor']"); [ "$TOT" = "32555000" ] && ok "total 10×2840000+3×1385000" || bad "total: $TOT"
NAME1=$(jget "$ORDER_JSON" "d['items'][0]['name']"); echo "$NAME1" | grep -q "برنج هاشمی درجه یک" && ok "item name = listing title (frozen)" || bad "item name: $NAME1"
PACK1=$(jget "$ORDER_JSON" "d['items'][0]['pack']"); echo "$PACK1" | grep -q "کیسه" && ok "item pack frozen" || bad "pack: $PACK1"

# دفتر فروشنده: شمارندهٔ جدید
SELLIST=$(req GET "/orders?businessId=$SELLER_BIZ&side=sell" $SELLER_TOKEN "") && ok "seller list" || bad "seller list"
NC=$(jget "$SELLIST" "d['newCount']"); [ "$NC" = "1" ] && ok "seller newCount=1" || bad "newCount: $NC"

# اعلان فروشنده: ORDER با تیتر و مقصد
SELLER_USERID=$(jget "$SELLER_JSON" "d['user']['id']")
NOTIFS=$(req GET "/notifications/getNotifications" $SELLER_TOKEN "")
NT=$(echo "$NOTIFS" | python3 -c "import json,sys; ns=json.load(sys.stdin); o=[n for n in (ns if isinstance(ns,list) else ns.get('items',ns.get('notifications',[]))) if n.get('type')=='ORDER']; print(o[0]['title'] if o else 'NONE')" 2>/dev/null)
echo "$NT" | grep -q "سفارش جدید" && ok "seller ORDER notif (title)" || bad "notif title: $NT"
NURL=$(echo "$NOTIFS" | python3 -c "import json,sys; ns=json.load(sys.stdin); o=[n for n in (ns if isinstance(ns,list) else ns.get('items',ns.get('notifications',[]))) if n.get('type')=='ORDER']; print(o[0].get('url','NONE') if o else 'NONE')" 2>/dev/null)
echo "$NURL" | grep -q "sell/orders" && ok "notif url → /sell/orders/:id" || bad "notif url: $NURL"

# فالوی خودکار (FD-13 — مشتری‌شدن)
FOLLOWS=$(req GET "/market/getFollows?businessId=$BUYER_BIZ" $BUYER_TOKEN "")
echo "$FOLLOWS" | grep -q "پخش طلایی آزمون M5" && ok "auto-follow on first order (silent)" || bad "auto-follow: $(echo "$FOLLOWS" | head -c 200)"

echo "── 4. پذیرش با اصلاح اقلام + شمارهٔ سند ──"
ACC=$(req POST /orders/$OID/accept $SELLER_TOKEN "{\"businessId\":\"$SELLER_BIZ\",\"edits\":[{\"qty\":12},{\"unitPriceMinor\":1400000}],\"note\":\"ارسال فردا صبح، راننده آقای محمدی\"}") && ok "accept with edits" || bad "accept: $ACC"
DOCNO=$(jget "$ACC" "d['docNo']"); [ "$DOCNO" = "1" ] && ok "docNo=1 (sequence)" || bad "docNo: $DOCNO"
ACC2=$(jget "$(req GET "/orders/$OID?businessId=$BUYER_BIZ" $BUYER_TOKEN "")" "d['totalMinor']")
[ "$ACC2" = "38280000" ] && ok "recomputed total 12×2840000+3×1400000" || bad "edited total: $ACC2"
SN=$(jget "$(req GET "/orders/$OID?businessId=$BUYER_BIZ" $BUYER_TOKEN "")" "d['sellerNote']")
echo "$SN" | grep -q "محمدی" && ok "sellerNote saved" || bad "sellerNote: $SN"
H2=$(jget "$(req GET "/orders/$OID?businessId=$SELLER_BIZ" $SELLER_TOKEN "")" "len([h for h in d['history'] if h['st']=='ACCEPTED'])")
[ "$H2" = "1" ] && ok "history ACCEPTED entry" || bad "history: $H2"

echo "── 5. ارسال + مهلت ۷روزه + تحویل ──"
req POST /orders/$OID/send $SELLER_TOKEN "{\"businessId\":\"$SELLER_BIZ\"}" >/dev/null && ok "sent" || bad "send"
DL=$(jget "$(req GET "/orders/$OID?businessId=$BUYER_BIZ" $BUYER_TOKEN "")" "d['deliverDeadline']")
[ -n "$DL" ] && ok "deliverDeadline set" || bad "deliverDeadline"
DAYS=$(jget "$(req GET "/orders/$OID?businessId=$BUYER_BIZ" $BUYER_TOKEN "")" "d['daysLeft']")
[ "$DAYS" = "7" ] && ok "daysLeft=7" || bad "daysLeft: $DAYS"
# لغو بعد از ارسال ممنوع
CN=$(req POST /orders/$OID/cancel $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\"}")
echo "$CN" | grep -q "ALREADY_SENT" && ok "cancel-after-send blocked" || bad "cancel guard: $CN"

req POST /orders/$OID/deliver $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\"}" >/dev/null && ok "delivered (closed)" || bad "deliver"
STV=$(jget "$(req GET "/orders/$OID?businessId=$SELLER_BIZ" $SELLER_TOKEN "")" "d['status']")
[ "$STV" = "DELIVERED" ] && ok "status DELIVERED" || bad "status: $STV"

echo "── 6. بایگانی خریدار ──"
req POST /orders/$OID/archive $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\"}" >/dev/null && ok "archived" || bad "archive"
BUYLIST=$(req GET "/orders?businessId=$BUYER_BIZ&side=buy" $BUYER_TOKEN "")
BLN=$(jget "$BUYLIST" "len(d['orders'])"); [ "$BLN" = "0" ] && ok "archived hidden in default list" || bad "buy list: $BLN"
ARCLIST=$(req GET "/orders?businessId=$BUYER_BIZ&side=buy&archived=true" $BUYER_TOKEN "")
ALN=$(jget "$ARCLIST" "len(d['orders'])"); [ "$ALN" = "1" ] && ok "archived=true shows it" || bad "archived list: $ALN"

echo "── 7. لغو (NEW) و رد (NEW) ──"
O2=$(jget "$(req POST /orders $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"supplierId\":\"$SELLER_BIZ\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$L2\",\"qty\":2}]}")" "d['id']")
req POST /orders/$O2/cancel $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\"}" >/dev/null && ok "cancel in NEW works" || bad "cancel NEW"
O3=$(jget "$(req POST /orders $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"supplierId\":\"$SELLER_BIZ\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$L2\",\"qty\":2}]}")" "d['id']")
req POST /orders/$O3/reject $SELLER_TOKEN "{\"businessId\":\"$SELLER_BIZ\"}" >/dev/null && ok "reject in NEW works" || bad "reject NEW"
# خریدار نمی‌تواند پذیرش کند
ACC3=$(req POST /orders/$O3/accept $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\"}")
echo "$ACC3" | grep -q "SELLER_ONLY" && ok "buyer cannot accept" || bad "seller-only guard: $ACC3"

echo "── 8. بستنِ تنبل ۷روزه ──"
O4=$(jget "$(req POST /orders $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"supplierId\":\"$SELLER_BIZ\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$L2\",\"qty\":4}]}")" "d['id']")
req POST /orders/$O4/accept $SELLER_TOKEN "{\"businessId\":\"$SELLER_BIZ\"}" >/dev/null
req POST /orders/$O4/send $SELLER_TOKEN "{\"businessId\":\"$SELLER_BIZ\"}" >/dev/null
# شبیه‌سازی گذشت ۸ روز (patch مستقیم)
node -e "
const { MongoClient } = require('$BACK/node_modules/mongodb');
(async () => {
  const c = new MongoClient(process.env.M5_MONGO);
  await c.connect();
  await c.db().collection('Order').updateOne({ _id: require('$BACK/node_modules/mongodb').ObjectId.createFromHexString('$O4') }, { \$set: { deliverDeadline: new Date(Date.now() - 86400000) } });
  await c.close();
})().then(()=>console.log('patched')).catch(e=>{console.error(e.message);process.exit(1)});
" M5_MONGO="$MONGO" 2>/dev/null || true
M5_MONGO="$MONGO" node -e "
const { MongoClient } = require('$BACK/node_modules/mongodb');
(async () => {
  const c = new MongoClient(process.env.M5_MONGO);
  await c.connect();
  await c.db().collection('Order').updateOne({ _id: require('$BACK/node_modules/mongodb').ObjectId.createFromHexString('$O4') }, { \$set: { deliverDeadline: new Date(Date.now() - 86400000) } });
  await c.close();
})().then(()=>console.log('patched')).catch(e=>{console.error(e.message);process.exit(1)});
" && ok "deadline patched to yesterday" || bad "patch"
# خواندن دفتر ⇒ جاروی تنبل
LAZY=$(req GET "/orders?businessId=$BUYER_BIZ&side=buy" $BUYER_TOKEN "")
LST=$(jget "$LAZY" "[o['status'] for o in d['orders'] if o['id']=='$O4'][0]")
[ "$LST" = "DELIVERED" ] && ok "lazy-close on read → DELIVERED" || bad "lazy status: $LST"
LH=$(jget "$(req GET "/orders/$O4?businessId=$BUYER_BIZ" $BUYER_TOKEN "")" "[h['by'] for h in d['history']][-1]")
[ "$LH" = "system" ] && ok "system history entry" || bad "lazy history: $LH"

echo "── 9. پیشنهاد پذیرفته‌شده → سفارش (تصمیم ۲ FD-22) ──"
# استعلام ۲قلمی به فروشنده (خودش هر دو را دارد)
RFQ=$(req POST /market/requestQuote $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"items\":[{\"goodId\":\"$GOOD1\",\"qty\":10},{\"goodId\":\"$GOOD2\",\"qty\":5}],\"expiresDays\":3}") && ok "rfq sent" || bad "rfq: $RFQ"
INQ=$(jget "$(req GET "/market/getInquiries?businessId=$SELLER_BIZ" $SELLER_TOKEN "")" "[i['id'] for i in d['items']][0]")
# پیشنهاد کامل: هر دو قلم قیمت دارد
OFF1=$(req POST /market/sendOffer $SELLER_TOKEN "{\"inquiryId\":\"$INQ\",\"prices\":[2800000,1350000],\"pay\":{\"chk\":30,\"days\":45},\"dlv\":{\"ship\":true,\"by\":\"seller\"}}") && ok "offer sent" || bad "offer: $OFF1"
OFF1_ID=$(jget "$OFF1" "d['id']")
req POST /market/acceptOffer/$OFF1_ID $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\"}" >/dev/null && ok "offer accepted" || bad "acceptOffer"
# سفارش از پیشنهاد — هر دو قلم قیمت دارند
ORD5=$(req POST /orders $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"originType\":\"RFQ_OFFER\",\"offerId\":\"$OFF1_ID\"}") && ok "order from offer" || bad "order-from-offer: $ORD5"
O5=$(jget "$ORD5" "d['id']")
N5=$(jget "$ORD5" "len(d['items'])"); [ "$N5" = "2" ] && ok "both priced items included" || bad "offer items: $N5"
T5=$(jget "$ORD5" "d['totalMinor']"); [ "$T5" = "34750000" ] && ok "offer total 10×2800000+5×1350000" || bad "offer total: $T5"
NOTE5=$(jget "$ORD5" "d['note']"); echo "$NOTE5" | grep -q "شرایط" && ok "note = translated offer terms" || bad "note: $NOTE5"
PAY5=$(jget "$ORD5" "d['pay']['chk']"); [ "$PAY5" = "30" ] && ok "pay snapshot {chk:30}" || bad "pay: $PAY5"
# تکرار ⇒ 409
DUP=$(curl -s -X POST $BASE/orders -H "content-type: application/json" -H "authorization: Bearer $BUYER_TOKEN" -d "{\"businessId\":\"$BUYER_BIZ\",\"originType\":\"RFQ_OFFER\",\"offerId\":\"$OFF1_ID\"}")
echo "$DUP" | grep -q "ORDER_EXISTS" && ok "duplicate order → 409 ORDER_EXISTS" || bad "dup guard: $DUP"

# پیشنهاد ناقص: قلم دوم بی‌قیمت ⇒ سفارش تک‌قلمی — استعلام تازه
RFQ2=$(req POST /market/requestQuote $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"items\":[{\"goodId\":\"$GOOD1\",\"qty\":6},{\"goodId\":\"$GOOD2\",\"qty\":2}],\"expiresDays\":2}")
INQ2=$(jget "$(req GET "/market/getInquiries?businessId=$SELLER_BIZ" $SELLER_TOKEN "")" "[i['id'] for i in d['items']][0]")
OFF2=$(req POST /market/sendOffer $SELLER_TOKEN "{\"inquiryId\":\"$INQ2\",\"prices\":[2900000,null]}")
OFF2_ID=$(jget "$OFF2" "d['id']")
req POST /market/acceptOffer/$OFF2_ID $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\"}" >/dev/null
ORD6=$(req POST /orders $BUYER_TOKEN "{\"businessId\":\"$BUYER_BIZ\",\"originType\":\"RFQ_OFFER\",\"offerId\":\"$OFF2_ID\"}")
N6=$(jget "$ORD6" "len(d['items'])"); [ "$N6" = "1" ] && ok "incomplete offer → 1 item only (no-price skipped)" || bad "incomplete items: $N6"

echo "── 10. مستندات فاکتور: فیلدهای کسب‌وکار ──"
D=$(req GET "/orders/$OID?businessId=$SELLER_BIZ" $SELLER_TOKEN "")
TAX=$(jget "$D" "d['seller']['invoiceTaxId']"); [ "$TAX" = "12345678901" ] && ok "seller invoiceTaxId in DTO" || bad "taxId: $TAX"
INVN=$(jget "$D" "d['seller']['invoiceNote']"); echo "$INVN" | grep -q "برگشت" && ok "seller invoiceNote in DTO" || bad "invoiceNote: $INVN"
DNO=$(jget "$D" "d['docNo']"); [ "$DNO" = "1" ] && ok "docNo on order DTO" || bad "docNo DTO: $DNO"

echo ""
echo "════ M5 e2e: $PASS passed / $FAIL failed ════"
pkill -f "node dist/main" 2>/dev/null
exit $([ "$FAIL" = "0" ] && echo 0 || echo 1)
