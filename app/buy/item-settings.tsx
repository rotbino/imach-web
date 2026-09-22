"use client";

import { useMemo, useState } from "react";
import { ApiError, type GoodItemDto } from "@/lib/api";
import { CURRENCIES, currencyLabel, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { useDeleteListing, useGoods, useSaveListing } from "@/lib/queries";
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
import { Loader2, Save, Settings2, ShoppingBasket, Trash2 } from "lucide-react";

/*
 * فرم تنظیمات آیتم دستیار خرید — با چرخ‌دنده‌ی روی هر آیتم باز می‌شود:
 * ویرایش حجم و تناوب خرید + ویژگی‌های پیشرفته (برند، اتریبیوت‌های دسته) +
 * مشخصات فروش برای کالاهای دو‌حالته + حذف آیتم در همین فرم.
 */

type Frequency = "WEEKLY" | "MONTHLY" | "OCCASIONAL";

export function BuyItemSettingsDialog({
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
  const isBoth = listing.mode !== "BUY";

  const [volume, setVolume] = useState(() => (listing.volume !== null ? String(listing.volume) : ""));
  const [frequency, setFrequency] = useState<Frequency>((listing.frequency as Frequency) ?? "MONTHLY");
  const [brandName, setBrandName] = useState(listing.brand?.name ?? "");
  const [attrs, setAttrs] = useState<Record<string, string>>(listing.attrs ?? {});
  const [price, setPrice] = useState(() =>
    listing.priceMinor !== null ? String(listing.priceMinor / 10 ** exp) : ""
  );
  const [stock, setStock] = useState(() => (listing.stock !== null ? String(listing.stock) : ""));
  const [minOrder, setMinOrder] = useState(() => (listing.minOrder ? String(listing.minOrder) : ""));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // اتریبیوت‌های دسته‌ی کالا — از تعریف کالای مرجع
  const goodsQ = useGoods(open ? { q: listing.good.nameFa, limit: 30 } : {});
  const goodDef = useMemo(
    () => (goodsQ.data?.items ?? []).find((g) => g.id === listing.good.id) ?? null,
    [goodsQ.data, listing.good.id]
  );
  const attrsOf = goodDef?.category.attrs ?? [];

  const save = async () => {
    if (Number(volume) <= 0) {
      toast({ title: "حجم خرید را درست بنویسید", variant: "destructive" });
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
        buy: { volume: Number(volume), frequency },
        // کالای BOTH: مشخصات فروش باید دوباره ارسال شود وگرنه صفر می‌شود
        ...(isBoth
          ? {
              sell: {
                priceMinor: Math.round((Number(price) || listing.priceMinor || 0) * 10 ** exp),
                stock: Number(stock) || listing.stock || 1,
                minOrder: Number(minOrder) || 0,
              },
            }
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
      toast({ title: "آیتم حذف شد", description: goodName(listing.good, locale) });
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
            <Settings2 className="size-4.5 text-stone-700" />
            تنظیمات آیتم خرید
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto pe-1">
          {/* هویت کالا */}
          <div className="flex items-center gap-2.5 rounded-xl border bg-stone-50 px-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-stone-200 text-base font-black text-stone-700">
              {goodName(listing.good).slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{goodName(listing.good)}</p>
              <p className="text-[11px] text-muted-foreground">
                {listing.good.category.nameFa} · هر {unitLabel(listing.good.unit, locale)}
              </p>
            </div>
          </div>

          {/* مشخصات خرید */}
          <div className="grid gap-3">
            <p className="flex items-center gap-1.5 text-sm font-extrabold">
              <ShoppingBasket className="size-4 text-stone-700" />
              نیاز خرید
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`حجم (${unitLabel(listing.good.unit, locale)})`}>
                <Input type="number" min={0} value={volume} onChange={(e) => setVolume(e.target.value)} />
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
              <div className="grid grid-cols-2 gap-3">
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

          {/* مشخصات فروش کالای دو‌حالته — حفظ سمت فروش */}
          {isBoth && (
            <div className="grid gap-3 rounded-xl border border-primary/20 bg-accent/30 p-3">
              <p className="text-sm font-extrabold">مشخصات فروش</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`قیمت هر ${unitLabel(listing.good.unit, locale)} (${curName})`}>
                  <Input
                    type="number"
                    min={0}
                    dir="ltr"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </Field>
                <Field label="موجودی">
                  <Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
                </Field>
                <Field label={`حداقل سفارش (${unitLabel(listing.good.unit, locale)})`}>
                  <Input type="number" min={0} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          <Button onClick={() => void save()} disabled={saveListing.isPending}>
            {saveListing.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            ذخیره
          </Button>

          {/* حذف آیتم — در همان فرم تنظیمات */}
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            {confirmDelete ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-destructive">از لیست خرید حذف شود؟</p>
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
                حذف آیتم
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
