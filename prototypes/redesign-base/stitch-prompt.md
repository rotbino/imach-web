# پرامپت Google Stitch — بازطراحی iMach
### (دستیار فروش | دستیار خرید)

> **نحوه استفاده:** Stitch با پرامپت انگلیسی خیلی دقیق‌تر کار می‌کند؛ به همین دلیل پرامپت‌ها انگلیسی نوشته شده‌اند ولی **تمام متن‌های UI داخلشان فارسی و دقیقاً همان چیزی است که باید روی صفحه بنشیند** — پس خروجی Stitch از همان اول فارسیِ درست خواهد بود. 
> ۱) اول پرامپت اصلی (Master) را بدهید و صفحه اول را بسازید. 
> ۲) بعد برای هر صفحه، پرامپت همان صفحه را در همان چت ادامه بدهید (Stitch در همان پروژه صفحه‌به-صفحه جلو می‌رود). 
> ۳) تنظیمات هر صفحه: **Mobile (390px)، RTL** — در پرامپت گفته شده ولی اگر Stitch LTR ساخت، بگویید: *"make it right-to-left, Persian, mirrored layout"*.
> ۴) خروجی نهایی را (تصاویر یا کد) برایم بفرستید تا با ماکاپ‌های HTML خودم (پوشه `screens/`) مقایسه و ادغام کنم.

---

## 🎯 Master Prompt — اول این را بدهید

```
You are designing a mobile app (390px, portrait) for "iMach" — a Persian B2B wholesale 
trade tool used by Iranian shopkeepers and distributors with LOW digital literacy. 
The design language: extremely simple, warm and trustworthy. Think "Divar" or "Telegram" 
simplicity, NOT a complex dashboard.

CRITICAL RULES:
- The interface is PERSIAN and RIGHT-TO-LEFT (RTL). All text you render must be in 
  Persian (Farsi), exactly as I write it. Numbers use Persian digits (۰۱۲۳۴۵۶۷۸۹).
- Font: Vazirmatn or IRANSans style (if unavailable, any clean Persian font).
- Colors: warm white background #FCFBF8, white cards with 1px #E7E4DC border, 
  16px border radius, primary orange #F97316 (sales context), graphite #292524 
  (buying context buttons), muted gray #7D786E for secondary text.
- Minimal decoration: no gradients on cards, no complex charts, generous whitespace, 
  big tap targets (min 44px), bottom tab bar with icons + tiny labels.
- Header: logo mark left, notification bell + avatar right (RTL: logo at start).

THE APP STRUCTURE (two assistants, one shell):
A segmented control at the top switches between:
  «دستیار فروش» (Sales Assistant — active state = orange)
  «دستیار خرید» (Buying Assistant — active state = graphite)

Sales Assistant bottom tabs (3): «کاتالوگ من» | «درخواست‌های قیمت» | «پروفایل»
Buying Assistant bottom tabs (4): «لیست خرید» | «تأمین‌کنندگان» | «پیشنهادها» | «پروفایل»

First screen: the Sales Assistant "My Catalog" page.
```

---

## صفحه ۰۱ — کاتالوگ من (دستیار فروش)

```
Screen: «کاتالوگ من» (My Catalog) — owner view, sales assistant.

Top: header with logo, bell icon with a small orange badge "۳", round avatar.
Below header: the assistant segmented switch — «دستیار فروش» (active, orange filled) 
and «دستیار خرید» (inactive). 

Content:
1. Shop header row: round orange-brown avatar with letter «پ», shop name 
   «پخش برنج پارس» with a small blue verified check, subtitle «پخش مواد غذایی · رشت», 
   share icon button.
2. Stats strip of 3 small cards: «۵ کالا» / «۱۲۰ بازدید ماه» / «۳۸ دنبال‌کننده».
3. Search bar «جستجو در کاتالوگ…» + orange primary button «افزودن کالا».
4. Filter chips row: «همه» (active), «هاشمی», «طارم», «فجر», «صدری».
5. 2-column product grid, 4 cards. Each card: product image placeholder, 
   name «برنج هاشمی», unit line «کیسه ۵۰ کیلویی · فله», price «۲٬۸۵۰٬۰۰۰ تومان», 
   tiny metrics row: eye icon «۲۱», bookmark icon «۴», green badge «موجود». 
   A small sliders/settings icon on each card top-corner.
6. Below grid a muted row: badge «غیرفعال» + text «برنج صدری — کیسه ۵۰ کیلویی (۱ کالا)» + 
   orange link «فعال‌سازی».

Bottom tab bar (3 tabs): «کاتالوگ من» (active, orange), «درخواست‌های قیمت» with 
orange count badge «۳», «پروفایل».
```

## صفحه ۰۲ — جزئیات کالا (دید خریدار)

