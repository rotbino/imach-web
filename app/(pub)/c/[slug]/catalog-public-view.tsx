"use client";

/**
 * /c/[slug] — کاتالوگ عمومی (پورت sc-catalog-public · فاز ۷ مهاجرت).
 *
 * میهمان و عضو یکسان می‌بینند (SSR + SEO در page.tsx)؛ تعامل‌ها:
 *   · ذخیرهٔ کاتالوک = followSupplier (source=SHARED) — میهمان → ورود
 *   · تماس مستقیم = شماره پشت گیت عضویت (getContact) — میهمان → ورود
 *   · پیام = شروع گفتگو (فاز ۶) — میهمان → ورود
 *   · جست‌وجو/چیپ دسته‌ها = فیلتر کلاینت روی همان دادهٔ سروری
 * نگاشت آگاهانه (ثبت در MIGRATION-MAP §۴): insight-strip «بازدید این هفته» →
 * «N کالا · N ذخیره‌کننده» (شمارش بازدید کاتالک عمومی نداریم؛ viewCount30
 * سمت آگهی است) · py-strip تخفیف فقط برای عضوِ ذخیره‌کرده (منطق واقعی قاعده).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BusinessProfileDto, GoodItemDto } from "@/lib/api";
import { businessesApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useFollows, useStartThread } from "@/lib/queries";
import { fa, fmtMoney, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { useToast } from "@/hooks/use-toast";

/** کاشی حرفی/تصویر آگهی — همان الگوی کاتالوگ مالک (فاز ۵) */
function CardArt({ l, big }: { l: GoodItemDto; big?: boolean }) {
  const img = l.gallery?.[0]?.thumbUrl ?? l.gallery?.[0]?.url ?? null;
  if (img) {
    return (
       
      <img
        src={img}
        alt={l.good.nameFa}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
      />
    );
  }
  return (
    <span style={{ fontSize: big ? 26 : 22, fontWeight: 800, color: "var(--arm-tint-fg)" }}>
      {l.good.nameFa.charAt(0)}
    </span>
  );
}

