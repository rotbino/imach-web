"use client";

/**
 * /home — خانهٔ خریدار (پورت sc-buy-list · فاز ۲: دادهٔ واقعی از API).
 *
 * Vertical Slice کامل فاز ۲ — مهاجرت UI→API→DB→UI:
 *   · ردیف‌ها = WatchedGoodها (خلاصهٔ تابلوی تأمین: ارزان‌ترین/روند/شمار تأمین‌کننده)
 *   · بج پیشنهادها = answeredCount · کاتالوگ‌های ذخیره = فالوها
 *   · نوار اشتراک = slug واقعی + Web Share/کلیپ‌بورد
 *   · ردیف سرد (بی‌تأمین‌کننده) = فعال‌سازی رصد با watchGood واقعی
 *   · «آخرین به‌روزرسانی» = جدیدترین updatedAt تابلوی همان کالا
 *
 * نگاشت آگاهانه داده (ثبت در MIGRATION-MAP §۴):
 *   بج b-teal «N دنبال‌شده» پروتوتایپ → بج b-stone «N تأمین‌کننده» (دادهٔ صادقانهٔ موجود)
 *   pulse-dot = watched · b-orange «قیمت تازه» = priceChanged
 */

import { useMemo } from "react";
import Link from "next/link";
import { useActiveBusiness } from "@/lib/active-biz";
import { useMyBusinesses, useWatchedGoods, useMyInquiries, useFollows, usePriceBoard, useWatchGood } from "@/lib/queries";
import type { WatchedRowDto } from "@/lib/api";
import { fa, fmtMoney, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon, type IconName } from "@/components/imach/icon";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";

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

export function BuyerHome() {
  const m = useMessages();
  const t = m.app.home;
  const { locale } = useLocale();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const businesses = useMyBusinesses();
  const bizId = biz?.id ?? null;

  const watched = useWatchedGoods(bizId);
  const inquiries = useMyInquiries(bizId);
  const follows = useFollows(bizId);
  const board = usePriceBoard(bizId);
  const watchMut = useWatchGood();

  const rows = useMemo(() => watched.data ?? [], [watched.data]);
  const freshCount = useMemo(() => rows.filter((r) => r.priceChanged).length, [rows]);
  const offersCount = inquiries.data?.answeredCount ?? 0;
  const followsCount = follows.data?.length ?? 0;

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

  const shareList = async () => {
    if (!biz?.slug || typeof window === "undefined") return;
    const url = `${window.location.origin}/b/${biz.slug}`;
    const shareData = { title: biz.name, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      throw new Error("no-web-share");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: t.linkCopied });
      } catch {
        toast({ title: t.copyFailed, variant: "destructive" });
      }
    }
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

  const bizName = biz.name;

  return (
    <section className="screen" data-screen="buy-list">
      <Appbar deskTitle={t.secList} />

      <div className="screen-body">
        <div className="greet">
          <b>{t.greetTitle.replace("{biz}", bizName)}</b>
          <span>
            {freshCount > 0
              ? t.greetSubFresh.replace("{n}", fa(freshCount))
              : t.greetSubCalm}
          </span>
        </div>

        <div className="btn-row" style={{ margin: "10px 0 4px" }}>
          <Link className="btn btn-primary" href="/new" style={{ flex: 1 }}>
            <Icon className="ic-sm" name="i-plus" /> {t.addCta}
          </Link>
        </div>

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
          <button className="btn btn-soft btn-sm" onClick={() => void shareList()}>
            {t.shareCta}
          </button>
        </div>

        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-list" /> {t.secList}
          </h2>
          <Link className="more" href="/buy/requests">
            {offersCount > 0 ? <span className="badge b-teal">{fa(offersCount)}</span> : null} {t.offersLink}
          </Link>
        </div>

        <Link className="saved-strip" href="/buy/suppliers">
          <span className="ico">
            <Icon name="i-bm" />
          </span>
          <span className="txt">
            <b>{t.savedStripTitle}</b>
            <span>{t.savedStripSubN.replace("{n}", fa(followsCount))}</span>
          </span>
          <Icon name="i-chev" className="chev" />
        </Link>

        {rows.length === 0 ? (
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-basket" />
            </span>
            <h3>{t.emptyTitle}</h3>
            <p>{t.emptySub}</p>
            <Link className="btn btn-primary" href="/new">
              <Icon className="ic-sm" name="i-plus" /> {t.addCta}
            </Link>
          </div>
        ) : (
          <div className="g2">
            {rows.map((row) => {
              const name = row.good ? goodName(row.good, locale) : "—";
              const isCold = row.supplierCount === 0;
              const cheapest = row.cheapest;
              const rel = relTime(lastUpdateByGood.get(row.goodId));
              const needParts = row.volume
                ? t.needLine
                    .replace("{vol}", fa(row.volume))
                    .replace("{unit}", row.good ? unitLabel(row.good.unit, locale) : "")
                    .replace("{freq}", row.frequency ? frequencyLabel(row.frequency, locale) : "")
                : null;

              const subParts: Array<string | { b: string }> = [];
              if (cheapest) {
                subParts.push("ارزان‌ترین: ", { b: cheapest.seller.name });
                if (row.supplierCount > 0) {
                  subParts.push(
                    ` · ${t.inBoardN.replace("{n}", fa(row.supplierCount))}`
                  );
                }
                if (rel) subParts.push(` · ${t.lastUpdate}: ${rel}`);
              } else if (needParts) {
                // ردیف سرد با نیاز ثبت‌شده: نیاز + وضعیت رصد
                subParts.push(needParts, ` · ${t.coldWatched}`);
              } else {
                subParts.push(t.coldWatched);
              }

              const pct = row.trendPct;

              return (
                <div className={isCold ? "row-card dashed" : "row-card"} key={`${row.goodId}-${row.buyListingId ?? "w"}`}>
                  <Link className="thumb" href={`/item/${row.goodId}`} aria-label={name}>
                    <Icon name={artOf(row)} />
                  </Link>
                  <div className="body">
                    <div className="t">
                      <Link href={`/item/${row.goodId}`}>{name}</Link>
                      {row.watched ? <span className="pulse-dot" title="رصد فعال" /> : null}
                      {row.variantLabel ? <span className="badge b-stone">{row.variantLabel}</span> : null}
                      {row.supplierCount > 0 ? (
                        <span className="badge b-stone">
                          <Icon name="i-users" /> {fa(row.supplierCount)} {t.suppliers}
                        </span>
                      ) : null}
                    </div>
                    {cheapest ? (
                      <div className="pl">
                        <b>{fa(cheapest.priceMinor / 10)}</b>
                        <span className="u">{`تومان / ${row.good ? unitLabel(row.good.unit, locale) : ""}`}</span>
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
                    <div className="s">
                      {subParts.map((p, i) =>
                        typeof p === "string" ? <span key={i}>{p}</span> : <b key={i}>{p.b}</b>
                      )}
                    </div>
                  </div>
                  {isCold && !row.watched && bizId ? (
                    <button
                      className="btn btn-soft btn-sm"
                      disabled={watchMut.isPending}
                      onClick={() => watchMut.mutate({ businessId: bizId, goodId: row.goodId })}
                    >
                      {watchMut.isPending ? <Spinner size={14} /> : null}
                      {t.watchCta}
                    </button>
                  ) : (
                    <Icon name="i-chev" className="chev" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="hint">
          <Icon name="i-info" />
          <span>{t.hint}</span>
        </div>
      </div>

      <Tabbar active="list" />
    </section>
  );
}
