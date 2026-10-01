import ProductDetail from "./product-detail";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string; listingId: string }>;
}) {
  const { slug, listingId } = await params;
  return <ProductDetail slug={slug} listingId={listingId} />;
}
