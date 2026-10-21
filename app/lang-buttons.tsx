"use client";

import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * دکمه‌های زبان لندینگ — نمایشی (D2: چندزبانه = پایه در کد، اجرا در آینده).
 * فارسی فعال · en/ar → توست «به‌زودی». هیچ تغییر locale انجام نمی‌شود.
 */
export function LandingLangButtons() {
  const { show } = useToast();
  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
      {[
        { code: "fa", label: "فا", active: true },
        { code: "en", label: "EN", active: false },
        { code: "ar", label: "عربی", active: false },
      ].map((l) => (
        <button
          key={l.code}
          type="button"
          disabled={l.active}
          onClick={() => show({ text: "به‌زودی — زبان‌های دیگر در راهند", kind: "info" })}
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-bold transition-colors",
            l.active ? "bg-primary-soft text-primary-strong" : "text-text-3 hover:bg-surface-2"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
