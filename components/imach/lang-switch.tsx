"use client";

/**
 * LangSwitch — سوییچ زبان v18 (فاز ۳ · الزام مالک: تعویض زبان در صفحهٔ اول).
 *
 *  · پیش‌فرض زبان از سرور می‌آید: cookie (انتخاب صریح) → Accept-Language
 *    (پروکسیِ زبان رسمی کشور کاربر) → فارسی — همان ریلِ ریشهٔ layout.
 *  · تغییر: setLocale → کوکی یک‌ساله + dir/html فوری + refresh صفحات سرور.
 *  · ظاهر: چیپ‌های دیزاین‌سیستم v18 + آیکون کرهٔ Prototype.
 */

import { availableLocales } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-context";
import { useMessages } from "@/i18n/messages/use-messages";
import { Icon } from "./icon";

export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const m = useMessages();

  return (
    <div
      className="chips lang-switch"
      role="group"
      aria-label={m.app.lang.aria}
      style={compact ? { justifyContent: "center" } : undefined}
    >
      {availableLocales().map((l) => (
        <button
          key={l.code}
          type="button"
          className={l.code === locale ? "chip active" : "chip"}
          lang={l.code}
          aria-pressed={l.code === locale}
          onClick={() => l.code !== locale && setLocale(l.code)}
        >
          {l.code === locale ? <Icon className="ic-sm ic-12" name="i-globe" /> : null}
          {l.label}
        </button>
      ))}
    </div>
  );
}
