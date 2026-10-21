"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

/**
 * `/demo` — هاب QA اجزای M0 (الگوی demo-hub قدیمی).
 * هر جزء جدید در فازهای بعد اینجا یک نمونه می‌گیرد تا QA بصری یک‌جا باشد.
 */
export default function DemoPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { show } = useToast();
  const [val, setVal] = useState("");

  return (
    <div data-arm="sell" className="mx-auto w-full max-w-[880px] px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-[18px] font-black text-text">دموی اجزای UI — M0</h1>

      <section className="mb-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-[13.5px] font-bold text-text-2">دکمه‌ها</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>دکمهٔ بازو</Button>
          <Button variant="soft">نرم</Button>
          <Button variant="outline">قاب‌دار</Button>
          <Button variant="ghost">متن‌محور</Button>
          <Button variant="danger">حذف</Button>
          <Button loading>در حال انجام</Button>
          <Button disabled>غیرفعال</Button>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-[13.5px] font-bold text-text-2">فرم</h2>
        <div className="flex flex-col gap-4">
          <Field label="نام کالا" hint="مثال: برنج هاشمی گلستان">
            {(id) => <Input id={id} value={val} onChange={(e) => setVal(e.target.value)} placeholder="بنویس…" />}
          </Field>
          <Field label="توضیحات فروشنده" error="این فیلد در نسخهٔ دمو اجباری است">
            {(id) => <Textarea id={id} placeholder="توضیح کوتاه…" />}
          </Field>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-[13.5px] font-bold text-text-2">شیت + توست + بازخورد</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="soft" onClick={() => setSheetOpen(true)}>
            باز کردن شیت
          </Button>
          <Button
            variant="outline"
            onClick={() => show({ text: "ذخیره شد", kind: "success" })}
          >
            توست موفق
          </Button>
          <Button variant="outline" onClick={() => show({ text: "خطایی رخ داد", kind: "error" })}>
            توست خطا
          </Button>
          <Button variant="ghost" onClick={() => show({ text: "به‌زودی", kind: "info" })}>
            توست اطلاع
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Spinner className="text-arm" />
          <EmptyState
            icon={<Icon name="inbox" size={24} />}
            title="هنوز چیزی اینجا نیست"
            subtitle="حالت خالی استاندارد"
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-[13.5px] font-bold text-text-2">پوستهٔ بازو</h2>
        <div className="flex flex-wrap gap-3">
          <div data-arm="sell" className="rounded-lg bg-surface-2 p-3">
            <Button size="sm">فروش (نارنجی)</Button>
          </div>
          <div data-arm="buy" className="rounded-lg bg-surface-2 p-3">
            <Button size="sm">خرید (سنگی)</Button>
          </div>
          <div data-arm="keep" className="rounded-lg bg-surface-2 p-3">
            <Button size="sm">نماینده (فیروزه‌ای)</Button>
          </div>
        </div>
      </section>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="شیت نمونه">
        <div className="flex flex-col gap-3 py-1">
          <p className="text-[13.5px] leading-6 text-text-2">
            این شیت در موبایل از پایین باز می‌شود (قانون پروتوتایپ) و در دسکتاپ به‌صورت مودال وسچ
            نمایش داده می‌شود.
          </p>
          <Button block onClick={() => setSheetOpen(false)}>
            فهمیدم
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
