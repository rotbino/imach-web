"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { ShareContent } from "@/app/components/share";
import { fa, timeAgo } from "@/lib/format";
import { useFollows, useFollowToggle, useMyBusinesses } from "@/lib/queries";
import type { FollowDto } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  BadgeCheck,
  Link2,
  Loader2,
  MapPin,
  Share2,
  Store,
  UsersRound,
  X,
} from "lucide-react";

/*
 * تامین من — برگه‌ی شبکه‌ی سمت خرید (خواسته‌ی کاربر؛ «فروشندگان من» نه،
 * «تامین‌کنندگان من» بلند — تب کوتاه «تامین من»):
 * • هر کس این‌جاست که کاتالوگش را دنبال کرده‌ام (می‌خواهم مشتری‌اش باشم)
 *   یا با لینک دستیار خرید من عضو شده و تامین‌کننده‌ام شده است.
 * • کاتالوگ هر تامین‌کننده یک کلیک فاصله دارد؛ حذف از لیست هم همین‌جاست.
 * • لینک دستیار خرید (با کد رفرال من) بالای صفحه است — ابزار جذب
 *   تامین‌کننده‌ی جدید.
 */

export default function SuppliersPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "تامین من | iMach";
    setArmActive("buy");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-stone-700" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <SuppliersBody />;
}

function SuppliersBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-lg font-extrabold">اول کسب‌وکارتان را بسازید</p>
            <p className="mt-2 text-sm text-muted-foreground">فقط نام و شهر — بقیه‌اش با ما.</p>
            <button
              onClick={() => (window.location.href = "/start")}
              className="mt-4 rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm"
            >
              ساخت کسب‌وکار
            </button>
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <SuppliersList bizId={active.id} slug={active.slug} name={active.name} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function SuppliersList({ bizId, slug, name }: { bizId: string; slug: string; name: string }) {
  const followsQ = useFollows(bizId);
  const suppliers = followsQ.data ?? [];

  return (
    <>
      {/* تیتر + شمارنده */}
      <div className="mb-4 flex items-center justify-between px-1">
        <h1 className="flex items-center gap-2 text-lg font-black">
          <span className="grid size-9 place-items-center rounded-xl bg-stone-800/10 text-stone-800">
            <UsersRound className="size-4.5" />
          </span>
          تامین‌کنندگان من
        </h1>
        {!followsQ.isLoading && <p className="text-xs text-muted-foreground">{fa(suppliers.length)} تامین‌کننده</p>}
      </div>

      {/* ابزار جذب تامین‌کننده — لینک دستیار خرید با کد رفرال من */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-extrabold">
          <Share2 className="size-4 text-stone-800" />
          لینک دستیار خرید «{name}»
        </p>
        <ShareContent kind="buy" slug={slug} bizName={name} />
        <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Link2 className="size-3" />
          هر ثبت‌نام از این لینک، خودکار تامین‌کننده‌ی شما می‌شود.
        </p>
      </section>

      {/* لیست تامین‌کننده‌ها */}
      <section className="mt-6">
        {followsQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-5 animate-spin text-stone-700" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
            <p className="text-sm font-bold">هنوز تامین‌کننده‌ای در شبکه‌تان نیست.</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
              در بازار فروشنده‌های مرتبط با نیازهایتان را پیدا کنید، یا لینک دستیار خریدتان را برایشان بفرستید.
            </p>
            <Link
              href="/market"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-stone-800 px-4 py-2 text-xs font-bold text-white shadow-sm"
            >
              <Store className="size-3.5" />
              رفتن به بازار فروشنده‌ها
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {suppliers.map((f) => (
              <SupplierRow key={f.supplierId} f={f} bizId={bizId} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function SupplierRow({ f, bizId }: { f: FollowDto; bizId: string }) {
  const followToggle = useFollowToggle();
  const [confirming, setConfirming] = useState(false);

  const remove = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    followToggle.mutate({ businessId: bizId, supplierId: f.supplierId, follow: false });
  };

  return (
    <div className="animate-fade-up rounded-2xl border bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-stone-800/10 text-base font-black text-stone-800">
          {f.supplier.name.slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <p className="flex items-center gap-1 truncate text-sm font-bold">
            {f.supplier.name}
            {f.supplier.isVerified && <BadgeCheck className="size-4 shrink-0 text-stone-700" aria-label="تاییدشده" />}
            {f.viaRef && (
              <Badge variant="outline" className="border-stone-300 bg-stone-100 px-1.5 text-[10px] text-stone-700">
                با لینک
              </Badge>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3" />
            {f.supplier.city} · در شبکه از {timeAgo(f.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/sell/${f.supplier.slug}`}
            className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold text-stone-800 transition hover:border-stone-400 hover:bg-stone-50"
          >
            <Store className="size-3.5" />
            کاتالوگ
          </Link>
          <button
            type="button"
            onClick={remove}
            disabled={followToggle.isPending}
            aria-label={`حذف ${f.supplier.name} از تامین‌کنندگان`}
            className={`grid size-8 place-items-center rounded-xl border transition ${
              confirming
                ? "border-red-200 bg-red-50 text-red-600"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {followToggle.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : confirming ? (
              <span className="text-[10px] font-black">حذف؟</span>
            ) : (
              <X className="size-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
