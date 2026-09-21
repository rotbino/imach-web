"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useMessages } from "@/i18n/messages/use-messages";
import { LanguageSelect } from "@/app/components/language-select";
import { Loader2, Globe, ShieldCheck, Ban, ChevronDown, ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ADMIN_NAV, navLabel } from "./nav";
import type { NavLeaf, NavGroup } from "./nav";

/*
 * شِل پنل ادمین — داشبوردی داخل همان سایت، نه اپ جدا:
 * • گارد کلاینت: هر کاربر role=ADMIN وارد می‌شود؛ بقیه با کارت «دسترسی ندارید» روبه‌رو می‌شوند.
 * • منوی درختی: هر بسته‌ی مادر روی دسکتاپ بازشو است؛ روی موبایل لمس بسته،
 *   شیت پایین با زیردسته‌ها باز می‌کند — همه‌چیز با شست قابل رسیدن است.
 * • فایل‌های ادمین فقط داخل app/admin/** زندگی می‌کنند تا روز انتقال، یک‌جا جابه‌جا شوند.
 */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const m = useMessages();

  // بسته‌ی بازِ سایدبار — وقتی مسیر عوض شود، بسته‌ی دارای برگ فعال خودکار باز می‌ماند
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [sheetGroup, setSheetGroup] = useState<NavGroup | null>(null);

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  // با هر مسیر: بسته‌ی حاوی برگ فعال باز، بقیه به حالت خودشان
  useEffect(() => {
    const activeGroup = ADMIN_NAV.find(
      (n): n is NavGroup => n.kind === "group" && n.children.some((c) => c.href === pathname)
    );
    if (activeGroup) {
      setOpenGroups((prev) => new Set(prev).add(activeGroup.labelKey));
      setSheetGroup(null); // ناوبری شیت را می‌بندد
    }
  }, [pathname]);

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

  const isLeafActive = (leaf: NavLeaf) =>
    leaf.exact ? pathname === leaf.href : pathname.startsWith(leaf.href);

  const groupHasActive = (g: NavGroup) => g.children.some(isLeafActive);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── سایدبار دسکتاپ ────────────────────────────────────────────────────────
  const desktopNav = (
    <nav className="flex flex-col gap-0.5">
      {ADMIN_NAV.map((node) => {
        if (node.kind === "leaf") {
          const active = isLeafActive(node);
          return (
            <Link
              key={node.href}
              href={node.href}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <node.icon className="size-4.5" strokeWidth={1.75} />
              {navLabel(m, node.labelKey)}
            </Link>
          );
        }

        const open = openGroups.has(node.labelKey) || groupHasActive(node);
        return (
          <div key={node.labelKey} className="mt-1">
            <button
              type="button"
              onClick={() => toggleGroup(node.labelKey)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ${
                groupHasActive(node)
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <node.icon className="size-4.5" strokeWidth={1.75} />
              <span className="grow text-start">{navLabel(m, node.labelKey)}</span>
              <ChevronDown
                className={`size-4 text-muted-foreground/60 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && (
              <div className="relative ms-[26px] flex flex-col gap-0.5 border-s py-1 ps-3">
                {node.children.map((leaf) => {
                  const active = isLeafActive(leaf);
                  return (
                    <Link
                      key={leaf.href}
                      href={leaf.href}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-bold transition-colors ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <leaf.icon className="size-4" strokeWidth={1.75} />
                      {navLabel(m, leaf.labelKey)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  // ── نوار پایین موبایل ─────────────────────────────────────────────────────
  const mobileNav = (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {ADMIN_NAV.map((node) => {
        if (node.kind === "leaf") {
          const active = isLeafActive(node);
          return (
            <Link
              key={node.href}
              href={node.href}
              className={`flex shrink-0 flex-col items-center gap-1 px-3 py-1.5 text-[10px] font-bold ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <node.icon className="size-5" strokeWidth={1.75} />
              {navLabel(m, node.labelKey)}
            </Link>
          );
        }
        const active = groupHasActive(node);
        return (
          <button
            key={node.labelKey}
            type="button"
            onClick={() => setSheetGroup(node)}
            className={`flex shrink-0 flex-col items-center gap-1 px-3 py-1.5 text-[10px] font-bold ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <node.icon className="size-5" strokeWidth={1.75} />
            {navLabel(m, node.labelKey)}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ریل دسکتاپ */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-e bg-white px-4 py-6 lg:flex">
        <div className="flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">iMach</p>
            <p className="text-[11px] font-bold text-muted-foreground">{m.admin.title}</p>
          </div>
        </div>

        <div className="mt-8">{desktopNav}</div>

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

        {mobileNav}
      </div>

      {/* شیت زیردسته‌های یک بسته — موبایل */}
      <Dialog open={sheetGroup !== null} onOpenChange={(v) => !v && setSheetGroup(null)}>
        <DialogContent className="mx-auto max-w-sm rounded-t-3xl p-0 sm:rounded-3xl">
          <DialogHeader className="items-start border-b px-5 pb-3 pt-5">
            <DialogTitle className="flex items-center gap-2 text-sm">
              {sheetGroup && <sheetGroup.icon className="size-4.5 text-primary" strokeWidth={1.75} />}
              {sheetGroup ? navLabel(m, sheetGroup.labelKey) : ""}
            </DialogTitle>
            <DialogDescription className="sr-only">{m.admin.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 px-4 py-4">
            {sheetGroup?.children.map((leaf) => {
              const active = isLeafActive(leaf);
              return (
                <Link
                  key={leaf.href}
                  href={leaf.href}
                  onClick={() => setSheetGroup(null)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-bold transition-colors ${
                    active
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-stone-200 hover:bg-accent/50"
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                      active ? "bg-primary/10 text-primary" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    <leaf.icon className="size-4.5" strokeWidth={1.75} />
                  </span>
                  <span className="grow">{navLabel(m, leaf.labelKey)}</span>
                  <ChevronLeft className="size-4 shrink-0 text-muted-foreground/50" />
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
