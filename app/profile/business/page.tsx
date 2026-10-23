"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { businessesApi } from "@/lib/api";

/**
 * `/profile/business` — ۱۶ ویرایش کسب‌وکار (M8): فرم ساده —
 * نام/شهر کنار هم (دسکتاپ · کاغذ ۷۶۰) + صنف (اختیاری، انتخاب از رجیستری)
 * + توضیح کوتاه (bio). اطلاعاتی که خریداران می‌بینند.
 */
export default function EditBusinessPage() {
  return (
    <AuthGate>
      <EditBusinessBody />
    </AuthGate>
  );
}

function EditBusinessBody() {
  const { show } = useToast();
  const router = useRouter();
  const businesses = useAuthStore((s) => s.businesses);
  const updateBusinesses = useAuthStore((s) => s.updateBusinesses);
  const biz = businesses[0];

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [trade, setTrade] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // مقدار اولیه از کسب‌وکار زنده — الگوی legacy edit-biz-form
  const bizId = biz?.id ?? null;
  if (bizId && loadedFor !== bizId) {
    setLoadedFor(bizId);
    setName(biz?.name ?? "");
    setCity(biz?.city ?? "");
    setTrade(biz?.trade ?? "");
    setBio(biz?.bio ?? "");
  }

  const dirty = useMemo(
    () =>
      name.trim() !== (biz?.name ?? "") ||
      city.trim() !== (biz?.city ?? "") ||
      trade.trim() !== (biz?.trade ?? "") ||
      bio.trim() !== (biz?.bio ?? ""),
    [name, city, trade, bio, biz]
  );

  const save = async () => {
    if (name.trim().length < 2) {
      show({ text: "نام کسب‌وکار حداقل دو حرف باشد", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      await businessesApi.editBusiness(biz!.id, {
        name: name.trim(),
        city: city.trim() || undefined,
        trade: trade.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      updateBusinesses(await businessesApi.getMyBusinesses());
      show({ text: "ذخیره شد — خریداران از الان نسخهٔ تازه را می‌بینند", kind: "success", duration: 6000 });
      router.push("/profile");
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ذخیره نشد — دوباره تلاش کنید", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell arm="keep" back="/profile" title="ویرایش کسب‌وکار">
      <div data-edit-business className="mx-auto flex w-full max-w-[760px] flex-col gap-4 pb-6">
        <p className="px-1 text-[12px] leading-5 text-text-3">اطلاعاتی که خریداران می‌بینند</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-text-2">نام کسب‌وکار</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="نام کسب‌وکار"
              data-field="name"
              className="h-11 rounded-xl border border-line bg-bg px-3.5 text-[13.5px] font-bold text-text outline-none focus:border-line-2"
            />
            <span className="text-[11px] text-text-3">این نام روی کاتالوگ و پیام‌های شما دیده می‌شود</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-text-2">شهر</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="شهر"
              data-field="city"
              className="h-11 rounded-xl border border-line bg-bg px-3.5 text-[13.5px] font-bold text-text outline-none focus:border-line-2"
            />
            <span className="text-[11px] text-text-3">برای پیدا‌شدن توسط خریداران همان شهر</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => setTradeOpen(true)}
          className="flex flex-col gap-1.5 rounded-xl text-start"
          data-field="trade"
        >
          <span className="text-[12.5px] font-bold text-text-2">
            صنف <span className="font-normal text-text-4">— اختیاری</span>
          </span>
          <span className="flex h-11 items-center justify-between rounded-xl border border-line bg-bg px-3.5">
            <span className={trade ? "text-[13.5px] font-bold text-text" : "text-[13.5px] text-text-4"}>
              {trade || "انتخاب صنف"}
            </span>
            <Icon name="chev" size={16} className="text-text-4 rtl:-scale-x-100" />
          </span>
          <span className="text-[11px] text-text-3">
            در نسخه‌های بعدی برای فیلتر قیمت و تبلیغ هدفمند استفاده می‌شود — در حال حاضر اختیاری است.
          </span>
        </button>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-text-2">
            توضیح کوتاه <span className="font-normal text-text-4">— اختیاری</span>
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            aria-label="توضیح کوتاه"
            data-field="bio"
            rows={3}
            maxLength={280}
            placeholder="مثلاً: سوپرمارکت عمده‌فروش — برنج، روغن و مواد غذایی با قیمت عمده"
            className="rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[13.5px] leading-6 text-text outline-none placeholder:text-text-4 focus:border-line-2"
          />
          <span className="text-[11px] text-text-3">زیر نام کسب‌وکار در ویترین عمومی شما</span>
        </label>

        {/* نوار ذخیره — چسبان به کف */}
        <div className="sticky inset-x-0 bottom-0 z-20 -mx-4 mt-2 border-t border-line bg-bg/95 p-4 backdrop-blur-sm lg:-mx-8">
          <div className="mx-auto flex max-w-[760px] gap-2.5">
            <Button variant="outline" size="xl" className="flex-1" onClick={() => router.push("/profile")}>
              انصراف
            </Button>
            <Button variant="arm" size="xl" className="flex-[1.6]" loading={busy} disabled={!dirty} onClick={() => void save()} data-save-business>
              <Icon name="check" size={17} />
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </div>

      <TradeSheet open={tradeOpen} onClose={() => setTradeOpen(false)} current={trade} onPick={(t) => { setTrade(t); setTradeOpen(false); }} />
    </AppShell>
  );
}

/** انتخاب صنف از رجیستری — جست‌وجو + اصناف اصلی */
function TradeSheet({
  open,
  onClose,
  current,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  current: string;
  onPick: (trade: string) => void;
}) {
  const [q, setQ] = useState("");
  const tradesQ = useQuery({
    queryKey: ["trades"],
    queryFn: () => businessesApi.getTrades(),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const trades = (tradesQ.data ?? []).filter((t) => !q.trim() || t.name.includes(q.trim()));

  return (
    <Sheet open={open} onClose={onClose} title="انتخاب صنف">
      <div className="flex flex-col gap-3 p-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="جست‌وجوی صنف"
          placeholder="جست‌وجوی صنف…"
          className="h-11 rounded-xl border border-line bg-bg px-3.5 text-[13.5px] text-text outline-none placeholder:text-text-4 focus:border-line-2"
        />
        {tradesQ.isLoading ? (
          <p className="py-6 text-center text-[12.5px] text-text-3">در حال بارگذاری…</p>
        ) : trades.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-text-3">صنف‌ای با این نام نیست — می‌توانی دستی بنویسی</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {trades.slice(0, 40).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(t.name)}
                className={cn(
                  "flex min-h-[46px] items-center justify-between rounded-xl border px-4 text-start text-[13.5px] font-bold transition-colors",
                  current === t.name ? "border-arm bg-arm-soft text-arm-strong" : "border-line bg-surface text-text-2 hover:border-line-2"
                )}
              >
                <span>{t.name}</span>
                {t.isCore && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">رایج</span>
                )}
              </button>
            ))}
          </div>
        )}
        <Button variant="outline" size="lg" onClick={onClose}>
          بستن
        </Button>
      </div>
    </Sheet>
  );
}
