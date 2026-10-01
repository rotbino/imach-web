import { SupplyBoardPage } from "./board-view";

export default async function BoardPage({ params }: { params: Promise<{ goodId: string }> }) {
  const { goodId } = await params;
  return <SupplyBoardPage goodId={goodId} />;
}
