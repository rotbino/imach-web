import { redirect } from "next/navigation";

/** /sell/promos → /sell/campaign — گزارش کمپین v18 (فاز ۶) جایگزین legacy شد. */
export default function LegacyPromosRedirect() {
  redirect("/sell/campaign");
}
