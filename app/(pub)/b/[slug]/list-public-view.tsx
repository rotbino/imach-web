"use client";

/**
 * /b/[slug] — لیست خرید عمومی، دید تأمین‌کننده (پورت sc-list-public · فاز ۷).
 *
 * رشد از سمت خریدار: خریدار لیستش را به اشتراک می‌گذارد (نوار share در /home)؛
 * تأمین‌کننده از لینک/QR می‌آید، نیازها را می‌بیند و گوش‌به‌زنگ می‌شود.
 * تعامل‌ها: تماس/پیام (گیت عضویت مثل کاتالوگ) · ذخیرهٔ لیست = فالو صفحهٔ BUY
 * خریدار (followSupplier با صفحهٔ BUY — همان یال رشد) · گوش‌به‌زنگ = نیازهای
 * BUY listingها؛ برای میهمان → ورود.
 * نگاشت آگاهانه: دکمهٔ alert هر ردیف = watchGood روی همان کالا (سمت عضو) —
 * همان دادهٔ موتور گوش‌به‌زنگ؛ بدون API جدید.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BusinessProfileDto, GoodItemDto } from "@/lib/api";
import { businessesApi, marketApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useStartThread } from "@/lib/queries";
import { fa, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon, type IconName } from "@/components/imach/icon";
import { useToast } from "@/hooks/use-toast";

const ART_BY_CATEGORY: Record<string, IconName> = {
  rice: "a-rice",
  oil: "a-oil",
  sugar: "a-sugar",
  lentil: "a-lentil",
};

function artOf(l: GoodItemDto): IconName {
  const slug = (l.good as { category?: { slug?: string } }).category?.slug ?? "";
  return ART_BY_CATEGORY[slug] ?? "i-box";
}

export function ListPublicView({ biz }: { biz: BusinessProfileDto }) {
  const m = useMessages();
  const t = m.app.pub;
  const { locale } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const hasToken = useAuthStore((s) => !!s.accessToken);
  const myBizs = useAuthStore((s) => s.businesses);
  const myBiz = myBizs[0] ?? null;
  const startThread = useStartThread();

  const [busyThread, setBusyThread] = useState(false);
  const [saved, setSaved] = useState(false);

  const buyListings = useMemo(
    () => (biz.listings ?? []).filter((l) => l.mode === "BUY" || l.mode === "BOTH"),
    [biz.listings]
  );

  const needLogin = () => router.push(`/login?mode=login&dest=${encodeURIComponent(`/b/${biz.slug}`)}`);

  const callDirect = async () => {
    if (!hasToken) {
      needLogin();
      return;
    }
    try {
      const c = await businessesApi.getContact(biz.slug);
      toast({ title: `${t.callDirect} — ${c.phone ?? t.notFound} · ${biz.name}` });
    } catch {
      toast({ title: t.loginForAction, variant: "destructive" });
    }
  };

  const openChat = async () => {
    if (!hasToken || !myBiz || busyThread) {
      if (!hasToken) needLogin();
      return;
    }
    setBusyThread(true);
    try {
      const res = await startThread.mutateAsync({ businessId: myBiz.id, withBusinessId: biz.id });
      router.push(`/msgs/${res.id}`);
    } catch {
      setBusyThread(false);
    }
  };

  const shareList = async () => {
    const url = `${window.location.origin}/b/${biz.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: biz.name, url });
        return;
      }
      throw new Error("no-web-share");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: m.app.home.linkCopied });
      } catch {
        toast({ title: m.app.home.copyFailed, variant: "destructive" });
      }
    }
  };

  const saveList = () => {
    if (!hasToken || !myBiz) {
      needLogin();
      return;
    }
    // ذخیرهٔ لیست خریدار = فالو صفحهٔ SELL من به صفحهٔ BUY او — همان یالِ رشد
    marketApi
      .followSupplier(myBiz.id, biz.id, { source: "SHARED" })
      .then(() => {
        setSaved(true);
        toast({ title: t.saveToast });
      })
      .catch(() => toast({ title: t.loginForAction, variant: "destructive" }));
  };

  const alertOn = (l: GoodItemDto) => {
    if (!hasToken || !myBiz) {
      needLogin();
      return;
    }
    marketApi
      .watchGood(myBiz.id, l.good.id)
      .then(() => toast({ title: t.alertNeedLogin }))
      .catch(() => toast({ title: t.loginForAction, variant: "destructive" }));
  };

  return (
    <section className="screen" data-screen="list-public">
      <div className="pagehead">
        <Link className="back" href="/" aria-label={m.app.login.backAria}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{t.listTitle}</b>
          <span>{t.listSub.replace("{slug}", biz.slug)}</span>
        </div>
      </div>

      <div className="screen-body">
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div
            className="avatar"
            style={{ width: 52, height: 52, borderRadius: 17, fontSize: 19, background: "var(--teal-strong)", flexShrink: 0 }}
          >
            {biz.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              {biz.name}
              {biz.isVerified ? <Icon className="ic-sm" name="i-shield" style={{ color: "var(--teal-strong)" }} /> : null}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.8 }}>
              {t.buyerRole.replace("{trade}", biz.activityType ?? "").replace("{city}", biz.city)} · {t.nGoods.replace("{n}", fa(buyListings.length))}
            </div>
          </div>
        </div>

        <div className="contact-row">
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => void callDirect()}>
            <Icon className="ic-sm" name="i-tel" /> {t.callDirect}
          </button>
          <button className="btn btn-soft" style={{ flex: 1 }} disabled={busyThread} onClick={() => void openChat()}>
            <Icon className="ic-sm" name="i-msg" /> {t.message}
          </button>
        </div>

        <div className="insight-strip" style={{ marginTop: 11, cursor: "default" }}>
          <span>
            <Icon name="i-list" /> <b>{fa(buyListings.length)}</b> {t.nGoods.replace("{n}", "")}
          </span>
          <i className="sep" />
          <span>
            <Icon name="i-bm" /> <b>{fa(biz.saverCount ?? 0)}</b> {t.savedN.replace("{n}", "")}
          </span>
          <i className="sep" />
          <span>
            <Icon name="i-eye" /> {t.viewsN.replace("{n}", fa(buyListings.reduce((s, l) => s + (l.viewCount30 ?? 0), 0)))}
          </span>
        </div>

        <div className="top-act">
          <button className="btn btn-soft btn-lg btn-main" onClick={saveList} disabled={saved}>
            <Icon className="ic-sm" name="i-bm" /> {saved ? t.savedFlag.replace("{name}", biz.name) : t.saveList}
          </button>
          <button
            className="btn btn-outline btn-lg"
            style={{ flex: "0 0 auto" }}
            onClick={() => void shareList()}
            title={t.shareListAria}
            aria-label={t.shareListAria}
          >
            <Icon className="ic-sm" name="i-share" />
          </button>
        </div>

        <div className="public-gate" style={{ marginTop: 11 }}>
          <Icon name="i-bell" />
          <span>{t.listGate.replace("{name}", biz.name)}</span>
        </div>

        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-list" /> {t.goodsOfList}
          </h2>
        </div>

        {buyListings.length === 0 ? (
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-basket" />
            </span>
            <h3>{t.emptyList}</h3>
          </div>
        ) : (
          <div className="card" style={{ padding: "6px 14px" }}>
            {buyListings.map((l, i) => (
              <div
                key={l.id}
                className="follow-row"
                style={{ borderBottom: i < buyListings.length - 1 ? "1px dashed var(--border)" : "none" }}
              >
                <span className="thumb th-40" style={{ display: "grid", placeItems: "center" }}>
                  <Icon name={artOf(l)} style={{ width: 25, height: 25 }} />
                </span>
                <span className="tx">
                  <b>{goodName(l.good, locale)}</b>
                  <span>
                    {t.needLine
                      .replace("{vol}", l.volume ? fa(l.volume) : "—")
                      .replace("{unit}", unitLabel(l.good.unit, locale))
                      .replace("{freq}", l.frequency ? frequencyLabel(l.frequency, locale) : "")}
                    {l.stock === 0 ? ` · ${t.needNoSupplier}` : ""}
                  </span>
                </span>
                <button className="alert-btn" onClick={() => alertOn(l)} title={t.alertAria} aria-label={t.alertAria}>
                  <Icon name="i-bell" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="hint">
          <Icon name="i-eye" />
          <span>{t.listHint}</span>
        </div>
      </div>
    </section>
  );
}
