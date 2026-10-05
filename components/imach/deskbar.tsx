"use client";

/**
 * iMach Deskbar — ناوبری دسکتاپ ≥۹۲۰px (عین Prototype v18 · DESK_NAV).
 * در موبایل با CSS مخفی است (display:none — همان Prototype).
 * سرِ ستون: لوگو + کسب‌وکارِ بازوی فعال · سوییچ مستقیم بازو ·
 * ناوبری بازو + بج‌ها · کارت پایین (خرید: کاتالوگ‌های ذخیره / فروش: کیف پول).
 *
 * TODO(phase-3+): مسیرهای واقعی db-item/db-side با <Link> · بج‌ها از API.
 */

import { useShell } from "./app-shell";
import { Icon, type IconName } from "./icon";
import { useMessages } from "@/i18n/messages/use-messages";

export function Deskbar() {
  const { arm, setArm } = useShell();
  const m = useMessages();

  const items: Array<{ icon: IconName; label: string; dot?: string }> =
    arm === "buy"
      ? [
          { icon: "i-list", label: m.app.tabs.list },
          { icon: "i-bm", label: m.app.tabs.saved },
          { icon: "i-spark", label: m.app.tabs.offers, dot: m.app.tabs.offersDot },
          { icon: "i-msg", label: m.app.tabs.chat, dot: m.app.tabs.chatDot },
          { icon: "i-user", label: m.app.tabs.profile },
        ]
      : [
          { icon: "i-store", label: m.app.tabs.catalog },
          { icon: "i-inbox", label: m.app.tabs.requests, dot: m.app.tabs.requestsDot },
          { icon: "i-msg", label: m.app.tabs.chat, dot: m.app.tabs.chatDot },
          { icon: "i-user", label: m.app.tabs.profile },
        ];

  return (
    <nav className="deskbar" aria-label="ناوبری اصلی">
      <div className="db-head">
        <button className="db-logo" title={m.app.shell.brandAria} aria-label={m.app.shell.brandAria}>
          <img src="/logo3.svg" alt={m.app.shell.logoAlt} />
        </button>
        <div className="db-biz">
          <b>{arm === "buy" ? m.app.desk.bizBuy : m.app.desk.bizSell}</b>
          <span>{arm === "buy" ? m.app.desk.bizBuyRole : m.app.desk.bizSellRole}</span>
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
        {items.map((it) => (
          <button className="db-item" key={it.label}>
            <Icon name={it.icon} />
            {it.label}
            {it.dot ? <span className="db-dot">{it.dot}</span> : null}
          </button>
        ))}
      </div>

      <div className="db-foot">
        {arm === "buy" ? (
          <button className="db-side">
            <span className="ico">
              <Icon name="i-bm" />
            </span>
            <span className="tx">
              <b>{m.app.desk.savedTitle}</b>
              <span>{m.app.desk.savedSub}</span>
            </span>
            <Icon name="i-chev" className="chev" />
          </button>
        ) : (
          <button className="db-side">
            <span className="ico">
              <Icon name="i-wallet" />
            </span>
            <span className="tx">
              <b>۴۵۰٬۰۰۰ تومان</b>
              <span>{m.app.desk.walletTitle}</span>
            </span>
            <Icon name="i-chev" className="chev" />
          </button>
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
