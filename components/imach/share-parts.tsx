"use client";

import { Icon, type IconName } from "@/components/ui/icon";

/**
 * M7 (اسکرین ۰۶) — اجزای مشترک اشتراک‌گذاری: دکمهٔ پیام‌رسان + بازکردنِ
 * استاندارد + متن دعوتِ سه‌نشان. الگو از ShareBuyListSheet (M3) برداشته شد
 * تا کاتالوک و لیست خرید یک زبان داشته باشند.
 */

export function ShareOpt({
  label,
  bg,
  icon,
  onClick,
}: {
  label: string;
  bg: string;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface p-2 text-[11.5px] font-bold text-text-2 transition-colors hover:border-line-2"
    >
      <span className="grid size-8 place-items-center rounded-full text-white" style={{ background: bg }}>
        <Icon name={icon} size={16} />
      </span>
      {label}
    </button>
  );
}

export function shareTo(app: "whatsapp" | "telegram" | "sms", link: string, text: string) {
  const url = encodeURIComponent(link);
  const t = encodeURIComponent(text);
  const href =
    app === "whatsapp"
      ? `https://wa.me/?text=${t}`
      : app === "telegram"
        ? `https://t.me/share/url?url=${url}&text=${t}`
        : `sms:?&body=${t}`;
  window.open(href, "_blank", "noopener");
}

/**
 * متن دعوتِ سه‌نشان (M7) — سه بخش کوتاه و جدا: چه ساخته‌ام · چه می‌گیری · لینک.
 * «ساخته‌شده با آی‌مچ» نشانِ سوم است (همان فوتر صفحات عمومی).
 */
export function catalogInviteText(bizName: string, link: string): string {
  return `کاتالوک ${bizName} را در آیمچ ساخته‌ام — قیمت‌ها همیشه به‌روز دیده می‌شود و سفارش همان‌جا ثبت می‌شود.\nذخیره‌اش کن تا همیشه در دسترست باشد:\n${link}\n(ساخته‌شده با آی‌مچ — شبکهٔ خصوصی تجارت عمدهٔ شما)`;
}

export function buyListInviteText(link: string): string {
  return `لیست خریدم را در آیمچ ساخته‌ام — تأمین‌کننده‌ها می‌توانند برای کالاهایش قیمت و شرایط تامین بفرستند:\n${link}\n(ساخته‌شده با آی‌مچ — شبکهٔ خصوصی تجارت عمدهٔ شما)`;
}
