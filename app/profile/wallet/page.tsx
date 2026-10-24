"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth-store";
import { walletApi, type WalletTxnDto } from "@/lib/api";
import { fa } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `/profile/wallet` — اسکرین ۳۵: شارژ (M9 · سند ۰۸ §M9).
 * «بسته‌های پیش‌فرض + مبلغ دلخواه + تاریخچه» (از ۱۸) — درگاهِ طرح ۸:
 * فعلاً قرارداد پاسخ درگاه (رسید موفق) پیاده شده؛ اتصال زرین‌پال فاز بعد.
 * • بسته‌های پیش‌فرض (۵۰۰/۱/۲/۵ میلیون) — لمس = پرشدن مبلغ دلخواه
 * • مبلغ دلخواه تایپی (تومان) + دکمهٔ شارژ (گیت payments.enabled سرور)
 * • تاریخچهٔ تراکنش‌ها (شارژ/قفل بودجه/پاداش دعوت/برگشت) — «مصرف‌ها و
 *   افزایش‌های شارژ» همان زبان پروتوتایپ ۳۴/۳۵
 * • شارژ رایگان با دعوت (موتور رشد — لینک ?ref) + کارت امتیاز→شارژ (FD-7)
 */
const PACKS = [500_000, 1_000_000, 2_000_000, 5_000_000];

/* ورودی عددی تایپی: ارقام فارسی/لاتین و جداکننده‌ها را می‌فهمد (FD-26) */
function parseNum(v: string): number {
  const en = v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9]/g, "");
  return parseInt(en || "0", 10) || 0;
}

const TXN_FACE: Record<WalletTxnDto["type"], { icon: "wallet" | "sparkles" | "users" | "history"; cls: string; label: string }> = {
  CHARGE: { icon: "wallet", cls: "bg-green-soft text-green", label: "شارژ کیف پول" },
  PROMO_SPEND: { icon: "sparkles", cls: "bg-arm-soft text-arm-strong", label: "قفل بودجهٔ تبلیغ" },
  REFERRAL_REWARD: { icon: "users", cls: "bg-green-soft text-green", label: "پاداش دعوت" },
  REFUND: { icon: "history", cls: "bg-primary-soft text-primary-strong", label: "برگشت بودجهٔ تبلیغ" },
};

export default function ChargePage() {
  return (
    <AuthGate>
      <ChargeContent />
    </AuthGate>
  );
}

