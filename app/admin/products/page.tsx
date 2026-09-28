"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Loader2,
  Merge,
  Plus,
  Search,
  X,
  FileJson,
  Tag,
  Pencil,
  Trash2,
  Package,
  ChevronDown,
  Image as ImageIcon,
  Barcode as BarcodeIcon,
  CheckCircle2,
  Circle,
  Layers,
} from "lucide-react";

/*
 * مدیریت محصولات مرجع — کنترل کامل ادمین روی SKU ها.
 *
 *  نوار فیلتر (الگو از انتخابگر برند):
 *   - جستجو + ۴ دکمه فیلتر (دسته‌بندی، برند، وضعیت، عکس) — هر کدام بشیت از پایین
 *   - وقتی فیلتر فعال است: حاشیه‌ی primary + آیکن ✓
 *   - مقدار انتخاب‌شده به‌صورت چیپ قابل‌حذف زیر دکمه‌ها
 *
 *  لیست کارت‌های غنی‌تر:
 *   - تصویر/حرف اول · label · good · category · brand · barcode · badge · sellers
 *   - کنترل‌های ادغام (survivor + pick) در هر کارت
 *
 *  drawers:
 *   - جزئیات محصول، فرم ویرایش، انتخابگر برند، انتخابگر دسته، انتخابگر وضعیت، انتخابگر عکس
 *   - در دسکتاپ بشیت‌ها حداکثر max-w-3xl و وسط‌چین، در موبایل تمام‌عرض
 *
 *  قابلیت‌ها:
 *   - اسکرول بی‌نهایت، ادغام، حذف، ثبت گروهی JSON، URL-synced filters
 *   - بارکد در فرم ویرایش فقط‌خواندنی با دکمه مداد → قابل ویرایش
 */

const STATUSES = ["ACTIVE", "PROVISIONAL"] as const;
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  PROVISIONAL: "در انتظار",
};

type ImageFilter = "" | "true" | "false";
const IMAGE_OPTIONS: { value: ImageFilter; label: string }[] = [
  { value: "", label: "همه" },
  { value: "true", label: "با عکس" },
  { value: "false", label: "بدون عکس" },
];

