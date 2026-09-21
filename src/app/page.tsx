"use client";

import { useAuthStore } from "@/lib/auth-store";
import { AppFooter, AppHeader } from "@/components/market/chrome";
import Landing from "@/components/market/landing";

export default function Home() {
  const status = useAuthStore((s) => s.status);

  if (status === "booting") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow" />
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <Landing />
      </main>
      <AppFooter />
    </div>
  );
}
