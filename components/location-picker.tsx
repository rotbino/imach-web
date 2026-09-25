"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMessages } from "@/i18n/messages/use-messages";
import type { GeoPoint } from "@/components/location/map-view";

export type { GeoPoint };

const MapView = dynamic(() => import("@/components/location/map-view"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse bg-muted" />,
});

const DEFAULT_CENTER: GeoPoint = { lat: 35.6892, lng: 51.389 };

/**
 * نرمالایز آدرسِ برگشتی از OSM — معمولاً طولانی و تکراری است؛ این تابع آن را
 * تمیز می‌کند:
 *   • اگر `address` object آمده، از ترتیب معنادار (نام خاص، خیابان، محله، شهر،
 *     استان) استفاده می‌کند، نه display_name خام.
 *   • کد پستی و کشور حذف می‌شوند (اطلاعات اضافی برای کاربر ایرانی).
 *   • تکرارها (مثلا «Tehran, تهران») حذف می‌شوند.
 *   • خروجی به ۴-۵ مؤلفه محدود می‌شود تا طولانی نشود.
 */
function normalizeAddress(
  display: string,
  addr?: Record<string, string>
): string {
  if (!addr) {
    // fallback: فقط اولین ۴ بخش از display_name را نگه دار
    const parts = display.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.slice(0, 4).join("، ");
  }

  // ترتیب معنادار برای آدرس فارسی
  // name / building → road / pedestrian → neighbourhood / suburb → city / town / village → county / state / province
  const keys = [
    "name",
    "building",
    "house_number",
    "road",
    "pedestrian",
    "neighbourhood",
    "suburb",
    "quarter",
    "city_district",
    "city",
    "town",
    "village",
    "county",
    "state_district",
    "state",
    "province",
  ];
  // کلیدهایی که اضافی‌اند و نباید در آدرس نهایی باشند
  const dropKeys = new Set([
    "postcode",
    "country",
    "country_code",
    "ISO3166-2-lvl4",
    "ISO3166-2-lvl6",
    "ISO3166-2-lvl5",
    "ISO3166-2-lvl3",
    "ISO3166-2-lvl8",
  ]);

  const parts: string[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    const v = addr[k];
    if (!v) continue;
    const normalized = v.trim();
    if (!normalized) continue;
    // حذف تکرار (مثلا «Tehran» و «تهران» ممکن است هر دو بیایند)
    const lower = normalized.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    parts.push(normalized);
  }

  // اضافه‌کردن باقی فیلدهای معنادار که در ترتیب بالا نیستند (به جز dropKeys)
  for (const [k, v] of Object.entries(addr)) {
    if (dropKeys.has(k) || keys.includes(k)) continue;
    const normalized = v.trim();
    if (!normalized) continue;
    const lower = normalized.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    parts.push(normalized);
  }

  // محدود به ۵ مؤلفه — آدرس‌های ایرانی معمولاً همین اندازه کافی است
  return parts.slice(0, 5).join("، ");
}

export function LocationPicker({
                                 value,
                                 onChange,
                                 onPickAddress,
                                 className,
                               }: {
  value: GeoPoint | null;
  onChange: (p: GeoPoint | null) => void;
  /** بعد از «تایید»، آدرسِ متنیِ نقطه‌ی انتخابی (معکوس‌یابی OSM) به بیرون
   *  داده می‌شود تا مثلا در تکست‌باکسِ آدرس پیش‌پر شود؛ ناموفق = سکوت. */
  onPickAddress?: (address: string) => void;
  className?: string;
}) {
  const m = useMessages();
  const [open, setOpen] = useState(false);
  const [center, setCenter] = useState<GeoPoint>(DEFAULT_CENTER);
  const [draft, setDraft] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);

  /**
   * معکوس‌یابی نقطه → متن آدرس (Nominatim/OSM — همان منبع کاشی‌های نقشه؛
   * بدون کلید، با accept-language=fa). fire-and-forget بعد از بستن دیالوگ:
   * تکست‌باکسِ آدرس وقتی جواب رسید پر می‌شود؛ خطا ساکت رد می‌شود.
   *
   * خروجی OSM معمولاً طولانی و تکراری است (مثلا «name, building, street,
   * neighborhood, suburb, city, county, state, postcode, country»)؛ این
   * تابع آن را نرمالایز می‌کند: حذف تکرارها، حذف کد پستی، حذف کشور، محدود
   * به ۴-۵ مؤلفه اصلی (محله، خیابان، شهر، استان).
   */
  const reverseGeocode = async (p: GeoPoint) => {
    if (!onPickAddress) return;
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
        `&lat=${p.lat}&lon=${p.lng}&zoom=18&accept-language=fa`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.ok) {
        const j = (await r.json()) as { display_name?: string; address?: Record<string, string> };
        const text = normalizeAddress(j.display_name ?? "", j.address);
        if (text) onPickAddress(text);
      }
    } catch {
      /* آدرس پیش‌فرض بی‌اهمیت است — کاربر خودش می‌نویسد */
    }
  };

  const handleOpen = (next: boolean) => {
    if (next) {
      setDraft(value);
      setCenter(value ?? DEFAULT_CENTER);
      if (!value && typeof navigator !== "undefined" && navigator.geolocation) {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
              const p: GeoPoint = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
              setCenter(p);
              setDraft(p);
              setLocating(false);
            },
            () => setLocating(false),
            { timeout: 8000, maximumAge: 600000 },
        );
      }
    }
    setOpen(next);
  };

  return (
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <button
              type="button"
              className={cn(
                  // ظاهر دکمه‌ای واضح: بوردر، پس‌زمینه، پدینگ، هاور
                  "inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-colors",
                  // حالت خالی: پررنگ‌تر، دعوت‌کننده
                  !value &&
                  "border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10",
                  // حالت پرشده: خنثی، با آیکون ویرایش
                  value &&
                  "border-border bg-muted/40 text-foreground hover:bg-muted",
                  className
              )}
          >
            {value ? (
                <>
                  <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">{m.location.triggerSet}</span>
                  <Pencil className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                </>
            ) : (
                <>
                  <Plus className="size-3.5 shrink-0" aria-hidden />
                  <span>{m.location.triggerEmpty}</span>
                </>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md gap-3 p-4">
          <DialogHeader>
            <DialogTitle className="text-sm">{m.location.title}</DialogTitle>
          </DialogHeader>
          <div className="relative overflow-hidden rounded-xl border">
            <MapView
                center={center}
                position={draft}
                onPick={setDraft}
                onDrag={setDraft}
            />
            {locating && (
                <div className="absolute inset-0 z-[500] grid place-items-center bg-white/70">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    {m.location.locating}
                  </div>
                </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{m.location.hint}</p>
          <div className="flex items-center gap-2">
            <Button
                size="sm"
                className="flex-1"
                disabled={!draft}
                onClick={() => {
                  onChange(draft);
                  if (draft) void reverseGeocode(draft);
                  setOpen(false);
                }}
            >
              {m.location.confirm}
            </Button>
            {value && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDraft(null);
                      onChange(null);
                      setOpen(false);
                    }}
                >
                  {m.location.clear}
                </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
  );
}