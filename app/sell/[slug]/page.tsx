import { redirect } from "next/navigation";

/** /sell/[slug] → /c/[slug] — کاتالوگ عمومی v18 (فاز ۷) جایگزین legacy شد. */
export default async function LegacySellRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/c/${slug}`);
}
