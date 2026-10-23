"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Sheet } from "@/components/ui/sheet";
import { Icon } from "@/components/ui/icon";
import { scoreApi, type ScoreArm, type ScoreArmDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

/** `/home/score` — اسکرین ۱۵: امتیاز فعالیت (M7).
 *
 * روایت طرح FD-7: «شبکه‌ات را بساز → به ۱۰۰ برس → ما شتابت می‌دهیم».
 * • دو بازو با data-score-arm (امتیاز فروش و خرید کاملاً جدا — FD-7)
 * • انجام‌داده/مانده + مسیر امتیاز (۱۰۰ = ورود به شبکه · بعد از ۱۰۰ = شارژ)
 * • شیت «شتابدهی یعنی چه؟» — دو روایت جدا (FD-8: فروش=دیده‌شدن، خرید=تأمین‌کنندهٔ بیشتر)
 * • کارت موتور فعال (۱۰۰+)
 * متن‌ها عین پروتوتایپ imach-final-design (data.js + accelRender) هستند.
 */
export default function NetworkScorePage() {
  return (
    <AuthGate>
      <ScoreContent />
    </AuthGate>
  );
}

function ScoreContent() {
  const params = useSearchParams();
  const router = useRouter();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const [accelOpen, setAccelOpen] = useState(false);

  // URL منبع حقیقت بازوست (؟arm=) — سوییچر = replace بدون اسکرول؛
  // state محلی لازم نیست (درس eslint set-state-in-effect)
  const paramArm = params.get("arm");
  const arm: ScoreArm = paramArm === "buy" ? "buy" : "sell";
  const setArm = (a: ScoreArm) => router.replace(`/home/score?arm=${a}`, { scroll: false });

  const scoreQ = useQuery({
    queryKey: ["score", biz?.id],
    queryFn: () => scoreApi.getScore(biz!.id),
    enabled: !!biz,
  });

  const data = scoreQ.data;
  const armData: ScoreArmDto | undefined = arm === "sell" ? data?.sell : data?.buy;
  const otherScore = arm === "sell" ? data?.scoreBuy : data?.scoreSell;

  return (
    <AppShell arm={arm} title="امتیاز فعالیت" back={arm === "sell" ? "/sell" : "/home"}>
      <div data-score-arm={arm} className="flex flex-col gap-4">
        {/* ── سوییچر دو بازو (امتیاز میز فروش و میز خرید جدا حساب می‌شوند — FD-7) ── */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1">
          {(["sell", "buy"] as const).map((a) => {
            const active = arm === a;
            const s = a === "sell" ? data?.scoreSell : data?.scoreBuy;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setArm(a)}
                data-score-arm={a}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-bold transition-colors",
                  active ? "bg-arm-soft text-arm-strong" : "text-text-3 hover:bg-surface-2"
                )}
              >
                <Icon name={a === "sell" ? "store" : "basket"} size={15} />
                {a === "sell" ? "امتیاز فروش" : "امتیاز خرید"}
                {typeof s === "number" && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px]", active ? "bg-white/70" : "bg-surface-2")}>
                    {s.toLocaleString("fa-IR")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── قهرمان: دایرهٔ امتیاز + روایت ── */}
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-6 text-center">
          <div className="relative grid size-[104px] place-items-center">
            <ScoreRing score={armData?.score ?? 0} />
            <div className="absolute inset-0 grid place-items-center">
              <div>
                <b className="block text-[30px] font-black leading-none text-text">
                  {(armData?.score ?? 0).toLocaleString("fa-IR")}
                </b>
                <span className="mt-0.5 block text-[10px] text-text-3">از ۱۰۰</span>
              </div>
            </div>
          </div>
          <div>
            <b className="text-[15px] font-bold text-text">
              {arm === "sell" ? "امتیاز فعالیت فروش" : "امتیاز فعالیت خرید"}
            </b>
            <p className="mt-1.5 text-[11.5px] leading-[1.95] text-text-3">
              {armData && armData.score >= 100
                ? arm === "sell"
                  ? "🎉 در شبکهٔ آی‌مچ هستی — محصولاتت به خریداران شبکه معرفی می‌شود. هر امتیازِ اضافه از این به بعد قابل تبدیل به شارژ تبلیغات است."
                  : "🎉 در شبکهٔ آی‌مچ هستی — تأمین‌کننده‌های تازه به تو معرفی می‌شوند. هر امتیازِ اضافه از این به بعد قابل تبدیل به شارژ است."
                : arm === "sell"
                  ? "با فعالیت واقعی امتیاز بگیر — کاتالوگت را کامل کن، مشتریانت را دعوت کن، سفارش بگیر. دعوتِ هر مشتری جدید بیشترین امتیاز را دارد."
                  : "با فعالیت واقعی امتیاز بگیر — لیست خریدت را کامل کن، تأمین‌کننده‌هایت را دعوت کن، استعلام بگیر. دعوتِ هر تأمین‌کنندهٔ جدید بیشترین امتیاز را دارد."}
            </p>
          </div>
          {/* نوار پیشرفت تا ۱۰۰ */}
          <div className="h-2 w-full max-w-[260px] overflow-hidden rounded-full bg-surface-2">
            <i
              className="block h-full rounded-full bg-arm transition-[width] duration-500"
              style={{ width: `${Math.min(100, armData?.score ?? 0)}%` }}
            />
          </div>
        </section>

        {/* ── کارت موتور فعال / قفل (FD-7: دو ایستگاه) ── */}
        {armData && armData.open ? (
          <section className="flex items-center gap-3 rounded-2xl border border-green/40 bg-green-soft/40 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-green-soft text-green">
              <Icon name="rocket" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[13.5px] font-bold text-text">موتور شتاب‌دهندهٔ {arm === "sell" ? "فروش" : "خرید"}ت فعال است</b>
              <span className="mt-0.5 block text-[11.5px] leading-5 text-text-3">
                {arm === "sell"
                  ? "محصولاتت به خریداران سراسر شبکه نشان داده می‌شود — بدون تبلیغ و مزاحمت."
                  : "تأمین‌کننده‌های تازه از سراسر شبکه به تو معرفی می‌شوند — بهتر و به‌صرفه‌تر."}
              </span>
            </div>
          </section>
        ) : (
          <section className="flex items-center gap-3 rounded-2xl border border-dashed border-line-2 bg-surface-2/60 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-text-3">
              <Icon name="lock" size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[13.5px] font-bold text-text">
                {armData ? `${Math.max(0, 100 - armData.score).toLocaleString("fa-IR")} امتیاز تا شتابدهی` : "…"}
              </b>
              <span className="mt-0.5 block text-[11.5px] leading-5 text-text-3">
                با {(data?.required ?? 100).toLocaleString("fa-IR")} امتیاز، موتور {arm === "sell" ? "فروش" : "خرید"}ت فعال می‌شود.
              </span>
            </div>
          </section>
        )}

        {/* ── مسیر امتیاز: دو ایستگاه (۱۰۰ = بلیت ورود · بعد از ۱۰۰ = شارژ) ── */}
        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2">
          <PathRow
            icon="rocket"
            title="۱۰۰ امتیاز = ورود به شبکهٔ آی‌مچ"
            sub={
              arm === "sell"
                ? "محصولاتت به خریداران سراسر شبکه نشان داده می‌شود"
                : "تأمین‌کننده‌های تازه از سراسر شبکه به تو معرفی می‌شوند"
            }
            state={armData && armData.score >= 100 ? "done" : "todo"}
          />
          <PathRow
            icon="wallet"
            title="بعد از ۱۰۰ — هر امتیاز = شارژ تبلیغات"
            sub={
              arm === "sell"
                ? "با شارژ، محصولاتت بیشتر و بالاتر دیده می‌شود"
                : "با شارژ، درخواست‌های خریدت به تأمین‌کننده‌های بیشتری می‌رسد"
            }
            state={armData && armData.score > 100 ? "live" : "todo"}
          />
        </section>

        {/* جدایی دو میز — جلوی گیج‌شدنِ «چرا دو تا عدد؟» را می‌گیرد */}
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-text-3">
          <Icon name="info" size={13} />
          امتیاز میز فروش و میز خرید جداگانه حساب می‌شوند
          {typeof otherScore === "number" && <> ({otherScore.toLocaleString("fa-IR")} در بازوی دیگر)</>}
        </p>

        {/* ── «شتابدهی یعنی چه؟» — خواستهٔ صریح مالک (FD-6) ── */}
        <button
          type="button"
          onClick={() => setAccelOpen(true)}
          className="flex items-center gap-2.5 rounded-2xl border border-arm/30 bg-arm-soft/40 px-4 py-3 text-start transition-colors hover:border-arm/50"
        >
          <Icon name="rocket" size={17} className="shrink-0 text-arm-strong" />
          <span className="flex-1 text-[12.5px] font-bold text-text">
            {arm === "sell" ? "شتابدهی در فروش یعنی چه؟" : "شتابدهی در خرید یعنی چه؟"}
          </span>
          <Icon name="chev" size={15} className="shrink-0 text-text-4 rtl:-scale-x-100" />
        </button>

        {/* ── گام بعدی (از /score — عدد محاسبه‌شده، نه متن ثابت؛ درس FD-4) ── */}
        {armData?.deskNext && (
          <section className="flex items-center gap-3.5 rounded-2xl border border-arm/35 bg-arm-soft/30 p-4">
            <span className="grid size-[42px] shrink-0 place-items-center rounded-[12px] bg-arm-soft text-arm-strong">
              <Icon name="tasks" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <b className="text-[13.5px] font-bold text-text">گام بعدی فعالیت</b>
                <span className="rounded-full bg-arm-soft px-2 py-0.5 text-[10.5px] font-bold text-arm-strong">
                  {armData.deskNext.remaining.toLocaleString("fa-IR")} امتیاز تا شتابدهی
                </span>
              </span>
              <span className="mt-1 block text-[12px] leading-5 text-text-2">{armData.deskNext.t}</span>
            </span>
            <Link
              href={armData.deskNext.go}
              className="shrink-0 rounded-xl bg-arm px-3.5 py-2 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            >
              برو
            </Link>
          </section>
        )}

        {/* ── کارهای انجام‌شده / مانده ── */}
        {armData && <ItemsBlock items={armData.items} />}
      </div>

      {/* ── شیت: شتابدهی یعنی چه؟ (FD-8 — دو روایت جدا) ── */}
      <AccelSheet open={accelOpen} onClose={() => setAccelOpen(false)} arm={arm} />
    </AppShell>
  );
}

function ScoreRing({ score }: { score: number }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(100, score) / 100);
  return (
    <svg viewBox="0 0 104 104" className="size-[104px] -rotate-90" aria-hidden>
      <circle cx="52" cy="52" r={R} fill="none" strokeWidth="7" className="stroke-line" />
      <circle
        cx="52"
        cy="52"
        r={R}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        className="stroke-arm transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

function PathRow({
  icon,
  title,
  sub,
  state,
}: {
  icon: "rocket" | "wallet";
  title: string;
  sub: string;
  state: "done" | "live" | "todo";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl p-3",
        state === "done" && "bg-green-soft/30",
        state === "live" && "bg-arm-soft/30",
        state === "todo" && "bg-surface-2/50"
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          state === "done" ? "bg-green-soft text-green" : "bg-surface text-text-2"
        )}
      >
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <b className={cn("block text-[12.5px] font-bold", state === "todo" ? "text-text-2" : "text-text")}>{title}</b>
        <span className="mt-0.5 block text-[11px] leading-[1.8] text-text-3">{sub}</span>
      </div>
      {state === "done" && <Icon name="check" size={16} className="shrink-0 text-green" />}
      {state === "live" && <span className="shrink-0 rounded-full bg-arm px-2 py-0.5 text-[10px] font-bold text-white">زنده</span>}
    </div>
  );
}

function ItemsBlock({ items }: { items: ScoreArmDto["items"] }) {
  const done = items.filter((i) => i.done);
  const todo = items.filter((i) => !i.done);
  const fa = (n: number) => n.toLocaleString("fa-IR");
  return (
    <>
      {done.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-bold text-text">کارهایی که انجام داده‌ای</h2>
          {done.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-green/30 bg-green-soft/20 p-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-green-soft text-green">
                <Icon name="check" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-[13px] font-bold text-text">{it.title}</b>
                <span className="mt-0.5 block text-[11px] text-text-3">{it.sub}</span>
              </div>
              <span className="shrink-0 text-[12px] font-bold text-green">+{fa(it.pts)}</span>
            </div>
          ))}
        </section>
      )}
      {todo.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-bold text-text">کارهایی که مانده</h2>
          {todo.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-text-3">
                <Icon name="clock" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-[13px] font-bold text-text">{it.title}</b>
                <span className="mt-0.5 block text-[11px] text-text-3">{it.sub}</span>
              </div>
              <span className="shrink-0 text-[12px] font-bold text-arm-strong">+{fa(it.pts)}</span>
            </div>
          ))}
        </section>
      )}
      {todo.length === 0 && (
        <p className="rounded-2xl border border-line bg-surface p-4 text-center text-[12px] text-text-3">
          همهٔ کارها انجام شده — عالی!
        </p>
      )}
    </>
  );
}

