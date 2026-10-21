import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getServerMessages } from "@/i18n/messages/server";
import { DEFAULT_LOCALE, detectLocaleFromAcceptLanguage, getLocale } from "@/i18n/config";
import { goodName, num, unitLabel, CURRENCIES } from "@/lib/format";
import { listingPriceExpiredServer } from "@/lib/server-catalog";

/**
 * `/c/[slug]` — ویترین عمومی کاتالوگ (نسخهٔ پایهٔ M2 — «پیش‌نمایش» از پنل
 * فروشنده همین‌جا می‌آید). گیت قیمت/صنف و تطبیق «در لیست خرید شما» در M6
 * سمت سرور اعمال می‌شود؛ این نسخهٔ پایه: SSR + گرید + بج منقضی (FD-52).
 */

interface PublicListing {
  id: string;
  title: string | null;
  variantLabel: string | null;
  priceMinor: number | null;
  currency: string | null;
  stock: number | null;
  baseQty: number | null;
  pricedAt: string | null;
  priceExpired?: boolean;
  note: string | null;
  viewCount30: number;
  gallery?: { url: string; thumbUrl: string | null }[];
  good: { nameFa: string; nameEn: string | null; unit: string };
}

interface PublicBusiness {
  name: string;
  slug: string;
  bio: string | null;
  city: string;
  trade: string | null;
  currency: string;
  isVerified: boolean;
  priceValidityDays?: number | null;
  owner?: { name: string } | null;
  listings: PublicListing[];
  saverCount: number;
}

const BACKEND = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000";

async function fetchBusiness(slug: string): Promise<PublicBusiness | null> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/businesses/getBusiness/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicBusiness;
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
  const biz = await fetchBusiness(slug);
  if (!biz) return { title: "iMach" };
  return {
    title: `${biz.name} — کاتالوگ عمده | iMach`,
    description:
      biz.bio ??
      `کاتالوگ عمدهٔ ${biz.name}${biz.trade ? ` (${biz.trade})` : ""} در ${biz.city} — قیمت‌های به‌روز روی آی‌مچ.`,
    alternates: { canonical: `/c/${slug}` },
  };
}

export default async function PublicCatalogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const biz = await fetchBusiness(slug);
  if (!biz) notFound();

  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = getLocale(
    cookieStore.get("imach_locale")?.value ??
      detectLocaleFromAcceptLanguage(headerStore.get("accept-language")) ??
      DEFAULT_LOCALE
  );

  const listings = biz.listings.slice(0, 200);
  const fmtPrice = (l: PublicListing) => {
    if (l.priceMinor === null) return "";
    const cur = CURRENCIES[l.currency ?? "IRR"] ?? { exp: 0, fa: l.currency ?? "", en: "", ar: "" };
    const label = locale === "en" ? cur.en : locale === "ar" ? cur.ar || cur.en : cur.fa;
    return `${num(l.priceMinor / 10 ** cur.exp, locale)} ${label}`;
  };

  return (
    <div data-arm="sell" className="min-h-dvh bg-bg">
      {/* هدر ویترین */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-[16px] font-black text-primary-strong">
            {biz.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-black text-text">{biz.name}</h1>
            <p className="truncate text-[11.5px] text-text-3">
              {biz.trade ? `${biz.trade} · ` : ""}
              {biz.city}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-text-2">
            {num(biz.listings.length, locale)} کالا
          </span>
        </div>
      </header>

      {biz.bio && (
        <div className="mx-auto max-w-[1120px] px-4 pt-4 lg:px-8">
          <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-[12.5px] leading-6 text-text-2">
            {biz.bio}
          </p>
        </div>
      )}

      {/* گرید عمومی */}
      <main className="mx-auto max-w-[1120px] px-4 py-4 lg:px-8">
        {listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-10 text-center text-[13px] text-text-3">
            این کاتالوگ هنوز کالایی ندارد
          </p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(158px,1fr))] lg:gap-4 lg:[grid-template-columns:repeat(auto-fill,minmax(228px,1fr))]">
            {listings.map((l) => {
              const name = l.title || goodName({ nameFa: l.good.nameFa, nameEn: l.good.nameEn }, locale);
              const img = l.gallery?.[0]?.thumbUrl ?? l.gallery?.[0]?.url ?? null;
              const expired = l.priceExpired ?? listingPriceExpiredServer(l.pricedAt, biz.priceValidityDays ?? null);
              const unit = l.good?.unit ? unitLabel(l.good.unit, locale) : "";
              return (
                <article
                  key={l.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(31,29,26,.04)]"
                >
                  <div className="relative aspect-[4/3] bg-surface-2">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element -- عکس عمومی با object-cover
                      <img src={img} alt={name} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid size-full place-items-center text-[32px] font-black text-text-4/70">
                        {name.slice(0, 1)}
                      </div>
                    )}
                    {expired && (
                      <span className="absolute start-2 top-2 rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-white">
                        قیمت منقضی
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <p className="line-clamp-1 text-[13.5px] font-bold text-text">{name}</p>
                    {l.variantLabel && (
                      <p className="line-clamp-1 text-[11.5px] text-text-3">{l.variantLabel}</p>
                    )}
                    {l.priceMinor !== null ? (
                      <p className="mt-1">
                        <b className={`text-[15px] font-black ${expired ? "text-text-3" : "text-text"}`}>
                          {fmtPrice(l)}
                        </b>
                      </p>
                    ) : (
                      <p className="mt-1 text-[11.5px] font-bold text-amber">برای قیمت وارد شوید</p>
                    )}
                    {l.note && <p className="line-clamp-1 text-[10.5px] text-text-4">{l.note}</p>}
                    {l.baseQty && l.baseQty > 1 && unit && (
                      <p className="text-[10.5px] text-text-4">
                        {num(l.baseQty, locale)} {unit} × بسته
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[1120px] px-4 py-8 text-center lg:px-8">
        <p className="text-[11px] text-text-4">
          ویترین عمومی iMach — برای سفارش و استعلام قیمت عضو شوید
        </p>
      </footer>
    </div>
  );
}
