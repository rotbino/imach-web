"use client";

/**
 * درخواست‌های قیمت فروشنده — پورت کامل sc-sell-requests (v18 · فاز ۴ مهاجرت).
 *
 * سه تب (همان Prototype):
 *   «به من»           → Inquiry های مستقیم (getInquiries)
 *   «فرصت‌های بازار»  → BUY لیستینگ‌های هم‌گود از موتور تطبیق (getBuyRequests)
 *   «گوش به زنگ»      → نیازهای خریدارهای دنبال‌شده (getWatchedBuyerNeeds · U63)
 *
 * «پاسخ با قیمت» → /sell/quote/{inquiryId} (استعلام مستقیم) یا
 * /sell/quote/b{buyListingId} (فرصت بازار / گوش‌به‌زنگ → offerBuyRequest).
 * «جزئیات» → sheet-rfq-detail (همان داده‌های ردیف؛ بدون اندپوینت تکراری).
 *
 * تطبیق آگاهانه (MIGRATION-MAP §۴):
 *   · «قیمتت را دنبال می‌کند» روی کارت حذف شد — یال فالوی خریدار در
 *     getInquiries نیست (مشتق‌سازی اضافی؛ بج «جدید/پاسخ دادی» صادقانه است)
 *   · «از دعوت تو آمد (۵٬۰۰۰ تومان به کیف)» حذف شد — اعتبار دعوت فاز ۶
 *   · dref-strip موتور تخفیف‌ها → «قیمت هدف خریدار» (CustomerType/DiscountRule فاز ۵)
 *   · نوار «کارهای امروز» (C1-5) به فاز ۵ می‌رود — خانهٔ واقعی‌اش کاتالوگ فروشنده است
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useActiveBusiness } from "@/lib/active-biz";
import { useBuyRequests, useFollowBuyerToggle, useIncomingInquiries, useMarkInquiryRead, useWatchedBuyerNeeds } from "@/lib/queries";
import type { InquiryDto, MarketItemDto, WatchedNeedDto } from "@/lib/api";
import { activityTypeLabel, fa, frequencyLabel, goodName, timeAgo, unitLabel, fmtMoney } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Sheet } from "@/components/imach/sheet";
import { Spinner } from "@/components/imach/spinner";

/** پنجرهٔ مهلت پاسخ استعلام (روز) */
const DEADLINE_DAYS = 3;

const avatarBg = (seed: string): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ["var(--teal-strong)", "var(--emerald)", "var(--amber)", "var(--muted)", "var(--fg-soft)"][h % 5];
};

const daysLeft = (iso: string): number => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return Math.max(0, DEADLINE_DAYS - d);
};

/** کلید زمان تحویل → برچسب؛ legacy خام */
const DELIV_LABELS: Record<string, string> = {
  URGENT: "timeUrgent",
  "3D": "time3d",
  WEEK: "timeWeek",
  FLEX: "timeFlex",
};
function delivText(raw: string | null, t: Record<string, string>): string {
  if (!raw) return "";
  const k = DELIV_LABELS[raw];
  return k ? (t[k] as string) : raw;
}

type Tab = "toMe" | "market" | "alert";

/** چیپ‌های نیاز روی کارت — بج نارنجی کالا + بج‌های سنگی مقدار/تحویل */
function Needs({ good, volume, unit, city, t }: { good: string; volume: number | null; unit: string; city?: string | null; t: Record<string, string> }) {
  return (
    <div className="needs">
      <span className="badge b-orange">{good}</span>
      {volume != null ? <span className="badge b-stone">{fa(volume)} {unit}</span> : null}
      {city ? <span className="badge b-stone">{(t.delivAt as string).replace("{city}", city)}</span> : null}
    </div>
  );
}

