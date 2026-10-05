"use client";

/**
 * iMach Tabbar — ناوبری پایین موبایل (عین Prototype v18) · فاز ۲: لینک + بج واقعی.
 * بازوی خرید: لیست خرید(/home) · ذخیره‌شده‌ها(/buy/suppliers) · پیشنهادها(/buy/requests) · چت · پروفایل(/profile)
 * بازوی فروش: کاتالوگ من(/sell) · درخواست‌های قیمت(/sell/requests) · چت · پروفایل(/profile)
 * بج‌ها از API واقعی (useShellData)؛ چت هنوز بک‌اند/مسیر ندارد (فاز ۶) → بدون بج و بدون لینک.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShell } from "./app-shell";
import { useShellData } from "./shell-data";
import { Icon, type IconName } from "./icon";
import { fa } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";

export type TabKey = "list" | "saved" | "offers" | "chat" | "profile" | "catalog" | "requests";

export function Tabbar({ active }: { active?: TabKey }) {
  const { arm } = useShell();
  const { offersCount, requestsCount } = useShellData();
  const m = useMessages();
  const pathname = usePathname();

  const isActive = (key: TabKey, href?: string) => {
    if (active) return key === active;
    if (!href) return false;
    return pathname === href;
  };

  const tabs: Array<{ key: TabKey; icon: IconName; label: string; href?: string; dot?: string }> =
    arm === "buy"
      ? [
          { key: "list", icon: "i-list", label: m.app.tabs.list, href: "/home" },
          { key: "saved", icon: "i-bm", label: m.app.tabs.saved, href: "/saved" },
          {
            key: "offers",
            icon: "i-spark",
            label: m.app.tabs.offers,
            href: "/buy/requests",
            dot: offersCount > 0 ? fa(offersCount) : undefined,
          },
          { key: "chat", icon: "i-msg", label: m.app.tabs.chat },
          { key: "profile", icon: "i-user", label: m.app.tabs.profile, href: "/profile" },
        ]
      : [
          { key: "catalog", icon: "i-store", label: m.app.tabs.catalog, href: "/sell" },
          {
            key: "requests",
            icon: "i-inbox",
            label: m.app.tabs.requests,
            href: "/sell/requests",
            dot: requestsCount > 0 ? fa(requestsCount) : undefined,
          },
          { key: "chat", icon: "i-msg", label: m.app.tabs.chat },
          { key: "profile", icon: "i-user", label: m.app.tabs.profile, href: "/profile" },
        ];

  return (
    <nav className="tabbar" aria-label={m.app.shell.brandAria}>
      {tabs.map((t) => {
        const cls = isActive(t.key, t.href) ? "tab active" : "tab";
        const inner = (
          <>
            <Icon name={t.icon} />
            {t.label}
            {t.dot ? <span className="tdot">{t.dot}</span> : null}
          </>
        );
        return t.href ? (
          <Link key={t.key} href={t.href} className={cls} aria-current={isActive(t.key, t.href) ? "page" : undefined}>
            {inner}
          </Link>
        ) : (
          <button key={t.key} type="button" className={cls} aria-disabled="true" title="—">
            {inner}
          </button>
        );
      })}
    </nav>
  );
}
