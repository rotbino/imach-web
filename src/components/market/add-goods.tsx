"use client";

import { useMemo, useState } from "react";
import type { Business, Listing, Role, TradeMode } from "@/lib/types";
import {
  BUSINESSES,
  CATEGORIES,
  CITIES,
  GOODS,
  fa,
  goodById,
  makeSlug,
  saveProfile,
} from "@/lib/mock-data";
import { saveLastProfile } from "@/lib/app-state";
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
import { useToast } from "@/hooks/use-toast";
import { ROLE_HINTS, RoleBadge } from "./chrome";
import {
  BadgeCheck,
  Check,
  Info,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Wand2,
  X,
} from "lucide-react";

const ROLES: Role[] = ["خرده‌فروش", "عمده‌فروش", "تولیدکننده", "بازاریاب"];
const UNITS = ["کیلوگرم", "تن", "کارتن", "کیسه", "عدد", "لیتر", "شاخه"] as const;
const FREQUENCIES = ["هفتگی", "ماهانه", "موردی"] as const;

type Draft = Record<string, Listing>;

const MODES: { value: TradeMode; label: string }[] = [
  { value: "sell", label: "فقط می‌فروشم" },
  { value: "buy", label: "فقط می‌خرم" },
  { value: "both", label: "هر دو" },
];

