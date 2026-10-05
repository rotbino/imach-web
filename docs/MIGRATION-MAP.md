# iMach — نقشه مهاجرت (Migration Map)

> نگاشت کامل: **صفحه Prototype → مسیر Next.js → کامپوننت‌ها → API → سرویس بک‌اند → کالکشن DB**
> مبنای بصری: `redesign-final/index.html` (v18 — ۳۰ صفحه `sc-*` + ۲۴ شیت `sheet-*`)
> مبنای داده: `imach-back` (NestJS — ۱۸ ماژول، ~۱۰۰ اندپوینت) + `imach_online_db` (۲۶ کالکشن)

## ۰. معماری مسیرها

```
app/
├─ page.tsx                  لندینگ فعلی (فاز ۷ → لندینگ جدید)
├─ (pub)/                    عمومی · SEO · بدون شل
│   ├─ page.tsx              لندینگ جدید (فاز ۷)
│   ├─ c/[slug]/             sc-catalog-public — کاتالوگ عمومی فروشنده
│   ├─ b/[slug]/             sc-list-public — لیست خرید عمومی
│   └─ p/[slug]/             sc-sell-product-public — محصول عمومی
├─ (app)/                    شل احراز‌شده · layout = AppShell(appbar+tabbar+deskbar) + data-arm
│   ├─ home/                 خانه خریدار
│   ├─ item/[goodId]/        کالا در لیست خریدار
│   ├─ board/[goodId]/       تابلوی تأمین
│   ├─ saved/                کاتالوگ‌های ذخیره‌شده
│   ├─ offers/               پیشنهادها (خریدار)
│   ├─ add/                  افزودن کالا
│   ├─ rfq/[inquiryId]/      استعلام RFQ
│   ├─ search/               جستجوی جهانی
│   ├─ msgs/ · msgs/[id]/    پیام‌ها + چت
│   ├─ notifications/        مرکز اعلان‌ها
│   ├─ profile/              پروفایل (خریدار/فروشنده)
│   ├─ settings/ · settings/business/   تنظیمات + ویرایش کسب‌وکار
│   ├─ wallet/ · wallet/charge/          کیف پول + شارژ
│   └─ sell/
│       ├─ requests/         خانه فروشنده (درخواست‌ها)
│       ├─ catalog/          کاتالوگ فروشنده
│       ├─ product/[id]/     محصول (نمای مالک)
│       ├─ discounts/        تخفیف‌ها
│       ├─ campaign/         کمپین تبلیغاتی
│       └─ quote/[id]/       پاسخ استعلام (پیشنهاد)
├─ login/ · start/           ورود/ثبت‌نام/آنبوردینگ (بیرون از شل)
└─ admin/                    پنل ادمین موجود (دست‌نخورده در مهاجرت UI)
```

**قواعد:**
- گروه `(app)` = layout شل (appbar + tabbar موبایل / deskbar دسکتاپ) + `data-arm` (buy|sell) روی ریشه → تم فیروزه‌ای/نارنجی همان مکانیزم Prototype
- `sc-desktop` صفحه نیست؛ رفتار ≥۹۲۰px همین شل است (deskbar + ستون محتوا max-width 860px + شیت→دیالوگ وسط)
- `sc-empty` الگوی empty-state است (کامپوننت `<EmptyState>`) نه مسیر
- مسیرهای موجود (`/buy/*` فعلی) در فاز مربوطه به‌درستی جابه‌جا/بازطراحی می‌شوند (URL نهایی همان ستون «مسیر» است)

## ۱. صفحه‌ها (۳۰)

