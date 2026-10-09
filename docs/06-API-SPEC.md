# ۰۶ — سند سطح API (API Specification)

> **جایگاه:** مرجع قرارداد فرانت↔بک‌اند برای بازطراحی بک‌اند. ساختار بر اساس ماژول‌های موجود `imach-back` (NestJS + Fastify + Prisma/MongoDB، ~۱۰۰ اندپوینت) است؛ هر اندپوینت یکی از سه وضعیت را دارد: `✅ موجود` (بدون تغییر قرارداد) · `Δ اصلاح` (رفتار/فیلد جدید) · `+ جدید`.

---

## ۱. قواعد عمومی

- **احراز:** JWT Bearer (انقضای ۷ روز) + Refresh Token چرخشی (TTL ۳۰ روز، فقط hash ذخیره).
- **اعتبارسنجی:** class-validator در DTO — مرزِ enumها (سند 03 §۱.۷).
- **پول/عدد:** همهٔ مبالغ integer ریال (`*Minor`)؛ نرمال‌سازی ارقام فارسی/عربی در DTO (S13).
- **صفحه‌بندی:** cursor روی `_id` (monotonic)؛ هیچ list بدون سقف نیست.
- **خطا:** پاکت یکسان `{ statusCode, message, error }` + کدهای دامنه‌ای (مثلاً `ARMS_BOTH_OFF`).
- **مجوزها:** دستیار خاموش → اندپوینت‌های همان بازو 403 با `ARM_DISABLED`؛ ادمین با AdminGuard.
- **نرخ فراخوانی:** heartbeat حضور ≤۱ در ۶۰s؛ شمارندهٔ بازدید idempotent-per-session.
- **مستندسازی:** Swagger فعال می‌ماند؛ هر اندپوینت جدید با مثال فارسی.

---

## ۲. فهرست ماژول‌به‌ماژول

### auth — ✅ موجود
`checkPhone` · `quickRegister` · `registerUser` · `loginUser` · `setPassword` · `refreshSession` · `getMe` · `logout` · **Δ `setPrefs`** (+ theme sync) — بدون تغییر دیگر. OTP پیامکی وقتی زیرساخت رسید، همان قرارداد checkPhone را با `channel:"SMS"` گسترش می‌دهد.

### businesses — ✅ + Δ
`create` · `editBusiness` (Δ + phone/hours/defaultPayTerm قبلاً اضافه شده) · `setArms` (Δ گاردِ «حداقل یک دستیار») · `catalogCategories` (PUT) · `getMyBusinesses` (Δ + ratingAvg/lastSeenAt در خروجی) · `+ POST /businesses/presence` (heartbeat → lastSeenAt؛ 🔧 DM-2) · `+ GET /businesses/{slug}` عمومی (presence + امتیاز + bio — SSR).

### listings — Δ هستهٔ تغییرات
| اندپوینت | وضعیت | تغییر |
|---|---|---|
| `saveListing` (upsert) | Δ | DTO v2: `+note +title +baseQty` (قیمت همچنان به Good.unit؛ سرور pricePerBaseMinor را می‌سازد) · توقف بازنویسی Product.label (C6) |
| `bulkSave` | Δ | بازنویسی به **bulkPriceStock** سبک (M7): `[{listingId, priceMinor?, stock?, pct?}]` + بازسازی بج موجودی |
| `setListingActive` | ✅ | عدم نمایش/نمایش مجدد |
| `getMyListings` | Δ | `includeInactive` + فیلدهای v2 + شمارندهٔ comparison (M3) |
| `+ GET /listings/:id/events` | + | رویدادهای کالا با فیلتر بازه (N5) |
| `+ GET /listings/export` / `POST /listings/import` | + | CSV/XLSX با کلید «نام—بسته‌بندی»= variantKey (M10/S12) |
| `+ POST /listings/:id/view` | Δ | idempotent-per-session؛ فقط شمارنده (DM-3) |

### market — Δ موتور
| اندپوینت | وضعیت | تغییر |
|---|---|---|
| `requestQuote` | Δ | واریانت-آگاه (C4) + `expiresAt + targetPrice` (C3/M5) + گروه rfqGroupId + اطلاع NeedAlertها (N6) |
| `sendOffer` / `offerBuyRequest` | ✅ | score منجمد می‌ماند |
| `getSupplyBoard` | Δ | مرتب بر pricePerBaseMinor + pack-line + برچسب رابطه + جایگاه Promo(SUPPLY_BOARD) (C1) |
| `getBuyRequests` | Δ | priceRanks با ورودی نرمال |
| `getMyRfqs` | Δ | گروه‌بندی + مهلت/توقف/بایگانی + بهترین پیشنهاد (S1) |
| `stopRfq` / `restartRfq` / `archiveRfq` | + | چرخهٔ ۱۱/۳۶ (C3) |
| `repeatRfq` | + | کلون با refresh گیرندگان («دوباره درخواست بده»/«تکرار درخواست») |
| `setOfferStatus` | ✅ | INTERESTED/CONTACTED/REVIEWED |
| `getMyInquiries` / `markInquiryRead` | ✅ | — |
| `getWatchedBuyerNeeds` | Δ | منبع NeedAlert (تب گوش-به-زنگ ۰۵) |
| `+ POST /market/need-alerts` / `DELETE` | + | زنگولهٔ ۲۳ (N6) |
| `+ getComparison` | + | لیست مقایسهٔ ۳۳: قیمت‌های دنبال‌شدهٔ یک good مرتب-نرمال + پیشنهاد تطابق (C1) |

