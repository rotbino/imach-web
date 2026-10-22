#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — fix-batch M3 e2e (فیکس‌بچ مالک پس از M3): موبایل با صفر ·
# امتیاز ثبت‌نام ۵ · میزهای ۴-کاشی · شورون به بیرون · دستِ pointer ·
# مدیریت دسته‌ها + عدم نمایش · ویرایش کامل کالا (گالری/تخفیف/حذف) ·
# CTA نوع کالای جدید فقط با لیست خالی · ثبت برند جدید
# Usage: bash qa-app/fix1-e2e.sh  (from imach-web; backend at ../imach-back)
# درس‌های نسخهٔ ۱: خروجی eval با کوتیشن JSON می‌آید (tr -d '"') ·
# snapshot متن را نرمال می‌کند (بدون ZWNJ) · نامِ دسترسیِ input = label
# نه placeholder · scale است نه transform (Tailwind v4) · jget دو-مرحله‌ای
# روی repr پایتون می‌شکند (پارس تک‌مرحله‌ای).
# ═══════════════════════════════════════════════════════════════════
set -u
ROOT=/home/z/my-project
WEB=$ROOT/imach-web
BACK=$ROOT/imach-back
SHOTS=$WEB/shots-fix2
mkdir -p $SHOTS
BASE=http://127.0.0.1:4000/api/v1
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "✔ $1"; }
bad() { FAIL=$((FAIL+1)); echo "✖ $1"; }
B=agent-browser

