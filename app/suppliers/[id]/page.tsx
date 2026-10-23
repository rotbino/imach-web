"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useStartChat } from "@/lib/queries";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { businessesApi, marketApi } from "@/lib/api";
import { goodName, num } from "@/lib/format";
import { useMoney } from "@/components/imach/prefs-context";

/**
 * `/suppliers/[id]` — اسکرین ۲۳: جزئیات تأمین‌کننده (دید خریدار) (M3 · FD-16).
 *
 * صفحهٔ واسطِ قدیمی حذف (حکم مالک FD-16) — این صفحه «جزئیات» است،
 * قرینهٔ جزئیات مشتری:
 *  · هدر شل: نام + شهر؛ دکمه‌های تماس (گیت ویروسی getContact) و پیام (M8)
 *  · شناسنامه: نام مسئول/صنف/شهر/تلفن/شمار کالاهایش/از کِی در شبکه‌ام
 *  · ردیف «کاتالوگ او» → مستقیم کاتالوگ (حکم مالک)
 *  · پیشنهادها و استعلام‌های او (از getMyInquiries فیلترشده)
 *  · منوی سه‌نقطه: گفتگو · کاتالوگ او · حذف از شبکه
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function SupplierViewPage() {
  return (
    <AuthGate>
      <SupplierView />
    </AuthGate>
  );
}

function SupplierView() {
  const params = useParams<{ id: string }>();
  const supplierId = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const { parts } = useMoney();
  const startChat = useStartChat();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  /* یال من با این تأمین‌کننده → slug برای getBusiness + متادیتای یال */
  const followsQ = useQuery({
    queryKey: ["market", "follows", bizId],
    queryFn: () => marketApi.getFollows(bizId),
    enabled: !!bizId,
  });
  const edge = useMemo(
    () => (followsQ.data ?? []).find((f) => f.supplierId === supplierId) ?? null,
    [followsQ.data, supplierId]
  );
  const slug = edge?.supplier.slug;

  /* شناسنامهٔ کامل از نمای عمومی (کش یک‌دقیقه‌ای سرور) */
  const profileQ = useQuery({
    queryKey: ["business", "profile", slug],
    queryFn: () => businessesApi.getBusiness(slug!),
    enabled: !!slug,
    staleTime: 60_000,
  });

  /* شمارهٔ تماس — گیت ویروسی (فقط کاربر واردشده) */
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadPhone = async () => {
    if (!slug || phone !== null) return;
    setPhoneBusy(true);
    try {
      const c = await businessesApi.getContact(slug);
      setPhone(c.phone ?? "—");
    } catch {
      setPhone("—");
    } finally {
      setPhoneBusy(false);
    }
  };

  /* پیشنهادها و استعلام‌های همین تأمین‌کننده (sv-activity) */
  const inquiriesQ = useQuery({
    queryKey: ["market", "myinquiries", bizId],
    queryFn: () => marketApi.getMyInquiries(bizId),
    enabled: !!bizId,
  });
  const activity = useMemo(() => {
    const rows = inquiriesQ.data?.rows ?? [];
    return rows.filter((r) => r.seller?.id === supplierId).slice(0, 10);
  }, [inquiriesQ.data, supplierId]);

  const unfollow = async () => {
    try {
      await marketApi.unfollowSupplier(bizId, supplierId);
      await qc.invalidateQueries({ queryKey: ["market", "follows", bizId] });
      await qc.invalidateQueries({ queryKey: ["market", "suppliers-dir", bizId] });
      show({ text: `از شبکهٔ تأمین حذف شد`, kind: "success" });
      router.push("/suppliers");
    } catch {
      show({ text: "حذف نشد — دوباره تلاش کن", kind: "error" });
    }
  };

  if (followsQ.isLoading) {
    return (
      <AppShell arm="buy" title="جزئیات تأمین‌کننده">
        <div className="grid place-items-center py-20">
          <Spinner className="size-7 text-arm" />
        </div>
      </AppShell>
    );
  }

  if (!edge) {
    return (
      <AppShell arm="buy" title="جزئیات تأمین‌کننده">
        <EmptyState
          icon={<Icon name="truck" size={30} />}
          title="این تأمین‌کننده در شبکهٔ تو نیست"
          subtitle="شاید قبلاً حذفش کرده باشی — از دفتر تأمین‌کنندگان دنبالش بگرد"
          action={
            <Button variant="outline" size="lg" onClick={() => router.push("/suppliers")}>
              رفتن به دفتر تأمین‌کنندگان
            </Button>
          }
        />
      </AppShell>
    );
  }

  const p = profileQ.data;
  const title = p?.name ?? edge.supplier.name;

  return (
    <AppShell
      arm="buy"
      title={title}
      back="/suppliers"
      headerActions={
        <div className="flex items-center gap-1">
          {/* تماس — گیت ویروسی: با لمس شماره لود می‌شود */}
          <button
            type="button"
            onClick={() => {
              void loadPhone();
              if (phone) show({ text: `شمارهٔ ${title}: ${phone}`, kind: "info" });
            }}
            aria-label="تماس"
            title="تماس"
            className="grid size-10 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
          >
            <Icon name="phone" size={19} />
          </button>
          {/* پیام — M8: گفتگوی واقعی با تأمین‌کننده */}
          <button
            type="button"
            onClick={() => void startChat({ withBusinessId: String(supplierId) })}
            aria-label="پیام"
            title="پیام"
            className="grid size-10 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
          >
            <Icon name="msg" size={19} />
          </button>
          {/* سه‌نقطه */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="گزینه‌های تأمین‌کننده"
            className="grid size-10 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
          >
            <Icon name="dots" size={19} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {/* ── شناسنامه (sv-identity) ── */}
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface px-5 py-4">
          <IdRow label="نام مسئول" value={p?.owner ? p.owner.name : "—"} />
          <IdRow label="صنف" value={p?.trade ?? "—"} />
          <IdRow label="شهر" value={p?.city ?? edge.supplier.city} />
          <IdRow
            label="تلفن"
            value={phoneBusy ? "…" : phone ?? (slug ? "با دکمهٔ تماس نشان داده می‌شود" : "—")}
            ltr={!!phone && phone !== "—"}
          />
          <IdRow label="محصول‌هایش" value={p ? `${num(p.listings?.length ?? 0, locale)} محصول در کاتالوگ` : "—"} />
          <IdRow
            label="در شبکهٔ من از"
            value={new Date(edge.createdAt).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" })}
          />
          {p?.bio && (
            <p className="mt-2 border-t border-dashed border-line pt-2.5 text-[12px] leading-6 text-text-2">{p.bio}</p>
          )}
        </div>

        {/* ── کاتالوک او — مستقیم، نه صفحهٔ واسط (حکم مالک FD-16) ── */}
        <button
          type="button"
          onClick={() => slug && router.push(`/c/${slug}`)}
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-arm-soft text-arm-strong">
            <Icon name="store" size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[14px] font-bold text-text">کاتالوک او</b>
            <span className="block text-[11.5px] text-text-3">قیمت‌های زنده و محصول‌هایش را ببین</span>
          </span>
          <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
        </button>

        {/* ── پیشنهادها و استعلام‌های او (sv-activity) ── */}
        <div className="mt-1 flex items-center gap-2 px-1">
          <Icon name="receipt" size={16} className="text-text-3" />
          <h2 className="text-[14px] font-bold text-text">پیشنهادها و استعلام‌های او</h2>
        </div>
        {inquiriesQ.isLoading ? (
          <div className="grid place-items-center py-10">
            <Spinner className="size-6 text-arm" />
          </div>
        ) : activity.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-5 text-center text-[12.5px] text-text-3">
            هنوز پیشنهاد یا استعلامی بین شما ردوبدل نشده است.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {activity.map((r) => {
              const gName = r.listing?.good
                ? goodName({ nameFa: r.listing.good.nameFa, nameEn: r.listing.good.nameEn }, locale)
                : "—";
              const offer = r.offer;
              const price = offer ? parts(offer.priceMinor, offer.currency) : null;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-[17px] font-black text-text-4/70">
                    {gName.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[13.5px] font-bold text-text">{gName}</b>
                    <span className="block truncate text-[11.5px] text-text-3">
                      {r.volume ? `${num(r.volume, locale)} · ` : ""}
                      {offer ? (offer.note || "پیشنهاد قیمت") : "در انتظار پاسخ"}
                    </span>
                  </span>
                  {price && (
                    <span className="flex shrink-0 flex-col items-end">
                      <b className="text-[13.5px] font-black text-arm-strong">{price.amount}</b>
                      <span className="text-[10px] text-text-3">{price.label}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* حذف — پایان صفحه، آرام */}
        <Button variant="outline" size="lg" className="mt-2 w-full max-w-[460px] self-center text-red" onClick={() => void unfollow()}>
          <Icon name="trash" size={16} /> حذف از شبکهٔ تأمین
        </Button>
      </div>

      {/* شیت منوی سه‌نقطه */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={`گزینه‌های ${title}`}>
        <div className="flex flex-col gap-2 p-5">
          <MenuBtn icon="msg" label="گفتگو" onClick={() => show({ text: "پیام‌رسان در فاز M8 فعال می‌شود", kind: "info" })} />
          <MenuBtn icon="store" label="کاتالوک او" onClick={() => slug && router.push(`/c/${slug}`)} />
          <MenuBtn icon="phone" label="نمایش شمارهٔ تماس" onClick={() => void loadPhone()} />
          <Button variant="outline" size="lg" className="mt-2" onClick={() => setMenuOpen(false)}>
            بستن
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}

function IdRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-line/60 py-2.5 last:border-0">
      <span className="shrink-0 text-[12px] font-bold text-text-3">{label}</span>
      <span dir={ltr ? "ltr" : undefined} className="min-w-0 truncate text-[13px] font-bold text-text">
        {value}
      </span>
    </div>
  );
}

function MenuBtn({
  icon,
  label,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[52px] items-center gap-3 rounded-xl border border-line bg-surface px-4 text-start text-[13.5px] font-bold text-text-2 transition-colors hover:border-line-2 hover:text-text"
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  );
}
