"use client";

/**
 * iMach Tabbar — ناوبری پایین موبایل (عین Prototype v18).
 * بازوی خرید: لیست خرید · ذخیره‌شده‌ها · پیشنهادها · چت · پروفایل
 * بازوی فروش: کاتالوگ من · درخواست‌های قیمت · چت · پروفایل
 * (DESK_NAV در Prototype آینهٔ همین مجموعه‌هاست — Deskbar همان را می‌دهد.)
 *
 * TODO(phase-3+): مسیرهای واقعی هر تب با <Link> — فعلاً فاز ۱ (شل) است
 * و تب‌ها ناوبری ندارند؛ وضعیت فعال با activeTab مشخص می‌شود.
 */

import { useShell } from "./app-shell";
import { Icon, type IconName } from "./icon";
import { useMessages } from "@/i18n/messages/use-messages";

export type TabKey = "list" | "saved" | "offers" | "chat" | "profile" | "catalog" | "requests";

export function Tabbar({ active }: { active: TabKey }) {
  const { arm } = useShell();
  const m = useMessages();

  const tabs: Array<{ key: TabKey; icon: IconName; label: string; dot?: string }> =
    arm === "buy"
      ? [
          { key: "list", icon: "i-list", label: m.app.tabs.list },
          { key: "saved", icon: "i-bm", label: m.app.tabs.saved },
          { key: "offers", icon: "i-spark", label: m.app.tabs.offers, dot: m.app.tabs.offersDot },
          { key: "chat", icon: "i-msg", label: m.app.tabs.chat, dot: m.app.tabs.chatDot },
          { key: "profile", icon: "i-user", label: m.app.tabs.profile },
        ]
      : [
          { key: "catalog", icon: "i-store", label: m.app.tabs.catalog },
          { key: "requests", icon: "i-inbox", label: m.app.tabs.requests, dot: m.app.tabs.requestsDot },
          { key: "chat", icon: "i-msg", label: m.app.tabs.chat, dot: m.app.tabs.chatDot },
          { key: "profile", icon: "i-user", label: m.app.tabs.profile },
        ];

  return (
    <nav className="tabbar" aria-label={m.app.shell.brandAria}>
      {tabs.map((t) => (
        <button
          key={t.key}
          className={t.key === active ? "tab active" : "tab"}
          aria-current={t.key === active ? "page" : undefined}
        >
          <Icon name={t.icon} />
          {t.label}
          {t.dot ? <span className="tdot">{t.dot}</span> : null}
        </button>
      ))}
    </nav>
  );
}
