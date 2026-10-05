"use client";

/**
 * /start — ویزارد ثبت‌نام با دیزاین‌سیستم v18 (پورت sc-signup · فاز ۳).
 *
 * منطق کسب‌وکار عیناً از ویزارد legacy (فاز ۹ طرح ۱۶) — Business Source of Truth:
 *   ۱) گام ۱: شماره (+ کشور) → quickRegister → حساب + بیزینس placeholder
 *      شمارهٔ دارای رمز → PHONE_HAS_PASSWORD → هدایت به /login
 *   ۲) گام ۲: هویت + کسب‌وکار (نام/صنف/شهر/نقش) → editBusiness یا createBusiness
 *      + setArms (نقش فقط پیش‌فرض دستیارهاست) → routeAfterAuth
 *   کد دعوت (?ref) همان منطق legacy: ذخیره → ارسال → پاک‌سازی
 *
 * تطبیق آگاهانه با Prototype (ثبت در MIGRATION-MAP §۴):
 *   · «دریافت کد تأیید» → «ادامه» (بک‌اند OTP ندارد؛ ثبت‌نام سریع واقعی؛ §۶۳)
 *   · بنر phone-verified همان sc-signup — بعد از ثبت موفق شماره
 *   · فیلد نامِ یکی → دو فیلد نام/نام خانوادگی (API واقعی این دو فیلد را می‌خواهد)
 *   · chips صنف = صنف‌های واقعی این استقرار (زنجیرهٔ برنج)، نه دموی Prototype
 */

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, businessesApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { routeAfterAuth, setArmActive, type Arm } from "@/lib/active-biz";
import { useCreateBusiness, useMyBusinesses, useSetArms, useEditProfile } from "@/lib/queries";
import { clearReferralCode, loadReferralCode, saveReferralCode } from "@/lib/referral";
import { iranCityItems } from "@/lib/iran-geo";
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
import { SearchSelect } from "@/components/search-select";
import { countrySelectItems } from "@/app/components/phone-field";
import { useToast } from "@/hooks/use-toast";

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

/** بیزینسِ خالیِ ثبت‌نام سریع — تا وقتی گام ۲ پر شود */
function isPlaceholderBiz(b: { city: string; name: string } | undefined): boolean {
  return !!b && (b.city === "—" || b.name === "کاتالوگ شما");
}

const TRADES = ["رستوران", "پخش برنج", "پخش مواد غذایی", "قنادی", "پوشاک", "ابزار و یراق", "سایر"];

export function SignupWizard() {
  return (
    <Suspense
      fallback={
        <section className="screen" data-screen="signup">
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
              <Spinner size={22} />
            </div>
          </div>
        </section>
      }
    >
      <SignupFlow />
    </Suspense>
  );
}

function SignupFlow() {
  const router = useRouter();
  const m = useMessages();
  const t = m.app.signup;
  const searchParams = useSearchParams();
  const { status: authStatus } = useAuthStore();
  const storeBiz = useAuthStore((s) => s.businesses[0]);
  const bizQ = useMyBusinesses();
  const biz = bizQ.data?.[0] ?? storeBiz;
  const hasBusiness = !!biz;
  const needsOnboarding = isPlaceholderBiz(biz);
  const redirecting = useRef(false);

  // ?mode=login → صفحهٔ ورود (رفتار legacy حفظ شد)
  useEffect(() => {
    if (searchParams.get("mode") === "login") router.replace("/login");
  }, [searchParams, router]);

  // ?ref → ذخیرهٔ کد دعوت (پیش از هر ثبت‌نامی)
  useEffect(() => {
    const r = searchParams.get("ref");
    if (r) saveReferralCode(r);
  }, [searchParams]);

  useEffect(() => {
    if (authStatus === "authed" && hasBusiness && !needsOnboarding && !redirecting.current) {
      redirecting.current = true;
      router.replace(routeAfterAuth(useAuthStore.getState().businesses));
    }
  }, [authStatus, hasBusiness, needsOnboarding, router]);

  if (authStatus === "booting" || (authStatus === "authed" && !storeBiz && bizQ.isLoading)) {
    return (
      <section className="screen" data-screen="signup">
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
            <Spinner size={22} />
          </div>
        </div>
      </section>
    );
  }

  // کاربر واردشده — بیزینس واقعی دارد؟ → ریدایرکت. وگرنه گام ۲
  if (authStatus === "authed") {
    if (hasBusiness && !needsOnboarding) {
      return (
        <section className="screen" data-screen="signup">
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
              <Spinner size={22} />
            </div>
          </div>
        </section>
      );
    }
    return <Step2 existingBiz={biz} />;
  }

  // مهمان — گام ۱ (ثبت‌نام سریع)
  return <Step1 />;
}

/* ═══════════ اندیکاتور دوگامی (عین sc-signup: شماره → کسب‌وکار) ═══════════ */
function Steps({ now }: { now: 1 | 2 }) {
  const m = useMessages();
  const t = m.app.signup;
  return (
    <div className="steps">
      <div className={now === 1 ? "step active" : "step done"}>
        <span className="n">
          {now === 1 ? (
            "۱"
          ) : (
            <Icon className="ic-sm ic-12" name="i-check" />
          )}
        </span>{" "}
        {t.step1}
      </div>
      <div className="bar" />
      <div className={now === 2 ? "step active" : "step"}>
        <span className="n">۲</span> {t.step2}
      </div>
    </div>
  );
}

