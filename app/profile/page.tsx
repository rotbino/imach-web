"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { fmtPhone } from "@/lib/countries";
import { useMyAvatar, useRemoveFile, useUploadFile } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { LanguageSelect } from "@/app/components/language-select";
import { FileUploader } from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, ShieldCheck } from "lucide-react";

/*
 * پروفایل — حساب کاربر (یکی، مشترک بین هر دو صفحه؛ مثل اینستاگرام):
 * عکس، نام، موبایل، زبان و خروج. عکس پروفایل بلافاصله آپلود می‌شود —
 * مدلِ کاربر از قبل وجود دارد؛ آپلود جدید، قبلی را سمت سرور جایگزین می‌کند.
 * تنظیمات کسب‌وکار (نوع فعالیت و …) با مدادِ کنار هویت کسب‌وکار،
 * روی «کاتالوگ فروش من» ویرایش می‌شود.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { status, user, logout } = useAuthStore();
  const { toast } = useToast();
  const avatarQ = useMyAvatar(status === "authed" ? user?.id : null);
  const uploadFile = useUploadFile();
  const removeFile = useRemoveFile();
  // درصد/فاز زنده‌ی آپلود آواتار — برای حلقه‌ی پیشرفت برند (UploadRing)
  const [avatarPct, setAvatarPct] = useState<number | null>(null);
  const [avatarPhase, setAvatarPhase] = useState<"sending" | "processing">("sending");

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed" || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow" />
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  const avatar = avatarQ.data;

  const uploadAvatar = (file: File) => {
    setAvatarPct(0);
    setAvatarPhase("sending");
    uploadFile.mutate(
      {
        file,
        model: "User",
        modelId: user.id,
        key: "avatar",
        onProgress: (pct, phase) => {
          setAvatarPct(pct);
          setAvatarPhase(phase);
        },
      },
      {
        onSuccess: () => toast({ title: "عکس پروفایل آپلود شد" }),
        onError: (e) => toast({ title: "آپلود ناموفق بود", description: e.message, variant: "destructive" }),
        onSettled: () => setAvatarPct(null),
      }
    );
  };

  const removeAvatar = () => {
    if (!avatar) return;
    removeFile.mutate(avatar.id, {
      onSuccess: () => toast({ title: "عکس پروفایل حذف شد" }),
      onError: (e) => toast({ title: "حذف ناموفق بود", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <FileUploader
                shape="round"
                size={72}
                value={avatar ? { url: avatar.url, thumbUrl: avatar.thumbUrl } : null}
                uploading={uploadFile.isPending}
                progress={avatarPct}
                phase={avatarPhase}
                label="عکس پروفایل"
                onSelect={uploadAvatar}
                onRemove={avatar ? removeAvatar : undefined}
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">{user.name}</p>
                <p dir="ltr" className="mt-0.5 text-sm text-muted-foreground">
                  {fmtPhone(user.phone)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">برای تغییر عکس، روی آن بزنید</p>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void logout()}
              >
                <LogOut className="size-4" />
                خروج از حساب
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-muted-foreground">زبان / Language</p>
            <LanguageSelect />
          </div>

          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="mt-4 flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-4.5" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-extrabold">پنل مدیریت</span>
            </Link>
          )}
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}
