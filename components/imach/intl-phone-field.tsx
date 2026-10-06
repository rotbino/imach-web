"use client";

/**
 * IntlPhoneField — ورودی موبایل بین‌المللی به سبک تلگرام (فاز ۱۰ · بازخورد مالک).
 *
 * خواستهٔ مالک:
 *   · باکس شماره همیشه LTR باشد — حتی در زبان‌های راست‌چین
 *   · پرچم + کد کشور در ابتدای باکس؛ انتخاب کشور از همین‌جا (بدون لینک جدا)
 *   · انتخاب کشور با مدال جست‌جدار باز شود؛ پرچم هر کشور نمایش داده شود
 *
 * ساختار: یک ردیفِ LTR — دکمهٔ [پرچم +۹۸ ▾] + اینپوت شمارهٔ ملی.
 * مدال کشور: شیت v18 با سرچ (نام/کد/شماره) و ردیف‌های پرچم‌دار.
 * نرمال‌سازی ارقام فارسی/عربی → لاتین + حذف زندهٔ صفر آغازین (الگوی موجود).
 */

import { useMemo, useState } from "react";
import { COUNTRIES, dialOf, type Country } from "@/lib/countries";
import { Icon } from "@/components/imach/icon";
import { Sheet } from "@/components/imach/sheet";
import { useMessages } from "@/i18n/messages/use-messages";
import { fa } from "@/lib/format";

/** پرچم کشوری از کد ISO — نشان‌های منطقه‌ای یونیکد (🇮🇷 و…) */
export function flagOf(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🏳";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

/** نرمال‌سازی ارقام فارسی/عربی → لاتین (§۲۱ فرم‌های production-grade) */
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
  const t = m.app.login;
  const [pickerOpen, setPickerOpen] = useState(false);

  const dial = dialOf(country);
  const current = COUNTRIES.find((c) => c.code === country);

  return (
    <>
      <div className="intl-phone" dir="ltr">
        <button
          type="button"
          className="cc"
          onClick={() => (onCountryChange ? setPickerOpen(true) : undefined)}
          aria-label={t.countryPickerAria}
          disabled={!onCountryChange}
          title={current?.name ?? country}
        >
          <span className="flag" aria-hidden>
            {flagOf(country)}
          </span>
          <b>+{dial}</b>
          {onCountryChange ? <Icon className="ic-sm ic-10 caret" name="i-chev" /> : null}
        </button>
        <input
          className="num"
          dir="ltr"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholder ?? t.phonePlaceholder}
          aria-label={ariaLabel ?? t.phoneLabel}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(sanitizePhone(e.target.value, country))}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        />
      </div>

      {onCountryChange ? (
        <CountryPickerSheet
          open={pickerOpen}
          current={country}
          onClose={() => setPickerOpen(false)}
          onPick={(code) => {
            setPickerOpen(false);
            if (code !== country) onCountryChange(code);
          }}
        />
      ) : null}
    </>
  );
}

/* ═══════════ مدال انتخاب کشور — سرچ + پرچم + کد ═══════════ */
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
  const t = m.app.login;
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
    <Sheet open={open} onClose={onClose} label={t.countryPickerAria}>
      <div className="sheet country-sheet">
        <div className="grab" />
        <h3>{t.countryPickerTitle}</h3>
        <div className="sub">{t.countryPickerSub}</div>

        <div className="cs-search">
          <Icon name="i-search" />
          <input
            className="inp"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.countrySearchPh}
            autoFocus={open}
            aria-label={t.countrySearchPh}
          />
        </div>

        <div className="cs-list" role="listbox" aria-label={t.countryPickerTitle}>
          {list.map((c) => (
            <button
              key={c.code}
              type="button"
              className={c.code === current ? "cs-row on" : "cs-row"}
              role="option"
              aria-selected={c.code === current}
              onClick={() => onPick(c.code)}
            >
              <span className="flag" aria-hidden>
                {flagOf(c.code)}
              </span>
              <span className="nm">{c.name}</span>
              <span className="dc" dir="ltr">
                +{c.dial}
              </span>
              {c.code === current ? <Icon className="ic-sm ic-14" name="i-check" /> : null}
            </button>
          ))}
          {list.length === 0 ? <div className="cs-empty">{t.countryEmpty.replace("{n}", fa(0))}</div> : null}
        </div>
      </div>
    </Sheet>
  );
}
