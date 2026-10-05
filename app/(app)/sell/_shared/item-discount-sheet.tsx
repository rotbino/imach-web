"use client";

/**
 * sheet-item-discount (v18) — تخفیف‌های اختصاصی یک کالا.
 * میزبان: /sell/product/[id] (نوار pricing-state + دکمهٔ qa-grid) + /sell/discounts (ردیف کالای مشخص).
 *
 * دو حالت (mode-row):
 *   CATALOG → «همان تنظیمات کاتالوگ» — پنل: چه چیزی اعمال می‌شود (کاتالوگ واقعی)
 *   CUSTOM  → «تخفیف اختصاصی همین کالا» — تب مشتری (سه‌ورودی هم‌بسته: درصد/مبلغ/قیمت نهایی)
 *            + تب حجمی (پله‌های جایگزین کاتالوگ)
 *
 * سه‌ورودی: هر خانه را پر کنی دو تای دیگر خودکار حساب می‌شوند (الگوی triCalc
 * Prototype، اینجا React controlled). ذخیره از /pricing/item — سرور pct را
 * می‌سازد و منبع واحد محاسبه می‌ماند.
 */

import { useMemo, useState } from "react";
import { useMessages } from "@/i18n/messages/use-messages";
import { useSavePricingItem, usePricingState } from "@/lib/queries";
import type { PricingItemTri, PricingTier } from "@/lib/api";
import { unitLabel, fa } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { Sheet } from "@/components/imach/sheet";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";
import { parseNum, faPlain, faPct } from "./num";

type CustKey = "p" | "h" | "q";
type Field = "pct" | "amt" | "fin";
type TriRow = Record<Field, string>;
type TierRow = { from: string; to: string; pct: string };

const CUST_KEYS: CustKey[] = ["p", "h", "q"];
const CUST_LABEL: Record<CustKey, string> = { p: "custPassing", h: "custPartner", q: "custContract" };

/** برچسب بازهٔ پله — «۱۰۰ تا ۲۰۰ کیلو» / «۳۰۰ کیلو به بالا» */
function tierRange(from: number, to: number | null, unit: string, t: Record<string, string>): string {
  const u = unit || "";
  return to == null
    ? `${(t.tierFrom as string)} ${fa(from)} ${u} ${(t.tierAbove as string)}`
    : `${fa(from)} ${t.tierTo as string} ${fa(to)} ${u}`;
}