```
Screen: product detail page — BUYER viewing a seller's product (buying context, 
graphite buttons).

Header: back arrow, title «برنج هاشمی» with subtitle «کاتالوگ «پخش برنج پارس»», share icon.
Hero: large product image placeholder (aspect 16:10) with 3 small pagination dots.
Title row: product name «برنج هاشمی» + subtitle «غلات و حبوبات · فله (بدون برند)»; 
on the other side big price «۲٬۸۵۰٬۰۰۰ تومان» + caption «هر کیسه ۵۰ کیلویی».

Specs card (list rows, label right / value left): «بوجار: درجه یک», «بسته‌بندی: کیسه ۵۰ 
کیلویی», «حداقل سفارش: ۵ کیسه», «موجودی: ۱۲۰ کیسه موجود» (green badge).

Seller card: avatar «پ», «پخش برنج پارس» with verified check, «پخش مواد غذایی · رشت · 
۳۸ دنبال‌کننده», outline button «دنبال کردن فروشگاه».

Supply board teaser card: title «سایر تأمین‌کنندگان این کالا» + badge «۳ مورد», two rows:
«آریو غلات — اصفهان ..... ۲٬۹۲۰٬۰۰۰ تومان», «کیان غلات — قزوین ..... ۳٬۰۰۰٬۰۰۰ تومان», 
full-width graphite button «مشاهده تابلوی تأمین».

Sticky bottom action bar: phone icon button (outline), outline button «درخواست قیمت», 
graphite filled button with bookmark icon «دنبال کردن قیمت» (the widest one).
```

## صفحه ۰۳ — جزئیات کالا (دید مالک)

```
Screen: SAME product detail page but in OWNER view (sales assistant, orange accents).

Header: back arrow, title «برنج هاشمی» subtitle «در کاتالوگ من · رشت», green badge «فعال».
Hero: product image, small orange badge on it «پر بازدید».

Title row: name + «کیسه ۵۰ کیلویی · فله · حداقل ۵ کیسه»; left side orange price 
«۲٬۸۵۰٬۰۰۰ تومان» + caption «موجودی: ۱۲۰ کیسه».

Management card titled «مدیریت این کالا» (orange pencil icon) with a 2×2 grid of outline 
buttons: «تغییر قیمت» (tag icon), «تغییر موجودی» (boxes icon), «ویرایش جزئیات» (pencil), 
«غیرفعال کردن» (red pause icon, red text).

Section «عملکرد ۳۰ روز اخیر» with 3 stat cards: «۲۱ بازدید» / «۴ دنبال‌کننده قیمت» 
(orange, highlighted) / «۲ درخواست باز».

Section «خریداران علاقه‌مند» + link «مشاهده همه (۴)»: two list rows with round avatars 
«ن» «م»: «پخش نگین» + blue badge «درخواست باز» + «قزوین · دنبال می‌کند از ۳ روز پیش», 
«رستوران مهر» + «تهران · دنبال می‌کند از ۱ هفته پیش», chevrons on the left edge.

Bottom: an amber info banner: bold «۲ درخواست قیمت باز برای این کالا» + text «رستوران مهر 
به دنبال ۲۰ کیسه برنج هاشمی است.» + orange link «مشاهده و پاسخ».

Sticky bottom bar: one wide orange button «ویرایش کامل کالا» with pencil icon.
```

## صفحه ۰۴ — فرم افزودن/ویرایش کالا

```
Screen: add product form (sales assistant).

Header: back arrow, title «افزودن کالا» subtitle «به کاتالوگ «پخش برنج پارس»».

Field 1 «نوع کالا — از فهرست iMach انتخاب کنید»: a search input containing 
«برنج هاشمی» (focused, orange border) with orange «تغییر» link; helper text below:
«مسیر: غلات و حبوبات ‹ برنج ‹ هاشمی · واحد پایه: کیسه ۵۰ کیلویی».

Field «این کالا برند دارد؟»: two choice pills, «برند دارد» and «فله (بدون برند)» 
(second one active with orange tint).

Section title «قیمت و شرایط فروش»:
- «قیمت هر کیسه ۵۰ کیلویی»: input with «۲٬۸۵۰٬۰۰۰» and suffix «تومان»; amber warning 
  helper: «تا زمانی که قیمت نگذارید، کالا در نمای عمومی دیده نمی‌شود.»
- Two half-width inputs: «موجودی» = «۱۲۰» suffix «کیسه» and «حداقل سفارش» = «۵» 
  suffix «کیسه».
- «بوجار»: three pills «درجه یک» (active) «درجه دو» «سوپر».

Gallery field «عکس کالا — حداکثر ۶ تصویر»: 4 square slots in a row, first two filled 
placeholders, others dashed "+".

Amber callout: «برای افزودن سریع چند کالا، از «اسکنر بارکد» یا «بارگذاری اکسل» 
استفاده کنید — از همین صفحه در دسترس است.»

Sticky bottom bar: full-width orange button «ذخیره در کاتالوگ».
```

## صفحه ۰۵ — درخواست‌های قیمت (فروش)

