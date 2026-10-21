import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BusinessProfileDto, GoodItemDto } from "@/lib/api";
import { fetchPublicBusiness } from "@/lib/imach/server-api";
import { activeLocale, pageTitle, productDescription } from "@/lib/imach/metadata";
import { ProductPublicView } from "./product-public-view";

/**
 * /p/[slug]/[listingId] — کالای عمومی v18 (فاز ۷ · SSR + SEO).
 * JSON-LD: Product با Offer (قیمت تومانی → IRR ×۱۰ موجودی).
 */

type Props = { params: Promise<{ slug: string; listingId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, listingId } = await params;
  const [biz, locale] = await Promise.all([fetchPublicBusiness<BusinessProfileDto>(slug), activeLocale()]);
  const listing = (biz?.listings ?? []).find((l) => l.id === listingId);
  if (!biz || !listing) return { title: "iMach", robots: { index: false } };
  const name = listing.variantLabel ? `${listing.good.nameFa} — ${listing.variantLabel}` : listing.good.nameFa;
  const price =
    listing.priceMinor !== null
      ? locale === "en"
        ? `${(listing.priceMinor / 10).toLocaleString("en-US")} Toman / ${listing.good.unit}`
        : locale === "ar"
          ? `${(listing.priceMinor / 10).toLocaleString("ar-EG")} تومان / ${listing.good.unit}`
          : `${(listing.priceMinor / 10).toLocaleString("fa-IR")} تومان / ${listing.good.unit}`
      : locale === "en"
        ? "price on request"
        : locale === "ar"
          ? "السعر عند الطلب"
          : "استعلام قیمت";
  const desc = productDescription(name, biz.name, biz.city, price, locale);
  return {
    title: pageTitle(`${name} — ${biz.name}`, locale),
    description: desc,
    alternates: { canonical: `/p/${biz.slug}/${listing.id}` },
    openGraph: { title: pageTitle(name, locale), description: desc, type: "article" },
    robots: { index: true, follow: true },
  };
}

export default async function PublicProductPage({ params }: Props) {
  const { slug, listingId } = await params;
  const biz = await fetchPublicBusiness<BusinessProfileDto>(slug);
  const listing = (biz?.listings ?? []).find((l) => l.id === listingId) as GoodItemDto | undefined;
  if (!biz || !listing) notFound();

  const name = listing.variantLabel ? `${listing.good.nameFa} — ${listing.variantLabel}` : listing.good.nameFa;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(listing.gallery?.[0]?.url ? { image: [listing.gallery[0].url] } : {}),
    ...(listing.brand?.name ? { brand: { "@type": "Brand", name: listing.brand.name } } : {}),
    ...(listing.priceMinor !== null
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "IRR",
            price: listing.priceMinor,
            availability: (listing.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: biz.name },
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductPublicView biz={biz} listing={listing} />
    </>
  );
}
