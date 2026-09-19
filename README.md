# iMach — Web (imach-web)

فرانت‌اند بازار عمده‌فروشی **iMach** — ساده، مینیمال و RTL-first.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · TanStack Query 5 · Tailwind CSS 4 + shadcn/ui · Vazirmatn

## ساختار

```
src/
├─ app/
│  ├─ layout.tsx            # RTL (dir="rtl") + فونت Vazirmatn + Providers
│  ├─ providers.tsx         # QueryClient + silent auth boot
│  ├─ page.tsx              # لندینگ
│  ├─ start/page.tsx        # ویزارد: ورود/ثبت‌نام → کسب‌وکار → کالاها → لینک بازوها
│  ├─ sell/[slug]/page.tsx  # بازوی فروش (کاتالوگ عمومی + درخواست‌ها + پیشنهاد خریدارها)
│  └─ buy/[slug]/page.tsx   # بازوی خرید (قیمت‌گیری + پیشنهادها + تابلوی قیمت)
├─ lib/
│  ├─ api.ts                # کلاینت API تایپ‌دار + refresh خودکار روی 401
│  ├─ auth-store.tsx        # zustand — access token در حافظه، رفرش single-flight
│  ├─ queries.ts            # هوک‌های TanStack Query (کلیدها، staleTime، invalidation)
│  └─ format.ts             # اعداد فارسی، برچسب enum‌ها، زمان نسبی
└─ components/market/       # chrome (هدر/کارت لینک/QR)، ویزارد، دو بازو، لندینگ
```

## تصمیم‌های کلیدی

- **Server state = TanStack Query**: هیچ دیتای سرور در useState/localStorage نیست؛ staleTime هر منبع جدا تنظیم شده (کاتالوگ ۵ دقیقه، تابلو ۳۰ ثانیه، پیشنهادها ۱۵ ثانیه).
- **امنیت توکن**: access token فقط در حافظه (zustand)؛ refresh token در کوکی `httpOnly`؛ پاسخ 401 یک‌بار ساکت رفرش و تلاش مجدد می‌شود؛ رفرش single-flight است تا چرخش توکن race نسازد.
- **RTL + آماده LTR**: `dir="rtl"` در لایه ریشه و همه‌جا از utilityهای منطقی (`ms-/me-/ps-/pe-/start-/end-`) استفاده شده تا چندزبانه‌شدن بعدا فقط سوییچ زبان باشد.
- **API هم‌مبدأ**: فرانت `/api/v1/*` را به بک‌اند پروکسی می‌کند (rewrite در `next.config.ts`) — کوکی‌ها first-party می‌مانند و CORS لازم نمی‌شود.

## اجرا

```bash
# ۱) بک‌اند (repo مجزا) روی پورت 4000
git clone https://github.com/rotbino/imach-back && cd imach-back
cp .env.example .env   # مقادیر را پر کنید
npm i && npm run db:push && npm run seed && npm run dev

# ۲) فرانت
cp .env.example .env.local
npm i        # یا pnpm/bun
npm run dev  # http://localhost:3000
```

### متغیرهای محیطی

| متغیر | پیش‌فرض | توضیح |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | `/api/v1` | مبناي فراخوانی API |
| `NEXT_PUBLIC_GATEWAY_PORT` | خالی | فقط برای سندباکس با گیت‌وی Caddy؛ در دیپلوی واقعی خالی |
| `BACKEND_ORIGIN` | `http://127.0.0.1:4000` | مقصد پروکسی `/api/v1` |

### حساب دمو

`09120000001` / `ImachDemo1234` (خورشید مارکت — هم فروشنده هم خریدار)

## جریان کاربر

1. **شروع**: `/start` → ورود/ثبت‌نام (JWT) → اطلاعات کسب‌وکار → انتخاب کالا از کاتالوگ مرجع → مشخصات فروش/خرید هر کالا
2. **دو بازو**: صفحه موفقیت دو لینک اختصاصی + QR + اشتراک تلگرام/واتساپ می‌دهد
3. **بازوی فروش** (`/sell/{slug}`): کاتالوگ عمومی؛ مالک، درخواست‌های قیمت و خریدارهای پیشنهادی را می‌بیند و قیمت می‌فرستد
4. **بازوی خرید** (`/buy/{slug}`): فعال‌سازی قیمت‌گیری → موتور تطبیق (کالا + شهر + حجم) پیشنهاد می‌سازد → فالو → تابلوی قیمت زنده با trend
