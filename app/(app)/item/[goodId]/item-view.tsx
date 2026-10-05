"use client";

/**
 * /item/[goodId] — کالای لیست خرید (پورت sc-buy-item از Prototype v18 · فاز ۳).
 *
 * دادهٔ واقعی (Business Source of Truth):
 *   · getSupplyBoard — تابلوی همان کالا: good/watched/volume/frequency/rows
 *   · getWatchedGoods — روند ۷روزهٔ ارزان‌ترین (trendPct) برای هیرو
 *   · followToggle — دنبال‌کردن کاتالوگ تأمین‌کننده (ردیف‌های قیمت)
 *   · setNotifPrefs — سوییچ‌های رصد (priceChange/suggestions از API واقعی)
 *   · unwatchGood + deleteListing — حذف از لیست
 *
 * تطبیق آگاهانه با Prototype (ثبت در MIGRATION-MAP §۴):
 *   · چارت spark هیرو حذف شد — API تاریخچهٔ قیمتِ هر کالا وجود ندارد
 *     (PriceLog از طریق API عمومی افشا نمی‌شود)؛ فاز بعدی می‌تواند اضافه شود
 *   · «ویرایش» (شیت ویرایش نیاز) → فاز ویرایش آیتم؛ فعلاً از مسیر legacy
 *   · سوییچ «تغییر موجودی» حذف شد — NotifPrefs بک‌اند این کلید را ندارد
 *   · دکمهٔ اشتراک حذف شد — کالا هنوز صفحهٔ عمومی ندارد (فاز ۷ · (pub)/p)
 *   · «شرایط» (عندالتحویل و…) در ردیف‌ها غایب — فیلدی در API نیست
 */

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveBusiness } from "@/lib/active-biz";
import {
  useDeleteListing,
  useFollowToggle,
  useSetNotifPrefs,
  useSupplyBoard,
  useUnwatchGood,
  useWatchGood,
  useWatchedGoods,
} from "@/lib/queries";
import type { BoardSupplierDto } from "@/lib/api";
import { fa, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { timeAgo } from "@/lib/format";
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

/** پالت آواتار v18 — همان خانوادهٔ رنگی Prototype */
const AVATAR_BG = ["var(--teal-tint)", "var(--emerald)", "var(--amber)", "var(--fg-soft)", "var(--muted)"];
function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

/** قیمت تومان (priceMinor → تومان) با جداکنندهٔ هزارگان فارسی */
const toman = (minor: number): string => fa(Math.round(minor / 10));

export function ItemView({ goodId }: { goodId: string }) {
  const m = useMessages();
  const t = m.app.item;
  const { locale } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const boardQ = useSupplyBoard(bizId, goodId);
  const watchedQ = useWatchedGoods(bizId);
  const followMut = useFollowToggle();
  const watchMut = useWatchGood();
  const unwatchMut = useUnwatchGood();
  const deleteListingMut = useDeleteListing();
  const notifPrefsMut = useSetNotifPrefs();

  const board = boardQ.data;
  const watchedRow = useMemo(
    () => (watchedQ.data ?? []).find((r) => r.goodId === goodId),
    [watchedQ.data, goodId]
  );

  if (!bizId || boardQ.isLoading) {
    return (
      <section className="screen" data-screen="buy-item">
        <Appbar deskTitle={t.inList} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
            <Spinner size={22} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.app.home.loading}</span>
          </div>
        </div>
        <Tabbar active="list" />
      </section>
    );
  }

  const good = board?.good ?? null;

  if (!good) {
    return (
      <section className="screen" data-screen="buy-item">
        <Appbar deskTitle={t.inList} />
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-basket" />
            </span>
            <h3>{t.notFoundTitle}</h3>
            <p>{t.notFoundSub}</p>
            <Link className="btn btn-primary" href="/home">
              {m.app.home.secList}
            </Link>
          </div>
        </div>
        <Tabbar active="list" />
      </section>
    );
  }

  const name = goodName(good, locale);
  const unit = unitLabel(good.unit, locale);
  const rows = board?.rows ?? [];
  const followedRows = rows.filter((r) => r.followedByMe);
  const otherRows = rows.filter((r) => !r.followedByMe);
  const cheapestRow = rows.reduce<BoardSupplierDto | null>(
    (acc, r) => (!acc || r.priceMinor < acc.priceMinor ? r : acc),
    null
  );
  const hero = watchedRow?.cheapest ?? (cheapestRow ? { priceMinor: cheapestRow.priceMinor } : null);
  const prices = rows.map((r) => r.priceMinor).filter((p) => p > 0);
  const pcts = watchedRow?.trendPct ?? null;
  const suggestRows = otherRows.slice(0, 3);
  const artIcon = ART_BY_CATEGORY[good.category?.slug ?? ""] ?? "i-box";

  const freqLabel = board?.frequency ? frequencyLabel(board.frequency, locale) : null;

  const toggleFollow = (r: BoardSupplierDto, follow: boolean) => {
    if (!bizId) return;
    followMut.mutate({ businessId: bizId, supplierId: r.seller.id, follow });
  };

  const setPref = (patch: Record<string, boolean>) => {
    if (!biz) return;
    notifPrefsMut.mutate({ id: biz.id, ...patch });
  };

  const removeFromList = async () => {
    if (!bizId) return;
    try {
      await unwatchMut.mutateAsync({ businessId: bizId, goodId });
      if (watchedRow?.buyListingId) {
        await deleteListingMut.mutateAsync(watchedRow.buyListingId);
      }
      toast({ title: t.removed });
      router.push("/home");
    } catch {
      toast({ title: m.app.home.copyFailed, variant: "destructive" });
    }
  };

  const prefs = biz?.notifPrefs ?? null;

  return (
    <section className="screen" data-screen="buy-item">
      <Appbar deskTitle={name} />

      <div className="pagehead">
        <Link className="back" href="/home" aria-label={m.app.login.backAria}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{name}</b>
          <span>
            {board?.watched || watchedRow ? `${t.inList} · ${board?.watched ? t.watching : t.notWatching}` : t.notWatching}
          </span>
        </div>
        {board?.watched === false && bizId ? (
          <button
            className="btn btn-soft btn-sm act"
            disabled={watchMut.isPending}
            onClick={() =>
              void watchMut
                .mutateAsync({ businessId: bizId, goodId })
                .then(() => toast({ title: t.watching }))
            }
          >
            {watchMut.isPending ? <Spinner size={12} /> : null} {t.watchCta}
          </button>
        ) : null}
      </div>

      <div className="screen-body">
        <div className={`thumb lg ${good.category?.slug ?? ""}`}>
          <Icon name={artIcon} />
        </div>

        {/* ═══ هیرو: ارزان‌ترین قیمت + روند + بازهٔ بازار ═══ */}
        {hero ? (
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16.5, fontWeight: 700 }}>
                  {toman(hero.priceMinor)}{" "}
                  <small style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
                    {t.tomanUnit.replace("{unit}", unit)}
                  </small>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    marginTop: 4,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {pcts !== null && pcts !== 0 ? (
                    <span className={`trend ${pcts < 0 ? "down" : "up"}`}>
                      <Icon className="ic-sm ic-12" name={pcts < 0 ? "i-tdn" : "i-tup"} /> {fa(Math.abs(pcts))}٪{" "}
                      {pcts < 0 ? t.trendDown : t.trendUp}
                    </span>
                  ) : (
                    <span className="trend flat">{m.app.home.flat}</span>
                  )}
                  {prices.length > 1 ? (
                    <span>
                      {t.marketRange.replace("{a}", toman(Math.min(...prices))).replace("{b}", toman(Math.max(...prices)))}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-eye" />
            </span>
            <h3>{m.app.home.emptyTitle}</h3>
            <p>{m.app.board.empty}</p>
          </div>
        )}

        {/* ═══ قیمت‌های دنبال‌شده ═══ */}
        {rows.length > 0 ? (
          <>
            <div className="sec-title">
              <h2>
                <Icon className="ic-sm" name="i-bm" /> {t.followedTitle.replace("{name}", name)}
              </h2>
              <span className="more">{t.ofN.replace("{n}", fa(followedRows.length)).replace("{m}", fa(rows.length))}</span>
            </div>
            <div className="card" style={{ padding: "4px 14px" }}>
              {followedRows.map((r, i) => (
                <div
                  key={r.listingId}
                  className="follow-row"
                  style={{ borderTop: i === 0 ? "none" : "1px dashed var(--border)" }}
                >
                  <div className="avatar av-sm" style={{ background: avatarBg(r.seller.name), color: "#fff" }}>
                    {r.seller.name.trim().charAt(0)}
                  </div>
                  <span className="tx">
                    <b>
                      {r.seller.name}
                      {r.seller.isVerified ? (
                        <Icon className="ic-sm" name="i-shield" style={{ color: "var(--teal-strong)", marginInlineStart: 4 }} />
                      ) : null}
                      {cheapestRow?.listingId === r.listingId ? (
                        <span className="badge b-green" style={{ marginInlineStart: 4 }}>
                          {t.cheapest}
                        </span>
                      ) : null}
                    </b>
                    <span>
                      {toman(r.priceMinor)} · {timeAgo(r.updatedAt)}
                      {r.stock != null ? ` · ${t.stockN.replace("{n}", fa(r.stock))}` : ""}
                    </span>
                  </span>
                  <span className="badge b-teal">
                    <Icon name="i-bmf" /> {t.followedBadge}
                  </span>
                </div>
              ))}

              {suggestRows.length > 0 ? (
                <>
                  {followedRows.length > 0 ? <div className="promo-suggest">{t.suggestRow}</div> : null}
                  {suggestRows.map((r) => (
                    <div key={r.listingId} className="follow-row" style={{ borderTop: "1px dashed var(--border)" }}>
                      <div className="avatar av-sm" style={{ background: avatarBg(r.seller.name), color: "#fff" }}>
                        {r.seller.name.trim().charAt(0)}
                      </div>
                      <span className="tx">
                        <b>{r.seller.name}</b>
                        <span>
                          {toman(r.priceMinor)}
                          {r.stock != null ? ` · ${t.stockN.replace("{n}", fa(r.stock))}` : ""}
                        </span>
                      </span>
                      <button
                        className="btn btn-primary btn-sm btn-follow-hot"
                        disabled={followMut.isPending}
                        onClick={() => toggleFollow(r, true)}
                      >
                        {followMut.isPending ? <Spinner size={12} /> : <Icon className="ic-sm ic-12" name="i-bm" />}{" "}
                        {t.followBtn}
                      </button>
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          </>
        ) : null}

        <div className="note-c">{t.noteFollowed}</div>

        {/* ═══ درخواست قیمت بهتر — ویزارد استعلام گروهی v18 (فاز ۴) ═══ */}
        <Link className="hero-quote tap" href={`/rfq/${goodId}`}>
          <span className="hq-ico">
            <Icon className="ic-sm" name="i-send" />
          </span>
          <span className="hq-tx">
            <b>{t.quoteTitle}</b>
            <span>{t.quoteSub}</span>
          </span>
          <Icon name="i-chev" className="hq-ch" />
        </Link>

        <div className="btn-row" style={{ marginTop: 10 }}>
          <Link className="btn btn-outline btn-lg" href={`/board/${goodId}`}>
            <Icon className="ic-sm" name="i-arrf" /> {t.otherSuppliers.replace("{n}", fa(rows.length))}
          </Link>
        </div>
        <div className="note-c">{t.noteBoard}</div>

        {/* ═══ نیاز من ═══ */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-basket" /> {t.needTitle}
          </h2>
        </div>
        <div className="card">
          {board?.volume ? (
            <>
              <div className="qty-stepper" title={t.needNone}>
                <button type="button" disabled aria-hidden style={{ opacity: 0.5, cursor: "default" }}>
                  −
                </button>
                <span className="val">
                  {fa(board.volume)} <span className="unit">{unit}</span>
                </span>
                <button type="button" disabled aria-hidden style={{ opacity: 0.5, cursor: "default" }}>
                  +
                </button>
              </div>
              <div className="unit-chips" style={{ marginTop: 9 }}>
                <span className={`chip${board.frequency === "WEEKLY" ? " active" : ""}`}>{t.freqWeekly}</span>
                <span className={`chip${board.frequency === "MONTHLY" ? " active" : ""}`}>{t.freqMonthly}</span>
                <span className={`chip${board.frequency === "OCCASIONAL" ? " active" : ""}`}>{t.freqOccasional}</span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.9 }}>{t.needNone}</div>
          )}
          {biz?.city ? (
            <div className="follow-row" style={{ borderTop: "1px dashed var(--border)", marginTop: 9, paddingTop: 12 }}>
              <Icon className="ic-sm" name="i-pin" style={{ color: "var(--muted)" }} />
              <span className="tx">
                <b style={{ fontSize: 12.5 }}>{t.delivery.replace("{city}", biz.city)}</b>
                <span>{t.deliverySub}</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* ═══ رصد و اطلاع‌رسانی — سوییچ‌های واقعی NotifPrefs ═══ */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-eye" /> {t.watchTitle}
          </h2>
        </div>
        <div className="card">
          <div className="follow-row" style={{ borderBottom: "1px dashed var(--border)" }}>
            <Icon className="ic" name="i-chart" style={{ color: "var(--muted)" }} />
            <span className="tx">
              <b>{t.watchPrice}</b>
              <span>{t.watchPriceSub}</span>
            </span>
            <button
              type="button"
              className={`switch${prefs?.priceChange !== false ? " on arm" : ""}`}
              role="switch"
              aria-checked={prefs?.priceChange !== false}
              aria-label={t.watchPrice}
              disabled={notifPrefsMut.isPending}
              onClick={() => setPref({ priceChange: prefs?.priceChange === false })}
            />
          </div>
          <div className="follow-row">
            <Icon className="ic" name="i-users" style={{ color: "var(--muted)" }} />
            <span className="tx">
              <b>{t.watchNew}</b>
              <span>{t.watchNewSub}</span>
            </span>
            <button
              type="button"
              className={`switch${prefs?.suggestions !== false ? " on arm" : ""}`}
              role="switch"
              aria-checked={prefs?.suggestions !== false}
              aria-label={t.watchNew}
              disabled={notifPrefsMut.isPending}
              onClick={() => setPref({ suggestions: prefs?.suggestions === false })}
            />
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 9 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: "var(--red)", margin: "12px auto", display: "block" }}
            disabled={unwatchMut.isPending || deleteListingMut.isPending}
            onClick={() => void removeFromList()}
          >
            <Icon className="ic-sm" name="i-trash" /> {t.remove}
          </button>
        </div>
      </div>

      <Tabbar active="list" />
    </section>
  );
}
