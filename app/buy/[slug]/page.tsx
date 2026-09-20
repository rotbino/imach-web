import BuyArm from "@/components/market/buy-arm";

export default async function BuyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BuyArm slug={slug} />;
}
