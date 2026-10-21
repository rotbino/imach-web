"use client";

/**
 * iMach — شیت «رصد یعنی چه؟» (فاز ۱۲ · پورت sc-buy-item فاز ۱۱ پروتوتایپ).
 *
 * کاربر باید بعد از فعال‌سازی رصد (یا قبل از آن) یک‌جا بفهمد «رصد» دقیقاً
 * چه چیزی برایش می‌سازد — همان حکم مالک: «لااقل بعد از رصد کردن این پیام
 * را بده که کاربر بفهمد اصلاً رصد چیه».
 *
 * دو نقطهٔ ورود:
 *   · buyer-home — دکمهٔ mini-info کنار «فعال‌سازی رصد» کارت سرد
 *   · item-view — info-mini کنار عنوان «رصد و اطلاع‌رسانی»
 */

import { Icon } from "@/components/imach/icon";
import { Sheet } from "@/components/imach/sheet";
import { useMessages } from "@/i18n/messages/use-messages";

export function WatchInfoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMessages();
  const t = m.app.home.watchInfo;

  return (
    <Sheet open={open} onClose={onClose} label={t.title}>
      <div className="sheet">
        <div className="grab" />
        <h3>{t.title}</h3>
        <div className="sub">{t.lead}</div>
        <div className="watch-info-rows">
          <div className="wi2-row">
            <span className="wic">
              <Icon name="i-chart" />
            </span>
            <span>
              <b>{t.rowPriceB}</b> {t.rowPrice}
            </span>
          </div>
          <div className="wi2-row">
            <span className="wic">
              <Icon name="i-users" />
            </span>
            <span>
              <b>{t.rowNewB}</b> {t.rowNew}
            </span>
          </div>
          <div className="wi2-row">
            <span className="wic">
              <Icon name="i-bell" />
            </span>
            <span>
              <b>{t.rowWhereB}</b> {t.rowWhere}
            </span>
          </div>
        </div>
        <div className="unit-calc" style={{ marginTop: 12 }}>
          <Icon name="i-eye" />
          <span>{t.rowOff}</span>
        </div>
        <div className="sheet-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
