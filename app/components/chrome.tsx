"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fa } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeftRight,
  Check,
  CircleUserRound,
  Copy,
  Link2,
  LogIn,
  MapPin,
  MessageCircle,
  PlusCircle,
  Send,
  ShoppingBasket,
  Store,
} from "lucide-react";

/*
 * نویگیشن به سبک اینستاگرام:
 * • موبایل → فوتر چسبان با چهار آیتم: بازوی فروش، کالای جدید، بازوی خرید، پروفایل
 * • دسکتاپ → همان آیتم‌ها بالا، سمت مقابل لوگو
 * • سوییچر بازوها از پنل به بیرون کشیده شد؛ خود آیتم‌های نویگیشن سوییچرند.
 * • مهمان فقط «ورود | ثبت‌نام» می‌بیند.
 */

// ─── آیتم‌های نویگیشن ───
function useNavItems() {
  const active = useActiveBusiness();
  const slug = active?.slug;
  return [
    { href: slug ? `/sell/${slug}` : "/panel", label: "بازوی فروش", icon: Store },
    { href: "/panel/new", label: "کالای جدید", icon: PlusCircle },
    { href: slug ? `/buy/${slug}` : "/panel", label: "بازوی خرید", icon: ShoppingBasket },
    { href: "/profile", label: "پروفایل", icon: CircleUserRound },
  ];
}

function isActivePath(href: string, pathname: string): boolean {
  if (href === "/panel/new") return pathname.startsWith("/panel/new");
  if (href === "/profile") return pathname.startsWith("/profile");
  if (href.startsWith("/sell/")) return pathname.startsWith("/sell/");
  if (href.startsWith("/buy/")) return pathname.startsWith("/buy/");
  return false;
}

// ─── هدر بالا: لوگو یک طرف، آیتم‌ها طرف دیگر (دسکتاپ) ───
export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuthStore();
  const items = useNavItems();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-lg font-extrabold"
          aria-label="iMach — خانه"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Link2 className="size-4" />
          </span>
          iMach
        </button>

        {status === "authed" ? (
          <nav className="hidden items-center gap-1 sm:flex" aria-label="نویگیشن اصلی">
            {items.map((it) => (
              <Link
                key={it.label}
                href={it.href}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
                  isActivePath(it.href, pathname)
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <it.icon className="size-4.5" />
                {it.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push("/start")}>
              ورود
            </Button>
            <Button size="sm" onClick={() => router.push("/start")}>
              <LogIn className="size-4" />
              ثبت‌نام
            </Button>
          </div>
        )}
        {status === "authed" && (
          <span className="sr-only">{user?.name}</span>
        )}
      </div>
    </header>
  );
}

// ─── فوتر چسبان موبایل — نویگیشن اینستاگرامی ───
export function MobileTabBar() {
  const { status } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const items = useNavItems();

  return (
    <nav
      aria-label="نویگیشن موبایل"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {status === "authed" ? (
        <div className="grid grid-cols-4">
          {items.map((it) => {
            const on = isActivePath(it.href, pathname);
            return (
              <Link
                key={it.label}
                href={it.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${
                  on ? "text-primary" : "text-muted-foreground"
                }`}
                aria-current={on ? "page" : undefined}
              >
                <it.icon className={`size-5.5 ${on ? "fill-primary/10" : ""}`} strokeWidth={on ? 2.4 : 2} />
                {it.label}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-2">
          <Button variant="outline" onClick={() => router.push("/start")}>
            ورود
          </Button>
          <Button onClick={() => router.push("/start")}>ثبت‌نام</Button>
        </div>
      )}
    </nav>
  );
}

// ─── فوتر ───
export function AppFooter() {
  return (
    <footer className="mb-[4.25rem] mt-auto border-t bg-white/60 pb-[env(safe-area-inset-bottom)] sm:mb-0">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
        <p>iMach — ارزان‌تر بخر، بیشتر بفروش</p>
        <p>کاتالوگ فروش و لیست خرید هوشمند — رایگان</p>
      </div>
    </footer>
  );
}

// ─── کارت لینک اختصاصی بازو ───
export function ArmLinkCard({
  kind,
  slug,
  bizName,
  onView,
}: {
  kind: "sell" | "buy";
  slug: string;
  bizName?: string;
  onView: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const isSell = kind === "sell";
  const path = `${kind}/${slug}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://imach.app";
  const fullUrl = `${origin}/${path}`;
  const shareText = isSell
    ? `کاتالوگ فروش ${bizName ? `«${bizName}» ` : ""}در iMach`
    : `نیازهای خرید ${bizName ? `«${bizName}» ` : ""}در iMach — اگر این کالا را دارید، پیشنهاد بدهید`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      /* clipboard may fail — ignore */
    }
    setCopied(true);
    toast({ title: "لینک کپی شد", description: path });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText}: ${fullUrl}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div
      className={`rounded-2xl border p-5 ${
        isSell ? "border-primary/25 bg-accent/50" : "border-stone-300/70 bg-stone-50/70"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <span
            className={`grid size-9 place-items-center rounded-xl text-white shadow-sm ${
              isSell ? "bg-primary" : "bg-stone-700"
            }`}
          >
            {isSell ? <Store className="size-4" /> : <ShoppingBasket className="size-4" />}
          </span>
          <div>
            <p className="text-sm">{isSell ? "بازوی فروش" : "بازوی خرید"}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {isSell ? "کاتالوگ فروش شما برای خریدارها" : "نیازهای خرید شما برای تامین‌کننده‌ها"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white">
          {isSell ? "فروش" : "خرید"}
        </Badge>
      </div>
      <div className="flex items-center gap-2 rounded-xl border bg-white p-2 ps-3" dir="ltr">
        <span className="grow truncate text-left text-sm font-medium text-primary">{path}</span>
        <Button size="icon" variant="ghost" onClick={() => void copy()} aria-label="کپی لینک" className="size-8">
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="shrink-0 rounded-xl border bg-white p-1.5 shadow-sm"
          title="برای باز کردن لینک در موبایل، اسکن کنید"
        >
          <QRCodeSVG value={fullUrl} size={64} fgColor="#f97316" bgColor="#ffffff" />
        </div>
        <div className="grid grow gap-2">
          <Button onClick={onView} className={isSell ? "" : "bg-stone-800 hover:bg-stone-900"}>
            {isSell ? "مشاهده بازوی فروش" : "مشاهده بازوی خرید"}
            <ArrowLeftRight className="size-4" />
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={shareTelegram}>
              <Send className="size-3.5 text-sky-600" />
              تلگرام
            </Button>
            <Button variant="outline" size="sm" onClick={shareWhatsApp}>
              <MessageCircle className="size-3.5 text-green-600" />
              واتساپ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── حلقه امتیاز تطبیق ───
export function MatchRing({ score, size = 44 }: { score: number; size?: number }) {
  const color = score >= 85 ? "#e0490a" : score >= 70 ? "#f97316" : "#a8a29e";
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${score}%, #e8e7e5 ${score}%)`,
      }}
      role="img"
      aria-label={`امتیاز تطبیق ${fa(score)} درصد`}
    >
      <span
        className="grid place-items-center rounded-full bg-white"
        style={{ width: size - 8, height: size - 8 }}
      >
        <span className="text-xs font-bold" style={{ color }}>
          {fa(score)}٪
        </span>
      </span>
    </div>
  );
}

// ─── عنوان بخش ───
export function SectionTitle({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <div>
        <h2 className="flex items-center gap-2 text-base font-extrabold">
          {icon}
          {title}
        </h2>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
