"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, dialOf, type Country } from "@/lib/countries";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useMessages } from "@/i18n/messages/use-messages";
import { cn } from "@/lib/utils";

/**
 * IntlPhoneField — ورودی موبایل بین‌المللی به سبک تلگرام (سالواح M1 از
 * legacy/components/imach/intl-phone-field.tsx روی کیت Tailwind M0).
 *
 * · پرچم SVG واقعی (/flags/*.svg — رندر یکسان در همهٔ سیستم‌عامل‌ها؛ فاز ۱۳)
 * · نرمال‌سازی ارقام فارسی/عربی → لاتین + حذف زندهٔ صفر آغازین
 * · سقف طول: ایران ۱۰ رقم (بدون صفر) · بقیه ۱۲ رقم
 * · شیت کشور با سرچ (نام/کد/شماره) — همان الگوی M0 Sheet
 */

/** پرچم SVG واقعی — ایموجی روی ویندوز رندر نمی‌شود */
export function Flag({ code, w = 22 }: { code: string; w?: number }) {
  const h = Math.round((w * 3) / 4);
  if (!/^[A-Za-z]{2}$/.test(code)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- فایل SVG ایستا با عرض/ارتفاع صریح
    <img
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      width={w}
      height={h}
      draggable={false}
      className="shrink-0"
      style={{ width: `${w}px`, height: `${h}px`, borderRadius: 2 }}
    />
  );
}

/** نرمال‌سازی ارقام فارسی/عربی → لاتین */
function toAsciiDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** فقط رقم + حذف زندهٔ صفرهای آغازین؛ سقف طول کشور */
function sanitizePhone(v: string, countryCode: string): string {
  const d = toAsciiDigits(v).replace(/\D/g, "");
  return d.replace(/^0+/, "").slice(0, countryCode === "IR" ? 10 : 12);
}

export function IntlPhoneField({
  value,
  onChange,
  country,
  onCountryChange,
  placeholder,
  ariaLabel,
  autoFocus,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  country: string;
  onCountryChange?: (code: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const m = useMessages();
  const t = m.auth.intl;
  const [pickerOpen, setPickerOpen] = useState(false);

  const dial = dialOf(country);
  const current = COUNTRIES.find((c) => c.code === country);

  return (
    <>
      <div
        dir="ltr"
        className="flex h-12 items-stretch overflow-hidden rounded-lg border border-line bg-surface transition-colors focus-within:border-arm focus-within:ring-2 focus-within:ring-arm/20"
      >
        <button
          type="button"
          onClick={() => (onCountryChange ? setPickerOpen(true) : undefined)}
          aria-label={t.countryAria}
          disabled={!onCountryChange}
          title={current?.name ?? country}
          className="flex shrink-0 items-center gap-1.5 border-e border-line px-3 text-[14px] font-bold text-text transition-colors hover:bg-surface-2 disabled:hover:bg-transparent"
        >
          <Flag code={country} w={22} />
          <span>+{dial}</span>
          {onCountryChange && <Icon name="chevd" size={12} className="text-text-3" />}
        </button>
        <input
          dir="ltr"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholder}
          aria-label={ariaLabel}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(sanitizePhone(e.target.value, country))}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          className="min-w-0 flex-1 bg-transparent px-3.5 text-start text-[15px] text-text placeholder:text-text-4 focus:outline-none"
        />
      </div>

      {onCountryChange && (
        <CountryPickerSheet
          open={pickerOpen}
          current={country}
          onClose={() => setPickerOpen(false)}
          onPick={(code) => {
            setPickerOpen(false);
            if (code !== country) onCountryChange(code);
          }}
        />
      )}
    </>
  );
}

/* ═══════════ شیت انتخاب کشور — سرچ + پرچم + کد ═══════════ */
function CountryPickerSheet({
  open,
  current,
  onClose,
  onPick,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  onPick: (code: string) => void;
}) {
  const m = useMessages();
  const t = m.auth.intl;
  const [q, setQ] = useState("");

  // باز شدن دوباره → سرچ تازه
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setQ("");
  }

  const needle = q.trim().toLocaleLowerCase();
  const list: Country[] = useMemo(() => {
    if (!needle) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLocaleLowerCase().includes(needle) ||
        c.code.toLocaleLowerCase().includes(needle) ||
        c.dial.startsWith(needle.replace(/^\+/, "")) ||
        `+${c.dial}`.includes(needle)
    );
  }, [needle]);

  return (
    <Sheet open={open} onClose={onClose} title={t.countryTitle}>
      <p className="pb-2 text-[12.5px] leading-5 text-text-3">{t.countrySub}</p>
      <div className="sticky top-0 z-[1] -mx-1 bg-surface px-1 pb-2 pt-1">
        <div className="flex h-11 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3">
          <Icon name="search" size={17} className="shrink-0 text-text-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.countrySearchPh}
            aria-label={t.countrySearchPh}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-text placeholder:text-text-4 focus:outline-none"
          />
        </div>
      </div>
      <div role="listbox" aria-label={t.countryTitle} className="flex flex-col">
        {list.map((c) => (
          <button
            key={c.code}
            type="button"
            role="option"
            aria-selected={c.code === current}
            onClick={() => onPick(c.code)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2.5 text-start transition-colors",
              c.code === current ? "bg-arm-soft" : "hover:bg-surface-2"
            )}
          >
            <Flag code={c.code} w={24} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-text">{c.name}</span>
            <span dir="ltr" className="text-[13px] font-bold text-text-3">
              +{c.dial}
            </span>
            {c.code === current && <Icon name="check" size={16} className="text-arm-strong" />}
          </button>
        ))}
        {list.length === 0 && (
          <p className="py-6 text-center text-[13px] text-text-3">{t.countryEmpty}</p>
        )}
      </div>
    </Sheet>
  );
}
