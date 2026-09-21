"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { businessesApi, ApiError, type BusinessSummaryDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useCategories, useGoods, useMyBusinesses, useUpsertListing } from "@/lib/queries";
import { CITIES, fa, ROLE_HINTS, ROLE_LABELS, unitLabel } from "@/lib/format";
import { AppHeader, AppFooter, ArmLinkCard, RoleBadge, ROLE_ICONS } from "./chrome";
import { LanguageSelect } from "./language-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  BadgeCheck,
  Check,
  Eye,
  Info,
  Loader2,
  LogIn,
  Radio,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  UserPlus,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";

type Mode = "SELL" | "BUY" | "BOTH";
type Frequency = "WEEKLY" | "MONTHLY" | "OCCASIONAL";

interface DraftItem {
  mode: Mode;
  sell: { price: number; stock: number; minOrder: number };
  buy: { volume: number; frequency: Frequency };
}

const MODES: { value: Mode; label: string }[] = [
  { value: "SELL", label: "فقط می‌فروشم" },
  { value: "BUY", label: "فقط می‌خرم" },
  { value: "BOTH", label: "هر دو" },
];

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "WEEKLY", label: "هفتگی" },
  { value: "MONTHLY", label: "ماهانه" },
  { value: "OCCASIONAL", label: "موردی" },
];

type Step = "auth" | "business" | "goods" | "done";

