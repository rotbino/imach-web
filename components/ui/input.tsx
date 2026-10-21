"use client";

import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Field + Input — فرم M0 (Tailwind-only، RTL-native).
 * الگوی پروتوتایپ: برچسب بالا · ورودی کاغذی با قاب line · فوکوس = قاب arm.
 */
export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => React.ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  return (
    // استاندارد فاصله‌گذاری فرم (حکم مالک M2): برچسب→ورودی ۸px (gap-2)؛
    // خطای/راهنما همان فاصله. فاصلهٔ «فیلد تا فیلد» را کانتینر فرم با gap-5 می‌دهد.
    <div className="flex w-full flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-[13px] font-bold text-text-2">
          {label}
          {required && <span className="ms-0.5 text-red">*</span>}
        </label>
      )}
      {children(id)}
      {error ? (
        <p className="text-[12px] leading-5 text-red">{error}</p>
      ) : hint ? (
        <p className="text-[12px] leading-5 text-text-3">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase = [
  "w-full rounded-lg border bg-surface px-3.5 text-[15px] text-text",
  "border-line placeholder:text-text-4",
  "h-12 leading-none",
  "focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20",
  "disabled:bg-surface-2 disabled:text-text-3",
  "transition-colors",
];

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputBase, className)} {...rest} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(inputBase, "h-auto min-h-24 leading-6 py-3", className)}
        {...rest}
      />
    );
  }
);
