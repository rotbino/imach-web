"use client";

import { useState } from "react";
import { authApi, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { dialOf, fmtPhone, countryLabel } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Phone, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * دکمه‌ی چشمک‌زن «ثبت پسورد» — برای کاربرانی که ثبت‌نام سریع کرده‌اند و هنوز
 * پسورد ندارند (user.passwordSet === false).
 *
 * شماره موبایل + کد کشور را به کاربر نشان می‌دهد تا مطمئن شود شماره‌اش درست
 * است؛ اگر اشتباه است، اول شماره را عوض می‌کند، بعد پسورد می‌گذارد.
 *
 * دو حالت نمایش:
 *   • هدر کاتالوگ: کوچک، کنار «کالای جدید»، چشمک ملایم orange
 *   • میز خرید / پروفایل: چشمک قرمز ملایم
 *
 * پس از ثبت پسورد، دکمه خودکار ناپدید می‌شود (passwordSet=true می‌شود).
 */
export function SetPasswordButton({
  variant = "header",
}: {
  variant?: "header" | "panel" | "profile";
}) {
  const user = useAuthStore((s) => s.user);
  const markPasswordSet = useAuthStore((s) => s.markPasswordSet);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // اگر کاربر پسورد دارد، دکمه نمایش داده نمی‌شود
  if (!user || user.passwordSet) return null;

  const dial = dialOf(user.country);
  const phoneDisplay = fmtPhone(user.phone);
  const countryName = countryLabel(user.country);

  const submit = async () => {
    if (newPassword.length < 6) {
      toast({ title: "رمز عبور حداقل ۶ کاراکتر باشد", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await authApi.setPassword({
        // کاربر ثبت‌نام سریع کرده، پس currentPassword نمی‌خواهد (passwordSet=false)
        ...(user.passwordSet === false ? {} : { currentPassword }),
        newPassword,
      });
      markPasswordSet();
      toast({ title: "رمز عبور ثبت شد", description: "از این به بعد می‌توانید با شماره و رمز وارد شوید." });
      setOpen(false);
      setNewPassword("");
      setCurrentPassword("");
    } catch (err) {
      toast({
        title: "ثبت رمز عبور ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  // سنجش قدرت رمز (طول‌محور): قرمز <۶ / کهربایی ۶–۹ / سبز ۱۰+
  const pwLen = newPassword.length;
  const pwTier = pwLen === 0 ? 0 : pwLen < 6 ? 1 : pwLen < 10 ? 2 : 3;
  const pwBar = pwTier === 0 ? "" : pwTier === 1 ? "bg-red-500" : pwTier === 2 ? "bg-amber-500" : "bg-emerald-500";
  const pwLabel = pwTier === 0 ? "" : pwTier === 1 ? "ضعیف" : pwTier === 2 ? "متوسط" : "قوی";

  // استایل دکمه بر اساس variant
  const buttonClass = cn(
    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition animate-pulse",
    variant === "header" && "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100",
    variant === "panel" && "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
    variant === "profile" && "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={buttonClass} aria-label="ثبت رمز عبور">
          <Lock className="size-3.5" />
          <span>ثبت رمز عبور</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-3 p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-primary" />
            ثبت رمز عبور
          </DialogTitle>
        </DialogHeader>

        {/* نمایش شماره موبایل + کد کشور — کاربر مطمئن شود */}
        <div className="rounded-xl border bg-accent/40 p-3">
          <p className="text-[11px] text-muted-foreground">شماره موبایل شما:</p>
          <p dir="ltr" className="mt-1 flex items-center justify-start gap-2 text-sm font-bold">
            <Phone className="size-3.5 text-primary" />
            +{dial} {phoneDisplay}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">{countryName}</p>
        </div>

        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-700">
          اگر این شماره اشتباه است، اول از <a href="/profile" className="font-bold underline">پروفایل</a> عوضش کن،
          بعد رمز عبور بگذار — چون بعد از ثبت رمز، این شماره قفل می‌شود.
        </p>

        {/* رمز فعلی فقط اگر کاربر از قبل پسورد دارد (که در این دکمه نیست، ولی برای تغییر) */}
        {user.passwordSet && (
          <div className="grid gap-1.5">
            <Label className="text-[11px] text-muted-foreground">رمز عبور فعلی</Label>
            <Input
              dir="ltr"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">رمز عبور جدید</Label>
          <Input
            dir="ltr"
            type="password"
            placeholder="حداقل ۶ کاراکتر"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          {pwLen > 0 && (
            <div className="flex items-center gap-2" aria-label={pwLabel}>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${pwBar}`}
                  style={{ width: `${(Math.min(pwLen, 12) / 12) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold">{pwLabel}</span>
            </div>
          )}
        </div>

        <Button className="mt-1" onClick={() => void submit()} disabled={busy || newPassword.length < 6}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          ثبت رمز عبور
        </Button>
      </DialogContent>
    </Dialog>
  );
}
