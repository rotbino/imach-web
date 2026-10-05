"use client";

/**
 * تخفیف‌ها — پورت کامل sc-discount (v18 · فاز ۵ مهاجرت).
 *
 *   قیمت پایه − (تخفیف مشتری + تخفیف حجمی) = قیمت نهایی
 *   اولویت: کالا › گروه کالا › کاتالوگ — همیشه خاص‌تر برنده
 *
 * سه تب (tbar):
 *   ۱ تخفیف مشتری — سه سطح: کاتالوگ (۳ ردیف گذری/همکار/قراردادی + «می‌شود X» زنده)
 *     · گروه کالا (customCategories — lvl-edit بازشو) · کالای مشخص (ردیف → شیت)
 *   ۲ تخفیف حجمی — پله‌های کاتالوگ (base + ردیف‌ها + پلهٔ جدید) + گروه‌ها
 *   ۳ پیش‌نمایش — چیپ کالا/نوع مشتری/حجم → /pricing/preview واقعی + pp-brk
 *
 * ذخیرهٔ هر سطح = /pricing/* — سرور نرمال‌سازی/clamp می‌کند و state برمی‌گرداند.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useActiveBusiness } from "@/lib/active-biz";
import {
  usePricingBulk,
  usePricingPreview,
  usePricingState,
  useSavePricingCatalog,
  useSavePricingGroup,
} from "@/lib/queries";
import type { PricingTier } from "@/lib/api";
import { businessesApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { fa, fmtMoney, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { Sheet } from "@/components/imach/sheet";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";
import { ItemDiscountSheet } from "../_shared/item-discount-sheet";
import { parseNum, faPlain, faPct } from "../_shared/num";

type CustKey = "p" | "h" | "q";
type Tab = "cust" | "volume" | "preview";
type TierRow = { from: string; to: string; pct: string };

const CUST_KEYS: CustKey[] = ["p", "h", "q"];
const CUST_LABEL: Record<CustKey, string> = { p: "custPassing", h: "custPartner", q: "custContract" };
const CUST_SUB: Record<CustKey, string> = { p: "custPassingSub", h: "custPartnerSub", q: "custContractSub" };

export function DiscountsView() {
  const m = useMessages();
  const t = m.app.discounts as unknown as Record<string, string>;
  const { locale } = useLocale();
  const { toast } = useToast();
  const qc = useQueryClient();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const stateQ = usePricingState(bizId);
  const saveCat = useSavePricingCatalog();
  const saveGrp = useSavePricingGroup();
  const bulkMut = usePricingBulk();

  const [tab, setTab] = useState<Tab>("cust");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [itemListing, setItemListing] = useState<string | null>(null);

  // ویرایشگر کاتالوگ — override کاربر روی state سرور (الگوی quote-form، بدون effect)
  const [custEd, setCustEd] = useState<Partial<Record<CustKey, string>>>({});
  const [tiersEd, setTiersEd] = useState<TierRow[] | null>(null);
  // ویرایشگر گروهِ باز — override با قید refId
  const [grpEd, setGrpEd] = useState<{ refId: string; h: string; q: string; tiers: TierRow[] | null } | null>(null);

  // پیش‌نمایش
  const [pvListingSel, setPvListing] = useState<string | null>(null);
  const [pvCust, setPvCust] = useState<CustKey>("h");
  const [pvQty, setPvQty] = useState<number>(250);

  const state = stateQ.data ?? null;
  const items = state?.items ?? [];
  const sampleBase = items.find((x) => x.priceMinor != null) ?? null;

  // مقادیر مؤثر ویرایشگر کاتالوگ — override یا مشتق از سرور
  const cust: Record<CustKey, string> = {
    p: custEd.p ?? String(state?.catalog?.custPct.p ?? 0),
    h: custEd.h ?? String(state?.catalog?.custPct.h ?? 0),
    q: custEd.q ?? String(state?.catalog?.custPct.q ?? 0),
  };
  const tiers: TierRow[] = tiersEd ?? (state?.catalog?.tiers.length
    ? state.catalog.tiers.map((x) => ({ from: String(x.from), to: x.to == null ? "" : String(x.to), pct: String(x.pct) }))
    : [{ from: "", to: "", pct: "" }]);

  // مقادیر مؤثر ویرایشگر گروهِ باز
  const openGroupRow = state?.groups.find((x) => x.refId === openGroup) ?? null;
  const grpActive = grpEd && grpEd.refId === openGroup ? grpEd : null;
  const grpCust: { h: string; q: string } = {
    h: grpActive?.h ?? String(openGroupRow?.custPct?.h ?? 0),
    q: grpActive?.q ?? String(openGroupRow?.custPct?.q ?? 0),
  };
  const grpTiers: TierRow[] = (grpActive?.tiers ?? (openGroupRow?.tiers?.length
    ? openGroupRow.tiers.map((x) => ({ from: String(x.from), to: x.to == null ? "" : String(x.to), pct: String(x.pct) }))
    : null)) ?? [{ from: "", to: "", pct: "" }];

  // پیش‌نمایش — انتخاب پیش‌فرض: اولین کالا (derived)
  const pvListing = pvListingSel ?? items[0]?.listingId ?? null;
  const previewQ = usePricingPreview(bizId, pvListing, pvCust, pvQty);

  const qtyChips = useMemo(() => {
    const froms = (state?.catalog?.tiers ?? []).map((x) => x.from).filter((n) => n > 0);
    return [...new Set([...froms.slice(0, 2), 100, 250, 400, 800])].slice(0, 4).sort((a, b) => a - b);
  }, [state?.catalog?.tiers]);

  if (stateQ.isLoading || !biz) {
    return (
      <section className="screen" data-screen="discount">
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

  const baseToman = (sampleBase?.priceMinor ?? 0) / 10;
  const sampleUnit = sampleBase ? unitLabel(sampleBase.unit, locale) : "";
  const custNum = (k: CustKey): number => parseNum(cust[k]);
  const tiersPayload = (): PricingTier[] =>
    tiers.map((r) => ({ from: parseNum(r.from), to: r.to.trim() ? parseNum(r.to) : null, pct: parseNum(r.pct) })).filter((r) => r.from > 0);

  const saveCatalog = () => {
    saveCat.mutate(
      {
        businessId: biz.id,
        custPct: { p: custNum("p"), h: custNum("h"), q: custNum("q") },
        tiers: tiersPayload(),
      },
      {
        onSuccess: () => {
          setCustEd({});
          setTiersEd(null);
          toast({ title: t.savedCatalog as string });
        },
        onError: () => toast({ title: t.saveFailed as string, variant: "destructive" }),
      }
    );
  };

  const saveGroup = (refId: string) => {
    saveGrp.mutate(
      {
        refId,
        businessId: biz.id,
        custPct: { h: parseNum(grpCust.h), q: parseNum(grpCust.q) },
        tiers: grpTiers.map((r) => ({ from: parseNum(r.from), to: r.to.trim() ? parseNum(r.to) : null, pct: parseNum(r.pct) })).filter((r) => r.from > 0),
      },
      {
        onSuccess: () => {
          setGrpEd(null);
          toast({ title: t.savedGroup as string });
        },
        onError: () => toast({ title: t.saveFailed as string, variant: "destructive" }),
      }
    );
  };

  const tierRangeLabel = (from: number, to: number | null, unit: string): string =>
    to == null
      ? `${fa(from)} ${unit} ${(t.tierAbove as string)}`
      : `${fa(from)} ${t.tierTo as string} ${fa(to)} ${unit}`;

  const pv = previewQ.data ?? null;
  const fromLabel = (v: string | null): string => {
    const key = ({ ITEM: "fromItem", GROUP: "fromGroup", CATALOG: "fromCatalog", NONE: "fromNone" } as Record<string, string>)[v ?? "NONE"] ?? "fromNone";
    return t[key] as string;
  };

  return (
    <section className="screen" data-screen="discount">
      <div className="pagehead">
        <Link className="back" href="/sell/catalog" aria-label={m.app.rfq.back as string}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{t.title as string}</b>
          <span>{t.sub as string}</span>
        </div>
        <button className="icon-btn help-loud" onClick={() => setHelpOpen(true)} aria-label={t.helpAria as string} title={t.helpTitle as string}>
          <Icon className="ic" name="i-info" />
        </button>
      </div>

      <div className="screen-body">
        {/* جریان ساخت قیمت */}
        <div className="card">
          <div className="ng-title"><Icon className="ic-sm" style={{ width: 13, height: 13 }} name="i-percent" /> {t.formulaTitle as string}</div>
          <div className="formula-flow">
            <div className="ff-node"><span className="k">{t.ffBase as string}</span><span className="v">{sampleBase ? faPlain(baseToman) : "—"}</span></div>
            <span className="ff-op">−</span>
            <div className="ff-node"><span className="k">{t.ffCust as string}</span><span className="v">{`٪۰–${Math.max(custNum("h"), custNum("q"))}`}</span></div>
            <span className="ff-op">+</span>
            <div className="ff-node"><span className="k">{t.ffVolume as string}</span><span className="v">{`٪۰–${Math.max(0, ...tiersPayload().map((x) => x.pct))}`}</span></div>
            <span className="ff-op">=</span>
            <div className="ff-node res">
              <span className="k">{t.ffFinal as string}</span>
              <span className="v">
                {sampleBase ? faPlain(baseToman * (1 - Math.min(90, custNum("h") + (tiersPayload()[0]?.pct ?? 0)) / 100)) : "—"}
                <small>{(t.ffSample as string).replace("{n}", fa(tiersPayload()[0]?.from ?? 250)) + ` ${sampleUnit}`}</small>
              </span>
            </div>
          </div>
          <div className="unit-calc" style={{ marginTop: 10 }}>
            <Icon name="i-shield" />
            <span>{t.formulaRule as string}</span>
          </div>
        </div>

        {/* تب‌بار */}
        <div className="tbar">
          <button className={tab === "cust" ? "tb on" : "tb"} onClick={() => setTab("cust")}><Icon name="i-users" /> {t.tabCust as string}</button>
          <button className={tab === "volume" ? "tb on" : "tb"} onClick={() => setTab("volume")}><Icon name="i-steps" /> {t.tabVolume as string}</button>
          <button className={tab === "preview" ? "tb on" : "tb"} onClick={() => setTab("preview")}><Icon name="i-eye" /> {t.tabPreview as string}</button>
        </div>

        {/* ═══ تب ۱: تخفیف مشتری ═══ */}
        {tab === "cust" ? (
          <div className="tbpanel on">
            {/* سطح ۱ — کل کاتالوگ */}
            <div className="lvl-blk">
              <div className="lvl-head">
                <span className="lh-ico"><Icon name="i-store" /></span>
                <span className="lh-tx"><b>{t.lvlCatalog as string}</b><span>{t.lvlCatalogSub as string}</span></span>
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} disabled={saveCat.isPending} onClick={saveCatalog}>
                  {saveCat.isPending ? "…" : (t.saveCta as string)}
                </button>
              </div>
              <div className="card" style={{ boxShadow: "none", padding: "2px 13px" }}>
                {CUST_KEYS.map((k) => (
                  <div className="ds-row" key={k}>
                    <span className="ds-who"><b>{t[CUST_LABEL[k]] as string}</b><span>{t[CUST_SUB[k]] as string}</span></span>
                    <span className="ds-inp">
                      <input
                        className="inp"
                        inputMode="numeric"
                        value={cust[k]}
                        onChange={(e) => setCustEd((p) => ({ ...p, [k]: e.target.value }))}
                        aria-label={t[CUST_LABEL[k]] as string}
                      />
                      <i>٪</i>
                    </span>
                    <span className={custNum(k) > 0 ? "ds-eq" : "ds-eq off"}>
                      {custNum(k) > 0
                        ? `${t.becomes as string} ${sampleBase ? faPlain(baseToman * (1 - custNum(k) / 100)) : "—"}`
                        : (t.noDiscount as string)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="lvl-note">{(t.lvlCatalogNote as string).replace("{base}", sampleBase ? faPlain(baseToman) : "—")}</div>
            </div>

            {/* سطح ۲ — گروه کالا */}
            <div className="lvl-blk">
              <div className="lvl-head">
                <span className="lh-ico teal"><Icon name="i-box" /></span>
                <span className="lh-tx"><b>{t.lvlGroup as string}</b><span>{t.lvlGroupSub as string}</span></span>
                <button className="more" onClick={() => setGroupOpen(true)}><Icon className="ic-sm ic-12" name="i-plus" /> {t.newGroupCta as string}</button>
              </div>
              {(state?.groups ?? []).map((g) => (
                <div key={g.refId}>
                  <button className={openGroup === g.refId ? "grp-row sel" : "grp-row"} style={{ width: "100%" }} onClick={() => setOpenGroup(openGroup === g.refId ? null : g.refId)}>
                    <span className="g-ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}><Icon name="i-box" /></span>
                    <span className="tx"><b>{g.name}</b><span>{(t.groupCount as string).replace("{n}", fa(g.itemCount))}</span></span>
                    {g.custPct ? (
                      <span className="ov-badge gg">{`${t.custPartner as string} ${faPct(g.custPct.h ?? 0)} · ${t.custContract as string} ${faPct(g.custPct.q ?? 0)}`}</span>
                    ) : (
                      <span className="ov-badge">{t.groupNoRule as string}</span>
                    )}
                    <Icon className="chev" name="i-chev" />
                  </button>
                  {openGroup === g.refId ? (
                    <div className="lvl-edit open">
                      <div className="ds-row">
                        <span className="ds-who"><b>{t.grpPartner as string}</b><span>{t.grpPartnerSub as string}</span></span>
                        <span className="ds-inp"><input className="inp" inputMode="numeric" value={grpCust.h} onChange={(e) => setGrpEd({ refId: openGroup ?? "", h: e.target.value, q: grpCust.q, tiers: grpActive?.tiers ?? null })} /><i>٪</i></span>
                        <span className="ds-eq">{sampleBase ? `${t.becomes as string} ${faPlain(baseToman * (1 - parseNum(grpCust.h) / 100))}` : "—"}</span>
                      </div>
                      <div className="ds-row">
                        <span className="ds-who"><b>{t.grpContract as string}</b><span>{t.grpContractSub as string}</span></span>
                        <span className="ds-inp"><input className="inp" inputMode="numeric" value={grpCust.q} onChange={(e) => setGrpEd({ refId: openGroup ?? "", h: grpCust.h, q: e.target.value, tiers: grpActive?.tiers ?? null })} /><i>٪</i></span>
                        <span className="ds-eq">{sampleBase ? `${t.becomes as string} ${faPlain(baseToman * (1 - parseNum(grpCust.q) / 100))}` : "—"}</span>
                      </div>
                      <button className="btn btn-primary btn-sm btn-block" style={{ marginTop: 8 }} disabled={saveGrp.isPending} onClick={() => saveGroup(g.refId)}>
                        {saveGrp.isPending ? "…" : (t.saveGroupCta as string)}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              <div className="lvl-note">{t.lvlGroupNote as string}</div>
            </div>

            {/* سطح ۳ — کالای مشخص */}
            <div className="lvl-blk">
              <div className="lvl-head">
                <span className="lh-ico amber"><Icon name="i-percent" /></span>
                <span className="lh-tx"><b>{t.lvlItem as string}</b><span>{t.lvlItemSub as string}</span></span>
              </div>
              {items.filter((x) => x.rule).slice(0, 8).map((x) => (
                <button className="grp-row" style={{ width: "100%" }} key={x.listingId} onClick={() => setItemListing(x.listingId)}>
                  <span className="g-ico" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}><Icon name="i-percent" /></span>
                  <span className="tx"><b>{x.name}</b><span>{x.priceMinor != null ? `${faPlain(x.priceMinor / 10)} ${t.tomanPerUnit as string} ${unitLabel(x.unit, locale)}` : "—"}</span></span>
                  <span className="ov-badge">{`${t.custPartner as string} ${faPct(x.rule?.custPct.h ?? 0)} · ${t.custContract as string} ${faPct(x.rule?.custPct.q ?? 0)}`}</span>
                  <Icon className="chev" name="i-chev" />
                </button>
              ))}
              <div className="link-row ds-link" onClick={() => setBulkOpen(true)}>
                <Icon name="i-box" /> {t.bulkLink as string}
                <Icon className="lv" name="i-chev" />
              </div>
              <div className="lvl-note">{t.lvlItemNote as string}</div>
            </div>
          </div>
        ) : null}

        {/* ═══ تب ۲: تخفیف حجمی ═══ */}
        {tab === "volume" ? (
          <div className="tbpanel on">
            <div className="lvl-blk" style={{ marginTop: 2 }}>
              <div className="lvl-head">
                <span className="lh-ico"><Icon name="i-steps" /></span>
                <span className="lh-tx"><b>{t.lvlCatalog as string}</b><span>{t.lvlCatalogVolSub as string}</span></span>
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} disabled={saveCat.isPending} onClick={saveCatalog}>
                  {saveCat.isPending ? "…" : (t.saveCta as string)}
                </button>
              </div>
              <div className="card" style={{ boxShadow: "none", padding: "2px 13px" }}>
                <div className="ds-tier base">
                  <span className="t-rng">{(t.tierBase as string).replace("{min}", sampleBase?.minOrder ? fa(sampleBase.minOrder) : fa(100)).replace("{unit}", ` ${sampleUnit}`)}</span>
                  <span className="t-tag">{t.tierMinOrder as string}</span>
                  <span className="ds-eq off">{t.noDiscount as string}</span>
                </div>
                {tiers.map((r, i) => (
                  <div className="ds-tier" key={i}>
                    <span className="t-rng">
                      {t.tierFrom as string}
                      <input className="inp t-in" inputMode="numeric" placeholder="—" aria-label={t.tierFrom as string} value={r.from}
                        onChange={(e) => setTiersEd((p0) => (p0 ?? tiers).map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
                      {t.tierTo as string}
                      <input className="inp t-in" inputMode="numeric" placeholder="—" aria-label={t.tierTo as string} value={r.to}
                        onChange={(e) => setTiersEd((p0) => (p0 ?? tiers).map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
                      {sampleUnit}
                    </span>
                    <span className="ds-inp">
                      <input className="inp" inputMode="numeric" placeholder="٪" value={r.pct}
                        onChange={(e) => setTiersEd((p0) => (p0 ?? tiers).map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} />
                      <i>٪</i>
                    </span>
                    <span className="ds-eq off">
                      {parseNum(r.pct) > 0
                        ? `${t.custPartner as string} ${faPct(custNum("h") + parseNum(r.pct))} → ${sampleBase ? faPlain(baseToman * (1 - (custNum("h") + parseNum(r.pct)) / 100)) : "—"}`
                        : (t.tierWritePct as string)}
                    </span>
                  </div>
                ))}
                <button className="ds-add" onClick={() => setTiersEd([...tiers, { from: "", to: "", pct: "" }])}>
                  <Icon className="ic-sm" name="i-plus" /> {t.addTier as string}
                </button>
              </div>
              <div className="lvl-note">{t.tierNote as string}</div>
            </div>

            {/* گروه‌ها — پله‌های جدا */}
            <div className="lvl-blk">
              <div className="lvl-head">
                <span className="lh-ico teal"><Icon name="i-box" /></span>
                <span className="lh-tx"><b>{t.lvlGroup as string}</b><span>{t.lvlGroupVolSub as string}</span></span>
              </div>
              {(state?.groups ?? []).map((g) => (
                <div key={g.refId}>
                  <button className={openGroup === g.refId ? "grp-row sel" : "grp-row"} style={{ width: "100%" }} onClick={() => setOpenGroup(openGroup === g.refId ? null : g.refId)}>
                    <span className="g-ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}><Icon name="i-steps" /></span>
                    <span className="tx"><b>{g.name}</b><span>{g.tiers?.length ? (t.groupTiersOwn as string) : (t.groupTiersCatalog as string)}</span></span>
                    {g.tiers?.length ? <span className="ov-badge gg">{g.tiers.map((x) => faPct(x.pct)).join(" · ")}</span> : null}
                    <Icon className="chev" name="i-chev" />
                  </button>
                  {openGroup === g.refId ? (
                    <div className="lvl-edit open">
                      {grpTiers.map((r, i) => (
                        <div className="ds-tier" key={i}>
                          <span className="t-rng">
                            {t.tierFrom as string}
                            <input className="inp t-in" inputMode="numeric" placeholder="—" value={r.from}
                              onChange={(e) => setGrpEd({ refId: openGroup ?? "", h: grpCust.h, q: grpCust.q, tiers: (grpActive?.tiers ?? grpTiers).map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })} />
                            {t.tierTo as string}
                            <input className="inp t-in" inputMode="numeric" placeholder="—" value={r.to}
                              onChange={(e) => setGrpEd({ refId: openGroup ?? "", h: grpCust.h, q: grpCust.q, tiers: (grpActive?.tiers ?? grpTiers).map((x, j) => (j === i ? { ...x, to: e.target.value } : x)) })} />
                            {sampleUnit}
                          </span>
                          <span className="ds-inp">
                            <input className="inp" inputMode="numeric" placeholder="٪" value={r.pct}
                              onChange={(e) => setGrpEd({ refId: openGroup ?? "", h: grpCust.h, q: grpCust.q, tiers: (grpActive?.tiers ?? grpTiers).map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)) })} />
                            <i>٪</i>
                          </span>
                          <span className="ds-eq off">{t.grpTierEq as string}</span>
                        </div>
                      ))}
                      <button className="ds-add" onClick={() => setGrpEd({ refId: openGroup ?? "", h: grpCust.h, q: grpCust.q, tiers: [...grpTiers, { from: "", to: "", pct: "" }] })}>
                        <Icon className="ic-sm" name="i-plus" /> {t.addTier as string}
                      </button>
                      <button className="btn btn-primary btn-sm btn-block" style={{ marginTop: 8 }} disabled={saveGrp.isPending} onClick={() => saveGroup(g.refId)}>
                        {saveGrp.isPending ? "…" : (t.saveGroupCta as string)}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* کالای مشخص — پله‌های جدا */}
            <div className="lvl-blk">
              <div className="lvl-head">
                <span className="lh-ico amber"><Icon name="i-percent" /></span>
                <span className="lh-tx"><b>{t.lvlItem as string}</b><span>{t.lvlItemVolSub as string}</span></span>
              </div>
              {items.filter((x) => x.rule?.tiers?.length).slice(0, 8).map((x) => (
                <button className="grp-row" style={{ width: "100%" }} key={x.listingId} onClick={() => setItemListing(x.listingId)}>
                  <span className="g-ico" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}><Icon name="i-steps" /></span>
                  <span className="tx"><b>{x.name}</b><span>{t.itemTiersOwn as string}</span></span>
                  <Icon className="chev" name="i-chev" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* ═══ تب ۳: پیش‌نمایش ═══ */}
        {tab === "preview" ? (
          <div className="tbpanel on">
            <div className="ng-title">{t.pvGood as string}</div>
            <div className="chips">
              {items.slice(0, 6).map((x) => (
                <button key={x.listingId} className={pvListing === x.listingId ? "chip active" : "chip"} onClick={() => setPvListing(x.listingId)}>
                  {x.name}{x.priceMinor != null ? ` · ${faPlain(x.priceMinor / 10)}` : ""}
                </button>
              ))}
            </div>
            <div className="ng-title">{t.pvCustType as string}</div>
            <div className="chips">
              {CUST_KEYS.map((k) => (
                <button key={k} className={pvCust === k ? "chip active" : "chip"} onClick={() => setPvCust(k)}>
                  {t[CUST_LABEL[k]] as string}
                </button>
              ))}
            </div>
            <div className="ng-title">{t.pvQty as string}</div>
            <div className="chips">
              {qtyChips.map((n) => (
                <button key={n} className={pvQty === n ? "chip active" : "chip"} onClick={() => setPvQty(n)}>
                  {fa(n)} {sampleUnit}
                </button>
              ))}
            </div>
            <div className="pr-preview">
              {previewQ.isLoading || !pv ? (
                <div style={{ display: "grid", placeItems: "center", padding: 18 }}>
                  <Spinner size={20} />
                </div>
              ) : (
                <>
                  <div className="pp-res">
                    <span className="who">
                      {`${t[CUST_LABEL[pvCust]] as string} · ${pv.goodName} · ${fa(pvQty)} ${unitLabel(pv.unit, locale)}`}
                    </span>
                    <span className="big">{faPlain(pv.finalMinor / 10)}</span>
                    <span className="u">{`${t.tomanPerUnit as string} ${unitLabel(pv.unit, locale)} — ${t.afterDiscount as string}`}</span>
                  </div>
                  <div className="pp-brk">
                    <div className="r"><span>{`${t.pvBase as string} (${pv.goodName})`}</span><b>{faPlain(pv.baseMinor / 10)}</b></div>
                    {pv.custPct > 0 ? (
                      <div className="r">
                        <span>{`${t[CUST_LABEL[pv.custType]] as string} — ${fromLabel(pv.custFrom)} (${faPct(pv.custPct)})`}</span>
                        <b className="minus">−{faPlain((pv.baseMinor - Math.round(pv.baseMinor * (1 - pv.custPct / 100))) / 10)}</b>
                      </div>
                    ) : null}
                    {pv.tierPct > 0 ? (
                      <div className="r">
                        <span>{`${t.pvVolume as string} ${pv.tierLabel ?? ""} ${sampleUnit} — ${fromLabel(pv.tierFrom)} (${faPct(pv.tierPct)})`}</span>
                        <b className="minus">−{faPlain((Math.round(pv.baseMinor * (1 - pv.custPct / 100)) - pv.finalMinor) / 10)}</b>
                      </div>
                    ) : null}
                    <div className="r"><span>{t.pvTotalDisc as string}</span><b className="minus">{faPct(pv.totalPct)}</b></div>
                    <div className="r"><span>{t.pvFinalUnit as string}</span><b>{faPlain(pv.finalMinor / 10)}</b></div>
                    <div className="r">
                      <span>{(t.pvOrderTotal as string).replace("{qty}", fa(pvQty))}</span>
                      <b>{fmtMoney(pv.orderTotalMinor, null, locale)}</b>
                    </div>
                  </div>
                  <div className="unit-calc" style={{ marginTop: 9 }}>
                    <Icon name="i-eye" />
                    <span>{t.pvNote as string}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        <div className="hint" style={{ marginTop: 11 }}>
          <Icon name="i-info" />
          <span>{t.hint as string}</span>
        </div>
      </div>

      {/* شیت راهنما */}
      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} label={t.helpTitle as string}>
        <div className="grab" />
        <h3>{t.helpTitle as string}</h3>
        <div className="sub">{t.helpSub as string}</div>
        <div className="card hp-hero">
          <span className="ico"><Icon name="i-percent" /></span>
          <span className="tx"><b>{t.helpHero as string}</b>{t.helpHeroSub as string}</span>
        </div>
        <div className="ng-title" style={{ marginTop: 13 }}>{t.helpLevelsTitle as string}</div>
        <div className="hp-lvl"><span className="n">۱</span><span className="tx"><b>{t.helpLvl1 as string}</b><span>{t.helpLvl1Sub as string}</span></span></div>
        <div className="hp-lvl"><span className="n">۲</span><span className="tx"><b>{t.helpLvl2 as string}</b><span>{t.helpLvl2Sub as string}</span></span></div>
        <div className="hp-lvl"><span className="n">۳</span><span className="tx"><b>{t.helpLvl3 as string}</b><span>{t.helpLvl3Sub as string}</span></span></div>
        <div className="hp-prio"><Icon name="i-bolt" /><span>{t.helpPrio as string}</span></div>
        <div className="hp-ex">
          <div className="ng-title" style={{ margin: "0 0 7px" }}>{t.helpBasketTitle as string}</div>
          {t.helpBasket as string}
        </div>
        <div className="ng-title" style={{ marginTop: 13 }}>{t.helpTwoKindsTitle as string}</div>
        <div className="hp-lvl"><span className="n"><Icon name="i-users" style={{ width: 13, height: 13 }} /></span><span className="tx"><b>{t.helpKindCust as string}</b><span>{t.helpKindCustSub as string}</span></span></div>
        <div className="hp-lvl"><span className="n"><Icon name="i-steps" style={{ width: 13, height: 13 }} /></span><span className="tx"><b>{t.helpKindVol as string}</b><span>{t.helpKindVolSub as string}</span></span></div>
        <div className="hp-ex">
          <div className="ng-title" style={{ margin: "0 0 7px" }}>{t.helpExampleTitle as string}</div>
          {t.helpExample as string}
        </div>
        <div className="unit-calc" style={{ marginTop: 10 }}><Icon name="i-info" /><span>{t.helpTriNote as string}</span></div>
        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }} onClick={() => setHelpOpen(false)}>
          <Icon className="ic-sm" name="i-check" /> {t.helpOk as string}
        </button>
      </Sheet>

      {/* شیت عملیات گروهی */}
      <BulkSheet open={bulkOpen} onClose={() => setBulkOpen(false)} businessId={biz.id} items={items} onDone={() => void qc.invalidateQueries({ queryKey: ["pricing"] })} />

      {/* شیت گروه جدید */}
      <NewGroupSheet open={groupOpen} onClose={() => setGroupOpen(false)} biz={biz} />

      {/* شیت تخفیف کالا */}
      <ItemDiscountSheet open={!!itemListing} onClose={() => setItemListing(null)} businessId={biz.id} listingId={itemListing} />
    </section>
  );
}

/** sheet-bulk — تخفیف یکسان روی چند کالا / بازگشت به کاتالوگ */
function BulkSheet({
  open,
  onClose,
  businessId,
  items,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  items: { listingId: string; name: string }[];
  onDone: () => void;
}) {
  const m = useMessages();
  const t = m.app.discounts as unknown as Record<string, string>;
  const { toast } = useToast();
  const bulkMut = usePricingBulk();
  const [sel, setSel] = useState<string[]>([]);
  const [action, setAction] = useState<"RESET" | "SAME">("RESET");
  const [p, setP] = useState<Record<CustKey, string>>({ p: "0", h: "0", q: "0" });

  const close = () => {
    setSel([]);
    setAction("RESET");
    setP({ p: "0", h: "0", q: "0" });
    onClose();
  };

  const apply = () => {
    bulkMut.mutate(
      {
        businessId,
        listingIds: sel,
        action,
        custPct: action === "SAME" ? { p: parseNum(p.p), h: parseNum(p.h), q: parseNum(p.q) } : undefined,
      },
      {
        onSuccess: (res) => {
          toast({ title: (t.bulkDone as string).replace("{n}", fa(res.affected)) });
          onDone();
          close();
        },
        onError: () => toast({ title: t.saveFailed as string, variant: "destructive" }),
      }
    );
  };

  return (
    <Sheet open={open} onClose={close} label={t.bulkTitle as string}>
      <div className="grab" />
      <h3>{t.bulkTitle as string}</h3>
      <div className="sub">{t.bulkSub as string}</div>
      <div className="card" style={{ boxShadow: "none" }}>
        <div className="ng-title" style={{ margin: "0 0 8px" }}>{t.bulkStep1 as string}</div>
        <div className="chips" style={{ flexWrap: "wrap", overflow: "visible" }}>
          {items.slice(0, 12).map((x) => (
            <button
              key={x.listingId}
              className={sel.includes(x.listingId) ? "chip active" : "chip"}
              onClick={() => setSel((s) => (s.includes(x.listingId) ? s.filter((y) => y !== x.listingId) : [...s, x.listingId]))}
            >
              {x.name}
            </button>
          ))}
        </div>
        <div className="ng-title" style={{ margin: "12px 0 8px" }}>{t.bulkStep2 as string}</div>
        <button className={action === "RESET" ? "mix-row sel" : "mix-row"} style={{ width: "100%" }} onClick={() => setAction("RESET")}>
          <span className="rd" />
          <span className="tx"><b>{t.bulkReset as string}</b><span>{t.bulkResetSub as string}</span></span>
        </button>
        <button className={action === "SAME" ? "mix-row sel" : "mix-row"} style={{ width: "100%" }} onClick={() => setAction("SAME")}>
          <span className="rd" />
          <span className="tx"><b>{t.bulkSame as string}</b><span>{t.bulkSameSub as string}</span></span>
        </button>
        {action === "SAME" ? (
          <div className="card" style={{ boxShadow: "none", padding: "2px 13px", marginTop: 8 }}>
            {CUST_KEYS.map((k) => (
              <div className="ds-row" key={k}>
                <span className="ds-who"><b>{t[CUST_LABEL[k]] as string}</b></span>
                <span className="ds-inp">
                  <input className="inp" inputMode="numeric" value={p[k]} onChange={(e) => setP((prev) => ({ ...prev, [k]: e.target.value }))} />
                  <i>٪</i>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <button className="btn btn-primary btn-lg btn-block" disabled={sel.length === 0 || bulkMut.isPending} onClick={apply}>
        {bulkMut.isPending ? "…" : (t.bulkApply as string).replace("{n}", fa(sel.length))}
      </button>
      <div className="hint" style={{ marginTop: 10 }}>
        <Icon name="i-shield" />
        <span>{t.bulkHint as string}</span>
      </div>
    </Sheet>
  );
}

/** sheet-new-group — ساخت دستهٔ شخصی کاتالوگ (customCategories) */
function NewGroupSheet({ open, onClose, biz }: { open: boolean; onClose: () => void; biz: { id: string; customCategories?: { id: string; name: string }[] | null } }) {
  const m = useMessages();
  const t = m.app.discounts as unknown as Record<string, string>;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName("");
    onClose();
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const cats = biz.customCategories ?? [];
      const id = `c${Date.now().toString(36)}`;
      await businessesApi.setCatalogCategories(biz.id, [...cats, { id, name: trimmed }]);
      await qc.invalidateQueries({ queryKey: ["businesses"] });
      toast({ title: (t.groupCreated as string).replace("{name}", trimmed) });
      close();
    } catch {
      toast({ title: t.saveFailed as string, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} label={t.newGroupTitle as string}>
      <div className="grab" />
      <h3>{t.newGroupTitle as string}</h3>
      <div className="sub">{t.newGroupSub as string}</div>
      <div className="field" style={{ margin: "12px 0 4px" }}>
        <label>{t.newGroupName as string}</label>
        <input className="inp" placeholder={t.newGroupPh as string} value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
      </div>
      <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }} disabled={saving || !name.trim()} onClick={() => void create()}>
        {saving ? "…" : (t.newGroupCreate as string)}
      </button>
      <div className="hint" style={{ marginTop: 10 }}>
        <Icon name="i-box" />
        <span>{t.newGroupHint as string}</span>
      </div>
    </Sheet>
  );
}
