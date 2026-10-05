import { QuoteForm } from "./quote-form";

/**
 * /sell/quote/[id] — پاسخ با قیمت (پورت sc-quote از Prototype v18 · فاز ۴).
 * id = شناسهٔ Inquiry (پاسخ به «به من») یا «b»+شناسهٔ BUY listing
 * (پاسخ به فرصت بازار / گوش‌به‌زنگ).
 */
export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteForm id={id} />;
}
