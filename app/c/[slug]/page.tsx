import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getServerMessages } from "@/i18n/messages/server";
import { DEFAULT_LOCALE, detectLocaleFromAcceptLanguage, getLocale } from "@/i18n/config";
import { goodName, num, unitLabel } from "@/lib/format";
import { listingPriceExpiredServer } from "@/lib/server-catalog";
import { AddToCartButton, CatalogBasket, type BasketListing } from "@/components/imach/catalog-basket";
import { CatalogGuestContext, CatalogPriceCell } from "@/components/imach/catalog-guest-context";
import { CatalogReviewsEntry } from "@/components/imach/catalog-reviews";
import { RefCapture } from "@/components/imach/ref-capture";

/**
 * `/c/[slug]` — ویترین عمومی کاتالوگ (M2 + M5 سبد + M6 شبکهٔ خصوصی).
 *
 * · SSR + گرید + بج منقضی (FD-52) + گیت قیمت سرورمبنا (M6: قیمتِ گیت‌شده
 *   هرگز به کلاینت نمی‌رسد؛ بینندهٔ واجد در CatalogPriceCell زنده می‌گیرد).
 * · M5 (FD-9/13/26): دکمهٔ + روی کارت‌های قیمت‌دار + سبد شناور + شیت سبد
 *   (عدد تایپی + گیت حداقل) + ثبت سفارش ⇒ POST /orders. مهمان = گیت حساب؛
 *   سبد در localStorage زنده می‌ماند. کاتالوک خودِ فروشنده = بدون سبد.
 */

interface PublicListing {
  id: string;
  title: string | null;
  variantLabel: string | null;
  priceMinor: number | null;
  currency: string | null;
  stock: number | null;
  minOrder: number | null;
  baseQty: number | null;
  pricedAt: string | null;
  priceExpired?: boolean;
  note: string | null;
  viewCount30: number;
  packaging?: { label: string; qty: number }[] | null;
  gallery?: { url: string; thumbUrl: string | null }[];
  good: { nameFa: string; nameEn: string | null; unit: string; id?: string };
}

interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  city: string;
  trade: string | null;
  currency: string;
  isVerified: boolean;
  priceValidityDays?: number | null;
  /** M10 (N2) — امتیاز کاتالوک در هدر ویترین */
  ratingAvg?: number;
  ratingCount?: number;
  owner?: { name: string } | null;
  listings: PublicListing[];
  saverCount: number;
  /** M6 — گیت قیمت فعال است (SSR قیمت‌ها را حذف کرده) */
  priceGated?: boolean;
  viewer?: { kind: string; isCustomer: boolean; custType: string | null };
}

const BACKEND = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000";

