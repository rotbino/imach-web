"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useAdminBrands,
  adminApi,
  type AdminBrandDto,
} from "../api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/search-select";
import { useMyBusinesses } from "@/lib/queries";
import { fa } from "@/lib/format";
import {
  Tag,
  Plus,
  Search,
  Loader2,
  Check,
  X,
  ShieldCheck,
  Package,
  Store,
  ChevronLeft,
} from "lucide-react";

export default function AdminBrandsPage() {
  const params = useSearchParams();
  const { toast } = useToast();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mergeFor, setMergeFor] = useState<AdminBrandDto | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");

  const brandsQ = useAdminBrands({ q: q || undefined, status: status || undefined });
  const brands = brandsQ.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="animate-fade-up">
      {/* هدر */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="size-5 text-primary" />
          <h1 className="text-lg font-extrabold">برندها</h1>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {brands.length} برند
          </span>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          برند جدید
        </Button>
      </div>

      {/* جست‌وجو + فیلتر */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative grow" style={{ minWidth: 200 }}>
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجوی برند…"
            className="h-10 pe-9 text-sm"
            maxLength={40}
          />
        </div>
        <Button
          variant={status === "PROVISIONAL" ? "default" : "outline"}
          size="sm"
          className="h-10"
          onClick={() => setStatus(status === "PROVISIONAL" ? "" : "PROVISIONAL")}
        >
          در انتظار
        </Button>
      </div>

      {/* فرم ایجاد برند جدید */}
      {creating && (
        <CreateBrandForm onDone={() => setCreating(false)} />
      )}

      {/* لیست برندها */}
      {brandsQ.isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <Tag className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-bold text-muted-foreground">برندی پیدا نشد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {brands.map((brand) => (
            <BrandRow
              key={brand.id}
              brand={brand}
              isEditing={editingId === brand.id}
              onEdit={() => setEditingId(editingId === brand.id ? null : brand.id)}
              onMerge={() => setMergeFor(brand)}
            />
          ))}
        </div>
      )}

      {/* مدال ادغام */}
      {mergeFor && (
        <MergeDialog
          brand={mergeFor}
          target={mergeTarget}
          onTargetChange={setMergeTarget}
          onClose={() => { setMergeFor(null); setMergeTarget(""); }}
        />
      )}

      {/* بازگشت */}
      <div className="mt-6 border-t pt-3">
        <Link href="/admin" className="text-[11px] font-bold text-muted-foreground hover:text-foreground">
          ← بازگشت به داشبورد
        </Link>
      </div>
    </div>
  );
}

// ─── ردیف برند ───────────────────────────────────────────────────────────────

