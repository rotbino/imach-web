#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M6 e2e (API): شبکهٔ خصوصی و دید عمومی — روی Atlas
# لیست خرید عمومی + پیشنهاد تامین (گارد ۷روزه/قلم→کاتالوک/پذیرش=دو فالو)
# + گیت قیمت سرورمبنا + فیکس نشت BUY + دفتر مشتری (تایید/یادداشت/جزئیات)
# Usage: bash qa-app/m6-e2e.sh  (from imach-web; backend at ../imach-back)
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
DATABASE_URL="$MONGO" setsid nohup node dist/main.js > /tmp/imach-back-m6.log 2>&1 < /dev/null &
for i in $(seq 1 60); do curl -sf $BASE/getHealth >/dev/null 2>&1 && break; sleep 1; done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }

echo "── 2. seed: buyer B + sellers A/C + arm-off D ──"
STAMP=$(date +%s | tail -c 5)
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+$1) % 1000000000 )))"; }
B_NAT=$(mkphone 2); A_NAT=$(mkphone 3); C_NAT=$(mkphone 4); D_NAT=$(mkphone 5)

BJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$B_NAT\",\"country\":\"IR\"}") && ok "buyer B" || { bad "buyer B"; exit 1; }
BT=$(jget "$BJ" "d['accessToken']"); BB=$(jget "$BJ" "d['businesses'][0]['id']"); BS=$(jget "$BJ" "d['businesses'][0]['slug']")
AJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$A_NAT\",\"country\":\"IR\"}") && ok "seller A (gated catalog)" || bad "seller A"
AT=$(jget "$AJ" "d['accessToken']"); AB=$(jget "$AJ" "d['businesses'][0]['id']"); AS=$(jget "$AJ" "d['businesses'][0]['slug']")
CJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$C_NAT\",\"country\":\"IR\"}") && ok "seller C (proposer)" || bad "seller C"
CT=$(jget "$CJ" "d['accessToken']"); CB=$(jget "$CJ" "d['businesses'][0]['id']"); CS=$(jget "$CJ" "d['businesses'][0]['slug']")
DJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$D_NAT\",\"country\":\"IR\"}") && ok "seller D (buy arm off)" || bad "seller D"
DT=$(jget "$DJ" "d['accessToken']"); DB=$(jget "$DJ" "d['businesses'][0]['id']"); DS=$(jget "$DJ" "d['businesses'][0]['slug']")

req PATCH /businesses/editBusiness/$BB $BT '{"name":"سوپرمارکت آزمون M6","city":"رشت","trade":"سوپرمارکت"}' >/dev/null
req PATCH /businesses/editBusiness/$AB $AT '{"name":"پخش گیت‌دار M6","city":"رشت","trade":"عمده‌فروشی"}' >/dev/null
req PATCH /businesses/editBusiness/$CB $CT '{"name":"توزیع آفتاب M6","city":"رشت","trade":"پخش مواد غذایی"}' >/dev/null
req PUT /businesses/supplyTerms/$BB $BT '{"supplyTerms":"فقط صبح‌ها تحویل · نقدی"}' >/dev/null
ok "businesses named + buyer supplyTerms"

