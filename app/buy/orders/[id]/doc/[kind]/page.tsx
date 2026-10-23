"use client";

import { AuthGate } from "@/components/imach/auth-gate";
import { OrderDocView } from "@/components/imach/order-doc-view";

/** `/buy/orders/[id]/doc/[kind]` — اسکرین ۴۰/۴۱: سند سفارش (سمت خریدار · M5). */
export default function BuyOrderDocPage() {
  return (
    <AuthGate>
      <OrderDocView side="buy" />
    </AuthGate>
  );
}
