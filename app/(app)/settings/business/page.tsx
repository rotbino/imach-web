import type { Metadata } from "next";
import { Suspense } from "react";
import { EditBizForm } from "./edit-biz-form";
import { Spinner } from "@/components/imach/spinner";

/** /settings/business — ویرایش کسب‌وکار (پورت sc-edit-biz · فاز ۶). */
export const metadata: Metadata = {
  title: "iMach — ویرایش کسب‌وکار",
  robots: { index: false },
};

export default function EditBizPage() {
  return (
    <Suspense
      fallback={
        <section className="screen" data-screen="edit-biz">
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <Spinner size={22} />
          </div>
        </section>
      }
    >
      <EditBizForm />
    </Suspense>
  );
}
