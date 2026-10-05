"use client";

/**
 * iMach Deskbar — ناوبری دسکتاپ ≥۹۲۰px (عین Prototype v18 · DESK_NAV) · فاز ۲: دادهٔ واقعی.
 * سرِ ستون: لوگو + کسب‌وکارِ واقعیِ فعال · سوییچ بازو · ناوبری با بج‌های واقعی ·
 * پایش buy = کاتالوگ‌های ذخیره (فالوها) · پایش sell = موجودی واقعی کیف پول.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShell } from "./app-shell";
import { useShellData } from "./shell-data";
import { Icon, type IconName } from "./icon";
import { fa, fmtMoney } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";

export function Deskbar() {
  const { arm, setArm } = useShell();
  const { biz, offersCount, requestsCount, followsCount, walletBalanceMinor } = useShellData();
  const m = useMessages();
  const pathname = usePathname();

  const items: Array<{ icon: IconName; label: string; href: string; dot?: string }> =
    arm === "buy"
      ? [
          { icon: "i-list", label: m.app.tabs.list, href: "/home" },
          { icon: "i-bm", label: m.app.tabs.saved, href: "/saved" },
          {
            icon: "i-spark",
            label: m.app.tabs.offers,
            href: "/offers",
            dot: offersCount > 0 ? fa(offersCount) : undefined,
          },
          { icon: "i-msg", label: m.app.tabs.chat, href: "#" },
          { icon: "i-user", label: m.app.tabs.profile, href: "/profile" },
        ]
      : [
          { icon: "i-store", label: m.app.tabs.catalog, href: "/sell/catalog" },
          {
            icon: "i-inbox",
            label: m.app.tabs.requests,
            href: "/sell/requests",
            dot: requestsCount > 0 ? fa(requestsCount) : undefined,
          },
          { icon: "i-msg", label: m.app.tabs.chat, href: "#" },
          { icon: "i-user", label: m.app.tabs.profile, href: "/profile" },
        ];

  const bizName = biz?.name ?? (arm === "buy" ? m.app.desk.bizBuy : m.app.desk.bizSell);
  const bizRole = arm === "buy" ? m.app.desk.bizBuyRole : m.app.desk.bizSellRole;

  return (
    <nav className="deskbar" aria-label="ناوبری اصلی">
      <div className="db-head">
        <Link className="db-logo" href="/home" title={m.app.shell.brandAria} aria-label={m.app.shell.brandAria}>
          <img src="/logo3.svg" alt={m.app.shell.logoAlt} />
        </Link>
        <div className="db-biz">
          <b>{bizName}</b>
          <span>{bizRole}</span>
        </div>
      </div>

      <div className="db-arm" aria-label="جابه‌جایی دستیار">
        <button className={arm === "buy" ? "da buy on" : "da buy"} onClick={() => setArm("buy")}>
          <Icon name="i-basket" /> {m.app.shell.armBuy}
        </button>
        <button className={arm === "sell" ? "da sell on" : "da sell"} onClick={() => setArm("sell")}>
          <Icon name="i-box" /> {m.app.shell.armSell}
        </button>
      </div>

      <div className="db-nav">
        {items.map((it) => {
          const active = pathname === it.href;
          const cls = active ? "db-item active" : "db-item";
          if (it.href === "#") {
            return (
              <button className={cls} key={it.label}>
                <Icon name={it.icon} />
                {it.label}
                {it.dot ? <span className="db-dot">{it.dot}</span> : null}
              </button>
            );
          }
          return (
            <Link className={cls} href={it.href} key={it.label}>
              <Icon name={it.icon} />
              {it.label}
              {it.dot ? <span className="db-dot">{it.dot}</span> : null}
            </Link>
          );
        })}
      </div>

      <div className="db-foot">
        {arm === "buy" ? (
          <Link className="db-side" href="/saved">
            <span className="ico">
              <Icon name="i-bm" />
            </span>
            <span className="tx">
              <b>{m.app.desk.savedTitleN.replace("{n}", fa(followsCount))}</b>
              <span>{m.app.desk.savedSub}</span>
            </span>
            <Icon name="i-chev" className="chev" />
          </Link>
        ) : (
          <Link className="db-side" href="/sell/wallet">
            <span className="ico">
              <Icon name="i-wallet" />
            </span>
            <span className="tx">
              <b>{walletBalanceMinor !== null ? fmtMoney(walletBalanceMinor) : "—"}</b>
              <span>{m.app.desk.walletTitle}</span>
            </span>
            <Icon name="i-chev" className="chev" />
          </Link>
        )}
      </div>

      <div className="db-doc">
        {m.app.desk.doc}
        <br />
        {m.app.desk.doc2}
      </div>
    </nav>
  );
}
