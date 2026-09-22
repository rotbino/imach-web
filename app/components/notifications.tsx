"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications, useReadAllNotifications } from "@/lib/queries";
import { fa } from "@/lib/format";
import { usePushSetup } from "@/lib/push";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotificationDto } from "@/lib/api";
import { Bell, ClipboardList, Handshake, Tag, UserPlus, Users } from "lucide-react";

/*
 * زنگ اعلان‌ها — هدر، همه‌ی صفحات.
 * ردیف فقط داده است؛ جمله‌ی فارسی از روی type همین‌جا ساخته می‌شود.
 * الگوی خواندن: باز کردن پنل = خواندن همه (بعد از بستن، بج صفر می‌شود).
 */

interface TypeView {
  icon: typeof Tag;
  iconClass: string;
  text: (n: NotificationDto) => string;
  href: string;
}

const TYPE_VIEWS: Record<NotificationDto["type"], TypeView> = {
  FOLLOW_SUPPLIER: {
    icon: Users,
    iconClass: "bg-primary/10 text-primary",
    text: (n) => `${n.actorName ?? "کاربری"} کاتالوگ شما را فالو کرد`,
    href: "/sell/customers",
  },
  FOLLOW_BUYER: {
    icon: Handshake,
    iconClass: "bg-stone-800/10 text-stone-800",
    text: (n) => `${n.actorName ?? "کاربری"} لیست خرید شما را فالو کرد`,
    href: "/buy/suppliers",
  },
  OFFER: {
    icon: Tag,
    iconClass: "bg-primary/10 text-primary",
    text: (n) => `${n.actorName ?? "کاربری"} برای «${n.good ?? "کالا"}» پیشنهاد داد`,
    href: "/buy/panel",
  },
  QUOTE: {
    icon: ClipboardList,
    iconClass: "bg-stone-800/10 text-stone-800",
    text: (n) => `درخواست قیمت برای «${n.good ?? "کالا"}»`,
    href: "/sell/panel",
  },
  CONTACT_JOINED: {
    icon: UserPlus,
    iconClass: "bg-primary/10 text-primary",
    text: (n) => `${n.actorName ?? "کسی"} عضو iMach شد`,
    href: "/market",
  },
};

/** زمان نسبی فارسی — همین حالا / دقیقه / ساعت / روز */
function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "همین حالا";
  const m = Math.floor(s / 60);
  if (m < 60) return `${fa(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${fa(h)} ساعت پیش`;
  return `${fa(Math.floor(h / 24))} روز پیش`;
}

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  /** نخونده‌های لحظه‌ی باز شدن — نقطه‌ی نارنجی تا پایان این نشست پنل می‌ماند */
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const { data } = useNotifications();
  const readAll = useReadAllNotifications();
  const push = usePushSetup();

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next) {
      setFresh(new Set(items.filter((i) => !i.read).map((i) => i.id)));
      if (unread > 0) readAll.mutate();
    } else {
      setFresh(new Set());
    }
  };

  const go = (n: NotificationDto) => {
    handleOpen(false);
    router.push(TYPE_VIEWS[n.type]?.href ?? "/market");
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative grid size-9 place-items-center rounded-xl transition hover:bg-accent"
          aria-label="اعلان‌ها"
        >
          <Bell className="size-5 text-foreground" strokeWidth={1.75} />
          {unread > 0 && (
            <span
              className="absolute -top-0.5 -end-0.5 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white"
              aria-label={`${fa(unread)} اعلان نخوانده`}
            >
              {unread > 9 ? "۹+" : fa(unread)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2 text-sm font-extrabold">اعلان‌ها</div>
        {/* بنر فعال‌سازی پوش — خواسته‌ی کاربر: کاربر باید بداند بدون فعال‌سازی
            خبر «مشتری مناسب / فالو / درخواست قیمت» فقط داخل اپ می‌آید */}
        {push.supported && !push.subscribed && (
          <div className="border-b bg-primary/5 px-3 py-2.5">
            <p className="text-[11px] leading-5 text-foreground">
              برای اینکه هر وقت <b>مشتری مناسب</b> آمد، کسی شما را <b>فالو کرد</b> یا
              <b> قیمت خواست</b> فوری باخبر شوی، نوتیفیکیشن‌ها را فعال کن —
              همین اعلان‌ها بیرون از اپ هم می‌آیند.
            </p>
            {push.permission === "granted" ? (
              <button
                onClick={() => void push.enable()}
                disabled={push.busy}
                className="mt-1.5 text-[11px] font-bold text-primary hover:underline disabled:opacity-50"
              >
                {push.busy ? "در حال فعال‌سازی…" : "اتمام فعال‌سازی پوش"}
              </button>
            ) : push.permission === "denied" ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                نوتیفیکیشن در مرورگر شما مسدود شده — از تنظیمات سایت (آیکون کنار آدرس) فعالش کن.
              </p>
            ) : (
              <button
                onClick={() => void push.enable()}
                disabled={push.busy}
                className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {push.busy ? "در حال فعال‌سازی…" : "فعال‌سازی اعلان‌ها"}
              </button>
            )}
          </div>
        )}
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">فعلاً خبری نیست</p>
          ) : (
            items.map((n) => {
              const view = TYPE_VIEWS[n.type];
              if (!view) return null;
              const isNew = fresh.has(n.id);
              const Icon = view.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => go(n)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-start transition hover:bg-accent/60 ${
                    isNew ? "bg-primary/[0.06]" : ""
                  }`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${view.iconClass}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="grid min-w-0 grow gap-0.5">
                    <span className="text-xs font-medium leading-5">{view.text(n)}</span>
                    <span className="text-[10px] text-muted-foreground">{relTime(n.createdAt)}</span>
                  </span>
                  {isNew && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