```
Screen: price requests inbox (sales assistant).

Header: logo, bell with badge «۳», avatar.
Assistant switch: «دستیار فروش» active.
Section title with inbox icon: «درخواست‌های قیمت» + gray text «۴ درخواست این ماه».

Inner segmented tabs: «به من (۳)» (active) and «فرصت‌های بازار (۱۲)».

Request list, 3 cards:
1. (highlighted, orange-tinted border, light warm background) avatar «م», 
   «رستوران مهر» + blue badge «جدید», subtitle with pin icon «تهران · هم‌استان»; 
   then an inner orange-tinted chip box: bold «برنج هاشمی · ۲۰ کیسه» — «تحویل تهران، 
   پنج‌شنبه‌ها».
2. avatar «ن», «پخش نگین», «قزوین · هم‌شهری · ۲ روز پیش», inner chip: 
   «برنج طارم · ۳۰ کیسه — ماهانه».
3. (muted, 75% opacity) avatar «س», «سوپرمارکت سعید» + green badge «پاسخ داده‌شده», 
   inner gray chip: «برنج فجر · ۱۰ کیسه — پیشنهاد شما ارسال شد».

Bottom info card (gray, info icon): «به من» = درخواست‌هایی که مستقیم برای کالاهای شما 
پیام شده. «فرصت‌های بازار» = نیازی که iMach شبیه کاتالوگ شما دیده و می‌توانید 
پیشنهاد بدهید.

Bottom tabs (3): «کاتالوگ من» / «درخواست‌های قیمت» (active, badge «۳») / «پروفایل».
```

## صفحه ۰۶ — جزئیات درخواست + فرم پاسخ

```
Screen: price request detail + reply form (sales assistant).

Header: back arrow, title «درخواست قیمت» subtitle «دریافته ۲ روز پیش · تهران», 
blue badge «جدید».

Buyer card: round purple avatar «م», «رستوران مهر» with verified check, 
«رستوران و فست‌فود · تهران · هم‌استان», phone icon button.

Request card titled «درخواست خریدار» with rows: «کالا: برنج هاشمی», «مقدار: ۲۰ کیسه 
(۵۰ کیلویی)», «دوره خرید: ماهانه», «زمان تحویل: این ماه»; below a gray quote box: 
«با احترام، تحویل تهران منطقه ۵، پنج‌شنبه‌ها صبح. اگر بوجار درجه یک دارید ممنون 
می‌شوم قیمت و شرایط ارسال بفرمایید.»

Match card (orange-tinted border, tag icon, title «مطابق کاتالوگ شما»): 
«برنج هاشمی — کیسه ۵۰ کیلویی .... ۲٬۸۵۰٬۰۰۰ تومان» + caption «قیمت پایه از کاتالوگ 
شما — قابل ویرایش در پاسخ».

Section «پاسخ شما»: field «قیمت پیشنهادی هر کیسه» input «۲٬۸۰۰٬۰۰۰» suffix «تومان» 
+ helper «برای این خریدار کمی زیر قیمت کاتالوگ گذاشتید.»; field «توضیح کوتاه — 
اختیاری» multiline box with text «ارسال با تریلی باری تهران، تحویل پنج‌شنبه. برای 
خرید ماهانه ۲٪ تخفیف می‌گیرد.»

Sticky bottom bar: wide orange button «ارسال پیشنهاد» (check icon) + outline 
button «بایگانی».
```

## صفحه ۰۷ — پروفایل فروشنده

```
Screen: seller profile (sales assistant).

Header: logo, bell, avatar. Switch: «دستیار فروش» active.

Shop header: big avatar «پ», «پخش برنج پارس», «احمد رضایی · پخش مواد غذایی · رشت».
Stats strip: «۵ کالا» / «۱۲۰ بازدید ماه» / «۳۸ مشتری» (orange).

Card with users icon «مشتریان من»: subtitle «۳۸ دنبال‌کننده · ۲ درخواست فعال», chevron.

Card «ابزار رشد کاتالوگ»: text «لینک کاتالوگتان را برای مشتری‌ها بفرستید — هر ثبت‌نام 
از لینک شما، خودکار مشتری شما می‌شود.» + two buttons: orange «اشتراک کاتالوگ» 
(share icon) and outline «نمای عمومی» (eye icon).

Settings section «تنظیمات فروشگاه» — grouped list rows with icons and current values:
«نام و لوگو — پخش برنج پارس», «شهر و آدرس — رشت», «صنف و نوع فعالیت — پخش مواد غذایی».

Account section «حساب کاربری»: «زبان / Language — فارسی» (globe icon), 
«خروج از حساب» (red, logout icon).

Bottom tabs (3): «کاتالوگ من» / «درخواست‌های قیمت» / «پروفایل» (active).
```

## صفحه ۰۸ — لیست خرید (دستیار خرید)

