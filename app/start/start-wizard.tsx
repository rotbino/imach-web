"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, type BusinessSummaryDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useCategories, useCreateBusiness, useGoods, useSaveListing } from "@/lib/queries";
import { CITIES, fa, FREQUENCY_LABELS, unitLabel } from "@/lib/format";
import { AppHeader, AppFooter } from "@/app/components/chrome";
import { LanguageSelect } from "@/app/components/language-select";
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
import {
  Check,
  Loader2,
  Search,
  ShoppingBasket,
  Store,
} from "lucide-react";

/*
 * ویزارد افقی شروع — یک مرحله در هر لحظه:
 *   ۱) حساب (ورود / ثبت‌نام)      ← ورود مستقیم به پنل می‌رود
 *   ۲) کسب‌وکار (نام + شهر)       ← بدون موبایل، بدون نقش؛ هر دو بازو از اول فعال‌اند
 *   ۳) اولین کالا                 ← فروش یا خرید، انتخاب با خود کاربر؛ بعدش: پنل
 */

type Frequency = "WEEKLY" | "MONTHLY" | "OCCASIONAL";

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
                onLoggedIn={() => router.push("/panel")}
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
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^09\d{9}$/.test(phone)) {
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
        await login(phone, password);
        toast({ title: m.auth.toasts.welcome });
        onLoggedIn(); // لاگین → مستقیم پنل
      } else {
        if (name.trim().length < 2) {
          toast({ title: m.auth.toasts.nameRequired, variant: "destructive" });
          setBusy(false);
          return;
        }
        await register(name.trim(), phone, password);
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
          <Field label={m.auth.fields.mobile}>
            <Input dir="ltr" inputMode="numeric" placeholder={m.auth.placeholders.mobile} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
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
          <Field label={m.auth.fields.mobile}>
            <Input dir="ltr" inputMode="numeric" placeholder={m.auth.placeholders.mobile} value={phone} onChange={(e) => setPhone(e.target.value)} />
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
// گام ۲ — کسب‌وکار: فقط نام + شهر — موبایل از ثبت‌نام می‌آید، نقش هم نمی‌پرسیم؛
// هر دو بازوی خرید و فروش از همان اول در اختیار کاربر است.
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
        نام و شهر — همین و بس. بازوهای خرید و فروش هر دو از اول در اختیار شماست.
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
// گام ۳ — اولین کالا: کاربر خودش برمی‌گزیند اولین ثبتش «فروش» باشد یا «خرید»
// ─────────────────────────────────────────────────────────────────────────────

function FirstGoodStep({ biz }: { biz: BusinessSummaryDto }) {
  const router = useRouter();
  const { toast } = useToast();
  const saveMutation = useSaveListing();

  const [kind, setKind] = useState<"sell" | "buy">("sell"); // پیش‌فرض: کاتالوگ فروش
  const isSell = kind === "sell";

  const [goodId, setGoodId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [volume, setVolume] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");

  const goodsQ = useGoods({ limit: 100 });
  const categoriesQ = useCategories();
  const goods = goodsQ.data?.items ?? [];
  const categories = categoriesQ.data ?? [];
  const activeCat = query.trim() ? "" : cat || categories[0] || "";

  const visible = useMemo(
    () =>
      query.trim()
        ? goods.filter((g) => g.name.includes(query.trim()) || g.category.includes(query.trim()))
        : goods.filter((g) => g.category === activeCat),
    [goods, query, activeCat]
  );
  const good = goods.find((g) => g.id === goodId) ?? null;

  const save = async () => {
    if (!good) {
      toast({ title: "یک کالا انتخاب کنید", variant: "destructive" });
      return;
    }
    if (isSell) {
      if (Number(price) <= 0 || Number(stock) <= 0) {
        toast({ title: "قیمت و موجودی را وارد کنید", variant: "destructive" });
        return;
      }
    } else if (Number(volume) <= 0) {
      toast({ title: "حجم خرید را وارد کنید", variant: "destructive" });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        businessId: biz.id,
        goodId: good.id,
        mode: isSell ? "SELL" : "BUY",
        ...(isSell
          ? { sell: { price: Number(price), stock: Number(stock), minOrder: Number(minOrder) || 0 } }
          : { buy: { volume: Number(volume), frequency } }),
      });
      toast({ title: "اولین کالای شما ثبت شد" });
      router.push("/panel"); // بعد از ثبت اولین خرید/فروش → پنل
    } catch (err) {
      toast({
        title: "ثبت کالا ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-extrabold">
        {isSell ? "اولین کالای فروشتان را ثبت کنید" : "اولین کالای خریدتان را ثبت کنید"}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {isSell
          ? "این کالا در کاتالوگ بازوی فروشتان نمایش داده می‌شود. بقیه کالاها را بعدا از پنل اضافه کنید."
          : "این نیاز در بازوی خریدتان نمایش داده می‌شود تا تامین‌کننده‌ها پیشنهاد بدهند."}
      </p>

      {/* انتخاب بازو: اولین ثبت، فروش یا خرید — هر دو بازو از اول در دسترس است */}
      <Tabs value={kind} onValueChange={(v) => setKind(v as "sell" | "buy")}>
        <TabsList className="mt-4 grid w-full grid-cols-2">
          <TabsTrigger value="sell" className="gap-1.5">
            <Store className="size-4" />
            برای فروش
          </TabsTrigger>
          <TabsTrigger value="buy" className="gap-1.5">
            <ShoppingBasket className="size-4" />
            برای خرید
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* جست‌وجو */}
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="جست‌وجوی کالا"
          placeholder="جست‌وجو… مثلا برنج، رب، کارتن"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pe-9"
        />
      </div>

      {/* دسته‌ها */}
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCat(c);
              setQuery("");
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              activeCat === c
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-white text-muted-foreground hover:border-primary/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* انتخاب یک کالا */}
      <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pe-1 sm:grid-cols-3">
        {visible.map((g) => {
          const sel = g.id === goodId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setGoodId(g.id)}
              aria-pressed={sel}
              className={`flex items-center justify-between rounded-xl border p-3 text-start transition ${
                sel ? "border-primary bg-accent ring-1 ring-primary" : "bg-white hover:border-primary/40"
              }`}
            >
              <span>
                <span className="block text-sm font-bold">{g.name}</span>
                <span className="text-[11px] text-muted-foreground">واحد رایج: {unitLabel(g.unit)}</span>
              </span>
              <span
                className={`grid size-5 place-items-center rounded-full border ${
                  sel ? "border-primary bg-primary text-white" : "border-input"
                }`}
              >
                {sel && <Check className="size-3.5" />}
              </span>
            </button>
          );
        })}
        {goodsQ.isLoading && (
          <div className="col-span-2 flex items-center gap-2 py-6 text-sm text-muted-foreground sm:col-span-3">
            <Loader2 className="size-4 animate-spin" /> در حال دریافت کاتالوگ…
          </div>
        )}
      </div>

      {/* مشخصات */}
      {good && (
        <div className={`mt-4 rounded-xl border p-4 ${isSell ? "border-primary/15 bg-accent/40" : "border-stone-200 bg-stone-50"}`}>
          <p className="mb-3 flex items-center gap-1.5 text-sm font-extrabold">
            {isSell ? <Store className="size-4 text-primary" /> : <ShoppingBasket className="size-4 text-stone-700" />}
            {isSell ? `مشخصات فروش «${good.name}»` : `مشخصات خرید «${good.name}»`}
          </p>
          {isSell ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="قیمت هر واحد (تومان)">
                <Input type="number" min={0} placeholder="85000" value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label="موجودی">
                <Input type="number" min={0} placeholder="500" value={stock} onChange={(e) => setStock(e.target.value)} />
              </Field>
              <Field label="حداقل سفارش">
                <Input type="number" min={0} placeholder="10" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
              </Field>
              <Field label="واحد">
                <Input value={unitLabel(good.unit)} disabled />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="حجم خرید در هر دوره">
                <Input type="number" min={0} placeholder="2000" value={volume} onChange={(e) => setVolume(e.target.value)} />
              </Field>
              <Field label="واحد">
                <Input value={unitLabel(good.unit)} disabled />
              </Field>
              <Field label="تناوب خرید">
                <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                  <SelectTrigger aria-label="تناوب خرید">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
        </div>
      )}

      <Button className="mt-5 w-full" onClick={() => void save()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        ثبت و ورود به پنل
      </Button>
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
