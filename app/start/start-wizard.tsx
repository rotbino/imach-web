"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, authApi, businessesApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref, armEnabled, firstEnabledArm, useArmStore, setArmActive, type Arm } from "@/lib/active-biz";
import { useCreateBusiness, useMyBusinesses, useSetArms, useEditProfile } from "@/lib/queries";
import { clearReferralCode, loadReferralCode, saveReferralCode } from "@/lib/referral";
import { iranCityItems } from "@/lib/iran-geo";
import {
  guessCountryCode,
  langOfCountry,
  normalizeIntlPhone,
  fmtPhone,
} from "@/lib/countries";
import { isLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-context";
import { AppHeader, AppFooter, MobileTabBar } from "@/app/components/chrome";
import { PhoneField, countrySelectItems } from "@/app/components/phone-field";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronLeft, Info, Loader2, Phone, ShieldCheck } from "lucide-react";

/**
 * /start — ثبت‌نام دوگامی (فاز ۹ · طرح ۱۶):
 *   /start  (مهمان)           → گام ۱: موبایل (+ کشور) → quickRegister
 *   (authed + بیزینس placeholder) → گام ۲: کسب‌وکار شما (نام/نقش/شهر/صنف)
 *   (authed + بیزینس واقعی)      → ریدایرکت به پنل
 *   /start?mode=login           → ریدایرکت به /login (طرح ۱۷)
 *
 * نقشِ «می‌فروشم/می‌خرم/هر دو» (د۹) فقط پیش‌فرضِ دستیارها را می‌گذارد؛
 * بعداً از پروفایل («دستیارهای فعال») قابل تغییر است.
 */

/** بیزینسِ خالیِ ثبت‌نام سریع — city «—» تا وقتی گام ۲ پر شود */
function isPlaceholderBiz(b: { city: string; name: string } | undefined): boolean {
  return !!b && (b.city === "—" || b.name === "کاتالوگ شما");
}

export default function StartWizard() {
  const router = useRouter();
  const { status: authStatus } = useAuthStore();
  // بیزینس از استورِ نشست (هم‌زمان با ورود) یا از کشِ کوئری — هرکدام زودتر
  const storeBiz = useAuthStore((s) => s.businesses[0]);
  const bizQ = useMyBusinesses();
  const biz = bizQ.data?.[0] ?? storeBiz;
  const hasBusiness = !!biz;
  const needsOnboarding = isPlaceholderBiz(biz);
  const redirecting = useRef(false);

  useEffect(() => {
    if (authStatus === "authed" && hasBusiness && !needsOnboarding && !redirecting.current) {
      redirecting.current = true;
      router.replace(myArmHref());
    }
  }, [authStatus, hasBusiness, needsOnboarding, router]);

  if (authStatus === "booting" || (authStatus === "authed" && !storeBiz && bizQ.isLoading)) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // کاربر واردشده — بیزینس واقعی دارد؟ → ریدایرکت (بالای صفحه). وگرنه گام ۲
  if (authStatus === "authed") {
    if (hasBusiness && !needsOnboarding) {
      return (
        <div className="grid place-items-center py-32">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <>
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-md px-4 py-4">
            <CreateBusinessStep biz={biz} />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </>
    );
  }

  // مهمان — گام ۱ (ثبت‌نام)؛ mode=login → صفحه‌ی ورود
  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-md px-4 py-4">
          <Suspense fallback={<div className="grid place-items-center py-32"><Loader2 className="size-6 animate-spin text-primary" /></div>}>
            <AuthRouter />
          </Suspense>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}

function AuthRouter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  useEffect(() => {
    if (mode === "login") router.replace("/login");
  }, [mode, router]);
  return mode === "login" ? null : <RegisterStep1 />;
}

// ─────────────────────────────────────────────────────────────────────────────
// گام ۱ — موبایل (طرح ۱۶): لوگو + اندیکاتور گام + شماره
// ─────────────────────────────────────────────────────────────────────────────

const STEP1_LABELS = ["شماره موبایل", "کسب‌وکار شما"];

function StepsIndicator({ now }: { now: 1 | 2 }) {
  return (
    <div className="mt-4 mb-2 flex items-center gap-0">
      {STEP1_LABELS.map((label, i) => {
        const step = i + 1;
        const done = step < now;
        const active = step === now;
        return (
          <div key={label} className="relative flex-1 text-center">
            {step > 1 && (
              <span
                aria-hidden
                className={`absolute top-[15px] right-[-50%] h-[2px] w-full ${done ? "bg-emerald-500" : "bg-stone-300"}`}
              />
            )}
            <span
              className={`relative z-[1] mx-auto grid size-[30px] place-items-center rounded-full border-[1.5px] text-[12px] font-bold ${
                done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                  : active
                    ? "border-primary bg-primary text-white"
                    : "border-stone-300 bg-stone-100 text-muted-foreground"
              }`}
            >
              {done ? <Check className="size-3.5" strokeWidth={2.4} /> : <span className="tnum">{step === 1 ? "۱" : "۲"}</span>}
            </span>
            <p className={`mt-1.5 text-[11px] ${active ? "font-bold text-primary" : "text-muted-foreground"}`}>{label}</p>
          </div>
        );
      })}
    </div>
  );
}

