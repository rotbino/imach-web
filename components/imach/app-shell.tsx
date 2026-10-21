"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { armEnabled, setArmActive, type Arm } from "@/lib/active-biz";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { LOCALES } from "@/i18n/config";
import { useMoney } from "@/components/imach/prefs-context";
import { CURRENCIES, currencyLabel } from "@/lib/format";
import { SELECTABLE_CURRENCIES, currencyOfCountryCode } from "@/lib/currency";
import { Logo2 } from "@/components/imach/auth-brand-panel";

/**
 * AppShell — پوستهٔ کامل M2 (FD-12/15/29) + قاعدهٔ صفحات فرعی (حکم مالک فیکس):
 *  • data-arm روی ریشه (رنگ‌بندی بازو — توکن‌های CSS)
 *  • اپ‌بار: دکمهٔ بازگشت استاندارد ← + عنوان صفحه (صفحات فرعی) یا
 *    نام میز کسب‌وکار («میز فروش سوپرمارکت آریا») + چیپ امتیاز FD-6
 *    (عدد تا M7 صفر می‌ماند) + زنگ اعلان + دکمهٔ زبان/ارز (موبایل)
 *  • صفحات فرعی (پروپ back): بدون سایدبار دسکتاپ — شبیه صفحات اصلی
 *    نمی‌شوند تا کاربر گیج نشود؛ ابزارها در نوار ابزار زیر اپ‌بار (toolbar)
 *  • تب‌بار موبایل: میز فروش / میز خرید (تب بازوی خاموش حذف)
 *    / پیام‌ها / پروفایل
 *  • سایدبار دسکتاپ ۲۵۶ چسبان (FD-29): واژه‌نشان logo2 + ناوبری +
 *    شورت‌کات‌های کاتالوگ/لیست خرید پای سایدبار (حکم مالک فیکس —
 *    به‌جای تعویض زبان/واحد) + چیپ کارر
 *  • شیت «زبان و ارز نمایش»: زبان رابط + ارز نمایش با تبدیل نرخ ادمین —
 *    پیش‌فرض از کشور کسب‌وکار (ایران → فارسی/RTL/تومان)، انتخاب آزاد (حکم ۳).
 */

export type ShellArm = Arm;

/** دکمهٔ زنگ — تا M7 (ماژول notifs) فقط مقصد دارد */
const NOTIFS_HREF = "/notifs";
/** پیام‌ها و پروفایل — placeholder تا M8 */
const MSGS_HREF = "/msgs";
const PROFILE_HREF = "/profile";

/** لینک سایدبار اختصاصی صفحه (FD-39: کاتالوگ سایدبار خودش را دارد) */
export interface SideLink {
  icon: IconName;
  label: string;
  href?: string;
  onClick?: () => void;
}