export default function StartWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const { status: authStatus } = useAuthStore();

  const [step, setStep] = useState<Step>("business");
  const [biz, setBiz] = useState<BusinessSummaryDto | null>(null);
  const [errorGood, setErrorGood] = useState<string | null>(null);

  // گام ۳: دیتای کالاها
  const [cat, setCat] = useState<string>("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Record<string, DraftItem>>({});

  const goodsQ = useGoods({ limit: 100 });
  const categoriesQ = useCategories();
  const upsertMutation = useUpsertListing();
  const goods = goodsQ.data?.items ?? [];
  const categories = categoriesQ.data ?? [];

  useMemo(() => {
    if (!cat && categories.length > 0) setCat(categories[0]);
  }, [cat, categories]);

  const selectedIds = Object.keys(draft);
  const goodById = useMemo(() => new Map(goods.map((g) => [g.id, g])), [goods]);

  // ناوبری بر اساس وضعیت احراز هویت
  if (authStatus === "booting") {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const effectiveStep: Step = authStatus === "guest" ? "auth" : step;

  // ── گام ۱: احراز هویت ──
  if (effectiveStep === "auth") {
    return (
      <>
        <AppHeader />
        <main className="grow">
          <AuthStep onDone={() => setStep("business")} />
        </main>
        <AppFooter />
      </>
    );
  }

  // ── گام ۴: موفقیت ──
  if (effectiveStep === "done" && biz) {
    return (
      <>
        <AppHeader />
        <main className="grow">
          <SuccessStep biz={biz} onGoSell={() => router.push(`/sell/${biz.slug}`)} onGoBuy={() => router.push(`/buy/${biz.slug}`)} />
        </main>
        <AppFooter />
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-black sm:text-2xl">ثبت کالاها</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                یک‌بار ثبت کن؛ دو بازوی اختصاصی خرید و فروش با لینک مخصوص خودت بساز.
              </p>
            </div>
          </div>

          <BusinessStep
            onCreated={(b) => {
              setBiz(b);
              setStep("goods");
            }}
          />

          {biz && (
            <>
              {/* ── انتخاب کالاها ── */}
              <section className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-base font-extrabold">
                    <ShoppingCart className="size-5 text-primary" />
                    کالاها
                  </h2>
                  {selectedIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {fa(selectedIds.length)} کالا انتخاب شد
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  کالاهایی که می‌خرید یا می‌فروشید را انتخاب کنید؛ جزئیات پایین‌تر تنظیم می‌شود.
                </p>

                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="جست‌وجوی کالا"
                    placeholder="جست‌وجو… مثلا برنج، رب، کارتن"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pe-9"
                  />
                </div>

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
                        query === "" && cat === c
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-white text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(query.trim()
                    ? goods.filter((g) => g.name.includes(query.trim()) || g.category.includes(query.trim()))
                    : goods.filter((g) => g.category === cat)
                  ).map((g) => {
                    const sel = !!draft[g.id];
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGood(g.id)}
                        aria-pressed={sel}
                        className={`flex items-center justify-between rounded-xl border p-3 text-start transition ${
                          sel ? "border-primary bg-accent ring-1 ring-primary" : "bg-white hover:border-primary/40"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-bold">{g.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            واحد رایج: {unitLabel(g.unit)}
                          </span>
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
              </section>

              {/* ── جزئیات کالاهای انتخاب‌شده ── */}
              {selectedIds.length > 0 && (
                <section className="mt-5">
                  <h2 className="flex items-center gap-2 text-base font-extrabold">
                    <Tag className="size-5 text-primary" />
                    جزئیات کالاها
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    برای هر کالا مشخص کنید فقط می‌فروشید، فقط می‌خرید یا هر دو؛ بعد حجم و قیمت را وارد کنید.
                  </p>

                  <div className="mt-3 space-y-3">
                    {selectedIds.map((id) => {
                      const g = goodById.get(id);
                      const item = draft[id];
                      if (!g || !item) return null;
                      const showSell = item.mode === "SELL" || item.mode === "BOTH";
                      const showBuy = item.mode === "BUY" || item.mode === "BOTH";
                      const invalid = errorGood === id;
                      return (
                        <div
                          key={id}
                          className={`rounded-2xl border bg-white p-4 shadow-sm ${
                            invalid ? "border-destructive ring-1 ring-destructive" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-extrabold">{g.name}</p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => toggleGood(id)}
                              aria-label={`حذف ${g.name}`}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                            {MODES.map((m) => (
                              <button
                                key={m.value}
                                type="button"
                                onClick={() => patchMode(id, m.value)}
                                className={`rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                                  item.mode === m.value
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>

                          {showSell && (
                            <div className="mt-3 rounded-xl border border-primary/15 bg-accent/40 p-3">
                              <p className="mb-2 flex items-center gap-1 text-xs font-bold text-primary">
                                <Store className="size-3.5" />
                                مشخصات فروش
                              </p>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <Field label="قیمت هر واحد (تومان)">
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="85000"
                                    value={item.sell.price || ""}
                                    onChange={(e) => patchDraft(id, "sell", { price: Number(e.target.value) })}
                                  />
                                </Field>
                                <Field label="موجودی">
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="500"
                                    value={item.sell.stock || ""}
                                    onChange={(e) => patchDraft(id, "sell", { stock: Number(e.target.value) })}
                                  />
                                </Field>
                                <Field label="حداقل سفارش">
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="10"
                                    value={item.sell.minOrder || ""}
                                    onChange={(e) => patchDraft(id, "sell", { minOrder: Number(e.target.value) })}
                                  />
                                </Field>
                                <Field label="واحد">
                                  <Select value={g.unit} disabled>
                                    <SelectTrigger aria-label="واحد فروش">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={g.unit}>{g.unit}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                              </div>
                            </div>
                          )}

                          {showBuy && (
                            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                              <p className="mb-2 flex items-center gap-1 text-xs font-bold text-stone-700">
                                <ShoppingCart className="size-3.5" />
                                مشخصات خرید
                              </p>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <Field label="حجم خرید در هر دوره">
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="2000"
                                    value={item.buy.volume || ""}
                                    onChange={(e) => patchDraft(id, "buy", { volume: Number(e.target.value) })}
                                  />
                                </Field>
                                <Field label="واحد">
                                  <Select value={g.unit} disabled>
                                    <SelectTrigger aria-label="واحد خرید">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={g.unit}>{g.unit}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                                <Field label="تناوب خرید">
                                  <Select
                                    value={item.buy.frequency}
                                    onValueChange={(v) => patchDraft(id, "buy", { frequency: v as Frequency })}
                                  >
                                    <SelectTrigger aria-label="تناوب خرید">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FREQUENCIES.map((f) => (
                                        <SelectItem key={f.value} value={f.value}>
                                          {f.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </Field>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── ارسال ── */}
              <div className="sticky bottom-3 mt-6">
                <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white/95 p-3 shadow-lg backdrop-blur">
                  <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                    <Info className="size-4 shrink-0" />
                    {selectedIds.length === 0
                      ? "برای ساخت بازوها، حداقل یک کالا انتخاب کنید."
                      : "بعد از ثبت، دو لینک اختصاصی بازوی خرید و فروش ساخته می‌شود."}
                  </p>
                  <Button
                    onClick={() => void submit()}
                    className="shrink-0"
                    disabled={upsertMutation.isPending}
                  >
                    {upsertMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    ساخت بازوی خرید و فروش
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <AppFooter />
    </>
  );

  // ── توابع داخلی ──
  function toggleGood(goodId: string) {
    setDraft((d) => {
      const next = { ...d };
      if (next[goodId]) {
        delete next[goodId];
      } else {
        next[goodId] = {
          mode: "BOTH",
          sell: { price: 0, stock: 0, minOrder: 0 },
          buy: { volume: 0, frequency: "MONTHLY" },
        };
      }
      return next;
    });
  }

  function patchMode(goodId: string, mode: Mode) {
    setDraft((d) => ({ ...d, [goodId]: { ...d[goodId], mode } }));
  }

  function patchDraft<K extends "sell" | "buy">(
    goodId: string,
    part: K,
    patch: Partial<DraftItem[K]>
  ) {
    setDraft((d) => ({
      ...d,
      [goodId]: { ...d[goodId], [part]: { ...d[goodId][part], ...patch } },
    }));
  }

  async function submit() {
    if (!biz) return;
    if (selectedIds.length === 0) {
      toast({ title: "حداقل یک کالا انتخاب کنید", variant: "destructive" });
      return;
    }
    for (const id of selectedIds) {
      const item = draft[id];
      const g = goodById.get(id);
      if (!g || !item) continue;
      if (item.mode !== "BUY" && (item.sell.price <= 0 || item.sell.stock <= 0)) {
        setErrorGood(id);
        toast({
          title: `مشخصات فروش «${g.name}» کامل نیست`,
          description: "قیمت و موجودی فروش را وارد کنید.",
          variant: "destructive",
        });
        return;
      }
      if (item.mode !== "SELL" && item.buy.volume <= 0) {
        setErrorGood(id);
        toast({
          title: `مشخصات خرید «${g.name}» کامل نیست`,
          description: "حجم خرید در هر دوره را وارد کنید.",
          variant: "destructive",
        });
        return;
      }
    }
    setErrorGood(null);

    const upsert = upsertMutation;
    try {
      for (const id of selectedIds) {
        const item = draft[id];
        await upsert.mutateAsync({
          businessId: biz.id,
          goodId: id,
          mode: item.mode,
          ...(item.mode !== "BUY" ? { sell: item.sell } : {}),
          ...(item.mode !== "SELL" ? { buy: item.buy } : {}),
        });
      }
      toast({ title: "بازوها ساخته شد", description: "دو لینک اختصاصی برای شما آماده است." });
      setStep("done");
    } catch (err) {
      toast({
        title: "ثبت کالاها ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// گام احراز هویت
// ─────────────────────────────────────────────────────────────────────────────

function AuthStep({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^09\d{9}$/.test(phone)) {
      toast({ title: "شماره موبایل معتبر نیست", description: "مثلا 09121234567", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "رمز عبور حداقل ۸ کاراکتر باشد", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (tab === "login") {
        await login(phone, password);
      } else {
        if (name.trim().length < 2) {
          toast({ title: "نام خود را بنویسید", variant: "destructive" });
          setBusy(false);
          return;
        }
        await register(name.trim(), phone, password);
      }
      toast({ title: "خوش آمدید!" });
      onDone();
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
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-3 flex justify-start">
        <LanguageSelect />
      </div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            {tab === "login" ? <LogIn className="size-6" /> : <UserPlus className="size-6" />}
          </span>
          <h1 className="mt-3 text-lg font-extrabold">
            {tab === "login" ? "ورود به iMach" : "ساخت حساب کاربری"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            با شماره موبایل وارد شوید تا بازوهایتان به حساب شما متصل بمانند.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">ورود</TabsTrigger>
            <TabsTrigger value="register">ثبت‌نام</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4 grid gap-3">
            <Field label="موبایل">
              <Input dir="ltr" placeholder="09121234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="رمز عبور">
              <Input
                dir="ltr"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <p className="rounded-lg bg-muted px-3 py-2 text-[11px] leading-5 text-muted-foreground" dir="ltr">
              demo: 09120000001 / ImachDemo1234
            </p>
          </TabsContent>

          <TabsContent value="register" className="mt-4 grid gap-3">
            <Field label="نام و نام خانوادگی">
              <Input placeholder="مثلا علی رضایی" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="موبایل">
              <Input dir="ltr" placeholder="09121234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="رمز عبور (حداقل ۸ کاراکتر)">
              <Input
                dir="ltr"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </TabsContent>
        </Tabs>

        <Button className="mt-4 w-full" onClick={() => void submit()} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {tab === "login" ? "ورود و ادامه" : "ساخت حساب و ادامه"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// گام اطلاعات کسب‌وکار
// ─────────────────────────────────────────────────────────────────────────────

function BusinessStep({ onCreated }: { onCreated: (biz: BusinessSummaryDto) => void }) {
  const { toast } = useToast();
  const businessesQ = useMyBusinesses();
  const mine = businessesQ.data ?? [];
  const [pick, setPick] = useState<string>("new");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return void toast({ title: "نام کسب‌وکار را بنویسید", variant: "destructive" });
    if (!city) return void toast({ title: "شهر را انتخاب کنید", variant: "destructive" });
    if (!role) return void toast({ title: "نقش کسب‌وکار را انتخاب کنید", variant: "destructive" });
    setBusy(true);
    try {
      const created = await businessesApi.create({
        name: name.trim(),
        city,
        role,
        phone: phone.trim() || undefined,
      });
      toast({ title: "کسب‌وکار ساخته شد", description: created.slug });
      onCreated(created);
    } catch (err) {
      toast({
        title: "ساخت کسب‌وکار ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-extrabold">
        <BadgeCheck className="size-5 text-primary" />
        اطلاعات کسب‌وکار
      </h2>

      {mine.length > 0 && (
        <div className="mt-4">
          <Label>کدام کسب‌وکار؟</Label>
          <Tabs value={pick} onValueChange={setPick} className="mt-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">کسب‌وکار جدید</TabsTrigger>
              <TabsTrigger value="existing">{mine[0].name}</TabsTrigger>
            </TabsList>
            <TabsContent value="existing" className="mt-2">
              <Button
                className="w-full"
                onClick={() => {
                  const b = mine[0];
                  if (b) onCreated(b);
                }}
              >
                ادامه با «{mine[0].name}»
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {(pick === "new" || mine.length === 0) && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            <div className="grid gap-2 sm:col-span-2">
              <Label>نقش کسب‌وکار *</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) => {
                  const Icon: LucideIcon | undefined = ROLE_ICONS[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-xl border p-3 text-start transition ${
                        role === r ? "border-primary bg-accent ring-1 ring-primary" : "bg-white hover:border-primary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {Icon && <Icon className="size-3.5 text-primary" />}
                        <span className="block text-sm font-bold">{ROLE_LABELS[r]}</span>
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{ROLE_HINTS[r]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="biz-phone">موبایل</Label>
              <Input
                id="biz-phone"
                dir="ltr"
                placeholder="0912…"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            {role && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                نقش شما: <RoleBadge role={role} />
              </p>
            )}
            <Button onClick={() => void create()} disabled={busy} className="ms-auto">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              ذخیره و انتخاب کالاها
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// گام موفقیت: لینک‌ها و QR
// ─────────────────────────────────────────────────────────────────────────────

const AFTER_STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Radio,
    title: "قیمت‌گیری",
    desc: "هر وقت خواستی قیمت بگیری، کالای موردنظر را در بازوی خرید فعال می‌کنی؛ تامین‌کننده‌های مناسب می‌بینند و پیشنهاد می‌دهند.",
  },
  {
    icon: Eye,
    title: "فالو و تابلوی قیمت",
    desc: "تامین‌کننده‌های مناسب را فالو کن تا قیمت‌هایشان همیشه در یک جدول جمع و مقایسه شود.",
  },
];

function SuccessStep({
  biz,
  onGoSell,
  onGoBuy,
}: {
  biz: BusinessSummaryDto;
  onGoSell: () => void;
  onGoBuy: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="text-center">
        <span className="animate-pop-in mx-auto grid size-16 place-items-center rounded-full bg-accent text-primary ring-8 ring-accent/60">
          <BadgeCheck className="size-9" />
        </span>
        <h1 className="mt-4 text-xl font-black sm:text-2xl">{biz.name} عزیز، بازوهایت ساخته شد!</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
          دو صفحه اختصاصی برای تو ساخته شد؛ لینک هر بازو مخصوص توست و هر وقت خواستی برای
          طرف مقابل می‌فرستی.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <RoleBadge role={biz.role} />
          <Badge variant="secondary">{biz.city}</Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ArmLinkCard kind="sell" slug={biz.slug} bizName={biz.name} onView={onGoSell} />
        <ArmLinkCard kind="buy" slug={biz.slug} bizName={biz.name} onView={onGoBuy} />
      </div>

      <div className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {AFTER_STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3 rounded-xl bg-muted/60 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-sm">
                <s.icon className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-bold">
                  {fa(i + 1)}. {s.title}
                </p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
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