function BrandRow({
  brand,
  isEditing,
  onEdit,
  onMerge,
}: {
  brand: AdminBrandDto;
  isEditing: boolean;
  onEdit: () => void;
  onMerge: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(brand.name);
  const [ownerId, setOwnerId] = useState<string | null>(brand.ownerId);
  const [saving, setSaving] = useState(false);

  const bizQ = useMyBusinesses();
  const businesses = (bizQ.data ?? []).map((b) => ({ value: b.id, label: b.name, hint: b.slug }));

  const hasChanges = name !== brand.name || ownerId !== brand.ownerId;

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.editBrand(brand.id, {
        name: name.trim(),
        ownerId: ownerId ?? null,
      });
      toast({ title: "ذخیره شد" });
      onEdit();
    } catch (err) {
      toast({ title: "خطا", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    try {
      await adminApi.editBrand(brand.id, { status: "ACTIVE" });
      toast({ title: "تأیید شد" });
    } catch (err) {
      toast({ title: "خطا", description: String(err), variant: "destructive" });
    }
  };

  return (
    <div className="rounded-xl border bg-white p-3">
      {/* نام + وضعیت + آمار */}
      <div className="flex items-center gap-3">
        {/* آیکون */}
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/70 text-sm font-black text-primary/80">
          {brand.name.slice(0, 1)}
        </span>

        {/* نام + اطلاعات */}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm font-bold" maxLength={60} autoFocus />
          ) : (
            <p className="truncate text-sm font-extrabold">{brand.name}</p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {/* تعداد محصول */}
            {brand._count.products > 0 && (
              <Link
                href={`/admin/products?brandId=${brand.id}`}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 hover:bg-blue-100"
                title={`${brand._count.products} محصول`}
              >
                <Package className="ms-0.5 -mt-0.5 inline size-2.5" />
                {fa(brand._count.products)} محصول
              </Link>
            )}
            {/* تعداد آگهی */}
            {brand._count.listings > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                {fa(brand._count.listings)} آگهی
              </span>
            )}
            {/* مالک */}
            {brand.owner ? (
              <Link
                href={`/sell/${brand.owner.slug}`}
                className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 hover:bg-amber-100"
              >
                <Store className="ms-0.5 -mt-0.5 inline size-2.5" />
                {brand.owner.name}
              </Link>
            ) : (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-500">
                بدون مالک
              </span>
            )}
            {/* وضعیت */}
            {brand.status === "PROVISIONAL" && (
              <button onClick={approve} className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600 hover:bg-red-100">
                در انتظار → تأیید
              </button>
            )}
          </div>
        </div>

        {/* دکمه‌ها */}
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onEdit} className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-primary">
            <ShieldCheck className="size-3.5" />
          </button>
          <button onClick={onMerge} className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-primary" title="ادغام">
            <ChevronLeft className="size-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* ویرایش مالک */}
      {isEditing && (
        <div className="mt-3 border-t pt-3">
          <Label className="text-[10px] text-muted-foreground">کسب‌وکار مالک برند</Label>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1">
              <SearchSelect
                items={businesses}
                value={ownerId}
                onChange={(v) => setOwnerId(v || null)}
                placeholder="انتخاب کسب‌وکار…"
                searchPlaceholder="جست‌وجوی کسب‌وکار…"
                emptyText="پیدا نشد"
                ariaLabel="مالک برند"
              />
            </div>
            {ownerId && (
              <Button size="sm" variant="ghost" onClick={() => setOwnerId(null)}>
                <X className="size-3.5" />
                حذف مالک
              </Button>
            )}
          </div>
          {hasChanges && (
            <Button size="sm" className="mt-2" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              ذخیره
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── فرم ایجاد برند جدید ─────────────────────────────────────────────────────

function CreateBrandForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast({ title: "نام برند را بنویس", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await adminApi.createBrand(name.trim());
      toast({ title: "برند ساخته شد" });
      onDone();
    } catch (err) {
      toast({ title: "خطا", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="mb-4 rounded-xl border-2 border-primary/30 bg-white p-4">
      <div className="mb-2 flex items-center gap-2"><Plus className="size-4 text-primary" /><span className="text-xs font-extrabold">برند جدید</span></div>
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" placeholder="نام برند…" maxLength={60} autoFocus />
        <Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}ذخیره</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>انصراف</Button>
      </div>
    </div>
  );
}

// ─── مدال ادغام ───────────────────────────────────────────────────────────────

function MergeDialog({
  brand,
  target,
  onTargetChange,
  onClose,
}: {
  brand: AdminBrandDto;
  target: string;
  onTargetChange: (v: string) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const merge = async () => {
    if (!target || target === brand.id) { toast({ title: "برند هدف را انتخاب کن", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await adminApi.mergeBrand(brand.id, target);
      toast({ title: "ادغام شد" });
      onClose();
    } catch (err) {
      toast({ title: "خطا", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-extrabold">ادغام «{brand.name}»</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">آگهی‌ها و محصولات این برند به برند هدف منتقل می‌شوند و این برند حذف می‌شود.</p>
        <div className="mt-3">
          <Label className="text-[11px] text-muted-foreground">آیدی برند هدف (۲۴ کاراکتر hex)</Label>
          <Input value={target} onChange={(e) => onTargetChange(e.target.value)} className="mt-1 h-9 text-xs" dir="ltr" placeholder="6ab6c37826479218cc94aa1e" maxLength={24} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => void merge()} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}ادغام</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </div>
  );
}
