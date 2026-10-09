# ۰۳ — سند مدل دادهٔ هدف (Data Model v2)

> **جایگاه:** این سند مرجع بازطراحی مدل‌های داده و بک‌اند است. مبنای آن: اسکیمای عملیاتی فعلی (`imach-back/prisma/schema.prisma` — v1، ۲۹ مدل)، دیتای زندهٔ Atlas، و نیازهای کامل پروتوتایپ redesign-base فاز ۳۶ (۴۷ صفحه). هر تغییر نسبت به v1 با `Δ` و هر فیلد جدید با `+` علامت خورده و منطقش نوشته شده است.
> **اصل حاکم:** همهٔ تغییرات «افزایشی»اند — هیچ فیلد حذف نمی‌شود، هیچ مهاجرت مخرب بدون بک‌آپ و اسکریپت برگشت انجام نمی‌شود.

---

## ۱. اصول طراحی دادهٔ iMach

1. **افزایشی باش:** فیلد جدید + backfill + کدِ خوانندهٔ新旧 — این الگو در v1 بارها ثابت شده (فازهای ۴–۱۳ مهاجرت بدون توقف سرویس).
2. **مرجع‌های جهانی find-or-create:** Good/Brand/Product/Unit با `searchText` نرمال‌شده یکتا می‌شوند؛ تکرارها همگرا می‌شوند، نه اینکه ردیف جدید ساخته شود.
3. **باغبانی PROVISIONAL:** ردیفِ کاربر-ساخته برای همه قابل استفاده است؛ فقط در صف ادمین می‌ماند (تأیید/ادغام/حذف). سه وضعیت: ACTIVE | PROVISIONAL | MERGED.
4. **شمارنده‌های denormalized:** هر عددی که در کارت‌های پرتکرار می‌نشیند، روی ردیفِ مادر نگه داشته می‌شود و «فرصت‌طلبانه» بازسازی می‌شود (مثل `catalogCount`, `viewCount30`) — نه با join زنده.
5. **خرج رویداد-محور:** هر کسر کیف پول یک ردیف رویداد با مرجع است؛ هیچ «موجودی خالص» بدون ردپا تغییر نمی‌کند.
6. **Snapshot در زمان نوشتن:** هر چیز که نمایش تاریخی/جغرافیایی دارد، هنگام نوشتن منجمد می‌شود (`currency`, `city`, `score` روی Offer) تا تاریخچه با تغییر الگوریتم خراب نشود.
7. **enum در مرز API:** MongoDB enum بومی ندارد؛ رشته‌ها با class-validator در DTO اعتبارسنجی می‌شوند — این الگو حفظ می‌شود.
8. **پول صحیح:** همهٔ مبالغ integer به «کوچک‌ترین واحد» (ریال) ذخیره می‌شوند؛ نمایش تومان = ÷۱۰ فقط در لایهٔ نمایش.
9. **قرارداد واحد-قیمت (سند ۰۴):** `Good.unit` واحد رسمی است؛ `baseQty` و `pricePerBaseMinor` روی Listing در زمان نوشتن محاسبه و ذخیره می‌شوند.

---

## ۲. نمای کلی مدل‌های v2 (۸ گروه، ۳۵ مدل)

| گروه | مدل‌ها | تغییر نسبت به v1 |
|---|---|---|
| هویت و حساب | User, Contact, RefreshToken, PushSubscription, Notification | Δ Notification (نوع‌های جدید) |
| مرجع کالا | Category, Good, Brand, Product, Unit, Trade | Δ Unit (+PROVISIONAL) · Δ Good (—) |
| کسب‌وکار | Business, Page | Δ Business (+ Presence + rating aggregate) |
| آگهی | Listing, PriceLog, File | **Δ Listing (هستهٔ تغییرات)** |
| رصد و رابطه | WatchedGood, Follow, NeedAlert | + NeedAlert (جدید) |
| تراکنش | Inquiry, Offer | Δ Inquiry (+expiresAt/stop) · Δ Offer (—) |
| پول و تبلیغ | Wallet, WalletTxn, Promo, PromoEvent, AppSetting | Δ Promo (+type/placement/duration) |
| محتوا و بازخورد | Thread, Message, CatalogReview, FeedbackPost, Testimonial, ListingEventLog, VideoLesson | **۶ مدل جدید** + Δ VideoLesson (محتوای راهنما) |
| آینده (فریز) | Market, MarketGoodRule, MarketMembership | بدون تغییر — پوششِ کیوریتِ آینده |

