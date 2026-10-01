"use client";

import Link from "next/link";
import type { ExploreItemDto } from "@/lib/api";
import { fa, categoryName, goodName, unitLabel, frequencyLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Loader2, MapPin } from "lucide-react";

/*
 * کارت‌های فید مشترک — بازار و کارتابل‌ها از این‌ها استفاده می‌کنند:
 * کارت فروش شبیه آلبوم اینستاگرام، سطر خرید شبیه لیست.
 */

export function FeedSpinner() {
  return (
    <div className="grid place-items-center py-24">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

export function EmptyFeed({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center">{icon}</span>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

