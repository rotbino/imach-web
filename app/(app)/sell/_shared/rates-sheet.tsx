"use client";

/**
 * sheet-rates (v18) — «نرخِ فروشنده ویژه چطور حساب می‌شود؟»
 * میزبان: /sell/product/[id] (کارت کمپین). محتوای اطلاعاتیِ سیاست نرخ‌گذاری محصول —
 * جدول پله‌ای چهارطبقه‌ای همان Prototype. نرخِ جاریِ پیاده‌شدهٔ بک‌اند (۱٬۰۰۰ تومان
 * هر مشاهدهٔ کامل · ۵٬۰۰۰ هر دنبال‌کردن — PROMO_VIEW/FOLLOW_MINOR) جدا و صادقانه
 * نمایش داده می‌شود؛ جدول پله‌ای «برآورد اولیه» است و با دادهٔ واقعی کمپین‌ها
 * (فاز ۶) تنظیم می‌شود — همان پانویس خود Prototype.
 */

import { useMessages } from "@/i18n/messages/use-messages";
import { Icon } from "@/components/imach/icon";
import { Sheet } from "@/components/imach/sheet";

export function RatesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMessages();
  const t = m.app.rates as unknown as Record<string, string>;
  const tiers = m.app.ratesTiers as unknown as Array<{ label: string; deal: string; price: string }>;

  return (
    <Sheet open={open} onClose={onClose} label={t.title as string}>
      <div className="grab" />
      <h3>{t.title as string}</h3>
      <div className="sub">{t.sub as string}</div>

      {/* نرخ جاریِ واقعیِ پیاده‌شده — منبع: PROMO_VIEW_MINOR / PROMO_FOLLOW_MINOR */}
      <div className="card" style={{ boxShadow: "none", marginBottom: 11 }}>
        <div className="ng-title" style={{ margin: "0 0 7px" }}>{t.currentTitle as string}</div>
        <div className="pp-brk" style={{ margin: 0 }}>
          <div className="r"><span>{t.curView as string}</span><b>{t.curViewPrice as string}</b></div>
          <div className="r"><span>{t.curFollow as string}</span><b>{t.curFollowPrice as string}</b></div>
        </div>
      </div>

      <div className="tier-table">
        {tiers.map((x, i) => (
          <div className={i === 1 ? "tier-row me" : "tier-row"} key={x.label}>
            <span className="tr-t">{x.label}<small>{t[`tierHint${i}`] as string}</small></span>
            <span className="tr-v">{x.deal}</span>
            <span className="tr-p">{x.price}<small>{t.perFollow as string}</small></span>
          </div>
        ))}
      </div>

      <div className="hint" style={{ marginTop: 11 }}>
        <Icon name="i-info" />
        <span>{t.hintAuto as string}</span>
      </div>
      <div className="hint" style={{ marginTop: 8 }}>
        <Icon name="i-percent" />
        <span>{t.hintMarket as string}</span>
      </div>
      <div className="hint" style={{ marginTop: 8 }}>
        <Icon name="i-shield" />
        <span>{t.hintFair as string}</span>
      </div>
      <div className="hint" style={{ marginTop: 8 }}>
        <Icon name="i-eye" />
        <span>{t.hintFullView as string}</span>
      </div>
    </Sheet>
  );
}
