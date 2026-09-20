"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fa, roleLabel, ROLE_HINTS } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeftRight,
  Check,
  Copy,
  Factory,
  Link2,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  MessageCircle,
  Send,
  ShoppingBasket,
  Store,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

// ─── آیکون و برچسب نقش‌ها (enum های سرور) ───
export const ROLE_ICONS: Record<string, LucideIcon> = {
  RETAILER: Store,
  WHOLESALER: Warehouse,
  PRODUCER: Factory,
  MARKETER: Megaphone,
};

export const roleColor = (role: string): string => {
  switch (role) {
    case "RETAILER":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "WHOLESALER":
      return "bg-stone-100 text-stone-700 border-stone-300";
    case "PRODUCER":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "MARKETER":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export function RoleBadge({ role }: { role: string }) {
  const Icon = ROLE_ICONS[role];
  return (
    <Badge variant="outline" className={`gap-1 ${roleColor(role)}`}>
      {Icon && <Icon className="size-3" />}
      {roleLabel(role)}
    </Badge>
  );
}

// ─── هدر کلی ───
export function AppHeader() {
  const router = useRouter();
  const { status, user, businesses, logout } = useAuthStore();
  const mine = businesses[0];

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
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
        <div className="flex items-center gap-2">
          {status === "authed" && mine && (
            <Button size="sm" variant="outline" onClick={() => router.push(`/sell/${mine.slug}`)}>
              <ArrowLeftRight className="size-4 text-primary" />
              بازوهای من
            </Button>
          )}
          <Button size="sm" onClick={() => router.push("/start")}>
            <ShoppingBasket className="size-4" />
            ثبت کالاها
          </Button>
          {status === "authed" && user ? (
            <Button size="sm" variant="ghost" onClick={() => void logout()} aria-label="خروج">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => router.push("/start")} aria-label="ورود">
              <LogIn className="size-4" />
              <span className="hidden sm:inline">ورود</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── فوتر چسبیده ───
export function AppFooter() {
  return (
    <footer className="mt-auto border-t bg-white/60 pb-[env(safe-area-inset-bottom)]">
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

// ─── هویت کسب‌وکار در بالای بازوها ───
export function ArmIdentity({
  bizName,
  bizRole,
  bizCity,
  bizPhone,
  armKind,
  otherArm,
  otherLabel,
  onSwitch,
  onCopyLink,
}: {
  bizName: string;
  bizRole: string;
  bizCity: string;
  bizPhone?: string | null;
  armKind: "sell" | "buy";
  otherArm: "sell" | "buy";
  otherLabel: string;
  onSwitch: () => void;
  onCopyLink: () => void;
}) {
  const Icon = ROLE_ICONS[bizRole] ?? Store;
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-xl font-black text-primary">
            {bizName.slice(0, 1)}
          </span>
          <div>
            <p className="text-lg font-extrabold leading-6">{bizName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <RoleBadge role={bizRole} />
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {bizCity}
              </span>
              {bizPhone && (
                <span className="flex items-center gap-1" dir="ltr">
                  <Icon className="size-3.5" />
                  {bizPhone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCopyLink}>
            <Copy className="size-4" />
            کپی لینک این صفحه
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onSwitch}
            className={otherArm === "sell" ? "" : "bg-stone-800 hover:bg-stone-900 text-white"}
          >
            <ArrowLeftRight className="size-4" />
            {otherLabel}
          </Button>
        </div>
      </div>
      <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        {armKind === "buy"
          ? "این بازوی اختصاصی خرید شماست؛ تامین‌کننده‌های مناسب نیازهایتان را اینجا می‌بینند و پیشنهاد قیمت می‌دهند."
          : "این بازوی اختصاصی فروش شماست؛ خریدارها کاتالوگتان را می‌بینند و درخواست قیمت می‌فرستند."}
      </p>
    </div>
  );
}

export { ROLE_HINTS };
