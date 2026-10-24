#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M10 e2e (API): محتوای اجتماعی و SEO عمومی — روی Atlas
# سناریوی DoD کامل (سند ۰۸ §M10):
#   + نظر خریدار → میانگین زنده (upsert یک-نظر) → پاسخ فروشنده →
#     اعلان REVIEW (فروشنده) و REVIEW_REPLY (خریدار) + ratingAvg در getBusiness
#   + تستايمونی مهمان → صف ادمین → تأیید → در لیست عمومی (P-2)
#   + بازخورد/پرسش‌وپاسخ: ثبت + لایک toggle + پاسخ کاربر + پاسخ تیم (ADMIN)
#   + فیلم‌های آموزشی هر دو بازو (seed)
#   + گوش-به-زنگ: زنگوله روشن → RFQ جدید → اعلان BUYER_NEED (بدون دوبل با
#     QUOTE گیرندهٔ مستقیم) → تب watched-buyer-needs → خاموش‌کردن
#   + تاریخچهٔ رویداد کالا: WATCH_ADD (watchGood) · INQUIRY (requestQuote) ·
#     فیلتر روز + گیت مالکیت
# Usage: bash qa-app/m10-e2e.sh  (from imach-web; backend at ../imach-back)
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

req() { # method path token json → body (بدون body یعنی بدون content-type — درس Fastify: هدر JSON با بدنهٔ خالی = 400)
  if [ -n "${4:-}" ]; then
    curl -s -m 30 -X $1 $BASE$2 -H "content-type: application/json" \
      -H "authorization: Bearer $3" -d "$4" 2>/dev/null
  else
    curl -s -m 30 -X $1 $BASE$2 -H "authorization: Bearer $3" 2>/dev/null
  fi
}
rcode() { # method path token json → http code
  if [ -n "${4:-}" ]; then
    curl -s -m 30 -o /dev/null -w "%{http_code}" -X $1 $BASE$2 -H "content-type: application/json" \
      -H "authorization: Bearer $3" -d "$4" 2>/dev/null
  else
    curl -s -m 30 -o /dev/null -w "%{http_code}" -X $1 $BASE$2 -H "authorization: Bearer $3" 2>/dev/null
  fi
}
jget() { echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); print($2)" 2>/dev/null; }

echo "── 1. boot backend ──"
cd $BACK
pkill -f "node dist/main" 2>/dev/null; sleep 1
DATABASE_URL="$MONGO" STORAGE_DRIVER=local UPLOAD_PATH="$BACK/uploads" node dist/main.js > /tmp/imach-back-m10.log 2>&1 &
BACK_PID=$!
for i in $(seq 1 60); do curl -sf $BASE/getHealth >/dev/null 2>&1 && break; sleep 1; done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }

echo "── 2. seed actors: S (فروشنده) · B (خریدار) · S2 (فروشندهٔ دوم/زنگوله) ──"
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+$1) % 1000000000 )))"; }
STAMP=$(date +%s | tail -c 5)
S_NAT=$(mkphone 71); B_NAT=$(mkphone 72); S2_NAT=$(mkphone 73); T_NAT=$(mkphone 74)
SJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$S_NAT\",\"country\":\"IR\"}")
ST=$(jget "$SJ" "d['accessToken']"); SB=$(jget "$SJ" "d['businesses'][0]['id']"); SSLUG=$(jget "$SJ" "d['businesses'][0]['slug']")
BJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$B_NAT\",\"country\":\"IR\"}")
BT=$(jget "$BJ" "d['accessToken']"); BB=$(jget "$BJ" "d['businesses'][0]['id']")
S2J=$(req POST /auth/quickRegister "" "{\"phone\":\"$S2_NAT\",\"country\":\"IR\"}")
S2T=$(jget "$S2J" "d['accessToken']"); S2B=$(jget "$S2J" "d['businesses'][0]['id']")
[ -n "$ST" ] && [ -n "$BT" ] && [ -n "$S2T" ] && ok "3 accounts" || { bad "accounts"; exit 1; }

req PATCH /businesses/editBusiness/$SB $ST "{\"name\":\"پخش مهر آزمون M10\",\"city\":\"رشت\",\"trade\":\"عمده‌فروشی\"}" >/dev/null
req PATCH /businesses/editBusiness/$BB $BT "{\"name\":\"سوپرمارکت آزمون M10\",\"city\":\"رشت\",\"trade\":\"سوپرمارکت\"}" >/dev/null
req PATCH /businesses/editBusiness/$S2B $S2T "{\"name\":\"بازار شمال آزمون M10\",\"city\":\"تهران\",\"trade\":\"بازار\"}" >/dev/null

