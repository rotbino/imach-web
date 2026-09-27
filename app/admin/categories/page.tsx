"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { adminApi, useAdminCategories, type AdminCategoryNodeDto, type AdminCategoryAttr } from "../api";
import { useUnits } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchSelect, type SearchSelectItem } from "@/components/search-select";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Check,
  Plus,
  Minus,
  X,
  GripVertical,
  Tag,
  ListTree,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ─── مدیریت دسته‌بندی‌ها و ویژگی‌ها ──────────────────────────────────────────
 *
 * دو پنل:
 *   ۱. درخت دسته‌بندی (چپ) — ادمین روی یک دسته‌ی فرعی کلیک می‌کند
 *   ۲. ویرایشگر (راست) — اطلاعات دسته + ویرایشگر ویژگی‌ها
 *
 * ویژگی‌ها فقط روی leaf (دسته‌ی فرعی) تعریف می‌شوند.
 * هر ویژگی: { key, fa, en, type: enum|text, options?, required? }
 */

export default function AdminCategoriesPage() {
  const catsQ = useAdminCategories();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── پیدا کردن دسته‌ی انتخاب‌شده در درخت
  const findNode = (nodes: AdminCategoryNodeDto[], id: string): AdminCategoryNodeDto | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  };

  const selected = useMemo(() => {
    if (!catsQ.data || !selectedId) return null;
    return findNode(catsQ.data, selectedId);
  }, [catsQ.data, selectedId]);

  if (catsQ.isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* هدر */}
      <div className="mb-4 flex items-center gap-2">
        <ListTree className="size-5 text-primary" />
        <h1 className="text-lg font-extrabold">دسته‌بندی‌ها و ویژگی‌ها</h1>
      </div>
      <p className="mb-4 text-[11px] leading-5 text-muted-foreground">
        ویژگی‌ها (وزن، نوع، قطر، ...) روی هر دسته‌ی فرعی تعریف می‌شوند. روی یک دسته‌ی فرعی کلیک کن تا ویرایشگر باز شود.
      </p>

      {/* دو پنل: درخت + ویرایشگر */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* ── درخت دسته‌بندی ── */}
        <div className="rounded-2xl border bg-white p-3">
          <CategoryTree
            nodes={catsQ.data ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            depth={0}
          />
        </div>

        {/* ── ویرایشگر دسته‌ی انتخاب‌شده ── */}
        <div>
          {selected ? (
            <CategoryEditor key={selected.id} cat={selected} />
          ) : (
            <div className="grid h-full min-h-[300px] place-items-center rounded-2xl border border-dashed">
              <div className="text-center">
                <Tag className="mx-auto size-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm font-bold text-muted-foreground">
                  یک دسته‌ی فرعی را انتخاب کن
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  ویژگی‌ها فقط روی دسته‌های فرعی تعریف می‌شوند
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── درخت بازشو ─────────────────────────────────────────────────────────────

function CategoryTree({
  nodes,
  selectedId,
  onSelect,
  depth,
}: {
  nodes: AdminCategoryNodeDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isLeaf = !hasChildren;
        const isOpen = openIds.has(node.id);
        const isSelected = selectedId === node.id;

        return (
          <div key={node.id}>
            <div
              className="group flex items-center gap-1.5 rounded-lg py-1.5 pe-2 transition hover:bg-accent/40"
              style={{ paddingInlineStart: `${depth * 14 + 4}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground/60 hover:bg-stone-100 hover:text-primary"
                  aria-label={isOpen ? "بستن" : "باز کردن"}
                >
                  {isOpen ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                </button>
              ) : (
                <span className="size-5 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => onSelect(node.id)}
                className={cn(
                  "flex min-w-0 grow items-center gap-1.5 rounded px-1.5 py-1 text-start text-xs font-bold transition",
                  isSelected ? "bg-primary/10 text-primary" : "text-stone-700 hover:bg-stone-100",
                  isLeaf && "text-stone-600"
                )}
              >
                <span className="truncate">{node.nameFa}</span>
                {node.direct > 0 && (
                  <Link
                    href={`/admin/goods?categoryId=${node.id}`}
                    className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20"
                    onClick={(e) => e.stopPropagation()}
                    title={`${node.direct} کالا`}
                  >
                    {node.direct}
                  </Link>
                )}
                {isLeaf && (
                  <Tag className="size-3 shrink-0 text-muted-foreground/40" />
                )}
              </button>
            </div>
            {hasChildren && isOpen && (
              <CategoryTree
                nodes={node.children}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ویرایشگر دسته‌ی انتخاب‌شده ──────────────────────────────────────────────

function CategoryEditor({ cat }: { cat: AdminCategoryNodeDto }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const unitsQ = useUnits();

  // ── فیلدهای دسته
  const [nameFa, setNameFa] = useState(cat.nameFa);
  const [nameEn, setNameEn] = useState(cat.nameEn);
  const [gs1GpcCode, setGs1GpcCode] = useState(cat.gs1GpcCode ?? "");
  const [hsCode, setHsCode] = useState(cat.hsCode ?? "");
  const [unit, setUnit] = useState(cat.unit ?? "");

  // ── آیتم‌های SearchSelect برای واحدها
  const unitItems: SearchSelectItem[] = (unitsQ.data ?? []).map((u) => ({
    value: u.key,
    label: u.nameFa,
    hint: u.key,
  }));

  // ── ویژگی‌ها
  const [attrs, setAttrs] = useState<AdminCategoryAttr[]>(cat.attrs ?? []);
  const [saving, setSaving] = useState(false);
  const [savingAttrs, setSavingAttrs] = useState(false);

  const isLeaf = cat.children.length === 0;
  const hasChanges = nameFa !== cat.nameFa || nameEn !== cat.nameEn || gs1GpcCode !== (cat.gs1GpcCode ?? "") || hsCode !== (cat.hsCode ?? "") || unit !== (cat.unit ?? "");
  const hasAttrChanges = JSON.stringify(attrs) !== JSON.stringify(cat.attrs ?? []);

  const saveCategory = async () => {
    setSaving(true);
    try {
      await adminApi.updateCategory({
        categoryId: cat.id,
        nameFa: nameFa.trim(),
        nameEn: nameEn.trim(),
        gs1GpcCode: gs1GpcCode.trim() || null,
        hsCode: hsCode.trim() || null,
        unit: unit.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast({ title: "ذخیره شد" });
    } catch (err) {
      toast({ title: "خطا", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveAttrs = async () => {
    setSavingAttrs(true);
    try {
      await adminApi.updateCategoryAttrs({
        categoryId: cat.id,
        attrs,
      });
      await qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast({ title: "ویژگی‌ها ذخیره شد" });
    } catch (err) {
      toast({ title: "خطا", description: String(err), variant: "destructive" });
    } finally {
      setSavingAttrs(false);
    }
  };

  // ── عملیات ویژگی
  const addAttr = () => {
    setAttrs((a) => [...a, { key: "", fa: "", en: "", type: "text", required: false }]);
  };

  const updateAttr = (index: number, patch: Partial<AdminCategoryAttr>) => {
    setAttrs((a) => a.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  };

  const removeAttr = (index: number) => {
    setAttrs((a) => a.filter((_, i) => i !== index));
  };

  const addOption = (attrIndex: number) => {
    setAttrs((a) => a.map((x, i) => (i === attrIndex ? { ...x, options: [...(x.options ?? []), { v: "", fa: "", en: "" }] } : x)));
  };

  const updateOption = (attrIndex: number, optIndex: number, patch: Partial<{ v: string; fa: string; en: string }>) => {
    setAttrs((a) => a.map((x, i) => (i === attrIndex ? { ...x, options: x.options?.map((o, j) => (j === optIndex ? { ...o, ...patch } : o)) } : x)));
  };

  const removeOption = (attrIndex: number, optIndex: number) => {
    setAttrs((a) => a.map((x, i) => (i === attrIndex ? { ...x, options: x.options?.filter((_, j) => j !== optIndex) } : x)));
  };

  return (
    <div className="space-y-4">
      {/* ── بخش ۱: اطلاعات دسته ── */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-extrabold text-stone-700">اطلاعات دسته</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-muted-foreground">{cat.slug}</span>
          {isLeaf ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">فرعی</span>
          ) : (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">مادر</span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[11px] text-muted-foreground">نام فارسی</Label>
            <Input value={nameFa} onChange={(e) => setNameFa(e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">نام انگلیسی</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">کد GS1 GPC</Label>
            <Input value={gs1GpcCode} onChange={(e) => setGs1GpcCode(e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" placeholder="مثلاً 10000335" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">کد HS (گمرک)</Label>
            <Input value={hsCode} onChange={(e) => setHsCode(e.target.value)} className="mt-1 h-9 text-sm" dir="ltr" placeholder="مثلاً 0813" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">واحد پیش‌فرض</Label>
            <SearchSelect
              items={unitItems}
              value={unit || null}
              onChange={(v) => setUnit(v)}
              placeholder="انتخاب واحد"
              searchPlaceholder="جست‌وجوی واحد…"
              emptyText="پیدا نشد"
              ariaLabel="واحد"
            />
          </div>
        </div>

        {hasChanges && (
          <Button size="sm" className="mt-3" onClick={() => void saveCategory()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            ذخیره تغییرات
          </Button>
        )}
      </div>

      {/* ── بخش ۲: ویرایشگر ویژگی‌ها — فقط برای دسته‌های فرعی ── */}
      {isLeaf ? (
        <div className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-primary" />
              <span className="text-xs font-extrabold text-stone-700">ویژگی‌ها</span>
              <span className="text-[10px] text-muted-foreground">({attrs.length} ویژگی)</span>
            </div>
            <Button size="sm" variant="outline" onClick={addAttr}>
              <Plus className="size-3.5" />
              افزودن ویژگی
            </Button>
          </div>

          {/* راهنما */}
          <p className="mb-3 text-[10px] leading-4 text-muted-foreground">
            ویژگی‌ها برای تطابق کالاها استفاده می‌شوند. «اجباری» یعنی کاربر موقع ثبت کالا حتماً باید آن را پر کند.
          </p>

          {attrs.length === 0 ? (
            <div className="grid place-items-center py-8 text-center">
              <Tag className="size-8 text-muted-foreground/30" />
              <p className="mt-2 text-xs text-muted-foreground">هنوز ویژگی‌ای تعریف نشده</p>
              <Button size="sm" variant="ghost" className="mt-2" onClick={addAttr}>
                <Plus className="size-3.5" />
                اولین ویژگی را اضافه کن
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {attrs.map((attr, i) => (
                <div key={i} className="rounded-xl border p-3">
                  {/* ردیف اصلی ویژگی */}
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-2 size-4 shrink-0 text-muted-foreground/30" />
                    <div className="grid flex-1 gap-2 sm:grid-cols-4">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">کلید (key)</Label>
                        <Input
                          value={attr.key}
                          onChange={(e) => updateAttr(i, { key: e.target.value })}
                          className="h-8 text-xs"
                          dir="ltr"
                          placeholder="weight"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">نام فارسی</Label>
                        <Input
                          value={attr.fa}
                          onChange={(e) => updateAttr(i, { fa: e.target.value })}
                          className="h-8 text-xs"
                          placeholder="وزن بسته"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">نام انگلیسی</Label>
                        <Input
                          value={attr.en}
                          onChange={(e) => updateAttr(i, { en: e.target.value })}
                          className="h-8 text-xs"
                          dir="ltr"
                          placeholder="Pack weight"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">نوع</Label>
                        <Select
                          value={attr.type}
                          onValueChange={(v) => updateAttr(i, { type: v as "enum" | "text" })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">متن آزاد</SelectItem>
                            <SelectItem value="enum">انتخاب از لیست</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttr(i)}
                      className="mt-2 grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="حذف ویژگی"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  {/* کلید اجباری */}
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={attr.required ?? false}
                      onChange={(e) => updateAttr(i, { required: e.target.checked })}
                      className="size-3.5 accent-[var(--primary)]"
                    />
                    اجباری (کاربر موقع ثبت کالا حتماً باید پر کند)
                  </label>

                  {/* گزینه‌های enum */}
                  {attr.type === "enum" && (
                    <div className="mt-3 border-t pt-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground">گزینه‌ها</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => addOption(i)}>
                          <Plus className="size-3" />
                          گزینه
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {(attr.options ?? []).map((opt, j) => (
                          <div key={j} className="flex items-center gap-1.5">
                            <Input
                              value={opt.v}
                              onChange={(e) => updateOption(i, j, { v: e.target.value })}
                              className="h-7 w-20 text-[11px]"
                              dir="ltr"
                              placeholder="250g"
                            />
                            <Input
                              value={opt.fa}
                              onChange={(e) => updateOption(i, j, { fa: e.target.value })}
                              className="h-7 flex-1 text-[11px]"
                              placeholder="۲۵۰ گرمی"
                            />
                            <Input
                              value={opt.en}
                              onChange={(e) => updateOption(i, j, { en: e.target.value })}
                              className="h-7 flex-1 text-[11px]"
                              dir="ltr"
                              placeholder="250 g"
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(i, j)}
                              className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ))}
                        {(attr.options ?? []).length === 0 && (
                          <p className="text-[10px] text-muted-foreground">گزینه‌ای اضافه نشده</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {hasAttrChanges && (
                <Button onClick={() => void saveAttrs()} disabled={savingAttrs} className="w-full">
                  {savingAttrs ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  ذخیره ویژگی‌ها
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <ListTree className="mx-auto size-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm font-bold text-muted-foreground">این یک دسته‌ی مادر است</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ویژگی‌ها فقط روی دسته‌های فرعی تعریف می‌شوند. روی یک زیردسته کلیک کن.
          </p>
        </div>
      )}

      {/* ── لینک بازگشت ── */}
      <div className="flex items-center justify-between border-t pt-3">
        <Link href="/admin" className="text-[11px] font-bold text-muted-foreground hover:text-foreground">
          ← بازگشت به داشبورد
        </Link>
        <Link href="/" className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground">
          <Globe className="size-3.5" />
          مشاهده سایت
        </Link>
      </div>
    </div>
  );
}
