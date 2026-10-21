"use client";

/**
 * فاز ۶ مهاجرت — شیت اعلان‌ها (پورت sheet-notif).
 * زنگ appbar این را باز می‌کند؛ داده = getNotifications واقعی.
 * گروه‌بندی: قیمت / اعلام نیاز و درخواست‌ها / دنبال‌کننده / سیستم —
 * نگاشت typeهای واقعی بک‌اند (FOLLOW_SUPPLIER/FOLLOW_BUYER/OFFER/QUOTE/
 * CONTACT_JOINED) به جمله‌های i18n. «همه را خواندم» = readAll.
 * ردیف‌ها به مسیر مرتبط می‌روند (item/board/requests).
 */

import { useRouter } from "next/navigation";
import { Sheet } from "./sheet";
import { useShell } from "./app-shell";
import { Icon, type IconName } from "./icon";
import { fa } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useNotifications, useReadAllNotifications } from "@/lib/queries";
import type { NotificationDto } from "@/lib/api";

type Group = "price" | "need" | "follow" | "system";

const GROUP_OF: Record<string, Group> = {
  FOLLOW_SUPPLIER: "follow",
  FOLLOW_BUYER: "follow",
  CONTACT_JOINED: "follow",
  OFFER: "need",
  QUOTE: "need",
};

/** آیکون + رنگ ردیف بر اساس نوع — همان زبان بصری Prototype */
function rowVisual(type: string): { icon: IconName; tint: string; fg: string } {
  switch (type) {
    case "OFFER":
      return { icon: "i-inbox", tint: "var(--orange-tint)", fg: "var(--primary-strong)" };
    case "QUOTE":
      return { icon: "i-bell", tint: "var(--amber-tint)", fg: "var(--amber)" };
    case "FOLLOW_SUPPLIER":
    case "FOLLOW_BUYER":
      return { icon: "i-users", tint: "var(--emerald-tint)", fg: "var(--emerald)" };
    case "CONTACT_JOINED":
      return { icon: "i-users", tint: "var(--emerald-tint)", fg: "var(--emerald)" };
    default:
      return { icon: "i-info", tint: "var(--muted-bg)", fg: "var(--fg-soft)" };
  }
}

/** مسیر مقصد ردیف — بر اساس نوع اعلان */
function targetOf(n: NotificationDto, arm: "buy" | "sell"): string {
  switch (n.type) {
    case "OFFER":
      return arm === "buy" ? "/offers" : "/sell/requests";
    case "QUOTE":
      return "/sell/requests";
    case "FOLLOW_SUPPLIER":
    case "FOLLOW_BUYER":
      return arm === "sell" ? "/sell/catalog" : "/saved";
    case "CONTACT_JOINED":
      return "/profile";
    default:
      return "/home";
  }
}

function timeAgo(iso: string, m: { justNow: string; minAgo: string; hourAgo: string; dayAgo: string }): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return m.justNow;
  if (mins < 60) return m.minAgo.replace("{n}", fa(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return m.hourAgo.replace("{n}", fa(hours));
  return m.dayAgo.replace("{n}", fa(Math.floor(hours / 24)));
}

export function NotifSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMessages();
  const t = m.app.notif;
  const router = useRouter();
  const { arm } = useShell();
  const notif = useNotifications();
  const readAll = useReadAllNotifications();

  const items = notif.data?.items ?? [];
  const unread = notif.data?.unreadCount ?? 0;

  const groups = ([
    { key: "price" as Group, title: t.groupPrice, rows: items.filter((n) => GROUP_OF[n.type] === "price") },
    { key: "need" as Group, title: t.groupNeed, rows: items.filter((n) => GROUP_OF[n.type] === "need") },
    { key: "follow" as Group, title: t.groupFollow, rows: items.filter((n) => GROUP_OF[n.type] === "follow") },
    { key: "system" as Group, title: t.groupSystem, rows: items.filter((n) => GROUP_OF[n.type] === "system") },
  ] as Array<{ key: Group; title: string; rows: NotificationDto[] }>).filter((g) => g.rows.length > 0);

  const lineOf = (n: NotificationDto): { title: string; sub: string } => {
    const name = n.actorName ?? "";
    switch (n.type) {
      case "FOLLOW_SUPPLIER":
        return { title: t.followSupplierT.replace("{name}", name), sub: t.followSupplierS };
      case "FOLLOW_BUYER":
        return { title: t.followBuyerT.replace("{name}", name), sub: t.followBuyerS };
      case "OFFER":
        return { title: t.offerT.replace("{good}", n.good ?? ""), sub: t.offerS.replace("{name}", name) };
      case "QUOTE":
        return { title: t.quoteT, sub: t.quoteS.replace("{name}", name).replace("{good}", n.good ?? "") };
      case "CONTACT_JOINED":
        return { title: t.joinedT.replace("{name}", name), sub: t.joinedS };
      default:
        return { title: n.actorName ?? n.good ?? "", sub: "" };
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label={t.title}>
      <div className="grab" />
      <h3>{t.title}</h3>
      <div className="sub">{unread > 0 ? t.unreadN.replace("{n}", fa(unread)) : t.unread0}</div>

      {items.length === 0 ? (
        <div className="sub" style={{ padding: "18px 4px", textAlign: "center" }}>
          {t.empty}
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key}>
            <div className="ng-title">{g.title}</div>
            {g.rows.slice(0, 6).map((n) => {
              const v = rowVisual(n.type);
              const line = lineOf(n);
              return (
                <button
                  key={n.id}
                  className="n-row"
                  onClick={() => {
                    router.push(targetOf(n, arm));
                    onClose();
                  }}
                >
                  <span className="n-ico" style={{ background: v.tint, color: v.fg }}>
                    <Icon name={v.icon} />
                  </span>
                  <span className="tx">
                    <b>{line.title}</b>
                    {line.sub ? <span>{line.sub}</span> : null}
                  </span>
                  {!n.read ? <span className="udot" /> : null}
                  <span className="tm">{timeAgo(n.createdAt, t)}</span>
                </button>
              );
            })}
          </div>
        ))
      )}

      <button
        className="btn btn-outline btn-block"
        style={{ marginTop: 12 }}
        disabled={items.length === 0 || unread === 0 || readAll.isPending}
        onClick={() => void readAll.mutateAsync(undefined).catch(() => undefined)}
      >
        {t.readAll}
      </button>
    </Sheet>
  );
}
