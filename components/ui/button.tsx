"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Button — دکمهٔ دیزاین‌سیستم M0 (Tailwind-only).
 * واریانت‌ها از زبان پروتوتایپ: btn-arm (پررنگ بازو) · soft (پس‌زمینهٔ arm-soft)
 * · ghost (متن‌محور) · danger (قرمز حذف) · outline (قاب‌دار).
 *
 * ⚠ درس فیکس مالک (۱۰۲۶-۲): سایز xl قبلاً «text-16» داشت — کلاس نامعتبر که
 * tailwind-merge آن را گروه «رنگ متن» می‌پنداشت و text-white را به‌عنوان
 * متناقض حذف می‌کرد → متن دکمهٔ اصلی نارنجی، تیره می‌افتاد. همیشه
 * text-[16px] (اندازهٔ صریح) — نه token عددی لخت.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "arm" | "soft" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  block?: boolean;
  loading?: boolean;
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  arm: "bg-arm text-white hover:bg-arm-strong active:bg-arm-strong shadow-sm",
  soft: "bg-arm-soft text-arm-strong hover:brightness-97 active:brightness-95",
  ghost: "bg-transparent text-text-2 hover:bg-surface-2 active:bg-surface-3",
  danger: "bg-red text-white hover:brightness-95 active:brightness-90",
  outline: "bg-surface text-text border border-line-2 hover:border-line-3 active:bg-surface-2",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-[13px] rounded-md gap-1.5",
  md: "h-11 px-4 text-[14px] rounded-lg gap-2",
  lg: "h-[52px] px-5 text-[15px] rounded-lg gap-2",
  xl: "h-14 px-6 text-[16px] rounded-xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "arm", size = "md", block, loading, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-bold",
        "transition-[filter,background-color,border-color] duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arm",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {children}
    </button>
  );
});