export function AppShell({
  arm = "sell",
  title,
  wide,
  sidebar,
  back,
  toolbar,
  headerActions,
  children,
}: {
  arm?: ShellArm;
  /** عنوان صفحه (subheader موبایل) — مثلاً «کاتالوگ من» */
  title?: string;
  /** عرض محتوای دسکتاپ — پیش‌فرض ۸۸۰ (لیست‌ها) · wide=۱۱۲۰ (گریدها/میزها) */
  wide?: boolean;
  /** سایدبار اختصاصی دسکتاپ (FD-39) — برند صفحه + لینک‌های ابزار؛
   * بدون آن سایدبار اصلی ناوبری میزها را نشان می‌دهد. چیپ کارر همیشه می‌ماند. */
  sidebar?: { brand: string; links: SideLink[] };
  /** مسیر بازگشت (حکم مالک فیکس): صفحهٔ فرعی — فلش استاندارد ← در اپ‌بار،
   * بدون سایدبار دسکتاپ، عنوان در اپ‌بار. مثلاً "/sell" یا "/catalog". */
  back?: string;
  /** نوار ابزار صفحات فرعی (حکم مالک فیکس): دکمه‌های ابزار همان نوارِ
   * عنوان — «نوار ابزار زیبا» جای سایدبار اختصاصی. */
  toolbar?: ReactNode;
  /** اکشن‌های اضافهٔ اپ‌بار سمت مقابل چیپ‌ها (مثل تماس/پیام/سه‌نقطهٔ ۲۳) */
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const m = useMessages();
  const S = m.shell;
  const user = useAuthStore((s) => s.user);
  const businesses = useAuthStore((s) => s.businesses);
  const logout = useAuthStore((s) => s.logout);

  const biz = businesses[0];

  const [prefsOpen, setPrefsOpen] = useState(false);

  /** رفتن به میز دیگر — بازوی فعال ذخیره می‌شود تا ورود بعدی همان‌جا باز شود */
  const goDesk = (target: Arm) => {
    setArmActive(target);
    router.push(target === "sell" ? "/sell" : "/home");
  };

  /** عنوان نوار بالا: «میز فروش/خرید [نام کسب‌وکار]» — FD-15 */
  const deskTitle =
    arm === "sell"
      ? `${S.deskSell} ${biz?.name ?? S.bizFallback}`.trim()
      : `${S.deskBuy} ${biz?.name ?? S.bizFallback}`.trim();

  const navItems: {
    key: string;
    icon: IconName;
    label: string;
    href: string;
    active: boolean;
    onClick?: () => void;
  }[] = [
    {
      key: "sell",
      icon: "store" as IconName,
      label: S.deskSell,
      href: "/sell",
      active: arm === "sell" && isDeskPath(pathname),
      onClick: arm === "sell" ? undefined : () => goDesk("sell"),
    },
    ...(armEnabled(biz, "buy")
      ? [
          {
            key: "buy",
            icon: "basket" as IconName,
            label: S.deskBuy,
            href: "/home",
            active: arm === "buy" && isDeskPath(pathname),
            onClick: arm === "buy" ? undefined : () => goDesk("buy"),
          },
        ]
      : []),
    {
      key: "msgs",
      icon: "msg" as IconName,
      label: S.msgs,
      href: MSGS_HREF,
      active: pathname.startsWith(MSGS_HREF),
    },
    {
      key: "profile",
      icon: "user" as IconName,
      label: S.profile,
      href: PROFILE_HREF,
      active: pathname.startsWith(PROFILE_HREF),
    },
  ];

  return (
    <div data-arm={arm} className="flex min-h-dvh flex-col bg-bg lg:flex-row">
      {/* ── سایدبار دسکتاپ (FD-29) — فقط صفحات اصلی؛ صفحات فرعی (back)
          سایدبار ندارند تا با میزها اشتباه نشوند (حکم مالک فیکس).
          رفع باگ RTL (مالک): flex-row ساده + پروپرتی‌های منطقی — در RTL
          سایدبار (فرزند اول) سمت راست می‌نشیند و در LTR سمت چپ؛
          flex-row-reverse دقیقاً برعکسش بود (RTL→چپ، LTR→راست). */}
      {!back && (
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-surface lg:flex">
          {sidebar ? (
            <>
              <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
                <div className="grid size-9 place-items-center rounded-lg bg-arm-soft text-arm-strong">
                  <Icon name="store" size={19} />
                </div>
                <span className="text-[16px] font-black text-text">{sidebar.brand}</span>
              </div>
              <nav className="flex flex-1 flex-col gap-1 px-3">
                {sidebar.links.map((l) => {
                  const href = l.href;
                  return (
                    <button
                      key={l.label}
                      type="button"
                      onClick={l.onClick ?? (href !== undefined ? () => router.push(href) : undefined)}
                      className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[14px] font-bold text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                    >
                      <Icon name={l.icon} size={19} />
                      {l.label}
                    </button>
                  );
                })}
              </nav>
            </>
          ) : (
            <>
              {/* واژه‌نشان کامل آیمچ (حکم مالک فیکس: logo2 به‌جای نشان کوچک + واژه) */}
              <div className="px-5 pt-6 pb-5">
                <Logo2 height={33} />
              </div>
              <nav className="flex flex-1 flex-col gap-1 px-3">
                {navItems.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={t.onClick ?? (() => router.push(t.href))}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[14px] font-bold transition-colors",
                      t.active ? "bg-arm-soft text-arm-strong" : "text-text-2 hover:bg-surface-2"
                    )}
                  >
                    <Icon name={t.icon} size={20} />
                    {t.label}
                  </button>
                ))}
              </nav>
            </>
          )}

          {/* شورت‌کات‌های پای سایدبار (حکم مالک فیکس): کاتالوگ/لیست خرید —
              به‌جای تعویض زبان/واحد که «اصلاً کاربردی نیست»؛ فقط بازوی فعال،
              تک‌بازو = تک‌شورت‌کات. زبان/ارز از دکمهٔ گلوب اپ‌بار (موبایل)
              و پروفایل (M8) در دسترس می‌ماند. */}
          <div className="border-t border-line px-3 py-2">
            <p className="px-2.5 pb-1 text-[10.5px] font-bold text-text-4">{S.shortcutsTitle}</p>
            <div className="flex flex-col gap-0.5">
              {armEnabled(biz, "sell") && (
                <SideShortcut icon="store" label={S.shortcutCatalog} onClick={() => router.push("/catalog")} />
              )}
              {armEnabled(biz, "buy") && (
                <SideShortcut icon="basket" label={S.shortcutBuyList} onClick={() => router.push("/buy-list")} />
              )}
            </div>
          </div>

          <div className="p-4 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(PROFILE_HREF)}
                aria-label={S.userAria}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-arm-soft text-[15px] font-black text-arm-strong"
              >
                {(user?.firstName ?? "؟").slice(0, 1)}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-text">
                  {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name : "کاربر"}
                </p>
                <p className="truncate text-[11.5px] text-text-3">{biz?.name ?? S.bizFallback}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout("/")}
                aria-label={S.logoutAria}
                title={S.logoutAria}
                className="grid size-9 place-items-center rounded-full text-text-3 hover:bg-red-bg hover:text-red"
              >
                <Icon name="power" size={18} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ── ستون اصلی: اپ‌بار + محتوا + تب‌بار موبایل ── */}
      <div className="flex min-h-dvh flex-1 flex-col">
        {/* اپ‌بار — FD-15: نام میز کسب‌وکار + FD-6: چیپ امتیاز.
            صفحات فرعی (حکم مالک فیکس): فلش بازگشت استاندارد + عنوان صفحه. */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 backdrop-blur">
          {back ? (
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={() => router.push(back)}
                aria-label={m.common.backAria}
                className="grid size-10 shrink-0 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2 active:scale-95"
              >
                <Icon name="back" size={21} className="rtl:-scale-x-100" />
              </button>
              <span className="truncate text-[15.5px] font-black text-text">{title}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => router.push(arm === "sell" ? "/sell" : "/home")}
              className="flex min-w-0 items-center gap-2.5 rounded-[10px] transition-transform active:scale-[.97]"
              aria-label={deskTitle}
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-arm-soft text-[13px] font-black text-arm-strong">
                {(biz?.name ?? "i").slice(0, 1)}
              </div>
              <span className="truncate text-[14.5px] font-bold text-text">{deskTitle}</span>
            </button>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* اکشن‌های اختصاصی صفحه (۲۳: تماس/پیام/سه‌نقطه) */}
            {headerActions}
            {/* چیپ امتیاز FD-6 — عدد تا M7 صفر است؛ حلقهٔ پیشرفت */}
            <ScoreChip label={S.scoreAria} />
            <button
              type="button"
              onClick={() => router.push(NOTIFS_HREF)}
              aria-label={S.notifsAria}
              className="grid size-10 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
            >
              <Icon name="bell" size={20} />
            </button>
            {/* زبان/ارز — موبایل (دسکتاپ از پروفایل — M8) */}
            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              aria-label={S.prefsTitle}
              className="grid size-10 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2 lg:hidden"
            >
              <Icon name="globe" size={20} />
            </button>
          </div>
        </header>

        {/* نوار ابزار صفحات فرعی (حکم مالک فیکس): همان نوار عنوان — «نوار
            ابزار زیبا» به‌جای سایدبار اختصاصی؛ در همهٔ عرض‌ها (موبایل+دسکتاپ) */}
        {back && toolbar && (
          <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b border-line bg-surface px-4 py-2">
            {toolbar}
          </div>
        )}

        {/* عنوان صفحه (subheader) — فقط حالت میز (بدون back که عنوان در اپ‌بار است) */}
        {!back && title && (
          <div className="border-b border-line bg-surface px-4 py-2.5">
            <h1 className="text-[15.5px] font-black text-text">{title}</h1>
          </div>
        )}

        <main
          className={cn(
            "mx-auto w-full flex-1 px-4 pb-24 pt-4 lg:px-8 lg:pb-10",
            wide ? "max-w-[1120px]" : "max-w-[880px]"
          )}
        >
          {children}
        </main>

        {/* تب‌بار موبایل — FD-12: میزها «جا»اند؛ تب بازوی خاموش حذف */}
        <nav className="sticky bottom-0 z-30 grid h-16 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
        >
          {navItems.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={t.onClick ?? (() => router.push(t.href))}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                t.active ? "text-arm" : "text-text-3"
              )}
            >
              <Icon name={t.icon} size={22} />
              <span className="text-[10.5px] font-bold">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── شیت زبان/ارز (حکم ۳ M2) ── */}
      <PrefsSheet open={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </div>
  );
}

