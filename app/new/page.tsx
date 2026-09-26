"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness, smartSwitchArm } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { NoBusinessState } from "@/app/components/no-business";
import { ListingForm } from "@/app/components/listing-form";
import { CopyFromPeers, ReferencePicker } from "@/app/new/catalog-picker";
import { ImportSheet } from "@/app/new/import-sheet";
import { ScanEntry } from "@/app/new/scan-entry";
import { FileSpreadsheet, Library, Loader2, ScanLine, Keyboard, Copy } from "lucide-react";

type Mode = "solo" | "excel" | "ref" | "catalog" | "scan";

export default function NewListingPage() {
  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="grid place-items-center py-32"><Loader2 className="size-6 animate-spin text-primary" /></div>}>
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
  const { status } = useAuthStore();
  const active = useActiveBusiness();
  const [mode, setMode] = useState<Mode>("solo");

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return <div className="grid place-items-center py-32"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  if (!active) return <NoBusinessState variant="sell" />;

  const arm = params.get("tab") === "buy" ? "buy" : "sell";

  const tabs: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: "solo", label: "دستی", icon: <Keyboard className="size-3.5" /> },
    { key: "excel", label: "اکسل", icon: <FileSpreadsheet className="size-3.5" /> },
    { key: "ref", label: "از مرجع", icon: <Library className="size-3.5" /> },
    { key: "catalog", label: "از کاتالوگ", icon: <Copy className="size-3.5" /> },
    { key: "scan", label: "با اسکنر", icon: <ScanLine className="size-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* ۵ تب */}
      <div className="mx-auto flex w-fit flex-wrap gap-1 rounded-full border bg-white p-1 shadow-sm">
        {tabs.map((t) => (
          <ModeTab key={t.key} active={mode === t.key} onClick={() => setMode(t.key)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {mode === "solo" && (
        <ListingForm
          bizId={active.id}
          currency={active.currency}
          onSaved={(k) => { smartSwitchArm(k); router.push(k === "sell" ? "/sell" : "/buy"); }}
        />
      )}

      {mode === "excel" && (
        <ImportSheet
          bizId={active.id}
          arm={arm}
          onDone={(kind) => { smartSwitchArm(kind); router.push(kind === "sell" ? "/sell" : "/buy"); }}
        />
      )}

      {mode === "ref" && (
        <ReferencePicker
          bizId={active.id}
          currency={active.currency ?? "IRR"}
          arm={arm}
          onDone={(kind) => { smartSwitchArm(kind); router.push(kind === "sell" ? "/sell" : "/buy"); }}
          onSwitchToSolo={() => setMode("solo")}
        />
      )}

      {mode === "catalog" && (
        <CopyFromPeers
          bizId={active.id}
          arm={arm}
          onDone={(kind) => { smartSwitchArm(kind); router.push(kind === "sell" ? "/sell" : "/buy"); }}
          onSwitchToSolo={() => setMode("solo")}
        />
      )}

      {mode === "scan" && (
        <ScanEntry
          bizId={active.id}
          currency={active.currency}
          onDone={(kind) => { smartSwitchArm(kind); router.push(kind === "sell" ? "/sell" : "/buy"); }}
          onSwitchToForm={() => setMode("solo")}
        />
      )}
    </div>
  );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="[&>svg]:size-4">{icon}</span>
      {label}
    </button>
  );
}
