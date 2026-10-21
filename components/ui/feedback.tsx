import { cn } from "@/lib/utils";

/** Spinner — بارگذاری (سازگار با رنگ متن والد). */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="در حال بارگذاری"
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-current/25 border-t-current",
        className
      )}
    />
  );
}

/** EmptyState — حالت خالی (الگوی پروتوتایپ: آیکون + جمله + زیرمتن). */
export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-8 py-12 text-center">
      {icon && <div className="mb-1 grid size-14 place-items-center rounded-full bg-surface-2 text-text-3">{icon}</div>}
      <p className="text-[14.5px] font-bold text-text-2">{title}</p>
      {subtitle && <p className="max-w-60 text-[12.5px] leading-5 text-text-3">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
