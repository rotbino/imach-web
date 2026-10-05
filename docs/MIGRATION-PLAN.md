# iMach — برنامه فازبندی مهاجرت (Production Migration Plan)

> **سند مرجع ماندگار.** این فایل در گیت living است؛ پس از هر فاز، بخش «وضعیت اجرا» به‌روز می‌شود.
> اگر سشن/سندباکس ریست شد، این فایل + `MIGRATION-MAP.md` + `backups/` بک‌اند + ورک‌لاگ `worklog.md` همان چیزی است که باید به مجری بعدی داده شود تا از فاز بعدی ادامه دهد.

---

## ۰. زمینه و منابع حقیقت

| منبع | نقش |
|---|---|
| `redesign-final/` (v18 — Reference Prototype، فریز شده) | **Visual / UX Source of Truth** — ظاهر، ساختار صفحات، جریان‌ها، متن‌ها |
| `imach-back/` (NestJS 12 + Fastify 5 + Prisma 6 + MongoDB Atlas) | **Business / Data Source of Truth** — Auth، Authorization، Matching، دیتای مرجع (۲۴۷۹ Good / ۴۰k Product / ۳۷۶۹ Brand)، Push، Upload، Wallet |
| `imach_online_db` روی Atlas | دیتابیس زنده — پیش از هر تغییر مخرب بک‌آپ در `imach-back/backups/migration/` |

**جمله کلیدی پرامپت مالک:** «ما نمی‌خواهیم فرانتندی بسازیم که شبیه Prototype باشد؛ می‌خواهیم Prototype را به محصول واقعی تبدیل کنیم.»
یعنی: **کیفیت بصری سطح Prototype + مهندسی سطح Production.**

## ۰.۱ غیرقابل مذاکره‌ها (Final Instruction)

1. دیتابیس نباید آسیب ببیند (بک‌آپ قبل از هر تغییر مخرب + تأیید restore)
2. Business Logic و منطق Matching موجود حفظ شود (رفتار فعلی اول؛ بهبود رتبه‌بندی جداگانه بعد از پایداری)
3. قابلیت‌های مهم بک‌اند حذف نشوند (حتی آن‌هایی که فعلاً UI ندارند)
4. Push Notification و PWA واقعی حفظ/مهاجرت شوند
5. Security و Performance و SEO از روز اول در معماری باشند، نه آخر پروژه
6. خروجی بصری با Prototype «مو نزند»؛ اجرای CSS داخلی می‌تواند تمیز و معماری‌شده باشد (تصمیم مالک: Visual Fidelity ۱:۱، نه کپی کورکورانه فایل CSS)
7. آیکون‌های اختصاصی Prototype عیناً حفظ شوند (بدون جایگزینی با Lucide)
8. فرم‌ها Production-grade: اعتبارسنجی، هزارگان، نرمال‌سازی رقم فارسی/انگلیسی، حالت‌های loading/error/disabled
9. هر فاز: قابل اجرا، قابل تست، build + typecheck + lint سبز، دموی قابل مشاهده
10. هیچ کد مرده‌ای (old/ temp/ backup/ نسخه‌های تکراری) در پایان باقی نماند
11. اولویت تعارض‌ها: Data Safety > Security > Correctness > Core Logic > Visual Fidelity > Performance > SEO > Maintainability > A11y > Features

## ۰.۲ الزامات جدید مالک (فراتر از ۷۰ بخش پرامپت)

