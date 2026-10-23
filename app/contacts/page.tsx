"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { IntlPhoneField } from "@/components/imach/intl-phone-field";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { contactsApi, type ContactRowDto } from "@/lib/api";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `/contacts` — اسکرین ۰۷: مخاطبین (M6 · FD-16).
 *
 * · دفتر مخاطبین با جستجو — اعضا اول (بج «عضو») · بقیه «دعوت‌نشده».
 * · ردیفِ عضو = «ارسال لینک» (اس‌ام‌اس با لینک کاتالوک + ref) ·
 *   ردیف غیرعضو = «دعوت» (اس‌ام‌سِ دعوت + ثبت آخرین دعوت contactsApi.invite).
 * · افزودن دستی مخاطب (شیت نام+تلفن → contactsApi.sync) — پلهٔ ارتقا بر
 *   پروتوتایپ: در وب، دفترچهٔ گوشی همیشه در دسترس نیست.
 * · حالت pick (?pick=1): چک‌باکس چندنفره + نوار پایین «ارسال» — همهٔ
 *   دعوت‌نشده‌های انتخابی یک‌جا دعوت می‌شوند (الگوی پروتوتایپ).
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function ContactsPage() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <Contacts />
      </Suspense>
    </AuthGate>
  );
}

function Contacts() {
  const searchParams = useSearchParams();
  const pickMode = searchParams.get("pick") === "1";
  return <ContactsLedger pickMode={pickMode} />;
}

