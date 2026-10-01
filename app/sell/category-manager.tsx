"use client";

/*
 * مدیریت دسته‌های شخصی کاتالوگ — فاز ۳ (طرح ۰۱).
 * چیپ‌های بالای ویترین («هاشمی/طارم/فجر/صدری» برای برنج‌فروش، «میلگرد/ورق»
 * برای آهن‌فروش) این‌جا ساخته/ویرایش/حذف می‌شوند. کل لیست با یک PUT یکجا
 * replace می‌شود — idempotent و ساده. حذف دسته، آگهی‌هایش را فقط «بی‌دسته»
 * می‌کند؛ خود کالاها سر جایشان می‌مانند.
 */

import { useState } from "react";
import type { CatalogCategoryDto } from "@/lib/api";
import { useSetCatalogCategories } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Plus, Tag, Trash2 } from "lucide-react";

export function CategoryManagerDialog({
  bizId,
  categories,
  open,
  onOpenChange,
}: {
  bizId: string;
  categories: CatalogCategoryDto[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const mutation = useSetCatalogCategories();
  // کپی محلی — تا ذخیره، تغییرات روی صفحه‌ی کاربر می‌ماند.
  // والد با key={open} این دیالوگ را هر بار باز شدن از نو mount می‌کند
  // (مقدار اولیه تازه می‌گیرد — بدون setState-in-effect)
  const [rows, setRows] = useState<CatalogCategoryDto[]>(categories);
  const [newName, setNewName] = useState("");

  const dirty = JSON.stringify(rows) !== JSON.stringify(categories);

  const addRow = () => {
    const name = newName.trim();
    if (!name) return;
    if (rows.some((r) => r.name === name)) {
      toast({ title: "دسته‌ای با این نام دارید", variant: "destructive" });
      return;
    }
    setRows((s) => [...s, { id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name }]);
    setNewName("");
  };

  const save = async () => {
    const names = rows.map((r) => r.name.trim()).filter(Boolean);
    if (new Set(names).size !== names.length) {
      toast({ title: "نام دسته‌ها نباید تکراری باشد", variant: "destructive" });
      return;
    }
    try {
      await mutation.mutateAsync({ id: bizId, categories: rows.map((r) => ({ id: r.id, name: r.name.trim() })) });
      toast({ title: "دسته‌ها ذخیره شد" });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Tag className="size-4 text-primary" />
            دسته‌های کاتالوگ من
          </DialogTitle>
          <DialogDescription>
            دسته‌ها چیپ‌های بالای ویترین شما هستند — مشتری با یک ضربه کالاهای همان دسته را می‌بیند. حذف دسته کالاهایش را حذف نمی‌کند.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {rows.length === 0 && (
            <p className="rounded-xl border border-dashed bg-white/70 p-6 text-center text-xs leading-6 text-muted-foreground">
              هنوز دسته‌ای ندارید — مثلاً «هاشمی»، «فله» یا «تخفیفی» بسازید.
            </p>
          )}
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2">
              <Input
                value={r.name}
                maxLength={40}
                onChange={(e) =>
                  setRows((s) => s.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                className="h-10 flex-1"
                aria-label={`نام دسته ${i + 1}`}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                aria-label={`حذف ${r.name}`}
                onClick={() => setRows((s) => s.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          {/* افزودن دسته‌ی جدید */}
          <div className="flex items-center gap-2 border-t pt-2.5">
            <Input
              value={newName}
              maxLength={40}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRow();
                }
              }}
              placeholder="دسته جدید…"
              className="h-10 flex-1"
            />
            <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" onClick={addRow} disabled={!newName.trim()} aria-label="افزودن دسته">
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => void save()} disabled={!dirty || mutation.isPending} className="w-full">
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            ذخیره دسته‌ها
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
