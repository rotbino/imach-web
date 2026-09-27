"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/search-select";
import { useCategories, useGoods } from "@/lib/queries";
import { fa, goodName } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import {
  Tag,
  Plus,
  Search,
  Loader2,
  Check,
  X,
  Package,
  Store,
  ScanLine,
  ImagePlus,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

// ── Types ──
interface BrandProduct {
  id: string;
  label: string;
  barcode: string | null;
  imageUrl: string | null;
  status: string;
  brand: { id: string; name: string } | null;
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category: { id: string; slug: string; nameFa: string; nameEn: string };
  } | null;
  _count: { listings: number };
}

interface BrandInfo {
  id: string;
  name: string;
  status: string;
  _count: { products: number; listings: number };
  owner: { id: string; name: string; slug: string } | null;
}

// ── API helpers ──
const brandApi = {
  myBrands: () => api<BrandInfo[]>("/brand/my-brands"),
  products: () => api<BrandProduct[]>("/brand/products"),
  createProduct: (body: { brandId: string; goodId: string; label: string; barcode?: string; imageUrl?: string }) =>
    api<BrandProduct>("/brand/products/create", { method: "POST", body }),
  updateProduct: (body: { productId: string; label?: string; barcode?: string | null; imageUrl?: string | null }) =>
    api<BrandProduct>("/brand/products/update", { method: "POST", body }),
  lookupBarcode: (barcode: string) =>
    api<{ found: boolean; source: string; product: unknown }>(`/brand/lookup-barcode?barcode=${encodeURIComponent(barcode)}`),
};

