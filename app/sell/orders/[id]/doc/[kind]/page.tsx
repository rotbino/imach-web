"use client";

import { AuthGate } from "@/components/imach/auth-gate";
import { OrderDocView } from "@/components/imach/order-doc-view";

/** `/sell/orders/[id]/doc/[kind]` — اسکرین ۴۰/۴۱: سند سفارش (سمت فروشنده · M5). */
export default function SellOrderDocPage() {
  return (
    <AuthGate>
      <OrderDocView side="sell" />
    </AuthGate>
  );
}