/** آیا مسیر جاری خودِ میز است (نه زیرصفحه‌اش) */
function isDeskPath(pathname: string): boolean {
  return pathname === "/sell" || pathname === "/home" || pathname === "/me";
}

/** شورت‌کات پای سایدبار (حکم مالک فیکس) — کاتالوگ/لیست خرید؛
 *  هم‌قالب دکمه‌های ناوبری اما فشرده‌تر و بی‌حالت فعال */
function SideShortcut({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3.5 py-2 text-[13px] font-bold text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
    >
      <Icon name={icon} size={18} />
      <span className="truncate">{label}</span>
      <Icon name="chev" size={14} className="ms-auto shrink-0 text-text-4 rtl:-scale-x-100" />
    </button>
  );
}

/** دکمهٔ نوار ابزار صفحات فرعی (حکم مالک فیکس — «نوار ابزار زیبا»):
 *  قرص فشردهٔ آیکون+متن؛ در نوار ابزار زیر اپ‌بار می‌نشیند.
 *  فارسیِ داخل-فرم (فریز i18n) — متن از صداکننده می‌آید. */
export function ShellToolButton({
  icon,
  label,
  onClick,
  href,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const router = useRouter();
  const inner = (
    <>
      <Icon name={icon} size={16} className="shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </>
  );
  const cls =
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-bold text-text-2 transition-colors hover:border-line-2 hover:bg-surface-2 hover:text-text active:scale-[.98]";
  return href ? (
    <button type="button" onClick={() => router.push(href)} className={cls}>
      {inner}
    </button>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** چیپ امتیاز FD-6 — حلقهٔ SVG با عدد فارسی؛ تا M7 = ۰ */
function ScoreChip({ label }: { label: string }) {
  const { locale } = useLocale();
  const num = locale === "en" ? "0" : locale === "ar" ? "٠" : "۰";
  // ۹ آیتم × ۱۰۰ تا M7 — حلقه خاموش می‌ماند تا عدد واقعی بیاید
  const R = 15;
  const C = 2 * Math.PI * R;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="relative grid size-11 shrink-0 place-items-center rounded-full text-arm-strong transition-colors hover:bg-surface-2"
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 size-11 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={R} fill="none" strokeWidth="2.5" className="stroke-line" />
        <circle
          cx="22"
          cy="22"
          r={R}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C}
          className="stroke-arm"
        />
      </svg>
      <b className="text-[13px] font-black">{num}</b>
    </button>
  );
}

/** شیت ترجیحات نمایش — زبان + ارز (حکم ۳: آزادانه، پیش‌فرض کشور) */
function PrefsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMessages();
  const S = m.shell;
  const { locale, setLocale } = useLocale();
  const { display, explicit, setDisplay } = useMoney();
  const businesses = useAuthStore((s) => s.businesses);

  // پیش‌فرض کشور کسب‌وکار فعال — ایران → تومان (IRR)
  const countryDefault = currencyOfCountryCode(businesses[0]?.country);

  return (
    <Sheet open={open} onClose={onClose} title={S.prefsTitle}>
      <div className="flex flex-col gap-5 p-5">
        {/* زبان */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-text-2">{S.prefsLang}</p>
          <div className="grid grid-cols-3 gap-2">
            {LOCALES.filter((l) => l.available).map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLocale(l.code)}
                className={cn(
                  "min-h-[44px] rounded-xl border px-3 text-[13.5px] font-bold transition-colors",
                  locale === l.code
                    ? "border-arm bg-arm-soft text-arm-strong"
                    : "border-line bg-surface text-text-2 hover:border-line-2"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* ارز نمایش */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-text-2">{S.prefsCurrency}</p>
          <div className="flex flex-col gap-1.5">
            {/* «پیش‌فرض کشور» — اولین گزینه؛ وقتی انتخاب صریحی نیست */}
            <button
              type="button"
              onClick={() => setDisplay(null)}
              className={cn(
                "flex min-h-[46px] items-center justify-between rounded-xl border px-3.5 text-start text-[13.5px] font-bold transition-colors",
                explicit === null
                  ? "border-arm bg-arm-soft text-arm-strong"
                  : "border-line bg-surface text-text-2 hover:border-line-2"
              )}
            >
              <span>{S.prefsCurrencyDefault}</span>
              <span className="text-[12px] font-bold text-text-3">
                {currencyLabel(countryDefault, locale)}
              </span>
            </button>
            {SELECTABLE_CURRENCIES.filter((c) => c !== countryDefault).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDisplay(c)}
                className={cn(
                  "flex min-h-[46px] items-center justify-between rounded-xl border px-3.5 text-start text-[13.5px] font-bold transition-colors",
                  explicit === c
                    ? "border-arm bg-arm-soft text-arm-strong"
                    : "border-line bg-surface text-text-2 hover:border-line-2"
                )}
              >
                <span>{currencyLabel(c, locale)}</span>
                <span className="text-[11px] font-bold text-text-4" dir="ltr">
                  {c}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11.5px] leading-5 text-text-3">{S.prefsCurrencyHint}</p>
          {/* فعال فعلی — وقتی پیش‌فرض کشور است نشان بده */}
          {explicit === null && (
            <p className="text-[11.5px] font-bold text-arm-strong" dir="auto">
              {currencyLabel(display, locale)}
            </p>
          )}
        </div>

        <Button variant="arm" size="lg" onClick={onClose}>
          {S.prefsDone}
        </Button>
      </div>
    </Sheet>
  );
}
