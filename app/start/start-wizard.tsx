"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, type BusinessSummaryDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref, useArmStore } from "@/lib/active-biz";
import { useCreateBusiness } from "@/lib/queries";
import { clearReferralCode, loadReferralCode, saveReferralCode } from "@/lib/referral";
import { CITIES } from "@/lib/format";
import {
  LANGUAGES,
  guessCountryCode,
  langOfCountry,
  normalizeIntlPhone,
} from "@/lib/countries";
// زبانِ فرم هرگز state مستقل نیست — از کشور مشتق می‌شود تا هیچ مسیری
// (حتی تغییر کشور در تب ورود) نتواند زبان و کشور را از هم بگسلد.
import { isLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-context";
import { AppHeader, AppFooter, MobileTabBar } from "@/app/components/chrome";
import { LanguageSelect } from "@/app/components/language-select";
import { ListingForm } from "@/app/components/listing-form";
import { PhoneField, countrySelectItems } from "@/app/components/phone-field";
import { useMessages } from "@/i18n/messages/use-messages";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";

/*
 * مسیر شروع — بدون نوار مراحل (خواسته‌ی کاربر: فرم خلوت باشد):
 *   ۱) حساب — ورود / ثبت‌نام؛ ثبت‌نام همزمان نام کسب‌وکار + شهر + کشور و
 *      زبان می‌گیرد (نام کسب‌وکار با توضیح نرم: کشاورز هم می‌تواند اسم خودش
 *      را بنویسد) و بلافاصله کاتالوگ ساخته می‌شود — یک قدم به جلو.
 *   ۲) کسب‌وکار — فقط برای کاربر واردشده که «کسب‌وکار جدید» می‌سازد، یا
 *      پشتیبانِ اگر ساخت خودکار ناموفق ماند (با مقادیر تایپ‌شده پر می‌شود).
 *   ۳) اولین کالا — فروش یا خرید؛ همین انتخاب تعیین می‌کند کاربر وارد کدام
 *      بازو شود.
 *
 * کشور: با timezone مرورگر خودکار حدس زده می‌شود (لوکیشن تقریبی، بدون VPN-گولی)
 * و کاربر می‌تواند عوضش کند. با تغییر کشور، کد تلفن و زبانِ رسمی خودکار
 * می‌آیند؛ زبان را کاربر مستقل هم می‌تواند عوض کند. شماره موبایل با کد کشور و
 * بدون صفر اول ذخیره می‌شود تا شناسه‌ی یکتای جهانی باشد.
 */

const LANGUAGE_ITEMS = LANGUAGES.map((l) => ({
  value: l.code,
  label: l.label,
  keywords: [l.code],
}));

const CITY_ITEMS = CITIES.map((c) => ({ value: c, label: c }));

export default function StartWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const m = useMessages();
  const { status: authStatus } = useAuthStore();
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState<BusinessSummaryDto | null>(null);
  const [bizIntent, setBizIntent] = useState<{ name: string; city: string } | null>(null);
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
  // می‌شود — قدم جداگانه حذف. اگر ساخت شکست، گام ۲ با مقادیر پرشده می‌آید.
  const handleRegistered = async (intent: { name: string; city: string }) => {
    setCreatingBiz(true);
    setBizIntent(intent);
    try {
      const created = await createBiz.mutateAsync(intent);
      setBiz(created);
      setStep(3);
    } catch {
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
// گام ۱ — حساب: ورود (می‌رود به پنل) یا ثبت‌نام (کاتالوگ فوری می‌سازد)
// ─────────────────────────────────────────────────────────────────────────────

function AuthStep({
  onLoggedIn,
  onRegistered,
}: {
  onLoggedIn: () => void;
  onRegistered: (intent: { name: string; city: string }) => void;
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

  const [tab, setTab] = useState<"login" | "register">("login");
  const [bizName, setBizName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("IR");
  // زبان = زبان رسمی کشور، مگر کاربر خودش دستی انتخاب کرده باشد؛
  // تغییر کشور انتخاب دستی را پاک می‌کند — پس زبان همیشه با کشور می‌آید،
  // ولی تغییر زبان هرگز کشور را عوض نمی‌کند (قانون یک‌طرفه‌ی کاربر).
  const [langOverride, setLangOverride] = useState<string | null>(null);
  const language = langOverride ?? langOfCountry(country);
  const [busy, setBusy] = useState(false);
  const guessed = useRef(false);

  // لوکیشن تقریبی: کشور از timezone مرورگر — سمت کلاینت، یک‌بار
  // (در رندر اولیه IR می‌ماند تا hydration mismatch نشود؛
  // زبان لازم نیست جدا ست شود — از کشور مشتق می‌شود)
  useEffect(() => {
    if (guessed.current) return;
    guessed.current = true;
    setCountry(guessCountryCode());
  }, []);

  // تغییر کشور → کد تلفن و زبان رسمی خودکار می‌آیند (در هر دو تب)
  const pickCountry = (code: string) => {
    setCountry(code);
    setLangOverride(null); // زبان دوباره از کشورِ تازه مشتق شود
    const lang = langOfCountry(code);
    if (isLocale(lang)) setLocale(lang); // زبان پشتیبانی‌شده‌ی UI — فورا اعمال شود
  };

  // تغییر دستی زبان — فقط زبان؛ کشور دست‌نخورده می‌ماند
  const pickLanguage = (code: string) => {
    setLangOverride(code);
    if (isLocale(code)) setLocale(code);
  };

  const submit = async () => {
    if (tab === "login") {
      const phoneIntl = normalizeIntlPhone(phone, country);
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
      } finally {
        setBusy(false);
      }
      return;
    }

    // ── ثبت‌نام ──
    const phoneIntl = normalizeIntlPhone(phone, country);
    if (!phoneIntl) {
      toast({ title: m.auth.toasts.invalidPhone, description: m.auth.toasts.invalidPhoneDesc, variant: "destructive" });
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
    if (password.length < 6) {
      toast({ title: m.auth.toasts.passwordShort, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await register(bizName.trim(), phoneIntl, password, country, language, refCode);
      clearReferralCode();
      toast({ title: m.auth.toasts.welcome });
      // ادامه در والد: ساخت فوری کاتالوگ با همین نام و شهر
      onRegistered({ name: bizName.trim(), city: city.trim() });
    } catch (err) {
      toast({
        title: m.auth.toasts.authFailed,
        description: err instanceof ApiError ? err.message : m.auth.toasts.tryAgain,
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <h1 className="text-lg font-extrabold">
          {tab === "login" ? m.auth.titleLogin : m.auth.titleRegister}
        </h1>
        <LanguageSelect />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{m.auth.tabs.login}</TabsTrigger>
          <TabsTrigger value="register">{m.auth.tabs.register}</TabsTrigger>
        </TabsList>

        {/* ── ورود — کشور هم دارد (کد تلفن از لیست کشور می‌آید) ── */}
        <TabsContent value="login" className="mt-4 grid gap-3">
          <div className="space-y-4">
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
            <Field label={m.auth.fields.mobile}>
              <PhoneField
                value={phone}
                onChange={setPhone}
                countryCode={country}
                ariaLabel={m.auth.fields.mobile}
                placeholder={m.auth.placeholders.mobile}
              />
            </Field>
          </div>
          <Field label={m.auth.fields.password}>
            <Input
              dir="ltr"
              type="password"
              placeholder={m.auth.placeholders.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </TabsContent>

        {/* ── ثبت‌نام — نام کسب‌وکار + شهر + کشور/زبان + موبایل + رمز ── */}
        <TabsContent value="register" className="mt-4 grid gap-3">
          <Field label={m.auth.fields.bizName} hint={m.auth.hints.bizName}>
            <Input
              placeholder={m.auth.placeholders.bizName}
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
            <Field label={m.auth.fields.language}>
              <SearchSelect
                items={LANGUAGE_ITEMS}
                value={language}
                onChange={pickLanguage}
                placeholder={m.auth.fields.language}
                searchPlaceholder={m.auth.search.language}
                emptyText={m.auth.search.empty}
                ariaLabel={m.auth.fields.language}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={m.auth.fields.mobile}>
              <PhoneField
                value={phone}
                onChange={setPhone}
                countryCode={country}
                ariaLabel={m.auth.fields.mobile}
                placeholder={m.auth.placeholders.mobile}
              />
            </Field>
            <Field label={m.auth.fields.passwordRegister}>
              <Input
                dir="ltr"
                type="password"
                placeholder={m.auth.placeholders.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>
          <Field label={m.auth.fields.city}>
            {country === "IR" ? (
              <SearchSelect
                items={CITY_ITEMS}
                value={city}
                onChange={setCity}
                placeholder={m.auth.placeholders.city}
                searchPlaceholder={m.auth.search.city}
                emptyText={m.auth.search.empty}
                ariaLabel={m.auth.fields.city}
              />
            ) : (
              <Input
                placeholder={m.auth.placeholders.cityOther}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            )}
          </Field>
        </TabsContent>
      </Tabs>

      <Button className="mt-4 w-full" onClick={() => void submit()} disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {tab === "login" ? m.auth.submitLogin : m.auth.submitRegister}
      </Button>
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
      <h1 className="text-lg font-extrabold">کسب‌وکار خود را معرفی کنید</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        نام و شهر — همین و بس. بعدش اولین کالای‌تان را ثبت می‌کنید.
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
              items={CITY_ITEMS}
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
