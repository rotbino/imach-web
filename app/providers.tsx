"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { LocaleProvider, useLocale } from "@/i18n/locale-context";
import { DisplayPrefsProvider } from "@/components/imach/prefs-context";
import { unitsApi } from "@/lib/api";
import { hydrateUnits } from "@/lib/format";

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
  initialCurrency,
  children,
}: {
  initialLocale?: string;
  initialCurrency?: string | null;
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

  // سرویس‌ورکر Web Push — یک‌بار در کل اپ گرم می‌شود؛ فعال‌سازیِ واقعی
  // (اجازه + subscribe) فقط با کلیک کاربر در زنگ اعلان‌ها انجام می‌شود.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <QueryClientProvider client={client}>
      <LocaleProvider initialLocale={initialLocale}>
        <Directional>
          <DisplayPrefsProvider initialCurrency={initialCurrency}>
            <AuthCacheSync />
            <UnitsBoot />
            {children}
          </DisplayPrefsProvider>
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

/**
 * واحد eyeballing — یک fetch عمومی /units/list در طول عمر اپ (staleTime ۲۴س)
 * و پرکردن نقشهٔ UNIT_DB_NAMES تا unitLabel() برای همهٔ واحدهای DB عنوان
 * فارسی/محلی برگرداند (رفع باگ مالک: کلید انگلیسی دیده می‌شد).
 * نسخهٔ (ver) در state نگه داشته می‌شود تا درخت زیرین بعد از آمدن دیتا
 * دوباره رندر شود و برچسب‌ها تازه شوند.
 */
function UnitsBoot() {
  const qc = useQueryClient();
  const unitsQ = useQuery({
    queryKey: ["units", "all"],
    queryFn: () => unitsApi.list(),
    staleTime: 24 * 3600_000,
    retry: 1,
  });
  const data = unitsQ.data;
  const hydrated = useRef(false);
  useEffect(() => {
    if (data && !hydrated.current) {
      hydrated.current = true;
      hydrateUnits(data);
      // صفحاتی که پیش از رسیدن واحدها رندر شده‌اند (واحد فقط-DB = کلید
      // انگلیسی) دوباره داده بگیرند و با برچسب درست رندر شوند؛ یک‌بار در
      // طول عمر اپ — قبض ارزانِ درست-بودن همیشگی.
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "units" });
    }
  }, [data, qc]);
  return null;
}

/** Bridges locale state into Radix UI's direction context. */
function Directional({ children }: { children: React.ReactNode }) {
  const { dir } = useLocale();
  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}