function AuthLogo({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="pt-6 text-center">
      <div className="grid place-items-center pb-1.5">
        <Image src="/logo3.svg" alt="iMach" width={110} height={38} priority />
      </div>
      <h1 className="px-8 text-[20px] font-bold">{title}</h1>
      <p className="mt-1.5 px-6 text-[12px] leading-[1.9] text-muted-foreground">{sub}</p>
    </div>
  );
}

function RegisterStep1() {
  const { toast } = useToast();
  const router = useRouter();
  const quickRegister = useAuthStore((s) => s.quickRegister);
  const { locale, setLocale } = useLocale();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? loadReferralCode();

  useEffect(() => {
    const r = searchParams.get("ref");
    if (r) saveReferralCode(r);
  }, [searchParams]);

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
    syncLangWithCountry(c);
    // تشخیص یک‌بارِ مرورگر — SSR-safe (navigator فقط سمت کلاینت)؛
    // الگوی mount-once، setState خارج از رندر
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c !== "IR") setShowCountry(true);
  }, []);

  const phoneIntl = normalizeIntlPhone(phone, country);

  const submit = async () => {
    if (!phoneIntl) {
      toast({ title: "شماره موبایل معتبر نیست", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await quickRegister(phoneIntl, country, refCode);
      clearReferralCode();
      // authed → ویزارد خودش گام ۲ (کسب‌وکار شما) را نشان می‌دهد
    } catch (err) {
      if (err instanceof ApiError && err.code === "PHONE_HAS_PASSWORD") {
        router.replace("/login");
      } else {
        toast({
          title: "ثبت‌نام ناموفق بود",
          description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
          variant: "destructive",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-4">
      <AuthLogo title="به ای‌مچ خوش آمدید" sub="چند سؤال ساده — و دستیار خرید و فروشت آماده می‌شود" />
      <StepsIndicator now={1} />

      <div className="mt-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3">
          {showCountry ? (
            <Field label="کشور">
              <SearchSelect
                items={countrySelectItems}
                value={country}
                onChange={(code) => {
                  setCountry(code);
                  syncLangWithCountry(code);
                  if (code !== country) setPhone("");
                }}
                placeholder="کشور"
                searchPlaceholder="جست‌وجوی کشور…"
                emptyText="پیدا نشد"
                ariaLabel="کشور"
              />
            </Field>
          ) : (
            <button type="button" onClick={() => setShowCountry(true)} className="self-start text-[11px] text-primary hover:underline">
              تغییر کشور
            </button>
          )}
          <Field label="موبایل" hint="ثبت‌نام فقط با شماره موبایل — کمتر از ۲ دقیقه">
            <PhoneField value={phone} onChange={setPhone} countryCode={country} ariaLabel="موبایل" placeholder="912 345 6789" />
          </Field>
        </div>
        <Button className="mt-4 h-11 w-full text-[15px]" onClick={() => void submit()} disabled={busy || !phoneIntl}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          ادامه
        </Button>
      </div>

      <p className="mt-3.5 text-center text-[12px] text-muted-foreground">
        حساب دارید؟{" "}
        <Link href="/login" className="font-extrabold text-primary-strong hover:underline">
          وارد شوید
        </Link>
      </p>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-emerald-600" />
        شماره شما فقط برای ورود و تماس‌های تجاری استفاده می‌شود
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// گام ۲ — کسب‌وکار شما (طرح ۱۶): بنر شماره تاییدشده + فرم + نقش (د۹)
// ─────────────────────────────────────────────────────────────────────────────

const TRADES = ["رستوران", "پخش برنج", "پخش مواد غذایی", "قنادی", "پوشاک", "ابزار و یراق", "سایر"];
const ROLES: { key: "sell" | "buy" | "both"; label: string }[] = [
  { key: "sell", label: "می‌فروشم" },
  { key: "buy", label: "می‌خرم" },
  { key: "both", label: "هر دو" },
];

function CreateBusinessStep({ biz: existingBiz }: { biz: { id: string; name: string; city: string; slug: string } | undefined }) {
  const { toast } = useToast();
  const router = useRouter();
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
  const [intent, setIntent] = useState<"sell" | "buy" | "both" | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOther = trade === "سایر";
  const phone = user?.phone ?? "";

  const save = async () => {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast({ title: "نام و نام خانوادگی را کامل بنویسید", variant: "destructive" });
      return;
    }
    if (bizName.trim().length < 2) {
      toast({ title: "نام کسب‌وکار را بنویسید", variant: "destructive" });
      return;
    }
    if (!city) {
      toast({ title: "شهر را انتخاب کنید", variant: "destructive" });
      return;
    }
    const finalTrade = isOther ? customTrade.trim() : trade;
    if (finalTrade.length < 2) {
      toast({ title: "صنف را انتخاب کنید", variant: "destructive" });
      return;
    }
    if (!intent) {
      toast({ title: "می‌فروشید یا می‌خرید؟", variant: "destructive" });
      return;
    }
    if (!terms) {
      toast({ title: "شرایط استفاده را بپذیرید", variant: "destructive" });
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
        // ۳) نقش → دستیارهای فعال (د۹: فقط پیش‌فرض؛ بعداً از پروفایل)
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
      // ۴) ورود به بازوی درست
      const arm: Arm = intent === "buy" ? "buy" : "sell";
      setArmActive(arm);
      router.replace(arm === "buy" ? "/buy" : "/sell");
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-4">
      <AuthLogo title="به ای‌مچ خوش آمدید" sub="چند سؤال ساده — و دستیار خرید و فروشت آماده می‌شود" />
      <StepsIndicator now={2} />

      {/* بنر شماره تاییدشده (طرح ۱۶) */}
      <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
          <Check className="size-3.5" strokeWidth={2.4} />
        </span>
        <span dir="ltr" className="tnum grow text-start text-[14px] font-bold">
          {fmtPhone(phone)}
        </span>
        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">تایید شد</span>
      </div>

      {/* فرم کسب‌وکار */}
      <div className="mt-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="نام">
            <Input value={firstName} maxLength={40} onChange={(e) => setFirstName(e.target.value)} placeholder="علی" autoComplete="given-name" />
          </Field>
          <Field label="نام خانوادگی">
            <Input value={lastName} maxLength={40} onChange={(e) => setLastName(e.target.value)} placeholder="رضایی" autoComplete="family-name" />
          </Field>
        </div>

        <Field label="نام کسب‌وکار" hint="این نام روی کاتالوگ عمومی شما دیده می‌شود">
          <Input value={bizName} maxLength={60} onChange={(e) => setBizName(e.target.value)} placeholder="پخش برنج پارس" />
        </Field>

        <Field label="شما در ای‌مچ چه می‌کنید؟">
          <div className="grid grid-cols-3 gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setIntent(r.key)}
                className={`h-9 rounded-xl border text-[12.5px] font-bold transition ${
                  intent === r.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-stone-200 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-[1.9] text-muted-foreground">
            <Info className="mt-1 size-3.5 shrink-0 text-amber-500" />
            هر زمان از تنظیمات می‌توانید عوضش کنید — دستیاری که لازم ندارید را خاموش کنید.
          </p>
        </Field>

        <Field label="شهر">
          <SearchSelect items={iranCityItems} value={city} onChange={setCity} placeholder="انتخاب شهر" searchPlaceholder="جست‌وجوی شهر…" emptyText="پیدا نشد" ariaLabel="شهر" />
        </Field>

        <Field label="صنف">
          <div className="flex flex-wrap gap-1.5">
            {TRADES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrade(t)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                  trade === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-stone-200 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {isOther && (
            <Input className="mt-2" value={customTrade} maxLength={60} onChange={(e) => setCustomTrade(e.target.value)} placeholder="صنف خود را بنویس…" autoFocus />
          )}
        </Field>

        <label className="mt-1.5 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span className="text-[12px] leading-[1.9]">شرایط استفاده و حریم خصوصی ای‌مچ را می‌پذیرم</span>
        </label>
      </div>

      <Button className="mt-4 h-12 w-full text-[15px]" onClick={() => void save()} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        ساخت حساب و ورود
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground">
        <Phone className="size-3.5" />
        {existingBiz ? "کسب‌وکارتان همین‌جا ثبت می‌شود" : "کسب‌وکارتان همین‌جا ساخته می‌شود"}
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5 grid gap-1.5 first:mt-0">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[10px] leading-4 text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** مسیر پس از ورود — با در نظر گرفتن بیزینس placeholder و بازوهای فعال (فاز ۹) */
export function routeAfterAuth(businesses: { city: string; name: string; enabledArms?: { sell?: boolean; buy?: boolean } | null }[]): string {
  const biz = businesses[0];
  if (!biz || (biz.city === "—" || biz.name === "کاتالوگ شما")) return "/start";
  const stored = useArmStore.getState().arm;
  const arm = armEnabled(biz, stored) ? stored : firstEnabledArm(biz);
  return arm === "buy" ? "/buy" : "/sell";
}
