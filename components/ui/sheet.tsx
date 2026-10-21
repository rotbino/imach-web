"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { useMessages } from "@/i18n/messages/use-messages";

/**
 * Sheet — شیت پایین‌باز (قانون موبایل پروتوتایپ)؛ در دسکتاپ = مودال وسچ‌ِ کاغذی.
 * ترتیب z (سند ۰۸ §۳.۳): backdrop 50 → sheet 61.
 * بدون وابستگی Radix — Escape/بک‌دراپ می‌بندد؛ اسکرول بدنه قفل می‌شود.
 */
export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** حداکثر ارتفاع محتوا — پیش‌فرض الگوی پروتوتایپ 85dvh */
  maxHeightClass?: string;
}

export function Sheet({ open, onClose, title, children, maxHeightClass = "max-h-[85dvh]" }: SheetProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const m = useMessages();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => setVisible(true));
    } else {
      document.body.style.overflow = "";
      setVisible(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      // بسته = inert: از درخت دسترسی حذف می‌شود (شیت بسته نباید در snapshot باشد)
      inert={!visible}
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 bg-text/45 backdrop-blur-[2px]",
        // visibility در transition: هنگام بستن تا پایان انیمیشنِ محو دیده می‌شود،
        // بعدش از درخت دسترسی هم خارج می‌شود (شیت بسته در a11y tree نمی‌ماند)
        "transition-[opacity,visibility] duration-200",
        visible ? "opacity-100" : "opacity-0 invisible pointer-events-none"
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          // موبایل: از پایین، گوشه‌های بالا گرد، دستگیره
          "absolute inset-x-0 bottom-0 z-[61] mx-auto flex flex-col",
          "rounded-t-xl bg-surface shadow-pop",
          "transition-transform duration-250 ease-out",
          // دسکتاپ: مودال وسچ (قانون FD-29).
          // ⚠ فقط left/right فیزیکی — «lg:inset-x-auto» ممنوع:
          // tailwind-merge آن را با lg:left-1/2 (هم‌گروهِ conflict) جمع
          // می‌کند، مرکزچین می‌شکند و مودال در LTR نیمی بیرون صفحه
          // می‌افتد (باگ گزارشی مالک M2). inset-x فیزیکی نیست → safe.
          "lg:bottom-auto lg:right-auto lg:left-1/2 lg:top-1/2",
          "lg:w-[440px] lg:rounded-xl lg:shadow-card",
          visible ? "translate-y-0 lg:translate-y-[-50%] lg:translate-x-[-50%]" : "translate-y-full lg:translate-y-[calc(-50%+24px)] lg:translate-x-[-50%]",
          maxHeightClass
        )}
      >
        {/* هدر شیت: دستگیرهٔ موبایل + عنوان + بستن */}
        <div className="relative shrink-0 pt-2.5 pb-1 lg:pt-0">
          <div className="mx-auto h-1 w-10 rounded-full bg-line-2 lg:hidden" />
          {title && (
            <div className="flex items-center justify-between px-5 pt-2 pb-1 lg:px-6 lg:pt-5">
              <h3 className="text-[15px] font-bold text-text">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={m.common.closeAria}
                className="grid size-8 place-items-center rounded-full text-text-3 hover:bg-surface-2"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          )}
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-6 lg:px-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
