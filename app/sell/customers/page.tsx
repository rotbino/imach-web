"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { NoBusinessState } from "@/app/components/no-business";
import { ShareContent } from "@/app/components/share";
import { fa, frequencyLabel, goodName, timeAgo, unitLabel } from "@/lib/format";
import { useMyBusinesses, useMyFollowers, useRemoveFollower } from "@/lib/queries";
import type { CustomerRowDto } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  BadgeCheck,
  Link2,
  Loader2,
  MapPin,
  Share2,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";

/*
 * مشتریان من — برگه‌ی شبکه‌ی سمت فروش (خواسته‌ی کاربر):
 * • مشتری = خریداری که کاتالوگ من را دنبال کرده، یا با لینک دعوت/کاتالوگ من
 *   عضو شده (فالوی خودکار ثبت‌نامی — قابل حذف از همین لیست).
 * • مشتریِ درخواست‌دار بالا می‌آید: آخرین درخواست خرید فعالِ هر مشتری
 *   با یک کلیک باز می‌شود.
 * • لینک اشتراک کاتالوگ (با کد رفرال من) بالای صفحه است — ابزار تشویق به
 *   ساختن همین لیست.
 */

export default function CustomersPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "مشتریان من | iMach";
    setArmActive("sell");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <CustomersBody />;
}

function CustomersBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!active) return <NoBusinessState variant="sell" />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <CustomersList bizId={active.id} slug={active.slug} name={active.name} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function CustomersList({ bizId, slug, name }: { bizId: string; slug: string; name: string }) {
  const customersQ = useMyFollowers(bizId);
  const customers = customersQ.data ?? [];
  const withRequest = customers.filter((c) => c.latestRequest).length;

  return (
    <>
      {/* تیتر + شمارنده */}
      <div className="mb-4 flex items-center justify-between px-1">
        <h1 className="flex items-center gap-2 text-lg font-black">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-4.5" />
          </span>
          مشتریان من
        </h1>
        {!customersQ.isLoading && (
          <p className="text-xs text-muted-foreground">
            {fa(customers.length)} مشتری
            {withRequest > 0 && <span className="text-primary"> · {fa(withRequest)} درخواست فعال</span>}
          </p>
        )}
      </div>

      {/* ابزار رشد لیست — لینک کاتالوگ با کد رفرال من */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-extrabold">
          <Share2 className="size-4 text-primary" />
          لینک کاتالوگ «{name}»
        </p>
        <ShareContent kind="sell" slug={slug} bizName={name} />
        <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Link2 className="size-3" />
          هر ثبت‌نام از این لینک، خودکار مشتری شما می‌شود.
        </p>
      </section>

      {/* لیست مشتری‌ها — درخواست‌دارها بالا */}
      <section className="mt-6">
        {customersQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
            <p className="text-sm font-bold">هنوز مشتری‌ای در لیستتان نیست.</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
              لینک کاتالوگ را برای مشتری‌های فعلی‌تان بفرستید؛ عضویت هرکدام از لینک شما، این‌جا سبز می‌شود.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {customers.map((c) => (
              <CustomerRow key={c.id} c={c} bizId={bizId} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function CustomerRow({ c, bizId }: { c: CustomerRowDto; bizId: string }) {
  const router = useRouter();
  const removeFollower = useRemoveFollower();
  const [confirming, setConfirming] = useState(false);

  const remove = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    removeFollower.mutate({ businessId: bizId, followerBusinessId: c.id });
  };

  return (
    <div className="animate-fade-up rounded-2xl border bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary">
          {c.name.slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <p className="flex items-center gap-1 truncate text-sm font-bold">
            {c.name}
            {c.isVerified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="تاییدشده" />}
            {c.viaRef && (
              <Badge variant="outline" className="border-primary/30 bg-accent px-1.5 text-[10px] text-primary">
                با لینک
              </Badge>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3" />
            {c.city} · مشتری از {timeAgo(c.followedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={removeFollower.isPending}
          aria-label={`حذف ${c.name} از مشتریان`}
          className={`grid size-8 shrink-0 place-items-center rounded-xl border transition ${
            confirming
              ? "border-red-200 bg-red-50 text-red-600"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {removeFollower.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : confirming ? (
            <span className="text-[10px] font-black">حذف؟</span>
          ) : (
            <X className="size-3.5" />
          )}
        </button>
      </div>

      {/* آخرین درخواست خرید فعال — بالا آمدن مشتریِ درخواست‌دار (خواسته‌ی کاربر) */}
      {c.latestRequest && (
        <button
          type="button"
          onClick={() => router.push(`/buy/${c.slug}`)}
          className="mt-2.5 flex w-full items-center gap-2 rounded-xl border border-primary/25 bg-accent/60 px-3 py-2 text-start transition hover:border-primary/50"
        >
          <ShoppingCart className="size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 grow truncate text-xs font-bold text-foreground">
            {goodName(c.latestRequest.good)}
            <span className="ms-1.5 font-medium text-muted-foreground">
              {fa(c.latestRequest.volume)} {unitLabel(c.latestRequest.good.unit)}
              {c.latestRequest.frequency && ` · ${frequencyLabel(c.latestRequest.frequency)}`}
            </span>
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {timeAgo(c.latestRequest.updatedAt)}
          </span>
        </button>
      )}
    </div>
  );
}
