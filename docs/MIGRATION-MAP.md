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
| ۱ | sc-onboard | / (صفحهٔ اول) | ۳ ✅ | Onboard, ChoiceGrid, LangSwitch, IntroTabs, BenList | — (عمومی/معرفی) | — | — |
| ۲ | sc-login | /login (بازطراحی) | ۲ ✅ | LoginForm | POST /auth/checkPhone · /auth/loginUser | auth | User, RefreshToken |
| ۳ | sc-signup | /start (بازطراحی) | ۳ ✅ | SignupWizard(Steps, BizForm, RoleChips) | POST /auth/quickRegister · /businesses · setArms | auth, businesses | User, Business |
| ۴ | sc-buy-list | (app)/home | ۱→۳ | AppShell, Greet, ShareStrip, SavedStrip, GoodRow | GET /watched-goods, GET /savers, GET /listings?mine | watchedGoods, listings | WatchedGood, Listing, PriceLog |
| ۵ | sc-buy-item | (app)/item/[goodId] | ۳ ✅ | ItemView(PriceHero, FollowRow, NeedCard, WatchSwitches) | GET /market/getSupplyBoard · getWatchedGoods · POST followSupplier · watchGood · setNotifPrefs | market | Listing, Follow, WatchedGood, Business |
| ۶ | sc-board | (app)/board/[goodId] | ۳ ✅ | BoardPage(SortChips, SupCard, FollowToggle) | GET /market/getSupplyBoard · followSupplier | market | Listing, Follow |
| ۷ | sc-suppliers | (app)/saved | ۳ ✅ | SavedCatalogs(SavedCard) | GET /market/getFollows · unfollowSupplier | market | Follow |
| ۸ | sc-offers | (app)/offers | ۴ ✅ | OffersView(RfqCard, DetailPane, FilterChips, StatusSheet) | GET /market/getMyRfqs · POST /market/setOfferStatus/:id | market | Inquiry(+rfqGroupId/targetPrice/deliveryCity), Offer(+status) |
| ۹ | sc-buy-profile | (app)/profile | ۶ ✅ | ProfileView(BizCard+StatsRow زنده: کالا/استعلام/دنبال‌شده، ArmsSection, AccountRows: پیام‌ها/اعلان‌ها/زبان/خروج) | getWatchedGoods · getMyRfqs · getFollows · setArms · logout | market, auth | WatchedGood, Inquiry, Follow |
| ۱۰ | sc-sell-requests | (app)/sell/requests | ۴ ✅ | RequestsView(ToMeTab, MarketTab, NeedAlertsTab, DeadlineBadge) | GET /market/getInquiries · getBuyRequests · getWatchedBuyerNeeds · POST markInquiryRead | market, matching | Inquiry, Listing, Follow |
| ۱۱ | sc-sell-catalog | (app)/sell/catalog | ۵ ✅ | CatalogView(BizCard, TasksRow, InsightStrip, ShareStrip, ChipsGrid, PCard, QuickPriceSheet, FollowersSheet) | GET /market/getMyListings · getMyFollowers · getInquiries · getSaverAnalysis · getMyPromos · PUT /listings/saveListing | market, listings | Listing, Business, Follow, WatchedGood |
| ۱۲ | sc-sell-product-owner | (app)/sell/product/[id] | ۵ ✅ | ProductView(InsightBar+SourceBreakdown, PricePanel, DiscountStrip زنده, RatesSheet, ItemDiscountSheet, FollowersSheet+custType, ArchiveAsk) | GET /market/getMyListings · getSaverAnalysis · getInquiries · getMyPromos · getPromoReport · GET /pricing/state · preview · POST /listings/setListingActive | market, pricing | Listing, DiscountRule, Follow(+custType) |
| ۱۳ | sc-sell-product-public | (pub)/p/[slug]/[listingId] | ۷ ✅ | ProductPublicView(gallery واقعی, hero-specs, contact-row, tri-actions+sticky-cta) | getBusiness عمومی (SSR) · getContact · startThread · watchGood | businesses, market, chat | Listing(+viewCount30), Thread |
| ۱۴ | sc-discount | (app)/sell/discounts | ۵ ✅ | DiscountsView(FormulaFlow زنده, TabCust/TabVolume/TabPreview, CatalogRows+«می‌شود X», GroupLvlEdit, TierRows, PreviewBreakdown با منبع) | GET /pricing/state · preview · PUT /pricing/catalog · group/:refId · item/:listingId · bulk · POST custType · PUT /businesses/catalogCategories | pricing(جدید), businesses | DiscountRule(جدید), Business.customCategories |
| ۱۵ | sc-sell-profile | (app)/profile (arm=sell) | ۶ ✅ | همان ProfileView — داده/آمار per-arm (کاتالوک/استعلام‌ها/دنبال‌کننده‌ها از getMyListings·getInquiries·getMyFollowers) | market | Listing, Follow |
| ۱۶ | sc-rfq | (app)/rfq/[goodId] | ۴ ✅ | RfqWizard(SupplierPicker, VolumeFreq, TimingChips, TargetPrice, Note) | GET /market/getSupplyBoard · getMyRfqs · POST /market/requestQuote | market, matching | Inquiry(+rfqGroupId) — گروه‌بندی با rfqGroupId، نه مدل RfqDetail جداست |
| ۱۷ | sc-quote | (app)/sell/quote/[id] | ۴ ✅ | QuoteForm(PriceComposer, PayTermChips, DelivTermChips, PackPrice, Deadline) | GET /market/getQuoteContext · POST /market/sendOffer · offerBuyRequest | market, offers | Offer(+payTerm/delivTerm) |
| ۱۸ | sc-campaign | (app)/sell/campaign | ۶ ✅ | CampaignView(StatCards: مشاهده/دنبال‌کردن/هزینه، FormulaLine, ViewerEvents «چه کسانی دیدند؟» با زمان دقیق, Stop/Continue/Charge) | GET /promos/report(+viewerEvents) · mine · POST /promos/stop | promos | Promo, PromoEvent, Wallet, WalletTxn |
| ۱۹ | sc-wallet | (app)/wallet | ۶ ✅ | WalletView(BalanceCard, RateNote شفاف, TxnList واقعی, InviteCreditCard «پول از کجا می‌آید؟», CampaignLink) | GET /wallet/get · /promos/mine · /promos/report | wallet, promos | Wallet, WalletTxn |
| ۲۰ | sc-charge | (app)/wallet/charge | ۶ ✅ | ChargeForm(QuickAmounts, CustomAmount با هزارگان فارسی, EstimateNote, زرین‌پال شبیه‌سازی + SuccessPanel با رسید) | POST /wallet/charge | wallet | WalletTxn |
| ۲۱ | sc-search | (app)/search | ۳ | SearchBar, GoodResult, RecentChips | GET /goods?q (جستجوی موجود) | goods | Good, Brand |
| ۲۲ | sc-add-item | (app)/add | ۳ | AddFlow(NewGood/Import/QuickSearch), FreqPicker | GET /goods?q, POST /watched-goods | watchedGoods | WatchedGood, GoodCreation(جدید) |
| ۲۳ | sc-msgs | (app)/msgs | ۶ ✅ | MsgsView(ThreadList با شهر/نقش, UnreadBadge, poll ۲۰s) | ➕ GET /chat/getThreads (ChatModule جدید) | chat(جدید) | Thread/Message (جدید در Atlas) |
| ۲۴ | sc-chat | (app)/msgs/[id] | ۶ ✅ | ChatView(QuickChips چهار جملهٔ Prototype, Composer, AttachTray پیوست عکس, poll ۵s, readAt خودکار) | ➕ POST /chat/startThread · GET /chat/getThread/:id · POST /chat/sendMessage · /files/upload | chat, files | Message(+fileId), File |
| ۲۵ | sc-notifications (شیت sheet-notif هم) | (app) شیت سراسری روی زنگ appbar | ۶ ✅ | NotifSheet(گروه‌بندی نوع, MarkAllRead, بج unread در appbar) | GET /notifications · POST /notifications/readAll | notifications | Notification |
| ۲۶ | sc-settings | (app)/settings | ۶ ✅ | SettingsView(NotifToggles زندهٔ NotifPrefs + Push, LangSegmented fa/en/ar, CitySelect, بخش «نما»: ThemeSegmented روشن/تاریک + ArmColorPicker ۴پالت, ساعات پاسخگویی/شرایط پرداخت) | POST /auth/setPrefs (User.prefs) · setNotifPrefs · PATCH /businesses/editBusiness (+phone/hours/defaultPayTerm) | auth, market, businesses | User(+prefs), Business(+hours/defaultPayTerm), NotifPrefs |
| ۲۷ | sc-edit-biz | (app)/settings/business | ۶ ✅ | EditBizForm(BizName, ActivityType, CitySelect, PhoneField روی کاتالوگ) | PATCH /businesses/editBusiness (+phone/hours/defaultPayTerm) | businesses | Business |
| ۲۸ | sc-catalog-public | (pub)/c/[slug] | ۷ ✅ | CatalogPublicView(biz-card, save/save-flag, contact-row, insight, searchbar, chips دسته‌های شخصی, p-card grid, gate+viral) | getBusiness عمومی (SSR·کش۶۰s) · followSupplier(SHARED) · getContact · startThread · publicCatalogs(sitemap) | businesses, market, chat | Listing, Follow |
| ۲۹ | sc-list-public | (pub)/b/[slug] | ۷ ✅ | ListPublicView(biz-card, contact-row, insight, save/share, gate گوش‌به‌زنگ, follow-rowهای نیاز با alert-btn, hint) | getBusiness عمومی (SSR) · followSupplier(SHARED) · watchGood · getContact · startThread | businesses, market, chat | Listing(BUY), WatchedGood |
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
| sheet-item-discount | /sell/product/[id] + شیت | ۵ ✅ | PUT /pricing/item/:listingId (سه‌ورودی هم‌بسته pct/amt/fin + پله‌ها + CATALOG-reset) |
| sheet-cust-type | شیت دنبال‌کنندگان (کاتالوگ+کالا) | ۵ ✅ | POST /pricing/custType — در نبود یال فالو، یال ساخته می‌شود (تطبیق آگاهانه: دیده‌بان تابلو هم نوع می‌گیرد) |
| sheet-help-discount | /sell/discounts | ۵ | - (static) |
| sheet-quickprice | /sell/catalog | ۵ | PATCH /listings/:id/price |
| sheet-bulk | /sell/catalog | ۵ | PATCH /listings/bulk |
| sheet-rfq-detail | /offers, /sell/requests | ۴ | GET /inquiries/:id |
| sheet-share-rfq | /rfq/[id] | ۴ | POST /inquiries/:id/share |
| sheet-offer-status | /offers | ۴ | PATCH /offers/:id/status |
| sheet-savers | /item/[goodId] | ۳ | GET /savers?goodId |
| sheet-followers | /sell/catalog, /c/[slug] | ۵ | GET /follows?target=me |
| sheet-promote | /sell/catalog | ۶ | POST /promos |
| sheet-share / sheet-share-list / sheet-share-product / sheet-share-rfq | ShareSheet(components/imach/share-sheet) — ۷ میزبان | ۹ ✅ | Web Share · کلیپ‌بورد · QR واقعی · مخاطبین → ContactsSheet |
| sheet-contacts | ContactsSheet(share-sheet) — موبایل: Contact Picker API · دسکتاپ: ورود دستی · میهمان: کارت ورود | ۹ ✅ | GET/POST /contacts (sync/getContacts/invite) · sms: دعوت‌دار ref |
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
| «دریافت کد تأیید» در sc-signup | دکمهٔ دریافت کد پیامکی | «ادامه» → quickRegister واقعی | همان قاعدهٔ بالا — بدون OTP بک‌اند |
| لینک راهنما در sc-onboard | help.html | حذف تا فاز عمومی‌ها | صفحهٔ راهنمای واقعی هنوز مسیر ندارد (فاز ۷) |
| چارت spark در sc-buy-item | ۷میلهٔ تاریخچه | حذف | API تاریخچهٔ قیمت هر کالا موجود نیست (PriceLog عمومی نیست) |
| سوییچ «تغییر موجودی» در sc-buy-item | toggle موجودی | حذف (فقط قیمت/تأمین‌کنندهٔ جدید) | NotifPrefs بک‌اند کلید stockChange ندارد |
| pack-line در sc-board | «هر کیسهٔ ۵۰ کیلویی — N تومان» | «پیش‌تر: {قیمت}» از prevMinor | API پکیج‌بندی ندارد (شکاف فاز ۵: Listing.packaging) |
| spec سوم «شرایط» در sc-board | عندالتحویل/چک/نقدی | «سابقهٔ استعلام» از boughtFrom | فیلد شرایط پرداخت در API نیست |
| insight-strip در sc-suppliers | N کالا · N ذخیره · N بازدید | حذف | FollowDto آمار کاتالوگ ندارد (آمار عمومی فاز ۷) |
| qty-stepper تعاملی در sc-buy-item | ± فعال | فقط‌خواندنی (کم‌رنگ) | ویرایش نیاز = به‌روزرسانی BUY listing؛ با شیت ویرایش آیتم می‌آید |
| بج «N دنبال‌شده» در sc-buy-list | شمارش دنبال‌کردن کالا | pulse-dot (watched) + بج b-stone «N تأمین‌کننده» | دادهٔ صادقانهٔ موجود (supplierCount)؛ شمارش savers خریداری در API خریدار وجود ندارد |
| دموی ثابت شمارش‌ها (۲ اعلان/۳ پیشنهاد/۱ چت) | اعداد hardcoded دمو | بج‌های واقعی (unread/answeredCount/watchedNeeds) و حذف بج چت | دادهٔ واقعی؛ چت بک‌اند ندارد (فاز ۶) |
| JS ناوبری stack | go()/back() داخل یک HTML | Next.js router | — |
| search-strip در sc-offers | نوار جست‌وجو → sc-search | حذف تا ساخت /search | مسیر جست‌وجوی جهانی هنوز ساخته نشده (ردیف ۲۱)؛ نوار مرده نقض UX است |
| مدل RfqDetail جدا (نقشهٔ اولیه) | جدای Inquiry | گروه‌بندی با Inquiry.rfqGroupId + randomUUID | بدون مدل جدید؛ ردیف‌های legacy بدون کلید = گروه تک‌نفره — همان رفتار بصری با پیچیدگی دادهٔ کمتر |
| تایمر شمارش معکوس مهلت ۳روزه | عدد ثابت دمو | «N روز باز» از createdAt+۳day | همان منطق؛ بدون تایمر زنده (به‌روزرسانی در رندر) |
| پیشنهاد سرد در sc-offers (offerBuyRequest) | کارت فرصت بازار در تب فروشنده | گروه kind=COLD در فهرست خریدار با حجم BUY listing خودش | پیشنهاد بدون استعلام هم باید در «پیشنهادها» دیده شود؛ گیت معرف (۱۰ عضو) عیناً حفظ شد — منطق کسب‌وکار موجود |
| کارهای امروز در sc-sell-catalog (C1-5) | ۵ کار ثابت دمو | فقط «N درخواست بی‌پاسخ» واقعی (getInquiries) | اندپوینت «پیشنهادهای ارسالی در انتظار پاسخ خریدار» هنوز نیست؛ بقیهٔ کارها با فاز چت/کمپین می‌آید |
| بینش ذخیره‌کنندگان sc-sell-catalog | «این هفته» | پنجرهٔ ۳۰روزهٔ واقعی (viewCount30) | پنجرهٔ بک‌اند ۳۰روزه است؛ برچسب صادقانهٔ همین پنجره |
| شیت دنبال‌کنندگان — نوع مشتری برای دیده‌بان تابلو | چیپ‌ها برای همهٔ ۱۲ نفر | setCustType در نبود یال فالو، یال می‌سازد (source=ORGANIC) | Prototype جریان را برای همهٔ منابع می‌خواهد؛ custType روی یال Follow زندگی می‌کند — یالِ رابطه ساخته می‌شود تا موتور قیمت کار کند (اعلانی رد و بدل نمی‌شود) |
| درصد نوع مشتری در شیت کالا | ٪۵/٪۷ ثابت دمو | درصد مؤثر همان کالا (قاعدهٔ کالا › گروه › کاتالوگ) | عدد زندهٔ واقعی از /pricing/state — همان چیزی که خریدار عملاً می‌بیند |

