#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M9 e2e (API): کیف پول، تبلیغ نوع‌دار و نمایندهٔ فروش — روی Atlas
# سناریوی DoD کامل (سند ۰۸ §M9):
#   + کمپین فروش ویژهٔ ۳روزه با بودجه → رویداد VIEW/FOLLOW → خرج
#     رویدادمحور + توقف دستی با REFUND باقیمانده
#   + پایان مدت = توقف خودکار lazy در خواندن + REFUND + اعلان AD_BUDGET_END
#   + هدفمند دو جایگاه: TARGETED/SAVED_CATALOGS فقط تابلوی قیمت‌ها ·
#     TARGETED/SUPPLY_BOARD فقط تابلوی تأمین (جایگاه جدا، کمپین هر دو)
#   + گیت‌های اعتبارسنجی: مدت ۳/۷/۱۴ و جایگاه الزامی
#   + سفارش نماینده تا تسویه: ثبت → ارسال لیست (متن فارسی) → تحویل →
#     تسویه + گارد گام‌به‌گام + آمار داشبورد ماه
#   + شارژ کیف + تاریخچه (CHARGE/PROMO_SPEND/REFUND)
# Usage: bash qa-app/m9-e2e.sh  (from imach-web; backend at ../imach-back)
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
  out=$(curl -s -m 30 -w $'\n%{http_code}' -X $1 $BASE$2 -H "content-type: application/json" \
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
DATABASE_URL="$MONGO" STORAGE_DRIVER=local UPLOAD_PATH="$BACK/uploads" setsid nohup node dist/main.js > /tmp/imach-back-m9.log 2>&1 < /dev/null &
for i in $(seq 1 60); do curl -sf $BASE/getHealth >/dev/null 2>&1 && break; sleep 1; done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }

echo "── 2. seed: S (تبلیغ‌کننده) + X (خریدار/ذخیره‌کننده) + Y (بینندهٔ تازه) ──"
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+$1) % 1000000000 )))"; }
S_NAT=$(mkphone 81); X_NAT=$(mkphone 82); Y_NAT=$(mkphone 83)
SJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$S_NAT\",\"country\":\"IR\"}") || { bad "S register"; exit 1; }
ST=$(jget "$SJ" "d['accessToken']"); SB=$(jget "$SJ" "d['businesses'][0]['id']"); SS=$(jget "$SJ" "d['businesses'][0]['slug']")
XJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$X_NAT\",\"country\":\"IR\"}")
XT=$(jget "$XJ" "d['accessToken']"); XB=$(jget "$XJ" "d['businesses'][0]['id']")
YJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$Y_NAT\",\"country\":\"IR\"}")
YT=$(jget "$YJ" "d['accessToken']"); YB=$(jget "$YJ" "d['businesses'][0]['id']")
req PATCH /businesses/editBusiness/$SS $ST '{"name":"پخش پارس M9","city":"رشت","trade":"پخش مواد غذایی"}' >/dev/null

# شارژ کیف S — ۲۰۰ هزار تومان
CH=$(req POST /wallet/charge $ST "{\"businessId\":\"$SB\",\"amountToman\":200000}")
CHB=$(jget "$CH" "d['balanceMinor']")
[ "$CHB" = "2000000" ] && ok "شارژ ۲۰۰هزار تومان ⇒ ۲٬۰۰۰٬۰۰۰ ریال" || bad "charge: $CH"