async function fetchBusiness(slug: string): Promise<PublicBusiness | null> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/businesses/getBusiness/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicBusiness;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const biz = await fetchBusiness(slug);
  if (!biz) return { title: "iMach" };
  const ogTitle = `${biz.name} — کاتالوگ عمده${biz.ratingCount ? ` (امتیاز ${biz.ratingAvg ?? 0} از ۵)` : ""}`;
  return {
    title: `${biz.name} — کاتالوگ عمده | iMach`,
    description:
      biz.bio ??
      `کاتالوگ عمدهٔ ${biz.name}${biz.trade ? ` (${biz.trade})` : ""} در ${biz.city} — قیمت‌های به‌روز روی آی‌مچ.`,
    alternates: { canonical: `/c/${slug}` },
    openGraph: {
      title: ogTitle,
      description:
        biz.bio ?? `کاتالوگ عمدهٔ ${biz.name} در ${biz.city} — ${biz.listings.length} کالا با قیمت زنده.`,
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function PublicCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  // M7 — لینک دعوت (?ref) همان لحظه ثبت می‌شود (localStorage) تا ثبت‌نام بعدی منتسب بماند
  const { ref } = await searchParams;
  const biz = await fetchBusiness(slug);
  if (!biz) notFound();

  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = getLocale(
    cookieStore.get("imach_locale")?.value ??
      detectLocaleFromAcceptLanguage(headerStore.get("accept-language")) ??
      DEFAULT_LOCALE
  );

  const listings = biz.listings.slice(0, 200);
  const guestRefs = listings.map((l) => ({
    id: l.id,
    goodId: (l.good as { id?: string }).id ?? "",
    name: l.title || goodName({ nameFa: l.good.nameFa, nameEn: l.good.nameEn }, locale),
  }));
  const basketListings: BasketListing[] = listings.map((l) => ({
    id: l.id,
    name: l.title || goodName({ nameFa: l.good.nameFa, nameEn: l.good.nameEn }, locale),
    pack: [l.variantLabel, l.packaging?.[0]?.label].filter(Boolean).join(" · "),
    priceMinor: l.priceMinor,
    currency: l.currency,
    minOrder: l.minOrder ?? 1,
  }));

  return (
    <>
    <RefCapture code={ref} />
    {/* M10 — SEO: JSON-LD استور + کاتالوگ پیشنهاد + فهرست کالاها (سند ۰۸ §M10) */}
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(catalogJsonLd(biz, slug, listings)),
      }}
    />
    <div data-arm="sell" className="min-h-dvh bg-bg">
      {/* هدر ویترین */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-[16px] font-black text-primary-strong">
            {biz.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-black text-text">{biz.name}</h1>
            <p className="truncate text-[11.5px] text-text-3">
              {biz.trade ? `${biz.trade} · ` : ""}
              {biz.city}
            </p>
          </div>
          {/* M10 — امتیاز و نظرات کاتالوک (N2) */}
          <CatalogReviewsEntry
            slug={slug}
            businessId={biz.id}
            businessName={biz.name}
            avg={biz.ratingAvg ?? 0}
            count={biz.ratingCount ?? 0}
          />
          <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-text-2">
            {num(biz.listings.length, locale)} کالا
          </span>
        </div>
      </header>

      {biz.bio && (
        <div className="mx-auto max-w-[1120px] px-4 pt-4 lg:px-8">
          <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-[12.5px] leading-6 text-text-2">
            {biz.bio}
          </p>
        </div>
      )}

      {/* M6 — زمینهٔ بیننده: ذخیره/کارت مشتری/«در لیست خرید شما»/افزودن به لیست */}
      <div className="mx-auto max-w-[1120px] px-4 lg:px-8" id="guest-ctx">
        <CatalogGuestContext
          slug={slug}
          businessId={biz.id}
          businessName={biz.name}
          listings={guestRefs}
        />
      </div>

      {/* گرید عمومی */}
      <main className="mx-auto max-w-[1120px] px-4 py-4 pb-24 lg:px-8 lg:pb-28">
        {listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-10 text-center text-[13px] text-text-3">
            این کاتالوگ هنوز کالایی ندارد
          </p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(158px,1fr))] lg:gap-4 lg:[grid-template-columns:repeat(auto-fill,minmax(228px,1fr))]">
            {listings.map((l) => {
              const name = l.title || goodName({ nameFa: l.good.nameFa, nameEn: l.good.nameEn }, locale);
              const img = l.gallery?.[0]?.thumbUrl ?? l.gallery?.[0]?.url ?? null;
              const expired = l.priceExpired ?? listingPriceExpiredServer(l.pricedAt, biz.priceValidityDays ?? null);
              const unit = l.good?.unit ? unitLabel(l.good.unit, locale) : "";
              /* مدل واحد ۱۰۲۶ — بستهٔ انتخابی کنار واریانت (سبک کارت کاتالوگ مالک) */
              const packLabel = l.packaging?.[0]?.label ?? null;
              const sub = [l.variantLabel, packLabel].filter(Boolean).join(" · ");
              return (
                <article
                  key={l.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(31,29,26,.04)]"
                >
                  <div className="relative aspect-[4/3] bg-surface-2">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element -- عکس عمومی با object-cover
                      <img src={img} alt={name} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid size-full place-items-center text-[32px] font-black text-text-4/70">
                        {name.slice(0, 1)}
                      </div>
                    )}
                    {expired && (
                      <span className="absolute start-2 top-2 rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-white">
                        قیمت منقضی
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <p className="line-clamp-1 text-[13.5px] font-bold text-text">{name}</p>
                    {sub && <p className="line-clamp-1 text-[11.5px] text-text-3">{sub}</p>}
                    <CatalogPriceCell
                      slug={slug}
                      listingId={l.id}
                      ssrPriceMinor={l.priceMinor}
                      ssrCurrency={l.currency}
                      expired={expired}
                    />
                    {l.note && <p className="line-clamp-1 text-[10.5px] text-text-4">{l.note}</p>}
                    {/* ردیف‌های قدیمیِ بی‌برچسب — همان خط تعداد */}
                    {!packLabel && l.baseQty && l.baseQty > 1 && unit && (
                      <p className="text-[10.5px] text-text-4">
                        {num(l.baseQty, locale)} {unit} × بسته
                      </p>
                    )}
                    {/* M5 — سبد خرید (۳۱): ردیف قیمت‌دار = دکمهٔ + */}
                    {l.priceMinor !== null && (
                      <div className="mt-1.5">
                        <AddToCartButton
                          slug={slug}
                          supplierName={biz.name}
                          listingId={l.id}
                          minOrder={l.minOrder ?? 1}
                          currency={l.currency ?? biz.currency}
                          priceMinor={l.priceMinor}
                        />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* M5 — سبد شناور + شیت + ثبت سفارش (۳۱) */}
      <CatalogBasket
        slug={slug}
        supplierId={biz.id}
        supplierName={biz.name}
        listings={basketListings}
      />

      <footer className="mx-auto max-w-[1120px] px-4 py-8 text-center lg:px-8">
        <p className="text-[11px] text-text-4">
          ویترین عمومی iMach — عمده‌فروشی برای کسب‌وکارها
        </p>
      </footer>
    </div>
    </>
  );
}

/* ═══ M10 — SEO: JSON-LD استور + کاتالوگ پیشنهاد + فهرست کالاها ═══ */

function catalogJsonLd(biz: PublicBusiness, slug: string, listings: PublicListing[]) {
  const priceOf = (l: PublicListing): number | null => {
    if (l.priceMinor === null) return null;
    const currency = l.currency ?? biz.currency;
    // ریال (IRR) یا تومان (IRT) → نمایش تومانی برای گوگل
    return currency === "IRR" ? l.priceMinor / 10 : l.priceMinor;
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        name: biz.name,
        description:
          biz.bio ??
          `کاتالوگ عمدهٔ ${biz.name}${biz.trade ? ` (${biz.trade})` : ""} در ${biz.city} روی آی‌مچ`,
        url: `/c/${slug}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: biz.city,
          addressCountry: "IR",
        },
        ...(biz.ratingCount && biz.ratingCount > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: biz.ratingAvg ?? 0,
                reviewCount: biz.ratingCount,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
      },
      {
        "@type": "OfferCatalog",
        name: `کاتالوگ ${biz.name}`,
        numberOfItems: listings.length,
        itemListElement: listings.slice(0, 100).map((l, i) => ({
          "@type": "Offer",
          position: i + 1,
          itemOffered: {
            "@type": "Product",
            name: l.title || l.good.nameFa,
            ...(l.variantLabel ? { category: l.variantLabel } : {}),
          },
          ...(priceOf(l) !== null
            ? {
                price: priceOf(l),
                priceCurrency: "IRR",
                availability:
                  l.stock !== null && l.stock > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
              }
            : {}),
        })),
      },
    ],
  };
}