sref()  { $B snapshot -i 2>/dev/null | grep -F "$1" | grep -oE 'ref=e[0-9]+' | head -1 | cut -d= -f2; }
srefb() { $B snapshot -i 2>/dev/null | grep -F -- '- button "' | grep -F "$1" | grep -oE 'ref=e[0-9]+' | head -1 | cut -d= -f2; }
# خروجی eval: JSON string → بدون کوتیشن
ev()   { $B eval "$1" 2>/dev/null | tail -1 | tr -d '"'; }
# مقدارگذاری input کنترل‌شدهٔ React (setter بومی + رویداد input)
rfill() { ev "(()=>{const set=(el,v)=>{const p=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;p.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};const f=[...document.querySelectorAll('input')].find(i=>(i.getAttribute('aria-label')||'').$1);if(!f)return 'nf';set(f,'$2');return 'ok'})()"; }
jp()   { python3 -c "import json,sys;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

echo "── 1. boot servers ──"
pkill -f "node dist/main.js" 2>/dev/null; pkill -f "next start" 2>/dev/null; sleep 1
cd $BACK
export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
setsid nohup node dist/main.js > /tmp/imach-back-fix.log 2>&1 < /dev/null &
cd $WEB
setsid nohup npm run start > /tmp/imach-web-fix.log 2>&1 < /dev/null &
for i in $(seq 1 60); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

echo "── 2. API: ثبت‌نام = ۵ امتیاز + پرچم دسته‌ها + کالای آزمون ──"
NAT="9$(printf '%09d' $(( $(date +%s) % 1000000000 )))"
curl -sf -X POST $BASE/auth/quickRegister -H 'content-type: application/json' \
  -d "{\"phone\":\"$NAT\",\"country\":\"IR\"}" > /tmp/fix1-qr.json && ok "quickRegister 0$NAT" || bad "quickRegister"
TOKEN=$(jp "['accessToken']" < /tmp/fix1-qr.json)
BIZ=$(jp "['businesses'][0]['id']" < /tmp/fix1-qr.json)
SS=$(jp "['businesses'][0]['scoreSell']" < /tmp/fix1-qr.json)
SB=$(jp "['businesses'][0]['scoreBuy']" < /tmp/fix1-qr.json)
[ "$SS" = "5" ] && [ "$SB" = "5" ] && ok "signup score sell/buy = 5/5" || bad "signup score: $SS/$SB"
AH="authorization: Bearer $TOKEN"
curl -sf -X PATCH $BASE/businesses/editBusiness/$BIZ -H "$AH" -H 'content-type: application/json' \
  -d '{"name":"سوپرمارکت تست فیکس","city":"رشت","trade":"سوپرمارکت","catalogCategoriesHidden":true}' >/dev/null \
  && ok "editBusiness hidden=true" || bad "editBusiness"
HID=$(curl -sf "$BASE/businesses/getMyBusinesses" -H "$AH" | jp "[0]['catalogCategoriesHidden']")
[ "$HID" = "True" ] && ok "hidden flag round-trips" || bad "hidden flag: $HID"
curl -sf -X PATCH $BASE/businesses/editBusiness/$BIZ -H "$AH" -H 'content-type: application/json' \
  -d '{"catalogCategoriesHidden":false}' >/dev/null
# کالای آزمون (برای شیت دسته‌ها قبل از UI — ردیف چیپ فقط با کالا/دسته رندر می‌شود)
GOOD_ID=$(curl -sf "$BASE/goods/getGoods?q=%D8%A8%D8%B1%D9%86%D8%AC&limit=1" | jp "['items'][0]['id']")
SAVE=$(curl -sf -X PUT $BASE/listings/saveListing -H "$AH" -H 'content-type: application/json' -d "{\"businessId\":\"$BIZ\",\"goodId\":\"$GOOD_ID\",\"mode\":\"SELL\",\"sell\":{\"priceMinor\":28500000,\"stock\":35,\"minOrder\":5},\"title\":\"کیسه ۵۰ کیلویی\",\"baseQty\":50}")
LID=$(echo "$SAVE" | jp "['id']")
[ -n "$LID" ] && ok "listing created ($LID)" || bad "listing create: $SAVE"

echo "── 3. browser: لاگین — صفر موبایل + blur + پلیس‌هولدر ──"
$B open http://localhost:3000/login >/dev/null 2>&1
$B cookies clear >/dev/null 2>&1
$B cookies set imach_locale fa >/dev/null 2>&1
$B set viewport 1280 800 >/dev/null 2>&1
$B open http://localhost:3000/login >/dev/null 2>&1
$B wait --load networkidle >/dev/null 2>&1; sleep 2
CREG=$(sref "انتخاب کشور"); [ -n "$CREG" ] && $B click @$CREG >/dev/null 2>&1
sleep 1.5
IRREF=$(sref "ایران"); [ -n "$IRREF" ] && $B click @$IRREF >/dev/null 2>&1
sleep 1.5
PREF=$(sref "شماره موبایل")
$B fill @$PREF "09121234567" >/dev/null 2>&1; sleep 0.6
V1=$($B get value @$PREF 2>/dev/null | head -1 | tr -d '"')
[ "$V1" = "09121234567" ] && ok "zero-typing: 11 digits kept ($V1)" || bad "zero-typing: [$V1]"
PWREF=$(sref "رمز ورود")
[ -n "$PWREF" ] && $B click @$PWREF >/dev/null 2>&1; sleep 0.8
V2=$($B get value @$PREF 2>/dev/null | head -1 | tr -d '"')
if [ "$V2" != "9121234567" ]; then
  # تلاش دوم: فوکوس برنامه‌ای رمز → blur موبایل (مقاوم به رقتی snapshot/ref)
  $B eval "(()=>{const i=[...document.querySelectorAll('input')].find(x=>x.type==='password');if(i){i.focus();return 'ok'}return 'nf'})()" >/dev/null 2>&1
  sleep 1
  V2=$($B get value @$PREF 2>/dev/null | head -1 | tr -d '"')
fi
[ "$V2" = "9121234567" ] && ok "blur strips leading zero ($V2)" || bad "blur strip: [$V2]"
PHP=$(ev "document.querySelector('input[type=password]').placeholder")
[ -z "$PHP" ] && ok "password placeholder empty" || bad "password placeholder: [$PHP]"
$B fill @$PREF "$NAT" >/dev/null 2>&1; sleep 0.6
LREF=$(sref "ورود به آی"); $B click @$LREF >/dev/null 2>&1; sleep 8
URL=$($B get url 2>/dev/null)
case "$URL" in *"/sell"*|*"/home"*|*"/start"*|*"/me"*) ok "logged in";; *) bad "login url: $URL";; esac
# چیپ امتیاز باید ۵ نشان دهد (نه صفر)
SCORET=$(srefb "امتیاز فعالیت")
[ -n "$SCORET" ] && ok "score chip in appbar" || bad "score chip missing"
SCV=$(ev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>(x.getAttribute('aria-label')||'').includes('امتیاز'));return b?b.innerText.trim():'nf'})()")
echo "$SCV" | grep -q "۵" && ok "score chip shows ۵ ($SCV)" || bad "score chip: [$SCV]"
$B screenshot $SHOTS/01-login.png >/dev/null 2>&1

