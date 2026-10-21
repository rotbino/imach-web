"use client";

/**
 * iMach ShareSheet + ContactsSheet — پورت v18 شیت‌های اشتراک Prototype
 * (sheet-share / sheet-share-list / sheet-share-product / sheet-share-rfq + sheet-contacts).
 *
 * • ShareSheet: مخاطبین گوشی · اشتراک‌گذاری سیستمی · کپی لینک · QR واقعی
 *   (qrcode.react) — با پاداش دعوت (۵٬۰۰۰ تومان پس از اولین ذخیرهٔ مخاطب).
 * • ContactsSheet: انتخاب از دفترچهٔ گوشی با Contact Picker API
 *   (کروم/اندروید) · ورود دستی جای دیگر · اعضای iMach هایلایت با کسب‌وکار
 *   · غریبه‌ها دعوت با پیامک (لینک ref دار) — موتور شبکه‌سازی و رشد.
 *
 * لینک همیشه دعوت‌دار است: ?ref={slug} (کاتالوگ) · ?ref=buy:{slug} (لیست خرید).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Sheet } from "./sheet";
import { Icon } from "./icon";
import { Spinner } from "./spinner";
import { useMessages } from "@/i18n/messages/use-messages";
import { useToast } from "@/hooks/use-toast";
import { useContacts, useInviteContact, useSyncContacts } from "@/lib/queries";
import { useAuthStore } from "@/lib/auth-store";
import { dialOf, normalizeIntlPhone } from "@/lib/countries";
import { fa } from "@/lib/format";

/* ─── Contact Picker API — فقط بعضی مرورگرهای موبایل ─── */

type PickResult = { name?: string[]; tel?: string[] }[];
type ContactsManager = { select: (props: string[], opts: { multiple: boolean }) => Promise<PickResult> };

function contactPicker(): ContactsManager | null {
  if (typeof navigator === "undefined" || !("contacts" in navigator)) return null;
  return (navigator as unknown as { contacts?: ContactsManager }).contacts ?? null;
}

/* ─── نوع محتوای اشتراک ─── */

export type ShareKind = "catalog" | "list" | "product" | "rfq";

export function shareUrlFor(kind: ShareKind, path: string): string {
  // path مثل «c/karon» بدون اسلش آغازین — خروجی کامل با ref دعوت
  const origin = typeof window !== "undefined" ? window.location.origin : "https://imach.app";
  return `${origin}/${path}`;
}

/* ═════════ ShareSheet — شیت اشتراک‌گذاری v18 ═════════ */

