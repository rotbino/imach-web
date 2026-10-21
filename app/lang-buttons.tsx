"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/messages/use-messages";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * LandingLangButtons — نوار زبان لندینگ (FD-34: جزئی از خود بنر).
 * D2: چندزبانه = پایه در کد، اجرا در آینده — فارسی فعال؛
 * en/ar → توست «به‌زودی»؛ «سایر» → شیت زبان‌های بیشتر (FD-32).
 * هیچ تغییر locale انجام نمی‌شود.
 */
export function LandingLangButtons() {
  const { show } = useToast();
  const m = useMessages();
  const L = m.landing;
  const [moreOpen, setMoreOpen] = useState(false);

  const pill =
    "inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold text-text-2 transition-colors hover:border-line-3 hover:text-text lg:px-4 lg:py-1.5 lg:text-[12px]";

  return (
    <div
      role="group"
      aria-label={L.langsAria}
      className="flex flex-wrap items-center justify-center gap-1.5 pb-4 lg:justify-start lg:gap-2 lg:pb-[22px]"
    >
      <button type="button" disabled className={cn(pill, "border-primary bg-primary-soft font-bold text-primary-strong")}>
        {L.langFa}
      </button>
      <button
        type="button"
        className={pill}
        onClick={() => show({ text: `${L.langEn} — ${L.soon}`, kind: "info" })}
      >
        {L.langEn}
      </button>
      <button
        type="button"
        className={pill}
        onClick={() => show({ text: `${L.langAr} — ${L.soon}`, kind: "info" })}
      >
        {L.langAr}
      </button>
      <button type="button" className={pill} onClick={() => setMoreOpen(true)}>
        {L.langMore}
        <Icon name="chevd" size={11} className="text-text-3" />
      </button>

      {/* FD-32: شیت «زبان‌های دیگر» — فقط نمایشی (الگوی sheet-lang) */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={L.moreTitle}>
        <p className="pb-2 text-[12.5px] leading-5 text-text-3">{L.moreSub}</p>
        <div className="flex flex-col">
          {L.moreList.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setMoreOpen(false);
                show({ text: `${name} — ${L.soon}`, kind: "info" });
              }}
              className="flex items-center justify-between rounded-lg px-2 py-3 text-start transition-colors hover:bg-surface-2"
            >
              <span className="text-[14px] font-bold text-text">{name}</span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text-3">
                {L.soon}
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
