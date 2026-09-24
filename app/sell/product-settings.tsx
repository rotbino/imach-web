"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ApiError, type GoodItemDto } from "@/lib/api";
import { CURRENCIES, currencyLabel, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { compressImage } from "@/lib/compress";
import { useLocale } from "@/i18n/locale-context";
import { useDeleteListing, useGoods, useRemoveFile, useSaveListing, useUploadFile } from "@/lib/queries";
import type { FileDto } from "@/lib/api";
import { NumberInput } from "@/components/number-input";
import { UploadRing } from "@/components/upload-ring";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Loader2, Package, Save, Settings2, Trash2, X } from "lucide-react";

/*
 * فرم تنظیمات کالا — با چرخ‌دنده‌ی روی هر کالای کاتالوگ باز می‌شود (خواسته‌ی کاربر):
 * ویرایش کامل مشخصات فروش + ویژگی‌های پیشرفته (برند و اتریبیوت‌های دسته) +
 * مشخصات خرید برای کالاهای دو‌حالته + حذف کالا در همین فرم.
 * ذخیره = همان PUT upsert بک‌اند؛ کالای BOTH باید هر دو مشخصه را دوباره بفرستد.
 */

type Frequency = "WEEKLY" | "MONTHLY" | "OCCASIONAL";

