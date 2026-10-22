#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# iMach — fix2 e2e (وفاداری فرم ۱۳ به پروتوتایپ — بازخورد مالک):
# شیت انتخاب برند با جستجو (sheet-pick-brand) · «بدون برند» صریح ·
# عکس محصول تا ۵ عکس + آپلود واقعی بعد از ذخیره · چیپ‌های واحد
# بسته‌بندی از جدول Unit (بطری ۲ لیتری و…) · تک‌فروشی ·
# واحد پایه در شیت ثبت نوع کالای جدید · getBrands limit
# Usage: bash qa-app/fix2-e2e.sh  (from imach-web; backend at ../imach-back)
# درس‌های اجرای ۱: ref جستجو از aria-label می‌آید نه placeholder ·
# کالای آزمون باید محصول داشته باشد (روغن موتور · ۶۹۹ محصول) ·
# Arvan از این محیط در دسترس نیست → STORAGE_DRIVER=local برای e2e
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
# انتظارِ poll-شونده — کوئری‌های Atlas از این محیط ۳–۸ثانیه طول می‌کشند (درس اجرای ۳)
waitref() { local R=""; for i in $(seq 1 ${2:-20}); do R=$(srefb "$1"); [ -n "$R" ] && break; sleep 1; done; echo "$R"; }
waitreft() { local R=""; for i in $(seq 1 ${2:-20}); do R=$(sref "$1"); [ -n "$R" ] && break; sleep 1; done; echo "$R"; }
# ev poll-شونده — تا زمانی که خروجی شامل متن موردانتظار شود (درس ZWNJ + تاخیر رندر)
wev() { local JS="$1" EXP="$2" T="${3:-10}" OUT=""; for i in $(seq 1 $T); do OUT=$(ev "$JS"); echo "$OUT" | grep -qF "$EXP" && break; sleep 1; done; echo "$OUT"; }
# کلیک مطمئن — با متن روی خود DOM (درس اجرای ۴: رفرهای agent-browser بعد از
# باز/بسته‌شدن شیت‌ها stale می‌شوند و click با خطای «covered by» بی‌صدا می‌میرد؛
# .click() بومی رویداد مصنوعی React را مطمئن می‌اندازد)
jclick() { ev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>{const t=x.textContent.trim();return t==='$1'||t.includes('$1')});if(!b)return 'nf';b.scrollIntoView({block:'center'});b.click();return 'ok'})()"; }
# کلیک با دو شرط متن (دکمه‌ای که باید هر دو عبارت را داشته باشد)
jclick2() { ev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('$1')&&x.textContent.includes('$2'));if(!b)return 'nf';b.scrollIntoView({block:'center'});b.click();return 'ok'})()"; }
ev()   { $B eval "$1" 2>/dev/null | tail -1 | tr -d '"'; }
jp()   { python3 -c "import json,sys;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }
# مقدارگذاری input کنترل‌شدهٔ React (setter بومی + رویداد input)
rfill() { ev "(()=>{const set=(el,v)=>{const p=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;p.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};const f=[...document.querySelectorAll('input')].find(i=>(i.getAttribute('aria-label')||'').$1);if(!f)return 'nf';set(f,'$2');return 'ok'})()"; }
# مقدارگذاری با یافتن input از روی متنِ label مرتبط (Field → htmlFor)
lfill() { ev "(()=>{const set=(el,v)=>{const p=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;p.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};const l=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('$1'));if(!l)return 'nfl';const f=document.getElementById(l.htmlFor);if(!f)return 'nfi';set(f,'$2');return 'ok'})()"; }

echo "── 1. boot servers ──"
# next-server خودش نامِ دیگری دارد — بدون کشتنش، سرور تازهٔ e2e با EADDRINUSE
# می‌میرد و بیلد کهنهٔ حافظهٔ قبلی سرو می‌شود (درس اجرای ۲)
pkill -f "node dist/main.js" 2>/dev/null; pkill -f "next start" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 2
cd $BACK
# .env مقدار را با کوتیشن می‌نویسد — بدون strip، رشتهٔ اتصال نامعتبر (P1012)
export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')
# Arvan از این محیط در دسترس نیست — درایور local همان مسیر کد را می‌رود؛
# PUBLIC_BASE_URL می‌چسبد تا URL عکس‌ها مطلق شود و اپ وب بتواند نشانشان دهد
export STORAGE_DRIVER=local
export PUBLIC_BASE_URL=http://127.0.0.1:4000
setsid nohup node dist/main.js > /tmp/imach-back-fix2.log 2>&1 < /dev/null &
cd $WEB
setsid nohup npm run start > /tmp/imach-web-fix2.log 2>&1 < /dev/null &
for i in $(seq 1 60); do
  curl -sf $BASE/getHealth >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1
done
curl -sf $BASE/getHealth >/dev/null 2>&1 && ok "backend up" || { bad "backend down"; exit 1; }
curl -sf -o /dev/null http://localhost:3000/login && ok "frontend up" || { bad "frontend down"; exit 1; }

# عکس آزمون — PNG کوچک (۸×۸) با zlib
python3 - <<'PYEOF'
import struct, zlib, base64
w = h = 8
raw = b''.join(b'\x00' + bytes([220, 90, 60, 255] * w) for _ in range(h))
def chunk(t, d):
    return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
open('/tmp/fix2-img.b64', 'w').write(base64.b64encode(png).decode())
print('png bytes:', len(png))
PYEOF
IMGB64=$(cat /tmp/fix2-img.b64)

echo "── 2. API: getBrands limit + واحد در createGood ──"
NAT="9$(printf '%09d' $(( $(date +%s) % 1000000000 )))"
curl -sf -X POST $BASE/auth/quickRegister -H 'content-type: application/json' \
  -d "{\"phone\":\"$NAT\",\"country\":\"IR\"}" > /tmp/fix2-qr.json && ok "quickRegister 0$NAT" || bad "quickRegister"
TOKEN=$(jp "['accessToken']" < /tmp/fix2-qr.json)
BIZ=$(jp "['businesses'][0]['id']" < /tmp/fix2-qr.json)
AH="authorization: Bearer $TOKEN"
BC=$(curl -sf "$BASE/goods/getBrands?limit=5" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")
[ "$BC" = "5" ] && ok "getBrands limit=5 → 5" || bad "getBrands limit: $BC"
BC0=$(curl -sf "$BASE/goods/getBrands" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")
[ "$BC0" = "10" ] && ok "getBrands default → 10 (بدون شکستن استفاده‌های قدیمی)" || bad "getBrands default: $BC0"
TG1="آزمون۱ $(date +%s | tail -c 6)"
TG2="آزمون۲ $(date +%s | tail -c 6)"
U1=$(curl -sf -X POST $BASE/goods/createGood -H "$AH" -H 'content-type: application/json' -d "{\"name\":\"$TG1\",\"unit\":\"KILOGRAM\"}" | jp "['unit']")
[ "$U1" = "KILOGRAM" ] && ok "createGood unit=KILOGRAM نشست" || bad "createGood unit: $U1"
U2=$(curl -sf -X POST $BASE/goods/createGood -H "$AH" -H 'content-type: application/json' -d "{\"name\":\"$TG2\"}" | jp "['unit']")
[ "$U2" = "PIECE" ] && ok "createGood بدون واحد → PIECE (پیش‌فرض همان)" || bad "createGood default: $U2"

echo "── 3. فرم ثبت کالا — مسیر محصول جدید: برند + عکس + چیپ واحد ──"
$B open http://localhost:3000/login >/dev/null 2>&1
$B cookies clear >/dev/null 2>&1
$B cookies set imach_locale fa >/dev/null 2>&1
$B set viewport 390 844 >/dev/null 2>&1
$B open http://localhost:3000/login >/dev/null 2>&1
$B wait --load networkidle >/dev/null 2>&1; sleep 2
CREG=$(sref "انتخاب کشور"); [ -n "$CREG" ] && $B click @$CREG >/dev/null 2>&1
sleep 1.5
IRREF=$(sref "ایران"); [ -n "$IRREF" ] && $B click @$IRREF >/dev/null 2>&1
sleep 1.5
PREF=$(sref "شماره موبایل")
$B fill @$PREF "0$NAT" >/dev/null 2>&1; sleep 0.8
# blur → صفر ابتدا حذف (رفتار IntlPhoneField)
$B eval "(()=>{const i=[...document.querySelectorAll('input')].find(x=>x.type==='password');if(i){i.focus();return 'ok'}return 'nf'})()" >/dev/null 2>&1
sleep 0.8
LREF=$(sref "ورود به آی"); [ -n "$LREF" ] && $B click @$LREF >/dev/null 2>&1; sleep 8
URL=$($B get url 2>/dev/null)
case "$URL" in *"/sell"*|*"/home"*|*"/start"*|*"/me"*) ok "logged in";; *) bad "login url: $URL";; esac

# روغن موتور — LITER · ۶۹۹ محصول مرجع (چیپ‌های بطری/گری‌کن از جدول Unit)
$B open http://localhost:3000/catalog/new >/dev/null 2>&1; sleep 3
$B fill $(sref "جستجوی نوع کالا") "روغن موتور" >/dev/null 2>&1
GC=$(wev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('روغن موتور')&&x.textContent.includes('دیدن محصولات'));return b?'ok':'nf'})()" "ok" 15)
[ "$GC" = "ok" ] && jclick2 "روغن موتور" "دیدن محصولات" >/dev/null && ok "نوع کالا «روغن موتور» انتخاب شد → گام ۲" || bad "انتخاب نوع کالا"
NP=$(wev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('محصول شما در این لیست نیست'));return b?'ok':'nf'})()" "ok" 25)
[ "$NP" = "ok" ] && jclick "محصول شما در این لیست نیست" >/dev/null && ok "«خودتان ثبتش کنید» → گام ۳ (محصول جدید)" || bad "CTA محصول جدید (گام ۲ رندر نشد؟)"
sleep 2

