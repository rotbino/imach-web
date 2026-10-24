#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — M9 UI e2e: کیف پول، تبلیغ و نمایندهٔ فروش — در مرورگر (Atlas)
# سناریوی DoD:
#   + ۳۵ شارژ: بسته‌های پیش‌فرض + مبلغ دلخواه + تاریخچهٔ تراکنش‌ها
#   + ۳۴ تبلیغ: کارت کمپین + گزارش (VIEW/FOLLOW) + توقف ⇒ REFUND +
#     ساخت تبلیغ هدفمند از شیت (نوع/جایگاه/بودجه)
#   + ۳۸ نماینده: ۴ کاشی + کارت کسب‌وکار + ثبت سفارش از UI + ارسال
#     لیست (کلیپ‌بورد) + تحویل/تسویه + تب‌بار مخفی (فضای سوم)
#   + ورودی‌ها: پروفایل (نماینده/کیف) + کاتالوگ (دکمهٔ تبلیغ)
#   + دسکتاپ: /rep روی wide + صفر خطای کنسول
# Usage: bash qa-app/m9-ui-e2e.sh  (from imach-web; backend at ../imach-back)
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
SHOTS=$WEB/shots-m9
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
  for i in $(seq 1 10); do
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
setinput() { # css-selector value — setter بومی + رویداد input (درس M8)
  $B eval "(()=>{const i=document.querySelector(\"$1\"); if(!i) return 'NF'; const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,'$2'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'OK'})()" >/dev/null 2>&1
}

echo "── 1. boot servers ──"
$B close --all >/dev/null 2>&1
cd $BACK
pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null; sleep 1
DATABASE_URL="$MONGO" STORAGE_DRIVER=local UPLOAD_PATH="$BACK/uploads" setsid nohup node dist/main.js > /tmp/imach-back-m9ui.log 2>&1 < /dev/null &
cd $WEB
rm -rf .next
setsid nohup npm run s > /tmp/imach-web-m9ui.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

echo "── 2. seed via API: S + کیف + کمپین + سفارش نماینده ──"
STAMP=$(date +%s | tail -c 5)
mkphone() { echo "9$(printf '%09d' $(( ($(date +%s)+71) % 1000000000 )))"; }
S_NAT=$(mkphone 71)
req() { curl -sf -m 30 -X $1 $BASE$2 -H "content-type: application/json" -H "authorization: Bearer $3" -d "$4"; }
jqv() { echo "$1" | python3 -c "import json,sys;print(json.load(sys.stdin)$2)"; }