- **چندزبانه از فاز ۱:** فارسی / انگلیسی / عربی — RTL بر اساس زبان (fa·ar = rtl، en = ltr)
- **چندارزی:** یک ارز مرجع پایه + انتخاب ارز توسط کاربر در پروفایل؛ ارز در کاتالوگ و کل سیستم او
- **انتخاب کشور:** زبان/ارز/جهت پیش‌فرض از کشور کاربر؛ قابل تغییر
- **واحدها/گروه‌ها/لوکیشن‌ها:** آماده i18n و بین‌المللی شدن
- **پرداخت:** فقط ایران؛ زیرساخت آماده ولی قابل خاموش‌شدن از تنظیمات ادمین؛ **اعتبار تبلیغات** از مسیر دعوت کاربران + فعالیت‌های مفید (و خرید اعتبار در ایران)
- **تم:** رنگ‌ها از متغیرهای CSS؛ **تم تاریک کامل**؛ سوییچ از پروفایل؛ حتی رنگ تم دلخواه برای محیط خرید/فروش
- **معماری تعویض‌پذیر UI:** کامپوننت‌ها طوری که تعویض کامل UI در آینده هزینه/زمان کمتری داشته باشد (تفکیک لایه دیزاین‌سیستم از منطق فیچر؛ متن‌ها همه از لایه i18n؛ دیتا از لایه API)
- **فازبندی ماندگار:** برنامه فازها مکتوب و در گیت؛ هر فاز با دمو و گزارش §۶۵

---

## ۱. معماری هدف (خلاصه تصمیم‌ها)

| موضوع | تصمیم | دلیل |
|---|---|---|
| Stack فرانت | همان `imach-web` (Next.js 16.3.5 App Router + React 19) | ریپوی زنده؛ مهاجرت درجا، بدون ریپوی جدید (§۴۰: legacy در پایان archive) |
| زبان بصری | **CSS خود Prototype** به‌صورت ساختاریافته در `styles/imach/` (tokens / base / shell / components) — نه تبدیل به Tailwind | §۴۹: همان CSS اگر کیفیت بهتر می‌دهد؛ توکن‌ها استخراج می‌شوند، خروجی بصری تغییر نمی‌کند |
| Tailwind | فقط برای صفحات legacy موجود (لندینگ فعلی) تا فاز ۷؛ کد جدید شل از کلاس‌های Prototype | هم‌زیستی صلح‌آمیز؛ حذف تدریجی |
| آیکون‌ها | اسپرایت ۴۸ `i-*` + ۴ `a-*` → `components/imach/icons.tsx` با اسکریپت قابل‌تولید مجدد از Prototype | §۵۰: آیکون Prototype عیناً |
| فونت | IRANSans لوکال با `next/font/local` (موجود) + `var(--font-iran)` در CSS پورت‌شده | §۱۴ |
| Temming | `[data-arm="buy\|sell"]` (همان مکانیزم Prototype) + `[data-theme="dark"]` + توکن‌های قابل‌Override | الزام مالک؛ same visual در حالت پیش‌فرض |
| i18n | زیرساخت موجود `i18n/` (cookie → Accept-Language → fa) + افزودن `ar`؛ متن‌های شل از همان ابتدا از messages | Zarf روی ریل از روز ۱ |
| Server/Client | Server Components پیش‌فرض؛ Client فقط برای تعامل (شل، شیت‌ها، فرم‌ها) | §۱۲ |
| State | URL (فیلتر/تب/صفحه‌بندی) + TanStack Query (server state) + local UI state؛ global فقط با دلیل | §۲۴ |
| API | همان بک‌اند NestJS؛ توسعه capهای غایب در فاز مربوطه؛ mock فقط پشت abstraction مشخص تا cap ساخته شود | §۴۶/§۶۳ |
| SEO | صفحات عمومی (کاتالوگ/لیست عمومی/فروشگاه) SSR/SSG + Metadata + sitemap + JSON-LD؛ صفحات خصوصی بدون index | §۱۵/§۵۴ |
| PWA | manifest موجود + سرویس‌ورکر + شل آفلاین؛ Push با همان VAPID بک‌اند | §۱۹/§۲۰ |

