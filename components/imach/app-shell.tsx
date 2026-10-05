"use client";

/**
 * iMach App Shell — ریشهٔ شل اپ (معادل .phone در Prototype، production-شده).
 *
 *  · `.ia.app` + data-arm(buy|sell) + data-theme(light|dark)
 *  · ArmContext: کامپوننت‌های شل (Appbar/Tabbar/Deskbar) بدون prop-drilling
 *  · شیت «جابه‌جایی دستیار» (sheet-switch) — همان Prototype، زنده
 *  · فاز ۶: تم قابل تعویض در حالت اجرا (setTheme → state + کوکی + setPrefs)
 *    + رنگ دلخواه هر arm (override متغیرهای --arm* روی همین ریشه — معماری
 *    مستند فاز ۱) + sync کراس-دستگاهی prefs با getMe یک‌بار در نشست
 *  · فاز ۶: شیت اعلان‌ها (sheet-notif) سراسری روی زنگ appbar — دادهٔ واقعی
 *    گروه‌بندی‌شده + «همه را خواندم»
 *  · children از Server Components می‌آید (صفحات RSC سالم می‌مانند)
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconSprite } from "./icon-sprite";
import { Icon } from "./icon";
import { Sheet } from "./sheet";
import { Deskbar } from "./deskbar";
import { useAuthStore } from "@/lib/auth-store";
import { useMessages } from "@/i18n/messages/use-messages";
import { useMeOnce, useSetPrefs, useUnits } from "@/lib/queries";
import { NotifSheet } from "./notif-sheet";
import { useSheetParam } from "./demo-sheet-param";
import { CurrencyProvider } from "./currency-context";

export type Arm = "buy" | "sell";
export type Theme = "light" | "dark";

/** پیشوندهای مسیر بازوی خرید — این صفحات arm شل را buy می‌کنند (فاز ۴) */
const BUY_ROUTE_PREFIXES = ["/home", "/item", "/board", "/saved", "/offers", "/rfq", "/add", "/buy", "/msgs"];

/** خانهٔ هر بازو — تعویض بازو (شیت/دسک‌بار) به خانهٔ آن می‌رود (رفتار setMode Prototype) */
const HOME_OF: Record<Arm, string> = { buy: "/home", sell: "/sell/catalog" };

const THEME_COOKIE = "imach_theme";
const ARM_COLOR_COOKIE: Record<Arm, string> = { buy: "imach_arm_buy", sell: "imach_arm_sell" };

/** نوشتن کوکی یک‌ساله — same-site lax (همان الگوی i18n) */
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=lax`;
}

function readArmColorCookie(arm: Arm): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${ARM_COLOR_COOKIE[arm]}=`));
  if (!hit) return null;
  const v = decodeURIComponent(hit.slice(ARM_COLOR_COOKIE[arm].length + 1));
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
}