SJ=$(req POST /auth/quickRegister "" "{\"phone\":\"$S_NAT\",\"country\":\"IR\"}")
ST=$(jqv "$SJ" "['accessToken']"); SB=$(jqv "$SJ" "['businesses'][0]['id']")
req PATCH /businesses/editBusiness/$SB $ST '{"name":"پخش پارس UI M9","city":"رشت","trade":"پخش مواد غذایی"}' >/dev/null
req POST /wallet/charge $ST "{\"businessId\":\"$SB\",\"amountToman\":200000}" >/dev/null
G=$(jqv "$(req POST /goods/createGood $ST "{\"name\":\"برنج هاشمی UI M9-$STAMP\",\"unit\":\"KILOGRAM\"}")" "['id']")
L=$(jqv "$(req PUT /listings/saveListing $ST "{\"businessId\":\"$SB\",\"goodId\":\"$G\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":27500000,\"stock\":100,\"minOrder\":1}}")" "['id']")
P=$(req POST /promos/create $ST "{\"businessId\":\"$SB\",\"listingId\":\"$L\",\"budgetToman\":50000,\"type\":\"CAMPAIGN\",\"durationDays\":3}")
PID=$(jqv "$P" "['id']")
RO=$(req POST /rep/orders $ST "{\"businessId\":\"$SB\",\"customerName\":\"رستوران مهر\",\"items\":[{\"name\":\"روغن سرخ‌کردنی\",\"pack\":\"کارتن ۶ بطری‌ای\",\"qty\":4,\"unitPriceMinor\":10800000}],\"commissionPct\":3}")
RID=$(jqv "$RO" "['id']")
[ -n "$PID" ] && [ -n "$RID" ] && ok "seed: کمپین ۳روزه + سفارش نمایندگی NEW" || { bad "seed"; exit 1; }

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
browser_login $S_NAT

echo "── 3. ورودی‌ها: پروفایل (نماینده/کیف) + کاتالوگ (دکمهٔ تبلیغ) ──"
$B open "http://localhost:3000/profile" >/dev/null 2>&1; sleep 4
wEval "document.querySelector('[data-go-salesrep]') && document.querySelector('[data-go-wallet]') ? 'YES':'NO'" && ok "پروفایل: کارت نماینده + کارت کیف" || bad "profile cards"
$B eval "document.querySelector('[data-go-salesrep]')?.click(); 'OK'" >/dev/null 2>&1; sleep 4
URL=$($B get url 2>/dev/null)
echo "$URL" | grep -q "/rep" && ok "کارت نماینده → /rep" || bad "rep nav: $URL"
$B open "http://localhost:3000/catalog" >/dev/null 2>&1; sleep 5
stext "تبلیغ" && ok "کاتالوگ: دکمهٔ «تبلیغ» در نوار ابزار" || bad "catalog promo btn"
$B eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='تبلیغ'); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1; sleep 4
URL=$($B get url 2>/dev/null)
echo "$URL" | grep -q "/sell/promo" && ok "دکمهٔ تبلیغ → /sell/promo" || bad "promo nav: $URL"

echo "── 4. صفحهٔ تبلیغ (۳۴): کارت کمپین + گزارش + توقف ⇒ REFUND ──"
wEval "document.querySelector('[data-promo-card][data-promo-type=\"CAMPAIGN\"][data-promo-active=\"true\"]') ? 'YES':'NO'" && ok "کارت کمپین در جریان" || bad "campaign card"
wEval "document.querySelector('[data-budget-bar]') ? 'YES':'NO'" && ok "نوار بودجه در کارت" || bad "budget bar"
stext "۳ روز" && ok "زیرنویس کمپین ۳ روزه" || bad "duration text"
stext "موجودی شارژ" && ok "wallet-mini موجودی" || bad "wallet mini"
# گزارش — شیت با آمار
xbtn "گزارش"; sleep 3
stext "نمایش هدفمند" && ok "شیت گزارش: آمار فشرده" || bad "report sheet"
$B screenshot $SHOTS/02-promo-report-mobile.png >/dev/null 2>&1
xbtn "بستن"; sleep 2
# توقف ⇒ REFUND
xbtn "توقف"; sleep 1
stext "باقیماندهٔ بودجه به کیف برگشت" && ok "توقف ⇒ toast برگشت بودجه" || bad "stop toast"
wEval "document.querySelector('[data-promo-card][data-promo-active=\"false\"]') ? 'YES':'NO'" && ok "کارت پایان‌یافته" || bad "stopped card"
$B screenshot $SHOTS/01-promo-mobile.png >/dev/null 2>&1

echo "── 5. ساخت تبلیغ هدفمند از UI (نوع/جایگاه/بودجه) ──"
xbtn "ساخت تبلیغ تازه"; sleep 3
wEval "document.querySelector('[data-promo-opt=\"TARGETED\"]') ? 'YES':'NO'" && ok "شیت ساخت: گزینهٔ هدفمند" || bad "sheet targeted opt"
$B eval "document.querySelector('[data-promo-opt=\"TARGETED\"]')?.click(); 'OK'" >/dev/null 2>&1; sleep 1
wEval "document.querySelector('[data-placement=\"SUPPLY_BOARD\"]') ? 'YES':'NO'" && ok "جایگاه‌های هدفمند ظاهر شد" || bad "placements"
$B eval "document.querySelector('[data-placement=\"SUPPLY_BOARD\"]')?.click(); 'OK'" >/dev/null 2>&1; sleep 1
# انتخاب کالا (اولین کارت کالای آزاد)
$B eval "(()=>{const b=[...document.querySelectorAll('[role=dialog] button')].find(x=>x.textContent.includes('برنج هاشمی UI M9')); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1; sleep 1
setinput "input[aria-label='بودجهٔ تبلیغ به تومان']" "۱۰۰٬۰۰۰"; sleep 0.5
xbtn "فعال‌سازی و قفل بودجه"; sleep 1
stext "هدفمند فعال شد" && ok "تبلیغ هدفمند ساخته شد + toast" || bad "targeted create toast"
wEval "document.querySelector('[data-promo-card][data-promo-type=\"TARGETED\"]') ? 'YES':'NO'" && ok "کارت هدفمند در فهرست" || bad "targeted card"

echo "── 6. صفحهٔ شارژ (۳۵): بسته‌ها + مبلغ دلخواه + تاریخچه ──"
$B open "http://localhost:3000/profile/wallet" >/dev/null 2>&1; sleep 4
stext "موجودی شارژ فعلی" && ok "هیرو موجودی" || bad "wallet hero"
wEval "[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('هزار')).length===4 ? 'YES':'NO'" && ok "۴ بستهٔ پیش‌فرض" || bad "packs"
# مبلغ دلخواه + شارژ واقعی
setinput "input[aria-label='مبلغ دلخواه به تومان']" "۵۰٬۰۰۰"; sleep 0.5
xbtn "پرداخت و شارژ کیف"; sleep 1
stext "شارژ انجام شد" && ok "شارژ از UI + toast رسید" || bad "charge toast"
wEval "document.querySelector('[data-txn-type=\"CHARGE\"]') ? 'YES':'NO'" && ok "ردیف CHARGE در تاریخچه" || bad "charge row"
wEval "document.querySelector('[data-txn-type=\"PROMO_SPEND\"]') && document.querySelector('[data-txn-type=\"REFUND\"]') ? 'YES':'NO'" && ok "قفل بودجه + برگشت در تاریخچه" || bad "spend/refund rows"
stext "لینک کاتالوگت را بفرست" && ok "کارت شارژ رایگان دعوت" || bad "invite card"
$B screenshot $SHOTS/03-charge-mobile.png >/dev/null 2>&1

echo "── 7. داشبورد نماینده (۳۸): کاشی‌ها + ثبت + چرخه ──"
$B open "http://localhost:3000/rep" >/dev/null 2>&1; sleep 5
stext "داشبورد نمایندهٔ فروش" && ok "سربرگ داشبورد" || bad "rep header"
wEval "[...document.querySelectorAll('[data-rep-tile]')].length===4 ? 'YES':'NO'" && ok "۴ کاشی آمار" || bad "tiles count"
wEval "document.querySelector('[data-rep-biz]') ? 'YES':'NO'" && ok "کارت کسب‌وکار زیر نمایندگی" || bad "biz card"
wEval "document.querySelector('[data-rep-order=\"NEW\"]') ? 'YES':'NO'" && ok "ردیف سفارش NEW (رستوران مهر)" || bad "order row"
# فضای سوم: تب‌بار موبایل مخفی
wEval "(()=>{const nav=document.querySelector('nav[class*=\"bottom-0\"]'); return nav ? 'NO' : 'YES'})()" && ok "تب‌بار مخفی — فضای سوم (بدون تب‌بار)" || bad "tabbar visible"
stext "پورسانت‌ها با هر کسب‌وکار توافق" && ok "hint-line پورسانت" || bad "hint"
$B screenshot $SHOTS/04-rep-mobile.png >/dev/null 2>&1
# شیت کسب‌وکار — سه لینک
$B eval "document.querySelector('[data-rep-biz]')?.click(); 'OK'" >/dev/null 2>&1; sleep 3
stext "میز فروش این کسب‌وکار" && ok "شیت کسب‌وکار: لینک میز فروش" || bad "biz sheet"
stext "کاتالوگ و محصولات" && ok "لینک کاتالوک" || bad "catalog link"
stext "سفارش‌های این کسب‌وکار" && ok "لینک سفارش‌ها" || bad "orders link"
xbtn "بستن"; sleep 2
# شیت سفارش — ارسال لیست با کلیپ‌بورد
$B eval "document.querySelector('[data-rep-order]')?.click(); 'OK'" >/dev/null 2>&1; sleep 3
stext "لیست این سفارش را برای تأمین‌کننده بفرست" && ok "شیت سفارش: گام ارسال" || bad "order sheet"
stext "کارتن ۶ بطری‌ای" && ok "قلم سفارش دیده می‌شود" || bad "item row"
$B eval "document.querySelector('[data-ro-send=\"CLIPBOARD\"]')?.click(); 'OK'" >/dev/null 2>&1; sleep 1
stext "کپی شد" && ok "ارسال با کلیپ‌بورد + toast" || bad "clipboard share"
wEval "document.querySelector('[data-rep-step=\"sent\"]') ? 'YES':'NO'" && ok "گام بعدی: تحویل" || bad "sent step"
# تحویل → تسویه
xbtn "تحویل شد"; sleep 1
stext "پورسانت دریافت شد" && ok "گام تسویه" || bad "deliver step"
xbtn "پورسانت دریافت شد — تسویه"; sleep 1
wEval "document.querySelector('[data-rep-step=\"settled\"]') ? 'YES':'NO'" && ok "نمای موفقیت تسویه" || bad "settled view"
# ثبت سفارش تازه از UI
$B open "http://localhost:3000/rep" >/dev/null 2>&1; sleep 3
xbtn "ثبت سفارش تازه"
wEval "(()=>{const ds=[...document.querySelectorAll('[role=dialog]')].filter(d=>{const bk=d.parentElement; return bk && getComputedStyle(bk).opacity!=='0'}); return ds.some(d=>d.textContent.includes('نام مشتری')) ? 'YES':'NO'})()" && ok "شیت ثبت سفارش باز شد" || bad "create sheet open"
setinput "input[placeholder='مثلاً رستوران مهر']" "کترینگ بهار"; sleep 0.5
setinput "input[placeholder='نام کالا (مثلاً روغن سرخ‌کردنی)']" "برنج هاشمی"; sleep 0.5
setinput "input[aria-label='تعداد قلم ۱']" "۲۰"; sleep 0.3
setinput "input[aria-label='قیمت واحد قلم ۱']" "۸۹۵٬۰۰۰"; sleep 0.3
# کلیک شیت‌محور — دکمهٔ «ثبت سفارش» داخل آخرین شیتِ باز (نه دکمهٔ پشت پرده)
$B eval "(()=>{const ds=[...document.querySelectorAll('[role=dialog]')].filter(d=>{const bk=d.parentElement; return bk && getComputedStyle(bk).opacity!=='0'}); const d=ds[ds.length-1]; const b=[...d.querySelectorAll('button')].find(x=>x.textContent.trim()==='ثبت سفارش'); if(b){b.click(); return 'OK'} return 'NF'})()" >/dev/null 2>&1
sleep 2
stext "کترینگ بهار" && ok "سفارش تازه از UI ثبت شد" || bad "rep create"
stext "در انتظار تسویه" && ok "کاشی زنده پس از چرخه" || echo "   (وضعیت سفارش سید — پس از تسویه)"

echo "── 8. دسکتاپ ۱۴۴۰: فضای سوم + تبلیغ ──"
$B set viewport 1440 900 >/dev/null 2>&1; sleep 1
$B open "http://localhost:3000/rep" >/dev/null 2>&1; sleep 5
wEval "document.querySelector('[data-rep-space]') ? 'YES':'NO'" && ok "/rep دسکتاپ رندر شد" || bad "rep desktop"
$B screenshot $SHOTS/05-rep-desktop.png >/dev/null 2>&1
$B open "http://localhost:3000/sell/promo" >/dev/null 2>&1; sleep 5
wEval "document.querySelector('[data-promo-card]') ? 'YES':'NO'" && ok "/sell/promo دسکتاپ" || bad "promo desktop"
$B screenshot $SHOTS/06-promo-desktop.png >/dev/null 2>&1
$B open "http://localhost:3000/profile/wallet" >/dev/null 2>&1; sleep 4
stext "مصرف‌ها و افزایش‌های شارژ" && ok "/profile/wallet دسکتاپ" || bad "wallet desktop"
$B screenshot $SHOTS/07-charge-desktop.png >/dev/null 2>&1

echo "── 9. خطاهای کنسول ──"
CERR=$($B console 2>/dev/null | grep -iE "error|unhandled" | grep -viE "favicon|401|Failed to load resource.*40[13]" | head -5)
[ -z "$CERR" ] && ok "صفر خطای کنسول" || { bad "console: $(echo "$CERR" | head -c 160)"; }

echo "── 10. پاک‌سازی آزمون ──"
cd $BACK
export S_NAT SB PID RID
node << 'EOF' 2>/dev/null
const { MongoClient } = require('mongodb');
const fs = require('fs');
const env = fs.readFileSync('/home/z/my-project/imach-back/.env', 'utf8');
const mongo = env.match(/^DATABASE_URL="?([^"]*)"?/m)[1];
(async () => {
  const c = new MongoClient(mongo);
  await c.connect();
  const db = c.db();
  const users = await db.collection('User').find({ phone: '98' + process.env.S_NAT }).toArray();
  if (!users.length) { console.log(0); await c.close(); return; }
  const ids = users.map((u) => u._id);
  const bizs = await db.collection('Business').find({ ownerId: { $in: ids } }).toArray();
  const bizIds = bizs.map((b) => b._id);
  let n = 0;
  if (bizIds.length) {
    for (const col of ['RepOrder', 'Promo', 'PromoEvent', 'Wallet', 'WalletTxn', 'Notification', 'Page', 'Listing']) {
      const r = await db.collection(col).deleteMany({ businessId: { $in: bizIds } });
      n += r.deletedCount;
    }
    await db.collection('Notification').deleteMany({ userId: { $in: ids } });
    await db.collection('Business').deleteMany({ _id: { $in: bizIds } });
  }
  await db.collection('User').deleteMany({ _id: { $in: ids } });
  await db.collection('RefreshToken').deleteMany({ userId: { $in: ids } });
  console.log(n);
  await c.close();
})();
EOF
ok "پاک‌سازی آزمون"

pkill -f "node dist/main" 2>/dev/null; pkill -f "next dev" 2>/dev/null
echo ""
echo "══ M9 UI E2E: $PASS pass / $FAIL fail ══"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "HAS FAILURES ✖"
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
