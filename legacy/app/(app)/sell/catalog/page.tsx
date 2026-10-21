import { Suspense } from "react";
import { CatalogView } from "./catalog-view";
import { Spinner } from "@/components/imach/spinner";

/** /sell/catalog — کاتالوگ من (پورت sc-sell-catalog v18 · فاز ۵). خانهٔ بازوی فروش. */
export default function SellCatalogPage() {
  return (
    <Suspense
      fallback={
        <section className="screen" data-screen="sell-catalog">
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <Spinner size={22} />
          </div>
        </section>
      }
    >
      <CatalogView />
    </Suspense>
  );
}
