"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ApiError, authApi, businessesApi, type TradeDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { isPlaceholderBiz, routeAfterAuth, setArmActive } from "@/lib/active-biz";
import { clearReferralCode, loadReferralCode, saveReferralCode } from "@/lib/referral";
import { iranCityItems } from "@/lib/iran-geo";
import { guessCountryCode, langOfCountry, normalizeIntlPhone, fmtPhone } from "@/lib/countries";
import { hasExplicitLocale, isLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-context";
import { useMessages } from "@/i18n/messages/use-messages";
import { IntlPhoneField } from "@/components/imach/intl-phone-field";
import { AuthBrandPanel, LogoMark } from "@/components/imach/auth-brand-panel";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { SearchSelect } from "@/components/search-select";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * `/start` — اسکرین ۰۲: ثبت‌نام ویزاردی (M1 · 02-signup FD-32/34).
 *
 * منطق کسب‌وکار عین ویزارد legacy (تست‌شده روی بک‌اند واقعی):
 *   ۱) گام ۱: شماره (+ کشور) → quickRegister → حساب + بیزینس placeholder
 *      شمارهٔ دارای رمز → PHONE_HAS_PASSWORD → هدایت به /login
 *   ۲) گام ۲: هویت + کسب‌وکار (نام/نقش/صنف/شهر/سرو‌کار) →
 *      editProfile + editBusiness + setArms → routeAfterAuth
 *
 * · چهرهٔ موبایل = پروتوتایپ (steps-tag · input.pick · su-modes سه‌دکمه‌ای + مثال)
 * · دسکتاپ ≥lg: اسپلیت FD-28/29 — کارت ۷۰۰ (FD-34: پهن‌تر) + پنل برند
 * · چندکشوری: شهر ایران = انتخاب از فهرست / غیرایران = متن آزاد
 * · اصناف از دیتابیس واقعی (getTrades) + «صنف جدید» → سمت سرور resolve می‌شود
 * · ویرایش شماره = حذف حساب (deleteMe) و شروع دوباره — راه‌نجات شمارهٔ اشتباه
 * · ?ref ذخیره → همراه ثبت‌نام → پاک‌سازی (رفتار legacy)
 */

type Mode = "sell" | "buy" | "both";

const NAME_KEY = "imach.su.name";

/** ۴ صنف هسته‌ای — fallback وقتی رجیستری Trade خالی است (الگوی legacy؛
 *  رجیستری آنلاین هنوز پر نشده و با resolveTrade هر ثبت‌نام به‌مرور پر می‌شود).
 *  دیتاست نه رشتهٔ UI — عین نام‌های مالک‌تأییدشدهٔ legacy. */
const CORE_FALLBACK: TradeDto[] = [
  { id: "core-1", name: "سوپرمارکت", usageCount: 0, isCore: true },
  { id: "core-2", name: "پخش مواد غذایی", usageCount: 0, isCore: true },
  { id: "core-3", name: "تولید پوشاک", usageCount: 0, isCore: true },
  { id: "core-4", name: "قنادی", usageCount: 0, isCore: true },
];

export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <SignupFlow />
    </Suspense>
  );
}

function SignupFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuthStore();
  const biz = useAuthStore((s) => s.businesses[0]);
  const user = useAuthStore((s) => s.user);
  const hasBusiness = !!biz;
  const needsOnboarding = isPlaceholderBiz(biz);
  const redirecting = useRef(false);
  // گامِ جاری کاربرِ واردشده (بازگشت از گام ۲ بدون از‌دست‌رفتن حالت گام ۲)
  const [step, setStep] = useState<1 | 2>(2);

  // ?mode=login → صفحهٔ ورود (رفتار legacy)
  useEffect(() => {
    if (searchParams.get("mode") === "login") router.replace("/login");
  }, [searchParams, router]);

  // ?ref → ذخیرهٔ کد دعوت (پیش از هر ثبت‌نامی)
  useEffect(() => {
    const r = searchParams.get("ref");
    if (r) saveReferralCode(r);
  }, [searchParams]);

  // کاربر کامل → مستقیم به مقصد (تازه‌واردِ دوباره)
  useEffect(() => {
    if (status === "authed" && hasBusiness && !needsOnboarding && step === 2 && !redirecting.current) {
      redirecting.current = true;
      router.replace(routeAfterAuth(useAuthStore.getState().businesses));
    }
  }, [status, hasBusiness, needsOnboarding, step, router]);

  if (status === "booting") return <Splash />;
  if (status === "guest") return <Step1 />;

  // authed: گام ۲ (حالتش زنده می‌ماند) + گام ۱ قفل‌شده روی شمارهٔ حساب
  return (
    <>
      <div className={step === 2 ? "contents" : "hidden"}>
        <Step2 existingBiz={biz} onBack={() => setStep(1)} />
      </div>
      {step === 1 && user && (
        <Step1 lockedPhone={fmtPhone(user.phone)} onDone={() => setStep(2)} />
      )}
    </>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <span className="size-6 animate-spin rounded-full border-2 border-line-2 border-t-primary" />
    </div>
  );
}

