"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";

/**
 * `/login` — ورود M0 (چهرهٔ 03-login در M1 کامل می‌شود).
 * جریان واقعی: شماره → checkPhone → رمز → loginUser → میز.
 * بازیابی رمز = تیکت پشتیبانی انسانی (تصمیم FD-22).
 */
export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { show } = useToast();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) return setError("شمارهٔ موبایل را بنویس");
    setBusy(true);
    try {
      await login(phone.trim(), password);
      show({ text: "خوش آمدی 👋", kind: "success" });
      router.replace("/me");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در ورود — دوباره تلاش کن");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      {/* برند */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-primary text-[26px] font-black text-white shadow-card">
          i
        </div>
        <div>
          <h1 className="text-[19px] font-black text-text">ورود به آی‌مچ</h1>
          <p className="mt-1 text-[13px] text-text-3">با شمارهٔ موبایلت وارد شو</p>
        </div>
      </div>

      {/* ثبت‌نام — لینک اولویت‌دار (FD-26: بالا، نارنجی) */}
      <Link
        href="/start"
        className="mb-5 flex h-[52px] items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-primary-strong"
      >
        <Icon name="user-plus" size={19} />
        حساب جدید بساز — سریع و ساده
      </Link>

      <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <Field label="شمارهٔ موبایل" required>
          {(id) => (
            <Input
              id={id}
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="۰۹۱۲ ـ ـ ـ ـ ـ ـ ـ"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
        </Field>
        <Field label="رمز عبور" hint="اگر رمز نداری، از ساخت حساب سریع استفاده کن">
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        {error && <p className="text-[12.5px] leading-5 text-red">{error}</p>}
        <Button type="submit" size="lg" block loading={busy}>
          ورود
        </Button>
      </form>

      {/* بازیابی — پایین، کم‌رنگ (FD-26) */}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="mt-5 text-center text-[12.5px] font-bold text-text-3 transition-colors hover:text-text-2"
      >
        رمزم را فراموش کرده‌ام
      </button>

      {/* شیت بازیابی = پشتیبانی انسانی (تصمیم FD-22) */}
      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="بازیابی رمز عبور">
        <div className="flex flex-col gap-3 py-1">
          <p className="text-[13.5px] leading-6 text-text-2">
            برای بازنشانی رمز، با پشتیبانی آی‌مچ در تماس باش تا هویتت را تأیید کنیم و رمز موقت برایت
            ارسال شود.
          </p>
          <a
            href="tel:+982160000000"
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-surface-2 text-[14px] font-bold text-text transition-colors hover:bg-surface-3"
          >
            <Icon name="phone" size={18} />
            تماس با پشتیبانی
          </a>
        </div>
      </Sheet>
    </div>
  );
}
