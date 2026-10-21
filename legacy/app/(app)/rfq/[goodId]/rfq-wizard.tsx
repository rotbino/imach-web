"use client";

/**
 * ویزارد استعلام قیمت گروهی — پورت کامل sc-rfq (v18 · فاز ۴ مهاجرت).
 *
 * دادهٔ واقعی: getSupplyBoard — گیرنده‌ها همان ردیف‌های تابلوی تأمین‌اند
 * (دنبال‌شده‌ها گروه اول و به‌صورت پیش‌فرض تیک‌خورده + مرتبط‌ها).
 * ارسال = POST /market/requestQuote با supplierIds انتخابی — «شبکه iMach»
 * روشن نمی‌شود (پروتوتایپ: «فقط همان‌هایی که تیک می‌زنی خبردار می‌شوند»).
 *
 * تطبیق آگاهانه با Prototype (ثبت در MIGRATION-MAP §۴):
 *   · چیپ زمان تحویل به‌صورت کلید (URGENT/3D/WEEK/FLEX) ذخیره می‌شود تا
 *     نمایش سمت فروشنده چندزبانه بماند؛ رشته‌های legacy خام نمایش می‌شوند
 *   · «پاسخ در N ساعت» ردیف انتخاب → «به‌روز N» از updatedAt (دادهٔ واقعی)
 *   · ردیف فروشندهٔ ویژه (پرومو) حذف شد — sponsored همیشه false
 *   · شیت اشتراک‌گذاری RFQ تا فاز ۷ (صفحهٔ عمومی r/[slug]) تعویق افتاد
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveBusiness } from "@/lib/active-biz";
import { useMyRfqs, useQuoteRequest, useSupplyBoard } from "@/lib/queries";
import type { BoardSupplierDto } from "@/lib/api";
import { fa, fmtMoney, goodName, timeAgo, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { Icon, type IconName } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { useToast } from "@/hooks/use-toast";

/** نرمال‌سازی ارقام فارسی/عربی → لاتین (فرم production-grade §۲۱) */
function toAsciiDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** کلید چیپ زمان تحویل — ذخیره در Inquiry.delivery · نمایش چندزبانه */
type TimeKey = "URGENT" | "3D" | "WEEK" | "FLEX";
const TIME_KEYS: TimeKey[] = ["URGENT", "3D", "WEEK", "FLEX"];
const TIME_LABEL: Record<TimeKey, string> = {
  URGENT: "timeUrgent",
  "3D": "time3d",
  WEEK: "timeWeek",
  FLEX: "timeFlex",
};

/** نگاشت دستهٔ کالا → آیکون هنری Prototype */
const ART_BY_CATEGORY: Record<string, IconName> = {
  rice: "a-rice",
  oil: "a-oil",
  sugar: "a-sugar",
  lentil: "a-lentil",
};

