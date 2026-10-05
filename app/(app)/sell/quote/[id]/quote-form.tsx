"use client";

/**
 * پاسخ با قیمت — پورت کامل sc-quote (v18 · فاز ۴ مهاجرت).
 *
 * زمینه از GET /market/getQuoteContext (خریدار/کالا/حجم/مهلت/قیمت هدف +
 * قیمت زندهٔ کاتالوگ خودم). ارسال:
 *   kind=INQUIRY    → POST /market/sendOffer (پاسخ به استعلام مستقیم)
 *   kind=BUY_LISTING→ POST /market/offerBuyRequest (فرصت بازار/گوش‌به‌زنگ؛
 *                     گیت ۱۰ معرف سمت سرور چک می‌شود — خطای آن surface می‌شود)
 * قیمت‌ها «تومان بر واحد پایه» ورودی می‌شوند (برچسب فرم) → ×۱۰ Minor (ریال).
 *
 * تطبیق آگاهانه (MIGRATION-MAP §۴):
 *   · dref-strip «قیمت دفتر تخفیف‌ها» (CustomerType × Tier) → نوار «قیمت زندهٔ
 *     کاتالوگ تو» — موتور تخفیف فاز ۵ است؛ قیمت هدف خریدار در شیت جزئیات می‌ماند
 *   · «تغییر نوع مشتری» (unit-calc دوم Prototype) حذف شد — وابسته به فاز ۵
 *   · خط محاسبهٔ بسته/جمع از variantLabel کاتالوگ خودم مشتق می‌شود
 *     (packFactor) — مثل موتور بک‌اند
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveBusiness } from "@/lib/active-biz";
import { useOfferBuyRequest, useQuoteContext, useSendOffer } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { fa, fmtMoney, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";

/** نرمال‌سازی ارقام فارسی/عربی → لاتین */
function toAsciiDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** ضریب بسته از variantLabel — همان packFactor بک‌اند («کیسه ۵۰ کیلویی» → ۵۰) */
function packFactor(variantLabel: string | null): number {
  if (!variantLabel) return 1;
  const m2 = toAsciiDigits(variantLabel).match(/(\d{1,4})\s*(?:کیلو|گرم|لیتر)/);
  return m2 ? parseInt(m2[1], 10) : 1;
}

type PayKey = "CASH" | "ON_DELIV" | "CHEQUE_30";
type DelivKey = "SAME_DAY" | "NEXT" | "2D";
const PAY_KEYS: PayKey[] = ["CASH", "ON_DELIV", "CHEQUE_30"];
const PAY_LABEL: Record<PayKey, string> = { CASH: "payCash", ON_DELIV: "payOnDeliv", CHEQUE_30: "payCheque30" };
const DELIV_KEYS: DelivKey[] = ["SAME_DAY", "NEXT", "2D"];
const DELIV_LABEL: Record<DelivKey, string> = { SAME_DAY: "delivSame", NEXT: "delivNext", "2D": "deliv2d" };

