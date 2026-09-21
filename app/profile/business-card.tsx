"use client";

import { useToast } from "@/hooks/use-toast";
import { useEditBusiness } from "@/lib/queries";
import { activityTypeLabel, ACTIVITY_TYPES } from "@/lib/format";
import type { BusinessSummaryDto } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase } from "lucide-react";

/*
 * کارت کسب‌وکار در پروفایل — نوع فعالیت (۱۰ گزینه؛ اختیاری).
 * تنظیم کسب‌وکار یک خانه دارد: پروفایل. نقش‌ها حالت سیستم نیستند (سند ۳)؛
 * فقط تعیین می‌کنند خریدار/فروشنده دقیقا بداند شما کی هستید.
 */
export function BusinessCard({ biz }: { biz: BusinessSummaryDto }) {
  const { toast } = useToast();
  const edit = useEditBusiness();

  const setActivity = async (v: string) => {
    const value = v === "NONE" ? null : v;
    try {
      await edit.mutateAsync({ id: biz.id, activityType: value });
      toast({ title: value ? `نوع فعالیت: ${activityTypeLabel(value)}` : "نوع فعالیت حذف شد" });
    } catch {
      toast({ title: "ذخیره ناموفق بود", description: "دوباره تلاش کنید", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Briefcase className="size-4" />
        </span>
        <div>
          <p className="text-sm font-bold">{biz.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {biz.activityType ? activityTypeLabel(biz.activityType) : "نوع فعالیت — اختیاری، برای شناخته‌شدن"}
          </p>
        </div>
      </div>

      <Select value={biz.activityType ?? ""} onValueChange={(v) => void setActivity(v)}>
        <SelectTrigger className="w-full sm:w-48" aria-label="نوع فعالیت">
          <SelectValue placeholder="انتخاب کنید…" />
        </SelectTrigger>
        <SelectContent>
          {ACTIVITY_TYPES.map((a) => (
            <SelectItem key={a.key} value={a.key}>
              {a.fa}
            </SelectItem>
          ))}
          {biz.activityType && <SelectItem value="NONE">حذف انتخاب</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}
