"use client";

/**
 * Onboard — صفحهٔ اول سایت (پورت sc-onboard از Prototype v18 · فاز ۳).
 *
 *  · ساختار عین Prototype: blobs → mid (لوگو/تگ‌لاین/سؤال نقش) → choice-grid
 *    (خریدار/فروشنده) → footnote → login-link → intro-wrap (آی‌مچ چیست؟)
 *  · انتخاب نقش → ثبت‌نام با نقشِ از-پیش-انتخاب‌شده (/start?role=buy|sell)؛
 *    کاربرِ واردشده → مستقیم شل خودش (routeAfterAuth)
 *  · سوییچ زبان بالای صفحه (الزام مالک — پیش‌فرض از Accept-Language سرور)
 *  · لینک راهنمای Prototype (help.html) حذف شد — صفحهٔ راهنمای واقعی هنوز
 *    مسیر ندارد؛ در فاز عمومی‌ها (فاز ۷) اضافه می‌شود (MIGRATION-MAP §۴)
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { routeAfterAuth } from "@/lib/active-biz";
import { fa } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { useMessages } from "@/i18n/messages/use-messages";
import { Icon } from "@/components/imach/icon";
import { LangSwitch } from "@/components/imach/lang-switch";

export function Onboard() {
  const router = useRouter();
  const m = useMessages();
  const t = m.app.onboard;
  const { locale } = useLocale();
  const status = useAuthStore((s) => s.status);
  const authed = status === "authed";
  const [introSide, setIntroSide] = useState<"sell" | "buy">("sell");
  /** شمارهٔ ردیف مزایا — فارسی/عربی برای RTL، لاتین برای انگلیسی */
  const num = (i: number) => (locale === "en" ? String(i + 1) : fa(i + 1));

  /** انتخاب نقش — میهمان → ثبت‌نام با نقش؛ واردشده → مستقیم شل */
  const choose = (arm: "buy" | "sell") => {
    if (authed) {
      router.push(routeAfterAuth(useAuthStore.getState().businesses));
      return;
    }
    router.push(`/start?role=${arm}`);
  };

  const benList = introSide === "sell" ? t.benSell : t.benBuy;

  return (
    <section className="screen" data-screen="onboard">
      <div className="onboard">
        <div className="blobs" aria-hidden>
          <i className="b1" />
          <i className="b2" />
          <i className="b3" />
        </div>

        {/* سوییچ زبان — الزام مالک: تعویض زبان در صفحهٔ اول */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 6, position: "relative" }}>
          <LangSwitch compact />
        </div>

        <div className="mid">
          <img className="logo-h" src="/logo3.svg" alt="iMatch" />
          <div className="tagline">{t.tagline}</div>
          <div className="q">{t.q}</div>
          <div className="qsub">{t.qsub}</div>
        </div>

        <div className="choice-grid">
          <button type="button" className="choice-card buy" onClick={() => choose("buy")}>
            <span className="ico">
              <Icon name="i-basket" />
            </span>
            <span className="tx">
              <b>{t.buyTitle}</b>
              <span>{t.buySub}</span>
            </span>
            <Icon name="i-back" className="ar" />
          </button>
          <button type="button" className="choice-card sell" onClick={() => choose("sell")}>
            <span className="ico">
              <Icon name="i-box" />
            </span>
            <span className="tx">
              <b>{t.sellTitle}</b>
              <span>{t.sellSub}</span>
            </span>
            <Icon name="i-back" className="ar" />
          </button>
        </div>

        <div className="footnote">
          {t.footnoteA}
          <b>{t.footnoteB1}</b>
          {t.footnoteBand}
          <b>{t.footnoteB2}</b>
          {t.footnoteC}
        </div>

        {authed ? (
          <div className="login-link">
            {t.authedA}{" "}
            <u
              onClick={() => router.push(routeAfterAuth(useAuthStore.getState().businesses))}
              style={{ cursor: "pointer" }}
            >
              {t.enterApp}
            </u>
          </div>
        ) : (
          <div className="login-link">
            {t.haveAccount}{" "}
            <Link href="/login" style={{ textDecoration: "none" }}>
              <u style={{ cursor: "pointer" }}>{t.login}</u>
            </Link>{" "}
            ·{" "}
            <Link href="/start?mode=register" style={{ textDecoration: "none" }}>
              <u style={{ cursor: "pointer" }}>{t.signup}</u>
            </Link>
          </div>
        )}

        {/* ═══ معرفی آی‌مچ (v10) ═══ */}
        <div className="intro-wrap">
          <div className="intro-sep">
            <i />
            <span>{t.introQ}</span>
            <i />
          </div>

          <div className="intro-card">
            <div className="match-viz">
              <span className="mv mv-buy">
                <Icon name="i-basket" />
              </span>
              <span className="mv-link">
                <Icon name="i-bolt" />
                <small>{t.matchEngine}</small>
              </span>
              <span className="mv mv-sell">
                <Icon name="i-box" />
              </span>
            </div>
            <h3>{t.introTitle}</h3>
            <p>{t.introText}</p>
          </div>

          <div className="intro-tabs">
            <button
              type="button"
              className={`itab sell${introSide === "sell" ? " active" : ""}`}
              onClick={() => setIntroSide("sell")}
              aria-pressed={introSide === "sell"}
            >
              <Icon name="i-box" /> {t.tabSell}
            </button>
            <button
              type="button"
              className={`itab buy${introSide === "buy" ? " active" : ""}`}
              onClick={() => setIntroSide("buy")}
              aria-pressed={introSide === "buy"}
            >
              <Icon name="i-basket" /> {t.tabBuy}
            </button>
          </div>

          <div className={`ben-list ${introSide === "sell" ? "sell-side" : "buy-side"}`}>
            <div className="ben-title">{introSide === "sell" ? t.benTitleSell : t.benTitleBuy}</div>
            {benList.map((b, i) => (
              <div className="ben" key={b.t}>
                <span className="b-n">{num(i)}</span>
                <span className="b-tx">
                  <b>{b.t}</b>
                  <span>{b.d}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="ben-foot">
            {t.benFootA}
            <b>{t.benFootB}</b>
            <br />
            {t.benFootC}
          </div>
        </div>
      </div>
    </section>
  );
}