export function RequestsView() {
  const m = useMessages();
  const t = m.app.sellRequests as unknown as Record<string, string>;
  /** دیکشنری ترکیبی — کلیدهای canonical زمان در namespace rfq هستند */
  const labels = { ...(m.app.rfq as unknown as Record<string, string>), ...t };
  const { locale } = useLocale();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const inquiriesQ = useIncomingInquiries(bizId);
  const marketQ = useBuyRequests(bizId);
  const needsQ = useWatchedBuyerNeeds(bizId);
  const unfollowMut = useFollowBuyerToggle();
  const markReadMut = useMarkInquiryRead();

  const [tab, setTab] = useState<Tab>("toMe");
  const [detail, setDetail] = useState<InquiryDto | null>(null);

  const inquiries = useMemo(() => inquiriesQ.data?.items ?? [], [inquiriesQ.data]);
  const market = useMemo(() => marketQ.data ?? [], [marketQ.data]);
  const needs = useMemo(() => needsQ.data?.needs ?? [], [needsQ.data]);

  // ── حالت بارگذاری ──
  if (!bizId || inquiriesQ.isLoading) {
    return (
      <section className="screen" data-screen="sell-requests">
        <Appbar deskTitle={t.title} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
            <Spinner size={22} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.app.home.loading}</span>
          </div>
        </div>
        <Tabbar active="requests" />
      </section>
    );
  }

  const openDetail = (q: InquiryDto) => {
    setDetail(q);
    // ردیف تازه را خوانده‌شده علامت بزن (اگر نو بود)
    if (!q.isRead) markReadMut.mutate(q.id);
  };

  return (
    <section className="screen" data-screen="sell-requests">
      <Appbar deskTitle={t.title} />
      <div className="screen-body">
        <div className="greet">
          <b>{t.title}</b>
          <span>{t.sub}</span>
        </div>

        <div className="chips" style={{ marginTop: 12 }}>
          <button className={`chip${tab === "toMe" ? " active" : ""}`} onClick={() => setTab("toMe")}>
            {(t.tabToMe as string).replace("{n}", fa(inquiries.length))}
          </button>
          <button className={`chip${tab === "market" ? " active" : ""}`} onClick={() => setTab("market")}>
            {(t.tabMarket as string).replace("{n}", fa(market.length))}
          </button>
          <button className={`chip${tab === "alert" ? " active" : ""}`} onClick={() => setTab("alert")}>
            <Icon className="ic-sm" name="i-bell" />
            {(t.tabAlert as string).replace("{n}", fa(needs.length))}
          </button>
        </div>

        {/* ═══ تب: به من ═══ */}
        {tab === "toMe" ? (
          <div className="g2" style={{ marginTop: 12 }}>
            {inquiries.length === 0 ? (
              <div className="empty-state">
                <span className="art" style={{ background: "var(--orange-tint)", color: "var(--primary-strong)" }}>
                  <Icon name="i-inbox" />
                </span>
                <h3 style={{ fontSize: 13 }}>{t.emptyToMe}</h3>
              </div>
            ) : null}
            {inquiries.map((q) => {
              const answered = q.status === "ANSWERED";
              const left = daysLeft(q.createdAt);
              const unit = unitLabel(q.listing.good.unit, locale);
              return (
                <div key={q.id} className={`card rfq-card${answered ? " done" : ""}`}>
                  <div className="hd">
                    <div className="avatar" style={{ background: avatarBg(q.buyer.name) }}>
                      {q.buyer.name.trim().charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="who">
                        {q.buyer.name} <span className="badge b-stone">{activityTypeLabel(q.buyer.trade ?? q.buyer.activityType, locale) || "—"}</span>
                      </div>
                      <div className="when">
                        {timeAgo(q.createdAt)}
                        {!answered && !q.isRead ? ` · ${t.newBadge as string}` : ""}
                      </div>
                    </div>
                    {answered ? (
                      <span className="badge b-green">
                        <Icon name="i-check" />
                        {t.answered as string}
                      </span>
                    ) : left > 0 ? (
                      <span className="badge b-amber">{(t.badgeDaysN as string).replace("{n}", fa(left))}</span>
                    ) : null}
                  </div>
                  <Needs
                    good={goodName(q.listing.good, locale)}
                    volume={q.volume}
                    unit={unit}
                    city={q.deliveryCity ?? q.buyer.city}
                    t={t}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <span className="match-flag">
                      <Icon name="i-check" />
                      {t.matchCatalog as string}
                    </span>
                  </div>
                  {!answered ? (
                    <div className="btn-row" style={{ marginTop: 12 }}>
                      <Link className="btn btn-primary btn-sm" href={`/sell/quote/${q.id}`}>
                        {t.answerBtn as string}
                      </Link>
                      <button className="btn btn-outline btn-sm" onClick={() => openDetail(q)}>
                        {t.detailBtn as string}
                      </button>
                    </div>
                  ) : (
                    <div className="btn-row" style={{ marginTop: 12 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openDetail(q)}>
                        {t.detailBtn as string}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* ═══ تب: فرصت‌های بازار ═══ */}
        {tab === "market" ? (
          <div className="g2" style={{ marginTop: 12 }}>
            {market.length === 0 ? (
              <div className="empty-state">
                <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
                  <Icon name="i-spark" />
                </span>
                <h3 style={{ fontSize: 13 }}>{t.emptyMarket}</h3>
              </div>
            ) : null}
            {market.map((item) => {
              const unit = unitLabel(item.good.unit, locale);
              return (
                <div key={item.id} className="card rfq-card">
                  <div className="hd">
                    <div className="avatar" style={{ background: avatarBg(item.business.name) }}>
                      {item.business.name.trim().charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="who">
                        {item.business.name} <span className="badge b-stone">{item.business.city || "—"}</span>
                      </div>
                      <div className="when">{timeAgo(item.updatedAt)}</div>
                    </div>
                  </div>
                  <Needs good={goodName(item.good, locale)} volume={item.volume ?? null} unit={unit} t={t} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <span className="match-flag">
                      <Icon name="i-spark" />
                      {t.matchDemand as string}
                    </span>
                  </div>
                  <div className="btn-row" style={{ marginTop: 12 }}>
                    <Link className="btn btn-primary btn-sm" href={`/sell/quote/b${item.id}`}>
                      {t.answerBtn as string}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* ═══ تب: گوش به زنگ ═══ */}
        {tab === "alert" ? (
          <div className="g2" style={{ marginTop: 12 }}>
            <div className="announce-strip" style={{ marginBottom: 10 }}>
              <span className="a-ico">
                <Icon name="i-bell" />
              </span>
              <span className="tx">
                <b>{t.alertStripTitle as string}</b>
                <span>{t.alertStripSub as string}</span>
              </span>
            </div>
            {needs.length === 0 ? (
              <div className="empty-state">
                <span className="art" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>
                  <Icon name="i-bell" />
                </span>
                <h3 style={{ fontSize: 13 }}>{t.emptyAlert}</h3>
              </div>
            ) : null}
            {needs.map((n) => {
              const unit = unitLabel(n.good.unit, locale);
              const answered = !!n.answeredByMe;
              return (
                <div key={n.id} className={`card rfq-card${answered ? " done" : ""}`}>
                  <div className="hd">
                    <div className="avatar" style={{ background: avatarBg(n.buyer.name) }}>
                      {n.buyer.name.trim().charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="who">{n.buyer.name}</div>
                      <div className="when">
                        {t.announcedNeed as string} · {timeAgo(n.updatedAt)}
                        {n.buyer.city ? ` · ${n.buyer.city}` : ""}
                      </div>
                    </div>
                    {answered ? (
                      <span className="badge b-green">
                        <Icon name="i-check" />
                        {t.answered as string}
                      </span>
                    ) : (
                      <span className="badge b-amber">
                        <Icon className="ic-sm" name="i-bell" />
                        {t.alertBadge as string}
                      </span>
                    )}
                  </div>
                  <Needs good={goodName(n.good, locale)} volume={n.volume} unit={unit} t={t} />
                  <div className="btn-row" style={{ marginTop: 12 }}>
                    <Link className="btn btn-primary btn-sm" href={`/sell/quote/b${n.id}`}>
                      {t.answerBtn as string}
                    </Link>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--muted)" }}
                      onClick={() =>
                        bizId &&
                        unfollowMut.mutate({ businessId: bizId, buyerId: n.buyer.id, follow: false })
                      }
                    >
                      {t.alertOff as string}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <Tabbar active="requests" />

      {/* ═══ شیت: جزئیات درخواست (sheet-rfq-detail — عین Prototype) ═══ */}
      <Sheet open={!!detail} onClose={() => setDetail(null)} label={t.detailSheetTitle as string}>
        <div className="grab" />
        <h3>{t.detailSheetTitle as string}</h3>
        <div className="sub">
          {detail?.buyer.name} — {detail ? goodName(detail.listing.good, locale) : ""}
        </div>
        {detail ? (
          <>
            <div className="card" style={{ boxShadow: "none", padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div className="avatar" style={{ background: avatarBg(detail.buyer.name) }}>
                  {detail.buyer.name.trim().charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13 }}>{detail.buyer.name}</b>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.8 }}>
                    {activityTypeLabel(detail.buyer.trade ?? detail.buyer.activityType, locale) || "—"} · {detail.buyer.city || "—"}
                  </div>
                </div>
              </div>
              <div className="pp-brk" style={{ margin: "10px 0 0" }}>
                <div className="r">
                  <span>{t.rdGood}</span>
                  <b>{goodName(detail.listing.good, locale)}</b>
                </div>
                <div className="r">
                  <span>{t.rdQty}</span>
                  <b>
                    {fa(detail.volume)} {unitLabel(detail.listing.good.unit, locale)}
                    {detail.frequency ? ` · ${frequencyLabel(detail.frequency, locale)}` : ""}
                  </b>
                </div>
                <div className="r">
                  <span>{t.rdDeliv}</span>
                  <b>
                    {detail.deliveryCity ?? detail.buyer.city ?? "—"}
                    {detail.delivery ? ` · ${delivText(detail.delivery, labels)}` : ""}
                  </b>
                </div>
                <div className="r">
                  <span>{t.rdDeadline}</span>
                  <b>{(t.rdDeadlineV as string).replace("{n}", fa(daysLeft(detail.createdAt)))}</b>
                </div>
                {detail.targetPriceMinor ? (
                  <div className="r">
                    <span>{t.rdTarget}</span>
                    <b>{fmtMoney(detail.targetPriceMinor, detail.listing.currency, locale)}</b>
                  </div>
                ) : null}
                <div className="r">
                  <span>{t.rdNote}</span>
                  <b>{detail.note ? `«${detail.note}»` : (t.noNote as string)}</b>
                </div>
              </div>
            </div>

            {detail.status !== "ANSWERED" ? (
              <Link
                className="btn btn-primary btn-lg btn-block"
                style={{ marginTop: 12 }}
                href={`/sell/quote/${detail.id}`}
                onClick={() => setDetail(null)}
              >
                <Icon className="ic-sm" name="i-send" />
                {t.answerBtn as string}
              </Link>
            ) : null}
            <div className="hint" style={{ marginTop: 10 }}>
              <Icon name="i-shield" />
              <span>{t.rdHint as string}</span>
            </div>
          </>
        ) : null}
      </Sheet>
    </section>
  );
}
