"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import {
  useBusinessProfile,
  useFollows,
  useFollowToggle,
  useGoods,
  useIncomingInquiries,
  useMyListings,
  useSaveListing,
  useSetListingActive,
  useSupplyBoard,
  useViewListing,
  useWatchGood,
  useWatchedGoods,
} from "@/lib/queries";
import type { GoodItemDto, InquiryDto } from "@/lib/api";
import {
  CURRENCIES,
  activityTypeLabel,
  categoryName,
  currencyLabel,
  fa,
  fmtMoney,
  goodName,
  unitLabel,
} from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { ContactButton } from "@/app/components/contact-gate";
import { ShareDialog } from "@/app/components/share";
import { ProductSettingsDialog } from "@/app/sell/product-settings";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Boxes,
  ChevronRight,
  CirclePause,
  Inbox,
  PackageX,
  PencilLine,
  PlayCircle,
  Share2,
  Tag,
} from "lucide-react";

/*
 * صفحه‌ی جزئیات کالا — فاز ۲ (طرح ۰۲ دید خریدار + ۰۳ دید مالک):
 * • یک روت، دو دید: مالکِ واقعی پنل مدیریت + عملکرد + درخواست‌های مرتبط
 *   می‌بیند؛ بقیه نمای عمومی (قیمت/مشخصات/فروشنده/تماس) می‌بینند.
 * • شمارش بازدید (شکاف ۳): مهمان/غیرمالک یک‌بار در نشست → POST view.
 * • «دنبال کردن قیمت» و «درخواست قیمت» و تیزر تابلوی تأمین طبق فازبندی
 *   در فاز ۵/۶ به همین صفحه اضافه می‌شوند — اسلات‌شان در نوار اکشن آماده است.
 * • تغییر سریع قیمت/موجودی: دیالوگ کوچک NumberInput؛ پیلوَد کامل
 *   (برند/ویژگی/خرید BOTH) مثل دیالوگ تنظیمات بازفرست می‌شود تا چیزی
 *   پاک نشود — چون saveListing همه‌ی فیلدها را بازمی‌نویسد.
 */