# ۳-۱) دکمهٔ برند → شیت انتخاب برند — نام دسترسیِ دکمه = لیبل فیلد («برند»)
# متن دکمه = «انتخاب برند» (پیش از انتخاب) — نام دسترسی از label فیلد می‌آید
BRB=$(ev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('انتخاب برند'));return b?'ok':'nf'})()")
[ "$BRB" = "ok" ] && ok "دکمهٔ «انتخاب برند» در فرم" || bad "دکمهٔ برند"
jclick "برند" >/dev/null 2>&1
sleep 2
$B wait --text "بدون برند / فله" >/dev/null 2>&1 && ok "شیت انتخاب برند: «بدون برند / فله» اول فهرست" || bad "شیت برند باز نشد"
$B wait --text "ثبت برند جدید" >/dev/null 2>&1 && ok "شیت برند: CTA «ثبت برند جدید» آخر فهرست" || bad "CTA ثبت برند"
BQS=$(waitreft "جستجوی برند" 10)
$B fill @$BQS "گلستان" >/dev/null 2>&1; sleep 2.5
BRAND_ROW=$(wev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='گلستان');return b?'ok':'nf'})()" "ok" 10)
[ "$BRAND_ROW" = "ok" ] && jclick "گلستان" >/dev/null && ok "برند «گلستان» از فهرست انتخاب شد" || bad "انتخاب برند گلستان"
sleep 1.2
BT=$(ev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='گلستان');return b?'گلستان':'nf'})()")
[ "$BT" = "گلستان" ] && ok "دکمهٔ برند فرم «گلستان» نشان می‌دهد" || bad "دکمهٔ برند: $BT"
$B screenshot $SHOTS/01-brand-picker.png >/dev/null 2>&1

