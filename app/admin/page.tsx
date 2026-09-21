"use client";

import Link from "next/link";
import { useAdminStats } from "./api";
import { useMessages } from "@/i18n/messages/use-messages";
import { fa } from "@/lib/format";
import {
  Package,
  AlertCircle,
  UserPlus,
  Store,
  ClipboardList,
  Tag,
  Users,
  ListOrdered,
  ListTree,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/*
 * نمای کلی ادمین — شمارنده‌های زنده. دو کارت کهربایی صف باغبانی‌اند:
 * کالاهای در انتظار و برندهای در انتظار — هرچه کاربران ثبت کرده‌اند و
 * منتظر تایید/ادغام/حذفِ ادمین‌اند.
 */

export default function AdminOverviewPage() {
  const m = useMessages();
  const { data: s, isLoading } = useAdminStats();

  const cards: {
    key: keyof NonNullable<typeof s>;
    label: string;
    icon: LucideIcon;
    href?: string;
    alert?: boolean;
  }[] = [
    { key: "provisional", label: m.admin.stats.provisional, icon: AlertCircle, href: "/admin/goods?status=PROVISIONAL", alert: true },
    { key: "pendingBrands", label: m.admin.stats.pendingBrands, icon: AlertTriangle, href: "/admin/brands?status=PROVISIONAL", alert: true },
    { key: "goods", label: m.admin.stats.goods, icon: Package, href: "/admin/goods" },
    { key: "brands", label: m.admin.stats.brands, icon: Tag, href: "/admin/brands" },
    { key: "categories", label: m.admin.stats.categories, icon: ListTree, href: "/admin/categories" },
    { key: "userGoods", label: m.admin.stats.userGoods, icon: UserPlus, href: "/admin/goods?creator=USER" },
    { key: "listings", label: m.admin.stats.listings, icon: ListOrdered },
    { key: "buyListings", label: m.admin.stats.buyListings, icon: ClipboardList },
    { key: "businesses", label: m.admin.stats.businesses, icon: Store },
    { key: "users", label: m.admin.stats.users, icon: Users },
  ];

  return (
    <div className="animate-fade-up">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
            ))
          : cards.map((c) => {
              const body = (
                <>
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid size-9 place-items-center rounded-xl ${
                        c.alert ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <c.icon className="size-4.5" strokeWidth={1.75} />
                    </span>
                    {c.href && <ChevronLeft className="size-4 text-muted-foreground/50" />}
                  </div>
                  <p className="mt-3 text-2xl font-black tabular-nums">{fa(s?.[c.key] ?? 0)}</p>
                  <p className="mt-0.5 truncate text-xs font-bold text-muted-foreground">{c.label}</p>
                </>
              );
              const cls = `rounded-2xl border bg-white p-4 shadow-sm ${
                c.alert ? "ring-1 ring-amber-200" : ""
              } transition hover:shadow-md`;
              return c.href ? (
                <Link key={c.key} href={c.href} className={cls}>
                  {body}
                </Link>
              ) : (
                <div key={c.key} className={cls}>
                  {body}
                </div>
              );
            })}
      </div>
    </div>
  );
}
