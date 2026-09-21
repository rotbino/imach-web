"use client";

import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api";
import { useCategories, useGoods, useSaveListing } from "@/lib/queries";
import { FREQUENCY_LABELS, unitLabel } from "@/lib/format";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Search, ShoppingBasket, Store } from "lucide-react";

/*
 * فرم ثبت کالا — مشترک بین گام ۳ ویزارد و صفحه «کالای جدید» پنل.
 * هر دو بازو برای همه فعال است؛ عمده/خرده بودنِ هر کالا در بازطراحی
 * بعدی «ثبت کالا» به همین فرم اضافه می‌شود.
 */

type Frequency = "WEEKLY" | "MONTHLY" | "OCCASIONAL";
export type ListingKind = "sell" | "buy";

export function ListingForm({
  bizId,
  firstGood = false,
  submitLabel,
  onSaved,
}: {
  bizId: string;
  /** حالت ویزارد: لحن «اولین کالا» */
  firstGood?: boolean;
  submitLabel: string;
  onSaved: (kind: ListingKind) => void;
}) {
  const { toast } = useToast();
  const saveMutation = useSaveListing();

  const [kind, setKind] = useState<ListingKind>("sell"); // پیش‌فرض: کاتالوگ فروش
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
        businessId: bizId,
        goodId: good.id,
        mode: isSell ? "SELL" : "BUY",
        ...(isSell
          ? { sell: { price: Number(price), stock: Number(stock), minOrder: Number(minOrder) || 0 } }
          : { buy: { volume: Number(volume), frequency } }),
      });
      toast({ title: firstGood ? "اولین کالای شما ثبت شد" : "کالا ثبت شد" });
      onSaved(kind);
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
        {firstGood
          ? isSell
            ? "اولین کالای فروشتان را ثبت کنید"
            : "اولین کالای خریدتان را ثبت کنید"
          : "کالای جدید"}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {isSell
          ? firstGood
            ? ""
            : "."
          : firstGood
            ? ""
            : ""}
      </p>

      {/* انتخاب بازو: فروش یا خرید — هر دو بازو از اول در دسترس است */}
      <Tabs value={kind} onValueChange={(v) => setKind(v as ListingKind)}>
        <TabsList className="mt-4 grid w-full grid-cols-2">
          <TabsTrigger value="sell" className="gap-1.5">
            <Store className="size-4" />
            برای فروش عمده
          </TabsTrigger>
          <TabsTrigger value="buy" className="gap-1.5">
            <ShoppingBasket className="size-4" />
            برای خرید عمده
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
        {submitLabel}
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