```
Screen: my shopping list (buying assistant — graphite accents, bottom tabs become 4).

Header: logo, bell, avatar. Switch: «دستیار خرید» ACTIVE (graphite filled).
Section title with list icon: «لیست خرید من» + on the left a link «درخواست‌های من» 
with blue badge «۲».

Search bar «جستجو در لیست…» + graphite filled button «افزودن کالا» (+ icon).
Filter chips: «همه (۴)» (active), «تغییر قیمت (۲)», «هفتگی», «ماهانه».

List rows (each row: small square thumb, title, meta, chevron on left edge):
1. thumb «۵۰ کیلو», title «برنج هاشمی» + gray badge «۳ تأمین‌کننده»; line: 
   «ارزان‌ترین: ۲٬۸۵۰٬۰۰۰ · پخش برنج پارس»; line 2: GREEN trend chip «▼ ۲٪ این هفته» 
   + «ماهانه · ۲۰ کیسه».
2. thumb «۱۰ لیتر», «روغن سرخ‌کردنی» + «۲ تأمین‌کننده»; «ارزان‌ترین: ۵۱۰٬۰۰۰ · صنایع 
   روغن آفتاب»; RED trend «▲ ۵٪ این هفته» + «ماهانه · ۴۰ عدد».
3. thumb «۵۰۰ گرم», «رب گوجه‌فرنگی» + «۱ تأمین‌کننده»; «تنها قیمت: ۹۸٬۰۰۰ · نگین 
   گلستان»; gray «— بدون تغییر» + «هفتگی · ۶۰ عدد».
4. DASHED border row: thumb «۹۰۰ گرم», «قند», text «هنوز تابلویی ندارد — با دنبال کردن 
   قیمت، تأمین‌کننده‌ها پیدا می‌شوند» + small outline button «دنبال کردن».

Gray info card: «هر کالایی را در کاتالوگ فروشنده‌ها «دنبال کردن قیمت» بزنید، این‌جا 
می‌نشیند و تابلوی تأمینش ساخته می‌شود.»

Bottom tabs (4): «لیست خرید» (active, graphite) / «تأمین‌کنندگان» / «پیشنهادها» / «پروفایل».
```

## صفحه ۰۹ — تابلوی تأمین

```
Screen: SUPPLY BOARD for one item (buying assistant) — the heart of the buyer 
experience. Header: back arrow, title «برنج هاشمی» subtitle «تابلوی تأمین · 
۳ تأمین‌کننده», bookmark icon button.

Sort chips: «ارزان‌ترین» (active) «تازه‌ترین» «آشنا (خریده‌ام)» «نزدیک‌ترین».

Supplier cards (3):

1. BEST card (green-tinted border + very light green gradient): avatar «پ», 
   «پخش برنج پارس» with verified check, «رشت · هم‌شهری · به‌روزرسانی ۳ روز پیش»; 
   right side price «۲٬۸۵۰٬۰۰۰ تومان» + GREEN trend «▼ از ۲٬۹۰۰٬۰۰۰». Condition chips: 
   «کیسه ۵۰ کیلویی» «حداقل ۵ کیسه» «موجود» + green chip with history icon 
   «از او خریده‌ام». Actions: graphite «درخواست قیمت», outline «کاتالوگ», small 
   green outline check button.

2. SPONSORED-style card (DASHED border) with a small floating tag on top edge: 
   spark icon + «معرفی iMach». Avatar «آ», «آریو غلات» verified, «اصفهان · به‌روزرسانی 
   ۵ روز پیش», price «۲٬۹۲۰٬۰۰۰ تومان», gray «— بدون تغییر». Chips: «کیسه ۵۰ کیلویی» 
   «حداقل ۱۰ کیسه» «ارسال به همه شهرها». Actions: «درخواست قیمت» / «کاتالوگ» / 
   «دنبال کردن».

3. Plain card: avatar «ک», «کیان غلات», «قزوین · هم‌استان · به‌روزرسانی ۱۱ روز پیش», 
   «۳٬۰۰۰٬۰۰۰ تومان», «— بدون تغییر», chips «کیسه ۵۰ کیلویی» «حداقل ۲۰ کیسه», 
   same actions.

Full-width outline button «+ تأمین‌کننده دیگری برای این کالا پیدا کن».
Gray transparency card: ««معرفی iMach» یعنی این تأمین‌کننده از سوی شبکه iMach معرفی 
شده — با نتایج طبیعیِ تطبیق شما جدا و شفاف است و رتبه‌بندی را تغییر نمی‌دهد.»

Sticky bottom bar: full-width graphite button «درخواست قیمت از تأمین‌کننده‌های انتخابی».
```

## صفحه ۱۰ — تأمین‌کنندگان

