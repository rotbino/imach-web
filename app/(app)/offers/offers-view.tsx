"use client";

/**
 * پیشنهادها — پورت کامل sc-offers (v18 · فاز ۴ مهاجرت).
 *
 * دادهٔ واقعی: getMyRfqs — یک کارت per «استعلام گروهی» (rfqGroupId) +
 * پیشنهادهای رسیده با وضعیت خصوصی خریدار. موبایل: لیست → جزئیات
 * (رفت‌وبرگشت) · دسکتاپ ≥1024: اسپلیت کنار-هم (#rfqListView/#rfqDetailView
 * همان idهای CSS پورت‌شده).
 *
 * فیلتر «نشان‌دار» + مرتب‌سازی «کمترین قیمت / جدیدترین» سمت کلاینت.
 * وضعیت پیشنهاد = POST /market/setOfferStatus (sheet-offer-status).
 * «دوباره درخواست بده» (C1-3) = ویزارد با ?from= گروه.
 *
 * تطبیق آگاهانه (MIGRATION-MAP §۴):
 *   · search-strip حذف شد — مسیر جستجوی جهانی (/search) هنوز ساخته نشده
 *   · «پاسخ در N ساعت · ٪پاسخگویی» → «شهر · N پیش» (دادهٔ صادقانهٔ موجود)
 *   · دکمهٔ چت حذف شد — بک‌اند چت فاز ۶ است
 *   · تماس = لینک tel: مستقیم (شیت تماس کامل با مخاطبین، فاز ۶)
 *   · «۳ روز باز» از createdAt گروه مشتق می‌شود (پنجرهٔ ۳روزهٔ استعلام)
 *   · اشتراک‌گذاری درخواست (r/slug) تا فاز ۷ (صفحات عمومی) تعویق افتاد
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveBusiness } from "@/lib/active-biz";
import { useMyRfqs, useSetOfferStatus, useStartThread } from "@/lib/queries";
import type { RfqGroupDto, RfqOfferDto } from "@/lib/api";
import { fa, fmtMoney, goodName, timeAgo, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon, type IconName } from "@/components/imach/icon";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Sheet } from "@/components/imach/sheet";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";

/** پنجرهٔ بازِ استعلام (روز) — «پیشنهادها تا ۳ روز باز می‌مانند» */
const OPEN_DAYS = 3;

const ART_BY_CATEGORY: Record<string, IconName> = { rice: "a-rice", oil: "a-oil", sugar: "a-sugar", lentil: "a-lentil" };

/** وضعیت پیشنهاد → بج/آیکون (همان OSTATMETA Prototype) */
type Status = "INTERESTED" | "CONTACTED" | "REVIEWED";
const STATUS_META: Record<Status, { badge: string; icon: IconName; btn: IconName; color: string; label: string }> = {
  INTERESTED: { badge: "b-amber", icon: "i-bmf", btn: "i-bm", color: "var(--amber)", label: "stInterested" },
  CONTACTED: { badge: "b-teal", icon: "i-tel", btn: "i-tel", color: "var(--teal-tint-fg)", label: "stContacted" },
  REVIEWED: { badge: "b-green", icon: "i-check", btn: "i-check", color: "var(--emerald)", label: "stReviewed" },
};

const daysOpen = (iso: string): number => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return Math.max(0, OPEN_DAYS - d);
};

function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ["var(--teal-deep)", "var(--emerald)", "var(--amber)", "var(--fg-soft)", "var(--muted)"][h % 5];
}

/** کلیدهای canonical زمان تحویل/شرایط → برچسب چندزبانه؛ legacy خام */
const PAY_LABELS: Record<string, string> = {
  CASH: "payCash",
  ON_DELIV: "payOnDeliv",
  CHEQUE_30: "payCheque30",
};
const DELIV_LABELS: Record<string, string> = {
  URGENT: "timeUrgent",
  "3D": "time3d",
  WEEK: "timeWeek",
  FLEX: "timeFlex",
  SAME_DAY: "delivSame",
  NEXT: "delivNext",
  "2D": "deliv2d",
};
function payLabel(raw: string | null, t: Record<string, string>): string {
  if (!raw) return "—";
  const k = PAY_LABELS[raw];
  return k ? (t[k] as string) : raw;
}
function delivLabel(raw: string | null, t: Record<string, string>): string {
  if (!raw) return "—";
  const k = DELIV_LABELS[raw];
  return k ? (t[k] as string) : raw;
}