echo "── 4. میز فروش: ۴ کاشی + فقط-عدد + آیکون لخت + مربع + دست + شورون ──"
$B open http://localhost:3000/sell >/dev/null 2>&1; sleep 4
$B wait --text "سفارشات رسیده" >/dev/null 2>&1 && ok "4th tile: سفارشات رسیده" || bad "orders tile missing"
TILE_TXT=$(ev "(()=>{const t=[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('کاتالوگ من'));return t?t.innerText.replace(/\\n/g,'|'):''})()")
echo "  tile text: [$TILE_TXT]"
echo "$TILE_TXT" | grep -q "محصول" && bad "tile shows unit word (محصول)" || ok "tile number-only (no unit word)"
NAKED=$(ev "(()=>{const g=document.querySelector('main .grid');return g?[...g.querySelectorAll('[class*=bg-]')].filter(e=>e.tagName!=='BUTTON').length:-1})()")
[ "$NAKED" = "0" ] && ok "tile icons naked (no bg chip)" || bad "tile bg chips: $NAKED"
BOX=$(ev "(()=>{const t=[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('کاتالوگ من'));const r=t.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)})()")
echo "  tile box: $BOX"
W=$(echo $BOX | cut -dx -f1); H=$(echo $BOX | cut -dx -f2)
[ "${W:-0}" -le 230 ] && [ "${H:-0}" -ge 150 ] && ok "tile near-square ($BOX)" || bad "tile box: $BOX"
CUR=$(ev "(()=>{const t=[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('کاتالوگ من'));return getComputedStyle(t).cursor})()")
[ "$CUR" = "pointer" ] && ok "tile cursor: pointer" || bad "tile cursor: $CUR"
# شورون: Tailwind v4 با پراپرتی scale آینه می‌کند (نه transform)
CHEV=$(ev "(()=>{const u=[...document.querySelectorAll('svg use')].find(x=>x.getAttribute('href')==='#i-chev');return u?getComputedStyle(u.parentElement).scale:'nf'})()")
echo "  chev scale (RTL): $CHEV"
echo "$CHEV" | grep -q "\-1" && ok "RTL chevron mirrored → outward (left)" || bad "RTL chev: $CHEV"
$B screenshot $SHOTS/02-sell-desk.png >/dev/null 2>&1

echo "── 5. صفحه‌های سفارش (خالیِ صادقانه) ──"
$B open http://localhost:3000/sell/orders >/dev/null 2>&1; sleep 3
$B wait --text "هنوز سفارشی نرسیده" >/dev/null 2>&1 && ok "/sell/orders empty-state" || bad "/sell/orders"
$B open http://localhost:3000/home/orders >/dev/null 2>&1; sleep 3
$B wait --text "سفارش" >/dev/null 2>&1 && ok "/home/orders opens" || bad "/home/orders"

