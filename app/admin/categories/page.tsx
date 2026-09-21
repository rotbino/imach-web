"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdminCategories, type AdminCategoryNodeDto } from "../api";
import { useMessages } from "@/i18n/messages/use-messages";
import { fa, categoryName } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ListTree, Search, ChevronDown, ChevronLeft } from "lucide-react";

/*
 * درخت دسته‌بندی‌ها — زیرِ «اطلاعات پایه». هر گره شمارش کالای مستقیم و
 * مجموع زیردرخت را نشان می‌دهد؛ لمس نام دسته، لیست کالاهای همان دسته را در
 * کالاها باز می‌کند (?categoryId=). جستجو، مسیرِ تا گره را خودکار باز می‌کند.
 */

export default function AdminCategoriesPage() {
  const m = useMessages();
  const { data: tree, isLoading } = useAdminCategories();

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  // مسیرِ گره‌ها — برای باز شدن خودکار والدین هنگام جستجو
  const pathsById = useMemo(() => {
    const paths = new Map<string, string[]>();
    const walk = (nodes: AdminCategoryNodeDto[], trail: string[]) => {
      for (const n of nodes) {
        paths.set(n.id, [...trail, n.id]);
        walk(n.children, [...trail, n.id]);
      }
    };
    walk(tree ?? [], []);
    return paths;
  }, [tree]);

  const matches = useMemo(() => {
    const needle = q.trim();
    if (!needle) return null;
    const hit = new Set<string>();
    const walk = (nodes: AdminCategoryNodeDto[]) => {
      for (const n of nodes) {
        const inName =
          n.nameFa.includes(needle) ||
          n.nameEn.toLowerCase().includes(needle.toLowerCase()) ||
          n.slug.includes(needle);
        if (inName) {
          hit.add(n.id);
          for (const id of pathsById.get(n.id) ?? []) hit.add(id); // والدین هم باز بمانند
        }
        walk(n.children);
      }
    };
    walk(tree ?? []);
    return hit;
  }, [q, tree, pathsById]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const Node = ({ node, depth }: { node: AdminCategoryNodeDto; depth: number }) => {
    const expanded = matches ? true : openIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const childNodes = matches ? node.children.filter((c) => matches.has(c.id)) : node.children;

    return (
      <div>
        <div
          className="group flex items-center gap-2 rounded-xl py-2 pe-2 transition-colors hover:bg-accent/40"
          style={{ paddingInlineStart: `${depth * 18 + 4}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={expanded ? "collapse" : "expand"}
              onClick={() => toggle(node.id)}
              className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground/70 hover:bg-stone-100"
            >
              <ChevronDown className={`size-4 transition-transform ${expanded ? "" : "-rotate-90"}`} />
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          )}

          <Link href={`/admin/goods?categoryId=${node.id}`} className="flex min-w-0 grow items-center gap-2">
            <span className={`truncate text-sm ${depth === 0 ? "font-black" : "font-bold"}`}>
              {categoryName(node)}
            </span>
            <span dir="ltr" className="hidden shrink-0 text-[10px] text-muted-foreground/50 sm:inline">
              {node.slug}
            </span>
            <span className="ms-auto flex shrink-0 items-center gap-1.5">
              {node.direct > 0 && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 tabular-nums">
                  {fa(node.direct)}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                  node.total > 0 ? "bg-primary/10 text-primary" : "bg-stone-50 text-muted-foreground/40"
                }`}
              >
                {fa(node.total)}
              </span>
              <ChevronLeft className="size-3.5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
            </span>
          </Link>
        </div>

        {hasChildren && expanded && (
          <div className="relative">
            <span
              className="absolute top-0 bottom-2 w-px bg-stone-200"
              style={{ insetInlineStart: `${depth * 18 + 15}px` }}
            />
            {childNodes.map((c) => (
              <Node key={c.id} node={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-up">
      {/* جستجو + جمع کردن همه */}
      <div className="flex items-center gap-2">
        <div className="relative grow">
          <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={m.admin.categories.searchPlaceholder}
            className="h-10 rounded-xl bg-white pe-9"
          />
        </div>
        <Button
          variant="outline"
          className="h-10 shrink-0 rounded-xl px-3 text-xs font-bold"
          onClick={() => setOpenIds(new Set())}
        >
          {m.admin.categories.collapseAll}
        </Button>
      </div>

      <p className="mt-2 px-1 text-[11px] font-bold text-muted-foreground">
        {m.admin.categories.hint}
      </p>

      <div className="mt-3 rounded-3xl border bg-white p-3 shadow-sm">
        {isLoading && (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && (tree ?? []).length === 0 && (
          <div className="p-10 text-center">
            <ListTree className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-bold text-muted-foreground">{m.admin.empty}</p>
          </div>
        )}

        {!isLoading &&
          (tree ?? [])
            .filter((r) => (matches ? matches.has(r.id) : true))
            .map((r) => <Node key={r.id} node={r} depth={0} />)}
      </div>
    </div>
  );
}
