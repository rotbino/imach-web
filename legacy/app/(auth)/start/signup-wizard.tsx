"use client";

/**
 * /start — ویزارد ثبت‌نام با دیزاین‌سیستم v18 (پورت sc-signup · فاز ۳).
 *
 * منطق کسب‌وکار عیناً از ویزارد legacy — Business Source of Truth:
 *   ۱) گام ۱: شماره (+ کشور) → quickRegister → حساب + بیزینس placeholder
 *      شمارهٔ دارای رمز → PHONE_HAS_PASSWORD → هدایت به /login
 *   ۲) گام ۲: هویت + کسب‌وکار (نام/صنف/شهر) → editBusiness یا createBusiness
 *      + setArms → routeAfterAuth
 *   کد دعوت (?ref) همان منطق legacy: ذخیره → ارسال → پاک‌سازی
 *
 * فاز ۱۰ (بازخورد مالک — «عملیاتی شدن واقعی»):
 *   · بنر «شماره تأیید شد» → بنر ویرایش شماره؛ دکمهٔ ویرایشِ در چشم +
 *     بازگشت به صفحهٔ اول = حذف حساب (deleteMe با توکن خود کاربر) و
 *     شروع کاملاً تازه
 *   · شماره همیشه LTR با پرچم + کد کشور داخل باکس (IntlPhoneField، سبک
 *     تلگرام) — مدال انتخاب کشور با سرچ
 *   · اصناف از دیتابیس: ۴ چیپ هسته‌ای + «سایر»ِ رنگی؛ ورودی هوشمند با
 *     تایپ‌آهد — انتخاب صنفِ موجود (بازاستفاده/ای‌دی مشترک سمت سرور) یا
 *     ساخت صنف جدید (resolveTrade در بک‌اند)
 *   · حذف سؤال «اول از کجا شروع می‌کنی؟» — نقش از صفحهٔ اول (?role=) می‌آید
 *   · چک‌باکس شرایط استفاده کامنت شد (ثبت‌نام سریع — خواستهٔ مالک)
 *   · متن توضیح دستیارها → متن جدید مالک + نکتهٔ چند-کسب‌وکاری
 *   · شهر: placeholder «انتخاب شهر» روی خود سلکتور + بوردر مثل اینپوت‌ها
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ApiError, businessesApi, type TradeDto } from "@/lib/api";
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
import { Sheet } from "@/components/imach/sheet";
import { SearchSelect } from "@/components/search-select";
import { IntlPhoneField } from "@/components/imach/intl-phone-field";
import { useToast } from "@/hooks/use-toast";

/** بیزینسِ خالیِ ثبت‌نام سریع — تا وقتی گام ۲ پر شود */
function isPlaceholderBiz(b: { city: string; name: string } | undefined): boolean {
  return !!b && (b.city === "—" || b.name === "کاتالوگ شما");
}

/** ۴ صنف هسته‌ای — fallback موقت تا پاسخ getTrades برسد (و در خطای شبکه) */
const CORE_FALLBACK = ["سوپرمارکت", "پخش مواد غذایی", "تولید پوشاک", "قنادی"];

/** نرمال‌سازی نام صنف برای مقایسهٔ «همین صنف است؟» — همان قاعدهٔ سرور */
function normTrade(s: string): string {
  return s
    .trim()
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\u200c/g, " ")
    .toLocaleLowerCase("fa");
}

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