/** ردیف انتخاب تأمین‌کننده — همان pick-row Prototype */
function PickRow({
  row,
  cheapest,
  on,
  onToggle,
}: {
  row: BoardSupplierDto;
  cheapest: boolean;
  on: boolean;
  onToggle: () => void;
}) {
  const m = useMessages();
  const t = m.app.rfq;
  const sub = [fmtMoney(row.priceMinor, row.currency), row.seller.city || "—", `↻ ${timeAgo(row.updatedAt)}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      className={`pick-row${on ? " on" : ""}`}
      onClick={onToggle}
      aria-pressed={on}
    >
      <div className="avatar av-sm" style={{ background: "var(--teal-deep)" }}>
        {row.seller.name.trim().charAt(0)}
      </div>
      <span className="pk-tx">
        <b>
          {row.seller.name}
          {row.followedByMe ? (
            <span className="badge b-teal">
              <Icon name="i-bmf" />
              {m.app.board.followYou}
            </span>
          ) : null}
          {cheapest ? <span className="badge b-green">{m.app.board.cheapestBadge}</span> : null}
        </b>
        <span>{sub}</span>
      </span>
      <span className="ckb">
        <Icon name="i-check" />
      </span>
    </button>
  );
}

export function RfqWizard({ goodId, from }: { goodId: string; from: string | null }) {
  const m = useMessages();
  const t = m.app.rfq;
  const { locale } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const boardQ = useSupplyBoard(bizId, goodId);
  const rfqsQ = useMyRfqs(bizId);
  const sendMut = useQuoteRequest();

  const board = boardQ.data;

  // ── prefill از «دوباره درخواست بده» (?from=rfqGroupId) ──
  const fromGroup = useMemo(
    () => (from ? rfqsQ.data?.groups.find((g) => g.id === from) ?? null : null),
    [from, rfqsQ.data]
  );

  const [picked, setPicked] = useState<Set<string> | null>(null); // null = پیش‌فرض: دنبال‌شده‌ها
  const [expanded, setExpanded] = useState(false);
  const [qtyRaw, setQtyRaw] = useState<string | null>(null); // null = پیش‌فرض: نیاز BUY listing
  const [time, setTime] = useState<TimeKey>("URGENT");
  const [targetRaw, setTargetRaw] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [qtyErr, setQtyErr] = useState(false);
  const [sent, setSent] = useState<{ count: number } | null>(null);

  const rows = useMemo(() => {
    const list = [...(board?.rows ?? [])];
    const followed = list.filter((r) => r.followedByMe);
    const related = list.filter((r) => !r.followedByMe);
    return { followed, related };
  }, [board?.rows]);

  const selected = useMemo(() => {
    if (picked) return picked;
    return new Set(rows.followed.map((r) => r.seller.id));
  }, [picked, rows.followed]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const good = board?.good ?? null;
  const unit = good ? unitLabel(good.unit, locale) : "";
  const name = good ? goodName(good, locale) : "—";

  const qty = qtyRaw ?? (fromGroup?.volume != null ? String(fromGroup.volume) : board?.volume != null ? String(board.volume) : "");
  const qtyNum = Number(toAsciiDigits(qty).replace(/\D/g, ""));
  const qtyOk = qtyNum > 0;
  const n = selected.size;

  const cheapestId = useMemo(() => {
    const all = [...rows.followed, ...rows.related];
    return all.reduce<string | null>(
      (acc, r) => (all.some((o) => o.priceMinor < r.priceMinor) ? acc : r.seller.id),
      null
    );
  }, [rows]);

  const COLLAPSED = 5;
  const relatedVisible = expanded ? rows.related : rows.related.slice(0, COLLAPSED);
  const relatedHidden = rows.related.length - COLLAPSED;

  const submit = () => {
    if (!bizId) return;
    const qErr = !qtyOk;
    setQtyErr(qErr);
    if (qErr || n === 0) return;
    const target = Number(toAsciiDigits(targetRaw).replace(/\D/g, ""));
    sendMut.mutate(
      {
        businessId: bizId,
        goodId,
        volume: qtyNum,
        frequency: (board?.frequency ?? fromGroup?.frequency ?? undefined) as
          | "WEEKLY"
          | "MONTHLY"
          | "OCCASIONAL"
          | undefined,
        delivery: TIME_LABEL[time] ? time : undefined,
        targetPriceMinor: target > 0 ? target * 10 : undefined,
        note: (note ?? fromGroup?.note ?? undefined) || undefined,
        supplierIds: [...selected],
        includeNetwork: false,
      },
      {
        onSuccess: (res) => {
          setSent({ count: res.created });
          window.scrollTo({ top: 0 });
        },
        onError: () => toast({ title: t.errSend, variant: "destructive" }),
      }
    );
  };

  // ── حالت‌ها ──
  if (!bizId || boardQ.isLoading) {
    return (
      <section className="screen" data-screen="rfq">
        <div className="pagehead">
          <div className="tt">
            <b>{t.title}</b>
            <span>{t.sub}</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
            <Spinner size={22} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.app.home.loading}</span>
          </div>
        </div>
      </section>
    );
  }

  // ── موفقیت ──
  if (sent) {
    return (
      <section className="screen" data-screen="rfq">
        <div className="pagehead">
          <div className="tt">
            <b>{t.title}</b>
            <span>{t.sub}</span>
          </div>
        </div>
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--emerald-tint)", color: "var(--emerald)" }}>
              <Icon name="i-checkc" />
            </span>
            <h3>{t.okTitle}</h3>
            <p>{t.okText.replace("{n}", fa(sent.count))}</p>
            <button className="btn btn-primary" onClick={() => router.push("/offers")}>
              {t.okCta}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const totalSuppliers = rows.followed.length + rows.related.length;
  const catSlug = good?.category?.slug ?? "";
  const art = ART_BY_CATEGORY[catSlug] ?? "i-box";
  const backHref = `/board/${goodId}`;

  // ── تابلوی خالی ──
  if (totalSuppliers === 0) {
    return (
      <section className="screen" data-screen="rfq">
        <div className="pagehead">
          <Link className="back" href={backHref} aria-label={t.back}>
            <Icon className="ic" name="i-back" />
          </Link>
          <div className="tt">
            <b>{t.title}</b>
            <span>{t.sub}</span>
          </div>
        </div>
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)" }}>
              <Icon name="i-box" />
            </span>
            <h3>{t.emptyTitle}</h3>
            <p>{t.emptySub}</p>
            <Link className="btn btn-outline" href="/home">
              {t.back}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const gateText = !qtyOk ? t.gateQty : n === 0 ? t.gatePick : null;

  return (
    <section className="screen" data-screen="rfq">
      <div className="pagehead">
        <Link className="back" href={backHref} aria-label={t.back}>
          <Icon className="ic" name="i-back" />
        </Link>
        <div className="tt">
          <b>{t.title}</b>
          <span>{t.sub}</span>
        </div>
      </div>

      <div className="screen-body" style={{ paddingBottom: 92 }}>
        <div style={{ paddingBottom: 0 }}>
          {/* بنر کهربایی-فیروزه‌ای: فقط تیک‌خورده‌ها خبردار می‌شوند */}
          <div
            className="card"
            style={{ display: "flex", gap: 10, alignItems: "center", background: "var(--teal-tint)", borderColor: "transparent" }}
          >
            <Icon className="ic" name="i-bell" style={{ color: "var(--teal-deep)" }} />
            <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.9, color: "var(--teal-tint-fg)" }}>
              {t.alertA}
              <b>{t.alertB}</b>
              {t.alertC}
            </div>
          </div>

          {/* ── گیرندگان ── */}
          <div className="sec-title">
            <h2>
              <Icon className="ic-sm" name="i-users" />
              {t.pickTitle}
            </h2>
            <span className="more">{t.pickCountN.replace("{n}", fa(n))}</span>
          </div>

          <div>
            {rows.followed.length > 0 ? (
              <div className="pk-group">
                <Icon name="i-bmf" />
                {t.groupFollowed}
              </div>
            ) : null}
            {rows.followed.map((r) => (
              <PickRow
                key={r.listingId}
                row={r}
                cheapest={cheapestId === r.seller.id}
                on={selected.has(r.seller.id)}
                onToggle={() => toggle(r.seller.id)}
              />
            ))}

            {rows.related.length > 0 ? (
              <div className="pk-group">
                <Icon name="i-box" />
                {t.groupRelated}
              </div>
            ) : null}
            {relatedVisible.map((r) => (
              <PickRow
                key={r.listingId}
                row={r}
                cheapest={cheapestId === r.seller.id}
                on={selected.has(r.seller.id)}
                onToggle={() => toggle(r.seller.id)}
              />
            ))}
            {!expanded && relatedHidden > 0 ? (
              <button className="pick-more" onClick={() => setExpanded(true)}>
                {t.moreN.replace("{n}", fa(relatedHidden))}
              </button>
            ) : null}
          </div>

          <div className="sfx-note" style={{ textAlign: "center" }}>
            {t.noteArchived}
          </div>

          {/* ── چه می‌خری؟ ── */}
          <div className="sec-title">
            <h2>{t.whatTitle}</h2>
          </div>
          <div className="card">
            <div className="field">
              <label>{t.good}</label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  background: "var(--surface)",
                  border: "1.5px solid var(--teal-strong)",
                  borderRadius: 12,
                  padding: "11px 14px",
                }}
              >
                <span className={`thumb ${catSlug}`} style={{ width: 34, height: 34, borderRadius: 10 }}>
                  <Icon name={art} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{name}</span>
                  <span className="path-hint">
                    {good?.category?.nameFa ?? ""} · {t.goodUnit.replace("{unit}", unit)}
                  </span>
                </span>
                <Icon className="ic-sm" name="i-check" style={{ color: "var(--teal-deep)" }} />
              </div>
            </div>

            <div className="field">
              <label>{t.qty}</label>
              <div className={`inp-flex inp-lg${qtyErr ? " err" : ""}`}>
                <input
                  inputMode="numeric"
                  value={qty}
                  placeholder={fromGroup?.volume != null ? String(fromGroup.volume) : ""}
                  onChange={(e) => setQtyRaw(e.target.value)}
                  onBlur={() => setQtyErr(!qtyOk)}
                  aria-invalid={qtyErr}
                />
                <span className="sfx">{unit}</span>
              </div>
              {qtyErr ? (
                <div className="f-err">
                  <Icon name="i-info" />
                  {t.qtyErr}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label>{t.deliveryPlace}</label>
              <div className="inp" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Icon className="ic-sm" name="i-pin" style={{ color: "var(--muted)" }} />
                {biz?.city ?? "—"}
                <span style={{ color: "var(--muted)" }}>{t.doorOf}</span>
              </div>
            </div>

            <div className="field">
              <label>{t.deliveryTime}</label>
              <div className="unit-chips">
                {TIME_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`chip${time === k ? " active" : ""}`}
                    onClick={() => setTime(k)}
                  >
                    {t[TIME_LABEL[k] as keyof typeof t] as string}
                  </button>
                ))}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 4 }}>
              <label>
                {t.targetPrice} <i>{t.targetOpt}</i>
              </label>
              <input
                className="inp"
                style={{ direction: "ltr", textAlign: "right" }}
                inputMode="numeric"
                placeholder={t.targetPh}
                value={targetRaw}
                onChange={(e) => setTargetRaw(e.target.value)}
              />
            </div>
          </div>

          {/* ── توضیح ── */}
          <div className="sec-title">
            <h2>
              {t.noteTitle} <i style={{ fontWeight: 400, fontSize: 10.5, color: "var(--muted)" }}>{t.optional}</i>
            </h2>
          </div>
          <div className="card">
            <textarea
              className="inp"
              placeholder={t.notePh}
              value={note ?? fromGroup?.note ?? ""}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
            />
          </div>

          <div className="hint">
            <Icon name="i-info" />
            <span>
              <b>{t.hintTitle}</b> {t.hintText}
            </span>
          </div>

          <div className="form-cta">
            <button
              className="btn btn-primary btn-lg btn-block"
              disabled={!qtyOk || n === 0 || sendMut.isPending}
              onClick={submit}
            >
              {sendMut.isPending ? <Spinner size={16} /> : <Icon className="ic-sm" name="i-send" />}
              {t.submitN.replace("{n}", fa(n))}
            </button>
            {gateText ? <div className="gate-note">{gateText}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
