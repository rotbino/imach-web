"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar, SectionTitle } from "@/app/components/chrome";
import { NoBusinessState } from "@/app/components/no-business";
import { fa } from "@/lib/format";
import { useFollowToggle, useSuppliersDirectory } from "@/lib/queries";
import type { DirectoryGoodChipDto, FollowedSupplierDto, RelatedSupplierDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck, Building2, Info, Loader2, MapPin, Store } from "lucide-react";

/*
 * تأمین‌کنندگان — دستیار خرید (فاز ۷ · طرح ۱۰)
 * فقط دو حالت — بدون دایرکتوری کل بازار:
 *   • «مرتبط با من» → موتور تطبیق روی کالاهای لیست من (WatchedGood ∪ BUY)،
 *     گروه‌بندی‌شده بر حسب فروشنده با چیپ کالاهای مرتبط
 *   • «دنبال‌شده» → شبکه‌ی فعلی من؛ mine + «خودش آمد» (theirs)
 * هر ردیف: چیپ کالاها + «از او خریده‌ام» (استعلام پاسخ‌داده) +
 * «N قیمت از این فروشنده در تابلوهای شماست» + دنبال‌کردن/کاتالوک.
 * ابزار لینک دعوت (قبلاً این‌جا) به پروفایل رفت — طبق نقشه‌ی طرح.
 */

// پالت آواتار — همان سیستم ۶رنگی فاز ۵/۶
const AVATAR_COLORS = ["#7c3aed", "#0e7490", "#c2703a", "#16a34a", "#db2777", "#4f46e5"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function SuppliersPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "تأمین‌کنندگان | iMach";
    setArmActive("buy");
  }, []);

  useEffect(() => {
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
        <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
          <SuppliersTabs bizId={active.id} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

type TabKey = "RELATED" | "FOLLOWED";

function SuppliersTabs({ bizId }: { bizId: string }) {
  const dirQ = useSuppliersDirectory(bizId);
  const [tab, setTab] = useState<TabKey>("RELATED");

  if (dirQ.isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  if (dirQ.isError) {
    return (
      <p className="rounded-2xl border border-dashed bg-white/70 p-8 text-center text-sm text-muted-foreground">
        فهرست تأمین‌کنندگان در دسترس نیست — دوباره تلاش کنید.
      </p>
    );
  }

  const related = dirQ.data?.related ?? [];
  const followed = dirQ.data?.followed ?? [];

  return (
    <>
      {/* ═══ عنوان + hint (طرح ۱۰) ═══ */}
      <SectionTitle
        icon={<Building2 className="size-[18px] text-stone-800" strokeWidth={1.75} />}
        title="تأمین‌کنندگان"
        hint="مرتبط با لیست خرید شما"
      />

      {/* ═══ فقط دو حالت — سگمنت داخلی (طرح ۱۰) ═══ */}
      <div className="mb-3 flex gap-1 rounded-[11px] bg-stone-200/60 p-1">
        <button
          type="button"
          onClick={() => setTab("RELATED")}
          className={`h-[34px] flex-1 rounded-lg text-[12.5px] font-bold transition ${
            tab === "RELATED" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
          }`}
        >
          مرتبط با من <span className="text-[10.5px] font-normal opacity-75">({fa(related.length)})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("FOLLOWED")}
          className={`h-[34px] flex-1 rounded-lg text-[12.5px] font-bold transition ${
            tab === "FOLLOWED" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
          }`}
        >
          دنبال‌شده <span className="text-[10.5px] font-normal opacity-75">({fa(followed.length)})</span>
        </button>
      </div>

      {/* ═══ ردیف‌ها ═══ */}
      {tab === "RELATED" ? (
        related.length === 0 ? (
          <EmptyTab
            title="هنوز تأمین‌کننده‌ی مرتبطی ندارید."
            body="کالاهای لیست خریدتان را دنبال کنید تا iMach فروشنده‌های همان کالاها را این‌جا کنار هم بگذارد."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {related.map((r) => (
              <RelatedRow key={r.supplierId} row={r} bizId={bizId} />
            ))}
          </div>
        )
      ) : followed.length === 0 ? (
        <EmptyTab
          title="هنوز کسی را دنبال نمی‌کنید."
          body="از تب «مرتبط با من» یا تابلوی تأمین هر کالا، فروشنده‌ها را دنبال کنید تا قیمت‌هایشان همیشه پیش شما باشد."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {followed.map((f) => (
            <FollowedRow key={`${f.supplierId}:${f.origin}`} row={f} bizId={bizId} />
          ))}
        </div>
      )}

      {/* ═══ پرهیز از دایرکتوری — متن دقیق طرح ۱۰ ═══ */}
      <div className="mt-4 flex items-start gap-1.5 rounded-xl bg-stone-100/80 px-3 py-2.5 text-[10.5px] leading-[1.9] text-muted-foreground">
        <Info className="mt-[3px] size-[13px] shrink-0 text-stone-500" strokeWidth={1.8} />
        <p>
          این فهرست فقط فروشنده‌هایی را نشان می‌دهد که به کالاهای لیست شما مرتبط‌اند — دایرکتوری کامل بازار
          نیست. برای کاوش بیشتر، «پیشنهادها» را ببینید.
        </p>
      </div>
    </>
  );
}

// ─── چیپ کالا + برچسب‌های رابطه (طرح ۱۰: b-stone / b-green / b-muted) ───
function GoodChips({ goods, max = 3 }: { goods: DirectoryGoodChipDto[]; max?: number }) {
  const shown = goods.slice(0, max);
  const rest = goods.length - shown.length;
  return (
    <>
      {shown.map((g) => (
        <span key={g.goodId} className="rounded-full bg-stone-100 px-2.5 py-[3px] text-[10.5px] font-bold text-stone-600">
          {g.nameFa}
        </span>
      ))}
      {rest > 0 && (
        <span className="rounded-full bg-stone-100 px-2.5 py-[3px] text-[10.5px] font-bold text-stone-500">
          +{fa(rest)}
        </span>
      )}
    </>
  );
}

function RelationBadges({ boughtFrom, origin }: { boughtFrom: boolean; origin?: "mine" | "theirs" }) {
  return (
    <>
      {boughtFrom && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e9f7ee] px-2.5 py-[3px] text-[10.5px] font-bold text-[#16a34a]">
          خریده‌ام از او
        </span>
      )}
      {origin === "theirs" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-[3px] text-[10.5px] font-bold text-stone-500">
          خودش آمد
        </span>
      )}
    </>
  );
}

