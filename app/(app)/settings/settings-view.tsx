"use client";

/**
 * /settings — تنظیمات (پورت sc-settings از Prototype v18 · فاز ۶).
 *
 * همه‌چیز واقعی:
 *   · اعلان‌ها → setNotifPrefs (چهار کلید واقعی: priceChange/quoteReplies/
 *     suggestions/push) — toggle لحظه‌ای
 *   · زبان → ریل LangSwitch (کوکی + dir) + همگام‌سازی با حساب (setPrefs)
 *   · شهر → CITIES + editBusiness (موتور تطبیق هم‌زمان به‌روز می‌شود)
 *   · نما (الزام مالک) → تم روشن/تاریک + رنگ دلخواه هر arm —
 *     پالت‌های منتخب v18؛ override متغیرهای --arm* روی ریشهٔ شل
 *   · فروشگاه → ساعت پاسخگویی + شرایط پرداخت پیش‌فرض (editBusiness)
 *
 * تطبیق آگاهانه (MIGRATION-MAP §۴):
 *   · ردیف «سیستم و اخبار آی‌مچ» → «اعلان Push» — کلید system در
 *     بک‌اند وجود ندارد (اعلان SYSTEM تعریف نشده)؛ گیتِ پوشِ واقعی
 *     همین‌جا معنا دارد و همان ردیف بصری را پر می‌کند
 *   · بخش «نما» افزودهٔ الزام مالک است (Prototype فقط روشن دارد)
 */

import { useMemo, useState } from "react";
import { useShell } from "@/components/imach/app-shell";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { useActiveBusiness } from "@/lib/active-biz";
import { useAuthStore } from "@/lib/auth-store";
import { useSetNotifPrefs, useEditBusiness, useSetPrefs } from "@/lib/queries";
import { CITIES } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

/** پالت‌های منتخب arm — هگزِ ثابتِ هماهنگ با توکن‌های v18 (روشن/تاریک سازگار) */
const ARM_PRESETS: Record<"buy" | "sell", Array<{ hex: string | null; label: string }>> = {
  buy: [
    { hex: null, label: "پیش‌فرض" },
    { hex: "#0d9488", label: "فیروزه‌ای" },
    { hex: "#059669", label: "زمردی" },
    { hex: "#2563eb", label: "لاجوردی" },
    { hex: "#7c3aed", label: "بنفش" },
    { hex: "#0f766e", label: "سرمه‌ای" },
  ],
  sell: [
    { hex: null, label: "پیش‌فرض" },
    { hex: "#f97316", label: "نارنجی" },
    { hex: "#b45309", label: "کهربایی" },
    { hex: "#be123c", label: "زرشکی" },
    { hex: "#a16207", label: "طلایی" },
    { hex: "#9a3412", label: "آجری" },
  ],
};

/** کلید رنگ انتخابی از رشتهٔ کوکی/پrefs */
function presetIndex(arm: "buy" | "sell", color: string | null): number {
  if (!color) return 0;
  const i = ARM_PRESETS[arm].findIndex((p) => p.hex === color);
  return i >= 0 ? i : -1; // رنگ سفارشی خارج از پالت (نمایش خاموش)
}

