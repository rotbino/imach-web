"use client";

/**
 * iMach Demo Hub — فاز ۹ (/demo)
 * ─────────────────────────────
 * ناوبری سریع برای بازبینی QA: همهٔ صفحات + شیت‌ها/مدال‌ها در یک سایدبار.
 * معادل کارکردی rapid-demo.html پروتوتایپ، اما روی اپ واقعی:
 *   · پیش‌نمایش درون‌برنامه‌ای (iframe same-origin — کوکی‌ها هم‌سفرند)
 *   · قاب موبایل ۳۹۲px با toggle (معادل پیش‌نمایش موبایل پروتوتایپ)
 *   · هر شیت/مدال = ورودی مستقل → صفحهٔ میزبان با ?sheet=<name> (useSheetParam)
 *   · جست‌وجوی زندهٔ ورودی‌ها + بازکردن تب جدید + ری‌لود
 *   · سایدبار پین ≥۱۲۴۰ · کشو+FAB در باریک‌تر (الگوی rapid-demo)
 *
 * دیتای نمونه (شناسه‌های پایدار Atlas): برنج هاشمی · پخش برنج پارس · گفتگوی «قیمت امروز؟»
 */

import { useCallback, useMemo, useState } from "react";
import { Icon } from "./icon";

/* ─── شناسه‌های نمونهٔ پایدار (از Atlas — فاز ۹) ─── */
const SAMPLE = {
  goodId: "6abe2511578b46707877ed0f", // برنج هاشمی
  listingId: "6abe25b017145da0547d5820", // برنج هاشمی — پخش برنج پارس
  sellSlug: "biz-421264", // پخش برنج پارس
  buySlug: "d-rice-net-38", // خریدار نمونه با لیست BUY
  threadId: "6ac3f8c03747bdd328d538e6", // گفتگوی واقعی کاربر دمو
  inquiryId: "6ac3bc1af79516ef723eb511",
};

type Entry = { label: string; href: string; sheet?: boolean; note?: string };
type Group = { title: string; icon: string; items: Entry[] };

const P = `/${SAMPLE.sellSlug}/${SAMPLE.listingId}`;

const GROUPS: Group[] = [
  {
    title: "عمومی (بدون ورود)",
    icon: "i-globe",
    items: [
      { label: "صفحهٔ اول", href: "/" },
      { label: "ورود", href: "/login" },
      { label: "ثبت‌نام", href: "/start?role=buy" },
      { label: "کاتالوگ عمومی فروشنده", href: `/c/${SAMPLE.sellSlug}` },
      { label: "لیست خرید عمومی خریدار", href: `/b/${SAMPLE.buySlug}` },
      { label: "کالای عمومی", href: P },
      { label: "شیت اشتراک کاتالوگ عمومی", href: `/c/${SAMPLE.sellSlug}?sheet=share`, sheet: true },
      { label: "شیت مخاطبین گوشی (میهمان)", href: `/c/${SAMPLE.sellSlug}?sheet=contacts`, sheet: true },
      { label: "شیت اشتراک کالای عمومی", href: `${P}?sheet=share`, sheet: true },
      { label: "شیت اشتراک لیست عمومی", href: `/b/${SAMPLE.buySlug}?sheet=share`, sheet: true },
    ],
  },
  {
    title: "خریدار",
    icon: "i-basket",
    items: [
      { label: "خانهٔ خریدار", href: "/home" },
      { label: "کالا (برنج هاشمی)", href: `/item/${SAMPLE.goodId}` },
      { label: "تابلوی تأمین", href: `/board/${SAMPLE.goodId}` },
      { label: "ویزارد استعلام گروهی", href: `/rfq/${SAMPLE.goodId}` },
      { label: "پیشنهادها", href: "/offers" },
      { label: "ذخیره‌شده‌ها", href: "/saved" },
      { label: "پیام‌ها (لیست)", href: "/msgs" },
      { label: "گفتگو (قیمت امروز؟)", href: `/msgs/${SAMPLE.threadId}` },
      { label: "پروفایل", href: "/profile" },
      { label: "تنظیمات", href: "/settings" },
      { label: "ویرایش کسب‌وکار", href: "/settings/business" },
      { label: "کیف پول", href: "/wallet" },
      { label: "شارژ کیف", href: "/wallet/charge" },
      { label: "افزودن کالا (فرم فعلی)", href: "/new" },
      { label: "شیت اشتراک لیست خرید", href: "/home?sheet=share", sheet: true },
      { label: "شیت مخاطبین گوشی", href: "/home?sheet=contacts", sheet: true },
      { label: "شیت تعویض دستیار", href: "/home?sheet=switch", sheet: true },
      { label: "شیت اعلان‌ها", href: "/home?sheet=notif", sheet: true },
      { label: "شیت وضعیت پیشنهاد", href: "/offers?sheet=offer", sheet: true },
      { label: "شیت تماس (درون گفتگو)", href: `/msgs/${SAMPLE.threadId}?sheet=call`, sheet: true },
      { label: "شیت اشتراک کاتالوگ (کیف)", href: "/wallet?sheet=share", sheet: true },
    ],
  },
  {
    title: "فروشنده",
    icon: "i-store",
    items: [
      { label: "کاتالوک فروش", href: "/sell/catalog" },
      { label: "کالای مالک", href: `/sell/product/${SAMPLE.listingId}` },
      { label: "تخفیف‌ها و قیمت‌گذاری", href: "/sell/discounts" },
      { label: "درخواست‌های خرید", href: "/sell/requests" },
      { label: "پاسخ به استعلام", href: `/sell/quote/${SAMPLE.inquiryId}` },
      { label: "کمپین «فروشندهٔ ویژه»", href: "/sell/campaign" },
      { label: "شیت اشتراک کاتالوک", href: "/sell/catalog?sheet=share", sheet: true },
      { label: "شیت به‌روزرسانی سریع قیمت", href: `/sell/catalog?sheet=quick`, sheet: true },
      { label: "شیت دنبال‌کنندگان کاتالوک", href: "/sell/catalog?sheet=followers", sheet: true },
      { label: "شیت فروشندهٔ ویژه (پرومو)", href: "/sell/catalog?sheet=promote", sheet: true },
      { label: "شیت نرخ پله‌ای", href: `/sell/product/${SAMPLE.listingId}?sheet=rates`, sheet: true },
      { label: "شیت تخفیف کالا", href: `/sell/product/${SAMPLE.listingId}?sheet=discount`, sheet: true },
      { label: "شیت دنبال‌کنندگان کالا", href: `/sell/product/${SAMPLE.listingId}?sheet=followers`, sheet: true },
    ],
  },
  {
    title: "مدیریت (ادمین)",
    icon: "i-gear",
    items: [
      { label: "داشبورد ادمین", href: "/admin" },
      { label: "کالاها", href: "/admin/goods" },
      { label: "برندها", href: "/admin/brands" },
      { label: "دسته‌ها", href: "/admin/categories" },
      { label: "واحدها", href: "/admin/units" },
      { label: "محصولات", href: "/admin/products" },
      { label: "پرونده‌ها", href: "/admin/files" },
      { label: "تنظیمات (پرداخت/نرخ)", href: "/admin/settings" },
    ],
  },
];

