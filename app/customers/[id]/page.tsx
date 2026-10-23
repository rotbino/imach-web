"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { OrderStatusBadge } from "@/components/imach/order-shared";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { businessesApi, marketApi } from "@/lib/api";
import { num } from "@/lib/format";
import { moneyPartsIn } from "@/lib/currency";
import { cn } from "@/lib/utils";

/**
 * `/customers/[id]` — اسکرین ۰۸ب: جزئیات مشتری (M6).
 *
 * · شناسنامه (نام/صنف/شهر/نوع/از کِی/منبع رسیدن) + تاییدِ مشتری جدید
 *   در جای مشخص (FD-44: «در انتظار تایید») + تماس/گفتگو در هدر.
 * · یادداشت شخصی فروشنده (setFollowerNote).
 * · سفارش‌ها و استعلام‌های همین مشتری نزد من (getCustomer — یک فراخوانی).
 * · «لیست خرید او» → نمای عمومی لیست خرید (۳۲) با زمینهٔ فروشنده.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

const CUST_T: Record<string, string> = { PASSING: "گذری", PARTNER: "همکار", CONTRACT: "قراردادی" };
const SRC_T: Record<string, string> = { ORGANIC: "خودش پیدا کرد", SHARED: "از لینک تو", PROMO: "از پرومو" };

export default function CustomerViewPage() {
  return (
    <AuthGate>
      <CustomerView />
    </AuthGate>
  );
}

function CustomerView() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const buyerId = params.id;
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const [note, setNote] = useState("");
  const [noteDirty, setNoteDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState<{ phone: string | null; name: string } | null>(null);

  const custQ = useQuery({
    queryKey: ["market", "customer", bizId, buyerId],
    queryFn: () => marketApi.getCustomer(bizId, buyerId),
    enabled: !!bizId && !!buyerId,
  });

  const c = custQ.data?.customer;

  useEffect(() => {
    if (c && !noteDirty) setNote(c.note ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- فقط بار اول از سرور
  }, [c?.id, c?.note]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["market", "customer", bizId, buyerId] });
    void qc.invalidateQueries({ queryKey: ["market", "followers", bizId] });
  };

  const ack = async () => {
    if (!c) return;
    setBusy(true);
    try {
      await marketApi.ackFollower(bizId, c.id);
      show({ text: `«${c.name}» تایید شد`, kind: "success" });
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!c) return;
    setBusy(true);
    try {
      await marketApi.setFollowerNote(bizId, c.id, note.trim());
      show({ text: note.trim() ? "یادداشت ذخیره شد" : "یادداشت پاک شد", kind: "success" });
      setNoteDirty(false);
      refresh();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ذخیره نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const dial = async () => {
    if (!c) return;
    if (!contact) {
      try {
        const r = await businessesApi.getContact(c.slug);
        setContact(r);
        if (r.phone) window.open(`sms:${r.phone}`, "_blank", "noopener");
        else show({ text: "شماره‌ای ثبت نشده", kind: "info" });
      } catch {
        show({ text: "برای تماس، شماره در دسترس نیست", kind: "error" });
      }
      return;
    }
    window.open(`sms:${contact.phone ?? ""}`, "_blank", "noopener");
  };

  if (custQ.isLoading) {
    return (
      <AppShell arm="sell" title="جزئیات مشتری" back="/customers">
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      </AppShell>
    );
  }

  if (!c) {
    return (
      <AppShell arm="sell" title="جزئیات مشتری" back="/customers">
        <EmptyState icon={<Icon name="users" size={30} />} title="این مشتری پیدا نشد" subtitle="شاید حذف شده باشد." />
      </AppShell>
    );
  }

  const orders = custQ.data?.orders ?? [];
  const inquiries = custQ.data?.inquiries ?? [];

  return (
    <AppShell
      arm="sell"
      title={c.name}
      back="/customers"
      toolbar={
        <>
          <Button variant="soft" size="sm" onClick={() => void dial()}>
            <Icon name="phone" size={14} />
            تماس
          </Button>
          <Button variant="soft" size="sm" onClick={() => router.push("/msgs")}>
            <Icon name="msg" size={14} />
            پیام
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {/* در انتظار تایید — مشتری جدید */}
        {c.isNew && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber/40 bg-amber-soft/50 p-4">
            <p className="flex items-center gap-2 text-[13px] font-bold text-amber">
              <Icon name="clock" size={15} />
              در انتظار تایید — این مشتری تازه کاتالوکت را ذخیره کرده
            </p>
            <div className="flex items-center gap-2">
              <Button variant="arm" size="sm" className="flex-1" loading={busy} onClick={() => void ack()}>
                <Icon name="check" size={14} />
                تایید مشتری
              </Button>
            </div>
          </div>
        )}

        {/* شناسنامه */}
        <div className="rounded-2xl border border-line bg-surface px-4 py-2">
          <IdentRow label="نام کسب‌وکار" value={c.name} />
          <IdentRow label="صنف" value={c.trade ?? "—"} />
          <IdentRow label="شهر" value={c.city} />
          <IdentRow label="نوع مشتری" value={CUST_T[c.custType ?? "PASSING"]} />
          <IdentRow label="از کِی مشتری است" value={new Date(c.followedAt).toLocaleDateString("fa-IR")} />
          <IdentRow label="منبع رسیدن" value={SRC_T[c.source] ?? "—"} last />
        </div>

        {/* یادداشت */}
        <p className="flex items-center gap-2 pt-1 text-[14px] font-bold text-text">
          <Icon name="pencil" size={15} className="text-text-3" />
          یادداشت
        </p>
        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteDirty(true);
            }}
            rows={3}
            maxLength={500}
            placeholder="یادداشت شخصی — مثلاً: تحویل صبح زود، بازار روز"
            className="w-full resize-none rounded-xl border border-line bg-bg px-3 py-2.5 text-[13px] leading-6 text-text placeholder:text-text-4 focus:border-arm focus:outline-none"
          />
          <Button variant="outline" size="sm" className="mt-2 w-full" loading={busy} disabled={!noteDirty} onClick={() => void saveNote()}>
            <Icon name="check" size={14} />
            ذخیرهٔ یادداشت
          </Button>
        </div>

        {/* سفارش‌ها و استعلام‌های او */}
        <p className="flex items-center gap-2 pt-1 text-[14px] font-bold text-text">
          <Icon name="receipt" size={15} className="text-text-3" />
          سفارش‌ها و درخواست‌های او
        </p>
        {orders.length === 0 && inquiries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-6 text-center text-[12.5px] text-text-3">
            هنوز نه سفارشی داده و نه استعلامی — با تاییدش شروع می‌شود.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => router.push(`/sell/orders/${o.id}`)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-colors hover:border-line-2"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-text-3">
                  <Icon name="receipt" size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <b className="text-[13px] font-bold text-text">
                      {o.docNo ? `سند ${num(o.docNo, locale)}` : `سفارش ${num(o.itemCount, locale)} قلمی`}
                    </b>
                    <OrderStatusBadge status={o.status} />
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-text-3">
                    {new Date(o.createdAt).toLocaleDateString("fa-IR")}
                    {o.totalMinor > 0 ? ` · جمع ${moneyPartsIn(o.totalMinor, "IRR", "IRR", undefined, locale).amount} تومان` : ""}
                  </span>
                </span>
                <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
              </button>
            ))}
            {inquiries.map((iq) => (
              <button
                key={iq.id}
                type="button"
                onClick={() => router.push(`/sell/rfqs`)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-colors hover:border-line-2"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-text-3">
                  <Icon name="inbox" size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <b className="text-[13px] font-bold text-text">
                      استعلام {iq.itemCount > 1 ? `${num(iq.itemCount, locale)} قلمی` : iq.firstName ?? "قیمت"}
                    </b>
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-text-3">{new Date(iq.createdAt).toLocaleDateString("fa-IR")}</span>
                </span>
                <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
              </button>
            ))}
          </div>
        )}

        {/* لیست خرید او */}
        <button
          type="button"
          onClick={() => router.push(`/buy/${c.slug}`)}
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-line-2"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-arm-soft text-arm-strong">
            <Icon name="basket" size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px] font-bold text-text">لیست خرید او</b>
            <span className="mt-0.5 block text-[11.5px] text-text-3">چه چیزهایی می‌خرد — برای تأمین‌کردنش آماده باش</span>
          </span>
          <Icon name="chev" size={17} className="shrink-0 text-text-4 rtl:-scale-x-100" />
        </button>
      </div>
    </AppShell>
  );
}

function IdentRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-2.5", !last && "border-b border-line")}>
      <span className="text-[12px] font-bold text-text-3">{label}</span>
      <span className="truncate text-[12.5px] font-bold text-text">{value}</span>
    </div>
  );
}
