"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { marketApi, scoreApi, type FollowedSupplierDto } from "@/lib/api";
import { goodName, num, unitLabel } from "@/lib/format";
import { useMoney } from "@/components/imach/prefs-context";
import { ShareBuyListSheet } from "@/components/imach/buy-list-shared";
import { cn } from "@/lib/utils";

/**
 * `/suppliers` — اسکرین ۲۲: تأمین‌کنندگان من + دوتایی ۲۰ب (M3 · FD-16).
 *
 *  · دفتر تأمین‌کنندگان: جستجو + دعوت تأمین‌کننده جدید (= شیت اشتراک لیست
 *    خرید — حکم مالک FD-16) + ردیف‌های زنده از getSuppliersDirectory
 *    (تب followed: origin mine/theirs + بج «با لینک» + شمار قیمت‌ها)
 *  · منوی سه‌نقطه هر ردیف = شیت از پایین (گفتگو · کاتالوگ او · حذف) —
 *    قانون همیشگی موبایل: همهٔ منوها از پایین باز می‌شوند.
 *  · ?good=<id> → نمای ۲۰ب «تأمین‌کننده‌های X»: کارت انتخابی + کارت‌های
 *    تامین‌کنندهٔ همان کالا از getSupplyBoard (قیمت زنده + تردید قیمت) +
 *    قفل «تأمین‌کنندگان بیشتر» (M7) + نوار چسبان استعلام (M4)
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function SuppliersPage() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <Suppliers />
      </Suspense>
    </AuthGate>
  );
}

function Suppliers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goodParam = searchParams.get("good");
  return goodParam ? <GoodSuppliers goodId={goodParam} /> : <SuppliersLedger />;
}

/* ═══════════════════ نمای عادی — دفتر تأمین‌کنندگان (۲۲) ═══════════════════ */

function SuppliersLedger() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  const dirQ = useQuery({
    queryKey: ["market", "suppliers-dir", bizId],
    queryFn: () => marketApi.getSuppliersDirectory(bizId),
    enabled: !!bizId,
  });

  const [q, setQ] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<FollowedSupplierDto | null>(null);

  const rows = useMemo(() => {
    const all = dirQ.data?.followed ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        (r.city ?? "").toLowerCase().includes(needle) ||
        (r.trade ?? "").toLowerCase().includes(needle)
    );
  }, [dirQ.data, q]);

  const unfollow = async (s: FollowedSupplierDto) => {
    try {
      await marketApi.unfollowSupplier(bizId, s.supplierId);
      await qc.invalidateQueries({ queryKey: ["market", "suppliers-dir", bizId] });
      await qc.invalidateQueries({ queryKey: ["market", "follows", bizId] });
      show({ text: `«${s.name}» از شبکهٔ تأمین حذف شد`, kind: "success" });
      setMenuFor(null);
    } catch {
      show({ text: "حذف نشد — دوباره تلاش کن", kind: "error" });
    }
  };

  return (
    <AppShell arm="buy" title="تأمین‌کنندگان من" wide back="/home">
      <div className="flex flex-col gap-3">
        {/* جستجو */}
        <div className="relative">
          <Icon
            name="search"
            size={17}
            className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-4"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی تأمین‌کننده، کسب‌وکار، شهر…"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-line bg-surface ps-10 pe-3 text-[14px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
          />
        </div>

        {/* دعوت — سقف ۴۶۰ (FD-44: دکمه دعوت ≤۴۶۰) */}
        <Button variant="arm" size="lg" className="mx-auto w-full max-w-[460px]" onClick={() => setShareOpen(true)}>
          <Icon name="user-plus" size={17} /> دعوت تأمین‌کننده جدید
        </Button>

        {/* شمارنده */}
        <p className="px-1 text-[12px] font-bold text-text-3">
          {num(rows.length, locale)} تأمین‌کننده
        </p>

        {/* ردیف‌ها */}
        {dirQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-7 text-arm" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Icon name="truck" size={30} />}
            title={q.trim() ? "چیزی پیدا نشد" : "هنوز تأمین‌کننده‌ای نداری"}
            subtitle={
              q.trim()
                ? "عبارت دیگری امتحان کن"
                : "هر کاتالوگی که ذخیره کنی یک تأمین‌کننده می‌شود؛ هر کس به لیست خریدت پیشنهاد تامین بدهد و تایید کنی هم همین‌طور"
            }
            action={
              !q.trim() ? (
                <Button variant="arm" size="lg" onClick={() => setShareOpen(true)}>
                  <Icon name="user-plus" size={17} /> دعوت تأمین‌کننده
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map((s) => (
              <SupplierRow key={s.supplierId} s={s} onOpen={() => router.push(`/suppliers/${s.supplierId}`)} onMenu={() => setMenuFor(s)} />
            ))}
          </div>
        )}

        {/* تنها جملهٔ توضیح این صفحه (۲۲) */}
        {rows.length > 0 && (
          <div className="mt-2 flex items-start gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-[12px] leading-6 text-text-3">
            <Icon name="sparkles" size={16} className="mt-0.5 shrink-0 text-arm-strong" />
            <span>
              هر کاتالوگی که ذخیره کنی یک تأمین‌کننده می‌شود؛ هر کس به لیست خریدت پیشنهاد تامین بدهد و تایید کنی هم
              همین‌طور.
            </span>
          </div>
        )}
      </div>

      {/* شیت اشتراک = دعوت (حکم مالک FD-16) */}
      <ShareBuyListSheet open={shareOpen} onClose={() => setShareOpen(false)} />

      {/* شیت منوی سه‌نقطه */}
      <SupplierMenuSheet
        s={menuFor}
        onClose={() => setMenuFor(null)}
        onCatalog={() => menuFor && router.push(`/c/${menuFor.slug}`)}
        onChat={() =>
          show({ text: "پیام‌رسان در فاز M8 فعال می‌شود", kind: "info" })
        }
        onRemove={() => menuFor && void unfollow(menuFor)}
      />
    </AppShell>
  );
}

