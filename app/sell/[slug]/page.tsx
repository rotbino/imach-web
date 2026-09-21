import SellPublic from "./sell-public";

export default async function SellPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SellPublic slug={slug} />;
}
