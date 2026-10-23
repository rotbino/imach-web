"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { ChatAvatar, clockLabel, dayKey, dayLabel } from "@/components/imach/chat-parts";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { useThread } from "@/lib/queries";
import { chatApi, filesApi } from "@/lib/api";

/** پیام‌های آمادهٔ کاری — همان چهار جملهٔ پروتوتایپ (۳۰) */
const QUICK_CHIPS = ["سلام، وقت به خیر", "قیمت امروز؟", "موجودی دارید؟", "شرایط پرداخت؟"];

/** `/msgs/[id]` — ۳۰ گفتگو: در پوستهٔ سایدباری · بوم ۱۰۰dvh با اسکرول داخلی
 *  (استثنای چت) · ستون ۹۰۰ وسچ + حباب‌های ۵۶۰ لنگر + نوار زمینهٔ «دربارهٔ:»
 *  (#chat-ctx · FD-22 تصمیم ۸) + پیام آماده + عکس + polling ۵s. */
export default function ChatPage() {
  return (
    <AuthGate>
      <ChatBody />
    </AuthGate>
  );
}

function ChatBody() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];

  const q = useThread(id, !!biz);
  const other = q.data?.other;
  const context = q.data?.context ?? null;
  const messages = q.data?.messages ?? [];

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // اسکرول به آخرین پیام — پیام تازه یا باز شدن گفتگو
  const count = messages.length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [count, id]);

  /** ارسال — متن آماده یا نوشته؛ بعدش کش گفتگو بی‌درنگ تازه می‌شود */
  const send = async (msg?: string) => {
    const body = (msg ?? text).trim();
    if (!body || sending || !id) return;
    setSending(true);
    try {
      await chatApi.sendMessage(id, body);
      setText("");
      await qc.invalidateQueries({ queryKey: ["chat", "thread", id] });
      await qc.invalidateQueries({ queryKey: ["chat", "threads"] });
    } catch {
      show({ text: "پیام ارسال نشد — دوباره تلاش کنید", kind: "error" });
    } finally {
      setSending(false);
    }
  };

  /** پیوست عکس — اسلات گفتگوی کسب‌وکار؛ بعدش متن خالی با fileId می‌رود */
  const onPickFile = async (file: File) => {
    if (!biz || !id) return;
    setUploading(true);
    try {
      const up = await filesApi.upload({ file, model: "Business", modelId: biz.id, key: "chat" });
      await chatApi.sendMessage(id, "", up.id);
      await qc.invalidateQueries({ queryKey: ["chat", "thread", id] });
      await qc.invalidateQueries({ queryKey: ["chat", "threads"] });
    } catch {
      show({ text: "ارسال عکس نشد — دوباره تلاش کنید", kind: "error" });
    } finally {
      setUploading(false);
    }
  };

  // جداکننده‌های روز — «امروز» / «دیروز» / تاریخ
  const grouped = useMemo(() => {
    const out: { key: string; label: string; items: typeof messages }[] = [];
    for (const m of messages) {
      const k = dayKey(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.key === k) last.items.push(m);
      else out.push({ key: k, label: dayLabel(m.createdAt), items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <AppShell
      arm="keep"
      chat
      back="/msgs"
      title={other ? <ChatHead other={other} /> : "گفتگو"}
      headerActions={
        <button
          type="button"
          onClick={() => setCallOpen(true)}
          aria-label="تماس"
          title="تماس"
          className="grid size-10 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
        >
          <Icon name="phone" size={19} />
        </button>
      }
    >
      <div data-chat className="flex h-full min-h-0 flex-1 flex-col">
        {/* نوار زمینهٔ گفتگو — فقط وقتی از دلِ سندی باز شده (FD-22 تصمیم ۸) */}
        {context?.title && (
          <div
            id="chat-ctx"
            data-chat-ctx={context.type}
            className="flex items-center gap-2 border-b border-[#fbd8bc] bg-primary-soft px-4 py-2 text-[11.5px] font-black text-primary-strong"
          >
            <Icon name="receipt" size={14} className="shrink-0" />
            <span id="chat-ctx-tx" className="truncate">
              دربارهٔ: {context.title}
            </span>
          </div>
        )}

        {/* بوم پیام‌ها — کل‌عرض؛ ستون محتوا ۹۰۰ وسچ (الگوی Intercom) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-bg lg:bg-surface-2">
          <div className="mx-auto flex w-full max-w-[900px] flex-col px-4 pb-3 pt-5 lg:px-14">
            {q.isLoading && <div className="py-10 text-center text-[12.5px] text-text-3">در حال بارگذاری…</div>}
            {q.isError && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-[13px] font-bold text-text-2">گفتگو در دسترس نیست</p>
                <Button variant="soft" size="sm" onClick={() => router.push("/msgs")}>
                  بازگشت به پیام‌ها
                </Button>
              </div>
            )}
            {grouped.map((g) => (
              <div key={g.key} className="contents">
                <div className="mx-auto my-3 rounded-full bg-surface-2 px-3 py-1 text-[10.5px] font-bold text-text-3 lg:bg-surface">
                  {g.label}
                </div>
                {g.items.map((m) => (
                  <div
                    key={m.id}
                    data-mine={m.mine ? "1" : "0"}
                    className={cn("mb-2.5 flex flex-col lg:mb-3.5", m.mine ? "items-end" : "items-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[268px] px-3.5 py-2 text-[13px] leading-[1.9] lg:max-w-[min(560px,84%)] lg:text-[13.5px] lg:leading-[2]",
                        m.mine
                          ? "rounded-2xl rounded-es-[5px] border border-transparent bg-arm text-white"
                          : "rounded-2xl rounded-ee-[5px] border border-line bg-surface text-text"
                      )}
                    >
                      {m.file && (
                        // eslint-disable-next-line @next/next/no-img-element -- پیوست چت از سرور فایل؛ next/image برای CDN عمومی است
                        <img
                          src={m.file.thumbUrl ?? m.file.url}
                          alt={m.file.name}
                          className="mb-1.5 max-h-64 w-full rounded-xl object-cover"
                        />
                      )}
                      {m.text}
                    </div>
                    <span className="mt-1 px-1 text-[9.5px] text-text-3">{clockLabel(m.createdAt)}</span>
                  </div>
                ))}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* نوار تایپ کف — پیام آماده + عکس + ورودی */}
        <div className="shrink-0 border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-[900px] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 lg:px-14">
            <div className="scrollbar-none mb-2 flex gap-1.5 overflow-x-auto">
              {QUICK_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => void send(c)}
                  className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-[11.5px] font-bold text-text-2 transition-colors hover:border-line-2 hover:text-text"
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="ارسال عکس"
                title="ارسال عکس"
                disabled={uploading}
                className="grid size-11 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-surface-2 hover:text-text-2 disabled:opacity-50"
              >
                <Icon name="image" size={19} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onPickFile(f);
                }}
              />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) void send();
                }}
                aria-label="پیام"
                placeholder="پیام…"
                maxLength={2000}
                className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3.5 text-[13.5px] text-text outline-none placeholder:text-text-4 focus:border-line-2"
              />
              <button
                type="button"
                onClick={() => void send()}
                aria-label="ارسال پیام"
                data-chat-send=""
                disabled={sending || !text.trim()}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-arm text-white transition-[filter,transform] hover:brightness-95 active:scale-95 disabled:opacity-40"
              >
                <Icon name="send" size={18} className="rtl:-scale-x-100" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* شیت تماس — شمارهٔ کسب‌وکار طرف (بدون دروازهٔ تماس؛ خودِ گفتگو است) */}
      <CallSheet open={callOpen} onClose={() => setCallOpen(false)} other={other ?? null} />
    </AppShell>
  );
}

