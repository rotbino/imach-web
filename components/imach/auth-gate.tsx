"use client";

/**
 * AuthGate — گارد گروه (app): میهمان → /login، booting → اسپینر.
 * الگوی همان صفحات موجود (status-driven) ولی متمرکز در layout تا همهٔ
 * صفحات شل از آن ارث ببرند. در فازهای بعد می‌تواند به middleware
 * سمت سرور ارتقا یابد (ریدایرکت قبل از رندر).
 */

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useMessages } from "@/i18n/messages/use-messages";
import { Spinner } from "./spinner";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const m = useMessages();

  useEffect(() => {
    if (status === "guest") router.replace("/login");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div
        style={{
          flex: 1,
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
          <Spinner size={22} />
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.app.home.loading}</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