---

## ۳. تغییرات مدل‌های موجود

### ۳.۱. `Listing` — قلب تغییرات (C1/C2/C5/C6/M4/M8)

| فیلد | نوع | وضعیت | توضیح |
|---|---|---|---|
| `id` / `businessId` / `goodId` / `mode` | ObjectId/String | ✅ | SELL \| BUY \| BOTH |
| `variantKey` | String (default "") | ✅ | کلید تمایز ردیف‌های یک فروشنده برای یک کالا؛ از `Product.searchText` یا بسته‌بندی ساخته می‌شود |
| `variantLabel` | String? | ✅ | برچسب انسانی («کیسهٔ ۱۰ کیلویی»); **fallback نمایشی وقتی null = بسته‌بندی از attrs + واحد رسمی** (M4) |
| `brandId` / `productId` | ObjectId? | ✅ | برند/محصولِ مشترک |
| `priceMinor` | Int? | ✅ | قیمت به «واحد رسمی Good» — لیبل ورودی همیشه پویا: «قیمت هر [گونی]» |
| `currency` | String? | ✅ | ISO 4217، snapshot از کسب‌وکار |
| `stock` / `minOrder` | Int? | ✅ | به همان واحد رسمی؛ لیبل واحد صریح در فرم |
| `attrs` | Json? | Δ | **نرمال‌سازی کلیدهای عددی:** `weight_g: Int` (گرم) و `packQty: Int` به‌جای رشتهٔ «10kg»؛ کلیدهای enum دسته باقی می‌مانند |
| `packaging` | Json? | 🔧 باز | **تصمیم M8:** فعال‌سازی به‌عنوان `[{unitKey, containsQty, priceMinor?}]` برای پکیج‌بندی چندتایی، یا حذف با `baseQty` جایگزین. پیشنهاد: `baseQty` را منبع حقیقت کنیم و `packaging` را فقط برای قالب‌های چندگانهٔ قیمت-دار نگه داریم |
| **`baseQty`** | Float? | **+** | تعداد واحد پایای فیزیکیِ این واریانت (کیسهٔ ۵۰kg → 50)؛ بدون واریانت → 1؛ مبنای نرمال‌سازی قیمت (C1/C5) |
| **`pricePerBaseMinor`** | Int? | **+** | `priceMinor / baseQty` در زمان نوشتن محاسبه؛ **تنها مبنای رتبه‌بندی/مقایسه** (سند ۰۴) |
| **`title`** | String? | **+** | «عنوان در کاتالوگ» — شخصیِ این فروشنده؛ **توقف بازنویسیِ `Product.label` جهانی** (C6). خالی → fallback به variantLabel/نام کالا |
| **`note`** | String? | **+** | توضیحات فروشنده (شرایط فروش/پرداخت/تحویل) — کارت «توضیحات فروشنده» در ۰۲ (C2). خالی → کارت مخفی |
| `volume` / `frequency` | Float? / String? | ✅ | سمت خرید (BUY) |
| `city`/`province`/`country` | String | ✅ | snapshot جغرافیایی برای موتور بدون-join |
| `viewCount30`/`viewCountTotal`/`viewWindowStart` | Int/DateTime? | ✅ | پنجرهٔ سی‌روزهٔ بازدید |
| `catalogCategoryId` | String? | ✅ | دستهٔ شخصی ویترین |
| `isActive` | Boolean | ✅ | soft-delete / عدم نمایش |

**ایندکس‌های v2:**
```prisma
@@unique([businessId, goodId, variantKey])
@@index([goodId, isActive, mode])
@@index([goodId, isActive, mode, pricePerBaseMinor])   // + رتبه‌بندی نرمال در یک اسکن
@@index([businessId])
@@index([catalogCategoryId])
```

**مهاجرت (یک‌روزه):** backfill اسکریپتی روی ۴۴ ردیف زنده: parse `attrs.weight` رشته‌ای → `baseQty`؛ محاسبهٔ `pricePerBaseMinor`؛ `title = variantLabel` جایی که خالی نیست. ردیف بدون وزن → `baseQty = null` + پرچم برای تکمیل توسط فروشنده (M4 در UI).

### ۳.۲. `Inquiry` — مهلت و کنترل چرخه (C3/C4/M5)

