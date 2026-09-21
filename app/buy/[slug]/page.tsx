import BuyPublic from "./buy-public";

export default async function BuyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BuyPublic slug={slug} />;
}
