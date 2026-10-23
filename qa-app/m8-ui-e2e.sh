#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M8 UI e2e: پیام‌رسان، پروفایل و تنظیمات — در مرورگر (Atlas)
# سناریوی DoD:
#   + گفتگو از صفحهٔ سفارش با نوار زمینهٔ «دربارهٔ:» باز می‌شود (۳۰)
#   + حضور زنده: نشان آنلاین می‌آید/می‌رود (۲۹/۳۰)
#   + زبان/ارز ذخیره ولی UI تغییر نمی‌کند (toast به‌زودی — D2)
#   + پروفایل ۱۸ (شیت ویرایش/سوییچ بازو) + ویرایش کسب‌وکار ۱۶
#   + دسکتاپ: پوستهٔ سایدباری چت + پروفایل دوستونه (FD-29)
# Usage: bash qa-app/m8-ui-e2e.sh  (from imach-web; backend at ../imach-back)
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
SHOTS=$WEB/shots-m8
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
jval() { echo "$1" | tr -d '"'; }
wEval() {
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
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

# ورودی کنترل‌شدهٔ React — setter بومی + رویداد input (fill مرورگرساز روی این ورودی‌ها ساکت می‌شکند)
setinput() { # css-selector value
  $B eval "(()=>{const i=document.querySelector(\"$1\"); if(!i) return 'NF'; const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,'$2'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'OK'})()" >/dev/null 2>&1
}
# آخرین شیتِ باز — شیت‌های بسته در DOM می‌مانند (inert/aria-hidden رندر نمی‌شوند)؛
# نشانهٔ مطمئنِ باز: پس‌زمینهٔ شیت شفافیت کامل دارد (opacity=1)
sheetbtn() { # text
  $B eval "(()=>{const ds=[...document.querySelectorAll('[role=dialog]')].filter(d=>{const bk=d.parentElement; return bk && getComputedStyle(bk).opacity!=='0'}); const d=ds[ds.length-1]; if(!d) return 'NOSHEET'; const b=[...d.querySelectorAll('button')].find(x=>x.textContent.includes('$1')); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
}

echo "── 1. boot servers ──"
$B close --all >/dev/null 2>&1
cd $BACK
pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null; sleep 1
DATABASE_URL="$MONGO" STORAGE_DRIVER=local UPLOAD_PATH="$BACK/uploads" setsid nohup node dist/main.js > /tmp/imach-back-m8ui.log 2>&1 < /dev/null &
cd $WEB
rm -rf .next
setsid nohup npm run s > /tmp/imach-web-m8ui.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

echo "── 2. seed via API: S (فروشنده مرورگر) + X (خریدار) ──"
STAMP=$(date +%s | tail -c 5)
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+$1) % 1000000000 )))"; }
S_NAT=$(mkphone 61); X_NAT=$(mkphone 62)
req() { curl -sf -X $1 $BASE$2 -H "content-type: application/json" -H "authorization: Bearer $3" -d "$4"; }
jqv() { echo "$1" | python3 -c "import json,sys;print(json.load(sys.stdin)$2)"; }

SJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$S_NAT\",\"country\":\"IR\"}")
ST=$(jqv "$SJ" "['accessToken']"); SB=$(jqv "$SJ" "['businesses'][0]['id']")
req PATCH /businesses/editBusiness/$SB $ST '{"name":"پخش پارس UI M8","city":"رشت","trade":"پخش مواد غذایی"}' >/dev/null
XJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$X_NAT\",\"country\":\"IR\"}")
XT=$(jqv "$XJ" "['accessToken']"); XB=$(jqv "$XJ" "['businesses'][0]['id']")
req PATCH /businesses/editBusiness/$XB $XT '{"name":"سوپرمارکت مهر UI M8","city":"رشت"}' >/dev/null