export default function ProductDetail({ slug, listingId }: { slug: string; listingId: string }) {
  const router = useRouter();
  const { status, businesses: storeBizs } = useAuthStore();
  const profileQ = useBusinessProfile(slug);
  const biz = profileQ.data;

  // مالکِ واقعی این کاتالوگ؟ (ادمین پنل مدیریت نمی‌بیند — کسب‌وکارِ خودش را ندارد)
  const myBiz = storeBizs.find((b) => b.slug === slug) ?? null;
  const isOwner = !!myBiz;

  // داده‌ی مالک: شمارش بازدید + وضعیت + همه‌ی ردیف‌ها (برای «پر بازدید»)
  const myListingsQ = useMyListings(isOwner ? myBiz!.id : null, { includeInactive: true });
  const inquiriesQ = useIncomingInquiries(isOwner ? myBiz!.id : null);

  const publicListing =
    biz?.listings.find(
      (l) => l.id === listingId && (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null
    ) ?? null;
  const ownerListing =
    isOwner && myListingsQ.data
      ? myListingsQ.data.find((l) => l.id === listingId && (l.mode === "SELL" || l.mode === "BOTH")) ?? null
      : null;
  const listing = ownerListing ?? publicListing;

  const name = listing ? goodName(listing.good) : "";

  useEffect(() => {
    document.title = listing ? `${name} | iMach` : "iMach";
  }, [listing, name]);

  // ── شمارش بازدید (شکاف ۳) — یک‌بار در هر نشست، فقط غیرمالک ──
  const viewM = useViewListing();
  useEffect(() => {
    if (!biz || isOwner || !publicListing) return;
    const key = `imach:view:${listingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* حالت خصوصی مرورگر — بی‌خیال ددوپ */
    }
    viewM.mutate(listingId, { onError: () => undefined });
  }, [biz, isOwner, publicListing, listingId]);

  const [shareOpen, setShareOpen] = useState(false);
  const [quickKind, setQuickKind] = useState<"price" | "stock" | null>(null);
  const [fullOpen, setFullOpen] = useState(false);

  const backHref = isOwner ? "/sell" : `/sell/${slug}`;

  if (profileQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="grid place-items-center py-32 text-center">
          <PackageX className="size-6 animate-pulse text-stone-300" />
          <p className="mt-2 text-xs text-muted-foreground">در حال بارگذاری…</p>
        </div>
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <PackageX className="mx-auto size-8 text-stone-300" />
          <p className="mt-2 text-lg font-bold">این کاتالوگ پیدا نشد</p>
          <p className="mt-2 text-sm text-muted-foreground">ممکن است آدرس اشتباه باشد.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            iMach
          </Button>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col">
        <SubHeader title="کالا" sub={`کاتالوگ «${biz.name}»`} onBack={() => router.push(backHref)} />
        <div className="grid grow place-items-center px-4 text-center">
          <div>
            <PackageX className="mx-auto size-8 text-stone-300" />
            <p className="mt-2 text-lg font-bold">این کالا پیدا نشد</p>
            <p className="mt-2 text-sm text-muted-foreground">
              ممکن است حذف شده باشد یا دیگر فعال نباشد.
            </p>
            <Button className="mt-4" onClick={() => router.push(backHref)}>
              بازگشت به کاتالوگ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const unit = unitLabel(listing.good.unit);
  const inactive = listing.isActive === false;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-accent/40 via-white to-white">
      {/* ═══ هدر جزئیات — بازگشت + نام + وضعیت + اشتراک ═══ */}
      <SubHeader
        title={name}
        sub={isOwner ? `در کاتالوگ من · ${biz.city ?? ""}`.trim() : `کاتالوگ «${biz.name}»`}
        onBack={() => router.push(backHref)}
        right={
          isOwner ? (
            <span
              className={`me-auto rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                inactive ? "bg-stone-100 text-stone-500" : "bg-green-100/70 text-green-700"
              }`}
            >
              {inactive ? "غیرفعال" : "فعال"}
            </span>
          ) : undefined
        }
        share={<ShareButton onClick={() => setShareOpen(true)} />}
      />

      {isOwner ? (
        <OwnerView
          listing={listing}
          bizId={myBiz!.id}
          currency={biz.currency ?? myBiz!.currency ?? "IRR"}
          allSell={myListingsQ.data ?? []}
          inquiries={inquiriesQ.data?.items ?? []}
          unit={unit}
          inactive={inactive}
          onQuick={(k) => setQuickKind(k)}
          onFull={() => setFullOpen(true)}
        />
      ) : (
        <PublicView
          listing={listing}
          biz={{
            id: biz.id,
            slug: biz.slug,
            name: biz.name,
            city: biz.city,
            activityType: biz.activityType,
            isVerified: biz.isVerified,
            logo: biz.logo ?? null,
          }}
          unit={unit}
          authed={status === "authed"}
          myBizId={storeBizs[0]?.id ?? null}
        />
      )}

      {/* دیالوگ‌های ویرایش */}
      {quickKind && (
        <QuickEditDialog
          listing={listing}
          bizId={isOwner ? myBiz!.id : ""}
          currency={biz.currency ?? myBiz!.currency ?? "IRR"}
          kind={quickKind}
          open
          onOpenChange={(o) => !o && setQuickKind(null)}
        />
      )}
      {fullOpen && isOwner && (
        <ProductSettingsDialog
          listing={listing}
          bizId={myBiz!.id}
          currency={biz.currency ?? myBiz!.currency ?? "IRR"}
          open
          onOpenChange={(o) => !o && setFullOpen(false)}
        />
      )}
      <ShareDialog kind="sell" slug={slug} bizName={biz.name} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}

// ─── هدر جزئیات با دکمه بازگشت ───
function SubHeader({
  title,
  sub,
  onBack,
  right,
  share,
}: {
  title: string;
  sub: string;
  onBack: () => void;
  right?: React.ReactNode;
  share?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2.5 border-b bg-white/95 px-3 backdrop-blur">
      <button
        type="button"
        onClick={onBack}
        aria-label="بازگشت"
        className="grid size-9 place-items-center rounded-xl text-stone-500 transition hover:bg-accent hover:text-primary"
      >
        <ChevronRight className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-5">{title}</p>
        <p className="truncate text-[10.5px] text-muted-foreground">{sub}</p>
      </div>
      {right}
      {share}
    </header>
  );
}

function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="اشتراک"
      className="grid size-9 shrink-0 place-items-center rounded-xl border bg-white text-stone-500 transition hover:bg-accent hover:text-primary"
    >
      <Share2 className="size-4.5" />
    </button>
  );
}

// ─── گالری — عکس اصلی + نوار تصاویر کوچک + نشان «پر بازدید» ───
function Gallery({ photos, glyph, hot }: { photos: { url: string; thumbUrl: string | null }[]; glyph: string; hot?: boolean }) {
  const [idx, setIdx] = useState(0);
  const main = photos[idx];
  return (
    <div className="relative bg-gradient-to-br from-[#f3f1ea] to-[#e9e5db]">
      <div className="relative grid h-52 place-items-center overflow-hidden sm:h-64">
        {main ? (
          <Image
            src={main.url}
            alt={glyph}
            width={640}
            height={480}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-6 text-center text-[13px] font-bold text-stone-400">{glyph}</span>
        )}
        {hot && (
          <span className="absolute end-3 top-2.5 rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-bold text-primary-strong">
            پر بازدید
          </span>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-t border-stone-200/70 bg-white/60 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((p, i) => (
            <button
              key={p.url + i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`تصویر ${fa(i + 1)}`}
              className={`size-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === idx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={p.thumbUrl ?? p.url} alt="" width={48} height={48} unoptimized className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ دید مالک — طرح ۰۳ ═══
function OwnerView({
  listing,
  bizId,
  currency,
  allSell,
  inquiries,
  unit,
  inactive,
  onQuick,
  onFull,
}: {
  listing: GoodItemDto;
  bizId: string;
  currency: string;
  allSell: GoodItemDto[];
  inquiries: InquiryDto[];
  unit: string;
  inactive: boolean;
  onQuick: (k: "price" | "stock") => void;
  onFull: () => void;
}) {
  const { toast } = useToast();
  const setActive = useSetListingActive();

  const sellRows = allSell.filter((l) => l.mode === "SELL" || l.mode === "BOTH");
  const maxViews = Math.max(0, ...sellRows.map((l) => l.viewCount30 ?? 0));
  const hot = maxViews >= 5 && (listing.viewCount30 ?? 0) === maxViews;

  const related = inquiries.filter((i) => i.listing?.id === listing.id);
  const openRelated = related.filter((i) => i.status === "NEW");
  const firstOpen = openRelated[0] ?? null;

  const photos = (listing.gallery ?? []).map((f) => ({ url: f.url, thumbUrl: f.thumbUrl }));
  const glyph = listing.variantLabel ?? unit;

  return (
    <>
      <Gallery photos={photos} glyph={glyph} hot={hot} />

      <div className="px-4 pb-4 pt-3.5">
        {/* نام و قیمت + موجودی */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-6">{goodName(listing.good)}</p>
            <p className="mt-1 truncate text-[11.5px] text-muted-foreground">
              {[
                listing.variantLabel ?? categoryName(listing.good.category),
                listing.minOrder ? `حداقل ${fa(listing.minOrder)} ${unit}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="shrink-0 text-end">
            <p className="text-[21px] font-bold leading-7 text-primary-strong">
              {fmtMoney(listing.priceMinor, listing.currency)}{" "}
            </p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">
              موجودی: {fa(listing.stock ?? 0)} {unit}
            </p>
          </div>
        </div>

        {/* ═══ پنل مدیریت — قلب ادغام نما ═══ */}
        <div className="mt-3.5 rounded-2xl border bg-white p-3.5 shadow-sm">
          <p className="mb-2.5 flex items-center gap-1.5 text-[12.5px] font-bold">
            <PencilLine className="size-4 text-primary" />
            مدیریت این کالا
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="justify-start gap-1.5" onClick={() => onQuick("price")}>
              <Tag className="size-4" />
              تغییر قیمت
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-1.5" onClick={() => onQuick("stock")}>
              <Boxes className="size-4" />
              تغییر موجودی
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-1.5" onClick={onFull}>
              <PencilLine className="size-4" />
              ویرایش جزئیات
            </Button>
            {inactive ? (
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-1.5 text-green-600"
                disabled={setActive.isPending}
                onClick={() =>
                  setActive.mutate(
                    { id: listing.id, active: true },
                    {
                      onSuccess: () => toast({ title: "فعال شد", description: "به ویترین برگشت." }),
                      onError: (e) => toast({ title: e.message || "ناموفق بود", variant: "destructive" }),
                    }
                  )
                }
              >
                <PlayCircle className="size-4" />
                فعال‌سازی
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-1.5 text-red-600"
                disabled={setActive.isPending}
                onClick={() =>
                  setActive.mutate(
                    { id: listing.id, active: false },
                    {
                      onSuccess: () => toast({ title: "غیرفعال شد", description: "از ویترین برداشته شد — قابل بازگشت." }),
                      onError: (e) => toast({ title: e.message || "ناموفق بود", variant: "destructive" }),
                    }
                  )
                }
              >
                <CirclePause className="size-4" />
                غیرفعال کردن
              </Button>
            )}
          </div>
        </div>

        {/* عملکرد ۳۰ روز */}
        <h2 className="mb-2.5 mt-5 text-[15px] font-bold">عملکرد ۳۰ روز اخیر</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-white px-1.5 py-2 text-center">
            <p className="text-[16px] font-bold">{fa(listing.viewCount30 ?? 0)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">بازدید</p>
          </div>
          <div className="rounded-xl border bg-white px-1.5 py-2 text-center">
            <p className="text-[16px] font-bold text-primary-strong">{fa(0)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">دنبال‌کننده قیمت</p>
          </div>
          <div className="rounded-xl border bg-white px-1.5 py-2 text-center">
            <p className="text-[16px] font-bold">{fa(openRelated.length)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">درخواست باز</p>
          </div>
        </div>

        {/* خریداران علاقه‌مند — داده‌اش در فاز ۵ (WatchedGood) زنده می‌شود */}
        <h2 className="mb-2.5 mt-5 text-[15px] font-bold">خریداران علاقه‌مند</h2>
        <div className="rounded-2xl border border-dashed bg-white/60 px-4 py-5 text-center">
          <p className="text-xs leading-6 text-muted-foreground">
            هنوز خریداری این کالا را دنبال نکرده است.
            <br />
            <span className="text-[10.5px]">خریدارانِ دنبال‌کننده، فاز بعدی همین‌جا ظاهر می‌شوند.</span>
          </p>
        </div>

        {/* درخواست‌های مرتبط */}
        {openRelated.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
            <Inbox className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-[12.5px] leading-6">
              <b>{fa(openRelated.length)} درخواست قیمت باز برای این کالا</b>
              {firstOpen?.buyer?.name && (
                <>
                  <br />«{firstOpen.buyer.name}» به دنبال {fa(firstOpen.volume)} {unit} از همین کالا است.
                </>
              )}
              <Link href="/sell/requests" className="ms-1 whitespace-nowrap font-bold text-primary-strong hover:underline">
                مشاهده و پاسخ
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* اکشن اصلی مالک */}
      <div className="sticky bottom-0 z-10 mt-auto border-t bg-white/97 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Button size="lg" className="w-full gap-1.5" onClick={onFull}>
          <PencilLine className="size-4" />
          ویرایش کامل کالا
        </Button>
      </div>
    </>
  );
}

// ═══ دید عمومی — طرح ۰۲ ═══
function PublicView({
  listing,
  biz,
  unit,
  authed,
  myBizId,
}: {
  listing: GoodItemDto;
  biz: {
    id: string;
    slug: string;
    name: string;
    city: string;
    activityType: string | null;
    isVerified: boolean;
    logo: { url: string; thumbUrl: string | null } | null;
  };
  unit: string;
  authed: boolean;
  myBizId: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const followToggle = useFollowToggle();

  // ── فاز ۵ (طرح ۰۲): دنبال‌کردن قیمت همین کالا — ردیف لیست خرید می‌سازد ──
  const watchedQ = useWatchedGoods(authed ? myBizId : null);
  const watchM = useWatchGood();
  const isWatched =
    (watchedQ.data ?? []).some((r) => r.goodId === listing.good.id) ?? false;

  // ── فاز ۶ (طرح ۰۲): تیزر تابلوی تأمین + دکمه‌ی فالوی فروشگاه در کارت ──
  const followsQ = useFollows(authed ? myBizId : null);
  const isFollowingSeller = (followsQ.data ?? []).some((f) => f.supplierId === biz.id) ?? false;
  const boardQ = useSupplyBoard(authed ? myBizId : null, listing.good.id);
  const otherSuppliers = (boardQ.data?.rows ?? [])
    .filter((r) => r.seller.id !== biz.id)
    .sort((a, b) => a.priceMinor - b.priceMinor);

  const watch = () => {
    if (!authed || !myBizId) {
      toast({
        title: "اول عضو iMach شوید",
        description: "ثبت‌نام رایگان است؛ بعد از ورود، قیمت این کالا در لیست خریدتان دنبال می‌شود.",
      });
      return;
    }
    watchM.mutate(
      { businessId: myBizId, goodId: listing.good.id },
      {
        onSuccess: () =>
          toast({
            title: `قیمت ${goodName(listing.good)} دنبال شد`,
            description: "در «لیست خرید» می‌نشیند؛ قیمتش که عوض شود خبرتان می‌کنیم.",
          }),
        onError: (e) => toast({ title: e.message || "خطا", variant: "destructive" }),
      }
    );
  };

  // برچسب‌های فارسی ویژگی‌ها از تعریف دسته‌ی کالای مرجع
  const goodsQ = useGoods({ q: listing.good.nameFa, limit: 30 });
  const goodDef = useMemo(
    () => (goodsQ.data?.items ?? []).find((g) => g.id === listing.good.id) ?? null,
    [goodsQ.data, listing.good.id]
  );
  const attrDefs = goodDef?.category.attrs ?? [];

  const attrRows = Object.entries(listing.attrs ?? {}).map(([k, v]) => {
    const def = attrDefs.find((a) => a.key === k);
    let value: string = v;
    if (def?.type === "enum" && def.options) {
      value = def.options.find((o) => o.v === v)?.fa ?? v;
    }
    return { label: def?.fa ?? k, value };
  });

  const specRows = [
    ...attrRows,
    ...(listing.variantLabel ? [{ label: "بسته‌بندی", value: listing.variantLabel }] : []),
    ...(listing.brand ? [{ label: "برند", value: listing.brand.name }] : []),
    ...(listing.minOrder ? [{ label: "حداقل سفارش", value: `${fa(listing.minOrder)} ${unit}` }] : []),
  ];

  const stock = listing.stock ?? 0;
  const stockBadge =
    stock <= 0
      ? { text: "ناموجود", cls: "bg-stone-100 text-stone-500" }
      : { text: `${fa(stock)} ${unit} موجود`, cls: "bg-green-100/70 text-green-700" };

  const photos = (listing.gallery ?? []).map((f) => ({ url: f.url, thumbUrl: f.thumbUrl }));
  const glyph = listing.variantLabel ?? unit;

  const follow = () => {
    if (!authed || !myBizId) {
      toast({
        title: "اول عضو iMach شوید",
        description: "ثبت‌نام رایگان است؛ با دکمه تماس هم می‌توانید عضو شوید.",
      });
      return;
    }
    const next = !isFollowingSeller;
    followToggle.mutate(
      { businessId: myBizId, supplierId: biz.id, follow: next },
      {
        onSuccess: () =>
          toast({
            title: next ? `${biz.name} دنبال شد` : "دنبال‌کردن برداشته شد",
            description: next ? "قیمت‌هایش در دستیار خرید شما جمع می‌شود." : undefined,
          }),
        onError: (e) => toast({ title: e.message || "خطا", variant: "destructive" }),
      }
    );
  };

  return (
    <>
      <Gallery photos={photos} glyph={glyph} />

      <div className="px-4 pb-4 pt-3.5">
        {/* نام و قیمت */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-6">{goodName(listing.good)}</p>
            <p className="mt-1 truncate text-[11.5px] text-muted-foreground">
              {[
                categoryName(listing.good.category),
                listing.brand ? `برند ${listing.brand.name}` : listing.variantLabel,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="shrink-0 text-end">
            <p className="text-[21px] font-bold leading-7">{fmtMoney(listing.priceMinor, listing.currency)}</p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">هر {unit}</p>
          </div>
        </div>

        {/* مشخصات */}
        <div className="mt-3.5 rounded-2xl border bg-white px-4 py-1 shadow-sm">
          {specRows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between border-b border-stone-100 py-2.5 text-[12.5px] last:border-0"
            >
              <span className="text-muted-foreground">{r.label}</span>
              <b className="font-bold">{r.value}</b>
            </div>
          ))}
          <div className="flex items-center justify-between py-2.5 text-[12.5px]">
            <span className="text-muted-foreground">موجودی</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${stockBadge.cls}`}>
              {stockBadge.text}
            </span>
          </div>
        </div>

        {/* فروشنده */}
        <div className="mt-2.5 flex items-center gap-2.5 rounded-2xl border bg-white p-3.5 shadow-sm">
          {biz.logo?.thumbUrl || biz.logo?.url ? (
            <Image
              src={(biz.logo.thumbUrl ?? biz.logo.url)!}
              alt={biz.name}
              width={44}
              height={44}
              unoptimized
              className="size-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c2703a] to-primary text-base font-bold text-white">
              {biz.name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-[13px] font-bold">
              {biz.name}
              {biz.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
            </p>
            <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
              {[
                biz.activityType ? activityTypeLabel(biz.activityType) : null,
                biz.city || null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {/* فاز ۶ (طرح ۰۲): فالوی فروشگاه — دکمه کوچک داخل کارت فروشنده */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 border-stone-300 bg-white px-3 text-[11.5px] font-bold text-stone-700 hover:bg-stone-50"
            onClick={follow}
            disabled={followToggle.isPending}
            aria-pressed={isFollowingSeller}
          >
            {followToggle.isPending ? "…" : isFollowingSeller ? "دنبال می‌کنید" : "دنبال کردن فروشگاه"}
          </Button>
        </div>

        {/* تیزر تابلوی تأمین همین کالا (فاز ۶ · طرح ۰۲) — فقط برای خریدارِ واردشده */}
        {authed && otherSuppliers.length > 0 && (
          <div className="mt-2.5 rounded-2xl border bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-stone-800">
                <Inbox className="size-[17px] text-stone-500" strokeWidth={1.75} />
                سایر تأمین‌کنندگان این کالا
              </p>
              <span className="rounded-full bg-stone-100 px-[9px] py-[2px] text-[10.5px] font-bold text-stone-600">
                {fa(otherSuppliers.length)} مورد
              </span>
            </div>
            <div className="mt-2.5 flex flex-col gap-[7px]">
              {otherSuppliers.slice(0, 2).map((r) => (
                <div key={r.listingId} className="flex items-center justify-between text-[12px]">
                  <span className="truncate text-stone-500">
                    {r.seller.name} — {r.seller.city}
                  </span>
                  <b className="shrink-0 font-bold text-stone-800">{fmtMoney(r.priceMinor, r.currency)}</b>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              className="mt-2.5 w-full gap-1 bg-stone-800 font-bold hover:bg-stone-900"
              onClick={() => router.push(`/buy/board/${listing.good.id}`)}
            >
              مشاهده تابلوی تأمین
              <ChevronRight className="size-4 rtl:rotate-180" />
            </Button>
          </div>
        )}

        <p className="mt-4 rounded-2xl bg-stone-100/70 px-4 py-3 text-center text-[11px] leading-6 text-stone-600">
          قیمت‌ها با «تماس» شفاف می‌شوند — در iMach خرید انجام نمی‌شود؛ ارتباط مستقیم با فروشنده.
        </p>
      </div>

      {/* اکشن‌های خریدار (فاز ۶ · طرح ۰۲): تماس + درخواست قیمت + دنبال‌کردن قیمت
          (فالوی فروشگاه به کارت فروشنده بالا منتقل شد) */}
      <div className="sticky bottom-0 z-10 mt-auto flex gap-2.5 border-t bg-white/97 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <ContactButton
          slug={biz.slug}
          bizName={biz.name}
          label=""
          aria-label="تماس با فروشنده"
          className="grid size-12 shrink-0 place-items-center rounded-xl border bg-white p-0 text-stone-600 hover:bg-accent hover:text-primary"
        />
        <Button
          size="lg"
          variant="outline"
          className="flex-1 gap-1.5 border-stone-300 bg-white font-bold hover:bg-stone-50"
          onClick={() => {
            if (!authed || !myBizId) {
              toast({
                title: "اول عضو iMach شوید",
                description: "ثبت‌نام رایگان است؛ بعد از ورود، از تأمین‌کننده‌های این کالا استعلام بگیرید.",
              });
              return;
            }
            router.push(`/buy/board/${listing.good.id}/quote`);
          }}
        >
          درخواست قیمت
        </Button>
        <Button
          size="lg"
          className="flex-[1.3] gap-1.5 bg-stone-800 hover:bg-stone-900"
          onClick={watch}
          disabled={watchM.isPending || isWatched}
          aria-pressed={isWatched}
        >
          {isWatched ? (
            <>
              <BookmarkCheck className="size-4.5" strokeWidth={1.9} />
              دنبال می‌کنید
            </>
          ) : (
            <>
              <Bookmark className="size-4.5" strokeWidth={1.9} />
              دنبال کردن قیمت
            </>
          )}
        </Button>
      </div>
    </>
  );
}

// ─── دیالوگ تغییر سریع قیمت / موجودی ───
function QuickEditDialog({
  listing,
  bizId,
  currency,
  kind,
  open,
  onOpenChange,
}: {
  listing: GoodItemDto;
  bizId: string;
  currency: string;
  kind: "price" | "stock";
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const { locale } = useLocale();
  const saveListing = useSaveListing();

  const exp = (CURRENCIES[currency] ?? CURRENCIES.IRR).exp;
  const curName = currencyLabel(currency, locale);
  const unit = unitLabel(listing.good.unit, locale);
  const isPrice = kind === "price";

  const [value, setValue] = useState<number | null>(() =>
    isPrice ? (listing.priceMinor !== null ? listing.priceMinor / 10 ** exp : null) : (listing.stock ?? null)
  );

  const save = async () => {
    if (isPrice && (value ?? 0) <= 0) {
      toast({ title: "قیمت را درست وارد کنید", variant: "destructive" });
      return;
    }
    if (!isPrice && (value ?? 0) <= 0) {
      toast({ title: "موجودی را درست وارد کنید", variant: "destructive" });
      return;
    }
    const filledAttrs = Object.fromEntries(
      Object.entries(listing.attrs ?? {}).filter(([, v]) => v.trim() !== "")
    );
    const priceMinor = isPrice ? Math.round((value ?? 0) * 10 ** exp) : (listing.priceMinor ?? 0);
    const stock = isPrice ? (listing.stock ?? 0) : (value ?? 0);
    try {
      await saveListing.mutateAsync({
        businessId: bizId,
        listingId: listing.id,
        goodId: listing.good.id,
        mode: listing.mode,
        ...(listing.brand?.name ? { brandName: listing.brand.name } : {}),
        ...(Object.keys(filledAttrs).length > 0 ? { attrs: filledAttrs } : {}),
        sell: { priceMinor, stock, minOrder: listing.minOrder ?? 0 },
        ...(listing.mode !== "SELL"
          ? { buy: { volume: listing.volume ?? 1, frequency: listing.frequency ?? "MONTHLY" } }
          : {}),
      });
      toast({
        title: isPrice ? "قیمت به‌روز شد" : "موجودی به‌روز شد",
        description: goodName(listing.good, locale),
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof Error ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-4 p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-sm">
            {isPrice ? <Tag className="size-4 text-primary" /> : <Boxes className="size-4 text-primary" />}
            {isPrice ? "تغییر قیمت" : "تغییر موجودی"}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border bg-accent/30 px-3 py-2.5">
          <p className="truncate text-sm font-bold">{goodName(listing.good, locale)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {listing.variantLabel ?? categoryName(listing.good.category)} · هر {unit}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">
            {isPrice ? `قیمت هر ${unit}` : `موجودی (${unit})`}
          </Label>
          <NumberInput
            value={value}
            onChange={setValue}
            min={0}
            suffix={isPrice ? curName : unit}
            aria-label={isPrice ? `قیمت هر ${unit}` : "موجودی"}
          />
        </div>

        <Button size="lg" onClick={() => void save()} disabled={saveListing.isPending}>
          {saveListing.isPending ? "…" : "ذخیره"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
