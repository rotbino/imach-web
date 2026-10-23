"use client";

/**
 * M8 — اجزای مشترک پیام‌رسان (۲۹ لیست + ۳۰ گفتگو).
 * آواتار حرف اول با رنگ پایدار از نام + نشان آنلاین + برچسب زمان فارسی.
 * زبان مشترک پیام‌رسان — همان الگوی share-parts.tsx در M7.
 */

import { cn } from "@/lib/utils";
import type { ChatOtherDto } from "@/lib/api";

/** پالت آواتار — رنگ پایدار از هش نام؛ همیشه یکدست در لیست و گفتگو */
const TONES = [
  "linear-gradient(135deg,#c2703a,#ea580c)",
  "linear-gradient(135deg,#0e7490,#0891b2)",
  "linear-gradient(135deg,#7c3aed,#8b5cf6)",
  "linear-gradient(135deg,#15803d,#16a34a)",
  "linear-gradient(135deg,#b45309,#d97706)",
  "linear-gradient(135deg,#be123c,#e11d48)",
  "linear-gradient(135deg,#4338ca,#4f46e5)",
  "linear-gradient(135deg,#0f766e,#0d9488)",
] as const;

export function avatarTone(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

/** آواتار طرف مقابل + نشان آنلاین (presence M8) */
export function ChatAvatar({
  other,
  size = "md",
  className,
}: {
  other: Pick<ChatOtherDto, "name" | "online">;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box =
    size === "sm" ? "size-8 text-[12px]" : size === "lg" ? "size-14 text-[20px]" : "size-11 text-[15px]";
  const dot =
    size === "sm"
      ? "absolute -bottom-0.5 -end-0.5 size-2.5 border-2"
      : "absolute -bottom-0.5 -end-0.5 size-3 border-[2.5px]";
  return (
    <span className={cn("relative grid shrink-0 place-items-center rounded-full font-black text-white", box, className)}>
      <span className="grid size-full place-items-center rounded-full" style={{ background: avatarTone(other.name) }}>
        {(other.name || "؟").trim().slice(0, 1)}
      </span>
      {other.online !== undefined && (
        <span
          data-online={other.online ? "1" : "0"}
          aria-label={other.online ? "آنلاین" : "آفلاین"}
          className={cn(
            dot,
            "rounded-full border-solid",
            other.online ? "bg-green" : "bg-transparent border-line-2"
          )}
        />
      )}
    </span>
  );
}

/** برچسب زمان ردیف لیست — «۱۰:۱۶» امروز · «دیروز» · تاریخ کوتاه */
export function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return "دیروز";
  return d.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}

/** جداکنندهٔ روز در جریان پیام‌ها — «امروز» · «دیروز» · تاریخ کامل */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "امروز";
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return "دیروز";
  return d.toLocaleDateString("fa-IR", { month: "long", day: "numeric" });
}

/** ساعت پیام — «۱۰:۱۴» */
export function clockLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

/** روزِ یک پیام به‌عنوان کلید گروه‌بندی جداکننده‌ها */
export function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}