# ۳-۲) عکس‌ها — DataTransfer با PNG آزمون
IMGO=$(ev "(()=>{const inp=[...document.querySelectorAll('input[type=file]')][0];if(!inp)return 'nf';const b64='$IMGB64';const bin=atob(b64);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);const dt=new DataTransfer();dt.items.add(new File([arr],'a.png',{type:'image/png'}));dt.items.add(new File([arr],'b.png',{type:'image/png'}));inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}));return 'ok'})()")
BLOBS=$(ev "[...document.querySelectorAll('img')].filter(i=>i.src.startsWith('blob:')).length")
[ "$IMGO" = "ok" ] && [ "$BLOBS" = "2" ] && ok "۲ عکس انتخاب شد — پیش‌نمایش محلی زنده" || bad "عکس‌ها: op=$IMGO blobs=$BLOBS"
DEL=$(ev "(()=>{const b=[...document.querySelectorAll('button[aria-label=\\'حذف عکس\\']')][0];if(!b)return 'nf';b.click();return 'ok'})()")
sleep 0.6
BLOBS2=$(ev "[...document.querySelectorAll('img')].filter(i=>i.src.startsWith('blob:')).length")
[ "$BLOBS2" = "1" ] && ok "حذف تک‌عکس کار می‌کند (۱ ماند)" || bad "حذف عکس: blobs=$BLOBS2"
# دوباره یکی اضافه کن — ۲ عکس برای آپلود
ev "(()=>{const inp=[...document.querySelectorAll('input[type=file]')][0];if(!inp)return 'nf';const b64='$IMGB64';const bin=atob(b64);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);const dt=new DataTransfer();dt.items.add(new File([arr],'c.png',{type:'image/png'}));inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}));return 'ok'})()" >/dev/null 2>&1
sleep 0.5