## ۵. خط پایه دیتا (برای integrity check هر فاز — §۴۷)

Good=2479 · Product=40417 · Brand=3769 · Category=207 · Unit=62 · Business=35 · User=6 · Listing=38 · Page=68 · Follow=35 · WatchedGood=16 · Inquiry=9 · Offer=2 · PriceLog=9 · Notification=13 · Wallet=1 · PromoEvent=8 · RefreshToken=438 · File=2 — (بک‌آپ کامل: `imach-back/backups/migration/2026-10-05/manifest.json`)

**پایان فاز ۵ (2026-10-06)**: Business=38 · User=9 · Listing=41 · Page=75 · Follow=38 · WatchedGood=17 · Inquiry=13 · Offer=6 · PriceLog=14 · Notification=27 · Wallet=5 · RefreshToken=573 · DiscountRule=3 — رشد همه فقط از دیتای تست E2E (ثبت‌نام فاز۳/۴ + لیستینگ‌ها و قواعد قیمت فاز۵)؛ مرجع‌ها دست‌نخورده: Good=2479 · Product=40417 · Brand=3769 · Category=207 · Unit=62 ✓

**پایان فاز ۶ (2026-10-06)**: Thread=2 · Message=5 (E2E چت) · Promo=2 (+۱ کمپین جدید برنج صدری) · PromoEvent=9 (+۱ VIEW) · WalletTxn=4 (+۲: شارژ ۱۰۰هزار خریدار + قفل بودجهٔ کمپین) · WatchedGood=18 (+۱) · Business=38 · User=9 (۲ کاربر prefs دارند: تم/رنگ) · Business با hours/defaultPayTerm پر شده — مرجع‌ها دست‌نخورده: Good=2479 · Product=40417 · Brand=3769 · Category=207 · Unit=62 ✓

