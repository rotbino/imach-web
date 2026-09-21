"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { GoodSheet } from "./good-sheet";
import { useAdminGoods, type AdminGoodDto } from "../api";
import { useMessages } from "@/i18n/messages/use-messages";
import { fa, categoryName, unitLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Plus, Search, X } from "lucide-react";

/*
 * صف باغبانی کاتالوگ — لیست کالاهای مرجع با جستجو و فیلترِ سینک با URL
 * (?q= ?status= ?source=)؛ رفرش و لینک مستقیم به صف «در انتظار» کار می‌کند.
 * ردیف‌ها لمسی‌اند: لمس = شیت ویرایش. اسکرول بی‌نهایت با sensro تقاطع.
 */

const STATUSES = ["ACTIVE", "PROVISIONAL"] as const;
const SOURCES = ["SEED", "USER"] as const;

function GoodsManager() {
  const m = useMessages();
  const router = useRouter();
  const searchParams = useSearchParams();

  const qParam = searchParams.get("q") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const sourceParam = searchParams.get("source") ?? "";

  const [qInput, setQInput] = useState(qParam);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [active, setActive] = useState<AdminGoodDto | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // debounce جستجو به URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput === qParam) return;
      patchParam("q", qInput.trim() ? qInput.trim() : null);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const patchParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const qs = params.toString();
      router.replace(`/admin/goods${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router]
  );

  /** پاک‌کردن یک‌جای چند فیلتر — یک replace، نه چندتا (snapshot کهنه) */
  const clearParams = useCallback(
    (keys: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const k of keys) params.delete(k);
      const qs = params.toString();
      router.replace(`/admin/goods${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router]
  );

  // سینک فلش‌بک URL → اینپوت (مثلا از کارت اورویو)
  useEffect(() => {
    setQInput(qParam);
  }, [qParam]);

  const filters = useMemo(
    () => ({ q: qParam, status: statusParam, source: sourceParam }),
    [qParam, statusParam, sourceParam]
  );
  const list = useAdminGoods(filters);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  // اسکرول بی‌نهایت
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

  const activeFilterCount = [statusParam, sourceParam].filter(Boolean).length;

  return (
    <div className="animate-fade-up">
      {/* نوار کنترل — چسبان بالای ستون */}
      <div className="sticky top-0 z-20 -mx-4 border-b bg-muted/30 px-4 pb-3 pt-1 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2 pt-1">
          <div className="relative grow">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={m.admin.searchPlaceholder}
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
              setActive(null);
              setSheetOpen(true);
            }}
            className="h-10 shrink-0 rounded-xl px-3 font-black"
            aria-label={m.admin.newGood}
          >
            <Plus className="size-4.5" />
            <span className="hidden sm:inline">{m.admin.newGood}</span>
          </Button>
        </div>

        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {pill(m.admin.filter.all, activeFilterCount === 0, () => clearParams(["status", "source"]))}
          {STATUSES.map((st) =>
            pill(
              st === "ACTIVE" ? m.admin.filter.active : m.admin.filter.provisional,
              statusParam === st,
              () => patchParam("status", statusParam === st ? null : st)
            )
          )}
          {SOURCES.map((src) =>
            pill(src === "SEED" ? m.admin.filter.seed : m.admin.filter.user, sourceParam === src, () =>
              patchParam("source", sourceParam === src ? null : src)
            )
          )}
        </div>
      </div>

      {/* لیست */}
      <div className="mt-3 grid gap-2">
        {list.isLoading &&
          Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />)}

        {!list.isLoading && items.length === 0 && (
          <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
            <Package className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-bold text-muted-foreground">{m.admin.empty}</p>
          </div>
        )}

        {items.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              setActive(g);
              setSheetOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-start shadow-sm transition hover:shadow-md"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-lg font-black text-stone-600">
              {g.nameFa.slice(0, 1)}
            </span>
            <div className="min-w-0 grow">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-extrabold">{g.nameFa}</p>
                {g.status === "PROVISIONAL" && (
                  <Badge className="h-5 shrink-0 bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100">
                    {m.admin.filter.provisional}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {categoryName(g.category)} · {unitLabel(g.unit)}
                {g.nameEn ? ` · ${g.nameEn}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-end">
              <p className="text-sm font-black tabular-nums text-primary">{fa(g._count.listings)}</p>
              <p className="text-[10px] font-bold text-muted-foreground">{m.admin.listingsShort}</p>
            </div>
          </button>
        ))}

        {list.isFetchingNextPage && (
          <div className="grid place-items-center py-4">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
        <div ref={sentinel} />
      </div>

      <GoodSheet open={sheetOpen} onOpenChange={setSheetOpen} good={active} />
    </div>
  );
}

export default function AdminGoodsPage() {
  return (
    <Suspense fallback={<div className="grid h-40 place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>}>
      <GoodsManager />
    </Suspense>
  );
}
