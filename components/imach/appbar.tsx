"use client";

/**
 * iMach Appbar — هدر اپ (عین Prototype v18) · فاز ۲: دادهٔ واقعی.
 * موبایل: برند + pill بازوی فعال + زنگ اعلان (dot = نخوانده‌های واقعی).
 * دسکتاپ ≥۹۲۰: برند مخفی، عنوان صفحه (desk-title) ظاهر می‌شود.
 */

import Link from "next/link";
import { useShell } from "./app-shell";
import { useShellData } from "./shell-data";
import { Icon } from "./icon";
import { fa } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";

export function Appbar({ deskTitle }: { deskTitle: string }) {
  const { arm, openSwitch } = useShell();
  const { notifUnread } = useShellData();
  const m = useMessages();

  return (
    <header className="appbar">
      <b className="desk-title">{deskTitle}</b>
      <Link className="brand" href="/home" title={m.app.shell.brandAria} aria-label={m.app.shell.brandAria}>
        <img src="/logo3.svg" alt={m.app.shell.logoAlt} />
      </Link>
      <div className="side">
        <button className="arm-pill" onClick={openSwitch}>
          <Icon name={arm === "buy" ? "i-basket" : "i-box"} />
          {arm === "buy" ? m.app.shell.armBuy : m.app.shell.armSell}
          <Icon name="i-chev" className="caret" />
        </button>
        <button className="icon-btn" aria-label={m.app.shell.notifAria}>
          {/* TODO(phase-6): مرکز اعلان‌ها — sheet-notif با دادهٔ real */}
          <Icon className="ic" name="i-bell" />
          {notifUnread > 0 ? <span className="dot">{fa(notifUnread)}</span> : null}
        </button>
      </div>
    </header>
  );
}
