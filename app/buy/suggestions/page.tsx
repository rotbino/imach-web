"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MatchRing, MobileTabBar, SectionTitle } from "@/app/components/chrome";
import { NoBusinessState } from "@/app/components/no-business";
import { fa, fmtMoney, unitLabel } from "@/lib/format";
import { useFollowToggle, useSuggestions, useWatchGood } from "@/lib/queries";
import type { AlternativeGoodDto, BetterPriceDto, NewSupplierDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck, Info, Loader2, MapPin, Plus, Sparkles, Store } from "lucide-react";

/*
 * پیشنهدها — دستیار خرید (فاز ۷ · طرح ۱۱)
 * سه کارت، همه از موتور تطبیق و داده‌ی واقعی:
 *   • «قیمت بهتر» (کارت سبز) — ارزان‌تر از بهترین قیمتِ شبکه‌ی فعلی من
 *   • «تأمین‌کننده جدید» — با حلقه‌ی امتیاز تطبیق (MatchRing)
 *   • «جایگزین» — کالای هم‌دسته‌ی ارزان‌تر («مشابه برنج هاشمی»)
 * اکشن‌ها: افزودن به تابلو (فالو) · دنبال کردن · افزودن به لیست (واچ) · مشاهده.
 */

export default function SuggestionsPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "پیشنهدها | iMach";
    setArmActive("buy");
  }, []);

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow grid place-items-center py-32">
          <Loader2 className="size-6 animate-spin text-primary" />
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <SuggestionsBody />;
}

