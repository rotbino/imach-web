"use client";

/**
 * iMach App Shell — ریشهٔ شل اپ (معادل .phone در Prototype، production-شده).
 *
 *  · `.ia.app` + data-arm(buy|sell) + data-theme(light|dark)
 *  · ArmContext: کامپوننت‌های شل (Appbar/Tabbar/Deskbar) بدون prop-drilling
 *  · شیت «جابه‌جایی دستیار» (sheet-switch) — همان Prototype، زنده
 *  · children از Server Components می‌آید (صفحات RSC سالم می‌مانند)
 *
 * دادهٔ واقعی (نام کسب‌وکار/شمارش‌ها) در فاز ۲/۳ از API می‌آید؛
 * فعلاً همان دیتای دموی Prototype از lib/imach/fixtures.ts.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { IconSprite } from "./icon-sprite";
import { Icon } from "./icon";
import { Sheet } from "./sheet";
import { Deskbar } from "./deskbar";
import { useMessages } from "@/i18n/messages/use-messages";

export type Arm = "buy" | "sell";
export type Theme = "light" | "dark";

interface ShellContextValue {
  arm: Arm;
  theme: Theme;
  setArm: (arm: Arm) => void;
  openSwitch: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

/** برای کامپوننت‌های شل (Appbar/Tabbar/…) — نه صفحات. */
export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <AppShell>");
  return ctx;
}

export function AppShell({
  initialArm = "buy",
  initialTheme = "light",
  children,
}: {
  initialArm?: Arm;
  initialTheme?: Theme;
  children: ReactNode;
}) {
  const [arm, setArmState] = useState<Arm>(initialArm);
  const [theme] = useState<Theme>(initialTheme);
  const [switchOpen, setSwitchOpen] = useState(false);
  const m = useMessages();

  const setArm = useCallback((next: Arm) => {
    setArmState(next);
  }, []);
  const openSwitch = useCallback(() => setSwitchOpen(true), []);

  return (
    <ShellContext.Provider value={{ arm, theme, setArm, openSwitch }}>
      <div className="ia app" data-arm={arm} data-theme={theme}>
        <IconSprite />
        <Deskbar />
        {children}

        {/* ═══ شیت: جابه‌جایی بین دستیارها (sheet-switch — عین Prototype) ═══ */}
        <Sheet open={switchOpen} onClose={() => setSwitchOpen(false)} label={m.app.switch.title}>
          <div className="grab" />
          <h3>{m.app.switch.title}</h3>
          <div className="sub">{m.app.switch.sub}</div>
          <button
            className="sheet-row"
            onClick={() => {
              setArm("buy");
              setSwitchOpen(false);
            }}
          >
            <span className="ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}>
              <Icon name="i-basket" />
            </span>
            <span className="tx">
              <b>{m.app.switch.buyTitle}</b>
              <span>{m.app.switch.buySub}</span>
            </span>
            {arm === "buy" ? (
              <svg className="check">
                <use href="#i-check" />
              </svg>
            ) : null}
          </button>
          <button
            className="sheet-row"
            onClick={() => {
              setArm("sell");
              setSwitchOpen(false);
            }}
          >
            <span className="ico" style={{ background: "var(--orange-tint)", color: "var(--primary-strong)" }}>
              <Icon name="i-box" />
            </span>
            <span className="tx">
              <b>{m.app.switch.sellTitle}</b>
              <span>{m.app.switch.sellSub}</span>
            </span>
            {arm === "sell" ? (
              <svg className="check">
                <use href="#i-check" />
              </svg>
            ) : null}
          </button>
          <div className="sub" style={{ marginBottom: 8 }}>
            {m.app.switch.note}
          </div>
          <button className="btn btn-outline btn-block" onClick={() => setSwitchOpen(false)}>
            {m.app.switch.close}
          </button>
        </Sheet>
      </div>
    </ShellContext.Provider>
  );
}
