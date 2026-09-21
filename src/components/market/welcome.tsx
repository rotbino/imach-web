"use client";

import type { Business } from "@/lib/types";
import { ArmLinkCard } from "./chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "./chrome";
import { fa } from "@/lib/mock-data";
import {
  CheckCircle2,
  Eye,
  Link2,
  Radio,
  ShoppingBasket,
  Store,
  Users,
} from "lucide-react";

const AFTER_STEPS = [
  {
    icon: Radio,
    title: "قیمت‌گیری",
    desc: "هر وقت خواستی قیمت بگیری، کالای موردنظر را در بازوی خرید فعال می‌کنی؛ تامین‌کننده‌های مناسب می‌بینند و پیشنهاد می‌دهند.",
  },
  {
    icon: Users,
    title: "پیشنهاد هوشمند",
    desc: "بر اساس حجم، شهر و نوع فعالیت، به تامین‌کننده‌ها خریدار درست و به تو تامین‌کننده درست پیشنهاد می‌شود.",
  },
  {
    icon: Eye,
    title: "فالو و تابلوی قیمت",
    desc: "تامین‌کننده‌های مناسب را فالو کن تا قیمت‌هایشان همیشه در یک جدول جمع و مقایسه شود.",
  },
];

export default function Welcome({
  biz,
  onNavigate,
}: {
  biz: Business;
  onNavigate: (to: string) => void;
}) {
  const buyCount = biz.listings.filter((l) => l.buy).length;
  const sellCount = biz.listings.filter((l) => l.sell).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* تیک موفقیت */}
      <div className="text-center">
        <span className="animate-pop-in mx-auto grid size-16 place-items-center rounded-full bg-teal-50 text-teal-600 ring-8 ring-teal-50/60">
          <CheckCircle2 className="size-9" />
        </span>
        <h1 className="mt-4 text-xl font-black sm:text-2xl">
          {biz.name} عزیز، بازوهایت ساخته شد!
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
          دو صفحه اختصاصی برای تو ساخته شد؛ یکی نمایش کالاهای فروشت به خریدارها و یکی
          مدیریت خرید و قیمت‌گیریت از تامین‌کننده‌ها. لینک هر بازو مخصوص توست و هر وقت
          خواستی می‌توانی آن را برای طرف مقابل بفرستی.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <RoleBadge role={biz.role} />
          <Badge variant="secondary">{biz.city}</Badge>
          <Badge variant="secondary">{fa(sellCount)} کالای فروش</Badge>
          <Badge variant="secondary">{fa(buyCount)} کالای خرید</Badge>
        </div>
      </div>

      {/* دو لینک اختصاصی */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ArmLinkCard
          kind="sell"
          slug={biz.slug}
          bizName={biz.name}
          onView={() => onNavigate(`/sell/${biz.slug}`)}
        />
        <ArmLinkCard
          kind="buy"
          slug={biz.slug}
          bizName={biz.name}
          onView={() => onNavigate(`/buy/${biz.slug}`)}
        />
      </div>

      {/* از این به بعد چه می‌شود */}
      <div className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-extrabold">
          <Link2 className="size-5 text-primary" />
          از این به بعد چه اتفاقی می‌افتد؟
        </h2>
        <div className="mt-4 space-y-3">
          {AFTER_STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3 rounded-xl bg-muted/60 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-sm">
                <s.icon className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-bold">
                  {fa(i + 1)}. {s.title}
                </p>
                <p className="mt-0.5 text-xs leading-6 text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button className="bg-amber-500 hover:bg-amber-600" onClick={() => onNavigate(`/buy/${biz.slug}`)}>
          <ShoppingBasket className="size-4" />
          رفتن به بازوی خرید
        </Button>
        <Button variant="outline" onClick={() => onNavigate(`/sell/${biz.slug}`)}>
          <Store className="size-4" />
          رفتن به بازوی فروش
        </Button>
      </div>
    </div>
  );
}
