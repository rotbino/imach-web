import { Suspense } from "react";
import { RequestsView } from "./requests-view";
import { Spinner } from "@/components/imach/spinner";

/**
 * /sell/requests — درخواست‌های قیمت فروشنده (پورت sc-sell-requests v18 · فاز ۴).
 * جایگزین صفحهٔ legacy Tailwind؛ سه تب: به من / فرصت‌های بازار / گوش‌به‌زنگ.
 */
export default function SellRequestsPage() {
  return (
    <Suspense
      fallback={
        <section className="screen" data-screen="sell-requests">
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <Spinner size={22} />
          </div>
        </section>
      }
    >
      <RequestsView />
    </Suspense>
  );
}
