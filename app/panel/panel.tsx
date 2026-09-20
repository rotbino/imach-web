"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BusinessSummaryDto, GoodItemDto } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBizStore } from "@/lib/active-biz";
import { useDeleteListing, useEditBusiness, useMyBusinesses, useMyListings, useQuoteRequest } from "@/lib/queries";
import { activityTypeLabel, fa, frequencyLabel, money, unitLabel } from "@/lib/format";
import { AppFooter, AppHeader, ArmLinkCard, MobileTabBar, SectionTitle } from "@/app/components/chrome";
import { BoardSection, EmptyBox, InquiriesSection, OffersSection, SuggestionsSection } from "./manage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  Check,
  ChevronDown,
  Loader2,
  MoreVertical,
  Package,
  Plus,
  Radio,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACTIVITY_TYPES } from "@/lib/format";

/*
 * پنل — جای کار؛ ویترین عمومی هر بازو در /sell/{slug} و /buy/{slug} است.
 *
 * • نام کسب‌وکار در هدر پنل؛ مثل اینستاگرام با بیش از یک کسب‌وکار، از همین
 *   هدر جابه‌جا می‌شود (کسب‌وکار فعال = مقصد آیتم‌های نویگیشن).
 * • «کسب‌وکار جدید» پشت سه‌نقطه پنهان است. خروج از حساب به صفحه پروفایل
 *   منتقل شد — پنل فقط کارِ کسب‌وکار.
 * • سوییچر بازوها به نویگیشن منتقل شد؛ پس اینجا همه بخش‌ها پشت هم‌اند.
 */

