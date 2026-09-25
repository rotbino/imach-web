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
 * مسیر شروع — سه حالت:
 *   ۱) guest → فرم ورود/ثبت‌نام سریع (فقط موبایل)
 *   ۲) authed + business دارد → redirect به پنل
 *   ۳) authed + business ندارد → فرم ساخت کاتالوگ
 */
export default function StartWizard() {
  const router = useRouter();
  const { status: authStatus } = useAuthStore();
  const bizQ = useMyBusinesses();
  const hasBusiness = (bizQ.data?.length ?? 0) > 0;

  // redirect در useEffect — نه در render (باگ setState-in-render)
  useEffect(() => {
    if (authStatus === "authed" && hasBusiness && !bizQ.isLoading) {
      router.replace(myArmHref());
    }
  }, [authStatus, hasBusiness, bizQ.isLoading, router]);

  // booting یا در حال redirect
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

  // guest → فرم ورود
  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-md px-4 py-8">
          <Suspense fallback={<div className="grid place-items-center py-32"><Loader2 className="size-6 animate-spin text-primary" /></div>}>
            <AuthStep />
          </Suspense>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// authed ولی business ندارد — فرم ساخت کاتالوگ
// ─────────────────────────────────────────────────────────────────────────────

function CreateBusinessStep() {
  const { toast } = useToast();
  const createBiz = useCreateBusiness();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");

  const firstName = user?.firstName || (user?.name && !user.name.startsWith("کاربر ") ? user.name : "");

  const create = async () => {
    if (name.trim().length < 2) {
      toast({ title: "عنوان کاتالوگ را بنویس", variant: "destructive" });
      return;
    }
    if (!city) {
      toast({ title: "شهر را انتخاب کن", variant: "destructive" });
      return;
    }
    if (trade.trim().length < 2) {
      toast({ title: "صنف را بنویس", variant: "destructive" });
      return;
    }
    try {
      await createBiz.mutateAsync({ name: name.trim(), city, trade: trade.trim() });
      // useEffect در StartWizard تشخیص می‌دهد و redirect می‌کند
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
          <Input
            value={trade}
            maxLength={60}
            onChange={(e) => setTrade(e.target.value)}
            placeholder="مثلاً سوپرمارکت"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["سوپرمارکت", "قنادی", "پخش مواد غذایی", "پوشاک", "ابزار و یراق"].map((t) => (
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
      </div>
      <Button className="mt-5 w-full" onClick={() => void create()} disabled={createBiz.isPending}>
        {createBiz.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        ساخت کاتالوگ
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// guest — ورود/ثبت‌نام سریع با موبایل
// ─────────────────────────────────────────────────────────────────────────────

function AuthStep() {
  const { toast } = useToast();
  const quickRegister = useAuthStore((s) => s.quickRegister);
  const login = useAuthStore((s) => s.login);
  const { locale, setLocale } = useLocale();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? loadReferralCode();

  useEffect(() => {
    const r = searchParams.get("ref");
    if (r) saveReferralCode(r);
  }, [searchParams]);

  const [mode, setMode] = useState<"quick" | "login">(() =>
    searchParams.get("mode") === "login" ? "login" : "quick"
  );

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("IR");
  const [showCountry, setShowCountry] = useState(false);

  const [busy, setBusy] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);
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

  useEffect(() => setPhoneTaken(false), [phone, country]);

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

  // ── ثبت‌نام سریع — redirect توسط useEffect در StartWizard انجام می‌شود
  const submitQuick = async () => {
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
        setPhoneTaken(true);
        setMode("login");
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

  const submitLogin = async () => {
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
      <div className="mx-auto mb-4 flex w-fit gap-1 rounded-full border bg-accent/30 p-1">
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            mode === "quick" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ورود سریع
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            mode === "login" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ورود با رمز
        </button>
      </div>

      {mode === "quick" ? (
        <>
          <h1 className="text-lg font-extrabold">ورود با موبایل</h1>
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
          <Button className="mt-4 w-full" onClick={() => void submitQuick()} disabled={busy || !phoneIntl}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            ورود
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <button type="button" onClick={() => setMode("login")} className="font-extrabold text-primary hover:underline">
              ورود با رمز
            </button>
          </p>
        </>
      ) : (
        <>
          <h1 className="text-lg font-extrabold">ورود به iMach</h1>
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
          <Button className="mt-4 w-full" onClick={() => void submitLogin()} disabled={busy || !phoneIntl || password.length === 0}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            ورود
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <button type="button" onClick={() => setMode("quick")} className="font-extrabold text-primary hover:underline">
              ورود سریع
            </button>
          </p>
        </>
      )}
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
