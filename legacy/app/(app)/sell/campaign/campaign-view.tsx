"use client";

/**
 * /sell/campaign — گزارش کمپین (پورت sc-campaign از Prototype v18 · فاز ۶).
 *
 * دادهٔ واقعی: getMyPromos (کمپین فعال یا آخرین) + promos/report
 * (stats + viewers + viewerEvents با زمان دقیق).
 *  · stat-row: مشاهدهٔ هدفمند / دنبال‌کردن تازه / خرج
 *  · rep-formula: زنجیرهٔ هزینهٔ شفاف + بودجهٔ مانده
 *  · «چه کسانی دیدند؟»: بینندگان واقعی با زمان و «بعد از مشاهده، دنبال کرد»
 *  · توقف درجا (stop-confirm) → POST /promos/stop — بودجهٔ مانده برمی‌گردد
 *  · «ادامهٔ کمپین» → شیت فروشندهٔ ویژه (sheet-promote) با کالای همین کمپین
 *
 * تطبیق آگاهانه (MIGRATION-MAP §۴):
 *   · «+N بینندهٔ دیگر» دموی ثابت → ردیف‌های واقعی موجود (تا ۵ نمونه؛
 *     شمارش کل از stats.views — بدون دکمهٔ مردهٔ دمو)
 *   · ورود بدون promoId: کمپین فعال، وگرنه آخرین کمپین؛ نبود هیچ کمپینی →
 *     empty-state با CTA کاتالوگ (الگوی sc-empty)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { PromoteSheet } from "../_shared/promote-sheet";
import { useMessages } from "@/i18n/messages/use-messages";
import { useActiveBusiness } from "@/lib/active-biz";
import { useMyPromos, usePromoReport, useStopPromo } from "@/lib/queries";
import { fa, fmtMoney } from "@/lib/format";
import { faPlain } from "../_shared/num";
import { useToast } from "@/hooks/use-toast";

const AVATAR_BG = ["var(--teal-deep)", "var(--emerald)", "var(--amber)", "var(--fg-soft)", "var(--muted)"];
function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

function dayLabel(iso: string, today: string, yesterday: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `${today} ${d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`;
  const y = new Date(now.getTime() - 86_400_000);
  if (d.toDateString() === y.toDateString()) return `${yesterday} ${d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("fa-IR");
}

export function CampaignReport() {
  const m = useMessages();
  const t = m.app.campaign;
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;
  const promosQ = useMyPromos(bizId);
  const stopMut = useStopPromo();

  const [askStop, setAskStop] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const promos = promosQ.data ?? [];
  const promo = useMemo(() => promos.find((p) => p.isActive) ?? promos[0] ?? null, [promos]);
  const reportQ = usePromoReport(bizId, promo?.id ?? null);
  const report = reportQ.data;

  if (!bizId || promosQ.isLoading) {
    return (
      <section className="screen" data-screen="campaign">
        <Appbar deskTitle={t.title} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Spinner size={22} />
        </div>
        <Tabbar active="catalog" />
      </section>
    );
  }

  // ── حالت سرد — هیچ کمپینی نه ساخته شده نه فعال ──
  if (!promo || !report) {
    return (
      <section className="screen" data-screen="campaign">
        <Appbar deskTitle={t.title} />
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>
              <Icon name="i-star" />
            </span>
            <h3>{t.emptyTitle}</h3>
            <p>{t.emptySub}</p>
            <Link className="btn btn-primary" href="/sell/catalog">
              {t.emptyCta}
            </Link>
          </div>
        </div>
        <Tabbar active="catalog" />
      </section>
    );
  }

  const { promo: p, stats, viewers, viewerEvents } = report;
  const convertedIds = new Set(report.converted.map((c) => c.id));
  const viewersById = new Map(viewers.map((v) => [v.id, v]));

  // رویدادهای VIEW به تفکیک بیننده — همراه FOLLOW همان جلسه
  const viewRows = viewerEvents.filter((e) => e.type === "VIEW").slice(0, 5);
  const followedOf = (viewerId: string): boolean => {
    const followEv = viewerEvents.find((e) => e.type === "FOLLOW" && e.viewerId === viewerId);
    return !!followEv || convertedIds.has(viewerId);
  };

  const stateBadge = p.isActive ? t.active : p.remainingMinor <= 0 ? t.done : t.stopped;

  const doStop = () => {
    if (!bizId) return;
    stopMut.mutate(
      { businessId: bizId, promoId: p.id },
      {
        onSuccess: () => {
          setAskStop(false);
          toast({ title: t.stoppedToast });
          void promosQ.refetch();
          void reportQ.refetch();
        },
        onError: () => toast({ title: t.errNotMine, variant: "destructive" }),
      }
    );
  };

  return (
    <section className="screen" data-screen="campaign">
      <Appbar deskTitle={t.title} />

      <div className="screen-body">
        <div className="stat-row">
          <div className="stat">
            <span className="v">{fa(stats.views)}</span>
            <span className="k">{t.statViews}</span>
          </div>
          <div className="stat">
            <span className="v" style={{ color: "var(--teal-deep)" }}>
              {fa(stats.follows)}
            </span>
            <span className="k">{t.statFollows}</span>
          </div>
          <div className="stat">
            <span className="v" style={{ color: "var(--primary-strong)" }}>
              {faPlain(stats.spentMinor / 10)}
            </span>
            <span className="k">{t.statSpent}</span>
          </div>
        </div>

        <div className="rep-formula">
          {t.formula
            .replace("{views}", fa(stats.views))
            .replace("{follows}", fa(stats.follows))
            .replace("{spent}", faPlain(stats.spentMinor / 10))
            .replace("{left}", faPlain(p.remainingMinor / 10))}
        </div>
        <div className="slot-note" style={{ marginTop: 6 }}>
          <Icon name="i-list" />
          <span>{t.slots}</span>
        </div>

        {/* چه کسانی دیدند؟ — بینندگان واقعی با زمان دقیق */}
        <div className="sec-title">
          <h2>{t.viewersTitle}</h2>
          {viewRows.length > 0 ? (
            <span className="more">
              {t.viewersMoreN.replace("{n}", fa(stats.views)).replace("{k}", fa(Math.min(5, stats.views)))}
            </span>
          ) : null}
        </div>
        <div className="card" style={{ padding: "6px 14px" }}>
          {viewRows.length === 0 ? (
            <div className="sub" style={{ padding: "14px 4px", textAlign: "center" }}>
              {t.viewersMoreN.replace("{n}", "0").replace("{k}", "0")}
            </div>
          ) : (
            viewRows.map((ev) => {
              const v = viewersById.get(ev.viewerId);
              if (!v) return null;
              const followed = followedOf(ev.viewerId);
              return (
                <div
                  key={`${ev.viewerId}-${ev.at}`}
                  className="sheet-row"
                  style={{
                    cursor: "default",
                    border: "none",
                    background: "transparent",
                    padding: "9px 0",
                    margin: 0,
                    borderBottom: "1px dashed var(--border)",
                    borderRadius: 0,
                  }}
                >
                  <div className="avatar" style={{ background: avatarBg(v.id), color: "#fff" }}>
                    {v.name.trim().charAt(0)}
                  </div>
                  <span className="tx">
                    <b>{v.name}</b>
                    <span>
                      {v.city ?? ""} · {dayLabel(ev.at, t.today, t.yesterday)} ·{" "}
                      {followed ? t.viewerFollowed : t.viewerOnly}
                    </span>
                  </span>
                  <span className="src-b src-promo">
                    <Icon name="i-star" />
                    {m.app.campaign.active}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="hint" style={{ marginTop: 9 }}>
          <Icon name="i-shield" />
          <span>{t.hintTrack.replace("{n}", fa(stats.views))}</span>
        </div>

        {/* دنبال‌کننده‌های تازه — هزینهٔ واقعی هر مشتری */}
        {stats.follows > 0 ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                className="e-ico"
                style={{ background: "var(--emerald)", color: "#fff", borderRadius: 12, display: "grid", placeItems: "center" }}
              >
                <Icon className="ic-sm" name="i-bm" />
              </span>
              <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.9 }}>
                <b>{t.newFollowersN.replace("{n}", fa(stats.follows))}</b>{" "}
                {t.newFollowersNote.replace(
                  "{cost}",
                  faPlain((stats.costPerFollowMinor ?? stats.spentMinor) / 10)
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="hint">
          <Icon name="i-star" />
          <span>{t.hintTarget}</span>
        </div>

        {/* ادامه / شارژ */}
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => setPromoteOpen(true)}
          >
            <Icon className="ic-sm" name="i-bolt" />
            {t.continueBtn}
          </button>
          <Link className="btn btn-outline" style={{ flex: "0 0 auto" }} href="/wallet/charge">
            <Icon className="ic-sm" name="i-wallet" />
            {t.chargeBtn}
          </Link>
        </div>

        {/* وضعیت + توقف درجا */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, justifyContent: "center" }}>
          <span className={`badge ${p.isActive ? "b-amber" : "b-stone"}`}>{stateBadge}</span>
        </div>
        {p.isActive ? (
          <>
            <button className="link-danger" onClick={() => setAskStop((v) => !v)}>
              {t.stopBtn.replace("{n}", faPlain(p.remainingMinor / 10))}
            </button>
            {askStop ? (
              <div className="stop-confirm">
                <Icon name="i-info" />
                <span>{t.stopConfirm}</span>
                <span className="sc-btns">
                  <button className="sc-no" onClick={() => setAskStop(false)}>
                    {t.stopCancel}
                  </button>
                  <button className="sc-yes" onClick={doStop} disabled={stopMut.isPending}>
                    {t.stopYes}
                  </button>
                </span>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <Tabbar active="catalog" />

      {/* ادامهٔ کمپین — شیت فروشندهٔ ویژه روی همین کالا */}
      <PromoteSheet open={promoteOpen} onClose={() => setPromoteOpen(false)} fixedListingId={p.listingId} />
    </section>
  );
}
