"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { MyItemsSection, ShareCard } from "@/app/components/sections";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditBusiness, useMyBusinesses } from "@/lib/queries";
import { ACTIVITY_TYPES, CITIES, activityTypeLabel } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck, Briefcase, Loader2, MapPin, PencilLine } from "lucide-react";

/*
 * کاتالوگ فروش من — صفحه‌ی بازوی فروش (خواسته‌ی کاربر):
 * مدیریت و نمایش یکی‌اند؛ دقیقا مثل اینستاگرام که کاربر همان صفحه‌ی خودش را
 * ویرایش می‌کند — همان‌چیزی که می‌بینی ویرایش می‌کنی:
 * • نوع فعالیت و مشخصات → مدادِ کنارش
 * • اشتراک‌گذاری لینک → همین‌جا
 * • کالای جدید → دکمه‌ی کالای جدید؛ حذف → آیکون حذف کنار کالا
 */

export default function SellPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "کاتالوگ فروش من | iMach";
    setArmActive("sell");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <SellBody />;
}

function SellBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-lg font-extrabold">اول کسب‌وکارتان را بسازید</p>
            <p className="mt-2 text-sm text-muted-foreground">فقط نام و شهر — بقیه‌اش با ما.</p>
            <button
              onClick={() => (window.location.href = "/start")}
              className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm"
            >
              ساخت کسب‌وکار
            </button>
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
          <BizIdentityCard
            bizId={active.id}
            name={active.name}
            city={active.city}
            activityType={active.activityType}
            isVerified={active.isVerified}
          />
          <ShareCard
            kind="sell"
            slug={active.slug}
            bizName={active.name}
            onView={() => window.location.assign(`/sell/${active.slug}`)}
          />
          <MyItemsSection bizId={active.id} side="sell" />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

// ─── هویت کسب‌وکار — همان‌جا که می‌بینی ویرایش کن (مداد) ───

function BizIdentityCard({
  bizId,
  name,
  city,
  activityType,
  isVerified,
}: {
  bizId: string;
  name: string;
  city: string;
  activityType: string | null;
  isVerified: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-2xl font-black text-primary">
          {name.slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <h1 className="flex items-center gap-1.5 text-lg font-black">
            <span className="truncate">{name}</span>
            {isVerified && <BadgeCheck className="size-4.5 shrink-0 text-primary" aria-label="تاییدشده" />}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-primary/25 bg-accent text-primary">
              <Briefcase className="size-3" />
              {activityType ? activityTypeLabel(activityType) : "نوع فعالیت"}
            </Badge>
            <span className="flex items-center gap-0.5">
              <MapPin className="size-3" />
              {city}
            </span>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setOpen(true)}
          aria-label="ویرایش کسب‌وکار"
          className="shrink-0 text-muted-foreground hover:text-primary"
        >
          <PencilLine className="size-4.5" />
        </Button>
      </div>

      <EditBizDialog
        bizId={bizId}
        open={open}
        onOpenChange={setOpen}
        initial={{ name, city, activityType }}
      />
    </section>
  );
}

function EditBizDialog({
  bizId,
  open,
  onOpenChange,
  initial,
}: {
  bizId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: { name: string; city: string; activityType: string | null };
}) {
  const { toast } = useToast();
  const edit = useEditBusiness();
  const [name, setName] = useState(initial.name);
  const [city, setCity] = useState(initial.city);
  const [activityType, setActivityType] = useState(initial.activityType ?? "");

  // هر بار باز شدن، از مقادیر جاری پر شود
  useEffect(() => {
    if (open) {
      setName(initial.name);
      setCity(initial.city);
      setActivityType(initial.activityType ?? "");
    }
  }, [open, initial]);

  const save = async () => {
    if (name.trim().length < 2) {
      toast({ title: "نام کسب‌وکار را بنویسید", variant: "destructive" });
      return;
    }
    try {
      await edit.mutateAsync({
        id: bizId,
        name: name.trim(),
        city,
        activityType: activityType === "" ? null : activityType,
      });
      toast({ title: "ذخیره شد" });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>ویرایش کسب‌وکار</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-[11px] text-muted-foreground">نام کسب‌وکار</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[11px] text-muted-foreground">شهر</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger aria-label="شهر">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={() => void save()} disabled={edit.isPending}>
            {edit.isPending && <Loader2 className="size-4 animate-spin" />}
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
