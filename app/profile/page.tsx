"use client";

import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/messages/use-messages";
import { useAuthStore } from "@/lib/auth-store";
import { fmtPhone } from "@/lib/countries";
import { useMoney } from "@/components/imach/prefs-context";
import { currencyLabel } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";

/** `/profile` — پروفایل مینیمال M2 (کارت هویت + خروج + زبان/ارز از شل).
 * پروفایل کامل (۱۸) و ویرایش کسب‌وکار (۱۶) در M8 ساخته می‌شود. */
export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileContent />
    </AuthGate>
  );
}

function ProfileContent() {
  const m = useMessages();
  const { locale } = useLocale();
  const user = useAuthStore((s) => s.user);
  const businesses = useAuthStore((s) => s.businesses);
  const logout = useAuthStore((s) => s.logout);
  const { display } = useMoney();
  const biz = businesses[0];

  return (
    <AppShell arm="sell" title={m.placeholders.profileTitle}>
      <div className="flex flex-col gap-4">
        <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-arm-soft text-[20px] font-black text-arm-strong">
            {(user?.firstName ?? "؟").slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-black text-text">
              {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name : "کاربر"}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-text-3" dir="ltr">
              {fmtPhone(user?.phone)}
            </p>
            {biz && (
              <p className="mt-1 truncate text-[12px] text-text-3">
                {biz.name} · {biz.city}
              </p>
            )}
          </div>
        </section>

        <section className="flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4">
          <span className="flex items-center gap-2 text-[13.5px] font-bold text-text-2">
            <Icon name="globe" size={18} />
            {m.shell.prefsCurrency}
          </span>
          <span className="text-[13px] font-bold text-arm-strong">{currencyLabel(display, locale)}</span>
        </section>

        <Button variant="danger" size="lg" onClick={() => void logout("/")}>
          {m.shell.logoutAria}
        </Button>
      </div>
    </AppShell>
  );
}
