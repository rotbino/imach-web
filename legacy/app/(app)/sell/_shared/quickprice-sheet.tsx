"use client";

/**
 * sheet-quickprice (v18) — به‌روزرسانی سریع قیمت پایه و موجودی یک کالا.
 * میزبان: /sell/catalog (چرخ‌دندهٔ کارت) + /sell/product/[id] (دکمهٔ «قیمت پایه»).
 * ذخیره = saveListing واقعی (priceMinor×۱۰ + stock) → دنبال‌کنندگان خبردار می‌شوند.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMessages } from "@/i18n/messages/use-messages";
import { listingsApi, type GoodItemDto } from "@/lib/api";
import { unitLabel, fa } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { Sheet } from "@/components/imach/sheet";
import { useToast } from "@/hooks/use-toast";
import { parseNum, toAsciiDigits, faPlain } from "./num";

export function QuickPriceSheet({
  open,
  onClose,
  listing,
  businessId,
  followersCount,
}: {
  open: boolean;
  onClose: () => void;
  listing: GoodItemDto | null;
  businessId: string;
  followersCount?: number;
}) {
  const m = useMessages();
  const t = m.app.quickPrice as unknown as Record<string, string>;
  const { locale } = useLocale();
  const { toast } = useToast();
  const qc = useQueryClient();

  /** مقادیر ویرایش‌شده — null یعنی مقدار مشتق از خود کالا (الگوی quote-form) */
  const [priceRaw, setPriceRaw] = useState<string | null>(null);
  const [stockRaw, setStockRaw] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!listing) return null;

  const price = priceRaw ?? (listing.priceMinor != null ? faPlain(listing.priceMinor / 10) : "");
  const stock = stockRaw ?? (listing.stock != null ? fa(listing.stock) : "");

  const unit = unitLabel(listing.good.unit, locale);
  const priceNum = parseNum(price);
  const stockNum = parseNum(stock);
  const packQty = (() => {
    const v = toAsciiDigits(listing.variantLabel ?? "").match(/(\d{1,4})\s*(?:کیلو|گرم|لیتر)/);
    return v ? Number(v[1]) : null;
  })();

  const save = async () => {
    if (priceNum <= 0) return;
    setSaving(true);
    try {
      await listingsApi.saveListing({
        businessId,
        goodId: listing.good.id,
        mode: listing.mode,
        listingId: listing.id,
        sell: {
          priceMinor: priceNum * 10,
          stock: stockNum > 0 ? stockNum : (listing.stock ?? 0),
          minOrder: listing.minOrder ?? 0,
        },
      });
      // بی‌درنگ ببند؛ بازآوریها در پس‌زمینه (void — منتظر چند کوئریِ market نمی‌مانیم)
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["market"] });
      void qc.invalidateQueries({ queryKey: ["pricing"] });
      toast({ title: (t.saved as string).replace("{name}", listing.good.nameFa) });
      setPriceRaw(null);
      setStockRaw(null);
      onClose();
    } catch {
      toast({ title: t.saveFailed as string, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label={t.title as string}>
      <div className="grab" />
      <h3>{t.title as string}</h3>
      <div className="sub">
        {(t.sub as string).replace("{name}", listing.good.nameFa)}
        {listing.variantLabel ? ` — ${listing.variantLabel}` : ""}
      </div>
      <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
        <div className="field">
          <label>
            {t.priceLabel as string} <i>— {(t.perUnit as string).replace("{unit}", unit)}</i>
          </label>
          <input
            className="inp inp-lg"
            style={{ direction: "ltr", textAlign: "right" }}
            inputMode="numeric"
            value={price}
            onChange={(e) => setPriceRaw(e.target.value)}
            disabled={saving}
          />
          {packQty && priceNum > 0 ? (
            <div className="unit-calc">
              <Icon name="i-info" />
              <span>
                {(t.packCalc as string)
                  .replace("{n}", fa(packQty))
                  .replace("{unit}", unit)
                  .replace("{p}", faPlain((priceNum * packQty)))}
              </span>
            </div>
          ) : null}
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>{t.stockLabel as string}</label>
          <input
            className="inp"
            style={{ direction: "ltr", textAlign: "right" }}
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStockRaw(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      <button className="btn btn-primary btn-lg btn-block" onClick={() => void save()} disabled={saving || priceNum <= 0}>
        {saving ? "…" : (
          <>
            <Icon className="ic-sm" name="i-bolt" /> {t.saveCta as string}
          </>
        )}
      </button>
      <div className="unit-calc" style={{ marginTop: 10 }}>
        <Icon name="i-percent" />
        <span>{t.baseNote as string}</span>
      </div>
      {followersCount != null ? (
        <div className="sub" style={{ margin: "9px 0 0" }}>
          {(t.followersNote as string).replace("{n}", fa(followersCount))}
        </div>
      ) : null}
    </Sheet>
  );
}