**ساختار پوشه‌های جدید فرانت:**
```
app/(pub)/…        صفحات عمومی SEO (فاز ۷)
app/(app)/…        شل احراز‌شده: layout = appbar+tabbar+deskbar، دیتا-arm روی ریشه
components/imach/  دایرکتوری دیزاین‌سیستم Prototype (icons, AppShell, Sheet, …)
styles/imach/      tokens.css · base.css · shell.css · components.css
lib/imach/         fixtureهای دموی موقت (پشت abstraction؛ هر فاز با API واقعی جایگزین)
scripts/           اسکریپت‌های تولید (port-prototype-css.mjs, extract-icons.mjs)
```

---

## ۲. فازها

> هر فاز = کامیت‌های منطقی + build/lint سبز + دمو + گزارش §۶۵ + پوش.
> ترتیب بر اساس وابستگی‌هاست؛ هر فاز زیرساختِ فاز بعد را می‌گذارد و چیزی را خراب نمی‌کند.

---

### فاز ۱ — ایمنی و پی (Safety & Architecture) «فاز جاری»
**هدف:** بک‌آپ واقعی + نقشه مهاجرت + شل اپ با دیزاین‌سیستم v18 زنده در Next.js.

- [x] بک‌آپ کامل DB (۲۶ کالکشن · ۴۷٬۶۱۴ سند · EJSON + ایندکس‌ها) → `imach-back/backups/migration/2026-10-05/imach_online_db-2026-10-05.tar.gz` + manifest + اسکریپت‌های backup/restore
- [x] **تأیید restore واقعی:** بازسازی در DB موقت، تطبیق ۲۶/۲۶ کالکشن، پاکسازی DB موقت
- [x] سند MIGRATION-PLAN.md + MIGRATION-MAP.md (۳۰ صفحه → مسیر → کامپوننت → API → سرویس → DB + ۲۴ شیت)
- [x] پورت دیزاین‌سیستم v18 → `styles/imach/` با اسکریپت قابل‌تولید (`scripts/port-prototype-css.mjs`)؛ قواعد scaffold دمو (phone-frame/nav-panel/notch/statusbar) حذف، بقیه عیناً
- [x] آیکون‌ها: اسکریپت استخراج → `components/imach/icons.tsx` (تایپ‌دار)
- [x] شل اپ: `app/(app)/layout.tsx` — appbar + arm-pill + tabbar + دسک‌بار ≥۹۲۰px + بنیان شیت
- [x] توکن‌های تم: `[data-theme="dark"]` + `[data-arm]` + معماری override رنگ
- [x] i18n: افزودن `ar` + کلیدهای شل/خانه؛ ریل سه‌زبانه از روز ۱
- [x] صفحه دمو: `/(app)/home` — پورت sc-buy-list (خانه خریدار) با دیتای دموی مشخص
- [x] QA بصری ۳۶۰/۷۶۸/۱۲۸۰ × روشن/تاریک × arm خرید/فروش؛ build + lint سبز
- [x] کامیت + پوش (بک‌آپ در بک‌اند + پی در فرانت)

**خروجی دمو:** `bun run s` → `/home` = خانه خریدار با ظاهر Prototype؛ تعویض arm از pill → شیت → تم نارنجی/فیروزه‌ای؛ ریسپانسیو کامل.

---

### فاز ۲ — احراز هویت + اولین Vertical Slice واقعی
**هدف:** اثبات معماری با یک جریان کامل UI→API→DB→UI با دیتای واقعی.

- `/login` بازطراحی بر اساس sc-login/sc-signup (فرم واقعی: OTP، نرمال‌سازی شماره، validation، خطاها)
- Auth موجود (refresh ساکت، guards) حفظ؛ نقش/انتخاب arm پس از ورود (sc-onboard)
- یک جریان داده واقعی: خانه خریدار از API واقعی (WatchedGood / قیمت‌ها / شمارش‌ها) — جایگزینی fixtureها
- E2E دودی login روی بک‌اند لوکال

---

