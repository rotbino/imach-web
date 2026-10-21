"use client";

/**
 * /saved — کاتالوگ‌های ذخیره‌شده (پورت sc-suppliers از Prototype v18 · فاز ۳).
 *
 * دادهٔ واقعی: getFollows — فالوهای کاتالوگ تأمین‌کنندگان (origin mine/theirs).
 * «باز کردن کاتالوگ» → کاتالوگ عمومی واقعی /sell/[slug] (مسیر موجود).
 * حذف = unfollowSupplier واقعی.
 *
 * تطبیق آگاهانه با Prototype (ثبت در MIGRATION-MAP §۴):
 *   · insight-strip (N کالا · N ذخیره · N بازدید) حذف شد — FollowDto این
 *     شمارش‌ها را ندارد؛ نوار آمار وقتی می‌آید که API آمار کاتالوگ عمومی
 *     بیاید (فاز ۷ · شمارش فالو/بازدید عمومی)
 *   · نشان «فروشنده ویژه» از فلگ sponsored فالو — فعلاً همیشه false
 */

import Link from "next/link";
import { useActiveBusiness } from "@/lib/active-biz";
import { useFollowToggle, useFollows } from "@/lib/queries";
import { fa } from "@/lib/format";
import { timeAgo } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { Icon } from "@/components/imach/icon";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";

/** پالت آواتار v18 — همان خانوادهٔ رنگی Prototype */
const AVATAR_BG = ["var(--teal-deep)", "var(--emerald)", "var(--amber)", "var(--fg-soft)", "var(--muted)"];
function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

export function SavedCatalogs() {
  const m = useMessages();
  const t = m.app.saved;
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const followsQ = useFollows(bizId);
  const unfollowMut = useFollowToggle();

  const rows = followsQ.data ?? [];

  if (!bizId || followsQ.isLoading) {
    return (
      <section className="screen" data-screen="suppliers">
        <Appbar deskTitle={t.title} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
            <Spinner size={22} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.app.home.loading}</span>
          </div>
        </div>
        <Tabbar active="saved" />
      </section>
    );
  }

  return (
    <section className="screen" data-screen="suppliers">
      <Appbar deskTitle={t.title} />

      <div className="screen-body">
        <div className="greet">
          <b>{t.title}</b>
          <span>{t.sub}</span>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-bm" />
            </span>
            <h3>{t.emptyTitle}</h3>
            <p>{t.emptySub}</p>
            <Link className="btn btn-primary" href="/home">
              {m.app.home.secList}
            </Link>
          </div>
        ) : (
          <>
            <div className="sec-title">
              <h2>
                <Icon className="ic-sm" name="i-bm" /> {t.mine}
              </h2>
              <span className="more">{t.countN.replace("{n}", fa(rows.length))}</span>
            </div>

            {rows.map((f) => (
              <div key={f.supplierId} className="card sup-card">
                <div className="head">
                  <div className="avatar" style={{ background: avatarBg(f.supplier.name), color: "#fff" }}>
                    {f.supplier.name.trim().charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm">
                      {f.supplier.name}
                      {f.supplier.isVerified ? (
                        <Icon className="ic-sm" name="i-shield" style={{ color: "var(--teal-strong)" }} />
                      ) : null}
                    </div>
                    <div className="mt">
                      <span className="mt-i">
                        <Icon name="i-pin" /> {f.supplier.city || "—"}
                      </span>
                      <span className="mt-i">
                        <Icon name="i-clock" /> {t.savedAgo.replace("{t}", timeAgo(f.createdAt))}
                      </span>
                    </div>
                  </div>
                  <span className="badge b-teal">
                    <Icon name="i-bm" /> {t.savedBadge}
                  </span>
                </div>

                <div className="acts">
                  <Link className="btn btn-soft btn-sm" style={{ flex: 1.5 }} href={`/sell/${f.supplier.slug}`}>
                    <Icon className="ic-sm ic-12" name="i-store" /> {t.openBtn}
                  </Link>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--muted)" }}
                    disabled={unfollowMut.isPending}
                    onClick={() => {
                      if (!bizId) return;
                      unfollowMut.mutate(
                        { businessId: bizId, supplierId: f.supplierId, follow: false },
                        { onSuccess: () => toast({ title: t.removed }) }
                      );
                    }}
                  >
                    <Icon className="ic-sm ic-12" name="i-trash" /> {t.removeBtn}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        <button
          className="card dashed tap"
          style={{
            width: "100%",
            textAlign: "center",
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--muted)",
            padding: 12,
          }}
          onClick={() => toast({ title: t.addNew })}
        >
          {t.addNew}
        </button>

        <div className="hint">
          <Icon name="i-info" />
          <span>{t.hint}</span>
        </div>
      </div>

      <Tabbar active="saved" />
    </section>
  );
}
