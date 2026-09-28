"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { productsApi, type ProductRowDto, type BrandChipDto, type CategoryChipDto } from "@/lib/api";
import { adminApi } from "../api";
import { categoryName, goodName, unitLabel, fa } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useMessages } from "@/i18n/messages/use-messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check, Loader2, Merge, Plus, Search, X, FileJson, Tag,
  Pencil, Trash2, Package, Filter, ChevronDown, Image as ImageIcon,
  Barcode, ArrowRightLeft,
} from "lucide-react";

/*
 * مدیریت محصولات مرجع — کنترل کامل ادمین روی SKU ها.
 * - نوار فیلتر دیوارگونه: جستجو + دسته + برند + وضعیت
 * - لیست محصولات با تصویر و جزئیات
 * - مودال جزئیات محصول (بشیت از پایین)
 * - فرم ویرایش کامل (بشیت از پایین، ارتفاع مناسب)
 * - انتخاب برند با سرچ (بشیت از پایین)
 * - ادغام، حذف، انتقال به دسته دیگر
 */

const STATUSES = ["ACTIVE", "PROVISIONAL"] as const;

export default function AdminProductsPage() {
  const router = useRouter();
  const { status, user } = useAuthStore();
  const m = useMessages();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // ── Filters from URL
  const qParam = searchParams.get("q") ?? "";
  const brandIdParam = searchParams.get("brandId") ?? "";
  const categoryIdParam = searchParams.get("categoryId") ?? "";
  const statusParam = searchParams.get("status") ?? "";

  // ── State
  const [query, setQuery] = useState(qParam);
  const [rows, setRows] = useState<ProductRowDto[]>([]);
  const [brands, setBrands] = useState<BrandChipDto[]>([]);
  const [categories, setCategories] = useState<CategoryChipDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Drawers
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<ProductRowDto | null>(null);

  // ── Merge state
  const [survivor, setSurvivor] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  // ── Bulk import
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // ── Edit form state
  const [editLabel, setEditLabel] = useState("");
  const [editBrandId, setEditBrandId] = useState<string | null>(null);
  const [editBrandName, setEditBrandName] = useState<string>("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editImageUrl, setImageUrl] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editGoodId, setEditGoodId] = useState("");
  const [editGoodName, setEditGoodName] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // ── Brand picker search
  const [brandSearch, setBrandSearch] = useState("");
  const [goodsSearch, setGoodsSearch] = useState("");
  const [goodsResults, setGoodsResults] = useState<{ id: string; nameFa: string; category: { nameFa: string } }[]>([]);

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
      const qs = params.toString();
      router.replace(`/admin/products${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router]
  );

  const clearParams = useCallback(
    (keys: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const k of keys) params.delete(k);
      const qs = params.toString();
      router.replace(`/admin/products${qs ? `?${qs}` : ""}`, { scroll: false });
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
        limit: 50,
      })
      .then((res) => {
        if (!alive) return;
        setRows(res.items);
        setNextCursor(res.nextCursor ?? null);
        setBrands(res.brands || []);
        setCategories(res.categories || []);
        setSurvivor(null);
        setPicked(new Set());
      })
      .catch(() => {
        if (alive) { setRows([]); setNextCursor(null); }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [qParam, brandIdParam, categoryIdParam, status, user?.role]);

  // ── Infinite scroll
  const sentinel = useRef<HTMLDivElement | null>(null);
  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    productsApi
      .getProducts({
        q: qParam || undefined,
        brandId: brandIdParam || undefined,
        categoryId: categoryIdParam || undefined,
        cursor: nextCursor,
        limit: 50,
      })
      .then((res) => {
        setRows((prev) => [...prev, ...res.items]);
        setNextCursor(res.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [nextCursor, loadingMore, qParam, brandIdParam, categoryIdParam]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) loadMore();
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextCursor, loadingMore, loadMore]);

  // ── Sync query input from URL
  useEffect(() => { setQuery(qParam); }, [qParam]);

  if (status !== "authed" || user?.role !== "ADMIN") {
    return (
      <div className="grid place-items-center py-24">
        <p className="text-sm font-bold text-muted-foreground">{m.admin.forbiddenTitle}</p>
      </div>
    );
  }

  // ── Filter pills
  const activeFilterCount = [brandIdParam, categoryIdParam, statusParam].filter(Boolean).length;
  const selectedBrand = brands.find((b) => b.id === brandIdParam);
  const selectedCategory = categories.find((c) => c.id === categoryIdParam);

  const pill = (label: string, active: boolean, onClick: () => void, key?: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-stone-200 bg-white text-muted-foreground hover:border-stone-300"
      }`}
    >
      {label}
    </button>
  );

  // ── Open detail
  const openDetail = (p: ProductRowDto) => {
    setActiveProduct(p);
    setDetailOpen(true);
  };

  // ── Open edit
  const openEdit = (p: ProductRowDto) => {
    setEditLabel(p.label);
    setEditBrandId(p.brand?.id ?? null);
    setEditBrandName(p.brand?.name ?? "");
    setEditBarcode(p.barcode ?? "");
    setImageUrl(p.imageUrl ?? "");
    setEditStatus(p.status);
    setEditGoodId(p.goodId);
    setEditGoodName(p.good.nameFa);
    setActiveProduct(p);
    setDetailOpen(false);
    setEditOpen(true);
  };

  // ── Save edit
  const saveEdit = async () => {
    if (!activeProduct) return;
    setEditBusy(true);
    try {
      await productsApi.adminEdit(activeProduct.id, {
        label: editLabel,
        brandId: editBrandId,
        barcode: editBarcode || null,
        imageUrl: editImageUrl || null,
        status: editStatus,
        ...(editGoodId !== activeProduct.goodId ? { goodId: editGoodId } : {}),
      });
      toast({ title: "محصول ویرایش شد" });
      setEditOpen(false);
      // Update row in list
      setRows((prev) => prev.map((r) =>
        r.id === activeProduct.id
          ? { ...r, label: editLabel, barcode: editBarcode || null, imageUrl: editImageUrl || null, status: editStatus }
          : r
      ));
    } catch (err) {
      toast({ title: "خطا در ویرایش", description: String(err), variant: "destructive" });
    } finally {
      setEditBusy(false);
    }
  };

  // ── Delete
  const doDelete = async () => {
    if (!activeProduct) return;
    setDeleteBusy(true);
    try {
      await productsApi.adminDelete(activeProduct.id);
      toast({ title: "محصول حذف شد" });
      setEditOpen(false);
      setRows((prev) => prev.filter((r) => r.id !== activeProduct.id));
    } catch (err) {
      toast({ title: "خطا در حذف", description: String(err), variant: "destructive" });
    } finally {
      setDeleteBusy(false);
    }
  };

  // ── Search goods for edit form
  const searchGoods = async (q: string) => {
    setGoodsSearch(q);
    if (q.trim().length < 2) { setGoodsResults([]); return; }
    try {
      const res = await adminApi.getGoods({ q: q.trim(), limit: 10 });
      setGoodsResults(res.items.map((g: { id: string; nameFa: string; category: { nameFa: string } }) => ({ id: g.id, nameFa: g.nameFa, category: g.category })));
    } catch { /* silent */ }
  };

  // ── Merge
  const togglePicked = (id: string) => {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const merge = async () => {
    if (!survivor) { toast({ title: m.admin.products.pickSurvivor, variant: "destructive" }); return; }
    const fromIds = [...picked].filter((id) => id !== survivor);
    if (fromIds.length === 0) { toast({ title: m.admin.products.pickAtLeastOne, variant: "destructive" }); return; }
    setMerging(true);
    try {
      const res = await productsApi.adminMerge({ intoId: survivor, fromIds });
      toast({ title: m.admin.products.merged.replace("{n}", String(res.merged)) });
      setRows((list) => list.filter((r) => !fromIds.includes(r.id)));
      setPicked(new Set());
      setSurvivor(null);
    } catch {
      toast({ title: m.picker.submitFailed.replace("{n}", String(fromIds.length)), variant: "destructive" });
    } finally {
      setMerging(false);
    }
  };

  // ── Filtered brands for picker
  const filteredBrands = brands.filter((b) =>
    !brandSearch.trim() || b.name.includes(brandSearch.trim())
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── Sticky filter bar (Divar-style) */}
      <div className="sticky top-0 z-20 -mx-4 border-b bg-muted/30 px-4 pb-3 pt-1 backdrop-blur sm:-mx-6 sm:px-6">
        {/* Search row */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative grow">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={m.admin.searchPlaceholder || "جستجو..."}
              className="h-10 rounded-xl bg-white pe-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); patchParam("q", null); }}
                className="absolute start-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-stone-200 text-stone-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-10 shrink-0 gap-1.5 rounded-xl px-3"
            onClick={() => setBulkOpen(!bulkOpen)}
          >
            <FileJson className="size-4" />
            <span className="hidden sm:inline">ثبت گروهی</span>
          </Button>
        </div>

        {/* Filter chips row */}
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {pill("همه", activeFilterCount === 0, () => clearParams(["brandId", "categoryId", "status"]))}

          {/* Status filters */}
          {STATUSES.map((st) =>
            pill(
              st === "ACTIVE" ? "فعال" : "در انتظار",
              statusParam === st,
              () => patchParam("status", statusParam === st ? null : st),
              st
            )
          )}

          {/* Active brand chip (removable) */}
          {selectedBrand && (
            <button
              type="button"
              onClick={() => patchParam("brandId", null)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
            >
              {selectedBrand.name}
              <span className="text-[10px] opacity-60">({fa(selectedBrand.count)})</span>
              <X className="size-3" />
            </button>
          )}

          {/* Active category chip (removable) */}
          {selectedCategory && (
            <button
              type="button"
              onClick={() => patchParam("categoryId", null)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
            >
              {selectedCategory.nameFa}
              <span className="text-[10px] opacity-60">({fa(selectedCategory.count)})</span>
              <X className="size-3" />
            </button>
          )}

          {/* Brand picker trigger */}
          <button
            type="button"
            onClick={() => setBrandPickerOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-stone-300"
          >
            <Tag className="size-3" />
            برند
            <ChevronDown className="size-3" />
          </button>

          {/* Category chips */}
          {categories.slice(0, 15).map((c) =>
            pill(
              `${c.nameFa} (${fa(c.count)})`,
              categoryIdParam === c.id,
              () => patchParam("categoryId", categoryIdParam === c.id ? null : c.id),
              c.id
            )
          )}
        </div>
      </div>

      {/* ── Bulk import form */}
      {bulkOpen && (
        <div className="mt-3 rounded-xl border-2 border-primary/30 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-extrabold">ثبت گروهی کالاهای مرجع</span>
            <button type="button" onClick={() => setBulkOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            className="h-40 w-full rounded-lg border p-3 font-mono text-xs"
            dir="ltr"
            placeholder={JSON.stringify([{ brandId: "ID", goodName: "پفک", label: "پفک اشی مشی ۲۰تایی", barcode: "6260101530017" }], null, 2)}
          />
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const parsed = JSON.parse(bulkJson);
                  if (!Array.isArray(parsed)) { toast({ title: "JSON باید آرایه باشد", variant: "destructive" }); return; }
                  setBulkBusy(true);
                  const res = await productsApi.bulkCreate({ items: parsed });
                  toast({ title: `${res.saved} کالا ثبت شد${res.skipped > 0 ? ` · ${res.skipped} تکراری` : ""}${res.failed > 0 ? ` · ${res.failed} خطا` : ""}` });
                  setBulkOpen(false);
                  patchParam("q", qParam + " ");
                } catch (err) {
                  toast({ title: "خطا در JSON یا ثبت", description: String(err), variant: "destructive" });
                } finally {
                  setBulkBusy(false);
                }
              }}
              disabled={bulkBusy || !bulkJson.trim()}
            >
              {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              ثبت
            </Button>
          </div>
        </div>
      )}

      {/* ── Product list */}
      <div className="mt-3 grid gap-2">
        {loading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
        ))}

        {!loading && rows.length === 0 && (
          <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
            <Package className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-bold text-muted-foreground">{m.admin.empty || "موردی یافت نشد"}</p>
          </div>
        )}

        {rows.map((p) => {
          const isSurvivor = survivor === p.id;
          const isMerged = picked.has(p.id) && !isSurvivor;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => openDetail(p)}
              className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-start shadow-sm transition hover:shadow-md ${isSurvivor ? "ring-2 ring-emerald-500" : isMerged ? "opacity-60" : ""}`}
            >
              {/* Image or placeholder */}
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-100">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-black text-stone-400">{p.good.nameFa.slice(0, 1)}</span>
                )}
              </span>

              {/* Info */}
              <div className="min-w-0 grow">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-extrabold">{p.label}</p>
                  {p.status === "PROVISIONAL" && (
                    <Badge className="h-5 shrink-0 bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100">
                      در انتظار
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {goodName(p.good)} · {categoryName(p.good.category)}
                  {p.brand && ` · ${p.brand.name}`}
                  {p.sellers > 0 && (
                    <span className="ms-1.5 font-bold text-primary/70">
                      {m.admin.products?.sellers?.replace("{n}", String(p.sellers)) || `${p.sellers} فروشنده`}
                    </span>
                  )}
                </p>
              </div>

              {/* Merge controls */}
              <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSurvivor(isSurvivor ? null : p.id); }}
                  className={`grid size-7 place-items-center rounded-full border transition ${isSurvivor ? "border-emerald-500 bg-emerald-500 text-white" : "text-muted-foreground hover:text-emerald-600"}`}
                >
                  <Check className="size-4" />
                </button>
                {!isSurvivor && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); togglePicked(p.id); }}
                    className={`grid size-7 place-items-center rounded-full border transition ${isMerged ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}
                  >
                    {isMerged ? <Check className="size-4" /> : <Plus className="size-4" />}
                  </button>
                )}
              </div>
            </button>
          );
        })}

        {loadingMore && (
          <div className="grid place-items-center py-4">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
        <div ref={sentinel} />
        {!nextCursor && rows.length > 0 && !loading && (
          <p className="py-6 text-center text-xs font-bold text-muted-foreground">پایان لیست — {fa(rows.length)} محصول</p>
        )}
      </div>

      {/* ── Merge bar */}
      {picked.size > 0 && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-white/95 p-2.5 shadow-lg backdrop-blur">
          <span className="ps-2 text-sm font-extrabold">
            {m.admin.products.mergeInto?.replace("{n}", String(picked.size)) || `${picked.size} مورد برای ادغام`}
            {survivor && (
              <span className="ms-1.5 text-[11px] font-bold text-emerald-600">
                → {rows.find((r) => r.id === survivor)?.label}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => { setPicked(new Set()); setSurvivor(null); }}>
              <X className="size-4" />
            </Button>
            <Button size="sm" onClick={() => void merge()} disabled={merging || !survivor}>
              {merging ? <Loader2 className="size-4 animate-spin" /> : <Merge className="size-4" />}
              ادغام
            </Button>
          </span>
        </div>
      )}

      {/* ── Product Detail Drawer (bottom sheet) */}
      <Drawer open={detailOpen} onOpenChange={setDetailOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base font-extrabold">
              {activeProduct?.label}
            </DrawerTitle>
            <DrawerDescription className="sr-only">جزئیات محصول مرجع</DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-4" style={{ maxHeight: "60vh" }}>
            {activeProduct && (
              <div className="space-y-4">
                {/* Image */}
                {activeProduct.imageUrl && (
                  <div className="overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeProduct.imageUrl} alt="" className="h-40 w-full object-cover" />
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <InfoBlock label="نوع کالا" value={goodName(activeProduct.good)} />
                  <InfoBlock label="دسته" value={categoryName(activeProduct.good.category)} />
                  <InfoBlock label="برند" value={activeProduct.brand?.name || "—"} />
                  <InfoBlock label="واحد" value={unitLabel(activeProduct.good.unit)} />
                  <InfoBlock label="بارکد" value={activeProduct.barcode || "—"} />
                  <InfoBlock label="وضعیت" value={activeProduct.status === "ACTIVE" ? "فعال" : "در انتظار"} />
                  <InfoBlock label="فروشندگان" value={String(activeProduct.sellers)} />
                  <InfoBlock label="شناسه" value={activeProduct.id.slice(-8)} />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="grow" onClick={() => openEdit(activeProduct)}>
                    <Pencil className="size-4" />
                    ویرایش
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      patchParam("brandId", activeProduct.brand?.id ?? null);
                      setDetailOpen(false);
                    }}
                  >
                    <Tag className="size-4" />
                    فیلتر این برند
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDetailOpen(false);
                      setEditOpen(true);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* ── Edit Drawer (bottom sheet, tall) */}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-1.5 text-base font-extrabold">
              <Pencil className="size-4 text-primary" />
              ویرایش محصول
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-6" style={{ maxHeight: "75vh" }}>
            <div className="space-y-4">
              {/* Label */}
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">نام محصول (label)</label>
                <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-10" />
              </div>

              {/* Brand */}
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">برند</label>
                <button
                  type="button"
                  onClick={() => setBrandPickerOpen(true)}
                  className="flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-sm"
                >
                  {editBrandName || "انتخاب برند..."}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </div>

              {/* Good (search) */}
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">نوع کالا (Good)</label>
                <Input
                  value={goodsSearch || editGoodName}
                  onChange={(e) => { setEditGoodName(e.target.value); searchGoods(e.target.value); }}
                  placeholder="جستجوی نوع کالا..."
                  className="h-10"
                />
                {goodsResults.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-auto rounded-lg border">
                    {goodsResults.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => { setEditGoodId(g.id); setEditGoodName(g.nameFa); setGoodsResults([]); setGoodsSearch(""); }}
                        className="block w-full px-3 py-2 text-start text-xs hover:bg-accent"
                      >
                        <span className="font-bold">{g.nameFa}</span>
                        <span className="ms-2 text-muted-foreground">{g.category.nameFa}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Barcode */}
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">بارکد</label>
                <Input value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} className="h-10" dir="ltr" />
              </div>

              {/* Image URL */}
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">آدرس تصویر</label>
                <Input value={editImageUrl} onChange={(e) => setImageUrl(e.target.value)} className="h-10" dir="ltr" />
              </div>

              {/* Status */}
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">وضعیت</label>
                <div className="flex gap-2">
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`rounded-lg border px-4 py-2 text-xs font-bold ${editStatus === st ? "border-primary bg-primary/10 text-primary" : "border-stone-200 text-muted-foreground"}`}
                    >
                      {st === "ACTIVE" ? "فعال" : "در انتظار"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save & Delete */}
              <div className="flex gap-2 pt-3">
                <Button size="sm" className="grow" onClick={() => void saveEdit()} disabled={editBusy}>
                  {editBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  ذخیره
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => void doDelete()}
                  disabled={deleteBusy || activeProduct?.sellers ? true : false}
                  title={activeProduct?.sellers ? "این محصول آگهی فعال دارد" : "حذف"}
                >
                  {deleteBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* ── Brand Picker Drawer (bottom sheet with search) */}
      <Drawer open={brandPickerOpen} onOpenChange={setBrandPickerOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base font-extrabold">انتخاب برند</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="جستجوی برند..."
                className="h-10 pe-9"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="px-4 pb-4" style={{ maxHeight: "55vh" }}>
            <div className="space-y-1">
              {filteredBrands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    if (editOpen) {
                      setEditBrandId(b.id);
                      setEditBrandName(b.name);
                    } else {
                      patchParam("brandId", b.id);
                    }
                    setBrandPickerOpen(false);
                    setBrandSearch("");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent"
                >
                  <span className="text-sm font-bold">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{fa(b.count)} محصول</span>
                </button>
              ))}
              {filteredBrands.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">برندی یافت نشد</p>
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// ── Helper component
function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2.5">
      <p className="text-[10px] font-bold text-muted-foreground/70">{label}</p>
      <p className="mt-0.5 text-xs font-extrabold">{value}</p>
    </div>
  );
}
