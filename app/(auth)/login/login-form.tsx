"use client";

/**
 * /login — ورود با دیزاین‌سیستم v18 (پورت sc-login · فاز ۲).
 *
 * جریان واقعی (Business Source of Truth — همان بک‌اند، بدون تغییر):
 *   ۱) شماره → checkPhone
 *   ۲) حساب با رمز → فرم رمز عبور → loginUser
 *      ثبت‌نام سریعِ قبلی (بدون رمز) → ورود بی‌رمز همان لحظه (quickRegister)
 *      شمارهٔ تازه → بنر کهربایی + دعوت به /start
 *
 * فاز ۱۰ (بازخورد مالک):
 *   · باکس شماره همیشه LTR + پرچم/کد کشور داخل باکس (IntlPhoneField تلگرامی)
 *     — لینک «تغییر کشور» حذف شد؛ کشور از خودِ باکس عوض می‌شود (مدال سرچ‌دار)
 *   · سوییچ خودکار به ثبت‌نام: شمارهٔ تایپ‌شده با خودش به /start می‌رود تا
 *     کاربر مجبور به تایپ مجدد نباشد
 *   · ورود از /start با شمارهٔ از-قبل-تایپ‌شده (?phone=&cc=)
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { routeAfterAuth } from "@/lib/active-biz";
import {
  guessCountryCode,
  langOfCountry,
  normalizeIntlPhone,
  fmtPhone,
} from "@/lib/countries";
import { isLocale, hasExplicitLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-context";
import { useMessages } from "@/i18n/messages/use-messages";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { IntlPhoneField } from "@/components/imach/intl-phone-field";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { locale, setLocale } = useLocale();
  const m = useMessages();
  const t = m.app.login;
  const searchParams = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const quickRegister = useAuthStore((s) => s.quickRegister);

  const [step, setStep] = useState<"phone" | "password">("phone");
  // فاز ۱۰ — شمارهٔ پیوسته از /start یا لینک‌های داخلی
  const [phone, setPhone] = useState(() => {
    const p = searchParams.get("phone") ?? "";
    return p.replace(/^0+/, "").replace(/\D/g, "").slice(0, 12);
  });
  const [country, setCountry] = useState(() => searchParams.get("cc") || "IR");
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
    const pre = searchParams.get("cc");
    const c = pre || guessCountryCode();
    setCountry(c);
    // همگام‌سازی زبان با کشورِ حدسی فقط بدون انتخاب صریح (کوکی زبان مقدم است)
    if (!hasExplicitLocale()) syncLangWithCountry(c);
     
  }, []);

  // کاربرِ واردشده اینجا کاری ندارد → بازوی خودش
  useEffect(() => {
    if (status === "authed") {
      router.replace(routeAfterAuth(useAuthStore.getState().businesses));
    }
  }, [status, router]);

  const phoneIntl = normalizeIntlPhone(phone, country);

  /** مقصد ثبت‌نام — شماره/کشور با خودش می‌آید تا دوباره تایپ نشود (فاز ۱۰) */
  const signupHref = `/start?mode=register${phone ? `&phone=${encodeURIComponent(phone)}` : ""}${country ? `&cc=${country}` : ""}`;

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
            <div className="field">
              <label>{t.phoneLabel}</label>
              {/* فاز ۱۰ — باکس بین‌المللی تلگرامی: پرچم + کد کشور داخل باکس، همیشه LTR */}
              <IntlPhoneField
                value={phone}
                onChange={(v) => {
                  setPhone(v);
                  if (noAccount) setNoAccount(false);
                }}
                country={country}
                onCountryChange={(code) => {
                  setCountry(code);
                  syncLangWithCountry(code);
                }}
                placeholder={t.phonePlaceholder}
                ariaLabel={t.phoneLabel}
                autoFocus
                onEnter={() => void next()}
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
                    href={signupHref}
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
            {/* بنر شماره — ویرایش‌پذیر (فاز ۱۰: هماهنگ با ثبت‌نام) */}
            <div className="phone-banner">
              <Icon name="i-tel" className="ico" />
              <div className="txt">
                <b dir="ltr">{fmtPhone(phoneIntl)}</b>
                <span>{t.editPhone}</span>
              </div>
              <button
                type="button"
                className="btn btn-edit-num"
                onClick={() => {
                  setStep("phone");
                  setPassword("");
                  setNoAccount(false);
                }}
              >
                <Icon className="ic-sm" name="i-edit" /> {t.editPhone}
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
                  <Icon className="ic-sm" name="i-eye" style={{ opacity: showPw ? 1 : 0.55 }} />
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
          <Link className="link-row" href={signupHref}>
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
            {t.hint} <Link href={signupHref} style={{ fontWeight: 800, color: "var(--arm-strong)" }}>{t.hintLink}</Link>
          </span>
        </div>
      </div>
    </section>
  );
}
