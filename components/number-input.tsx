"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * NumberInput — ورودی عددی با فرمت‌بندی زنده‌ی هزارگان (خواسته‌ی کاربر:
 * «قیمت فرمت نمی‌خوره» — فرمت فقط بعد از blur کافی نبود؛ حین تایپ هم
 * جداکننده‌ی هزارگان می‌نشیند، مثلا ۴٬۸۰۰٬۰۰۰).
 *
 * قانون پروژه: هر عددی که کاربر تایپ می‌کند (قیمت، موجودی، حداقل سفارش، …)
 * با این کامپوننت گرفته شود، نه Input خام.
 *
 * • ارقام فارسی/عربی هم می‌پذیرد و خودش به لاتین تبدیل می‌کند
 * • جداکننده‌ی هزارگان به‌صورت زنده حین تایپ — با حفظ مکان‌نما روی همان رقم
 * • مقدار عددی خام به والد می‌رود (null یعنی خالی)
 * • دامنه‌ی min/max روی blur اعمال می‌شود
 * • suffix (واحد) در «تهِ» تکست‌باکس می‌نشیند — در RTL یعنی سمت چپ
 *   (خواسته‌ی کاربر: «واحد باید ته تکست‌باکس باشد، نه اول آن»)
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

/** شمارش رقم‌های قبل از مکان‌نما — برای بازگرداندن مکان‌نما بعد از فرمت */
function digitsBefore(text: string, caret: number): number {
  return toEnDigits(text.slice(0, Math.max(0, caret))).replace(/\D/g, "").length;
}

/** موقعیت مکان‌نما بعد از رقمِ nاُم در رشته‌ی فرمت‌شده */
function caretForDigit(formatted: string, digitIndex: number): number {
  if (digitIndex <= 0) return 0;
  const isDigit = (ch: string) => /[0-9\u06F0-\u06F9\u0660-\u0669]/.test(ch);
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (isDigit(formatted[i])) {
      seen++;
      if (seen === digitIndex) return i + 1;
    }
  }
  return formatted.length;
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
  // رقم‌های لاتین خام — منبع حقیقت؛ نمایش همیشه فرمت‌شده است (حین تایپ هم)
  const [raw, setRaw] = React.useState<string>(() => (value === null || value === undefined ? "" : String(value)));

  // تغییر بیرونی مقدار → همگام‌سازی
  React.useEffect(() => {
    setRaw(value === null || value === undefined ? "" : String(value));
  }, [value]);

  const commit = (next: string) => {
    setRaw(next);
    onChange(next === "" ? null : Number(next));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    // مکان‌نما را قبل از فرمت دوباره روی همان رقم بازمی‌گذاریم — وگرنه
    // پرش مکان‌نما به انتها تجربه‌ی تایپ در میانه‌ی عدد را خراب می‌کند
    const before = digitsBefore(el.value, el.selectionStart ?? el.value.length);
    const d = toEnDigits(el.value).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    commit(d);
    const formatted = group(d, locale);
    const pos = before === 0 ? 0 : caretForDigit(formatted, before);
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        /* برخی input ها setSelectionRange ندارند */
      }
    });
  };

  const handleBlur = () => {
    let n = raw === "" ? null : Number(raw);
    if (n !== null && min !== undefined && n < min) n = min;
    if (n !== null && max !== undefined && n > max) n = max;
    commit(n === null ? "" : String(n));
  };

  const display = group(raw, locale);

  return (
    <div
      className={cn(
        // بدون dir=ltr — از RTL صفحه ارث می‌برد تا suffix در انتهای باکس (چپ) بنشیند
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
        className="w-full min-w-0 bg-transparent px-3 py-2.5 text-right text-sm shadow-none outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        value={display}
        onChange={handleChange}
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
