import { redirect } from "next/navigation";

/* مسیر legacy فرم استعلام — فاز ۴ مهاجرت: جایگزین v18 = ویزارد استعلام
 * گروهی /rfq/[goodId]. لینک‌های قدیمی (تابلو/محصول عمومی) این‌جا می‌رسند. */
export default async function LegacyQuoteRedirectPage({
  params,
}: {
  params: Promise<{ goodId: string }>;
}) {
  const { goodId } = await params;
  redirect(`/rfq/${goodId}`);
}
