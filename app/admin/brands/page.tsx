"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useAdminBrands,
  useAdminMutation,
  adminApi,
  type AdminBrandDto,
  type AdminCreator,
} from "../api";
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
import { Loader2, Merge, Search, Tag, Trash2, X, Plus, Check } from "lucide-react";

/*
 * باغبانی برندها — برندها خودکار از فرم ثبت کالا ساخته می‌شوند و دوقلو زیاد
 * می‌دهند (قلم/قلم‌آور). برندِ ساخته‌ی کاربر عادی PROVISIONAL می‌ماند تا ادمین
 * تایید/ادغام/حذفش کند؛ از همین صفحه هم می‌شود برند اضافه کرد (ادمین ← فعال).
 */

const STATUSES = ["ACTIVE", "PROVISIONAL"] as const;

const creatorBadgeClass: Record<AdminCreator, string> = {
  USER: "bg-sky-100 text-sky-700 hover:bg-sky-100",
  ADMIN: "bg-primary/10 text-primary hover:bg-primary/10",
  BRAND_OWNER: "bg-violet-100 text-violet-700 hover:bg-violet-100",
};

const creatorKey = (c: string) =>
  (c === "BRAND_OWNER" ? "brandOwner" : c.toLowerCase()) as "user" | "admin" | "brandOwner";

export default function AdminBrandsPage() {
  const m = useMessages();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") ?? "";

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [mergeSrc, setMergeSrc] = useState<AdminBrandDto | null>(null);
  const [mergeQ, setMergeQ] = useState("");
  const [mergeTarget, setMergeTarget] = useState<AdminBrandDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminBrandDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [approving, setApproving] = useState<AdminBrandDto | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const patchStatus = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    const qs = params.toString();
    router.replace(`/admin/brands${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const list = useAdminBrands({ q, status: statusParam });
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

  const approveMut = useAdminMutation(() => adminApi.editBrand(approving!.id, { status: "ACTIVE" }), () => {
    toast({ title: m.admin.approved });
    setApproving(null);
  });

  const createMut = useAdminMutation(() => adminApi.createBrand(newName.trim()), () => {
    toast({ title: m.admin.brandCreated });
    setCreateOpen(false);
    setNewName("");
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

  const pill = (label: string, activeOn: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        activeOn
          ? "border-primary bg-primary/10 text-primary"
          : "border-stone-200 bg-white text-muted-foreground hover:border-stone-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="animate-fade-up">
      {/* نوار کنترل — جستجو + دکمه افزودن */}
      <div className="flex items-center gap-2">
        <div className="relative grow">
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
        <Button
          onClick={() => {
            setNewName("");
            setCreateOpen(true);
          }}
          className="h-10 shrink-0 rounded-xl px-3 font-black"
          aria-label={m.admin.newBrand}
        >
          <Plus className="size-4.5" />
          <span className="hidden sm:inline">{m.admin.newBrand}</span>
        </Button>
      </div>

      {/* فیلتر وضعیت */}
      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {pill(m.admin.filter.all, !statusParam, () => patchStatus(null))}
        {STATUSES.map((st) =>
          pill(
            st === "ACTIVE" ? m.admin.filter.active : m.admin.filter.provisional,
            statusParam === st,
            () => patchStatus(statusParam === st ? null : st)
          )
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
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-extrabold">{b.name}</p>
                {b.status === "PROVISIONAL" && (
                  <Badge className="h-5 shrink-0 bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100">
                    {m.admin.filter.provisional}
                  </Badge>
                )}
                {b.creatorRole && (
                  <Badge
                    variant="secondary"
                    className={`h-5 shrink-0 px-1.5 text-[10px] font-bold ${creatorBadgeClass[b.creatorRole]}`}
                  >
                    {m.admin.creator[creatorKey(b.creatorRole)]}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {m.admin.listingsCount.replace("{n}", String(b._count.listings))}
                {b.createdBy ? ` · ${b.createdBy.name}` : ""}
              </p>
            </div>
            {b.status === "PROVISIONAL" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-lg border-primary/40 text-[11px] font-bold text-primary hover:bg-primary/10"
                disabled={!!approving}
                onClick={() => setApproving(b)}
              >
                <Check className="size-3.5" />
                {m.admin.approve}
              </Button>
            )}
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

      {/* دیالوگ افزودن برند */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="mx-auto max-w-sm rounded-3xl p-0">
          <DialogHeader className="border-b px-5 pb-3 pt-5">
            <DialogTitle className="text-sm">{m.admin.brandCreateTitle}</DialogTitle>
            <DialogDescription className="text-xs">{m.admin.brandCreateHint}</DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={m.admin.brandNamePlaceholder}
              className="h-10 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim().length >= 1) createMut.mutate();
              }}
            />
          </div>
          <DialogFooter className="gap-2 border-t px-5 py-4">
            <Button variant="outline" className="h-9 rounded-xl text-xs" onClick={() => setCreateOpen(false)}>
              {m.admin.cancel}
            </Button>
            <Button
              className="h-9 rounded-xl text-xs font-black"
              disabled={newName.trim().length < 1 || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : m.admin.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* دیالوگ ادغام برند */}
      <Dialog open={mergeSrc !== null} onOpenChange={(v) => !v && setMergeSrc(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-0">
          <DialogHeader className="border-b px-5 pb-3 pt-5">
            <DialogTitle className="text-sm">{m.admin.mergeIntoBrand}</DialogTitle>
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

      {/* تایید برندِ در انتظار */}
      <AlertDialog open={approving !== null} onOpenChange={(v) => !v && setApproving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.admin.approveTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.admin.approveDesc.replace("{name}", approving?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.admin.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                approveMut.mutate();
              }}
            >
              {approveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : m.admin.approve}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
