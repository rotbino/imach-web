import { RequestDetail } from "./request-detail";

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestDetail inquiryId={id} />;
}
