import type { Metadata } from "next";
import { ChargeForm } from "./charge-form";

/** /wallet/charge — افزایش کیف پول (پورت sc-charge · فاز ۶). */
export const metadata: Metadata = {
  title: "iMach — افزایش کیف پول",
  robots: { index: false },
};

export default function ChargePage() {
  return <ChargeForm />;
}
