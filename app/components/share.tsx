"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { ContactsGate } from "@/app/components/contacts-gate";
import {
  ArrowLeftRight,
  BookUser,
  Check,
  Copy,
  Link2,
  Loader2,
  MessageCircle,
  Printer,
  Send,
  Share2,
} from "lucide-react";

/*
 * گیت اشتراک جامع — یک بار تعریف، چند جا استفاده:
 * • ShareContent — بدنه‌ی اشتراک در کارت‌های بازو، مدال گیت معرف، لیست‌های من
 * • ShareDialog — مدال آماده برای نوار مالک بالای صفحات عمومی
 *
 * دو بخش:
 * ۱) اشتراک با مخاطبین → گیت مخاطبین (اعضا با رنگ برند؛ ارسال کاتالوگ/لیست خرید)
 * ۲) اشتراک مستقیم → موبایل: navigator.share (خودِ سیستم ابزارهای کاربر را
 *    نشان می‌دهد؛ اسم اپ نمی‌آوریم) · دسکتاپ: پیام‌رسان‌های شناخته‌شده + کپی
 *    لینک + QR چاپی (چسباندن به مغازه / کارت ویزیت).
 */

/** پیام‌رسان‌های دسکتاپ — موبایل navigator.share دارد و این‌ها را نمی‌بیند */
function messengerTargets(text: string, url: string): { key: string; label: string; href: string; icon: React.ReactNode }[] {
  const t = encodeURIComponent(`${text}: ${url}`);
  return [
    {
      key: "whatsapp",
      label: "واتساپ",
      href: `https://wa.me/?text=${t}`,
      icon: <MessageCircle className="size-3.5 text-green-600" />,
    },
    {
      key: "telegram",
      label: "تلگرام",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      icon: <Send className="size-3.5 text-sky-600" />,
    },
    {
      key: "bale",
      label: "بله",
      href: `https://ble.ir/share?text=${t}`,
      icon: <Send className="size-3.5 text-emerald-600" />,
    },
    {
      key: "eitaa",
      label: "ایتا",
      href: `https://eitaa.com/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      icon: <Send className="size-3.5 text-orange-500" />,
    },
  ];
}

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
  const [contactsOpen, setContactsOpen] = useState(false);
  const isSell = kind === "sell";
  const path = `${isSell ? "sell" : "buy"}/${slug}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://imach.app";
  // کد رفرال صاحب صفحه همیشه انتهای لینک است (خواسته‌ی کاربر) — هر ثبت‌نامی
  // که از این لینک بیاید به صاحب کاتالوگ/لیست خرید منتسب می‌شود:
  // کاتالوگ → ref={slug} (مشتری شدن) · دستیار خرید → ref=buy:{slug} (تامین‌کننده شدن)
  const refCode = isSell ? slug : `buy:${slug}`;
  const fullUrl = `${origin}/${path}?ref=${encodeURIComponent(refCode)}`;
  const shareText = isSell
    ? `کاتالوگ فروش ${bizName ? `«${bizName}» ` : ""}در iMach`
    : `نیازهای خرید ${bizName ? `«${bizName}» ` : ""}در iMach — اگر این کالا را دارید، پیشنهاد بدهید`;

  /** موبایل/مرورگرهای پشتیبان: خودِ سیستم ابزارها را نشان می‌دهد */
  const nativeShare = useMemo(() => {
    if (typeof navigator === "undefined" || !navigator.share) return null;
    const payload = { title: "iMach", text: shareText, url: fullUrl };
    if (navigator.canShare && !navigator.canShare(payload)) return null;
    return () =>
      navigator
        .share(payload)
        .catch(() => undefined /* کاربر رد کرد */);
  }, [shareText, fullUrl]);

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

  /** چاپ QR — برای چسباندن به مغازه یا کارت ویزیت */
  const printQr = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-qr-print]");
    const img = canvas?.toDataURL("image/png") ?? "";
    const w = window.open("", "_blank", "width=380,height=520");
    if (!w) return;
    w.document.write(
      `<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>QR ${bizName ?? "iMach"}</title>` +
        `<style>body{font-family:sans-serif;text-align:center;padding:28px}h2{margin:0 0 4px}p{color:#777;font-size:13px;margin:6px 0 16px}img{width:260px;height:260px}</style></head><body>` +
        `<h2>${bizName ?? "iMach"}</h2><p>${isSell ? "کاتالوگ فروش" : "لیست خرید"} — اسکن کنید</p>` +
        `<img src="${img}" alt="QR" /><p>${path}</p></body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="grid gap-3">
      {/* ۱) اشتراک با مخاطبین — شبکه‌ی خصوصی کاربر */}
      <Button onClick={() => setContactsOpen(true)} className={isSell ? "" : "bg-stone-800 hover:bg-stone-900"}>
        {contactsOpen ? <Loader2 className="size-4 animate-spin" /> : <BookUser className="size-4" />}
        اشتراک با مخاطبین
      </Button>

      {/* ۲) اشتراک مستقیم */}
      {nativeShare ? (
        <Button variant="outline" onClick={nativeShare}>
          <Share2 className="size-4 text-primary" />
          اشتراک‌گذاری
        </Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {messengerTargets(shareText, fullUrl).map((m) => (
            <Button
              key={m.key}
              variant="outline"
              size="sm"
              className="flex-col gap-1 py-2 text-[11px]"
              onClick={() => window.open(m.href, "_blank", "noopener,noreferrer")}
            >
              {m.icon}
              {m.label}
            </Button>
          ))}
        </div>
      )}

      {/* لینک + QR چاپی */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="rounded-xl border bg-white p-1.5 shadow-sm" title="برای باز کردن لینک در موبایل، اسکن کنید">
            <QRCodeSVG value={fullUrl} size={64} fgColor="#f97316" bgColor="#ffffff" />
          </div>
          <QRCodeCanvas value={fullUrl} size={64} className="pointer-events-none absolute -z-10 opacity-0" data-qr-print />
          <button
            type="button"
            onClick={printQr}
            className="absolute -bottom-2 -start-2 grid size-6 place-items-center rounded-full border bg-white shadow-sm hover:bg-accent"
            aria-label="چاپ QR"
            title="چاپ QR — برای مغازه یا کارت ویزیت"
          >
            <Printer className="size-3 text-stone-600" />
          </button>
        </div>
        <div className="grid grow gap-2">
          {onView && (
            <Button variant="secondary" size="sm" onClick={onView}>
              <ArrowLeftRight className="size-3.5" />
              {isSell ? "دیدن کاتالوگ" : "دیدن لیست خرید"}
            </Button>
          )}
          <div className="flex items-center gap-2 rounded-xl border bg-white p-2 ps-3" dir="ltr">
            <span className="grow truncate text-left text-sm font-medium text-primary">{path}</span>
            <Button size="icon" variant="ghost" onClick={() => void copy()} aria-label="کپی لینک" className="size-8">
              {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Link2 className="size-3" />
        هر ثبت‌نام از این لینک به شما منتسب می‌شود.
      </p>

      <ContactsGate open={contactsOpen} onOpenChange={setContactsOpen} kind={kind} slug={slug} bizName={bizName} />
    </div>
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