/* ═══════════ گام ۱ — شمارهٔ موبایل ═══════════ */
function Step1() {
  const { toast } = useToast();
  const router = useRouter();
  const m = useMessages();
  const t = m.app.signup;
  const quickRegister = useAuthStore((s) => s.quickRegister);
  const { locale, setLocale } = useLocale();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? loadReferralCode();

  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("IR");
  const [showCountry, setShowCountry] = useState(false);
  const [busy, setBusy] = useState(false);
  const guessed = useRef(false);

  const syncLangWithCountry = (code: string) => {
    const lang = langOfCountry(code);
    const target = isLocale(lang) ? lang : "en";
    if (target !== locale) setLocale(target);
  };

  useEffect(() => {
    if (guessed.current) return;
    guessed.current = true;
    const c = guessCountryCode();
    setCountry(c);
    // همگام‌سازی زبان با کشورِ حدسی فقط بدون انتخاب صریح (فاز ۳: کوکی زبان مقدم است)
    if (!hasExplicitLocale()) syncLangWithCountry(c);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c !== "IR") setShowCountry(true);
  }, []);

  const phoneIntl = normalizeIntlPhone(toAsciiDigits(phone), country);

  const submit = async () => {
    if (!phoneIntl) {
      toast({ title: t.errPhone, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await quickRegister(phoneIntl, country, refCode);
      clearReferralCode();
      // authed → ویزارد خودش گام ۲ را نشان می‌دهد
    } catch (err) {
      if (err instanceof ApiError && err.code === "PHONE_HAS_PASSWORD") {
        toast({ title: t.errHasPassword });
        router.replace("/login");
      } else {
        toast({
          title: t.errGeneric,
          description: err instanceof ApiError ? err.message : undefined,
          variant: "destructive",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screen" data-screen="signup">
      <div className="pagehead">
        <Link className="back" href="/" aria-label={m.app.login.backAria}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{t.title}</b>
          <span>{t.sub}</span>
        </div>
      </div>

      <div className="screen-body">
        <Steps now={1} />

        <div className="card">
          {showCountry ? (
            <div className="field">
              <label>{m.app.login.country}</label>
              <SearchSelect
                items={countrySelectItems}
                value={country}
                onChange={(code) => {
                  setCountry(code);
                  syncLangWithCountry(code);
                  setPhone("");
                }}
                placeholder={m.app.login.country}
                searchPlaceholder="…"
                emptyText="—"
                ariaLabel={m.app.login.country}
              />
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-soft btn-sm"
              style={{ alignSelf: "flex-start", marginBottom: 10 }}
              onClick={() => setShowCountry(true)}
            >
              <Icon className="ic-sm" name="i-globe" /> {m.app.login.changeCountry}
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
              placeholder={m.app.login.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(sanitizePhone(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              aria-label={t.phoneLabel}
            />
          </div>

          <button
            className="btn btn-primary btn-lg btn-block"
            style={{ marginTop: 12 }}
            disabled={busy || !phoneIntl}
            onClick={() => void submit()}
          >
            {busy ? <Spinner /> : null}
            {busy ? t.loading : t.continueBtn}
          </button>
        </div>

        <div className="gate-note">{t.agree}</div>

        <div className="hint" style={{ marginTop: 10 }}>
          <Icon name="i-shield" />
          <span>
            {t.hasAccount}{" "}
            <Link href="/login" style={{ fontWeight: 800, color: "var(--arm-strong)" }}>
              {t.login}
            </Link>
          </span>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ گام ۲ — کسب‌وکار شما ═══════════ */
function Step2({
  existingBiz,
}: {
  existingBiz: { id: string; name: string; city: string; slug: string } | undefined;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const m = useMessages();
  const t = m.app.signup;
  const searchParams = useSearchParams();
  const createBiz = useCreateBusiness();
  const editBizProfile = useEditProfile();
  const setArms = useSetArms();
  const user = useAuthStore((s) => s.user);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [bizName, setBizName] = useState(
    existingBiz && !isPlaceholderBiz(existingBiz) ? existingBiz.name : ""
  );
  const [trade, setTrade] = useState("");
  const [customTrade, setCustomTrade] = useState("");
  const [city, setCity] = useState("");
  const [intent, setIntent] = useState<"sell" | "buy" | "both" | null>(() => {
    const r = searchParams.get("role");
    return r === "buy" || r === "sell" ? r : null;
  });
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOther = trade === "سایر";
  const phone = user?.phone ?? "";

  const save = async () => {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast({ title: t.errName, variant: "destructive" });
      return;
    }
    if (bizName.trim().length < 2) {
      toast({ title: t.errBiz, variant: "destructive" });
      return;
    }
    if (!city) {
      toast({ title: t.errCity, variant: "destructive" });
      return;
    }
    const finalTrade = isOther ? customTrade.trim() : trade;
    if (finalTrade.length < 2) {
      toast({ title: t.errTrade, variant: "destructive" });
      return;
    }
    if (!intent) {
      toast({ title: t.errRole, variant: "destructive" });
      return;
    }
    if (!terms) {
      toast({ title: t.errTerms, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      // ۱) هویت شخص (نام صاحب کسب‌وکار — روی ویترین هم دیده می‌شود)
      await editBizProfile.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim() });
      // ۲) کسب‌وکار: placeholder ثبت‌نام سریع → ویرایش؛ بدون بیزینس → ساخت
      if (existingBiz) {
        await businessesApi.editBusiness(existingBiz.id, {
          name: bizName.trim(),
          city,
          trade: finalTrade,
        });
        // ۳) نقش → دستیارهای فعال (فقط پیش‌فرض؛ بعداً از پروفایل)
        if (intent !== "both") {
          await setArms.mutateAsync({
            id: existingBiz.id,
            sell: intent !== "buy",
            buy: intent !== "sell",
          });
        }
      } else {
        await createBiz.mutateAsync({
          name: bizName.trim(),
          city,
          trade: finalTrade,
          intent: intent === "both" ? undefined : intent,
        });
      }
      // ۴) ورود به بازوی درست — مستقیم (استورِ businesses هنوز placeholder است؛
      //    کش /home خودش را با کوئری تازه می‌کند)
      const arm: Arm = intent === "buy" ? "buy" : "sell";
      setArmActive(arm);
      router.replace(arm === "buy" ? "/home" : "/sell");
    } catch (err) {
      toast({
        title: t.errGeneric,
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screen" data-screen="signup">
      <div className="pagehead">
        <Link className="back" href="/" aria-label={m.app.login.backAria}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{t.title}</b>
          <span>{t.sub}</span>
        </div>
      </div>

      <div className="screen-body">
        {/* بنر شمارهٔ تأییدشده — عین sc-signup */}
        <div className="phone-verified">
          <Icon name="i-checkc" />
          <span dir="ltr">{fmtPhone(phone)}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#065f46", flexShrink: 0 }}>
            {t.verified}
          </span>
        </div>

        <Steps now={2} />

        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <div className="field">
              <label>{t.firstName}</label>
              <input
                className="inp"
                value={firstName}
                maxLength={40}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                aria-label={t.firstName}
              />
            </div>
            <div className="field">
              <label>{t.lastName}</label>
              <input
                className="inp"
                value={lastName}
                maxLength={40}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                aria-label={t.lastName}
              />
            </div>
          </div>

          <div className="field">
            <label>{t.bizNameLabel}</label>
            <input
              className="inp"
              value={bizName}
              maxLength={60}
              onChange={(e) => setBizName(e.target.value)}
              aria-label={t.bizNameLabel}
            />
          </div>

          <div className="field">
            <label>{t.tradeLabel}</label>
            <div className="unit-chips">
              {TRADES.map((tr) => (
                <button
                  type="button"
                  key={tr}
                  className={trade === tr ? "chip active" : "chip"}
                  onClick={() => setTrade(tr)}
                >
                  {tr === "سایر" ? t.tradeOther : tr}
                </button>
              ))}
            </div>
            {isOther ? (
              <input
                className="inp"
                style={{ marginTop: 8 }}
                value={customTrade}
                maxLength={60}
                onChange={(e) => setCustomTrade(e.target.value)}
                placeholder={t.tradeOtherPh}
                autoFocus
                aria-label={t.tradeOtherPh}
              />
            ) : null}
          </div>

          <div className="field">
            <label>{t.cityLabel}</label>
            <SearchSelect
              items={iranCityItems}
              value={city}
              onChange={setCity}
              placeholder={m.auth.placeholders.city}
              searchPlaceholder={m.auth.search.city}
              emptyText={m.auth.search.empty}
              ariaLabel={t.cityLabel}
            />
          </div>

          <div className="field" style={{ marginBottom: 6 }}>
            <label>{t.roleLabel}</label>
            <div className="unit-chips">
              <button
                type="button"
                className={intent === "buy" ? "chip active" : "chip"}
                onClick={() => setIntent("buy")}
              >
                {t.buy}
              </button>
              <button
                type="button"
                className={intent === "sell" ? "chip active" : "chip"}
                onClick={() => setIntent("sell")}
              >
                {t.sell}
              </button>
              <button
                type="button"
                className={intent === "both" ? "chip active" : "chip"}
                onClick={() => setIntent("both")}
              >
                {t.both}
              </button>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.9 }}>
              {t.roleHint}
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 10 }}>
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              style={{ accentColor: "var(--teal-deep)", width: 15, height: 15 }}
            />
            <span style={{ fontSize: 12, lineHeight: 1.9 }}>{t.terms}</span>
          </label>
        </div>

        <button
          className="btn btn-primary btn-lg btn-block"
          style={{ marginTop: 12 }}
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? <Spinner /> : null}
          {busy ? t.loading : t.submit}
        </button>

        <div className="hint">
          <Icon name="i-shield" />
          <span>{t.hint}</span>
        </div>
      </div>
    </section>
  );
}
