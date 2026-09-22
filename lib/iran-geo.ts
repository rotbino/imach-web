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
 * چند استان یک نام شهر را دارند؟ — برای دو قانونِ دراپ‌داون شهر:
 * ۱) جست‌وجو فقط روی «نام شهر» است؛ تایپِ «همدان» فقط خودِ همدان را می‌آورد،
 *    نه بقیه‌ی شهرهای استان همدان (ملایر، نهاوند، …).
 * ۲) استان فقط وقتی در سطر نشان داده می‌شود که نام شهر تکراری باشد
 *    (مثلا دو «صالح‌آباد»: ایلام و تهران) — وگرنه سطر فقط نام شهر است
 *    و استان کلا پشت‌صحنه ست می‌شود.
 */
const CITY_NAME_PROVINCE_COUNT: ReadonlyMap<string, number> = (() => {
  const m = new Map<string, number>();
  for (const p of IRAN_PROVINCES)
    for (const c of p.cities) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
})();

/**
 * آیتم‌های دراپ‌داون سرچ‌دارِ شهر — ظاهر همان SearchSelect همیشگی.
 * • سطرِ عادی: فقط نام شهر — نه hint، نه keyword استان (جست‌وجوی صرفاً شهری).
 * • سطرِ شهرِ هم‌نام: «شهر · استان» + searchValue یکتا (شهر و استان) تا هم
 *   از هم تفکیک شوند و هم ناوبری کیبورد cmdk بین دو سطر هم‌متن گم نشود.
 * hint در onPick به فرم برمی‌گردد تا استانِ دقیقِ همان سطر ست شود؛
 * برای شهر یکتا فرم از provinceOfCity پشت‌صحنه پر می‌کند.
 */
export const iranCityItems: SearchSelectItem[] = IRAN_PROVINCES.flatMap((p) =>
  p.cities.map((city) => {
    const duplicated = (CITY_NAME_PROVINCE_COUNT.get(city) ?? 1) > 1;
    return duplicated
      ? {
          value: city,
          label: city,
          hint: p.province,
          searchValue: `${city} ${p.province}`,
          // شهر هم‌نام در دو استان — id و searchValue هر دو یکتا
          id: `${p.province}:${city}`,
        }
      : {
          value: city,
          label: city,
          // بدون hint و keyword — جست‌وجو فقط نام شهر را می‌بیند
          id: `${p.province}:${city}`,
        };
  })
);
