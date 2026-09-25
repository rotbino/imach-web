"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness, useArmStore } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { ListingForm } from "@/app/components/listing-form";
import { CatalogPicker } from "@/app/new/catalog-picker";
import { ImportSheet } from "@/app/new/import-sheet";
import { ScanEntry } from "@/app/new/scan-entry";
import { useMessages } from "@/i18n/messages/use-messages";
import { FileSpreadsheet, Library, Loader2, ScanLine, Keyboard } from "lucide-react";

/*
 * کالای جدید — سه در، یک مقصد (خواسته‌ی کاربر: فروشنده‌ی پرقلم نباید قلم‌به‌قلم
 * تایپ کند؛ خرده‌فروشِ معمولی نباید از او پیچیده‌تر شود؛ لیست بزرگ راهش فایل است):
 *   • «از کاتالوگ‌ها» (پیش‌فرض) — هم‌صنف‌ها را کپی کن یا از لیست مرجع تیک بزن.
 *   • «از فایل اکسل» — لیست بزرگ‌ات را با پیش‌نمایش یک‌جا وارد کن.
 *   • «ثبت تکی» — دونه‌دونه با فرم دستی، یا سریع با اسکنر (خواسته‌ی کاربر:
 *     «دو جور ثبت در بخش ثبتی»).
 * کدام بازو پر می‌شود؟ از ?tab=sell|buy (دکمه‌ی ویترین مربوطه) — انتخابگر هر
 * بار یک بازو را پر می‌کند؛ فرم تکی همان‌جا نقش را می‌پرسد (فروش/خرید/هر دو).
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
  const [mode, setMode] = useState<"picker" | "form" | "file">("picker");
  /** زیرحالت ثبت تکی — فرم دستی یا اسکنر (خواسته‌ی کاربر) */
  const [soloWay, setSoloWay] = useState<"manual" | "scanner">("manual");

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
      {/* سوییچ سه مسیر — کوچک، بالای کارت، بدون سر و صدا */}
      <div className="mx-auto grid w-fit grid-cols-3 gap-1 rounded-full border bg-white p-1 shadow-sm">
        <ModeTab
          active={mode === "picker"}
          onClick={() => setMode("picker")}
          icon={<Library className="size-3.5" />}
          label={m.picker.tabLabel}
        />
        <ModeTab
          active={mode === "file"}
          onClick={() => setMode("file")}
          icon={<FileSpreadsheet className="size-3.5" />}
          label={m.importSheet.tabLabel}
        />
        <ModeTab
          active={mode === "form"}
          onClick={() => setMode("form")}
          icon={<Keyboard className="size-3.5" />}
          label={m.entry.soloTab}
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
          onSwitchToSolo={() => setMode("form")}
        />
      ) : mode === "file" ? (
        <ImportSheet
          bizId={active.id}
          arm={arm}
          onDone={(kind) => {
            useArmStore.getState().setArm(kind);
            router.push(kind === "sell" ? "/sell" : "/buy");
          }}
        />
      ) : (
        <>
          {/* زیرسوییچ ثبت تکی — فرم دستی یا اسکنر، هر دو به همان کاتالوگ می‌روند */}
          <div className="mx-auto flex w-fit gap-1 rounded-full border bg-white p-1 shadow-sm">
            <ModeTab
              active={soloWay === "manual"}
              onClick={() => setSoloWay("manual")}
              icon={<Keyboard className="size-3.5" />}
              label={m.entry.manualWay}
            />
            <ModeTab
              active={soloWay === "scanner"}
              onClick={() => setSoloWay("scanner")}
              icon={<ScanLine className="size-3.5" />}
              label={m.entry.scannerWay}
            />
          </div>
          {soloWay === "scanner" ? (
            <ScanEntry
              bizId={active.id}
              currency={active.currency}
              onDone={(kind) => {
                useArmStore.getState().setArm(kind);
                router.push(kind === "sell" ? "/sell" : "/buy");
              }}
              onSwitchToForm={() => setSoloWay("manual")}
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
        </>
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
