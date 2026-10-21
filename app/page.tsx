import Link from "next/link";
import { LandingLangButtons } from "./lang-buttons";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * `/` — اسکلت لندینگ M0 (ظاهر کامل: فاز M1 بر اساس 01-landing پروتوتایپ).
 * دکمه‌های زبان = نمایشی (D2): فارسی فعال · en/ar → توست «به‌زودی».
 */
export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col px-5 py-6 lg:px-14 lg:py-10">
      {/* هدر مینیمال: لوگو + دکمه‌های زبانِ نمایشی */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-[17px] font-black text-white">
            i
          </div>
          <span className="text-[19px] font-black text-text">آی‌مچ</span>
        </div>
        <LandingLangButtons />
      </header>

      {/* هیرو */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-14 text-center lg:py-20">
        <h1 className="max-w-2xl text-[26px] font-black leading-[1.5] text-text lg:text-[34px]">
          تطبیق نیازهای خریدار عمده
          <br />
          با تامین‌کنندگان مناسب
        </h1>
        <p className="max-w-xl text-[14px] leading-7 text-text-2 lg:text-[15.5px]">
          کاتالوک عمدهٔ فروشندهٔ خودت را بساز، لیست خرید داشته باش، استعلام چندقلمی بفرست و
          بهترین پیشنهادها را مقایسه کن — همه در یک اپ.
        </p>
        <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href="/start"
            className="inline-flex h-[52px] items-center justify-center rounded-lg bg-primary px-6 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-primary-strong"
          >
            ساخت حساب جدید
          </Link>
          <Link
            href="/login"
            className="inline-flex h-[52px] items-center justify-center rounded-lg border border-line-2 bg-surface px-6 text-[15px] font-bold text-text transition-colors hover:border-line-3"
          >
            ورود
          </Link>
        </div>

        {/* دو کارت ویژگی (اسکلت — کامل در M1) */}
        <div className="mt-4 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="store"
            title="کاتالوک فروشنده"
            text="قیمت، بسته‌بندی و موجودی کالاهایت — دیده‌شده توسط خریداران واقعی."
          />
          <FeatureCard
            icon="basket"
            title="لیست خرید"
            text="خریدار عمده باش: نیازهایت را دنبال کن و از چند تامین‌کننده یکجا استعلام بگیر."
          />
        </div>
      </main>

      <footer className="border-t border-line pt-5 text-center text-[12px] text-text-4">
        iMach — بازار عمدهٔ واقعی
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-line bg-surface p-5 text-start">
      <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-strong">
        <Icon name={icon} size={22} />
      </div>
      <div>
        <p className="text-[14.5px] font-bold text-text">{title}</p>
        <p className="mt-1 text-[12.5px] leading-5 text-text-3">{text}</p>
      </div>
    </div>
  );
}
