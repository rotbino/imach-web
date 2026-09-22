"use client";

import { useMemo, useState } from "react";
import { useContacts, useInviteContact, useSyncContacts } from "@/lib/queries";
import type { ContactRowDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { dialOf, fmtPhone, normalizeIntlPhone } from "@/lib/countries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BadgeCheck, BookUser, Check, Loader2, MessageSquare, Send, UserPlus } from "lucide-react";

/*
 * گیت اشتراک مخاطبین — مثل واتساپ/تلگرام، دفترچه‌ی تلفن با اجازه‌ی کاربر:
 * • انتخاب از گوشی با Contact Picker API (کروم/اندروید)؛ جای دیگر ورود دستی.
 * • اعضای iMach با رنگ برند دیده می‌شوند؛ برای هر مخاطب یک اقدام زمینه‌ای:
 *   بازوی فروش → «ارسال کاتالوگ» · بازوی خرید → «ارسال لیست خرید».
 * • عضو: اطلاع‌رسانی درون‌برنامه‌ای · غریبه: پیامک با لینک دعوت‌دار (ref).
 * کامپوننت مستقل — هر جا اشتراک معنا دارد، جدا هم قابل استفاده است.
 */

type PickResult = { name?: string[]; tel?: string[] }[];
type ContactsManager = { select: (props: string[], opts: { multiple: boolean }) => Promise<PickResult> };

/** Contact Picker API — فقط بعضی مرورگرهای موبایل؛ جای دیگر ورود دستی */
function contactPicker(): ContactsManager | null {
  if (typeof navigator === "undefined" || !("contacts" in navigator)) return null;
  return (navigator as unknown as { contacts?: ContactsManager }).contacts ?? null;
}

export function ContactsGate({
  open,
  onOpenChange,
  kind,
  slug,
  bizName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** sell = ارسال کاتالوگ · buy = ارسال لیست خرید */
  kind: "sell" | "buy";
  slug: string;
  bizName?: string;
}) {
  const { toast } = useToast();
  const contactsQ = useContacts();
  const sync = useSyncContacts();
  const invite = useInviteContact();
  // کشور صاحب دفترچه — کد تلفن مخاطبین از همین‌جا می‌آید (همان قاعده‌ی سرور)
  const user = useAuthStore((s) => s.user);
  const ownerCountry = user?.country ?? "IR";

  const isSell = kind === "sell";
  const actionLabel = isSell ? "ارسال کاتالوگ" : "ارسال لیست خرید";

  const origin = typeof window !== "undefined" ? window.location.origin : "https://imach.app";
  const refCode = isSell ? slug : `buy:${slug}`;
  const fullUrl = `${origin}/${isSell ? "sell" : "buy"}/${slug}?ref=${encodeURIComponent(refCode)}`;
  const inviteText = isSell
    ? `کاتالوگ فروش ${bizName ? `«${bizName}» ` : ""}در iMach: ${fullUrl}`
    : `نیازهای خرید ${bizName ? `«${bizName}» ` : ""}در iMach — اگر این کالا را دارید، پیشنهاد بدهید: ${fullUrl}`;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  /** دعوت‌شده‌های این نشست — تا رفرشِ لیست، فوری دیده شوند */
  const [sentIds, setSentIds] = useState<Set<string>>(() => new Set());

  const contacts = contactsQ.data ?? [];
  const pickerSupported = useMemo(() => contactPicker() !== null, []);

  const addFromDevice = async () => {
    const picker = contactPicker();
    if (!picker) return;
    try {
      const picked = await picker.select(["name", "tel"], { multiple: true });
      const rows = picked
        .map((c) => ({
          name: (c.name?.[0] ?? "").trim(),
          phone: normalizeIntlPhone(c.tel?.[0] ?? "", ownerCountry) ?? "",
        }))
        .filter((r) => r.phone !== "");
      if (rows.length === 0) {
        toast({ title: "مخاطب قابل افزودنی انتخاب نشد" });
        return;
      }
      sync.mutate(rows, {
        onSuccess: (res) => toast({ title: `${res.saved} مخاطب اضافه شد`, description: "اعضای iMach با رنگ برند مشخص‌اند." }),
        onError: (e) => toast({ title: e.message || "خطا در ذخیره مخاطبین", variant: "destructive" }),
      });
    } catch {
      /* کاربر اجازه را رد کرده — بی‌صدا */
    }
  };

  const addManually = () => {
    const p = normalizeIntlPhone(phone, ownerCountry);
    if (!p) {
      toast({ title: "شماره موبایل معتبر نیست", description: `شماره را کامل و بدون صفر اول بنویسید — پیشوند +${dialOf(ownerCountry)}`, variant: "destructive" });
      return;
    }
    sync.mutate([{ name: name.trim() || p, phone: p }], {
      onSuccess: () => {
        setName("");
        setPhone("");
      },
      onError: (e) => toast({ title: e.message || "خطا", variant: "destructive" }),
    });
  };

  const sendTo = (c: ContactRowDto) => {
    invite.mutate(c.id, {
      onSuccess: () => setSentIds((s) => new Set(s).add(c.id)),
    });
    if (c.member) {
      toast({ title: "در iMach برایش اطلاع دادیم", description: `${c.name} کاتالوگ شما را در اپ می‌بیند.` });
    } else {
      window.location.href = `sms:+${c.phone}?body=${encodeURIComponent(inviteText)}`;
      toast({ title: "پیامک آماده شد", description: "لینک دعوت شما ضمیمه‌ی پیامک است." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>اشتراک با مخاطبین</DialogTitle>
          <DialogDescription>
            {isSell ? "کاتالوگتان را برای مخاطبینتان بفرستید" : "لیست خریدتان را برای مخاطبینتان بفرستید"} —
            اعضای iMach با رنگ برند مشخص‌اند.
          </DialogDescription>
        </DialogHeader>

        {/* ورود مخاطبین — از گوشی با اجازه، یا دستی */}
        <div className="grid gap-2">
          {pickerSupported && (
            <Button variant="outline" onClick={() => void addFromDevice()} disabled={sync.isPending} className="w-full">
              {sync.isPending ? <Loader2 className="size-4 animate-spin" /> : <BookUser className="size-4 text-primary" />}
              افزودن از مخاطبین گوشی
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Input placeholder="نام مخاطب" value={name} onChange={(e) => setName(e.target.value)} className="h-9" aria-label="نام مخاطب" />
            <Input
              dir="ltr"
              inputMode="numeric"
              placeholder={`+${dialOf(ownerCountry)} …`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 text-left"
              aria-label="شماره موبایل"
            />
            <Button size="sm" variant="secondary" onClick={addManually} disabled={sync.isPending} className="h-9 shrink-0 rounded-xl px-3 text-xs">
              <UserPlus className="size-3.5" />
              افزودن
            </Button>
          </div>
        </div>

        {/* لیست مخاطبین — اعضا اول (مرتب‌سازی سمت سرور) */}
        <div className="max-h-[46vh] overflow-y-auto rounded-xl border" role="list" aria-label="مخاطبین من">
          {contactsQ.isLoading ? (
            <p className="grid place-items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </p>
          ) : contacts.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs leading-6 text-muted-foreground">
              هنوز مخاطبی اضافه نشده است.
              {pickerSupported ? " از دکمه‌ی بالا دفترچه‌ی تلفنتان را بخوانید." : " شماره‌ها را دستی اضافه کنید."}
            </p>
          ) : (
            <ul className="divide-y">
              {contacts.map((c) => {
                const sent = sentIds.has(c.id) || !!c.lastInvitedAt;
                return (
                  <li key={c.id} className="flex items-center gap-2 px-3 py-2.5" role="listitem">
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black ${
                        c.member ? "bg-primary/10 text-primary" : "bg-stone-100 text-stone-500"
                      }`}
                      aria-hidden
                    >
                      {c.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 grow">
                      <span className={`flex items-center gap-1 truncate text-sm font-bold ${c.member ? "text-primary" : ""}`}>
                        {c.name}
                        {c.member && <BadgeCheck className="size-3.5 shrink-0" aria-label="عضو iMach" />}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span dir="ltr" className="text-[11px] text-muted-foreground">
                          {fmtPhone(c.phone)}
                        </span>
                        {c.member ? (
                          <Badge className="border-transparent bg-primary/10 px-1.5 py-0 text-[10px] text-primary" variant="outline">
                            عضو iMach
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-stone-400">عضو نیست</span>
                        )}
                      </span>
                    </span>
                    {c.member ? (
                      <Button
                        size="sm"
                        variant={sent ? "secondary" : "outline"}
                        disabled={sent || invite.isPending}
                        onClick={() => sendTo(c)}
                        className={`h-8 shrink-0 gap-1 rounded-xl px-2.5 text-xs ${sent ? "text-stone-500" : "text-primary"}`}
                      >
                        {invite.isPending ? <Loader2 className="size-3 animate-spin" /> : sent ? <Check className="size-3" /> : <Send className="size-3" />}
                        {sent ? "ارسال شد" : actionLabel}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => sendTo(c)} className="h-8 shrink-0 gap-1 rounded-xl px-2.5 text-xs">
                        {sentIds.has(c.id) ? <Check className="size-3" /> : <MessageSquare className="size-3" />}
                        {actionLabel}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-center text-[11px] leading-5 text-muted-foreground">
          برای غریبه‌ها پیامک دعوت با لینک شما آماده می‌شود؛ هر ثبت‌نام از لینک، به شما منتسب است.
        </p>
      </DialogContent>
    </Dialog>
  );
}
