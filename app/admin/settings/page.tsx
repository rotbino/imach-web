"use client";

/*
 * فاز ۸ مهاجرت — پنل ادمین · تنظیمات سیستمی:
 *   · سوییچ «پرداخت درگاه» (روشن/خاموش) — پرداخت فقط ایران؛ خاموش = مسیر دعوت
 *   · ویرایش نرخ‌های ارز (baseMinorPerMajor · IRR ≡ ۱۰ لنگر)
 * طراحی legacy (Tailwind/shadcn) — پنل داخلی است؛ زبان فارسی.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminSettingsApi, useAdminSettings, type AdminSettingsDto } from "../api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Wallet, Globe } from "lucide-react";

type Rates = Record<string, number>;

export default function AdminSettingsPage() {
  const q = useAdminSettings();
  const qc = useQueryClient();
  const { toast } = useToast();

  // الگوی «تنظیم حین رندر» (همان شیت‌های فاز ۵) — sync دادهٔ سرور با state
  // بدون effect: بازگشت از سرور state محلی را sync می‌کند
  const [payments, setPayments] = useState(true);
  const [rates, setRates] = useState<Rates>({});
  const [savingPayments, setSavingPayments] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [dirtyRates, setDirtyRates] = useState(false);
  const [syncedData, setSyncedData] = useState<AdminSettingsDto | null>(null);
  if (q.data && q.data !== syncedData) {
    setSyncedData(q.data);
    setPayments(q.data.settings["payments.enabled"] === true);
    setRates({ ...(q.data.settings["currency.rates"] as Rates) });
    setDirtyRates(false);
  }

  if (q.isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const savePayments = async (next: boolean) => {
    setPayments(next);
    setSavingPayments(true);
    try {
      await adminSettingsApi.write("payments.enabled", next);
      await qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: next ? "پرداخت درگاه روشن شد" : "پرداخت درگاه خاموش شد — مسیر دعوت فعال است" });
    } catch {
      setPayments(!next);
      toast({ title: "ذخیره نشد — دوباره تلاش کن", variant: "destructive" });
    } finally {
      setSavingPayments(false);
    }
  };

  const saveRates = async () => {
    setSavingRates(true);
    try {
      await adminSettingsApi.write("currency.rates", rates);
      setDirtyRates(false);
      await qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "نرخ‌ها ذخیره شد — پیکربندی عمومی چند ثانیه بعد تازه می‌شود" });
    } catch {
      toast({ title: "ذخیرهٔ نرخ‌ها نشد", variant: "destructive" });
    } finally {
      setSavingRates(false);
    }
  };

  const rateRows = Object.entries(rates).sort(([a], [b]) => (a === "IRR" ? -1 : b === "IRR" ? 1 : a.localeCompare(b)));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── پرداخت درگاه ── */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="size-5 text-primary" />
          <h2 className="text-base font-extrabold">پرداخت درگاه (شارژ کیف پول)</h2>
        </div>
        <p className="mb-4 text-xs leading-6 text-muted-foreground">
          پرداخت فقط برای ایران فعال است. با خاموش کردن، صفحهٔ شارژ به «دعوت از همکاران»
          (اعتبار رایگان) تغییر می‌کند و اندپوینت شارژ بسته می‌شود. حسابداری کیف پول و
          کمپین‌ها همیشه در ارز مرجع (ریال/تومان) می‌ماند.
        </p>
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <div className="text-sm font-bold">{payments ? "روشن" : "خاموش"}</div>
            <div className="text-xs text-muted-foreground">
              {payments ? "درگاه زرین‌پال (شبیه‌سازی) فعال است" : "کاربران فقط با دعوت/فعالیت اعتبار می‌گیرند"}
            </div>
          </div>
          <Switch checked={payments} disabled={savingPayments} onCheckedChange={(v) => void savePayments(v)} />
        </div>
      </section>

      {/* ── نرخ‌های ارز ── */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="size-5 text-primary" />
          <h2 className="text-base font-extrabold">نرخ‌های ارز نمایش</h2>
        </div>
        <p className="mb-4 text-xs leading-6 text-muted-foreground">
          نرخ = چند minor ارز مرجع برابر ۱ واحد اصلیِ آن ارز (IRR ≡ ۱۰ — لنگر، قابل
          تغییر نیست). این نرخ‌ها فقط «نمایش/مقایسه»اند؛ معامله در ارز فروشنده بسته
          می‌شود. مقادیر seed تقریبی‌اند — هر وقت خواستی به‌روز کن.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {rateRows.map(([code, v]) => (
            <div key={code} className="space-y-1">
              <Label htmlFor={`rate-${code}`} className="text-xs">
                {code === "IRR" ? "IRR (لنگر — ۱ تومان)" : code}
              </Label>
              <Input
                id={`rate-${code}`}
                inputMode="numeric"
                disabled={code === "IRR" || savingRates}
                value={String(v)}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^\d.]/g, ""));
                  if (Number.isFinite(n) && n >= 0) {
                    setRates((r) => ({ ...r, [code]: n }));
                    setDirtyRates(true);
                  }
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={!dirtyRates || savingRates} onClick={() => void saveRates()}>
            {savingRates ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            ذخیرهٔ نرخ‌ها
          </Button>
        </div>
      </section>
    </div>
  );
}