**تطبیق‌های آگاهانهٔ جدید فاز ۶:**
| موضوع | در Prototype | در پیاده‌سازی | دلیل |
|---|---|---|---|
| شیت اعلان‌ها | صفحهٔ مستقل + شیت | فقط شیت سراسری روی زنگ (بدون صفحهٔ مستقل) | Prototype هم شیت را میزبان اصلی می‌داند؛ صفحهٔ جدا تکرار مرده بود |
| ردیف ویژهٔ خانهٔ خریدار | کارت sup-card کامل (tab تابلو) | row-card فشرده با badge-sponsor → لینک به /board | خانه = خلاصه است در Prototype (کارت کامل متعلق به تابلو است)؛ دادهٔ promo در getPriceBoard هست |
| sc-campaign چند-کمپین | تک-گزارش | گزارش فعال‌ترین کمپین + ورودی راه‌اندازی از شیت promote | الگوی ذهنی «یک کمپین فعال به‌ازای کالا»؛ بودجه‌بندی جدید از همان شیت |
| OTP-مانند ورود چت | دمو | چت با احراز هویت همان session | منطق موجود |
| پیوست عکس چت | آپلود مستقیم | /files/upload موجود + fileId روی Message | همان مسیر امن فایل موجود (از اپ قدیم) |
| تم sc-settings | سوییچ درون صفحهٔ تنظیمات | همان + sync کراس-دستگاهی (User.prefs) | الزام مالک: «سوییچ تم از پروفایل» + بین دستگاه‌ها |
| پرداخت شارژ | درگاه زرین‌پال | شبیه‌سازی موفق + رسید (زیرساخت آماده) | اتصال واقعی به درگاه فقط برای ایران در فاز ۸ + سوییچ ادمین |
| CurrencySection در sc-settings | انتخاب ارز | فاز ۸ | الزام ارز بعد از تکمیل i18n برنامه‌ریزی شده؛ فاز ۶ فقط زیرساخت ذخیره prefs را گذاشت |

