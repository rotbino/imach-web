"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref } from "@/lib/active-biz";
import { clearReferralCode, loadReferralCode, saveReferralCode } from "@/lib/referral";
import {
  guessCountryCode,
  langOfCountry,
  normalizeIntlPhone,
  fmtPhone,
  dialOf,
} from "@/lib/countries";
import { isLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-context";
import { AppHeader, AppFooter, MobileTabBar } from "@/app/components/chrome";
import { PhoneField, countrySelectItems } from "@/app/components/phone-field";
import { useMessages } from "@/i18n/messages/use-messages";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronDown, Loader2, Phone, TriangleAlert } from "lucide-react";

/**
 * مسیر شروع ساده‌شده — فقط موبایل (خواسته‌ی کاربر: «ثبت‌نام را راحت کنم»):
 *
 *   گام ۱ — شماره موبایل + کشور (پیش‌فرض: ایران)
 *     • ثبت‌نام سریع: فقط موبایل، بدون نام/پسورد. Business خودکار با نام
 *       «کاتالوگ شما» ساخته می‌شود. کاربر مستقیم وارد پنل می‌شود.
 *     • اگر شماره قبلاً با پسورد ثبت شده: کاربر باید وارد شود (رمز را بزند).
 *   گام ۲ — ورود (فقط اگر شماره قبلاً پسورد داشت): رمز عبور.
 *
 * کاربر بلافاصله وارد پنل می‌شود و هدر کاتالوگش به‌جای نام،
 * «عنوان کاتالوگ را وارد کنید» نشان می‌دهد تا با مدال تنظیمش کند.
 */
export default function StartWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const m = useMessages();
  const { status: authStatus } = useAuthStore();

  if (authStatus === "booting") {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // کاربر واردشده مستقیم به پنل خودش می‌رود
  if (authStatus === "authed") {
    if (typeof window !== "undefined") router.push(myArmHref());
    return null;
  }

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
// گام ۱ — شماره موبایل + کشور. اگر شماره ثبت‌نام سریع نشده، ثبت‌نام سریع.
// اگر قبلاً با پسورد ثبت شده، بریم به گام ۲ (ورود با رمز).
// ─────────────────────────────────────────────────────────────────────────────

function AuthStep() {
  const router = useRouter();
  const { toast } = useToast();
  const quickRegister = useAuthStore((s) => s.quickRegister);
  const login = useAuthStore((s) => s.login);
  const m = useMessages();
  const { locale, setLocale } = useLocale();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? loadReferralCode();

  useEffect(() => {
    const r = searchParams.get("ref");
    if (r) saveReferralCode(r);
  }, [searchParams]);

  // حالت: «quick» (ثبت‌نام سریع — پیش‌فرض) یا «login» (ورود با رمز)
  const [mode, setMode] = useState<"quick" | "login">(() =>
    searchParams.get("mode") === "login" ? "login" : "quick"
  );

  // فیلدها
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
          if (code !== country) {
            setPhone("");
          }
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

  // ── ثبت‌نام سریع — فقط موبایل
  const submitQuick = async () => {
    if (!phoneIntl) {
      toast({
        title: "شماره موبایل معتبر نیست",
        description: "کشور را درست انتخاب کنید و شماره را کامل و بدون صفر اول وارد کنید",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      await quickRegister(phoneIntl, country, refCode);
      clearReferralCode();
      toast({ title: "خوش آمدید!", description: "کاتالوگ شما ساخته شد — ادامه‌اش با خودت." });
      router.push(myArmHref());
    } catch (err) {
      if (err instanceof ApiError && err.code === "PHONE_HAS_PASSWORD") {
        // شماره قبلاً با رمز ثبت شده — برو به حالت ورود
        setPhoneTaken(true);
        setMode("login");
        toast({ title: "این شماره قبلاً ثبت شده — رمز را وارد کن", variant: "default" });
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

  // ── ورود با رمز — وقتی شماره قبلاً پسورد دارد
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
      toast({ title: "خوش آمدید!" });
      router.push(myArmHref());
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
      {/* دو حالت — کوچک، بالای کارت */}
      <div className="mx-auto mb-4 flex w-fit gap-1 rounded-full border bg-accent/30 p-1">
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            mode === "quick" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ثبت‌نام سریع
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
          <h1 className="text-lg font-extrabold">ورود با شماره موبایل</h1>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            فقط شماره موبایلت را وارد کن — کاتالوگ تو همین حالا ساخته می‌شود.
            ادامه‌اش (نام، صنف، شهر، لوگو) را بعداً از داخل پنل با یک کلیک کامل می‌کنی.
          </p>

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

          <Button
            className="mt-4 w-full"
            onClick={() => void submitQuick()}
            disabled={busy || !phoneIntl}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            ورود و ساخت کاتالوگ
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            قبلاً رمز عبور گذاشتی؟{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="font-extrabold text-primary hover:underline"
            >
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
          <Button
            className="mt-4 w-full"
            onClick={() => void submitLogin()}
            disabled={busy || !phoneIntl || password.length === 0}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            ورود
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className="font-extrabold text-primary hover:underline"
            >
              ثبت‌نام سریع (بدون رمز)
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