```
Screen: suppliers page (buying assistant).

Header: logo, bell, avatar. Switch «دستیار خرید» active.
Section title with building icon: «تأمین‌کنندگان» + gray text «مرتبط با لیست خرید شما».
Inner segmented tabs: «مرتبط با من (۵)» (active) and «دنبال‌شده (۳)».

Supplier rows (avatar, name+verified, city + trade, good chips, right-side actions):
1. avatar «پ», «پخش برنج پارس», «رشت · پخش مواد غذایی»; chips «برنج هاشمی» «برنج 
   طارم» + green chip «خریده‌ام از او»; right: dark graphite pill «دنبال می‌کنم ✓» 
   + outline «کاتالوگ» button.
2. avatar «آ», «آریو غلات», «اصفهان · غلات و حبوبات»; chips «روغن سرخ‌کردنی» + 
   orange chip «معرفی iMach»; caption «۲ قیمت از این فروشنده در تابلوهای شماست»; 
   right: outline «دنبال کردن» + «کاتالوگ».
3. avatar «ک», «کیان غلات», «قزوین»; chips «برنج هاشمی» + gray chip «خودش آمد»; 
   right: dark pill «دنبال می‌کنم ✓» + «کاتالوک» → «کاتالوگ».
4. avatar «ن», «نگین گلستان», «قزوین · کنسروسازی»; chip «رب گوجه‌فرنگی»; right: 
   «دنبال کردن» + «کاتالوگ».

Gray info card: «این فهرست فقط فروشنده‌هایی را نشان می‌دهد که به کالاهای لیست شما 
مرتبط‌اند — دایرکتوری کامل بازار نیست. برای کاوش بیشتر، «پیشنهادها» را ببینید.»

Bottom tabs (4): «لیست خرید» / «تأمین‌کنندگان» (active) / «پیشنهادها» / «پروفایل».
```

## صفحه ۱۱ — پیشنهادها

```
Screen: suggestions (buying assistant). Header: logo, bell, avatar; switch «دستیار 
خرید» active. Section title with sparkles icon: «پیشنهادهای iMach» + link «۳ جدید»; 
subtitle «بر اساس کالاهای لیست خرید و تابلوهای تأمین شما».

3 cards:
1. PRICE BETTER card (green-tinted border, light green gradient): badges «قیمت بهتر» 
   (green) + «مطابق لیست شما» (gray); «برنج هاشمی» / «تجارت گیل‌رنج · رشت»; left side 
   big GREEN price «۲٬۷۸۰٬۰۰۰ تومان» + green trend «▼ ۲٫۵٪ ارزان‌تر از تابلوی شما»; 
   buttons: graphite «افزودن به تابلو» + outline «مشاهده کاتالوگ».
2. NEW SUPPLIER card: blue badge «تأمین‌کننده جدید»; a 42px circular MATCH RING 
   (orange conic-gradient progress ring, 87% filled, center text «۸۷٪»); «آریو غلات» 
   verified + «اصفهان · برای «روغن سرخ‌کردنی» شما»; gray explainer box: «هم‌جنسِ روغن 
   لیست شما را با حداقل سفارش پایین‌تر می‌فروشد — ارسال به قزوین دارد.»; buttons 
   «دنبال کردن» + «مشاهده کاتالوگ».
3. ALTERNATIVE card: orange badge «جایگزین» + gray badge «مشابه برنج هاشمی»; 
   «برنج طارم — درجه یک» / «کیان غلات · قزوین · هم‌استان» / price «۲٬۶۵۰٬۰۰۰ تومان»; 
   buttons «+ افزودن به لیست» + «مشاهده».

Gray transparency card: «پیشنهادها از موتور تطبیق iMach می‌آیند — هیچ‌کس با پرداخت 
پول در صدر این فهرست نمی‌نشیند.»

Bottom tabs (4): «لیست خرید» / «تأمین‌کنندگان» / «پیشنهادها» (active) / «پروفایل».
```

## صفحه ۱۲ — فرم درخواست قیمت

```
Screen: price request form (buying assistant, graphite primary buttons).

Header: back arrow, title «درخواست قیمت» subtitle «برنج هاشمی — از تابلوی تأمین».

Context card: square thumb «۵۰ کیلو», «برنج هاشمی», «کیسه ۵۰ کیلویی · در لیست خرید 
شما», gray badge «ماهانه».

Section «شرایط درخواست»: two half fields side by side — «مقدار» input «۲۰» suffix 
«کیسه», and «زمان تحویل» with two pills «فوری» / «این ماه» (active); then «توضیح 
برای فروشنده — اختیاری» multiline box: «تحویل قزوین، لطفاً قیمت و شرایط ارسال را 
بفرمایید.»

Section «ارسال به چه کسانی؟» — supplier checkbox rows (avatar + name + last price + 
round checkbox):
1. «پخش برنج پارس — رشت · آخرین قیمت ۲٬۸۵۰٬۰۰۰» [CHECKED, graphite fill]
2. «آریو غلات — اصفهان · آخرین قیمت ۲٬۹۲۰٬۰۰۰» [CHECKED]
3. «کیان غلات — قزوین · آخرین قیمت ۳٬۰۰۰٬۰۰۰» [unchecked]

Card with spark icon: «تأمین‌کنندگان جدید iMach هم ببینند» + caption «درخواست به 
فروشنده‌های منطبقِ دیگر هم می‌رسد (حداکثر ۵ نفر)» + graphite toggle ON.

Gray info card: «این یک درخواست مشخص و مقطعی است — با «تابلوی تأمین» که رصد دائمی 
قیمت‌هاست فرق دارد. پاسخ‌ها در «درخواست‌های من» می‌نشینند.»

Sticky bottom bar: full-width graphite button with send icon «ارسال به ۲ فروشنده + 
شبکه iMach».
```

