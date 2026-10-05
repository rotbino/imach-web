"use client";

/**
 * /board/[goodId] — تابلوی تأمین (پورت sc-board از Prototype v18 · فاز ۳).
 *
 * دادهٔ واقعی: getSupplyBoard — ردیف‌های تأمین‌کننده + زمینهٔ خریدار
 * (watched/volume/frequency). مرتب‌سازی سمت کلاینت (همان legacy):
 *   مرتبط‌ترین = ترتیب API (موتور تطبیق) · ارزان‌ترین = قیمت صعودی
 *   نزدیک‌ترین = proximity شهر · به‌روزترین = updatedAt نزولی
 * فالو = followSupplier واقعی (کاتالوگ تأمین‌کننده در دفتر من).
 *
 * تطبیق آگاهانه با Prototype (ثبت در MIGRATION-MAP §۴):
 *   · sheet-filter حذف شد — چیپ‌های مرتب‌سازی همان کار را می‌کنند؛
 *     شیت فیلتر وقتی معنا دارد که فیلتر سمت سرور باشد
 *   · pack-line («هر کیسهٔ ۵۰ کیلویی») → «پیش‌تر: {قیمت}» از prevMinor —
 *     API پکیج‌بندی ندارد (پکیج چندتایی = شکاف فاز ۵)
 *   · spec سوم («شرایط») → «سابقهٔ استعلام» از boughtFrom — دادهٔ صادقانه
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useActiveBusiness } from "@/lib/active-biz";
import { useFollowToggle, useSupplyBoard } from "@/lib/queries";
import type { BoardSupplierDto } from "@/lib/api";
import { fa, goodName, proximity, unitLabel } from "@/lib/format";
import { timeAgo } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Spinner } from "@/components/imach/spinner";

type SortKey = "RELEVANT" | "CHEAPEST" | "NEAREST" | "FRESH";

/** پالت آواتار v18 — همان خانوادهٔ رنگی Prototype */
const AVATAR_BG = ["var(--teal-deep)", "var(--emerald)", "var(--amber)", "var(--fg-soft)", "var(--muted)"];
function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

const toman = (minor: number): string => fa(Math.round(minor / 10));
const COLLAPSED = 6;

