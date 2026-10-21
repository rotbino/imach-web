"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Spinner } from "@/components/ui/feedback";

/**
 * AuthGate — شیلد مسیرهای احراز‌شده (الگوی فاز ۲ مهاجرت، سالواح‌شده).
 * booting → اسپینر · guest → هدایت به /login · authed → children.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status === "guest") router.replace("/login");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <Spinner className="size-7 text-arm" />
      </div>
    );
  }
  return <>{children}</>;
}
