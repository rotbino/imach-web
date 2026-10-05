"use client";

/**
 * iMach Appbar — هدر اپ (عین Prototype v18).
 * موبایل: برند + pill بازوی فعال + زنگ اعلان.
 * دسکتاپ ≥۹۲۰: برند مخفی، عنوان صفحه (desk-title) ظاهر می‌شود.
 * title = متن h1 صفحهٔ جاری (Prototype از .greet b می‌خواند؛ اینجا prop).
 */

import { useShell } from "./app-shell";
import { Icon } from "./icon";
import { useMessages } from "@/i18n/messages/use-messages";

export function Appbar({ deskTitle }: { deskTitle: string }) {
  const { arm, openSwitch } = useShell();
  const m = useMessages();

  return (
    <header className="appbar">
      <b className="desk-title">{deskTitle}</b>
      <button className="brand" title={m.app.shell.brandAria} aria-label={m.app.shell.brandAria}>
        {/* TODO(phase-7): لینک به خانه — پس از تعریف مسیر عمومی ریشه */}
        <img src="/logo3.svg" alt={m.app.shell.logoAlt} />
      </button>
      <div className="side">
        <button className="arm-pill" onClick={openSwitch}>
          <Icon name={arm === "buy" ? "i-basket" : "i-box"} />
          {arm === "buy" ? m.app.shell.armBuy : m.app.shell.armSell}
          <Icon name="i-chev" className="caret" />
        </button>
        <button className="icon-btn" aria-label={m.app.shell.notifAria}>
          {/* TODO(phase-6): مرکز اعلان‌ها + شمارش واقعی از API */}
          <Icon className="ic" name="i-bell" />
          <span className="dot">{m.app.shell.notifDot}</span>
        </button>
      </div>
    </header>
  );
}