// ─── دکمه‌ی سمت‌چپ: «دنبال می‌کنم ✓» یا «دنبال کردن» (طرح ۱۰) ───
function FollowAction({ bizId, supplierId, name, followed }: { bizId: string; supplierId: string; name: string; followed: boolean }) {
  const { toast } = useToast();
  const followToggle = useFollowToggle();
  const [isFollowed, setIsFollowed] = useState(followed);

  const toggle = () => {
    const next = !isFollowed;
    setIsFollowed(next); // به‌روزرسانی خوش‌بینانه — خطا برگردد، برمی‌گردد
    followToggle.mutate(
      { businessId: bizId, supplierId, follow: next },
      {
        onSuccess: () => {
          toast({
            title: next ? `${name} دنبال شد` : "دنبال‌کردن برداشته شد",
            description: next ? "به‌روزرسانی کاتالوگش به شما می‌رسد." : undefined,
          });
        },
        onError: () => {
          setIsFollowed(!next);
          toast({ title: "دنبال‌کردن ناموفق بود", variant: "destructive" });
        },
      }
    );
  };

  if (isFollowed) {
    return (
      <span className="grid h-8 place-items-center rounded-[10px] bg-stone-800 px-2.5 text-[10.5px] font-bold text-white">
        دنبال می‌کنم ✓
      </span>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={followToggle.isPending}
      onClick={toggle}
      className="h-8 border-stone-300 bg-white px-3 text-[11.5px] font-bold text-stone-600 hover:bg-stone-50"
    >
      دنبال کردن
    </Button>
  );
}

function CatalogButton({ slug }: { slug: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      asChild
      className="h-8 border-stone-300 bg-white px-3 text-[11.5px] font-bold text-stone-700 hover:bg-stone-50"
    >
      <Link href={`/sell/${slug}`}>
        <Store className="size-3.5" strokeWidth={1.75} />
        کاتالوک
      </Link>
    </Button>
  );
}

// ─── ردیف تب «مرتبط با من» (طرح ۱۰) ───
function RelatedRow({ row, bizId }: { row: RelatedSupplierDto; bizId: string }) {
  return (
    <article className="animate-fade-up rounded-[14px] border border-stone-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl text-base font-bold text-white"
          style={{ background: avatarColor(row.name) }}
        >
          {row.name.replace("پخش ", "").slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-stone-800">
            <span className="truncate">{row.name}</span>
            {row.isVerified && <BadgeCheck className="size-[14px] shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <MapPin className="size-[11px]" strokeWidth={1.75} />
              {row.city || "—"}
            </span>
            {row.trade && <span>{row.trade}</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <GoodChips goods={row.goods} />
            <RelationBadges boughtFrom={row.boughtFrom} />
          </div>
          {row.priceCount > 0 && (
            <p className="mt-1.5 text-[11px] leading-[1.8] text-muted-foreground">
              {fa(row.priceCount)} قیمت از این فروشنده در تابلوهای شماست
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1.5">
          <FollowAction bizId={bizId} supplierId={row.supplierId} name={row.name} followed={row.followedByMe} />
          <CatalogButton slug={row.slug} />
        </div>
      </div>
    </article>
  );
}

// ─── ردیف تب «دنبال‌شده» (طرح ۱۰) ───
function FollowedRow({ row, bizId }: { row: FollowedSupplierDto; bizId: string }) {
  return (
    <article className="animate-fade-up rounded-[14px] border border-stone-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl text-base font-bold text-white"
          style={{ background: avatarColor(row.name) }}
        >
          {row.name.replace("پخش ", "").slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-stone-800">
            <span className="truncate">{row.name}</span>
            {row.isVerified && <BadgeCheck className="size-[14px] shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
            {row.viaRef && (
              <span className="rounded-full bg-stone-100 px-2 py-[1px] text-[10px] font-bold text-stone-500">با لینک</span>
            )}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <MapPin className="size-[11px]" strokeWidth={1.75} />
              {row.city || "—"}
            </span>
            {row.trade && <span>{row.trade}</span>}
          </p>
          {row.goods.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <GoodChips goods={row.goods} />
              <RelationBadges boughtFrom={row.boughtFrom} origin={row.origin} />
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <RelationBadges boughtFrom={row.boughtFrom} origin={row.origin} />
            </div>
          )}
          {row.priceCount > 0 && (
            <p className="mt-1.5 text-[11px] leading-[1.8] text-muted-foreground">
              {fa(row.priceCount)} قیمت از این فروشنده در تابلوهای شماست
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1.5">
          <FollowAction bizId={bizId} supplierId={row.supplierId} name={row.name} followed />
          <CatalogButton slug={row.slug} />
        </div>
      </div>
    </article>
  );
}

// ─── حالت خالی هر تب ───
function EmptyTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white/70 p-8 text-center">
      <p className="text-sm font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