### goods / products / brand / units — Δ باغبانی
- `goods?q` جستجو ✅ · `+ POST /goods` پیشنهاد کالای جدید (PROVISIONAL) ✅ (موجود از GoodCreation) · `products/import-file` ✅ (۴۰k بارکدی).
- **Δ `units`**: ساخت واحد کاربری PROVISIONAL با کلید نرمال‌شده (M6) — مسیر عمومی‌سازی دقیق مثل brand.

### pricing — ✅ (کامل‌ترین ماژول)
`state` · `preview` (قیمت مؤثر خریدار — منبعِ «قیمت شما») · `catalog` / `group/:refId` / `item/:listingId` / `bulk` · `custType`. بدون تغییر ساختاری؛ Δ خروجی preview برای مبنای نرمال در پله‌ها.

### promos — Δ نوع-دار
`create` (Δ +type/placement/durationDays→endsAt) · `mine` · `report` (Δ تفکیک کمپین/هدفمند + viewerEvents) · `stop` (✅ + REFUND) · `charge-link`. `PromoEvent` شارژ رویدادمحور می‌ماند (VIEW=۱٬۰۰۰/FOLLOW=۵٬۰۰۰).

### wallet — ✅
`get` · `charge` (درگاه/شبیه‌سازی) · تراکنش‌ها با نوع CHARGE/PROMO_SPEND/REFERRAL_REWARD/REFUND.

### chat — ✅
`getThreads` · `getThread/:id` · `sendMessage` (+fileId) · `startThread`. Δ خروجی threadها + presence طرف مقابل.

### notifications — Δ
`list`/`readAll` ✅ · **Δ نوع‌های جدید**: REVIEW/REVIEW_REPLY/NEED/AD_SPENT/AD_BUDGET_END (سند 03 §۳.۵) + گیت notifPrefs.

### files — ✅
آپلود چند-اسلاتی (relatedModel/relatedId/fieldKey) · گالری Listing/آواتار/لوگو · پاک‌سازی staged.

### contacts — ✅
`sync`/`getContacts`/`invite` — دعوت‌های ?ref دار.

### reviews — + ماژول جدید
`GET /reviews?businessId=` (شیت cmnts + میانگین) · `POST /reviews` (upsert یک-نظر-به-کاتالوگ — DM-4) · `POST /reviews/:id/reply` (فروشنده) → بازسازی ratingAvg/Count (N2).

### feedback — + ماژول جدید
`GET/POST /feedback?kind=&arm=` · `POST /feedback/:id/like` · `POST /feedback/:id/reply` (کاربر/تیم) (N3) · `GET /testimonials` عمومی + `POST /testimonials` (approved=false) (N4) · `GET /video-lessons?arm=` (seed).

### settings / admin — ✅
AppSetting (payments.enabled / currency.*) + پنل باغبانی (merge/provisional) — فقط Δ صف‌های جدید: واحد PROVISIONAL، Testimonial تأیید.

---

## ۳. دو DTO مرجع (قفل قرارداد)

### SaveListingDto v2 (فرم ۰۴)
```ts
{
  goodId: ObjectId;                 // از goodpick (یا PROVISIONAL جدید)
  mode: "SELL" | "BUY" | "BOTH";
  productId?: ObjectId;             // مسیر برند/محصولات
  variantKey?: string;              // از بسته‌بندی/محصول — سرور سازگار می‌سازد
  title?: string;                   // + C6 — عنوان شخصی کاتالوگ
  note?: string;                    // + C2 — توضیحات فروشنده
  priceMinor?: number;              // به Good.unit (لیبل پویا در UI)
  baseQty?: number;                 // + C5 — تعداد واحد پایه (سرور pricePerBaseMinor می‌سازد)
  stock?: number; minOrder?: number;
  attrs?: { [key]: string | number };   // weight_g/packQty عددی (نرمال‌سازی)
  files?: string[];                 // گالری ≤۶
  catalogCategoryId?: string;
}
```

### RequestQuoteDto v2 (فرم ۱۲)
```ts
{
  goodId: ObjectId;
  listingId?: ObjectId;             // + C4 — واریانت هدف (خالی = بهترین نرمال)
  volume: number; frequency?: "WEEKLY"|"MONTHLY"|"OCCASIONAL";
  expiresAt: Date;                  // + C3 — ۱/۳/۵/≤۳۰ روز
  targetPriceMinor?: number;        // + M5
  deliveryCity?: string; note?: string;
  supplierIds?: ObjectId[];         // گیرندگان انتخابی
  includeNetwork?: boolean;         // «تأمین‌کنندگان جدید iMach»
}
```

---

## ۴. قواعد سازگاری و نسخه‌بندی

- تغییرات Δ همه **backward-compatible**: فیلد جدید اختیاری؛ خروجی‌ها فقط فیلد اضافه می‌کنند.
- پرچم‌های feature-flag (`AppSetting`: `v2.priceContract`) فعال‌سازی تدریجی قرارداد واحد-قیمت را کنترل می‌کنند تا کد قدیمی حین مهاجرت نشکند.
- هیچ اندپوینتی حذف نمی‌شود؛ مسیرهای جایگزین‌شده ۶ ماه deprecation-header می‌گیرند.