echo "── 6. کاتالوگ: شیت مدیریت دسته‌ها + عدم نمایش ──"
$B open http://localhost:3000/catalog >/dev/null 2>&1; sleep 4
GEAR=$(ev "(()=>{const b=document.querySelector('button[aria-label=\\\"مدیریت دسته‌بندی‌ها\\\"]');return b?'found':'missing'})()")
[ "$GEAR" = "found" ] && ok "manage-categories icon present" || bad "manage icon: $GEAR"
$B eval "document.querySelector('button[aria-label=\\\"مدیریت دسته‌بندی‌ها\\\"]').click()" >/dev/null 2>&1
sleep 2
# عنوان شیت در snapshot با حذف ZWNJ نرمال می‌شود — الگوی بدون نیم‌فاصله (input نام دسته)
$B snapshot -i 2>/dev/null | grep -q "دستهٔ جدید" && ok "categories sheet opens" || bad "cats sheet"
CIN=$(sref "دستهٔ جدید")
$B fill @$CIN "تست دسته فیکس" >/dev/null 2>&1; sleep 0.5
ADD=$(srefb "افزودن"); [ -n "$ADD" ] && $B click @$ADD >/dev/null 2>&1
sleep 3
$B snapshot -i 2>/dev/null | grep -q "تست دسته فیکس" && ok "category created (row in sheet)" || bad "cat create"
$B screenshot $SHOTS/03-cats-sheet.png >/dev/null 2>&1
$B press Escape >/dev/null 2>&1; sleep 2
$B snapshot -i 2>/dev/null | grep -q "تست دسته فیکس" && ok "category chip visible in catalog" || bad "cat chip"
$B eval "document.querySelector('button[aria-label=\\\"مدیریت دسته‌بندی‌ها\\\"]').click()" >/dev/null 2>&1
sleep 2
# toggle با role=switch رندر می‌شود (نه button) → sref عمومی
HIDER=$(sref "را نشان نده")
[ -n "$HIDER" ] && $B click @$HIDER >/dev/null 2>&1 && ok "hide toggle clicked" || bad "hide toggle"
sleep 3
$B press Escape >/dev/null 2>&1; sleep 2
CHIPGONE=$(ev "(()=>{const chips=document.querySelector('main .scrollbar-none');return chips&&!chips.textContent.includes('تست دسته فیکس')?'hidden':'visible'})()")
[ "$CHIPGONE" = "hidden" ] && ok "chips hidden after toggle" || bad "chips: $CHIPGONE"
$B eval "document.querySelector('button[aria-label=\\\"مدیریت دسته‌بندی‌ها\\\"]').click()" >/dev/null 2>&1
sleep 2
HIDER2=$(sref "را نشان نده"); [ -n "$HIDER2" ] && $B click @$HIDER2 >/dev/null 2>&1
sleep 3
DEL=$(sref "حذف تست دسته فیکس"); [ -n "$DEL" ] && $B click @$DEL >/dev/null 2>&1
sleep 3
$B press Escape >/dev/null 2>&1; sleep 1.5
$B snapshot -i 2>/dev/null | grep -q "تست دسته فیکس" && bad "cat not deleted" || ok "test category removed"

echo "── 7. فرم ثبت کالا: CTA فقط با لیست خالی + برند جدید ──"
$B open http://localhost:3000/catalog/new >/dev/null 2>&1; sleep 4
SQ=$(sref "جستجوی نوع کالا")
$B fill @$SQ "پفک" >/dev/null 2>&1; sleep 3
ROW=$(srefb "پفک")
[ -n "$ROW" ] && ok "«پفک» found in goods list" || bad "پفک row"
$B snapshot -i 2>/dev/null | grep -q "نوع کالای جدید ثبت کن" && bad "CTA visible while good exists!" || ok "CTA hidden when good exists"
$B fill @$SQ "زززق‌فروتن" >/dev/null 2>&1; sleep 3.5
# snapshot متن را نرمال می‌کند (ZWNJ حذف) — الگوی بدون نیم‌فاصله
$B snapshot -i 2>/dev/null | grep -q "نوع کالای جدید ثبت کن" && ok "CTA appears on empty results" || bad "CTA on empty"
$B screenshot $SHOTS/04-selladd-cta.png >/dev/null 2>&1
# انتخاب نوع کالای «پفک» (کالای ساده با ۳۰ محصول برند‌دار) — الگوی snapshot یکتا
$B fill @$SQ "پفک" >/dev/null 2>&1; sleep 3
POFAK=$($B snapshot -i 2>/dev/null | grep -F -- '- button "پ پفک دیدن' | grep -oE 'ref=e[0-9]+' | head -1 | cut -d= -f2)
[ -n "$POFAK" ] && $B click @$POFAK >/dev/null 2>&1 && ok "good «پفک» picked" || bad "pofak pick: $POFAK"
sleep 3.5
$B wait --text "ثبت برند جدید" >/dev/null 2>&1 && ok "«ثبت برند جدید» chip present" || bad "brand chip missing"
BR=$(srefb "ثبت برند جدید"); $B click @$BR >/dev/null 2>&1; sleep 2
BREF=$(sref "نام برند")
[ -n "$BREF" ] && ok "brand sheet opens" || bad "brand sheet"
$B fill @$BREF "برند تست فیکس" >/dev/null 2>&1; sleep 0.5
CONT=$(srefb "ادامه — ثبت محصول این برند")
[ -n "$CONT" ] && $B click @$CONT >/dev/null 2>&1 && ok "brand → step 3" || bad "brand continue"
sleep 2.5
BRVAL=$(ev "(()=>{const i=[...document.querySelectorAll('input')].find(x=>(x.placeholder||'').includes('اشی مشی'));return i?i.value:'?'})()")
[ "$BRVAL" = "برند تست فیکس" ] && ok "brand prefilled in step 3" || bad "brand prefill: [$BRVAL]"
$B screenshot $SHOTS/05-brand-step3.png >/dev/null 2>&1

