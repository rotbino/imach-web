"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { ChatAvatar, timeLabel } from "@/components/imach/chat-parts";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { useAuthStore } from "@/lib/auth-store";
import { useThreads } from "@/lib/queries";

/** `/msgs` — ۲۹ پیام‌ها: فهرست گفتگوها + نشان آنلاین طرف + بج نخوانده.
 *  آخرین پیام denormalized از سرور می‌آید؛ فهرست هر ۲۰s تازه می‌شود.
 *  ?thread= (ورود قدیمی از کاتالوک عمومی) → مستقیم به خود گفتگو. */
export default function MsgsPage() {
  return (
    <AuthGate>
      <MsgsBody />
    </AuthGate>
  );
}

function MsgsBody() {
  const router = useRouter();
  const params = useSearchParams();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];

  // ورود عمقی با ?thread= — سازگار با کاتالوک عمومی (M6)
  const deep = params.get("thread");
  useEffect(() => {
    if (deep) router.replace(`/msgs/${deep}`);
  }, [deep, router]);

  const q = useThreads(!!biz);
  const items = q.data?.items ?? [];

  return (
    <AppShell arm="keep" title="پیام‌ها">
      <div data-msgs-list className="flex flex-col gap-3">
        {q.isLoading ? (
          <div className="py-16 text-center text-[13px] text-text-3">در حال بارگذاری…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Icon name="msg" size={30} />}
            title="هنوز گفتگویی ندارید"
            subtitle="از صفحهٔ سفارش یا پروفایل تأمین‌کننده گفتگو را شروع کنید — سابقهٔ معامله‌تان اینجا می‌ماند."
          />
        ) : (
          <>
            <p className="px-1 text-[11.5px] font-bold text-text-3">
              {items.length.toLocaleString("fa-IR")} گفتگو
            </p>
            <div className="flex flex-col gap-2.5">
              {items.map((t) => (
                <Link
                  key={t.id}
                  href={`/msgs/${t.id}`}
                  data-thread-row={t.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-2 active:bg-surface-2"
                >
                  <ChatAvatar other={t.other} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <b className="truncate text-[14.5px] font-black text-text">{t.other.name}</b>
                      {t.other.isVerified && (
                        <Icon name="verified" size={13} className="shrink-0 text-primary" />
                      )}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-text-3">
                      {t.unread > 0 && (
                        <span className="grid min-w-[18px] place-items-center rounded-full bg-arm px-[5px] text-[10px] font-black leading-[18px] text-white">
                          {t.unread.toLocaleString("fa-IR")}
                        </span>
                      )}
                      <span className={t.unread > 0 ? "truncate font-bold text-text-2" : "truncate"}>
                        {t.lastText ?? "بدون پیام"}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 self-start pt-0.5 text-[10.5px] text-text-3">
                    {timeLabel(t.lastAt)}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