export function CatalogPublicView({ biz }: { biz: BusinessProfileDto }) {
  const m = useMessages();
  const t = m.app.pub;
  const { locale } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const hasToken = useAuthStore((s) => !!s.accessToken);
  const myBizs = useAuthStore((s) => s.businesses);
  const myBiz = myBizs[0] ?? null;

  const follows = useFollows(myBiz?.id ?? null);
  const startThread = useStartThread();

  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [busyThread, setBusyThread] = useState(false);

  const sellListings = useMemo(
    () => (biz.listings ?? []).filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null),
    [biz.listings]
  );

  const isSaved = useMemo(
    () => (follows.data ?? []).some((f) => f.supplier?.slug === biz.slug || f.supplier?.id === biz.id),
    [follows.data, biz.slug, biz.id]
  );

  const visible = useMemo(() => {
    const q = query.trim();
    return sellListings.filter((l) => {
      if (catFilter && l.catalogCategoryId !== catFilter) return false;
      if (!q) return true;
      return `${l.good.nameFa} ${l.good.nameEn ?? ""} ${l.variantLabel ?? ""}`.includes(q);
    });
  }, [sellListings, query, catFilter]);

  const cats = biz.customCategories ?? [];

  const shareCatalog = async () => {
    const url = `${window.location.origin}/c/${biz.slug}`;
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

  const needLogin = () => router.push(`/login?mode=login&dest=${encodeURIComponent(`/c/${biz.slug}`)}`);

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

  const latestUpdate = useMemo(() => {
    const times = (biz.listings ?? []).map((l) => l.updatedAt).filter(Boolean).sort();
    return times.length ? times[times.length - 1] : null;
  }, [biz.listings]);

  const relTime = (iso?: string | null): string => {
    if (!iso) return "—";
    const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
    if (hours < 1) return m.app.home.today;
    if (hours < 24) return m.app.home.hoursAgoN.replace("{n}", fa(Math.floor(hours)));
    if (hours < 48) return m.app.home.yesterday;
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "fa-IR");
  };

  return (
    <section className="screen" data-screen="catalog-public">
      <div className="pagehead">
        <Link className="back" href="/" aria-label={m.app.login.backAria}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{t.catalogTitle}</b>
          <span>{t.catalogSub.replace("{slug}", biz.slug)}</span>
        </div>
      </div>

      <div className="screen-body">
        {/* کارت کسب‌وکار — ویترین اعتماد */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div
            className="avatar"
            style={{ width: 52, height: 52, borderRadius: 17, fontSize: 19, flexShrink: 0 }}
          >
            {biz.logo?.thumbUrl ? (
               
              <img src={biz.logo.thumbUrl} alt={biz.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
            ) : (
              biz.name.charAt(0)
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              {biz.name}
              {biz.isVerified ? <Icon className="ic-sm" name="i-shield" style={{ color: "var(--teal-strong)" }} /> : null}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.8 }}>
              {biz.activityType ? t.supplierN.replace("{trade}", biz.activityType) : t.supplierOnly} · {biz.city} · {t.nGoods.replace("{n}", fa(sellListings.length))}
              <br />
              {t.lastUpdate.replace("{rel}", relTime(latestUpdate))}
            </div>
          </div>
        </div>

        {/* ذخیرهٔ کاتالوک — عضو: یال واقعی · میهمان: دعوت به ورود */}
        {isSaved ? (
          <div className="saved-flag" style={{ padding: "12px 14px", width: "100%", justifyContent: "center", marginTop: 11 }}>
            <Icon name="i-checkc" />
            <span>{t.savedFlag.replace("{name}", biz.name)}</span>
          </div>
        ) : (
          <>
            <div className="top-act">
              <button
                className="btn btn-primary btn-lg btn-main"
                onClick={() => {
                  if (!hasToken || !myBiz) {
                    needLogin();
                    return;
                  }
                  import("@/lib/api").then(({ marketApi }) => {
                    marketApi
                      .followSupplier(myBiz.id, biz.id, { source: "SHARED" })
                      .then(() => {
                        toast({ title: t.saveToast });
                        return follows.refetch();
                      })
                      .catch(() => toast({ title: t.loginForAction, variant: "destructive" }));
                  });
                }}
              >
                <Icon className="ic-sm" name="i-bm" /> {t.saveCatalog}
              </button>
              <button
                className="btn btn-outline btn-lg"
                style={{ flex: "0 0 auto" }}
                onClick={() => void shareCatalog()}
                title={t.shareAria}
                aria-label={t.shareAria}
              >
                <Icon className="ic-sm" name="i-share" />
              </button>
            </div>
            <div className="sfx-note" style={{ textAlign: "center" }}>{t.sfxNote}</div>
          </>
        )}

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
            <Icon name="i-bm" /> <b>{fa(biz.saverCount ?? 0)}</b> {t.saversN.replace("{n}", "")}
          </span>
          <i className="sep" />
          <span>
            <Icon name="i-eye" /> {t.viewsWeek.replace("{n}", fa(sellListings.reduce((s, l) => s + (l.viewCount30 ?? 0), 0)))}
          </span>
        </div>

        {/* جست‌وجو + چیپ دسته‌های شخصی (دیتای واقعی Business.customCategories) */}
        <div className="searchbar" style={{ marginTop: 11 }}>
          <Icon name="i-search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchIn}
            aria-label={t.searchIn}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--fg)" }}
          />
        </div>
        {cats.length > 0 ? (
          <div className="chips" style={{ marginTop: 9 }}>
            <button className={`chip ${catFilter === null ? "active" : ""}`} onClick={() => setCatFilter(null)}>
              {t.chipAll}
            </button>
            {cats.map((c) => (
              <button key={c.id} className={`chip ${catFilter === c.id ? "active" : ""}`} onClick={() => setCatFilter(catFilter === c.id ? null : c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        ) : null}

        {/* شبکهٔ کالاها — p-card عین کاتالوک مالک (فاز ۵) */}
        {visible.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 12 }}>
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-box" />
            </span>
            <h3>{t.emptyCatalog}</h3>
          </div>
        ) : (
          <div className="grid-2" style={{ marginTop: 11 }}>
            {visible.map((l) => (
              <Link className="p-card" href={`/p/${biz.slug}/${l.id}`} key={l.id}>
                <div className="ph">
                  <CardArt l={l} big />
                </div>
                <div className="pd">
                  <div className="nm">{l.variantLabel ? `${goodName(l.good, locale)} — ${l.variantLabel}` : goodName(l.good, locale)}</div>
                  <div className="pk">
                    {fmtMoney(l.priceMinor ?? 0, l.currency, locale)} <span>{`/ ${unitLabel(l.good.unit, locale)}`}</span>
                  </div>
                  <div className="mgr-strip">
                    <span>
                      <Icon name="i-eye" /> {fa(l.viewCount30 ?? 0)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="public-gate" style={{ marginTop: 12 }}>
          <Icon name="i-info" />
          <span>{t.catalogGate}</span>
        </div>
        <div className="viral-row">{t.viralRow}</div>
      </div>
    </section>
  );
}
