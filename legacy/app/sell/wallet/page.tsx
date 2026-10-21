import { redirect } from "next/navigation";

/** /sell/wallet → /wallet — صفحهٔ v18 کیف پول (فاز ۶) جایگزین legacy شد. */
export default function LegacyWalletRedirect() {
  redirect("/wallet");
}