| # | صفحه Prototype | مسیر هدف | فاز | کامپوننت‌های اصلی | API بک‌اند موجود | سرویس | DB |
|---|---|---|---|---|---|---|---|
| ۱ | sc-onboard | /start (بازطراحی) | ۲ | RoleChoice, ChoiceGrid | POST /auth/register flow | auth | User, Business |
| ۲ | sc-login | /login (بازطراحی) | ۲ | LoginForm, OtpForm | POST /auth/otp-request, /auth/verify | auth | User, RefreshToken |
| ۳ | sc-signup | /login (تب/مرحله ثبت‌نام) | ۲ | SignupForm, BizForm | POST /auth/register, /businesses | auth, businesses | User, Business |
| ۴ | sc-buy-list | (app)/home | ۱→۳ | AppShell, Greet, ShareStrip, SavedStrip, GoodRow | GET /watched-goods, GET /savers, GET /listings?mine | watchedGoods, listings | WatchedGood, Listing, PriceLog |
| ۵ | sc-buy-item | (app)/item/[goodId] | ۳ | ItemHeader, PriceLine, FollowToggle, SupplierMini | GET /goods/:id, GET /listings?goodId, POST /follows | goods, listings, follows | Good, Listing, Follow |
| ۶ | sc-board | (app)/board/[goodId] | ۳ | BoardTable, SortBar, UnitNote, PackLine, RfqBar | GET /listings?goodId&sort, GET /goods/:id/units | listings, goods | Listing, PriceLog, Good |
| ۷ | sc-suppliers | (app)/saved | ۳ | SavedCatalogCard, NewGoodBadge | GET /follows?type=CATALOG | follows | Follow(source=CATALOG) |
| ۸ | sc-offers | (app)/offers | ۴ | OfferCard, CompareSheet, OfferStatusPill | GET /inquiries/mine, GET /offers?inquiryId | inquiries, offers | Inquiry, Offer |
| ۹ | sc-buy-profile | (app)/profile | ۶ | BizCard, ArmSwitch, ThemeSwitch | GET /businesses/me, PATCH /businesses/me | businesses | Business |
| ۱۰ | sc-sell-requests | (app)/sell/requests | ۴→۵ | RequestCard, TasksBar(قیمت‌های امروز), ReRfqBtn | GET /inquiries?forSeller, GET /listings/stale | inquiries, listings, matching | Inquiry, Listing |
| ۱۱ | sc-sell-catalog | (app)/sell/catalog | ۵ | CatalogList, ProductRow, PriceEntry | GET /listings?mine, PATCH /listings/:id/price | listings | Listing, PriceLog |
| ۱۲ | sc-sell-product-owner | (app)/sell/product/[id] | ۵ | ProductView, RateTiers, Packaging, VisibilityCtrl | GET /listings/:id, PATCH /listings/:id | listings | Listing |
| ۱۳ | sc-sell-product-public | (pub)/p/[slug] | ۷ | PublicProduct, PriceHistoryChart, SellerCard | GET /pages/slug, GET /listings/:id/public | pages, listings | Page, Listing |
| ۱۴ | sc-discount | (app)/sell/discounts | ۵ | DiscountRuleList, CustTypeTabs, TierEditor | ➕ DiscountRule CRUD (جدید) | discounts(جدید) | CustomerType, DiscountRule (جدید) |
| ۱۵ | sc-sell-profile | (app)/profile (arm=sell) | ۶ | StorefrontProfile, StatsCard | GET /businesses/me | businesses | Business, Page |
| ۱۶ | sc-rfq | (app)/rfq/[inquiryId] | ۴ | RfqWizard(triCalc), TargetPicker | POST /inquiries, POST /inquiries/:id/send | inquiries, matching | Inquiry (+RfqDetail جدید) |
| ۱۷ | sc-quote | (app)/sell/quote/[id] | ۴ | QuoteForm, PriceComposer, ExpiryCtrl | POST /offers | offers | Offer |
| ۱۸ | sc-campaign | (app)/sell/campaign | ۶ | CampaignForm, BudgetBar, PromoPreview | POST /promos, GET /promos/me | promos | Promo, PromoEvent, Wallet, WalletTxn |
| ۱۹ | sc-wallet | (app)/wallet | ۶ | BalanceCard, TxnList, InviteCreditCard | GET /wallet, GET /wallet/txns | wallet | Wallet, WalletTxn |
| ۲۰ | sc-charge | (app)/wallet/charge | ۶ | ChargeForm, GatewayPanel | POST /wallet/charge | wallet | WalletTxn |
| ۲۱ | sc-search | (app)/search | ۳ | SearchBar, GoodResult, RecentChips | GET /goods?q (جستجوی موجود) | goods | Good, Brand |
| ۲۲ | sc-add-item | (app)/add | ۳ | AddFlow(NewGood/Import/QuickSearch), FreqPicker | GET /goods?q, POST /watched-goods | watchedGoods | WatchedGood, GoodCreation(جدید) |
| ۲۳ | sc-msgs | (app)/msgs | ۶ | ThreadList, UnreadBadge | ➕ GET /threads (جدید) | chat(جدید) | Thread/Message (جدید) |
| ۲۴ | sc-chat | (app)/msgs/[id] | ۶ | ChatView, Composer, AttachTray | ➕ GET/POST /threads/:id/messages | chat(جدید) | Message (جدید) |
| ۲۵ | sc-notifications (شیت sheet-notif هم) | (app)/notifications + sheet | ۶ | NotifList, NotifRow | GET /notifications, POST /notifications/read | notifications | Notification |
| ۲۶ | sc-settings | (app)/settings | ۶ | SettingsList, ThemeSection(روشن/تاریک/رنگ arm), LangSection(fa/en/ar), CurrencySection | GET/PATCH /users/me/prefs | users | User(prefs) |
| ۲۷ | sc-edit-biz | (app)/settings/business | ۶ | BizEditForm, LocationPicker, LogoUpload | PATCH /businesses/me, POST /files | businesses, files | Business, File |
| ۲۸ | sc-catalog-public | (pub)/c/[slug] | ۷ | PublicCatalog, ProductGrid, FollowBar | GET /pages/slug, POST /follows | pages, follows | Page, Listing, Follow |
| ۲۹ | sc-list-public | (pub)/b/[slug] | ۷ | PublicList, RfqCta | GET /pages/slug (type=LIST) | pages | Page |
| ۳۰ | sc-desktop / sc-empty | رفتار ریسپانسیو / الگوی خالی | ۱ | AppShell ≥۹۲۰px · EmptyState | — | — | — |

