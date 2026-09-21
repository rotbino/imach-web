"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminBrands, useAdminMutation, type AdminBrandDto } from "../api";
import { useMessages } from "@/i18n/messages/use-messages";
import { fa } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminApi } from "../api";
import { Loader2, Merge, Search, Tag, Trash2, X } from "lucide-react";

/*
 * باغبانی برندها — برندها خودکار از فرم ثبت کالا ساخته می‌شوند و دوقلو زیاد
 * می‌دهند (قلم/قلم‌آور). ادغام آگهی‌ها را منتقل می‌کند؛ حذف فقط بی‌آگهی‌ها.
 */

export default function AdminBrandsPage() {
  const m = useMessages();
  const { toast } = useToast();

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [mergeSrc, setMergeSrc] = useState<AdminBrandDto | null>(null);
  const [mergeQ, setMergeQ] = useState("");
  const [mergeTarget, setMergeTarget] = useState<AdminBrandDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminBrandDto | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const list = useAdminBrands({ q });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && list.hasNextPage && !list.isFetchingNextPage) {
          void list.fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [list.hasNextPage, list.isFetchingNextPage, list.fetchNextPage, items.length]);

  const deleteMut = useAdminMutation(() => adminApi.deleteBrand(confirmDelete!.id), () => {
    toast({ title: m.admin.deleted });
    setConfirmDelete(null);
  });

  const { data: mergeResults, isFetching: mergeSearching } = useAdminBrands({ q: mergeQ });
  const mergeItems = useMemo(
    () => (mergeResults?.pages[0]?.items ?? []).filter((b) => b.id !== mergeSrc?.id).slice(0, 6),
    [mergeResults, mergeSrc]
  );

  const mergeMut = useAdminMutation(
    () => adminApi.mergeBrand(mergeSrc!.id, mergeTarget!.id),
    () => {
      toast({ title: m.admin.merged });
      setMergeSrc(null);
      setMergeTarget(null);
      setMergeQ("");
    }
  );

  return (
    <div className="animate-fade-up">
      <div className="relative">
        <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder={m.admin.brands.searchPlaceholder}
          className="h-10 rounded-xl bg-white pe-9"
        />
        {qInput && (
          <button
            type="button"
            aria-label={m.admin.clear}
            onClick={() => setQInput("")}
            className="absolute start-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-stone-200 text-stone-600"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        {list.isLoading &&
          Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white" />)}

        {!list.isLoading && items.length === 0 && (
          <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
            <Tag className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-bold text-muted-foreground">{m.admin.empty}</p>
          </div>
        )}

        {items.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-stone-100 font-black text-stone-600">
              {b.name.slice(0, 1)}
            </span>
            <div className="min-w-0 grow">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-extrabold">{b.name}</p>
                {b.source === "USER" && (
                  <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px] font-bold">
                    {m.admin.filter.user}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {m.admin.listingsCount.replace("{n}", String(b._count.listings))}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-lg text-[11px] font-bold"
              onClick={() => {
                setMergeSrc(b);
                setMergeTarget(null);
                setMergeQ("");
              }}
            >
              <Merge className="size-3.5" />
              {m.admin.merge}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-lg text-[11px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={b._count.listings > 0}
              onClick={() => {
                if (b._count.listings > 0) {
                  toast({ title: m.admin.brandInUse, variant: "destructive" });
                  return;
                }
                setConfirmDelete(b);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}

        {list.isFetchingNextPage && (
          <div className="grid place-items-center py-4">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
        <div ref={sentinel} />
      </div>

      {/* دیالوگ ادغام برند */}
      <Dialog open={mergeSrc !== null} onOpenChange={(v) => !v && setMergeSrc(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-0">
          <DialogHeader className="border-b px-5 pb-3 pt-5">
            <DialogTitle className="text-sm">{m.admin.mergeInto}</DialogTitle>
            <DialogDescription className="text-xs">
              {mergeSrc?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2.5 px-5 py-4">
            <div className="relative">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={mergeQ}
                onChange={(e) => setMergeQ(e.target.value)}
                placeholder={m.admin.brands.searchPlaceholder}
                className="h-10 rounded-xl pe-9"
              />
            </div>
            <div className="grid max-h-44 gap-1 overflow-y-auto">
              {mergeSearching && (
                <div className="grid place-items-center py-3">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!mergeSearching &&
                mergeItems.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setMergeTarget(b)}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-start text-xs transition-colors ${
                      mergeTarget?.id === b.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                    }`}
                  >
                    <span className="truncate font-bold">{b.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {fa(b._count.listings)}
                    </span>
                  </button>
                ))}
              {!mergeSearching && mergeQ.trim() && mergeItems.length === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">{m.admin.noResults}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 border-t px-5 py-4">
            <Button variant="outline" className="h-9 rounded-xl text-xs" onClick={() => setMergeSrc(null)}>
              {m.admin.cancel}
            </Button>
            <Button
              className="h-9 rounded-xl text-xs font-black"
              disabled={!mergeTarget || mergeMut.isPending}
              onClick={() => mergeMut.mutate()}
            >
              {mergeMut.isPending ? <Loader2 className="size-4 animate-spin" /> : m.admin.mergeConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تایید حذف برند */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.admin.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.admin.deleteDesc.replace("{name}", confirmDelete?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.admin.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                deleteMut.mutate();
              }}
            >
              {deleteMut.isPending ? <Loader2 className="size-4 animate-spin" /> : m.admin.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
