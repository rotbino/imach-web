"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { SmartImage } from "@/components/imach/smart-image";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { socialApi, type FeedbackPostDto, type VideoLessonDto } from "@/lib/api";
import { num, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * راهنمای دستیارها + بازخورد و پرسش‌وپاسخ + فیلم‌های آموزشی
 * (M10 · N3 · سند ۰۵ §۳۷/۳۸/۴۰/۴۱ · فاز ۳۲ الگو).
 *
 * · صفحهٔ راهنما (۶۰/۶۱ الگو): کارت سرآغاز + ردیف‌های شماره‌دار + یادداشت پایانی.
 * · نوار فیلم‌های آموزشی (VideoLesson): پوستر + مدت + «در این فیلم می‌بینید»
 *   در شیت — بارگذاری ویدیوی واقعی فاز محتوایی است (سند ۰۳ §۴.۶).
 * · بازخورد کاربران (FEEDBACK): لایک + پاسخ تورفته.
 * · پرسش و پاسخ (QUESTION): پرسش + پاسخ تیم آیمچ/کاربران.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export interface GuideRow {
  t: string;
  s: string;
}

export function AssistantGuide({
  arm,
  leadTitle,
  leadText,
  leadIcon,
  rows,
  legend,
}: {
  arm: "BUY" | "SELL";
  leadTitle: string;
  leadText: string;
  leadIcon: "basket" | "store";
  rows: GuideRow[];
  legend: string;
}) {
  const digits = ["۱", "۲", "۳", "۴", "۵", "۶", "۷"];
  return (
    <div className="flex flex-col gap-5">
      {/* سرآغاز */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-5">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl text-white",
            arm === "BUY" ? "bg-stone" : "bg-primary"
          )}
        >
          <Icon name={leadIcon} size={22} />
        </span>
        <div className="min-w-0">
          <b className="block text-[15px] font-black text-text">{leadTitle}</b>
          <p className="mt-1 text-[12.5px] leading-7 text-text-2">{leadText}</p>
        </div>
      </div>

      {/* گام‌ها */}
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={r.t} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-[9px] text-[12px] font-black",
                arm === "BUY" ? "bg-stone-tint text-stone" : "bg-primary-soft text-primary-strong"
              )}
            >
              {digits[i] ?? i + 1}
            </span>
            <div className="min-w-0">
              <b className="block text-[13.5px] font-bold text-text">{r.t}</b>
              <p className="mt-1 text-[12px] leading-7 text-text-3">{r.s}</p>
            </div>
          </div>
        ))}
      </div>

      {/* فیلم‌های آموزشی */}
      <VideoLessonsBand arm={arm} />

      {/* بازخورد + پرسش و پاسخ */}
      <FeedbackSection arm={arm} />

      {/* یادداشت پایانی */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-surface-2/60 p-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-text-3">
          <Icon name="info" size={16} />
        </span>
        <p className="text-[11.5px] leading-6 text-text-3">{legend}</p>
      </div>
    </div>
  );
}

/* ═══ فیلم‌های آموزشی (شیت پخش — الگوی فاز ۳۲) ═══ */