# ۳-۳) چیپ واحد بسته‌بندی — بطری ۲ لیتری (LITER · containsQty=2 · fixed)
$B wait --text "بسته‌بندی فروش عمده" >/dev/null 2>&1 && ok "بخش بسته‌بندی فروش عمده" || bad "بخش بسته‌بندی"
$B wait --text "بطری ۲ لیتری" >/dev/null 2>&1 && ok "چیپ «بطری ۲ لیتری» از جدول Unit آمد" || bad "چیپ بطری ۲ لیتری"
PC=$(srefb "بطری ۲ لیتری")
CHIPC=$(jclick "بطری ۲ لیتری")
sleep 1.5
# دیباگ: وضعیت چیپ بعد از کلیک (aria-pressed)
echo "  [debug] chip-click=$CHIPC pressed=$($B eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='بطری ۲ لیتری');return b?String(b.getAttribute('aria-pressed')):'nf'})()" 2>/dev/null | tail -1 | tr -d '"')"
HINT=$(wev "(()=>{const p=[...document.querySelectorAll('p')].find(x=>x.textContent.includes('شامل ۲ لیتر'));return p?p.textContent:'nf'})()" "شامل" 8)
[ "$HINT" != "nf" ] && ok "توضیح زنده: «هر بطری ۲ لیتری شامل ۲ لیتر است»" || bad "توضیح بسته: $HINT"
PLBL=$(wev "(()=>{const l=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('قیمت هر بطری ۲ لیتری'));return l?'yes':'nf'})()" "yes" 8)
[ "$PLBL" = "yes" ] && ok "لیبل قیمت = «قیمت هر بطری ۲ لیتری (۲ لیتر)»" || bad "لیبل قیمت بسته: $PLBL"
UPL=$(wev "(()=>{const l=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('قیمت هر لیتر —'));return l?'yes':'nf'})()" "yes" 8)
[ "$UPL" = "yes" ] && ok "قیمت هر واحد (لیتر) ظاهر شد — هم‌گام" || bad "قیمت واحد: $UPL"

# ۳-۴) عنوان محصول + قیمت‌ها + موجودی
T1=$(lfill "عنوان محصول" "روغن موتور گلستان آزمون")
T2=$(wev "(()=>{const l=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('قیمت هر بطری ۲ لیتری'));if(!l)return 'nfl';const f=document.getElementById(l.htmlFor);if(!f)return 'nfi';const p=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;p.call(f,'200000');f.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()" "ok" 8)
UPV=$(wev "(()=>{const l=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('قیمت هر لیتر —'));if(!l)return 'nfl';const f=document.getElementById(l.htmlFor);return f?f.value:'nfi'})()" "۱۰۰" 8)
echo "$UPV" | grep -q "۱۰۰" && ok "قیمت واحد خودکار ۱۰۰٬۰۰۰ (۲۰۰٬۰۰۰ ÷ ۲)" || bad "قیمت واحد: $UPV"
T3=$(lfill "موجودی" "35")
echo "  fills: title=$T1 price=$T2 stock=$T3"
[ "$T1" = "ok" ] && [ "$T2" = "ok" ] && ok "عنوان/قیمت تایپ شد" || bad "fill: $T1/$T2"
$B screenshot $SHOTS/02-add-form-full.png >/dev/null 2>&1