export function SupplyBoardPage({ goodId }: { goodId: string }) {
  const m = useMessages();
  const t = m.app.board;
  const { locale } = useLocale();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const boardQ = useSupplyBoard(bizId, goodId);
  const followMut = useFollowToggle();
  const [sort, setSort] = useState<SortKey>("RELEVANT");
  const [expanded, setExpanded] = useState(false);

  const board = boardQ.data;

  const rows = useMemo(() => {
    const list = [...(board?.rows ?? [])];
    const myCity = biz?.city ?? "";
    const nearRank = (r: BoardSupplierDto) => {
      const p = proximity(myCity, r.seller.city ?? "");
      return p === "same" ? 0 : p === "near" ? 1 : 2;
    };
    switch (sort) {
      case "CHEAPEST":
        return list.sort((a, b) => a.priceMinor - b.priceMinor);
      case "NEAREST":
        return list.sort((a, b) => nearRank(a) - nearRank(b) || a.priceMinor - b.priceMinor);
      case "FRESH":
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      default:
        return list; // ترتیب API = موتور تطبیق
    }
  }, [board?.rows, sort, biz?.city]);

  if (!bizId || boardQ.isLoading) {
    return (
      <section className="screen" data-screen="board">
        <Appbar deskTitle={t.title.replace("{name}", "")} />
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
  const name = good ? goodName(good, locale) : "—";
  const unit = good ? unitLabel(good.unit, locale) : "";
  const total = rows.length;
  const cheapestId = rows.reduce<string | null>(
    (acc, r) => (rows.some((o) => o.priceMinor < r.priceMinor) ? acc : r.listingId),
    null
  );

  const sorts: { key: SortKey; label: string }[] = [
    { key: "RELEVANT", label: t.sortRelevant },
    { key: "CHEAPEST", label: t.sortCheapest },
    { key: "NEAREST", label: t.sortNearest },
    { key: "FRESH", label: t.sortFresh },
  ];

  const sub = board?.volume
    ? t.subNeed.replace("{vol}", fa(board.volume)).replace("{unit}", unit)
    : t.subNoNeed;

  const visible = expanded ? rows : rows.slice(0, COLLAPSED);
  const hidden = total - COLLAPSED;

  const toggleFollow = (r: BoardSupplierDto, follow: boolean) => {
    if (!bizId) return;
    followMut.mutate({ businessId: bizId, supplierId: r.seller.id, follow });
  };

  return (
    <section className="screen" data-screen="board">
      <Appbar deskTitle={t.title.replace("{name}", name)} />

      <div className="pagehead">
        <Link className="back" href={`/item/${goodId}`} aria-label={t.backToItem}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{t.title.replace("{name}", name)}</b>
          <span>
            {t.subN.replace("{n}", fa(total))}
            {sub}
          </span>
        </div>
      </div>

      <div className="screen-body">
        <div className="chips" role="group" aria-label={t.sortRelevant}>
          {sorts.map((s) => (
            <button
              key={s.key}
              type="button"
              className={sort === s.key ? "chip active" : "chip"}
              aria-pressed={sort === s.key}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="unit-note">
          {t.unitNote.replace("{unit}", unit)}
        </div>

        {total === 0 ? (
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-bm" />
            </span>
            <h3>{t.empty}</h3>
            <p>{m.app.home.coldWatched}</p>
            <Link className="btn btn-primary" href="/home">
              {m.app.home.secList}
            </Link>
          </div>
        ) : (
          <div className="g2" style={{ marginTop: 12 }}>
            {visible.map((r) => (
              <div key={r.listingId} className="card sup-card">
                <div className="head">
                  <div className="avatar" style={{ background: avatarBg(r.seller.name), color: "#fff" }}>
                    {r.seller.name.trim().charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm">
                      {r.seller.name}
                      {r.seller.isVerified ? (
                        <Icon className="ic-sm" name="i-shield" style={{ color: "var(--teal-strong)" }} />
                      ) : null}
                      {cheapestId === r.listingId ? <span className="badge b-green">{t.cheapestBadge}</span> : null}
                      {r.sponsored ? (
                        <span className="badge-sponsor">
                          <Icon name="i-star" /> {t.sponsor}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt">
                      <span className="mt-i">
                        <Icon name="i-pin" /> {r.seller.city || "—"}
                      </span>
                      <span className="mt-i">
                        <Icon name="i-clock" /> {timeAgo(r.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="price-line">
                  <span className="p">{toman(r.priceMinor)}</span>
                  <span className="u">{m.app.item.tomanUnit.replace("{unit}", unit)}</span>
                  {r.followedByMe ? (
                    <span className="badge b-teal" style={{ marginInlineStart: "auto" }}>
                      <Icon name="i-bmf" /> {t.followYou}
                    </span>
                  ) : null}
                </div>

                {r.prevMinor != null ? (
                  <div className="pack-line">
                    {t.wasPrice.replace("{p}", toman(r.prevMinor))}
                    {r.trendPct != null && r.trendPct !== 0 ? (
                      <span className={`trend ${r.trendPct < 0 ? "down" : "up"}`} style={{ marginInlineStart: 6 }}>
                        <Icon className="ic-sm ic-12" name={r.trendPct < 0 ? "i-tdn" : "i-tup"} /> {fa(Math.abs(r.trendPct))}٪
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="spec-grid">
                  <div className="spec">
                    <span className="k">{t.stock}</span>
                    <span className="v">{r.stock != null ? fa(r.stock) : "—"}</span>
                  </div>
                  <div className="spec">
                    <span className="k">{t.minOrder}</span>
                    <span className="v">{r.minOrder != null ? fa(r.minOrder) : "—"}</span>
                  </div>
                  {r.boughtFrom ? (
                    <div className="spec">
                      <span className="k">{t.bought}</span>
                      <span className="v">{t.boughtV}</span>
                    </div>
                  ) : null}
                </div>

                <div className="acts">
                  {r.followedByMe ? (
                    <>
                      <Link className="btn btn-outline btn-sm" style={{ flex: 1 }} href={`/sell/${r.seller.slug}`}>
                        {t.catalogBtn}
                      </Link>
                      <button
                        className="icon-follow on"
                        title={t.unfollowAria}
                        aria-label={t.unfollowAria}
                        disabled={followMut.isPending}
                        onClick={() => toggleFollow(r, false)}
                      >
                        <Icon className="ic-sm" name="i-bmf" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={`btn btn-sm ${r.sponsored ? "btn-primary btn-follow-hot" : "btn-follow-teal"}`}
                        style={{ flex: 1.5 }}
                        disabled={followMut.isPending}
                        onClick={() => toggleFollow(r, true)}
                      >
                        {followMut.isPending ? <Spinner size={12} /> : <Icon className="ic-sm" name="i-bm" />}{" "}
                        {r.sponsored ? t.followHot : t.followBtn}
                      </button>
                      <Link className="btn btn-outline btn-sm" style={{ flex: 1 }} href={`/sell/${r.seller.slug}`}>
                        {t.catalogBtn}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}

            {!expanded && hidden > 0 ? (
              <button
                className="card dashed tap"
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--muted)",
                  padding: 13,
                }}
                onClick={() => setExpanded(true)}
              >
                {t.more.replace("{n}", fa(hidden))}
              </button>
            ) : null}
          </div>
        )}

        <div className="hint">
          <Icon name="i-bm" />
          <span>{t.hint}</span>
        </div>
      </div>

      <Tabbar active="list" />
    </section>
  );
}
