"use client";

import { useAuthStore } from "@/lib/auth-store";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { useMessages } from "@/i18n/messages/use-messages";
import { useRouter } from "next/navigation";

/**
 * `/me` — مقصد پس از احراز در M1 (routeAfterAuth به این‌جا می‌آید).
 * M2: اسکرین‌های میز واقعی (۰۴/۰۹) همین مسیر/ساختار را جایگزین می‌کنند —
 * تا آن‌جا این صفحه نشستِ واقعی + کسب‌وکارهای کاربر را از getMe نشان می‌دهد.
 */
export default function MePage() {
  return (
    <AuthGate>
      <MeContent />
    </AuthGate>
  );
}

function MeContent() {
  const router = useRouter();
  const m = useMessages();
  const t = m.me;
  const user = useAuthStore((s) => s.user);
  const businesses = useAuthStore((s) => s.businesses);
  const logout = useAuthStore((s) => s.logout);

  return (
    <AppShell arm="sell" title={t.title}>
      <div className="flex flex-col gap-4">
        {/* شناسنامه */}
        <section className="rounded-xl border border-line bg-surface p-5">
          <p className="text-[15px] font-black text-text">
            {t.hello.replace("{name}", user?.firstName ?? "—")}
          </p>
          <p className="mt-1 text-[12.5px] text-text-3" dir="ltr">
            {user?.phone}
          </p>
          <p className="mt-3 text-[12px] leading-5 text-text-4">{t.note}</p>
        </section>

        {/* کسب‌وکارها */}
        <section className="rounded-xl border border-line bg-surface">
          <h2 className="border-b border-line px-5 py-3.5 text-[13.5px] font-bold text-text-2">
            {t.myBusinesses}
          </h2>
          {businesses.length === 0 ? (
            <EmptyState
              icon={<Icon name="store" size={24} />}
              title={t.emptyTitle}
              subtitle={t.emptySub}
            />
          ) : (
            <ul className="divide-y divide-line">
              {businesses.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="grid size-10 place-items-center rounded-lg bg-arm-soft text-[15px] font-black text-arm-strong">
                    {(b.name ?? "؟").slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-text">{b.name}</p>
                    <p className="text-[11.5px] text-text-3">{b.city ?? "—"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/demo")}>
            {t.demoBtn}
          </Button>
          <Button variant="ghost" onClick={() => void logout("/")}>
            {t.logoutBtn}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