export function ProductSettingsDialog({
  listing,
  bizId,
  currency,
  open,
  onOpenChange,
}: {
  listing: GoodItemDto;
  bizId: string;
  currency: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const { locale } = useLocale();
  const saveListing = useSaveListing();
  const deleteListing = useDeleteListing();

  const exp = (CURRENCIES[currency] ?? CURRENCIES.IRR).exp;
  const curName = currencyLabel(currency, locale);
  const isBoth = listing.mode !== "SELL";
  const unit = unitLabel(listing.good.unit, locale);

  const [price, setPrice] = useState<number | null>(() =>
    listing.priceMinor !== null ? listing.priceMinor / 10 ** exp : null
  );
  const [stock, setStock] = useState<number | null>(() => listing.stock ?? null);
  const [minOrder, setMinOrder] = useState<number | null>(() => listing.minOrder ?? null);
  const [brandName, setBrandName] = useState(listing.brand?.name ?? "");
  const [attrs, setAttrs] = useState<Record<string, string>>(listing.attrs ?? {});
  const [volume, setVolume] = useState<number | null>(() => listing.volume ?? null);
  const [frequency, setFrequency] = useState<Frequency>((listing.frequency as Frequency) ?? "MONTHLY");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // گالری — آگهی از قبل وجود دارد؛ آپلود/حذف همان لحظه انجام می‌شود.
  // عوض کردن عکس = آپلود جدید + حذف قبلی سمت سرور (فایل سرگردان نمی‌ماند).
  const uploadFile = useUploadFile();
  const removeFile = useRemoveFile();
  const [gallery, setGallery] = useState<FileDto[]>(listing.gallery ?? []);
  const [galleryBusy, setGalleryBusy] = useState(false);
  // درصد/فاز آپلود عکسِ در جریان — حلقه‌ی برند روی کاشیِ «افزودن» (خواسته‌ی کاربر)
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"sending" | "processing">("sending");

  const addGalleryImage = async (file: File) => {
    if (gallery.length >= 6) {
      toast({ title: "بیشتر از ۶ عکس نمی‌شود", variant: "destructive" });
      return;
    }
    setGalleryBusy(true);
    setUploadPct(0);
    setUploadPhase("sending");
    try {
      const compressed = await compressImage(file);
      const created = await uploadFile.mutateAsync({
        file: compressed, model: "Listing", modelId: listing.id, key: "gallery", replace: false,
        onProgress: (pct, phase) => {
          setUploadPct(pct);
          setUploadPhase(phase);
        },
      });
      setGallery((list) => [...list, created]);
    } catch (err) {
      toast({ title: "آپلود عکس ناموفق بود", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" });
    } finally {
      setGalleryBusy(false);
      setUploadPct(null);
    }
  };

  const removeGalleryImage = async (id: string) => {
    setGalleryBusy(true);
    try {
      await removeFile.mutateAsync(id);
      setGallery((list) => list.filter((f) => f.id !== id));
    } catch {
      toast({ title: "حذف عکس ناموفق بود", variant: "destructive" });
    } finally {
      setGalleryBusy(false);
    }
  };

  // اتریبیوت‌های دسته‌ی کالا — از تعریف کالای مرجع
  const goodsQ = useGoods(open ? { q: listing.good.nameFa, limit: 30 } : {});
  const goodDef = useMemo(
    () => (goodsQ.data?.items ?? []).find((g) => g.id === listing.good.id) ?? null,
    [goodsQ.data, listing.good.id]
  );
  const attrsOf = goodDef?.category.attrs ?? [];

  const save = async () => {
    if ((price ?? 0) <= 0 || (stock ?? 0) <= 0) {
      toast({ title: "قیمت و موجودی را درست بنویسید", variant: "destructive" });
      return;
    }
    const filledAttrs = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v.trim() !== ""));
    try {
      await saveListing.mutateAsync({
        businessId: bizId,
        goodId: listing.good.id,
        mode: listing.mode,
        ...(brandName.trim() ? { brandName: brandName.trim() } : {}),
        ...(Object.keys(filledAttrs).length > 0 ? { attrs: filledAttrs } : {}),
        sell: {
          priceMinor: Math.round((price ?? 0) * 10 ** exp),
          stock: stock ?? 0,
          minOrder: minOrder ?? 0,
        },
        // کالای BOTH: مشخصات خرید باید دوباره ارسال شود وگرنه صفر می‌شود
        ...(isBoth
          ? { buy: { volume: volume ?? listing.volume ?? 1, frequency } }
          : {}),
      });
      toast({ title: "ذخیره شد", description: goodName(listing.good, locale) });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  };

  const remove = async () => {
    try {
      await deleteListing.mutateAsync(listing.id);
      toast({ title: "کالا حذف شد", description: goodName(listing.good, locale) });
      onOpenChange(false);
    } catch {
      toast({ title: "حذف ناموفق بود", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Settings2 className="size-4.5 text-primary" />
            تنظیمات کالا
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto pe-1">
          {/* هویت کالا — کالای مرجع عوض نمی‌شود؛ فقط مشخصات */}
          <div className="flex items-center gap-2.5 rounded-xl border bg-accent/40 px-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary">
              {goodName(listing.good).slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{goodName(listing.good)}</p>
              <p className="text-[11px] text-muted-foreground">
                {listing.good.category.nameFa} · هر {unitLabel(listing.good.unit, locale)}
              </p>
            </div>
          </div>

          {/* مشخصات فروش */}
          <div className="grid gap-3">
            <p className="flex items-center gap-1.5 text-sm font-extrabold">
              <Package className="size-4 text-primary" />
              مشخصات فروش
            </p>
            {/* موبایل: هر فیلد یک ردیف کامل — عددهای بزرگ جا می‌شوند */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={`قیمت هر ${unit}`}>
                <NumberInput value={price} onChange={setPrice} min={0} suffix={curName} aria-label={`قیمت هر ${unit}`} />
              </Field>
              <Field label="موجودی">
                <NumberInput value={stock} onChange={setStock} min={0} suffix={unit} aria-label="موجودی" />
              </Field>
              <Field label={`حداقل سفارش`}>
                <NumberInput value={minOrder} onChange={setMinOrder} min={0} suffix={unit} aria-label="حداقل سفارش" />
              </Field>
            </div>
            <p className="text-[11px] text-muted-foreground">واحد معامله: هر {unit}</p>
          </div>

          {/* برند — اختیاری */}
          <div className="grid gap-1.5">
            <Label className="text-[11px] text-muted-foreground">برند</Label>
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="بدون برند"
            />
          </div>

          {/* ویژگی‌های پیشرفته — اتریبیوت‌های دسته */}
          {attrsOf.length > 0 && (
            <div className="grid gap-3">
              <p className="text-sm font-extrabold">ویژگی‌ها</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {attrsOf.map((a) => (
                  <Field key={a.key} label={locale === "en" ? a.en : a.fa}>
                    {a.type === "enum" && a.options ? (
                      <Select
                        value={attrs[a.key] ?? ""}
                        onValueChange={(v) => setAttrs((s) => ({ ...s, [a.key]: v }))}
                      >
                        <SelectTrigger aria-label={locale === "en" ? a.en : a.fa}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {a.options.map((o) => (
                            <SelectItem key={o.v} value={o.v}>
                              {locale === "en" ? o.en : o.fa}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={attrs[a.key] ?? ""}
                        onChange={(e) => setAttrs((s) => ({ ...s, [a.key]: e.target.value }))}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          )}

          {/* مشخصات خرید کالای دو‌حالته — حفظ سمت خرید */}
          {isBoth && (
            <div className="grid gap-3 rounded-xl border p-3">
              <p className="text-sm font-extrabold">مشخصات خرید</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="حجم خرید در هر دوره">
                  <NumberInput value={volume} onChange={setVolume} min={0} suffix={unit} aria-label="حجم خرید" />
                </Field>
                <Field label="تناوب">
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                    <SelectTrigger aria-label="تناوب">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["WEEKLY", "MONTHLY", "OCCASIONAL"] as Frequency[]).map((f) => (
                        <SelectItem key={f} value={f}>
                          {frequencyLabel(f, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {/* گالری کالا — تصویر در کاتالوگ و هر جای دیگر نمایش داده می‌شود */}
          <div className="rounded-xl border p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold">
              <ImagePlus className="size-3.5 text-primary" />
              تصاویر کالا
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {gallery.map((f) => (
                <div key={f.id} className="relative size-16 overflow-hidden rounded-lg border">
                  {/* unoptimized — عکس آروان از قبل فشرده/تامبنیل؛ next/image نباید
                      سرِ هاست‌کانفیگ next.config کرش کند (خطای stale-build) */}
                  <Image src={f.thumbUrl ?? f.url} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="حذف عکس"
                    disabled={galleryBusy}
                    className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-black/60 text-white transition hover:bg-destructive"
                    onClick={() => void removeGalleryImage(f.id)}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {gallery.length < 6 && (
                <label
                  className={`grid size-16 place-items-center rounded-lg border border-dashed text-muted-foreground transition hover:border-primary/60 hover:bg-accent/40 hover:text-primary ${
                    galleryBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={galleryBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void addGalleryImage(file);
                    }}
                  />
                  {uploadPct !== null ? (
                    /* حلقه‌ی پیشرفت برند — هم‌خانواده‌ی حلقه‌ی فرم ثبت کالا */
                    <UploadRing
                      progress={uploadPct}
                      phase={uploadPhase}
                      size={52}
                      processingLabel={locale === "en" ? "Processing" : "پردازش"}
                    />
                  ) : (
                    <ImagePlus className="size-4" strokeWidth={1.75} />
                  )}
                </label>
              )}
            </div>
          </div>

          <Button onClick={() => void save()} disabled={saveListing.isPending}>
            {saveListing.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            ذخیره
          </Button>

          {/* حذف کالا — در همان فرم تنظیمات (خواسته‌ی کاربر) */}
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            {confirmDelete ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-destructive">از کاتالوگ حذف شود؟</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    انصراف
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void remove()} disabled={deleteListing.isPending}>
                    {deleteListing.isPending && <Loader2 className="size-4 animate-spin" />}
                    حذف قطعی
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
                حذف کالا
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