export default function Panel() {
  const router = useRouter();
  const { status } = useAuthStore();

  const businessesQ = useMyBusinesses();
  const mine = businessesQ.data ?? [];

  const activeId = useActiveBizStore((s) => s.activeId);
  const active = mine.find((b) => b.id === activeId) ?? mine[0] ?? null;

  // مهمان → ویزارد شروع
  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed" || businessesQ.isLoading) {
    return (
      <>
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-8">
          {mine.length === 0 ? (
            <EmptyState onCreate={() => router.push("/start")} />
          ) : (
            // key={active.id}: با جابه‌جایی کسب‌وکار، همه بخش‌ها تازه می‌شوند
            <PanelBody key={active!.id} biz={active!} mine={mine} />
          )}
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}

// ─── بدنه پنل برای کسب‌وکار فعال ───

function PanelBody({ biz, mine }: { biz: BusinessSummaryDto; mine: BusinessSummaryDto[] }) {
  const router = useRouter();
  const many = mine.length > 1;
  const setActive = useActiveBizStore((s) => s.setActive);

  return (
    <div className="space-y-5">
      {/* ── هدر پنل: نام کسب‌وکار + دراپ‌داون + سه‌نقطه ── */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xl font-black text-primary">
              {biz.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex max-w-full items-center gap-1.5 rounded-lg text-start"
                  aria-label="تغییر کسب‌وکار"
                >
                  <span className="truncate text-lg font-extrabold leading-6">{biz.name}</span>
                  {many && <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
                </DropdownMenuTrigger>
                {many && (
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>کسب‌وکارهای من</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {mine.map((b) => (
                      <DropdownMenuItem key={b.id} onClick={() => setActive(b.id)} className="gap-2">
                        <span className="grid size-6 place-items-center rounded-md bg-primary/10 text-xs font-black text-primary">
                          {b.name.slice(0, 1)}
                        </span>
                        <span className="truncate">{b.name}</span>
                        {b.id === biz.id && <Check className="ms-auto size-4 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {biz.activityType && (
                  <Badge variant="outline" className="border-primary/25 bg-accent text-primary">
                    {activityTypeLabel(biz.activityType)}
                  </Badge>
                )}
                <span>{biz.city}</span>
              </div>
            </div>
          </div>

          {/* سه‌نقطه: کارهای کم‌تکرار — خروج به پروفایل منتقل شد */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="grid size-9 place-items-center rounded-xl border bg-white text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              aria-label="گزینه‌های بیشتر"
            >
              <MoreVertical className="size-4.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => router.push("/start")} className="gap-2">
                <Plus className="size-4 text-primary" />
                کسب‌وکار جدید
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── لینک اختصاصی بازوها — ابزار اشتراک ── */}
      <ArmLinkCard kind="sell" slug={biz.slug} bizName={biz.name} onView={() => window.location.assign(`/sell/${biz.slug}`)} />
      <ArmLinkCard kind="buy" slug={biz.slug} bizName={biz.name} onView={() => window.location.assign(`/buy/${biz.slug}`)} />

      {/* ── کالاهای من ── */}
      <ListingsSection bizId={biz.id} />

      {/* ── سمت فروش ── */}
      <SellSide biz={biz} />

      {/* ── سمت خرید ── */}
      <BuySide biz={biz} />

      {/* ── نوع فعالیت — اختیاری؛ هر وقت خواست ── */}
      <ActivityCard biz={biz} />
    </div>
  );
}

// ─── کالاهای من: لیست + حذف + کالای جدید + قیمت‌گیری ───

function ListingsSection({ bizId }: { bizId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const listingsQ = useMyListings(bizId);
  const deleteListing = useDeleteListing();
  const quoteRequest = useQuoteRequest();

  const [target, setTarget] = useState<GoodItemDto | null>(null);

  const listings = listingsQ.data ?? [];

  const remove = async () => {
    if (!target) return;
    try {
      await deleteListing.mutateAsync(target.id);
      toast({ title: "کالا حذف شد", description: target.good.name });
    } catch {
      toast({ title: "حذف ناموفق بود", variant: "destructive" });
    } finally {
      setTarget(null);
    }
  };

  const activateQuote = (l: GoodItemDto) => {
    quoteRequest.mutate(
      { listingId: l.id },
      {
        onSuccess: (res) =>
          toast({ title: "پیشنهاد قیمت رسید", description: `${fa(res.created)} تامین‌کننده برای «${l.good.name}» پیشنهاد دادند.` }),
        onError: (e) =>
          toast({ title: "قیمت‌گیری ناموفق بود", description: e instanceof ApiError ? e.message : "دوباره تلاش کنید", variant: "destructive" }),
      }
    );
  };

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <SectionTitle
        icon={<Package className="size-4.5 text-primary" />}
        title="کالاهای من"
        hint="کالاها هم در کاتالوگ فروش و هم در لیست خرید نمایان می‌شوند."
        action={
          <Button size="sm" onClick={() => router.push("/panel/new")}>
            <Plus className="size-4" />
            کالای جدید
          </Button>
        }
      />

      {listings.length === 0 && <EmptyBox text="هنوز کالایی ثبت نکرده‌اید — اولین کالای‌تان را اضافه کنید." />}

      <div className="space-y-2">
        {listings.map((l) => {
          const isSell = l.mode === "SELL" || l.mode === "BOTH";
          const isBuy = l.mode === "BUY" || l.mode === "BOTH";
          return (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary">
                {l.good.name.slice(0, 1)}
              </span>
              <div className="min-w-0 grow">
                <p className="truncate text-sm font-extrabold">{l.good.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  {isSell && l.price !== null && (
                    <Badge variant="outline" className="border-primary/25 bg-accent text-primary">
                      فروش · {money(l.price)}
                    </Badge>
                  )}
                  {isBuy && l.volume !== null && (
                    <Badge variant="outline">
                      خرید · {fa(l.volume)} {unitLabel(l.good.unit)} {frequencyLabel(l.frequency ?? "MONTHLY")}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isBuy && l.volume !== null && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => activateQuote(l)}
                    disabled={quoteRequest.isPending}
                    aria-label={`قیمت‌گیری ${l.good.name}`}
                    className="text-primary"
                  >
                    <Radio className="size-4" />
                    قیمت‌گیری
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setTarget(l)}
                  aria-label={`حذف ${l.good.name}`}
                  className="size-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* تایید حذف */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف «{target?.good.name}»؟</DialogTitle>
            <DialogDescription>
              این کالا از کاتالوگ فروش و لیست خرید شما حذف می‌شود. این کار برگشت‌پذیر نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTarget(null)}>
              انصراف
            </Button>
            <Button variant="destructive" onClick={() => void remove()} disabled={deleteListing.isPending}>
              {deleteListing.isPending && <Loader2 className="size-4 animate-spin" />}
              حذف کن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── سمت فروش: درخواست‌ها + خریدارهای پیشنهادی ───

function SellSide({ biz }: { biz: BusinessSummaryDto }) {
  const listingsQ = useMyListings(biz.id);
  const sellListings = (listingsQ.data ?? [])
    .filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.price !== null)
    .map((l) => ({ goodId: l.good.id, price: l.price }));

  return (
    <div className="space-y-5">
      <InquiriesSection bizId={biz.id} myCity={biz.city} sellListings={sellListings} />
      <SuggestionsSection bizId={biz.id} myCity={biz.city} />
    </div>
  );
}

// ─── سمت خرید: پیشنهادها + تابلوی قیمت ───

function BuySide({ biz }: { biz: BusinessSummaryDto }) {
  return (
    <div className="space-y-5">
      <OffersSection bizId={biz.id} myCity={biz.city} />
      <BoardSection bizId={biz.id} />
    </div>
  );
}

// ─── نوع فعالیت: ۱۰ گزینه؛ اختیاری، هر وقت خواست عوضش می‌کند ───

function ActivityCard({ biz }: { biz: BusinessSummaryDto }) {
  const { toast } = useToast();
  const edit = useEditBusiness();

  const setActivity = async (v: string) => {
    const value = v === "NONE" ? null : v;
    try {
      await edit.mutateAsync({ id: biz.id, activityType: value });
      toast({ title: value ? `نوع فعالیت: ${activityTypeLabel(value)}` : "نوع فعالیت حذف شد" });
    } catch {
      toast({ title: "ذخیره ناموفق بود", description: "دوباره تلاش کنید", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Briefcase className="size-4" />
        </span>
        <div>
          <p className="text-sm font-bold">نوع فعالیت</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {biz.activityType ? activityTypeLabel(biz.activityType) : "اختیاری — تولیدکننده، پخش‌کننده، خرده‌فروش و…"}
          </p>
        </div>
      </div>

      <Select value={biz.activityType ?? ""} onValueChange={(v) => void setActivity(v)}>
        <SelectTrigger className="w-full sm:w-48" aria-label="نوع فعالیت">
          <SelectValue placeholder="انتخاب کنید…" />
        </SelectTrigger>
        <SelectContent>
          {ACTIVITY_TYPES.map((a) => (
            <SelectItem key={a.key} value={a.key}>
              {a.fa}
            </SelectItem>
          ))}
          {biz.activityType && <SelectItem value="NONE">حذف انتخاب</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── حالت خالی: هنوز هیچ کسب‌وکاری نساخته ───

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white/60 p-10 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Plus className="size-7" />
      </span>
      <p className="mt-4 text-lg font-extrabold">کسب‌وکارتان را بسازید</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-7 text-muted-foreground">
        فقط نام و شهر — در کمتر از یک دقیقه. بازوهای خرید و فروش هر دو از همان اول در اختیار شماست.
      </p>
      <Button className="mt-5" onClick={onCreate}>
        ساخت کسب‌وکار
      </Button>
    </div>
  );
}