echo "── 8. ویرایش کامل کالا: گالری + تخفیف‌ها + حذف ──"
node -e "
const sharp=require('$BACK/node_modules/sharp');
sharp({create:{width:320,height:240,channels:3,background:{r:200,g:120,b:60}}}).jpeg().toFile('/tmp/fix1-img.jpg').then(()=>console.log('img ok'));
" >/dev/null 2>&1 || echo "  (sharp failed — upload test may fail)"
sleep 1
UP=$(curl -sf -X POST "$BASE/files/upload?model=Listing&modelId=$LID&key=gallery&replace=false" -H "$AH" -F "file=@/tmp/fix1-img.jpg;type=image/jpeg")
FID=$(echo "$UP" | jp "['id']")
[ -n "$FID" ] && ok "image uploaded via API ($FID)" || bad "upload: $UP"
GAL=$(curl -sf "$BASE/listings/getMyListings?businessId=$BIZ&includeInactive=true" -H "$AH" | python3 -c "
import json,sys
rows=json.load(sys.stdin)
r=[x for x in rows if x['id']=='$LID'][0]
print((r.get('gallery') or [{}])[0].get('url',''))
" 2>/dev/null)
[ -n "$GAL" ] && ok "gallery in getMyListings" || bad "gallery read: $GAL"

$B open http://localhost:3000/item/$LID/edit >/dev/null 2>&1; sleep 5
IMG_N=$(ev "document.querySelectorAll('main img').length")
[ "${IMG_N:-0}" -ge 1 ] && ok "edit page shows gallery image ($IMG_N imgs)" || bad "edit imgs: $IMG_N"
$B wait --text "تخفیف حجمی خرید" >/dev/null 2>&1 && ok "tiers section present" || bad "tiers section"
$B wait --text "تخفیف مشتری‌های این کالا" >/dev/null 2>&1 && ok "cust-discount section present" || bad "cust section"
$B wait --text "حذف این محصول از کاتالوگ" >/dev/null 2>&1 && ok "delete section present" || bad "delete section"
ADDT=$(srefb "افزودن پله"); [ -n "$ADDT" ] && $B click @$ADDT >/dev/null 2>&1 && ok "tier row added" || bad "add tier btn"
sleep 1.2
R1=$(rfill "endsWith('از')" "10")
R2=$(rfill "endsWith('درصد تخفیف')" "5")
R3=$(rfill "endsWith('تخفیف مشتری همکار')" "7")
echo "  fills: from=$R1 pct=$R2 partner=$R3"
[ "$R1" = "ok" ] && [ "$R2" = "ok" ] && ok "tier from/pct typed" || bad "tier fill: $R1/$R2"
[ "$R3" = "ok" ] && ok "partner discount typed" || bad "partner fill: $R3"
sleep 0.5
$B screenshot $SHOTS/06-item-edit.png >/dev/null 2>&1
SAVER=$(srefb "ذخیرهٔ تغییرات"); [ -n "$SAVER" ] && $B click @$SAVER >/dev/null 2>&1
sleep 6
URL2=$($B get url 2>/dev/null)
echo "$URL2" | grep -q "/item/$LID" && ok "saved → item page" || bad "after save url: $URL2"
TIER_OK=$(curl -sf "$BASE/pricing/state?businessId=$BIZ" -H "$AH" | python3 -c "
import json,sys
d=json.load(sys.stdin)
it=[i for i in d['items'] if i['listingId']=='$LID'][0]
r=it.get('rule') or {}
t=(r.get('tiers') or [{}])[0]
h=(r.get('custPct') or {}).get('h')
print(('yes' if t.get('from')==10 and t.get('pct')==5 else 'no'), h)
" 2>/dev/null)
echo "  pricing rule: $TIER_OK"
echo "$TIER_OK" | grep -q "^yes 7" && ok "server rule: tier 10→5% + partner 7%" || bad "server rule: $TIER_OK"
$B wait --text "تخفیف حجمی خرید" >/dev/null 2>&1 && ok "item page: tiers card" || bad "tiers card"
$B wait --text "تخفیف مشتری‌های این کالا" >/dev/null 2>&1 && ok "item page: cust card" || bad "cust card"
$B screenshot $SHOTS/07-item-view.png >/dev/null 2>&1

echo "── 9. حذف کالا از فرم ویرایش ──"
$B open http://localhost:3000/item/$LID/edit >/dev/null 2>&1; sleep 4
DELB=$(srefb "حذف این محصول از کاتالوگ")
[ -n "$DELB" ] && $B click @$DELB >/dev/null 2>&1 && ok "delete btn opens dialog" || bad "delete btn"
sleep 1.5
$B wait --text "حذف شود؟" >/dev/null 2>&1 && ok "confirm dialog (آخرین سؤال)" || bad "confirm dialog"
CONF=$(srefb "حذف کن"); [ -n "$CONF" ] && $B click @$CONF >/dev/null 2>&1
sleep 6
URL3=$($B get url 2>/dev/null)
echo "$URL3" | grep -q "/catalog" && ok "deleted → back to catalog" || bad "after delete: $URL3"
ACT2=$(curl -sf "$BASE/listings/getMyListings?businessId=$BIZ" -H "$AH" | python3 -c "
import json,sys
rows=json.load(sys.stdin)
print('gone' if not any(x['id']=='$LID' for x in rows) else 'still-there')
" 2>/dev/null)
[ "$ACT2" = "gone" ] && ok "listing left active catalog (soft delete)" || bad "listing state: $ACT2"

echo "── 10. موبایل: میز ۲×۲ + LTR شورون ──"
$B set viewport 390 760 >/dev/null 2>&1
$B open http://localhost:3000/sell >/dev/null 2>&1; sleep 4
BOXM=$(ev "(()=>{const t=[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('کاتالوگ من'));const r=t.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)})()")
echo "  mobile tile box: $BOXM"
WM=$(echo $BOXM | cut -dx -f1); HM=$(echo $BOXM | cut -dx -f2)
[ "${WM:-0}" -le 185 ] && [ "${HM:-0}" -ge 120 ] && ok "mobile tile compact ($BOXM)" || bad "mobile tile: $BOXM"
$B screenshot $SHOTS/08-sell-mobile.png >/dev/null 2>&1
$B set viewport 1280 800 >/dev/null 2>&1
$B cookies set imach_locale en >/dev/null 2>&1
$B open http://localhost:3000/sell >/dev/null 2>&1; sleep 5
CHEVL=$(ev "(()=>{const u=[...document.querySelectorAll('svg use')].find(x=>x.getAttribute('href')==='#i-chev');return u?getComputedStyle(u.parentElement).scale:'nf'})()")
echo "  chev scale (LTR): $CHEVL"
echo "$CHEVL" | grep -qiE "^none|none|1 1" && ok "LTR chevron unmirrored → outward (right)" || bad "LTR chev: $CHEVL"
$B cookies set imach_locale fa >/dev/null 2>&1

echo "═══ نتیجه ═══"
echo "PASS: $PASS  FAIL: $FAIL"
[ "$FAIL" = "0" ] && echo "ALL GREEN" || exit 1
