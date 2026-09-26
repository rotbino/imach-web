"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useEditProfile } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, ShoppingBasket, Store } from "lucide-react";

/**
 * فرم خوش‌آمد — اولین چیزی که کاربر تازه ثبت‌نام‌شده می‌بیند.
 * فقط سه فیلد: نام، نام خانوادگی، نوع فعالیت (خرید/فروش/هر دو).
 * نام روی User ذخیره می‌شود. نوع فعالیت تعیین می‌کند کاربر به کدام بازو برود:
 *   فقط خرید → /buy (دستیار خرید)
 *   فقط فروش یا هر دو → /sell (کاتالوگ)
 *
 * این مدال خودکار باز می‌شود وقتی کاربر firstName ندارد (یعنی تازه ثبت‌نام سریع
 * کرده). بعد از پر کردن، دیگر نشان داده نمی‌شود.
 */
export function WelcomeModal({ forced = false }: { forced?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const editProfile = useEditProfile();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [intent, setIntent] = useState<"sell" | "buy" | "both" | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = useRef(false);

  // ── کلید localStorage مبتنی بر userId — وقتی کاربر مرحله‌ی خوش‌آمد را
  // پشت سر گذاشت (یا آن را بست)، دیگر در رفرش‌های بعدی نشان داده نمی‌شود.
  // این تنها سیگنال پایدار است که می‌گوییم «کاربر از خوش‌آمد رد شده».
  const welcomeKey = user ? `imach_welcome_done_${user.id}` : null;

  const markDone = () => {
    if (welcomeKey && typeof window !== "undefined") {
      try { localStorage.setItem(welcomeKey, "1"); } catch { /* ignore */ }
    }
  };

  const isDone = () => {
    if (!welcomeKey || typeof window === "undefined") return false;
    try { return localStorage.getItem(welcomeKey) === "1"; } catch { return false; }
  };

  // باز کردن خودکار فقط اگر firstName ندارد و هنوز خوش‌آمد را ندیده — فقط یک بار
  useEffect(() => {
    if (!user) return;
    if (shown.current) return;
    // اگر کاربر قبلاً نام را پر کرده، دیگر خوش‌آمد نمی‌خواهد
    const hasName = !!user.firstName && !user.name.startsWith("کاربر ");
    // اگر قبلاً خوش‌آمد را دیده/بسته، دیگر نشان نده
    const alreadyDone = isDone();
    const needsWelcome = !hasName && !alreadyDone;
    if (needsWelcome || forced) {
      shown.current = true;
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, forced]);

  if (!user) return null;

  const submit = async () => {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast({ title: "نام و نام خانوادگی را کامل بنویس", variant: "destructive" });
      return;
    }
    if (!intent) {
      toast({ title: "نوع فعالیت را انتخاب کن", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await editProfile.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      updateUser(res.user);
      markDone(); // ── خوش‌آمد تمام شد — دیگر نشان نده
      setOpen(false);

      // سوییچ arm بر اساس intent
      const { useArmStore } = await import("@/lib/active-biz");
      if (intent === "buy") {
        useArmStore.getState().setArm("buy");
        router.push("/buy");
      } else {
        useArmStore.getState().setArm("sell");
        router.push("/sell");
      }
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کن",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !forced) {
          setOpen(false);
          // کاربر مدال را بست → مرحله‌ی خوش‌آمد را پشت سر گذاشت
          markDone();
        }
      }}
    >
      <DialogContent className="max-w-md gap-4 p-5" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">خوش اومدی!</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label className="text-[11px] text-muted-foreground">نام</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="مثلاً احمد"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px] text-muted-foreground">نام خانوادگی</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="مثلاً رضایی"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[11px] text-muted-foreground">نوع فعالیت در بازار عمده</Label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setIntent("sell")}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center text-xs font-bold transition ${
                  intent === "sell"
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Store className="size-4" />
                فروش عمده
              </button>
              <button
                type="button"
                onClick={() => setIntent("buy")}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center text-xs font-bold transition ${
                  intent === "buy"
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border-primary/40"
                }`}
              >
                <ShoppingBasket className="size-4" />
                خرید عمده
              </button>
              <button
                type="button"
                onClick={() => setIntent("both")}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center text-xs font-bold transition ${
                  intent === "both"
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Store className="size-4" />
                هر دو
              </button>
            </div>
          </div>
        </div>

        <Button onClick={() => void submit()} disabled={busy || !intent}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          شروع
        </Button>
      </DialogContent>
    </Dialog>
  );
}
