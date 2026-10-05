"use client";

/**
 * /profile — پروفایل (پورت sc-buy-profile / sc-sell-profile از Prototype v18 · فاز ۶).
 *
 * یک مسیر، دو چهره — arm شل تعیین می‌کند کدام نمای Prototype رندر شود:
 *   · buy: کارت بیزینس + stats خرید + قابلیت‌ها + حساب
 *   · sell: همان + wallet-strip + share-strip (موتور رشد) + فروشگاه
 * دادهٔ واقعی: getMyBusinesses/watchedGoods/getMyRfqs/getFollows/
 * getMyFollowers/getInquiries/getWallet + سوییچ arms واقعی (setArms).
 *
 * تطبیق آگاهانه (ثبت MIGRATION-MAP §۴):
 *   · «پاسخگویی ۹۸٪» → «N درخواست بی‌پاسخ» — سنجهٔ پاسخگویی درصدی در
 *     بک‌اند وجود ندارد؛ همان سیگنال با دادهٔ صادقانه (getInquiries)
 *   · ردیف‌های «نمای دسکتاپ» و «حالت‌های خالی» sell-profile → حذف —
 *     ابزار دموی Prototype بود نه محصول
 */

import Link from "next/link";
import { useShell } from "@/components/imach/app-shell";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { useMessages } from "@/i18n/messages/use-messages";
import { useActiveBusiness } from "@/lib/active-biz";
import { useAuthStore } from "@/lib/auth-store";
import {
  useWatchedGoods,
  useMyRfqs,
  useFollows,
  useMyFollowers,
  useIncomingInquiries,
  useWallet,
  useSetArms,
} from "@/lib/queries";
import { activityTypeLabel, fa, fmtMoney } from "@/lib/format";
import { faPlain } from "../sell/_shared/num";
import { useToast } from "@/hooks/use-toast";