function SuggestionsBody() {
  const active = useActiveBusiness();

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <NoBusinessState variant="buy" />
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
        <div className="mx-auto max-w-2xl px-4 py-5 pb-24 sm:px-6 sm:pb-8">
          <SuggestionList bizId={active.id} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function SuggestionList({ bizId }: { bizId: string }) {
  const suggQ = useSuggestions(bizId);

  if (suggQ.isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  if (suggQ.isError) {
    return (
      <p className="rounded-2xl border border-dashed bg-white/70 p-8 text-center text-sm text-muted-foreground">
        پیشنهدها در دسترس نیستند — دوباره تلاش کنید.
      </p>
    );
  }

  const { betterPrices, newSuppliers, alternatives } = suggQ.data ?? {
    betterPrices: [],
    newSuppliers: [],
    alternatives: [],
  };
  const total = betterPrices.length + newSuppliers.length + alternatives.length;

  return (
    <>
      {/* ═══ عنوان + «N جدید» + زیرعنوان (طرح ۱۱) ═══ */}
      <SectionTitle
        icon={<Sparkles className="size-[18px] text-stone-800" strokeWidth={1.75} />}
        title="پیشنهدهای iMach"
        action={
          total > 0 ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-[3px] text-[10.5px] font-bold text-stone-600">
              {fa(total)} جدید
            </span>
          ) : undefined
        }
      />
      <p className="-mt-1 mb-3 text-[11.5px] leading-7 text-muted-foreground">
        بر اساس کالاهای لیست خرید و تابلوهای تأمین شما
      </p>

      {total === 0 ? (
        <div className="rounded-2xl border-[1.5px] border-dashed border-stone-300 bg-[#fdfcf9] px-4 py-6 text-center text-[12.5px] leading-9 text-muted-foreground">
          فعلاً پیشنهادی برایت نداریم.
          <br />
          وقتی کالایی به لیست خریدت اضافه کنی یا تابلوی تأمین بسازی،
          iMach قیمت‌های بهتر و تأمین‌کننده‌های تازه را همین‌جا پیشنهاد می‌دهد.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {betterPrices.map((b) => (
            <BetterPriceCard key={`bp:${b.listingId}`} row={b} bizId={bizId} />
          ))}
          {newSuppliers.map((n) => (
            <NewSupplierCard key={`ns:${n.supplier.id}`} row={n} bizId={bizId} />
          ))}
          {alternatives.map((a) => (
            <AlternativeCard key={`alt:${a.listingId}`} row={a} bizId={bizId} />
          ))}
        </div>
      )}

      {/* ═══ شفافیت — متن دقیق طرح ۱۱ ═══ */}
      <div className="mt-4 flex items-start gap-1.5 rounded-xl bg-stone-100/80 px-3 py-2.5 text-[10.5px] leading-[1.9] text-muted-foreground">
        <Info className="mt-[3px] size-[13px] shrink-0 text-stone-500" strokeWidth={1.8} />
        <p>پیشنهدها از موتور تطبیق iMach می‌آیند — هیچ‌کس با پرداخت پول در صدر این فهرست نمی‌نشیند.</p>
      </div>
    </>
  );
}

// ═══ کارت ۱: قیمت بهتر (طرح ۱۱ — کارت سبز) ═══
function BetterPriceCard({ row, bizId }: { row: BetterPriceDto; bizId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const followToggle = useFollowToggle();
  const [pending, setPending] = useState(false);

  const addToBoard = () => {
    setPending(true);
    followToggle.mutate(
      { businessId: bizId, supplierId: row.supplier.id, follow: true },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: ["market", "suggestions"] });
          void qc.invalidateQueries({ queryKey: ["market", "suppliersDirectory"] });
          toast({
            title: `${row.supplier.name} به تابلوی شما اضافه شد`,
            description: "قیمتش که عوض شود، اولین نفری هستید که می‌فهمید.",
          });
        },
        onError: () => toast({ title: "افزودن به تابلو ناموفق بود", variant: "destructive" }),
        onSettled: () => setPending(false),
      }
    );
  };

  return (
    <article className="rounded-[14px] border-[#b6dfc5] bg-gradient-to-b from-[#f4fcf6] to-white p-3.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-[#e9f7ee] px-2.5 py-[3px] text-[10.5px] font-bold text-[#16a34a]">قیمت بهتر</span>
        <span className="rounded-full bg-stone-100 px-2.5 py-[3px] text-[10.5px] font-bold text-stone-500">
          مطابق لیست شما
        </span>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-stone-800">{row.goodName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-[11px]" strokeWidth={1.75} />
            <span className="truncate">
              {row.supplier.name} · {row.supplier.city}
              {row.variantLabel ? ` · ${row.variantLabel}` : ""}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-[16.5px] font-extrabold text-[#16a34a]">{fmtMoney(row.priceMinor, row.currency)}</p>
          <p className="text-[11px] font-bold text-[#16a34a]">▼ {fa(row.pct)}٪ ارزان‌تر از تابلوی شما</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={addToBoard}
          className="h-9 flex-1 bg-stone-800 font-bold hover:bg-stone-900"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : "افزودن به تابلو"}
        </Button>
        <Button size="sm" variant="outline" asChild className="h-9 flex-1 border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-50">
          <Link href={`/sell/${row.supplier.slug}`}>مشاهده کاتالوک</Link>
        </Button>
      </div>
    </article>
  );
}

