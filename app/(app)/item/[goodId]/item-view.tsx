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
 * فاز ۱۲ (پورت فاز ۱۱ پروتوتایپ — حکم مالک):
 *   · pair-cta: «دنبال‌کردن تأمین‌کنندگان دیگر» + «درخواست قیمت بهتر» —
 *     پیوسته با کارتِ قیمت‌های دنبال‌شده، هم‌سبک و کنارِ هم
 *   · بخش «مدیریت کالا»: ویرایش نیاز خرید (شیت واقعی → saveListing) ·
 *     تعویض عکس (آپلود گالری آگهی) · آرشیو موقت (رصد می‌ماند) ·
 *     حذف کوچک ته فرم (danger-quiet + تأیید)
 *   · آیکون «رصد چیست؟» کنار عنوان بخش + توستِ توضیحی بعد از فعال‌سازی
 *   · getSupplyBoard فاز ۱۲: buyListingId/buyMode/buySell — ویرایشِ BOTH
 *     سمت فروش را نمی‌شکند (spec فروش همان‌طور برگردانده می‌شود)
 *
 * تطبیق آگاهانه با Prototype (ثبت در MIGRATION-MAP §۴):
 *   · چارت spark هیرو حذف شد — API تاریخچهٔ قیمتِ هر کالا وجود ندارد
 *   · سوییچ «تغییر موجودی» حذف شد — NotifPrefs بک‌اند این کلید را ندارد
 *   · «شرایط» (عندالتحویل و…) در ردیف‌ها غایب — فیلدی در API نیست
 */

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveBusiness } from "@/lib/active-biz";
import {
  useDeleteListing,
  useFollowToggle,
  useMyListings,
  useSaveListing,
  useSetNotifPrefs,
  useSupplyBoard,
  useUnwatchGood,
  useUploadFile,
  useWatchGood,
  useArchiveWatchedGood,
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
import { Sheet } from "@/components/imach/sheet";
import { Spinner } from "@/components/imach/spinner";
import { NumberInput } from "@/components/number-input";
import { WatchInfoSheet } from "@/components/imach/watch-info-sheet";
import { useMoney } from "@/components/imach/currency-context";
import { useToast } from "@/hooks/use-toast";

/** نگاشت دستهٔ کالا → آیکون هنری Prototype (فاقد نقش هنری → آیکون جعبه) */
const ART_BY_CATEGORY: Record<string, IconName> = {
  rice: "a-rice",
  oil: "a-oil",
  sugar: "a-sugar",
  lentil: "a-lentil",
};

const FREQS = ["WEEKLY", "MONTHLY", "OCCASIONAL"] as const;

/** پالت آواتار v18 — همان خانوادهٔ رنگی Prototype */
const AVATAR_BG = ["var(--teal-tint)", "var(--emerald)", "var(--amber)", "var(--fg-soft)", "var(--muted)"];
function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

export function ItemView({ goodId }: { goodId: string }) {
  const m = useMessages();
  const t = m.app.item;
  const { locale } = useLocale();
  // فاز ۸ — قیمت‌ها در ارز نمایش (نرخ تقریبی)
  const money = useMoney();
  /** قیمت در ارز نمایش با جداکنندهٔ هزارگان */
  const toman = (minor: number, currency?: string | null): string => money.parts(minor, currency).amount;
  const { toast } = useToast();
  const router = useRouter();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const boardQ = useSupplyBoard(bizId, goodId);
  const watchedQ = useWatchedGoods(bizId);
  // فاز ۱۲ — گالری آگهی BUY برای «تعویض عکس» (شامل غیرفعال = آرشیوشده)
  const myListingsQ = useMyListings(bizId, { includeInactive: true });
  const followMut = useFollowToggle();
  const watchMut = useWatchGood();
  const unwatchMut = useUnwatchGood();
  const deleteListingMut = useDeleteListing();
  const notifPrefsMut = useSetNotifPrefs();
  const saveMut = useSaveListing();
  const uploadMut = useUploadFile();
  const archiveMut = useArchiveWatchedGood();

  // ── فاز ۱۲ — شیت‌ها و تأییدها ──
  const [editOpen, setEditOpen] = useState(false);
  const [watchInfoOpen, setWatchInfoOpen] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [editVol, setEditVol] = useState<number | null>(null);
  const [editFreq, setEditFreq] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const board = boardQ.data;
  const watchedRow = useMemo(
    () => (watchedQ.data ?? []).find((r) => r.goodId === goodId),
    [watchedQ.data, goodId]
  );
  const myBuyListing = useMemo(
    () =>
      (myListingsQ.data ?? []).find(
        (l) => l.good.id === goodId && (l.mode === "BUY" || l.mode === "BOTH")
      ),
    [myListingsQ.data, goodId]
  );
  const listingPhoto = myBuyListing?.gallery?.[0]?.thumbUrl ?? myBuyListing?.gallery?.[0]?.url ?? null;
  const buyListingId = board?.buyListingId ?? watchedRow?.buyListingId ?? null;
  const buyMode = board?.buyMode ?? null;
  const buySell = board?.buySell ?? null;

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
  const hero =
    watchedRow?.cheapest ??
    (cheapestRow ? { priceMinor: cheapestRow.priceMinor, currency: cheapestRow.currency } : null);
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

  // ── فاز ۱۲ — ویرایش نیاز خرید (شیت واقعی → saveListing) ──
  const openEdit = () => {
    setEditVol(board?.volume ?? watchedRow?.volume ?? null);
    setEditFreq(board?.frequency ?? watchedRow?.frequency ?? "MONTHLY");
    setEditOpen(true);
  };

  const saveNeed = async () => {
    if (!bizId || !editVol || editVol <= 0 || !editFreq) return;
    try {
      await saveMut.mutateAsync({
        businessId: bizId,
        goodId,
        ...(buyListingId ? { listingId: buyListingId } : {}),
        mode: buyMode === "BOTH" ? "BOTH" : "BUY",
        // ویرایشِ BOTH نباید سمت فروش را بزند — spec فروش همان‌طور برمی‌گردد
        ...(buyMode === "BOTH" && buySell
          ? {
              sell: {
                priceMinor: buySell.priceMinor,
                stock: buySell.stock ?? 0,
                minOrder: buySell.minOrder ?? 1,
              },
            }
          : {}),
        buy: { volume: editVol, frequency: editFreq },
      });
      toast({ title: t.editSavedToast });
      setEditOpen(false);
    } catch {
      toast({ title: t.editFailedToast, variant: "destructive" });
    }
  };

  // ── فاز ۱۲ — تعویض عکس: آپلود واقعی به گالریِ آگهی BUY ──
  const onPickPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !buyListingId || !bizId) return;
    uploadMut.mutate(
      { file, model: "Listing", modelId: buyListingId, key: "gallery" },
      {
        onSuccess: () => toast({ title: t.photoToast }),
        onError: () => toast({ title: t.photoFailed, variant: "destructive" }),
      }
    );
  };

  // ── فاز ۱۲ — آرشیو موقت: رصد و تاریخچه می‌ماند ──
  const archiveItem = async () => {
    if (!bizId) return;
    try {
      await archiveMut.mutateAsync({ businessId: bizId, goodId, archived: true });
      toast({ title: t.archivedToastN.replace("{name}", name) });
      router.push("/home");
    } catch {
      toast({ title: m.app.home.copyFailed, variant: "destructive" });
    }
  };

  const removeFromList = async () => {
    if (!bizId) return;
    try {
      await unwatchMut.mutateAsync({ businessId: bizId, goodId });
      if (buyListingId) {
        await deleteListingMut.mutateAsync(buyListingId);
      }
      toast({ title: t.removedToastN.replace("{name}", name) });
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
        {/* فاز ۱۲ — ویرایش نیاز خرید (میان‌بر صفحه) */}
        <button type="button" className="btn btn-soft btn-sm act" onClick={openEdit}>
          <Icon className="ic-sm" name="i-edit" /> {t.edit}
        </button>
      </div>

      <div className="screen-body">
        <div className={`thumb lg ${good.category?.slug ?? ""}`}>
          {listingPhoto ? (
            <img
              src={listingPhoto}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            />
          ) : (
            <Icon name={artIcon} />
          )}
        </div>

        {/* ═══ هیرو: ارزان‌ترین قیمت + روند + بازهٔ بازار ═══ */}
        {hero ? (
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16.5, fontWeight: 700 }}>
                  {toman(hero.priceMinor, hero.currency)}{" "}
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

        {/* ═══ قیمت‌های دنبال‌شده + pair-cta پیوسته با همان کارت (فاز ۱۲) ═══ */}
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
                      {toman(r.priceMinor, r.currency)} · {timeAgo(r.updatedAt)}
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
                          {toman(r.priceMinor, r.currency)}
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

              {/* فاز ۱۲ — pair-cta: دنبال‌کردن تأمین‌کنندگان دیگر + درخواست قیمت بهتر */}
              <div className="pair-cta">
                <Link className="pc-btn" href={`/board/${goodId}`}>
                  <span className="pc-ico">
                    <Icon className="ic-sm" name="i-arrf" />
                  </span>
                  <span className="pc-tx">
                    <b>{t.pairFollow}</b>
                    <i>{t.pairFollowSub.replace("{n}", fa(rows.length))}</i>
                  </span>
                </Link>
                <Link className="pc-btn" href={`/rfq/${goodId}`}>
                  <span className="pc-ico">
                    <Icon className="ic-sm" name="i-send" />
                  </span>
                  <span className="pc-tx">
                    <b>{t.pairRfq}</b>
                    <i>{t.pairRfqSub}</i>
                  </span>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: "4px 14px" }}>
            {/* کالای سرد — pair-cta تنها: راهِ رسیدن به اولین تأمین‌کننده */}
            <div className="pair-cta" style={{ margin: "4px -14px -4px" }}>
              <Link className="pc-btn" href={`/board/${goodId}`}>
                <span className="pc-ico">
                  <Icon className="ic-sm" name="i-arrf" />
                </span>
                <span className="pc-tx">
                  <b>{t.pairFollow}</b>
                  <i>{t.pairFollowSub.replace("{n}", fa(rows.length))}</i>
                </span>
              </Link>
              <Link className="pc-btn" href={`/rfq/${goodId}`}>
                <span className="pc-ico">
                  <Icon className="ic-sm" name="i-send" />
                </span>
                <span className="pc-tx">
                  <b>{t.pairRfq}</b>
                  <i>{t.pairRfqSub}</i>
                </span>
              </Link>
            </div>
          </div>
        )}

        <div className="note-c">{t.noteFollowed}</div>

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

        {/* ═══ رصد و اطلاع‌رسانی — سوییچ‌های واقعی NotifPrefs + «رصد چیست؟» (فاز ۱۲) ═══ */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-eye" /> {t.watchTitle}
          </h2>
          <button
            type="button"
            className="info-mini"
            aria-label={m.app.home.watchInfo.title}
            title={m.app.home.watchInfo.title}
            onClick={() => setWatchInfoOpen(true)}
          >
            <Icon name="i-info" />
          </button>
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
          {board?.watched === false && bizId ? (
            <div style={{ padding: "10px 2px 4px" }}>
              <button
                type="button"
                className="btn btn-soft btn-sm btn-block"
                disabled={watchMut.isPending}
                onClick={() =>
                  void watchMut
                    .mutateAsync({ businessId: bizId, goodId })
                    .then(() =>
                      toast({
                        title: t.watchToastN.replace("{name}", name),
                        description: t.watchToastDesc,
                      })
                    )
                }
              >
                {watchMut.isPending ? <Spinner size={12} /> : <Icon className="ic-sm" name="i-eye" />} {t.watchCta}
              </button>
            </div>
          ) : null}
        </div>

        {/* ═══ فاز ۱۲ — مدیریت کالا: ویرایش نیاز / عکس / آرشیو ═══ */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-gear" /> {t.manageTitle}
          </h2>
        </div>
        <div className="card">
          <div className="follow-row" style={{ borderBottom: "1px dashed var(--border)" }}>
            <Icon className="ic" name="i-edit" style={{ color: "var(--muted)" }} />
            <span className="tx">
              <b>{t.editNeed}</b>
              <span>{t.editNeedSub}</span>
            </span>
            <button type="button" className="btn btn-soft btn-sm" onClick={openEdit}>
              <Icon className="ic-sm ic-12" name="i-edit" /> {t.edit}
            </button>
          </div>
          <div className="follow-row" style={{ borderBottom: "1px dashed var(--border)" }}>
            <Icon className="ic" name="i-img" style={{ color: "var(--muted)" }} />
            <span className="tx">
              <b>{t.photoRow}</b>
              <span>{buyListingId ? t.photoSub : t.photoNeed}</span>
            </span>
            {buyListingId ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onPickPhoto}
                  aria-label={t.photoRow}
                />
                <button
                  type="button"
                  className="btn btn-soft btn-sm"
                  disabled={uploadMut.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploadMut.isPending ? <Spinner size={12} /> : null}
                  {t.photoBtn}
                </button>
              </>
            ) : null}
          </div>
          <div className="follow-row">
            <Icon className="ic" name="i-inbox" style={{ color: "var(--muted)" }} />
            <span className="tx">
              <b>{t.archiveRow}</b>
              <span>{t.archiveRowSub}</span>
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={archiveMut.isPending}
              onClick={() => setArchiveConfirm(true)}
            >
              {t.archiveBtn}
            </button>
          </div>
          {archiveConfirm ? (
            <div className="stop-confirm">
              <Icon name="i-info" />
              <span>{t.archiveConfirm}</span>
              <span className="sc-btns">
                <button type="button" className="sc-no" onClick={() => setArchiveConfirm(false)}>
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className="sc-yes"
                  disabled={archiveMut.isPending}
                  onClick={() => void archiveItem()}
                >
                  {archiveMut.isPending ? <Spinner size={10} /> : null}
                  {t.archiveYes}
                </button>
              </span>
            </div>
          ) : null}
        </div>

        {/* ═══ فاز ۱۲ — حذف: آیکون کوچک ته فرم + تأیید ═══ */}
        <div className="item-danger">
          <button type="button" className="danger-quiet" onClick={() => setRemoveConfirm((v) => !v)}>
            <Icon name="i-trash" /> {t.dangerRemove}
          </button>
          {removeConfirm ? (
            <div className="stop-confirm">
              <Icon name="i-info" />
              <span>{t.removeConfirm}</span>
              <span className="sc-btns">
                <button type="button" className="sc-no" onClick={() => setRemoveConfirm(false)}>
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className="sc-yes"
                  disabled={unwatchMut.isPending || deleteListingMut.isPending}
                  onClick={() => void removeFromList()}
                >
                  {unwatchMut.isPending || deleteListingMut.isPending ? <Spinner size={10} /> : null}
                  {t.removeYes}
                </button>
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <Tabbar active="list" />

      {/* فاز ۱۲ — شیت ویرایش نیاز خرید */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} label={t.editSheetTitle}>
        <div className="sheet">
          <div className="grab" />
          <h3>{t.editSheetTitle}</h3>
          <div className="sub">
            {t.editSheetSub} — {name}
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="field" style={{ marginBottom: 4 }}>
              <label htmlFor="edit-vol">{t.editVolume}</label>
              <NumberInput
                id="edit-vol"
                value={editVol}
                onChange={setEditVol}
                locale={locale === "en" ? "en" : "fa"}
                min={1}
                suffix={unit}
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>{t.editFreq}</label>
              <div className="unit-chips" style={{ marginTop: 6 }}>
                {FREQS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`chip${editFreq === f ? " active" : ""}`}
                    onClick={() => setEditFreq(f)}
                  >
                    {frequencyLabel(f, locale)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={saveMut.isPending || !editVol || editVol <= 0 || !editFreq}
              onClick={() => void saveNeed()}
            >
              {saveMut.isPending ? <Spinner size={14} /> : <Icon className="ic-sm" name="i-check" />} {t.editSave}
            </button>
          </div>
        </div>
      </Sheet>

      {/* فاز ۱۲ — شیت «رصد یعنی چه؟» */}
      <WatchInfoSheet open={watchInfoOpen} onClose={() => setWatchInfoOpen(false)} />
    </section>
  );
}
