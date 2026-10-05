"use client";

/**
 * /login — ورود با دیزاین‌سیستم v18 (پورت sc-login · فاز ۲ مهاجرت).
 *
 * جریان واقعی (Business Source of Truth — همان بک‌اند، بدون تغییر):
 *   ۱) شماره → checkPhone
 *   ۲) حساب با رمز → فرم رمز عبور → loginUser
 *      ثبت‌نام سریعِ قبلی (بدون رمز) → ورود بی‌رمز همان لحظه (quickRegister)
 *      شمارهٔ تازه → بنر کهربایی + دعوت به /start
 *
 * تطبیق آگاهانه با Prototype (ثبت‌شده در MIGRATION-MAP):
 *   · ردیف OTP پروتوتایپ → فرم رمز عبور واقعی (بک‌اند هنوز OTP ندارد؛
 *     ظاهر OTP بدون بک‌اند = نقض §۶۳ «mock دائمی ممنوع»)
 *   · بنر «شماره تأیید شد» از sc-signup برای گام رمز استفاده شد
 *   · pagehead/back عین Prototype — بازگشت به /start
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { routeAfterAuth } from "@/app/start/start-wizard";
import {
  guessCountryCode,
  langOfCountry,
  normalizeIntlPhone,
  fmtPhone,
} from "@/lib/countries";
import { isLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-context";
import { useMessages } from "@/i18n/messages/use-messages";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";
import { countrySelectItems } from "@/app/components/phone-field";
import { SearchSelect } from "@/components/search-select";

/** نرمال‌سازی ارقام فارسی/عربی → لاتین (§۲۱ فرم‌های production-grade) */
function toAsciiDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** فقط رقم + حذف زندهٔ صفرهای آغازین (الگوی PhoneField موجود) */
function sanitizePhone(v: string): string {
  const d = toAsciiDigits(v).replace(/\D/g, "");
  return d.replace(/^0+/, "").slice(0, 12);
}

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { locale, setLocale } = useLocale();
  const m = useMessages();
  const t = m.app.login;
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const quickRegister = useAuthStore((s) => s.quickRegister);

  const [step, setStep] = useState<"phone" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("IR");
  const [showCountry, setShowCountry] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const guessed = useRef(false);

  const syncLangWithCountry = (code: string) => {
    const lang = langOfCountry(code);
    const target = isLocale(lang) ? lang : "fa";
    if (target !== locale) setLocale(target);
  };

  useEffect(() => {
    if (guessed.current) return;
    guessed.current = true;
    const c = guessCountryCode();
    setCountry(c);
    syncLangWithCountry(c);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c !== "IR") setShowCountry(true);
  }, []);

  // کاربرِ واردشده اینجا کاری ندارد → بازوی خودش
  useEffect(() => {
    if (status === "authed") {
      router.replace(routeAfterAuth(useAuthStore.getState().businesses));
    }
  }, [status, router]);

  const phoneIntl = normalizeIntlPhone(toAsciiDigits(phone), country);

  const next = async () => {
    if (!phoneIntl) {
      toast({ title: t.errPhone, variant: "destructive" });
      return;
    }
    setBusy(true);
    setNoAccount(false);
    try {
      const res = await authApi.checkPhone({ phone: phoneIntl, country });
      if (res.available) {
        setNoAccount(true); // حساب نیست → دعوت به ساخت حساب
        return;
      }
      if (res.hasPassword) {
        setStep("password");
      } else {
        // ثبت‌نام سریعِ قبلی — ورود بی‌رمز همان لحظه
        await quickRegister(phoneIntl, country);
        router.replace(routeAfterAuth(useAuthStore.getState().businesses));
      }
    } catch (err) {
      toast({
        title: t.errAuth,
        description: err instanceof ApiError ? err.message : t.errGeneric,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    if (!phoneIntl) {
      toast({ title: t.errPhone, variant: "destructive" });
      return;
    }
    if (password.length === 0) {
      toast({ title: t.errPassword, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await login(phoneIntl, password, country);
      router.replace(routeAfterAuth(useAuthStore.getState().businesses));
    } catch (err) {
      toast({
        title: t.errAuth,
        description: err instanceof ApiError ? err.message : t.errGeneric,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screen" data-screen="login">
      <div className="pagehead">
        <Link className="back" href="/start" aria-label={t.backAria}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{t.title}</b>
          <span>{t.sub}</span>
        </div>
      </div>

      <div className="screen-body">
        {step === "phone" ? (
          <div className="card">
            {showCountry ? (
              <div className="field">
                <label>{t.country}</label>
                <SearchSelect
                  items={countrySelectItems}
                  value={country}
                  onChange={(code) => {
                    setCountry(code);
                    syncLangWithCountry(code);
                    setPhone("");
                  }}
                  placeholder={t.country}
                  searchPlaceholder="…"
                  emptyText="—"
                  ariaLabel={t.country}
                />
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-soft btn-sm"
                style={{ alignSelf: "flex-start", marginBottom: 10 }}
                onClick={() => setShowCountry(true)}
              >
                <Icon className="ic-sm" name="i-globe" /> {t.changeCountry}
              </button>
            )}

            <div className="field">
              <label>{t.phoneLabel}</label>
              <input
                className="inp inp-lg"
                dir="ltr"
                style={{ textAlign: "right" }}
                inputMode="tel"
                autoComplete="tel"
                placeholder={t.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && void next()}
                aria-label={t.phoneLabel}
              />
              {noAccount ? (
                <div
                  className="f-err"
                  style={{
                    display: "flex",
                    color: "var(--amber)",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    background: "var(--amber-tint)",
                    borderRadius: 11,
                    padding: "9px 11px",
                  }}
                >
                  <Icon name="i-info" />
                  <span style={{ flex: 1 }}>{t.noAccount}</span>
                  <Link
                    href="/start?mode=register"
                    className="btn btn-soft btn-sm"
                    style={{ color: "var(--amber)", flexShrink: 0 }}
                  >
                    {t.makeAccount}
                  </Link>
                </div>
              ) : null}
            </div>

            <button
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 12 }}
              disabled={busy || !phoneIntl}
              onClick={() => void next()}
            >
              {busy ? <Spinner /> : null}
              {busy ? t.loading : t.continueBtn}
            </button>
          </div>
        ) : (
          <div className="card">
            {/* بنر شماره — از sc-signup (phone-verified) */}
            <div className="phone-verified">
              <Icon name="i-checkc" />
              <span dir="ltr">{fmtPhone(phoneIntl)}</span>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                onClick={() => {
                  setStep("phone");
                  setPassword("");
                  setNoAccount(false);
                }}
              >
                {t.editPhone}
              </button>
            </div>

            <div className="field">
              <label>{t.passwordLabel}</label>
              <div style={{ position: "relative" }}>
                <input
                  className="inp inp-lg"
                  dir="ltr"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submitPassword()}
                  aria-label={t.passwordLabel}
                  style={{ textAlign: "right", paddingInlineEnd: 42 }}
                />
                <button
                  type="button"
                  aria-label={showPw ? t.hidePw : t.showPw}
                  onClick={() => setShowPw((s) => !s)}
                  style={{
                    position: "absolute",
                    insetInlineEnd: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--muted)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon className="ic-sm" name={showPw ? "i-eye" : "i-eye"} style={{ opacity: showPw ? 1 : 0.55 }} />
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 12 }}
              disabled={busy || password.length === 0}
              onClick={() => void submitPassword()}
            >
              {busy ? <Spinner /> : null}
              {busy ? t.loading : t.loginBtn}
            </button>
          </div>
        )}

        <div className="card" style={{ padding: "5px 16px" }}>
          <Link className="link-row" href="/start?mode=register">
            <Icon name="i-user" />
            <span style={{ flex: 1 }}>
              <b>{t.makeAccountRow}</b>
              <span style={{ display: "block", fontSize: 10, color: "var(--muted)" }}>{t.makeAccountSub}</span>
            </span>
            <Icon name="i-chev" className="lv" />
          </Link>
        </div>

        <div className="hint">
          <Icon name="i-shield" />
          <span>
            {t.hint} <Link href="/start?mode=register" style={{ fontWeight: 800, color: "var(--arm-strong)" }}>{t.hintLink}</Link>
          </span>
        </div>
      </div>
    </section>
  );
}