export function ItemDiscountSheet({
  open,
  onClose,
  businessId,
  listingId,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  listingId: string | null;
}) {
  const m = useMessages();
  const t = m.app.itemDiscount as unknown as Record<string, string>;
  const { locale } = useLocale();
  const { toast } = useToast();
  const stateQ = usePricingState(businessId);
  const saveMut = useSavePricingItem();

  const item = useMemo(
    () => stateQ.data?.items.find((it) => it.listingId === listingId) ?? null,
    [stateQ.data, listingId]
  );
  const catalog = stateQ.data?.catalog ?? null;

  /** حالت انتخابی — null = مشتق از قاعدهٔ موجود (الگوی quote-form، بدون effect) */
  const [modeSel, setModeSel] = useState<"CATALOG" | "CUSTOM" | null>(null);
  const [subTab, setSubTab] = useState<"cust" | "tiers">("cust");
  const [triEd, setTriEd] = useState<Record<CustKey, TriRow> | null>(null);
  const [tiersEd, setTiersEd] = useState<TierRow[] | null>(null);
  /** آخرین میدانی که کاربر در هر سطر تایپ کرد — همان مبنای ذخیره است؛
   *  دو میدان دیگر نمایشِ خودکار دارند و نباید ملاک payload شوند (باگ ۵۹) */
  const [lastField, setLastField] = useState<Partial<Record<CustKey, Field>>>({});

  if (!listingId || !item) return null;

  // مقادیر مؤثر: override کاربر یا مشتق از قاعدهٔ ذخیره‌شده
  const mode = modeSel ?? (item.rule ? "CUSTOM" : "CATALOG");
  const tri: Record<CustKey, TriRow> = triEd ?? (() => {
    const next: Record<CustKey, TriRow> = { p: { pct: "", amt: "", fin: "" }, h: { pct: "", amt: "", fin: "" }, q: { pct: "", amt: "", fin: "" } };
    if (item.rule?.itemTri) {
      for (const k of CUST_KEYS) {
        const v = item.rule.itemTri[k];
        if (!v) continue;
        if (v.kind === "pct") next[k] = { pct: String(v.valueToman), amt: "", fin: "" };
        else if (v.kind === "amt") next[k] = { pct: "", amt: String(v.valueToman), fin: "" };
        else next[k] = { pct: "", amt: "", fin: String(v.valueToman) };
      }
    }
    return next;
  })();
  const tiers: TierRow[] = tiersEd ?? (item.rule?.tiers?.length
    ? item.rule.tiers.map((x) => ({ from: String(x.from), to: x.to == null ? "" : String(x.to), pct: String(x.pct) }))
    : [{ from: "", to: "", pct: "" }, { from: "", to: "", pct: "" }]);

  const close = () => {
    setModeSel(null);
    setTriEd(null);
    setTiersEd(null);
    setLastField({});
    setSubTab("cust");
    onClose();
  };

  const unit = unitLabel(item.unit, locale);
  const baseToman = (item.priceMinor ?? 0) / 10;

  /** سه‌ورودی هم‌بسته — خانهٔ تایپ‌شده مبناست، دو تای دیگر بازمحاسبه.
   *  مقادیر محاسبه‌شده رشتهٔ عددی لاتین می‌مانند (نه فرمت‌شده) تا بازخوانی
   *  با parseNum بی‌افت باشد؛ ورودی کاربر عین تایپش می‌ماند (ارقام فارسی هم پارس می‌شوند) */
  const onTri = (k: CustKey, field: Field, raw: string) => {
    setLastField((p) => ({ ...p, [k]: field }));
    setTriEd((prev0) => {
      const prev = prev0 ?? tri;
      const row = { ...prev[k], [field]: raw };
      const v = parseNum(raw);
      if (field === "pct") {
        row.amt = String(Math.round((baseToman * v) / 100));
        row.fin = String(Math.round(baseToman * (1 - v / 100)));
      } else if (field === "amt") {
        row.pct = baseToman > 0 ? String(Math.round((v / baseToman) * 1000) / 10) : "0";
        row.fin = String(Math.max(0, Math.round(baseToman - v)));
      } else {
        row.pct = baseToman > 0 ? String(Math.round(((baseToman - v) / baseToman) * 1000) / 10) : "0";
        row.amt = String(Math.max(0, Math.round(baseToman - v)));
      }
      return { ...prev, [k]: row };
    });
  };

  const save = () => {
    if (mode === "CATALOG") {
      saveMut.mutate(
        { businessId, listingId, mode: "CATALOG" },
        {
          onSuccess: () => {
            toast({ title: t.resetDone as string });
            close();
          },
          onError: () => toast({ title: t.saveFailed as string, variant: "destructive" }),
        }
      );
      return;
    }
    // میدانِ تایپ‌شدهٔ کاربر ملاک است؛ بدون ویرایش، اولین میدانِ پر (همان kind ذخیره‌شده)
    const pickField = (k: CustKey): Field | null => {
      if (lastField[k]) return lastField[k];
      const row = tri[k];
      if (row.pct.trim()) return "pct";
      if (row.amt.trim()) return "amt";
      if (row.fin.trim()) return "fin";
      return null;
    };
    const payload: PricingItemTri = {};
    for (const k of CUST_KEYS) {
      const f = pickField(k);
      if (!f) continue;
      payload[k] = { kind: f === "pct" ? "pct" : f === "amt" ? "amt" : "fin", valueToman: parseNum(tri[k][f]) };
    }
    const tierPayload: PricingTier[] = tiers
      .map((r) => ({ from: parseNum(r.from), to: r.to.trim() ? parseNum(r.to) : null, pct: parseNum(r.pct) }))
      .filter((r) => r.from > 0);
    saveMut.mutate(
      { businessId, listingId, mode: "CUSTOM", tri: payload, tiers: tierPayload },
      {
        onSuccess: () => {
          toast({ title: t.saved as string });
          close();
        },
        onError: () => toast({ title: t.saveFailed as string, variant: "destructive" }),
      }
    );
  };

  const catPct = (k: CustKey): number => catalog?.custPct[k] ?? 0;

  return (
    <Sheet open={open} onClose={close} label={t.title as string}>
      <div className="grab" />
      <h3>{(t.titleN as string).replace("{name}", item.name)}</h3>
      <div className="sub">
        {(t.subBase as string).replace("{p}", faPlain(baseToman)).replace("{unit}", unit)}
      </div>

      {stateQ.isLoading ? (
        <div style={{ display: "grid", placeItems: "center", padding: 24 }}>
          <Spinner size={22} />
        </div>
      ) : (
        <>
          {/* حالت ۱ — همان تنظیمات کاتالوگ */}
          <button className={mode === "CATALOG" ? "mode-row sel" : "mode-row"} onClick={() => setModeSel("CATALOG")}>
            <span className="rd" />
            <span className="tx">
              <b>{t.modeCatalogTitle as string}</b>
              <span>{t.modeCatalogSub as string}</span>
            </span>
            {mode === "CATALOG" ? <span className="badge b-green" style={{ flexShrink: 0 }}>{t.activeBadge as string}</span> : null}
          </button>
          <div className={mode === "CATALOG" ? "pm-panel on" : "pm-panel"}>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="ng-title" style={{ margin: "0 0 7px" }}>{t.appliesTitle as string}</div>
              <div className="pp-brk" style={{ margin: 0 }}>
                {CUST_KEYS.filter((k) => catPct(k) > 0 || k !== "p").map((k) => (
                  <div className="r" key={k}>
                    <span>{`${t[CUST_LABEL[k]]} — ${t.fromCatalog as string}`}</span>
                    <b className="minus">
                      {catPct(k) > 0 ? `${faPct(catPct(k))} · ${faPlain(baseToman * (1 - catPct(k) / 100))}` : (t.noDiscount as string)}
                    </b>
                  </div>
                ))}
                {(catalog?.tiers ?? []).map((x, i) => (
                  <div className="r" key={i}>
                    <span>{tierRange(x.from, x.to, unit, t)}</span>
                    <b className="minus">{faPct(x.pct)}</b>
                  </div>
                ))}
                {!catalog ? <div className="r"><span>{t.noCatalogRule as string}</span><b>—</b></div> : null}
              </div>
              <div className="unit-calc">
                <Icon name="i-bolt" />
                <span>{t.autoNote as string}</span>
              </div>
            </div>
          </div>

          {/* حالت ۲ — تخفیف اختصاصی */}
          <button className={mode === "CUSTOM" ? "mode-row sel" : "mode-row"} onClick={() => setModeSel("CUSTOM")}>
            <span className="rd" />
            <span className="tx">
              <b>{t.modeCustomTitle as string}</b>
              <span>{t.modeCustomSub as string}</span>
            </span>
          </button>
          <div className={mode === "CUSTOM" ? "pm-panel on" : "pm-panel"}>
            <div className="tbar in-sheet">
              <button className={subTab === "cust" ? "tb on" : "tb"} onClick={() => setSubTab("cust")}>
                <Icon name="i-users" /> {t.tabCust as string}
              </button>
              <button className={subTab === "tiers" ? "tb on" : "tb"} onClick={() => setSubTab("tiers")}>
                <Icon name="i-steps" /> {t.tabTiers as string}
              </button>
            </div>

            {subTab === "cust" ? (
              <div className="tbpanel on">
                <div className="card" style={{ boxShadow: "none", padding: "2px 13px" }}>
                  {CUST_KEYS.map((k) => (
                    <div className="tri-row" key={k}>
                      <span className="tri-who">
                        <b>{t[CUST_LABEL[k]] as string}</b>
                        <em>{(t.fallbackCatalog as string).replace("{pct}", faPct(catPct(k)))}</em>
                      </span>
                      <div className="tri-grid">
                        <span className="tri-f">
                          <label>{t.fieldPct as string}</label>
                          <input className="inp" inputMode="numeric" placeholder="—" value={tri[k].pct} onChange={(e) => onTri(k, "pct", e.target.value)} />
                        </span>
                        <span className="tri-f">
                          <label>{t.fieldAmt as string}</label>
                          <input className="inp" inputMode="numeric" placeholder="—" value={tri[k].amt} onChange={(e) => onTri(k, "amt", e.target.value)} />
                        </span>
                        <span className="tri-f">
                          <label>{t.fieldFin as string}</label>
                          <input className="inp" inputMode="numeric" placeholder="—" value={tri[k].fin} onChange={(e) => onTri(k, "fin", e.target.value)} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="unit-calc" style={{ marginTop: 8 }}>
                  <Icon name="i-info" />
                  <span>{t.triNote as string}</span>
                </div>
              </div>
            ) : (
              <div className="tbpanel on">
                <div className="card" style={{ boxShadow: "none", padding: "2px 13px" }}>
                  <div className="ds-tier base">
                    <span className="t-rng">{(t.tierBase as string).replace("{min}", item.minOrder ? fa(item.minOrder) : "").replace("{unit}", item.minOrder ? ` ${unit}` : "")}</span>
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
                        {unit}
                      </span>
                      <span className="ds-inp">
                        <input className="inp" inputMode="numeric" placeholder="٪" value={r.pct}
                          onChange={(e) => setTiersEd((p0) => (p0 ?? tiers).map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} />
                        <i>٪</i>
                      </span>
                      <span className="ds-eq off">{parseNum(r.pct) > 0 ? `${faPct(parseNum(r.pct))}` : (t.tierWritePct as string)}</span>
                    </div>
                  ))}
                  <button className="ds-add" onClick={() => setTiersEd([...tiers, { from: "", to: "", pct: "" }])}>
                    <Icon className="ic-sm" name="i-plus" /> {t.addTier as string}
                  </button>
                </div>
                <div className="unit-calc" style={{ marginTop: 8 }}>
                  <Icon name="i-steps" />
                  <span>{t.itemTierNote as string}</span>
                </div>
              </div>
            )}
          </div>

          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary btn-lg" style={{ flex: 1.5 }} onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending ? "…" : (<><Icon className="ic-sm" name="i-check" /> {t.save as string}</>)}
            </button>
            <button className="btn btn-outline btn-lg" style={{ flex: 1 }} onClick={() => setModeSel("CATALOG")}>
              <Icon className="ic-sm" name="i-back" /> {t.resetCta as string}
            </button>
          </div>
          <div className="sub" style={{ margin: "10px 0 0" }}>{t.orderNote as string}</div>
        </>
      )}
    </Sheet>
  );
}
