"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { fa, fmtMoney } from "@/lib/format";
import { useWallet, useWalletCharge } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Megaphone,
  Plus,
  Receipt,
  Wallet as WalletIcon,
} from "lucide-react";

/*
 * کیف پول تومانی — طرح ۸ (U08/U12): پول واقعی، نه «اعتبار».
 * کیف فقط در لحظهٔ مصرف دیده می‌شود (قانون تشنگی): این صفحه از
 * پروفایل فروش و شیت کمپین باز می‌شود، نه از ناوبری.
 * شارژ = بسته‌های آماده + مبلغ دلخواه → درگاه (نمونه) → رسید در تاریخچه.
 */

const CHARGE_PACKS = [
  { toman: 100_000, hint: "۱۰۰ نمایش یا ۲۰ ذخیره" },
  { toman: 200_000, hint: "۲۰۰ نمایش یا ۴۰ ذخیره" },
  { toman: 500_000, hint: "۵۰۰ نمایش — پکیج اقتصادی" },
];

function txnLabel(type: string): string {
  switch (type) {
    case "CHARGE":
      return "شارژ کیف";
    case "PROMO_SPEND":
      return "قفل بودجهٔ کمپین";
    case "REFERRAL_REWARD":
      return "پاداش دعوت";
    case "REFUND":
      return "برگشت بودجهٔ کمپین";
    default:
      return type;
  }
}

export default function WalletPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "کیف پول | iMach";
    setArmActive("sell");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow grid place-items-center py-32">
          <Loader2 className="size-6 animate-spin text-primary" />
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }
  return <WalletBody />;
}

function WalletBody() {
  const biz = useActiveBusiness();
  if (!biz) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow grid place-items-center py-32">
          <Loader2 className="size-6 animate-spin text-primary" />
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-4 pb-24 sm:px-6 sm:pb-8">
          <WalletInner bizId={biz.id} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function WalletInner({ bizId }: { bizId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const walletQ = useWallet(bizId);
  const chargeMut = useWalletCharge();
  const [custom, setCustom] = useState("");
  const [charged, setCharged] = useState(false);

  const balanceMinor = walletQ.data?.balanceMinor ?? 0;
  // نمایش تومانی — minor ریال ÷ ۱۰ (نرخ‌های طرح ۸: ۱٬۰۰۰ ت نمایش، ۵٬۰۰۰ ت ذخیره)
  const balanceToman = Math.floor(balanceMinor / 10);

  const doCharge = (toman: number) => {
    chargeMut.mutate(
      { businessId: bizId, amountToman: toman },
      {
        onSuccess: (r) => {
          setCharged(true);
          toast({
            title: "شارژ موفق",
            description: `رسید ${r.receipt} — موجودی تازه شد.`,
          });
        },
        onError: (e) =>
          toast({ title: (e as Error).message || "شارژ ناموفق بود", variant: "destructive" }),
      }
    );
  };

  const customToman = Number(custom.replace(/[^\d]/g, "")) || 0;

  if (walletQ.isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* ═══ کارت موجودی — تومان، بی‌واژهٔ «اعتبار» ═══ */}
      <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-[#fff6ec] to-[#ffeeda] p-5 shadow-sm">
        <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#9a3d06]">
          <WalletIcon className="size-4" />
          کیف پول شما
        </p>
        <p className="mt-2 text-[34px] font-black leading-none text-[#29241d]">
          {fa(balanceToman.toLocaleString("fa-IR"))}
          <span className="ms-1.5 text-base font-bold text-[#9a3d06]">تومان</span>
        </p>
        <p className="mt-2 text-[11.5px] leading-6 text-[#9a3d06]/80">
          هزینهٔ کمپین «صف اول» همین‌جا کم می‌شود: هر نمایش هدفمند ۱٬۰۰۰ تومان + هر دنبال‌کردن ۵٬۰۰۰ تومان.
        </p>
        <Button
          className="mt-3 gap-1.5"
          variant="outline"
          onClick={() => router.push("/sell/promos")}
        >
          <Megaphone className="size-4 text-primary" />
          کمپین‌های من
        </Button>
      </div>

      {/* ═══ شارژ — بسته‌ها + دلخواه (طرح ۸ U12: درگاه نمونه) ═══ */}
      <section className="mt-5">
        <h2 className="mb-2.5 flex items-center gap-1.5 px-1 text-sm font-extrabold">
          <Plus className="size-4 text-primary" />
          شارژ کیف
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {CHARGE_PACKS.map((p) => (
            <button
              key={p.toman}
              type="button"
              disabled={chargeMut.isPending}
              onClick={() => doCharge(p.toman)}
              className="rounded-2xl border bg-white p-3 text-center transition hover:border-primary/50 hover:shadow-sm disabled:opacity-50"
            >
              <p className="text-[15px] font-extrabold">{fa((p.toman / 1000).toString())} هزار</p>
              <p className="mt-1 text-[9.5px] leading-4 text-muted-foreground">{p.hint}</p>
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <input
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="مبلغ دلخواه (تومان)"
            className="h-11 flex-1 rounded-xl border bg-white px-3.5 text-[13px] outline-none placeholder:text-stone-400 focus:border-primary/50"
          />
          <Button
            className="h-11 px-4"
            disabled={chargeMut.isPending || customToman < 10_000}
            onClick={() => doCharge(customToman)}
          >
            {chargeMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "شارژ"}
          </Button>
        </div>
        {customToman > 0 && customToman < 10_000 && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">حداقل شارژ ۱۰ هزار تومان است.</p>
        )}
        {charged && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-[#e9f7ee] px-3 py-2 text-[11.5px] font-bold text-[#16a34a]">
            <Receipt className="size-3.5" />
            پرداخت موفق — رسید در تاریخچه ثبت شد.
          </p>
        )}
      </section>

      {/* ═══ تاریخچه — آخرین ۳۰ تراکنش ═══ */}
      <section className="mt-6">
        <h2 className="mb-2.5 flex items-center gap-1.5 px-1 text-sm font-extrabold">
          <Receipt className="size-4 text-primary" />
          تاریخچه
        </h2>
        {(walletQ.data?.txns ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white/70 p-6 text-center text-xs leading-6 text-muted-foreground">
            هنوز تراکنشی نیست — شارژ کنید یا اولین کمپین را راه بیندازید.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(walletQ.data?.txns ?? []).map((t) => {
              const inr = t.amountMinor > 0;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                      inr ? "bg-[#e9f7ee] text-[#16a34a]" : "bg-[#fdebe8] text-[#c0392b]"
                    }`}
                  >
                    {inr ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="text-[12.5px] font-bold">{txnLabel(t.type)}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                      {t.description ?? "—"}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-[12.5px] font-extrabold ${
                      inr ? "text-[#16a34a]" : "text-[#c0392b]"
                    }`}
                  >
                    {inr ? "+" : "−"}
                    {fmtMoney(Math.abs(t.amountMinor), "IRR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
