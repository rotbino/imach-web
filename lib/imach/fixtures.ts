/**
 * DEMO FIXTURES — فاز ۱ مهاجرت (اثبات معماری شل).
 * ⚠ موقت و پشت این abstraction — طبق پرامپت مهاجرت §۶۳:
 * فاز ۲/۳ این‌ها را با API واقعی (GET /watched-goods، قیمت‌ها، شمارش‌ها)
 * جایگزین می‌کند و این فایل حذف می‌شود.
 * محتوا = همان دیتای دموی صفحهٔ خانهٔ خریدار در Prototype v18.
 */

export type RichText = Array<string | { b: string }>;

export interface HomeGoodRow {
  thumbClass: string;
  artIcon: "a-rice" | "a-oil" | "a-sugar" | "a-lentil";
  title: string;
  pulse?: boolean;
  followBadge?: string;
  price?: string;
  unit?: string;
  trend?: { dir: "down" | "up"; pct: string } | { flat: true };
  freshBadge?: boolean;
  suppliersBadge?: string;
  sub: RichText;
  coldStart?: string;
}

export const BUY_HOME_ROWS: HomeGoodRow[] = [
  {
    thumbClass: "rice",
    artIcon: "a-rice",
    title: "برنج هاشمی",
    pulse: true,
    followBadge: "۳ دنبال‌شده",
    price: "۸۴٬۵۰۰",
    unit: "تومان / کیلوگرم",
    trend: { dir: "down", pct: "۲٪" },
    sub: [
      "ارزان‌ترین: ",
      { b: "سبزدانه همدان" },
      " · ",
      { b: "۶ تأمین‌کننده" },
      " در تابلو · آخرین به‌روزرسانی: ۲ ساعت پیش",
    ],
  },
  {
    thumbClass: "oil",
    artIcon: "a-oil",
    title: "روغن سرخ‌کردنی ۱۶ کیلویی",
    pulse: true,
    followBadge: "۲ دنبال‌شده",
    price: "۱٬۸۵۰٬۰۰۰",
    unit: "تومان / بستهٔ ۱۶ کیلویی",
    freshBadge: true,
    sub: [
      "نیاز: ",
      { b: "۲۰ بسته در ماه" },
      " · ",
      { b: "۴ تأمین‌کننده" },
      " در تابلو · آخرین به‌روزرسانی: امروز",
    ],
  },
  {
    thumbClass: "sugar",
    artIcon: "a-sugar",
    title: "شکر",
    suppliersBadge: "۲ تأمین‌کننده",
    price: "۶۵٬۰۰۰",
    unit: "تومان / کیلوگرم",
    trend: { flat: true },
    sub: [
      "هنوز دنبال نمی‌کنی — ",
      { b: "رصد را روشن کن" },
      " تا قیمت زنده جلوی چشمت باشد",
    ],
  },
  {
    thumbClass: "lentil",
    artIcon: "a-lentil",
    title: "عدس",
    sub: ["هنوز تأمین‌کننده‌ای پیدا نشده — رصد را روشن کن تا خبرت کنیم"],
    coldStart: "فعال‌سازی رصد",
  },
];
