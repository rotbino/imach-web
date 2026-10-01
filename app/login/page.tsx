"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { routeAfterAuth } from "@/app/start/start-wizard";
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
import { Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

/**
 * /login — ورود (فاز ۹ · طرح ۱۷ · د۱۰):
 * جریان موبایل-اول:
 *   ۱) شماره → checkPhone
 *   ۲) حساب با رمز → فرم رمز عبور → loginUser
 *      حسابِ ثبت‌نام سریع (بدون رمز) → ورود بی‌رمز همان لحظه (quickRegister)
 *      شماره‌ی تازه → دعوت به ساخت حساب (/start)
 * کد پیامکی (OTP) تجربه‌ی هدف است (د۱۰) — تا فعال‌شدن زیرساخت پیامک،
 * همین جریانِ موجود با ظاهر جدید کار می‌کند؛ ردیف رمز جای OTP نشسته است.
 * بعد از ورود → routeAfterAuth (بیزینس placeholder → /start؛ وگرنه بازوی فعال).
 */

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "ورود | iMach";
    // کاربرِ واردشده اینجا کاری ندارد → بازوی خودش
    if (status === "authed") router.replace(routeAfterAuth(useAuthStore.getState().businesses));
  }, [status, router]);

  if (status === "authed" || status === "booting") {
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
          <LoginFlow />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}

function LoginFlow() {
  const { toast } = useToast();
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const login = useAuthStore((s) => s.login);
  const quickRegister = useAuthStore((s) => s.quickRegister);

  const [step, setStep] = useState<"phone" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("IR");
  const [showCountry, setShowCountry] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noAccount, setNoAccount] = useState(false); // شماره‌ی تازه — دعوت به ثبت‌نام
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

  const next = async () => {
    if (!phoneIntl) {
      toast({ title: "شماره موبایل معتبر نیست", variant: "destructive" });
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
        title: "خطا",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
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
      router.replace(routeAfterAuth(useAuthStore.getState().businesses));
    } catch (err) {
      toast({
        title: "احراز هویت ناموفق بود",
        description: err instanceof ApiError ? err.message : "شماره یا رمز عبور را بررسی کنید",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-4">
      {/* لوگو + عنوان (طرح ۱۷) */}
      <div className="pt-6 text-center">
        <div className="grid place-items-center pb-1.5">
          <Image src="/logo3.svg" alt="iMach" width={110} height={38} priority />
        </div>
        <h1 className="text-[20px] font-bold">خوش آمدید</h1>
        <p className="mt-1.5 px-6 text-[12px] leading-[1.9] text-muted-foreground">
          {step === "phone" ? "شماره‌ای که با آن ثبت‌نام کرده‌اید را وارد کنید" : "رمز عبور حساب‌تان را وارد کنید"}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
        {step === "phone" ? (
          <>
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
              <Field label="شماره موبایل">
                <PhoneField value={phone} onChange={setPhone} countryCode={country} ariaLabel="موبایل" placeholder="912 345 6789" />
              </Field>
            </div>

            {noAccount && (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-500 text-[14px] font-bold text-white">!</span>
                <span className="grow text-[11.5px] leading-[1.9] text-amber-800">این شماره در ای‌مچ ثبت نشده است.</span>
                <Button size="sm" className="h-8 shrink-0 text-[11.5px]" onClick={() => router.push("/start?mode=register")}>
                  ساخت حساب
                </Button>
              </div>
            )}

            <Button className="mt-4 h-11 w-full text-[15px]" onClick={() => void next()} disabled={busy || !phoneIntl}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              ادامه
            </Button>
          </>
        ) : (
          <>
            {/* شماره تاییدشده + ویرایش (طرح ۱۶ — همان بنر) */}
            <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                <Check className="size-3.5" strokeWidth={2.4} />
              </span>
              <span dir="ltr" className="tnum grow text-start text-[14px] font-bold">
                {phoneIntl}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setPassword("");
                  setNoAccount(false);
                }}
                className="text-[11.5px] font-bold text-emerald-700 hover:underline"
              >
                ویرایش
              </button>
            </div>

            <Field label="رمز عبور">
              <div className="relative">
                <Input
                  dir="ltr"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submitPassword()}
                  autoComplete="current-password"
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "پنهان کردن رمز" : "نمایش رمز"}
                  className="absolute inset-y-0 end-2 grid place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Button className="mt-4 h-11 w-full text-[15px]" onClick={() => void submitPassword()} disabled={busy || password.length === 0}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              ورود به ای‌مچ
            </Button>
          </>
        )}
      </div>

      <p className="mt-3.5 text-center text-[12px] text-muted-foreground">
        حساب ندارید؟{" "}
        <Link href="/start?mode=register" className="font-extrabold text-primary-strong hover:underline">
          ساخت حساب
        </Link>
      </p>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-emerald-600" />
        ورود شما با رمز عبور امن است
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
