# iMach Redesign — Design Reference Package

**مرجع طراحی بازطراحی iMach — منبع قطعی برای پیاده‌سازی فرانت**

این پکیج مرجع طراحی کامل برای بازطراحی iMach است که توسط کاربر تأیید شده و **منبع قطعی** برای پیاده‌سازی فرانت‌اند محسوب می‌شود. طبق تصمیم کاربر، فرانت نهایی باید **دقیقاً** مطابق این طراحی باشد.

---

## How to View / نحوه مشاهده

```bash
# Option 1: open directly
open design-reference/index.html        # macOS
xdg-open design-reference/index.html   # Linux

# Option 2: serve locally (recommended — fonts load correctly)
cd design-reference && python3 -m http.server 8899
# → http://localhost:8899
```

`index.html` یک گالری تعاملی از هر ۲۰ صفحه است — همه صفحات به هم لینک شده‌اند و می‌شود بین آن‌ها حرکت کرد.

---

## Package Structure / ساختار پکیج

| Path | Description |
|------|-------------|
| `index.html` | گالری تعاملی — نقطه شروع |
| `css/style.css` | استایل کامل (RTL، متغیرها، کامپوننت‌ها) |
| `fonts/` | IRANSans (فونت اصلی برند) |
| `screens/` | HTML خام هر ۲۰ صفحه + ۳ صفحه دسکتاپ |
| `png/` | اسکرین‌شات رندرشده هر ۲۲ صفحه |
| `architecture.html` | معماری محصول: دو دستیار، تابلوی تأمین، جریان‌ها |
| `overview.html` | خلاصه اجرایی پروژه |
| `implementation-details.md` | جزئیات فنی پیاده‌سازی (فازها، APIها، دیتابیس) |
| `stitch-prompt.md` | پرامپت طراحی اصلی |
| `assets/` | لوگو و دارایی‌ها |

## The 20 Screens / ۲۰ صفحه

**دستیار فروش (کاتالوگ من):**
- `01-sell-catalog.html` — کاتالوگ من
- `02-product-public.html` — صفحه عمومی محصول
- `03-product-owner.html` — صفحه محصول مالک
- `04-product-form.html` — فرم افزودن/ویرایش محصول
- `05-sell-requests.html` — درخواست‌های قیمت
- `06-sell-price-respond.html` — پاسخ به درخواست قیمت
- `07-sell-profile.html` — پروفایل فروش

**دستیار خرید (تأمین):**
- `08-buy-list.html` — لیست خرید
- `09-buy-list-detail.html` — جزئیات لیست
- `10-buy-suppliers.html` — تأمین‌کنندگان
- `11-buy-supplier-detail.html` — جزئیات تأمین‌کننده
- `12-buy-profile.html` — پروفایل خرید

**عمومی:**
- `13-public-search.html` — جستجوی عمومی
- `14-public-product.html` — نتیجه محصول عمومی
- `15-landing.html` — لندینگ (معرفی iMach + CTA)
- `16-signup.html` — ثبت‌نام
- `17-login.html` — ورود

**دسکتاپ (adaptive):**
- `d1-desktop-catalog.html` — نمای دسکتاپ کاتالوگ
- `d2-desktop-supply.html` — نمای دسکتاپ تابلوی تأمین
- `d3-desktop-landing.html` — نمای دسکتاپ لندینگ

---

## Non-Negotiable Design Rules / قواعد غیرقابل‌مذاکره

- **RTL** — تمام رابط فارسی، راست‌به‌چپ
- **IRANSans** — فونت اصلی (فارسی‌نمایی اعداد مهم است)
- **Mobile-first** — دسکتاپ adaptive گسترش همان طرح است
- **دو دستیار جدا**: دستیار فروش و دستیار خرید — هرکدام با پیمایش و پروفایل مستقل
- **تابلوی تأمین ≠ درخواست قیمت** — تابلوی تأمین مقایسه دائمی است؛ درخواست قیمت اقدام فعال
- **هر صفحه یک سؤال جواب می‌دهد** — تراکم اطلاعات ممنوع
- اعداد همیشه با کامپوننت `number-input` (سه‌رقمی جدا شده، ورودی فارسی)

## Status / وضعیت

- تأیید نهایی کاربر: **۱۴۰۵ مهر / Oct 2026** — GO برای پیاده‌سازی
- مبنای پیاده‌سازی مرحله‌به‌مرحله: `implementation-details.md`

> ⚠️ این دایرکتوری مرجع تاریخی است — برای اصلاح طراحی، نسخه جدید بسازید و این را دست‌نخورده نگه دارید.
