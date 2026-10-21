import type { Metadata } from "next";
import { WalletView } from "./wallet-view";

/**
 * /wallet — کیف پول (پورت sc-wallet · فاز ۶).
 * جایگزین v18 صفحهٔ legacy /sell/wallet (ریدایرکت).
 */

export const metadata: Metadata = {
  title: "iMach — کیف پول",
  robots: { index: false },
};

export default function WalletPage() {
  return <WalletView />;
}