/** برچسب واحد پول برای price-line — «تومان / کیلو» */
const currencyWord = (currency: string, locale: string): string =>
  currency === "IRR" ? (locale === "en" ? "Toman" : "تومان") : currency;

/** کارت پیشنهاد (sup-card) — تماس/وضعیت + قیمت + شرایط */
/** فاز ۶ — دکمهٔ چت روی کارت پیشنهاد (همان sc-offers Prototype): شروع گفتگو با تأمین‌کنندهٔ این پیشنهاد */
function ChatButton({ sellerId }: { sellerId: string }) {
  const m = useMessages();
  const router = useRouter();
  const biz = useActiveBusiness();
  const startThread = useStartThread();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (!biz || busy) return;
    setBusy(true);
    try {
      const res = await startThread.mutateAsync({ businessId: biz.id, withBusinessId: sellerId });
      router.push(`/msgs/${res.id}`);
    } catch {
      setBusy(false);
    }
  };

  return (
    <button
      className="btn btn-soft btn-sm"
      onClick={() => void open()}
      disabled={busy || !biz}
      aria-label={`${m.app.tabs.chat} — ${sellerId}`}
    >
      <Icon className="ic-sm" name="i-msg" />
      {m.app.tabs.chat}
    </button>
  );
}

function OfferCard({
  offer,
  unit,
  locale,
  cheapest,
  t,
  labels,
  onStatus,
}: {
  offer: RfqOfferDto;
  unit: string;
  locale: string;
  cheapest: boolean;
  t: Record<string, string>;
  labels: Record<string, string>;
  onStatus: () => void;
}) {
  const st = (offer.status as Status | null) ?? null;
  const meta = st ? STATUS_META[st] : null;
  return (
    <div className="card sup-card">
      <div className="head">
        <div className="avatar" style={{ background: avatarBg(offer.seller.name) }}>
          {offer.seller.name.trim().charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">
            {offer.seller.name} {cheapest ? <span className="badge b-green">{t.cheapest}</span> : null}
          </div>
          <div className="mt">
            <span>{offer.seller.city || "—"}</span>
            <span>{timeAgo(offer.createdAt)}</span>
          </div>
        </div>
        {meta ? (
          <span className={`badge st-badge ${meta.badge}`}>
            <Icon name={meta.btn} />
            {t[meta.label] as string}
          </span>
        ) : null}
      </div>

      <div className="price-line">
        <span className="p">{fmtMoney(offer.priceMinor, offer.currency, locale)}</span>
        <span className="u">
          {currencyWord(offer.currency, locale)} / {unit}
        </span>
      </div>

      <div className="spec-grid">
        <div className="spec">
          <span className="k">{t.termPay}</span>
          <span className="v">{payLabel(offer.payTerm, labels)}</span>
        </div>
        <div className="spec">
          <span className="k">{t.termDeliv}</span>
          <span className="v">{delivLabel(offer.delivTerm, labels)}</span>
        </div>
      </div>

      <div className="acts">
        <ChatButton sellerId={offer.sellerId} />
        {offer.seller.phone ? (
          <a
            className="btn btn-soft btn-sm"
            href={`tel:${offer.seller.phone}`}
            aria-label={`${t.call} ${offer.seller.name}`}
          >
            <Icon className="ic-sm" name="i-tel" />
            {t.call}
          </a>
        ) : null}
        <button
          className={`icon-follow mark-btn${meta ? " on" : ""}`}
          style={meta ? { color: meta.color } : undefined}
          aria-label={t.statusAria}
          onClick={onStatus}
        >
          <Icon className="ic" name={meta ? meta.icon : "i-bm"} />
        </button>
      </div>
    </div>
  );
}

export function OffersView() {
  const m = useMessages();
  const t = m.app.offers as unknown as Record<string, string>;
  /** دیکشنری ترکیبی برای نگاشت کلیدهای canonical (زمان/شرایط در چند namespace) */
  const labels = useMemo(
    () => ({ ...(m.app.rfq as unknown as Record<string, string>), ...t, ...(m.app.quote as unknown as Record<string, string>) }),
    [m, t]
  );
  const { locale } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const rfqsQ = useMyRfqs(bizId);
  const statusMut = useSetOfferStatus();

  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "marked">("all");
  const [sort, setSort] = useState<"price" | "new">("price");
  const [sheetOffer, setSheetOffer] = useState<RfqOfferDto | null>(null);

  const groups = useMemo(() => rfqsQ.data?.groups ?? [], [rfqsQ.data]);
  const recent = rfqsQ.data?.recentOfferCount ?? 0;
  const active = useMemo(() => groups.find((g) => g.id === openId) ?? null, [groups, openId]);

  const openDetail = (id: string) => {
    setOpenId(id);
    setFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const offers = useMemo(() => {
    if (!active) return [];
    const list = [...active.offers];
    const filtered = filter === "marked" ? list.filter((o) => o.status) : list;
    filtered.sort((a, b) =>
      sort === "price" ? a.priceMinor - b.priceMinor : b.createdAt.localeCompare(a.createdAt)
    );
    return filtered;
  }, [active, filter, sort]);

  const cheapestId = useMemo(() => {
    if (!active || active.offers.length === 0) return null;
    return active.offers.reduce<string | null>(
      (acc, o) => (active.offers.some((x) => x.priceMinor < o.priceMinor) ? acc : o.id),
      null
    );
  }, [active]);

  const setStatus = (offer: RfqOfferDto, status: "INTERESTED" | "CONTACTED" | "REVIEWED" | "NONE") => {
    statusMut.mutate(
      { id: offer.id, status },
      {
        onSuccess: () => {
          setSheetOffer(null);
          const label =
            status === "NONE"
              ? t.stNone
              : (t[STATUS_META[status as Status].label] as string);
          toast({ title: (t.markToast as string).replace("{st}", label) });
        },
      }
    );
  };

  // ── حالت بارگذاری ──
  if (!bizId || rfqsQ.isLoading) {
    return (
      <section className="screen" data-screen="offers">
        <Appbar deskTitle={t.title} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
            <Spinner size={22} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.app.home.loading}</span>
          </div>
        </div>
        <Tabbar active="offers" />
      </section>
    );
  }

  // ── خالی ──
  if (groups.length === 0) {
    return (
      <section className="screen" data-screen="offers">
        <Appbar deskTitle={t.title} />
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-spark" />
            </span>
            <h3>{t.emptyTitle}</h3>
            <p>{t.emptySub}</p>
            <Link className="btn btn-primary" href="/home">
              {t.emptyCta}
            </Link>
          </div>
        </div>
        <Tabbar active="offers" />
      </section>
    );
  }

  return (
    <section className="screen" data-screen="offers">
      <Appbar deskTitle={t.title} />
      <div className="screen-body">
        <div className="greet" style={{ marginTop: 11 }}>
          <b>{t.title}</b>
          <span>
            {recent > 0 ? (t.subN as string).replace("{n}", fa(recent)) : (t.sub0 as string)}
          </span>
        </div>

        {/* ═══ لیست استعلام‌ها ═══ */}
        <div id="rfqListView" style={{ display: active ? undefined : "block" }}>
          {groups.map((g) => {
            const stale = g.offerCount === 0;
            const vol = g.volume != null ? fa(g.volume) : "—";
            const unit = g.good ? unitLabel(g.good.unit, locale) : "";
            const catSlug = (g.good as { category?: { slug?: string } } | null)?.category?.slug ?? "";
            const art = ART_BY_CATEGORY[catSlug] ?? "i-box";
            return (
              <div
                key={g.id}
                className={`card rfq-card tap${active?.id === g.id ? " sel" : ""}`}
                style={stale ? { opacity: 0.72 } : undefined}
                onClick={() => openDetail(g.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openDetail(g.id)}
              >
                <div className="hd">
                  <span className={`thumb ${catSlug} th-sm`}>
                    <Icon name={art} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="who">
                      {g.kind === "COLD" ? (t.coldBadge as string) + " — " : ""}
                      {goodName(g.good ?? { nameFa: "—", nameEn: null }, locale)} — {vol} {unit}
                    </div>
                    <div className="when">
                      {timeAgo(g.createdAt)}
                      {g.deliveryCity ? ` · ${(t.whenDelivery as string).replace("{city}", g.deliveryCity)}` : ""}
                      {g.delivery ? ` · ${(t.whenTime as string).replace("{t}", delivLabel(g.delivery, labels))}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start", flexShrink: 0 }}>
                    {g.offerCount > 0 ? (
                      <>
                        <span className="badge b-green">
                          <Icon name="i-check" />
                          {(t.badgeOffersN as string).replace("{n}", fa(g.offerCount))}
                        </span>
                        {g.markedCount > 0 ? (
                          <span className="badge b-amber">
                            <Icon name="i-bm" />
                            {(t.badgeMarkedN as string).replace("{n}", fa(g.markedCount))}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="badge b-stone">{(t.badgeOffersN as string).replace("{n}", fa(0))}</span>
                    )}
                  </div>
                </div>

                {stale ? (
                  <div className="btn-row" style={{ marginTop: 11 }}>
                    <button
                      className="btn btn-soft btn-sm"
                      style={{ flex: "0 0 auto" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/rfq/${g.good?.id ?? ""}?from=${g.id}`);
                      }}
                    >
                      <Icon className="ic-sm" name="i-send" />
                      {t.reRfq as string}
                    </button>
                    <span style={{ fontSize: 10.5, color: "var(--muted)", alignSelf: "center" }}>{t.reRfqNote as string}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="hint">
            <Icon name="i-info" />
            <span>{t.hint as string}</span>
          </div>
        </div>

        {/* ═══ جزئیات گروه ═══ */}
        {active ? (
          <div id="rfqDetailView">
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--muted)", marginBottom: 10 }}
              onClick={() => setOpenId(null)}
            >
              <Icon className="ic-sm" name="i-back" />
              {t.backAll as string}
            </button>

            <div className="sec-title">
              <h2>
                {(t.offersOf as string).replace(
                  "{name}",
                  `${goodName(active.good ?? { nameFa: "—", nameEn: null }, locale)}${
                    active.volume != null ? ` — ${fa(active.volume)} ${unitLabel(active.good?.unit ?? "", locale)}` : ""
                  }`
                )}
              </h2>
              <span className="more">{(t.answersN as string).replace("{n}", fa(active.offerCount))}</span>
            </div>

            <div className="insight-strip" style={{ marginTop: 2, cursor: "default" }}>
              <span>
                <Icon name="i-chart" />
                {t.minPrice as string}: <b>{fmtMoney(active.minPriceMinor ?? 0, active.offers[0]?.currency)}</b>
              </span>
              <i className="sep" />
              <span>
                <Icon name="i-bm" /> <b>{fa(active.markedCount)}</b> {(t.markedN as string).replace("{n}", "")}
              </span>
              <i className="sep" />
              <span>
                <Icon name="i-clock" /> <b>{fa(daysOpen(active.createdAt))}</b>{" "}
                {(t.daysOpenN as string).replace("{n}", "")}
              </span>
            </div>

            <div className="offer-ctl">
              <button className={`chip mini${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
                {(t.fltAll as string).replace("{n}", fa(active.offerCount))}
              </button>
              <button className={`chip mini${filter === "marked" ? " active" : ""}`} onClick={() => setFilter("marked")}>
                <Icon name="i-bm" />
                {(t.fltMarked as string).replace("{n}", fa(active.markedCount))}
              </button>
              <span style={{ flex: 1 }} />
              <button className={`chip mini${sort === "price" ? " active" : ""}`} onClick={() => setSort("price")}>
                <Icon name="i-sort" />
                {t.srtPrice as string}
              </button>
              <button className={`chip mini${sort === "new" ? " active" : ""}`} onClick={() => setSort("new")}>
                {t.srtNew as string}
              </button>
            </div>

            {offers.map((o) => (
              <OfferCard
                key={o.id}
                offer={o}
                unit={active.good ? unitLabel(active.good.unit, locale) : ""}
                locale={locale}
                cheapest={cheapestId === o.id}
                t={t}
                labels={labels}
                onStatus={() => setSheetOffer(o)}
              />
            ))}

            <div className="hint">
              <Icon name="i-bell" />
              <span>{t.hintDetail as string}</span>
            </div>
          </div>
        ) : null}
      </div>

      <Tabbar active="offers" />

      {/* ═══ شیت: وضعیت پیشنهاد (sheet-offer-status — عین Prototype) ═══ */}
      <Sheet open={!!sheetOffer} onClose={() => setSheetOffer(null)} label={t.stSheetTitle as string}>
        <div className="grab" />
        <h3>{t.stSheetTitle as string}</h3>
        <div className="sub">
          {(t.stSheetSub as string)
            .replace("{name}", sheetOffer?.seller.name ?? "")
            .replace("{price}", fmtMoney(sheetOffer?.priceMinor ?? 0, sheetOffer?.currency))
            .replace("{unit}", "")}
        </div>
        {(
          [
            { key: "INTERESTED", ico: "i-bm", bg: "var(--amber-tint)", fg: "var(--amber)", title: "stInterested", sub: "stInterestedSub" },
            { key: "CONTACTED", ico: "i-tel", bg: "var(--teal-tint)", fg: "var(--teal-tint-fg)", title: "stContacted", sub: "stContactedSub" },
            { key: "REVIEWED", ico: "i-check", bg: "var(--emerald-tint)", fg: "var(--emerald)", title: "stReviewed", sub: "stReviewedSub" },
          ] as const
        ).map((row) => {
          const cur = sheetOffer?.status === row.key;
          return (
            <button
              key={row.key}
              className="sheet-row"
              style={{ opacity: cur ? 1 : 0.72 }}
              onClick={() => sheetOffer && setStatus(sheetOffer, row.key)}
            >
              <span className="ico" style={{ background: row.bg, color: row.fg }}>
                <Icon name={row.ico} />
              </span>
              <span className="tx">
                <b>{t[row.title] as string}</b>
                <span>{t[row.sub] as string}</span>
              </span>
              <svg className="check" style={{ color: cur ? "var(--emerald)" : "var(--muted)" }}>
                <use href={cur ? "#i-check" : "#i-chev"} />
              </svg>
            </button>
          );
        })}
        <button
          className="sheet-row"
          onClick={() => sheetOffer && setStatus(sheetOffer, "NONE")}
          style={{ opacity: sheetOffer && !sheetOffer.status ? 1 : 0.72 }}
        >
          <span className="ico" style={{ background: "var(--muted-bg)", color: "var(--fg-soft)" }}>
            <Icon name="i-trash" />
          </span>
          <span className="tx">
            <b>{t.stNone as string}</b>
            <span>{t.stNoneSub as string}</span>
          </span>
          <svg className="check" style={{ color: sheetOffer && !sheetOffer.status ? "var(--emerald)" : "var(--muted)" }}>
            <use href={sheetOffer && !sheetOffer.status ? "#i-check" : "#i-chev"} />
          </svg>
        </button>
        <button className="btn btn-outline btn-block" style={{ marginTop: 4 }} onClick={() => setSheetOffer(null)}>
          {t.close as string}
        </button>
      </Sheet>
    </section>
  );
}