G1=$(jget "$(req POST /goods/createGood $BT "{\"name\":\"برنج آزمون M6-$STAMP\",\"unit\":\"KILOGRAM\"}")" "d['id']") && ok "good1" || bad "good1"
G2=$(jget "$(req POST /goods/createGood $BT "{\"name\":\"روغن آزمون M6-$STAMP\",\"unit\":\"LITER\"}")" "d['id']") && ok "good2" || bad "good2"
G5=$(jget "$(req POST /goods/createGood $AT "{\"name\":\"شکر آزمون M6-$STAMP\",\"unit\":\"KILOGRAM\"}")" "d['id']") && ok "good5 (leak test)" || bad "good5"

# لیست خرید B: BUY listing روی good1/good2 + استعلام باز روی همان‌ها
req PUT /listings/saveListing $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G1\",\"mode\":\"BUY\",\"buy\":{\"volume\":500,\"frequency\":\"WEEKLY\"}}" >/dev/null && ok "B buy-listing good1" || bad "B buy-listing g1"
req PUT /listings/saveListing $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G2\",\"mode\":\"BUY\",\"buy\":{\"volume\":200,\"frequency\":\"MONTHLY\"}}" >/dev/null && ok "B buy-listing good2" || bad "B buy-listing g2"

# کاتالوگ A: good1 قیمت‌دار + BUY listing روی good5 (برای تست نشت) + گیت صنف «قنادی»
LA1=$(jget "$(req PUT /listings/saveListing $AT "{\"businessId\":\"$AB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":28400000,\"stock\":1000,\"minOrder\":5}}")" "d['id']") && ok "A sell listing good1" || bad "A listing g1"
req PUT /listings/saveListing $AT "{\"businessId\":\"$AB\",\"goodId\":\"$G5\",\"mode\":\"BUY\",\"buy\":{\"volume\":100,\"frequency\":\"OCCASIONAL\"}}" >/dev/null && ok "A BUY listing good5 (leak probe)" || bad "A buy listing"
req PUT /businesses/catalogSettings/$AB $AT '{"priceVisibilityTrades":["قنادی"]}' >/dev/null && ok "A price gate = قنادی only" || bad "gate set"

# کاتالوگ C: good1 قیمت‌دار (برای مچ پیشنهاد)
LC1=$(jget "$(req PUT /listings/saveListing $CT "{\"businessId\":\"$CB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":27900000,\"stock\":800,\"minOrder\":1}}")" "d['id']") && ok "C sell listing good1" || bad "C listing g1"
# استعلام بعد از ساخت آگهی‌های فروش A/C — گیرندگان = اجتماع دارندگان قلم‌ها
RQ=$(req POST /market/requestQuote $BT "{\"businessId\":\"$BB\",\"items\":[{\"goodId\":\"$G1\",\"qty\":500},{\"goodId\":\"$G2\",\"qty\":200}],\"expiresDays\":3}") && ok "B multi-item RFQ (inquiring)" || bad "rfq: $RQ"
RQC=$(jget "$RQ" "d.get('created', 0)"); [ "$RQC" = "2" ] && ok "rfq → 2 inquiries (A+C)" || bad "rfq created: $RQC"

# D: بازوی خرید خاموش
req PUT /businesses/setArms/$DB $DT '{"sell":true,"buy":false}' >/dev/null && ok "D buy arm off" || bad "D arms"

echo "── 3. نمای عمومی لیست خرید (۳۲) ──"
BL=$(req GET /businesses/getBuyList/$BS "" "") && ok "guest getBuyList" || { bad "guest getBuyList: $BL"; exit 1; }
BLG=$(echo "$BL" | python3 -c "import json,sys; d=json.load(sys.stdin); print('guest' if d.get('viewer') is None else 'viewer-set')")
[ "$BLG" = "guest" ] && ok "guest viewer=null" || bad "guest viewer: $BLG"
NG=$(jget "$BL" "len(d['needed'])"); [ "$NG" = "2" ] && ok "needed = 2 goods" || bad "needed: $NG"
INQ=$(jget "$BL" "len(d['inquiring'])"); [ "$INQ" = "1" ] && ok "inquiring = 1 group (multi-item)" || bad "inquiring: $INQ"
INT=$(jget "$BL" "d['inquiring'][0]['title']"); echo "$INT" | grep -q "برنج" && echo "$INT" | grep -q "قلم" && ok "inquiring title «برنج +۱ قلم»" || bad "inq title: $INT"
STERMS=$(jget "$BL" "d['supplyTerms']"); echo "$STERMS" | grep -q "صبح" && ok "supplyTerms visible" || bad "terms: $STERMS"
NOBUY=$(echo "$BL" | python3 -c "import json,sys; d=json.load(sys.stdin); print('ok' if all(n['goodId'] != '$G5' for n in d['needed']) else 'leak')")
[ "$NOBUY" = "ok" ] && ok "D-list separation (B's needed only)" || bad "needed leak"

# بینندهٔ C: تطبیق goodId + پیشنهاد باز null
BLC=$(req GET /businesses/getBuyList/$BS $CT "") && ok "C views buy list" || bad "C getBuyList"
CM=$(jget "$BLC" "len(d['viewer']['matched'])"); [ "$CM" = "1" ] && ok "C matched good1 (goodId)" || bad "C matched: $CM"
CMP=$(jget "$BLC" "d['viewer']['matched'][0]['priceMinor']"); [ "$CMP" = "27900000" ] && ok "matched price prefill" || bad "matched price: $CMP"
CPR=$(jget "$BLC" "d['viewer']['canPropose']"); [ "$CPR" = "True" ] && ok "C canPropose" || bad "canPropose: $CPR"
COP=$(jget "$BLC" "d['viewer']['myOpenProposal']"); [ "$COP" = "None" ] && ok "no open proposal yet" || bad "open: $COP"

# بازوی خرید خاموش → ۴۰۴
D404=$(curl -s -o /dev/null -w '%{http_code}' $BASE/businesses/getBuyList/$DS)
[ "$D404" = "404" ] && ok "buy-arm-off → 404" || bad "arm-off: $D404"

echo "── 4. پیشنهاد تامین (۳۲→۲۰) ──"
SP=$(req POST /supply-proposals $CT "{\"businessId\":\"$CB\",\"buyerSlug\":\"$BS\",\"items\":[{\"goodId\":\"$G1\",\"priceMinor\":27900000,\"minOrder\":4},{\"goodId\":\"$G2\",\"priceMinor\":31200000,\"minOrder\":6}],\"note\":\"برنج امسالم — تحویل همان روز\"}") && ok "C 2-item proposal" || { bad "proposal: $SP"; exit 1; }
SPI=$(jget "$SP" "d['itemCount']"); [ "$SPI" = "2" ] && ok "itemCount=2" || bad "items: $SPI"
SPC=$(jget "$SP" "d['catalogAdded']"); [ "$SPC" = "1" ] && ok "good2 → C catalog (commitment FD-23)" || bad "catalogAdded: $SPC"
SPID=$(jget "$SP" "d['id']")
SPLID=$(jget "$SP" "d['items'][1]['listingId']"); [ -n "$SPLID" ] && ok "new listing linked in snapshot" || bad "snapshot listingId"

# گارد ۷روزه
DUP=$(curl -s -X POST $BASE/supply-proposals -H "content-type: application/json" -H "authorization: Bearer $CT" -d "{\"businessId\":\"$CB\",\"buyerSlug\":\"$BS\",\"items\":[]}")
echo "$DUP" | grep -q "SUPPLY_PROPOSAL_EXISTS" && ok "7-day guard (409 dup)" || bad "guard: $DUP"

# قلم ناقص → رد
BADIT=$(curl -s -X POST $BASE/supply-proposals -H "content-type: application/json" -H "authorization: Bearer $AT" -d "{\"businessId\":\"$AB\",\"buyerSlug\":\"$BS\",\"items\":[{\"goodId\":\"$G1\",\"minOrder\":5}]}")
BADITK=$(echo "$BADIT" | grep -oE 'PRICED_ITEM_INCOMPLETE|VALIDATION_ERROR' | head -1)
[ -n "$BADITK" ] && ok "incomplete item rejected ($BADITK)" || bad "incomplete: no rejection"

# پیشنهاد لخت از A (فقط درخواست تامین‌کنندگی)
BARE=$(req POST /supply-proposals $AT "{\"businessId\":\"$AB\",\"buyerSlug\":\"$BS\",\"items\":[]}") && ok "A bare proposal" || bad "bare: $BARE"
BAREID=$(jget "$BARE" "d['id']")
BAREI=$(jget "$BARE" "d['itemCount']"); [ "$BAREI" = "0" ] && ok "bare itemCount=0" || bad "bare items: $BAREI"

# اعلان خریدار: رخداد-محور
BN=$(req GET /notifications/getNotifications $BT "")
BNT=$(echo "$BN" | python3 -c "import json,sys; ns=json.load(sys.stdin); ns=ns if isinstance(ns,list) else ns.get('items',ns.get('notifications',[])); sp=[n.get('title','') for n in ns if n.get('type')=='SUPPLY_PROPOSAL']; print(' | '.join(sp))" 2>/dev/null)
echo "$BNT" | grep -q "پیشنهاد تامین جدید از" && ok "B notif (event title)" || bad "B notif: $BNT"

echo "── 5. پذیرش = دو رابطهٔ Follow ──"
MY=$(req GET "/supply-proposals?businessId=$BB" $BT "") && ok "B my proposals" || bad "my proposals"
MYN=$(jget "$MY" "len(d['rows'])"); [ "$MYN" = "2" ] && ok "2 open proposals" || bad "rows: $MYN"

ACC=$(req POST /supply-proposals/$SPID/accept $BT "{}") && ok "B accepts C proposal" || bad "accept: $ACC"
# فالوی ۱: B → C (کاتالوک ذخیره)
FOL=$(req GET "/market/getFollows?businessId=$BB" $BT "")
HAS_C=$(echo "$FOL" | python3 -c "import json,sys; d=json.load(sys.stdin); fs=d if isinstance(d,list) else d.get('rows',[]); print('yes' if any(f.get('supplierId')=='$CB' for f in fs) else 'no')" 2>/dev/null)
[ "$HAS_C" = "yes" ] && ok "follow(1): B saved C catalog" || bad "follow B→C"
# فالوی ۲: C → B (دیده‌بانی نیازها) → C باید B را در دفتر مشتریان ببیند
FLW=$(req GET "/market/getFollowers?businessId=$CB" $CT "")
FLWN=$(jget "$FLW" "len(d['rows'])"); [ "$FLWN" = "1" ] && ok "follow(2): B is C's customer" || bad "C followers: $FLWN"
ISNEW=$(jget "$FLW" "d['rows'][0]['isNew']"); [ "$ISNEW" = "True" ] && ok "B isNew (pending ack FD-44)" || bad "isNew: $ISNEW"

# اعلان فروشنده C: تایید
CN=$(req GET /notifications/getNotifications $CT "")
CNT=$(echo "$CN" | python3 -c "import json,sys; ns=json.load(sys.stdin); ns=ns if isinstance(ns,list) else ns.get('items',ns.get('notifications',[])); sp=[n for n in ns if n.get('type')=='SUPPLY_PROPOSAL']; print(sp[0]['title'] if sp else 'NONE')" 2>/dev/null)
echo "$CNT" | grep -q "تایید شد" && ok "C notif (accepted)" || bad "C notif: $CNT"

# پذیرش دوباره → خطا
REACC=$(curl -s -X POST $BASE/supply-proposals/$SPID/accept -H "content-type: application/json" -H "authorization: Bearer $BT" -d '{}')
echo "$REACC" | grep -q "PROPOSAL_CLOSED" && ok "re-accept rejected" || bad "re-accept: $REACC"

# رد پیشنهاد لخت A
DIS=$(req POST /supply-proposals/$BAREID/dismiss $BT "{}") && ok "B dismisses A bare proposal" || bad "dismiss: $DIS"
MY2=$(req GET "/supply-proposals?businessId=$BB" $BT "")
MY2N=$(jget "$MY2" "len(d['rows'])"); [ "$MY2N" = "0" ] && ok "dismissed → list empty" || bad "after dismiss: $MY2N"

echo "── 6. دفتر مشتری (۰۸/۰۸ب) ──"
ACK=$(req POST /market/ackFollower $CT "{\"businessId\":\"$CB\",\"buyerId\":\"$BB\"}") && ok "C acks B (new customer)" || bad "ack: $ACK"
FLW2=$(req GET "/market/getFollowers?businessId=$CB" $CT "")
ISNEW2=$(jget "$FLW2" "d['rows'][0]['isNew']"); [ "$ISNEW2" = "False" ] && ok "B no longer isNew" || bad "after ack: $ISNEW2"
NOTED=$(req POST /market/setFollowerNote $CT "{\"businessId\":\"$CB\",\"buyerId\":\"$BB\",\"note\":\"تحویل صبح زود — بازار روز\"}") && ok "note saved" || bad "note: $NOTED"

# سفارش B از C → آمار مشتری زنده می‌شود
ORD=$(req POST /orders $BT "{\"businessId\":\"$BB\",\"supplierId\":\"$CB\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$LC1\",\"qty\":6}]}") && ok "B orders from C" || bad "order: $ORD"
CUS=$(req GET "/market/getCustomer?businessId=$CB&buyerId=$BB" $CT "") && ok "C getCustomer" || bad "getCustomer"
CN0=$(jget "$CUS" "d['customer']['name']"); echo "$CN0" | grep -q "M6" && ok "customer identity" || bad "name: $CN0"
CNO=$(jget "$CUS" "len(d['orders'])"); [ "$CNO" = "1" ] && ok "customer orders=1 (live)" || bad "orders: $CNO"
CNI=$(jget "$CUS" "len(d['inquiries'])"); [ "$CNI" = "1" ] && ok "customer inquiries=1 (RFQ)" || bad "inquiries: $CNI"
CNN=$(jget "$CUS" "d['customer']['note']"); echo "$CNN" | grep -q "صبح" && ok "note in details" || bad "note: $CNN"

echo "── 7. گیت قیمت سرورمبنا (۳۱) ──"
# مهمان: قیمت حذف شده
GAB=$(req GET /businesses/getBusiness/$AS "" "")
GG=$(jget "$GAB" "d.get('priceGated')")
[ "$GG" = "True" ] && ok "guest: priceGated=true" || bad "guest gate: $GG"
GPL=$(jget "$GAB" "d['listings'][0]['priceMinor']"); [ "$GPL" = "None" ] && ok "guest: price stripped" || bad "guest price: $GPL"
GLAT=$(echo "$GAB" | python3 -c "import json,sys; d=json.load(sys.stdin); print('stripped' if 'lat' not in d else 'leak')")
[ "$GLAT" = "stripped" ] && ok "guest: lat/lng stripped (privacy)" || bad "guest lat"

# عضو بدون رابطه (C): هنوز گیت
CAB=$(req GET /businesses/getBusiness/$AS $CT "")
CG=$(jget "$CAB" "d['priceGated']"); [ "$CG" = "True" ] && ok "member C: still gated (trade mismatch)" || bad "member gate: $CG"

# B با followSupplier مشتری می‌شود → قیمت باز
req POST /market/followSupplier $BT "{\"businessId\":\"$BB\",\"supplierId\":\"$AB\",\"source\":\"SHARED\"}" >/dev/null
BAB=$(req GET /businesses/getBusiness/$AS $BT "")
BG=$(jget "$BAB" "d['priceGated']"); [ "$BG" = "False" ] && ok "customer B: prices open" || bad "customer gate: $BG"
BPL=$(jget "$BAB" "d['listings'][0]['priceMinor']"); [ "$BPL" = "28400000" ] && ok "customer sees real price" || bad "B price: $BPL"
BVK=$(jget "$BAB" "d['viewer']['isCustomer']"); [ "$BVK" = "True" ] && ok "viewer.isCustomer" || bad "viewer: $BVK"

# مالک: همه‌چیز
AAB=$(req GET /businesses/getBusiness/$AS $AT "")
AG=$(jget "$AAB" "d['priceGated']"); [ "$AG" = "False" ] && ok "owner: not gated" || bad "owner gate: $AG"
ALAT=$(echo "$AAB" | python3 -c "import json,sys; d=json.load(sys.stdin); print('present' if 'lat' in d else 'missing')")
[ "$ALAT" = "present" ] && ok "owner: lat/lng kept (edit)" || bad "owner lat"

# فیکس نشت BUY: آگهی خرید A روی شکر نباید در کاتالوک باشد
BUYMODE=$(echo "$AAB" | python3 -c "import json,sys; d=json.load(sys.stdin); print('leak' if any(l.get('mode')=='BUY' for l in d['listings']) else 'clean')")
[ "$BUYMODE" = "clean" ] && ok "BUY rows no longer leak into catalog" || bad "BUY leak"

# با devtools دورزدمی؟ توکن خراب = مهمان — قیمت نمی‌بیند
BADTOK=$(curl -s $BASE/businesses/getBusiness/$AS -H "authorization: Bearer expired-junk-token" | python3 -c "import json,sys; print(json.load(sys.stdin).get('priceGated'))")
[ "$BADTOK" = "True" ] && ok "bad token → guest (no bypass)" || bad "bad token: $BADTOK"

echo "── 8. زمینهٔ بینندهٔ کاتالوک (getBusinessContext) ──"
CTX=$(req GET /businesses/getBusinessContext/$AS $BT "") && ok "B context" || bad "context"
CTXI=$(jget "$CTX" "d['isCustomer']"); [ "$CTXI" = "True" ] && ok "context customer" || bad "ctx customer"
CTXN=$(jget "$CTX" "len(d['inYourBuyList'])"); [ "$CTXN" = "1" ] && ok "inYourBuyList good1 (FD-23)" || bad "inYour: $CTXN"
CTXG=$(jget "$CTX" "d['goodId'] if False else (d['inYourBuyList'][0]['goodId'] if d['inYourBuyList'] else '')")
[ "$CTXG" = "$G1" ] && ok "matched good = good1" || bad "ctx good: $CTXG"
CTXP=$(jget "$CTX" "len(d['prices'])"); [ "$CTXP" = "1" ] && ok "context prices served" || bad "ctx prices: $CTXP"

echo "── 9. پیشنهاد به بازوی خاموش (D) ──"
ARMOFF=$(curl -s -X POST $BASE/supply-proposals -H "content-type: application/json" -H "authorization: Bearer $CT" -d "{\"businessId\":\"$CB\",\"buyerSlug\":\"$DS\",\"items\":[]}")
echo "$ARMOFF" | grep -q "ARM_DISABLED" && ok "proposal to buy-off buyer → ARM_DISABLED" || bad "arm-off: $ARMOFF"

echo "════════════════════════════════════"
echo "PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "SOME FAILED ❌"
