import { Suspense } from "react";
import { DiscountsView } from "./discounts-view";
import { Spinner } from "@/components/imach/spinner";

/** /sell/discounts — تخفیف‌های حجمی و مشتری (پورت sc-discount v18 · فاز ۵). */
export default function SellDiscountsPage() {
  return (
    <Suspense
      fallback={
        <section className="screen" data-screen="discount">
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <Spinner size={22} />
          </div>
        </section>
      }
    >
      <DiscountsView />
    </Suspense>
  );
}