# ۳-۵) ذخیره → آپلود عکس → کاتالوگ
SAVEB=$(ev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('افزودن به کاتالوگ'));return b?b.textContent.trim():'nf'})()")
echo "  [debug] save button: $SAVEB"
echo "$SAVEB" | grep -q "عکس" && ok "دکمهٔ ذخیره «افزودن به کاتالوگ + ۲ عکس»" || bad "دکمهٔ ذخیره (بدون شمار عکس): $SAVEB"
jclick "افزودن به کاتالوگ" >/dev/null 2>&1
for i in $(seq 1 30); do
  U=$($B get url 2>/dev/null); echo "$U" | grep -qE "catalog$|catalog\?" && break; sleep 1
done
URL2=$($B get url 2>/dev/null)
echo "$URL2" | grep -qE "catalog$|catalog\?" && ok "ذخیره شد → کاتالوگ (عکس‌ها آپلود شدند)" || bad "بعد از ذخیره: $URL2"

# ۳-۶) راستی‌آزمایی سروری — عنوان/تعداد/برند/گالری
ROW=$(curl -sf "$BASE/listings/getMyListings?businessId=$BIZ" -H "$AH" | python3 -c "
import json,sys
rows=json.load(sys.stdin)
c=[x for x in rows if x.get('title')=='بطری ۲ لیتری' and (x.get('baseQty') or 0)==2 and (x.get('brand') or {}).get('name')=='گلستان']
print(json.dumps(c[0] if c else {}, ensure_ascii=False))
")
LID=$(echo "$ROW" | jp "['id']")
GLN=$(echo "$ROW" | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d.get('gallery') or []))" 2>/dev/null)
[ -n "$LID" ] && ok "ردیف سروری: title=بطری ۲ لیتری · baseQty=2 · برند=گلستان" || bad "ردیف سروری پیدا نشد"
[ "${GLN:-0}" = "2" ] && ok "گالری سروری: ۲ عکس واقعاً آپلود شد" || bad "گالری: $GLN"
if [ -n "$LID" ]; then
  $B open http://localhost:3000/item/$LID >/dev/null 2>&1; sleep 4
  $B screenshot $SHOTS/03-item-gallery.png >/dev/null 2>&1
fi

echo "── 4. مسیر دوم: تک‌فروشی + «بدون برند» ──"
$B open http://localhost:3000/catalog/new >/dev/null 2>&1; sleep 3
$B fill $(sref "جستجوی نوع کالا") "روغن موتور" >/dev/null 2>&1
GC2=$(wev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('روغن موتور')&&x.textContent.includes('دیدن محصولات'));return b?'ok':'nf'})()" "ok" 15)
[ "$GC2" = "ok" ] && jclick2 "روغن موتور" "دیدن محصولات" >/dev/null
NP2=$(wev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('محصول شما در این لیست نیست'));return b?'ok':'nf'})()" "ok" 25)
[ "$NP2" = "ok" ] && jclick "محصول شما در این لیست نیست" >/dev/null
sleep 2
jclick "برند" >/dev/null 2>&1; sleep 2
NB=$(wev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('بدون برند / فله'));return b?'ok':'nf'})()" "ok" 10)
[ "$NB" = "ok" ] && jclick "بدون برند / فله" >/dev/null; sleep 1.2
BT2=$(ev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='بدون برند');return b?'yes':'nf'})()")
[ "$BT2" = "yes" ] && ok "دکمهٔ برند «بدون برند» نشان می‌دهد (تفکیک از انتخاب‌نشده)" || bad "دکمهٔ بدون برند: $BT2"
NOLBL=$(wev "(()=>{const l=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('قیمت هر لیتر —'));return l?'yes':'nf'})()" "yes" 8)
[ "$NOLBL" = "yes" ] && ok "تک‌فروشی: لیبل «قیمت هر لیتر»" || bad "لیبل تک‌فروشی: $NOLBL"
lfill "عنوان محصول" "روغن موتور آزمون فله" >/dev/null 2>&1
lfill "قیمت هر لیتر" "90000" >/dev/null 2>&1
sleep 1
SB=$(wev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('افزودن به کاتالوگ'));return b?'ok':'nf'})()" "ok" 8)
[ "$SB" = "ok" ] && jclick "افزودن به کاتالوگ" >/dev/null
for i in $(seq 1 20); do
  U=$($B get url 2>/dev/null); echo "$U" | grep -qE "catalog$|catalog\?" && break; sleep 1
