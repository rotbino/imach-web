"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  productsApi,
  type ProductRowDto,
  type BrandChipDto,
  type CategoryChipDto,
} from "@/lib/api";
import { adminApi, type AdminBrandDto } from "../api";
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

  // ── Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // ── Patch URL params
  const patchParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.replace(`/admin/products${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }, [searchParams, router]);

  const clearParams = useCallback(
    (keys: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const k of keys) params.delete(k);
      router.replace(`/admin/products${params.toString() ? `?${params}` : ""}`, { scroll: false });
    },
    [searchParams, router]
  );

  // ── Fetch products
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

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting && nextCursor && !loadingMore) loadMore(); }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextCursor, loadingMore, loadMore]);

  useEffect(() => { setQuery(qParam); }, [qParam]);

  // ── Brand search — fetch from backend (ALL brands, not just current page)
  // Triggers whenever brandSearch changes — works for BOTH sidebar and picker
  const brandSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!brandSearch.trim()) { setAdminBrands([]); return; }
    if (brandSearchTimer.current) clearTimeout(brandSearchTimer.current);
    brandSearchTimer.current = setTimeout(async () => {
      setBrandSearchBusy(true);
      try {
        const res = await adminApi.getBrands({ q: brandSearch.trim(), limit: 100 });
        setAdminBrands(res.items ?? []);
      } catch {
        setAdminBrands([]);
      } finally {
        setBrandSearchBusy(false);
      }
    }, 300);
    return () => { if (brandSearchTimer.current) clearTimeout(brandSearchTimer.current); };
  }, [brandSearch]);

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

  // ── Filter button helper
  const filterBtn = (icon: React.ReactNode, label: string, valueLabel: string | null, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
        valueLabel ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-muted-foreground hover:border-stone-300"
      }`}
    >
      {icon}
      <span>{label}</span>
      {valueLabel && <span className="text-[10px] font-bold opacity-70">({valueLabel})</span>}
      <ChevronDown className="size-3" />
    </button>
  );

  // ── Sidebar brand search results (from adminBrands when searching)
  const sidebarBrandResults = brandSearch.trim()
    ? adminBrands.filter((b) => b.name.toLowerCase().includes(brandSearch.trim().toLowerCase()))
    : [];
  const sidebarPageBrands = brands.filter((b) => !brandSearch.trim() || b.name.includes(brandSearch.trim()));

  return (
    <div className="flex gap-6 overflow-hidden">
      {/* ── Desktop sidebar filters */}
      {!isMobile && (
        <aside className="sticky top-16 w-64 shrink-0 self-start">
          <div className="rounded-xl border bg-white p-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-extrabold">
              <SlidersHorizontal className="size-4 text-primary" /> فیلترها
            </h2>
            {/* Status */}
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                <Package className="size-3.5" /> وضعیت
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <FilterPill label="همه" active={!statusParam} onClick={() => patchParam("status", null)} />
                {STATUSES.map((st) => (
                  <FilterPill key={st} label={STATUS_LABEL[st]} active={statusParam === st} onClick={() => patchParam("status", st)} />
                ))}
              </div>
            </div>
            {/* Image */}
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                <ImageIcon className="size-3.5" /> عکس محصول
              </h3>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors hover:bg-accent">
                <input type="checkbox" checked={hasImageParam === "yes"} onChange={(e) => patchParam("hasImage", e.target.checked ? "yes" : null)} className="size-4 accent-primary" />
                فقط عکس‌دار
              </label>
            </div>
            {/* Brand (searchable — searches ALL brands from backend) */}
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                <Tag className="size-3.5" /> برند
              </h3>
              <div className="relative mb-2">
                <Search className="absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  key="sidebar-brand-search"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="جستجوی برند..."
                  className="h-8 pe-8 ps-8 text-xs"
                />
                {brandSearch && (
                  <button type="button" onClick={() => setBrandSearch("")} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-0.5 pe-1">
                  {!brandSearch.trim() && (
                    <>
                      <FilterRadioItem label="همه" active={!brandIdParam} onClick={() => patchParam("brandId", null)} />
                      {sidebarPageBrands.slice(0, 100).map((b) => (
                        <FilterRadioItem key={b.id} label={`${b.name} (${fa(b.count)})`} active={brandIdParam === b.id} onClick={() => patchParam("brandId", b.id)} />
                      ))}
                    </>
                  )}
                  {brandSearch.trim() && brandSearchBusy && (
                    <div className="flex items-center justify-center py-4"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
                  )}
                  {brandSearch.trim() && !brandSearchBusy && sidebarBrandResults.map((b) => (
                    <FilterRadioItem key={b.id} label={`${b.name} (${fa(b._count.products)})`} active={brandIdParam === b.id} onClick={() => patchParam("brandId", b.id)} />
                  ))}
                  {brandSearch.trim() && !brandSearchBusy && sidebarBrandResults.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">برندی یافت نشد</p>
                  )}
                </div>
              </ScrollArea>
            </div>
            {/* Category */}
            <div className="mb-4">
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
        </aside>
      )}

      {/* ── Main content */}
      <div className="min-w-0 grow">
        {/* Search bar */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative grow">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              key="main-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") patchParam("q", query || null); }}
              placeholder="جستجوی محصول..."
              className="pe-9 ps-9"
            />
          </div>
          <Button onClick={() => patchParam("q", query || null)}>{loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} جستجو</Button>
          {isMobile && (
            <Button variant="outline" size="icon" onClick={() => setMobileFilterOpen(true)}>
              <SlidersHorizontal className="size-4" />
            </Button>
          )}
        </div>

        {/* Filter pills */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filterBtn(<Package className="size-3" />, "وضعیت", selectedStatusLabel || null, () => {
            if (isMobile) setBrandPickerMode("filter");
            setMobileFilterOpen(true);
          })}
          {filterBtn(<Tag className="size-3" />, "برند", selectedBrand?.name ?? null, () => {
            setBrandPickerMode("filter");
            setBrandPickerOpen(true);
          })}
          {filterBtn(<Layers className="size-3" />, "دسته", selectedCategory?.nameFa ?? null, () => setCategoryPickerOpen(true))}
          {filterBtn(<ImageIcon className="size-3" />, "عکس", selectedImageLabel || null, () => {
            patchParam("hasImage", hasImageParam === "yes" ? null : "yes");
          })}
          {activeFilterCount > 0 && (
            <button type="button" onClick={() => { clearParams(["brandId", "categoryId", "status", "hasImage"]); setBrandSearch(""); }} className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
              <X className="size-3" /> پاک کردن
            </button>
          )}
          <div className="ms-auto flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{fa(total)} محصول</span>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}><FileJson className="size-4" /> ورود گروهی</Button>
          </div>
        </div>

        {/* Merge bar */}
        {picked.size > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border bg-amber-50 p-3">
            <Merge className="size-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-800">{fa(picked.size)} محصول انتخاب شده</span>
            {survivor && <span className="text-xs font-bold text-emerald-700">→ بازمانده انتخاب شد</span>}
            <Button size="sm" disabled={!survivor || merging} onClick={merge} className="ms-auto">
              {merging ? <Loader2 className="size-4 animate-spin" /> : <Merge className="size-4" />} ادغام
            </Button>
          </div>
        )}

        {/* Product list */}
        {loading ? (
          <div className="grid place-items-center py-24"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center py-24"><p className="text-sm font-bold text-muted-foreground">محصولی یافت نشد</p></div>
        ) : (
          <div className="space-y-2">
            {rows.map((p) => (
              <ProductCard key={p.id} p={p} survivor={survivor} picked={picked} onOpen={openDetail} onToggleSurvivor={(id) => { setSurvivor(survivor === id ? null : id); if (survivor !== id) setPicked((s) => new Set(s).add(id)); }} onTogglePicked={togglePicked} />
            ))}
            <div ref={sentinel} className="h-4" />
            {loadingMore && <div className="grid place-items-center py-4"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}
          </div>
        )}
      </div>

      {/* ── Mobile filter drawer */}
      <Drawer open={isMobile && mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-2 shrink-0">
            <DrawerTitle className="text-base font-extrabold">فیلترها</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">فیلترهای محصولات را تنظیم کنید</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {/* Same brand search as sidebar */}
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-extrabold text-muted-foreground">برند</h3>
              <div className="relative mb-2">
                <Search className="absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  key="mobile-brand-search"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="جستجوی برند..."
                  className="h-8 pe-8 ps-8 text-xs"
                />
              </div>
              <ScrollArea className="h-48">
                <div className="space-y-0.5">
                  {!brandSearch.trim() && (
                    <>
                      <FilterRadioItem label="همه" active={!brandIdParam} onClick={() => patchParam("brandId", null)} />
                      {sidebarPageBrands.slice(0, 100).map((b) => (
                        <FilterRadioItem key={b.id} label={`${b.name} (${fa(b.count)})`} active={brandIdParam === b.id} onClick={() => patchParam("brandId", b.id)} />
                      ))}
                    </>
                  )}
                  {brandSearch.trim() && brandSearchBusy && (
                    <div className="flex items-center justify-center py-4"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
                  )}
                  {brandSearch.trim() && !brandSearchBusy && sidebarBrandResults.map((b) => (
                    <FilterRadioItem key={b.id} label={`${b.name} (${fa(b._count.products)})`} active={brandIdParam === b.id} onClick={() => patchParam("brandId", b.id)} />
                  ))}
                </div>
              </ScrollArea>
            </div>
            {/* Category */}
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-extrabold text-muted-foreground">دسته‌بندی</h3>
              <div className="space-y-0.5">
                <FilterRadioItem label="همه" active={!categoryIdParam} onClick={() => patchParam("categoryId", null)} />
                {categories.map((c) => (
                  <FilterRadioItem key={c.id} label={`${c.nameFa} (${fa(c.count)})`} active={categoryIdParam === c.id} onClick={() => patchParam("categoryId", c.id)} />
                ))}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Detail drawer/dialog */}
      <Drawer open={isMobile && detailOpen} onOpenChange={setDetailOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2 shrink-0">
            <DrawerTitle className="text-base font-extrabold">جزئیات محصول</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {!activeProduct ? null : (
              <div className="space-y-4">
                {activeProduct.imageUrl && <div className="overflow-hidden rounded-xl"><img src={activeProduct.imageUrl} alt="" className="h-40 w-full object-cover" /></div>}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <InfoBlock label="نوع کالا" value={goodName(activeProduct.good)} />
                  <InfoBlock label="دسته" value={categoryName(activeProduct.good.category)} />
                  <InfoBlock label="برند" value={activeProduct.brand?.name || "—"} />
                  <InfoBlock label="واحد" value={unitLabel(activeProduct.good.unit)} />
                  <InfoBlock label="بارکد" value={activeProduct.barcode || "—"} />
                  <InfoBlock label="وضعیت" value={STATUS_LABEL[activeProduct.status] ?? activeProduct.status} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="grow" onClick={() => openEdit(activeProduct)}><Pencil className="size-4" /> ویرایش</Button>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      {!isMobile && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="text-base font-extrabold">جزئیات محصول</DialogTitle></DialogHeader>
            {!activeProduct ? null : (
              <div className="space-y-4">
                {activeProduct.imageUrl && <div className="overflow-hidden rounded-xl"><img src={activeProduct.imageUrl} alt="" className="h-40 w-full object-cover" /></div>}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <InfoBlock label="نوع کالا" value={goodName(activeProduct.good)} />
                  <InfoBlock label="دسته" value={categoryName(activeProduct.good.category)} />
                  <InfoBlock label="برند" value={activeProduct.brand?.name || "—"} />
                  <InfoBlock label="واحد" value={unitLabel(activeProduct.good.unit)} />
                  <InfoBlock label="بارکد" value={activeProduct.barcode || "—"} />
                  <InfoBlock label="وضعیت" value={STATUS_LABEL[activeProduct.status] ?? activeProduct.status} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="grow" onClick={() => openEdit(activeProduct)}><Pencil className="size-4" /> ویرایش</Button>
                  <Button size="sm" variant="destructive" onClick={() => void doDelete()} disabled={deleteBusy || (activeProduct.sellers ?? 0) > 0} title={(activeProduct.sellers ?? 0) > 0 ? "این محصول آگهی فعال دارد" : "حذف"}>{deleteBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── Edit drawer/dialog */}
      <Drawer open={isMobile && editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2 shrink-0">
            <DrawerTitle className="text-base font-extrabold">ویرایش محصول</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">نام محصول</label>
              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">برند</label>
              <button type="button" onClick={() => { setBrandPickerMode("edit"); setBrandPickerOpen(true); setBrandSearch(""); }} className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-start text-sm hover:bg-accent">
                <span className="font-bold">{editBrandName || "انتخاب برند..."}</span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">نوع کالا</label>
              <button type="button" onClick={() => setGoodsSearch("__open__")} className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-start text-sm hover:bg-accent">
                <span className="font-bold">{editGoodName || "انتخاب کالا..."}</span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
              {goodsSearch === "__open__" && (
                <div className="mt-2 space-y-2">
                  <Input value="" onChange={(e) => searchGoods(e.target.value)} placeholder="جستجوی کالا..." className="h-10" autoFocus />
                  <div className="max-h-48 overflow-y-auto rounded-lg border">
                    {goodsResults.map((g) => (
                      <button key={g.id} type="button" onClick={() => { setEditGoodId(g.id); setEditGoodName(g.nameFa); setGoodsSearch(""); }} className="flex w-full items-center justify-between px-3 py-2 text-start hover:bg-accent">
                        <span className="text-sm font-bold">{g.nameFa}</span>
                        <span className="text-xs text-muted-foreground">{g.category.nameFa}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">بارکد</label>
              <Input value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} className="h-10 font-mono" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">عکس (URL)</label>
              <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} className="h-10" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">وضعیت</label>
              <div className="flex gap-2">
                {STATUSES.map((st) => (
                  <Button key={st} size="sm" variant={editStatus === st ? "default" : "outline"} onClick={() => setEditStatus(st)}>{STATUS_LABEL[st]}</Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="grow" onClick={() => void saveEdit()} disabled={editBusy}>{editBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} ذخیره</Button>
              <Button size="sm" variant="destructive" onClick={() => void doDelete()} disabled={deleteBusy || (activeProduct?.sellers ?? 0) > 0} title={(activeProduct?.sellers ?? 0) > 0 ? "این محصول آگهی فعال دارد" : "حذف"}>{deleteBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      {!isMobile && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0"><DialogTitle className="text-base font-extrabold">ویرایش محصول</DialogTitle></DialogHeader>
            <ScrollArea className="grow">
              <div className="space-y-3 px-1 pb-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">نام محصول</label>
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-10" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">برند</label>
                  <button type="button" onClick={() => { setBrandPickerMode("edit"); setBrandPickerOpen(true); setBrandSearch(""); }} className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-start text-sm hover:bg-accent">
                    <span className="font-bold">{editBrandName || "انتخاب برند..."}</span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">نوع کالا</label>
                  <button type="button" onClick={() => setGoodsSearch("__open__")} className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-start text-sm hover:bg-accent">
                    <span className="font-bold">{editGoodName || "انتخاب کالا..."}</span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                  {goodsSearch === "__open__" && (
                    <div className="mt-2 space-y-2">
                      <Input value="" onChange={(e) => searchGoods(e.target.value)} placeholder="جستجوی کالا..." className="h-10" autoFocus />
                      <div className="max-h-48 overflow-y-auto rounded-lg border">
                        {goodsResults.map((g) => (
                          <button key={g.id} type="button" onClick={() => { setEditGoodId(g.id); setEditGoodName(g.nameFa); setGoodsSearch(""); }} className="flex w-full items-center justify-between px-3 py-2 text-start hover:bg-accent">
                            <span className="text-sm font-bold">{g.nameFa}</span>
                            <span className="text-xs text-muted-foreground">{g.category.nameFa}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">بارکد</label>
                  <Input value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} className="h-10 font-mono" dir="ltr" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">عکس (URL)</label>
                  <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} className="h-10" dir="ltr" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">وضعیت</label>
                  <div className="flex gap-2">
                    {STATUSES.map((st) => (
                      <Button key={st} size="sm" variant={editStatus === st ? "default" : "outline"} onClick={() => setEditStatus(st)}>{STATUS_LABEL[st]}</Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="grow" onClick={() => void saveEdit()} disabled={editBusy}>{editBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} ذخیره</Button>
                  <Button size="sm" variant="destructive" onClick={() => void doDelete()} disabled={deleteBusy || (activeProduct?.sellers ?? 0) > 0} title={(activeProduct?.sellers ?? 0) > 0 ? "این محصول آگهی فعال دارد" : "حذف"}>{deleteBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Brand Picker Dialog (for edit mode) */}
      <Dialog open={brandPickerOpen} onOpenChange={setBrandPickerOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0"><DialogTitle className="text-base font-extrabold">{brandPickerMode === "edit" ? "انتخاب برند محصول" : "فیلتر بر اساس برند"}</DialogTitle></DialogHeader>
          <div className="px-4 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                key="picker-brand-search"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="جستجوی برند..."
                className="h-10 pe-9 ps-9"
                autoFocus
              />
              {brandSearch && <button type="button" onClick={() => setBrandSearch("")} className="absolute start-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-stone-200 text-stone-600"><X className="size-3" /></button>}
            </div>
          </div>
          <ScrollArea className="px-4 pb-4 grow" style={{ maxHeight: "50vh" }}>
            <div className="space-y-1">
              {brandPickerMode === "filter" && !brandSearch.trim() && brands.map((b) => (
                <button key={b.id} type="button" onClick={() => { patchParam("brandId", brandIdParam === b.id ? null : b.id); setBrandPickerOpen(false); setBrandSearch(""); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent">
                  <span className="flex items-center gap-2 text-sm font-bold">{brandIdParam === b.id && <Check className="size-4 text-primary" />}{b.name}</span>
                  <span className="text-xs text-muted-foreground">{fa(b.count)} محصول</span>
                </button>
              ))}
              {brandSearch.trim() && brandSearchBusy && (
                <div className="flex items-center justify-center py-4"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
              )}
              {brandSearch.trim() && !brandSearchBusy && adminBrands.filter((b) => b.name.includes(brandSearch.trim())).map((b) => (
                <button key={b.id} type="button" onClick={() => {
                  if (brandPickerMode === "edit") { setEditBrandId(b.id); setEditBrandName(b.name); }
                  else { patchParam("brandId", b.id); }
                  setBrandPickerOpen(false); setBrandSearch("");
                }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    {brandPickerMode === "edit" && editBrandId === b.id && <Check className="size-4 text-primary" />}
                    {brandPickerMode === "filter" && brandIdParam === b.id && <Check className="size-4 text-primary" />}
                    {b.name}
                  </span>
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
        </DialogContent>
      </Dialog>

      {/* ── Bulk import dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0"><DialogTitle className="text-base font-extrabold">ورود گروهی محصولات</DialogTitle></DialogHeader>
          <ScrollArea className="grow">
            <div className="space-y-3 px-1 pb-4">
              <p className="text-xs text-muted-foreground">JSON آرایه‌ای از محصولات. هر آیتم: brandId, goodName, label, barcode?, imageUrl?</p>
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder={JSON.stringify([{ brandId: "ID", goodName: "پفک", label: "پفک اشی مشی ۲۰تایی", barcode: "6260101530017" }], null, 2)}
                className="min-h-[200px] w-full rounded-lg border p-3 font-mono text-xs"
              />
              <Button onClick={async () => {
                setBulkBusy(true);
                try {
                  const items = JSON.parse(bulkJson);
                  const res = await productsApi.bulkCreate(items);
                  toast({ title: `${res.saved} ذخیره، ${res.skipped} تکراری، ${res.failed} خطا` });
                  setBulkOpen(false);
                } catch (err) { toast({ title: "خطا", description: String(err), variant: "destructive" }); }
                finally { setBulkBusy(false); }
              }} disabled={bulkBusy} className="w-full">
                {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} ثبت
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Product card (memoized to prevent re-render on parent state change)
const ProductCard = memo(function ProductCard({ p, survivor, picked, onOpen, onToggleSurvivor, onTogglePicked }: {
  p: ProductRowDto;
  survivor: string | null;
  picked: Set<string>;
  onOpen: (p: ProductRowDto) => void;
  onToggleSurvivor: (id: string) => void;
  onTogglePicked: (id: string) => void;
}) {
  const isSurvivor = survivor === p.id;
  const isMerged = picked.has(p.id) && !isSurvivor;
  return (
    <button
      type="button"
      onClick={() => onOpen(p)}
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
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSurvivor(p.id); }}
          className={`grid size-7 place-items-center rounded-full border transition ${isSurvivor ? "border-emerald-500 bg-emerald-500 text-white" : "text-muted-foreground hover:text-emerald-600"}`}>
          <Check className="size-4" />
        </button>
        {!isSurvivor && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onTogglePicked(p.id); }}
            className={`grid size-7 place-items-center rounded-full border transition ${isMerged ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}>
            {isMerged ? <Check className="size-4" /> : <Plus className="size-4" />}
          </button>
        )}
      </div>
    </button>
  );
});

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