// ═══ کارت ۲: تأمین‌کننده جدید + امتیاز تطبیق (طرح ۱۱) ═══
function NewSupplierCard({ row, bizId }: { row: NewSupplierDto; bizId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const followToggle = useFollowToggle();
  const [pending, setPending] = useState(false);

  const doFollow = () => {
    setPending(true);
    followToggle.mutate(
      { businessId: bizId, supplierId: row.supplier.id, follow: true },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: ["market", "suggestions"] });
          void qc.invalidateQueries({ queryKey: ["market", "suppliersDirectory"] });
          toast({
            title: `${row.supplier.name} دنبال شد`,
            description: "به‌روزرسانی کاتالوگش به شما می‌رسد.",
          });
        },
        onError: () => toast({ title: "دنبال‌کردن ناموفق بود", variant: "destructive" }),
        onSettled: () => setPending(false),
      }
    );
  };

  const unit = unitLabel(row.unit);
  // جمله‌ی توضیحی از داده‌ی واقعی — حجم لیست من + حداقل سفارش او
  const volumeHint =
    row.myVolume && row.minOrder > 0
      ? `برای ${fa(row.myVolume)} ${unit}ِ ماهانه‌ی شما کافی است`
      : row.minOrder > 0
        ? `حداقل سفارش ${fa(row.minOrder)} ${unit}`
        : `فروشنده‌ی فعال همان کالا`;
  const proxHint =
    row.proximity === "same-city" ? "هم‌شهریِ شماست" : row.proximity === "same-province" ? "هم‌استان شماست" : "";

  return (
    <article className="rounded-[14px] border border-stone-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-[#e8f1fd] px-2.5 py-[3px] text-[10.5px] font-bold text-[#1d5fb8]">
          تأمین‌کننده جدید
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2.5">
        <MatchRing score={row.score} size={46} />
        <div className="min-w-0 grow">
          <p className="flex items-center gap-1.5 text-[14.5px] font-bold text-stone-800">
            <span className="truncate">{row.supplier.name}</span>
            {row.supplier.isVerified && <BadgeCheck className="size-[14px] shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-[11px]" strokeWidth={1.75} />
            <span className="truncate">
              {row.supplier.city} · برای «{row.goodName}» شما
            </span>
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-[15px] font-extrabold text-stone-800">{fmtMoney(row.priceMinor, row.currency)}</p>
        </div>
      </div>
      <p className="mt-2.5 rounded-[9px] bg-stone-100 px-2.5 py-2 text-[11px] leading-[1.8] text-stone-600">
        هم‌جنسِ {row.goodName} لیست شما را می‌فروشد — {volumeHint}
        {proxHint ? ` · ${proxHint}` : ""}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={doFollow}
          className="h-9 flex-1 border-stone-300 bg-white font-bold text-stone-600 hover:bg-stone-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : "دنبال کردن"}
        </Button>
        <Button size="sm" asChild className="h-9 flex-1 bg-stone-800 font-bold hover:bg-stone-900">
          <Link href={`/sell/${row.supplier.slug}`}>
            <Store className="size-4" strokeWidth={1.75} />
            مشاهده کاتالوک
          </Link>
        </Button>
      </div>
    </article>
  );
}

// ═══ کارت ۳: جایگزین (طرح ۱۱) ═══
function AlternativeCard({ row, bizId }: { row: AlternativeGoodDto; bizId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const watch = useWatchGood();
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const addToMyList = () => {
    setPending(true);
    watch.mutate(
      { businessId: bizId, goodId: row.goodId },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: ["market", "suggestions"] });
          toast({
            title: `«${row.goodName}» به لیست خرید شما اضافه شد`,
            description: "قیمت‌هایش را از این پس در لیست خرید می‌بینید.",
          });
        },
        onError: () => toast({ title: "افزودن ناموفق بود", variant: "destructive" }),
        onSettled: () => setPending(false),
      }
    );
  };

  const proxHint =
    row.proximity === "same-city" ? "هم‌شهری" : row.proximity === "same-province" ? "هم‌استان" : "";

  return (
    <article className="rounded-[14px] border border-stone-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-accent px-2.5 py-[3px] text-[10.5px] font-bold text-primary">جایگزین</span>
        <span className="rounded-full bg-stone-100 px-2.5 py-[3px] text-[10.5px] font-bold text-stone-500">
          مشابه {row.watchedGoodName}
        </span>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14.5px] font-bold text-stone-800">
            {row.goodName}
            {row.variantLabel ? <span className="font-normal text-stone-500"> — {row.variantLabel}</span> : null}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-[11px]" strokeWidth={1.75} />
            <span className="truncate">
              {row.supplier.name} · {row.supplier.city}
              {proxHint ? ` · ${proxHint}` : ""}
            </span>
          </p>
        </div>
        <p className="shrink-0 text-[15px] font-extrabold text-stone-800">{fmtMoney(row.priceMinor, row.currency)}</p>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={addToMyList}
          className="h-9 flex-1 gap-1 border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" strokeWidth={2.2} />}
          افزودن به لیست
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/sell/${row.supplier.slug}/${row.listingId}`)}
          className="h-9 flex-1 border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-50"
        >
          مشاهده
        </Button>
      </div>
    </article>
  );
}
