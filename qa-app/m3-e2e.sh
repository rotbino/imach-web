#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M3 e2e: buy-list + low-stock + suppliers (browser, real API)
# Sandbox: servers must live INSIDE this call (children die per-call).
# Usage: bash qa-app/m3-e2e.sh  (from imach-web; backend at ../imach-back)
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
SHOTS=$WEB/shots-m3
mkdir -p $SHOTS
BASE=http://127.0.0.1:4000/api/v1
MONGO='mongodb://uniqu434343:MirAli%40434343%2A@megancluster-shard-00-00.jm46r.mongodb.net:27017,megancluster-shard-00-01.jm46r.mongodb.net:27017,megancluster-shard-00-02.jm46r.mongodb.net/imach_online_db?ssl=true&replicaSet=atlas-10bcqm-shard-0&authSource=admin&appName=MeganCluster'
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "✔ $1"; }
bad() { FAIL=$((FAIL+1)); echo "✖ $1"; }
B=agent-browser

# ref extractor: snapshot -i | grep pattern | first ref (format: [ref=eN] → eN)
sref() { $B snapshot -i 2>/dev/null | grep -F "$1" | grep -oE 'ref=e[0-9]+' | head -1 | cut -d= -f2; }
# فقط دکمه — تا مقدارِ textbox جستجو (که در snapshot می‌آید) قاطی نشود
srefb() { $B snapshot -i 2>/dev/null | grep -F -- '- button "' | grep -F "$1" | grep -oE 'ref=e[0-9]+' | head -1 | cut -d= -f2; }
# sref با ۳ تلاش (رندرهای دیررس شیت‌ها)
srefr() { local r=""; for i in 1 2 3; do r=$(sref "$1"); [ -n "$r" ] && break; sleep 1.2; done; echo "$r"; }

echo "── 1. boot servers ──"
cd $BACK
DATABASE_URL="$MONGO" setsid nohup node node_modules/.bin/nest start > /tmp/imach-back-dev.log 2>&1 < /dev/null &
cd $WEB
setsid nohup npm run s > /tmp/imach-web-dev.log 2>&1 < /dev/null &
for i in $(seq 1 60); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

echo "── 2. prep: throwaway buyer (IR) + barcode SKU ──"
NAT="9$(printf '%09d' $(( $(date +%s) % 1000000000 )))"   # 10-digit IR mobile (9XXXXXXXXX)
curl -sf -X POST $BASE/auth/quickRegister -H 'content-type: application/json' \
  -d "{\"phone\":\"$NAT\",\"country\":\"IR\"}" > /tmp/m3-qr.json && ok "quickRegister 0$NAT (IR)" || bad "quickRegister"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/m3-qr.json')).get('accessToken',''))")
BIZ=$(python3 -c "import json;print((json.load(open('/tmp/m3-qr.json')).get('businesses') or [{}])[0].get('id',''))")
[ -n "$TOKEN" ] && [ -n "$BIZ" ] && ok "token+biz ready" || { bad "token/biz missing"; exit 1; }
AH="authorization: Bearer $TOKEN"

curl -sf -X PATCH $BASE/businesses/editBusiness/$BIZ -H "$AH" -H 'content-type: application/json' \
  -d '{"name":"سوپرمارکت تست M3","city":"رشت","trade":"سوپرمارکت"}' >/dev/null \
  && ok "business named" || bad "editBusiness"