export function QuoteForm({ id }: { id: string }) {
  const m = useMessages();
  const t = m.app.quote as unknown as Record<string, string>;
  const { locale } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const ctxQ = useQuoteContext(bizId, id);
  const sendOfferMut = useSendOffer();
  const buyReqMut = useOfferBuyRequest();

  const [priceRaw, setPriceRaw] = useState<string | null>(null); // null = پیش‌فرض از کاتالوگ خودم
  const [pay, setPay] = useState<PayKey>("CASH");
  const [deliv, setDeliv] = useState<DelivKey>("SAME_DAY");
  const [note, setNote] = useState("");
  const [priceErr, setPriceErr] = useState(false);
  const [sent, setSent] = useState(false);
  const [gateMsg, setGateMsg] = useState<string | null>(null);

  const ctx = ctxQ.data ?? null;

  const price = priceRaw ?? (ctx?.myListing?.priceMinor != null ? String(Math.round(ctx.myListing.priceMinor / 10)) : "");
  const priceNum = Number(toAsciiDigits(price).replace(/\D/g, ""));
  const priceOk = priceNum > 0;

  const pack = packFactor(ctx?.myListing?.variantLabel ?? null);
  const unit = ctx ? unitLabel(ctx.good.unit, locale) : "";

  const deadlineAt = ctx?.deadlineAt ?? null;
  const deadlineDays = useMemo(() => {
    if (!deadlineAt) return null;
    const d = Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 86_400_000);
    return Math.max(0, d);
  }, [deadlineAt]);

  // ── حالت بارگذاری/خطا ──
  if (ctxQ.isError) {
    return (
      <section className="screen" data-screen="quote">
        <div className="pagehead">
          <Link className="back" href="/sell/requests" aria-label={m.app.rfq.back}>
            <Icon className="ic" name="i-back" />
          </Link>
          <div className="tt">
            <b>{t.title}</b>
          </div>
        </div>
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--red-tint)", color: "var(--red)" }}>
              <Icon name="i-info" />
            </span>
            <h3>{t.ctxErr}</h3>
            <Link className="btn btn-outline" href="/sell/requests">
              {m.app.rfq.back}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!bizId || ctxQ.isLoading || !ctx) {
    return (
      <section className="screen" data-screen="quote">
        <div className="pagehead">
          <div className="tt">
            <b>{t.title}</b>
          </div>
        </div>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
            <Spinner size={22} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.app.home.loading}</span>
          </div>
        </div>
      </section>
    );
  }

  // ── موفقیت ──
  if (sent) {
    return (
      <section className="screen" data-screen="quote">
        <div className="pagehead">
          <div className="tt">
            <b>{t.title}</b>
          </div>
        </div>
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--emerald-tint)", color: "var(--emerald)" }}>
              <Icon name="i-checkc" />
            </span>
            <h3>{t.okTitle}</h3>
            <p>{(t.okText as string).replace("{buyer}", ctx.buyer.name)}</p>
            <button className="btn btn-primary" onClick={() => router.push("/sell/requests")}>
              {t.okCta}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const name = goodName(ctx.good, locale);
  const sub = `${ctx.buyer.name} — ${name} · ${fa(ctx.volume)} ${unit}`;
  const noListing = !ctx.myListing;
  const busy = sendOfferMut.isPending || buyReqMut.isPending;

  const submit = () => {
    if (!bizId) return;
    setGateMsg(null);
    const pErr = !priceOk;
    setPriceErr(pErr);
    if (pErr || noListing) return;
    const body = {
      priceMinor: priceNum * 10, // تومان → ریال (Minor)
      payTerm: pay,
      delivTerm: deliv,
      note: note.trim() || undefined,
    };
    if (ctx.kind === "INQUIRY" && ctx.inquiryId) {
      sendOfferMut.mutate(
        { inquiryId: ctx.inquiryId, ...body },
        {
          onSuccess: () => setSent(true),
          onError: (err) => {
            const msg = err instanceof ApiError ? err.message : (t.sendErr as string);
            setGateMsg(msg);
            toast({ title: t.sendErr as string, description: msg, variant: "destructive" });
          },
        }
      );
    } else if (ctx.buyListingId) {
      buyReqMut.mutate(
        { businessId: bizId, buyListingId: ctx.buyListingId, ...body },
        {
          onSuccess: () => setSent(true),
          onError: (err) => {
            const msg = err instanceof ApiError ? err.message : (t.sendErr as string);
            setGateMsg(msg);
            toast({ title: t.sendErr as string, description: msg, variant: "destructive" });
          },
        }
      );
    }
  };

  const packPrice = priceOk && pack > 1 ? priceNum * pack : null;
  const totalPrice = priceOk ? priceNum * ctx.volume : null;

  return (
    <section className="screen" data-screen="quote">
      <div className="pagehead">
        <Link className="back" href="/sell/requests" aria-label={m.app.rfq.back}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{t.title}</b>
          <span>{sub}</span>
        </div>
      </div>

      <div className="screen-body" style={{ paddingBottom: 40 }}>
        <div id="quoteForm">
          {/* نوار قیمت زندهٔ کاتالوگ خودم (جای dref-strip تا فاز ۵) */}
          {ctx.myListing?.priceMinor != null ? (
            <div className="card">
              <div className="dref-strip">
                <span className="dr-ico">
                  <Icon name="i-percent" />
                </span>
                <span className="dr-tx">
                  <b>{t.refTitle}</b>
                  <span>
                    {(t.refLine as string).replace(
                      "{price}",
                      fa(Math.round(ctx.myListing.priceMinor / 10))
                    ).replace("{unit}", unit)}
                  </span>
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: "0 0 auto" }}
                  onClick={() => setPriceRaw(String(Math.round(ctx.myListing!.priceMinor! / 10)))}
                >
                  {t.useRef}
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="dref-strip">
                <span className="dr-ico" style={{ background: "var(--red-tint)", color: "var(--red)" }}>
                  <Icon name="i-info" />
                </span>
                <span className="dr-tx">
                  <b>{t.noListingTitle}</b>
                  <span>{t.noListingSub}</span>
                </span>
              </div>
            </div>
          )}

          {/* مهلت پاسخ + قیمت هدف + وضعیت گوش‌به‌زنگ */}
          {deadlineDays != null && deadlineDays > 0 ? (
            <div className="sfx-note" style={{ textAlign: "center", marginTop: 8 }}>
              {deadlineDays === 1
                ? (t.deadline1 as string)
                : (t.deadlineN as string).replace("{n}", fa(deadlineDays))}
            </div>
          ) : null}
          {ctx.targetPriceMinor ? (
            <div className="sfx-note" style={{ textAlign: "center", marginTop: deadlineDays ? 0 : 8 }}>
              {(t.targetLine as string).replace(
                "{p}",
                fa(Math.round(ctx.targetPriceMinor / 10))
              )}
            </div>
          ) : null}
          {ctx.watching ? (
            <div className="unit-calc" style={{ marginTop: 6 }}>
              <Icon name="i-bell" />
              <span>{t.watching}</span>
            </div>
          ) : null}

          <div className="card">
            <div className="field">
              <label>
                {t.priceLabel} <i>{(t.perUnit as string).replace("{unit}", unit)}</i>
              </label>
              <div className={`inp-flex inp-lg${priceErr ? " err" : ""}`}>
                <input
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPriceRaw(e.target.value)}
                  onBlur={() => setPriceErr(!priceOk)}
                  aria-invalid={priceErr}
                />
                <span className="sfx">{locale === "en" ? "Toman" : "تومان"}</span>
              </div>
              {packPrice != null || totalPrice != null ? (
                <div className="unit-calc">
                  <Icon name="i-info" />
                  <span>
                    {packPrice != null
                      ? `${(t.calcPack as string).replace("{pack}", fa(pack)).replace("{p}", fa(packPrice))} · `
                      : ""}
                    {totalPrice != null
                      ? `${(t.calcTotal as string)
                          .replace("{vol}", fa(ctx.volume))
                          .replace("{unit}", unit)
                          .replace("{p}", fa(totalPrice))} `
                      : ""}
                    {t.calcAuto}
                  </span>
                </div>
              ) : null}
              {priceErr ? (
                <div className="f-err">
                  <Icon name="i-info" />
                  {t.priceErr}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label>{t.payTitle}</label>
              <div className="unit-chips">
                {PAY_KEYS.map((k) => (
                  <button key={k} type="button" className={`chip${pay === k ? " active" : ""}`} onClick={() => setPay(k)}>
                    {t[PAY_LABEL[k]] as string}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>{t.delivTitle}</label>
              <div className="unit-chips">
                {DELIV_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`chip${deliv === k ? " active" : ""}`}
                    onClick={() => setDeliv(k)}
                  >
                    {t[DELIV_LABEL[k]] as string}
                  </button>
                ))}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 4 }}>
              <label>
                {t.noteTitle} <i>{t.optional}</i>
              </label>
              <textarea
                className="inp"
                placeholder={t.notePh}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
              />
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg btn-block"
            style={{ marginTop: 14 }}
            disabled={!priceOk || noListing || busy}
            onClick={submit}
          >
            {busy ? <Spinner size={16} /> : <Icon className="ic-sm" name="i-send" />}
            {t.submit}
          </button>
          {gateMsg ? (
            <div className="gate-note" style={{ marginTop: 8 }}>
              {gateMsg}
            </div>
          ) : null}

          <div className="hint">
            <Icon name="i-eye" />
            <span>{(t.hint as string).replace("{buyer}", ctx.buyer.name)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