### فاز ۳ — هسته خریدار (Buyer Core)
- `/home` (لیست خرید + رصد)، `/item/[goodId]` (sc-buy-item)، `/board/[goodId]` (تابلو قیمت — مسیر موجود بازطراحی)، `/saved` (کاتالوگ‌های ذخیره)، `/add` (افزودن کالا + sheet-new-good/search)
- گپ‌های بک‌اند: Saver مستقل از Follow (followSource)، دنبال‌کردن قیمت
- فرم‌ها production-grade (CurrencyInput، SearchSelect از组件های موجود)

### فاز ۴ — حلقه RFQ و Matching
- `/rfq` (wizard استعلام)، `/offers` (مقایسه پیشنهادها)، سمت فروشنده: `/sell/requests` + `/sell/quote/[id]`
- گپ‌ها: RfqDetail + قیمت موتور، وضعیت پیشنهاد (interested/contacted/reviewed)، NeedAlert

### فاز ۵ — هسته فروشنده (Seller Core)
- خانه فروشنده، کاتالوگ/محصولات (مالک/عمومی)، قیمت‌گذاری پله‌ای، تخفیف‌ها (CustomerType × DiscountRule × Tier) — «حس فروشگاه، نه ERP»
- گپ‌ها: CustomerType، DiscountRule، GoodRateTier، پکیج‌بندی چندتایی

### فاز ۶ — اشتراکی‌ها و رشد
- پروفایل/تنظیمات (+ **سوییچ تم روشن/تاریک و رنگ دلخواه هر arm** — الزام مالک)، `/wallet` + شارژ + اعتبار دعوت (زیرساخت invite-credit)، اعلان‌ها، `/msgs` + `/msgs/[id]` چت (Thread/Message جدید در بک‌اند)، Campaign/promote، impression tracking کامل

### فاز ۷ — عمومی‌ها + SEO + PWA/Push
- `(pub)`: لندینگ جدید، کاتالوگ عمومی `/c/[slug]`، لیست عمومی `/b/[slug]`، صفحه محصول عمومی — Metadata/sitemap/robots/JSON-LD
- سرویس‌ورکر + شل آفلاین + جریان Push کامل (subscription/permission/click/unsubscribe)
- لندینگ legacy → archive/حذف

### فاز ۸ — بین‌المللی‌سازی کامل + ارز
- تکمیل دیکشنری‌های fa/en/ar (همه صفحه‌ها)، سیستم ارز (ارز مرجع + انتخاب کاربر + تبدیل)، انتخاب کشور → زبان/ارز/جهت، واحدها/گروه‌ها/شهرهای چندزبانه، تنظیمات ادمین برای روشن/خاموش کردن پرداخت

### فاز ۹ — سخت‌افاری و پاکسازی نهایی
- حذف کد مرده/کامپوننت بلااستفاده/واردات بلااستفاده (فرانت+بک)، بررسی بودجه Performance (bundle/LCP/CLS)، ممیزی Security نهایی، تست‌ها (unit: pricing/matching/validation · integration: auth/APIها · E2E: فلوهای بحرانی)، build پروداکشن، مقایسه بصری نهایی همه صفحه‌ها با Prototype، گزارش پایانی

---

## ۳. وضعیت اجرا ( living )

| فاز | وضعیت | تاریخ | شاخص خروجی |
|---|---|---|---|
| ۱ | ✅ انجام شد | 2026-10-05 | بک‌آپ تأییدشده ۲۶/۲۶ · شل v18 در `/(app)/home` · پوش دو ریپو |
| ۲–۹ | ⏳ | — | — |

## ۴. قرارداد گزارش فاز (§۶۵)
هر فاز در پایان با قالب: Completed / Changed / Backend / Database / Frontend / Prototype deviations / Bugs fixed / Performance / Security / Tests / Remaining / Demo گزارش می‌شود؛ گزارش فاز در chat + خلاصه در همین فایل + ورک‌لاگ `worklog.md`.