**پایان فاز ۷ (2026-10-06)**: بدون مدل/کالکشن جدید — Listing(1 BUY جدید برای E2E لیست عمومی) · رشد فقط دیتای تست. مسیرهای عمومی زنده: /c/[slug] · /b/[slug] · /p/[slug]/[listingId] (SSR + JSON-LD + Metadata) · sitemap.xml (۳ ایستا + کاتالوگ‌های زنده) · robots.txt (app/robots.ts) · ریدایرکت ۳۰۷: /sell/[slug]→/c/[slug] و /sell/[slug]/[listingId]→/p/[slug]/[listingId].

**تطبیق‌های آگاهانهٔ جدید فاز ۷:**
| موضوع | در Prototype | در پیاده‌سازی | دلیل |
|---|---|---|---|
| «قیمت شما» + vol-ladder + pack-pick در sc-sell-product-public | قیمت مؤثر خریدار با تخفیف و پله‌ها | قیمت پایهٔ عمومی | اندپوینت قیمت مؤثرِ دید خریدار وجود ندارد (/pricing/preview مالک‌محور) — با ساخته شدنش همین‌جا جایگزین می‌شود |
| بج «٪۹۸ پاسخگویی» | روی کارت بیزینس | حذف | آمار عمومی پاسخ‌گویی در API نیست |
| photo-strip | ۳ اسلات دموی SVG | گالری واقعی آگهی (نظام فایل‌ها) | دادهٔ صادقانه |
| «۱۴۰ بازدید این هفته» insight | عدد دمو | مجموع viewCount30 آگهی‌ها | شمارش بازدید کاتالوگِ مجزا وجود ندارد |
| alert-btn هر ردیف لیست عمومی | toggle درجا (دمو) | watchGood روی همان کالا (عضو) / ورود (میهمان) | همان موتور گوش‌به‌زنگ بدون API جدید |
| ذخیرهٔ لیست خرید عمومی | دموی toast | followSupplier(source=SHARED) — یال واقعی رشد | همان یال فالو؛ منبع SHARED در تحلیل ذخیره‌کنندگان دیده می‌شود |
| لینک راهنما/دمو در appbar عمومی | help.html | حذف | ابزار دموی Prototype است نه محصول |

