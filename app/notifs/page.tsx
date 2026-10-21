"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { notificationsApi, type NotificationDto } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/** `/notifs` — زنگ اعلان‌ها (فید درون‌برنامه‌ای — رندر رویداد-محور ساده M2؛
 * رندر غنی نوع‌دار در M7 با ماژول score/اعلان‌های رویدادی وصل می‌شود). */
export default function NotifsPage() {
  return (
    <AuthGate>
      <NotifsContent />
    </AuthGate>
  );
}

function NotifsContent() {
  const m = useMessages();
  const { locale } = useLocale();
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
          <NotifRow key={it.id} it={it} locale={locale} />
        ))}
      </div>
    </AppShell>
  );
}

/** متن رویداد از type — ساده و واقعی؛ روایت غنی در M7 */
function NotifRow({ it, locale }: { it: NotificationDto; locale: string }) {
  const fa = locale !== "en";
  const who = it.actorName ?? "";
  const good = it.good ?? "";
  let text = "";
  switch (it.type) {
    case "FOLLOW_SUPPLIER":
      text = fa ? `${who} کاتالوگ شما را ذخیره کرد` : `${who} saved your catalog`;
      break;
    case "FOLLOW_BUYER":
      text = fa ? `${who} لیست خرید شما را دنبال کرد` : `${who} follows your buy list`;
      break;
    case "OFFER":
      text = fa ? `پیشنهاد جدید روی درخواست شما${good ? ` — ${good}` : ""}` : `New offer on your request${good ? ` — ${good}` : ""}`;
      break;
    case "QUOTE":
      text = fa ? `استعلام قیمت رسید${good ? ` — ${good}` : ""}` : `Quote request arrived${good ? ` — ${good}` : ""}`;
      break;
    case "CONTACT_JOINED":
      text = fa ? `${who} عضو آی‌مچ شد — از مخاطبین شما` : `${who} joined iMach`;
      break;
    case "PRICE_CHANGE":
      text = fa ? `قیمت ${good} تغییر کرد` : `${good} changed price`;
      break;
    case "BUYER_NEED":
      text = fa ? `${who} نیاز خرید جدید ثبت کرد${good ? ` — ${good}` : ""}` : `${who} posted a new buy need`;
      break;
    default:
      text = it.type;
  }
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4",
        it.read ? "border-line bg-surface" : "border-arm/40 bg-arm-soft/50"
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-text-2">
        <Icon name="bell" size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold leading-6 text-text">{text}</p>
        <p className="mt-0.5 text-[11.5px] text-text-3">{timeAgo(it.createdAt)}</p>
      </div>
      {!it.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-arm" aria-hidden />}
    </div>
  );
}