## صفحه ۱۳ — کاتالوگ عمومی فروشنده

```
Screen: a supplier's PUBLIC catalog (buyer's view, graphite accents).

Header: back arrow, title «پخش برنج پارس» subtitle «کاتالوگ فروش», share icon.

Shop header on light warm band: big avatar «پ», «پخش برنج پارس» verified, «پخش مواد 
غذایی · رشت · ۳۸ دنبال‌کننده»; two buttons: outline (graphite text) «دنبال کردن 
فروشگاه» (bookmark icon) and graphite filled «تماس با پخش برنج پارس» (phone icon).

Search bar «جستجو در این کاتالوگ…» + chips «همه» (active) «هاشمی» «طارم» «فجر».

2-column product grid (4 cards): same style as catalog but WITHOUT owner tools; each 
card has a small bookmark icon button on its top corner. Card contents: «برنج هاشمی / 
کیسه ۵۰ کیلویی · فله / ۲٬۸۵۰٬۰۰۰ تومان», «برنج طارم / ۲٬۷۵۰٬۰۰۰», «برنج هاشمی ۱۰ 
کیلویی / ۵۹۵٬۰۰۰», «برنج فجر / ۲٬۴۸۰٬۰۰۰».

Viral footer line (small, centered, gray): «ساخته‌شده با iMach — کاتالوگ رایگان برای 
کسب‌وکار شما» (iMach in orange bold).

Sticky bottom bar: full-width outline button (graphite) with bookmark icon 
«دنبال کردن قیمت همهٔ کالاهای انتخابی (۲)».
```

## صفحه ۱۴ — پروفایل خریدار

```
Screen: buyer profile (buying assistant, graphite).

Header: logo, bell, avatar. Switch «دستیار خرید» active.

Profile header: big teal avatar «ن», «پخش مواد غذایی نگین», «نگار محمدی · سوپرمارکت 
و پخش · قزوین».
Stats strip: «۴ کالا در لیست» / «۳ تأمین‌کننده دنبال‌شده» / «۲ درخواست باز».

Two shortcut cards (icon + title + caption + chevron): «لیست خرید من — ۴ کالا · 
۲ تغییر قیمت این هفته» (list icon) and «تأمین‌کنندگان من — ۳ نفر · ۱ پیشنهاد تازه» 
(building icon).

Section «اعلان» — setting rows with graphite toggles: «تغییر قیمت در تابلوهای من» ON, 
«پیشنهادهای جدید iMach» ON, «پاسخ درخواست‌های قیمت» OFF, «اعلان فوری (Push) روی گوشی» ON.

Section «تنظیمات کسب‌وکار»: rows «نام و لوگو — پخش نگین», «شهر و آدرس — قزوین», 
«زبان / Language — فارسی».

Red row card: «خروج از حساب» (logout icon).

Bottom tabs (4): «لیست خرید» / «تأمین‌کنندگان» / «پیشنهادها» / «پروفایل» (active).
```

## دسکتاپ D1 — کاتالوگ من

```
Desktop (1440px) version of My Catalog (sales assistant): 
Top bar: logo, the assistant segmented switch (300px), horizontal nav items with 
icons+labels («کاتالوگ من» active orange-tinted, «درخواست‌های قیمت» with blue badge ۳, 
«پروفایل»), bell + avatar on the far side.
Main area (left, ~70%): page header with avatar + «کاتالوگ من — پخش برنج پارس» + 
stats inline + buttons «اشتراک کاتالوگ» (outline) and «افزودن کالا» (orange); toolbar 
with search + filter chips; then a DATA TABLE with columns: کالا / قیمت (تومان) / 
موجودی / حداقل سفارش / بازدید ۳۰ روز / دنبال‌کننده / درخواست باز / وضعیت / عملیات — 
5 rows using the rice products, one row grayed with badge «غیرفعال» and green 
«فعال‌سازی» link, green/red trend arrows next to prices, orange «ویرایش» links.
Right sidebar (~400px): «درخواست‌های تازه» (2 compact rows) + «خریداران علاقه‌مند» 
(2 rows) + an amber growth callout about the catalog link.
```

## دسکتاپ D2 — لیست خرید + تابلوی تأمین

