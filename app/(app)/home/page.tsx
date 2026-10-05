import type { Metadata } from "next";
import { Appbar } from "@/components/imach/appbar";
import { Tabbar } from "@/components/imach/tabbar";
import { Icon } from "@/components/imach/icon";
import { getServerMessages } from "@/i18n/messages/server";
import { BUY_HOME_ROWS, type RichText } from "@/lib/imach/fixtures";

/**
 * /home — خانهٔ خریدار (پورت sc-buy-list از Prototype v18).
 * فاز ۱: صفحهٔ دموی اثبات دیزاین‌سیستم + شل + i18n + تم.
 * فاز ۳: دیتای واقعی (WatchedGood / قیمت‌ها / شمارش‌ها) جایگزین fixtures می‌شود.
 */

export const metadata: Metadata = {
  title: "iMach — لیست خرید",
  robots: { index: false }, // شل احراز‌شده؛ بی‌دلیل index نمی‌شود (§۱۵)
};

function Rich({ parts }: { parts: RichText }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? <span key={i}>{p}</span> : <b key={i}>{p.b}</b>
      )}
    </>
  );
}

export default async function BuyerHomePage() {
  const { messages: m } = await getServerMessages();
  const h = m.app.home;

  return (
    <section className="screen" data-screen="buy-list">
      <Appbar deskTitle={h.secList} />

      <div className="screen-body">
        <div className="greet">
          <b>{h.greetTitle.replace("{biz}", m.app.desk.bizBuy)}</b>
          <span>{h.greetSub}</span>
        </div>

        {/* v6: هیروی استعلام حذف شده (حکم مالک) — دکمهٔ افزودن کالا کافی است */}
        <div className="btn-row" style={{ margin: "10px 0 4px" }}>
          {/* TODO(phase-3): لینک به /add — جریان افزودن کالا */}
          <button className="btn btn-primary" style={{ flex: 1 }}>
            <Icon className="ic-sm" name="i-plus" /> {h.addCta}
          </button>
        </div>

        <div className="share-strip">
          <span
            className="ico"
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              background: "var(--teal)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon className="ic-sm" name="i-share" style={{ width: 19, height: 19 }} />
          </span>
          <span className="txt">
            <b>{h.shareTitle}</b>
            <span>{h.shareSub}</span>
          </span>
          {/* TODO(phase-6): Web Share API + sheet-share-list */}
          <button className="btn btn-soft btn-sm">{h.shareCta}</button>
        </div>

        <div className="sec-title">
          <h2>
            <Icon className="ic-sm" name="i-list" /> {h.secList}
          </h2>
          {/* TODO(phase-4): لینک به /offers */}
          <span className="more">
            <span className="badge b-teal">۳</span> {h.offersLink}
          </span>
        </div>

        {/* TODO(phase-3): لینک به /saved */}
        <button className="saved-strip">
          <span className="ico">
            <Icon name="i-bm" />
          </span>
          <span className="txt">
            <b>{h.savedStripTitle}</b>
            <span>{h.savedStripSub}</span>
          </span>
          <Icon name="i-chev" className="chev" />
        </button>

        <div className="g2">
          {BUY_HOME_ROWS.map((row) => (
            // TODO(phase-3): لینک به /item/[goodId] — جزئیات کالا + تابلوی تأمین
            <div
              className={row.coldStart ? "row-card dashed" : "row-card"}
              key={row.title}
            >
              <span className={`thumb ${row.thumbClass}`}>
                <Icon name={row.artIcon} />
              </span>
              <div className="body">
                <div className="t">
                  {row.title}
                  {row.pulse ? <span className="pulse-dot" title="رصد فعال" /> : null}
                  {row.followBadge ? (
                    <span className="badge b-teal">
                      <Icon name="i-bm" /> {row.followBadge}
                    </span>
                  ) : null}
                  {row.suppliersBadge ? (
                    <span className="badge b-stone">
                      <Icon name="i-users" /> {row.suppliersBadge}
                    </span>
                  ) : null}
                </div>
                {row.price ? (
                  <div className="pl">
                    <b>{row.price}</b>
                    <span className="u">{row.unit}</span>
                    {row.trend && "dir" in row.trend ? (
                      <span className={`trend ${row.trend.dir}`}>
                        <Icon className="ic-sm ic-12" name={row.trend.dir === "down" ? "i-tdn" : "i-tup"} />{" "}
                        {row.trend.pct}
                      </span>
                    ) : row.trend ? (
                      <span className="trend flat">{h.flat}</span>
                    ) : null}
                    {row.freshBadge ? <span className="badge b-orange">{h.freshPrice}</span> : null}
                  </div>
                ) : null}
                <div className="s">
                  <Rich parts={row.sub} />
                </div>
              </div>
              {row.coldStart ? (
                // TODO(phase-3): POST /watched-goods (فعال‌سازی رصد)
                <button className="btn btn-soft btn-sm">{row.coldStart}</button>
              ) : (
                <Icon name="i-chev" className="chev" />
              )}
            </div>
          ))}
        </div>

        <div className="hint">
          <Icon name="i-info" />
          <span>{h.hint}</span>
        </div>
      </div>

      <Tabbar active="list" />
    </section>
  );
}
