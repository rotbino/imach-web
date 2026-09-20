"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { LocaleProvider, useLocale } from "@/i18n/locale-context";

/**
 * Application-level providers:
 *  • TanStack Query — all server state (staleTime lives in lib/queries.ts)
 *  • Locale — language + document direction state (i18n base)
 *  • Radix DirectionProvider — makes dropdowns/dialogs/tooltips follow
 *    the document direction automatically (RTL ⇄ LTR with the language)
 *  • Auth boot — silent refresh-token round-trip on first mount
 */
export function AppProviders({
  initialLocale,
  children,
}: {
  initialLocale?: string;
  children: React.ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      })
  );

  const boot = useAuthStore((s) => s.boot);
  const booted = useRef(false);

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      void boot();
    }
  }, [boot]);

  return (
    <QueryClientProvider client={client}>
      <LocaleProvider initialLocale={initialLocale}>
        <Directional>
          <AuthCacheSync />
          {children}
        </Directional>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

/**
 * Session identity changed (login / logout / another user) → drop ALL
 * server state. Otherwise the next session could see the previous
 * session's businesses list. Mounted queries refetch automatically.
 */
function AuthCacheSync() {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const qc = useQueryClient();
  const prev = useRef<string | null>(null);

  const identity = status === "authed" ? `user:${userId ?? ""}` : status;
  useEffect(() => {
    // فقط وقتی هویتِ کاربر عوض می‌شود (کاربر↔کاربر یا خروج) کش پاک می‌شود؛
    // مهمان→کاربر پاک‌سازی ندارد تا دیالوگ‌های عمومی (مثل گیت تماس) باز بمانند —
    // کوئری‌های احرازشده خودشان با فعال‌شدنِ enabled تازه می‌شوند.
    const prevWasUser = prev.current?.startsWith("user:") ?? false;
    if (prev.current !== null && prev.current !== identity && (prevWasUser || identity === "guest")) {
      qc.removeQueries();
    }
    prev.current = identity;
  }, [identity, qc]);

  return null;
}

/** Bridges locale state into Radix UI's direction context. */
function Directional({ children }: { children: React.ReactNode }) {
  const { dir } = useLocale();
  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}