function ContactsLedger({ pickMode }: { pickMode: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addCountry, setAddCountry] = useState("IR");
  const [busy, setBusy] = useState(false);

  const contactsQ = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.getContacts(),
  });

  const rows = contactsQ.data ?? [];
  const members = rows.filter((r) => r.member);
  const filtered = useMemo(() => {
    const needle = q.trim();
    if (!needle) return rows;
    return rows.filter(
      (r) => r.name.includes(needle) || (r.member?.name ?? "").includes(needle) || r.phone.includes(needle)
    );
  }, [rows, q]);

  const shareLink = biz ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${biz.slug}?ref=${biz.slug}` : "";
  const inviteText = `سلام! من با آی‌مچ خرید و فروش عمده‌ام می‌کنم — بذار تو هم عضو باشی:\n${shareLink}`;

  const inviteSms = (row: ContactRowDto) => {
    if (row.member) {
      window.open(`sms:${row.phone}?&body=${encodeURIComponent(inviteText)}`, "_blank", "noopener");
      return;
    }
    void contactsApi
      .invite(row.id)
      .catch(() => undefined) /* ثبت دعوت هرگز جریان را نمی‌شکند */
      .finally(() => {
        window.open(`sms:${row.phone}?&body=${encodeURIComponent(inviteText)}`, "_blank", "noopener");
        void qc.invalidateQueries({ queryKey: ["contacts"] });
      });
  };

  const pickedCount = Object.values(selected).filter(Boolean).length;

  const sendPicked = async () => {
    const targets = rows.filter((r) => selected[r.id] && !r.member);
    setBusy(true);
    try {
      await Promise.allSettled(targets.map((t) => contactsApi.invite(t.id)));
      show({
        text: `دعوت‌نامه برای ${num(targets.length, locale)} مخاطب آماده شد — پیامک‌ها را در پیام‌رسان گوشی بفرست`,
        kind: "success",
      });
      setSelected({});
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    } finally {
      setBusy(false);
    }
  };

  const addContact = async () => {
    const name = addName.trim();
    if (!name || !addPhone.trim() || addPhone.replace(/\D/g, "").length < 8) {
      show({ text: "نام و شمارهٔ مخاطب را کامل وارد کن", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      const r = await contactsApi.sync([{ name, phone: addPhone.trim() }]);
      show({
        text: r.saved > 0 ? `«${name}» به مخاطبین اضافه شد` : "این شماره از قبل در دفترچهٔ تو هست",
        kind: r.saved > 0 ? "success" : "info",
      });
      setAddOpen(false);
      setAddName("");
      setAddPhone("");
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "مخاطب ذخیره نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell arm={pickMode ? "sell" : "buy"} title="مخاطبین" back={pickMode ? "/customers" : "/home"} wide>
      <div className="flex flex-col gap-3 pb-24">
        {/* جستجو */}
        <div className="relative">
          <Icon name="search" size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی نام یا کسب‌وکار…"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-line bg-surface ps-10 pe-4 text-[14px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
          />
        </div>

        {/* شمار اعضا */}
        <p className="text-[12px] font-bold text-text-3">
          {num(members.length, locale)} از {num(rows.length, locale)} نفر عضو آی‌مچ هستند
        </p>

        {/* افزودن دستی */}
        {!pickMode && (
          <Button variant="outline" size="lg" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={16} />
            افزودن مخاطب
          </Button>
        )}

        {/* لیست */}
        {contactsQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="users" size={30} />}
            title={rows.length === 0 ? "دفترچهٔ مخاطبین خالی است" : "با این جستجو مخاطبی پیدا نشد"}
            subtitle={rows.length === 0 ? "مخاطبان کسب‌وکارت را اضافه کن و دعوتشان کن — شبکهٔ تو همین‌جا ساخته می‌شود." : "جستجو را ساده‌تر کن."}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((r) => (
              <ContactRowView
                key={r.id}
                row={r}
                locale={locale}
                pickMode={pickMode}
                checked={!!selected[r.id]}
                onToggle={() => setSelected((s) => ({ ...s, [r.id]: !s[r.id] }))}
                onAction={() => inviteSms(r)}
              />
            ))}
          </div>
        )}

        <p className="mt-2 flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-[11.5px] leading-5 text-text-3">
          <Icon name="info" size={14} className="mt-0.5 shrink-0 text-text-4" />
          اعضای آی‌مچ لینک کاتالوک را در پیام‌رسان آی‌مچ می‌گیرند؛ بقیه با پیامک دعوت می‌شوند.
        </p>
      </div>

      {/* نوار انتخاب — فقط حالت pick (الگوی پروتوتایپ) */}
      {pickMode && pickedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur-md lg:inset-x-4 lg:bottom-4 lg:mx-auto lg:max-w-[711px] lg:rounded-2xl lg:border lg:shadow-[0_10px_40px_rgba(31,29,26,.12)]">
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] font-bold text-text-3">{num(pickedCount, locale)} نفر انتخاب شد</span>
            <Button variant="arm" size="lg" className="flex-1" loading={busy} onClick={() => void sendPicked()}>
              <Icon name="send" size={16} />
              ارسال دعوت
            </Button>
          </div>
        </div>
      )}

      {/* شیت افزودن مخاطب — از پایین (قانون همیشگی) */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="افزودن مخاطب">
        <div className="flex flex-col gap-3 p-4 pt-0">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-text-2">نام مخاطب</label>
            <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="مثلاً: علی اکبری" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-text-2">شمارهٔ تلفن</label>
            <IntlPhoneField value={addPhone} onChange={setAddPhone} country={addCountry} onCountryChange={setAddCountry} placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" />
          </div>
          <Button variant="arm" size="xl" loading={busy} onClick={() => void addContact()}>
            <Icon name="check" size={17} />
            ذخیرهٔ مخاطب
          </Button>
          <p className="text-center text-[10.5px] leading-4 text-text-4">
            دعوت با پیامک گوشی خودت انجام می‌شود — آی‌مچ بدون اجازهٔ تو به کسی پیام نمی‌دهد.
          </p>
        </div>
      </Sheet>
    </AppShell>
  );
}

/* ─────────────── ردیف مخاطب ─────────────── */

function ContactRowView({
  row,
  locale,
  pickMode,
  checked,
  onToggle,
  onAction,
}: {
  row: ContactRowDto;
  locale: string;
  pickMode: boolean;
  checked: boolean;
  onToggle: () => void;
  onAction: () => void;
}) {
  const member = !!row.member;
  const clickable = !pickMode || member; // در pick، ردیف عضو انتخاب‌پذیر نیست

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-surface p-3.5 transition-colors",
        checked ? "border-arm bg-arm-soft/40" : "border-line"
      )}
    >
      {pickMode && (
        <button
          type="button"
          onClick={onToggle}
          disabled={clickable}
          aria-label="انتخاب مخاطب"
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-lg border transition-colors",
            checked ? "border-arm bg-arm text-white" : "border-line-2 bg-bg text-transparent",
            member && "opacity-30"
          )}
        >
          <Icon name="check" size={14} />
        </button>
      )}
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-[16px] font-black text-text-4/70">
        {row.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <b className="truncate text-[13.5px] font-bold text-text">{row.name}</b>
          {member ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-bold text-green">
              <Icon name="check" size={10} />
              عضو
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber">دعوت‌نشده</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-text-3">
          <span dir="ltr">{row.phone}</span>
          {row.member ? ` · ${row.member.name}` : ""}
        </p>
      </div>
      {!pickMode && (
        <Button variant={member ? "outline" : "arm"} size="sm" className="shrink-0" onClick={onAction}>
          <Icon name={member ? "link" : "send"} size={13} />
          {member ? "ارسال لینک" : "دعوت"}
        </Button>
      )}
      {pickMode && !member && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={onAction}>
          <Icon name="send" size={13} />
          دعوت
        </Button>
      )}
    </div>
  );
}