const ALL_ENTRIES = GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g.title })));

export function DemoHub() {
  const [url, setUrl] = useState("/");
  const [nonce, setNonce] = useState(0);
  const [frame, setFrame] = useState(true);
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim();
    if (!needle) return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => it.label.includes(needle) || it.href.includes(needle)),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  const go = useCallback((href: string) => {
    setUrl(href);
    setDrawer(false);
  }, []);

  const reload = () => setNonce((n) => n + 1);
  const openTab = () => window.open(url, "_blank", "noopener");

  const currentLabel = ALL_ENTRIES.find((e) => e.href === url)?.label ?? url;

  const sidebar = (
    <aside className="demo-side">
      <div className="demo-side-head">
        <img src="/logo3.svg" alt="iMach" />
        <div className="tx">
          <b>دموی ناوبری سریع</b>
          <span>{`${ALL_ENTRIES.length} مقصد — صفحات، شیت‌ها و مدال‌ها`}</span>
        </div>
      </div>
      <div className="demo-search">
        <Icon name="i-search" />
        <input
          placeholder="جست‌وجوی صفحه/شیت…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="جست‌وجوی مقصد"
        />
      </div>
      <nav className="demo-nav">
        {filtered.map((g) => (
          <div key={g.title} className="demo-group">
            <div className="demo-group-title">
              <Icon className="ic-sm" name={g.icon as "i-globe"} />
              {g.title}
            </div>
            {g.items.map((it) => (
              <button
                key={it.href}
                className={`demo-link${url === it.href ? " active" : ""}`}
                onClick={() => go(it.href)}
              >
                <span className="lb">{it.label}</span>
                {it.sheet ? <span className="sheet-tag">شیت</span> : null}
                <span className="path" dir="ltr">{it.href}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="demo-side-foot">
        <Icon className="ic-sm" name="i-info" />
        <span>صفحات خصوصی اگر وارد نشده باشی به ورود می‌رسند — در تب پیش‌نمایش وارد شو.</span>
      </div>
    </aside>
  );

  return (
    <div className="ia demo-hub" dir="rtl">
      <div className="demo-top">
        <button className="demo-fab" onClick={() => setDrawer((v) => !v)} aria-label="فهرست صفحات">
          <Icon name={drawer ? "i-x" : "i-list"} />
        </button>
        <img src="/logo3.svg" alt="iMach" className="demo-top-logo" />
        <b className="demo-top-title">{currentLabel}</b>
        <span className="demo-top-url" dir="ltr">{url}</span>
        <div className="demo-top-actions">
          <button
            className={`btn btn-sm ${frame ? "btn-soft" : "btn-outline"}`}
            onClick={() => setFrame((v) => !v)}
            title="قاب موبایل ۳۹۲px"
          >
            <Icon className="ic-sm" name="i-eye" /> قاب موبایل
          </button>
          <button className="btn btn-outline btn-sm" onClick={reload}>
            <Icon className="ic-sm" name="i-sort" /> بازآوری
          </button>
          <button className="btn btn-primary btn-sm" onClick={openTab}>
            <Icon className="ic-sm" name="i-share" /> تب جدید
          </button>
        </div>
      </div>

      <div className="demo-body">
        <div className="demo-side-wrap">{sidebar}</div>
        <main className="demo-main">
          {frame ? (
            <div className="demo-phone">
              <div className="demo-phone-notch" />
              <iframe
                key={`${url}#${nonce}`}
                src={url}
                title={currentLabel}
                className="demo-frame demo-frame-phone"
              />
            </div>
          ) : (
            <iframe key={`${url}#${nonce}`} src={url} title={currentLabel} className="demo-frame" />
          )}
        </main>
      </div>

      {drawer ? (
        <>
          <div className="demo-drawer-backdrop" onClick={() => setDrawer(false)} />
          <div className="demo-drawer">{sidebar}</div>
        </>
      ) : null}
    </div>
  );
}
