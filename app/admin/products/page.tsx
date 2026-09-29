"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  productsApi,
  type ProductRowDto,
  type BrandChipDto,
  type CategoryChipDto,
} from "@/lib/api";
import { adminApi } from "../api";
import { categoryName, goodName, unitLabel, fa } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useMessages } from "@/i18n/messages/use-messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Check, Loader2, Merge, Plus, Search, X, FileJson, Tag,
  Pencil, Trash2, Package, ChevronDown, Image as ImageIcon,
  Barcode as BarcodeIcon, CheckCircle2, Circle, Layers, SlidersHorizontal,
} from "lucide-react";

const STATUSES = ["ACTIVE", "PROVISIONAL"] as const;
const STATUS_LABEL: Record<string, string> = { ACTIVE: "فعال", PROVISIONAL: "در انتظار" };
type ImageFilter = "" | "yes" | "no";
const IMAGE_OPTIONS: { value: ImageFilter; label: string }[] = [
  { value: "", label: "همه" },
  { value: "yes", label: "با عکس" },
  { value: "no", label: "بدون عکس" },
];
type PickerMode = "filter" | "edit";

export default function AdminProductsPage() {
  const router = useRouter();
  const { status, user } = useAuthStore();
  const m = useMessages();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  // ── URL params
  const qParam = searchParams.get("q") ?? "";
  const brandIdParam = searchParams.get("brandId") ?? "";
  const categoryIdParam = searchParams.get("categoryId") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const hasImageParam = (searchParams.get("hasImage") ?? "") as ImageFilter;

  // ── Data state
  const [query, setQuery] = useState(qParam);
  const [rows, setRows] = useState<ProductRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [brands, setBrands] = useState<BrandChipDto[]>([]);
  const [categories, setCategories] = useState<CategoryChipDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Mobile filter drawer
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // ── Pickers (used in both mobile drawer and edit form)
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [brandPickerMode, setBrandPickerMode] = useState<PickerMode>("filter");
  const [brandSearch, setBrandSearch] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [adminBrands, setAdminBrands] = useState<AdminBrandDto[]>([]);
  const [brandSearchBusy, setBrandSearchBusy] = useState(false);

  // ── Detail & edit drawers
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<ProductRowDto | null>(null);

  // ── Edit form state
  const [editLabel, setEditLabel] = useState("");
  const [editBrandId, setEditBrandId] = useState<string | null>(null);
  const [editBrandName, setEditBrandName] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editBarcodeEditing, setEditBarcodeEditing] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editGoodId, setEditGoodId] = useState("");
  const [editGoodName, setEditGoodName] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [goodsSearch, setGoodsSearch] = useState("");
  const [goodsResults, setGoodsResults] = useState<{ id: string; nameFa: string; category: { nameFa: string } }[]>([]);

  // ── Merge state
  const [survivor, setSurvivor] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  // ── Bulk import
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const sentinel = useRef<HTMLDivElement | null>(null);

  // ── Debounce search to URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (query === qParam) return;
      patchParam("q", query.trim() || null);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const patchParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`/admin/products${params.toString() ? `?${params}` : ""}`, { scroll: false });
    },
    [searchParams, router]
  );

  const clearParams = useCallback(
    (keys: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const k of keys) params.delete(k);
      router.replace(`/admin/products${params.toString() ? `?${params}` : ""}`, { scroll: false });
    },
    [searchParams, router]
  );

  // ── Fetch
  useEffect(() => {
    if (status !== "authed") return;
    let alive = true;
    setLoading(true);
    setNextCursor(null);
    productsApi
      .getProducts({
        q: qParam || undefined,
        brandId: brandIdParam || undefined,
        categoryId: categoryIdParam || undefined,
        status: statusParam || undefined,
        hasImage: hasImageParam || undefined,
        limit: 50,
      })
      .then((res) => {
        if (!alive) return;
        setRows(res.items);
        setTotal(res.total ?? 0);
        setNextCursor(res.nextCursor ?? null);
        setBrands(res.brands || []);
        setCategories(res.categories || []);
        setSurvivor(null);
        setPicked(new Set());
      })
      .catch(() => { if (alive) { setRows([]); setNextCursor(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [qParam, brandIdParam, categoryIdParam, statusParam, hasImageParam, status, user?.role]);

  // ── Infinite scroll
  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    productsApi.getProducts({
      q: qParam || undefined, brandId: brandIdParam || undefined,
      categoryId: categoryIdParam || undefined, status: statusParam || undefined,
      hasImage: hasImageParam || undefined, cursor: nextCursor, limit: 50,
    })
      .then((res) => { setRows((p) => [...p, ...res.items]); setNextCursor(res.nextCursor ?? null); })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [nextCursor, loadingMore, qParam, brandIdParam, categoryIdParam, statusParam, hasImageParam]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting && nextCursor && !loadingMore) loadMore(); }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextCursor, loadingMore, loadMore]);

  useEffect(() => { setQuery(qParam); }, [qParam]);

  // ── Brand search in edit mode — fetch from backend (all brands, not just current page)
  const brandSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (brandPickerMode !== "edit" || !brandPickerOpen) return;
    if (brandSearchTimer.current) clearTimeout(brandSearchTimer.current);
    brandSearchTimer.current = setTimeout(async () => {
      setBrandSearchBusy(true);
      try {
        const res = await adminApi.getBrands({ q: brandSearch.trim() || undefined, limit: 100 });
        setAdminBrands(res.items ?? []);
      } catch {
        setAdminBrands([]);
      } finally {
        setBrandSearchBusy(false);
      }
    }, 300);
    return () => { if (brandSearchTimer.current) clearTimeout(brandSearchTimer.current); };
  }, [brandSearch, brandPickerMode, brandPickerOpen]);
  if (status !== "authed" || user?.role !== "ADMIN") {
    return <div className="grid place-items-center py-24"><p className="text-sm font-bold text-muted-foreground">{m.admin.forbiddenTitle}</p></div>;
  }

  // ── Derived
  const activeFilterCount = [brandIdParam, categoryIdParam, statusParam, hasImageParam].filter(Boolean).length;
  const selectedBrand = brands.find((b) => b.id === brandIdParam);
  const selectedCategory = categories.find((c) => c.id === categoryIdParam);
  const selectedStatusLabel = statusParam ? STATUS_LABEL[statusParam] ?? statusParam : "";
  const selectedImageLabel = IMAGE_OPTIONS.find((o) => o.value === hasImageParam)?.label ?? "";

  // ── Actions
  const openDetail = (p: ProductRowDto) => { setActiveProduct(p); setDetailOpen(true); };

  const openEdit = (p: ProductRowDto) => {
    setEditLabel(p.label); setEditBrandId(p.brand?.id ?? null); setEditBrandName(p.brand?.name ?? "");
    setEditBarcode(p.barcode ?? ""); setEditBarcodeEditing(false); setEditImageUrl(p.imageUrl ?? "");
    setEditStatus(p.status); setEditGoodId(p.goodId); setEditGoodName(p.good.nameFa);
    setGoodsSearch(""); setGoodsResults([]); setActiveProduct(p);
    setDetailOpen(false); setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!activeProduct) return;
    setEditBusy(true);
    try {
      await productsApi.adminEdit(activeProduct.id, {
        label: editLabel, brandId: editBrandId, barcode: editBarcode || null,
        imageUrl: editImageUrl || null, status: editStatus,
        ...(editGoodId !== activeProduct.goodId ? { goodId: editGoodId } : {}),
      });
      toast({ title: "محصول ویرایش شد" });
      setEditOpen(false);
      setRows((prev) => prev.map((r) => r.id === activeProduct.id ? {
        ...r, label: editLabel, barcode: editBarcode || null, imageUrl: editImageUrl || null, status: editStatus,
        brand: editBrandId && editBrandName ? { id: editBrandId, name: editBrandName } : null,
      } : r));
    } catch (err) { toast({ title: "خطا در ویرایش", description: String(err), variant: "destructive" }); }
    finally { setEditBusy(false); }
  };

  const doDelete = async () => {
    if (!activeProduct) return;
    setDeleteBusy(true);
    try {
      await productsApi.adminDelete(activeProduct.id);
      toast({ title: "محصول حذف شد" });
      setEditOpen(false);
      setRows((prev) => prev.filter((r) => r.id !== activeProduct.id));
    } catch (err) { toast({ title: "خطا در حذف", description: String(err), variant: "destructive" }); }
    finally { setDeleteBusy(false); }
  };

  const searchGoods = async (q: string) => {
    setGoodsSearch(q);
    if (q.trim().length < 2) { setGoodsResults([]); return; }
    try {
      const res = await adminApi.getGoods({ q: q.trim(), limit: 10 });
      setGoodsResults(res.items.map((g) => ({ id: g.id, nameFa: g.nameFa, category: { nameFa: g.category.nameFa } })));
    } catch { /* silent */ }
  };

  const togglePicked = (id: string) => { setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };

  const merge = async () => {
    if (!survivor) { toast({ title: m.admin.products.pickSurvivor, variant: "destructive" }); return; }
    const fromIds = [...picked].filter((id) => id !== survivor);
    if (fromIds.length === 0) { toast({ title: m.admin.products.pickAtLeastOne, variant: "destructive" }); return; }
    setMerging(true);
    try {
      const res = await productsApi.adminMerge({ intoId: survivor, fromIds });
      toast({ title: m.admin.products.merged.replace("{n}", String(res.merged)) });
      setRows((l) => l.filter((r) => !fromIds.includes(r.id)));
      setPicked(new Set()); setSurvivor(null);
    } catch { toast({ title: m.picker.submitFailed.replace("{n}", String(fromIds.length)), variant: "destructive" }); }
    finally { setMerging(false); }
  };

  const filteredFilterBrands = brands.filter((b) => !brandSearch.trim() || b.name.includes(brandSearch.trim()));
  const filteredCategories = categories.filter((c) => !brandSearch.trim() || c.nameFa.includes(brandSearch.trim()) || c.nameEn.toLowerCase().includes(brandSearch.trim().toLowerCase()));

  // ── Filter button: shows selected value ON the button itself
  const filterBtn = (icon: React.ReactNode, label: string, valueLabel: string | null, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
        valueLabel ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-muted-foreground hover:border-stone-300"
      }`}
    >
      {icon}
      <span className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        {valueLabel && <span className="max-w-[100px] truncate text-[10px] font-bold opacity-80">{valueLabel}</span>}
      </span>
      <ChevronDown className="size-3 opacity-70" />
    </button>
  );

  // ── Sidebar filter panel (shared between desktop sidebar & mobile drawer)
  const FilterPanel = () => (
    <div className="space-y-5">
      {/* Status (horizontal, compact) */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
          <CheckCircle2 className="size-3.5" /> وضعیت
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <FilterPill label="همه" active={!statusParam} onClick={() => patchParam("status", null)} />
          {STATUSES.map((st) => (
            <FilterPill key={st} label={STATUS_LABEL[st]} active={statusParam === st} onClick={() => patchParam("status", st)} />
          ))}
        </div>
      </div>
      {/* Image (toggle switch) */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
          <ImageIcon className="size-3.5" /> عکس محصول
        </h3>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors hover:bg-accent">
          <input
            type="checkbox"
            checked={hasImageParam === "yes"}
            onChange={(e) => patchParam("hasImage", e.target.checked ? "yes" : null)}
            className="size-4 accent-primary"
          />
          فقط عکس‌دار
        </label>
      </div>
      {/* Brand (searchable list) */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
          <Tag className="size-3.5" /> برند
        </h3>
        <div className="relative mb-2">
          <Search className="absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="جستجوی برند..." className="h-8 pe-8 ps-8 text-xs" />
        </div>
        <ScrollArea className="h-64">
          <div className="space-y-0.5 pe-1">
            <FilterRadioItem label="همه" active={!brandIdParam} onClick={() => patchParam("brandId", null)} />
            {filteredFilterBrands.slice(0, 100).map((b) => (
              <FilterRadioItem key={b.id} label={`${b.name} (${fa(b.count)})`} active={brandIdParam === b.id} onClick={() => patchParam("brandId", b.id)} />
            ))}
          </div>
        </ScrollArea>
      </div>
      {/* Category */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
          <Layers className="size-3.5" /> دسته‌بندی
        </h3>
        <div className="space-y-0.5">
          <FilterRadioItem label="همه" active={!categoryIdParam} onClick={() => patchParam("categoryId", null)} />
          {categories.map((c) => (
            <FilterRadioItem key={c.id} label={`${c.nameFa} (${fa(c.count)})`} active={categoryIdParam === c.id} onClick={() => patchParam("categoryId", c.id)} />
          ))}
        </div>
      </div>
      {/* Clear all */}
      {activeFilterCount > 0 && (
        <Button size="sm" variant="outline" className="w-full" onClick={() => { clearParams(["brandId", "categoryId", "status", "hasImage"]); setBrandSearch(""); }}>
          <X className="size-3.5" /> پاک کردن همه فیلترها
        </Button>
      )}
    </div>
  );

  // ── Product card
  const ProductCard = ({ p }: { p: ProductRowDto }) => {
    const isSurvivor = survivor === p.id;
    const isMerged = picked.has(p.id) && !isSurvivor;
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => openDetail(p)}
        className={`flex w-full max-w-full items-center gap-3 overflow-hidden rounded-xl border bg-white p-3 text-start shadow-sm transition hover:shadow-md ${isSurvivor ? "ring-2 ring-emerald-500" : isMerged ? "opacity-60" : ""}`}
      >
        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100">
          {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-base font-black text-stone-400">{p.good.nameFa.slice(0, 1)}</span>}
        </span>
        <div className="min-w-0 grow">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-extrabold">{p.label}</p>
            <Badge className={`h-4.5 shrink-0 px-1 text-[9px] font-bold ${p.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {STATUS_LABEL[p.status] ?? p.status}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{goodName(p.good)} · {categoryName(p.good.category)}{p.brand && ` · ${p.brand.name}`}</p>
          {p.barcode && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70" dir="ltr">{p.barcode}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={(e) => { e.stopPropagation(); setSurvivor(isSurvivor ? null : p.id); if (!isSurvivor) setPicked((s) => new Set(s).add(p.id)); }}
            className={`grid size-7 place-items-center rounded-full border transition ${isSurvivor ? "border-emerald-500 bg-emerald-500 text-white" : "text-muted-foreground hover:text-emerald-600"}`}>
            <Check className="size-4" />
          </button>
          {!isSurvivor && (
            <button type="button" onClick={(e) => { e.stopPropagation(); togglePicked(p.id); }}
              className={`grid size-7 place-items-center rounded-full border transition ${isMerged ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}>
              {isMerged ? <Check className="size-4" /> : <Plus className="size-4" />}
            </button>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="flex gap-6 overflow-hidden">
      {/* ── Desktop sidebar filters */}
      {!isMobile && (
        <aside className="sticky top-16 w-64 shrink-0 self-start">
          <div className="rounded-xl border bg-white p-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-extrabold">
              <SlidersHorizontal className="size-4 text-primary" /> فیلترها
            </h2>
            <FilterPanel />
          </div>
        </aside>
      )}

      {/* ── Main content */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative grow">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={m.admin.products.searchPlaceholder || "جستجو..."} className="h-10 rounded-xl bg-white pe-9 ps-9" />
            {query && <button type="button" onClick={() => { setQuery(""); patchParam("q", null); }} className="absolute start-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-stone-200 text-stone-600"><X className="size-3" /></button>}
          </div>
          {/* Mobile: filter button */}
          {isMobile && (
            <Button size="sm" variant="outline" className="h-10 shrink-0 gap-1.5 rounded-xl px-3" onClick={() => setMobileFilterOpen(true)}>
              <SlidersHorizontal className="size-4" />
              {activeFilterCount > 0 && <span className="grid size-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground">{activeFilterCount}</span>}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-10 shrink-0 gap-1.5 rounded-xl px-3" onClick={() => setBulkOpen(!bulkOpen)}>
            <FileJson className="size-4" /><span className="hidden sm:inline">ثبت گروهی</span>
          </Button>
        </div>

        {/* Mobile filter chips (inline, compact) */}
        {isMobile && activeFilterCount > 0 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] max-w-full">
            {filterBtn(<X className="size-3" />, "همه", null, () => clearParams(["brandId", "categoryId", "status", "hasImage"]))}
            {filterBtn(<Layers className="size-3" />, "دسته", selectedCategory?.nameFa ?? null, () => setMobileFilterOpen(true))}
            {filterBtn(<Tag className="size-3" />, "برند", selectedBrand?.name ?? null, () => setMobileFilterOpen(true))}
            {filterBtn(<CheckCircle2 className="size-3" />, "وضعیت", selectedStatusLabel || null, () => setMobileFilterOpen(true))}
            {hasImageParam === "yes" && filterBtn(<ImageIcon className="size-3" />, "عکس", "فقط عکس‌دار", () => setMobileFilterOpen(true))}
          </div>
        )}

        {/* Summary count */}
        <div className="mt-3 flex items-center justify-between px-1">
          <p className="text-xs font-bold text-muted-foreground">
            {loading ? <span className="inline-flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> در حال بارگذاری…</span>
              : total === 0 ? "بدون نتیجه"
              : <span><span className="font-extrabold text-foreground">{fa(total)}</span> محصول{nextCursor ? ` · ${fa(rows.length)} نمایش داده شده` : ""}</span>}
          </p>
          {picked.size > 0 && <span className="text-xs font-bold text-primary">{fa(picked.size)} مورد برای ادغام</span>}
        </div>

        {/* Bulk import */}
        {bulkOpen && (
          <div className="mt-3 rounded-xl border-2 border-primary/30 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold">ثبت گروهی کالاهای مرجع</span>
              <button type="button" onClick={() => setBulkOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <textarea value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} className="h-40 w-full rounded-lg border p-3 font-mono text-xs" dir="ltr"
              placeholder={JSON.stringify([{ brandId: "ID", goodName: "پفک", label: "پفک اشی مشی ۲۰تایی", barcode: "6260101530017" }], null, 2)} />
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={async () => {
                try { const parsed = JSON.parse(bulkJson); if (!Array.isArray(parsed)) { toast({ title: "JSON باید آرایه باشد", variant: "destructive" }); return; }
                  setBulkBusy(true); const res = await productsApi.bulkCreate({ items: parsed });
                  toast({ title: `${res.saved} کالا ثبت شد${res.skipped > 0 ? ` · ${res.skipped} تکراری` : ""}${res.failed > 0 ? ` · ${res.failed} خطا` : ""}` });
                  setBulkOpen(false); patchParam("q", qParam + " ");
                } catch (err) { toast({ title: "خطا در JSON یا ثبت", description: String(err), variant: "destructive" }); }
                finally { setBulkBusy(false); }
              }} disabled={bulkBusy || !bulkJson.trim()}>
                {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} ثبت
              </Button>
            </div>
          </div>
        )}

        {/* Product list */}
        <div className="mt-2 grid gap-2">
          {loading && Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white" />)}
          {!loading && rows.length === 0 && (
            <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
              <Package className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-bold text-muted-foreground">{m.admin.products.empty || "موردی یافت نشد"}</p>
            </div>
          )}
          {rows.map((p) => <ProductCard key={p.id} p={p} />)}
          {loadingMore && <div className="grid place-items-center py-4"><Loader2 className="size-5 animate-spin text-primary" /></div>}
          <div ref={sentinel} />
          {!nextCursor && rows.length > 0 && !loading && <p className="py-6 text-center text-xs font-bold text-muted-foreground">پایان لیست — {fa(total)} محصول</p>}
        </div>

        {/* Merge bar */}
        {picked.size > 0 && (
          <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-white/95 p-2.5 shadow-lg backdrop-blur">
            <span className="ps-2 text-sm font-extrabold">{m.admin.products.mergeInto?.replace("{n}", String(picked.size)) || `${picked.size} مورد برای ادغام`}
              {survivor && <span className="ms-1.5 text-[11px] font-bold text-emerald-600">→ {rows.find((r) => r.id === survivor)?.label}</span>}
            </span>
            <span className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => { setPicked(new Set()); setSurvivor(null); }}><X className="size-4" /></Button>
              <Button size="sm" onClick={() => void merge()} disabled={merging || !survivor}>{merging ? <Loader2 className="size-4 animate-spin" /> : <Merge className="size-4" />} ادغام</Button>
            </span>
          </div>
        )}
      </div>

      {/* ── Mobile filter drawer */}
      <Drawer open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-1.5 text-base font-extrabold"><SlidersHorizontal className="size-4 text-primary" /> فیلترها</DrawerTitle>
            <DrawerDescription className="sr-only">فیلتر محصولات</DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-6" style={{ maxHeight: "70vh" }}>
            <FilterPanel />
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* ── Product Detail Drawer (mobile: bottom sheet, desktop: centered dialog) */}
      <Drawer open={isMobile && detailOpen} onOpenChange={(v) => { if (isMobile) setDetailOpen(v); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2"><DrawerTitle className="text-base font-extrabold">{activeProduct?.label}</DrawerTitle></DrawerHeader>
          <ScrollArea className="px-4 pb-4" style={{ maxHeight: "65vh" }}>
            {activeProduct && DetailContent()}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
      {!isMobile && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="text-base font-extrabold">{activeProduct?.label}</DialogTitle></DialogHeader>
            {DetailContent()}
          </DialogContent>
        </Dialog>
      )}

      {/* ── Edit Drawer/Dialog */}
      <Drawer open={isMobile && editOpen} onOpenChange={(v) => { if (isMobile) setEditOpen(v); }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2 shrink-0">
            <DrawerTitle className="flex items-center gap-1.5 text-base font-extrabold"><Pencil className="size-4 text-primary" /> ویرایش محصول</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-6" style={{ maxHeight: "75vh" }}>
            {EditContent()}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
      {!isMobile && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0"><DialogTitle className="flex items-center gap-1.5 text-base font-extrabold"><Pencil className="size-4 text-primary" /> ویرایش محصول</DialogTitle></DialogHeader>
            <ScrollArea className="grow" style={{ maxHeight: "65vh" }}>
              {EditContent()}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Brand Picker Drawer (for edit mode — filter mode uses sidebar) */}
      <Drawer open={isMobile && brandPickerOpen} onOpenChange={(v) => { if (isMobile) setBrandPickerOpen(v); }}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-2 shrink-0">
            <DrawerTitle className="text-base font-extrabold">{brandPickerMode === "edit" ? "انتخاب برند محصول" : "فیلتر بر اساس برند"}</DrawerTitle>
          </DrawerHeader>
          {BrandPickerContent()}
        </DrawerContent>
      </Drawer>
      {!isMobile && (
        <Dialog open={brandPickerOpen} onOpenChange={setBrandPickerOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0"><DialogTitle className="text-base font-extrabold">{brandPickerMode === "edit" ? "انتخاب برند محصول" : "فیلتر بر اساس برند"}</DialogTitle></DialogHeader>
            {BrandPickerContent()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  // ── Detail content (shared between Drawer and Dialog)
  function DetailContent() {
    if (!activeProduct) return null;
    return (
      <div className="space-y-4">
        {activeProduct.imageUrl && <div className="overflow-hidden rounded-xl"><img src={activeProduct.imageUrl} alt="" className="h-40 w-full object-cover" /></div>}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <InfoBlock label="نوع کالا" value={goodName(activeProduct.good)} />
          <InfoBlock label="دسته" value={categoryName(activeProduct.good.category)} />
          <InfoBlock label="برند" value={activeProduct.brand?.name || "—"} />
          <InfoBlock label="واحد" value={unitLabel(activeProduct.good.unit)} />
          <InfoBlock label="بارکد" value={activeProduct.barcode || "—"} />
          <InfoBlock label="وضعیت" value={STATUS_LABEL[activeProduct.status] ?? activeProduct.status} />
          <InfoBlock label="فروشندگان" value={String(activeProduct.sellers)} />
          <InfoBlock label="شناسه" value={activeProduct.id.slice(-8)} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="grow" onClick={() => openEdit(activeProduct)}><Pencil className="size-4" /> ویرایش</Button>
          <Button size="sm" variant="outline" onClick={() => { patchParam("brandId", activeProduct.brand?.id ?? null); setDetailOpen(false); }}><Tag className="size-4" /> فیلتر این برند</Button>
          <Button size="sm" variant="destructive" disabled={activeProduct.sellers > 0} title={activeProduct.sellers > 0 ? "این محصول آگهی فعال دارد" : "حذف محصول"} onClick={() => openEdit(activeProduct)}><Trash2 className="size-4" /></Button>
        </div>
      </div>
    );
  }

  // ── Edit content (shared between Drawer and Dialog)
  function EditContent() {
    return (
      <div className="space-y-4">
        {/* Label */}
        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">نام محصول (label)</label>
          <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-10" />
        </div>
        {/* Brand */}
        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">برند</label>
          <button type="button" onClick={() => { setBrandSearch(""); setBrandPickerMode("edit"); setBrandPickerOpen(true); }} className="flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-sm">
            {editBrandName || "انتخاب برند..."}<ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </div>
        {/* Good search */}
        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">نوع کالا (Good)</label>
          <Input value={goodsSearch || editGoodName} onChange={(e) => { setEditGoodName(e.target.value); searchGoods(e.target.value); }} placeholder="جستجوی نوع کالا..." className="h-10" />
          {goodsResults.length > 0 && (
            <div className="mt-1 max-h-40 overflow-auto rounded-lg border">
              {goodsResults.map((g) => (
                <button key={g.id} type="button" onClick={() => { setEditGoodId(g.id); setEditGoodName(g.nameFa); setGoodsResults([]); setGoodsSearch(""); }} className="block w-full px-3 py-2 text-start text-xs hover:bg-accent">
                  <span className="font-bold">{g.nameFa}</span><span className="ms-2 text-muted-foreground">{g.category.nameFa}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Barcode (read-only with pencil) */}
        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">بارکد</label>
          <div className="flex items-center gap-2">
            {editBarcodeEditing ? (
              <>
                <Input value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} className="h-10 font-mono" dir="ltr" autoFocus />
                <Button size="sm" type="button" className="h-10 shrink-0 px-3" onClick={() => setEditBarcodeEditing(false)} title="تأیید"><Check className="size-4" /></Button>
              </>
            ) : (
              <>
                <div className="flex h-10 grow items-center rounded-lg border bg-muted/30 px-3 font-mono text-sm text-muted-foreground" dir="ltr">{editBarcode || "— بدون بارکد —"}</div>
                <Button size="sm" type="button" variant="outline" className="h-10 shrink-0 px-3" onClick={() => setEditBarcodeEditing(true)} title="ویرایش بارکد"><Pencil className="size-4" /></Button>
              </>
            )}
          </div>
        </div>
        {/* Image URL */}
        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">آدرس تصویر</label>
          <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} className="h-10" dir="ltr" />
        </div>
        {/* Status */}
        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">وضعیت</label>
          <div className="flex gap-2">
            {STATUSES.map((st) => (
              <button key={st} type="button" onClick={() => setEditStatus(st)} className={`flex-1 rounded-lg border px-4 py-2 text-xs font-bold ${editStatus === st ? "border-primary bg-primary/10 text-primary" : "border-stone-200 text-muted-foreground"}`}>{STATUS_LABEL[st] ?? st}</button>
            ))}
          </div>
        </div>
        {/* Save & Delete */}
        <div className="flex gap-2 pt-3">
          <Button size="sm" className="grow" onClick={() => void saveEdit()} disabled={editBusy}>{editBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} ذخیره</Button>
          <Button size="sm" variant="destructive" onClick={() => void doDelete()} disabled={deleteBusy || (activeProduct?.sellers ?? 0) > 0} title={(activeProduct?.sellers ?? 0) > 0 ? "این محصول آگهی فعال دارد" : "حذف"}>{deleteBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button>
        </div>
      </div>
    );
  }

  // ── Brand picker content (shared)
  function BrandPickerContent() {
    return (
      <>
        <div className="px-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="جستجوی برند..." className="h-10 pe-9 ps-9" autoFocus />
            {brandSearch && <button type="button" onClick={() => setBrandSearch("")} className="absolute start-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-stone-200 text-stone-600"><X className="size-3" /></button>}
          </div>
        </div>
        {brandPickerMode === "filter" && (
          <div className="px-4 pb-1 shrink-0">
            <button type="button" onClick={() => { patchParam("brandId", null); setBrandPickerOpen(false); setBrandSearch(""); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent">
              <span className="text-sm font-bold">همه برندها</span>{!brandIdParam && <Check className="size-4 text-primary" />}
            </button>
          </div>
        )}
        <ScrollArea className="px-4 pb-4 grow" style={{ maxHeight: "50vh" }}>
          <div className="space-y-1">
            {brandPickerMode === "filter" && filteredFilterBrands.map((b) => (
              <button key={b.id} type="button" onClick={() => { patchParam("brandId", brandIdParam === b.id ? null : b.id); setBrandPickerOpen(false); setBrandSearch(""); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent">
                <span className="flex items-center gap-2 text-sm font-bold">{brandIdParam === b.id && <Check className="size-4 text-primary" />}{b.name}</span>
                <span className="text-xs text-muted-foreground">{fa(b.count)} محصول</span>
              </button>
            ))}
            {brandPickerMode === "edit" && !brandSearchBusy && adminBrands.filter((b) => !brandSearch.trim() || b.name.includes(brandSearch.trim())).map((b) => (
              <button key={b.id} type="button" onClick={() => { setEditBrandId(b.id); setEditBrandName(b.name); setBrandPickerOpen(false); setBrandSearch(""); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent">
                <span className="flex items-center gap-2 text-sm font-bold">{editBrandId === b.id && <Check className="size-4 text-primary" />}{b.name}</span>
                <span className="text-xs text-muted-foreground">{fa(b._count.products)} محصول</span>
              </button>
            ))}
            {brandPickerMode === "edit" && !brandSearch.trim() && (
              <button type="button" onClick={() => { setEditBrandId(null); setEditBrandName(""); setBrandPickerOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-muted-foreground hover:bg-accent">
                <X className="size-4" /><span className="text-sm font-bold">حذف برند</span>
              </button>
            )}
          </div>
        </ScrollArea>
      </>
    );
  }
}

// ── Small filter radio item
function FilterRadioItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs transition-colors hover:bg-accent ${active ? "font-bold text-primary" : "text-muted-foreground"}`}>
      {active ? <Check className="size-3.5 shrink-0" /> : <Circle className="size-3.5 shrink-0 text-muted-foreground/30" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

// ── Compact horizontal filter pill
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-stone-200 text-muted-foreground hover:border-stone-300"}`}
    >
      {label}
    </button>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2.5">
      <p className="text-[10px] font-bold text-muted-foreground/70">{label}</p>
      <p className="mt-0.5 text-xs font-extrabold" dir="auto">{value}</p>
    </div>
  );
}