| فیلد | وضعیت | توضیح |
|---|---|---|
| `volume`, `note`, `frequency`, `delivery`, `deliveryCity`, `targetPriceMinor`, `rfqGroupId`, `status`, `isRead` | ✅ | بدون تغییر |
| **`expiresAt`** | **+ DateTime** | مهلت پاسخ‌گویی فرم ۱۲ (۱/۳/۵/سایر تا ۳۰ روز)؛ نول = بی‌مهلت (legacy) |
| **`stoppedAt`** | **+ DateTime?** | توقف خریدار («متوقف — برای فروشندگان نمایش داده نمی‌شود»)؛ شروع مجدد = null |
| `status` | Δ | NEW \| ANSWERED \| **EXPIRED** \| ARCHIVED — سرویسِ خواندن، منقضی‌شده‌ها را EXPIRED گزارش می‌کند (مجاناً از expiresAt) |

**Δ منطق (C4):** `requestQuote` ردیفِ درخواست را به **واریانتِ انتخابیِ خریدار** می‌چسباند (listingId واریانت هدف)؛ فقط در نبود واریانت مشخص به ارزان‌ترینِ به‌ازای-واحد fallback می‌کند — نه به ارزان‌ترینِ خام. `targetPriceMinor` به فرم ۱۲ برمی‌گردد (M5).

### ۳.۳. `Unit` — واحد کاربرساخته (M6)

```prisma
model Unit {
  id          String  @id @default(auto()) @map("_id") @db.ObjectId
  key         String  @unique        // KILOGRAM | CARTON24 | …
  nameFa      String
  nameEn      String
  nameAr      String?
  scope       String  @default("base")   // base | retail | wholesale
  baseUnitKey String?                    // CARTON → PIECE
  containsQty Int?                       // تعداد واحد پایه در این بسته
  qtyIsFixed  Boolean @default(false)
  isActive    Boolean @default(true)
  status      String  @default("ACTIVE")   // + ACTIVE | PROVISIONAL (باغبانی ادمین)
  creatorRole String?                      // + USER | ADMIN
  createdById String? @db.ObjectId
}
```
شیت unitpick پروتوتایپ وعدهٔ «واحد جدید بساز» می‌دهد؛ بک‌اند فعلی ADMIN-only است. الگوی Good/Brand اعمال می‌شود: کلید نرمال‌شده از نام فارسی + PROVISIONAL.

### ۳.۴. `Promo` — دو نوع تبلیغ با جایگاه (N7/P-3)

| فیلد | وضعیت | توضیح |
|---|---|---|
| `businessId`, `listingId`, `budgetMinor`, `spentMinor`, `isActive`, `stoppedAt` | ✅ | — |
| **`type`** | **+ String** | `CAMPAIGN` (فروش ویژه در ۳۱ + نشان کاتالوگ + جایگاه ۰۲) \| `TARGETED` (دو جایگاه جراحی‌وار) |
| **`placement`** | **+ String?** | فقط TARGETED: `SAVED_CATALOGS` (کاتالوک‌های ذخیره‌شده) \| `SUPPLY_BOARD` (تابلوی تأمین همان کالا) |
| **`durationDays`** | **+ Int?** | فقط CAMPAIGN: ۳/۷/۱۴ روز — کنار بودجه (P-3) |
| **`endsAt`** | **+ DateTime?** | محاسبه‌شده در ایجاد؛ پایان مدت = توقف + REFUND باقیمانده |

`PromoEvent` بدون تغییر (VIEW=۱٬۰۰۰ / FOLLOW/درخواست=۵٬۰۰۰ — منطبق با قیمت‌گذاری قفل‌شده).

### ۳.۵. `Notification` — نوع‌های جدید

انواع موجود: FOLLOW_SUPPLIER | FOLLOW_BUYER | OFFER | QUOTE | CONTACT_JOINED | PRICE_CHANGE.
**+ انواع جدید:** `REVIEW` (نظر جدید روی کاتالوکم) · `REVIEW_REPLY` (پاسخ فروشنده به نظرم) · `NEED` (درخواست خرید از خریداری که گوش‌به‌زنگش را دارم) · `AD_SPENT` (هزینهٔ تبلیغ + موجودی) · `AD_BUDGET_END` (اتمام بودجه).

### ۳.۶. `Business` — تجمیع‌های نمایشی