## ۲. شیت‌ها (۲۴) — همه به کامپوننت `<Sheet>` یکپارچه

| شیت | میزبان (مسیر) | فاز | API |
|---|---|---|---|
| sheet-switch (تعویض arm) | AppShell — global | ۱ | - (local) |
| sheet-notif | AppShell — global | ۶ | GET /notifications |
| sheet-new-good | /add | ۳ | POST /goods (پیشنهاد کالای جدید) |
| sheet-import | /add | ۳ | POST /goods/import (ImportChannel) |
| sheet-filter | /board/[goodId] | ۳ | query params |
| sheet-follow | /item/[goodId] | ۳ | POST /follows |
| sheet-rates | /sell/product/[id] | ۵ | GET/PUT /listings/:id/rates (GoodRateTier جدید) |
| sheet-item-discount | /sell/discounts | ۵ | CRUD DiscountRule |
| sheet-cust-type | /sell/discounts | ۵ | GET /customers/types |
| sheet-help-discount | /sell/discounts | ۵ | - (static) |
| sheet-quickprice | /sell/catalog | ۵ | PATCH /listings/:id/price |
| sheet-bulk | /sell/catalog | ۵ | PATCH /listings/bulk |
| sheet-rfq-detail | /offers, /sell/requests | ۴ | GET /inquiries/:id |
| sheet-share-rfq | /rfq/[id] | ۴ | POST /inquiries/:id/share |
| sheet-offer-status | /offers | ۴ | PATCH /offers/:id/status |
| sheet-savers | /item/[goodId] | ۳ | GET /savers?goodId |
| sheet-followers | /sell/catalog, /c/[slug] | ۵ | GET /follows?target=me |
| sheet-promote | /sell/catalog | ۶ | POST /promos |
| sheet-share / sheet-share-list / sheet-share-product | ShareSheet(global) | ۶ | - (Web Share/local) |
| sheet-contacts | AppShell | ۶ | GET/POST /contacts |
| sheet-call | /msgs/[id], /c/[slug] | ۶ | GET /contacts (tel:) |
| sheet-new-group | /add | ۵ | POST /goods (grouping) |

