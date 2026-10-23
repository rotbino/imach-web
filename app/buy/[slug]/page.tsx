import type { Metadata } from "next";
import { BuyListGuestView } from "@/components/imach/buy-list-guest";
import { RefCapture } from "@/components/imach/ref-capture";
import type { PublicBuyListDto } from "@/lib/api";

/**
 * `/buy/[slug]` — نمای عمومی لیست خرید (اسکرین ۳۲ · M6).
 * صفحهٔ سروری نازک: SEO + HTML اولیهٔ مهمان؛ بیننده‌دار شدن در
 * BuyListGuestView (کلاینت — توکن در حافظه است). لینک اشتراک ۲۰
 * (`/buy/${slug}`) از M3 این‌جا رسید.
 */

const BACKEND = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000";

async function fetchBuyList(slug: string): Promise<PublicBuyListDto | null> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/businesses/getBuyList/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicBuyListDto;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchBuyList(slug);
  if (!data) return { title: "iMach" };
  const B = data.business;
  return {
    title: `لیست خرید ${B.name} | iMach`,
    description: `کالاهای موردنیاز ${B.name}${B.trade ? ` (${B.trade})` : ""} در ${B.city} — تأمین‌کننده‌ها می‌توانند پیشنهاد تامین بدهند.`,
    alternates: { canonical: `/buy/${slug}` },
  };
}

export default async function PublicBuyListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  // M7 — لینک دعوت (?ref=buy:{slug}) همان لحظه ثبت می‌شود (localStorage)
  const { ref } = await searchParams;
  const initial = await fetchBuyList(slug);
  return (
    <>
      <RefCapture code={ref} />
      <BuyListGuestView slug={slug} initial={initial} />
    </>
  );
}
