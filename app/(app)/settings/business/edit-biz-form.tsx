"use client";

/**
 * /settings/business — ویرایش کسب‌وکار (پورت sc-edit-biz از Prototype v18 · فاز ۶).
 *
 * فرم Production-grade: نام/صنف/شهر/شمارهٔ تماس + ذخیرهٔ واقعی (editBusiness).
 *  · نام: ۲..۶۰ نویسه (اعتبارسنجی + پیام درجا)
 *  · صنف: متن آزاد ( همان ریل بک‌اند — موتور «کپی از هم‌صنف‌ها»)
 *  · شهر: CITIES (استان هم‌زمان روی سرور مشتق می‌شود — provinceOf)
 *  · شمارهٔ تماس: نرمال‌سازی ارقام فارسی/عربی + dir ltr (همان الگوی login)
 * ذخیره → invalidate businesses + toast + بازگشت به پروفایل.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Appbar } from "@/components/imach/appbar";
import { Icon } from "@/components/imach/icon";
import { Spinner } from "@/components/imach/spinner";
import { useMessages } from "@/i18n/messages/use-messages";
import { useActiveBusiness } from "@/lib/active-biz";
import { useEditBusiness } from "@/lib/queries";
import { CITIES, fa } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

/** ارقام فارسی/عربی → لاتین (همان نرمال‌سازی login) */
function toLatinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function EditBizForm() {
  const m = useMessages();
  const t = m.app.editBiz;
  const router = useRouter();
  const { toast } = useToast();
  const biz = useActiveBusiness();
  const editBusiness = useEditBusiness();

  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [errName, setErrName] = useState(false);

  // مقدار اولیهٔ فرم از دیتای واقعی — الگوی تنظیم حین رندر (نه effect)
  const [formBizId, setFormBizId] = useState<string | null>(null);
  if (biz && biz.id !== formBizId) {
    setFormBizId(biz.id);
    setName(biz.name ?? "");
    setTrade(biz.trade ?? "");
    setCity(biz.city ?? "");
    setPhone(biz.phone ?? "");
  }

  if (!biz) {
    return (
      <section className="screen" data-screen="edit-biz">
        <Appbar deskTitle={t.title} />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Spinner size={22} />
        </div>
      </section>
    );
  }

  const save = () => {
    if (name.trim().length < 2) {
      setErrName(true);
      return;
    }
    setErrName(false);
    editBusiness.mutate(
      {
        id: biz.id,
        name: name.trim(),
        trade: trade.trim() || null,
        ...(city && city !== biz.city ? { city } : {}),
        phone: phone.trim() ? toLatinDigits(phone.replace(/[\s-]/g, "")) : null,
      },
      {
        onSuccess: () => {
          toast({ title: t.saved });
          router.push("/profile");
        },
        onError: () => toast({ title: t.saveFailed, variant: "destructive" }),
      }
    );
  };

  return (
    <section className="screen" data-screen="edit-biz">
      <Appbar deskTitle={t.title} />

      <div className="screen-body">
        <div className="card">
          <div className="field">
            <label>{t.name}</label>
            <input
              className={errName ? "inp err" : "inp"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              aria-invalid={errName}
              dir="auto"
            />
            {errName ? <div className="f-err">{t.errName}</div> : null}
          </div>

          <div className="field">
            <label>{t.trade}</label>
            <input
              className="inp"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              maxLength={60}
              dir="auto"
              placeholder={biz.activityType ?? ""}
            />
          </div>

          <div className="field">
            <label>{t.city}</label>
            <div className="inp" style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Icon className="ic-sm" name="i-pin" style={{ color: "var(--muted)" }} />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  font: "inherit",
                  color: "inherit",
                  padding: 0,
                  cursor: "pointer",
                }}
                aria-label={t.city}
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Icon className="ic-sm" name="i-chev" style={{ color: "var(--muted)", marginInlineStart: "auto" }} />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 4 }}>
            <label>
              {t.phone}
              <i>{t.phoneNote}</i>
            </label>
            <input
              className="inp"
              style={{ direction: "ltr", textAlign: "right" }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              maxLength={20}
              placeholder={fa("0912 345 6789")}
            />
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg btn-block"
          style={{ marginTop: 14 }}
          disabled={editBusiness.isPending}
          onClick={save}
        >
          {editBusiness.isPending ? <Spinner size={16} /> : t.save}
        </button>

        <div className="hint">
          <Icon name="i-shield" />
          <span>{t.hint}</span>
        </div>
      </div>
    </section>
  );
}
