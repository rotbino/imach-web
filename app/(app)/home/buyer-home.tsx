"use client";

/**
 * /home — خانهٔ خریدار (پورت sc-buy-list · فاز ۲: دادهٔ واقعی از API).
 *
 * فاز ۱۰ (بازخورد مالک — «دفتر خرید»):
 *   · سلام ساده: «سلام، خوش اومدید» — نه نامِ placeholder بیزینس
 *   · باکس کاتالوگ‌های ذخیره‌شده از این صفحه حذف شد (لینکش در ناوبری هست)
 *   · redesign-base 08-buy-list الهامِ مدیریت: جستجو + چیپ‌های فیلتر +
 *     دکمهٔ «افزودن کالا» با عرضِ خودش (نه تمام‌عرضِ زشت در دسکتاپ)
 *   · آیکون اطلاعات کنار سلام → شیت «دفتر خرید به چه دردی می‌خورد؟»
 *   · پیش‌نمایش دفتر خرید — لینک دم‌دست برای دیدنِ همان چیزی که
 *     فروشنده‌ها/رهاگذرها از لینک عمومی می‌بینند (/b/{slug})
 *   · متن راهنمای جدید مالک (ساده و اقدام‌محور)
 *
 * فاز ۱۲ (پورت فاز ۱۱ پروتوتایپ — حکم مالک):
 *   · کل کارت کلیک‌پذیر است (نه فقط عنوان/عکس) — می‌رود به جزئیات کالا
 *   · فراداده به‌صورت چیپ‌های آیکون‌دار (rc-meta): دنبال‌شده / تأمین‌کننده /
 *     ارزان‌ترین (رنگ فرعی بازو) / نیاز / به‌روزرسانی — منظم و خوانا
 *   · رصد خاموش = چیپ کهربایی اقدام‌پذیر «روشن کن» + توستِ توضیحی
 *     بعد از فعال‌سازی (کاربر بفهمد رصد چه می‌کند)
 *   · کارت سرد: cold-cta (فعال‌سازی رصد + «رصد چیست؟»)
 *   · فیلتر «آرشیو» + بازگردانی ردیف‌های آرشیوشده (رصد می‌ماند)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveBusiness } from "@/lib/active-biz";
import { useMyBusinesses, useWatchedGoods, useMyRfqs, useFollows, usePriceBoard, useWatchGood, useArchiveWatchedGood } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import type { WatchedRowDto } from "@/lib/api";
import { fa, fmtMoney, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon, type IconName } from "@/components/imach/icon";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Sheet } from "@/components/imach/sheet";
import { Spinner } from "@/components/imach/spinner";
import { useMoney } from "@/components/imach/currency-context";
import { ShareSheet } from "@/components/imach/share-sheet";
import { WatchInfoSheet } from "@/components/imach/watch-info-sheet";
import { useSheetParam } from "@/components/imach/demo-sheet-param";

/** نگاشت دستهٔ کالا → آیکون هنری Prototype (فاقد نقش هنری → آیکون جعبه) */
const ART_BY_CATEGORY: Record<string, IconName> = {
  rice: "a-rice",
  oil: "a-oil",
  sugar: "a-sugar",
  lentil: "a-lentil",
};

function artOf(row: WatchedRowDto): IconName {
  const slug = row.good?.category?.slug ?? "";
  return ART_BY_CATEGORY[slug] ?? "i-box";
}

/** نرمال‌سازی ارقام فارسی/عربی → لاتین (§۲۱ فرم‌های production-grade) */
function toAsciiDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

type FilterKey = "all" | "fresh" | "watched" | "archived";

