"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
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

/*
 * LocationPicker — انتخاب لوکیشن دقیق روی نقشه؛ کامپوننت کاملا مستقل برای
 * استفاده در هر جا (کاتالوگ، پنل‌ها، …) — عمدا در ثبت‌نام نیست (خواسته‌ی
 * کاربر: کار ثبت‌نام سخت نشود). هیچ چیز را به بک‌اند نمی‌فرستد؛ صاحبِ داده
 * فقط onChange را می‌دهد.
 *
 * رفتار (مثل توصیف کاربر): روی تریگر که بزنی اجازه‌ی لوکیشن مرورگر گرفته
 * می‌شود و نقشه روی موقعیت کاربر باز می‌شود؛ کلیک یا کشیدن پین نقطه را
 * عوض می‌کند؛ «تایید» ذخیره و «حذف» پاک می‌کند.
 */

const MapView = dynamic(() => import("@/components/location/map-view"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse bg-muted" />,
});

const DEFAULT_CENTER: GeoPoint = { lat: 35.6892, lng: 51.389 }; // تهران — شروع نقشه

export function LocationPicker({
  value,
  onChange,
  className,
}: {
  value: GeoPoint | null;
  onChange: (p: GeoPoint | null) => void;
  className?: string;
}) {
  const m = useMessages();
  const [open, setOpen] = useState(false);
  const [center, setCenter] = useState<GeoPoint>(DEFAULT_CENTER);
  const [draft, setDraft] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);

  const handleOpen = (next: boolean) => {
    if (next) {
      setDraft(value);
      setCenter(value ?? DEFAULT_CENTER);
      // رضایت کاربر: اجازه‌ی لوکیشن مرورگر؛ رد شود، نقشه‌ی دستی می‌ماند
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
            "inline-flex items-center gap-1.5 text-xs transition-colors",
            value ? "text-foreground" : "text-muted-foreground",
            className
          )}
        >
          <MapPin className="size-3.5 text-primary" aria-hidden />
          <span>{value ? m.location.triggerSet : m.location.triggerEmpty}</span>
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