| فیلد | وضعیت | توضیح |
|---|---|---|
| همهٔ فیلدهای v1 (slug, name, activityType, trade/tradeId, catalogCount, city, province, country, currency, phone, bio, isVerified, isDemo, customCategories, lat/lng, address, hours, defaultPayTerm, notifPrefs, enabledArms, ownerId) | ✅ | بدون تغییر |
| **`ratingAvg`** | **+ Float?** | میانگین امتیاز کاتالوک — denormalized بازسازی‌شده در هر ثبت نظر |
| **`ratingCount`** | **+ Int @default(0)** | تعداد نظرات؛ جفتِ ratingAvg |
| **`lastSeenAt`** | **+ DateTime?** | heartbeat حضور آنلاین (آستانهٔ آنلاین = ۹۰ ثانیه) — ساده‌ترین پیاده‌سازی Presence بدون سرویس جدا (جایگزین مدل مستند درصورت رشد) |

### ۳.۷. `Good` / `Category` / `Brand` / `Product` / `WatchedGood` / `Follow` / `Page` / `File` / `Trade` / `Wallet` / `WalletTxn` / `PriceLog` / `AppSetting` / `Thread` / `Message` / `Contact` / `RefreshToken` / `PushSubscription` / `User`

بدون تغییر ساختاری. نکات قراردادی:
- `Good.unit` واحد رسمی می‌ماند (مادهٔ ۱ قرارداد واحد-قیمت).
- `Follow` همان یال «ذخیرهٔ کاتالوک» است: `source` (ORGANIC/SHARED/PROMO) + `custType` (گذری/همکار/قراردادی) + `viaRef`.
- `PriceLog` حالا **منبع رویداد PRICE_CHANGE هم هست** (throttle روزانه با WatchedGood.lastNotifiedAt).
- `WatchedGood.archivedAt` = آرشیو موقت لیست خرید با حفظ رصد.

## ۴. مدل‌های جدید v2 (شش مدل + یک مدل محتوا)

> این‌ها قابلیت‌هایی هستند که پروتوتایپ فاز ۲۲–۳۶ ساخته اما v1 مدل ندارد. همه اختیاری-nullable-فریندلی طراحی شده‌اند تا rollout تدریجی ممکن باشد.

### ۴.۱. `CatalogReview` — نظرات و امتیاز کاتالوگ (S3/N2)

```prisma
/// نظر+امتیاز خریدار روی کاتالوگ فروشنده (شیت sheet-cmnts در ۱۳)
/// + پاسخ عمومی فروشنده زیر همان نظر.
model CatalogReview {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  businessId        String   @db.ObjectId      // فروشندهٔ هدف (کاتالوگ)
  business          Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  authorUserId      String   @db.ObjectId      // نویسنده (شخص)
  author            User     @relation("ReviewAuthor", fields: [authorUserId], references: [id])
  authorBusinessId  String?  @db.ObjectId      // کسب‌وکار نویسنده (هویت نمایش: نام+احراز)
  rating            Int                          // 1..5 — ستاره‌سِلکت
  text              String?                      // متن اختیاری (فقط ستاره هم مجاز)
  reply             String?                      // پاسخ فروشنده
  repliedAt         DateTime?
  createdAt         DateTime @default(now())

  @@index([businessId, createdAt])
  @@index([businessId, rating])
}
```
قواعد: هر خریدار به‌ازای هر کاتالوگ یک نظر (upsert سرویس‌سوی) · ثبت/پاسخ → بازسازی `Business.ratingAvg/ratingCount` · نمایش: میانگین در هدر ۱۳/۰۷ (sheet-pubview)، ریز در شیت.

### ۴.۲. `FeedbackPost` — بازخورد و پرسش‌وپاسخ (N3)

```prisma
/// پست کاربران دربارهٔ دستیارها (۳۷ خرید / ۳۸ فروش) و پرسش‌وپاسخ راهنماها (۴۰/۴۱)
/// لایک + پاسخ تورفته + پاسخ تیم آیمچ.
model FeedbackPost {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  kind             String                  // FEEDBACK | QUESTION
  arm              String                  // BUY | SELL (میزبانی کدام دستیار)
  authorBusinessId String   @db.ObjectId
  author           Business @relation("FbAuthor", fields: [authorBusinessId], references: [id], onDelete: Cascade)
  text             String
  likeCount        Int      @default(0)
  replies          Json?    // [{businessId|team, text, createdAt}] — تورفته؛ حجم کم، JSON کافی
  createdAt        DateTime @default(now())

  @@index([kind, arm, createdAt])
}
```
`likeCount` denormalized (upsert بدون join)؛ لایکِ هر کسب‌وکار یک‌بار — کلید یکتایی در `replies`/لایک با سرویس کنترل می‌شود (مثل PromoEvent).