# کالاهای دارای تابلوی فروش فعال دیگران — برای نمای ۲۰ب معنی‌دار
# (Prisma: نام کالکشن‌ها = نام مدل — Listing/Good/Product با حرف بزرگ)
node -e "
const { MongoClient } = require('$BACK/node_modules/mongodb');
(async () => {
  const c = new MongoClient('$MONGO'); await c.connect();
  const rows = await c.db().collection('Listing').aggregate([
    { \$match: { isActive: true, mode: { \$in: ['SELL','BOTH'] }, priceMinor: { \$ne: null } } },
    { \$group: { _id: '\$goodId', n: { \$sum: 1 } } },
    { \$sort: { n: -1 } }, { \$limit: 6 }
  ]).toArray();
  require('fs').writeFileSync('/tmp/m3-goods.json', JSON.stringify(rows));
  console.log('goods with sell board:', rows.length);
  await c.close();
})();
" || bad "goods aggregation"
mapfile -t G < <(python3 -c "import json;d=json.load(open('/tmp/m3-goods.json'));print('\n'.join(r['_id'] for r in d))")
GOOD1=${G[0]:-}; GOOD2=${G[1]:-}; GOOD3=${G[2]:-}; GOOD4=${G[3]:-}; GOOD5=${G[4]:-}
[ -n "$GOOD1" ] && ok "test goods picked (${#G[@]})" || { bad "no goods with sell board"; exit 1; }

gname() { node -e "
const { MongoClient, ObjectId } = require('$BACK/node_modules/mongodb');
(async () => {
  const c = new MongoClient('$MONGO'); await c.connect();
  const g = await c.db().collection('Good').findOne({ _id: ObjectId.createFromHexString('$1') });
  console.log(g ? g.nameFa : '');
  await c.close();
})();"; }

# بارکد واقعی از دیتای مرجع (Product) — سوخت اسکنر
BARC_INFO=$(node -e "
const { MongoClient } = require('$BACK/node_modules/mongodb');
(async () => {
  const c = new MongoClient('$MONGO'); await c.connect();
  // بارکد سالم: good مرجعش هم زنده باشد (۶۷ محصول یتیم در دیتای آنلاین
  // هست — اسکنرِ آن‌ها «پیدا نشد» است، نه خطا)
  const goods = await c.db().collection('Good').find({}, { projection: { _id: 1 } }).toArray();
  const gset = new Set(goods.map(g => String(g._id)));
  const p = await c.db().collection('Product').findOne({
    barcode: { \$ne: null }, goodId: { \$exists: true },
    \$expr: { \$in: [ { \$toString: '\$goodId' }, Array.from(gset) ] },
  });
  console.log(p.barcode + ' ' + String(p.goodId));
  await c.close();
})();")
BARCODE=$(echo $BARC_INFO | cut -d' ' -f1)
BCGOOD=$(echo $BARC_INFO | cut -d' ' -f2)
[ -n "$BARCODE" ] && ok "barcode SKU found: $BARCODE" || bad "no barcode product"

echo "── 3. browser: login (fa/RTL) ──"
$B open http://localhost:3000/login >/dev/null 2>&1
$B cookies clear >/dev/null 2>&1
$B cookies set imach_locale fa >/dev/null 2>&1
$B open http://localhost:3000/login >/dev/null 2>&1
$B wait --load networkidle >/dev/null 2>&1; sleep 2
# مرورگر headless تایم‌زون/زبان US دارد → حدس کشور = US(+1)؛ باید ایران شود
CREG=$(sref "انتخاب کشور")
[ -n "$CREG" ] && $B click @$CREG >/dev/null 2>&1
sleep 1.5
IRREF=$(sref "ایران")
[ -n "$IRREF" ] && $B click @$IRREF >/dev/null 2>&1 && ok "country=ایران selected" || bad "country pick ایران"
sleep 1.5
PREF=$(sref "شماره موبایل")
[ -n "$PREF" ] && ok "phone field found" || bad "phone field missing"
$B fill @$PREF "$NAT" >/dev/null 2>&1
sleep 1
echo "  country=[$($B get text @$CREG 2>&1 | head -1)] phone=[$($B get value @$PREF 2>&1 | head -1)]"
LREF=$(sref "ورود به آی")
$B click @$LREF >/dev/null 2>&1
sleep 8
URL=$($B get url 2>/dev/null); echo "  after-login: $URL"
if [[ "$URL" != *"/sell"* && "$URL" != *"/home"* && "$URL" != *"/start"* && "$URL" != *"/me"* ]]; then
  echo "  ── login debug: snapshot/network ──"
  $B snapshot -i 2>/dev/null | head -8
  $B network requests --filter auth 2>/dev/null | tail -5
fi
case "$URL" in *"/sell"*|*"/home"*|*"/start"*|*"/me"*) ok "logged in";; *) bad "login url: $URL";; esac

