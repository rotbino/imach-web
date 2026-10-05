"use client";

/**
 * /wallet — کیف پول (پورت sc-wallet از Prototype v18 · فاز ۶).
 *
 * دادهٔ واقعی: GET /wallet/get (موجودی + تراکنش‌ها) + getMyPromos (بج کمپین فعال
 * + نام کالا برای ردیف خرج) + گزارش کمپین فعال (مشاهده/دنبال‌کردنِ زنده).
 *  · bal-card: موجودی (IRR minor → تومان) + بج «N کمپین فعال» + نرخ‌ها
 *  · «پول از کجا می‌آید؟»: دعوت (Web Share) + شارژ
 *  · تاریخچه: WalletTxnهای واقعی — CHARGE / REFERRAL_REWARD / PROMO_SPEND / REFUND
 *
 * تطبیق آگاهانه (MIGRATION-MAP §۴): ردیف‌های دموی تاریخچه → دیتای واقعی؛
 * هر type فقط اگر واقعاً رخ داده باشد دیده می‌شود.
 */

import Link from "next/link";
import { useState } from "react";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { Sheet } from "@/components/imach/sheet";
import { useMessages } from "@/i18n/messages/use-messages";
import { useActiveBusiness } from "@/lib/active-biz";
import { useWallet, useMyPromos, usePromoReport } from "@/lib/queries";
import { fa, fmtMoney } from "@/lib/format";
import { faPlain } from "../sell/_shared/num";
import { useToast } from "@/hooks/use-toast";
import type { WalletTxnDto, PromoMineDto } from "@/lib/api";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = Math.floor(diff / 86_400_000);
  if (day < 1) return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  if (day === 1) return "دیروز";
  if (day < 7) return `${fa(day)} روز پیش`;
  return d.toLocaleDateString("fa-IR");
}

/** آیکون + علامت هر نوع تراکنش */
function txnVisual(type: string): { icon: "i-wallet" | "i-users" | "i-bm" | "i-star"; cls: "plus" | "minus" } {
  switch (type) {
    case "CHARGE":
      return { icon: "i-wallet", cls: "plus" };
    case "REFERRAL_REWARD":
      return { icon: "i-users", cls: "plus" };
    case "REFUND":
      return { icon: "i-bm", cls: "plus" };
    default:
      return { icon: "i-star", cls: "minus" };
  }
}

