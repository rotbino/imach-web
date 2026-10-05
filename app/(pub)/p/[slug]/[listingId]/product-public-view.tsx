"use client";

/**
 * /p/[slug]/[listingId] — کالای عمومی از کاتالوگ (پورت sc-sell-product-public · فاز ۷).
 *
 * چهار مسیر پروتوتایپ: تماس مستقیم (گیت عضویت) · پیام (چت فاز ۶) ·
 * استعلام گروهی (عضو → /rfq/[goodId]) · دنبال‌کردن/افزودن (watchGood).
 * نگاشت آگاهانه (ثبت در MIGRATION-MAP §۴):
 *   · «قیمت شما» + vol-ladder + pack-pick پروتوتایپ → قیمت پایهٔ عمومی
 *     (اندپوینت قیمت مؤثرِ دید خریدار هنوز وجود ندارد — /pricing/preview مالک‌محور
 *     است؛ با ساخت آن در فاز بعدی همین‌جا جایگزین می‌شود)
 *   · photo-strip = گالری واقعی آگهی (فایل‌ها) به‌جای دموی SVG
 *   · بج «٪ پاسخگویی» حذف — آمار عمومی پاسخ‌گویی در API نیست
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BusinessProfileDto, GoodItemDto } from "@/lib/api";
import { businessesApi, marketApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useStartThread } from "@/lib/queries";
import { fmtMoney, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon } from "@/components/imach/icon";
import { ShareSheet } from "@/components/imach/share-sheet";
import { useSheetParam } from "@/components/imach/demo-sheet-param";
import { useToast } from "@/hooks/use-toast";

export function ProductPublicView({ biz, listing }: { biz: BusinessProfileDto; listing: GoodItemDto }) {
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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareContacts, setShareContacts] = useState(false);
  // فاز ۹ — ناوبری Demo Hub: ?sheet=share | ?sheet=contacts
  useSheetParam("share", () => { setShareContacts(false); setShareOpen(true); });
  useSheetParam("contacts", () => { setShareContacts(true); setShareOpen(true); });
  const [watched, setWatched] = useState(false);
  const [photo, setPhoto] = useState(0);

  const name = listing.variantLabel
    ? `${goodName(listing.good, locale)} — ${listing.variantLabel}`
    : goodName(listing.good, locale);

  const gallery = listing.gallery ?? [];
  const heroImg = gallery[photo]?.url ?? null;

  const specs = useMemo(() => {
    const rows: Array<{ k: string; v: string; small?: string }> = [];
    if (listing.priceMinor !== null) {
      rows.push({
        k: t.priceLabel,
        v: fmtMoney(listing.priceMinor, listing.currency, locale).replace(/ \/ .*/, ""),
        small: `تومان / ${unitLabel(listing.good.unit, locale)}`,
      });
    }
    if (listing.stock !== null && listing.stock !== undefined) {
      rows.push({ k: t.stockSpec, v: String(listing.stock), small: unitLabel(listing.good.unit, locale) });
    }
    if (listing.minOrder !== null && listing.minOrder !== undefined) {
      rows.push({ k: t.minOrderSpec, v: String(listing.minOrder), small: unitLabel(listing.good.unit, locale) });
    }
    if (listing.variantLabel) rows.push({ k: t.packSpec, v: listing.variantLabel });
    if (listing.brand?.name) rows.push({ k: t.brandSpec, v: listing.brand.name });
    return rows;
  }, [listing, locale, m, t]);

  const dest = `/p/${biz.slug}/${listing.id}`;

  const needLogin = () => router.push(`/login?mode=login&dest=${encodeURIComponent(dest)}`);

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

  const goRfq = () => {
    if (!hasToken) {
      needLogin();
      return;
    }
    router.push(`/rfq/${listing.good.id}`);
  };

  const followPrice = () => {
    if (!hasToken || !myBiz) {
      needLogin();
      return;
    }
    marketApi
      .watchGood(myBiz.id, listing.good.id)
      .then(() => {
        setWatched(true);
        toast({ title: m.app.home.watchCta });
      })
      .catch(() => toast({ title: t.loginForAction, variant: "destructive" }));
  };

  // فاز ۹ — شیت اشتراک کامل کالا (مخاطبین گوشی + اشتراک سیستمی + کپی + QR)
  const shareProduct = () => setShareOpen(true);

  return (
    <section className="screen" data-screen="product-public">
      <div className="pagehead">
        <Link className="back" href={`/c/${biz.slug}`} aria-label={m.app.login.backAria}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{name}</b>
          <span>{t.productFrom.replace("{name}", biz.name)}</span>
        </div>
        <button className="icon-btn" onClick={shareProduct} aria-label={t.shareAria}>
          <Icon className="ic-sm" name="i-share" />
        </button>
      </div>

      <div className="screen-body">
        <div className="thumb lg">
          {heroImg ? (
             
            <img src={heroImg} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
          ) : (
            <span style={{ fontSize: 34, fontWeight: 800, color: "var(--arm-tint-fg)" }}>{biz.name.charAt(0)}</span>
          )}
        </div>

        {gallery.length > 1 ? (
          <div className="photo-strip">
            {gallery.slice(0, 4).map((g, i) => (
              <button key={g.id} className={`ps ${i === photo ? "ps-fill active" : "ps-fill"}`} onClick={() => setPhoto(i)} aria-label={`${i + 1}`}>
                { }
                <img src={g.thumbUrl ?? g.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
              </button>
            ))}
          </div>
        ) : null}

        <div className="card" style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div className="avatar" style={{ borderRadius: 13 }}>
            {biz.logo?.thumbUrl ? (
               
              <img src={biz.logo.thumbUrl} alt={biz.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
            ) : (
              biz.name.charAt(0)
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              {biz.name}
              {biz.isVerified ? <Icon className="ic-sm" name="i-shield" style={{ color: "var(--teal-strong)" }} /> : null}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
              {biz.activityType ? t.supplierN.replace("{trade}", biz.activityType) : t.supplierOnly} · {biz.city}
            </div>
          </div>
          <Link className="more" href={`/c/${biz.slug}`}>{t.chipAll} ←</Link>
        </div>

        <div className="contact-row">
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => void callDirect()}>
            <Icon className="ic-sm" name="i-tel" /> {t.callDirect}
          </button>
          <button className="btn btn-soft" style={{ flex: 1 }} disabled={busyThread} onClick={() => void openChat()}>
            <Icon className="ic-sm" name="i-msg" /> {t.messagePhoto}
          </button>
        </div>

        <div className="hero-specs" style={{ marginTop: 11 }}>
          {specs.map((s) => (
            <div className="sp" key={s.k}>
              <span className="k">{s.k}</span>
              <span className="v">
                {s.v} {s.small ? <small>{s.small}</small> : null}
              </span>
            </div>
          ))}
        </div>

        <div className="tri-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary btn-lg btn-block" onClick={goRfq}>
            <Icon className="ic-sm" name="i-send" /> {t.rfqCta}
          </button>
          <div className="duo-actions">
            <button className="btn btn-soft" onClick={followPrice} disabled={watched}>
              <Icon className="ic-sm" name="i-bm" /> {watched ? m.app.item.watching : t.followPrice}
            </button>
            <Link className="btn btn-soft" href={hasToken ? "/new" : "/login?mode=login"}>
              <Icon className="ic-sm" name="i-plus" /> {t.addToList}
            </Link>
          </div>
          <div className="action-desc">{t.actionDesc}</div>
        </div>

        <div className="hint">
          <Icon name="i-info" />
          <span>{t.fourWaysHint}</span>
        </div>
      </div>

      <div className="sticky-cta">
        <button className="btn btn-primary btn-lg btn-main" onClick={goRfq}>
          <Icon className="ic-sm" name="i-send" /> {t.rfqCtaShort}
        </button>
        <button className="btn btn-soft btn-lg btn-sec" onClick={followPrice} disabled={watched}>
          <Icon className="ic-sm" name="i-bm" /> {t.followPrice}
        </button>
      </div>

      {/* فاز ۹ — شیت اشتراک کامل کالای عمومی (sheet-share-product) */}
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        kind="product"
        path={`p/${biz.slug}/${listing.id}`}
        entity={name}
        autoContacts={shareContacts}
        loginPath={`/login?mode=login&dest=${encodeURIComponent(dest)}`}
      />
    </section>
  );
}
