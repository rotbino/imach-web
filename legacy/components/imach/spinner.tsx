/**
 * Spinner — نشانگر بارگذاری سیستم‌ساز (CSS-only).
 * از آیکون‌های Prototype جدا است (حالت loading در Prototype وجود ندارد)؛
 * رنگ از currentColor می‌گیرد تا روی هر دکمه/متن‌ی درست بنشیند.
 */

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="ia-spin"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
