"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

/**
 * Toast — اعلان کوتاه (الگوی پروتوتایپ: پایین صفحه، z=100، محو خودکار).
 * useToast().show({ text, kind }) · kind: info | success | error
 */
export type ToastKind = "info" | "success" | "error";
export interface ToastOptions {
  text: string;
  kind?: ToastKind;
  /** میلی‌ثانیه — پیش‌فرض 2600 */
  duration?: number;
}

interface ToastContextValue {
  show: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const KIND_STYLE: Record<ToastKind, { cls: string; icon: IconName }> = {
  info: { cls: "bg-text text-white", icon: "info" },
  success: { cls: "bg-green text-white", icon: "check" },
  error: { cls: "bg-red text-white", icon: "info" },
};

interface ToastItem extends Required<Pick<ToastOptions, "text" | "kind">> {
  id: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const show = useCallback(({ text, kind = "info", duration = 2600 }: ToastOptions) => {
    const id = ++seq.current;
    setItems((list) => [...list.slice(-2), { id, text, kind }]);
    window.setTimeout(() => {
      setItems((list) => list.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastPortals items={items} />
    </ToastContext.Provider>
  );
}

function ToastPortals({ items }: { items: ToastItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || items.length === 0) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex max-w-sm items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-bold shadow-card",
            KIND_STYLE[t.kind].cls
          )}
        >
          <Icon name={KIND_STYLE[t.kind].icon} size={17} />
          <span className="leading-5">{t.text}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}
