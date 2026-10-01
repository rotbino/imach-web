"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

/*
 * مدال بلند — برای «تنظیمات» و هر مدالی که محتوایش از صفحه بلندتر است
 * (خواسته‌ی کاربر):
 *   • موبایل: تمام‌صفحه واقعی — ارتفاع و عرض کامل (100dvh × 100vw)، بی‌حاشیه
 *   • دسکتاپ: ورق بلند و پهنِ وسط‌چین (۸۸٪ ارتفاع، تا ۶۸۰px عرض)
 *   • دکمه‌ی بستن «داخل جریانِ» هدر است نه مطلق — پس هرگز با عنوان تداخل
 *     نمی‌کند؛ عنوان هم پدینگ بالای نفس‌دار می‌گیرد
 *   • بدنه اسکرول می‌خورد (flex-1) و فوترِ اکشن اختیاری چسبان می‌ماند
 * کالبدشناسی همان صفحات طرح است: subheader (۵۴px) + screen-body + action-bar.
 */

export function TallDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  trailing,
  footer,
  bodyClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** عنوان مدال — کنار دکمه‌ی بستن می‌نشیند */
  title: ReactNode;
  /** زیرنویس کوچک زیر عنوان («به کاتالوگ …»، «۳ دسته» و…) */
  subtitle?: ReactNode;
  /** آیکون عنوان */
  icon?: ReactNode;
  /** عنصر انتهای هدر (بج وضعیت و…) */
  trailing?: ReactNode;
  /** نوار اکشن چسبان پایین (دکمه‌ی ذخیره و…) */
  footer?: ReactNode;
  /** کلاس اضافه‌ی بدنه‌ی اسکرولی */
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:top-[6dvh] sm:left-1/2 sm:h-[88dvh] sm:w-[min(680px,94vw)] sm:max-w-none sm:translate-x-[-50%] sm:translate-y-0 sm:rounded-2xl sm:border"
      >
        {/* ═══ هدر — دکمه بستن در جریان؛ با عنوان تداخلی وجود ندارد ═══ */}
        <header className="flex shrink-0 items-center gap-2.5 border-b bg-white px-4 pb-2.5 pt-3.5 sm:pb-2 sm:pt-3">
          <button
            type="button"
            aria-label="بستن"
            onClick={() => onOpenChange(false)}
            className="grid size-8.5 shrink-0 place-items-center rounded-[10px] text-stone-500 transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
          <div className="min-w-0 flex-1">
            <DialogTitle className="flex min-w-0 items-center gap-1.5 text-[15px] font-bold leading-tight">
              {icon}
              <span className="truncate">{title}</span>
            </DialogTitle>
            {subtitle ? (
              <p className="truncate text-[10.5px] font-normal leading-tight text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {trailing ? <div className="shrink-0">{trailing}</div> : null}
        </header>

        {/* ═══ بدنه — تنها بخش اسکرولی ═══ */}
        <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 ${bodyClassName ?? ""}`}>
          {children}
        </div>

        {/* ═══ نوار اکشن چسبان (اختیاری) ═══ */}
        {footer ? (
          <div
            className="flex shrink-0 items-center gap-2.5 border-t bg-white/97 px-4 py-3 backdrop-blur"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
