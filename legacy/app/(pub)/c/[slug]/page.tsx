import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BusinessProfileDto } from "@/lib/api";
import { fetchPublicBusiness } from "@/lib/imach/server-api";
import { activeLocale, pageTitle, catalogDescription } from "@/lib/imach/metadata";
import { CatalogPublicView } from "./catalog-public-view";

/**
 * /c/[slug] — کاتالوگ عمومی v18 (فاز ۷ · SSR + SEO).
 * دادهٔ عمومی سمت سرور (getBusiness بدون auth) → HTML کامل برای ربات + کاربر.
 * JSON-LD: Store/Organization + ItemList کالاهای قابل‌فروش.
 */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [biz, locale] = await Promise.all([fetchPublicBusiness<BusinessProfileDto>(slug), activeLocale()]);
  if (!biz) return { title: "iMach", robots: { index: false } };
  const n = (biz.listings ?? []).filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null).length;
  const catalogTitle =
    locale === "en" ? `${biz.name} — Public catalog` : locale === "ar" ? `${biz.name} — كتالوج عام` : `${biz.name} — کاتالوک عمومی`;
  const desc = catalogDescription(biz.name, biz.activityType, biz.city, n, locale);
  return {
    title: pageTitle(catalogTitle, locale),
    description: desc,
    alternates: { canonical: `/c/${biz.slug}` },
    openGraph: {
      title: pageTitle(catalogTitle, locale),
      description: desc,
      type: "profile",
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicCatalogPage({ params }: Props) {
  const { slug } = await params;
  const biz = await fetchPublicBusiness<BusinessProfileDto>(slug);
  if (!biz) notFound();

  const items = (biz.listings ?? []).filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: biz.name,
    url: `/c/${biz.slug}`,
    address: { "@type": "PostalAddress", addressLocality: biz.city, addressCountry: biz.country ?? "IR" },
    ...(items.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `${biz.name} — کاتالوگ`,
            itemListElement: items.slice(0, 30).map((l, i) => ({
              "@type": "Offer",
              position: i + 1,
              itemOffered: { "@type": "Product", name: l.variantLabel ? `${l.good.nameFa} — ${l.variantLabel}` : l.good.nameFa },
              price: (l.priceMinor ?? 0) / 10,
              priceCurrency: "IRR",
              availability: (l.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            })),
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CatalogPublicView biz={biz} />
    </>
  );
}