/** سربرگ گفتگو در اپ‌بار — آواتار + نام + شهر/حضور زنده */
function ChatHead({ other }: { other: { name: string; city: string; online?: boolean } }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5" data-chat-head>
      <ChatAvatar other={other} size="sm" />
      <span className="min-w-0">
        <b className="block truncate text-[14px] font-black text-text">{other.name}</b>
        <span
          data-online={other.online ? "1" : "0"}
          className={cn("block truncate text-[10.5px] font-bold", other.online ? "text-green" : "text-text-3")}
        >
          {other.online ? "آنلاین" : other.city || "—"}
        </span>
      </span>
    </span>
  );
}

/** شیت تماس — شماره + تماس مستقیم + کپی */
function CallSheet({
  open,
  onClose,
  other,
}: {
  open: boolean;
  onClose: () => void;
  other: { name: string; phone: string | null } | null;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="تماس با طرف گفتگو">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-strong">
            <Icon name="phone" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-black text-text">{other?.name ?? "—"}</p>
            <p className="mt-0.5 text-[13px] font-bold text-text-2" dir="ltr">
              {other?.phone ?? "شماره‌ای ثبت نشده"}
            </p>
          </div>
        </div>
        {other?.phone && (
          <>
            <a
              href={`tel:${other.phone}`}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-arm text-[13.5px] font-black text-white transition-[filter] hover:brightness-95"
            >
              <Icon name="phone" size={16} />
              تماس تلفنی
            </a>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                void navigator.clipboard?.writeText(other.phone ?? "").then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2200);
                });
              }}
            >
              <Icon name="copy" size={15} />
              {copied ? "کپی شد" : "کپی شماره"}
            </Button>
          </>
        )}
        <p className="text-[11.5px] leading-5 text-text-3">
          شمارهٔ کسب‌وکار طرف مقابل است — همان شماره‌ای که در کاتالوگش ثبت کرده. قیمت و شرایط را در همین گفتگو بنویسید تا سابقه‌اش بماند.
        </p>
      </div>
    </Sheet>
  );
}
