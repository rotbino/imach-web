"use client";

import { useState } from "react";
import { useEditBusiness, useBusinessLogo, useRemoveFile, useUploadFile } from "@/lib/queries";
import { ACTIVITY_TYPES, activityTypeLabel } from "@/lib/format";
import { iranCityItems } from "@/lib/iran-geo";
import { ApiError, type BusinessSummaryDto } from "@/lib/api";
import { BadgeCheck, Briefcase, Loader2, MapPin } from "lucide-react";
import { FileUploader } from "@/components/FileUploader";
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
import { LocationPicker, type GeoPoint } from "@/components/location-picker";

/*
 * ویرایش هدر صفحه — لوگو، نام، شهر، نوع فعالیت، لوکیشن دقیق.
 * محل اصلی: برگه‌ی «تنظیمات» داشبورد هر بازو (خواسته‌ی کاربر:
 * ویرایش هدر مثل عنوان یا تصویر در تب تنظیمات می‌آید).
 * لوگو بلافاصله آپلود می‌شود (مدل Business از قبل هست) و در هر دو بازوی
 * فروش و خرید همان لحظه نمایش داده می‌شود.
 *
 * لوکیشن دقیق به خودِ Business تعلق دارد (نه به کاربر، نه به هر لیستینگ):
 * اختیاری و با رضایت صاحب کاتالوگ؛ مبنای لایه‌ی فاصله‌ی تطابق آینده است
 * («خریدارِ دقیق‌تر و به‌صرفه‌تر») — مثلا بازاریابی که فقط در یک منطقه
 * کار می‌کند. پینِ دقیق علنی نمی‌شود؛ کاتالوگ عمومی فقط شهر را نشان می‌دهد.
 */

export function BizSettingsCard({ biz }: { biz: BusinessSummaryDto }) {
  const { toast } = useToast();
  const edit = useEditBusiness();
  const logoQ = useBusinessLogo(biz.id);
  const uploadFile = useUploadFile();
  const removeFile = useRemoveFile();
  // درصد/فاز زنده‌ی آپلود لوگو — برای حلقه‌ی پیشرفت برند (UploadRing)
  const [logoPct, setLogoPct] = useState<number | null>(null);
  const [logoPhase, setLogoPhase] = useState<"sending" | "processing">("sending");

  const logo = logoQ.data;

  const uploadLogo = (file: File) => {
    setLogoPct(0);
    setLogoPhase("sending");
    uploadFile.mutate(
      {
        file,
        model: "Business",
        modelId: biz.id,
        key: "logo",
        onProgress: (pct, phase) => {
          setLogoPct(pct);
          setLogoPhase(phase);
        },
      },
      {
        onSuccess: () => toast({ title: "لوگو آپلود شد", description: "در کاتالوگ و لیست خرید شما نمایش داده می‌شود." }),
        onError: (e) => toast({ title: "آپلود لوگو ناموفق بود", description: e.message, variant: "destructive" }),
        onSettled: () => setLogoPct(null),
      }
    );
  };

  const removeLogo = () => {
    if (!logo) return;
    removeFile.mutate(logo.id, {
      onSuccess: () => toast({ title: "لوگو حذف شد" }),
      onError: (e) => toast({ title: "حذف ناموفق بود", description: e.message, variant: "destructive" }),
    });
  };

  // فرم از مقادیر جاری ساخته می‌شود؛ بعد از ذخیره، کش رفرش و کارت به‌روز می‌شود
  const [name, setName] = useState(biz.name);
  const [city, setCity] = useState(biz.city);
  const [activityType, setActivityType] = useState(biz.activityType ?? "");
  // صنف — کلید «کپی از هم‌صنف‌ها»؛ هر وقت بخواهد از همین‌جا اصلاح می‌شود
  const [trade, setTrade] = useState(biz.trade ?? "");
  const [loc, setLoc] = useState<GeoPoint | null>(
    biz.lat != null && biz.lng != null ? { lat: biz.lat, lng: biz.lng } : null
  );
  // آدرس متنی — وقتی پین تایید شد از معکوس‌یابی پیش‌پر می‌شود و کاربر
  // هر وقت بخواهد ویرایشش می‌کند؛ با ذخیره، همراه پین به بک‌اند می‌رود.
  const [address, setAddress] = useState(biz.address ?? "");

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
        // صنف — خالی = پاک کردن (کپی از هم‌صنف‌ها بی‌صنف صنفِ بد نمی‌یابد)
        trade: trade.trim() || null,
        // null صریح = پاک کردن لوکیشن؛ مقدار = ثبت/به‌روزرسانی
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        // آدرس متنی — همراه لوکیشن ذخیره می‌شود؛ خالی = پاک کردن
        address: address.trim() || null,
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
        <FileUploader
          shape="square"
          size={56}
          value={logo ? { url: logo.url, thumbUrl: logo.thumbUrl } : null}
          uploading={uploadFile.isPending}
          progress={logoPct}
          phase={logoPhase}
          label="لوگو"
          onSelect={uploadLogo}
          onRemove={logo ? removeLogo : undefined}
        />
        <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xl font-black text-primary" aria-hidden>
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
          <Label className="text-[11px] text-muted-foreground">لوکیشن کسب و کار</Label>
          <div className={""}>
            <LocationPicker
              value={loc}
              onChange={setLoc}
              // پین تایید شد → آدرسِ معکوس‌یابی‌شده در تکست‌باکس می‌ریزد
              onPickAddress={(a) => setAddress(a)}
            />
          </div>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="آدرس — بعد از انتخاب لوکیشن خودکار پر می‌شود؛ دستی هم می‌توانید بنویسید یا ویرایش کنید"
            aria-label="آدرس کسب و کار"
            maxLength={300}
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
             لوکیشن به مشتریان و تامین کنندگان کمک می کند راحتر شما را پیدا کنند. همچنین هوش مصنوعی آی مچ، مشتریان یا تامین کنندگان دقیقتری را به شما پیشنهاد می دهد
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">صنف کسب‌وکار</Label>
          <Input
            value={trade}
            maxLength={60}
            placeholder="مثلا سوپرمارکت، قنادی، پخش مواد غذایی"
            onChange={(e) => setTrade(e.target.value)}
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
            با صنف، کاتالوگ‌های هم‌صنف برای کپی کردن کالا به شما نشان داده می‌شود.
          </p>
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
