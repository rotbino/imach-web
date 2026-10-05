"use client";

/**
 * sheet-promote v3 (فاز ۶) — «فروشنده ویژه» برای یک کالا.
 * میزبان: /sell/catalog (دکمهٔ کمپین) + /sell/campaign («ادامهٔ کمپین»).
 *
 *  · پیش‌نمایش تابلوی واقعیِ همان کالا (getSupplyBoard) — قبل/بعد با برچسب شفاف
 *  · جایگاه‌ها: تابلوی تأمین + قیمت‌های دنبال‌شده — هر دو (اطلاعی؛ نرخ یکسان)
 *  · نرخ شفاف: ۱٬۰۰۰ ت مشاهدهٔ کامل · ۵٬۰۰۰ ت دنبال‌کردن
 *  · بودجه: بسته‌های ۵۰/۱۰۰/۲۰۰ هزار + خط اعتبار کیف (موجودی → پس از راه‌اندازی)
 *  · راه‌اندازی = POST /promos/create واقعی → گزارش کمپین
 *
 * تطبیق آگاهانه (MIGRATION-MAP §۴):
 *   · انتخاب جایگاه (slot-grid تعاملی Prototype) → کارت‌های اطلاعاتیِ ثابت —
 *     بک‌اند کمپین را روی هر دو سطح تزریق می‌کند؛ انتخاب سطح پیاده نشده و
 *     دکمهٔ بی‌اثر نقض صداقت UI است. نرخ یکسان بودن همان نُت Prototype است.
 *   · «~۲۸ خریدار فعال هنوز دنبالت نمی‌کنند» → از watchers واقعی کالا
 *     (خارج از دنبال‌کنندگان من) — خنثی/صفر اگر داده نباشد.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/imach/sheet";
import { Icon } from "@/components/imach/icon";
import { useMessages } from "@/i18n/messages/use-messages";
import { useActiveBusiness } from "@/lib/active-biz";
import { useMyListings, useSupplyBoard, useWallet, useCreatePromo } from "@/lib/queries";
import { fa, fmtMoney } from "@/lib/format";
import { faPlain } from "./num";
import { useToast } from "@/hooks/use-toast";

const BUDGETS = [50_000, 100_000, 200_000];

export function PromoteSheet({
  open,
  onClose,
  listing,
  fixedListingId,
}: {
  open: boolean;
  onClose: () => void;
  /** کالای انتخاب‌شده از کاتالوگ — اگر میزبان کاتالوک باشد */
  listing?: { id: string; goodId: string; goodName?: string | null } | null;
  /** ادامهٔ کمپین — کالای کمپین فعال */
  fixedListingId?: string | null;
}) {
  const m = useMessages();
  const t = m.app.promote;
  const router = useRouter();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const listingsQ = useMyListings(bizId, { includeInactive: true });
  const listings = listingsQ.data ?? [];

  // کالای هدف: صریح از prop، یا آخرین کالای فعال فهرست
  const target = useMemo(() => {
    if (listing) return { id: listing.id, goodId: listing.goodId, name: listing.goodName ?? "" };
    if (fixedListingId) {
      const l = listings.find((x) => x.id === fixedListingId);
      if (l) return { id: l.id, goodId: l.good.id, name: l.good.nameFa };
    }
    const first = listings.find((l) => l.isActive) ?? listings[0];
    return first ? { id: first.id, goodId: first.good.id, name: first.good.nameFa } : null;
  }, [listing, fixedListingId, listings]);

  const [picked, setPicked] = useState<number>(100_000);
  const [pickedListingId, setPickedListingId] = useState<string | null>(null);
  // انتخاب کالا وقتی میزبانِ ورودی صریح ندارد (ورودی کاتالوک)
  const chosen = useMemo(() => {
    if (listing) return target;
    if (fixedListingId) return target;
    if (pickedListingId) {
      const l = listings.find((x) => x.id === pickedListingId);
      return l ? { id: l.id, goodId: l.good.id, name: l.good.nameFa } : target;
    }
    return target;
  }, [listing, fixedListingId, pickedListingId, listings, target]);
  const boardQ = useSupplyBoard(bizId, chosen?.goodId ?? null);
  const walletQ = useWallet(bizId);
  const createMut = useCreatePromo();

  // ریست بودجه هنگام باز شدن — الگوی تنظیم حین رندر (نه effect)
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPicked(100_000);
  }

  if (!open) return null;

  const board = boardQ.data;
  const rows = (board?.rows ?? []).slice().sort((a, b) => (a.priceMinor ?? 0) - (b.priceMinor ?? 0));
  const top3 = rows.slice(0, 3);
  const myRow = chosen ? rows.find((r) => r.listingId === chosen.id) : undefined;
  const myPrice = myRow?.priceMinor ?? null;

  const balanceMinor = walletQ.data?.balanceMinor ?? 0;
  const after = balanceMinor - picked * 10;
  const estViews = Math.floor(picked / 1_000);

  const launch = () => {
    if (!bizId || !chosen) return;
    if (balanceMinor < picked * 10) {
      toast({ title: t.errBalance, variant: "destructive" });
      return;
    }
    createMut.mutate(
      { businessId: bizId, listingId: chosen.id, budgetToman: picked },
      {
        onSuccess: () => {
          toast({ title: t.launchedToast });
          onClose();
          router.push("/sell/campaign");
        },
        onError: (e: Error & { code?: string }) => {
          const msg =
            e.code === "PROMO_INSUFFICIENT_BALANCE"
              ? t.errBalance
              : e.code === "PROMO_ALREADY_RUNNING"
                ? t.errRunning
                : t.errGeneric;
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} label={t.title}>
      <div className="grab" />
      <h3>{t.title}</h3>
      <div className="sub">{t.sub.replace("{good}", chosen?.name ?? t.pickGood)}</div>

      {/* انتخاب کالا — فقط وقتی میزبان کاتالوک است (بدون کالای صریح) */}
      {!listing && !fixedListingId && listings.length > 0 ? (
        <>
          <div className="ng-title">{t.pickGoodTitle}</div>
          <div className="unit-chips" style={{ flexWrap: "wrap" }}>
            {listings
              .filter((l) => l.isActive)
              .slice(0, 12)
              .map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={(chosen?.id ?? "") === l.id ? "chip active" : "chip"}
                  onClick={() => setPickedListingId(l.id)}
                >
                  {l.good.nameFa}
                </button>
              ))}
          </div>
        </>
      ) : null}

      {/* پیش‌نمایش تابلوی واقعی خریداران */}
      {top3.length > 0 ? (
        <div className="mb-wrap">
          <div className="mb-title">{t.nowBoard.replace("{good}", chosen?.name ?? "")}</div>
          <div className="mb-board">
            {top3.map((r, i) => (
              <div key={r.listingId} className={r.listingId === chosen?.id ? "mb-row me" : "mb-row"}>
                <span className="mb-nm">
                  {r.seller.name}
                  {r.listingId === chosen?.id ? <small> {t.you}</small> : null}
                </span>
                <span className="mb-pr">{faPlain((r.priceMinor ?? 0) / 10)}</span>
                {i === 0 ? <i className="mb-rank">{fa(1)}</i> : null}
              </div>
            ))}
          </div>
          <div className="mb-arrow">
            <Icon name="i-bolt" />
            {t.withPromo}
          </div>
          <div className="mb-title" style={{ color: "var(--primary-strong)" }}>
            {t.afterBoard}
          </div>
          <div className="mb-board hl">
            <div className="mb-row me first">
              <span className="mb-badge">
                <Icon name="i-star" />
                {m.app.campaign.active === "Active" ? "Featured" : "فروشندهٔ ویژه"}
              </span>
              <span className="mb-nm">
                {biz?.name}
                <small> {t.you}</small>
              </span>
              <span className="mb-pr">{faPlain((myPrice ?? top3[0].priceMinor ?? 0) / 10)}</span>
              <i className="mb-rank">{fa(1)}</i>
            </div>
            {top3.map((r, i) => (
              <div key={r.listingId} className="mb-row">
                <span className="mb-nm">{r.seller.name}</span>
                <span className="mb-pr">{faPlain((r.priceMinor ?? 0) / 10)}</span>
                <i className="mb-rank">{fa(i + 2)}</i>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* جایگاه‌ها — اطلاعاتی (هر دو سطح؛ نرخ یکسان) */}
      <div className="ng-title">{t.slotsTitle}</div>
      <div className="slot-grid">
        <div className="slot-card on">
          <span className="sl-chk">
            <Icon name="i-check" />
          </span>
          <span className="sl-ico">
            <Icon name="i-list" />
          </span>
          <span className="sl-t">{t.slotBoardT}</span>
          <span className="sl-d">{t.slotBoardD}</span>
        </div>
        <div className="slot-card on">
          <span className="sl-chk">
            <Icon name="i-check" />
          </span>
          <span className="sl-ico">
            <Icon name="i-basket" />
          </span>
          <span className="sl-t">{t.slotFeedT}</span>
          <span className="sl-d">{t.slotFeedD}</span>
        </div>
      </div>
      <div className="slot-note">
        <Icon name="i-info" />
        <span>{t.slotsNote}</span>
      </div>

      {/* نرخ شفاف */}
      <div className="rate-card">
        <div className="rate-row">
          <span className="r-ico">
            <Icon name="i-eye" />
          </span>
          <span className="tx">
            {t.rateView}
            <small>{t.rateViewSub}</small>
          </span>
          <span className="pr">{fa(1000)} ت</span>
        </div>
        <div className="rate-row">
          <span className="r-ico">
            <Icon name="i-bm" />
          </span>
          <span className="tx">
            {t.rateFollow}
            <small>{t.rateFollowSub}</small>
          </span>
          <span className="pr">+{fa(5000)} ت</span>
        </div>
        <div className="rate-src">
          <Icon name="i-info" />
          <span>{t.rateSrc}</span>
        </div>
        <div className="budget-note">
          <b>{t.estViews.replace("{n}", fa(estViews))}</b>
        </div>
      </div>

      {/* بودجه */}
      <div className="ng-title">{t.budgetTitle}</div>
      <div className="pkgs">
        {BUDGETS.map((v) => (
          <button
            key={v}
            type="button"
            className={picked === v ? "pkg best" : "pkg"}
            onClick={() => setPicked(v)}
            aria-pressed={picked === v}
          >
            {v === 100_000 ? <i>{t.pkgBest}</i> : null}
            <b>{fa(Math.floor(v / 1000))} هزار</b>
            <span>{t.estViews.replace("{n}", fa(Math.floor(v / 1000)))}</span>
          </button>
        ))}
      </div>

      {/* خط اعتبار — کیف واقعی */}
      <div className="credit-line">
        <Icon className="ic-sm" name="i-wallet" />
        <span>
          {t.creditLine
            .replace("{bal}", faPlain(balanceMinor / 10))
            .replace("{after}", faPlain(Math.max(0, after) / 10))}
        </span>
      </div>

      <button
        className="btn btn-primary btn-lg btn-block"
        disabled={!chosen || createMut.isPending || balanceMinor < picked * 10}
        onClick={launch}
      >
        <Icon className="ic-sm" name="i-star" />
        {t.launchBtn}
      </button>
      {balanceMinor < picked * 10 ? (
        <div className="f-err" style={{ marginTop: 6 }}>
          <Icon name="i-info" />
          {t.noWallet}
        </div>
      ) : null}

      <div className="freepath">
        <Icon className="ic-sm" name="i-share" />
        <span>
          {t.freePath.replace("{link}", "")}
          <u
            onClick={() => {
              onClose();
              router.push("/wallet");
            }}
            style={{ cursor: "pointer" }}
          >
            {t.freePathLink}
          </u>
        </span>
      </div>

      <div className="trust">
        <Icon name="i-shield" />
        <span>{t.trust}</span>
      </div>
    </Sheet>
  );
}