### ۴.۳. `Testimonial` — نظرات عمومی لندینگ (N4)

```prisma
/// نظرات ویترین عمومی (نوار «نظر خریداران» لندینگ ۱۵ + صفحهٔ ۴۳)
model Testimonial {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String                 // نام و نام خانوادگی
  business    String                 // کسب‌وکار
  role        String                 // نقش نمایشی
  isBuyer     Boolean @default(false) // دکمهٔ کارت: کاتالوگ (فروشنده) | لیست خرید (خریدار)
  feature     String?                // چیپ قابلیت («تابلوی تأمین»…)
  text        String
  approved    Boolean @default(false) // ⚠️ P-2: تأیید ادمین پیش از نمایش
  sortHint    Int     @default(0)     // ترتیب دستی ویترین
  createdAt   DateTime @default(now())

  @@index([approved, sortHint])
}
```
مدل ثبت نظر عمومی (dlg-rvw) هم همین را با `approved=false` می‌سازد.

### ۴.۴. `ListingEventLog` — تاریخچهٔ رویدادهای کالا (N5)

```prisma
/// خط زمانی تعامل با یک آگهی — شیت «تاریخچهٔ رویدادها» در ۰۳ با فیلتر بازه.
/// انواع: VIEW · WATCH_ADD (افزودن به لیست خرید) · COMPARE_ADD · INQUIRY · CHAT · CAMPAIGN_VIEW
model ListingEventLog {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  listingId        String   @db.ObjectId
  listing          Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  type             String
  actorBusinessId  String?  @db.ObjectId   // null = سیستمی/عمومی
  actorName        String?                 // snapshot نام برای جمله‌سازی («علی محمدی از … بازدید کرد»)
  createdAt        DateTime @default(now())

  @@index([listingId, createdAt])
  @@index([listingId, type, createdAt])
}
```
**نکتهٔ حجم:** VIEW روی همین جدول پرحجم می‌شود؛ راهکار: شمارندهٔ `viewCount30/Total` برای اعداد + ردیف EventLog فقط برای رویدادهای غیر-بازدید یا بازدیدِ تبلیغی (CAMPAIGN_VIEW که شارژ می‌شود). 🔧 باز: تفکیک جدول impressions تبلیغ از EventLog.

### ۴.۵. `NeedAlert` — گوش به زنگ فروشنده (N6/D-2)

```prisma
/// اشتراک فروشنده به نیاز خریدار برای یک کالا (زنگولهٔ صفحهٔ ۲۳)
/// فعال‌شدنش یعنی: RFQهای این خریدار برای این کالا، در تب «گوش به زنگ» صفحهٔ ۰۵ دیده می‌شود.
model NeedAlert {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  sellerBusinessId String   @db.ObjectId
  seller           Business @relation("NeedAlertSeller", fields: [sellerBusinessId], references: [id], onDelete: Cascade)
  buyerBusinessId  String   @db.ObjectId
  buyer            Business @relation("NeedAlertBuyer", fields: [buyerBusinessId], references: [id], onDelete: Cascade)
  goodId           String   @db.ObjectId
  good             Good     @relation(fields: [goodId], references: [id], onDelete: Cascade)
  createdAt        DateTime @default(now())

  @@unique([sellerBusinessId, buyerBusinessId, goodId])
  @@index([buyerBusinessId, goodId])   // جریان: RFQ جدید → یال‌های فعال → اعلان NEED
}
```

### ۴.۶. `VideoLesson` — فیلم‌های آموزشی راهنماها (۴۰/۴۱)

```prisma
/// فیلم‌های آموزشی راهنمای دستیارها (۴۰ خرید / ۴۱ فروش) — شیت پخش sheet-video
model VideoLesson {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  arm       String                  // BUY | SELL
  title     String
  durationS Int                     // ثانیه
  posterUrl String                  // اسکرین‌شات همان بخش سیستم
  bullets   String[]                // «در این فیلم می‌بینید» (۳ مورد)
  sortHint  Int      @default(0)
  isActive  Boolean  @default(true)

  @@index([arm, sortHint])
}
```
منبع: VD_DATA پروتوتایپ seed می‌شود؛ بارگذاری ویدیوی واقعی فاز محتوایی است، نه فاز داده.

---

## ۵. نقشهٔ مهاجرت دیتای زنده (Atlas → v2)

