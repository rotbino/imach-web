"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { EmptyState } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/messages/use-messages";
import { notificationsApi, type NotificationDto, type NotificationType } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/** `/notifs` — زنگ اعلان‌ها (اسکرین ۱۷).
 *
 * M7 — رندر رویداد-محور کامل (سند ۰۸ §M7):
 *  · تیترِ ذخیره‌شدهٔ رویداد (title) منبع حقیقت است — ORDER/SUPPLY_PROPOSAL/
 *    PRICE_CHANGE/SCORE همه جملهٔ خودشان را دارند؛ فقط انواعِ legacyِ بی‌تیتر
 *    از type مشتق می‌شوند.
 *  · آیکون/رنگ per-type — هر رویداد چهرهٔ خودش را دارد (خواستهٔ M7).
 *  · ۱تپ به مقصدِ همان رویداد (url ذخیره‌شده؛ جایگزینِ نوع).
 */
export default function NotifsPage() {
  return (
    <AuthGate>
      <NotifsContent />
    </AuthGate>
  );
}

function NotifsContent() {
  const m = useMessages();
  const qc = useQueryClient();
  const notifsQ = useQuery({
    queryKey: ["notifs", "feed"],
    queryFn: () => notificationsApi.getNotifications(),
  });
  const readAll = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifs"] }),
  });

  const items = notifsQ.data?.items ?? [];
  const unread = notifsQ.data?.unreadCount ?? 0;

  return (
    <AppShell arm="sell" title={m.placeholders.notifsTitle}>
      <div className="flex flex-col gap-3">
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => readAll.mutate()} className="self-end">
            {m.placeholders.markAll}
          </Button>
        )}
        {items.length === 0 && notifsQ.isSuccess && (
          <EmptyState icon={<Icon name="bell" size={30} />} title={m.placeholders.notifsEmpty} />
        )}
        {items.map((it) => (
          <NotifRow key={it.id} it={it} />
        ))}
      </div>
    </AppShell>
  );
}

/** چهرهٔ هر رویداد — آیکون + رنگ per-type (M7) */
const TYPE_FACE: Record<NotificationType, { icon: IconName; cls: string }> = {
  FOLLOW_SUPPLIER: { icon: "user-plus", cls: "bg-arm-soft text-arm-strong" },
  FOLLOW_BUYER: { icon: "user-plus", cls: "bg-primary-soft text-primary-strong" },
  OFFER: { icon: "tag", cls: "bg-primary-soft text-primary-strong" },
  QUOTE: { icon: "textlist", cls: "bg-arm-soft text-arm-strong" },
  CONTACT_JOINED: { icon: "users", cls: "bg-surface-2 text-text-2" },
  PRICE_CHANGE: { icon: "chart", cls: "bg-primary-soft text-primary-strong" },
  BUYER_NEED: { icon: "bell", cls: "bg-arm-soft text-arm-strong" },
  ORDER: { icon: "receipt", cls: "bg-primary-soft text-primary-strong" },
  SUPPLY_PROPOSAL: { icon: "boxes", cls: "bg-arm-soft text-arm-strong" },
  SCORE: { icon: "rocket", cls: "bg-green-soft text-green" },
};

/** مقصد پیش‌فرض انواع بی-url (legacy) — url ذخیره‌شده همیشه اولویت دارد */
const TYPE_ROUTE: Partial<Record<NotificationType, string>> = {
  FOLLOW_SUPPLIER: "/customers",
  FOLLOW_BUYER: "/suppliers",
  OFFER: "/buy/rfqs",
  QUOTE: "/sell/rfqs",
  CONTACT_JOINED: "/contacts",
  PRICE_CHANGE: "/suppliers",
  BUYER_NEED: "/sell/rfqs",
  SUPPLY_PROPOSAL: "/buy-list",
  SCORE: "/home/score",
};

function NotifRow({ it }: { it: NotificationDto }) {
  const router = useRouter();
  const who = it.actorName ?? "";
  const good = it.good ?? "";

  /* متن رویداد: تیتر ذخیره‌شدهٔ سرور (رخداد-محور — M5/M6/M7) وگرنه مشتق از type */
  let text: string;
  if (it.title) {
    text = it.title;
  } else
    switch (it.type) {
      case "FOLLOW_SUPPLIER":
        text = `${who} کاتالوک شما را ذخیره کرد`;
        break;
      case "FOLLOW_BUYER":
        text = `${who} لیست خرید شما را دنبال کرد`;
        break;
      case "OFFER":
        text = `پیشنهاد جدید روی درخواست شما${good ? ` — ${good}` : ""}`;
        break;
      case "QUOTE":
        text = `استعلام قیمت رسید${good ? ` — ${good}` : ""}`;
        break;
      case "CONTACT_JOINED":
        text = `${who} عضو آی‌مچ شد — از مخاطبین شما`;
        break;
      case "PRICE_CHANGE":
        text = `قیمت ${good} تغییر کرد`;
        break;
      case "BUYER_NEED":
        text = `${who} نیاز خرید جدید ثبت کرد${good ? ` — ${good}` : ""}`;
        break;
      default:
        text = it.title ?? it.type;
    }

  const face = TYPE_FACE[it.type] ?? { icon: "bell" as IconName, cls: "bg-surface-2 text-text-2" };
  const href = it.url ?? TYPE_ROUTE[it.type] ?? null;
  return (
    <div
      onClick={() => href && router.push(href)}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4",
        it.read ? "border-line bg-surface" : "border-arm/40 bg-arm-soft/50",
        href && "cursor-pointer transition-[border-color,box-shadow] hover:border-line-2"
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", face.cls)}>
        <Icon name={face.icon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold leading-6 text-text">{text}</p>
        {/* قید پایانی: کالا/جزئیات رویداد + طرف مقابل */}
        {(good || who) && it.title && (
          <p className="mt-0.5 text-[11.5px] leading-5 text-text-3">
            {good}
            {good && who ? " · " : ""}
            {who}
          </p>
        )}
        <p className="mt-0.5 text-[11.5px] text-text-3">{timeAgo(it.createdAt)}</p>
      </div>
      {href && <Icon name="chev" size={16} className="mt-1.5 shrink-0 text-text-4 rtl:-scale-x-100" />}
      {!it.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-arm" aria-hidden />}
    </div>
  );
}
