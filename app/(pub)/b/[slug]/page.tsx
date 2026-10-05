import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BusinessProfileDto } from "@/lib/api";
import { fetchPublicBusiness } from "@/lib/imach/server-api";
import { ListPublicView } from "./list-public-view";

/**
 * /b/[slug] — لیست خرید عمومی v18 (فاز ۷ · SSR + SEO).
 * همان پروفایل عمومی getBusiness؛ نیازهای BUY listingها (حجم/تناوب) رندر می‌شود.
 * JSON-LD: Organization خریدار (بدون قیمت — لیست نیاز است نه عرضه).
 */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const biz = await fetchPublicBusiness<BusinessProfileDto>(slug);
  if (!biz) return { title: "iMach", robots: { index: false } };
  const n = (biz.listings ?? []).filter((l) => l.mode === "BUY" || l.mode === "BOTH").length;
  const desc = `لیست خرید عمومی ${biz.name}${biz.activityType ? ` — ${biz.activityType}` : ""} در ${biz.city} · ${n} کالا با نیاز منظم · تأمین‌کننده‌ها گوش‌به‌زنگ نیازها می‌شوند`;
  return {
    title: `${biz.name} — لیست خرید عمومی | آی‌مچ`,
    description: desc,
    alternates: { canonical: `/b/${biz.slug}` },
    openGraph: { title: `${biz.name} — لیست خرید عمومی`, description: desc, type: "profile" },
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