/** ردیف دفتر تأمین‌کنندگان — نام/شهر/تایید + شمار قیمت + سه‌نقطه */
function SupplierRow({ s, onOpen, onMenu }: { s: FollowedSupplierDto; onOpen: () => void; onMenu: () => void }) {
  const { locale } = useLocale();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)]">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-arm-soft text-[16px] font-black text-arm-strong">
          {s.name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <b className="truncate text-[14px] font-bold text-text">{s.name}</b>
            {s.isVerified && <Icon name="verified" size={14} className="shrink-0 text-arm-strong" />}
            {s.origin === "theirs" && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">خودش آمد</span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-text-3">
            <span>{[s.city, s.trade].filter(Boolean).join(" · ") || "—"}</span>
            {s.priceCount > 0 && (
              <span>
                · {num(s.priceCount, locale)} قیمت در تابلوهای من
              </span>
            )}
          </span>
        </span>
      </button>
      {/* سه‌نقطه — قانون: منو از پایین */}
      <button
        type="button"
        onClick={onMenu}
        aria-label={`گزینه‌های ${s.name}`}
        className="grid size-9 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Icon name="dots" size={18} />
      </button>
    </div>
  );
}

/** شیت گزینه‌های تأمین‌کننده (sheet-sup-menu) */
function SupplierMenuSheet({
  s,
  onClose,
  onCatalog,
  onChat,
  onRemove,
}: {
  s: FollowedSupplierDto | null;
  onClose: () => void;
  onCatalog: () => void;
  onChat: () => void;
  onRemove: () => void;
}) {
  return (
    <Sheet open={!!s} onClose={onClose} title={s ? `گزینه‌های ${s.name}` : "گزینه‌های تأمین‌کننده"}>
      <div className="flex flex-col gap-2 p-5">
        <MenuBtn icon="msg" label="گفتگو" onClick={onChat} />
        <MenuBtn icon="store" label="کاتالوک او" onClick={onCatalog} />
        <MenuBtn icon="trash" label="حذف از شبکهٔ تأمین" danger onClick={onRemove} />
        <Button variant="outline" size="lg" className="mt-2" onClick={onClose}>
          بستن
        </Button>
      </div>
    </Sheet>
  );
}

function MenuBtn({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[52px] items-center gap-3 rounded-xl border px-4 text-start text-[13.5px] font-bold transition-colors",
        danger
          ? "border-red/30 bg-red-bg text-red hover:border-red/50"
          : "border-line bg-surface text-text-2 hover:border-line-2 hover:text-text"
      )}
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  );
}

/* ═══════════ نمای دوتایی ۲۰ب — تأمین‌کننده‌های یک کالا ═══════════ */