echo "── 4. /buy-list empty + add good#1 (form: qty+period) ──"
$B open http://localhost:3000/buy-list >/dev/null 2>&1; sleep 4
$B wait --text "لیست خرید" >/dev/null 2>&1 && ok "20 buy-list opens" || bad "20 buy-list missing"
AREF=$(sref "افزودن نوع کالا"); [ -z "$AREF" ] && AREF=$(sref "افزودن")
$B click @$AREF >/dev/null 2>&1; sleep 3
$B get url 2>/dev/null | grep -q "/buy-list/new" && ok "21 add-form opens" || bad "21 url: $($B get url 2>/dev/null)"
G1NAME=$(gname $GOOD1); echo "  good#1: $G1NAME"
SREF1=$(sref "جستجوی نوع کالا"); [ -z "$SREF1" ] && SREF1=$(sref "جستجو")
$B fill @$SREF1 "$G1NAME" >/dev/null 2>&1; sleep 2.5
GREF=$(srefb "$G1NAME")
[ -n "$GREF" ] && $B click @$GREF >/dev/null 2>&1 && ok "good#1 picked" || bad "good#1 pick row"
sleep 2
VREF=$(srefr "مقدار موردنیاز")
[ -n "$VREF" ] && $B fill @$VREF "25" >/dev/null 2>&1 && ok "volume=25 typed" || bad "volume field"
FREF=$(srefb "ماهانه")
[ -n "$FREF" ] && $B click @$FREF >/dev/null 2>&1 && ok "period=ماهانه" || bad "period pill"
SUBREF=$(srefb "افزودن به لیست خرید")
$B click @$SUBREF >/dev/null 2>&1; sleep 4
$B get url 2>/dev/null | grep -q "/buy-list$" && ok "good#1 added → list" || bad "submit url: $($B get url 2>/dev/null)"

echo "── 5. goods #2..#5 (quick loop) ──"
for GI in $GOOD2 $GOOD3 $GOOD4 $GOOD5; do
  $B open http://localhost:3000/buy-list/new >/dev/null 2>&1; sleep 2.5
  GN=$(gname $GI)
  SREF2=$(sref "جستجوی نوع کالا"); [ -z "$SREF2" ] && SREF2=$(sref "جستجو")
  [ -n "$SREF2" ] && $B fill @$SREF2 "$GN" >/dev/null 2>&1
  sleep 2.5
  GR=$(srefb "$GN")
  [ -n "$GR" ] && $B click @$GR >/dev/null 2>&1 || true
  sleep 2
  SR=$(srefb "افزودن به لیست خرید")
  [ -n "$SR" ] && $B click @$SR >/dev/null 2>&1 || true
  sleep 3.5
done
# شمارش با ۳ تلاش (رویدادهای دیررسِ submit آخر) + چاپ نام‌ها برای دیباگ
WN=0; WJSON=""
for i in 1 2 3; do
  WJSON=$(curl -sf "$BASE/market/getWatchedGoods?businessId=$BIZ" -H "$AH" || echo "[]")
  WN=$(python3 -c "import json;print(len([r for r in json.loads('''$WJSON''') if not r.get('archivedAt')]))" 2>/dev/null || echo 0)
  [ "${WN:-0}" -ge 5 ] && break; sleep 2
done
WNAMES=$(python3 -c "import json;print('، '.join(r['good']['nameFa'] for r in json.loads('''$WJSON''') if not r.get('archivedAt')))" 2>/dev/null || echo "?")
echo "  watched: $WN — $WNAMES"
[ "${WN:-0}" -ge 5 ] && ok "watched rows: $WN (5 via form)" || bad "watched rows: $WN — $WNAMES"

