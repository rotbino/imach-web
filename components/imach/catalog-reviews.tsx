"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Spinner, EmptyState } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { reviewsApi, type CatalogReviewDto } from "@/lib/api";
import { num, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * نظرات و امتیاز کاتالوگ عمومی (M10 · N2/S3 · الگوی شیت نظرات پروتوتایپ فاز ۲۹/۳۰):
 *
 * · خلاصهٔ امتیاز (میانگین + تعداد) در هدر ویترین؛ لمس = شیت نظرات.
 * · ریز نظرات: نام کسب‌وکار نویسنده + ستاره‌های همان نظر + متن + پاسخ
 *   عمومی فروشنده با نشان سبز «فروشنده».
 * · خریدارِ واردشده: فرم ثبت/ویرایش نظر (ستاره‌سِلکت ۱-۵ + متن) — یک نظر
 *   به ازای هر کاتالوگ (upsert سرویس‌سوی).
 * · مالک کاتالوگ: پاسخ زیر هر نظر خودش.
 * · مهمان: دعوت به ورود (نظر دادن به اعتماد عمومی چسبیده است).
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export function StarsRow({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[2px]" aria-label={`${num(value, "fa")} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          className={i <= Math.round(value) ? "text-amber" : "text-line-2"}
        />
      ))}
    </span>
  );
}

/** دکمهٔ امتیاز هدر ویترین — میانگین + ستاره‌ها + شمار */
export function CatalogRatingChip({ avg, count, onClick }: { avg: number; count: number; onClick: () => void }) {
  if (!count) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:bg-primary-soft"
      >
        <Icon name="comment" size={13} />
        نظرات
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:bg-primary-soft"
      aria-label={`امتیاز کاتالوک ${num(avg, "fa")} از ۵ با ${num(count, "fa")} نظر`}
    >
      <b className="text-[12px] text-text">{num(avg, "fa")}</b>
      <StarsRow value={avg} size={11} />
      <span className="text-text-4">({num(count, "fa")})</span>
    </button>
  );
}

