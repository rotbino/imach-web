"use client";

/*
 * فرم افزودن/ویرایش کالا — فاز ۳ (طرح ۰۴): «چیدمان مینیمال» + افشای تدریجی.
 *
 * قانون طراحی (خواسته‌ی کاربر): پیچیدگی فقط وقتی نشان داده شود که کاربر به آن
 * احتیاج دارد. پس برخلاف قبل، پنج حالت ورود (دستی/اسکنر/اکسل/مرجع/کپی) دیگر
 * با تب‌های پیش‌رو دیده نمی‌شوند — فرم ساده پیش‌فرض است و:
 *   • کالاوت کهربایی پایین فرم: «اسکنر بارکد / بارگذاری اکسل» (ورود سریعِ چندتایی)
 *   • ردیف آرام‌تر زیرش: «از فهرست کالاهای مرجع / کپی از کاتالوک هم‌صنف‌ها»
 * همه‌ی حالت‌ها همان جا در دسترس‌اند — فقط ساکت.
 *
 * ساختار صفحه مثل طرح ۰۴: ساب‌هدر بازگشت + عنوانِ «افزودن کالا» +
 * «به کاتالوگ «...»» — بدون تب‌بار و سوییچ؛ کاربر در جریانِ متمرکز است.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Library, Copy, ScanLine, FileSpreadsheet } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness, smartSwitchArm } from "@/lib/active-biz";
import { NoBusinessState } from "@/app/components/no-business";
import { ListingForm } from "@/app/components/listing-form";
import { CopyFromPeers, ReferencePicker } from "@/app/new/catalog-picker";
import { ImportSheet } from "@/app/new/import-sheet";
import { ScanEntry } from "@/app/new/scan-entry";
import { Loader2 } from "lucide-react";
import type { CatalogCategoryDto } from "@/lib/api";

type Mode = "solo" | "excel" | "ref" | "catalog" | "scan";

export default function NewListingPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[100dvh] place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <NewListingBody />
    </Suspense>
  );
}

function NewListingBody() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useAuthStore();
  const active = useActiveBusiness();
  const [mode, setMode] = useState<Mode>("solo");

  const arm = params.get("tab") === "buy" ? "buy" : "sell";

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return <div className="grid min-h-[100dvh] place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  if (!active) return <NoBusinessState variant="sell" />;

  // فاز ۹ — ناوبری به خانه‌های v18 (بازوی خرید /home · بازوی فروش /sell/catalog)
  const backHref = arm === "buy" ? "/home" : "/sell/catalog";
  const onDone = (kind: "sell" | "buy") => {
    smartSwitchArm(kind);
    router.push(kind === "sell" ? "/sell/catalog" : "/home");
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* ═══ ساب‌هدر طرح ۰۴ — بازگشت + «افزودن کالا» + «به کاتالوگ …» ═══ */}
      <header className="sticky top-0 z-20 flex h-[54px] items-center gap-2.5 border-b bg-white/92 px-3 backdrop-blur">
        <button
          type="button"
          aria-label="بازگشت"
          onClick={() => (mode !== "solo" ? setMode("solo") : router.push(backHref))}
          className="grid size-8.5 shrink-0 place-items-center rounded-[10px] text-stone-500 transition hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight">افزودن کالا</p>
          <p className="truncate text-[10.5px] font-normal leading-tight text-muted-foreground">
            به کاتالوگ «{active.name}»
          </p>
        </div>
      </header>

      {/* ═══ بدنه ═══ */}
      <main className={mode === "solo" ? "mx-auto w-full max-w-2xl px-4 py-4 sm:px-6" : "mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8"}>
        {mode === "solo" && (
          <div className="space-y-4">
            <ListingForm
              bizId={active.id}
              currency={active.currency}
              customCategories={active.customCategories ?? []}
              onSaved={onDone}
            />

            {/* کالاوت افشای تدریجی — دقیقا متن طرح ۰۴ */}
            <div className="flex gap-2.5 rounded-xl border border-[#f2dfba] bg-[#fdf3e3] px-3.5 py-3 text-[12px] leading-[1.9] text-[#8a5a10]">
              <ImageIcon className="mt-[3px] size-[17px] shrink-0 text-amber-600" />
              <p>
                برای افزودن سریع چند کالا، از{" "}
                <button type="button" onClick={() => setMode("scan")} className="font-bold underline decoration-amber-400 underline-offset-2">
                  «اسکنر بارکد»
                </button>{" "}
                یا{" "}
                <button type="button" onClick={() => setMode("excel")} className="font-bold underline decoration-amber-400 underline-offset-2">
                  «بارگذاری اکسل»
                </button>{" "}
                استفاده کنید — از همین صفحه در دسترس است.
              </p>
            </div>

            {/* راه‌های دیگر — آرام‌تر از کالاوت؛ ساکت ولی در دسترس */}
            <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 px-2 pb-2 text-center text-[11px] text-muted-foreground">
              <span>راه‌های دیگر:</span>
              <button
                type="button"
                onClick={() => setMode("ref")}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition hover:bg-accent/60 hover:text-primary"
              >
                <Library className="size-3" />
                از فهرست کالاهای مرجع
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => setMode("catalog")}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition hover:bg-accent/60 hover:text-primary"
              >
                <Copy className="size-3" />
                کپی از کاتالوک هم‌صنف‌ها
              </button>
            </p>
          </div>
        )}

        {mode === "excel" && (
          <ImportSheet bizId={active.id} arm={arm} onDone={onDone} />
        )}

        {mode === "ref" && (
          <ReferencePicker
            bizId={active.id}
            currency={active.currency ?? "IRR"}
            arm={arm}
            onDone={onDone}
            onSwitchToSolo={() => setMode("solo")}
          />
        )}

        {mode === "catalog" && (
          <CopyFromPeers
            bizId={active.id}
            arm={arm}
            onDone={onDone}
            onSwitchToSolo={() => setMode("solo")}
          />
        )}

        {mode === "scan" && (
          <ScanEntry
            bizId={active.id}
            currency={active.currency}
            arm={arm}
            onDone={onDone}
            onSwitchToForm={() => setMode("solo")}
          />
        )}
      </main>
    </div>
  );
}