**پایان فاز ۸ (2026-10-06)**: مدل جدید AppSetting (۳ سند seed) · Unit.nameAr (۲ نمونه: KILOGRAM/SACK) · Category.nameAr (اسکیما آماده، بدون دیتا) · User.prefs += currency (۲ کاربر تست در E2E ست/پاک شد) · بدون تغییر شمارش مرجع‌ها.

**تطبیق‌های آگاهانهٔ جدید فاز ۸:**
| موضوع | طراحی | در پیاده‌سازی | دلیل |
|---|---|---|---|
| «این ارز در تمام سیستمش می‌آید» | همه‌جا | صفحات (app) تبدیل نمایشی؛ ورودی فرم‌ها و معامله در ارز فروشنده | معامله واقعی B2B در ارز فروشنده بسته می‌شود؛ تبدیل ورودی خطر خطای قیمت دارد |
| صفحات عمومی (pub) | ارز نمایش کاربر | ارز بومی آگهی | میهمان ارز انتخابی ندارد؛ قیمت صادقانهٔ فروشنده SEO هم هست |
| نرخ ارز | — | seed دستی تقریبی + ویرایش ادمین (بدون API خارجی) | سندباکس آفلاین؛ مالک کنترل کامل دارد؛ اتصال به سرویس نرخ مرحلهٔ آینده |
| شهرها چندزبانه | — | رشتهٔ آزاد به‌عنوان واردشده | دیتاست شهرهای چندزبانه کار داده‌ای است نه کدی؛ در فاز داده انجام می‌شود |
| اعداد عربی محاسباتی | ٠١٢٣ | ارقام فارسی ۰۱۲۳ | سازگاری ریاضی fa()؛ تفاوت بصری جزئی؛ اعداد ثابت دیکشنری عربی‌اند |
| پنل ادمین | — | طراحی legacy (Tailwind) فارسی | ابزار داخلی؛ قانون «UI قابل تعویض» فقط لایهٔ کاربر را پوشش می‌دهد |