```
Desktop (1440px) two-pane master-detail (buying assistant, graphite):
Top bar: logo, switch (buy active), nav «لیست خرید» (active) «تأمین‌کنندگان» 
«پیشنهادها» «پروفایل», bell + avatar.
RIGHT pane (400px, the list): title «لیست خرید من» + badge «۲ درخواست», a search-like 
«افزودن کالا به لیست…» bar, 4 compact item rows (the selected one highlighted with 
graphite border/tint, others normal, last one dashed «هنوز تابلویی ندارد»), gray info 
card about following prices.
LEFT main pane: header «تابلوی تأمین — برنج هاشمی» + subtitle + sort chips + graphite 
button «درخواست قیمت از ۳ نفر»; a supplier TABLE: first column tags («ارزان‌ترین» 
green badge, «معرفی iMach» outlined tag, empty), تأمین‌کننده (avatar+name), شهر, قیمت, 
روند, شرایط, وضعیت رابطه («خریده‌ام از او» green chip / «جدید» / «خودش آمد»), عملیات 
buttons.
Below the table: a small line chart card «روند قیمت ارزان‌ترین — ۶ ماه اخیر» (green 
descending line) + a side card «درباره «معرفی iMach»» explaining sponsored placement 
transparency.
```

---

## صفحات عمومی — ۱۵/۱۶/۱۷ (قبل از ورود)

> **نکته:** این سه صفحه «وب‌سایت» هستند نه شل اپ — تب‌بار پایین و سوییچ دستیار ندارند. برای لندینگ، نسخه دسکتاپ هم لازم است (Stitch را روی Desktop بگذارید و پرامپت D3 را بدهید).

## صفحه ۱۵ — صفحه اصلی (لندینگ موبایل)

```
Screen: PUBLIC MARKETING LANDING page (mobile 390px, RTL Persian) for "iMach" — 
what a visitor sees BEFORE signup. No tab bar, no assistant switch. 
Style: same design system (warm white bg, white cards, orange #F97316 primary), 
but marketing-flavored: a soft orange-tinted hero, generous spacing.

Top bar: logo left + text button «ورود».
Hero (soft gradient #FDEEDD→#FCFBF8): pill badge «دستیار هوشمند اصناف ایران», 
big title «خرید و فروشِ کسب‌وکار، ساده و حرفه‌ای» (the word «ساده و حرفه‌ای» 
in orange), subtitle «کاتالوگ کالاهایت را بساز، از خریداران درخواست قیمت بگیر 
و برای خریدهایت بهترین تأمین‌کننده را پیدا کن — همه در یک اپ.», two buttons 
«ساخت حساب» (orange) + «ورود» (outline), small green-check note «ثبت‌نام فقط 
با شماره موبایل · کمتر از ۲ دقیقه».

Section «از داخل ای‌مچ»: a HORIZONTAL SCROLL SNAP carousel of 6 phone-screenshot 
cards (192px wide, 330px tall, rounded 18px, top-cropped images). Each card has 
a tiny caption: «کاتالوگ من» / «لیست خرید» / «تابلوی تأمین» / «درخواست‌های قیمت» 
/ «پیشنهادها» / «کاتالوگ عمومی» with a small tag «فروش» (orange) or «خرید» (graphite).

Section «یک اپ، دو دستیار»: two full-width cards. Card 1 header orange gradient: 
icon + «دستیار فروش» + «فروشندگان، پخش‌ها و تولیدکننده‌ها», 3 checklist rows. 
Card 2 header graphite: «دستیار خرید» + «مغازه‌دارها، رستوران‌ها و خریداران», 
3 checklist rows.

Section «ابزارهایی که کار را جلو می‌برند»: 2-column grid of 6 small cards with 
orange-tinted icon squares: «موتور تطبیق iMatch», «تابلوی تأمین», «اعلان تغییر 
قیمت», «درخواست قیمت», «اسکن بارکد», «کاتالوگ عمومی».

Section «چطور کار می‌کند؟»: 3 numbered step cards (۱ ثبت‌نام کن / ۲ کارت را 
بساز / ۳ بگذار ای‌مچ کار کند).

Section «از زبان خودشان»: 2 testimonial cards (orange left-border / graphite 
left-border) with avatar, name «رضا اکبری — مدیر تولید · تولیدی لوازم پلاستیکی» 
and «محمد نوری — مدیر رستوران · رستوران آراد».

Section «سوالات پرتکرار»: 3 accordion rows (first open): «آی‌مچ دقیقاً چیست؟» / 
«برای استفاده باید برنامه نصب کنم؟» / «آی‌مچ فقط یک ابزار ساخت کاتالوگ است؟».

Final CTA card (orange gradient, white button «ساخت حساب») + minimal footer 
(logo, links «ورود · ساخت حساب», «© ۱۴۰۵ iMach — دستیار خرید و فروش اصناف»).
Sticky bottom bar: «ساخت حساب» (orange, flex 1) + «ورود» (outline).
```

## صفحه ۱۶ — ثبت‌نام (دو گام)