interface ShellContextValue {
  arm: Arm;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** رنگ سفارشی arm جاری (null = پالت Prototype) */
  armColor: string | null;
  /** رنگ سفارشی هر دو arm — بخش «نما» تنظیمات هر دو را جدا می‌چیند */
  armColors: { buy: string | null; sell: string | null };
  /** تنظیم رنگ سفارشی arm — null = پیش‌فرض؛ کوکی + prefs هم به‌روز می‌شوند */
  setArmColor: (arm: Arm, color: string | null) => void;
  setArm: (arm: Arm) => void;
  openSwitch: () => void;
  /** فاز ۶ — باز کردن شیت اعلان‌ها (زنگ appbar) */
  openNotif: () => void;
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
  initialArmColors,
  initialCurrency,
  children,
}: {
  initialArm?: Arm;
  initialTheme?: Theme;
  /** از کوکی سرور خوانده شده — SSR بدون فلش رنگ */
  initialArmColors?: { buy: string | null; sell: string | null };
  /** فاز ۸ — ارز نمایش از کوکی سرور (SSR بدون فلش ارز) */
  initialCurrency?: string | null;
  children: ReactNode;
}) {
  const [manualArm, setManualArm] = useState<Arm | null>(null);
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [armColors, setArmColors] = useState<{ buy: string | null; sell: string | null }>(
    initialArmColors ?? { buy: null, sell: null }
  );
  const [switchOpen, setSwitchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const m = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const me = useMeOnce();
  const setPrefs = useSetPrefs();
  const hasToken = useAuthStore((s) => !!s.accessToken);
  // فاز ۸ — نام‌های چندزبانهٔ واحد از DB (یک‌بار در نشست → unitLabel)
  const unitsQ = useUnits();
  useEffect(() => {
    const rows = unitsQ.data;
    if (!rows) return;
    import("@/lib/format").then(({ UNIT_DB_NAMES }) => {
      for (const u of rows) {
        UNIT_DB_NAMES[u.key] = { fa: u.nameFa, en: u.nameEn, ar: u.nameAr ?? undefined };
      }
    });
  }, [unitsQ.data]);

  // ── فاز ۶: sync کراس-دستگاهی prefs (یک‌بار در نشست — الگوی تنظیم حین رندر) ──
  // کوکی رندر اولیهٔ SSR را می‌گذارد؛ اینجا اگر روی دستگاه دیگری عوض شده باشد،
  // همان انتخاب اعمال می‌شود (تم/رنگ). فقط یک‌بار — بعد از آن انتخاب محلی مقدم است.
  const [prefsSynced, setPrefsSynced] = useState(false);
  const remotePrefs = me.data?.prefs;
  const [currency, setCurrencyState] = useState<string | null>(initialCurrency ?? null);
  if (!prefsSynced && remotePrefs) {
    setPrefsSynced(true);
    if (remotePrefs.theme !== initialTheme) setThemeState(remotePrefs.theme);
    if (remotePrefs.armBuyColor || remotePrefs.armSellColor) {
      setArmColors({ buy: remotePrefs.armBuyColor, sell: remotePrefs.armSellColor });
    }
    // فاز ۸ — ارز نمایش از دستگاه دیگر (کوکی محلی هنوز ننشسته باشد)
    if (remotePrefs.currency && remotePrefs.currency !== (initialCurrency ?? null)) {
      setCurrencyState(remotePrefs.currency);
      import("@/lib/imach/currency").then(({ writeCurrencyCookie }) => {
        writeCurrencyCookie(remotePrefs.currency!);
      });
    }
  }

  // فاز ۴ — بازوی شل از مسیر مشتق می‌شود (همان data-arm per-screen پروتوتایپ):
  // صفحات فروش → sell · صفحات خرید → buy · مشترک‌ها → آخرین انتخاب صریح
  const routeArm = useMemo<Arm | null>(() => {
    if (!pathname) return null;
    if (pathname === "/sell" || pathname.startsWith("/sell/")) return "sell"; // /sell → ریدایرکت /sell/catalog (فاز ۵)
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
    setSwitchOpen(true);
  }, []);
  const openNotif = useCallback(() => {
    setNotifOpen(true);
  }, []);

  // ── فاز ۹: بازکردن شیت از پارامتر آدرس (?sheet=switch|notif) — ناوبری Demo Hub ──
  useSheetParam("switch", openSwitch);
  useSheetParam("notif", openNotif);

  // ── فاز ۶: تم — state + کوکی + ذخیره روی حساب ──
  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      if (typeof document !== "undefined") setCookie(THEME_COOKIE, next);
      if (hasToken) void setPrefs.mutateAsync({ theme: next }).catch(() => undefined);
    },
    [hasToken, setPrefs]
  );

  // ── فاز ۶: رنگ دلخواه arm — state + کوکی + prefs ──
  const setArmColor = useCallback(
    (which: Arm, color: string | null) => {
      setArmColors((cur) => ({ ...cur, [which]: color }) as { buy: string | null; sell: string | null });
      if (typeof document !== "undefined") setCookie(ARM_COLOR_COOKIE[which], color ?? "");
      if (hasToken) {
        const body = which === "buy" ? { armBuyColor: color } : { armSellColor: color };
        void setPrefs.mutateAsync(body).catch(() => undefined);
      }
    },
    [hasToken, setPrefs]
  );

  // رنگِ armِ جاری — override متغیرهای --arm* روی ریشه (معماری مستند فاز ۱)
  const armStyle = useMemo<CSSProperties | undefined>(() => {
    const custom = armColors[arm];
    if (!custom) return undefined;
    return {
      "--arm": custom,
      "--arm-strong": `color-mix(in srgb, ${custom} 84%, #000)`,
      "--arm-tint": `color-mix(in srgb, ${custom} 14%, var(--card))`,
      "--arm-tint-fg": `color-mix(in srgb, ${custom} 78%, #000)`,
    } as CSSProperties;
  }, [arm, armColors]);

  return (
    <ShellContext.Provider value={{ arm, theme, setTheme, armColor: armColors[arm], armColors, setArmColor, setArm, openSwitch, openNotif }}>
      <CurrencyProvider initialCurrency={currency}>
      <div className="ia app" data-arm={arm} data-theme={theme} style={armStyle}>
        <IconSprite />
        <Deskbar />
        {children}

        {/* ═══ فاز ۶: شیت اعلان‌ها (sheet-notif — سراسری روی زنگ) ═══ */}
        <NotifSheet open={notifOpen} onClose={() => setNotifOpen(false)} />

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
      </CurrencyProvider>
    </ShellContext.Provider>
  );
}
