import { Suspense } from "react";
import { QuoteForm } from "./quote-form";

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ goodId: string }>;
  searchParams: Promise<{ pre?: string }>;
}) {
  const { goodId } = await params;
  const { pre } = await searchParams;
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[100dvh] place-items-center bg-background">
          <span className="size-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
        </div>
      }
    >
      <QuoteForm goodId={goodId} pre={pre ?? null} />
    </Suspense>
  );
}