## ۳. شکاف‌های قطعی بک‌اند (به ترتیب فاز)

| فاز | قابلیت جدید | مدل/فیلد پیشنهادی |
|---|---|---|
| ۳ | Saver مستقل از Follow | WatchedGood ← already; `Follow.source` (قبلاً اضافه شده) |
| ۴ | جزئیات RFQ + وضعیت پیشنهاد | Inquiry.rfqDetail {spec,packaging,delivery}; Offer.status(interested/contacted/reviewed) |
| ۴ | گوش‌به‌زنگ نیاز (NeedAlert) | NeedAlert {goodId, region, minQty, …} |
| ۵ | نوع مشتری × قواعد تخفیف | CustomerType(passing/partner/contract) · DiscountRule{scope: catalog/group/item, tier} |
| ۵ | نرخ پله‌ای کالا | GoodRateTier {listingId, breakpoints[4], prices} |
| ۵ | پکیج‌بندی چندتایی | Listing.packaging[] |
| ۶ | چت/پیام | Thread + Message |
| ۶ | ردیابی نمایش کامل | Impression {surface, ref, actor, at} |
| ۶ | اعتبار دعوت | InviteCode / WalletTxn(kind=INVITE) |
| ۸ | بین‌الملل | User.prefs{lang,currency,country} · CurrencyRate{base,quote,rate} · ترجمه‌های Good/Unit/Category |

## ۴. تطبیق‌های آگاهانه نسبت به Prototype (ثبت‌شده)

| مورد | Prototype | Production | دلیل |
|---|---|---|---|
| قاب گوشی/notch/statusbar/home-indicator | scaffold دمو | حذف | اپ واقعی؛ statusbar واقعی OS خودش هست |
| nav-panel دسکتاپ (پنل توضیح دمو) | scaffold دمو | حذف | ابزار دموی Prototype است نه محصول |
| .phone/.screen-stack | کانتینر فریم | `.app` + مسیر per-screen | Next.js هر مسیر یک صفحه دارد؛ رفتار ≥۹۲۰px عیناً از قواعد دسک‌بار Prototype |
| فونت | @font-face نسبتی | next/font/local + var(--font-iran) | preload/swAP/CLS طبق §۱۴ — خروجی بصری یکسان |
| ردیف OTP در sc-login | کد پیامک‌شده ۵خانه‌ای | فرم رمز عبور واقعی + بنر phone-verified (از sc-signup) | بک‌اند فعلاً OTP ندارد — UI بدون بک‌اند = mock ممنوع (§۶۳)؛ با فعال‌سازی پیامک، همین‌جا جایگزین می‌شود |
| بج «N دنبال‌شده» در sc-buy-list | شمارش دنبال‌کردن کالا | pulse-dot (watched) + بج b-stone «N تأمین‌کننده» | دادهٔ صادقانهٔ موجود (supplierCount)؛ شمارش savers خریداری در API خریدار وجود ندارد |
| دموی ثابت شمارش‌ها (۲ اعلان/۳ پیشنهاد/۱ چت) | اعداد hardcoded دمو | بج‌های واقعی (unread/answeredCount/watchedNeeds) و حذف بج چت | دادهٔ واقعی؛ چت بک‌اند ندارد (فاز ۶) |
| JS ناوبری stack | go()/back() داخل یک HTML | Next.js router | — |

## ۵. خط پایه دیتا (برای integrity check هر فاز — §۴۷)

Good=2479 · Product=40417 · Brand=3769 · Category=207 · Unit=62 · Business=35 · User=6 · Listing=38 · Page=68 · Follow=35 · WatchedGood=16 · Inquiry=9 · Offer=2 · PriceLog=9 · Notification=13 · Wallet=1 · PromoEvent=8 · RefreshToken=438 · File=2 — (بک‌آپ کامل: `imach-back/backups/migration/2026-10-05/manifest.json`)
