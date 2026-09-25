"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref } from "@/lib/active-biz";
import { useCreateBusiness, useMyBusinesses } from "@/lib/queries";
import { clearReferralCode, loadReferralCode, saveReferralCode } from "@/lib/referral";
import { iranCityItems } from "@/lib/iran-geo";
import {
  guessCountryCode,
  langOfCountry,
  normalizeIntlPhone,
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
import { Check, Loader2 } from "lucide-react";

/**
 * مسیر شروع — چهار حالت با URL پارامتر mode:
 *   /start                  → ورود (پیش‌فرض)
 *   /start?mode=login       → ورود با رمز
 *   /start?mode=register    → ثبت‌نام سریع (فقط موبایل)
 *   (authed + business)     → redirect به پنل
 *   (authed + no business)  → فرم ساخت کاتالوگ
 *
 * دو فرم «ثبت‌نام» و «ورود» کاملاً از هم جدا هستند — سوییچر ندارند.
 */
export default function StartWizard() {
  const router = useRouter();
  const { status: authStatus } = useAuthStore();
  const bizQ = useMyBusinesses();
  const hasBusiness = (bizQ.data?.length ?? 0) > 0;
  // guard برای جلوگیری از تداخل redirect خودکار با redirect دستی در CreateBusinessStep
  const redirecting = useRef(false);

  // redirect در useEffect — نه در render
  useEffect(() => {
    if (authStatus === "authed" && hasBusiness && !bizQ.isLoading && !redirecting.current) {
      redirecting.current = true;
      router.replace(myArmHref());
    }
  }, [authStatus, hasBusiness, bizQ.isLoading, router]);

  if (authStatus === "booting" || (authStatus === "authed" && hasBusiness)) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // authed ولی business ندارد → فرم ساخت کاتالوگ
  if (authStatus === "authed" && !hasBusiness && !bizQ.isLoading) {
    return (
      <>
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-md px-4 py-8">
            <CreateBusinessStep />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </>
    );
  }

  // guest → فرم ورود یا ثبت‌نام
  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-md px-4 py-8">
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

// ─────────────────────────────────────────────────────────────────────────────
// مسیریاب فرم — با پارامتر URL mode تصمیم می‌گیرد کدام فرم نشان داده شود
// ─────────────────────────────────────────────────────────────────────────────

function AuthRouter() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  // register → ثبت‌نام سریع، هر چیز دیگر → ورود
  return mode === "register" ? <RegisterForm /> : <LoginForm />;
}

// ─────────────────────────────────────────────────────────────────────────────
// authed ولی business ندارد — فرم ساخت کاتالوگ
// ─────────────────────────────────────────────────────────────────────────────

function CreateBusinessStep() {
  const { toast } = useToast();
  const router = useRouter();
  const createBiz = useCreateBusiness();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [customTrade, setCustomTrade] = useState("");
  const [city, setCity] = useState("");
  const [intent, setIntent] = useState<"sell" | "buy" | "both" | null>(null);

  const firstName = user?.firstName || (user?.name && !user.name.startsWith("کاربر ") ? user.name : "");

  const isOther = trade === "سایر";

  const create = async () => {
    if (name.trim().length < 2) {
      toast({ title: "عنوان کاتالوگ را بنویس", variant: "destructive" });
      return;
    }
    if (!city) {
      toast({ title: "شهر را انتخاب کن", variant: "destructive" });
      return;
    }
    const finalTrade = isOther ? customTrade.trim() : trade;
    if (finalTrade.length < 2) {
      toast({ title: "صنف را انتخاب کن", variant: "destructive" });
      return;
    }
    if (!intent) {
      toast({ title: "خرید عمده داری یا فروش عمده؟", variant: "destructive" });
      return;
    }
    try {
      await createBiz.mutateAsync({ name: name.trim(), city, trade: finalTrade });
      // intent را در arm ست کن و به arm درست برو
      const { useArmStore } = await import("@/lib/active-biz");
      if (intent === "buy") {
        useArmStore.getState().setArm("buy");
        router.replace("/buy");
      } else if (intent === "sell") {
        useArmStore.getState().setArm("sell");
        router.replace("/sell");
      } else {
        // both — پیش‌فرض sell (کاربر بعداً می‌تواند سوییچ کند)
        useArmStore.getState().setArm("sell");
        router.replace("/sell");
      }
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کن",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-extrabold">{firstName ? `${firstName} خوش اومدی` : "خوش اومدی"}</h1>
      <div className="mt-4 grid gap-3">
        <Field label="عنوان کاتالوگ">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً سوپرمارکت آریا"
            autoFocus
          />
        </Field>
        <Field label="صنف">
          <div className="flex flex-wrap gap-1.5">
            {["سوپرمارکت", "قنادی", "پخش مواد غذایی", "پوشاک", "ابزار و یراق", "سایر"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrade(t)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                  trade === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {isOther && (
            <Input
              className="mt-2"
              value={customTrade}
              maxLength={60}
              onChange={(e) => setCustomTrade(e.target.value)}
              placeholder="صنف خود را بنویس…"
              autoFocus
            />
          )}
        </Field>
        <Field label="شهر">
          <SearchSelect
            items={iranCityItems}
            value={city}
            onChange={setCity}
            placeholder="انتخاب شهر"
            searchPlaceholder="جست‌وجوی شهر…"
            emptyText="پیدا نشد"
            ariaLabel="شهر"
          />
        </Field>
        {/* intent — خرید عمده / فروش عمده / هر دو */}
        <Field label="چه کاری می‌کنی؟">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setIntent("sell")}
              className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                intent === "sell"
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-primary/40"
              }`}
            >
              فروش عمده
            </button>
            <button
              type="button"
              onClick={() => setIntent("buy")}
              className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                intent === "buy"
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-primary/40"
              }`}
            >
              خرید عمده
            </button>
            <button
              type="button"
              onClick={() => setIntent("both")}
              className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                intent === "both"
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-primary/40"
              }`}
            >
              هر دو
            </button>
          </div>
        </Field>
      </div>
      <Button className="mt-5 w-full" onClick={() => void create()} disabled={createBiz.isPending || !intent}>
        {createBiz.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        شروع
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// فرم ثبت‌نام سریع — فقط موبایل
// ─────────────────────────────────────────────────────────────────────────────

function RegisterForm() {
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
    if (c !== "IR") setShowCountry(true);
  }, []);

  const phoneIntl = normalizeIntlPhone(phone, country);

  const countrySelectField = (
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
  );

  const countryLink = (
    <button
      type="button"
      onClick={() => setShowCountry(true)}
      className="self-start text-[11px] text-primary hover:underline"
    >
      تغییر کشور
    </button>
  );

  const submit = async () => {
    if (!phoneIntl) {
      toast({ title: "شماره موبایل معتبر نیست", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await quickRegister(phoneIntl, country, refCode);
      clearReferralCode();
      // redirect توسط useEffect در StartWizard
    } catch (err) {
      if (err instanceof ApiError && err.code === "PHONE_HAS_PASSWORD") {
        // شماره قبلاً با رمز ثبت شده → هدایت به صفحه ورود
        router.replace("/start?mode=login");
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
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-extrabold">ثبت‌نام</h1>
      <div className="mt-4 grid gap-3">
        {showCountry ? countrySelectField : countryLink}
        <Field label="موبایل">
          <PhoneField
            value={phone}
            onChange={setPhone}
            countryCode={country}
            ariaLabel="موبایل"
            placeholder="912 345 6789"
          />
        </Field>
      </div>
      <Button className="mt-4 w-full" onClick={() => void submit()} disabled={busy || !phoneIntl}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        ثبت‌نام
      </Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        حساب داری؟{" "}
        <button
          type="button"
          onClick={() => router.push("/start?mode=login")}
          className="font-extrabold text-primary hover:underline"
        >
          ورود
        </button>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// فرم ورود — موبایل + رمز
// ─────────────────────────────────────────────────────────────────────────────

function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { locale, setLocale } = useLocale();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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
    if (c !== "IR") setShowCountry(true);
  }, []);

  const phoneIntl = normalizeIntlPhone(phone, country);

  const countrySelectField = (
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
  );

  const countryLink = (
    <button
      type="button"
      onClick={() => setShowCountry(true)}
      className="self-start text-[11px] text-primary hover:underline"
    >
      تغییر کشور
    </button>
  );

  const submit = async () => {
    if (!phoneIntl) {
      toast({ title: "شماره موبایل معتبر نیست", variant: "destructive" });
      return;
    }
    if (password.length === 0) {
      toast({ title: "رمز عبور را وارد کنید", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await login(phoneIntl, password, country);
      // redirect توسط useEffect در StartWizard
    } catch (err) {
      toast({
        title: "احراز هویت ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-extrabold">ورود</h1>
      <div className="mt-4 grid gap-3">
        {showCountry ? countrySelectField : countryLink}
        <Field label="موبایل">
          <PhoneField
            value={phone}
            onChange={setPhone}
            countryCode={country}
            ariaLabel="موبایل"
            placeholder="912 345 6789"
          />
        </Field>
        <Field label="رمز عبور">
          <Input
            dir="ltr"
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
      </div>
      <Button className="mt-4 w-full" onClick={() => void submit()} disabled={busy || !phoneIntl || password.length === 0}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        ورود
      </Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        حساب نداری؟{" "}
        <button
          type="button"
          onClick={() => router.push("/start?mode=register")}
          className="font-extrabold text-primary hover:underline"
        >
          ثبت‌نام
        </button>
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[10px] leading-4 text-muted-foreground">{hint}</p>}
    </div>
  );
}
