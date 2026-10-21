"use client";

/**
 * /msgs — پیام‌ها (پورت sc-msgs از Prototype v18 · فاز ۶).
 *
 * فهرست گفتگوهای واقعی (GET /chat/getThreads): طرف مقابل + بج نقش
 * (تأمین‌کننده = کاتالوک فعال / خریدار) + آخرین پیام + بج نخوانده + زمان.
 * بج تب چت شل از همین query تغذیه می‌شود (unreadTotal).
 */

import Link from "next/link";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { useMessages } from "@/i18n/messages/use-messages";
import { useThreads } from "@/lib/queries";
import { fa } from "@/lib/format";

const AVATAR_BG = ["var(--teal-deep)", "var(--emerald)", "var(--amber)", "var(--fg-soft)", "var(--muted)"];
function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = Math.floor(diff / 86_400_000);
  if (day < 1) return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  if (day === 1) return "دیروز";
  if (day < 7) return `${fa(day)} روز پیش`;
  return d.toLocaleDateString("fa-IR");
}

export function ThreadsList() {
  const m = useMessages();
  const t = m.app.msgs;
  const threadsQ = useThreads();
  const rows = threadsQ.data?.items ?? [];

  return (
    <section className="screen" data-screen="msgs">
      <Appbar deskTitle={t.title} />

      <div className="screen-body">
        <div className="greet">
          <b>{t.title}</b>
          <span>{t.sub}</span>
        </div>

        {threadsQ.isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 40 }}>
            <Spinner size={22} />
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-msg" />
            </span>
            <h3>{t.emptyTitle}</h3>
            <p>{t.emptySub}</p>
            <Link className="btn btn-primary" href="/offers">
              {m.app.tabs.offers}
            </Link>
          </div>
        ) : (
          <div className="card" style={{ padding: "5px 14px" }}>
            {rows.map((r) => (
              <Link
                key={r.id}
                className="sheet-row"
                href={`/msgs/${r.id}`}
                style={{ width: "100%", textAlign: "right" }}
              >
                <div className="avatar" style={{ background: avatarBg(r.other.id), color: "#fff" }}>
                  {r.other.name.trim().charAt(0)}
                </div>
                <span className="tx">
                  <b>
                    {r.other.name}{" "}
                    <span className="badge b-stone" style={{ marginInlineStart: 4 }}>
                      {r.other.catalogCount > 0 ? t.supplier : t.buyer}
                    </span>
                  </b>
                  <span>{r.lastText ?? ""}</span>
                </span>
                {r.unread > 0 ? <span className="lv-b">{fa(r.unread)}</span> : null}
                <span className="tm" style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {timeLabel(r.lastAt)}
                </span>
                <Icon className="lv" name="i-chev" />
              </Link>
            ))}
          </div>
        )}

        <div className="hint">
          <Icon name="i-tel" />
          <span>{t.hint}</span>
        </div>
      </div>

      <Tabbar active="chat" />
    </section>
  );
}