done
ROW2=$(curl -sf "$BASE/listings/getMyListings?businessId=$BIZ" -H "$AH" | python3 -c "
import json,sys
rows=json.load(sys.stdin)
c=[x for x in rows if x.get('title') is None and (x.get('baseQty') is None)]
print(json.dumps(c[0] if c else {}, ensure_ascii=False))
")
LID2=$(echo "$ROW2" | jp "['id']")
BR2=$(echo "$ROW2" | jp "['brand']")
[ -n "$LID2" ] && [ "$BR2" = "None" ] && ok "تک‌فروشی سروری: بدون title/baseQty/برند" || bad "تک‌فروشی سروری: id=$LID2 brand=$BR2"

echo "── 5. شیت نوع کالای جدید — انتخاب واحد پایه ──"
$B open http://localhost:3000/catalog/new >/dev/null 2>&1; sleep 3
GIB="ژزقچآ$RANDOM"
$B fill $(sref "جستجوی نوع کالا") "$GIB" >/dev/null 2>&1
# درس ZWNJ: snapshot نیم‌فاصله را حذف می‌کند («به‌عنوان» → «بهعنوان») —
# پس فقط بخش بدون-ZWNJ متن CTA را جستجو می‌کنیم
CTA=$(wev "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('نوع کالای جدید ثبت کن'));return b?'ok':'nf'})()" "ok" 25)
[ "$CTA" = "ok" ] && ok "CTA نوع کالای جدید فقط با لیست خالی" || bad "CTA نوع کالا"
[ "$CTA" = "ok" ] && jclick "نوع کالای جدید ثبت کن" >/dev/null; sleep 2
$B wait --text "واحد شمارش" >/dev/null 2>&1 && ok "شیت نوع کالا: انتخاب واحد پایه" || bad "واحد شمارش در شیت"
$B wait --text "کیلوگرم" >/dev/null 2>&1 && ok "چیپ‌های واحد (عدد/کیلوگرم/…)" || bad "چیپ واحد"
jclick "کیلوگرم" >/dev/null 2>&1; sleep 0.5
GN=$(waitreft "نام نوع کالا" 8)
$B fill @$GN "ززآزمون" >/dev/null 2>&1; sleep 0.5
jclick "ثبت نوع کالا" >/dev/null 2>&1
SUB=$(wev "(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.textContent.includes('واحد کیلوگرم'));return e?'yes':'nf'})()" "yes" 10)
[ "$SUB" = "yes" ] && ok "گام ۲: «واحد کیلوگرم» از انتخاب کاربر آمد" || bad "واحد در گام ۲: $SUB"
$B screenshot $SHOTS/04-newgood-unit.png >/dev/null 2>&1

echo "── 6. پاک‌سازی آزمون (خط قرمز داده: فقط ردیف‌های آزمون) ──"
# فایل‌های گالری آزمون از طریق API (مالک خودش است) — سپس ردیف‌ها/محصول/گود مستقیم
for FID in $(echo "$ROW" | python3 -c "import json,sys;d=json.load(sys.stdin);print(' '.join(f['id'] for f in (d.get('gallery') or [])))" 2>/dev/null); do
  curl -sf -X DELETE "$BASE/files/delete/$FID" -H "$AH" >/dev/null 2>&1 && echo "  file $FID deleted (storage+db)"
done
cd $BACK
node -e "
const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.DATABASE_URL;
(async () => {
  const c = new MongoClient(uri);
  await c.connect();
  const db = c.db('imach_online_db');
  const g = await db.collection('Good').deleteMany({ nameFa: { \$in: ['$TG1', '$TG2', 'ززآزمون'] } });
  const p = await db.collection('Product').deleteMany({ label: { \$in: ['روغن موتور گلستان آزمون', 'روغن موتور آزمون فله'] } });
  const ids = ['$LID','$LID2'].filter(Boolean).map(x => ObjectId.isValid(x) ? new ObjectId(x) : null).filter(Boolean);
  const l = await db.collection('Listing').deleteMany({ _id: { \$in: ids } });
  console.log('cleanup: goods=' + g.deletedCount + ' products=' + p.deletedCount + ' listings=' + l.deletedCount);
  await c.close();
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1 | tail -1
ok "پاک‌سازی آزمون انجام شد"

echo "═══ نتیجه ═══"
echo "PASS: $PASS  FAIL: $FAIL"
[ "$FAIL" = "0" ] && echo "ALL GREEN" || exit 1
