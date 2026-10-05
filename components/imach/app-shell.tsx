"use client";

/**
 * iMach App Shell — ریشهٔ شل اپ (معادل .phone در Prototype، production-شده).
 *
 *  · `.ia.app` + data-arm(buy|sell) + data-theme(light|dark)
 *  · ArmContext: کامپوننت‌های شل (Appbar/Tabbar/Deskbar) بدون prop-drilling
 *  · شیت «جابه‌جایی دستیار» (sheet-switch) — همان Prototype، زنده
 *  · فاز ۳: ردیف خروج از حساب پایین شیت (تست مالک: بازگشت به صفحهٔ اول)؛
 *    sc-settings پروتوتایپ خروج را در تنظیمات دارد — آنجا فاز ۶ کامل می‌شود
 *  · children از Server Components می‌آید (صفحات RSC سالم می‌مانند)
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconSprite } from "./icon-sprite";
import { Icon } from "./icon";
import { Sheet } from "./sheet";
import { Deskbar } from "./deskbar";
import { useAuthStore } from "@/lib/auth-store";
import { useMessages } from "@/i18n/messages/use-messages";
import { useToast } from "@/hooks/use-toast";

export type Arm = "buy" | "sell";
export type Theme = "light" | "dark";

/** پیشوندهای مسیر بازوی خرید — این صفحات arm شل را buy می‌کنند (فاز ۴) */
const BUY_ROUTE_PREFIXES = ["/home", "/item", "/board", "/saved", "/offers", "/rfq", "/add", "/buy"];

/** خانهٔ هر بازو — تعویض بازو (شیت/دسک‌بار) به خانهٔ آن می‌رود (رفتار setMode Prototype) */
const HOME_OF: Record<Arm, string> = { buy: "/home", sell: "/sell/requests" };

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
  const [manualArm, setManualArm] = useState<Arm | null>(null);
  const [theme] = useState<Theme>(initialTheme);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const m = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const logout = useAuthStore((s) => s.logout);

  // فاز ۴ — بازوی شل از مسیر مشتق می‌شود (همان data-arm per-screen پروتوتایپ):
  // صفحات فروش → sell · صفحات خرید → buy · مشترک‌ها → آخرین انتخاب صریح
  const routeArm = useMemo<Arm | null>(() => {
    if (!pathname) return null;
    if (pathname === "/sell" || pathname.startsWith("/sell/")) return "sell";
    if (BUY_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return "buy";
    return null;
  }, [pathname]);
  const arm: Arm = routeArm ?? manualArm ?? initialArm;

  // تعویض بازو = انتخاب + ناوبری به خانهٔ همان بازو (رفتار setMode Prototype)
  const setArm = useCallback(
    (next: Arm) => {
      setManualArm(next);
      router.push(HOME_OF[next]);
    },
    [router]
  );
  const openSwitch = useCallback(() => {
    setConfirmLogout(false);
    setSwitchOpen(true);
  }, []);

  const doLogout = async () => {
    setSwitchOpen(false);
    toast({ title: m.app.logout.done });
    try {
      // خروج به صفحهٔ اول — ناوبری داخل خود logout (window.location) انجام می‌شود
      await logout("/");
    } catch {
      router.replace("/");
    }
  };

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

          {confirmLogout ? (
            <>
              <div className="sub" style={{ fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>
                {m.app.logout.confirmTitle}
              </div>
              <div className="sub" style={{ marginBottom: 10 }}>{m.app.logout.confirmBody}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, color: "#fff", background: "var(--red)" }}
                  onClick={() => void doLogout()}
                >
                  {m.app.logout.confirm}
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmLogout(false)}>
                  {m.app.logout.cancel}
                </button>
              </div>
            </>
          ) : (
            <button
              className="sheet-row"
              style={{ color: "var(--red)" }}
              onClick={() => setConfirmLogout(true)}
            >
              <span className="ico" style={{ background: "color-mix(in srgb, var(--red) 12%, transparent)", color: "var(--red)" }}>
                <Icon name="i-out" />
              </span>
              <span className="tx">
                <b style={{ color: "inherit" }}>{m.app.logout.label}</b>
              </span>
            </button>
          )}

          <button className="btn btn-outline btn-block" style={{ marginTop: 8 }} onClick={() => setSwitchOpen(false)}>
            {m.app.switch.close}
          </button>
        </Sheet>
      </div>
    </ShellContext.Provider>
  );
}
