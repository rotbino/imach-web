"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, type BusinessSummaryDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref, useArmStore } from "@/lib/active-biz";
import { useCreateBusiness } from "@/lib/queries";
import { CITIES, fa, normalizePhone, COUNTRIES, countryLabel } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { AppHeader, AppFooter, MobileTabBar } from "@/app/components/chrome";
import { LanguageSelect } from "@/app/components/language-select";
import { ListingForm } from "@/app/components/listing-form";
import { useMessages } from "@/i18n/messages/use-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";

/*
 * ویزارد افقی شروع — یک مرحله در هر لحظه:
 *   ۱) حساب (ورود / ثبت‌نام)      ← ورود مستقیم به صفحه‌ی خودِ کاربر می‌رود
 *   ۲) کسب‌وکار (نام + شهر)       ← بدون موبایل، بدون نقش
 *   ۳) اولین کالا                 ← فروش یا خرید، انتخاب با خود کاربر؛
 *     همین انتخاب تعیین می‌کند کاربر وارد کدام بازو شود:
 *     فروش → کاتالوگ فروش من، خرید → دستیار خرید — شاید هیچ‌وقت سوییچ نخواهد کرد.
 */

const STEPS: { title: string }[] = [
  { title: "حساب" },
  { title: "کسب‌وکار" },
  { title: "اولین کالا" },
];

export default function StartWizard() {
  const router = useRouter();
  const { status: authStatus } = useAuthStore();
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState<BusinessSummaryDto | null>(null);

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

  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* نشانگر افقی مراحل */}
          <ol className="mb-6 flex items-center gap-2" aria-label="مراحل ثبت‌نام">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = n < current;
              const active = n === current;
              return (
                <li key={s.title} className="flex flex-1 items-center gap-2">
                  <span
                    aria-current={active ? "step" : undefined}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : done
                          ? "bg-accent text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`grid size-4.5 place-items-center rounded-full text-[10px] ${
                        active ? "bg-white/25" : done ? "bg-primary text-white" : "bg-white"
                      }`}
                    >
                      {done ? <Check className="size-3" /> : fa(n)}
                    </span>
                    {s.title}
                  </span>
                  {n < STEPS.length && <span className="h-px grow bg-border" aria-hidden />}
                </li>
              );
            })}
          </ol>

          <div key={current} className="animate-step-slide">
            {current === 1 && (
              <AuthStep
                // ورود موفق → مستقیم صفحه‌ی خود کاربر (آخرین بازو)
                onLoggedIn={() => router.push(myArmHref())}
                onRegistered={() => setStep(2)}
              />
            )}
            {current === 2 && (
              <BusinessStep
                onCreated={(b) => {
                  setBiz(b);
                  setStep(3);
                }}
              />
            )}
            {current === 3 && biz && <FirstGoodStep biz={biz} />}
          </div>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// گام ۱ — حساب: ورود (می‌رود به پنل) یا ثبت‌نام (ادامه به کسب‌وکار)
// ─────────────────────────────────────────────────────────────────────────────

function AuthStep({
  onLoggedIn,
  onRegistered,
}: {
  onLoggedIn: () => void;
  onRegistered: () => void;
}) {
  const { toast } = useToast();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const m = useMessages(); // ورود/ثبت‌نام — دوزبانه (fa/en)
  const { locale } = useLocale();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("IR"); // واحد پول کاتالوگ از همین‌جا می‌آید
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const phoneNorm = normalizePhone(phone);
    if (!/^09\d{9}$/.test(phoneNorm)) {
      toast({ title: m.auth.toasts.invalidPhone, description: m.auth.toasts.invalidPhoneDesc, variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: m.auth.toasts.passwordShort, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (tab === "login") {
        await login(phoneNorm, password);
        toast({ title: m.auth.toasts.welcome });
        onLoggedIn(); // لاگین → مستقیم بازوی من
      } else {
        if (name.trim().length < 2) {
          toast({ title: m.auth.toasts.nameRequired, variant: "destructive" });
          setBusy(false);
          return;
        }
        await register(name.trim(), phoneNorm, password, country);
        toast({ title: m.auth.toasts.welcome });
        onRegistered(); // ثبت‌نام → ادامه ساخت کسب‌وکار
      }
    } catch (err) {
      toast({
        title: m.auth.toasts.authFailed,
        description: err instanceof ApiError ? err.message : m.auth.toasts.tryAgain,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-extrabold">
            {tab === "login" ? m.auth.titleLogin : m.auth.titleRegister}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">{m.auth.subtitle}</p>
        </div>
        <LanguageSelect />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{m.auth.tabs.login}</TabsTrigger>
          <TabsTrigger value="register">{m.auth.tabs.register}</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-4 grid gap-3">
          <PhoneField label={m.auth.fields.mobile} value={phone} onChange={setPhone} placeholder={m.auth.placeholders.mobile} />
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

        <TabsContent value="register" className="mt-4 grid gap-3">
          <Field label={m.auth.fields.fullName}>
            <Input placeholder={m.auth.placeholders.fullName} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <PhoneField label={m.auth.fields.mobile} value={phone} onChange={setPhone} placeholder={m.auth.placeholders.mobile} />
          <Field label={m.auth.fields.passwordRegister}>
            <Input
              dir="ltr"
              type="password"
              placeholder={m.auth.placeholders.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label={m.auth.fields.country}>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger aria-label={m.auth.fields.country}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {countryLabel(c.code, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] leading-4 text-muted-foreground">{m.auth.hints.country}</p>
          </Field>
        </TabsContent>
      </Tabs>
      <div className={"p-4"}>
         09120000000 / ImachDemo1234
      </div>

      <Button className="mt-4 w-full" onClick={() => void submit()} disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {tab === "login" ? m.auth.submitLogin : m.auth.submitRegister}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// گام ۲ — کسب‌وکار: فقط نام + شهر — موبایل از ثبت‌نام می‌آید، نقش هم نمی‌پرسیم؛
// انتخاب مسیر (فروش یا خرید) با اولین کالاست، نه با فرم.
// ─────────────────────────────────────────────────────────────────────────────

function BusinessStep({ onCreated }: { onCreated: (biz: BusinessSummaryDto) => void }) {
  const { toast } = useToast();
  const createMutation = useCreateBusiness();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

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
            placeholder="مثلا خورشید مارکت"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>شهر *</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger aria-label="شهر">
              <SelectValue placeholder="شهر را انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** ورودی موبایل با پیشوند کد کشور +98 — هر فرمتی را می‌پذیرد، خودش استاندارد می‌کند */
function PhoneField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Field label={label}>
      <div
        dir="ltr"
        className="flex items-center rounded-xl border border-input bg-transparent focus-within:ring-2 focus-within:ring-ring/30"
      >
        <span className="select-none border-e px-3 py-2.5 text-sm font-bold text-muted-foreground">+98</span>
        <Input
          dir="ltr"
          inputMode="numeric"
          className="border-0 shadow-none focus-visible:ring-0"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}