export function BuyerHome() {
  const m = useMessages();
  const t = m.app.home;
  const { locale } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareContacts, setShareContacts] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [watchInfoOpen, setWatchInfoOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  // فاز ۸ — قیمت‌ها در ارز نمایش کاربر (نرخ تقریبی؛ معامله در ارز فروشنده)
  const money = useMoney();
  const biz = useActiveBusiness();
  const businesses = useMyBusinesses();
  const bizId = biz?.id ?? null;

  const watched = useWatchedGoods(bizId);
  // فاز ۱۲ — ردیف‌های آرشیوشده (رصد می‌ماند؛ فقط از لیست روزمره کنار رفته)
  const archivedQ = useWatchedGoods(bizId, { archived: true });
  const rfqs = useMyRfqs(bizId);
  const follows = useFollows(bizId);
  const board = usePriceBoard(bizId);
  const watchMut = useWatchGood();
  const archiveMut = useArchiveWatchedGood();

  const rows = useMemo(() => watched.data ?? [], [watched.data]);
  const archivedRows = useMemo(() => archivedQ.data ?? [], [archivedQ.data]);
  const archivedCount = archivedRows.length;
  const freshCount = useMemo(() => rows.filter((r) => r.priceChanged).length, [rows]);
  const watchedCount = useMemo(() => rows.filter((r) => r.watched).length, [rows]);
  const offersCount = rfqs.data?.recentOfferCount ?? 0;
  void follows; // فاز ۱۰ — نوار کاتالوگ‌های ذخیره از این صفحه رفت (ناوبری خودش لینک دارد)

  /** فیلتر + جستجو — الهام redesign-base: چیپ‌های شمار‌دار + سرچ درون‌لیستی */
  const visibleRows = useMemo(() => {
    const needle = toAsciiDigits(search).trim().toLocaleLowerCase();
    const source = filter === "archived" ? archivedRows : rows;
    return source.filter((r) => {
      if (filter === "fresh" && !r.priceChanged) return false;
      if (filter === "watched" && !r.watched) return false;
      if (needle) {
        const name = r.good ? goodName(r.good, locale) : "";
        if (!name.toLocaleLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [rows, archivedRows, filter, search, locale]);

  /** فاز ۱۲ — شمارِ دنبال‌شده‌های هر کالا (خوراک getPriceBoard) */
  const followedCountByGood = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of board.data?.rows ?? []) map.set(row.goodId, row.suppliers.length);
    return map;
  }, [board.data]);

  /** فاز ۶ — ردیف‌های «فروشندهٔ ویژه»: پروموهای تزریق‌شدهٔ تابلو (U05/U06). */
  const promoRows = useMemo(
    () => (board.data?.rows ?? []).filter((r) => r.promo !== null),
    [board.data]
  );

  /** جدیدترین به‌روزرسانیِ تابلوی هر کالا (خوراک getPriceBoard) */
  const lastUpdateByGood = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of board.data?.rows ?? []) {
      const latest = row.suppliers
        .map((s) => s.updatedAt)
        .filter(Boolean)
        .sort()
        .pop();
      if (latest) map.set(row.goodId, latest);
    }
    return map;
  }, [board.data]);

  const relTime = (iso?: string): string | null => {
    if (!iso) return null;
    const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
    if (hours < 1) return t.today;
    if (hours < 24) return t.hoursAgoN.replace("{n}", fa(Math.floor(hours)));
    if (hours < 48) return t.yesterday;
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "fa-IR");
  };

  // شیت اشتراک v18 (فاز ۹) — مخاطبین گوشی / اشتراک سیستمی / کپی / QR
  const openShare = () => setShareOpen(true);
  // فاز ۹ — ناوبری Demo Hub: ?sheet=share | ?sheet=contacts
  useSheetParam("share", () => { setShareContacts(false); setShareOpen(true); });
  useSheetParam("contacts", () => { setShareContacts(true); setShareOpen(true); });
  // فاز ۱۰ — ناوبری Demo Hub: ?sheet=what-is | فاز ۱۲: ?sheet=watch-info
  useSheetParam("what-is", () => setInfoOpen(true));
  useSheetParam("watch-info", () => setWatchInfoOpen(true));

  // ── فاز ۱۲ — رصد از خود دفتر: بدون تامین‌کنندهٔ مبدأ؛ توستِ توضیحی ──
  const nameOf = (row: WatchedRowDto): string => (row.good ? goodName(row.good, locale) : "—");
  const watchOn = (row: WatchedRowDto) => {
    if (!bizId || watchMut.isPending) return;
    watchMut.mutate(
      { businessId: bizId, goodId: row.goodId },
      {
        onSuccess: () =>
          toast({
            title: t.watchOnToastN.replace("{name}", nameOf(row)),
            description: t.watchOnToastDesc,
          }),
      }
    );
  };
  const watchCold = (row: WatchedRowDto) => {
    if (!bizId || watchMut.isPending) return;
    watchMut.mutate(
      { businessId: bizId, goodId: row.goodId },
      {
        onSuccess: () =>
          toast({
            title: t.watchColdToastN.replace("{name}", nameOf(row)),
            description: t.watchOnToastDesc,
          }),
      }
    );
  };
  const unarchive = (row: WatchedRowDto) => {
    if (!bizId || archiveMut.isPending) return;
    archiveMut.mutate(
      { businessId: bizId, goodId: row.goodId, archived: false },
      {
        onSuccess: () =>
          toast({ title: t.unarchivedToastN.replace("{name}", nameOf(row)) }),
      }
    );
  };

  // ── حالت‌ها: بارگذاری / بدون کسب‌وکار / خالی / داده ──
  const businessesLoading = businesses.isLoading;
  const listLoading = !!bizId && watched.isLoading;

  if (businessesLoading || listLoading) {
    return (
      <section className="screen" data-screen="buy-list">
        <Appbar deskTitle={t.secList} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
            <Spinner size={22} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t.loading}</span>
          </div>
        </div>
        <Tabbar active="list" />
      </section>
    );
  }

  if (!biz) {
    // احراز هویت هست ولی کسب‌وکار placeholder/نبود → ساخت کسب‌وکار
    return (
      <section className="screen" data-screen="buy-list">
        <Appbar deskTitle={t.secList} />
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-basket" />
            </span>
            <h3>{t.bizMissingTitle}</h3>
            <p>{t.bizMissingSub}</p>
            <Link className="btn btn-primary" href="/start">
              {t.bizMissingCta}
            </Link>
          </div>
        </div>
        <Tabbar active="list" />
      </section>
    );
  }

  const hasSearchOrFilter = search.trim().length > 0 || filter !== "all";

  return (
    <section className="screen" data-screen="buy-list">
      <Appbar deskTitle={t.secList} />

      <div className="screen-body">
        {/* ── سلام + آیکون اطلاعات (فاز ۱۰) ── */}
        <div className="greet greet-bar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{t.greetTitle}</b>
            <span>
              {freshCount > 0
                ? t.greetSubFresh.replace("{n}", fa(freshCount))
                : t.greetSubCalm}
            </span>
          </div>
          <button
            type="button"
            className="info-btn"
            aria-label={t.whatIsTitle}
            title={t.whatIsTitle}
            onClick={() => setInfoOpen(true)}
          >
            <Icon name="i-info" />
          </button>
        </div>

        {/* ── جستجو + افزودن (الهام redesign-base — عرض دکمه به‌اندازه) ── */}
        <div className="list-tools">
          <div className="searchbar">
            <Icon name="i-search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPh}
              aria-label={t.searchPh}
              inputMode="search"
            />
            {search ? (
              <button type="button" className="clr" aria-label={m.auth.search.clear} onClick={() => setSearch("")}>
                <Icon className="ic-sm ic-12" name="i-x" />
              </button>
            ) : null}
          </div>
          <Link className="btn btn-primary add-btn" href="/new?tab=buy">
            <Icon className="ic-sm" name="i-plus" /> {t.addCta}
          </Link>
        </div>

        {/* چیپ‌های فیلتر — شمار‌دار + آرشیو (فاز ۱۲) */}
        <div className="filter-chips">
          <button
            type="button"
            className={filter === "all" ? "fchip on" : "fchip"}
            onClick={() => setFilter("all")}
          >
            {t.chipAll} <i>{fa(rows.length)}</i>
          </button>
          <button
            type="button"
            className={filter === "fresh" ? "fchip fresh on" : "fchip fresh"}
            onClick={() => setFilter("fresh")}
          >
            {t.chipFresh} <i>{fa(freshCount)}</i>
          </button>
          <button
            type="button"
            className={filter === "watched" ? "fchip on" : "fchip"}
            onClick={() => setFilter("watched")}
          >
            {t.chipWatched} <i>{fa(watchedCount)}</i>
          </button>
          {archivedCount > 0 ? (
            <button
              type="button"
              className={filter === "archived" ? "fchip on" : "fchip"}
              onClick={() => setFilter("archived")}
            >
              {t.chipArchive} <i>{fa(archivedCount)}</i>
            </button>
          ) : null}
        </div>

        {/* ── نوار اشتراک + پیش‌نمایش (فاز ۱۰) ── */}
        <div className="share-strip">
          <span
            className="ico"
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              background: "var(--teal)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon className="ic-sm" name="i-share" style={{ width: 19, height: 19 }} />
          </span>
          <span className="txt">
            <b>{t.shareTitle}</b>
            <span>{t.shareSubN.replace("{slug}", biz.slug ?? "")}</span>
          </span>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {biz.slug ? (
              <Link
                className="btn btn-soft btn-sm"
                href={`/b/${biz.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title={t.previewSub}
              >
                <Icon className="ic-sm" name="i-eye" /> {t.previewCta}
              </Link>
            ) : null}
            <button className="btn btn-soft btn-sm" onClick={openShare}>
              {t.shareCta}
            </button>
          </div>
        </div>

        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-list" /> {t.secList}
          </h2>
          <Link className="more" href="/offers">
            {offersCount > 0 ? <span className="badge b-teal">{fa(offersCount)}</span> : null} {t.offersLink}
          </Link>
        </div>

        {rows.length === 0 && archivedCount === 0 ? (
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-basket" />
            </span>
            <h3>{t.emptyTitle}</h3>
            <p>{t.emptySub}</p>
            <Link className="btn btn-primary" href="/new?tab=buy">
              <Icon className="ic-sm" name="i-plus" /> {t.addCta}
            </Link>
          </div>
        ) : visibleRows.length === 0 ? (
          rows.length === 0 && archivedCount > 0 ? (
            // همهٔ ردیف‌ها آرشیو‌اند — راهنمای بازگردانی
            <div className="empty-state" style={{ padding: "26px 14px" }}>
              <span className="art" style={{ background: "var(--muted-bg)", color: "var(--fg-soft)", width: 44, height: 44 }}>
                <Icon name="i-inbox" />
              </span>
              <h3 style={{ fontSize: 13 }}>{t.allArchived}</h3>
            </div>
          ) : filter === "archived" ? (
            <div className="empty-state" style={{ padding: "26px 14px" }}>
              <span className="art" style={{ background: "var(--muted-bg)", color: "var(--fg-soft)", width: 44, height: 44 }}>
                <Icon name="i-inbox" />
              </span>
              <h3 style={{ fontSize: 13 }}>{t.archivedEmpty}</h3>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "26px 14px" }}>
              <span className="art" style={{ background: "var(--muted-bg)", color: "var(--fg-soft)", width: 44, height: 44 }}>
                <Icon name="i-search" />
              </span>
              <h3 style={{ fontSize: 13 }}>{t.searchNoResult}</h3>
            </div>
          )
        ) : (
          <div className="g2">
            {visibleRows.map((row) => {
              const name = nameOf(row);
              const isArchived = filter === "archived";
              const isCold = row.supplierCount === 0;
              const cheapest = row.cheapest;
              const rel = relTime(lastUpdateByGood.get(row.goodId));
              const followedCount = followedCountByGood.get(row.goodId) ?? 0;
              const pct = row.trendPct;

              // فاز ۱۲ — کل کارت کلیک‌پذیر (پورت data-go پروتوتایپ)؛
              // دکمه‌های درون کارت با stopPropagation مسیر خودشان را می‌روند
              const goItem = () => router.push(`/item/${row.goodId}`);

              return (
                <div
                  className={`${isCold && !isArchived ? "row-card dashed" : "row-card"}`}
                  key={`${row.goodId}-${row.buyListingId ?? "w"}`}
                  role="link"
                  tabIndex={0}
                  aria-label={name}
                  style={{ cursor: "pointer" }}
                  onClick={goItem}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goItem();
                    }
                  }}
                >
                  <span className="thumb">
                    <Icon name={artOf(row)} />
                  </span>
                  <div className="body">
                    <div className="t">
                      {name}
                      {row.watched ? <span className="pulse-dot" title={t.watchingAria} /> : null}
                      {row.variantLabel ? <span className="badge b-stone">{row.variantLabel}</span> : null}
                      {isArchived ? <span className="badge b-stone">{t.archiveBadge}</span> : null}
                    </div>
                    {cheapest ? (
                      <div className="pl">
                        <b>{money.parts(cheapest.priceMinor, cheapest.currency).amount}</b>
                        <span className="u">{`${money.parts(cheapest.priceMinor, cheapest.currency).label} / ${row.good ? unitLabel(row.good.unit, locale) : ""}`}</span>
                        {pct !== null && pct !== undefined && pct !== 0 ? (
                          <span className={`trend ${pct < 0 ? "down" : "up"}`}>
                            <Icon
                              className="ic-sm ic-12"
                              name={pct < 0 ? "i-tdn" : "i-tup"}
                            />{" "}
                            {fa(Math.abs(pct))}٪
                          </span>
                        ) : row.priceChanged ? (
                          <span className="badge b-orange">{t.freshPrice}</span>
                        ) : (
                          <span className="trend flat">{t.flat}</span>
                        )}
                      </div>
                    ) : null}
                    {/* فاز ۱۲ — rc-meta: فراداده به‌صورت چیپ‌های آیکون‌دار */}
                    <div className="rc-meta">
                      {followedCount > 0 ? (
                        <span className="m">
                          <Icon name="i-bm" /> {t.followedN.replace("{n}", fa(followedCount))}
                        </span>
                      ) : null}
                      {row.supplierCount > 0 ? (
                        <span className="m">
                          <Icon name="i-users" /> {t.inBoardN.replace("{n}", fa(row.supplierCount))}
                        </span>
                      ) : isArchived ? null : (
                        <span className="m">
                          <Icon name="i-search" /> {t.waitingFirst}
                        </span>
                      )}
                      {cheapest ? (
                        <span className="m hl">
                          <Icon name="i-tag" /> {t.cheapest} <b>{cheapest.seller.name}</b>
                        </span>
                      ) : null}
                      {row.volume ? (
                        <span className="m">
                          <Icon name="i-basket" />{" "}
                          {t.needChip
                            .replace("{vol}", fa(row.volume))
                            .replace("{unit}", row.good ? unitLabel(row.good.unit, locale) : "")
                            .replace(
                              "{freq}",
                              row.frequency ? frequencyLabel(row.frequency, locale) : ""
                            )}
                        </span>
                      ) : null}
                      {rel ? (
                        <span className="m">
                          <Icon name="i-clock" /> {rel}
                        </span>
                      ) : null}
                      {!isArchived && !row.watched && row.supplierCount > 0 && bizId ? (
                        <button
                          type="button"
                          className="m warn"
                          disabled={watchMut.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            watchOn(row);
                          }}
                        >
                          <Icon name="i-eye" /> {t.watchOffChip}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {isArchived ? (
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      disabled={archiveMut.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        unarchive(row);
                      }}
                    >
                      {archiveMut.isPending ? <Spinner size={14} /> : null}
                      {t.unarchiveCta}
                    </button>
                  ) : isCold && !row.watched && bizId ? (
                    <div className="cold-cta">
                      <button
                        type="button"
                        className="btn btn-soft btn-sm"
                        disabled={watchMut.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          watchCold(row);
                        }}
                      >
                        {watchMut.isPending ? <Spinner size={14} /> : <Icon className="ic-sm" name="i-eye" />}
                        {t.watchCta}
                      </button>
                      <button
                        type="button"
                        className="mini-info"
                        aria-label={t.watchInfo.title}
                        title={t.watchInfo.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          setWatchInfoOpen(true);
                        }}
                      >
                        <Icon name="i-info" />
                      </button>
                    </div>
                  ) : (
                    <Icon name="i-chev" className="chev" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* فاز ۶ — ردیف‌های «فروشندهٔ ویژه» (جایگاه قیمت‌های دنبال‌شدهٔ خریدار). */}
        {promoRows.length > 0 && !hasSearchOrFilter ? (
          <div className="g2" style={{ marginTop: 10 }}>
            {promoRows.map((r) => (
              <Link
                key={`promo-${r.promo!.promoId}`}
                className="row-card"
                href={`/board/${r.goodId}`}
                style={{ borderColor: "color-mix(in srgb, var(--amber) 42%, transparent)" }}
              >
                <span className="thumb">
                  <Icon name="i-star" />
                </span>
                <div className="body">
                  <div className="t">
                    {r.goodName}{" "}
                    <span className="badge-sponsor">
                      <Icon name="i-star" /> {m.app.board.sponsor}
                    </span>
                  </div>
                  <div className="pl">
                    <b>{money.parts(r.promo!.priceMinor ?? 0, r.promo!.currency).amount}</b>
                    <span className="u">{`${money.parts(r.promo!.priceMinor ?? 0, r.promo!.currency).label} / ${unitLabel(r.unit ?? "KG", locale)}`}</span>
                  </div>
                  <div className="s">
                    {r.promo!.supplier.name}
                    {r.promo!.supplier.city ? ` · ${r.promo!.supplier.city}` : ""}
                  </div>
                </div>
                <Icon className="chev" name="i-chev" />
              </Link>
            ))}
          </div>
        ) : null}

        <div className="hint">
          <Icon name="i-info" />
          <span>{t.hint}</span>
        </div>
      </div>

      <Tabbar active="list" />

      {/* فاز ۱۰ — شیت «دفتر خرید به چه دردی می‌خورد؟» */}
      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} label={t.whatIsTitle}>
        <div className="sheet">
          <div className="grab" />
          <h3>{t.whatIsTitle}</h3>
          <div className="sub">{t.whatIsLead}</div>
          <div className="what-is-rows">
            {t.whatIsRows.map((r, i) => (
              <div className="wi-row" key={i}>
                <span className="n">{fa(i + 1)}</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
          <div className="unit-calc" style={{ marginTop: 12 }}>
            <Icon name="i-share" />
            <span>{t.whatIsFoot}</span>
          </div>
          {biz.slug ? (
            <Link
              className="btn btn-soft btn-lg btn-block"
              href={`/b/${biz.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 10 }}
            >
              <Icon className="ic-sm" name="i-eye" /> {t.previewOpen}
            </Link>
          ) : null}
          <div className="sheet-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setInfoOpen(false)}>
              {t.whatIsClose}
            </button>
          </div>
        </div>
      </Sheet>

      {/* فاز ۱۲ — شیت «رصد یعنی چه؟» (mini-info کارت سرد) */}
      <WatchInfoSheet open={watchInfoOpen} onClose={() => setWatchInfoOpen(false)} />

      {/* فاز ۹ — شیت اشتراک کامل: مخاطبین گوشی + اشتراک سیستمی + کپی + QR */}
      {biz.slug ? (
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          kind="list"
          path={`b/${biz.slug}`}
          entity={biz.name}
          autoContacts={shareContacts}
        />
      ) : null}
    </section>
  );
}
