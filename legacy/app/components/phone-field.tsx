"use client";

import { SearchSelect } from "@/components/search-select";
import { COUNTRIES, dialOf } from "@/lib/countries";
import { Input } from "@/components/ui/input";

/*
 * PhoneField — ورودی موبایل با پیشوند کد کشورِ زنده (خواسته‌ی کاربر:
 * «وقتی کشور انتخاب شد، کد کشور اتومات بیاد و جای کد ثابت 98 بگیره»).
 *
 * • پیشوند همیشه از کشور انتخابی می‌آید (+98 ثابت نیست)
 * • اگر onCountryChange بدهید، پیشوند خودش یک انتخاب‌گر کشوریِ سرچ‌دار
 *   می‌شود (برای مدال‌های فشرده مثل گیت تماس)
 * • صفر اول به‌صورت زنده و بی‌صدا حذف می‌شود — کاربر «09» تایپ می‌کند و
 *   همین لحظه «9» می‌بیند؛ نه پیام، نه خطا (خواسته‌ی کاربر)
 * • طول ورودی سقف دارد: ایران دقیقا ۱۰ رقم، بقیه ۱۲ رقم
 * • هر فرمتی می‌پذیرد؛ نرمال‌سازی نهایی با normalizeIntlPhone انجام می‌شود
 */

/** سقف رقم برای هر کشور — ایران دقیقا ۱۰ رقم بدون صفر است */
const maxDigitsOf = (countryCode: string): number => (countryCode === "IR" ? 10 : 12);

/** فقط رقم؛ صفرهای آغازین زنده حذف؛ سقف طول کشور */
function sanitizePhoneInput(v: string, countryCode: string): string {
  let d = v.replace(/\D/g, "");
  d = d.replace(/^0+/, ""); // «09» → همان لحظه «9» — بدون پیام
  return d.slice(0, maxDigitsOf(countryCode));
}

export const countrySelectItems = COUNTRIES.map((c) => ({
  value: c.code,
  label: c.name,
  hint: `+${c.dial}`,
  keywords: [c.code, c.dial, c.currency],
}));

export function PhoneField({
  value,
  onChange,
  countryCode,
  onCountryChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  /** کشور جاری — کد تلفن از همین‌جا می‌آید */
  countryCode: string;
  /** بدهید تا پیشوند، انتخاب‌گر کشور شود */
  onCountryChange?: (code: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const dial = dialOf(countryCode);

  return (
    <div
      dir="ltr"
      className="flex items-center rounded-xl border border-input bg-transparent transition-colors focus-within:ring-2 focus-within:ring-ring/40"
    >
      {onCountryChange ? (
        <SearchSelect
          items={countrySelectItems}
          value={countryCode}
          onChange={onCountryChange}
          searchPlaceholder="…"
          ariaLabel={ariaLabel ? `${ariaLabel} — country code` : "country code"}
          align="start"
          renderLabel={() => `+${dial}`}
          className="h-auto w-fit rounded-none rounded-s-xl border-0 border-e bg-muted/40 px-2.5 py-2.5"
        />
      ) : (
        <span className="select-none border-e px-3 py-2.5 text-sm font-bold text-muted-foreground">
          +{dial}
        </span>
      )}
      <Input
        dir="ltr"
        inputMode="numeric"
        maxLength={maxDigitsOf(countryCode)}
        className="border-0 shadow-none focus-visible:ring-0"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(sanitizePhoneInput(e.target.value, countryCode))}
      />
    </div>
  );
}
