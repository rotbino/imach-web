"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/i18n/locale-context";
import { socialApi, type TestimonialDto } from "@/lib/api";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * نظرات عمومی ویترین (M10 · N4 · فاز ۳۳ الگو):
 *
 * · نوار «نظر خریداران» لندینگ — ردیف افقی کارت‌ها + «سایر نظرات» → /reviews
 * · دیالوگ ثبت نظر (dlg-rvw): نام/کسب‌وکار/نقش/متن — مهمان هم می‌فرستد؛
 *   نمایش فقط پس از تأیید ادمین (P-2).
 * · کارت: چیپ قابلیت + آواتار + نام/کسب‌وکار + متن + نقش.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export function TestimonialCard({ t, fresh, full }: { t: TestimonialDto; fresh?: boolean; full?: boolean }) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border p-3.5",
        full ? "w-full" : "w-[260px] shrink-0 lg:w-[300px]",
        fresh ? "border-green/40 bg-green-soft/30" : "border-line bg-surface"
      )}
    >
      {t.feature && (
        <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-lg bg-accent px-2 py-0.5 text-[9px] font-black text-primary-strong">
          <Icon name="sparkles" size={10} />
          {t.feature}
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white",
            t.isBuyer ? "bg-stone" : "bg-primary"
          )}
        >
          {(t.name || "؟").slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-bold leading-relaxed text-text">{t.name}</p>
          <p className="truncate text-[10.5px] text-text-3">{t.business}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-6 text-[11.5px] leading-6 text-text-2">{t.text}</p>
      <span className="mt-auto pt-2 text-[9.5px] font-bold text-text-4">
        {t.isBuyer ? "خریدار عمده" : "فروشنده عمده"} در آیمچ
      </span>
    </article>
  );
}

