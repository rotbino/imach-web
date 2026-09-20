"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BusinessSummaryDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useEditBusiness, useMyBusinesses } from "@/lib/queries";
import { AppFooter, AppHeader, ArmBadges, ArmLinkCard } from "@/app/components/chrome";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Check,
  ChevronDown,
  LogOut,
  MoreVertical,
  Plus,
  ShoppingBasket,
  Store,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

/*
 * پنل — مدیریت بازوها
 *
 * • نام کسب‌وکار در هدر پنل نوشته شده؛ مثل اینستاگرام با بیش از یک
 *   کسب‌وکار، از همین هدر به‌صورت دراپ‌داون جابه‌جا می‌شود.
 * • «کسب‌وکار جدید» پشت سه‌نقطه پنهان است — نه جلوی چشم؛ چون ۹۰٪
 *   افراد فقط یک کسب‌وکار دارند.
 * • سوییچر بازوها دو دکمه‌ای است، دقیقا مثل سوییچر ورود/ثبت‌نام.
 * • بازویی که هنوز فعال نشده همین‌جا با یک دکمه فعال می‌شود.
 */

type Arm = "sell" | "buy";

export default function Panel() {
  const router = useRouter();
  const { status, logout } = useAuthStore();

  const businessesQ = useMyBusinesses();
  const mine = businessesQ.data ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);
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
            active && (
              // key={active.id}: با جابه‌جایی کسب‌وکار، سوییچر بازو هم ریست می‌شود
              <PanelBody
                key={active.id}
                biz={active}
                mine={mine}
                onPick={setActiveId}
                onLogout={() => void logout()}
              />
            )
          )}
        </div>
      </main>
      <AppFooter />
    </>
  );
}

// ─── بدنه پنل برای یک کسب‌وکار فعال ───

function PanelBody({
  biz,
  mine,
  onPick,
  onLogout,
}: {
  biz: BusinessSummaryDto;
  mine: BusinessSummaryDto[];
  onPick: (id: string) => void;
  onLogout: () => void;
}) {
  const router = useRouter();
  const many = mine.length > 1;

  // سوییچر با اولین بازوی موجودِ این کسب‌وکار شروع می‌شود
  const [arm, setArm] = useState<Arm>(biz.sells ? "sell" : "buy");

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
                      <DropdownMenuItem key={b.id} onClick={() => onPick(b.id)} className="gap-2">
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
                <ArmBadges sells={biz.sells} buys={biz.buys} />
                <span>{biz.city}</span>
              </div>
            </div>
          </div>

          {/* سه‌نقطه: کارهای کم‌تکرار اینجا پنهان‌اند */}
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive">
                <LogOut className="size-4" />
                خروج از حساب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── سوییچر دو دکمه‌ای بازوها — مثل سوییچر ورود/ثبت‌نام ── */}
      <Tabs value={arm} onValueChange={(v) => setArm(v as Arm)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sell" className="gap-1.5">
            <Store className="size-4" />
            بازوی فروش
          </TabsTrigger>
          <TabsTrigger value="buy" className="gap-1.5">
            <ShoppingBasket className="size-4" />
            بازوی خرید
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sell" className="mt-4">
          {biz.sells ? (
            <ArmSection biz={biz} kind="sell" />
          ) : (
            <EnableArm biz={biz} kind="sell" />
          )}
        </TabsContent>

        <TabsContent value="buy" className="mt-4">
          {biz.buys ? (
            <ArmSection biz={biz} kind="buy" />
          ) : (
            <EnableArm biz={biz} kind="buy" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── محتوای یک بازوی فعال: لینک اختصاصی + مدیریت ───

function ArmSection({ biz, kind }: { biz: BusinessSummaryDto; kind: Arm }) {
  const router = useRouter();
  const isSell = kind === "sell";
  return (
    <div className="space-y-4">
      <ArmLinkCard kind={kind} slug={biz.slug} bizName={biz.name} onView={() => router.push(`/${kind}/${biz.slug}`)} />
      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push(`/${kind}/${biz.slug}`)}
      >
        {isSell ? "مشاهده و مدیریت بازوی فروش" : "مشاهده و مدیریت بازوی خرید"}
      </Button>
    </div>
  );
}

// ─── بازویی که هنوز فعال نشده — همین‌جا با یک تیک فعال می‌شود ───

function EnableArm({ biz, kind }: { biz: BusinessSummaryDto; kind: Arm }) {
  const { toast } = useToast();
  const edit = useEditBusiness();
  const isSell = kind === "sell";
  const Icon = isSell ? Store : ShoppingBasket;

  const enable = async () => {
    try {
      await edit.mutateAsync({ id: biz.id, ...(isSell ? { sells: true } : { buys: true }) });
      toast({ title: isSell ? "بازوی فروش فعال شد" : "بازوی خرید فعال شد" });
    } catch {
      toast({ title: "فعال‌سازی ناموفق بود", description: "دوباره تلاش کنید", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-2xl border border-dashed bg-white/60 p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <p className="mt-3 text-sm font-extrabold">
        {isSell ? "هنوز بازوی فروش ندارید" : "هنوز بازوی خرید ندارید"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
        {isSell
          ? "با فعال‌سازی، کاتالوگ فروش عمده می‌سازید و خریدارها کالاهایتان را می‌بینند."
          : "با فعال‌سازی، لیست نیازهای خریدتان ساخته می‌شود و تامین‌کننده‌ها پیشنهاد می‌دهند."}
      </p>
      <Button className="mt-4" onClick={() => void enable()} disabled={edit.isPending}>
        {edit.isPending && <Loader2 className="size-4 animate-spin" />}
        فعال‌سازی {isSell ? "بازوی فروش" : "بازوی خرید"}
      </Button>
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
        با نام، شهر و نقش خود در بازار عمده — در کمتر از یک دقیقه.
      </p>
      <Button className="mt-5" onClick={onCreate}>
        ساخت کسب‌وکار
      </Button>
    </div>
  );
}
