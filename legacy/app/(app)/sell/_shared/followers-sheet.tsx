"use client";

/**
 * sheet-followers (v18) — دنبال‌کنندگان قیمت.
 * میزبان: /sell/catalog (بینش ذخیره‌کنندگان — mode="catalog" از getFollowers)
 * و /sell/product/[id] (rows از getSaverAnalysis همان کالا).
 * چیپ‌های «نوع مشتری» = setCustType واقعی (روی یال فالو) — درصدِ هر چیپ از
 * قاعدهٔ کاتالوگ (pricingState) می‌آید تا همیشه با صفحهٔ تخفیف‌ها یکی باشد.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useMyFollowers,
  usePricingState,
  useSetCustType,
} from "@/lib/queries";
import { fa, frequencyLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { Sheet } from "@/components/imach/sheet";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";
import { faPct } from "./num";

export interface FollowerRowLite {
  id: string;
  name: string;
  city: string | null;
  since: string;
  source: "ORGANIC" | "SHARED" | "PROMO";
  custType?: "PASSING" | "PARTNER" | "CONTRACT" | null;
  need: { volume: number | null; frequency: string | null } | null;
}

const TYPE_KEYS = ["PASSING", "PARTNER", "CONTRACT"] as const;
type CustType = (typeof TYPE_KEYS)[number];
const TYPE_LABEL: Record<CustType, string> = { PASSING: "typePassing", PARTNER: "typePartner", CONTRACT: "typeContract" };
const SRC_LABEL: Record<string, string> = { ORGANIC: "srcOrganic", SHARED: "srcShared", PROMO: "srcPromo" };
const SRC_CLASS: Record<string, string> = { ORGANIC: "src-b src-organic", SHARED: "src-b src-link", PROMO: "src-b src-promo" };

const daysSince = (iso: string): number =>
  Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export function FollowersSheet({
  open,
  onClose,
  businessId,
  mode,
  rows: itemRows,
  listingId,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  mode: "catalog" | "item";
  /** mode="item" — ردیف‌های saverAnalysis همان کالا (والد می‌دهد) */
  rows?: FollowerRowLite[];
  /** mode="item" — برای برچسب درصدِ نوع مشتری، قاعدهٔ اختصاصی همین کالا ملاک است (کالا › کاتالوگ) */
  listingId?: string;
}) {
  const m = useMessages();
  const t = m.app.followers as unknown as Record<string, string>;
  const { locale } = useLocale();
  const { toast } = useToast();
  const followersQ = useMyFollowers(businessId);
  const pricingQ = usePricingState(businessId);
  const setCustType = useSetCustType();
  const [expanded, setExpanded] = useState(false);

  /** درصدهای مؤثر — در حالت کالا: قاعدهٔ اختصاصی همان کالا اگر باشد، وگرنه کاتالوک */
  const effPct = (k: "p" | "h" | "q"): number => {
    const item = mode === "item" && listingId
      ? pricingQ.data?.items.find((it) => it.listingId === listingId)
      : null;
    const pct = item?.rule?.custPct?.[k];
    return pct != null ? pct : (pricingQ.data?.catalog?.custPct[k] ?? 0);
  };

  const rows: FollowerRowLite[] = useMemo(() => {
    if (mode === "item") return itemRows ?? [];
    return (followersQ.data?.rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      since: r.followedAt,
      source: (r.source ?? (r.viaRef ? "SHARED" : "ORGANIC")) as "ORGANIC" | "SHARED" | "PROMO",
      custType: r.custType ?? "PASSING",
      need: r.latestRequest ? { volume: r.latestRequest.volume, frequency: r.latestRequest.frequency } : null,
    }));
  }, [mode, itemRows, followersQ.data]);

  const summary = useMemo(() => {
    if (mode === "item") {
      const by = (s: string) => rows.filter((r) => r.source === s).length;
      return { total: rows.length, organic: by("ORGANIC"), shared: by("SHARED"), promo: by("PROMO") };
    }
    return followersQ.data?.summary ?? { total: 0, organic: 0, shared: 0, promo: 0 };
  }, [mode, rows, followersQ.data]);

  const loading = mode === "catalog" ? followersQ.isLoading : false;
  const visible = expanded ? rows : rows.slice(0, 3);

  const pick = (buyerId: string, type: CustType) => {
    setCustType.mutate(
      { businessId, buyerId, type },
      {
        onSuccess: () => toast({ title: (t.typeSaved as string).replace("{type}", t[TYPE_LABEL[type]] as string) }),
        onError: () => toast({ title: t.typeSaveFailed as string, variant: "destructive" }),
      }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} label={t.title as string}>
      <div className="grab" />
      <h3>{(mode === "item" ? t.titleItem : t.title) as string}</h3>
      <div className="sub">
        {(mode === "item" ? t.subItem : t.sub).replace("{n}", fa(summary.total))}
      </div>

      <div className="src-sum">
        <Icon className="ic-sm ic-12" name="i-info" />
        <b>{fa(summary.shared)}</b> {t.srcLink as string} · <b>{fa(summary.organic)}</b> {t.srcBoard as string} ·{" "}
        <b>{fa(summary.promo)}</b> {t.srcPromo as string}
      </div>

      <div className="hint" style={{ marginTop: 10 }}>
        <Icon name="i-users" />
        <span>{t.typeHint as string}</span>
      </div>

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", padding: 20 }}>
          <Spinner size={22} />
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state" style={{ padding: "18px 0" }}>
          <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
            <Icon name="i-bm" />
          </span>
          <h3>{t.emptyTitle as string}</h3>
          <p>{t.emptySub as string}</p>
        </div>
      ) : (
        <>
          {visible.map((r) => (
            <div className="sheet-row" style={{ cursor: "default", flexWrap: "wrap" }} key={r.id}>
              <div className="avatar" style={{ background: "var(--teal-strong)" }}>
                {r.name.trim().charAt(0) || "؟"}
              </div>
              <span className="tx">
                <b>{r.name}</b>
                <span>
                  {r.city ?? "—"} · {(t.sinceAgo as string).replace("{d}", fa(daysSince(r.since)))}
                  {r.need?.volume != null
                    ? ` · ${(t.needLine as string).replace("{v}", fa(r.need.volume)).replace("{f}", r.need.frequency ? frequencyLabel(r.need.frequency, locale) : "")}`
                    : ""}
                </span>
              </span>
              <span className={SRC_CLASS[r.source] ?? SRC_CLASS.ORGANIC}>
                <Icon name={r.source === "PROMO" ? "i-star" : r.source === "SHARED" ? "i-share" : "i-eye"} />
                {t[SRC_LABEL[r.source]] as string}
              </span>
              <div className="ct-chips">
                <span className="ct-lbl">{t.typeLabel as string}</span>
                {TYPE_KEYS.map((k) => {
                  const label =
                    k === "PASSING"
                      ? (t.typePassing as string)
                      : `${t[TYPE_LABEL[k]] as string} ${faPct(effPct(k === "PARTNER" ? "h" : "q"))}`;
                  const on = (r.custType ?? "PASSING") === k;
                  return (
                    <button
                      key={k}
                      className={on ? "chip mini on" : "chip mini"}
                      disabled={setCustType.isPending}
                      onClick={() => pick(r.id, k)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {rows.length > 3 && !expanded ? (
            <button
              className="card dashed tap"
              style={{ width: "100%", textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", padding: 10, marginTop: 2 }}
              onClick={() => setExpanded(true)}
            >
              {(t.moreN as string).replace("{n}", fa(rows.length - 3))}
            </button>
          ) : null}
        </>
      )}

      <div className="hint" style={{ marginTop: 10 }}>
        <Icon name="i-info" />
        <span>{t.freshHint as string}</span>
      </div>

      <Link className="btn btn-primary btn-lg btn-block" href="/sell/catalog">
        <Icon className="ic-sm" name="i-share" /> {t.shareCta as string}
      </Link>

      <div className="card" style={{ boxShadow: "none", padding: "4px 14px", marginTop: 10 }}>
        <div className="earn-row" style={{ cursor: "default" }}>
          <span className="e-ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}>
            <Icon name="i-share" />
          </span>
          <span className="tx">
            <b>{t.earnInviteTitle as string}</b>
            <span>{t.earnInviteSub as string}</span>
          </span>
        </div>
        <Link className="earn-row" href="/sell/campaign" style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>
          <span className="e-ico" style={{ background: "var(--orange-tint)", color: "var(--primary-strong)" }}>
            <Icon name="i-star" />
          </span>
          <span className="tx">
            <b>{t.earnPromoTitle as string}</b>
            <span>{t.earnPromoSub as string}</span>
          </span>
          <Icon className="ic-sm" name="i-chev" style={{ color: "var(--muted)" }} />
        </Link>
      </div>
    </Sheet>
  );
}
