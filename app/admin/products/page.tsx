"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { productsApi, type ProductRowDto } from "@/lib/api";
import { categoryName, goodName } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useMessages } from "@/i18n/messages/use-messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Merge, Plus, Search, X, FileJson, Tag } from "lucide-react";

/*
 * باغبانی محصولات مرجع — هویت‌های مشترک SKU (Good → Product → Listing).
 * دوقلوهای هویتی (یک کالای واقعی با دو ردیف) با ابزار ادغام جمع می‌شوند:
 * بازمانده را مشخص کن، بقیه را تیک بزن، ادغام — آگهی‌های همه‌ی فروشنده‌ها
 * بی‌سروصدا به بازمانده وصل می‌شوند و ردیف‌های ادغام‌شده با ردِ audit
 * (MERGED + mergedIntoId) بازنشسته می‌شوند.
 */

export default function AdminProductsPage() {
  const router = useRouter();
  const { status, user } = useAuthStore();
  const m = useMessages();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const brandId = searchParams.get("brandId");

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<ProductRowDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [survivor, setSurvivor] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ saved: number; skipped: number; failed: number } | null>(null);

  useEffect(() => {
    document.title = `${m.admin.products.title} | iMach`;
  }, [m]);

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (status !== "authed") return;
    let alive = true;
    setLoading(true);
    productsApi
      .getProducts({ q: debounced || undefined, brandId: brandId || undefined, limit: 50 })
      .then((res) => {
        if (!alive) return;
        setRows(res.items);
        setSurvivor(null);
        setPicked(new Set());
      })
      .catch(() => {
        if (alive) setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced, status, user?.role, brandId]);

  if (status !== "authed" || user?.role !== "ADMIN") {
    return (
      <div className="grid place-items-center py-24">
        <p className="text-sm font-bold text-muted-foreground">{m.admin.forbiddenTitle}</p>
      </div>
    );
  }

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
      toast({ title: m.picker.submitFailed.replace("{n}", String(fromIds.length)), variant: "destructive" });
    } finally {
      setMerging(false);
    }
  };

  const submitBulk = async () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) { toast({ title: "JSON باید آرایه باشد", variant: "destructive" }); return; }
      // اگر brandId در URL هست، برای آیتم‌هایی که brandId ندارند ست کن
      const items = parsed.map((item: Record<string, unknown>) => ({
        ...item,
        brandId: (item.brandId as string) || brandId || "",
      }));
      setBulkBusy(true);
      setBulkResult(null);
      const res = await productsApi.bulkCreate({ items: items as Parameters<typeof productsApi.bulkCreate>[0]["items"] });
      setBulkResult({ saved: res.saved, skipped: res.skipped, failed: res.failed });
      toast({ title: `${res.saved} کالا ثبت شد${res.skipped > 0 ? ` · ${res.skipped} تکراری` : ""}${res.failed > 0 ? ` · ${res.failed} خطا` : ""}` });
      // refresh list
      setDebounced(debounced + " ");
    } catch (err) {
      toast({ title: "خطا در JSON یا ثبت", description: String(err), variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const sampleJson = JSON.stringify([
    {
      brandId: "BRAND_ID_HERE",
      goodName: "پفک",
      label: "پفک اشی مشی ۲۰تایی",
      barcode: "6260101530017",
      imageUrl: "https://example.com/product.jpg",
      attrs: { weight: "20pcs", flavor: "نمکی" }
    }
  ], null, 2);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="flex items-center gap-1.5 text-lg font-extrabold">
          <Merge className="size-5 text-primary" />
          {m.admin.products.title}
          {brandId && (
            <a href="/admin/products" className="ms-2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-primary hover:bg-accent/70">
              فیلتر برند ✓ ×
            </a>
          )}
        </h1>
        <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{m.admin.products.desc}</p>

        {/* دکمه ثبت گروهی JSON */}
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(!bulkOpen)}>
            <FileJson className="size-3.5" />
            ثبت گروهی (JSON)
          </Button>
          {brandId && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <Tag className="size-3" />
              brandId از URL استفاده می‌شود: {brandId.slice(-6)}
            </span>
          )}
        </div>

        {/* فرم ثبت گروهی */}
        {bulkOpen && (
          <div className="mt-3 rounded-xl border-2 border-primary/30 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold">ثبت گروهی کالاهای مرجع</span>
              <button type="button" onClick={() => setBulkOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <p className="mb-2 text-[10px] leading-4 text-muted-foreground">
              یک آرایه JSON از محصولات را اینجا بچسبان. هر آیتم باید شامل: brandId, goodName, label (الزامی) + barcode, imageUrl, attrs (اختیاری).
              اگر brandId در URL مشخص شده، می‌توانید آن را در JSON خالی بگذارید.
            </p>
            <textarea
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              className="h-48 w-full rounded-lg border p-3 font-mono text-xs"
              dir="ltr"
              placeholder={sampleJson}
            />
            {bulkResult && (
              <div className="mt-2 flex gap-3 text-xs font-bold">
                <span className="text-emerald-600">✓ {bulkResult.saved} ثبت شد</span>
                {bulkResult.skipped > 0 && <span className="text-amber-600">↩ {bulkResult.skipped} تکراری</span>}
                {bulkResult.failed > 0 && <span className="text-red-600">✗ {bulkResult.failed} خطا</span>}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => void submitBulk()} disabled={bulkBusy || !bulkJson.trim()}>
                {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                ثبت
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setBulkJson(sampleJson); }}>نمونه</Button>
              <Button size="sm" variant="ghost" onClick={() => { setBulkJson(""); setBulkResult(null); }}>پاک کردن</Button>
            </div>
          </div>
        )}

        {/* جست‌وجو */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={m.admin.products.searchAria}
            placeholder={m.admin.products.searchPlaceholder}
            value={query}
            maxLength={60}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pe-9"
          />
        </div>

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{m.admin.products.empty}</p>
        ) : (
          <div className="mt-4 divide-y rounded-xl border">
            {rows.map((p) => {
              const isSurvivor = survivor === p.id;
              const isMerged = picked.has(p.id) && !isSurvivor;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 transition ${isSurvivor ? "bg-emerald-50" : isMerged ? "bg-accent/40" : ""}`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/70 text-sm font-black text-primary/80">
                    {p.good.nameFa.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold">{p.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {goodName(p.good)} · {categoryName(p.good.category)}
                      {p.sellers > 0 && (
                        <span className="ms-1.5 font-bold text-primary/70">{m.admin.products.sellers.replace("{n}", String(p.sellers))}</span>
                      )}
                    </p>
                  </div>
                  {p.status === "PROVISIONAL" && (
                    <Badge variant="outline" className="shrink-0 border-primary/25 text-[10px] text-primary">
                      {m.picker.provisional}
                    </Badge>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSurvivor(isSurvivor ? null : p.id)}
                      aria-label={m.admin.products.survivor}
                      title={m.admin.products.survivor}
                      className={`grid size-7 place-items-center rounded-full border transition ${
                        isSurvivor ? "border-emerald-500 bg-emerald-500 text-white" : "text-muted-foreground hover:text-emerald-600"
                      }`}
                    >
                      <Check className="size-4" />
                    </button>
                    {!isSurvivor && (
                      <button
                        type="button"
                        onClick={() => togglePicked(p.id)}
                        aria-label="merge pick"
                        className={`grid size-7 place-items-center rounded-full border transition ${
                          isMerged ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
                        }`}
                      >
                        {isMerged ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
              <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
                <X className="size-4" />
              </Button>
              <Button size="sm" onClick={() => void merge()} disabled={merging || !survivor}>
                {merging ? <Loader2 className="size-4 animate-spin" /> : <Merge className="size-4" />}
                {m.admin.products.mergeInto.replace("{n}", String(picked.size))}
              </Button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