**پایان فاز ۹ (2026-10-06)**: بدون تغییر دیتابیس (بک‌آپ phase9-pre: ۳۰ کالکشن · ۴۷٬۹۲۴ سند) · Contact یک سند تست E2E (حسن آزمون) + lastInvitedAt — ContactsModule موجود از قبل بود و حالا UI دارد.

**تطبیق‌های آگاهانهٔ جدید فاز ۹:**
| موضوع | در Prototype | در پیاده‌سازی | دلیل |
|---|---|---|---|
| sheet-share QR | SVG دموی ثابت | QR واقعی (qrcode.react) از لینک ref دار | ارزش واقعی: قابل اسکن برای سردر مغازه/کارت ویزیت |
| sheet-contacts لیست | ۵ مخاطب دموی ثابت | Contact Picker API (اندروید/کروم) + ورود دستی + sync سرور | دادهٔ واقعی دفترچهٔ کاربر با اجازه‌اش؛ اعضا با User.phone تطبیق زنده |
| ارسال چند مخاطب | toast دمو | عضو → اطلاع درون‌برنامه‌ای (invite ممیزی) · غریبه → sms: با متن دعوت‌دار | پیامک سیستمِ گوشی خود کاربر است — بدون درگاه و هزینهٔ سرور |
| rapid-demo.html | فهرست زنده از DOM خودش | /demo با iframe same-origin + ?sheet= بازکردن خودکار | اپ واقعی چندمسیری است نه SPA تک‌فایلی؛ همان الگوی UX (سایدبار پین/کشو/قاب ۳۹۲) |
| آیکون چرخ‌دنده/برچسب اسپانسر/chevron lv | بیش‌اندازه (باگ Prototype) | 15px/10px/15px با قواعد هدفمند | دستور مالک: «این مشکلات ریز رو هم درست کن» — انحراف عمدی از Prototype |
| لوگو اپ‌بار/دسک‌بار | goHome به خانهٔ خریدار | → صفحهٔ روت (/) | دستور مالک فاز ۹: «بره به صفحهٔ اصلی برنامه یعنی صفحه روت» |
| sc-add-item (ردیف ۲۲) | ویزارد v18 | فرم legacy /new زنده (ناوبری اصلاح‌شده به v18) | فرم کارا و کامل (solo/excel/ref/scan)؛ پورت v18 کار جداگانه است — باقی‌ماندهٔ ثبت‌شده |
| sc-search (ردیف ۲۱) | صفحهٔ جست‌وجوی سراسری | جست‌وجوی موجود در /item و کاتالوک | بدون مسیر سراسری — باقی‌ماندهٔ ثبت‌شده |
| درخت legacy (app/buy · brand · market · sell/panel · customers + ۹ کامپوننت) | — | حذف کامل (۶۹ فایل) + ریدایرکت‌ها ماندند | قانون §۱۰: هیچ کد مرده‌ای در پایان — تاریخچه در گیت |
