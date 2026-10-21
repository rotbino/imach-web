import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BusinessProfileDto } from "@/lib/api";
import { fetchPublicBusiness } from "@/lib/imach/server-api";
import { activeLocale, pageTitle, listDescription } from "@/lib/imach/metadata";
import { ListPublicView } from "./list-public-view";

/**
 * /b/[slug] — لیست خرید عمومی v18 (فاز ۷ · SSR + SEO).
 * همان پروفایل عمومی getBusiness؛ نیازهای BUY listingها (حجم/تناوب) رندر می‌شود.
 * JSON-LD: Organization خریدار (بدون قیمت — لیست نیاز است نه عرضه).
 */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [biz, locale] = await Promise.all([fetchPublicBusiness<BusinessProfileDto>(slug), activeLocale()]);
  if (!biz) return { title: "iMach", robots: { index: false } };
  const n = (biz.listings ?? []).filter((l) => l.mode === "BUY" || l.mode === "BOTH").length;
  const listTitle =
    locale === "en" ? `${biz.name} — Public buying list` : locale === "ar" ? `${biz.name} — قائمة شراء عامة` : `${biz.name} — لیست خرید عمومی`;
  const desc = listDescription(biz.name, biz.activityType, biz.city, n, locale);
  return {
    title: pageTitle(listTitle, locale),
    description: desc,
    alternates: { canonical: `/b/${biz.slug}` },
    openGraph: { title: pageTitle(listTitle, locale), description: desc, type: "profile" },
    robots: { index: true, follow: true },
  };
}

export default async function PublicListPage({ params }: Props) {
  const { slug } = await params;
  const biz = await fetchPublicBusiness<BusinessProfileDto>(slug);
  if (!biz) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: biz.name,
    url: `/b/${biz.slug}`,
    address: { "@type": "PostalAddress", addressLocality: biz.city, addressCountry: biz.country ?? "IR" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ListPublicView biz={biz} />
    </>
  );
}