export function ProfileView() {
  const m = useMessages();
  const t = m.app.profile;
  const { arm } = useShell();
  const { toast } = useToast();
    const biz = useActiveBusiness() as (import("@/lib/api").BusinessSummaryDto & {
    _count?: { listings: number };
  }) | null;
  const bizId = biz?.id ?? null;
  const logout = useAuthStore((s) => s.logout);

  // stats — هر دو بازو دادهٔ واقعی
  const watchedQ = useWatchedGoods(bizId);
  const rfqsQ = useMyRfqs(bizId);
  const followsQ = useFollows(bizId);
  const followersQ = useMyFollowers(bizId);
  const inquiriesQ = useIncomingInquiries(bizId);
  const walletQ = useWallet(bizId);
  const setArms = useSetArms();

  const enabledArms = (biz?.enabledArms ?? {}) as { sell?: boolean; buy?: boolean };
  const sellOn = enabledArms.sell ?? true;
  const buyOn = enabledArms.buy ?? true;

  const unanswered = (inquiriesQ.data?.items ?? []).filter((r) => r.status !== "ANSWERED").length;
  const stats =
    arm === "buy"
      ? [
          { v: fa(watchedQ.data?.length ?? 0), k: t.statsBuy.goods },
          { v: fa(rfqsQ.data?.groups.length ?? 0), k: t.statsBuy.rfq },
          { v: fa(followsQ.data?.length ?? 0), k: t.statsBuy.followed },
        ]
      : [
          { v: fa(biz?._count?.listings ?? 0), k: t.statsSell.goods },
          { v: fa(followersQ.data?.summary.total ?? 0), k: t.statsSell.savers },
          { v: fa(unanswered), k: t.statsSell.responsiveness },
        ];

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

  /** سوییچ قابلیت — حداقل یکی روشن (اعتبارسنجی + پیام سرور ARMS_REQUIRED) */
  const toggleArm = (key: "buy" | "sell") => {
    if (!bizId) return;
    const current = key === "buy" ? buyOn : sellOn;
    const other = key === "buy" ? sellOn : buyOn;
    if (current && !other) {
      toast({ title: t.armOffErr, variant: "destructive" });
      return;
    }
    setArms.mutate(
      { id: bizId, [key]: !current },
      {
        onSuccess: () => toast({ title: key === "buy" ? t.armToastBuy : t.armToast }),
        onError: () => toast({ title: t.armOffErr, variant: "destructive" }),
      }
    );
  };

  if (!bizId) {
    return (
      <section className="screen" data-screen="profile">
        <Appbar deskTitle={m.app.tabs.profile} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Spinner size={22} />
        </div>
        <Tabbar active="profile" />
      </section>
    );
  }

  const tradeLabel = biz?.trade
    ? biz.trade === biz.trade.toUpperCase() && biz.trade.length > 2
      ? activityTypeLabel(biz.trade)
      : biz.trade
    : activityTypeLabel(biz?.activityType ?? null);

  return (
    <section className="screen" data-screen="profile">
      <Appbar deskTitle={m.app.tabs.profile} />

      <div className="screen-body">
        {/* کارت بیزینس — نام/صنف/شهر + ویرایش */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div
            className="avatar"
            style={{ width: 56, height: 56, borderRadius: 18, fontSize: 20, background: "var(--arm)" }}
          >
            {(biz?.name ?? "؟").trim().charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              {biz?.name}
              {biz?.isVerified ? (
                <Icon className="ic-sm" name="i-shield" style={{ color: "var(--teal-strong)" }} />
              ) : null}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              {tradeLabel ? `${tradeLabel} · ` : ""}
              {biz?.city}
            </div>
          </div>
          <Link className="btn btn-outline btn-sm" href="/settings/business">
            {t.edit}
          </Link>
        </div>

        {/* آمار واقعی */}
        <div className="stat-row" style={{ marginTop: 11 }}>
          {stats.map((s) => (
            <div className="stat" key={s.k}>
              <span className="v">{s.v}</span>
              <span className="k">{s.k}</span>
            </div>
          ))}
        </div>

        {arm === "sell" ? (
          <>
            {/* نوار کیف پول — موجودی واقعی */}
            <Link className="wallet-strip" href="/wallet">
              <span className="w-ico">
                <Icon name="i-wallet" />
              </span>
              <span className="w-tx">
                <b>{t.walletStripT.replace("{n}", faPlain((walletQ.data?.balanceMinor ?? 0) / 10))}</b>
                <span>{t.walletStripSub}</span>
              </span>
              <Icon className="ic-sm" name="i-chev" style={{ color: "var(--muted)" }} />
            </Link>

            {/* موتور رشد — لینک کاتالوگ + پاداش دعوت */}
            <div className="share-strip">
              <span
                className="ico"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  background: "var(--arm)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon className="ic-sm" name="i-share" style={{ width: 19, height: 19 }} />
              </span>
              <span className="txt">
                <b>{t.shareT}</b>
                <span>{t.shareSub.replace("{link}", `imatch.ir/s/${biz?.slug ?? ""}`)}</span>
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => void shareCatalog()}>
                {t.shareBtn}
              </button>
            </div>
          </>
        ) : null}

        {/* قابلیت‌ها — سوییچ واقعی دستیارها */}
        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-gear" />
            {t.capsTitle}
          </h2>
        </div>
        <div className="card">
          {arm === "buy" ? (
            <>
              <div className="cap-row">
                <span className="ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}>
                  <Icon name="i-basket" />
                </span>
                <span className="tx">
                  <b>{t.armBuyTitle}</b>
                  <span>{t.armBuySub}</span>
                </span>
                <span className={buyOn ? "switch on arm" : "switch arm"} />
              </div>
              <div className="cap-row">
                <span className="ico" style={{ background: "var(--orange-tint)", color: "var(--primary-strong)" }}>
                  <Icon name="i-box" />
                </span>
                <span className="tx">
                  <b>{t.armSellTitle}</b>
                  <span>{t.armSellSubOff}</span>
                </span>
                <button
                  className={sellOn ? "switch on arm" : "switch arm"}
                  aria-label={t.armSellTitle}
                  onClick={() => toggleArm("sell")}
                />
              </div>
            </>
          ) : (
            <>
              <div className="cap-row">
                <span className="ico" style={{ background: "var(--orange-tint)", color: "var(--primary-strong)" }}>
                  <Icon name="i-box" />
                </span>
                <span className="tx">
                  <b>{t.armSellTitle}</b>
                  <span>{t.armSellSub}</span>
                </span>
                <span className={sellOn ? "switch on arm" : "switch arm"} />
              </div>
              <div className="cap-row">
                <span className="ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}>
                  <Icon name="i-basket" />
                </span>
                <span className="tx">
                  <b>{t.armBuyTitle}</b>
                  <span>{t.armBuySubOff}</span>
                </span>
                <button
                  className={buyOn ? "switch on arm" : "switch arm"}
                  aria-label={t.armBuyTitle}
                  onClick={() => toggleArm("buy")}
                />
              </div>
            </>
          )}
          <div className="note-l">{t.capsNote}</div>
        </div>

        {/* حساب / فروشگاه — ناوبری فاز ۶ */}
        <div className="sec-title">
          <h2>{arm === "sell" ? t.storeTitle : t.accountTitle}</h2>
        </div>
        <div className="card" style={{ padding: "5px 16px" }}>
          {arm === "sell" ? (
            <>
              <Link className="link-row" href={`/sell/${biz?.slug ?? ""}`}>
                <Icon name="i-eye" />
                {t.preview}
                <Icon className="lv" name="i-chev" />
              </Link>
              <Link className="link-row" href="/sell/campaign">
                <Icon name="i-chart" />
                {t.campaigns}
                <Icon className="lv" name="i-chev" />
              </Link>
              <Link className="link-row" href="/wallet">
                <Icon name="i-wallet" />
                {t.walletRow}
                <span className="lv-b">{fmtMoney(walletQ.data?.balanceMinor ?? 0)}</span>
                <Icon className="lv" name="i-chev" />
              </Link>
              <Link className="link-row" href="/settings">
                <Icon name="i-gear" />
                {t.storeSettings}
                <Icon className="lv" name="i-chev" />
              </Link>
            </>
          ) : (
            <>
              <Link className="link-row" href="/msgs">
                <Icon name="i-msg" />
                {t.msgs}
                <Icon className="lv" name="i-chev" />
              </Link>
              <Link className="link-row" href="/settings">
                <Icon name="i-bell" />
                {t.notifs}
                <Icon className="lv" name="i-chev" />
              </Link>
              <Link className="link-row" href="/settings">
                <Icon name="i-globe" />
                {t.langRegion}
                <Icon className="lv" name="i-chev" />
              </Link>
            </>
          )}
          <button className="link-row" onClick={() => void logout("/").catch(() => undefined)}>
            <Icon name="i-out" />
            {t.logout}
            <Icon className="lv" name="i-chev" />
          </button>
        </div>

        <div className="hint">
          <Icon name="i-info" />
          <span>{arm === "sell" ? t.hintSell : t.hintBuy}</span>
        </div>
      </div>

      <Tabbar active="profile" />
    </section>
  );
}
