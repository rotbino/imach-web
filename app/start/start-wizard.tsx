"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, ApiError, type BusinessSummaryDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref, useArmStore } from "@/lib/active-biz";
import { useCreateBusiness } from "@/lib/queries";
import { clearReferralCode, loadReferralCode, saveReferralCode } from "@/lib/referral";
import { iranCityItems, provinceOfCity } from "@/lib/iran-geo";
import {
  guessCountryCode,
  langOfCountry,
  normalizeIntlPhone,
} from "@/lib/countries";
// زبانِ فرم هرگز state مستقل نیست — از کشور مشتق می‌شود؛ انتخاب دستی زبان
// حذف شد (ثبت‌نام حرفه‌ای: کشور پنهان است، زبان خودکار می‌آید).
import { isLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-context";
import { AppHeader, AppFooter, MobileTabBar } from "@/app/components/chrome";
import { ListingForm } from "@/app/components/listing-form";
import { PhoneField, countrySelectItems } from "@/app/components/phone-field";
import { useMessages } from "@/i18n/messages/use-messages";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";

/*
 * مسیر شروع — بدون نوار مراحل (خواسته‌ی کاربر: فرم خلوت باشد):
 *   ۱) حساب — ورود / ثبت‌نام دومرحله‌ای (بدون نشانگر مرحله):
 *        گام ۱ — هویت شخص: نام، نام خانوادگی، موبایل، رمز (سنجش قدرت + اعتبارسنجی
 *        زنده؛ تنها بررسی غیرهمگام: شماره قبلاً ثبت نشده باشد — checkPhone).
 *        گام ۲ — هویت کسب‌وکار: نام کسب‌وکار (نرم: کشاورز می‌تواند بنویسد
 *        «مزرعه احمد») + شهر؛ کشور و زبان پنهان‌اند (لینک «کشور رو عوض کن»).
 *      ثبت‌نام یک POST واحد است و بلافاصله کاتالوگ ساخته می‌شود —
 *      خوش‌آمد شخصی‌سازی‌شده: «خوش اومدی، احمد! کاتالوگ «نان آرتا» ساخته شد».
 *   ۲) کسب‌وکار — فقط برای کاربر واردشده که «کسب‌وکار جدید» می‌سازد، یا
 *      پشتیبانِ اگر ساخت خودکار ناموفق ماند (با مقادیر تایپ‌شده پر می‌شود).
 *   ۳) اولین کالا — فروش یا خرید؛ با دکمه‌ی «بعداً، بذار توی کاتالوگم».
 *
 * هویت شخص از روز اول جدا از نام کسب‌وکار ذخیره می‌شود — در عمده‌فروشی
 * ایرانی طرف می‌خواهد بداند با چه کسی معامله می‌کند؛ نام شخص در ویترین
 * کاتالوگ هم می‌آید (عکس بعداً).
 *
 * کشور: با timezone مرورگر خودکار حدس زده می‌شود؛ شماره موبایل با کد کشور و
 * بدون صفر اول ذخیره می‌شود تا شناسه‌ی یکتای جهانی باشد. شهر: دراپ‌داون
 * سرچ‌دار روی «همه‌ی شهرهای ایران»؛ استان پشت‌صحنه (فرانت فقط).
 */

export default function StartWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const m = useMessages();
  const { status: authStatus } = useAuthStore();
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState<BusinessSummaryDto | null>(null);
  const [bizIntent, setBizIntent] = useState<{ firstName?: string; name: string; city: string } | null>(null);
  const [creatingBiz, setCreatingBiz] = useState(false);
  const createBiz = useCreateBusiness();

  if (authStatus === "booting") {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // کاربر واردشده به‌هیچ‌وجه گام حساب را نمی‌بیند؛
  // ورود از مسیر پنل برای «کسب‌وکار جدید» هم همین‌جا رندر می‌شود.
  const current = authStatus === "guest" ? 1 : Math.max(step, 2);

  // ── بعد از ثبت‌نام: کاتالوگ با همان نام و شهری که کاربر تایپ کرده ساخته
  // می‌شود و خوش‌آمد شخصی‌سازی‌شده می‌آید — «خوش اومدی، احمد! کاتالوگ
  // «نان آرتا» ساخته شد». اگر ساخت شکست، گام ۲ با مقادیر پرشده می‌آید.
  const handleRegistered = async (intent: { firstName: string; name: string; city: string }) => {
    setCreatingBiz(true);
    setBizIntent(intent);
    try {
      const created = await createBiz.mutateAsync({ name: intent.name, city: intent.city });
      setBiz(created);
      toast({
        title: m.auth.toasts.welcomePersonal.replace("{name}", intent.firstName).replace("{biz}", created.name),
      });
      setStep(3);
    } catch {
      toast({ title: m.auth.toasts.welcomeNoBiz.replace("{name}", intent.firstName) });
      setStep(2);
    } finally {
      setCreatingBiz(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-8">
          {creatingBiz && (
            <div className="rounded-2xl border bg-white p-10 shadow-sm" data-testid="creating-biz">
              <div className="grid place-items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                {m.auth.creatingBiz}
              </div>
            </div>
          )}

          {!creatingBiz && current === 1 && (
            <AuthStep
              onLoggedIn={() => router.push(myArmHref())}
              onRegistered={(intent) => void handleRegistered(intent)}
            />
          )}

          {!creatingBiz && current === 2 && (
            <BusinessStep
              initialName={bizIntent?.name ?? ""}
              initialCity={bizIntent?.city ?? ""}
              onCreated={(b) => {
                setBiz(b);
                setStep(3);
              }}
            />
          )}

          {!creatingBiz && current === 3 && biz && <FirstGoodStep biz={biz} />}
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// گام ۱ — حساب: ورود (می‌رود به پنل) یا ثبت‌نام دومرحله‌ای بدون تب‌ها و
// بدون نوار مرحله — لینک‌های متنی مثل گوگل/گیت‌هاب، اعتبارسنجی زنده،
// سنجش قدرت رمز، کشور پنهان، و خوش‌آمد شخصی‌سازی‌شده بعد از ساخت کاتالوگ.
// ─────────────────────────────────────────────────────────────────────────────

function AuthStep({
  onLoggedIn,
  onRegistered,
}: {
  onLoggedIn: () => void;
  onRegistered: (intent: { firstName: string; name: string; city: string }) => void;
}) {
  const { toast } = useToast();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const m = useMessages(); // ورود/ثبت‌نام — دوزبانه (fa/en)
  const { locale, setLocale } = useLocale();
  const searchParams = useSearchParams();
  // کد رفرال — از ?ref= لینک دعوت، یا آخرین کد ذخیره‌شده (گیت تماس)
  const refCode = searchParams.get("ref") ?? loadReferralCode();
  useEffect(() => {
    const r = searchParams.get("ref");
    if (r) saveReferralCode(r);
  }, [searchParams]);

  // تب ≠ اینجا؛ سوییچ ورود/ثبت‌نام با لینک متنی زیر فرم انجام می‌شود
  const [mode, setMode] = useState<"login" | "register">("login");
  // گام ۱ هویت شخص (نام/نام خانوادگی/موبایل/رمز) → گام ۲ هویت کسب‌وکار
  const [rStep, setRStep] = useState<1 | 2>(1);

  // ── فیلدهای مشترک
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("IR");
  // کشور/زبان پیش‌فرض پنهان‌اند؛ با لینک کوچک «کشور رو عوض کن» باز می‌شوند
  const [showCountry, setShowCountry] = useState(false);

  // ── ثبت‌نام گام ۱ — هویت شخص (جدای از کسب‌وکار؛ اعتمادِ عمده‌فروشی)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // ── ثبت‌نام گام ۲ — هویت کسب‌وکار
  const [bizName, setBizName] = useState("");
  const [city, setCity] = useState("");
  // استان — فقط فرانت: از سطرِ انتخاب‌شده‌ی دراپ‌داون شهر ست می‌شود، به کاربر
  // نشان داده نمی‌شود و به هیچ API‌ای نمی‌رود (پایه‌ی سورتِ استانی تطابق آینده)
  const [province, setProvince] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const guessed = useRef(false);

  // ── زبانِ UI = زبانِ پشتیبانی‌شده‌ی کشور — ایران/افغانستان → فارسی،
  // بقیه → انگلیسی (UI فعلا دوزبانه است). هم برای حدس اولیه و هم تغییر دستی؛
  // نکته‌ی حیاتی: کاربر ایرانی با ویندوز/مرورگر انگلیسی Accept-Language=en می‌فرستد
  // و سرور انگلیسی رندر می‌کند — بدون این سینک، زبان فقط با انتخاب دستیِ مجدد
  // کشور فارسی می‌شد و کاربر فارسی‌زبان فرم را نمی‌فهمید و می‌رفت.
  const syncLangWithCountry = (code: string) => {
    const lang = langOfCountry(code);
    const target = isLocale(lang) ? lang : "en"; // زبان رسمیِ پشتیبانی‌نشده → انگلیسی
    if (target !== locale) setLocale(target); // گارد: refresh بی‌خودیِ سرور ممنوع
  };

  // لوکیشن تقریبی: کشور از timezone مرورگر — سمت کلاینت، یک‌بار
  // (در رندر اولیه IR می‌ماند تا hydration mismatch نشود)
  useEffect(() => {
    if (guessed.current) return;
    guessed.current = true;
    const c = guessCountryCode();
    setCountry(c);
    syncLangWithCountry(c); // زبان هم با کشورِ حدسی هماهنگ شود — نه فقط با انتخاب دستی
    if (c !== "IR") setShowCountry(true); // کاربر غیر ایران — سلیکت از اول باز
    // eslint-disable-next-line react-hooks/exhaustive-deps -- یک‌بار در mount؛ locale از رندر اول همین است
  }, []);

  // تغییر شماره/کشور → خطای «شماره قبلاً ثبت شده» قدیمی معتبر نیست
  useEffect(() => setPhoneTaken(false), [phone, country]);

  const pickCountry = (code: string) => {
    setCountry(code);
    syncLangWithCountry(code); // زبان پشتیبانی‌شده‌ی UI — فورا اعمال شود
    if (code !== country) {
      setCity(""); // شهر و استانِ کشور قبلی معنا ندارند
      setProvince(null);
    }
  };

  const phoneIntl = normalizeIntlPhone(phone, country);
  const showCountrySelect = showCountry || country !== "IR";
  const language = langOfCountry(country); // زبان = زبان رسمی کشور؛ بدون UI جدا

  // ── اعتبارسنجی زنده — دکمه تا معتبر شدنِ کامل غیرفعال است (نه خطای دیرهنگام)
  const step1Valid =
    firstName.trim().length >= 2 && lastName.trim().length >= 2 && !!phoneIntl && password.length >= 6;
  const step2Valid = bizName.trim().length >= 2 && city.trim().length >= 2;

  // ── سنجش قدرت رمز (طول‌محور): قرمز <۶ / کهربایی ۶–۹ / سبز ۱۰+
  const pwLen = password.length;
  const pwTier = pwLen === 0 ? 0 : pwLen < 6 ? 1 : pwLen < 10 ? 2 : 3;
  const pwBar =
    pwTier === 0 ? "" : pwTier === 1 ? "bg-red-500" : pwTier === 2 ? "bg-amber-500" : "bg-emerald-500";
  const pwTextCls =
    pwTier === 0 ? "" : pwTier === 1 ? "text-red-500" : pwTier === 2 ? "text-amber-500" : "text-emerald-600";
  const pwLabel =
    pwTier === 0
      ? ""
      : pwTier === 1
        ? m.auth.pwStrength.weak
        : pwTier === 2
          ? m.auth.pwStrength.medium
          : m.auth.pwStrength.strong;

  // ── ورود
  const submitLogin = async () => {
    if (!phoneIntl) {
      toast({ title: m.auth.toasts.invalidPhone, description: m.auth.toasts.invalidPhoneDesc, variant: "destructive" });
      return;
    }
    if (password.length === 0) {
      toast({ title: m.auth.toasts.passwordShort, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await login(phoneIntl, password, country);
      toast({ title: m.auth.toasts.welcome });
      onLoggedIn(); // لاگین → مستقیم بازوی من
    } catch (err) {
      toast({
        title: m.auth.toasts.authFailed,
        description: err instanceof ApiError ? err.message : m.auth.toasts.tryAgain,
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  // ── ثبت‌نام گام ۱ → ۲: تنها بررسی غیرهمگامِ فرم — شماره قبلاً ثبت نشده باشد؛
  // اگر endpoint موقتا خطا داد، ثبت‌نام نهایی خودش دوباره چک می‌کند — گیر نمی‌کنیم.
  const continueToBiz = async () => {
    if (!phoneIntl) {
      toast({ title: m.auth.toasts.invalidPhone, description: m.auth.toasts.invalidPhoneDesc, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const r = await authApi.checkPhone({ phone: phoneIntl, country });
      if (!r.available) {
        setPhoneTaken(true);
        toast({ title: m.auth.toasts.phoneTaken, variant: "destructive" });
        setBusy(false);
        return;
      }
      setRStep(2);
    } catch {
      setRStep(2);
    } finally {
      setBusy(false);
    }
  };

  // ── ثبت‌نام گام ۲ — یک POST واحد؛ کاتالوگ بلافاصله در والد ساخته می‌شود
  const submitRegister = async () => {
    if (!phoneIntl) {
      toast({ title: m.auth.toasts.invalidPhone, description: m.auth.toasts.invalidPhoneDesc, variant: "destructive" });
      setRStep(1);
      return;
    }
    if (bizName.trim().length < 2) {
      toast({ title: m.auth.toasts.nameRequired, variant: "destructive" });
      return;
    }
    if (city.trim().length < 2) {
      toast({ title: m.auth.toasts.cityRequired, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await register(firstName.trim(), lastName.trim(), phoneIntl, password, country, language, refCode);
      clearReferralCode();
      // خوش‌آمد شخصی‌سازی‌شده در والد، بعد از ساخت کاتالوگ
      onRegistered({ firstName: firstName.trim(), name: bizName.trim(), city: city.trim() });
    } catch (err) {
      if (err instanceof ApiError && err.code === "PHONE_TAKEN") {
        setPhoneTaken(true);
        setRStep(1); // شماره اشتباه است — برگرد به گام ۱ و درستش کن
      }
      toast({
        title: m.auth.toasts.authFailed,
        description: err instanceof ApiError ? err.message : m.auth.toasts.tryAgain,
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  // کشور — پیش‌فرض پنهان؛ با لینک کوچک «کشور رو عوض کن» باز می‌شود
  // (سه‌جا استفاده می‌شود: ورود / گام ۱ / گام ۲)
  const countryField = showCountrySelect ? (
    <Field label={m.auth.fields.country}>
      <SearchSelect
        items={countrySelectItems}
        value={country}
        onChange={pickCountry}
        placeholder={m.auth.fields.country}
        searchPlaceholder={m.auth.search.country}
        emptyText={m.auth.search.empty}
        ariaLabel={m.auth.fields.country}
      />
    </Field>
  ) : (
    <button
      type="button"
      onClick={() => setShowCountry(true)}
      className="self-start text-[11px] text-primary hover:underline"
    >
      {m.auth.changeCountry}
    </button>
  );

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      {/* ── ورود — موبایل + رمز؛ کشور پنهان ── */}
      {mode === "login" && (
        <>
          <h1 className="text-lg font-extrabold">{m.auth.titleLogin}</h1>
          <div className="mt-4 grid gap-3">
            <Field label={m.auth.fields.mobile}>
              <PhoneField
                value={phone}
                onChange={setPhone}
                countryCode={country}
                ariaLabel={m.auth.fields.mobile}
                placeholder={m.auth.placeholders.mobile}
              />
              {phoneTaken && <p className="text-[11px] font-bold text-red-500">{m.auth.toasts.phoneTaken}</p>}
            </Field>
            {countryField}
            <Field label={m.auth.fields.password}>
              <Input
                dir="ltr"
                type="password"
                placeholder={m.auth.placeholders.password}
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
            {m.auth.submitLogin}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setRStep(1);
              }}
              className="font-extrabold text-primary hover:underline"
            >
              {m.auth.links.toRegister}
            </button>
          </p>
        </>
      )}

      {/* ── ثبت‌نام گام ۱ — هویت شخص: نام، نام خانوادگی، موبایل، رمز ── */}
      {mode === "register" && rStep === 1 && (
        <>
          <h1 className="text-lg font-extrabold">{m.auth.steps.accountTitle}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{m.auth.steps.accountDesc}</p>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={m.auth.fields.firstName}>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={m.auth.placeholders.firstName}
                  autoComplete="given-name"
                />
              </Field>
              <Field label={m.auth.fields.lastName}>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={m.auth.placeholders.lastName}
                  autoComplete="family-name"
                />
              </Field>
            </div>
            <Field label={m.auth.fields.mobile}>
              <PhoneField
                value={phone}
                onChange={setPhone}
                countryCode={country}
                ariaLabel={m.auth.fields.mobile}
                placeholder={m.auth.placeholders.mobile}
              />
              {phoneTaken && <p className="text-[11px] font-bold text-red-500">{m.auth.toasts.phoneTaken}</p>}
            </Field>
            {countryField}
            <Field label={m.auth.fields.passwordRegister}>
              <Input
                dir="ltr"
                type="password"
                placeholder={m.auth.placeholders.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              {pwLen > 0 && (
                <div className="flex items-center gap-2" aria-label={pwLabel}>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${pwBar}`}
                      style={{ width: `${(Math.min(pwLen, 12) / 12) * 100}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-extrabold ${pwTextCls}`}>{pwLabel}</span>
                </div>
              )}
              <p className="text-[10px] leading-4 text-muted-foreground">{m.auth.hints.password}</p>
            </Field>
          </div>
          <Button className="mt-4 w-full" onClick={() => void continueToBiz()} disabled={busy || !step1Valid}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {m.auth.continue}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <button type="button" onClick={() => setMode("login")} className="font-extrabold text-primary hover:underline">
              {m.auth.links.toLogin}
            </button>
          </p>
        </>
      )}

      {/* ── ثبت‌نام گام ۲ — هویت کسب‌وکار: نام کسب‌وکار + شهر ── */}
      {mode === "register" && rStep === 2 && (
        <>
          <h1 className="text-lg font-extrabold">{m.auth.steps.bizTitle}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{m.auth.steps.bizDesc}</p>
          <div className="mt-4 grid gap-3">
            <Field label={m.auth.fields.bizName} hint={m.auth.hints.bizName}>
              <Input
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder={m.auth.placeholders.bizName}
              />
            </Field>
            <Field label={m.auth.fields.city}>
              {country === "IR" ? (
                <SearchSelect
                  items={iranCityItems}
                  value={city}
                  onChange={setCity}
                  // استان از همین سطر ست می‌شود — کاربر اصلا درگیر انتخاب استان نیست
                  onPick={(item) => {
                    setCity(item.value);
                    setProvince(item.hint ?? provinceOfCity(item.value));
                  }}
                  placeholder={m.auth.placeholders.city}
                  searchPlaceholder={m.auth.search.city}
                  emptyText={m.auth.search.empty}
                  ariaLabel={m.auth.fields.city}
                />
              ) : (
                <Input
                  placeholder={m.auth.placeholders.cityOther}
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setProvince(null);
                  }}
                />
              )}
            </Field>
            {countryField}
          </div>
          <Button className="mt-4 w-full" onClick={() => void submitRegister()} disabled={busy || !step2Valid}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {m.auth.submitRegister}
          </Button>
          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setRStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {m.auth.back}
            </button>
          </p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// گام ۲ — کسب‌وکار: فقط برای کاربر واردشده (کسب‌وکار جدید از پنل) یا پشتیبان
// ثبت‌نام؛ با مقادیر تایپ‌شده‌ی فرم ثبت‌نام از قبل پر می‌شود.
// ─────────────────────────────────────────────────────────────────────────────

function BusinessStep({
  initialName,
  initialCity,
  onCreated,
}: {
  initialName?: string;
  initialCity?: string;
  onCreated: (biz: BusinessSummaryDto) => void;
}) {
  const { toast } = useToast();
  const createMutation = useCreateBusiness();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(initialName ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const country = user?.country ?? "IR";

  const create = async () => {
    if (name.trim().length < 2) {
      toast({ title: "نام کسب‌وکار را بنویسید", variant: "destructive" });
      return;
    }
    if (!city) {
      toast({ title: "شهر را انتخاب کنید", variant: "destructive" });
      return;
    }
    try {
      const created = await createMutation.mutateAsync({ name: name.trim(), city });
      toast({ title: "کسب‌وکار ساخته شد", description: created.name });
      onCreated(created);
    } catch (err) {
      toast({
        title: "ساخت کسب‌وکار ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-extrabold">کاتالوگ شما ساخته شد</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        تایید و اولین کالا را وارد کنید
      </p>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="biz-name">نام کسب‌وکار *</Label>
          <Input
            id="biz-name"
            placeholder="مثلا سوپرمارکت آریا"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>شهر *</Label>
          {country === "IR" ? (
            <SearchSelect
              items={iranCityItems}
              value={city}
              onChange={setCity}
              placeholder="شهر را انتخاب کنید"
              searchPlaceholder="جست‌وجوی شهر…"
              emptyText="پیدا نشد"
              ariaLabel="شهر"
            />
          ) : (
            <Input
              placeholder="مثلا Istanbul"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          )}
        </div>
      </div>

      <Button className="mt-5 w-full" onClick={() => void create()} disabled={createMutation.isPending}>
        {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        ذخیره و ثبت اولین کالا
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// گام ۳ — اولین کالا: کاربر خودش برمی‌گزیند اولین ثبتش «فروش» باشد یا «خرید»؛
// همین انتخاب تعیین می‌کند وارد کدام صفحه شود (کاتالوگ فروش من یا دستیار خرید)
// (فرم مشترکِ ثبت کالا در app/components/listing-form.tsx است)
// ─────────────────────────────────────────────────────────────────────────────

function FirstGoodStep({ biz }: { biz: BusinessSummaryDto }) {
  const router = useRouter();
  return (
    <ListingForm
      bizId={biz.id}
      currency={biz.currency}
      firstGood
      // «بعداً، بذار توی کاتالوگم» — ثبت‌نام هرگز به ثبت کالا گروگان نیست
      onSkip={() => {
        useArmStore.getState().setArm("sell");
        router.push(myArmHref());
      }}
      onSaved={(kind) => {
        // اولین کالا، در بازوی همان کالا باز می‌شود (سوییچ بعدا از هدر ممکن است)
        useArmStore.getState().setArm(kind);
        router.push(kind === "sell" ? "/sell" : "/buy");
      }}
    />
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