# کالا + دو آگهی فروش (برای دو جایگاه)
G1=$(jget "$(req POST /goods/createGood $ST "{\"name\":\"برنج هاشمی M9-$RANDOM\",\"unit\":\"KILOGRAM\"}")" "d['id']")
G2=$(jget "$(req POST /goods/createGood $ST "{\"name\":\"روغن سرخ‌کردنی M9-$RANDOM\",\"unit\":\"BOTTLE\"}")" "d['id']")
L1=$(jget "$(req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G1\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":27500000,\"stock\":100,\"minOrder\":1}}")" "d['id']")
L2=$(jget "$(req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G2\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":3100000,\"stock\":80,\"minOrder\":2}}")" "d['id']")

# گیت شبکهٔ باز برای تبلیغ‌کننده: scoreSell ≥ ۱۰۰ (موتور واقعی در m7-e2e اثبات شد؛
# اینجا مستقیم شمارندهٔ denormalized را می‌گذاریم تا تمرکز تست روی خود تبلیغ بماند)
export SB
GT=$(node << 'EOF' 2>/dev/null
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const env = fs.readFileSync('/home/z/my-project/imach-back/.env', 'utf8');
const mongo = env.match(/^DATABASE_URL="?([^"]*)"?/m)[1];
(async () => {
  const c = new MongoClient(mongo);
  await c.connect();
  const r = await c.db().collection('Business').updateOne(
    { _id: new ObjectId(process.env.SB) },
    { $set: { scoreSell: 100 } }
  );
  console.log(r.modifiedCount);
  await c.close();
})();
EOF
)
[ "$GT" = "1" ] && ok "گیت شبکهٔ باز: scoreSell=100" || bad "gate set: $GT"

echo "── 3. گیت‌های اعتبارسنجی نوع‌دار ──"
BD=$(curl -s -m 30 -X POST $BASE/promos/create -H "content-type: application/json" -H "authorization: Bearer $ST" -d "{\"businessId\":\"$SB\",\"listingId\":\"$L1\",\"budgetToman\":50000,\"type\":\"CAMPAIGN\",\"durationDays\":5}")
echo "$BD" | grep -q "durationDays must be one of" && ok "مدت ۵ روز ⇒ رد (فقط ۳/۷/۱۴)" || bad "bad duration: $(echo $BD | head -c 80)"
BP=$(curl -s -m 30 -X POST $BASE/promos/create -H "content-type: application/json" -H "authorization: Bearer $ST" -d "{\"businessId\":\"$SB\",\"listingId\":\"$L1\",\"budgetToman\":50000,\"type\":\"TARGETED\"}")
echo "$BP" | grep -q "PROMO_BAD_PLACEMENT" && ok "هدفمند بدون جایگاه ⇒ رد" || bad "bad placement: $(echo $BP | head -c 80)"

echo "── 4. کمپین فروش ویژهٔ ۳روزه + بودجه ⇒ endsAt ──"
P1=$(req POST /promos/create $ST "{\"businessId\":\"$SB\",\"listingId\":\"$L1\",\"budgetToman\":50000,\"type\":\"CAMPAIGN\",\"durationDays\":3}")
PID=$(jget "$P1" "d['id']")
PT=$(jget "$P1" "d['type']"); PD=$(jget "$P1" "d['durationDays']"); PE=$(jget "$P1" "d['endsAt']")
[ "$PT" = "CAMPAIGN" ] && [ "$PD" = "3" ] && ok "کمپین ۳روزه ساخته شد" || bad "campaign: $PT/$PD"
NOW=$(date +%s); ENDS=$(date -d "${PE/+/ +}" +%s 2>/dev/null || python3 -c "import datetime,sys; print(int(datetime.datetime.fromisoformat('${PE/Z/ +00:00}').timestamp()))")
DAYS=$(( (ENDS - NOW) / 86400 ))
[ "$DAYS" = "2" ] || [ "$DAYS" = "3" ] && ok "endsAt ≈ امروز + ۳ روز" || bad "endsAt delta: $DAYS"

echo "── 5. X کالا را دنبال می‌کند ⇒ تابلوی قیمت‌ها + VIEW ──"
req POST /market/watchGood $XT "{\"businessId\":\"$XB\",\"goodId\":\"$G1\"}" >/dev/null
PB=$(req GET "/market/getPriceBoard?businessId=$XB" $XT "")
PROMO_ROW=$(echo "$PB" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d.get('rows', []):
    if r.get('promo') and r['promo'].get('listingId') == '$L1':
        print('yes'); break
else: print('no')" 2>/dev/null)
[ "$PROMO_ROW" = "yes" ] && ok "ردیف پرومو در تابلوی قیمت‌های X (SAVED_CATALOGS)" || bad "promo row: $PROMO_ROW"
M1=$(req GET "/promos/mine?businessId=$SB" $ST "")
SP1=$(echo "$M1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
p=[x for x in d if x['id']=='$PID'][0]
print(p['spentMinor'])" 2>/dev/null)
[ "$SP1" = "10000" ] && ok "VIEW خرج شد ⇒ ۱۰٬۰۰۰ ریال (۱٬۰۰۰ تومان)" || bad "view spend: $SP1"

echo "── 6. X ذخیره می‌کند ⇒ FOLLOW ۵۰٬۰۰۰ ریال ──"
req POST /market/followSupplier $XT "{\"businessId\":\"$XB\",\"supplierId\":\"$SB\",\"promoId\":\"$PID\"}" >/dev/null
RP=$(req GET "/promos/report?businessId=$SB&promoId=$PID" $ST "")
RV=$(jget "$RP" "d['stats']['views']"); RF=$(jget "$RP" "d['stats']['follows']"); RS=$(jget "$RP" "d['stats']['spentMinor']")
VE=$(jget "$RP" "len(d['viewerEvents'])")
[ "$RV" = "1" ] && [ "$RF" = "1" ] && [ "$RS" = "60000" ] && [ "$VE" = "2" ] && ok "گزارش: ۱ نمایش + ۱ ذخیره = ۶۰٬۰۰۰ ریال خرج" || bad "report: v=$RV f=$RF s=$RS ve=$VE"

echo "── 7. توقف دستی ⇒ REFUND باقیمانده ──"
req POST /promos/stop/$PID $ST "{\"businessId\":\"$SB\"}" >/dev/null
W1=$(req GET "/wallet/get?businessId=$SB" $ST "")
WB=$(jget "$W1" "d['balanceMinor']")
[ "$WB" = "1940000" ] && ok "REFUND ۴۴۰٬۰۰۰ ریال ⇒ موجودی ۱٬۹۴۰٬۰۰۰" || bad "refund balance: $WB"
RFD=$(echo "$W1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('yes' if any(t['type']=='REFUND' and t['amountMinor']==440000 for t in d['txns']) else 'no')" 2>/dev/null)
[ "$RFD" = "yes" ] && ok "تراکنش REFUND ۴۴۰٬۰۰۰ در تاریخچه" || bad "refund txn: $RFD"

echo "── 8. پایان مدت ⇒ توقف lazy در خواندن + REFUND + اعلان ──"
P2=$(req POST /promos/create $ST "{\"businessId\":\"$SB\",\"listingId\":\"$L1\",\"budgetToman\":50000,\"type\":\"CAMPAIGN\",\"durationDays\":7}")
P2ID=$(jget "$P2" "d['id']")
# بک‌دیتِ endsAt ← دیروز (سناریوی «مدتش گذشته و هنوز خوانده نشده»)
export P2ID
BD2=$(node << 'EOF' 2>/dev/null
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const env = fs.readFileSync('/home/z/my-project/imach-back/.env', 'utf8');
const mongo = env.match(/^DATABASE_URL="?([^"]*)"?/m)[1];
(async () => {
  const c = new MongoClient(mongo);
  await c.connect();
  const r = await c.db().collection('Promo').updateOne(
    { _id: new ObjectId(process.env.P2ID) },
    { $set: { endsAt: new Date(Date.now() - 86400000) } }
  );
  console.log(r.modifiedCount);
  await c.close();
})();
EOF
)
[ "$BD2" = "1" ] && ok "بک‌دیت endsAt ← دیروز" || bad "backdate: $BD2"
M2=$(req GET "/promos/mine?businessId=$SB" $ST "")
ACT2=$(echo "$M2" | python3 -c "
import json,sys
d=json.load(sys.stdin)
p=[x for x in d if x['id']=='$P2ID'][0]
print(p['isActive'])" 2>/dev/null)
[ "$ACT2" = "False" ] && ok "خواندن mine ⇒ توقف خودکار (lazy)" || bad "lazy stop: $ACT2"
W2=$(req GET "/wallet/get?businessId=$SB" $ST "")
RFD2=$(echo "$W2" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('yes' if any(t['type']=='REFUND' and t['amountMinor']==500000 for t in d['txns']) else 'no')" 2>/dev/null)
[ "$RFD2" = "yes" ] && ok "REFUND پایان مدت ۵۰۰٬۰۰۰ ریال (کل بودجه)" || bad "period refund: $RFD2"
NT=$(req GET "/notifications/getNotifications" $ST "")
ADE=$(echo "$NT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=[i for i in d['items'] if i['type']=='AD_BUDGET_END']
print(rows[0]['title'] if rows else '')" 2>/dev/null)
echo "$ADE" | grep -q "پایان رسید" && ok "اعلان AD_BUDGET_END: «$ADE»" || bad "ad notif: $ADE"

echo "── 9. هدفمند دو جایگاه — جایگاه جدا از هم ──"
P3=$(req POST /promos/create $ST "{\"businessId\":\"$SB\",\"listingId\":\"$L2\",\"budgetToman\":50000,\"type\":\"TARGETED\",\"placement\":\"SUPPLY_BOARD\"}")
P3ID=$(jget "$P3" "d['id']")
P4=$(req POST /promos/create $ST "{\"businessId\":\"$SB\",\"listingId\":\"$L1\",\"budgetToman\":50000,\"type\":\"TARGETED\",\"placement\":\"SAVED_CATALOGS\"}")
P4ID=$(jget "$P4" "d['id']")
[ -n "$P3ID" ] && [ -n "$P4ID" ] && ok "دو تبلیغ هدفمند ساخته شد" || bad "targeted create: $P3/$P4"
# Y (بینندهٔ تازه — S را ذخیره نکرده) هر دو کالا را دنبال می‌کند
req POST /market/watchGood $YT "{\"businessId\":\"$YB\",\"goodId\":\"$G1\"}" >/dev/null
req POST /market/watchGood $YT "{\"businessId\":\"$YB\",\"goodId\":\"$G2\"}" >/dev/null
# تابلوی قیمت‌های Y: فقط SAVED_CATALOGS باید پرومو بدهد (L1) — نه SUPPLY_BOARD (L2)
PBY=$(req GET "/market/getPriceBoard?businessId=$YB" $YT "")
PB_SP=$(echo "$PBY" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ids=[r['promo']['listingId'] for r in d.get('rows', []) if r.get('promo')]
print(','.join(sorted(ids)))" 2>/dev/null)
[ "$PB_SP" = "$L1" ] && ok "تابلوی قیمت‌ها: فقط جایگاه SAVED_CATALOGS" || bad "priceboard promos: $PB_SP (expect $L1)"
# تابلوی تأمین L2 (Y): ردیف S باید sponsored باشد
SBD=$(req GET "/market/getSupplyBoard?businessId=$YB&goodId=$G2" $YT "")
SPON=$(echo "$SBD" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=[r for r in d['rows'] if r['seller']['id']=='$SB']
print(rows[0]['sponsored'] if rows else 'missing')" 2>/dev/null)
[ "$SPON" = "True" ] && ok "تابلوی تأمین: ردیف S sponsored (SUPPLY_BOARD)" || bad "sponsored: $SPON"
# تابلوی تأمین L1 (Y): TARGETED/SAVED_CATALOGS اینجا نباید sponsored بدهد
SBD1=$(req GET "/market/getSupplyBoard?businessId=$YB&goodId=$G1" $YT "")
SPON1=$(echo "$SBD1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=[r for r in d['rows'] if r['seller']['id']=='$SB']
print(rows[0]['sponsored'] if rows else 'missing')" 2>/dev/null)
[ "$SPON1" = "False" ] && ok "SAVED_CATALOGS روی تابلوی تأمین ⇒ بدون sponsored (جایگاه جدا)" || bad "board leak: $SPON1"
# VIEW تابلوی تأمین خرج شد
M3=$(req GET "/promos/mine?businessId=$SB" $ST "")
SP3=$(echo "$M3" | python3 -c "
import json,sys
d=json.load(sys.stdin)
p=[x for x in d if x['id']=='$P3ID'][0]
print(p['spentMinor'])" 2>/dev/null)
[ "$SP3" = "10000" ] && ok "VIEW تابلوی تأمین خرج شد (۱۰٬۰۰۰ ریال)" || bad "board view: $SP3"

echo "── 10. سفارش نماینده تا تسویه (G10 · FD-17) ──"
R1=$(req POST /rep/orders $ST "{\"businessId\":\"$SB\",\"customerName\":\"رستوران مهر\",\"items\":[{\"name\":\"روغن سرخ‌کردنی\",\"pack\":\"کارتن ۶ بطری‌ای\",\"qty\":4,\"unitPriceMinor\":10800000},{\"name\":\"سبزی مخلوط\",\"pack\":\"بسته ۵ کیلویی\",\"qty\":10,\"unitPriceMinor\":4500000}],\"commissionPct\":3}")
RID=$(jget "$R1" "d['id']")
RT=$(jget "$R1" "d['totalMinor']")
[ "$RT" = "88200000" ] && ok "ثبت دو-قلمی ⇒ جمع ۸۸٬۲۰۰٬۰۰۰ ریال" || bad "rep total: $RT"
SH=$(req POST /rep/orders/$RID/share $ST "{\"businessId\":\"$SB\",\"via\":\"WHATSAPP\"}")
SST=$(jget "$SH" "d['order']['status']"); SVIA=$(jget "$SH" "d['order']['sharedVia']")
STXT=$(jget "$SH" "d['text']")
[ "$SST" = "SENT" ] && [ "$SVIA" = "WHATSAPP" ] && ok "ارسال لیست ⇒ SENT (واتس‌اپ)" || bad "share: $SST/$SVIA"
echo "$STXT" | grep -q "لیست سفارش" && echo "$STXT" | grep -q "جمع" && ok "متن لیست فارسی ساخته شد" || bad "list text: $STXT"
req POST /rep/orders/$RID/deliver $ST "{\"businessId\":\"$SB\"}" >/dev/null
# آمار: در انتظار تسویه زنده = پورسانتِ DELIVERED
ST1=$(req GET /rep/stats $ST "")
PEND=$(jget "$ST1" "d['tiles']['pendingSettleMinor']")
[ "$PEND" = "2646000" ] && ok "در انتظار تسویه = ۲٬۶۴۶٬۰۰۰ ریال (پورسانت ۳٪)" || bad "pending: $PEND"
R2=$(req POST /rep/orders/$RID/settle $ST "{\"businessId\":\"$SB\"}")
[ "$(jget "$R2" "d['status']")" = "SETTLED" ] && ok "تسویه ⇒ SETTLED" || bad "settle: $R2"
DBL=$(curl -s -m 30 -X POST $BASE/rep/orders/$RID/settle -H "content-type: application/json" -H "authorization: Bearer $ST" -d "{\"businessId\":\"$SB\"}")
echo "$DBL" | grep -q "REP_BAD_TRANSITION" && ok "تسویهٔ دوباره ⇒ رد (گارد گام‌به‌گام)" || bad "double settle: $(echo $DBL | head -c 80)"
ST2=$(req GET /rep/stats $ST "")
TILES=$(jget "$ST2" "str(d['tiles'])")
echo "$TILES" | grep -q "'salesMonthMinor': 88200000" && echo "$TILES" | grep -q "'commissionMonthMinor': 2646000" && echo "$TILES" | grep -q "'ordersMonth': 1" && ok "داشبورد: فروش/پورسانت/سفارش ماه درست" || bad "tiles: $TILES"
# فیلتر گزارش واحد + گیت مالکیت فیلتر
LS1=$(req GET "/rep/orders?businessId=$SB" $ST "")
LSN=$(jget "$LS1" "len(d)")
[ "$LSN" = "1" ] && ok "گزارش واحد با فیلتر کسب‌وکار" || bad "filter: $LSN"
LS2=$(req GET "/rep/orders?businessId=$YB" $YT "")
LS2N=$(jget "$LS2" "len(d)")
[ "$LS2N" = "0" ] && ok "فیلترِ میزِ دیگر ⇒ خالی (گیت مالکیت)" || bad "filter gate: $LS2N"

echo "── 11. پاک‌سازی آزمون ──"
export S_NAT X_NAT Y_NAT
CLEAN=$(node << 'EOF' 2>/dev/null
const { MongoClient } = require('mongodb');
const fs = require('fs');
const env = fs.readFileSync('/home/z/my-project/imach-back/.env', 'utf8');
const mongo = env.match(/^DATABASE_URL="?([^"]*)"?/m)[1];
(async () => {
  const c = new MongoClient(mongo);
  await c.connect();
  const db = c.db();
  // شمارهٔ کامل با پیش‌کد کشور ذخیره می‌شود (IR → 98 + نرخ ملی)
  const phones = ['98' + process.env.S_NAT, '98' + process.env.X_NAT, '98' + process.env.Y_NAT];
  const users = await db.collection('User').find({ phone: { $in: phones } }).toArray();
  if (!users.length) { console.log(0); await c.close(); return; }
  const ids = users.map((u) => u._id);
  const bizs = await db.collection('Business').find({ ownerId: { $in: ids } }).toArray();
  const bizIds = bizs.map((b) => b._id);
  let n = 0;
  if (bizIds.length) {
    for (const col of ['Order', 'RepOrder', 'Promo', 'PromoEvent', 'Wallet', 'WalletTxn', 'SupplyProposal', 'Thread', 'Message', 'Notification', 'WatchedGood', 'Inquiry', 'Offer', 'Follow', 'Page', 'Listing']) {
      const r = await db.collection(col).deleteMany({
        $or: [
          { businessId: { $in: bizIds } },
          { sellerId: { $in: bizIds } }, { buyerId: { $in: bizIds } },
          { supplierBusinessId: { $in: bizIds } }, { buyerBusinessId: { $in: bizIds } },
          { viewerBusinessId: { $in: bizIds } }, { repUserId: { $in: ids } },
          { userId: { $in: ids } }, { ownerId: { $in: ids } },
          { aId: { $in: bizIds } }, { bId: { $in: bizIds } }, { followerId: { $in: ids } },
        ],
      });
      n += r.deletedCount;
    }
    await db.collection('Business').deleteMany({ _id: { $in: bizIds } });
  }
  await db.collection('User').deleteMany({ _id: { $in: ids } });
  await db.collection('RefreshToken').deleteMany({ userId: { $in: ids } });
  console.log(n);
  await c.close();
})();
EOF
)
ok "پاک‌سازی آزمون انجام شد ($CLEAN سند)"

pkill -f "node dist/main" 2>/dev/null
echo ""
echo "══ M9 E2E: $PASS pass / $FAIL fail ══"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "HAS FAILURES ✖"
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
