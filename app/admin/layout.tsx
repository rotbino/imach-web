"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useMessages } from "@/i18n/messages/use-messages";
import { LanguageSelect } from "@/app/components/language-select";
import { Loader2, LayoutDashboard, Package, Tag, Globe, ShieldCheck, Ban } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/*
 * شِل پنل ادمین — داشبوردی داخل همان سایت، نه اپ جدا:
 * • گارد کلاینت: هر کاربر role=ADMIN وارد می‌شود؛ بقیه با کارت «دسترسی ندارید» روبه‌رو می‌شوند.
 * • دسکتاپ: ریل کناری ثابت (استارت RTL)؛ موبایل: هدر بالا + نوار تب پایین — همه‌چیز با شست قابل رسیدن است.
 * • فایل‌های ادمین فقط داخل app/admin/** زندگی می‌کنند تا روز انتقال، یک‌جا جابه‌جا شوند.
 */

const NAV: { href: string; labelKey: "overview" | "goods" | "brands"; icon: LucideIcon }[] = [
  { href: "/admin", labelKey: "overview", icon: LayoutDashboard },
  { href: "/admin/goods", labelKey: "goods", icon: Package },
  { href: "/admin/brands", labelKey: "brands", icon: Tag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const m = useMessages();

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed" || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-6">
        <div className="w-full max-w-sm rounded-3xl border bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <Ban className="size-7" />
          </span>
          <p className="mt-4 font-extrabold">{m.admin.forbiddenTitle}</p>
          <Link href="/home" className="mt-5 inline-block text-sm font-bold text-primary hover:underline">
            {m.admin.backToSite}
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const navLinks = (compact?: boolean) =>
    NAV.map((n) => (
      <Link
        key={n.href}
        href={n.href}
        className={`flex shrink-0 items-center gap-2.5 rounded-xl font-bold transition-colors ${
          compact
            ? `flex-col gap-1 px-3 py-1.5 text-[10px] ${isActive(n.href) ? "text-primary" : "text-muted-foreground"}`
            : `px-3.5 py-2.5 text-sm ${isActive(n.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`
        }`}
      >
        <n.icon className={compact ? "size-5" : "size-4.5"} strokeWidth={1.75} />
        <span className="truncate">{m.admin.nav[n.labelKey]}</span>
      </Link>
    ));

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ریل دسکتاپ */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-e bg-white px-4 py-6 lg:flex">
        <div className="flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">iMach</p>
            <p className="text-[11px] font-bold text-muted-foreground">{m.admin.title}</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">{navLinks()}</nav>

        <div className="mt-auto flex flex-col gap-3 border-t pt-4">
          <Link
            href="/home"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <Globe className="size-4.5" strokeWidth={1.75} />
            {m.admin.backToSite}
          </Link>
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold text-muted-foreground">{m.common.languageLabel}</span>
            <LanguageSelect />
          </div>
        </div>
      </aside>

      {/* ستون محتوا */}
      <div className="flex min-w-0 grow flex-col">
        {/* هدر موبایل */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-4.5" strokeWidth={1.75} />
          </span>
          <p className="text-sm font-black">iMach · {m.admin.title}</p>
          <div className="ms-auto flex items-center gap-1">
            <LanguageSelect />
            <Link
              href="/home"
              aria-label={m.admin.backToSite}
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <Globe className="size-5" strokeWidth={1.75} />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl grow px-4 py-5 pb-24 sm:px-6 lg:pb-8">{children}</main>

        {/* نوار پایین موبایل */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {navLinks(true)}
        </nav>
      </div>
    </div>
  );
}
