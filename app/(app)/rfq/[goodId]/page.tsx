import { RfqWizard } from "./rfq-wizard";

/**
 * /rfq/[goodId] — استعلام قیمت گروهی (پورت sc-rfq از Prototype v18 · فاز ۴).
 * مسیر بر حسب «کالا» است (خودش چند Inquiry می‌سازد)؛ ?from=<rfqGroupId>
 * برای «دوباره درخواست بده» فرم را با نیاز قبلی پیش‌پر می‌کند.
 */
export default async function RfqPage({
  params,
  searchParams,
}: {
  params: Promise<{ goodId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { goodId } = await params;
  const { from } = await searchParams;
  return <RfqWizard goodId={goodId} from={from ?? null} />;
}