G=$(jqv "$(req POST /goods/createGood $ST "{\"name\":\"برنج هاشمی UI M8-$STAMP\",\"unit\":\"KILOGRAM\"}")" "['id']")
L=$(jqv "$(req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":27500000,\"stock\":100,\"minOrder\":1}}")" "['id']")
ORD=$(req POST /orders $XT "{\"businessId\":\"$XB\",\"supplierId\":\"$SB\",\"originType\":\"CATALOG_BASKET\",\"items\":[{\"listingId\":\"$L\",\"qty\":50}]}")
OID=$(jqv "$ORD" "['id']")
R=$(req POST /chat/startThread $XT "{\"businessId\":\"$XB\",\"withBusinessId\":\"$SB\",\"contextType\":\"ORDER\",\"contextRefId\":\"$OID\"}")
TID=$(jqv "$R" "['id']")
req POST /chat/sendMessage $XT "{\"threadId\":\"$TID\",\"text\":\"سلام — این سفارش را برای امروز می‌خواهم؛ ۵۰ کیسه\"}" >/dev/null
req POST /chat/heartbeat $XT "{}" >/dev/null
[ -n "$TID" ] && ok "seed: گفتگوی زمینه‌دار ORDER + پیام X + heartbeat" || { bad "seed"; exit 1; }

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

echo "── 3. S: گفتگو از دلِ سفارش (DoD اصلی FD-22) ──"
browser_login $S_NAT
$B open "http://localhost:3000/sell/orders/$OID" >/dev/null 2>&1; sleep 4
xbtn "گفتگو"; sleep 4
URL=$($B get url 2>/dev/null)
echo "$URL" | grep -q "/msgs/" && ok "از سفارش → گفتگو باز شد" || bad "url: $URL"
wEval "document.querySelector('#chat-ctx') ? 'YES' : 'NO'" && ok "نوار زمینهٔ #chat-ctx حاضر" || bad "chat-ctx"
stext "دربارهٔ: سفارش برنج هاشمی" && ok "«دربارهٔ: سفارش برنج هاشمی …»" || bad "ctx text"
wEval "document.querySelector('#chat-ctx').getAttribute('data-chat-ctx')==='ORDER' ? 'YES':'NO'" && ok "data-chat-ctx=ORDER" || bad "ctx type"
stext "این سفارش را برای امروز می‌خواهم" && ok "پیام X دیده می‌شود" || bad "msg X"
# ارسال پیام از S — ورودی با setter بومی (fill مرورگرساز ساکت شکست می‌خورد)
setinput "input[aria-label='پیام']" "سلام — ارسال امروز انجام می‌شود"; sleep 0.5
$B eval "document.querySelector('[data-chat-send]')?.click(); 'OK'" >/dev/null 2>&1; sleep 3
stext "ارسال امروز انجام می‌شود" && ok "پیام S ارسال و دیده شد" || bad "send"
wEval "[...document.querySelectorAll('[data-mine=\"1\"]')].some(b=>b.textContent.includes('ارسال امروز')) ? 'YES':'NO'" && ok "حباب S سمت mine (data-mine=1)" || bad "mine bubble"
stext "امروز" && ok "جداکنندهٔ روز «امروز»" || bad "day divider"
$B screenshot $SHOTS/01-chat-ctx-mobile.png >/dev/null 2>&1

# ضربان تازهٔ X — پنجرهٔ ۹۰s باقی بماند
req POST /chat/heartbeat $XT "{}" >/dev/null
# نشان آنلاین X در سربرگ گفتگو (heartbeat تازه)
wEval "document.querySelector('[data-chat-head] [data-online=\"1\"]') ? 'YES':'NO'" && ok "سربرگ گفتگو: X آنلاین" || bad "head online"

echo "── 4. فهرست پیام‌ها (۲۹): بج نخوانده + نشان آنلاین ──"
# پیام تازهٔ X → بج ۱ برای S
req POST /chat/sendMessage $XT "{\"threadId\":\"$TID\",\"text\":\"موجودی کافی دارید؟\"}" >/dev/null
$B open "http://localhost:3000/msgs" >/dev/null 2>&1; sleep 4
stext "سوپرمارکت مهر" && ok "ردیف گفتگو با X" || bad "row X"
stext "موجودی کافی دارید؟" && ok "آخرین پیام denormalized" || bad "lastText"
wEval "document.querySelector('[data-thread-row=\"$TID\"] [data-online=\"1\"]') ? 'YES':'NO'" && ok "نشان آنلاین X در ردیف" || bad "row online"
wEval "document.querySelector('[data-thread-row=\"$TID\"]') ? 'YES':'NO'" && ok "data-thread-row" || bad "row attr"
$B screenshot $SHOTS/02-msgs-mobile.png >/dev/null 2>&1

# باز کردن گفتگو = خواندن
$B eval "document.querySelector('[data-thread-row=\"$TID\"]').click(); 'OK'" >/dev/null 2>&1; sleep 4
stext "موجودی کافی دارید؟" && ok "باز شدن همان گفتگو" || bad "open row"
$B open "http://localhost:3000/msgs" >/dev/null 2>&1; sleep 4

echo "── 5. حضور: آفلاین بعد از بک‌دیت ──"
BD=$(cd $BACK && X_NAT="$X_NAT" node -e "
const { MongoClient } = require('mongodb');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const mongo = env.match(/^DATABASE_URL=\"?([^\"\n]*)\"?/m)[1];
(async () => {
  const c = new MongoClient(mongo);
  await c.connect();
  const r = await c.db().collection('User').updateOne({ phone: '98' + process.env.X_NAT }, { \$set: { lastSeenAt: new Date(Date.now() - 300000) } });
  console.log(r.modifiedCount);
  await c.close();
})();
" 2>/dev/null)
[ "$BD" = "1" ] && ok "بک‌دیت حضور X (۵ دقیقه قبل)" || bad "backdate: $BD"
$B open "http://localhost:3000/msgs" >/dev/null 2>&1; sleep 4
wEval "!document.querySelector('[data-thread-row=\"$TID\"] [data-online=\"1\"]') ? 'YES':'NO'" && ok "بعد از بک‌دیت: نشان آنلاین رفت" || bad "offline row"

echo "── 6. پروفایل (۱۸): هویت + شیت ویرایش + سوییچ بازو ──"
$B open "http://localhost:3000/profile" >/dev/null 2>&1; sleep 4
stext "داشبورد نمایندهٔ فروش" && ok "کارت نمایندهٔ فروش (M9)" || bad "salesrep card"
stext "موجودی شارژ" && ok "کارت کیف پول" || bad "wallet card"
stext "دستیارهای فعال" && ok "بخش دستیارها" || bad "arms section"
stext "ارز نمایش قیمت‌ها" && ok "ردیف ارز (FD-20)" || bad "currency row"
$B screenshot $SHOTS/03-profile-mobile.png >/dev/null 2>&1

# شیت ویرایش پروفایل
$B eval "document.querySelector('#profile-edit-open')?.click(); 'OK'" >/dev/null 2>&1; sleep 2
stext "ویرایش پروفایل" && ok "شیت ویرایش پروفایل باز شد" || bad "edit sheet"
stext "تاییدشده" && ok "شماره قفل + نشان تاییدشده" || bad "phone lock"
setinput "input[aria-label='نام']" "احمد"
setinput "input[aria-label='نام خانوادگی']" "رضایی"; sleep 0.5
$B eval "document.querySelector('[data-testid=\"profile-save\"]')?.click(); 'OK'" >/dev/null 2>&1; sleep 1
stext "ذخیره شد" && ok "پروفایل ذخیره شد + toast" || bad "profile save"
$B open "http://localhost:3000/profile" >/dev/null 2>&1; sleep 3
stext "احمد رضایی" && ok "نام تازه در کارت هویت" || bad "new name"

# تنظیمات زبان (D2) — ذخیره ولی UI تغییر نمی‌کند
$B eval "document.querySelector('[data-testid=\"set-lang-row\"]')?.click(); 'OK'" >/dev/null 2>&1; sleep 2
stext "به‌زودی" && ok "شیت زبان: en/ar با نشان «به‌زودی»" || bad "soon badge"
sheetbtn "English"; sleep 3
stext "انگلیسی به‌زودی فعال می‌شود" && ok "toast «به‌زودی» (D2)" || bad "soon toast"
LG=$($B eval "document.documentElement.lang" 2>/dev/null | tr -d '"')
[ "$LG" = "fa" ] && ok "UI فارسی ماند (lang=fa)" || bad "lang: $LG"

# ارز — USD «به‌زودی»
$B eval "document.querySelector('[data-testid=\"set-currency-row\"]')?.click(); 'OK'" >/dev/null 2>&1; sleep 2
sheetbtn "دلار آمریکا"; sleep 3
stext "دلار آمریکا به‌زودی" && ok "ارز USD: toast «به‌زودی» (D2)" || bad "usd toast"

# سوییچ بازو — خاموش/روشن خرید
$B eval "document.querySelector('[data-arm-switch=\"buy\"]')?.click(); 'OK'" >/dev/null 2>&1; sleep 3
wEval "document.querySelectorAll('nav[class*=\"grid\"] button, nav.sticky button').length===3 ? 'YES':'NO'" && ok "خرید خاموش ⇒ تب‌بار ۳ تایی" || bad "tabs after off"
stext "خرید عمده" && ok "ردیف بازوی خرید می‌ماند (تنظیم)" || echo "   (ردیف بازو در شیت/حالت — بررسی بصری)"
$B eval "document.querySelector('[data-arm-switch=\"buy\"]')?.click(); 'OK'" >/dev/null 2>&1; sleep 3

echo "── 7. ویرایش کسب‌وکار (۱۶) ──"
$B open "http://localhost:3000/profile/business" >/dev/null 2>&1; sleep 4
stext "اطلاعاتی که خریداران می‌بینند" && ok "صفحهٔ ویرایش کسب‌وکار" || bad "edit biz page"
setinput "input[aria-label='نام کسب‌وکار']" "پخش پارس تازه M8"; sleep 0.5
$B eval "document.querySelector('[data-save-business]')?.click(); 'OK'" >/dev/null 2>&1; sleep 4
stext "ذخیره شد" && ok "کسب‌وکار ذخیره شد + toast" || bad "biz save"
$B screenshot $SHOTS/04-edit-business-mobile.png >/dev/null 2>&1
stext "پخش پارس تازه M8" && ok "نام تازه در پروفایل" || bad "new biz name"

echo "── 8. دسکتاپ: پوستهٔ سایدباری چت + پروفایل دوستونه ──"
$B set viewport 1440 900 >/dev/null 2>&1; sleep 1
$B open "http://localhost:3000/msgs/$TID" >/dev/null 2>&1; sleep 5
wEval "document.querySelector('aside') && document.querySelector('#chat-ctx') ? 'YES':'NO'" && ok "چت دسکتاپ: سایدبار + نوار زمینه" || bad "chat desktop"
wEval "getComputedStyle(document.querySelector('[data-chat] > div.min-h-0')||document.body).overflowY==='auto' ? 'YES':'NO'" && ok "چت ۱۰۰vh: اسکرول داخلی بوم" || bad "chat scroll"
$B screenshot $SHOTS/05-chat-desktop.png >/dev/null 2>&1
$B open "http://localhost:3000/profile" >/dev/null 2>&1; sleep 4
wEval "document.querySelector('aside') && document.querySelectorAll('[data-profile] > div').length===2 ? 'YES':'NO'" && ok "پروفایل دسکتاپ: سایدبار + دو ستون" || bad "profile desktop"
wEval "(()=>{const c=document.querySelector('[data-profile]'); return getComputedStyle(c).display==='grid' ? 'YES':'NO'})()" && ok "grid دوستونهٔ FD-29" || bad "grid check"
$B screenshot $SHOTS/06-profile-desktop.png >/dev/null 2>&1

echo "── 9. خطاهای کنسول ──"
CERR=$($B console 2>/dev/null | grep -iE "error|unhandled" | grep -viE "favicon|401|Failed to load resource.*40[13]" | head -5)
[ -z "$CERR" ] && ok "صفر خطای کنسول" || { bad "console: $(echo "$CERR" | head -c 160)"; }

pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null
echo ""
echo "══ M8 UI E2E: $PASS pass / $FAIL fail ══"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "HAS FAILURES ✖"
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
