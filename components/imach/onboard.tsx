"use client";

/**
 * Onboard — صفحهٔ اول سایت (پورت sc-onboard از Prototype v18 · فاز ۳).
 *
 * فاز ۱۰ (بازخورد مالک — بازطراحی کامل):
 *   · لوگو وسط‌چین + تگ‌لاین جدید «جلوی چشم خریدارت باش» + چهار خطِ معرفی
 *   · دکمه‌های نقش با متن جدید (خریدار عمده هستم / تامین‌کننده هستم + زیرمتن)
 *   · سه باکس معرفی مدرن (steps3) — یک ردیف در دسکتاپ
 *   · مزایا: دو ستون جدا کنارِ هم (اول خریدار، بعد فروشنده) — بدون سوییچر
 *   · کاربرِ واردشده → مستقیم به همان دستیاری که انتخاب کرد (نه صفحهٔ ورود)
 *   · دسکتاپ: عرض و مقیاس تایپوگرافی اختصاصی — نه ستونِ موبایلیِ کش‌شده
 *   · متن‌ها = دقیقاً متن مالک (فقط پاک‌سازی فاصله‌ها)
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive } from "@/lib/active-biz";
import { fa } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { useMessages } from "@/i18n/messages/use-messages";
import { Icon, type IconName } from "@/components/imach/icon";
import { LangSwitch } from "@/components/imach/lang-switch";

const STEP_ICONS: IconName[] = ["i-spark", "i-chart", "i-users"];

export function Onboard() {
  const router = useRouter();
  const m = useMessages();
  const t = m.app.onboard;
  const { locale } = useLocale();
  const status = useAuthStore((s) => s.status);
  const authed = status === "authed";
  /** شمارهٔ ردیف مزایا — فارسی/عربی برای RTL، لاتین برای انگلیسی */
  const num = (i: number) => (locale === "en" ? String(i + 1) : fa(i + 1));

  /**
   * انتخاب نقش (فاز ۱۰) —
   *   میهمان → ثبت‌نام با نقش؛
   *   واردشده → مستقیم همان دستیار (نه صفحهٔ ورود) — بازو هم همان لحظه عوض می‌شود
   */
  const choose = (arm: "buy" | "sell") => {
    if (authed) {
      setArmActive(arm);
      router.push(arm === "buy" ? "/home" : "/sell/catalog");
      return;
    }
    router.push(`/start?role=${arm}`);
  };

  return (
    <section className="screen" data-screen="onboard">
      <div className="onboard">
        {/* سوییچ زبان — الزام مالک: تعویض زبان در صفحهٔ اول */}
        <div className="onboard-top">
          <LangSwitch compact />
        </div>

        {/* ── هیرو: لوگو وسط + تگ‌لاین + معرفی ── */}
        <div className="mid">
          <img className="logo-h" src="/logo3.svg" alt="iMatch" />
          <div className="tagline">{t.tagline}</div>

          <div className="hero-desc">
            <b>{t.heroL1}</b>
            <span>{t.heroL2}</span>
            <span>{t.heroL3}</span>
            <em>{t.heroL4}</em>
          </div>

          <div className="q">{t.q}</div>
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
              onClick={() => {
                setArmActive("buy");
                router.push("/home");
              }}
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

        {/* ═══ آی‌مچ چیست؟ (متن جدید مالک) ═══ */}
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

          {/* ── سه باکس معرفی مدرن (فاز ۱۰ — متن مالک) ── */}
          <div className="steps3">
            {t.steps3.map((s, i) => (
              <div className="s3" key={s.t}>
                <span className="ico">
                  <Icon name={STEP_ICONS[i] ?? "i-spark"} />
                </span>
                <b>{s.t}</b>
                <p>{s.d}</p>
              </div>
            ))}
          </div>

          {/* ── مزایا: دو ستون جدا (اول خریدار، بعد فروشنده) — بدون سوییچر ── */}
          <div className="ben-cols">
            <div className="ben-col buy-side">
              <div className="ben-head buy">
                <span className="ico">
                  <Icon name="i-basket" />
                </span>
                <b>{t.benTitleBuy}</b>
              </div>
              <div className="ben-list buy-side">
                {t.benBuy.map((b, i) => (
                  <div className="ben" key={b.t}>
                    <span className="b-n">{num(i)}</span>
                    <span className="b-tx">
                      <b>{b.t}</b>
                      <span>{b.d}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ben-col sell-side">
              <div className="ben-head sell">
                <span className="ico">
                  <Icon name="i-box" />
                </span>
                <b>{t.benTitleSell}</b>
              </div>
              <div className="ben-list sell-side">
                {t.benSell.map((b, i) => (
                  <div className="ben" key={b.t}>
                    <span className="b-n">{num(i)}</span>
                    <span className="b-tx">
                      <b>{b.t}</b>
                      <span>{b.d}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
