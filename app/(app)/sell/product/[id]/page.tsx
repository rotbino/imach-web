import { Suspense } from "react";
import { ProductView } from "./product-view";
import { Spinner } from "@/components/imach/spinner";

/** /sell/product/[id] — کالا در کاتالوگ من، دید مالک (پورت sc-sell-product-owner · فاز ۵). */
export default async function SellProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <section className="screen" data-screen="sell-product-owner">
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <Spinner size={22} />
          </div>
        </section>
      }
    >
      <ProductView listingId={id} />
    </Suspense>
  );
}