export function CatalogReviews({
  slug,
  businessId,
  businessName,
  open,
  onClose,
}: {
  slug: string;
  businessId: string;
  businessName: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const status = useAuthStore((s) => s.status);
  const businesses = useAuthStore((s) => s.businesses);
  const isOwn = status === "authed" && businesses.some((b) => b.slug === slug);

  const revQ = useQuery({
    queryKey: ["reviews", businessId],
    queryFn: () => reviewsApi.list(businessId),
    enabled: open,
  });

  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const data = revQ.data;

  // فرم را با نظر موجود بیننده پر کن (upsert = ویرایش همان ردیف)
  const mine = data?.mine ?? null;
  useEffect(() => {
    if (mine) {
      setMyRating(mine.rating);
      setMyText(mine.text ?? "");
    }
  }, [mine]);

  const submit = async () => {
    if (myRating < 1) return;
    setBusy(true);
    try {
      await reviewsApi.submit(businessId, myRating, myText.trim() || null);
      show({ text: "نظر شما ثبت شد — ممنون که تجربه‌تان را به اشتراک گذاشتید.", kind: "success" });
      void qc.invalidateQueries({ queryKey: ["reviews", businessId] });
      void qc.invalidateQueries({ queryKey: ["bizctx", slug] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ثبت نظر نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setBusy(true);
    try {
      await reviewsApi.reply(reviewId, replyText.trim());
      show({ text: "پاسخ شما زیر نظر نشست.", kind: "success" });
      setReplyFor(null);
      setReplyText("");
      void qc.invalidateQueries({ queryKey: ["reviews", businessId] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "پاسخ ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`نظرات ${businessName}`} maxHeightClass="max-h-[88dvh]">
      <div className="flex flex-col gap-4 py-1">
        {/* خلاصهٔ امتیاز */}
        {data && data.count > 0 && (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2/60 px-4 py-3">
            <b className="text-[22px] font-black text-text">{num(data.avg, locale)}</b>
            <div className="flex flex-col">
              <StarsRow value={data.avg} size={14} />
              <span className="mt-0.5 text-[11px] font-bold text-text-3">
                از {num(data.count, locale)} نظر خریداران
              </span>
            </div>
          </div>
        )}

        {revQ.isLoading ? (
          <div className="grid place-items-center py-10">
            <Spinner />
          </div>
        ) : (
          <>
            {/* ریز نظرات */}
            <div className="flex flex-col gap-2.5">
              {(data?.items ?? []).length === 0 && (
                <EmptyState
                  icon={<Icon name="comment" size={28} />}
                  title="هنوز نظری ثبت نشده"
                  subtitle="خریداران این کاتالوگ می‌توانند امتیاز و تجربهٔ خریدشان را بنویسند."
                />
              )}
              {(data?.items ?? []).map((r) => (
                <ReviewRow
                  key={r.id}
                  r={r}
                  locale={locale}
                  isOwner={isOwn}
                  replyFor={replyFor}
                  onReplyOpen={() => {
                    setReplyFor(replyFor === r.id ? null : r.id);
                    setReplyText(r.reply ?? "");
                  }}
                  replyText={replyText}
                  onReplyText={setReplyText}
                  busy={busy}
                  onReplySend={() => void sendReply(r.id)}
                />
              ))}
            </div>

            {/* فرم ثبت/ویرایش نظر خریدار — فقط غیرِمالکِ واردشده */}
            {status === "authed" && !isOwn && (
              <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                <b className="text-[13.5px] font-bold text-text">
                  {data?.mine ? "نظر شما (قابل ویرایش)" : "ثبت نظر شما دربارهٔ این کاتالوگ"}
                </b>
                <StarSelect value={myRating} onChange={setMyRating} />
                <Field label="تجربهٔ شما (اختیاری)">
                  {(id) => (
                    <Textarea
                      id={id}
                      rows={3}
                      value={myText}
                      onChange={(e) => setMyText(e.target.value)}
                      placeholder="قیمت‌ها، سفارش، پاسخ‌گویی فروشنده — چیزی که خریدار بعدی به آن نیاز دارد."
                    />
                  )}
                </Field>
                <Button variant="arm" size="lg" loading={busy} disabled={myRating < 1} onClick={() => void submit()}>
                  <Icon name="send" size={15} />
                  {data?.mine ? "به‌روزرسانی نظر" : "ثبت نظر"}
                </Button>
              </div>
            )}

            {/* مهمان — دعوت به ورود */}
            {status !== "authed" && (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-3.5 text-start transition-colors hover:border-line-2"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
                  <Icon name="login" size={17} />
                </span>
                <span className="flex-1">
                  <b className="block text-[13px] font-bold text-text">نظرتان را دربارهٔ این کاتالوک بنویسید</b>
                  <span className="text-[11.5px] text-text-3">با ورود به آیمچ، امتیاز و تجربه‌تان را ثبت کنید.</span>
                </span>
                <Icon name="chev" size={15} className="text-text-4 rtl:-scale-x-100" />
              </button>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

function ReviewRow({
  r,
  locale,
  isOwner,
  replyFor,
  onReplyOpen,
  replyText,
  onReplyText,
  busy,
  onReplySend,
}: {
  r: CatalogReviewDto;
  locale: string;
  isOwner: boolean;
  replyFor: string | null;
  onReplyOpen: () => void;
  replyText: string;
  onReplyText: (v: string) => void;
  busy: boolean;
  onReplySend: () => void;
}) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-black text-text-4">
            {(r.authorName || "؟").slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-[12.5px] font-bold text-text">
              {r.authorName}
              {r.authorVerified && <Icon name="verified" size={12} className="shrink-0 text-primary" />}
            </p>
            <span className="text-[10.5px] text-text-4">{timeAgo(r.createdAt)}</span>
          </div>
        </div>
        <StarsRow value={r.rating} size={12} />
      </div>
      {r.text && <p className="mt-2 text-[12.5px] leading-6 text-text-2">{r.text}</p>}

      {/* پاسخ فروشنده — زیرنویس سبز (الگوی فاز ۳۰) */}
      {r.reply && (
        <div className="mt-2 rounded-xl bg-green-soft/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-black text-green">
            <Icon name="store" size={12} />
            پاسخ فروشنده
          </p>
          <p className="mt-1 text-[12px] leading-6 text-text-2">{r.reply}</p>
        </div>
      )}

      {/* مالک: پاسخ/ویرایش پاسخ */}
      {isOwner && (
        <div className="mt-2">
          {replyFor === r.id ? (
            <div className="flex flex-col gap-2">
              <Textarea
                rows={2}
                value={replyText}
                onChange={(e) => onReplyText(e.target.value)}
                placeholder="پاسخ عمومی شما زیر همین نظر نشان داده می‌شود…"
              />
              <div className="flex gap-2">
                <Button variant="arm" size="sm" loading={busy} disabled={!replyText.trim()} onClick={onReplySend}>
                  <Icon name="send" size={13} />
                  ثبت پاسخ
                </Button>
                <Button variant="ghost" size="sm" onClick={onReplyOpen}>
                  انصراف
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onReplyOpen}
              className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[11.5px] font-bold text-text-2 transition-colors hover:bg-primary-soft"
            >
              <Icon name="msg" size={12} />
              {r.reply ? "ویرایش پاسخ" : "پاسخ"}
            </button>
          )}
        </div>
      )}
      {/* شمار کمکی برای aria بدون نمایش زائد */}
      <span className="sr-only">امتیاز {num(r.rating, locale)} از ۵</span>
    </article>
  );
}

/** ستاره‌سِلکت ۱-۵ (چپ‌به-راست مثل پروتوتایپ؛ RTL فقط جهت دکمه‌ها را می‌چرخاند) */
export function StarSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="امتیاز شما">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${num(i, "fa")} ستاره`}
          onClick={() => onChange(i)}
          className={cn(
            "grid size-11 place-items-center rounded-xl transition-all active:scale-95",
            i <= value ? "bg-amber-soft" : "bg-surface-2"
          )}
        >
          <Icon name="star" size={21} className={i <= value ? "text-amber" : "text-line-2"} />
        </button>
      ))}
      {value > 0 && (
        <span className="ms-1 text-[12px] font-bold text-text-3">
          {num(value, "fa")} از ۵
        </span>
      )}
    </div>
  );
}

/** نشان امتیاز + شیت نظرات — نقطهٔ ورود سرور-صفحه (server page) به این خوشه */
export function CatalogReviewsEntry({
  slug,
  businessId,
  businessName,
  avg,
  count,
}: {
  slug: string;
  businessId: string;
  businessName: string;
  avg: number;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CatalogRatingChip avg={avg} count={count} onClick={() => setOpen(true)} />
      <CatalogReviews
        slug={slug}
        businessId={businessId}
        businessName={businessName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
