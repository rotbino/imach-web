"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Application-level providers:
 *  • TanStack Query — all server state (staleTime lives in lib/queries.ts)
 *  • Auth boot — silent refresh-token round-trip on first mount
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
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

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
