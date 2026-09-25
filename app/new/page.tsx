"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness, useArmStore } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { ListingForm } from "@/app/components/listing-form";
import { CatalogPicker } from "@/app/new/catalog-picker";
import { useMessages } from "@/i18n/messages/use-messages";
import { Library, Loader2, Search } from "lucide-react";

/*
 * کالای جدید — دو در، یک مقصد (خواسته‌ی کاربر: فروشنده‌ی پرقلم نباید قلم‌به‌قلم
 * تایپ کند؛ خرده‌فروشِ معمولی نباید از او پیچیده‌تر شود):
 *   • «از کاتالوگ مرجع» (پیش‌فرض) — تیک بزن، قیمت بده، تمام.
 *   • «جست‌وجوی آزاد» — همان فرم دومرحله‌ای همیشگی؛ مسیر رشد کاتالوگ مرجع.
 * کدام بازو پر می‌شود؟ از ?tab=sell|buy (دکمه‌ی ویترین مربوطه) — انتخابگر هر
 * بار یک بازو را پر می‌کند؛ فرم آزاد همان‌جا نقش را می‌پرسد (فروش/خرید/هر دو).
 */
export default function NewListingPage() {
  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Suspense
            fallback={
              <div className="grid place-items-center py-32">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            }
          >
            <NewListingBody />
          </Suspense>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}

function NewListingBody() {
  const router = useRouter();
  const params = useSearchParams();
  const m = useMessages();
  const { status } = useAuthStore();
  const active = useActiveBusiness();
  const [mode, setMode] = useState<"picker" | "form">("picker");

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="rounded-2xl border border-dashed bg-white/60 p-10 text-center">
        <p className="text-lg font-extrabold">اول کسب‌وکارتان را بسازید</p>
        <p className="mt-2 text-sm text-muted-foreground">
          برای ثبت کالا به یک کسب‌وکار نیاز دارید — فقط نام و شهر می‌خواهد.
        </p>
        <button
          onClick={() => router.push("/start?mode=register")}
          className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm"
        >
          ساخت کسب‌وکار
        </button>
      </div>
    );
  }

  const arm = params.get("tab") === "buy" ? "buy" : "sell";

  return (
    <div className="space-y-4">
      {/* سوییچ دو مسیر — کوچک، بالای کارت، بدون سر و صدا */}
      <div className="mx-auto grid w-fit grid-cols-2 gap-1 rounded-full border bg-white p-1 shadow-sm">
        <ModeTab
          active={mode === "picker"}
          onClick={() => setMode("picker")}
          icon={<Library className="size-3.5" />}
          label={m.picker.tabLabel}
        />
        <ModeTab
          active={mode === "form"}
          onClick={() => setMode("form")}
          icon={<Search className="size-3.5" />}
          label={m.picker.switchToForm}
        />
      </div>

      {mode === "picker" ? (
        <CatalogPicker
          bizId={active.id}
          currency={active.currency ?? "IRR"}
          arm={arm}
          onDone={(kind) => {
            useArmStore.getState().setArm(kind);
            router.push(kind === "sell" ? "/sell" : "/buy");
          }}
          onSwitchToForm={() => setMode("form")}
        />
      ) : (
        <ListingForm
          bizId={active.id}
          currency={active.currency}
          onSaved={(k) => {
            useArmStore.getState().setArm(k);
            router.push(k === "sell" ? "/sell" : "/buy");
          }}
        />
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