export function SettingsView() {
  const m = useMessages();
  const t = m.app.settings;
  const { locale, setLocale } = useLocale();
  const { theme, setTheme, armColor, armColors, setArmColor } = useShell();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;
  const logout = useAuthStore((s) => s.logout);
  const setNotifPrefs = useSetNotifPrefs();
  const editBusiness = useEditBusiness();
  const setPrefs = useSetPrefs();

  const prefs = (biz?.notifPrefs ?? {}) as Record<string, boolean | undefined>;
  const pref = (k: string): boolean => prefs[k] ?? true;

  // فرم فروشگاه — مقدار اولیه از دیتا، ذخیرهٔ جداگانه
  const [hours, setHours] = useState<string>("");
  const [payTerm, setPayTerm] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const bizHours = (biz as { hours?: string | null } | null)?.hours ?? "";
  const bizPayTerm = (biz as { defaultPayTerm?: string | null } | null)?.defaultPayTerm ?? "";

  // مقدار اولیهٔ فرم فروشگاه از دیتای واقعی — الگوی تنظیم حین رندر
  const [formBizId, setFormBizId] = useState<string | null>(null);
  if (bizId && bizId !== formBizId) {
    setFormBizId(bizId);
    setHours(bizHours);
    setPayTerm(bizPayTerm);
    setCity(biz?.city ?? "");
  }

  // رنگ arm جاری برای بخش نما — سوییچ بین پالت‌های همان arm
  const [paletteArm, setPaletteArm] = useState<"buy" | "sell">("buy");
  const curColor = paletteArm === "buy" ? armColor : armColors.sell;
  const curIdx = presetIndex(paletteArm, curColor);

  const notifRows = [
    {
      key: "priceChange" as const,
      icon: "i-bm" as const,
      tint: "var(--teal-tint)",
      fg: "var(--teal-deep)",
      title: t.notifPriceT,
      sub: t.notifPriceS,
      on: pref("priceChange"),
    },
    {
      key: "quoteReplies" as const,
      icon: "i-bell" as const,
      tint: "var(--amber-tint)",
      fg: "var(--amber)",
      title: t.notifNeedT,
      sub: t.notifNeedS,
      on: pref("quoteReplies"),
    },
    {
      key: "suggestions" as const,
      icon: "i-users" as const,
      tint: "var(--orange-tint)",
      fg: "var(--primary-strong)",
      title: t.notifFollowT,
      sub: t.notifFollowS,
      on: pref("suggestions"),
    },
    {
      key: "push" as const,
      icon: "i-info" as const,
      tint: "var(--muted-bg)",
      fg: "var(--fg-soft)",
      title: t.notifPushT,
      sub: t.notifPushS,
      on: pref("push"),
    },
  ];

  const toggleNotif = (key: string, next: boolean) => {
    if (!bizId) return;
    setNotifPrefs.mutate({ id: bizId, [key]: next });
  };

  const changeLang = (code: string) => {
    setLocale(code);
    // همگام‌سازی با حساب — cross-device (فاز ۶)
    void setPrefs.mutateAsync({ lang: code }).catch(() => undefined);
  };

  const saveStore = () => {
    if (!bizId) return;
    editBusiness.mutate(
      { id: bizId, hours: hours.trim() || null, defaultPayTerm: payTerm.trim() || null, ...(city && city !== biz?.city ? { city } : {}) },
      { onSuccess: () => toast({ title: t.storeSaved }) }
    );
  };

  if (!bizId) {
    return (
      <section className="screen" data-screen="settings">
        <Appbar deskTitle={t.title} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Spinner size={22} />
        </div>
        <Tabbar active="profile" />
      </section>
    );
  }

  return (
    <section className="screen" data-screen="settings">
      <Appbar deskTitle={t.title} />

      <div className="screen-body">
        {/* ═══ اعلان‌ها — چهار سوییچ واقعی ═══ */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-bell" />
            {t.notifTitle}
          </h2>
        </div>
        <div className="card">
          {notifRows.map((r) => (
            <div className="cap-row" key={r.key}>
              <span className="ico" style={{ background: r.tint, color: r.fg }}>
                <Icon name={r.icon} />
              </span>
              <span className="tx">
                <b>{r.title}</b>
                <span>{r.sub}</span>
              </span>
              <button
                className={r.on ? "switch on arm" : "switch arm"}
                aria-label={r.title}
                aria-pressed={r.on}
                onClick={() => toggleNotif(r.key, !r.on)}
              />
            </div>
          ))}
        </div>

        {/* ═══ زبان و منطقه ═══ */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-globe" />
            {t.langTitle}
          </h2>
        </div>
        <div className="card">
          <div className="field" style={{ margin: "0 0 10px" }}>
            <label>{t.langLabel}</label>
            <div className="unit-chips" role="group" aria-label={t.langLabel}>
              {[
                { code: "fa", label: "فارسی" },
                { code: "en", label: "English" },
                { code: "ar", label: "العربية" },
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className={l.code === locale ? "chip active" : "chip"}
                  lang={l.code}
                  aria-pressed={l.code === locale}
                  onClick={() => changeLang(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>{t.cityLabel}</label>
            <div className="inp" style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Icon className="ic-sm" name="i-pin" style={{ color: "var(--muted)" }} />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  font: "inherit",
                  color: "inherit",
                  padding: 0,
                  cursor: "pointer",
                }}
                aria-label={t.cityLabel}
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Icon className="ic-sm" name="i-chev" style={{ color: "var(--muted)", marginInlineStart: "auto" }} />
            </div>
          </div>
        </div>

        {/* ═══ نما — تم + رنگ arm (الزام مالک) ═══ */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-gear" />
            {t.appearanceTitle}
          </h2>
        </div>
        <div className="card">
          <div className="field" style={{ margin: "0 0 10px" }}>
            <label>{t.themeLabel}</label>
            <div className="unit-chips" role="group" aria-label={t.themeLabel}>
              <button
                type="button"
                className={theme === "light" ? "chip active" : "chip"}
                aria-pressed={theme === "light"}
                onClick={() => setTheme("light")}
              >
                {t.themeLight}
              </button>
              <button
                type="button"
                className={theme === "dark" ? "chip active" : "chip"}
                aria-pressed={theme === "dark"}
                onClick={() => setTheme("dark")}
              >
                {t.themeDark}
              </button>
            </div>
          </div>

          {/* رنگ محیط — پالت منتخب هر arm جدا */}
          <div className="field" style={{ margin: 0 }}>
            <label>{t.armColorsLabel.replace("{arm}", paletteArm === "buy" ? m.app.shell.armBuy : m.app.shell.armSell)}</label>
            <div
              className="unit-chips"
              style={{ marginBottom: 8 }}
              role="group"
              aria-label={t.armColorsLabel}
            >
              <button
                type="button"
                className={paletteArm === "buy" ? "chip active" : "chip"}
                onClick={() => setPaletteArm("buy")}
              >
                {m.app.shell.armBuy}
              </button>
              <button
                type="button"
                className={paletteArm === "sell" ? "chip active" : "chip"}
                onClick={() => setPaletteArm("sell")}
              >
                {m.app.shell.armSell}
              </button>
            </div>
            <div className="unit-chips" role="group">
              {ARM_PRESETS[paletteArm].map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  className={curIdx === i ? "chip active" : "chip"}
                  aria-pressed={curIdx === i}
                  onClick={() => setArmColor(paletteArm, p.hex)}
                  style={p.hex ? { borderColor: p.hex } : undefined}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 99,
                      marginInlineEnd: 5,
                      background: p.hex ?? "var(--arm)",
                      verticalAlign: "middle",
                    }}
                  />
                  {p.label}
                </button>
              ))}
            </div>
            <div className="note-l" style={{ marginTop: 8 }}>
              {t.armColorsNote}
            </div>
          </div>
        </div>
        <div className="hint">
          <Icon name="i-info" />
          <span>{t.themeHint}</span>
        </div>

        {/* ═══ فروشگاه ═══ */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-gear" />
            {t.storeTitle}
          </h2>
        </div>
        <div className="card">
          <div className="field" style={{ margin: "0 0 10px" }}>
            <label>{t.hoursLabel}</label>
            <input
              className="inp"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder={t.hoursPlaceholder}
              maxLength={60}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>{t.payTermLabel}</label>
            <input
              className="inp"
              value={payTerm}
              onChange={(e) => setPayTerm(e.target.value)}
              placeholder={t.payTermPlaceholder}
              maxLength={60}
            />
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 12, width: "100%" }}
            disabled={editBusiness.isPending}
            onClick={saveStore}
          >
            {t.save}
          </button>
        </div>

        {/* ═══ خروج ═══ */}
        <div className="card" style={{ padding: "5px 16px", marginTop: 12 }}>
          <button className="link-row" onClick={() => void logout("/").catch(() => undefined)}>
            <Icon name="i-out" />
            {t.logout}
            <Icon className="lv" name="i-chev" />
          </button>
        </div>

        <div className="hint">
          <Icon name="i-info" />
          <span>{t.hint}</span>
        </div>
      </div>

      <Tabbar active="profile" />
    </section>
  );
}
