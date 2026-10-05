"use client";

/**
 * iMach Sheet — بنیان شیت پایینی Prototype (v18) به‌صورت React.
 * موبایل: شیت چسبیده به پایین با بک‌دراپ (عین Prototype).
 * دسکتاپ ≥۹۲۰: همان markup، CSS آن را به دیالوگ وسط‌چین تبدیل می‌کند.
 *
 *  · انیمیشن ورود/خروج با همان کلاس `.on` Prototype (translateY + opacity)
 *  · الگوی state-machine تمیز: تنظیم stage هنگام render (الگوی رسمی
 *    «adjust state on prop change»)؛ افکت فقط زمان‌بند async است
 *  · ESC و کلیک روی بک‌دراپ می‌بندد
 *  · بدون Radix Portal — عمداً در جای خودش رندر می‌شود تا داخل scope
 *    قواعد `.ia` بماند (backdrop/sheet در Prototype هم داخل شل‌اند)
 *  · قفل اسکرول بدنه لازم نیست — شل اپ خودش overflow:hidden دارد
 */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Stage = "off" | "enter" | "on" | "exit";

function useSheetStage(open: boolean): Stage {
  const [stage, setStage] = useState<Stage>(open ? "on" : "off");
  const [prevOpen, setPrevOpen] = useState(open);

  // الگوی رسمی React: همگام‌سازی state با تغییر prop در خود render
  if (open !== prevOpen) {
    setPrevOpen(open);
    setStage(open ? "enter" : "exit");
  }

  useEffect(() => {
    if (stage === "enter") {
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setStage("on")));
      return () => cancelAnimationFrame(r);
    }
    if (stage === "exit") {
      const t = setTimeout(() => setStage("off"), 320); // مدت transition خروج
      return () => clearTimeout(t);
    }
  }, [stage]);

  return stage;
}

export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const stage = useSheetStage(open);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage !== "enter" && stage !== "on") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, onClose]);

  if (stage === "off") return null;
  const on = stage === "on";

  return (
    <>
      <div className={on ? "backdrop on" : "backdrop"} onClick={onClose} />
      <div
        ref={sheetRef}
        className={on ? "sheet on" : "sheet"}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {children}
      </div>
    </>
  );
}
