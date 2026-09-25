"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditBusiness, useBusinessLogo, useUploadFile, useRemoveFile } from "@/lib/queries";
import { iranCityItems, provinceOfCity } from "@/lib/iran-geo";
import { ApiError, type BusinessSummaryDto } from "@/lib/api";
import { FileUploader } from "@/components/FileUploader";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Loader2, MapPin, PencilLine, Plus, Store } from "lucide-react";

/**
 * مدال «عنوان / صنف / لوگو» — برای کاربرانی که ثبت‌نام سریع کرده‌اند و کسب‌وکارشان
 * هنوز نام «کاتالوگ شما» دارد. در هدر `/sell` به‌جای نام، «عنوان کاتالوگ را
 * وارد کنید» نشان داده می‌شود و با کلیک، این مدال باز می‌شود.
 *
 * variant="buy" → متن «عنوان دستیار خرید را وارد کنید» نشان می‌دهد (صفحه /buy).
 * variant="sell" (پیش‌فرض) → متن «عنوان کاتالوگ را وارد کنید».
 */
export function CatalogHeaderPrompt({ biz, variant = "sell" }: { biz: BusinessSummaryDto; variant?: "sell" | "buy" }) {
  const [open, setOpen] = useState(false);

  const placeholderText = variant === "buy" ? "عنوان دستیار خرید را وارد کنید" : "عنوان کاتالوگ را وارد کنید";

  // اگر نام کسب‌وکار از «کاتالوگ شما» عوض شده، دیگر این دکمه نشان داده نمی‌شود
  const isPlaceholder = biz.name === "کاتالوگ شما" || !biz.trade || !biz.city || biz.city === "—";

  if (!isPlaceholder) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex items-center gap-1.5 text-2xl font-black text-muted-foreground transition hover:text-primary"
          aria-label={placeholderText}
        >
          <span className="border-b-2 border-dashed border-muted-foreground/40 pb-1">
            {placeholderText}
          </span>
          <PencilLine className="size-4 transition group-hover:text-primary" />
        </button>
      </DialogTrigger>
      <CatalogHeaderForm biz={biz} onDone={() => setOpen(false)} />
    </Dialog>
  );
}