function GoodSuppliers({ goodId }: { goodId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { locale } = useLocale();
  const { parts } = useMoney();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  const boardQ = useQuery({
    queryKey: ["market", "supplyboard", bizId, goodId],
    queryFn: () => marketApi.getSupplyBoard(bizId, goodId),
    enabled: !!bizId && !!goodId,
  });
  // M7 (§۴.۴) — گیتِ شبکهٔ باز برای «تأمین‌کنندگان بیشتر» همان کالا
  const scoreQ = useQuery({
    queryKey: ["score", bizId],
    queryFn: () => scoreApi.getScore(bizId!),
    enabled: !!bizId,
  });
  const buyScore = scoreQ.data?.buy.score ?? null;
  const buyOpen = scoreQ.data?.buy.open ?? false;

  const board = boardQ.data;
  const good = board?.good ?? null;
  const name = good ? goodName({ nameFa: good.nameFa, nameEn: good.nameEn }, locale) : "—";
  const unit = good ? unitLabel(good.unit, locale) : "";
  const rows = board?.rows ?? [];

  return (
    <AppShell arm="buy" title={`تأمین‌کننده‌های ${name}`} wide back="/buy-list">
      <div className="flex flex-col gap-3 pb-2">
        {boardQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-7 text-arm" />
          </div>
        ) : (
          <>
            {/* کارت کالای انتخابی (picked-card) */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-arm-soft text-[26px] font-black text-arm-strong">
                {name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[15px] font-bold text-text">{name}</b>
                <span className="block truncate text-[12px] text-text-3">
                  {board?.volume ? `${num(board.volume, locale)} ${unit} · ` : ""}
                  {num(rows.length, locale)} تأمین‌کننده · قیمت زنده
                </span>
              </span>
            </div>

            {/* راهنما (bps-hint) */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-[12px] leading-6 text-text-3">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-arm-strong" />
              <span>
                این‌ها تأمین‌کنندگانِ ذخیره‌شدهٔ شما هستند که این نوع کالا را دارند. با هر تغییر قیمتِ آن‌ها، همین‌جا به‌روز
                می‌شود.
              </span>
            </div>

            {/* کارت‌های تامین‌کننده (sup-p-card) — لمس = کاتالوگ او (حکم مالک FD-16) */}
            {rows.length === 0 ? (
              <EmptyState
                icon={<Icon name="truck" size={28} />}
                title="هنوز تأمین‌کننده‌ای این نوع کالا را ندارد"
                subtitle="کاتالوگ‌ها را ذخیره کن تا تأمین‌کنندگان همین نوع کالا این‌جا جمع شوند"
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                {rows.map((r) => {
                  const price = parts(r.priceMinor, r.currency);
                  return (
                    <button
                      key={r.listingId}
                      type="button"
                      onClick={() => router.push(`/c/${r.seller.slug}`)}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)]"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-arm-soft text-[17px] font-black text-arm-strong">
                        {r.seller.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <b className="truncate text-[14px] font-bold text-text">{r.seller.name}</b>
                          {r.seller.isVerified && <Icon name="verified" size={13} className="shrink-0 text-arm-strong" />}
                          {r.followedByMe && (
                            <span className="rounded-full bg-arm-soft px-1.5 py-0.5 text-[9.5px] font-bold text-arm-strong">
                              دنبال می‌کنم
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-text-3">
                          {[r.seller.city, r.seller.trade].filter(Boolean).join(" · ") || "—"}
                        </span>
                        {r.prevMinor !== null && r.prevMinor !== undefined && (
                          <span className="mt-0.5 block text-[10.5px] font-bold text-green">
                            {r.trendPct !== null && r.trendPct < 0 ? "▼" : "▲"} از{" "}
                            {parts(r.prevMinor, r.currency).amount}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <b className="text-[14.5px] font-black text-text">{price.amount}</b>
                        <span className="text-[10.5px] text-text-3">{price.label}</span>
                        <span className="text-[10px] text-text-4">
                          {r.variantLabel ?? `هر ${unit}`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* قفل «تأمین‌کنندگان بیشتر» — گیت امتیاز ۱۰۰ (M7 §۴.۴؛ زنده از /score) */}
            {buyOpen ? (
              <button
                type="button"
                onClick={() => router.push("/home/score?arm=buy")}
                className="mt-1 flex items-center gap-3.5 rounded-2xl border border-green/40 bg-green-soft/30 p-4 text-start"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-green-soft text-green">
                  <Icon name="rocket" size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[13.5px] font-bold text-text">موتور تأمین‌کنندگان تازه فعال است</b>
                  <span className="mt-0.5 block text-[11.5px] leading-5 text-text-3">
                    تأمین‌کننده‌های فراتر از شبکهٔ خصوصیت، پیشنهادهای موتور تطبیق را برای کالاهای لیستت می‌بینند.
                  </span>
                </span>
                <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/home/score?arm=buy")}
                className="mt-1 flex items-center gap-3.5 rounded-2xl border border-dashed border-line-2 bg-surface-2/60 p-4 text-start"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-text-3">
                  <Icon name="lock" size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[13.5px] font-bold text-text">
                    تأمین‌کنندگان بیشتر
                    {typeof buyScore === "number" && (
                      <span className="mr-1.5 rounded-full bg-arm-soft px-2 py-0.5 text-[10.5px] font-bold text-arm-strong">
                        {Math.max(0, 100 - buyScore).toLocaleString("fa-IR")} امتیاز تا شتابدهی
                      </span>
                    )}
                  </b>
                  <span className="mt-0.5 block text-[11.5px] leading-5 text-text-3">
                    با امتیاز فعالیت خرید ۱۰۰، تأمین‌کنندگان فراتر از شبکهٔ خصوصیت را هم می‌بینی — دعوت تأمین‌کنندهٔ جدید
                    یکی از بالاترین امتیازهای آیمچ را دارد.
                  </span>
                </span>
                <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
              </button>
            )}
          </>
        )}
      </div>

      {/* نوار چسبان استعلام — مقصد در M4 وصل می‌شود */}
      <div className="sticky bottom-20 z-20 -mx-4 mt-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-4 lg:mx-0 lg:rounded-2xl lg:border lg:px-4">
        <Button
          variant="arm"
          size="lg"
          className="w-full"
          onClick={() => show({ text: "استعلام قیمت سفارشی در فاز بعدی (M4) فعال می‌شود", kind: "info" })}
        >
          <Icon name="send" size={16} /> استعلام قیمت سفارشی
        </Button>
      </div>
    </AppShell>
  );
}