echo "── 6. scanner: #6 via barcode ──"
$B open http://localhost:3000/buy-list >/dev/null 2>&1; sleep 3
SCANREF=$(sref "اسکن بارکد")
[ -n "$SCANREF" ] && $B click @$SCANREF >/dev/null 2>&1 && ok "scan sheet opened" || bad "scan button"
sleep 1.5
BREF=$(srefr "بارکد را دستی وارد کن")
[ -n "$BREF" ] && $B fill @$BREF "$BARCODE" >/dev/null 2>&1 && ok "barcode typed" || bad "barcode field"
MREF=$(sref "تطبیق")
[ -n "$MREF" ] && $B click @$MREF >/dev/null 2>&1; sleep 3.5
WJSON=$(curl -sf "$BASE/market/getWatchedGoods?businessId=$BIZ" -H "$AH")
SCAN_HIT=$(python3 -c "
import json
rows=json.loads('''$WJSON''')
print('yes' if any(r.get('goodId')=='$BCGOOD' and not r.get('archivedAt') for r in rows) else 'no')" 2>/dev/null)
[ "$SCAN_HIT" = "yes" ] && ok "scanner path OK (watched #6 exists)" || bad "scanner flow"
$B screenshot $SHOTS/20-buylist-6rows-mobile.png --full >/dev/null 2>&1

echo "── 7. low-stock: toggle ×2 → page → remove one ──"
curl -sf -X POST $BASE/market/setLowStock -H "$AH" -H 'content-type: application/json' \
  -d "{\"businessId\":\"$BIZ\",\"goodId\":\"$GOOD1\",\"lowStock\":true}" >/dev/null && ok "setLowStock#1" || bad "setLowStock#1"
curl -sf -X POST $BASE/market/setLowStock -H "$AH" -H 'content-type: application/json' \
  -d "{\"businessId\":\"$BIZ\",\"goodId\":\"$GOOD2\",\"lowStock\":true}" >/dev/null && ok "setLowStock#2" || bad "setLowStock#2"
$B open http://localhost:3000/buy-list/low-stock >/dev/null 2>&1; sleep 3.5
$B wait --text "رو به اتمام" >/dev/null 2>&1 && ok "20ج low-stock page" || bad "20ج missing"
$B screenshot $SHOTS/20j-lowstock-mobile.png --full >/dev/null 2>&1
XREF=$(sref "برداشتن نشان رو به اتمام")
[ -n "$XREF" ] && $B click @$XREF >/dev/null 2>&1 && ok "× removed one (UI)" || bad "× remove button"
sleep 2.5
LSJSON=$(curl -sf "$BASE/market/getWatchedGoods?businessId=$BIZ" -H "$AH")
LSN=$(python3 -c "import json;rows=json.loads('''$LSJSON''');print(len([r for r in rows if r.get('lowStock') and not r.get('archivedAt')]))" 2>/dev/null || echo -1)
[ "${LSN:-0}" -eq 1 ] && ok "low-stock rows = 1 after ×" || bad "low-stock rows: $LSN"

echo "── 8. desk tray row (19) ──"
$B open http://localhost:3000/home >/dev/null 2>&1; sleep 4
$B wait --text "رو به اتمام" >/dev/null 2>&1 && ok "desk tray low-stock row" || bad "desk tray row missing"
$B screenshot $SHOTS/19-buydesk-lowstock-mobile.png --full >/dev/null 2>&1

echo "── 9. card → suppliers-of-good (20ب) + ledger (22) ──"
$B open "http://localhost:3000/suppliers?good=$GOOD1" >/dev/null 2>&1; sleep 4
$B wait --text "تأمین‌کننده‌های" >/dev/null 2>&1 && ok "20ب good-suppliers view" || bad "20ب view" || bad "20ب view"
$B screenshot $SHOTS/20b-good-suppliers-mobile.png --full >/dev/null 2>&1
$B open http://localhost:3000/suppliers >/dev/null 2>&1; sleep 3.5
$B wait --text "تأمین‌کنندگان من" >/dev/null 2>&1 && ok "22 suppliers ledger" || bad "22 ledger"
$B screenshot $SHOTS/22-suppliers-mobile.png --full >/dev/null 2>&1

echo "── 10. RTL/LTR sidebar position (bug fix) ──"
$B set viewport 1440 900 >/dev/null 2>&1
$B open http://localhost:3000/sell >/dev/null 2>&1; sleep 4
SIDE_EVAL='(() => { const u=location.pathname; if(u.startsWith("/login")) return "ON-LOGIN(dir="+document.documentElement.dir+")"; const a=document.querySelector("aside"); if(!a) return "no-aside(dir="+document.documentElement.dir+")"; const r=a.getBoundingClientRect(); return document.documentElement.dir+":"+(r.right>window.innerWidth/2?"right":"left"); })()'
RTL_POS=$($B eval "$SIDE_EVAL" 2>/dev/null | tr -d '"')
[ "$RTL_POS" = "rtl:right" ] && ok "RTL (fa): sidebar RIGHT" || bad "RTL sidebar: $RTL_POS"
$B screenshot $SHOTS/shell-rtl-1440.png >/dev/null 2>&1
$B cookies set imach_locale en >/dev/null 2>&1
$B open http://localhost:3000/sell >/dev/null 2>&1; sleep 4
LTR_POS=$($B eval "$SIDE_EVAL" 2>/dev/null | tr -d '"')
[ "$LTR_POS" = "ltr:left" ] && ok "LTR (en): sidebar LEFT" || bad "LTR sidebar: $LTR_POS"
$B screenshot $SHOTS/shell-ltr-1440.png >/dev/null 2>&1
$B cookies set imach_locale fa >/dev/null 2>&1

echo "── 10ب. owner-fix batch: sub-page shell (back+toolbar, no sidebar) ──"
# صفحات فرعی دسکتاپ: بدون سایدبار + فلش بازگشت + نوار ابزار
SUB_EVAL='(() => { const a=document.querySelector("aside"); const back=[...document.querySelectorAll("header button[aria-label]")].some(b=>/بازگشت|Back/.test(b.getAttribute("aria-label"))); const tb=!!document.querySelector("header + div"); const bodyHas=(t)=>document.body.innerText.includes(t); return JSON.stringify({aside:!!a,back,toolbarTahavol:bodyHas("شرایط تامین")||bodyHas("تغییر قیمت‌ها")}); })()'
$B open http://localhost:3000/buy-list >/dev/null 2>&1; sleep 3.5
SUBJ=$($B eval "$SUB_EVAL" 2>/dev/null | tr -d '\\n')
echo "  /buy-list@1440: $SUBJ"
echo "$SUBJ" | grep -q '"aside":false' && ok "20 sub-page: no sidebar (1440)" || bad "20 sub-page sidebar still: $SUBJ"
echo "$SUBJ" | grep -q '"back":true' && ok "20 sub-page: back arrow present" || bad "20 back arrow missing: $SUBJ"
echo "$SUBJ" | grep -q '"toolbarTahavol":true' && ok "20 toolbar (شرایط تامین) present" || bad "20 toolbar missing: $SUBJ"
$B screenshot $SHOTS/20-buylist-1440-subpage.png >/dev/null 2>&1
# بازگشت عملی: فلش → /home
BACKREF=$(sref "بازگشت")
[ -n "$BACKREF" ] && { $B click @$BACKREF >/dev/null 2>&1; sleep 2.5; $B get url 2>/dev/null | grep -q "/home" && ok "back arrow navigates → /home" || bad "back nav: $($B get url 2>/dev/null)"; }
$B open http://localhost:3000/buy-list >/dev/null 2>&1; sleep 2
$B open http://localhost:3000/catalog >/dev/null 2>&1; sleep 3.5
CATJ=$($B eval "$SUB_EVAL" 2>/dev/null | tr -d '\\n')
echo "  /catalog@1440: $CATJ"
echo "$CATJ" | grep -q '"aside":false' && ok "05 catalog: no sidebar (1440)" || bad "05 catalog sidebar still: $CATJ"
echo "$CATJ" | grep -q '"toolbarTahavol":true' && ok "05 catalog toolbar (تغییر قیمت‌ها)" || bad "05 catalog toolbar missing: $CATJ"
$B screenshot $SHOTS/05-catalog-1440-toolbar.png >/dev/null 2>&1
BACKREF2=$(sref "بازگشت")
[ -n "$BACKREF2" ] && { $B click @$BACKREF2 >/dev/null 2>&1; sleep 2.5; $B get url 2>/dev/null | grep -q "/sell" && ok "catalog back → /sell" || bad "catalog back: $($B get url 2>/dev/null)"; }

echo "── 10ج. owner-fix: units localized (no EN keys in DOM) ──"
$B open http://localhost:3000/buy-list >/dev/null 2>&1; sleep 3.5
UNIT_EVAL='(() => { const t=document.body.innerText; const keys=["KILOGRAM","TON","CARTON","SACK","PIECE","LITER","BRANCH","METER","GRAM","SERVICE"]; return keys.filter(k=>t.includes(k)).join(",") || "clean"; })()'
UNITS=$($B eval "$UNIT_EVAL" 2>/dev/null | tr -d '"')
[ "$UNITS" = "clean" ] && ok "unit keys hidden (fa titles shown)" || bad "raw unit keys visible: $UNITS"

echo "── 10د. owner-fix: login logo2 centered ──"
$B cookies clear >/dev/null 2>&1
$B open http://localhost:3000/login >/dev/null 2>&1; sleep 3
LOGO_EVAL='(() => { const imgs=[...document.querySelectorAll("img")].filter(i=>(i.getAttribute("src")||"").includes("logo2.svg") && i.offsetParent!==null && !i.closest("[aria-hidden=\"true\"]")); if(!imgs.length) return "no-logo2"; const good=imgs.some(img=>{ const r=img.getBoundingClientRect(); const p=img.parentElement.getBoundingClientRect(); return Math.abs((r.left+r.width/2)-(p.left+p.width/2))<3; }); return "logo2:"+good; })()'
LOGO=$($B eval "$LOGO_EVAL" 2>/dev/null | tr -d '"')
[ "$LOGO" = "logo2:true" ] && ok "login: logo2.svg centered" || bad "login logo2: $LOGO"
$B screenshot $SHOTS/03-login-logo2.png >/dev/null 2>&1
# دوباره لاگین برای ادامه (کوکی پاک شد)
$B cookies set imach_locale fa >/dev/null 2>&1
$B open http://localhost:3000/login >/dev/null 2>&1; sleep 2.5
CREG2=$(sref "انتخاب کشور"); [ -n "$CREG2" ] && $B click @$CREG2 >/dev/null 2>&1; sleep 1.5
IRREF2=$(sref "ایران"); [ -n "$IRREF2" ] && $B click @$IRREF2 >/dev/null 2>&1; sleep 1.5
PREF2=$(sref "شماره موبایل"); $B fill @$PREF2 "$NAT" >/dev/null 2>&1; sleep 1
LREF2=$(sref "ورود به آی"); $B click @$LREF2 >/dev/null 2>&1; sleep 8

echo "── 11. desktop shots + console ──"
$B open http://localhost:3000/buy-list >/dev/null 2>&1; sleep 3.5
$B screenshot $SHOTS/20-buylist-1440.png >/dev/null 2>&1
ERR_COUNT=$($B errors 2>/dev/null | grep -c "Error" || true)
echo "  console errors: ${ERR_COUNT:-0}"

echo "── 12. cleanup ──"
curl -sf -X POST $BASE/auth/deleteMe -H "$AH" >/dev/null 2>&1 && ok "deleteMe (user+biz cascaded)" || bad "deleteMe"

echo ""
echo "════ M3 e2e: $PASS pass / $FAIL fail ════"
$B close >/dev/null 2>&1
[ $FAIL -eq 0 ] && exit 0 || exit 1