export function WalletView() {
  const m = useMessages();
  const t = m.app.wallet;
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;
  const walletQ = useWallet(bizId);
  const promosQ = useMyPromos(bizId);
  const [shareOpen, setShareOpen] = useState(false);

  const txns = walletQ.data?.txns ?? [];
  const promos = promosQ.data ?? [];
  const activePromos = promos.filter((p) => p.isActive);
  const activePromo = activePromos[0] ?? null;
  const reportQ = usePromoReport(bizId, activePromo?.id ?? null);

  const shareCatalog = async () => {
    if (!biz) return;
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

  if (!bizId || walletQ.isLoading) {
    return (
      <section className="screen" data-screen="wallet">
        <Appbar deskTitle={t.title} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Spinner size={22} />
        </div>
        <Tabbar active="profile" />
      </section>
    );
  }

  const promoById = new Map<string, PromoMineDto>(promos.map((p) => [p.id, p]));

  return (
    <section className="screen" data-screen="wallet">
      <Appbar deskTitle={t.title} />

      <div className="screen-body">
        {/* کارت موجودی */}
        <div className="card bal-card">
          <div className="bal-top">
            <span className="b-ico">
              <Icon name="i-wallet" />
            </span>
            <div className="bal">
              <span>{faPlain((walletQ.data?.balanceMinor ?? 0) / 10)}</span>
              <small>{t.balance}</small>
            </div>
            {activePromos.length > 0 ? (
              <span className="badge b-amber">{t.activeN.replace("{n}", fa(activePromos.length))}</span>
            ) : null}
          </div>
          <div className="bal-note">{t.balNote}</div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Link className="btn btn-primary" style={{ flex: 1 }} href="/wallet/charge">
              <Icon className="ic-sm" name="i-plus" />
              {t.chargeBtn}
            </Link>
            <Link className="btn btn-outline" style={{ flex: "0 0 auto" }} href="/sell/campaign">
              <Icon className="ic-sm" name="i-chart" />
              {t.reportBtn}
            </Link>
          </div>
        </div>

        {/* پول از کجا می‌آید؟ */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-bolt" />
            {t.earnTitle}
          </h2>
        </div>
        <div className="card" style={{ padding: "12px 14px" }}>
          <button className="earn-row" style={{ cursor: "pointer" }} onClick={() => setShareOpen(true)}>
            <span className="e-ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}>
              <Icon name="i-share" />
            </span>
            <span className="tx">
              <b>{t.earnInviteT}</b>
              <span>{t.earnInviteS}</span>
            </span>
            <Icon className="ic-sm" name="i-chev" style={{ color: "var(--muted)" }} />
          </button>
          <Link
            className="earn-row"
            href="/wallet/charge"
            style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}
          >
            <span className="e-ico" style={{ background: "var(--orange-tint)", color: "var(--primary-strong)" }}>
              <Icon name="i-wallet" />
            </span>
            <span className="tx">
              <b>{t.earnChargeT}</b>
              <span>{t.earnChargeS}</span>
            </span>
            <Icon className="ic-sm" name="i-chev" style={{ color: "var(--muted)" }} />
          </Link>
        </div>

        {/* تاریخچه — تراکنش‌های واقعی */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-clock" />
            {t.histTitle}
          </h2>
        </div>
        <div className="card" style={{ padding: "6px 14px" }}>
          {txns.length === 0 ? (
            <div className="sub" style={{ padding: "14px 4px", textAlign: "center" }}>
              {t.empty}
            </div>
          ) : (
            txns.slice(0, 30).map((x: WalletTxnDto) => {
              const v = txnVisual(x.type);
              const promo = x.ref ? promoById.get(x.ref) : undefined;
              const isSpendRow = x.type === "PROMO_SPEND";
              const title = isSpendRow
                ? t.txnSpend.replace("{good}", promo?.goodName ?? "")
                : x.type === "CHARGE"
                  ? t.txnCharge
                  : x.type === "REFERRAL_REWARD"
                    ? t.txnReward
                    : t.txnRefund;
              const sub = isSpendRow
                ? promo?.isActive
                  ? t.txnActive
                      .replace("{views}", fa(reportQ.data?.stats.views ?? promo.eventCount))
                      .replace("{follows}", fa(reportQ.data?.stats.follows ?? 0))
                  : t.txnStopped
                : x.type === "CHARGE" && x.ref
                  ? t.txnReceipt.replace("{ref}", x.ref.slice(0, 8))
                  : timeAgo(x.createdAt);
              return (
                <Link
                  key={x.id}
                  className="hist-row"
                  href={isSpendRow && activePromo ? "/sell/campaign" : "/wallet"}
                  style={isSpendRow && activePromo ? { cursor: "pointer" } : { cursor: "default" }}
                >
                  <span className={`h-ico ${v.cls}`}>
                    <Icon name={v.icon} />
                  </span>
                  <span className="tx">
                    <b>{title}</b>
                    <span>{sub}</span>
                  </span>
                  <span className={`amt ${x.amountMinor >= 0 ? "pos" : "neg"}`}>
                    {x.amountMinor >= 0
                      ? `+${fmtMoney(x.amountMinor)}`
                      : `−${fmtMoney(Math.abs(x.amountMinor))}`}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        <div className="hint">
          <Icon name="i-shield" />
          <span>{t.hint}</span>
        </div>
      </div>

      <Tabbar active="profile" />

      {/* شیت اشتراک کاتالوگ — مسیر دعوت (دقیقاً مثل شیت اشتراک کاتالوگ فروش) */}
      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} label={m.app.sellCatalog.shareTitle as string}>
        <div className="grab" />
        <h3>{m.app.sellCatalog.shareTitle as string}</h3>
        <div className="sub">{(m.app.sellCatalog.shareSub as string).replace("{slug}", biz?.slug ?? "")}</div>
        <button className="sheet-row" onClick={() => void shareCatalog()}>
          <span className="ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}>
            <Icon name="i-share" />
          </span>
          <span className="tx">
            <b>{m.app.sellCatalog.shareCta as string}</b>
            <span>{(m.app.sellCatalog.shareSub as string).replace("{slug}", biz?.slug ?? "")}</span>
          </span>
        </button>
        <button
          className="sheet-row"
          onClick={() => {
            void navigator.clipboard
              .writeText(`${window.location.origin}/sell/${biz?.slug ?? ""}`)
              .then(() => toast({ title: m.app.home.linkCopied as string }))
              .catch(() => undefined);
            setShareOpen(false);
          }}
        >
          <span className="ico" style={{ background: "var(--muted-bg)", color: "var(--fg-soft)" }}>
            <Icon name="i-list" />
          </span>
          <span className="tx">
            <b>{m.app.home.linkCopied as string}</b>
            <span>{`imatch.ir/s/${biz?.slug ?? ""}`}</span>
          </span>
        </button>
      </Sheet>
    </section>
  );
}