/** نوار «نظر خریداران» لندینگ — کارت‌های تأییدشده + سایر نظرات + ثبت نظر */
export function LandingTestimonials() {
  // NOTE M10: واکشی مستقیم (نه react-query) — در لندینگِ سرور-رندر، ناظرِ
  // react-query داده را می‌گرفت (queryFn کامل می‌شد) اما رندر به‌روز
  // نمی‌شد؛ رفتار دیده‌شده فقط در این صفحه بود (بقیهٔ اپ react-query سالم
  // است — زنگوله‌ها/نظرات/…). ویجتِ کوچک عمومی = ساده‌ترین ابزار درست است.
  const [rows, setRows] = useState<TestimonialDto[] | null>(null);
  useEffect(() => {
    let alive = true;
    socialApi
      .testimonials()
      .then((d) => {
        if (alive) setRows(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const [open, setOpen] = useState(false);
  if (!rows || rows.length === 0) return null;

  return (
    <section className="flex flex-col rounded-[24px] border border-line bg-surface px-5 py-6 max-lg:gap-3 lg:col-span-2 lg:px-8 lg:py-8">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-text lg:text-[17px] lg:font-extrabold">نظر خریداران</h2>
        <Link
          href="/reviews"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-primary-strong"
        >
          سایر نظرات
          <Icon name="chev" size={11} className="rtl:-scale-x-100" />
        </Link>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 lg:gap-3">
        {rows.slice(0, 6).map((t) => (
          <TestimonialCard key={t.id} t={t} />
        ))}
      </div>

      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-[10.5px] leading-5 text-text-4">
          {num(rows.length, "fa")} نظر تأییدشده — تجربهٔ واقعی خریداران و فروشندگان عمده از آیمچ.
        </p>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
          <Icon name="comment" size={13} />
          ثبت نظر شما
        </Button>
      </div>

      <TestimonialDialog open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

/** دیالوگ ثبت نظر عمومی — مهمان هم می‌فرستد؛ در صف تأیید ادمین می‌نشیند (P-2) */
export function TestimonialDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { show } = useToast();
  const [name, setName] = useState("");
  const [biz, setBiz] = useState("");
  const [role, setRole] = useState<"sell" | "buy">("sell");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!name.trim() || !biz.trim() || !text.trim()) {
      setErr("نام، کسب‌وکار و متن نظر را کامل کنید");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await socialApi.submitTestimonial({
        name: name.trim(),
        business: biz.trim(),
        isBuyer: role === "buy",
        text: text.trim(),
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ثبت نشد — دوباره تلاش کنید");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    onClose();
    // ریستِ دیرهنگام تا نمای موفقیت فوری دیده نشود
    setTimeout(() => {
      setDone(false);
      setErr(null);
    }, 350);
  };

  return (
    <Sheet open={open} onClose={close} title="ثبت نظر شما">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-5 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-green-soft text-green">
            <Icon name="check" size={30} />
          </span>
          <b className="text-[15px] font-black text-text">نظر شما ثبت شد</b>
          <p className="max-w-[320px] text-[12px] leading-6 text-text-3">
            نظرها پیش از نمایش عمومی توسط تیم آیمچ بررسی می‌شوند؛ پس از تأیید، نام کسب‌وکار شما هم بین
            خریداران دیده می‌شود.
          </p>
          <Button variant="arm" block onClick={close}>
            باشه، ممنون
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 py-1">
          <p className="text-[12px] leading-6 text-text-2">
            آیمچ چه کمکی به کسب‌وکار شما کرده؟ نظر شما با نام و کسب‌وکارتان برای همه نمایش داده می‌شود —
            هم دیگران می‌دانند آیمچ چه می‌کند، هم کسب‌وکار شما دیده می‌شود.
          </p>
          <Field label="نام و نام خانوادگی" required>
            {(id) => (
              <Input
                id={id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: رضا کریمی"
                maxLength={60}
              />
            )}
          </Field>
          <Field label="کسب‌وکار شما" required>
            {(id) => (
              <Input
                id={id}
                value={biz}
                onChange={(e) => setBiz(e.target.value)}
                placeholder="مثلاً: تولیدکننده محصولات شوینده"
                maxLength={80}
              />
            )}
          </Field>
          <Field label="شما در آیمچ">{(_: string) => (
            <div className="flex gap-2">
              {(
                [
                  { k: "sell", t: "فروشنده / تأمین‌کننده‌ام" },
                  { k: "buy", t: "خریدارم" },
                ] as const
              ).map((o) => (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => setRole(o.k)}
                  aria-pressed={role === o.k}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-[12px] font-bold transition-colors",
                    role === o.k ? "border-arm bg-arm-soft/40 text-arm-strong" : "border-line bg-surface text-text-2"
                  )}
                >
                  {o.t}
                </button>
              ))}
            </div>
          )}</Field>
          <Field label="نظر شما" required>
            {(id) => (
              <Textarea
                id={id}
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="آیمچ چه کمکی به کار شما کرده؟"
                maxLength={600}
              />
            )}
          </Field>
          {err && <p className="text-[12px] font-bold text-red">{err}</p>}
          <Button variant="arm" size="lg" loading={busy} onClick={() => void submit()}>
            <Icon name="send" size={15} />
            ثبت نظر
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/** صفحهٔ «سایر نظرات» — فهرست کامل + دکمهٔ ثبت */
export function ReviewsPageList({ initial }: { initial: TestimonialDto[] }) {
  const tsQ = useQuery({
    queryKey: ["testimonials", "public"],
    queryFn: () => socialApi.testimonials(),
    initialData: initial.length ? initial : undefined,
    staleTime: 60_000,
  });
  const [open, setOpen] = useState(false);
  const rows = tsQ.data ?? [];

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {rows.map((t) => (
          <TestimonialCard key={t.id} t={t} fresh full />
        ))}
        {rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-10 text-center text-[13px] text-text-3">
            هنوز نظری تأیید نشده است.
          </p>
        )}
      </div>

      {/* دعوت به ثبت نظر — کارت آخر نوار (الگوی gd-ask) */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-surface-2/50 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
          <Icon name="info" size={17} />
        </span>
        <p className="text-[12px] leading-6 text-text-2">
          اگر آیمچ به کسب‌وکار شما هم کمک کرده، نظرتان را ثبت کنید تا دیگران هم بدانند آیمچ چه کمکی
          می‌کند — و نام کسب‌وکار شما هم بین خریداران دیده شود.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur-md lg:static lg:mt-5 lg:rounded-2xl lg:border lg:p-0 lg:shadow-[0_10px_40px_rgba(31,29,26,.12)]">
        <Button variant="arm" size="lg" block onClick={() => setOpen(true)}>
          <Icon name="comment" size={16} />
          ثبت نظر شما
        </Button>
      </div>

      <TestimonialDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
