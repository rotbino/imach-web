"use client";

/**
 * کالا در کاتالوگ من — پورت کامل sc-sell-product-owner (v18 · فاز ۵).
 * همان صفحهٔ «دید مشتری» + نوار بینش و کارت کمپین که فقط مالک می‌بیند.
 *
 * نگاشت داده (MIGRATION-MAP §۴):
 *   · بینش: N دنبال‌کننده (saverAnalysis همین کالا) · M درخواست فعال (getInquiries
 *     همان گود) · K بازدید ۳۰روزه (viewCount30)
 *   · کارت کمپین فقط با کمپین فعال واقعی می‌آید (promos/mine + report) —
 *     فرمول تومانی: N مشاهده×۱٬۰۰۰ + M دنبال‌کردن×۵٬۰۰۰
 *   · pack-pick = Listing.packaging واقعی؛ قیمت بسته از p.priceMinor یا
 *     قیمت پایه × تعدد واحد
 *   · «ویرایش کامل» = ProductSettingsDialog موجود (فرم legacy) تا فاز /add v18
 *   · شیت نرخ = محتوای سیاست محصول + نرخ جاری واقعی بک‌اند
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveBusiness } from "@/lib/active-biz";
import {
  useIncomingInquiries,
  useMyListings,
  usePricingState,
  usePromoReport,
  useMyPromos,
  useSaverAnalysis,
  useSetListingActive,
} from "@/lib/queries";
import { fa, fmtMoney, timeAgo, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { Sheet } from "@/components/imach/sheet";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";
import { ProductSettingsDialog } from "@/app/sell/product-settings";
import { QuickPriceSheet } from "../../_shared/quickprice-sheet";
import { ItemDiscountSheet } from "../../_shared/item-discount-sheet";
import { RatesSheet } from "../../_shared/rates-sheet";
import { PromoteSheet } from "../../_shared/promote-sheet";
import { FollowersSheet, type FollowerRowLite } from "../../_shared/followers-sheet";
import { faPlain, faPct } from "../../_shared/num";

type Pack = { label: string; qty?: number; priceMinor?: number; stock?: number };

export function ProductView({ listingId }: { listingId: string }) {
  const m = useMessages();
  const t = m.app.sellProduct as unknown as Record<string, string>;
  const { locale } = useLocale();
  const { toast } = useToast();
  const qc = useQueryClient();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const listingsQ = useMyListings(bizId, { includeInactive: true });
  const saversQ = useSaverAnalysis(bizId);
  const inquiriesQ = useIncomingInquiries(bizId);
  const promosQ = useMyPromos(bizId);
  const pricingQ = usePricingState(bizId);

  const listing = useMemo(
    () => (listingsQ.data ?? []).find((l) => l.id === listingId) ?? null,
    [listingsQ.data, listingId]
  );

  const promo = useMemo(
    () => (promosQ.data ?? []).find((p) => p.listingId === listingId && p.isActive) ?? null,
    [promosQ.data, listingId]
  );
  const reportQ = usePromoReport(bizId, promo?.id ?? null);

  const saverItem = useMemo(
    () => (saversQ.data?.items ?? []).find((x) => x.listingId === listingId) ?? null,
    [saversQ.data, listingId]
  );
  const pricingItem = useMemo(
    () => (pricingQ.data?.items ?? []).find((x) => x.listingId === listingId) ?? null,
    [pricingQ.data, listingId]
  );

  const related = useMemo(() => {
    if (!listing) return [];
    return (inquiriesQ.data?.items ?? []).filter(
      (r) => r.listing?.good?.id === listing.good.id && r.status !== "ANSWERED"
    );
  }, [inquiriesQ.data, listing]);

  const [quickOpen, setQuickOpen] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [follOpen, setFollOpen] = useState(false);
  const [archiveAsk, setArchiveAsk] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pack, setPack] = useState<number | null>(null);
  const setActiveMut = useSetListingActive();

  if (listingsQ.isLoading || !biz) {
    return (
      <section className="screen" data-screen="sell-product-owner">
        <div className="pagehead">
          <Link className="back" href="/sell/catalog" aria-label={m.app.rfq.back as string}>
            <Icon className="ic" name="i-back" />
          </Link>
          <div className="tt"><b>{t.title as string}</b></div>
        </div>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Spinner size={22} />
        </div>
      </section>
    );
  }

  if (!listing) {
    return (
      <section className="screen" data-screen="sell-product-owner">
        <div className="pagehead">
          <Link className="back" href="/sell/catalog" aria-label={m.app.rfq.back as string}>
            <Icon className="ic" name="i-back" />
          </Link>
          <div className="tt"><b>{t.title as string}</b></div>
        </div>
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--red-tint)", color: "var(--red)" }}>
              <Icon name="i-info" />
            </span>
            <h3>{t.notFound as string}</h3>
            <Link className="btn btn-outline" href="/sell/catalog">{t.backToCatalog as string}</Link>
          </div>
        </div>
      </section>
    );
  }

  const unit = unitLabel(listing.good.unit, locale);
  const name = listing.variantLabel ? `${listing.good.nameFa} — ${listing.variantLabel}` : listing.good.nameFa;
  const baseToman = (listing.priceMinor ?? 0) / 10;
  const packs = ((listing as unknown as { packaging?: Pack[] | null }).packaging ?? []) as Pack[];
  const gallery = listing.gallery ?? [];
  const thumb = listing.product?.imageUrl ?? null;
  const active = listing.isActive !== false;

  const catRule = pricingQ.data?.catalog ?? null;
  const itemRule = pricingItem?.rule ?? null;
  // خط نمونهٔ نوار تخفیف — «همکار ٪۵ + پلهٔ حجم ٪۲ → قیمت»
  const hPct = itemRule?.custPct.h ?? catRule?.custPct.h ?? 0;
  const qPct = itemRule?.custPct.q ?? catRule?.custPct.q ?? 0;
  const sampleTier = (itemRule?.tiers?.length ? itemRule.tiers : catRule?.tiers ?? []).find((x) => x.from > 0) ?? null;
  const sampleQty = sampleTier?.from ?? 0;
  const samplePct = sampleTier?.pct ?? 0;
  const sampleFinal = baseToman * (1 - Math.min(90, hPct + samplePct) / 100);

  const saverRows: FollowerRowLite[] = (saverItem?.savers ?? []).map((s) => ({
    id: s.business.id,
    name: s.business.name,
    city: s.business.city,
    since: s.since,
    source: s.source,
    custType: (s as { custType?: "PASSING" | "PARTNER" | "CONTRACT" | null }).custType ?? "PASSING",
    need: s.need,
  }));

  const shareProduct = async () => {
    if (!biz?.slug || typeof window === "undefined") return;
    const url = `${window.location.origin}/sell/${biz.slug}/${listing.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
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

  const doArchive = async () => {
    try {
      await setActiveMut.mutateAsync({ id: listing.id, active: false });
      await qc.invalidateQueries({ queryKey: ["listings"] });
      toast({ title: t.archivedDone as string });
      setArchiveAsk(false);
    } catch {
      toast({ title: t.archiveFailed as string, variant: "destructive" });
    }
  };

  return (
    <section className="screen" data-screen="sell-product-owner">
      <div className="pagehead">
        <Link className="back" href="/sell/catalog" aria-label={m.app.rfq.back as string}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{name}</b>
          <span>{(t.headSub as string).replace("{state}", active ? (t.stateActive as string) : (t.stateArchived as string))}</span>
        </div>
        <button className="act" onClick={() => setEditOpen(true)}>
          <Icon className="ic-sm" name="i-edit" /> {t.editCta as string}
        </button>
      </div>

      <div className="screen-body">
        <div className="thumb lg">
          {thumb ? (
             
            <img src={thumb} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
          ) : (
            <span style={{ fontSize: 34, fontWeight: 800, color: "var(--arm-tint-fg)" }}>{listing.good.nameFa.charAt(0)}</span>
          )}
        </div>
        <div className="photo-strip">
          {gallery.slice(0, 4).map((g, i) => (
            <button
              key={g.id}
              className={i === 0 ? "ps ps-fill active" : "ps ps-fill"}
              onClick={() => toast({ title: (t.photoN as string).replace("{i}", fa(i + 1)).replace("{n}", fa(gallery.length)) })}
            >
              <img src={g.thumbUrl ?? g.url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
          <button className="ps" onClick={() => setEditOpen(true)}>
            <Icon name="i-plus" />
          </button>
          <span className="ps-cap">{(t.photoCap as string).replace("{n}", fa(gallery.length))}</span>
        </div>

        {/* بینش کالا */}
        <button
          className="insight-strip"
          style={{ cursor: "pointer", width: "100%" }}
          onClick={() => setFollOpen(true)}
        >
          <span><Icon name="i-bm" /> <b>{fa(saverItem?.saverCount ?? 0)}</b> {t.followersWord as string}</span>
          <i className="sep" />
          <span><Icon name="i-inbox" /> {fa(related.length)} {t.activeRequestsWord as string}</span>
          <i className="sep" />
          <span><Icon name="i-eye" /> {fa(listing.viewCount30 ?? 0)} {t.views30 as string}</span>
          <Icon className="ic-sm" name="i-chev" style={{ opacity: 0.5, marginInlineStart: "auto" }} />
        </button>
        {saverItem?.summary ? (
          <div className="src-sum" style={{ margin: "8px 2px 0" }}>
            <Icon className="ic-sm ic-12" name="i-info" />
            <b>{fa(saverItem.summary.shared)}</b> {t.srcLink as string} · <b>{fa(saverItem.summary.organic)}</b>{" "}
            {t.srcBoard as string} · <b>{fa(saverItem.summary.promo)}</b> {t.srcPromo as string}
          </div>
        ) : null}

        {/* مشخصات اصلی */}
        <div className="hero-specs" style={{ marginTop: 11 }}>
          <div className="sp"><span className="k">{t.specPrice as string}</span><span className="v">{fmtMoney(listing.priceMinor, listing.currency, locale)}</span></div>
          <div className="sp"><span className="k">{t.specStock as string}</span><span className="v">{listing.stock != null ? fa(listing.stock) : "—"} <small>{unit}</small></span></div>
          <div className="sp"><span className="k">{t.specMinOrder as string}</span><span className="v">{listing.minOrder != null ? fa(listing.minOrder) : "—"} <small>{unit}</small></span></div>
          <div className="sp"><span className="k">{t.specPack as string}</span><span className="v">{packs.length ? packs.map((p) => p.label).join(" و ") : (listing.variantLabel ?? "—")}</span></div>
        </div>

        {/* پکیج‌بندی چندتایی */}
        {packs.length > 0 ? (
          <>
            <div className="pack-pick">
              {packs.map((p, i) => {
                const pMinor = p.priceMinor ?? (listing.priceMinor != null && p.qty ? listing.priceMinor * p.qty : null);
                return (
                  <button
                    key={p.label}
                    className={pack === i ? "chip mini active" : "chip mini"}
                    onClick={() => setPack(i)}
                  >
                    {p.label}{pMinor != null ? ` · ${faPlain(pMinor / 10)}` : ""}
                  </button>
                );
              })}
            </div>
            <div className="pack-note">
              {pack != null && packs[pack]
                ? (t.packNoteSel as string)
                    .replace("{label}", packs[pack].label)
                    .replace("{price}", fmtMoney(packs[pack].priceMinor ?? (listing.priceMinor != null && packs[pack].qty ? listing.priceMinor * packs[pack].qty : null), listing.currency, locale))
                    .replace("{stock}", packs[pack].stock != null ? ` — ${t.packStock as string}: ${fa(packs[pack].stock as number)}` : "")
                : (t.packNote as string).replace("{base}", fmtMoney(listing.priceMinor, listing.currency, locale))}
            </div>
          </>
        ) : null}

        {/* وضعیت تخفیف این کالا */}
        <button className="pricing-state" style={{ width: "100%" }} onClick={() => setDiscOpen(true)}>
          <span className="ps-ico"><Icon name="i-percent" /></span>
          <span className="tx">
            <b>{itemRule ? (t.discOwn as string) : (t.discFromCatalog as string)}</b>
            <span>
              {hPct > 0 || samplePct > 0
                ? `${(t.discLine as string)
                    .replace("{h}", faPct(hPct))
                    .replace("{range}", sampleTier ? `${fa(sampleQty)} ${unit}` : "—")
                    .replace("{tp}", faPct(samplePct))
                    .replace("{final}", faPlain(sampleFinal))}`
                : (t.discNone as string)}
              {qPct > 0 ? ` · ${t.discQ as string}: ${faPct(qPct)}` : ""}
            </span>
          </span>
          <Icon className="chev" name="i-chev" />
        </button>

        {/* کارت کمپین — فقط با کمپین فعال واقعی */}
        {promo ? (
          <div className="card promote-card">
            <div className="pc-head">
              <span className="pc-ico"><Icon name="i-star" /></span>
              <div className="pc-tx">
                <b>{(t.promoTitle as string)}</b>
                <span>
                  {(t.promoSub as string)
                    .replace("{v}", fa(reportQ.data?.stats.views ?? 0))
                    .replace("{f}", fa(reportQ.data?.stats.follows ?? 0))}
                </span>
              </div>
              <span className="badge b-amber">{t.promoActive as string}</span>
            </div>
            <div className="pc-progress">
              <i style={{ width: `${Math.min(100, Math.round((promo.spentMinor / Math.max(1, promo.budgetMinor)) * 100))}%` }} />
            </div>
            <div className="rep-formula" style={{ marginTop: 10 }}>
              {(t.promoFormula as string)
                .replace("{v}", fa(reportQ.data?.stats.views ?? 0))
                .replace("{f}", fa(reportQ.data?.stats.follows ?? 0))
                .replace("{spent}", fmtMoney(promo.spentMinor, null, locale))
                .replace("{left}", fmtMoney(promo.remainingMinor, null, locale))}
            </div>
            <div className="pc-note">{t.promoNote as string}</div>
            <div className="btn-row">
              <Link className="btn btn-primary btn-sm" style={{ flex: 1 }} href="/sell/campaign">
                <Icon className="ic-sm" name="i-chart" /> {t.promoReportCta as string}
              </Link>
              <button className="btn btn-outline btn-sm" style={{ flex: "0 0 auto" }} onClick={() => setPromoteOpen(true)}>
                <Icon className="ic-sm" name="i-bolt" /> {m.app.promote.moreBudget}
              </button>
            </div>
          </div>
        ) : null}

        {/* شبکهٔ اقدامات سریع */}
        <div className="qa-grid">
          <button className="btn btn-outline btn-sm" onClick={() => setQuickOpen(true)}>
            <Icon className="ic-sm" name="i-bolt" /> {t.qaPrice as string}
          </button>
          <button
            className="btn btn-outline btn-sm"
            style={{ borderColor: "var(--arm)", color: "var(--arm-tint-fg)" }}
            onClick={() => setDiscOpen(true)}
          >
            <Icon className="ic-sm" name="i-percent" /> {t.qaDiscounts as string}
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)}>
            <Icon className="ic-sm" name="i-edit" /> {t.qaEdit as string}
          </button>
          <button
            className="btn btn-outline btn-sm"
            style={{ color: "var(--red)" }}
            onClick={() => setArchiveAsk(true)}
            disabled={!active}
          >
            <Icon className="ic-sm" name="i-trash" /> {t.qaArchive as string}
          </button>
        </div>

        {/* منبع تأمین */}
        <div className="card" style={{ marginTop: 11, display: "flex", gap: 10, alignItems: "center" }}>
          <Icon className="ic" name="i-pin" style={{ color: "var(--muted)" }} />
          <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.9 }}>
            <b>{t.sourceTitle as string}:</b> {biz.city}
            <br />
            <span style={{ color: "var(--muted)", fontSize: 10.5 }}>
              {(t.sourceSub as string).replace("{ago}", listing.updatedAt ? timeAgo(listing.updatedAt) : "—")}
            </span>
          </div>
          <span className="badge b-green">{active ? (t.stateActive as string) : (t.stateArchived as string)}</span>
        </div>

        {/* درخواست‌های مرتبط */}
        {related.length > 0 ? (
          <>
            <div className="sec-title">
              <h2><Icon className="ic-sm" name="i-inbox" /> {t.secRelated as string}</h2>
              <Link className="more" href="/sell/requests">{t.allWord as string}</Link>
            </div>
            {related.map((r) => (
              <Link className="card rfq-card tap" href="/sell/requests" key={r.id}>
                <div className="hd">
                  <div className="avatar" style={{ background: "var(--teal-strong)" }}>
                    {(r.buyer?.name ?? "؟").trim().charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="who">{r.buyer?.name ?? "—"}</div>
                    <div className="when">
                      {`${listing.good.nameFa} · ${fa(r.volume)} ${unit}${r.deliveryCity ? ` · ${t.delivAt as string}: ${r.deliveryCity}` : ""}`}
                    </div>
                  </div>
                  <span className="badge b-amber">{(t.daysLeft as string).replace("{d}", fa(Math.max(0, 3 - Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86_400_000))))}</span>
                </div>
              </Link>
            ))}
          </>
        ) : null}

        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setEditOpen(true)}>
            <Icon className="ic-sm" name="i-edit" /> {t.editProductCta as string}
          </button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => void shareProduct()}>
            <Icon className="ic-sm" name="i-share" /> {t.shareCta as string}
          </button>
        </div>

        <div className="hint">
          <Icon name="i-info" />
          <span>{(t.hint as string).replace("{n}", fa(saverItem?.saverCount ?? 0))}</span>
        </div>
      </div>

      {/* شیت‌ها */}
      <QuickPriceSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        listing={listing}
        businessId={biz.id}
        followersCount={saverItem?.saverCount}
      />
      <ItemDiscountSheet
        open={discOpen}
        onClose={() => setDiscOpen(false)}
        businessId={biz.id}
        listingId={listing.id}
      />
      <RatesSheet open={ratesOpen} onClose={() => setRatesOpen(false)} />
      <PromoteSheet open={promoteOpen} onClose={() => setPromoteOpen(false)} fixedListingId={listing?.id ?? null} />
      <FollowersSheet
        open={follOpen}
        onClose={() => setFollOpen(false)}
        businessId={biz.id}
        mode="item"
        rows={saverRows}
        listingId={listingId}
      />

      {/* تأیید آرشیو (الگوی دو‌مرحله‌ای v18) */}
      <Sheet open={archiveAsk} onClose={() => setArchiveAsk(false)} label={t.archiveAskTitle as string}>
        <div className="grab" />
        <h3>{t.archiveAskTitle as string}</h3>
        <div className="sub">{(t.archiveAskSub as string).replace("{name}", name)}</div>
        <div className="hint" style={{ marginTop: 10 }}>
          <Icon name="i-info" />
          <span>{t.archiveAskNote as string}</span>
        </div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={setActiveMut.isPending} onClick={() => void doArchive()}>
            {setActiveMut.isPending ? "…" : (t.archiveConfirm as string)}
          </button>
          <button className="btn btn-outline btn-lg" style={{ flex: 1 }} onClick={() => setArchiveAsk(false)}>
            {t.archiveCancel as string}
          </button>
        </div>
      </Sheet>

      {/* ویرایش کامل — فرم legacy موجود تا فاز /add v18 */}
      <ProductSettingsDialog
        listing={listing}
        bizId={biz.id}
        currency={listing.currency ?? biz.currency ?? "IRR"}
        customCategories={biz.customCategories ?? []}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </section>
  );
}