type PickerMode = "filter" | "edit";

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
  const hasImageParam = (searchParams.get("hasImage") ?? "") as ImageFilter;

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
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [brandPickerMode, setBrandPickerMode] = useState<PickerMode>("filter");
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
  const [editBarcodeEditing, setEditBarcodeEditing] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editGoodId, setEditGoodId] = useState("");
  const [editGoodName, setEditGoodName] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // ── Brand picker search (edit mode uses adminApi.getBrands)
  const [brandSearch, setBrandSearch] = useState("");
  const [adminBrands, setAdminBrands] = useState<AdminBrandDto[]>([]);
  const [brandSearchBusy, setBrandSearchBusy] = useState(false);

  // ── Goods search
  const [goodsSearch, setGoodsSearch] = useState("");
  const [goodsResults, setGoodsResults] = useState<
    { id: string; nameFa: string; category: { nameFa: string } }[]
  >([]);

  // ── URL patch helpers (declared before any effect that uses them)
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

  // ── Debounce search to URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (query === qParam) return;
      patchParam("q", query.trim() || null);
    }, 400);
    return () => clearTimeout(t);
  }, [query, qParam, patchParam]);

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
        hasImage: hasImageParam === "" ? undefined : hasImageParam === "true",
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
        if (alive) {
          setRows([]);
          setNextCursor(null);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [qParam, brandIdParam, categoryIdParam, statusParam, hasImageParam, status, user?.role]);

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
        status: statusParam || undefined,
        hasImage: hasImageParam === "" ? undefined : hasImageParam === "true",
        cursor: nextCursor,
        limit: 50,
      })
      .then((res) => {
        setRows((prev) => [...prev, ...res.items]);
        setNextCursor(res.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [nextCursor, loadingMore, qParam, brandIdParam, categoryIdParam, statusParam, hasImageParam]);

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

  // ── Sync query input from URL (only when URL q diverges from input)
  useEffect(() => {
    if (qParam !== query) setQuery(qParam);
  }, [qParam]);

  // ── Search admin brands when picker opens in edit mode (or query changes)
  useEffect(() => {
    if (!brandPickerOpen || brandPickerMode !== "edit") return;
    let alive = true;
    setBrandSearchBusy(true);
    adminApi
      .getBrands({ q: brandSearch.trim() || undefined, limit: 50 })
      .then((res) => {
        if (alive) setAdminBrands(res.items);
      })
      .catch(() => {
        if (alive) setAdminBrands([]);
      })
      .finally(() => {
        if (alive) setBrandSearchBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [brandPickerOpen, brandPickerMode, brandSearch]);

  if (status !== "authed" || user?.role !== "ADMIN") {
    return (
      <div className="grid place-items-center py-24">
        <p className="text-sm font-bold text-muted-foreground">
          {m.admin.forbiddenTitle}
        </p>
      </div>
    );
  }

  // ── Filter state helpers
  const activeFilterCount = [brandIdParam, categoryIdParam, statusParam, hasImageParam].filter(
    Boolean
  ).length;
  const selectedBrand = brands.find((b) => b.id === brandIdParam);
  const selectedCategory = categories.find((c) => c.id === categoryIdParam);
  const selectedStatusLabel = statusParam ? STATUS_LABEL[statusParam] ?? statusParam : "";
  const selectedImageLabel =
    IMAGE_OPTIONS.find((o) => o.value === hasImageParam)?.label ?? "";

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
    setEditBarcodeEditing(false);
    setEditImageUrl(p.imageUrl ?? "");
    setEditStatus(p.status);
    setEditGoodId(p.goodId);
    setEditGoodName(p.good.nameFa);
    setGoodsSearch("");
    setGoodsResults([]);
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
      setRows((prev) =>
        prev.map((r) =>
          r.id === activeProduct.id
            ? {
                ...r,
                label: editLabel,
                barcode: editBarcode || null,
                imageUrl: editImageUrl || null,
                status: editStatus,
                brand:
                  editBrandId && editBrandName
                    ? { id: editBrandId, name: editBrandName }
                    : null,
              }
            : r
        )
      );
    } catch (err) {
      toast({
        title: "خطا در ویرایش",
        description: String(err),
        variant: "destructive",
      });
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
      toast({
        title: "خطا در حذف",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  // ── Search goods for edit form
  const searchGoods = async (q: string) => {
    setGoodsSearch(q);
    if (q.trim().length < 2) {
      setGoodsResults([]);
      return;
    }
    try {
      const res = await adminApi.getGoods({ q: q.trim(), limit: 10 });
      setGoodsResults(
        res.items.map((g) => ({
          id: g.id,
          nameFa: g.nameFa,
          category: { nameFa: g.category.nameFa },
        }))
      );
    } catch {
      /* silent */
    }
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
    if (!survivor) {
      toast({ title: m.admin.products.pickSurvivor, variant: "destructive" });
      return;
    }
    const fromIds = [...picked].filter((id) => id !== survivor);
    if (fromIds.length === 0) {
      toast({ title: m.admin.products.pickAtLeastOne, variant: "destructive" });
      return;
    }
    setMerging(true);
    try {
      const res = await productsApi.adminMerge({ intoId: survivor, fromIds });
      toast({ title: m.admin.products.merged.replace("{n}", String(res.merged)) });
      setRows((list) => list.filter((r) => !fromIds.includes(r.id)));
      setPicked(new Set());
      setSurvivor(null);
    } catch {
      toast({
        title: m.picker.submitFailed.replace("{n}", String(fromIds.length)),
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
  };

  // ── Filtered brands for filter picker (uses local brands from products response)
  const filteredFilterBrands = brands.filter(
    (b) => !brandSearch.trim() || b.name.includes(brandSearch.trim())
  );

  // ── Filtered categories for category picker
  const filteredCategories = categories.filter(
    (c) =>
      !brandSearch.trim() ||
      c.nameFa.includes(brandSearch.trim()) ||
      c.nameEn.toLowerCase().includes(brandSearch.trim().toLowerCase())
  );

  // ── Filter button (label, active, value label, onClick)
  const filterButton = (
    label: string,
    active: boolean,
    valueLabel: string | null,
    onClick: () => void
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-stone-200 bg-white text-muted-foreground hover:border-stone-300"
      }`}
    >
      {active && <Check className="size-3" />}
      <span>{label}</span>
      <ChevronDown className="size-3 opacity-70" />
    </button>
  );

  // ── Removable chip for an active filter
  const removableChip = (text: string, onRemove: () => void) => (
    <button
      type="button"
      onClick={onRemove}
      className="flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
    >
      <span className="max-w-[140px] truncate">{text}</span>
      <X className="size-3" />
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── Sticky filter bar */}
      <div className="sticky top-0 z-20 -mx-4 border-b bg-muted/30 px-4 pb-3 pt-2 backdrop-blur sm:-mx-6 sm:px-6">
        {/* Search row */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative grow">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={m.admin.products.searchPlaceholder || "جستجو..."}
              className="h-10 rounded-xl bg-white pe-9 ps-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  patchParam("q", null);
                }}
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

        {/* Filter buttons row */}
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {activeFilterCount > 0 &&
            filterButton(
              "همه",
              false,
              null,
              () => clearParams(["brandId", "categoryId", "status", "hasImage"])
            )}

          {filterButton(
            "دسته‌بندی",
            !!categoryIdParam,
            selectedCategory?.nameFa ?? null,
            () => {
              setBrandSearch("");
              setCategoryPickerOpen(true);
            }
          )}

          {filterButton(
            "برند",
            !!brandIdParam,
            selectedBrand?.name ?? null,
            () => {
              setBrandSearch("");
              setBrandPickerMode("filter");
              setBrandPickerOpen(true);
            }
          )}

          {filterButton(
            "وضعیت",
            !!statusParam,
            selectedStatusLabel || null,
            () => setStatusPickerOpen(true)
          )}

          {filterButton(
            "عکس",
            !!hasImageParam,
            selectedImageLabel || null,
            () => setImagePickerOpen(true)
          )}
        </div>

        {/* Active filter value chips (removable) */}
        {activeFilterCount > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedCategory &&
              removableChip(`${selectedCategory.nameFa} (${fa(selectedCategory.count)})`, () =>
                patchParam("categoryId", null)
              )}
            {selectedBrand &&
              removableChip(`${selectedBrand.name} (${fa(selectedBrand.count)})`, () =>
                patchParam("brandId", null)
              )}
            {statusParam &&
              removableChip(selectedStatusLabel, () => patchParam("status", null))}
            {hasImageParam &&
              removableChip(selectedImageLabel, () => patchParam("hasImage", null))}
          </div>
        )}
      </div>

      {/* ── Summary count */}
      <div className="mt-3 flex items-center justify-between px-1">
        <p className="text-xs font-bold text-muted-foreground">
          {loading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              در حال بارگذاری…
            </span>
          ) : rows.length === 0 ? (
            "بدون نتیجه"
          ) : (
            <span>
              <span className="font-extrabold text-foreground">{fa(rows.length)}</span> محصول
              {nextCursor ? " · بیشتر…" : ""}
            </span>
          )}
        </p>
        {picked.size > 0 && (
          <span className="text-xs font-bold text-primary">
            {fa(picked.size)} مورد برای ادغام
          </span>
        )}
      </div>

      {/* ── Bulk import form */}
      {bulkOpen && (
        <div className="mt-3 rounded-xl border-2 border-primary/30 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-extrabold">ثبت گروهی کالاهای مرجع</span>
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            className="h-40 w-full rounded-lg border p-3 font-mono text-xs"
            dir="ltr"
            placeholder={JSON.stringify(
              [
                {
                  brandId: "ID",
                  goodName: "پفک",
                  label: "پفک اشی مشی ۲۰تایی",
                  barcode: "6260101530017",
                },
              ],
              null,
              2
            )}
          />
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const parsed = JSON.parse(bulkJson);
                  if (!Array.isArray(parsed)) {
                    toast({ title: "JSON باید آرایه باشد", variant: "destructive" });
                    return;
                  }
                  setBulkBusy(true);
                  const res = await productsApi.bulkCreate({ items: parsed });
                  toast({
                    title: `${res.saved} کالا ثبت شد${
                      res.skipped > 0 ? ` · ${res.skipped} تکراری` : ""
                    }${res.failed > 0 ? ` · ${res.failed} خطا` : ""}`,
                  });
                  setBulkOpen(false);
                  patchParam("q", qParam + " ");
                } catch (err) {
                  toast({
                    title: "خطا در JSON یا ثبت",
                    description: String(err),
                    variant: "destructive",
                  });
                } finally {
                  setBulkBusy(false);
                }
              }}
              disabled={bulkBusy || !bulkJson.trim()}
            >
              {bulkBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              ثبت
            </Button>
          </div>
        </div>
      )}

      {/* ── Product list */}
      <div className="mt-2 grid gap-2">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
          ))}

        {!loading && rows.length === 0 && (
          <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
            <Package className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-bold text-muted-foreground">
              {m.admin.products.empty || "موردی یافت نشد"}
            </p>
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
              className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-start shadow-sm transition hover:shadow-md ${
                isSurvivor ? "ring-2 ring-emerald-500" : isMerged ? "opacity-60" : ""
              }`}
            >
              {/* Image or placeholder */}
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-100">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-black text-stone-400">
                    {p.good.nameFa.slice(0, 1)}
                  </span>
                )}
              </span>

              {/* Info */}
              <div className="min-w-0 grow">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-extrabold">{p.label}</p>
                  <Badge
                    className={`h-5 shrink-0 px-1.5 text-[10px] font-bold hover:bg-current ${
                      p.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {goodName(p.good)} · {categoryName(p.good.category)}
                  {p.brand && ` · ${p.brand.name}`}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold text-muted-foreground/80">
                  {p.barcode && (
                    <span className="inline-flex items-center gap-0.5 font-mono" dir="ltr">
                      <BarcodeIcon className="size-3" />
                      {p.barcode}
                    </span>
                  )}
                  {p.sellers > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-primary/70">
                      {m.admin.products.sellers.replace("{n}", String(p.sellers))}
                    </span>
                  )}
                </div>
              </div>

              {/* Merge controls */}
              <div
                className="flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSurvivor(isSurvivor ? null : p.id);
                    if (!isSurvivor) setPicked((s) => new Set(s).add(p.id));
                  }}
                  className={`grid size-7 place-items-center rounded-full border transition ${
                    isSurvivor
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "text-muted-foreground hover:text-emerald-600"
                  }`}
                  title={m.admin.products.survivor}
                >
                  <Check className="size-4" />
                </button>
                {!isSurvivor && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePicked(p.id);
                    }}
                    className={`grid size-7 place-items-center rounded-full border transition ${
                      isMerged
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                    title="افزودن به ادغام"
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
          <p className="py-6 text-center text-xs font-bold text-muted-foreground">
            پایان لیست — {fa(rows.length)} محصول
          </p>
        )}
      </div>

      {/* ── Merge bar */}
      {picked.size > 0 && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-white/95 p-2.5 shadow-lg backdrop-blur">
          <span className="ps-2 text-sm font-extrabold">
            {m.admin.products.mergeInto.replace("{n}", String(picked.size))}
            {survivor && (
              <span className="ms-1.5 text-[11px] font-bold text-emerald-600">
                → {rows.find((r) => r.id === survivor)?.label}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPicked(new Set());
                setSurvivor(null);
              }}
            >
              <X className="size-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => void merge()}
              disabled={merging || !survivor}
            >
              {merging ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Merge className="size-4" />
              )}
              ادغام
            </Button>
          </span>
        </div>
      )}

      {/* ── Product Detail Drawer (bottom sheet, max-w-2xl centered on desktop) */}
      <Drawer open={detailOpen} onOpenChange={setDetailOpen}>
        <DrawerContent className="bg-transparent border-0 shadow-none">
          <div className="mx-auto w-full max-w-2xl rounded-t-2xl bg-background border shadow-2xl">
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
                      <img
                        src={activeProduct.imageUrl}
                        alt=""
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <InfoBlock label="نوع کالا" value={goodName(activeProduct.good)} />
                    <InfoBlock
                      label="دسته"
                      value={categoryName(activeProduct.good.category)}
                    />
                    <InfoBlock label="برند" value={activeProduct.brand?.name || "—"} />
                    <InfoBlock label="واحد" value={unitLabel(activeProduct.good.unit)} />
                    <InfoBlock label="بارکد" value={activeProduct.barcode || "—"} />
                    <InfoBlock
                      label="وضعیت"
                      value={STATUS_LABEL[activeProduct.status] ?? activeProduct.status}
                    />
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
                      disabled={activeProduct.sellers > 0}
                      title={
                        activeProduct.sellers > 0
                          ? "این محصول آگهی فعال دارد"
                          : "حذف محصول"
                      }
                      onClick={() => openEdit(activeProduct)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Edit Drawer (bottom sheet, max-w-2xl centered on desktop) */}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="bg-transparent border-0 shadow-none max-h-[90vh]">
          <div className="mx-auto w-full max-w-2xl rounded-t-2xl bg-background border shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DrawerHeader className="pb-2 shrink-0">
              <DrawerTitle className="flex items-center gap-1.5 text-base font-extrabold">
                <Pencil className="size-4 text-primary" />
                ویرایش محصول
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                فرم ویرایش محصول مرجع
              </DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="px-4 pb-6 grow" style={{ maxHeight: "75vh" }}>
              <div className="space-y-4">
                {/* Label */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    نام محصول (label)
                  </label>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    برند
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setBrandSearch("");
                      setBrandPickerMode("edit");
                      setBrandPickerOpen(true);
                    }}
                    className="flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-sm"
                  >
                    {editBrandName || "انتخاب برند..."}
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Good (search) */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    نوع کالا (Good)
                  </label>
                  <Input
                    value={goodsSearch || editGoodName}
                    onChange={(e) => {
                      setEditGoodName(e.target.value);
                      searchGoods(e.target.value);
                    }}
                    placeholder="جستجوی نوع کالا..."
                    className="h-10"
                  />
                  {goodsResults.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-auto rounded-lg border">
                      {goodsResults.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setEditGoodId(g.id);
                            setEditGoodName(g.nameFa);
                            setGoodsResults([]);
                            setGoodsSearch("");
                          }}
                          className="block w-full px-3 py-2 text-start text-xs hover:bg-accent"
                        >
                          <span className="font-bold">{g.nameFa}</span>
                          <span className="ms-2 text-muted-foreground">
                            {g.category.nameFa}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Barcode (read-only with pencil → editable) */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    بارکد
                  </label>
                  <div className="flex items-center gap-2">
                    {editBarcodeEditing ? (
                      <>
                        <Input
                          value={editBarcode}
                          onChange={(e) => setEditBarcode(e.target.value)}
                          className="h-10 font-mono"
                          dir="ltr"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          type="button"
                          variant="default"
                          className="h-10 shrink-0 px-3"
                          onClick={() => setEditBarcodeEditing(false)}
                          title="تأیید"
                        >
                          <Check className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex h-10 grow items-center rounded-lg border bg-muted/30 px-3 font-mono text-sm text-muted-foreground" dir="ltr">
                          {editBarcode || "— بدون بارکد —"}
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          className="h-10 shrink-0 px-3"
                          onClick={() => setEditBarcodeEditing(true)}
                          title="ویرایش بارکد"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    آدرس تصویر
                  </label>
                  <Input
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="h-10"
                    dir="ltr"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    وضعیت
                  </label>
                  <div className="flex gap-2">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditStatus(st)}
                        className={`flex-1 rounded-lg border px-4 py-2 text-xs font-bold ${
                          editStatus === st
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-stone-200 text-muted-foreground"
                        }`}
                      >
                        {STATUS_LABEL[st] ?? st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save & Delete */}
                <div className="flex gap-2 pt-3">
                  <Button
                    size="sm"
                    className="grow"
                    onClick={() => void saveEdit()}
                    disabled={editBusy}
                  >
                    {editBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    ذخیره
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void doDelete()}
                    disabled={deleteBusy || (activeProduct?.sellers ?? 0) > 0}
                    title={
                      (activeProduct?.sellers ?? 0) > 0
                        ? "این محصول آگهی فعال دارد"
                        : "حذف"
                    }
                  >
                    {deleteBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Brand Picker Drawer (filter mode uses local brands, edit mode uses adminApi) */}
      <Drawer open={brandPickerOpen} onOpenChange={setBrandPickerOpen}>
        <DrawerContent className="bg-transparent border-0 shadow-none max-h-[80vh]">
          <div className="mx-auto w-full max-w-2xl rounded-t-2xl bg-background border shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DrawerHeader className="pb-2 shrink-0">
              <DrawerTitle className="text-base font-extrabold">
                {brandPickerMode === "edit" ? "انتخاب برند محصول" : "فیلتر بر اساس برند"}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                انتخاب برند از لیست
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="جستجوی برند..."
                  className="h-10 pe-9 ps-9"
                  autoFocus
                />
                {brandSearch && (
                  <button
                    type="button"
                    onClick={() => setBrandSearch("")}
                    className="absolute start-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-stone-200 text-stone-600"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter mode: show "all" option at top */}
            {brandPickerMode === "filter" && (
              <div className="px-4 pb-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    patchParam("brandId", null);
                    setBrandPickerOpen(false);
                    setBrandSearch("");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent"
                >
                  <span className="text-sm font-bold">همه برندها</span>
                  {!brandIdParam && <Check className="size-4 text-primary" />}
                </button>
              </div>
            )}

            <ScrollArea className="px-4 pb-4 grow" style={{ maxHeight: "55vh" }}>
              <div className="space-y-1">
                {/* Loading spinner for admin brands in edit mode */}
                {brandPickerMode === "edit" && brandSearchBusy && (
                  <div className="grid place-items-center py-6">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}

                {/* Filter mode: local brands with counts */}
                {brandPickerMode === "filter" &&
                  filteredFilterBrands.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        patchParam("brandId", brandIdParam === b.id ? null : b.id);
                        setBrandPickerOpen(false);
                        setBrandSearch("");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent"
                    >
                      <span className="flex items-center gap-2 text-sm font-bold">
                        {brandIdParam === b.id && (
                          <Check className="size-4 text-primary" />
                        )}
                        {b.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fa(b.count)} محصول
                      </span>
                    </button>
                  ))}

                {/* Edit mode: admin brands */}
                {brandPickerMode === "edit" &&
                  !brandSearchBusy &&
                  adminBrands
                    .filter(
                      (b) =>
                        !brandSearch.trim() || b.name.includes(brandSearch.trim())
                    )
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setEditBrandId(b.id);
                          setEditBrandName(b.name);
                          setBrandPickerOpen(false);
                          setBrandSearch("");
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent"
                      >
                        <span className="flex items-center gap-2 text-sm font-bold">
                          {editBrandId === b.id && (
                            <Check className="size-4 text-primary" />
                          )}
                          {b.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fa(b._count.products)} محصول
                        </span>
                      </button>
                    ))}

                {/* Clear brand in edit mode */}
                {brandPickerMode === "edit" && !brandSearch.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditBrandId(null);
                      setEditBrandName("");
                      setBrandPickerOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-muted-foreground hover:bg-accent"
                  >
                    <X className="size-4" />
                    <span className="text-sm font-bold">حذف برند</span>
                  </button>
                )}

                {brandPickerMode === "filter" &&
                  filteredFilterBrands.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      برندی یافت نشد
                    </p>
                  )}
                {brandPickerMode === "edit" &&
                  !brandSearchBusy &&
                  adminBrands.filter(
                    (b) =>
                      !brandSearch.trim() || b.name.includes(brandSearch.trim())
                  ).length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      برندی یافت نشد
                    </p>
                  )}
              </div>
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Category Picker Drawer */}
      <Drawer open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
        <DrawerContent className="bg-transparent border-0 shadow-none max-h-[80vh]">
          <div className="mx-auto w-full max-w-2xl rounded-t-2xl bg-background border shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DrawerHeader className="pb-2 shrink-0">
              <DrawerTitle className="flex items-center gap-1.5 text-base font-extrabold">
                <Layers className="size-4 text-primary" />
                فیلتر بر اساس دسته‌بندی
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                انتخاب دسته‌بندی از لیست
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="جستجوی دسته..."
                  className="h-10 pe-9 ps-9"
                  autoFocus
                />
                {brandSearch && (
                  <button
                    type="button"
                    onClick={() => setBrandSearch("")}
                    className="absolute start-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-stone-200 text-stone-600"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 pb-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  patchParam("categoryId", null);
                  setCategoryPickerOpen(false);
                  setBrandSearch("");
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent"
              >
                <span className="text-sm font-bold">همه دسته‌ها</span>
                {!categoryIdParam && <Check className="size-4 text-primary" />}
              </button>
            </div>
            <ScrollArea className="px-4 pb-4 grow" style={{ maxHeight: "55vh" }}>
              <div className="space-y-1">
                {filteredCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      patchParam("categoryId", categoryIdParam === c.id ? null : c.id);
                      setCategoryPickerOpen(false);
                      setBrandSearch("");
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      {categoryIdParam === c.id && (
                        <Check className="size-4 text-primary" />
                      )}
                      {c.nameFa}
                      {c.nameEn && (
                        <span className="text-[10px] font-mono text-muted-foreground/70">
                          {c.nameEn}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fa(c.count)} محصول
                    </span>
                  </button>
                ))}
                {filteredCategories.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    دسته‌ای یافت نشد
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Status Picker Drawer */}
      <Drawer open={statusPickerOpen} onOpenChange={setStatusPickerOpen}>
        <DrawerContent className="bg-transparent border-0 shadow-none">
          <div className="mx-auto w-full max-w-2xl rounded-t-2xl bg-background border shadow-2xl">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-1.5 text-base font-extrabold">
                <CheckCircle2 className="size-4 text-primary" />
                فیلتر بر اساس وضعیت
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                انتخاب وضعیت محصول
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-1">
              <button
                type="button"
                onClick={() => {
                  patchParam("status", null);
                  setStatusPickerOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent"
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  {!statusParam && <Circle className="size-4 fill-primary text-primary" />}
                  {!statusParam && <Check className="size-4 text-primary" />}
                  همه
                </span>
              </button>
              {STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    patchParam("status", statusParam === st ? null : st);
                    setStatusPickerOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent"
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    {statusParam === st ? (
                      <Check className="size-4 text-primary" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground/40" />
                    )}
                    {STATUS_LABEL[st] ?? st}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Image Picker Drawer */}
      <Drawer open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
        <DrawerContent className="bg-transparent border-0 shadow-none">
          <div className="mx-auto w-full max-w-2xl rounded-t-2xl bg-background border shadow-2xl">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-1.5 text-base font-extrabold">
                <ImageIcon className="size-4 text-primary" />
                فیلتر بر اساس عکس
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                انتخاب فیلتر عکس محصول
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-1">
              {IMAGE_OPTIONS.map((opt) => {
                const active = hasImageParam === opt.value;
                return (
                  <button
                    key={opt.value || "all"}
                    type="button"
                    onClick={() => {
                      patchParam("hasImage", opt.value || null);
                      setImagePickerOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-accent"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      {active ? (
                        <Check className="size-4 text-primary" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground/40" />
                      )}
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
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
      <p className="mt-0.5 text-xs font-extrabold" dir="auto">
        {value}
      </p>
    </div>
  );
}