/* ═══════════ گام ۱ — شمارهٔ موبایل (بین‌المللی، سبک تلگرام) ═══════════ */
function Step1() {
  const { toast } = useToast();
  const router = useRouter();
  const m = useMessages();
  const t = m.app.signup;
  const quickRegister = useAuthStore((s) => s.quickRegister);
  const { locale, setLocale } = useLocale();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? loadReferralCode();

  // فاز ۱۰ — ورود مستقیم از /login با شمارهٔ تایپ‌شده (سوییچ خودکار بدون پاک‌شدن شماره)
  const prePhone = searchParams.get("phone") ?? "";
  const preCountry = searchParams.get("cc") ?? "";

  const [phone, setPhone] = useState(prePhone.replace(/^0+/, "").replace(/\D/g, "").slice(0, 12));
  const [country, setCountry] = useState(preCountry || "IR");
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
    const c = preCountry || guessCountryCode();
    setCountry(c);
    // همگام‌سازی زبان با کشورِ حدسی فقط بدون انتخاب صریح (کوکی زبان مقدم است)
    if (!hasExplicitLocale()) syncLangWithCountry(c);
     
  }, []);

  const phoneIntl = normalizeIntlPhone(phone, country);

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
        // فاز ۱۰ — شماره را با خودش ببر تا کاربر دوباره تایپ نکند
        router.replace(`/login?phone=${encodeURIComponent(phone)}&cc=${country}`);
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
          <div className="field">
            <label>{t.phoneLabel}</label>
            <IntlPhoneField
              value={phone}
              onChange={setPhone}
              country={country}
              onCountryChange={(code) => {
                setCountry(code);
                syncLangWithCountry(code);
              }}
              placeholder={m.app.login.phonePlaceholder}
              ariaLabel={t.phoneLabel}
              autoFocus
              onEnter={() => void submit()}
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
  existingBiz: { id: string; name: string; city: string; slug: string; trade?: string | null } | undefined;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const m = useMessages();
  const t = m.app.signup;
  const searchParams = useSearchParams();
  const createBiz = useCreateBusiness();
  const editBizProfile = useEditProfile();
  const setArms = useSetArms();
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const user = useAuthStore((s) => s.user);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [bizName, setBizName] = useState(
    existingBiz && !isPlaceholderBiz(existingBiz) ? existingBiz.name : ""
  );
  // صنف انتخابی — نامِ رکورد Trade (هسته‌ای یا شخصی)
  const [trade, setTrade] = useState(existingBiz?.trade ?? "");
  const [otherOpen, setOtherOpen] = useState(false);
  const [tradeQuery, setTradeQuery] = useState("");
  const [city, setCity] = useState("");
  // فاز ۱۰ — نقش از صفحهٔ اول (?role=) می‌آید؛ سؤال تکراری حذف شد.
  // بدون نقش (ورود مستقیم از /login) → هر دو دستیار فعال می‌مانند.
  const [intent] = useState<"sell" | "buy" | "both">(() => {
    const r = searchParams.get("role");
    return r === "buy" || r === "sell" ? r : "both";
  });
  const [busy, setBusy] = useState(false);
  const [editSheet, setEditSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const phone = user?.phone ?? "";

  /* ── اصناف از دیتابیس (فاز ۱۰) ── */
  const tradesQ = useQuery({
    queryKey: ["trades"],
    queryFn: () => businessesApi.getTrades(),
    staleTime: 5 * 60_000,
  });
  const trades: TradeDto[] = tradesQ.data ?? [];
  const coreTrades = useMemo(() => {
    const core = trades.filter((tr) => tr.isCore).map((tr) => tr.name);
    return core.length > 0 ? core : CORE_FALLBACK;
  }, [trades]);
  const usageOf = (name: string): number | null => {
    const hit = trades.find((tr) => normTrade(tr.name) === normTrade(name));
    return hit ? hit.usageCount : null;
  };
  // صنف انتخابیِ غیرهسته‌ای → چیپ اختصاصی انتهای ردیف
  const customChip = trade && !coreTrades.some((c) => normTrade(c) === normTrade(trade)) ? trade : null;

  /* ── تایپ‌آهد صنف (ورودی «سایر») ── */
  const [tradeResults, setTradeResults] = useState<TradeDto[]>([]);
  const [tradeSearching, setTradeSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runTradeSearch = (q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) {
      setTradeResults([]);
      setTradeSearching(false);
      return;
    }
    setTradeSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        setTradeResults(await businessesApi.searchTrades(q.trim()));
      } catch {
        setTradeResults([]);
      } finally {
        setTradeSearching(false);
      }
    }, 260);
  };
  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  const query = tradeQuery.trim();
  const exactExists =
    query.length >= 2 &&
    (tradeResults.some((r) => normTrade(r.name) === normTrade(query)) ||
      coreTrades.some((c) => normTrade(c) === normTrade(query)));
  // نتایج منهای خود متنِ دقیق (که در ردیف «صنف جدید» می‌آید اگر تازه باشد)
  const suggestions = tradeResults.filter((r) => normTrade(r.name) !== normTrade(query));

  const pickTrade = (name: string) => {
    setTrade(name);
    setOtherOpen(false);
    setTradeQuery("");
    setTradeResults([]);
  };

  /* ── ویرایش شماره → حذف حساب و شروع دوباره (فاز ۱۰) ── */
  const restartSignup = async () => {
    setDeleting(true);
    try {
      await deleteAccount(); // سرور: کاسکید کامل؛ کلاینت: پاک + هدایت به /
    } catch {
      toast({ title: t.errDelete, variant: "destructive" });
      setDeleting(false);
    }
  };

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
    // صنف: چیپ انتخابی، یا متنِ تایپ‌شده (صنف جدید) در ورودی هوشمند
    const finalTrade = trade || (otherOpen && query.length >= 2 ? query : "");
    if (finalTrade.length < 2) {
      toast({ title: t.errTrade, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      // ۱) هویت شخص (نام صاحب کسب‌وکار — روی ویترین هم دیده می‌شود)
      await editBizProfile.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim() });
      // ۲) کسب‌وکار: placeholder ثبت‌نام سریع → ویرایش؛ بدون بیزینس → ساخت
      //    صنف سمت سرور به رجیستری Trade حل می‌شود (بازاستفاده یا ساخت)
      if (existingBiz) {
        await businessesApi.editBusiness(existingBiz.id, {
          name: bizName.trim(),
          city,
          trade: finalTrade,
        });
        // ۳) نقش از صفحهٔ اول → پیش‌فرضِ دستیارها (both = هر دو روشن)
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
      // ۴) ورود به بازوی درست — مستقیم (کش /home خودش را با کوئری تازه می‌کند)
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
        {/* فاز ۱۰ — بنر ویرایش شماره (به‌جای «شماره تأیید شد») */}
        <div className="phone-banner">
          <Icon name="i-tel" className="ico" />
          <div className="txt">
            <b dir="ltr">{fmtPhone(phone)}</b>
            <span>{t.editBannerSub}</span>
          </div>
          <button type="button" className="btn btn-edit-num" onClick={() => setEditSheet(true)}>
            <Icon className="ic-sm" name="i-edit" /> {t.editBtn}
          </button>
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

          {/* ── صنف — چیپ‌های دیتابیسی + سایرِ رنگی + ورودی هوشمند ── */}
          <div className="field">
            <label>{t.tradeLabel}</label>
            <div className="trade-chips" role="radiogroup" aria-label={t.tradeLabel}>
              {coreTrades.map((tr) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={trade === tr}
                  key={tr}
                  className={
                    trade && normTrade(trade) === normTrade(tr) ? "tchip on" : "tchip"
                  }
                  onClick={() => pickTrade(tr)}
                >
                  {tr}
                  {usageOf(tr) !== null && usageOf(tr)! > 0 ? (
                    <i className="n">{usageOf(tr)}</i>
                  ) : null}
                </button>
              ))}
              {customChip ? (
                <button type="button" role="radio" aria-checked className="tchip on custom">
                  {customChip}
                </button>
              ) : null}
              <button
                type="button"
                role="radio"
                aria-checked={otherOpen}
                className={otherOpen ? "tchip other on" : "tchip other"}
                onClick={() => {
                  if (otherOpen) {
                    // بستن ورودی → چیپ انتخابی می‌ماند اگر باشد
                    setOtherOpen(false);
                    setTradeQuery("");
                    setTradeResults([]);
                  } else {
                    setOtherOpen(true);
                  }
                }}
              >
                <Icon className="ic-sm ic-12" name="i-plus" />
                {t.tradeOther}
              </button>
            </div>

            {otherOpen ? (
              <div className="trade-smart">
                <Icon name="i-search" className="lead" />
                <input
                  className="inp"
                  value={tradeQuery}
                  maxLength={60}
                  placeholder={t.tradeSearchPh}
                  onChange={(e) => {
                    setTradeQuery(e.target.value);
                    runTradeSearch(e.target.value);
                  }}
                  aria-label={t.tradeLabel}
                  autoFocus
                />
                {(tradeSearching || suggestions.length > 0 || (query.length >= 2 && !exactExists)) && (
                  <div className="ts-drop">
                    {suggestions.map((r) => (
                      <button
                        type="button"
                        className="ts-row"
                        key={r.id}
                        onClick={() => pickTrade(r.name)}
                      >
                        <span className="nm">{r.name}</span>
                        <span className="hint-tx">
                          {t.tradePickN.replace("{n}", String(r.usageCount))}
                        </span>
                        <Icon className="ic-sm ic-14 go" name="i-chev" />
                      </button>
                    ))}
                    {query.length >= 2 && !exactExists ? (
                      <button type="button" className="ts-row new" onClick={() => pickTrade(query)}>
                        <span className="nm">
                          {query} <b className="ts-badge">{t.tradeNewBadge}</b>
                        </span>
                        <span className="hint-tx">{t.tradeNewHint}</span>
                      </button>
                    ) : null}
                    {tradeSearching ? (
                      <div className="ts-loading">
                        <Spinner size={14} />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="field">
            <label>{t.cityLabel}</label>
            <SearchSelect
              items={iranCityItems}
              value={city}
              onChange={setCity}
              placeholder={t.cityPh}
              searchPlaceholder={m.auth.search.city}
              emptyText={m.auth.search.empty}
              ariaLabel={t.cityPh}
              className="ia-select h-[46px] border-[1.5px] border-[color:var(--border-strong)] text-[13px] font-bold"
            />
          </div>

          {/* فاز ۱۰ — سؤال نقش حذف شد؛ نقش از صفحهٔ اول (?role=) می‌آید */}
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
          <span>
            {t.armsHint}
            <br />
            <span style={{ color: "var(--fg-soft)" }}>{t.multiBizNote}</span>
          </span>
        </div>
      </div>

      {/* فاز ۱۰ — تأیید حذف حساب و شروع دوباره */}
      <Sheet open={editSheet} onClose={() => setEditSheet(false)} label={t.editBtn}>
        <div className="sheet">
          <div className="grab" />
          <h3>{t.editConfirmTitle}</h3>
          <div className="sub">{t.editConfirmBody}</div>
          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-soft btn-lg"
              onClick={() => setEditSheet(false)}
            >
              {t.editConfirmNo}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={deleting}
              onClick={() => void restartSignup()}
            >
              {deleting ? <Spinner size={16} /> : null}
              {t.editConfirmYes}
            </button>
          </div>
        </div>
      </Sheet>
    </section>
  );
}