function ChargeContent() {
  const { show } = useToast();
  const qc = useQueryClient();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  const [amount, setAmount] = useState("۵۰۰٬۰۰۰");
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const walletQ = useQuery({
    queryKey: ["wallet", bizId],
    queryFn: () => walletApi.getWallet(bizId),
    enabled: !!bizId,
  });
  const wallet = walletQ.data;

  const amountToman = useMemo(() => parseNum(amount), [amount]);
  const canCharge = amountToman >= 10_000 && !busy;

  const charge = async () => {
    if (!biz || !canCharge) return;
    setBusy(true);
    try {
      const r = await walletApi.charge(biz.id, amountToman);
      show({ text: `شارژ انجام شد — رسید ${r.receipt}`, kind: "success" });
      await qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "شارژ انجام نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const inviteLink =
    typeof window !== "undefined" && biz ? `${window.location.origin}/c/${biz.slug}?ref=${biz.slug}` : "";

  return (
    <AppShell arm="sell" title="شارژ" back="/profile">
      <div className="flex flex-col gap-4">
        {/* ── موجودی فعلی (wallet-hero پروتوتایپ ۳۵) ── */}
        <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-green-soft text-green">
            <Icon name="wallet" size={22} />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <b className="text-[26px] font-black leading-none text-text">
                {fa(Math.round((wallet?.balanceMinor ?? 0) / 10))}
              </b>
              <small className="text-[11px] text-text-3">تومان</small>
            </div>
            <div className="mt-1 text-[11.5px] text-text-3">موجودی شارژ فعلی — برای فعالیت‌های تبلیغاتی</div>
          </div>
        </section>

        {/* ── بسته‌های پیش‌فرض (M9: بسته‌های پیش‌فرض + مبلغ دلخواه) ── */}
        <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <b className="text-[13px] font-bold text-text">افزایش شارژ</b>
            <span className="text-[10.5px] text-text-4">حداقل ۱۰٬۰۰۰ تومان</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PACKS.map((p) => {
              const active = amountToman === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(fa(p))}
                  className={cn(
                    "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors active:scale-[.98]",
                    active
                      ? "border-green/50 bg-green-soft text-green"
                      : "border-line bg-bg text-text-2 hover:border-line-2"
                  )}
                >
                  <b className="text-[13.5px] font-black">{fa(p / 1000)} هزار</b>
                  <span className="text-[9.5px] text-text-4">تومان</span>
                </button>
              );
            })}
          </div>

          {/* مبلغ دلخواه — ورودی تایپی (تومان) */}
          <div className="relative">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="مثلاً ۱۰۰٬۰۰۰"
              aria-label="مبلغ دلخواه به تومان"
              className="h-12 w-full rounded-xl border border-line bg-bg ps-4 pe-14 text-[14.5px] font-bold text-text placeholder:font-normal placeholder:text-text-4 focus:border-green/50 focus:outline-none focus:ring-2 focus:ring-green/15"
            />
            <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[10.5px] text-text-4">
              تومان
            </span>
          </div>

          <Button variant="arm" size="lg" className="mt-1 w-full" disabled={!canCharge} onClick={() => void charge()}>
            <Icon name="wallet" size={17} />
            {busy ? "در حال شارژ…" : "پرداخت و شارژ کیف"}
          </Button>
          <p className="text-center text-[10.5px] leading-[1.9] text-text-4">
            پرداخت به‌ازای نتیجه: ۱٬۰۰۰ تومان هر نمایشِ هدفمند · ۵٬۰۰۰ تومان هر ذخیرهٔ حاصل
          </p>
        </section>

        {/* ── شارژ رایگان با دعوت (موتور رشد — همان ۳۵ پروتوتایپ) ── */}
        <section
          className="flex flex-col gap-3 rounded-2xl border p-4"
          style={{ borderColor: "#B6DFC5", background: "linear-gradient(135deg,#F0FDF4,#FFF 60%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-soft text-green">
              <Icon name="share" size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[13px] font-bold text-text">لینک کاتالوگت را بفرست</b>
              <span className="mt-0.5 block text-[11px] leading-[1.8] text-text-3">
                هر کس با لینک تو عضو آی‌مچ شود و اولین ذخیره را بکند، <b className="text-green">۵٬۰۰۰ تومان شارژ</b>{" "}
                می‌گیری.
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShareOpen(true)}>
            <Icon name="share" size={15} />
            اشتراک کاتالوگ
          </Button>
        </section>

        {/* ── مصرف‌ها و افزایش‌های شارژ (تاریخچه از ۱۸) ── */}
        <section className="flex flex-col gap-2">
          <b className="px-1 text-[13px] font-bold text-text">مصرف‌ها و افزایش‌های شارژ</b>
          <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-3.5">
            {(wallet?.txns ?? []).length === 0 && (
              <div className="py-8 text-center text-[11.5px] text-text-4">
                هنوز تراکنشی نیست — شارژ کن یا با دعوتِ همکاران پاداش بگیر
              </div>
            )}
            {(wallet?.txns ?? []).map((t) => {
              const face = TXN_FACE[t.type] ?? TXN_FACE.CHARGE;
              const positive = t.amountMinor > 0;
              return (
                <div key={t.id} data-txn-type={t.type} className="flex items-center gap-3 py-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", face.cls)}>
                    <Icon name={face.icon} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold text-text">{face.label}</div>
                    <div className="mt-0.5 truncate text-[10.5px] text-text-4">
                      {t.description ?? "—"} · {new Date(t.createdAt).toLocaleDateString("fa-IR")}
                    </div>
                  </div>
                  <b
                    className={cn(
                      "shrink-0 text-[12.5px] font-black tabular-nums",
                      positive ? "text-green" : "text-text-2"
                    )}
                  >
                    {positive ? "+" : "−"} {fa(Math.abs(Math.round(t.amountMinor / 10)))}
                  </b>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── شیت اشتراک کاتالوگ (اشتراک سریع ۳۵) ── */}
      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="اشتراک کاتالوگ">
        <p className="mb-3 text-[11.5px] leading-[1.9] text-text-3">
          لینک را بفرست — هر کس ذخیره کند، مشتری تو می‌شود و قیمت‌های تازه را همان لحظه می‌بیند.
        </p>
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 p-3" dir="ltr">
          <Icon name="link" size={15} className="shrink-0 text-text-3" />
          <span className="min-w-0 flex-1 truncate text-start text-[12px] text-text">{inviteLink}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(inviteLink);
              show({ text: "لینک کاتالوگ کپی شد", kind: "success" });
            }}
          >
            <Icon name="copy" size={15} />
            کپی لینک
          </Button>
          <Button
            variant="arm"
            size="sm"
            onClick={() => {
              if (biz)
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`کاتالوگ ${biz.name} در آی‌مچ:\n${inviteLink}`)}`,
                  "_blank"
                );
            }}
          >
            <Icon name="whatsapp" size={15} />
            واتس‌اپ
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
