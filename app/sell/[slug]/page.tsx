import SellArm from "./sell-arm";

export default async function SellPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SellArm slug={slug} />;
}