function CatalogHeaderForm({ biz, onDone }: { biz: BusinessSummaryDto; onDone: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const edit = useEditBusiness();
  const logoQ = useBusinessLogo(biz.id);
  const uploadFile = useUploadFile();
  const removeFile = useRemoveFile();
  const [logoPct, setLogoPct] = useState<number | null>(null);
  const [logoPhase, setLogoPhase] = useState<"sending" | "processing">("sending");
  const logo = logoQ.data;

  const [name, setName] = useState(biz.name === "کاتالوگ شما" ? "" : biz.name);
  const [trade, setTrade] = useState(biz.trade ?? "");
  const [city, setCity] = useState(biz.city === "—" ? "" : biz.city);

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
        onSuccess: () => toast({ title: "لوگو آپلود شد" }),
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

  const save = async () => {
    if (name.trim().length < 2) {
      toast({ title: "عنوان کاتالوگ را بنویسید", variant: "destructive" });
      return;
    }
    if (trade.trim().length < 2) {
      toast({ title: "صنف کسب‌وکار را بنویسید", variant: "destructive" });
      return;
    }
    if (!city || city === "—" || city.trim().length < 2) {
      toast({ title: "شهر را انتخاب کنید", variant: "destructive" });
      return;
    }
    try {
      await edit.mutateAsync({
        id: biz.id,
        name: name.trim(),
        city,
        trade: trade.trim(),
      });
      toast({ title: "ذخیره شد", description: "هدر کاتالوگ به‌روز شد." });
      onDone();
      router.refresh();
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  };

  return (
    <DialogContent className="max-w-md gap-4 p-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <Store className="size-4 text-primary" />
          تنظیمات کاتالوگ
        </DialogTitle>
      </DialogHeader>

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
        <p className="text-[11px] leading-5 text-muted-foreground">
          در کاتالوگ و لیست خرید نمایش داده می‌شود.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">عنوان کاتالوگ *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً سوپرمارکت آریا"
            autoFocus
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">صنف کسب‌وکار *</Label>
          <div className="flex flex-wrap gap-1.5">
            {["سوپرمارکت", "قنادی", "پخش مواد غذایی", "پوشاک", "ابزار و یراق", "سایر"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  if (t === "سایر") {
                    setTrade("");
                  } else {
                    setTrade(t);
                  }
                }}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                  trade === t || (t === "سایر" && trade !== "" && !["سوپرمارکت","قنادی","پخش مواد غذایی","پوشاک","ابزار و یراق"].includes(trade))
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {(trade === "" || !["سوپرمارکت","قنادی","پخش مواد غذایی","پوشاک","ابزار و یراق"].includes(trade)) && (
            <Input
              className="mt-2"
              value={trade}
              maxLength={60}
              onChange={(e) => setTrade(e.target.value)}
              placeholder="صنف خود را بنویس…"
              autoFocus
            />
          )}
        </div>

        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">شهر *</Label>
          <SearchSelect
            items={
              city && !iranCityItems.some((i) => i.value === city)
                ? [...iranCityItems, { value: city, label: city }]
                : iranCityItems
            }
            value={city}
            onChange={setCity}
            placeholder="انتخاب شهر"
            searchPlaceholder="جست‌وجوی شهر…"
            emptyText="پیدا نشد"
            ariaLabel="شهر"
          />
        </div>
      </div>

      <Button onClick={() => void save()} disabled={edit.isPending}>
        {edit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        ذخیره
      </Button>
    </DialogContent>
  );
}

/**
 * مدال «انتخاب شهر + لوکیشن» — کنار شهر در هدر، با آیکون MapPin و نوشته
 * «انتخاب شهر». وقتی باز می‌شود، کاربر شهرش را انتخاب می‌کند و لوکیشن
 * اختیاری هم می‌تواند بگذارد. اگر لوکیشن را عوض کند، شهر هم باید به‌روز شود.
 */
export function CityLocationPrompt({ biz }: { biz: BusinessSummaryDto }) {
  const { toast } = useToast();
  const router = useRouter();
  const edit = useEditBusiness();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(biz.city === "—" ? "" : biz.city);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(
    biz.lat != null && biz.lng != null ? { lat: biz.lat, lng: biz.lng } : null
  );
  const [address, setAddress] = useState(biz.address ?? "");

  const save = async () => {
    if (!city || city === "—" || city.trim().length < 2) {
      toast({ title: "شهر را انتخاب کنید", variant: "destructive" });
      return;
    }
    try {
      await edit.mutateAsync({
        id: biz.id,
        city,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        address: address.trim() || null,
      });
      toast({ title: "شهر ذخیره شد" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-primary"
        >
          <MapPin className="size-3.5" />
          {biz.city && biz.city !== "—" ? biz.city : "انتخاب شهر"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-3 p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-primary" />
            انتخاب شهر و لوکیشن
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-[11px] text-muted-foreground">شهر *</Label>
            <SearchSelect
              items={
                city && !iranCityItems.some((i) => i.value === city)
                  ? [...iranCityItems, { value: city, label: city }]
                  : iranCityItems
              }
              value={city}
              onChange={(c) => {
                setCity(c);
                // اگر لوکیشن قبلی داره و شهر عوض می‌شه، لوکیشن قدیمی رو پاک کن
                if (loc && biz.city !== c) setLoc(null);
              }}
              placeholder="انتخاب شهر"
              searchPlaceholder="جست‌وجوی شهر…"
              emptyText="پیدا نشد"
              ariaLabel="شهر"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[11px] text-muted-foreground">آدرس</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="آدرس را بنویسید"
              maxLength={300}
            />
          </div>

          <p className="text-[11px] leading-5 text-muted-foreground">
            لوکیشن دقیق اختیاری است؛ بعداً از تنظیمات کسب‌وکار می‌توانی آن را هم اضافه کنی.
          </p>
        </div>

        <Button onClick={() => void save()} disabled={edit.isPending}>
          {edit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          ذخیره
        </Button>
      </DialogContent>
    </Dialog>
  );
}