export default function AddGoods({ onDone }: { onDone: (slug: string) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [phone, setPhone] = useState("");
  const [cat, setCat] = useState<string>(CATEGORIES[0]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [errorGood, setErrorGood] = useState<string | null>(null);

  const selectedIds = Object.keys(draft);
  const counts = useMemo(() => {
    let sell = 0;
    let buy = 0;
    for (const l of Object.values(draft)) {
      if (l.mode === "sell" || l.mode === "both") sell++;
      if (l.mode === "buy" || l.mode === "both") buy++;
    }
    return { sell, buy };
  }, [draft]);

  const toggleGood = (goodId: string) => {
    setDraft((d) => {
      const next = { ...d };
      if (next[goodId]) {
        delete next[goodId];
      } else {
        const g = goodById(goodId);
        next[goodId] = {
          goodId,
          mode: "both",
          sell: { price: 0, unit: g.unit, stock: 0, minOrder: 0 },
          buy: { volume: 0, unit: g.unit, frequency: "ماهانه" },
        };
      }
      return next;
    });
  };

  const patchListing = (goodId: string, patch: Partial<Listing>) =>
    setDraft((d) => ({ ...d, [goodId]: { ...d[goodId], ...patch } }));

  const patchSell = (goodId: string, patch: Partial<NonNullable<Listing["sell"]>>) =>
    setDraft((d) => ({
      ...d,
      [goodId]: { ...d[goodId], sell: { ...d[goodId].sell!, ...patch } },
    }));

  const patchBuy = (goodId: string, patch: Partial<NonNullable<Listing["buy"]>>) =>
    setDraft((d) => ({
      ...d,
      [goodId]: { ...d[goodId], buy: { ...d[goodId].buy!, ...patch } },
    }));

  const prefillDemo = () => {
    const demo = BUSINESSES.find((b) => b.slug === "khorshid-market")!;
    setName(demo.name);
    setCity(demo.city);
    setRole(demo.role);
    setPhone(demo.phone);
    setDraft(
      Object.fromEntries(demo.listings.map((l) => [l.goodId, structuredClone(l)]))
    );
    toast({ title: "نمونه آماده پر شد", description: "مختصات «خورشید مارکت» بارگذاری شد." });
  };

  const submit = () => {
    if (!name.trim()) return toast({ title: "نام کسب‌وکار را بنویسید", variant: "destructive" });
    if (!city) return toast({ title: "شهر را انتخاب کنید", variant: "destructive" });
    if (!role) return toast({ title: "نقش کسب‌وکار را انتخاب کنید", variant: "destructive" });
    if (selectedIds.length === 0)
      return toast({
        title: "حداقل یک کالا انتخاب کنید",
        description: "از بخش «کالاها»، کالاهای خرید و فروش را مشخص کنید.",
        variant: "destructive",
      });

    for (const l of Object.values(draft)) {
      const g = goodById(l.goodId);
      if ((l.mode === "sell" || l.mode === "both") && (!l.sell || l.sell.price <= 0 || l.sell.stock <= 0)) {
        setErrorGood(l.goodId);
        return toast({
          title: `مشخصات فروش «${g.name}» کامل نیست`,
          description: "قیمت و موجودی فروش را وارد کنید.",
          variant: "destructive",
        });
      }
      if ((l.mode === "buy" || l.mode === "both") && (!l.buy || l.buy.volume <= 0)) {
        setErrorGood(l.goodId);
        return toast({
          title: `مشخصات خرید «${g.name}» کامل نیست`,
          description: "حجم خرید در هر دوره را وارد کنید.",
          variant: "destructive",
        });
      }
    }
    setErrorGood(null);

    // پاک‌سازی بر اساس حالت هر کالا
    const listings: Listing[] = Object.values(draft).map((l) => ({
      goodId: l.goodId,
      mode: l.mode,
      sell: l.mode === "buy" ? undefined : l.sell,
      buy: l.mode === "sell" ? undefined : l.buy,
    }));

    const biz: Business = {
      slug: makeSlug(name),
      name: name.trim(),
      role,
      city,
      phone: phone.trim() || "09120000000",
      listings,
    };
    saveProfile(biz);
    saveLastProfile(biz.slug);
    toast({ title: "بازوها ساخته شد", description: "دو لینک اختصاصی برای شما آماده است." });
    onDone(biz.slug);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black sm:text-2xl">ثبت کالاها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            یک‌بار ثبت کن؛ دو بازوی اختصاصی خرید و فروش با لینک مخصوص خودت بساز.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={prefillDemo}>
          <Wand2 className="size-4" />
          پرکردن با نمونه
        </Button>
      </div>

      {/* ── ۱) اطلاعات کسب‌وکار ── */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-extrabold">
          <BadgeCheck className="size-5 text-primary" />
          اطلاعات کسب‌وکار
        </h2>
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
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-xl border p-3 text-start transition ${
                    role === r
                      ? "border-primary bg-teal-50 ring-1 ring-primary"
                      : "bg-white hover:border-teal-300"
                  }`}
                >
                  <span className="block text-sm font-bold">{r}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {ROLE_HINTS[r]}
                  </span>
                </button>
              ))}
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
      </section>

      {/* ── ۲) انتخاب کالاها ── */}
      <section className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-extrabold">
            <ShoppingCart className="size-5 text-primary" />
            کالاها
          </h2>
          {selectedIds.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {fa(selectedIds.length)} کالا انتخاب شد
              {counts.sell > 0 && <> — {fa(counts.sell)} فروش</>}
              {counts.buy > 0 && <> — {fa(counts.buy)} خرید</>}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          کالاهایی که می‌خرید یا می‌فروشید را انتخاب کنید؛ جزئیات در قدم بعد تنظیم می‌شود.
        </p>

        {/* جست‌وجوی کالا */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="جست‌وجوی کالا"
            placeholder="جست‌وجو بین ۱۸ کالا… مثلا برنج، رب، کارتن"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pe-9"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
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
                  : "bg-white text-muted-foreground hover:border-teal-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(query.trim()
            ? GOODS.filter(
                (g) =>
                  g.name.includes(query.trim()) || g.category.includes(query.trim())
              )
            : GOODS.filter((g) => g.category === cat)
          ).map((g) => {
            const sel = !!draft[g.id];
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGood(g.id)}
                aria-pressed={sel}
                className={`flex items-center justify-between rounded-xl border p-3 text-start transition ${
                  sel ? "border-primary bg-teal-50 ring-1 ring-primary" : "bg-white hover:border-teal-300"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">{g.name}</span>
                  <span className="text-[11px] text-muted-foreground">واحد رایج: {g.unit}</span>
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
        </div>
      </section>

      {/* ── ۳) جزئیات کالاهای انتخاب‌شده ── */}
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
              const g = goodById(id);
              const l = draft[id];
              const showSell = l.mode === "sell" || l.mode === "both";
              const showBuy = l.mode === "buy" || l.mode === "both";
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

                  {/* حالت خرید/فروش */}
                  <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                    {MODES.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => patchListing(id, { mode: m.value })}
                        className={`rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                          l.mode === m.value
                            ? "bg-white text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* مشخصات فروش */}
                  {showSell && l.sell && (
                    <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                      <p className="mb-2 flex items-center gap-1 text-xs font-bold text-teal-700">
                        <Store className="size-3.5" />
                        مشخصات فروش
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Field label="قیمت هر واحد (تومان)">
                          <Input
                            type="number"
                            min={0}
                            placeholder="85000"
                            value={l.sell.price || ""}
                            onChange={(e) => patchSell(id, { price: Number(e.target.value) })}
                          />
                        </Field>
                        <Field label="واحد">
                          <Select
                            value={l.sell.unit}
                            onValueChange={(v) => patchSell(id, { unit: v as never })}
                          >
                            <SelectTrigger aria-label="واحد فروش">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="موجودی">
                          <Input
                            type="number"
                            min={0}
                            placeholder="500"
                            value={l.sell.stock || ""}
                            onChange={(e) => patchSell(id, { stock: Number(e.target.value) })}
                          />
                        </Field>
                        <Field label="حداقل سفارش">
                          <Input
                            type="number"
                            min={0}
                            placeholder="10"
                            value={l.sell.minOrder || ""}
                            onChange={(e) => patchSell(id, { minOrder: Number(e.target.value) })}
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {/* مشخصات خرید */}
                  {showBuy && l.buy && (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                      <p className="mb-2 flex items-center gap-1 text-xs font-bold text-amber-700">
                        <ShoppingCart className="size-3.5" />
                        مشخصات خرید
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Field label="حجم خرید در هر دوره">
                          <Input
                            type="number"
                            min={0}
                            placeholder="2000"
                            value={l.buy.volume || ""}
                            onChange={(e) => patchBuy(id, { volume: Number(e.target.value) })}
                          />
                        </Field>
                        <Field label="واحد">
                          <Select
                            value={l.buy.unit}
                            onValueChange={(v) => patchBuy(id, { unit: v as never })}
                          >
                            <SelectTrigger aria-label="واحد خرید">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="تناوب خرید">
                          <Select
                            value={l.buy.frequency}
                            onValueChange={(v) => patchBuy(id, { frequency: v as never })}
                          >
                            <SelectTrigger aria-label="تناوب خرید">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQUENCIES.map((f) => (
                                <SelectItem key={f} value={f}>
                                  {f}
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
              : role === ""
                ? "نقش کسب‌وکار را انتخاب کنید تا نوع فعالیت شما در بازوها نمایش داده شود."
                : "بعد از ثبت، دو لینک اختصاصی بازوی خرید و فروش ساخته می‌شود."}
          </p>
          <Button onClick={submit} className="shrink-0">
            <Sparkles className="size-4" />
            ساخت بازوی خرید و فروش
          </Button>
        </div>
      </div>

      {role && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          نقش شما: <RoleBadge role={role} /> — {ROLE_HINTS[role]}
        </p>
      )}
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
