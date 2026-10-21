"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { routeAfterAuth } from "@/lib/active-biz";
import { IntlPhoneField } from "@/components/imach/intl-phone-field";
import { AuthBrandPanel, LogoMark } from "@/components/imach/auth-brand-panel";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { guessCountryCode, langOfCountry, normalizeIntlPhone, fmtPhone } from "@/lib/countries";
import { hasExplicitLocale, isLocale } from "@/i18n/config";

/**
 * `/login` — اسکرین ۰۳: ورود (M1 · 03-login پروتوتایپ نهایی).
 *
 * · چهره = پروتوتایپ (شماره + رمز یکجا؛ اولویت لینک‌ها FD-26)؛
 *   منطق = قرارداد واقعی (checkPhone → رمز | quickRegister | دعوت به /start)
 * · IntlPhoneField تلگرامی: پرچم/کد داخل باکس؛ کشور → زبان هم‌گام (فاز ۱۰)
 * · بازیابی رمز = شیت «ارسال شماره به پشتیبانی» → «به‌زودی رمز موقت» (FD-26/22)
 * · دسکتاپ ≥lg: اسپلیت FD-28/29 — کارت ۴۴۸ + پنل برند تمام‌قد
 * · ?phone=&cc= از /start می‌آید تا شماره دوباره تایپ نشود
 */

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}

