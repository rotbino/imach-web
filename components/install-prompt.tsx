"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Download, Plus, Share, X, Zap } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

/*
 * مدال «iMach را نصب کن» — شیتِ زیبا که از پایین صفحه بالا می‌آید.
 *
 * قواعد نمایش (حرفه‌ای و بدون مزاحمت):
 *  • فقط موبایل؛ دسکتاپ هرگز.
 *  • اگر اپ از قبل نصب/ایستاده (standalone) اجرا شود → دیگر هرگز.
 *  • بستن → یک هفته سکوت، بعد دوباره شانس نصب (نه مزاحمتِ هر بار).
 *  • اندروید/کروم: دکمه‌ی نصب واقعی با beforeinstallprompt.
 *  • iOS: سافاری رویداد نصب ندارد → راهنمای سه‌مرحله‌ای Share → Add to Home Screen.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const LS_INSTALLED = "imach.pwa.installed";
const LS_DISMISSED = "imach.pwa.dismissedAt";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // یک هفته
const SHOW_DELAY_MS = 3500; // اول صفحه جا بیفتد، بعد پیشنهاد

type Platform = "android" | "ios";

const STRINGS = {
  fa: {
    close: "بستن",
    title: "iMach را نصب کن",
    subtitle: "نسخه‌ی وبِ iMach روی گوشی تو، دقیقاً مثل اپلیکیشن.",
    benefits: [
      "دسترسی مستقیم از صفحه‌ی اصلی گوشی",
      "باز شدن سریع و تجربه‌ی اپلیکیشنی",
      "اعلان لحظه‌ای: مشتری مناسب، فالو و استعلام قیمت",
    ],
    install: "نصب برنامه",
    later: "فعلاً نه",
    iosLead: "روی آیفون، نصب از داخل سافاری انجام می‌شود:",
    iosSteps: [
      "روی دکمه‌ی Share (مربع با فلش رو به بالا) بزن",
      "گزینه‌ی Add to Home Screen را انتخاب کن",
      "بالا‌ی صفحه Add را بزن — تمام!",
    ],
    iosNote: "بعد از نصب، اعلان‌های iMach هم روی آیفون فعال می‌شود.",
  },
  en: {
    close: "Close",
    title: "Install iMach",
    subtitle: "iMach web, right on your phone — just like a native app.",
    benefits: [
      "Direct access from your home screen",
      "Fast launch, app-like experience",
      "Instant alerts: great matches, follows & price quotes",
    ],
    install: "Install app",
    later: "Not now",
    iosLead: "On iPhone, installing happens inside Safari:",
    iosSteps: [
      "Tap the Share button (the square with an arrow)",
      "Choose “Add to Home Screen”",
      "Tap Add at the top — done!",
    ],
    iosNote: "Once installed, iMach notifications work on iPhone too.",
  },
} as const;

export function InstallPrompt() {
  const { locale } = useLocale();
  const t = STRINGS[locale];
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [show, setShow] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const decidedRef = useRef(false); // فقط یک‌بار در هر بازدید نشان بده

  useEffect(() => {
    const ls = (k: string) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    };
    const lsSet = (k: string, v: string) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* حالت ناشناس و… */
      }
    };

    // ۱) از قبل نصب است؟ (پرچم ما یا اجرای standalone فعلی)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (ls(LS_INSTALLED) || standalone) {
      lsSet(LS_INSTALLED, "1"); // اپ داخل کانتینر خودش — دیگر هرگز
      return;
    }

    // ۲) اخیراً بسته؟ یک هفته سکوت.
    const dismissedAt = Number(ls(LS_DISMISSED) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

    // ۳) فقط موبایل.
    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Macintosh") && "ontouchend" in document); // iPadOS با UA دسکتاپ
    const isMobile =
      isIOS ||
      window.matchMedia("(max-width: 767px)").matches ||
      window.matchMedia("(pointer: coarse) and (max-width: 1023px)").matches;
    if (!isMobile) return;

    const tryShow = () => {
      if (decidedRef.current) return;
      if (isIOS) {
        // سافاری/iOS رویداد beforeinstallprompt ندارد — راهنما نشان بده
        decidedRef.current = true;
        setPlatform("ios");
        setShow(true);
      } else if (promptRef.current) {
        decidedRef.current = true;
        setPlatform("android");
        setShow(true);
      }
      // کرومِ اندروید هنوز آماده نیست؟ بگذار رویداد بیاید و خودش tryShow را صدا بزند.
    };

    const onBip = (e: Event) => {
      e.preventDefault(); // جلوی مینی‌بارِ پیش‌فرض کروم را می‌گیریم — مدال خودمان قشنگ‌تر است
      promptRef.current = e as BeforeInstallPromptEvent;
      tryShow();
    };
    const onInstalled = () => {
      lsSet(LS_INSTALLED, "1");
      setShow(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    const timer = setTimeout(tryShow, SHOW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(LS_DISMISSED, String(Date.now()));
    } catch {}
    setShow(false);
  };

  const install = async () => {
    const ev = promptRef.current;
    if (!ev) return;
    try {
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      try {
        if (outcome === "accepted") localStorage.setItem(LS_INSTALLED, "1");
        else localStorage.setItem(LS_DISMISSED, String(Date.now()));
      } catch {}
    } catch {
      /* کاربر رد کرد یا مرورگر اجازه نداد */
    }
    setShow(false);
  };

  if (!show || !platform) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
    >
      {/* پس‌زمینه‌ی تار — کلیک = بستن */}
      <button
        aria-label={t.close}
        onClick={dismiss}
        className="absolute inset-0 h-full w-full cursor-default bg-stone-950/45 animate-[imach-fade-in_.3s_ease-out]"
      />

      {/* شیت از پایین */}
      <div className="relative w-full max-w-md rounded-t-3xl border bg-card px-5 pb-8 pt-5 shadow-2xl animate-[imach-sheet-up_.45s_cubic-bezier(.32,.72,.24,1)]">
        <button
          onClick={dismiss}
          aria-label={t.close}
          className="absolute end-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* سربرگ: لوگوی برند روی کاشی سفید */}
        <div className="flex items-center gap-3.5 pe-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="iMach"
            className="h-14 w-14 shrink-0 rounded-2xl border bg-white p-2.5 shadow-sm"
          />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-7 text-foreground">
              {t.title}
            </h2>
            <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
              {t.subtitle}
            </p>
          </div>
        </div>

        {platform === "android" ? (
          <>
            <ul className="mt-5 space-y-2.5">
              {t.benefits.map((b, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2.5 text-sm leading-6 text-foreground/90"
                >
                  {i === 0 ? (
                    <Download className="h-4.5 w-4.5 shrink-0 text-primary" />
                  ) : i === 1 ? (
                    <Zap className="h-4.5 w-4.5 shrink-0 text-primary" />
                  ) : (
                    <BellRing className="h-4.5 w-4.5 shrink-0 text-primary" />
                  )}
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={install}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
            >
              <Download className="h-5 w-5" />
              {t.install}
            </button>
            <button
              onClick={dismiss}
              className="mt-2 h-10 w-full rounded-xl text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t.later}
            </button>
          </>
        ) : (
          <>
            <p className="mt-5 text-sm font-bold text-foreground">
              {t.iosLead}
            </p>
            <ol className="mt-3 space-y-3">
              {t.iosSteps.map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm leading-6 text-foreground/90">
                    {i === 0 && <Share className="h-4 w-4 shrink-0 text-primary" />}
                    {i === 1 && <Plus className="h-4 w-4 shrink-0 text-primary" />}
                    <span>{s}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl bg-primary/10 px-4 py-3 text-[13px] leading-6 text-primary">
              {t.iosNote}
            </div>
            <button
              onClick={dismiss}
              className="mt-4 h-10 w-full rounded-xl text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t.later}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
