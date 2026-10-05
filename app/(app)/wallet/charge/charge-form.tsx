"use client";

/**
 * /wallet/charge — افزایش کیف پول (پورت sc-charge از Prototype v18 · فاز ۶).
 *
 * بسته‌های آماده (۱۰۰/۳۰۰/۵۰۰ هزار) + مبلغ دلخواه با فرم Production-grade:
 *  · نرمال‌سازی ارقام فارسی/عربی → لاتین + جداکنندهٔ هزارگان زنده
 *  · حداقل ۱۰ هزار تومان (قرارداد بک‌اند) + برآورد مشاهدهٔ هدفمند
 *  · پرداخت → POST /wallet/charge (قرارداد پاسخ درگاه: مبلغ + رسید)
 *  · حالت موفقیت (empty-state) → بازگشت به کیف با موجودی تازه
 * تطبیق آگاهانه: درگاه واقعی (زرین‌پال) در فاز بعدی وصل می‌شود — همان
 * قرارداد پاسخ فعلاً پیاده است (بک‌اند wallet/charge)؛ UI عین Prototype.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Appbar } from "@/components/imach/appbar";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { useMessages } from "@/i18n/messages/use-messages";
import { useActiveBusiness } from "@/lib/active-biz";
import { useWalletCharge, useWallet } from "@/lib/queries";
import { fa, fmtMoney } from "@/lib/format";
import { faPlain } from "../../sell/_shared/num";
import { useToast } from "@/hooks/use-toast";
import { useMoney } from "@/components/imach/currency-context";

const PKGS = [100_000, 300_000, 500_000];

/** ارقام فارسی/عربی → لاتین */
function toLatinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** فقط رقم + جداکنندهٔ هزارگان فارسی (نمایش زنده — همان الگوی شیت‌های فاز ۵) */
function formatToman(raw: string): string {
  const digits = toLatinDigits(raw).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  return fa(Number(digits)).replace(/,/g, "٬");
}

function parseToman(display: string): number {
  const digits = toLatinDigits(display).replace(/[٬,\s]/g, "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function ChargeForm() {
  const m = useMessages();
  const t = m.app.charge;
  const router = useRouter();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;
  const walletQ = useWallet(bizId);
  const chargeMut = useWalletCharge();
  // فاز ۸ — سوییچ ادمین: پرداخت خاموش = فقط مسیر دعوت (اعتبار رایگان)
  const money = useMoney();
  const paymentsOff = money.paymentsEnabled === false;

  const [picked, setPicked] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState(false);
  const [receipt, setReceipt] = useState<{ amount: number; ref: string } | null>(null);

  const effective = picked ?? parseToman(amount);
  const estViews = Math.floor(effective / 1_000);

  const pick = (v: number) => {
    setPicked(picked === v ? null : v);
    if (picked === v) return;
    setAmount(formatToman(String(v)));
    setErr(false);
  };

  const pay = () => {
    if (!bizId) return;
    if (effective < 10_000) {
      setErr(true);
      return;
    }
    setErr(false);
    chargeMut.mutate(
      { businessId: bizId, amountToman: effective },
      {
        onSuccess: (res) => {
          setReceipt({ amount: effective, ref: res.receipt });
        },
        onError: () => toast({ title: m.app.editBiz.saveFailed, variant: "destructive" }),
      }
    );
  };

  const pkgLabel = useMemo(() => (v: number) => fa(Math.floor(v / 1000)).replace(/,/g, "٬"), []);

  if (receipt) {
    return (
      <section className="screen" data-screen="charge">
        <Appbar deskTitle={t.title} />
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--emerald-tint)", color: "var(--emerald)" }}>
              <Icon name="i-checkc" />
            </span>
            <h3>{t.successTitle}</h3>
            <p>
              {t.successBody.replace("{n}", faPlain(receipt.amount)).replace("{ref}", receipt.ref)}
              <br />
              {t.successNote}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                void walletQ.refetch();
                router.push("/wallet");
              }}
            >
              {t.back}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // فاز ۸ — درگاه خاموش: صفحهٔ شارژ به «مسیر دعوت» تبدیل می‌شود (Prototype-compatible)
  if (paymentsOff) {
    return (
      <section className="screen" data-screen="charge">
        <Appbar deskTitle={t.title} />
        <div className="screen-body">
          <div className="empty-state">
            <span className="art" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>
              <Icon name="i-users" />
            </span>
            <h3>{m.app.intl.paymentsOff}</h3>
            <p>{m.app.intl.paymentsOffSub}</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                const url = `${window.location.origin}/b/${biz?.slug ?? ""}`;
                void (async () => {
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: biz?.name ?? "iMach", url });
                      return;
                    }
                    throw new Error("no-web-share");
                  } catch {
                    await navigator.clipboard.writeText(url).catch(() => undefined);
                    toast({ title: m.app.home.linkCopied });
                  }
                })();
              }}
            >
              <Icon className="ic-sm" name="i-share" /> {m.app.intl.inviteOnlyCta}
            </button>
            <button className="btn btn-soft" onClick={() => router.push("/wallet")}>
              {t.back}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="screen" data-screen="charge">
      <Appbar deskTitle={t.title} />

      <div className="screen-body">
        <div className="pkgs">
          {PKGS.map((v) => (
            <button
              key={v}
              type="button"
              className={picked === v ? "pkg best" : "pkg"}
              onClick={() => pick(v)}
              aria-pressed={picked === v}
            >
              {v === 300_000 ? <i>{t.pkgBest}</i> : null}
              <b>{pkgLabel(v)} هزار</b>
              <span>{m.app.wallet.balance}</span>
            </button>
          ))}
        </div>

        <div className="sec-title">
          <h2>{t.customTitle}</h2>
        </div>
        <div className="card">
          <div className="field" style={{ marginBottom: 6 }}>
            <label>
              {t.amountLabel}
              <i>{t.tomanNote}</i>
            </label>
            <input
              className={err ? "inp inp-lg err" : "inp inp-lg"}
              style={{ direction: "ltr", textAlign: "right" }}
              inputMode="numeric"
              placeholder={t.placeholder}
              value={amount}
              onChange={(e) => {
                setPicked(null);
                setAmount(formatToman(e.target.value));
                setErr(false);
              }}
              aria-invalid={err}
            />
            {err ? <div className="f-err">{t.errAmount}</div> : null}
          </div>
        </div>

        <div className="budget-note">
          {t.calcN
            .replace("{n}", faPlain(effective))
            .replace("{views}", fa(estViews))}
        </div>

        <button
          className="btn btn-primary btn-lg btn-block"
          style={{ marginTop: 14 }}
          disabled={chargeMut.isPending}
          onClick={pay}
        >
          {chargeMut.isPending ? (
            <>
              <Spinner size={16} /> {t.paying}
            </>
          ) : (
            <>
              <Icon className="ic-sm" name="i-shield" />
              {t.payBtn}
            </>
          )}
        </button>
      </div>
    </section>
  );
}