```
Screen: SIGNUP page (mobile 390px, RTL Persian), step 2 of 2 shown.
Top subheader: back chevron + title «ساخت حساب» + subtitle «قدم دوم از دو».
Centered logo, then title «به ای‌مچ خوش آمدید» + sub «چند سؤال ساده — و دستیار 
خرید و فروشت آماده می‌شود».

Step indicator (2 steps): step 1 «شماره موبایل» done (green check circle), 
step 2 «کسب‌وکار شما» active (orange circle with «۲»), connected by a green bar.

Verified-phone banner (green tint, green border): green check circle + number 
«۰۹۱۲ ۳۴۵ ۶۷۸۹» + badge «تایید شد» + green link «ویرایش».

Form card (white, rounded 16px):
1. «نام و نام خانوادگی» → filled «علی رضایی».
2. «نام کسب‌وکار» → filled «پخش برنج پارس» (focused orange border) + hint 
   «این نام روی کاتالوگ عمومی شما دیده می‌شود».
3. «شما در ای‌مچ چه می‌کنید؟» → 3 equal pills: «می‌فروشم» (active, orange tint) 
   / «می‌خرم» / «هر دو». Below an info hint: «هر زمان از تنظیمات می‌توانید 
   عوضش کنید — دستیاری که لازم ندارید را خاموش کنید.»
4. «شهر» → select-like field «رشت» with chevron.
5. «صنف» → select-like field «مواد غذایی — پخش برنج» with chevron.
6. Checked row: «شرایط استفاده و حریم خصوصی ای‌مچ را می‌پذیرم» (orange checkbox).

Bottom link centered: «حساب دارید؟ وارد شوید».
Sticky action bar: full-width orange button «ساخت حساب و ورود».
```

## صفحه ۱۷ — ورود

```
Screen: LOGIN page (mobile 390px, RTL Persian), state = OTP code entering.
Top subheader: back chevron + title «ورود» + subtitle «یک قدم تا دستیارت».
Centered logo, title «خوش آمدید 👋» + sub «شماره‌ای که با آن ثبت‌نام کرده‌اید 
را وارد کنید».

White card:
1. «شماره موبایل» → input with prefix icon + «۹۸+» and number «۰۹۱۲ ۳۴۵ ۶۷۸۹».
2. «کد تایید ۵ رقمی» → hint «پیامک‌شده به همین شماره — ۰۹۱۲***۶۷۸۹», then 
   5 large OTP boxes (48x54px, LTR row): four filled «۴۷۲۹», fifth empty with 
   orange focus ring and blinking cursor. Meta row: clock icon «۰۱:۱۲» + 
   «ارسال مجدد کد تا ۱ دقیقه دیگر» (orange bold).

Below card: ghost button «ورود با رمز عبور», then «حساب ندارید؟ ساخت حساب» 
(orange bold), then tiny green-shield note «ورود شما با کد یک‌بار‌مصرف امن است».
Sticky action bar: full-width orange button «ورود به ای‌مچ».
```

## دسکتاپ D3 — صفحه اصلی (لندینگ دسکتاپ)

```
Desktop (1440px) PUBLIC LANDING page (RTL Persian), scrolled top view.
Top bar (white, 64px): logo + text nav («دستیارها» active orange-tinted, 
«امکانات», «چطور کار می‌کند») + spacer + ghost «ورود» + orange «ساخت حساب».
Hero two columns: RIGHT side text — pill «دستیار هوشمند اصناف ایران», H1 42px 
«خرید و فروشِ کسب‌وکار، ساده و حرفه‌ای» («ساده و حرفه‌ای» orange), sub 
paragraph, buttons «ساخت حساب» + «ورود», green-check note. LEFT side — a 
collage of two dark-bordered phone mockups (rounded 40px, notch, screenshots 
inside): back one rotated -5deg showing a supply-board screen, front one 
rotated 2.5deg showing a catalog screen.
Below: «از داخل ای‌مچ» horizontal scroll rail of 7 screenshot cards (235px 
wide) with captions and فروش/خرید tags; then «یک اپ، دو دستیار» two large 
cards side by side (orange gradient header / graphite header + checklists); 
«ابزارهایی که کار را جلو می‌برند» 3-column grid of 6 feature cards; 
«چطور کار می‌کند؟» 3 step cards with arrows; «از زبان خودشان» two testimonial 
cards; «سوالات پرتکرار» 3 accordion rows (first open); orange gradient CTA 
band «همین حالا شروع کن» with white button «ساخت حساب»; minimal footer.
```

---

## 💡 نکات Stitch

1. **صفحه‌به‌صفحه بدهید، نه یک‌جا** — Stitch کیفیت هر صفحه را وقتی یک تک‌آیتم می‌گیرد بهتر نگه می‌دارد.
2. اگر متن‌ها را انگلیسی برگرداند: *"All UI text must stay in Persian exactly as I provided."*
3. اگر RTL نشد: *"This is a right-to-left Persian app — mirror the layout."*
4. اگر دکمه‌ها نارنجیِ روشن زیادی ساخت: یادآوری کنید رنگ دکمه‌های خرید **graphite #292524** است، فقط فروش نارنجی.
5. خروجی نهایی (چه تصویر چه کد) را نگه دارید و به من بدهید — من با ماکاپ‌های HTML تطبیق می‌دهم و طرح نهایی را قفل می‌کنیم.
