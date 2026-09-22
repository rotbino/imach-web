"use client";

import { Suspense } from "react";
import StartWizard from "./start-wizard";

/**
 * /start — useSearchParams داخل ویزارد (کد رفرال) نیاز به Suspense دارد
 * تا رندر استاتیک صفحه خطا ندهد.
 */
export default function StartPage() {
  return (
    <Suspense fallback={<div className="grid place-items-center py-32" />}>
      <StartWizard />
    </Suspense>
  );
}
