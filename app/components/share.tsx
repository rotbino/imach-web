"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeftRight, Check, Copy, MessageCircle, Send } from "lucide-react";

/*
 * ابزار اشتراک‌گذاری — یک بار تعریف، دو جا استفاده:
 * • ShareContent — داخل کارت «اشتراک» صفحه‌های بازو (کاتالوگ فروش من / دستیار خرید)
 * • ShareDialog — دکمه اشتراک‌گذاری نوار مالک بالای صفحات عمومی
 */

export function ShareContent({
  kind,
  slug,
  bizName,
  onView,
}: {
  kind: "sell" | "buy";
  slug: string;
  bizName?: string;
  onView?: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const isSell = kind === "sell";
  const path = `${kind}/${slug}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://imach.app";
  // کد رفرال صاحب صفحه همیشه انتهای لینک است (خواسته‌ی کاربر) — هر ثبت‌نامی
  // که از این لینک بیاید به صاحب کاتالوگ/لیست خرید منتسب می‌شود:
  // کاتالوگ → ref={slug} (مشتری شدن) · دستیار خرید → ref=buy:{slug} (تامین‌کننده شدن)
  const refCode = isSell ? slug : `buy:${slug}`;
  const fullUrl = `${origin}/${path}?ref=${encodeURIComponent(refCode)}`;
  const shareText = isSell
    ? `کاتالوگ فروش ${bizName ? `«${bizName}» ` : ""}در iMach`
    : `نیازهای خرید ${bizName ? `«${bizName}» ` : ""}در iMach — اگر این کالا را دارید، پیشنهاد بدهید`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      /* clipboard may fail — ignore */
    }
    setCopied(true);
    toast({ title: "لینک کپی شد", description: path });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText}: ${fullUrl}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <>
      <div className="flex items-center gap-2 rounded-xl border bg-white p-2 ps-3" dir="ltr">
        <span className="grow truncate text-left text-sm font-medium text-primary">{path}</span>
        <Button size="icon" variant="ghost" onClick={() => void copy()} aria-label="کپی لینک" className="size-8">
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="shrink-0 rounded-xl border bg-white p-1.5 shadow-sm"
          title="برای باز کردن لینک در موبایل، اسکن کنید"
        >
          <QRCodeSVG value={fullUrl} size={64} fgColor="#f97316" bgColor="#ffffff" />
        </div>
        <div className="grid grow gap-2">
          {onView && (
            <Button onClick={onView} className={isSell ? "" : "bg-stone-800 hover:bg-stone-900"}>
              <ArrowLeftRight className="size-4" />
              {isSell ? "دیدن کاتالوگ" : "دیدن لیست خرید"}
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={shareTelegram}>
              <Send className="size-3.5 text-sky-600" />
              تلگرام
            </Button>
            <Button variant="outline" size="sm" onClick={shareWhatsApp}>
              <MessageCircle className="size-3.5 text-green-600" />
              واتساپ
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function ShareDialog({
  kind,
  slug,
  bizName,
  open,
  onOpenChange,
}: {
  kind: "sell" | "buy";
  slug: string;
  bizName?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{kind === "sell" ? "اشتراک‌گذاری کاتالوگ" : "اشتراک‌گذاری لیست خرید"}</DialogTitle>
        </DialogHeader>
        <ShareContent kind={kind} slug={slug} bizName={bizName} />
      </DialogContent>
    </Dialog>
  );
}