**قاعدهٔ کلی:** قبل از هر تغییر مخرب، بک‌آپ کامل در `imach-back/backups/` + تأیید restore. دیتای مرجع (Good/Product/Brand/Category/Unit) هرگز دست‌نخورده می‌ماند.

| گام | عمل | حجم | ریسک |
|---|---|---|---|
| ۱ | افزودن فیلدهای nullable جدید (baseQty, pricePerBaseMinor, title, note, expiresAt, stoppedAt, type/placement/durationDays, ratingAvg/Count, lastSeenAt) | اسکیمای اضافی | صفر — افزایشی |
| ۲ | Backfill Listing: parse attrs.weight → baseQty → pricePerBaseMinor؛ title از variantLabel | ۴۴ ردیف | کم — اسکریپت idempotent |
| ۳ | ساخت کالکشن‌های جدید + seed (VideoLesson از VD_DATA، Testimonial از TS_DATA) | seed | صفر |
| ۴ | همگام‌سازی DiscountRuleها | ۳ ردیف موجود، سازگار | صفر |
| ۵ | Deploy کد v2 (خوانندهٔ فیلدهای جدید + نویسندهٔ آن‌ها در saveListing/requestQuote) | — | متوسط — پشت پرچم feature-flag |
| ۶ | بازسازی ratingAvg از نظرات آینده (الان صفر) | — | صفر |

**خط پایهٔ صحت (پس از هر گام):** Good=۲٬۴۷۹ · Product=۴۰٬۴۱۷ · Brand=۳٬۷۶۹ · Category=۲۰۷ · Unit=۶۲ نباید تغییر کند.

---

## ۶. خطوط قرمز طراحی داده (چه کاری نمی‌کنیم)

1. **attrs ساختاریافتهٔ کالبدشکن نمی‌شود:** وزن/تعداد فقط به‌صورت دو کلید عددی استاندارد (`weight_g`, `packQty`) نرمال می‌شوند؛ ساختار «فیلد داینامیک برای هر ویژگی» = بازگشت مسئلهٔ «۲۵۰گرم/۰٫۲۵کیلو» در مقیاس بزرگ.
2. **جدول واریانت جدا ساخته نمی‌شود:** واریانت = ردیف Listing با variantKey — الگوی اثبات‌شدهٔ «یک کالا، چند بسته».
3. **رتبهٔ تطبیق هرگز فیلد پولی نمی‌خورد:** Promo و Matching دو جهان جدا هستند؛ تنها نقطهٔ تماس = «جایگاه تبلیغی» با برچسب.
4. **موجودی و قیمت در یک جدول جدا (inventory) شکسته نمی‌شود:** کار روزمرهٔ ۴۴ روی همان Listing با bulk-update سبک انجام می‌شود.
5. **هیچ مبلغ کالایی/سفارش ذخیره نمی‌شود:** معامله بیرون از سیستم است؛ Wallet فقط تبلیغ/پاداش.
6. **ids سازگاری به regexp گره نمی‌خورد:** همهٔ جستجوها از searchText نرمال‌شده عبور می‌کنند.

---

## ۷. تصمیم‌های باز داده‌ای (نیازمند قفل مالک)

| # | موضوع | گزینه‌ها | پیشنهاد تحلیلی |
|---|---|---|---|
| DM-1 | `packaging`: فعال با قیمت چندگانه یا حذف | فعال محدود / حذف | حذف منطقیِ قیمتی؛ نگه‌داشتن فقط به‌عنوان {unitKey, containsQty} برای baseQty (M8) |
| DM-2 | Presence: فیلد `Business.lastSeenAt` یا سرویس مستقل (Redis) | فیلد / سرویس | فیلد + heartbeat ۶۰s؛ مهاجرت به سرویس وقتی >۱۰k کاربر همزمان |
| DM-3 | EventLog impressions تبلیغ: همان جدول یا PromoEvent بس یابد | یک جدول / دوتایی | PromoEvent برای شارژ + EventLog برای غیر-بازدید؛ بازدید عادی فقط شمارنده |
| DM-4 | unique بودن نظر هر خریدار به‌ازای کاتالوگ | upsert سرویس / اجازهٔ چندنظر | یک نظر قابل ویرایش (upsert) — امتیاز تمیزتر می‌ماند |
| DM-5 | `Inquiry` بدون BUY-listing (مستقیم از تابلوی ۰۹) | nullable listingId / الزام watch | nullable + goodId صریح روی Inquiry برای استعلام آزاد |

