"use client";

import { useState } from "react";
import { useEditBusiness } from "@/lib/queries";
import { ACTIVITY_TYPES, activityTypeLabel } from "@/lib/format";
import { iranCityItems } from "@/lib/iran-geo";
import { ApiError, type BusinessSummaryDto } from "@/lib/api";
import { BadgeCheck, Briefcase, Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

/*
 * ویرایش هدر صفحه — نام، شهر، نوع فعالیت.
 * محل اصلی: برگه‌ی «تنظیمات» داشبورد هر بازو (خواسته‌ی کاربر:
 * ویرایش هدر مثل عنوان یا تصویر در تب تنظیمات می‌آید).
 * دو شکل از یک فرم: کارت تنظیمات (داخل برگه) — بعدا شکل دیالوگ هم همین‌جا.
 */

export function BizSettingsCard({ biz }: { biz: BusinessSummaryDto }) {
  const { toast } = useToast();
  const edit = useEditBusiness();

  // فرم از مقادیر جاری ساخته می‌شود؛ بعد از ذخیره، کش رفرش و کارت به‌روز می‌شود
  const [name, setName] = useState(biz.name);
  const [city, setCity] = useState(biz.city);
  const [activityType, setActivityType] = useState(biz.activityType ?? "");

  const save = async () => {
    if (name.trim().length < 2) {
      toast({ title: "نام کسب‌وکار را بنویسید", variant: "destructive" });
      return;
    }
    try {
      await edit.mutateAsync({
        id: biz.id,
        name: name.trim(),
        city,
        activityType: activityType === "" ? null : activityType,
      });
      toast({ title: "ذخیره شد", description: "هدر صفحه‌ی شما به‌روز شد." });
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 border-b pb-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xl font-black text-primary">
          {biz.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-base font-black">
            <span className="truncate">{biz.name}</span>
            {biz.isVerified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="تاییدشده" />}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {biz.activityType && (
              <Badge variant="outline" className="border-primary/25 bg-accent text-primary">
                <Briefcase className="size-3" />
                {activityTypeLabel(biz.activityType)}
              </Badge>
            )}
            <span className="flex items-center gap-0.5">
              <MapPin className="size-3" />
              {biz.city}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">نام کسب‌وکار</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">شهر</Label>
          {/* لیست کامل ایران — سرچ‌دار؛ مقدار ذخیره‌شده‌ی خارج از لیست هم دست‌نخورده نشان داده می‌شود */}
          <SearchSelect
            items={
              city && !iranCityItems.some((i) => i.value === city)
                ? [...iranCityItems, { value: city, label: city }]
                : iranCityItems
            }
            value={city}
            onChange={setCity}
            placeholder="شهر را انتخاب کنید"
            searchPlaceholder="جست‌وجوی شهر…"
            emptyText="پیدا نشد"
            ariaLabel="شهر"
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">نوع فعالیت</Label>
          <Select
            value={activityType === "" ? "NONE" : activityType}
            onValueChange={(v) => setActivityType(v === "NONE" ? "" : v)}
          >
            <SelectTrigger aria-label="نوع فعالیت">
              <SelectValue placeholder="انتخاب کنید…" />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((a) => (
                <SelectItem key={a.key} value={a.key}>
                  {a.fa}
                </SelectItem>
              ))}
              {activityType && <SelectItem value="NONE">حذف انتخاب</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button className="mt-5" onClick={() => void save()} disabled={edit.isPending}>
        {edit.isPending && <Loader2 className="size-4 animate-spin" />}
        ذخیره
      </Button>
    </section>
  );
}
