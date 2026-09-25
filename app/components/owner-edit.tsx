"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, type BusinessSummaryDto } from "@/lib/api";
import { useEditProfile, useMyAvatar, useUploadFile, useRemoveFile } from "@/lib/queries";
import { useAuthStore } from "@/lib/auth-store";
import { FileUploader } from "@/components/FileUploader";
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
import { Check, Loader2, PencilLine, UserRound } from "lucide-react";

/**
 * خط مالک کاتالوگ — نام و نام خانوادگی صاحب کاتالوگ را زیر عنوان نشان می‌دهد.
 * برای بازدیدکنندگان فقط متن است. برای مالک/ادمین، یک مداد کنار نام ظاهر می‌شود
 * که با کلیک، مدال ویرایش نام + عکس پروفایل (avatar) باز می‌شود.
 *
 * این کامپوننت در ویترین عمومی کاتالوگ (/sell/[slug] و /buy/[slug]) استفاده
 * می‌شود و فقط برای مالک یا ادمین مداد را نشان می‌دهد.
 */
export function OwnerLineEditable({
  owner,
  isOwner,
}: {
  owner: {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    avatar?: { url: string; thumbUrl: string | null } | null;
  } | null;
  isOwner: boolean;
}) {
  if (!owner) return null;
  const displayName = [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.name;

  if (!isOwner) {
    // بازدیدکننده — فقط نام
    return (
      <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <UserRound className="size-3.5 text-primary" />
        {displayName}
      </p>
    );
  }

  // مالک — مداد برای ویرایش
  return <OwnerEditDialog owner={owner} displayName={displayName} />;
}

function OwnerEditDialog({
  owner,
  displayName,
}: {
  owner: { id: string; name: string; firstName: string | null; lastName: string | null };
  displayName: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const editProfile = useEditProfile();
  const updateUser = useAuthStore((s) => s.updateUser);
  const avatarQ = useMyAvatar(owner.id);
  const uploadFile = useUploadFile();
  const removeFile = useRemoveFile();
  const [open, setOpen] = useState(false);
  const [avatarPct, setAvatarPct] = useState<number | null>(null);
  const [avatarPhase, setAvatarPhase] = useState<"sending" | "processing">("sending");
  const [firstName, setFirstName] = useState(owner.firstName ?? "");
  const [lastName, setLastName] = useState(owner.lastName ?? "");
  const avatar = avatarQ.data;

  const uploadAvatar = (file: File) => {
    setAvatarPct(0);
    setAvatarPhase("sending");
    uploadFile.mutate(
      {
        file,
        model: "User",
        modelId: owner.id,
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

  const save = async () => {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast({ title: "نام و نام خانوادگی را کامل بنویس", variant: "destructive" });
      return;
    }
    try {
      const res = await editProfile.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim() });
      updateUser(res.user);
      toast({ title: "ذخیره شد" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کن",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group mt-1 inline-flex items-center justify-center gap-1 text-xs text-muted-foreground transition hover:text-primary"
          aria-label="ویرایش نام و عکس مالک"
        >
          <UserRound className="size-3.5 text-primary" />
          <span>{displayName}</span>
          <PencilLine className="size-3 opacity-0 transition group-hover:opacity-100" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-4 p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <UserRound className="size-4 text-primary" />
            ویرایش نام و عکس
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b pb-4">
          <FileUploader
            shape="round"
            size={56}
            value={avatar ? { url: avatar.url, thumbUrl: avatar.thumbUrl } : null}
            uploading={uploadFile.isPending}
            progress={avatarPct}
            phase={avatarPhase}
            label="عکس"
            onSelect={uploadAvatar}
            onRemove={avatar ? removeAvatar : undefined}
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
            در کاتالوگ و لیست خرید نمایش داده می‌شود.
          </p>
        </div>

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
        </div>

        <Button onClick={() => void save()} disabled={editProfile.isPending}>
          {editProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          ذخیره
        </Button>
      </DialogContent>
    </Dialog>
  );
}