G1=$(req POST /goods/createGood $BT "{\"name\":\"گندم آزمون M10 $STAMP\",\"unit\":\"KILOGRAM\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
[ -n "$G1" ] && ok "fresh good" || { bad "good seed"; exit 1; }
req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":3400000,\"stock\":900,\"minOrder\":1}}" >/dev/null
req PUT /listings/saveListing $S2T "{\"businessId\":\"$S2B\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":3450000,\"stock\":500,\"minOrder\":1}}" >/dev/null
# خریدار کالا را دنبال می‌کند (زنجیرهٔ WATCH_ADD در تاریخچهٔ کالا + فالوی خودکار S)
req POST /market/watchGood $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G1\",\"supplierId\":\"$SB\"}" >/dev/null
ok "catalogs + buyer watch (WATCH_ADD chain)"
SLIST=$(req GET "/listings/getMyListings?businessId=$SB" $ST "" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows = d if isinstance(d, list) else d.get('items', d)
print([r['id'] for r in rows if r.get('good',{}).get('id')=='$G1'][0])" 2>/dev/null)
[ -n "$SLIST" ] && ok "S listing of G1 ($SLIST)" || bad "S listing resolve"

echo "── 3. نظرات کاتالوگ: ثبت → میانگین زنده → upsert → پاسخ ──"
R1=$(req POST /reviews $BT "{\"businessId\":\"$SB\",\"rating\":4,\"text\":\"قیمت‌ها به‌روز و سفارش بدون زنگ‌زدن انجام شد.\"}")
R1ID=$(jget "$R1" "d['id']")
[ -n "$R1ID" ] && ok "review created" || bad "review create"
RV=$(req GET "/reviews?businessId=$SB" $BT "")
AVG1=$(jget "$RV" "d['avg']"); CNT1=$(jget "$RV" "d['count']")
[ "$AVG1" = "4" ] || [ "$AVG1" = "4.0" ] && [ "$CNT1" = "1" ] && ok "avg=4 count=1 live" || bad "avg/count after first (avg=$AVG1 cnt=$CNT1)"

# upsert — نظر دوم همان خریدار = به‌روزرسانی نه ردیف تازه
R2=$(req POST /reviews $BT "{\"businessId\":\"$SB\",\"rating\":5,\"text\":\"و پاسخ سریع هم گرفتیم.\"}")
RV=$(req GET "/reviews?businessId=$SB" $BT "")
AVG2=$(jget "$RV" "d['avg']"); CNT2=$(jget "$RV" "d['count']")
MYRT=$(jget "$RV" "d['mine']['rating']")
[ "$CNT2" = "1" ] && [ "$MYRT" = "5" ] && ok "upsert: count stays 1, mine=5" || bad "upsert (cnt=$CNT2 mine=$MYRT)"

# گارد: فروشنده به کاتالوک خودش نمی‌تواند نظر بدهد
OWNC=$(rcode POST /reviews $ST "{\"businessId\":\"$SB\",\"rating\":5}")
[ "$OWNC" = "400" ] && ok "own-catalog review blocked (400)" || bad "own-catalog guard ($OWNC)"

# پاسخ فروشنده
RP=$(req POST /reviews/$R1ID/reply $ST "{\"reply\":\"ممنون از شما؛ پلهٔ حجمی جدید هم فعال شد.\"}")
RPTX=$(jget "$RP" "d['reply']")
[ -n "$RPTX" ] && ok "seller reply saved" || bad "seller reply"
RV=$(req GET "/reviews?businessId=$SB" $BT "")
REPLY_IN_LIST=$(jget "$RV" "d['items'][0]['reply']")
[ -n "$REPLY_IN_LIST" ] && ok "reply visible in list" || bad "reply in list"

# ratingAvg در ویترین عمومی (getBusiness)
GB=$(req GET "/businesses/getBusiness/$SSLUG" "" "")
GAVG=$(jget "$GB" "d.get('ratingAvg')"); GCNT=$(jget "$GB" "d.get('ratingCount')")
[ "$GAVG" = "5" ] || [ "$GAVG" = "5.0" ] && [ "$GCNT" = "1" ] && ok "getBusiness ratingAvg=5/count=1" || bad "getBusiness rating (avg=$GAVG cnt=$GCNT)"

echo "── 4. اعلان‌های REVIEW / REVIEW_REPLY ──"
SNOTIF=$(req GET "/notifications/getNotifications?limit=50" $ST "")
BNOTIF=$(req GET "/notifications/getNotifications?limit=50" $BT "")
S_REV=$(echo "$SNOTIF" | python3 -c "
import json,sys; d=json.load(sys.stdin)
rows = d if isinstance(d, list) else d.get('items', [])
print(1 if any(n.get('type')=='REVIEW' for n in rows) else 0)" 2>/dev/null)
B_RRP=$(echo "$BNOTIF" | python3 -c "
import json,sys; d=json.load(sys.stdin)
rows = d if isinstance(d, list) else d.get('items', [])
print(1 if any(n.get('type')=='REVIEW_REPLY' for n in rows) else 0)" 2>/dev/null)
[ "$S_REV" = "1" ] && ok "seller got REVIEW notif" || bad "seller REVIEW notif"
[ "$B_RRP" = "1" ] && ok "buyer got REVIEW_REPLY notif" || bad "buyer REVIEW_REPLY notif"

echo "── 5. تستايمونی: مهمان → صف ادمین → تأیید → لیست عمومی ──"
TS1=$(req POST /feedback/testimonials "" "{\"name\":\"مهمان آزمون M10\",\"business\":\"بازرگانی آزمون\",\"text\":\"تجربهٔ خوبی بود — صف ادمین را تست می‌کند.\",\"isBuyer\":true}")
TS1ID=$(jget "$TS1" "d['id']")
[ -n "$TS1ID" ] && ok "guest testimonial submitted (no auth)" || bad "guest submit"
PUB1=$(req GET /feedback/testimonials "" "")
HAS1=$(echo "$PUB1" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(1 if any(t['id']=='$TS1ID' for t in d) else 0)" 2>/dev/null)
[ "$HAS1" = "0" ] && ok "pending testimonial hidden from public" || bad "pending leaked!"

# ادمین موقت: ارتقا در دیتابیس + توکن با نقش ADMIN
TJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$T_NAT\",\"country\":\"IR\"}")
TUSER=$(jget "$TJ" "d['user']['id']")
ADMIN_TOKEN=$(node $BACK/scripts/mint-temp-admin.mjs "$TUSER" 2>/dev/null)
[ -n "$ADMIN_TOKEN" ] && ok "temp admin token minted" || bad "admin token"

QUEUE=$(req GET "/feedback/testimonials/queue" $ADMIN_TOKEN "")
INQ=$(echo "$QUEUE" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(1 if any(t['id']=='$TS1ID' and t.get('approved')==False for t in d) else 0)" 2>/dev/null)
[ "$INQ" = "1" ] && ok "admin queue shows pending (approved=false)" || bad "admin queue"

AP=$(req POST /feedback/testimonials/$TS1ID/approve $ADMIN_TOKEN "")
APD=$(jget "$AP" "d['approved']")
[ "$APD" = "True" ] || [ "$APD" = "true" ] && ok "approved by admin" || bad "approve"
PUB2=$(req GET /feedback/testimonials "" "")
HAS2=$(echo "$PUB2" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(1 if any(t['id']=='$TS1ID' for t in d) else 0)" 2>/dev/null)
[ "$HAS2" = "1" ] && ok "approved testimonial now public" || bad "public after approve"

# reject: ثبت → رد → حذف از دیتابیس
TS2=$(req POST /feedback/testimonials "" "{\"name\":\"رد آزمون\",\"business\":\"ر/delete\",\"text\":\"این رد می‌شود\"}")
TS2ID=$(jget "$TS2" "d['id']")
req POST /feedback/testimonials/$TS2ID/reject $ADMIN_TOKEN "" >/dev/null
PUB3=$(req GET /feedback/testimonials "" "")
HAS3=$(echo "$PUB3" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(1 if any(t['id']=='$TS2ID' for t in d) else 0)" 2>/dev/null)
[ "$HAS3" = "0" ] && ok "rejected testimonial gone" || bad "reject"

# صف ادمین بدون توکن ادمین → 403
Q403=$(rcode GET "/feedback/testimonials/queue" $BT "")
[ "$Q403" = "403" ] && ok "queue guarded (403 for member)" || bad "queue guard ($Q403)"

echo "── 6. بازخورد و پرسش‌وپاسخ دستیارها ──"
FB1=$(req POST /feedback $BT "{\"businessId\":\"$BB\",\"kind\":\"FEEDBACK\",\"arm\":\"BUY\",\"text\":\"لیست خرید واقعا کار راه‌انداز است؛ فقط جستجو کندتر شود.\"}")
FB1ID=$(jget "$FB1" "d['id']")
[ -n "$FB1ID" ] && ok "feedback post created" || bad "feedback create"
FBQ=$(req POST /feedback $ST "{\"businessId\":\"$SB\",\"kind\":\"QUESTION\",\"arm\":\"SELL\",\"text\":\"تخفیف پله‌ای چطور روی سفارش اعمال می‌شود؟\"}")
FBQID=$(jget "$FBQ" "d['id']")
[ -n "$FBQID" ] && ok "question post created" || bad "question create"

FBL=$(req GET "/feedback?kind=FEEDBACK&arm=BUY" $S2T "")
FB_HAS=$(echo "$FBL" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(1 if any(p['id']=='$FB1ID' for p in d) else 0)" 2>/dev/null)
[ "$FB_HAS" = "1" ] && ok "feedback list (FEEDBACK/BUY)" || bad "feedback list"

LK1=$(req POST /feedback/$FB1ID/like $S2T "{\"businessId\":\"$S2B\"}")
LK1C=$(jget "$LK1" "d['likeCount']")
[ "$LK1C" = "1" ] && ok "like on (count=1)" || bad "like on"
LK2=$(req POST /feedback/$FB1ID/like $S2T "{\"businessId\":\"$S2B\"}")
LK2C=$(jget "$LK2" "d['likeCount']")
[ "$LK2C" = "0" ] && ok "like toggle off (count=0)" || bad "like toggle"

FR=$(req POST /feedback/$FB1ID/reply $ST "{\"businessId\":\"$SB\",\"text\":\"ما هم همین حس را داریم.\"}")
FRN=$(echo "$FR" | python3 -c "
import json,sys; d=json.load(sys.stdin)
r=d['replies'][-1]; print(r.get('businessName',''))" 2>/dev/null)
[ "$FRN" = "پخش مهر آزمون M10" ] && ok "user reply with business name" || bad "user reply ($FRN)"
FA=$(req POST /feedback/$FBQID/reply $ADMIN_TOKEN "{\"text\":\"از پلهٔ اول بعد از حداقل خرید اعمال می‌شود.\"}")
TEAMN=$(echo "$FA" | python3 -c "
import json,sys; d=json.load(sys.stdin)
r=d['replies'][-1]; print(r.get('businessName','') + '|' + str(r.get('team')))" 2>/dev/null)
[ "$TEAMN" = "تیم آیمچ|True" ] && ok "team reply (ADMIN)" || bad "team reply ($TEAMN)"

echo "── 7. فیلم‌های آموزشی ──"
VDB=$(req GET "/feedback/video-lessons?arm=BUY" "" ""); VDS=$(req GET "/feedback/video-lessons?arm=SELL" "" "")
VB=$(echo "$VDB" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null)
VS=$(echo "$VDS" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null)
[ "$VB" -ge 3 ] && [ "$VS" -ge 3 ] && ok "video lessons seeded (BUY=$VB SELL=$VS)" || bad "video lessons (BUY=$VB SELL=$VS)"

echo "── 8. گوش-به-زنگ (NeedAlert) ──"
NA=$(req POST /market/need-alerts $S2T "{\"businessId\":\"$S2B\",\"buyerBusinessId\":\"$BB\",\"goodId\":\"$G1\"}")
NAON=$(jget "$NA" "d['on']")
[ "$NAON" = "True" ] || [ "$NAON" = "true" ] && ok "bell on (S2 watches B×G1)" || bad "bell on"
NAST=$(req GET "/market/need-alerts?businessId=$S2B&buyerBusinessId=$BB" $S2T "")
NAHAS=$(echo "$NAST" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(1 if '$G1' in d.get('goodIds',[]) else 0)" 2>/dev/null)
[ "$NAHAS" = "1" ] && ok "bell state lists G1" || bad "bell state"
SELFG=$(rcode POST /market/need-alerts $S2T "{\"businessId\":\"$S2B\",\"buyerBusinessId\":\"$S2B\",\"goodId\":\"$G1\"}")
[ "$SELFG" = "400" ] && ok "self-bell blocked (400)" || bad "self-bell ($SELFG)"

# RFQ مستقیم فقط به S — S2 فقط از زنگوله باخبر می‌شود (DoD)
RQ=$(req POST /market/requestQuote $BT "{\"businessId\":\"$BB\",\"goodId\":\"$G1\",\"volume\":25,\"supplierIds\":[\"$SB\"],\"expiresDays\":3}")
RQC=$(jget "$RQ" "d['created']")
[ "$RQC" = "1" ] && ok "RFQ created (direct to S only)" || bad "RFQ create ($RQC)"

S2NOTIF=$(req GET "/notifications/getNotifications?limit=50" $S2T "")
S2_NEED=$(echo "$S2NOTIF" | python3 -c "
import json,sys; d=json.load(sys.stdin)
rows = d if isinstance(d, list) else d.get('items', [])
need = [n for n in rows if n.get('type')=='BUYER_NEED']
print(1 if need else 0)" 2>/dev/null)
[ "$S2_NEED" = "1" ] && ok "S2 got BUYER_NEED (bell!)" || bad "S2 BUYER_NEED"
S_NOTIF=$(req GET "/notifications/getNotifications?limit=50" $ST "")
S_QUOTE=$(echo "$S_NOTIF" | python3 -c "
import json,sys; d=json.load(sys.stdin)
rows = d if isinstance(d, list) else d.get('items', [])
q = [n for n in rows if n.get('type')=='QUOTE']
n = [x for x in rows if x.get('type')=='BUYER_NEED']
print(('1' if q else '0') + ('1' if not n else '0'))" 2>/dev/null)
[ "$S_QUOTE" = "11" ] && ok "direct S got QUOTE only (no double)" || bad "S notifs ($S_QUOTE — want 11)"

# RFQ چندقلمی (اجتماع دارندگان) → S2 هم گیرنده می‌شود → تب گوش-به-زنگش پر می‌شود
RQ2=$(req POST /market/requestQuote $BT "{\"businessId\":\"$BB\",\"items\":[{\"goodId\":\"$G1\",\"qty\":5}],\"expiresDays\":2}")
RQ2C=$(jget "$RQ2" "d['created']")
[ "$RQ2C" = "2" ] && ok "multi RFQ to both holders" || bad "multi RFQ ($RQ2C)"

WBN=$(req GET "/market/watched-buyer-needs?businessId=$S2B" $S2T "")
WBN_LEN=$(echo "$WBN" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['items']))" 2>/dev/null)
WBN_B=$(echo "$WBN" | python3 -c "
import json,sys; d=json.load(sys.stdin)['items']
print(d[0]['buyer']['id'] if d else '')" 2>/dev/null)
[ "$WBN_LEN" = "1" ] && [ "$WBN_B" = "$BB" ] && ok "watched-buyer-needs tab shows B's RFQ" || bad "watched needs (len=$WBN_LEN)"

req DELETE "/market/need-alerts?businessId=$S2B&buyerBusinessId=$BB&goodId=$G1" $S2T "" >/dev/null
NAST2=$(req GET "/market/need-alerts?businessId=$S2B&buyerBusinessId=$BB" $S2T "")
NAHAS2=$(echo "$NAST2" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('goodIds',[])))" 2>/dev/null)
[ "$NAHAS2" = "0" ] && ok "bell off" || bad "bell off"

echo "── 9. تاریخچهٔ رویدادهای کالا ──"
EV=$(req GET "/listings/$SLIST/events" $ST "")
EV_W=$(echo "$EV" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(d['counts'].get('WATCH_ADD',0))" 2>/dev/null)
EV_I=$(echo "$EV" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(d['counts'].get('INQUIRY',0))" 2>/dev/null)
EV_V30=$(echo "$EV" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('has' if 'viewCount30' in d else 'missing')" 2>/dev/null)
[ "$EV_W" -ge 1 ] && ok "WATCH_ADD logged (B watched G1)" || bad "WATCH_ADD log"
[ "$EV_I" -ge 1 ] && ok "INQUIRY logged (B's RFQ)" || bad "INQUIRY log"
[ "$EV_V30" = "has" ] && ok "view counters in payload" || bad "view counters"
EV7=$(req GET "/listings/$SLIST/events?days=7" $ST "")
EV7_N=$(echo "$EV7" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['items']))" 2>/dev/null)
[ "$EV7_N" -ge 1 ] && ok "days=7 filter returns rows" || bad "days filter"
EV403=$(rcode GET "/listings/$SLIST/events" $BT "")
[ "$EV403" = "403" ] && ok "events owner-guarded (403)" || bad "events guard ($EV403)"

echo "── 10. cleanup: demote temp admin ──"
node $BACK/scripts/mint-temp-admin.mjs "$TUSER" demote >/dev/null 2>&1 && ok "temp admin demoted" || bad "demote"

kill $BACK_PID 2>/dev/null; wait $BACK_PID 2>/dev/null
echo "══════════════════════════════════"
echo "M10 e2e: $PASS PASS · $FAIL FAIL"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✔" || echo "HAS FAILURES ✖"
exit $FAIL
