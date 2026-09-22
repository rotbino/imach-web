// ─── جغرافیای ایران: شهر ↔ استان ─────────────────────────────────────────────
// داده از lacal-data/Iran-provice.ts می‌آید؛ این ماژول فقط لایه‌ی خواندنیِ
// روی آن است. قانون مهم: استان هرگز به کاربر نشان داده نمی‌شود و در هیچ
// مدلی از دیتابیس نمی‌رود — پشت‌صحنه از روی شهر ست می‌شود و بعداً در فرمول
// تطابق (اگر در شهر چیزی نبود، جست‌وجو در استان گسترده شود) عامل سورت است.
// از روی نام شهرِ ذخیره‌شده همیشه می‌شود استان را دوباره ساخت: provinceOfCity.

import { IRAN_PROVINCES } from "../lacal-data/Iran-provice";
import type { SearchSelectItem } from "@/components/search-select";

export interface IranCityRef {
  city: string;
  province: string;
}

/** همه‌ی شهرهای ایران به‌صورت تخت — هر سطر با استانش */
export const IRAN_CITIES: IranCityRef[] = IRAN_PROVINCES.flatMap((p) =>
  p.cities.map((city) => ({ city, province: p.province }))
);

/** استانِ یک شهر — اولین تطابق؛ برای شهرهای هم‌نام، استانِ معروف‌تر جلوتر است */
export const provinceOfCity = (city: string | null | undefined): string | null =>
  IRAN_CITIES.find((c) => c.city === city)?.province ?? null;

/**
 * آیتم‌های دراپ‌داون سرچ‌دارِ شهر — ظاهر همان SearchSelect همیشگی:
 * برچسب = نام شهر، متن کمکی دومینگ = استان، کلیدواژه‌ها = استان
 * (تایپِ نام استان هم شهرهایش را می‌آورد — بدون هیچ کمبوی جدا).
 * hint در onPick به فرم برمی‌گردد تا استانِ دقیقِ همان سطر ست شود.
 */
export const iranCityItems: SearchSelectItem[] = IRAN_PROVINCES.flatMap((p) =>
  p.cities.map((city) => ({
    value: city,
    label: city,
    hint: p.province,
    keywords: [p.province],
    // شهر هم‌نام در دو استان ممکن است — id یکتا برای کلید رندر
    id: `${p.province}:${city}`,
  }))
);