function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const quickRegister = useAuthStore((s) => s.quickRegister);
  const { show } = useToast();
  const m = useMessages();
  const t = m.auth.login;
  const { locale, setLocale } = useLocale();

  // ?phone=&cc= — سوییچ خودکار از /start بدون پاک‌شدن شماره
  const prePhone = searchParams.get("phone") ?? "";
  const preCountry = searchParams.get("cc") ?? "";

  const [phone, setPhone] = useState(prePhone.replace(/^0+/, "").replace(/\D/g, "").slice(0, 12));
  const [country, setCountry] = useState(preCountry || "IR");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);
  const guessed = useRef(false);

  // حدس کشور فقط بدون انتخاب صریح زبان (کوکی زبان مقدم است)
  useEffect(() => {
    if (guessed.current) return;
    guessed.current = true;
    const c = preCountry || guessCountryCode();
    setCountry(c);
    if (!hasExplicitLocale()) {
      const lang = langOfCountry(c);
      const target = isLocale(lang) ? lang : "en";
      if (target !== locale) setLocale(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- اجرای یک‌باره در mount
  }, []);

  const phoneIntl = normalizeIntlPhone(phone, country);

  const syncLangWithCountry = (code: string) => {
    const lang = langOfCountry(code);
    const target = isLocale(lang) ? lang : "en";
    if (target !== locale) setLocale(target);
  };

  /** جریان واقعی: checkPhone → رمز | quickRegister | دعوت به ساخت حساب */
  const doSubmit = async () => {
    if (!phoneIntl) {
      show({ text: m.auth.toast.invalidPhone, kind: "error" });
      return;
    }
    setBusy(true);
    setNoAccount(false);
    try {
      const res = await authApi.checkPhone({ phone: phoneIntl, country });
      if (res.available) {
        setNoAccount(true); // حساب نیست → بنر کهربایی + دعوت به /start
        return;
      }
      if (res.hasPassword && !password) {
        show({ text: t.passwordRequired, kind: "error" });
        pwRef.current?.focus();
        return;
      }
      if (res.hasPassword) {
        await login(phoneIntl, password, country);
      } else {
        // ثبت‌نام سریعِ قبلی (بدون رمز) — ورود بی‌رمز همان لحظه
        await quickRegister(phoneIntl, country);
      }
      show({ text: m.auth.toast.welcome, kind: "success" });
      router.replace(routeAfterAuth(useAuthStore.getState().businesses));
    } catch (err) {
      show({
        text: err instanceof ApiError ? err.message : m.auth.toast.generic,
        kind: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSubmit();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:flex-row">
      {/* ═══ ستون فرم (راست در RTL) — موبایل: سرصفحه + بدنه؛ دسکتاپ: کارت ۴۴۸ ═══ */}
      <div className="flex flex-1 flex-col lg:min-w-0 lg:px-14 lg:pb-16 lg:pt-12">
        {/* سرصفحهٔ موبایل — دسکتاپ: پنل برند هویت صفحه است */}
        <div className="sticky top-0 z-[5] flex h-14 items-center gap-2 border-b border-line bg-white/95 px-3 backdrop-blur-md lg:hidden">
          <Link
            href="/"
            aria-label={m.common.backAria}
            className="grid size-10 place-items-center rounded-xl text-text-2 transition-colors hover:bg-surface-2"
          >
            <Icon name="back" size={20} />
          </Link>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold text-text">{t.title}</div>
            <div className="truncate text-[10.5px] text-text-3">{t.subtitle}</div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 lg:max-w-[448px] lg:rounded-3xl lg:border lg:border-line lg:bg-surface lg:px-[38px] lg:py-[38px] lg:shadow-[0_18px_50px_rgba(31,29,26,.07)]">
          {/* نشان آیمچ بالای فرم (حکم مالک M2 — برندینگ در ذهن کاربر) */}
          <LogoMark size={34} className="mx-auto mb-5 text-primary-strong lg:hidden" />

          {/* سربرگ کارت — فقط دسکتاپ (dkf-h)؛ نشان آیمچ برند را می‌دهد */}
          <div className="mb-6 hidden lg:block">
            <LogoMark size={42} className="mb-4 text-primary-strong" />
            <div className="text-[23px] font-extrabold tracking-[-.2px] text-text">{t.title}</div>
            <div className="mt-[7px] text-[12.5px] text-text-3">{t.subtitle}</div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <Field label={t.phoneLabel}>
              {() => (
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
                  ariaLabel={t.phoneLabel}
                  autoFocus
                  onEnter={() => void doSubmit()}
                />
              )}
            </Field>

            {/* بنر «حسابی با این شماره نیست» — دعوت به /start با همان شماره */}
            {noAccount && (
              <div className="flex items-center gap-2 rounded-xl border border-amber/40 bg-amber-soft px-3 py-2.5 text-[12px] leading-5 text-amber">
                <Icon name="info" size={18} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <b className="block">{t.noAccountTitle}</b>
                  <span className="text-[11px]">{t.noAccountSub}</span>
                </span>
                <Link
                  href={`/start?phone=${encodeURIComponent(phone)}&cc=${country}`}
                  className="inline-flex h-8 shrink-0 items-center rounded-lg bg-white px-3 text-[11.5px] font-bold text-amber"
                >
                  {t.noAccountCta}
                </Link>
              </div>
            )}

            <Field label={t.passwordLabel} hint={t.passwordHint}>
              {(id) => (
                <Input
                  id={id}
                  ref={pwRef}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>

            <Button type="submit" size="lg" block loading={busy}>
              {t.submit}
            </Button>
          </form>

          {/* FD-26: ثبت‌نام بالا و نارنجی (لینک‌مان)؛ فراموشی پایین و خاموش */}
          <Link
            href={`/start${phone ? `?phone=${encodeURIComponent(phone)}&cc=${country}` : ""}`}
            className="mt-3 block w-full px-2 py-2 text-center text-[12px] font-bold text-primary-strong underline decoration-dashed underline-offset-4 transition-opacity active:opacity-70"
          >
            {t.signupLink}
          </Link>
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="mt-1 block w-full px-2 py-1.5 text-center text-[11.5px] font-semibold text-text-3 underline decoration-line-2 underline-offset-[3px] transition-colors hover:text-text-2"
          >
            {t.forgotLink}
          </button>
        </div>
      </div>

      {/* ═══ پنل برند — تمام‌قد، فقط دسکتاپ ═══ */}
      <AuthBrandPanel kind="login" />

      {/* ═══ شیت بازیابی رمز (FD-26) ═══ */}
      <ForgotSheet open={forgotOpen} onClose={() => setForgotOpen(false)} defaultPhone={fmtPhone(phoneIntl)} />
    </div>
  );
}

/**
 * شیت بازیابی رمز — دو نما (فرم → «به‌زودی رمز موقت»).
 * حکم FD-22: بازیابی از طریق خود آی‌مچ (تیکت پشتیبانی) — نه تماس/واتس‌اپ.
 * M1: ارسالِ واقعی به صف پشتیبانی در فاز رشد (پیامک درون‌برنامه‌ای) وصل می‌شود؛
 * نمای موفقیت عین متن مالک است و شیت در خودش ایزوله است.
 */
function ForgotSheet({
  open,
  onClose,
  defaultPhone,
}: {
  open: boolean;
  onClose: () => void;
  defaultPhone: string;
}) {
  const m = useMessages();
  const t = m.auth.forgot;
  const [phone, setPhone] = useState(defaultPhone);
  const [sent, setSent] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // بازشدن دوباره → فرم تمیز (forgotReset الگوی پروتوتایپ)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSent(false);
      setPhone(defaultPhone);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.title}>
      {!sent ? (
        <div className="flex flex-col gap-3 py-1">
          <p className="text-[13px] leading-6 text-text-2">{t.sub}</p>
          <Field label={t.phoneLabel}>
            {(id) => (
              <Input
                id={id}
                dir="ltr"
                inputMode="tel"
                placeholder={t.phonePh}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            )}
          </Field>
          <Button variant="arm" block onClick={() => setSent(true)}>
            <Icon name="send" size={17} />
            {t.submit}
          </Button>
          <p className="mt-1 flex items-start gap-2 text-[11px] leading-[1.9] text-text-4">
            <Icon name="lock" size={14} className="mt-[3px] shrink-0" />
            <span>{t.security}</span>
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-green-soft text-green">
            <Icon name="check" size={26} />
          </div>
          <div className="text-[15px] font-extrabold text-text">{t.okTitle}</div>
          <div className="text-[12px] leading-5 text-text-3">{t.okSub}</div>
          <Button variant="arm" block className="mt-2" onClick={onClose}>
            {t.close}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
