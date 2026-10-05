import { redirect } from "next/navigation";

/** /sell/[slug]/[listingId] → /p/[slug]/[listingId] — کالای عمومی v18 (فاز ۷). */
export default async function LegacyListingRedirect({
  params,
}: {
  params: Promise<{ slug: string; listingId: string }>;
}) {
  const { slug, listingId } = await params;
  redirect(`/p/${slug}/${listingId}`);
}