export function ShareSheet({
  open,
  onClose,
  kind,
  path,
  title,
  entity,
  loginPath,
  autoContacts,
}: {
  open: boolean;
  onClose: () => void;
  kind: ShareKind;
  /** مسیر نسبی هدف — مثال: c/karon · b/mehr · p/karon/xx · rfq/yy */
  path: string;
  /** عنوان اختیاری برای h3 — پیش‌فرض از نوع محتوا */
  title?: string;
  /** نام موجودیت برای متن اشتراک (نام کسب‌وکار/کالا) */
  entity?: string;
  /** مقصد ورود برای میهمان (صفحات عمومی) — مخاطبین گوشی پشت عضویت */
  loginPath?: string;
  /** دمو/ناوبری مستقیم: باز شدن مستقیم روی تب مخاطبین (؟sheet=contacts) */
  autoContacts?: boolean;
}) {
  const m = useMessages();
  const t = m.app.share;
  const { toast } = useToast();
  const [contactsOpen, setContactsOpen] = useState(!!autoContacts);
  const [qrOpen, setQrOpen] = useState(false);

  // autoContacts ممکن است بعد از mount برسد (؟sheet=contacts → والد state را
  // هم‌زمان با shareOpen ست می‌کند) — الگوی رسمی «تنظیم state حین رندر»
  const [prevAutoContacts, setPrevAutoContacts] = useState(autoContacts);
  if (autoContacts !== prevAutoContacts) {
    setPrevAutoContacts(autoContacts);
    setContactsOpen(!!autoContacts);
  }

  const fullUrl = useMemo(() => shareUrlFor(kind, path), [kind, path]);

  const kindMeta: Record<ShareKind, { h: string; s: string; text: string }> = {
    catalog: {
      h: t.catalogTitle,
      s: t.catalogSub,
      text: t.catalogText.replace("{name}", entity ?? "iMach"),
    },
    list: {
      h: t.listTitle,
      s: t.listSub,
      text: t.listText.replace("{name}", entity ?? "iMach"),
    },
    product: {
      h: t.productTitle,
      s: t.productSub,
      text: t.productText.replace("{name}", entity ?? "iMach"),
    },
    rfq: {
      h: t.rfqTitle,
      s: t.rfqSub.replace("{name}", entity ?? ""),
      text: t.rfqText.replace("{name}", entity ?? ""),
    },
  };
  const meta = kindMeta[kind];

  const nativeShare = async () => {
    const payload = { title: "iMach", text: meta.text, url: fullUrl };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
        await navigator.share(payload);
        return;
      }
      throw new Error("no-web-share");
    } catch {
      try {
        await navigator.clipboard.writeText(fullUrl);
        toast({ title: t.linkCopied, description: `/${path}` });
      } catch {
        toast({ title: t.copyFailed, variant: "destructive" });
      }
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast({ title: t.linkCopied, description: `/${path}` });
    } catch {
      toast({ title: t.copyFailed, variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open && !contactsOpen} onClose={onClose} label={title ?? meta.h}>
        <div className="grab" />
        <h3>{title ?? meta.h}</h3>
        <div className="sub">{meta.s}</div>

        {/* ۱) مخاطبین گوشی — مسیر رشد: دعوت با پیامک / اطلاع درون‌برنامه‌ای اعضا */}
        <button className="sheet-row" onClick={() => setContactsOpen(true)}>
          <span className="ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}>
            <Icon name="i-users" />
          </span>
          <span className="tx">
            <b>{t.contactsRow}</b>
            <span>{t.contactsRowSub}</span>
          </span>
          <svg className="check" style={{ color: "var(--muted)" }}>
            <use href="#i-chev" />
          </svg>
        </button>

        {/* ۲) اشتراک‌گذاری سیستمی — کاربر خودش تصمیم می‌گیرد */}
        <button className="sheet-row" onClick={() => void nativeShare()}>
          <span className="ico" style={{ background: "var(--orange-tint)", color: "var(--primary-strong)" }}>
            <Icon name="i-share" />
          </span>
          <span className="tx">
            <b>{t.shareRow}</b>
            <span>{t.shareRowSub}</span>
          </span>
        </button>

        {/* ۳) کپی لینک */}
        <button className="sheet-row" onClick={() => void copyLink()}>
          <span className="ico" style={{ background: "var(--muted-bg)", color: "var(--fg-soft)" }}>
            <Icon name="i-list" />
          </span>
          <span className="tx">
            <b>{t.copyRow}</b>
            <span dir="ltr">{`imach.app/${path}`}</span>
          </span>
        </button>

        {/* ۴) QR واقعی — برای سردر مغازه، بنر یا کارت ویزیت */}
        <button className="sheet-row" onClick={() => setQrOpen((v) => !v)}>
          <span className="ico" style={{ background: "var(--muted-bg)", color: "var(--fg-soft)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
              <path d="M14 14h3v3h-3zM19 15v5M16 20h3" />
            </svg>
          </span>
          <span className="tx">
            <b>{t.qrRow}</b>
            <span>{t.qrRowSub}</span>
          </span>
        </button>
        {qrOpen ? (
          <div className="qr-box" style={{ background: "#fff" }}>
            <QRCodeSVG value={fullUrl} size={128} fgColor="#29241d" bgColor="#ffffff" />
            <div className="hint">{t.qrHint}</div>
          </div>
        ) : null}

        {/* پاداش دعوت */}
        {kind === "catalog" || kind === "list" ? (
          <div className="hint" style={{ marginTop: 10 }}>
            <Icon name="i-bell" />
            <span>
              <b>{t.benefitTitle}</b> {t.benefitBody}
            </span>
          </div>
        ) : null}
        <button className="btn btn-outline btn-block" onClick={onClose} style={{ marginTop: 4 }}>
          {t.closeBtn}
        </button>
      </Sheet>

      {/* شیت مخاطبین — انتخاب از گوشی / دعوت */}
      <ContactsSheet
        open={contactsOpen}
        onClose={() => setContactsOpen(false)}
        onBack={() => setContactsOpen(false)}
        kind={kind}
        path={path}
        entity={entity}
        loginPath={loginPath}
      />
    </>
  );
}

/* ═════════ ContactsSheet — دفترچهٔ گوشی v18 ═════════ */

export function ContactsSheet({
  open,
  onClose,
  onBack,
  kind,
  path,
  entity,
  loginPath,
}: {
  open: boolean;
  onClose: () => void;
  /** بازگشت به شیت اشتراک (رفتار openContacts Prototype) */
  onBack?: () => void;
  kind: ShareKind;
  path: string;
  entity?: string;
  /** میهمان → دعوت به ورود (مخاطبین گوشی پشت عضویت — صفحات عمومی) */
  loginPath?: string;
}) {
  const m = useMessages();
  const t = m.app.share;
  const { toast } = useToast();
  const contactsQ = useContacts();
  const sync = useSyncContacts();
  const invite = useInviteContact();
  const user = useAuthStore((s) => s.user);
  const ownerCountry = user?.country ?? "IR";

  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const authed = useAuthStore((s) => s.status) === "authed";

  const contacts = contactsQ.data ?? [];
  const pickerSupported = useMemo(() => contactPicker() !== null, []);

  const fullUrl = useMemo(() => shareUrlFor(kind, path), [kind, path]);
  const inviteText =
    kind === "list"
      ? t.listInviteText.replace("{name}", entity ?? "").replace("{url}", fullUrl)
      : t.inviteText.replace("{name}", entity ?? "").replace("{url}", fullUrl);

  const toggle = (id: string) => {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  /** انتخاب از دفترچهٔ گوشی — Contact Picker API (کروم/اندروید) */
  const addFromDevice = async () => {
    const picker = contactPicker();
    if (!picker) return;
    try {
      const picked = await picker.select(["name", "tel"], { multiple: true });
      const rows = picked
        .map((c) => ({
          name: (c.name?.[0] ?? "").trim(),
          phone: normalizeIntlPhone(c.tel?.[0] ?? "", ownerCountry) ?? "",
        }))
        .filter((r) => r.phone !== "");
      if (rows.length === 0) {
        toast({ title: t.ctNonePicked });
        return;
      }
      sync.mutate(rows, {
        onSuccess: (res) => toast({ title: t.ctSyncedN.replace("{n}", fa(res.saved)) }),
        onError: (e) => toast({ title: e.message || t.ctSyncFailed, variant: "destructive" }),
      });
    } catch {
      /* کاربر اجازه را رد کرد — بی‌صدا */
    }
  };

  /** ورود دستی — مرورگرهای بدون Contact Picker */
  const addManually = () => {
    const p = normalizeIntlPhone(phone, ownerCountry);
    if (!p) {
      toast({
        title: t.ctInvalidPhone,
        description: `+${dialOf(ownerCountry)}`,
        variant: "destructive",
      });
      return;
    }
    sync.mutate(
      [{ name: name.trim() || p, phone: p }],
      {
        onSuccess: () => {
          setName("");
          setPhone("");
          toast({ title: t.ctAdded });
        },
        onError: (e) => toast({ title: e.message || t.ctSyncFailed, variant: "destructive" }),
      },
    );
  };

  /** ارسال: عضو → اطلاع درون‌برنامه‌ای · غریبه → پیامک با لینک دعوت‌دار */
  const send = () => {
    const chosen = contacts.filter((c) => sel.has(c.id));
    for (const c of chosen) {
      invite.mutate(c.id);
      if (!c.member) {
        window.location.assign(`sms:+${c.phone}?body=${encodeURIComponent(inviteText)}`);
        break; // سیستم پیامک یکی‌یکی باز می‌شود — اولی کافی است تا حلقه بسته شود
      }
    }
    const members = chosen.filter((c) => c.member).length;
    const strangers = chosen.length - members;
    toast({
      title: t.ctSentToastN.replace("{n}", fa(chosen.length)),
      description:
        members > 0 && strangers > 0
          ? t.ctSentMixed.replace("{m}", fa(members)).replace("{s}", fa(strangers))
          : members > 0
            ? t.ctSentMembers.replace("{m}", fa(members))
            : t.ctSentSms.replace("{s}", fa(strangers)),
    });
    setSel(new Set());
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label={t.ctTitle}>
      <div className="grab" />
      <h3>{t.ctTitle}</h3>
      <div className="sub">{t.ctSub}</div>

      {!authed && loginPath ? (
        /* میهمان (صفحات عمومی) — مخاطبین گوشی پشت عضویت */
        <>
          <div className="card" style={{ padding: "14px", textAlign: "center" }}>
            <span className="art" style={{ background: "var(--teal-tint)", color: "var(--teal-strong)", width: 46, height: 46, margin: "0 auto 8px" }}>
              <Icon name="i-users" />
            </span>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t.ctGuestTitle}</div>
            <div className="sub" style={{ margin: "5px 0 10px" }}>{t.ctGuestSub}</div>
            <Link className="btn btn-primary btn-lg btn-block" href={loginPath}>
              {t.ctGuestCta}
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* انتخاب از گوشی — Contact Picker API */}
          {pickerSupported ? (
            <button className="sheet-row" onClick={() => void addFromDevice()}>
              <span className="ico" style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}>
                <Icon name="i-users" />
              </span>
              <span className="tx">
                <b>{t.ctPick}</b>
                <span>{t.ctPickSub}</span>
              </span>
              <svg className="check" style={{ color: "var(--muted)" }}>
                <use href="#i-plus" />
              </svg>
            </button>
          ) : (
            <div className="card" style={{ padding: "10px 14px 12px", marginBottom: 10 }}>
              <div className="sub" style={{ margin: "0 0 8px" }}>{t.ctManualHint}</div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label>
                  {t.ctNamePh} <i />
                </label>
                <input
                  className="inp"
                  value={name}
                  maxLength={80}
                  placeholder={t.ctNamePh}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>
                  {t.ctPhonePh} <i>+{dialOf(ownerCountry)}</i>
                </label>
                <input
                  className="inp"
                  style={{ direction: "ltr", textAlign: "start" }}
                  inputMode="tel"
                  value={phone}
                  maxLength={24}
                  placeholder="912 345 6789"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button
                className="btn btn-soft btn-sm"
                style={{ marginTop: 10, width: "100%" }}
                disabled={sync.isPending || phone.trim() === ""}
                onClick={addManually}
              >
                {sync.isPending ? <Spinner size={14} /> : <Icon className="ic-sm" name="i-plus" />}
                {t.ctAdd}
              </button>
            </div>
          )}

          {/* لیست مخاطبین — اعضا اول با کسب‌وکار */}
          <div className="card" style={{ padding: "6px 14px" }}>
        {contactsQ.isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: "18px 0" }}>
            <Spinner size={20} />
          </div>
        ) : contacts.length === 0 ? (
          <div className="sub" style={{ padding: "14px 0", textAlign: "center" }}>
            {pickerSupported ? t.ctEmptyPicker : t.ctEmptyManual}
          </div>
        ) : (
          contacts.map((c) => (
            <button
              key={c.id}
              className={`ct-row${c.member ? " member" : ""}${sel.has(c.id) ? " sel" : ""}`}
              style={{ width: "100%", textAlign: "inherit", background: "inherit", border: "inherit", font: "inherit" }}
              onClick={() => toggle(c.id)}
              type="button"
            >
              <span className="ava">{c.name.charAt(0)}</span>
              <span className="tx">
                <b>
                  {c.name}
                  {c.member ? (
                    <span className="badge b-stone" style={{ marginInlineStart: 5 }}>
                      {t.ctMemberBadge}
                    </span>
                  ) : null}
                </b>
                <span>
                  {c.member
                    ? (c.member.name ?? t.ctMember) + (c.member.city ? ` · ${c.member.city}` : "")
                    : c.lastInvitedAt
                      ? t.ctInvitedBefore
                      : t.ctNonMember}
                </span>
              </span>
              <span className="ct-chk">
                <Icon name="i-check" />
              </span>
            </button>
          ))
        )}
          </div>

          <button
            className="btn btn-primary btn-lg btn-block"
            style={{ marginTop: 12 }}
            disabled={sel.size === 0 || invite.isPending}
            onClick={send}
          >
            <Icon className="ic-sm" name="i-send" /> {t.ctSendN.replace("{n}", fa(sel.size))}
          </button>

          <div className="sub" style={{ margin: "9px 0 0" }}>{t.ctBenefit}</div>

          {onBack ? (
            <button className="btn btn-outline btn-block" style={{ marginTop: 8 }} onClick={onBack}>
              {t.ctBackToShare}
            </button>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