function VideoLessonsBand({ arm }: { arm: "BUY" | "SELL" }) {
  const { locale } = useLocale();
  const { show } = useToast();
  const q = useQuery({
    queryKey: ["video-lessons", arm],
    queryFn: () => socialApi.videoLessons(arm),
    staleTime: 10 * 60_000,
  });
  const [lesson, setLesson] = useState<VideoLessonDto | null>(null);
  const rows = q.data ?? [];
  if (rows.length === 0) return null;

  const fmtDur = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${num(m, locale)}:${num(r, locale).padStart(2, "۰")}`;
  };

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="flex items-center gap-2 px-1 text-[13.5px] font-bold text-text">
        <Icon name="chart" size={15} className="text-text-3" />
        فیلم‌های آموزشی
        <span className="text-[11px] font-bold text-text-4">{num(rows.length, locale)} فیلم</span>
      </h2>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {rows.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLesson(l)}
            className="flex w-[218px] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface text-start transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.07)]"
          >
            <span className="relative block aspect-video bg-[#101828]">
              <SmartImage
                src={l.posterUrl}
                alt={l.title}
                sizes="218px"
                className="size-full object-top opacity-90"
              />
              <span className="absolute inset-0 grid place-items-center bg-text/25">
                <span className="grid size-[46px] place-items-center rounded-full bg-white shadow-[0_6px_18px_rgba(15,23,42,.35)]">
                  <Icon name="chev" size={18} className="rotate-[-90deg] text-primary-strong" />
                </span>
              </span>
              <span className="absolute end-2 top-2 rounded-md bg-text/70 px-1.5 py-0.5 text-[9.5px] font-bold text-white">
                {fmtDur(l.durationS)}
              </span>
            </span>
            <b className="line-clamp-1 px-3 pt-2 text-[12.5px] font-bold text-text">{l.title}</b>
            <span className="line-clamp-1 px-3 pb-2.5 pt-0.5 text-[10.5px] text-text-4">
              {l.bullets[0] ?? "آموزش گام‌به‌گام"}
            </span>
          </button>
        ))}
      </div>

      {/* شیت پخش */}
      <Sheet open={!!lesson} onClose={() => setLesson(null)} title={lesson?.title ?? ""}>
        {lesson && (
          <div className="flex flex-col gap-3 py-1">
            <div className="relative overflow-hidden rounded-2xl border border-line bg-[#101828]">
              {/* eslint-disable-next-line @next/next/no-img-element -- پوستر استاتیک */}
              <img
                src={lesson.posterUrl}
                alt={lesson.title}
                className="aspect-video w-full object-cover object-top"
              />
              <div className="absolute inset-0 grid place-items-center bg-text/25">
                <button
                  type="button"
                  aria-label={`پخش ${lesson.title}`}
                  onClick={() =>
                    show({
                      text: "ویدیوی آموزشی به‌زودی در دسترس قرار می‌گیرد — فعلاً همین بخش‌های سیستم را ببینید.",
                      kind: "info",
                    })
                  }
                  className="grid size-[54px] place-items-center rounded-full bg-white shadow-[0_6px_18px_rgba(15,23,42,.35)] transition-transform active:scale-95"
                >
                  <Icon name="chev" size={22} className="rotate-[-90deg] text-primary-strong" />
                </button>
              </div>
              <span className="absolute end-2.5 top-2.5 rounded-md bg-text/70 px-2 py-0.5 text-[10px] font-bold text-white">
                {fmtDur(lesson.durationS)}
              </span>
            </div>
            <div>
              <b className="text-[12.5px] font-bold text-text">در این فیلم می‌بینید</b>
              <ul className="mt-1.5 flex flex-col gap-1">
                {lesson.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[11.5px] leading-6 text-text-2">
                    <Icon name="check" size={12} className="mt-1.5 shrink-0 text-green" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  );
}

/* ═══ بازخورد و پرسش‌وپاسخ (FeedbackPost · N3) ═══ */

function FeedbackSection({ arm }: { arm: "BUY" | "SELL" }) {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();
  const fbQ = useQuery({
    queryKey: ["feedback", "FEEDBACK", arm],
    queryFn: () => socialApi.feedback("FEEDBACK", arm),
    staleTime: 60_000,
  });
  const qaQ = useQuery({
    queryKey: ["feedback", "QUESTION", arm],
    queryFn: () => socialApi.feedback("QUESTION", arm),
    staleTime: 60_000,
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 px-1 text-[13.5px] font-bold text-text">
        <Icon name="comment" size={15} className="text-text-3" />
        بازخورد و پرسش‌وپاسخ
      </h2>
      <p className="px-1 text-[11.5px] leading-6 text-text-3">
        تجربه‌های واقعی کاربران از این دستیار و پاسخ‌های تیم آیمچ — پرسش‌تان را بپرسید یا تجربه‌تان را
        بنویسید تا دیگران هم ببینند.
      </p>
      {/* تجربه‌های کاربران: فهرست + فرم «تجربهٔ تازه بنویسید…» */}
      <FeedbackList kind="FEEDBACK" arm={arm} rows={fbQ.data ?? []} loading={fbQ.isLoading} />
      <FeedbackAsk kind="FEEDBACK" arm={arm} authed={status === "authed"} onLogin={() => router.push("/login")} />

      {/* پرسش و پاسخ: فرم «پرسش تازه بپرسید…» + فهرست پرسش‌ها */}
      <FeedbackAsk kind="QUESTION" arm={arm} authed={status === "authed"} onLogin={() => router.push("/login")} />
      <FeedbackList kind="QUESTION" arm={arm} rows={qaQ.data ?? []} loading={qaQ.isLoading} />
    </section>
  );
}

function FeedbackList({
  kind,
  arm,
  rows,
  loading,
}: {
  kind: "FEEDBACK" | "QUESTION";
  arm: "BUY" | "SELL";
  rows: FeedbackPostDto[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid place-items-center py-6">
        <Spinner />
      </div>
    );
  }
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {kind === "QUESTION" && (
        <h3 className="px-1 text-[12px] font-bold text-text-2">پرسش‌های کاربران</h3>
      )}
      {rows.map((p) => (
        <FeedbackRow key={p.id} p={p} arm={arm} />
      ))}
    </div>
  );
}

function FeedbackRow({ p, arm }: { p: FeedbackPostDto; arm: "BUY" | "SELL" }) {
  const { show } = useToast();
  const qc = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const like = async () => {
    if (status !== "authed") {
      show({ text: "برای پسندیدن، وارد حساب شوید.", kind: "info" });
      return;
    }
    setBusy(true);
    try {
      await socialApi.likeFeedback(p.id, bizId);
      void qc.invalidateQueries({ queryKey: ["feedback"] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setBusy(true);
    try {
      await socialApi.replyFeedback(p.id, bizId || null, replyText.trim());
      show({ text: "پاسخ شما ثبت شد.", kind: "success" });
      setReplyOpen(false);
      setReplyText("");
      void qc.invalidateQueries({ queryKey: ["feedback"] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-black text-text-4">
            {(p.authorName || "؟").slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold text-text">{p.authorName}</p>
            <span className="text-[10px] text-text-4">{timeAgo(p.createdAt)}</span>
          </div>
        </div>
        {p.kind === "QUESTION" && (
          <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[9.5px] font-bold text-primary-strong">
            پرسش
          </span>
        )}
      </div>
      <p className="mt-2 text-[12.5px] leading-6 text-text-2">{p.text}</p>

      {/* پاسخ‌ها */}
      {p.replies.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {p.replies.map((r, i) => (
            <div
              key={i}
              className={cn("rounded-xl px-3 py-2", r.team ? "bg-primary-soft/50" : "bg-surface-2/60")}
            >
              <p className="flex items-center gap-1.5 text-[10.5px] font-black text-text-2">
                {r.team && <Icon name="verified" size={11} className="text-primary" />}
                {r.businessName}
                {r.team && <span className="text-primary-strong">· تیم آیمچ</span>}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-6 text-text-2">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* لایک + پاسخ */}
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void like()}
          disabled={busy}
          aria-pressed={p.likedByMe}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
            p.likedByMe ? "bg-primary-soft text-primary-strong" : "bg-surface-2 text-text-2"
          )}
        >
          <Icon name="star" size={12} />
          {p.likeCount > 0 ? num(p.likeCount, "fa") : "پسندیدم"}
        </button>
        {status === "authed" && (
          <button
            type="button"
            onClick={() => setReplyOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-text-2"
          >
            <Icon name="msg" size={12} />
            پاسخ
          </button>
        )}
      </div>

      {replyOpen && (
        <div className="mt-2.5 flex flex-col gap-2">
          <Textarea
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="پاسخ شما (با نام کسب‌وکارتان نمایش داده می‌شود)…"
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button variant="arm" size="sm" loading={busy} disabled={!replyText.trim()} onClick={() => void sendReply()}>
              <Icon name="send" size={13} />
              ثبت پاسخ
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReplyOpen(false)}>
              انصراف
            </Button>
          </div>
        </div>
      )}
      <span className="sr-only">{arm === "BUY" ? "دستیار خرید" : "دستیار فروش"}</span>
    </article>
  );
}

/** فرم ثبت بازخورد/پرسش تازه */
function FeedbackAsk({
  kind,
  arm,
  authed,
  onLogin,
}: {
  kind: "FEEDBACK" | "QUESTION";
  arm: "BUY" | "SELL";
  authed: boolean;
  onLogin: () => void;
}) {
  const { show } = useToast();
  const qc = useQueryClient();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await socialApi.createFeedback(bizId, kind, arm, text.trim());
      show({ text: kind === "QUESTION" ? "پرسش شما ثبت شد." : "بازخورد شما ثبت شد — ممنون!", kind: "success" });
      setOpen(false);
      setText("");
      void qc.invalidateQueries({ queryKey: ["feedback"] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <button
        type="button"
        onClick={onLogin}
        className="flex items-center gap-3 rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-3 text-start"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
          <Icon name="login" size={16} />
        </span>
        <span className="flex-1 text-[12px] font-bold text-text">
          {kind === "QUESTION" ? "پرسشی دارید؟" : "تجربه‌تان را بنویسید"}
          <span className="block text-[11px] font-normal text-text-3">با ورود به آیمچ، همان‌جا بنویسید.</span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      {open ? (
        <div className="flex flex-col gap-2.5">
          <Field label={kind === "QUESTION" ? "پرسش شما دربارهٔ این دستیار" : "تجربهٔ شما از این دستیار"}>
            {(id) => (
              <Textarea
                id={id}
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  kind === "QUESTION"
                    ? "هرچه دربارهٔ کارکرد دستیار می‌پرسید — تیم آیمچ یا کاربران پاسخ می‌دهند."
                    : "چه چیزی به کارتان آمد؟ چه چیزی کم داشت؟"
                }
                maxLength={700}
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button variant="arm" size="sm" loading={busy} disabled={!text.trim()} onClick={() => void submit()}>
              <Icon name="send" size={13} />
              {kind === "QUESTION" ? "ارسال پرسش" : "ارسال بازخورد"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              انصراف
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 text-start text-[12.5px] font-bold text-text-3"
        >
          <Icon name="plus" size={15} className="text-primary-strong" />
          {kind === "QUESTION" ? "پرسش تازه بپرسید…" : "تجربهٔ تازه بنویسید…"}
        </button>
      )}
    </div>
  );
}
