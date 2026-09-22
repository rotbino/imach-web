"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * NumberInput — ورودی عددی با فرمت‌بندی زنده (خواسته‌ی کاربر برای قیمت‌ها
 * و همه‌ی اعداد). قانون پروژه: هر عددی که کاربر تایپ می‌کند (قیمت، موجودی،
 * حداقل سفارش، …) با این کامپوننت گرفته شود، نه Input خام.
 *
 * • ارقام فارسی/عربی هم می‌پذیرد و خودش به لاتین تبدیل می‌کند
 * • جداکننده‌ی هزارگان حین ویرایش (مثلا ۹۸۰٬۰۰۰ / 980,000)
 * • مقدار عددی خام به والد می‌رود (null یعنی خالی)
 * • دامنه‌ی min/max روی بلور اعمال می‌شود
 */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toEnDigits(v: string): string {
  return v
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

function group(v: string, locale: "fa" | "en"): string {
  if (!v) return "";
  try {
    return Number(v).toLocaleString(locale === "en" ? "en-US" : "fa-IR");
  } catch {
    return v;
  }
}

interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "size" | "prefix" | "suffix"> {
  value: number | null;
  onChange: (v: number | null) => void;
  /** رقم‌ها و جداکننده‌ی نمایش — پیش‌فرض فارسی */
  locale?: "fa" | "en";
  min?: number;
  max?: number;
  /** عنصر تزئینی اول/آخر ورودی (مثل نام واحد پول) */
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export function NumberInput({
  value,
  onChange,
  locale = "fa",
  min,
  max,
  prefix,
  suffix,
  className,
  disabled,
  ...props
}: NumberInputProps) {
  const [focused, setFocused] = React.useState(false);
  // رقم‌های لاتین خام — منبع حقیقت حین تایپ
  const [raw, setRaw] = React.useState<string>(() => (value === null ? "" : String(value)));

  // تغییر بیرونی مقدار → همگام‌سازی وقتی کاربر در حال تایپ نیست
  React.useEffect(() => {
    if (!focused) setRaw(value === null || value === undefined ? "" : String(value));
  }, [value, focused]);

  const commit = (next: string) => {
    setRaw(next);
    onChange(next === "" ? null : Number(next));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let d = toEnDigits(e.target.value).replace(/[^\d]/g, "");
    d = d.replace(/^0+(?=\d)/, ""); // بدون صفرهای آغازین
    commit(d);
  };

  const handleBlur = () => {
    setFocused(false);
    let n = raw === "" ? null : Number(raw);
    if (n !== null && min !== undefined && n < min) n = min;
    if (n !== null && max !== undefined && n > max) n = max;
    commit(n === null ? "" : String(n));
  };

  const display = focused ? raw : group(raw, locale);

  return (
    <div
      dir="ltr"
      className={cn(
        "flex items-center rounded-xl border border-input bg-transparent transition-colors",
        "focus-within:ring-2 focus-within:ring-ring/40",
        disabled && "opacity-50",
        className
      )}
    >
      {prefix && (
        <span className="select-none border-e px-3 py-2.5 text-sm font-bold text-muted-foreground">
          {prefix}
        </span>
      )}
      <input
        dir="ltr"
        type="text"
        inputMode="numeric"
        disabled={disabled}
        className="w-full min-w-0 bg-transparent px-3 py-2.5 text-sm shadow-none outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        value={display}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        {...props}
      />
      {suffix && (
        <span className="select-none border-s px-3 py-2.5 text-sm font-bold text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}