export default function BrandPanelPage() {
  const brandsQ = useQuery({ queryKey: ["brand", "my-brands"], queryFn: brandApi.myBrands });
  const productsQ = useQuery({ queryKey: ["brand", "products"], queryFn: brandApi.products });
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const brands = brandsQ.data ?? [];
  const allProducts = productsQ.data ?? [];
  const q = search.trim().toLowerCase();
  const products = q
    ? allProducts.filter((p) =>
        p.label.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        p.good?.nameFa.toLowerCase().includes(q)
      )
    : allProducts;

  if (brandsQ.isLoading || productsQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-6">
        <div className="w-full max-w-sm rounded-3xl border bg-white p-8 text-center shadow-sm">
          <Tag className="mx-auto size-10 text-muted-foreground/30" />
          <p className="mt-4 font-extrabold">شما صاحب برندی نیستید</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            برای دسترسی به پنل مدیریت برند، ادمین باید یک برند را به کسب‌وکار شما تخصیص دهد.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">
            بازگشت به سایت
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* هدر */}
      <header className="sticky top-0 z-30 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Tag className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">پنل مدیریت برند</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {brands.length} برند · {allProducts.length} محصول
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <Link href="/" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-primary">
              <Store className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 pb-24">
        {/* کارت‌های برند */}
        <div className="mb-4 flex flex-wrap gap-2">
          {brands.map((b) => (
            <div key={b.id} className="rounded-xl border bg-white px-4 py-2.5">
              <p className="text-sm font-extrabold">{b.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {fa(b._count.products)} محصول · {fa(b._count.listings)} آگهی فعال
              </p>
            </div>
          ))}
        </div>

        {/* جست‌وجو + ایجاد */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative grow" style={{ minWidth: 200 }}>
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جست‌وجوی محصول… (نام، بارکد)"
              className="h-10 pe-9 text-sm"
              maxLength={40}
            />
          </div>
          <Button size="sm" className="h-10" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            محصول جدید
          </Button>
        </div>

        {/* فرم ایجاد محصول جدید */}
        {creating && <CreateProductForm brands={brands} onDone={() => setCreating(false)} />}

        {/* لیست محصولات */}
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <Package className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-bold text-muted-foreground">
              {q ? "محصولی پیدا نشد" : "هنوز محصولی ثبت نشده"}
            </p>
            {!q && (
              <Button size="sm" className="mt-3" onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                اولین محصول را ثبت کن
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} brands={brands} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── ردیف محصول ───────────────────────────────────────────────────────────────

function ProductRow({ product, brands }: { product: BrandProduct; brands: BrandInfo[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { locale } = useLocale();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(product.label);
  const [barcode, setBarcode] = useState(product.barcode ?? "");
  const [saving, setSaving] = useState(false);

  const hasChanges = label !== product.label || barcode !== (product.barcode ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await brandApi.updateProduct({
        productId: product.id,
        label: label.trim(),
        barcode: barcode.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ["brand", "products"] });
      toast({ title: "ذخیره شد" });
      setEditing(false);
    } catch (err) {
      toast({ title: "خطا", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-center gap-3">
        {/* عکس */}
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent/70">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt="" width={48} height={48} unoptimized className="size-full object-cover" />
          ) : (
            <span className="text-base font-black text-primary/60">{product.label.slice(0, 1)}</span>
          )}
        </span>

        {/* اطلاعات */}
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-sm font-bold" maxLength={120} autoFocus />
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="h-8 text-xs" dir="ltr" placeholder="بارکد (اختیاری)" maxLength={20} />
            </div>
          ) : (
            <>
              <p className="truncate text-sm font-extrabold">{product.label}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {product.good && (
                  <span className="text-[10px] text-muted-foreground">
                    {goodName(product.good, locale)} · {product.good.category.nameFa}
                  </span>
                )}
                {product.barcode && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-600" dir="ltr">{product.barcode}</span>
                )}
                {product._count.listings > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                    {fa(product._count.listings)} فروشنده
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* دکمه‌ها */}
        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <>
              <Button size="sm" onClick={() => void save()} disabled={saving || !hasChanges}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setLabel(product.label); setBarcode(product.barcode ?? ""); }}>
                <X className="size-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Tag className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── فرم ایجاد محصول جدید ─────────────────────────────────────────────────────

function CreateProductForm({ brands, onDone }: { brands: BrandInfo[]; onDone: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { locale } = useLocale();

  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [goodQuery, setGoodQuery] = useState("");
  const [goodId, setGoodId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [barcode, setBarcode] = useState("");
  const [barcodeResult, setBarcodeResult] = useState<{ found: boolean; source: string } | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  // جست‌وجوی نوع کالا
  const goodsQ = useGoods(goodQuery.trim().length >= 2 ? { q: goodQuery, limit: 10 } : {});
  const goods = (goodsQ.data?.items ?? []).map((g) => ({ value: g.id, label: g.nameFa, hint: g.category?.nameFa ?? "" }));

  const lookupBarcode = async () => {
    if (!barcode.trim() || barcode.trim().length < 4) return;
    setLookupBusy(true);
    setBarcodeResult(null);
    try {
      const res = await brandApi.lookupBarcode(barcode.trim());
      setBarcodeResult({ found: res.found, source: res.source });
      if (res.found && res.source === "off") {
        const p = res.product as { label?: string; brand?: { name?: string } | null };
        if (p.label && !label) setLabel(p.label);
      } else if (res.found && res.source === "db") {
        toast({ title: "این بارکد قبلاً در دیتابیس ثبت شده", variant: "destructive" });
      }
    } catch {
      setBarcodeResult({ found: false, source: "none" });
    } finally {
      setLookupBusy(false);
    }
  };

  const save = async () => {
    if (!brandId) { toast({ title: "برند را انتخاب کن", variant: "destructive" }); return; }
    if (!goodId) { toast({ title: "نوع کالا را انتخاب کن", variant: "destructive" }); return; }
    if (label.trim().length < 2) { toast({ title: "عنوان محصول را بنویس", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await brandApi.createProduct({
        brandId,
        goodId,
        label: label.trim(),
        barcode: barcode.trim() || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["brand", "products"] });
      toast({ title: "محصول ساخته شد" });
      onDone();
    } catch (err) {
      toast({ title: "خطا", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border-2 border-primary/30 bg-white p-4">
      <div className="mb-3 flex items-center gap-2"><Plus className="size-4 text-primary" /><span className="text-xs font-extrabold">محصول جدید</span></div>

      <div className="grid gap-3">
        {/* انتخاب برند */}
        <div>
          <Label className="text-[11px] text-muted-foreground">برند *</Label>
          {brands.length === 1 ? (
            <div className="mt-1 rounded-lg bg-accent px-3 py-2 text-sm font-bold">{brands[0].name}</div>
          ) : (
            <div className="mt-1">
              <SearchSelect
                items={brands.map((b) => ({ value: b.id, label: b.name }))}
                value={brandId || null}
                onChange={setBrandId}
                placeholder="انتخاب برند…"
                searchPlaceholder="جست‌وجوی برند…"
                emptyText="پیدا نشد"
                ariaLabel="برند"
              />
            </div>
          )}
        </div>

        {/* انتخاب نوع کالا */}
        <div>
          <Label className="text-[11px] text-muted-foreground">نوع کالا *</Label>
          <Input
            value={goodQuery}
            onChange={(e) => { setGoodQuery(e.target.value); setGoodId(null); }}
            className="mt-1 h-9 text-sm"
            placeholder="مثلاً پفک، برنج، میلگرد…"
            maxLength={20}
          />
          {goods.length > 0 && !goodId && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border bg-white shadow-sm">
              {goods.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => { setGoodId(g.value); setGoodQuery(g.label); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-start text-xs transition hover:bg-accent"
                >
                  <span className="font-bold">{g.label}</span>
                  {g.hint && <span className="text-[10px] text-muted-foreground">{g.hint}</span>}
                </button>
              ))}
            </div>
          )}
          {goodId && (
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                ✓ {goodQuery}
              </span>
              <button type="button" onClick={() => { setGoodId(null); setGoodQuery(""); }} className="text-[10px] text-muted-foreground hover:text-destructive">
                تغییر
              </button>
            </div>
          )}
        </div>

        {/* عنوان محصول */}
        <div>
          <Label className="text-[11px] text-muted-foreground">عنوان محصول *</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 h-9 text-sm" placeholder="مثلاً پفک اشی مشی ۲۰تایی" maxLength={120} />
        </div>

        {/* بارکد + جست‌وجو */}
        <div>
          <Label className="text-[11px] text-muted-foreground">بارکد (اختیاری)</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="h-9 text-sm" dir="ltr" placeholder="6261234567890" maxLength={20} />
            <Button size="sm" variant="outline" onClick={() => void lookupBarcode()} disabled={lookupBusy || !barcode.trim()}>
              {lookupBusy ? <Loader2 className="size-3.5 animate-spin" /> : <ScanLine className="size-3.5" />}
              جست‌وجو
            </Button>
          </div>
          {barcodeResult?.found && barcodeResult.source === "off" && (
            <p className="mt-1 text-[10px] text-emerald-600">✓ از Open Food Facts پیدا شد — نام پر شد</p>
          )}
          {barcodeResult?.found && barcodeResult.source === "db" && (
            <p className="mt-1 text-[10px] text-red-600">این بارکد قبلاً ثبت شده</p>
          )}
          {barcodeResult && !barcodeResult.found && (
            <p className="mt-1 text-[10px] text-muted-foreground">پیدا نشد — نام را دستی وارد کن</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => void save()} disabled={saving || !brandId || !goodId || label.trim().length < 2}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          ثبت محصول
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>انصراف</Button>
      </div>
    </div>
  );
}
