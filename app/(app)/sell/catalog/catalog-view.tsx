"use client";

/**
 * کاتالوگ فروشنده — پورت کامل sc-sell-catalog (v18 · فاز ۵ مهاجرت).
 * خانهٔ بازوی فروش: کارت کسب‌وکار → کارهای امروز (C1-5) → بینش ذخیره‌کنندگان →
 * نوار اشتراک → ورودی تخفیف‌ها → جستجو/افزودن → چیپ دسته‌ها → شبکهٔ محصولات →
 * ردیف آرشیو.
 *
 * نگاشت داده (صادقانه — MIGRATION-MAP §۴):
 *   · «کارهای امروز»: فقط «N درخواست بی‌پاسخ» واقعی (getInquiries)؛ بخش
 *     «پیشنهاد در انتظار جواب خریدار» تا اندپوینت پیشنهادهای ارسالی فروشنده نیامده
 *   · بینش: N ذخیره‌کننده (getFollowers) + M بازدید ۳۰روزه (مجموع viewCount30 —
 *     پروتوتایپ «این هفته» می‌گوید؛ پنجرهٔ واقعی بک‌اند ۳۰روزه است)
 *   · بج «ویژه» = کمپین فعال واقعی (promos/mine)
 *   · mgr-strip: بازدید (viewCount30) · ذخیره‌کننده (saverAnalysis) · استعلام مرتبط
 *   · pk-chips = پکیج‌بندی چندتایی (Listing.packaging) یا variantLabel
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useActiveBusiness } from "@/lib/active-biz";
import {
  useIncomingInquiries,
  useMyFollowers,
  useMyListings,
  useMyPromos,
  useSaverAnalysis,
} from "@/lib/queries";
import type { GoodItemDto } from "@/lib/api";
import { activityTypeLabel, fa, fmtMoney, timeAgo } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";
import { QuickPriceSheet } from "../_shared/quickprice-sheet";
import { FollowersSheet } from "../_shared/followers-sheet";
import { PromoteSheet } from "../_shared/promote-sheet";

type Pack = { label: string; qty?: number; priceMinor?: number; stock?: number };

const packLabels = (l: GoodItemDto): string[] => {
  const raw = (l as unknown as { packaging?: Pack[] | null }).packaging;
  if (Array.isArray(raw) && raw.length) return raw.map((p) => p.label).filter(Boolean);
  return l.variantLabel ? [l.variantLabel] : [];
};

export function CatalogView() {
  const m = useMessages();
  const t = m.app.sellCatalog as unknown as Record<string, string>;
  const { locale } = useLocale();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const listingsQ = useMyListings(bizId, { includeInactive: true });
  const followersQ = useMyFollowers(bizId);
  const inquiriesQ = useIncomingInquiries(bizId);
  const saversQ = useSaverAnalysis(bizId);
  const promosQ = useMyPromos(bizId);

  const [q, setQ] = useState("");
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [cat, setCat] = useState<string | null>(null);
  const [quickListing, setQuickListing] = useState<GoodItemDto | null>(null);
  const [followersOpen, setFollowersOpen] = useState(false);

  const listings = listingsQ.data ?? [];
  const active = listings.filter((l) => l.isActive !== false && (l.mode === "SELL" || l.mode === "BOTH"));
  const archived = listings.filter((l) => l.isActive === false && (l.mode === "SELL" || l.mode === "BOTH"));

  const unanswered = (inquiriesQ.data?.items ?? []).filter((r) => r.status !== "ANSWERED").length;
  const followers = followersQ.data;
  const views30 = active.reduce((s, l) => s + (l.viewCount30 ?? 0), 0);
  const saverCount = (listingId: string): number =>
    (saversQ.data?.items ?? []).find((x) => x.listingId === listingId)?.saverCount ?? 0;
  const activePromos = (promosQ.data ?? []).filter((p) => p.isActive);
  const promoOf = (listingId: string): boolean =>
    (promosQ.data ?? []).some((p) => p.listingId === listingId && p.isActive);

  const cats = biz?.customCategories ?? [];
  // فیلتر داخل memo محاسبه می‌شود تا وابستگی‌ها همه اولیه باشند (React Compiler-friendly)
  const filtered = useMemo(
    () =>
      listings
        .filter((l) => l.isActive !== false && (l.mode === "SELL" || l.mode === "BOTH"))
        .filter((l) => {
          if (cat && l.catalogCategoryId !== cat) return false;
          const needle = q.trim();
          if (!needle) return true;
          const hay = `${l.good.nameFa} ${l.variantLabel ?? ""} ${l.brand?.name ?? ""}`;
          return hay.includes(needle);
        }),
    [listings, cat, q]
  );

  const lastUpdate = listings.reduce<string | null>((acc, l) => {
    if (!l.updatedAt) return acc;
    return !acc || l.updatedAt > acc ? l.updatedAt : acc;
  }, null);

  const shareCatalog = async () => {
    if (!biz?.slug || typeof window === "undefined") return;
    const url = `${window.location.origin}/sell/${biz.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: biz.name, url });
        return;
      }
      throw new Error("no-web-share");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: m.app.home.linkCopied as string });
      } catch {
        toast({ title: m.app.home.copyFailed as string, variant: "destructive" });
      }
    }
  };

  const thumb = (l: GoodItemDto): string | null =>
    l.gallery?.[0]?.thumbUrl ?? l.gallery?.[0]?.url ?? l.product?.imageUrl ?? null;

  // ── حالت بارگذاری ──
  if (listingsQ.isLoading || !biz) {
    return (
      <section className="screen" data-screen="sell-catalog">
        <Appbar deskTitle={t.title as string} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
            <Spinner size={22} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t.loading as string}</span>
          </div>
        </div>
        {/* فاز ۶ — شیت فروشندهٔ ویژه */}
      <PromoteSheet open={promoteOpen} onClose={() => setPromoteOpen(false)} />

      <Tabbar active="catalog" />
      </section>
    );
  }

  // ── شروع سرد: کاتالوگ خالی ──
  if (active.length === 0 && archived.length === 0) {
    return (
      <section className="screen" data-screen="sell-catalog">
        <Appbar deskTitle={t.title as string} />
        <div className="screen-body">
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div className="avatar" style={{ width: 52, height: 52, borderRadius: 17, fontSize: 19 }}>
              {biz.name.trim().charAt(0) || "؟"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                {biz.name}
                {biz.isVerified ? <Icon className="ic-sm" name="i-shield" style={{ color: "var(--teal-strong)" }} /> : null}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.8 }}>
                {activityTypeLabel(biz.activityType, locale)} · {biz.city}
              </div>
            </div>
          </div>
          <div className="empty-state">
            <span className="art" style={{ background: "var(--orange-tint)", color: "var(--primary-strong)" }}>
              <Icon name="i-store" />
            </span>
            <h3>{t.emptyTitle as string}</h3>
            <p>{t.emptySub as string}</p>
            <Link className="btn btn-primary btn-lg" href="/new">
              <Icon className="ic-sm" name="i-plus" /> {t.addCta as string}
            </Link>
          </div>
        </div>
        {/* فاز ۶ — شیت فروشندهٔ ویژه */}
      <PromoteSheet open={promoteOpen} onClose={() => setPromoteOpen(false)} />

      <Tabbar active="catalog" />
      </section>
    );
  }

  // ── نمای کامل ──
  return (
    <section className="screen" data-screen="sell-catalog">
      <Appbar deskTitle={t.title as string} />

      <div className="screen-body">
        {/* کارت کسب‌وکار */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div className="avatar" style={{ width: 52, height: 52, borderRadius: 17, fontSize: 19 }}>
            {biz.name.trim().charAt(0) || "؟"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              {biz.name}
              {biz.isVerified ? <Icon className="ic-sm" name="i-shield" style={{ color: "var(--teal-strong)" }} /> : null}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.8 }}>
              {activityTypeLabel(biz.activityType, locale)} · {biz.city} · {fa(active.length)} {t.goodsWord as string}
              <br />
              {(t.lastUpdate as string).replace("{ago}", lastUpdate ? timeAgo(lastUpdate) : "—")}
            </div>
          </div>
          <Link className="icon-btn" href="/wallet" title={t.walletAria as string} aria-label={t.walletAria as string}>
            <Icon className="ic" name="i-wallet" />
          </Link>
        </div>

        {/* کارهای امروز (C1-5) */}
        <Link className="price-entry tasks" href="/sell/requests" style={{ marginTop: 11 }}>
          <Icon name="i-bell" />
          <span className="tx">
            {t.tasksTitle as string}
            <small>{(t.tasksSub as string).replace("{n}", fa(unanswered))}</small>
          </span>
          {unanswered > 0 ? <span className="badge b-amber">{fa(unanswered)} {t.tasksNew as string}</span> : null}
          <Icon className="chev" name="i-chev" />
        </Link>

        {/* بینش ذخیره‌کنندگان */}
        <button
          className="insight-strip"
          style={{ marginTop: 11, cursor: "pointer", width: "100%" }}
          onClick={() => setFollowersOpen(true)}
        >
          <span><Icon name="i-bm" /> <b>{fa(followers?.summary.total ?? 0)}</b> {t.saversWord as string}</span>
          <i className="sep" />
          <span><Icon name="i-eye" /> {fa(views30)} {t.views30 as string}</span>
          <Icon className="ic-sm" name="i-chev" style={{ opacity: 0.5, marginInlineStart: "auto" }} />
        </button>

        {/* نوار اشتراک کاتالوگ */}
        <div className="share-strip">
          <span
            className="ico"
            style={{
              width: 40, height: 40, borderRadius: 13,
              background: "var(--arm)", color: "#fff",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}
          >
            <Icon className="ic-sm" name="i-share" style={{ width: 19, height: 19 }} />
          </span>
          <span className="txt">
            <b>{t.shareTitle as string}</b>
            <span>{(t.shareSub as string).replace("{slug}", biz.slug ?? "")}</span>
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => void shareCatalog()}>{t.shareCta as string}</button>
        </div>

        {/* ورودی تخفیف‌ها */}
        <Link className="price-entry" href="/sell/discounts">
          <Icon name="i-percent" />
          <span className="tx">
            {t.discountsTitle as string}
            <small>{t.discountsSub as string}</small>
          </span>
          <span className="st opt">{t.optionalTag as string}</span>
          <Icon className="chev" name="i-chev" />
        </Link>

        {/* فاز ۶ — ورودی کمپین «فروشندهٔ ویژه» (میزبان sheet-promote طبق نقشه) */}
        <button className="price-entry" style={{ width: "100%", textAlign: "right" }} onClick={() => setPromoteOpen(true)}>
          <Icon name="i-bolt" />
          <span className="tx">
            {m.app.promote.entryT}
            <small>{m.app.promote.entryS}</small>
          </span>
          {activePromos.length > 0 ? (
            <span className="badge b-amber">{m.app.profile.active}</span>
          ) : (
            <span className="st opt">{m.app.sellCatalog.optionalTag as string}</span>
          )}
          <Icon className="chev" name="i-chev" />
        </button>

        {/* جستجو + افزودن */}
        <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
          <div className="searchbar" style={{ flex: 1 }}>
            <Icon name="i-search" />
            <input
              style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", font: "inherit", fontSize: 12.5, outline: "none" }}
              placeholder={t.searchPh as string}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t.searchPh as string}
            />
          </div>
          <Link className="btn btn-primary" style={{ height: 46, padding: "0 15px", flex: "0 0 auto" }} href="/new">
            <Icon className="ic-sm" name="i-plus" /> {t.addCta as string}
          </Link>
        </div>

        {/* چیپ دسته‌ها */}
        {cats.length > 0 ? (
          <div className="chips" style={{ marginTop: 9 }}>
            <button className={cat === null ? "chip active" : "chip"} onClick={() => setCat(null)}>{t.chipAll as string}</button>
            {cats.map((c) => (
              <button
                key={c.id}
                className={cat === c.id ? "chip active" : "chip"}
                onClick={() => setCat(cat === c.id ? null : c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : null}

        {/* سرصفحهٔ فهرست */}
        <div className="sec-title">
          <h2><Icon className="ic-sm" name="i-store" /> {t.secProducts as string}</h2>
          <span className="more">{fa(filtered.length)} {t.ofWord as string} {fa(active.length)}</span>
        </div>

        {/* شبکهٔ محصولات */}
        <div className="grid-2">
          {filtered.map((l) => {
            const img = thumb(l);
            const packs = packLabels(l);
            const related = (inquiriesQ.data?.items ?? []).filter(
              (r) => r.listing?.good?.id === l.good.id && r.status !== "ANSWERED"
            ).length;
            return (
              <Link className="p-card" href={`/sell/product/${l.id}`} key={l.id}>
                <div className="ph">
                  {img ? (
                    <img src={img} alt={l.good.nameFa} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                  ) : (
                    <span style={{ fontSize: 26, fontWeight: 800, color: "var(--arm-tint-fg)" }}>
                      {l.good.nameFa.charAt(0)}
                    </span>
                  )}
                  {promoOf(l.id) ? (
                    <span className="badge-sponsor ph-badge"><Icon name="i-star" /> {t.sponsorBadge as string}</span>
                  ) : null}
                  <button
                    className="gear-btn"
                    title={t.quickAria as string}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickListing(l); }}
                  >
                    <Icon className="ic-sm" name="i-gear" />
                  </button>
                </div>
                <div className="pd">
                  <div className="nm">{l.variantLabel ? `${l.good.nameFa} — ${l.variantLabel}` : l.good.nameFa}</div>
                  <div className="pk">
                    {fmtMoney(l.priceMinor, l.currency, locale)} <span>{`/ ${l.good.unit ? l.good.unit : ""}`}</span>
                  </div>
                  {packs.length > 0 ? (
                    <div className="pk-chips">{packs.map((p) => <span key={p}>{p}</span>)}</div>
                  ) : null}
                  <div className="mgr-strip">
                    <span><Icon name="i-eye" /> {fa(l.viewCount30 ?? 0)}</span>
                    <span><Icon name="i-bm" /> {fa(saverCount(l.id))}</span>
                    {related > 0 ? <span><Icon name="i-inbox" /> {fa(related)}</span> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ردیف آرشیو */}
        {archived.length > 0 ? (
          <div className="archived-line">
            <span className="badge b-stone">{t.archivedTag as string}</span>
            <span>
              {archived.map((l) => l.variantLabel ? `${l.good.nameFa} — ${l.variantLabel}` : l.good.nameFa).join(" · ")}
              {(t.archivedCount as string).replace("{n}", fa(archived.length))}
            </span>
          </div>
        ) : null}

        {/* راهنما */}
        <div className="hint">
          <Icon name="i-info" />
          <span>{t.hint as string}</span>
        </div>
      </div>

      {/* فاز ۶ — شیت فروشندهٔ ویژه */}
      <PromoteSheet open={promoteOpen} onClose={() => setPromoteOpen(false)} />

      <Tabbar active="catalog" />

      <QuickPriceSheet
        open={!!quickListing}
        onClose={() => setQuickListing(null)}
        listing={quickListing}
        businessId={biz.id}
        followersCount={quickListing ? saverCount(quickListing.id) : undefined}
      />
      <FollowersSheet open={followersOpen} onClose={() => setFollowersOpen(false)} businessId={biz.id} mode="catalog" />
    </section>
  );
}
