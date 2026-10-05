"use client";

/**
 * /msgs/[id] — گفتگو (پورت sc-chat v15 از Prototype v18 · فاز ۶).
 *
 *  · chat-head: طرف مقابل (آواتار/نام/شهر) + دکمهٔ تماس → sheet-call (شمارهٔ واقعی)
 *  · chat-scroll: پیام‌های واقعی — حباب in/out + تقسیم روز + زمان + حباب عکس
 *  · quick-chips: چهار جملهٔ آمادهٔ Prototype → ارسال واقعی
 *  · composer: پیوست عکس (آپلود + sendMessage با fileId) + متن + ارسال
 *  · poll سبک (۵s) برای پاسخ‌های تازه؛ باز کردن = خواندن (سمت بک‌اند)
 *  · اسکرول خودکار به آخرین پیام
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/imach/icon";
import { useSheetParam } from "@/components/imach/demo-sheet-param";
import { Spinner } from "@/components/imach/spinner";
import { Sheet } from "@/components/imach/sheet";
import { useMessages } from "@/i18n/messages/use-messages";
import { useActiveBusiness } from "@/lib/active-biz";
import { useThread, useSendMessage, useUploadFile } from "@/lib/queries";
import { fa } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const AVATAR_BG = ["var(--teal-deep)", "var(--emerald)", "var(--amber)", "var(--fg-soft)", "var(--muted)"];
function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

/** شمارهٔ تلفن با ارقام فارسی — بدون جداکنندهٔ هزارگان */
function faPhone(phone: string): string {
  return phone.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

export function ChatView() {
  const m = useMessages();
  const t = m.app.chat;
  const tm = m.app.msgs;
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const threadId = params?.id ?? null;

  const threadQ = useThread(threadId);
  const sendMut = useSendMessage();
  const uploadMut = useUploadFile();

  const [text, setText] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  // فاز ۹ — ناوبری Demo Hub: ?sheet=call
  useSheetParam("call", () => setCallOpen(true));
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastCountRef = useRef(0);

  const data = threadQ.data;

  // اسکرول خودکار — اولین بار + پیام جدید
  useEffect(() => {
    const n = data?.messages.length ?? 0;
    if (n !== lastCountRef.current) {
      lastCountRef.current = n;
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [data?.messages.length]);

  const send = async (body: string) => {
    if (!threadId || sending) return;
    const clean = body.trim();
    if (!clean) {
      toast({ title: t.errEmpty, variant: "destructive" });
      return;
    }
    if (clean.length > 2000) {
      toast({ title: t.errLong, variant: "destructive" });
      return;
    }
    setSending(true);
    setText("");
    try {
      await sendMut.mutateAsync({ threadId, text: clean });
    } catch {
      toast({ title: m.app.editBiz.saveFailed, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const attach = async (file: File) => {
    if (!threadId || !biz) return;
    setSending(true);
    try {
      const up = await uploadMut.mutateAsync({
        file,
        model: "Business",
        modelId: biz.id,
        key: "chat",
      });
      await sendMut.mutateAsync({ threadId, text: t.photoCap, fileId: up.id });
    } catch {
      toast({ title: m.app.editBiz.saveFailed, variant: "destructive" });
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!data) {
    return (
      <section className="screen" data-screen="chat">
        <div className="chat-head">
          <button className="back" onClick={() => router.push("/msgs")} aria-label={t.backAria}>
            <Icon className="ic" name="i-back" />
          </button>
          <div className="avatar" style={{ background: "var(--muted-bg)", color: "var(--fg-soft)" }}>
            …
          </div>
          <div className="cht">
            <b>…</b>
            <span> </span>
          </div>
          <span className="icon-btn" aria-hidden>
            <Icon className="ic" name="i-tel" style={{ opacity: 0.3 }} />
          </span>
        </div>
        <div className="chat-scroll">
          <div className="chat-body" style={{ display: "grid", placeItems: "center", minHeight: "60%" }}>
            <Spinner size={22} />
          </div>
        </div>
      </section>
    );
  }

  const other = data.other;
  const phone = other.phone;

  // تقسیم روزها — گروه‌بندی پیش از رندر (بدون reassign حین رندر)
  const dayRows = data.messages.map((msg, i) => {
    const key = dayKey(msg.createdAt);
    const prev = i > 0 ? dayKey(data.messages[i - 1].createdAt) : null;
    return { msg, showDay: key !== prev, key };
  });

  return (
    <section className="screen" data-screen="chat">
      {/* هدر گفتگو */}
      <div className="chat-head">
        <button className="back" onClick={() => router.push("/msgs")} aria-label={t.backAria}>
          <Icon className="ic" name="i-back" />
        </button>
        <div className="avatar" style={{ background: avatarBg(other.id), color: "#fff" }}>
          {other.name.trim().charAt(0)}
        </div>
        <div className="cht">
          <b>{other.name}</b>
          <span>
            {t.quickReply} · {other.city}
          </span>
        </div>
        <button className="icon-btn" onClick={() => setCallOpen(true)} title={t.callAria} aria-label={t.callAria}>
          <Icon className="ic" name="i-tel" />
        </button>
      </div>

      {/* پیام‌ها */}
      <div className="chat-scroll" ref={scrollRef}>
        <div className="chat-body">
          {dayRows.map(({ msg, showDay, key }) => {
            const today = key === new Date().toDateString();
            const yesterday = key === new Date(Date.now() - 86_400_000).toDateString();
            const dayLabel = today ? t.today : yesterday ? t.yesterday : new Date(msg.createdAt).toLocaleDateString("fa-IR");
            return (
              <div key={msg.id}>
                {showDay ? <div className="chat-day">{dayLabel}</div> : null}
                <div className={msg.mine ? "msg out" : "msg in"}>
                  <div className="bub">
                    {msg.file ? (
                      <a
                        className="photo-bub"
                        href={msg.file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "block" }}
                      >
                        <img
                          src={msg.file.thumbUrl ?? msg.file.url}
                          alt={t.photo}
                          style={{ width: 160, height: 160, borderRadius: 10, objectFit: "cover", display: "block" }}
                        />
                        <span className="cap" style={{ display: "block", marginTop: 6, fontSize: 10.5, color: "var(--muted)" }}>
                          {t.photoCap}
                        </span>
                      </a>
                    ) : null}
                    {msg.text ? <div>{msg.text}</div> : null}
                  </div>
                  <span className="tm">{hhmm(msg.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* پاورقی: چیپ‌های سریع + کامپوزر */}
      <div className="chat-foot">
        <div className="quick-chips">
          <button className="chip" onClick={() => void send(t.chipPrice)}>
            {t.chipPrice}
          </button>
          <button className="chip" onClick={() => void send(t.chipStock)}>
            {t.chipStock}
          </button>
          <button className="chip" onClick={() => void send(t.chipPay)}>
            {t.chipPay}
          </button>
          <button className="chip" onClick={() => void send(t.chipDelivery)}>
            {t.chipDelivery}
          </button>
        </div>
        <div className="composer">
          <button
            className="c-ico"
            title={t.attachHint}
            aria-label={t.attachAria}
            onClick={() => fileRef.current?.click()}
            disabled={sending}
          >
            <Icon name="i-img" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void attach(f);
            }}
          />
          <input
            className="inp"
            style={{ flex: 1 }}
            placeholder={t.inputPlaceholder}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
          />
          <button
            className="c-send"
            aria-label={t.sendAria}
            disabled={sending || !text.trim()}
            onClick={() => void send(text)}
          >
            {sending ? <Spinner size={16} /> : <Icon name="i-send" />}
          </button>
        </div>
        <div className="chat-note">{t.note}</div>
      </div>

      {/* شیت تماس — شمارهٔ واقعی طرف مقابل */}
      <Sheet open={callOpen} onClose={() => setCallOpen(false)} label={t.callSheetTitle.replace("{name}", other.name)}>
        <div className="grab" />
        <h3>{t.callSheetTitle.replace("{name}", other.name)}</h3>
        <div className="sub">
          {t.callSheetSub
            .replace("{role}", other.catalogCount > 0 ? tm.supplier : tm.buyer)
            .replace("{city}", other.city)}
        </div>
        <div className="card" style={{ textAlign: "center", padding: "16px 14px" }}>
          {phone ? (
            <>
              <div className="call-num" dir="ltr">
                {faPhone(phone)}
              </div>
              <div className="sub" style={{ margin: "6px 0 0" }}>
                {biz?.hours ?? ""}
              </div>
            </>
          ) : (
            <div className="sub">{t.noPhone}</div>
          )}
        </div>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <a
            className="btn btn-primary btn-lg"
            style={{ flex: 1.6 }}
            href={phone ? `tel:${phone}` : undefined}
            aria-disabled={!phone}
            onClick={(e) => !phone && e.preventDefault()}
          >
            <Icon className="ic-sm" name="i-tel" />
            {t.callBtn}
          </a>
          <button
            className="btn btn-ghost btn-lg"
            style={{ flex: 1, color: "var(--muted)" }}
            onClick={() => {
              if (phone) {
                void navigator.clipboard
                  .writeText(phone)
                  .then(() => toast({ title: t.copied }))
                  .catch(() => undefined);
              }
            }}
          >
            <Icon className="ic-sm" name="i-list" />
            {t.copyBtn}
          </button>
        </div>
        <div className="hint" style={{ marginTop: 10 }}>
          <Icon name="i-shield" />
          <span>{t.callHint}</span>
        </div>
      </Sheet>
    </section>
  );
}
