"use client";

import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

/**
 * SmartImage — M11 §پرفورمنس (سند ۰۸): «next/image برای CDN آروان».
 *
 * ▸ عکس‌های سرور/CDN (http(s) یا مسیر محلی /…) → next/image:
 *   srcset + webp/avif + کش ۳۰روزه (remotePatterns آروان در next.config).
 * ▸ پیش‌نمایش‌های زندهٔ client (blob: / data:) — که هنوز آپلود نشده‌اند —
 *   با <img> ساده می‌مانند؛ بهینه‌ساز next/image آن‌ها را نمی‌فهمد.
 *
 * دو مود:
 *   fill (پیش‌فرض)  — والدِ relative + aspect بگذارید؛ className روی خود
 *                     عکس (مثل object-cover) می‌نشیند.
 *   width/height    — تامبنیل با ابعاد صریح؛ بدون نیاز به والد relative.
 */
type SmartProps = {
  src: string;
  alt: string;
  /** برای fill:_sizes (مثل «(max-width:1023px) 50vw, 240px») یا عرض صریح */
  sizes?: string;
  className?: string;
  loading?: ImageProps["loading"];
  priority?: boolean;
} & ({ fill?: true; width?: never; height?: never } | { fill?: false; width: number; height: number });

export function SmartImage(props: SmartProps) {
  const { src, alt, className, loading = "lazy", priority } = props;
  const live = src.startsWith("blob:") || src.startsWith("data:");

  if (live) {
    // eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش محلی (objectURL) — هنوز آپلود نشده
    return <img src={src} alt={alt} className={className} loading={loading} />;
  }

  if (props.fill !== false) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={props.sizes ?? " (max-width: 1023px) 50vw, 260px"}
        className={cn("object-cover", className)}
        loading={loading}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={props.width}
      height={props.height}
      className={className}
      loading={loading}
      priority={priority}
    />
  );
}
