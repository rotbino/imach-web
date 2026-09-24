"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compress";

/*
 * FileUploader — انتخابگر عکس تخت و مینیمال (فلسفه‌ی UI پروژه: اورنج/گرای،
 * بدون سایه‌بازی اضافه). خودش آپلود نمی‌کند؛ عمدا: جریانِ آپلود دم فرم است —
 *   • آواتار/لوگو: فرم بلافاصله upload می‌کند (مدل از قبل وجود دارد).
 *   • گالری آگهی: فرم فایل‌ها را نگه می‌دارد و بعد از ثبت آگهی می‌فرستد —
 *     «فایل قبل از ذخیره‌ی مدل آپلود نشود» (خواسته‌ی کاربر).
 * پیش‌پردازش فشرده‌سازی (تا ۱۶۰۰px) همین‌جا انجام می‌شود تا کمتر بایت برود.
 */

export interface UploaderValue {
  url: string;
  thumbUrl?: string | null;
}

export interface FileUploaderProps {
  /** round = آواتار گرد، square = لوگو/عکس کالا */
  shape?: "round" | "square";
  /** اندازه‌ی کاشی به پیکسل */
  size?: number;
  accept?: string;
  /** عکس فعلی (از سرور) — اگر باشد نمایش داده می‌شود */
  value?: UploaderValue | null;
  /** آپلود/انتظار در جریان است */
  uploading?: boolean;
  disabled?: boolean;
  /** برچسب کاشی خالی — i18n از بیرون می‌آید */
  label?: string;
  /** فایل فشرده‌شده به والد می‌رود؛ والد تصمیم می‌گیرد کی آپلود شود */
  onSelect?: (file: File) => void;
  /** حذف عکس فعلی — والد فراخوانی سرور را انجام می‌دهد */
  onRemove?: () => void;
  className?: string;
}

export function FileUploader({
  shape = "square",
  size = 120,
  accept = "image/*",
  value,
  uploading = false,
  disabled = false,
  label,
  onSelect,
  onRemove,
  className,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    e.target.value = ""; // انتخاب دوباره‌ی همان فایل هم کار کند
    if (!raw || disabled || uploading) return;
    const preview = URL.createObjectURL(raw);
    setLocalPreview(preview);
    const compressed = await compressImage(raw);
    onSelect?.(compressed);
    setLocalPreview(null);
  };

  const rounded = shape === "round" ? "rounded-full" : "rounded-2xl";
  const showPreview = localPreview ?? value?.thumbUrl ?? value?.url ?? null;

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden border-2 border-dashed transition",
          rounded,
          disabled || uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary/60 hover:bg-accent/40",
          showPreview ? "border-solid border-primary/30" : "border-border bg-accent/20"
        )}
        style={{ width: size, height: size }}
        role="button"
        tabIndex={0}
        aria-disabled={disabled || uploading}
        aria-label={label}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleSelect} disabled={disabled || uploading} />

        {uploading ? (
          <Loader2 className="size-6 animate-spin text-primary" />
        ) : showPreview ? (
          <>
            {/* عکس سروری → next/image (بهینه‌سازی خودکار)؛ پیش‌نمایش blob محلی → img خام */}
            {/^https?:\/\//.test(showPreview) ? (
              <Image
                src={showPreview}
                alt=""
                width={size}
                height={size}
                className={cn("h-full w-full object-cover", rounded)}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={showPreview} alt="" className={cn("h-full w-full object-cover", rounded)} />
            )}
            {onRemove && !disabled && (
              <button
                type="button"
                aria-label="remove"
                className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition hover:bg-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalPreview(null);
                  onRemove();
                }}
              >
                <X className="size-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            <ImagePlus className="size-6 text-muted-foreground/70" strokeWidth={1.75} />
            {label && <span className="text-[11px] leading-4 text-muted-foreground">{label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