/** شیت «شتابدهی یعنی چه؟» — متن‌ها عین ACCEL پروتوتایپ (FD-8)؛
 *  عکس‌های راهنمای پروتوتایپ این‌جا متن‌محور بازگو شده‌اند. */
function AccelSheet({ open, onClose, arm }: { open: boolean; onClose: () => void; arm: ScoreArm }) {
  const sell = arm === "sell";
  return (
    <Sheet open={open} onClose={onClose} title={sell ? "شتابدهی در فروش یعنی چه؟" : "شتابدهی در خرید یعنی چه؟"}>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-[12.5px] leading-[1.95] text-text-2">
          وقتی به <b>۱۰۰ امتیاز</b> می‌رسی، موتور شتاب‌دهندهٔ <b>{sell ? "فروشت" : "خریدت"}</b> فعال می‌شود:{" "}
          {sell
            ? "محصولاتت را به خریدارهایی نشان می‌دهیم که دنبال همان کالاها هستند — بدون اینکه خودت تبلیغ کنی یا مزاحم کسی شوی."
            : "از هر کالای لیستت، تأمین‌کننده‌های بیشتری به تو نشان داده می‌شوند — تأمین‌کننده‌های بهتر و به‌صرفه‌تر — بدون اینکه دنبالشان بگردی."}
        </p>
        <p className="text-[12.5px] leading-[1.95] text-text-2">
          کجا؟{" "}
          {sell
            ? "همان صفحه‌هایی که خودت هم هنگام خرید، قیمت بقیهٔ تأمین‌کننده‌ها را کنار هم می‌بینی: صفحهٔ مقایسهٔ پیشنهادها و صفحهٔ قیمت زندهٔ هر کالا — محصولات تو هم همان‌جا بین رقبا دیده می‌شود."
            : "همان صفحه‌هایی که قیمت چند تأمین‌کننده را کنار هم می‌بینی: صفحهٔ تأمین‌کننده‌های هر کالا (درِ «تأمین‌کنندگان بیشتر») و صفحهٔ مقایسهٔ پیشنهادها — پیشنهادهای بیشتری به دستت می‌رسد و خرید به‌صرفه‌تر می‌شود."}
        </p>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-arm-soft text-arm-strong">
            <Icon name="wallet" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-[12.5px] font-bold text-text">بعد از ۱۰۰ چه می‌شود؟</b>
            <span className="mt-0.5 block text-[11.5px] leading-5 text-text-3">
              {sell
                ? "هر امتیازِ اضافه را هر وقت خواستی به شارژ تبدیل کن — شارژ یعنی همان دیده‌شدنِ بیشترِ محصولاتت، این‌بار به انتخاب خودت."
                : "هر امتیازِ اضافه را هر وقت خواستی به شارژ تبدیل کن — شارژ یعنی درخواست‌های خریدت به تأمین‌کننده‌های بیشتری می‌رسد، به انتخاب خودت."}
            </span>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-[11.5px] text-text-3">
          <Icon name="sparkles" size={13} className="shrink-0" />
          {sell ? "شتابدهی یعنی همین: جلوتر دیده شدن، بدون تبلیغ و مزاحمت." : "شتابدهی یعنی همین: تأمین‌کنندهٔ بیشتر، قیمت بهتر — بدون معطلی."}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-[12.5px] font-bold text-text-2 transition-colors hover:bg-surface-2"
        >
          باشه، فهمیدم
        </button>
      </div>
    </Sheet>
  );
}