/* ═══════════ گام ۱ — شما (شماره + نام) ═══════════ */
function Step1({
  lockedPhone,
  onDone,
}: {
  /** حالت بازگشت از گام ۲: شمارهٔ حساب قفل است (جلوگیری از حساب تکراری) */
  lockedPhone?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickRegister = useAuthStore((s) => s.quickRegister);
  const { show } = useToast();
  const m = useMessages();
  const t = m.auth.signup;
  const { locale, setLocale } = useLocale();

  const prePhone = searchParams.get("phone") ?? "";
  const preCountry = searchParams.get("cc") ?? "";
  const refCode = searchParams.get("ref") ?? loadReferralCode();

  const [phone, setPhone] = useState(prePhone.replace(/^0+/, "").replace(/\D/g, "").slice(0, 12));
  const [name, setName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");
  const [country, setCountry] = useState(preCountry || "IR");
  const [busy, setBusy] = useState(false);
  const guessed = useRef(false);

  useEffect(() => {
    if (guessed.current || lockedPhone) return;
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

  const submit = async () => {
    if (!name.trim()) {
      show({ text: m.auth.toast.nameRequired, kind: "error" });
      return;
    }
    // حالت قفل‌شده (بازگشت از گام ۲): فقط نام را نگه می‌داریم
    sessionStorage.setItem(NAME_KEY, name.trim());
    if (lockedPhone) {
      onDone?.();
      return;
    }
    if (!phoneIntl) {
      show({ text: m.auth.toast.invalidPhone, kind: "error" });
      return;
    }
    setBusy(true);
    try {
      // زبان UI لحظهٔ ثبت‌نام ذخیره می‌شود (حکم مالک: انتخاب زبان کاربر محترم —
      // کشور پیش‌فرض می‌دهد اما کاربر می‌تواند override کند؛GB→en persisted)
      await quickRegister(phoneIntl, country, refCode, locale);
      clearReferralCode();
      // authed → ویزارد خودش گام ۲ را نشان می‌دهد
    } catch (err) {
      if (err instanceof ApiError && err.code === "PHONE_HAS_PASSWORD") {
        show({ text: m.auth.toast.hasPassword, kind: "error" });
        router.replace(`/login?phone=${encodeURIComponent(phone)}&cc=${country}`);
      } else {
        show({
          text: err instanceof ApiError ? err.message : m.auth.toast.generic,
          kind: "error",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t.title} subtitle={t.subtitle} wide>
      <StepsTag>{t.step1Tag}</StepsTag>

      {/* استاندارد فاصلهٔ فرم (حکم مالک M2): فیلد↔فیلد ۲۰px (gap-5) */}
      <div className="flex flex-col gap-5">
        <Field label={t.phoneLabel}>
          {() =>
            lockedPhone ? (
              <div className="flex h-12 items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3.5">
                <Icon name="phone" size={17} className="shrink-0 text-text-3" />
                <b dir="ltr" className="flex-1 text-start text-[14px] font-bold text-text">
                  {lockedPhone}
                </b>
              </div>
            ) : (
              <IntlPhoneField
                value={phone}
                onChange={setPhone}
                country={country}
                onCountryChange={(code) => {
                  setCountry(code);
                  const lang = langOfCountry(code);
                  const target = isLocale(lang) ? lang : "en";
                  if (target !== locale) setLocale(target);
                }}
                ariaLabel={t.phoneLabel}
                autoFocus
                onEnter={() => void submit()}
              />
            )
          }
        </Field>

        <Field label={t.nameLabel}>
          {(id) => (
            <Input
              id={id}
              type="text"
              maxLength={80}
              placeholder={t.namePh}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          )}
        </Field>
      </div>

      <Button size="lg" block loading={busy} className="mt-6" onClick={() => void submit()}>
        {t.continueBtn}
      </Button>

      <Link
        href={`/login${prePhone ? `?phone=${encodeURIComponent(prePhone)}&cc=${preCountry}` : ""}`}
        className="mt-3 block w-full px-2 py-2 text-center text-[12px] font-bold text-primary-strong underline decoration-dashed underline-offset-4 transition-opacity active:opacity-70"
      >
        {t.toLogin}
      </Link>
    </AuthShell>
  );
}

/* ═══════════ گام ۲ — کسب‌وکار شما ═══════════ */
function Step2({
  existingBiz,
  onBack,
}: {
  existingBiz: { id: string; name: string; city: string } | undefined;
  onBack: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const m = useMessages();
  const t = m.auth.signup;
  const user = useAuthStore((s) => s.user);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const updateBusinesses = useAuthStore((s) => s.updateBusinesses);

  const [name, setName] = useState(
    () =>
      sessionStorage.getItem(NAME_KEY) ??
      [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  );
  const [bizName, setBizName] = useState(
    existingBiz && !isPlaceholderBiz(existingBiz) ? existingBiz.name : ""
  );
  const [role, setRole] = useState("");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<Mode | "">("");
  const [busy, setBusy] = useState(false);

  const [roleSheet, setRoleSheet] = useState(false);
  const [tradeSheet, setTradeSheet] = useState(false);
  const [editSheet, setEditSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const country = user?.country || "IR";
  const isIran = country === "IR";
  const phone = user?.phone ?? "";

  /* ── اصناف از دیتابیس واقعی — رجیستری خالی/خطا ⇒ ۴ صنف هسته‌ای ── */
  const tradesQ = useQuery({
    queryKey: ["trades"],
    queryFn: () => businessesApi.getTrades(),
    staleTime: 5 * 60_000,
  });
  const trades: TradeDto[] = useMemo(
    () => (tradesQ.data && tradesQ.data.length > 0 ? tradesQ.data : CORE_FALLBACK),
    [tradesQ.data]
  );

  const modeEx: Record<Mode, string> = {
    sell: t.modeEx.sell,
    buy: t.modeEx.buy,
    both: t.modeEx.both,
  };

  /* ── ویرایش شماره = حذف حساب و شروع دوباره (شمارهٔ اشتباه) ── */
  const restartSignup = async () => {
    setDeleting(true);
    try {
      await deleteAccount(); // سرور: کاسکید کامل؛ کلاینت: پاک + هدایت به /
    } catch {
      show({ text: m.auth.toast.deleteFailed, kind: "error" });
      setDeleting(false);
    }
  };

  /** نام کامل → (نام، نام خانوادگی) — واژهٔ آخر نام خانوادگی */
  const splitName = (full: string): { firstName: string; lastName: string } => {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
  };

  const save = async () => {
    if (!name.trim() || name.trim().length < 3) {
      show({ text: m.auth.toast.nameRequired, kind: "error" });
      return;
    }
    if (bizName.trim().length < 2) {
      show({ text: m.auth.toast.bizRequired, kind: "error" });
      return;
    }
    if (role.trim().length < 2) {
      show({ text: t.roleRequired, kind: "error" });
      setRoleSheet(true);
      return;
    }
    if (trade.trim().length < 2) {
      show({ text: m.auth.toast.tradeRequired, kind: "error" });
      return;
    }
    if (!city.trim()) {
      show({ text: m.auth.toast.cityRequired, kind: "error" });
      return;
    }
    if (!mode) {
      show({ text: t.modeRequired, kind: "error" });
      return;
    }
    if (!existingBiz) return;

    setBusy(true);
    try {
      // ۱) هویت شخص (نام + نقش در کسب‌وکار — روی ویترین/پیام‌ها دیده می‌شود)
      const { firstName, lastName } = splitName(name);
      await authApi.editProfile({ firstName, lastName, businessRole: role.trim() });
      // ۲) کسب‌وکار placeholder → واقعی (صنف سمت سرور به رجیستری Trade حل می‌شود)
      // activityType عمداً نمی‌رود — نوع کسب‌وکار است نه نقش؛ طبق کامنت مدل
      // «chosen later from the panel» + جدول §۱۰ سند ۰۸
      await businessesApi.editBusiness(existingBiz.id, {
        name: bizName.trim(),
        city: city.trim(),
        trade: trade.trim(),
      });
      // ۳) سرو‌کار → پیش‌فرضِ بازوها (both = هر دو روشن — پیش‌فرض سرور)
      if (mode !== "both") {
        await businessesApi.setArms(existingBiz.id, {
          sell: mode !== "buy",
          buy: mode !== "sell",
        });
      }
      // ۴) کش کسب‌وکارها تازه شود تا routeAfterAuth placeholder قدیمی را نخواند
      try {
        updateBusinesses(await businessesApi.getMyBusinesses());
      } catch {
        /* اگر کش تازه نشد، مقصد پیش‌فرض امن است */
      }
      sessionStorage.removeItem(NAME_KEY);
      setArmActive(mode === "buy" ? "buy" : "sell");
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

  return (
    <AuthShell title={t.title} subtitle={t.subtitle} wide>
      {/* بنر شماره — ویرایش = حذف حساب و شروع دوباره */}
      <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-strong">
          <Icon name="phone" size={18} />
        </span>
        <b dir="ltr" className="min-w-0 flex-1 text-start text-[13.5px] font-bold text-text">
          {fmtPhone(phone)}
        </b>
        <button
          type="button"
          onClick={() => setEditSheet(true)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-[11.5px] font-bold text-text-2 transition-colors hover:border-line-3"
        >
          <Icon name="edit" size={13} />
          {t.phoneEditBtn}
        </button>
      </div>

      <StepsTag>{t.step2Tag}</StepsTag>

      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 p-0 text-[12px] font-bold text-primary-strong transition-opacity active:opacity-70"
      >
        <Icon name="back" size={13} />
        {t.backToStep1}
      </button>

      {/* استاندارد فاصلهٔ فرم (حکم مالک M2): فیلد↔فیلد ۲۰px (gap-5) */}
      <div className="flex flex-col gap-5">
        <Field label={t.bizLabel} hint={t.bizHint}>
          {(id) => (
            <Input
              id={id}
              type="text"
              maxLength={60}
              placeholder={t.bizPh}
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
            />
          )}
        </Field>

        {/* نقش شما در کسب‌وکار (حکم مالک M2 — FD-32) — کمبو شیت‌انتخابی */}
        <Field label={t.roleLabel}>
          {() => (
            <button
              type="button"
              onClick={() => setRoleSheet(true)}
              className="flex h-12 w-full items-center justify-between gap-2 rounded-lg border border-line-2 bg-surface px-3.5 text-[14px] transition-colors hover:border-line-3"
            >
              <span className={cn("truncate", !role && "text-text-4")}>{role || t.rolePh}</span>
              <Icon name="chevd" size={14} className="shrink-0 text-text-3" />
            </button>
          )}
        </Field>

        {/* صنف کسب‌وکار — شیت سرچی-انتخابی از دیتابیس */}
        <Field label={t.tradeLabel}>
          {() => (
            <button
              type="button"
              onClick={() => setTradeSheet(true)}
              className="flex h-12 w-full items-center justify-between gap-2 rounded-lg border border-line-2 bg-surface px-3.5 text-[14px] transition-colors hover:border-line-3"
            >
              <span className={cn("truncate", !trade && "text-text-4")}>{trade || t.tradePh}</span>
              <Icon name="chevd" size={14} className="shrink-0 text-text-3" />
            </button>
          )}
        </Field>

      {/* شهر — ایران: فهرست جست‌وجودار / غیرایران: متن آزاد (چندکشوری) */}
        <Field label={t.cityLabel}>
        {(id) =>
          isIran ? (
            <SearchSelect
              items={iranCityItems}
              value={city || null}
              onPick={(item) => setCity(item.value)}
              placeholder={t.cityPh}
            />
          ) : (
            <Input
              id={id}
              type="text"
              maxLength={60}
              placeholder={t.cityOtherPh}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          )
        }
      </Field>

      {/* FD-34: سه دکمهٔ سادهٔ هم‌عرض + مثالِ همان حالت */}
        <Field label={t.modesLabel}>
        {() => (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {(
                [
                  ["sell", t.modeSell],
                  ["buy", t.modeBuy],
                  ["both", t.modeBoth],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border-[1.5px] px-1.5 py-[11px] text-[12.5px] font-bold transition-colors",
                    mode === value
                      ? "border-primary bg-primary-soft text-primary-strong"
                      : "border-line bg-surface text-text-2 hover:border-line-2 hover:text-text"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode && (
              <p className="mt-1 text-[11px] font-medium leading-[1.9] text-text-3">
                {modeEx[mode]}
              </p>
            )}
          </div>
        )}
        </Field>
      </div>

      <Button size="lg" block loading={busy} className="mt-6" onClick={() => void save()}>
        {t.submit}
      </Button>

      <Link
        href="/login"
        className="mt-3 block w-full px-2 py-2 text-center text-[12px] font-bold text-primary-strong underline decoration-dashed underline-offset-4 transition-opacity active:opacity-70"
      >
        {t.toLogin}
      </Link>

      {/* ═══ شیت نقش — ۹ نقش FD-32 (عین حکم مالک) ═══ */}
      <RoleSheet
        open={roleSheet}
        onClose={() => setRoleSheet(false)}
        picked={role}
        onPick={(v) => {
          setRole(v);
          setRoleSheet(false);
        }}
      />

      {/* ═══ شیت صنف — سرچ + لیست دیتابیسی + صنف جدید ═══ */}
      <TradeSheet
        open={tradeSheet}
        onClose={() => setTradeSheet(false)}
        trades={trades}
        loading={tradesQ.isLoading}
        picked={trade}
        onPick={(v) => {
          setTrade(v);
          setTradeSheet(false);
          show({ text: v, kind: "success" });
        }}
      />

      {/* ═══ تأیید حذف حساب و شروع دوباره ═══ */}
      <Sheet open={editSheet} onClose={() => setEditSheet(false)} title={t.phoneEditSheetTitle}>
        <div className="flex flex-col gap-3 py-1">
          <p className="text-[13px] leading-6 text-text-2">{t.phoneEditSheetBody}</p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="lg" onClick={() => setEditSheet(false)}>
              {t.phoneEditNo}
            </Button>
            <Button variant="danger" size="lg" loading={deleting} onClick={() => void restartSignup()}>
              {t.phoneEditYes}
            </Button>
          </div>
        </div>
      </Sheet>
    </AuthShell>
  );
}

/* ═══════════ شیت نقش شما در کسب‌وکار — ۹ نقش FD-32 (بدون سرچ؛ کوتاه) ═══════════ */
function RoleSheet({
  open,
  onClose,
  picked,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  picked: string;
  onPick: (v: string) => void;
}) {
  const t = useMessages().auth.signup;
  return (
    <Sheet open={open} onClose={onClose} title={t.roleSheetTitle}>
      <p className="pb-2 text-[12.5px] leading-5 text-text-3">{t.roleSheetSub}</p>
      <div role="listbox" aria-label={t.roleSheetTitle} className="flex flex-col">
        {t.roleOptions.map((r: string) => (
          <button
            key={r}
            type="button"
            role="option"
            aria-selected={r === picked}
            onClick={() => onPick(r)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-2 py-3 text-start transition-colors",
              r === picked ? "bg-arm-soft" : "hover:bg-surface-2"
            )}
          >
            <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-text">{r}</span>
            {r === picked && <Icon name="check" size={16} className="text-arm-strong" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ═══════════ شیت صنف — سرچ زنده + «صنف من در لیست نیست» ═══════════ */
function TradeSheet({
  open,
  onClose,
  trades,
  loading,
  picked,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  trades: TradeDto[];
  loading: boolean;
  picked: string;
  onPick: (name: string) => void;
}) {
  const m = useMessages();
  const t = m.auth.signup;
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newTrade, setNewTrade] = useState("");

  // بازشدن دوباره → سرچ تازه (الگوی suReset پروتوتایپ)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQ("");
      setAddOpen(false);
      setNewTrade("");
    }
  }

  const needle = q.trim();
  const list = useMemo(() => {
    if (!needle) return trades.slice(0, 60);
    return trades.filter((tr) => tr.name.includes(needle)).slice(0, 60);
  }, [trades, needle]);

  return (
    <Sheet open={open} onClose={onClose} title={t.tradeSheetTitle}>
      <div className="sticky top-0 z-[1] -mx-1 bg-surface px-1 pb-2 pt-1">
        <div className="flex h-11 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3">
          <Icon name="search" size={17} className="shrink-0 text-text-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.tradeSearchPh}
            aria-label={t.tradeSheetTitle}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-text placeholder:text-text-4 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col">
        {list.map((tr) => (
          <button
            key={tr.id}
            type="button"
            onClick={() => onPick(tr.name)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-2 py-3 text-start transition-colors",
              picked === tr.name ? "bg-arm-soft" : "hover:bg-surface-2"
            )}
          >
            <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-text">{tr.name}</span>
            {picked === tr.name && <Icon name="check" size={16} className="text-arm-strong" />}
          </button>
        ))}
        {!loading && needle && list.length === 0 && (
          <p className="py-6 text-center text-[13px] text-text-3">{t.tradeOtherTitle}</p>
        )}
        {loading && (
          <div className="grid place-items-center py-6">
            <span className="size-5 animate-spin rounded-full border-2 border-line-2 border-t-primary" />
          </div>
        )}
      </div>

      {/* صنف جدید — اگر در لیست نبود */}
      <div className="mt-2 border-t border-line pt-1">
        {!addOpen ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-start transition-colors hover:bg-surface-2"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-text-2">
              <Icon name="plus" size={18} />
            </span>
            <span className="min-w-0">
              <b className="block text-[13.5px] font-bold text-text">{t.tradeOtherTitle}</b>
              <span className="text-[11.5px] text-text-3">{t.tradeOtherSub}</span>
            </span>
          </button>
        ) : (
          <div className="flex gap-2 py-1.5">
            <Input
              value={newTrade}
              onChange={(e) => setNewTrade(e.target.value)}
              placeholder={t.tradeNewPh}
              maxLength={60}
              autoFocus
            />
            <Button
              className="shrink-0"
              onClick={() => {
                const v = newTrade.trim();
                if (v.length >= 2) onPick(v);
              }}
            >
              {t.tradeNewBtn}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ═══════════ برچسب گام (steps-tag پروتوتایپ — خط مویی تا انتهای ردیف) ═══════════ */
function StepsTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-[10.5px] font-bold text-text-3 lg:mb-5 lg:text-[11px]">
      <span>{children}</span>
      <span className="h-px flex-1 rounded bg-line" aria-hidden />
    </div>
  );
}

/* ═══════════ پوستهٔ مشترک auth — موبایل: سرصفحه+بدنه؛ دسکتاپ: کارت + پنل برند ═══════════ */
function AuthShell({
  title,
  subtitle,
  wide,
  children,
}: {
  title: string;
  subtitle: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const m = useMessages();
  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:flex-row">
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
            <div className="truncate text-[15px] font-bold text-text">{title}</div>
            <div className="truncate text-[10.5px] text-text-3">{subtitle}</div>
          </div>
        </div>

        <div
          className={cn(
            "mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 lg:justify-center",
            "lg:rounded-3xl lg:border lg:border-line lg:bg-surface lg:shadow-[0_18px_50px_rgba(31,29,26,.07)]",
            // FD-34: کارت ثبت‌نام ۲۵٪ پهن‌تر (۵۶۰→۷۰۰) + دکمهٔ درشت‌تر
            wide
              ? "lg:max-w-[700px] lg:px-12 lg:py-11"
              : "lg:max-w-[448px] lg:px-[38px] lg:py-[38px]"
          )}
        >
          {/* نشان آیمچ بالای فرم (حکم مالک M2 — برندینگ در ذهن کاربر):
              موبایل: وسط‌چین بالای فیلدها · دسکتاپ: بالای عنوان کارت */}
          <LogoMark size={34} className="mx-auto mb-5 text-primary-strong lg:hidden" />

          {/* سربرگ کارت — فقط دسکتاپ (dkf-h) */}
          <div className="mb-6 hidden lg:block">
            <LogoMark size={42} className="mb-4 text-primary-strong" />
            <div className="text-[23px] font-extrabold tracking-[-.2px] text-text">{title}</div>
            <div className="mt-[7px] text-[12.5px] text-text-3">{subtitle}</div>
          </div>
          {children}
        </div>
      </div>

      {/* پنل برند — تمام‌قد، فقط دسکتاپ */}
      <AuthBrandPanel kind="signup" />
    </div>
  );
}
