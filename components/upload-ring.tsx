"use client";

import { fa } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

/*
 * UploadRing — حلقه‌ی پیشرفت آپلود با هویت برند (خواسته‌ی کاربر:
 * «یه دایره‌ی برند که در حال کامل شدنه و درصدم با رنگ برند روش نوشته شده باشه»).
 *
 * دو فازِ صادقانه دارد تا درصد دیگر «الکی» به‌نظر نرسد:
 *   • sending    — بایت‌های کلاینت→سرور در جریان است؛ حلقه با درصد واقعی پر می‌شود.
 *   • processing — بایت‌ها تمام شده و سرور مشغول پردازش است (ذخیره در آروان +
 *                  ساخت تامبنیل). اینجاست که نوارِ قدیمی بی‌دلیل روی ۹۹ می‌ماند؛
 *                  حالا قوسِ چرخان + برچسب «در حال پردازش» صادقانه توضیح می‌دهد.
 */

export type UploadPhase = "sending" | "processing";

export function UploadRing({
  progress,
  phase = "sending",
  size = 96,
  processingLabel,
  showPercent = true,
  className,
}: {
  /** درصد ۰ تا ۹۹ (۱۰۰ یعنی تمام) */
  progress: number;
  phase?: UploadPhase;
  /** قطر حلقه به پیکسل — پیش‌فرض ۹۶ (بزرگ و خوانا) */
  size?: number;
  /** برچسب زیر درصد در فاز پردازش — از i18n بیرون می‌آید */
  processingLabel?: string;
  /** نمایش درصد داخل حلقه — وقتی درصدی در کار نیست (فقط چرخش) خاموش شود */
  showPercent?: boolean;
  className?: string;
}) {
  const { locale } = useLocale();
  const pctLabel = locale === "en" ? `${progress}%` : `${fa(progress)}٪`;

  // هندسه‌ی حلقه — ویوباکس ثابت ۱۲۰ تا، مستقل از اندازه‌ی رندر
  const R = 50;
  const C = 2 * Math.PI * R;
  const p = Math.max(0, Math.min(100, progress));
  const offset = C * (1 - p / 100);
  const processing = phase === "processing";

  return (
    <div
      className={cn("relative grid place-items-center text-primary", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      aria-label={processing ? processingLabel ?? "processing" : pctLabel}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className={processing ? "animate-spin" : ""}
        style={processing ? { animationDuration: "1.6s" } : undefined}
      >
        {/* شیار پس‌زمینه */}
        <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeOpacity={0.16} strokeWidth={11} />
        {/*
          قوس پیشرفت — sending: با transition نرم پر می‌شود؛
          processing: یک قوس ۷۵درجه‌ای چرخان (نامعلوم ولی زنده)
        */}
        {processing ? (
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={11}
            strokeLinecap="round"
            strokeDasharray={`${C * 0.21} ${C * 0.79}`}
          />
        ) : (
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={11}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        )}
      </svg>
      {/* درصد + برچسب پردازش — رنگ برند، داخل حلقه (چیدمان ستونی) */}
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {showPercent && (
          <span className="font-black tabular-nums text-primary" dir="ltr" style={{ fontSize: Math.max(13, size * 0.24) }}>
            {pctLabel}
          </span>
        )}
        {processing && processingLabel && (
          <span
            className="mt-1 text-center font-bold text-primary/75"
            style={{ fontSize: Math.max(9, size * 0.115) }}
          >
            {processingLabel}
          </span>
        )}
      </span>
    </div>
  );
}
