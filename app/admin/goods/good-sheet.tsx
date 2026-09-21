"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useMessages } from "@/i18n/messages/use-messages";
import { useCategories } from "@/lib/queries";
import { UNIT_LABELS, unitLabel, categoryName } from "@/lib/format";
import {
  adminApi,
  useAdminGoods,
  useAdminMutation,
  type AdminGoodDto,
} from "../api";
import { Loader2, Merge, Trash2, Search, ArrowLeftRight } from "lucide-react";

/*
 * شیت ویرایش کالای مرجع — همان فرم برای ساخت دستی ادمین (good=null).
 * ابزار باغبانی: تغییر نام/دسته/واحد، تایید provisional، ادغام با کالای دیگر
 * و حذفِ فقط کالاهای بی‌آگهی. ادغام آگهی‌ها را منتقل می‌کند و نام قبلی را
 * به‌عنوان alias نگه می‌دارد — جستجوی قدیمی نمی‌شکند.
 */

const UNITS = Object.keys(UNIT_LABELS);

interface GoodSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null + open = حالت ساخت دستی */
  good: AdminGoodDto | null;
}

export function GoodSheet({ open, onOpenChange, good }: GoodSheetProps) {
  const m = useMessages();
  const { toast } = useToast();
  const { data: tree } = useCategories();

  const [nameFa, setNameFa] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [aliases, setAliases] = useState("");
  const [unit, setUnit] = useState("PIECE");
  const [rootId, setRootId] = useState("");
  const [childId, setChildId] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PROVISIONAL">("ACTIVE");
  const [merging, setMerging] = useState(false);
  const [mergeQ, setMergeQ] = useState("");
  const [mergeTarget, setMergeTarget] = useState<AdminGoodDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmMerge, setConfirmMerge] = useState(false);

  const editing = good !== null;

  useEffect(() => {
    if (!open) return;
    setMerging(false);
    setMergeQ("");
    setMergeTarget(null);
    setConfirmDelete(false);
    setConfirmMerge(false);
    if (good) {
      setNameFa(good.nameFa);
      setNameEn(good.nameEn ?? "");
      setAliases(good.aliases.join("، "));
      setUnit(good.unit);
      setStatus(good.status);
      setChildId(good.category.id);
      const root = tree?.find((r) => r.children.some((c) => c.id === good.category.id) || r.id === good.category.id);
      setRootId(root?.id ?? "");
    } else {
      setNameFa("");
      setNameEn("");
      setAliases("");
      setUnit("PIECE");
      setStatus("ACTIVE");
      setRootId("");
      setChildId("");
    }
  }, [open, good, tree]);

  const roots = tree ?? [];
  const children = useMemo(() => roots.find((r) => r.id === rootId)?.children ?? [], [roots, rootId]);

  const close = () => onOpenChange(false);

  const saveMut = useAdminMutation(
    () => {
      const aliasList = aliases
        .split(/[،,]/)
        .map((a) => a.trim())
        .filter(Boolean);
      const categoryId = childId || rootId;
      if (editing && good) {
        return adminApi.editGood(good.id, {
          nameFa: nameFa.trim(),
          nameEn: nameEn.trim() || undefined,
          aliases: aliasList,
          unit,
          ...(categoryId ? { categoryId } : {}),
          status,
        });
      }
      return adminApi.createGood({
        nameFa: nameFa.trim(),
        nameEn: nameEn.trim() || undefined,
        aliases: aliasList,
        unit,
        categoryId,
      });
    },
    () => {
      toast({ title: editing ? m.admin.saved : m.admin.created });
      close();
    }
  );

  const deleteMut = useAdminMutation(() => adminApi.deleteGood(good!.id), () => {
    toast({ title: m.admin.deleted });
    setConfirmDelete(false);
    close();
  });

  const mergeMut = useAdminMutation(
    () => adminApi.mergeGood(good!.id, mergeTarget!.id),
    () => {
      toast({ title: m.admin.merged });
      setConfirmMerge(false);
      close();
    }
  );

  // نتایج جستجوی هدف ادغام — بدون خودِ کالا
  const { data: mergeResults, isFetching: mergeSearching } = useAdminGoods({ q: mergeQ });
  const mergeItems = (mergeResults?.pages[0]?.items ?? [])
    .filter((g) => g.id !== good?.id)
    .slice(0, 6);

  const submit = () => {
    if (nameFa.trim().length < 2) {
      toast({ title: m.admin.errors.nameShort, variant: "destructive" });
      return;
    }
    if (!childId && !rootId) {
      toast({ title: m.admin.errors.pickCategory, variant: "destructive" });
      return;
    }
    saveMut.mutate();
  };

  const busy = saveMut.isPending || deleteMut.isPending || mergeMut.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-0 sm:side-center sm:rounded-3xl sm:top-1/2 sm:max-h-[86dvh] sm:-translate-y-1/2">
          <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-stone-300 sm:hidden" />
          <SheetHeader className="items-start gap-1 border-b px-5 pb-4 pt-4">
            <SheetTitle className="text-base">
              {editing ? m.admin.goodSheet.editTitle : m.admin.goodSheet.createTitle}
            </SheetTitle>
            {editing && good && (
              <SheetDescription className="flex flex-wrap items-center gap-1.5 text-xs">
                <span dir="ltr">{good.id.slice(-6)}</span>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {categoryName(good.category)}
                </Badge>
                <Badge
                  variant="outline"
                  className={`h-5 px-1.5 text-[10px] ${
                    good._count.listings > 0 ? "border-primary/30 text-primary" : "text-muted-foreground"
                  }`}
                >
                  {m.admin.listingsCount.replace("{n}", String(good._count.listings))}
                </Badge>
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="flex flex-col gap-4 px-5 py-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-muted-foreground">{m.admin.goodSheet.nameFa}</span>
              <Input value={nameFa} onChange={(e) => setNameFa(e.target.value)} className="h-10 rounded-xl" />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-muted-foreground">{m.admin.goodSheet.nameEn}</span>
              <Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="h-10 rounded-xl" />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-muted-foreground">{m.admin.goodSheet.aliases}</span>
              <Input value={aliases} onChange={(e) => setAliases(e.target.value)} className="h-10 rounded-xl" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">{m.admin.goodSheet.unit}</span>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{unitLabel(u)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">{m.admin.goodSheet.status}</span>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{m.admin.filter.active}</SelectItem>
                    <SelectItem value="PROVISIONAL">{m.admin.filter.provisional}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">{m.admin.goodSheet.rootCat}</span>
                <Select
                  value={rootId}
                  onValueChange={(v) => {
                    setRootId(v);
                    setChildId("");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roots.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{categoryName(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">{m.admin.goodSheet.childCat}</span>
                <Select value={childId} onValueChange={setChildId} disabled={!rootId}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder={m.admin.goodSheet.childCat} />
                  </SelectTrigger>
                  <SelectContent>
                    {(children.length ? children : rootId ? roots.filter((r) => r.id === rootId) : []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{categoryName(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <Button
              onClick={submit}
              disabled={busy}
              className="h-11 rounded-xl text-sm font-black"
            >
              {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : m.admin.save}
            </Button>

            {editing && good && (
              <div className="border-t pt-4">
                {!merging ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      className="h-10 flex-1 rounded-xl text-xs font-bold"
                      onClick={() => setMerging(true)}
                      disabled={busy}
                    >
                      <Merge className="size-4" />
                      {m.admin.merge}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 flex-1 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={busy || good._count.listings > 0}
                      onClick={() => {
                        if (good._count.listings > 0) {
                          toast({ title: m.admin.goodInUse, variant: "destructive" });
                          return;
                        }
                        setConfirmDelete(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                      {m.admin.delete}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <ArrowLeftRight className="size-3.5" />
                      {m.admin.mergeInto}
                    </p>
                    <div className="relative">
                      <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={mergeQ}
                        onChange={(e) => setMergeQ(e.target.value)}
                        placeholder={m.admin.searchPlaceholder}
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
                        mergeItems.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setMergeTarget(g)}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-start text-xs transition-colors ${
                              mergeTarget?.id === g.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-accent/50"
                            }`}
                          >
                            <span className="truncate font-bold">{g.nameFa}</span>
                            <span className="shrink-0 text-muted-foreground">{categoryName(g.category)}</span>
                          </button>
                        ))}
                      {!mergeSearching && mergeQ.trim() && mergeItems.length === 0 && (
                        <p className="py-2 text-center text-xs text-muted-foreground">{m.admin.noResults}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="h-9 flex-1 rounded-xl text-xs"
                        onClick={() => {
                          setMerging(false);
                          setMergeTarget(null);
                        }}
                      >
                        {m.admin.cancel}
                      </Button>
                      <Button
                        className="h-9 flex-1 rounded-xl text-xs font-black"
                        disabled={!mergeTarget || mergeMut.isPending}
                        onClick={() => setConfirmMerge(true)}
                      >
                        {m.admin.mergeConfirm}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* تایید حذف */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.admin.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{m.admin.deleteDesc}</AlertDialogDescription>
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

      {/* تایید ادغام */}
      <AlertDialog open={confirmMerge} onOpenChange={setConfirmMerge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.admin.mergeTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.admin.mergeDesc
                .replace("{src}", good?.nameFa ?? "")
                .replace("{dst}", mergeTarget?.nameFa ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.admin.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                mergeMut.mutate();
              }}
            >
              {mergeMut.isPending ? <Loader2 className="size-4 animate-spin" /> : m.admin.mergeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
