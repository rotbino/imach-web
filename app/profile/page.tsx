"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon, type IconName } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { useMoney } from "@/components/imach/prefs-context";
import { useAuthStore } from "@/lib/auth-store";
import { armEnabled } from "@/lib/active-biz";
import { fmtPhone } from "@/lib/countries";
import { currencyLabel } from "@/lib/format";
import { authApi, businessesApi, prefsApi, walletApi, filesApi } from "@/lib/api";

/**
 * `/profile` — ۱۸ پروفایل (M8 · FD-29 دوستونهٔ واقعی):
 *  راستِ چسبان (دسکتاپ): خوشهٔ هویت — من / کسب‌وکار / نمایندهٔ فروش / کیف.
 *  چپ: دستیارهای فعال (سوییچ بازوها) + تنظیمات (زبان/ارز/رنگ شخصی/اعلان‌ها).
 *  موبایل: همان جریان، تک‌ستونه. شیت ویرایش پروفایل (عکس/نام؛ شماره قفل).
 *  D2: زبان/ارز ذخیره می‌شوند ولی فقط fa/IRT فعال‌اند — بقیه «به‌زودی».
 */
export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileContent />
    </AuthGate>
  );
}

function ProfileContent() {
  const m = useMessages();
  const { show } = useToast();
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const businesses = useAuthStore((s) => s.businesses);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const updateBusinesses = useAuthStore((s) => s.updateBusinesses);
  const { display, setDisplay } = useMoney();
  const biz = businesses[0];

  const [editOpen, setEditOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  /* کیف پول — موجودی شارژ برای تبلیغات (طرح ۸) */
  const walletQ = useQuery({
    queryKey: ["wallet", biz?.id],
    queryFn: () => walletApi.getWallet(biz!.id),
    enabled: !!biz,
    staleTime: 60_000,
  });
  const wallet = walletQ.data;

  /** D2 — انتخاب ذخیره می‌شود ولی UI فقط fa می‌ماند؛ بقیه «به‌زودی» */
  const pickLang = async (code: "fa" | "en" | "ar") => {
    try {
      await prefsApi.setPrefs({ lang: code });
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    } catch {
      /* best-effort */
    }
    if (code === "fa") {
      setLocale("fa");
      show({ text: "زبان فارسی فعال شد", kind: "success" });
      setLangOpen(false);
    } else {
      const name = code === "en" ? "انگلیسی" : "عربی";
      show({ text: `${name} به‌زودی فعال می‌شود — انتخاب شما ذخیره شد`, kind: "info", duration: 6000 });
      setLangOpen(false);
    }
  };

  /** D2 — تومان فعال؛ USD/AED ذخیره + «به‌زودی» */
  const pickCurrency = async (code: "IRT" | "USD" | "AED") => {
    if (code === "IRT") {
      setDisplay(null); // پیش‌فرض کشور (ایران → تومان) — خودش prefs را sync می‌کند
      show({ text: "ارز نمایش: تومان", kind: "success" });
      setCurrencyOpen(false);
      return;
    }
    try {
      await prefsApi.setPrefs({ currency: code });
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    } catch {
      /* best-effort */
    }
    const name = code === "USD" ? "دلار آمریکا" : "درهم امارات";
    show({ text: `${name} به‌زودی فعال می‌شود — انتخاب شما ذخیره شد`, kind: "info", duration: 6000 });
    setCurrencyOpen(false);
  };

  const toggleArm = async (arm: "sell" | "buy", next: boolean) => {
    if (!biz) return;
    const other = arm === "sell" ? armEnabled(biz, "buy") : armEnabled(biz, "sell");
    if (!next && !other) {
      show({ text: "حداقل یک دستیار باید روشن بماند", kind: "error" });
      return;
    }
    try {
      await businessesApi.setArms(biz.id, { [arm]: next });
      updateBusinesses(await businessesApi.getMyBusinesses());
      show({ text: next ? "دستیار روشن شد" : "دستیار خاموش شد — تب‌های پایین ساده‌تر شدند", kind: "success" });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "تغییر نشد — دوباره تلاش کنید", kind: "error" });
    }
  };

  return (
    <AppShell arm="keep" title="پروفایل">
      <div data-profile className="lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-8">
        {/* ═══ خوشهٔ هویت — راستِ چسبان (دسکتاپ) ═══ */}
        <div className="flex flex-col gap-3.5 lg:sticky lg:top-20 lg:self-start">
          {/* من */}
          <button
            type="button"
            id="profile-edit-open"
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-line-2 active:bg-surface-2"
          >
            <ProfilePhoto className="size-14" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[15px] font-black text-text">
                {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name : "کاربر"}
              </b>
              <span className="mt-1 block truncate text-[11px] text-text-3" dir="ltr">
                {fmtPhone(user?.phone)}
              </span>
            </span>
            <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
          </button>

          {/* کسب‌وکار */}
          <button
            type="button"
            data-go-business
            onClick={() => router.push("/profile/business")}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-line-2 active:bg-surface-2"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-arm-soft text-[15px] font-black text-arm-strong">
              {(biz?.name ?? "؟").slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[14px] font-black text-text">{biz?.name ?? "کاتالوگ شما"}</b>
              <span className="mt-1 block truncate text-[11px] text-text-3">
                {biz?.trade || "بدون صنف"} · {biz?.city || "—"}
              </span>
            </span>
            <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
          </button>

          {/* داشبورد نمایندهٔ فروش — فضای سوم (M9 · FD-17): ورود از پروفایل */}
          <button
            type="button"
            data-go-salesrep
            onClick={() => router.push("/rep")}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-accent/40 active:bg-surface-2"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong">
              <Icon name="briefcase" size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[14px] font-black text-text">داشبورد نمایندهٔ فروش</b>
              <span className="mt-1 block truncate text-[11px] text-text-3">مدیریت یکپارچهٔ فروش چند کسب‌وکار</span>
            </span>
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-strong">
              {(businesses.length || 1).toLocaleString("fa-IR")} کسب‌وکار
            </span>
            <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
          </button>

          {/* کیف پول — موجودی شارژ (طرح ۸: فقط در لحظهٔ مصرف — M9: شارژ ۳۵) */}
          <button
            type="button"
            data-go-wallet
            onClick={() => router.push("/profile/wallet")}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-line-2"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-green-soft text-green">
              <Icon name="wallet" size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[13.5px] font-black text-text">
                {(wallet ? Math.round(wallet.balanceMinor / 10) : 0).toLocaleString("fa-IR")} تومان
              </b>
              <span className="mt-1 block truncate text-[11px] text-text-3">موجودی شارژ — برای تبلیغات</span>
            </span>
            <span className="shrink-0 rounded-full bg-green-soft px-2.5 py-1 text-[10.5px] font-bold text-green">افزایش</span>
          </button>
        </div>

        {/* ═══ ستون اصلی: دستیارها + تنظیمات ═══ */}
        <div className="mt-6 flex flex-col gap-5 lg:mt-0">
          {/* دستیارهای فعال */}
          <section className="flex flex-col gap-2.5">
            <SectionTitle icon="store" title="دستیارهای فعال" />
            <ArmRow
              icon="store"
              title="فروش عمده"
              sub="کاتالوگ، مشتریان، سفارش‌ها"
              arm="sell"
              on={armEnabled(biz, "sell")}
              onToggle={(next) => void toggleArm("sell", next)}
            />
            <ArmRow
              icon="basket"
              title="خرید عمده"
              sub="لیست خرید، تأمین‌کنندگان، استعلام"
              arm="buy"
              on={armEnabled(biz, "buy")}
              onToggle={(next) => void toggleArm("buy", next)}
            />
            <p className="flex items-start gap-1.5 px-1 text-[11px] leading-5 text-text-3">
              <Icon name="info" size={13} className="mt-0.5 shrink-0" />
              اگر فقط یکی از این دو را لازم داری، دیگری را خاموش کن — تب‌های پایین ساده‌تر می‌شوند.
            </p>
          </section>

          {/* تنظیمات (FD-20) */}
          <section className="flex flex-col gap-2.5">
            <SectionTitle icon="gear" title="تنظیمات" />
            <SettingRow
              icon="globe"
              iconTone="blue"
              title="زبان"
              sub={locale === "fa" ? "فارسی" : locale === "ar" ? "العربية" : "English"}
              onClick={() => setLangOpen(true)}
              testId="set-lang-row"
            />
            <SettingRow
              icon="wallet"
              iconTone="green"
              title="ارز نمایش قیمت‌ها"
              sub={currencyLabel(display, locale)}
              onClick={() => setCurrencyOpen(true)}
              testId="set-currency-row"
            />
            <SettingRow
              icon="tag"
              iconTone="amber"
              title="رنگ‌های شخصی بازوها"
              sub="رنگ فروش و خرید، به سلیقهٔ خودت"
              onClick={() => setColorsOpen(true)}
            />
            <SettingRow
              icon="bell"
              iconTone="stone"
              title="اعلان‌ها"
              sub="قیمت‌ها، پاسخ‌ها، پیشنهادها، پوش"
              onClick={() => setNotifsOpen(true)}
            />
            <p className="flex items-start gap-1.5 px-1 text-[11px] leading-5 text-text-3">
              <Icon name="info" size={13} className="mt-0.5 shrink-0" />
              زبان و ارز در نسخهٔ بعدی به‌طور کامل فعال می‌شوند — انتخاب‌ات همین‌جا ذخیره می‌ماند.
            </p>
          </section>

          <Button variant="danger" size="lg" onClick={() => void logout("/")}>
            <Icon name="power" size={17} />
            {m.shell.logoutAria}
          </Button>

          <p className="pb-2 text-center text-[10.5px] leading-5 text-text-3">
            آی‌مچ — شبکهٔ خصوصی تجارت عمدهٔ شما
          </p>
        </div>
      </div>

      {/* ═══ شیت‌ها ═══ */}
      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
      <LangSheet open={langOpen} onClose={() => setLangOpen(false)} locale={locale} onPick={(c) => void pickLang(c)} />
      <CurrencySheet
        open={currencyOpen}
        onClose={() => setCurrencyOpen(false)}
        display={display}
        onPick={(c) => void pickCurrency(c)}
      />
      <ArmColorsSheet open={colorsOpen} onClose={() => setColorsOpen(false)} />
      <NotifsSheet open={notifsOpen} onClose={() => setNotifsOpen(false)} biz={biz ?? null} />
    </AppShell>
  );
}

/* ═══ اجزای کوچک ═══ */

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <h2 className="flex items-center gap-1.5 px-1 text-[13.5px] font-black text-text">
      <Icon name={icon} size={15} className="text-text-3" />
      {title}
    </h2>
  );
}

/** سوییچ بازوی فعال — همان الگوی role=switch پروتوتایپ (۱۸) */
function ArmRow({
  icon,
  title,
  sub,
  arm,
  on,
  onToggle,
}: {
  icon: IconName;
  title: string;
  sub: string;
  arm: "sell" | "buy";
  on: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          arm === "sell" ? "bg-primary-soft text-primary-strong" : "bg-stone-tint text-stone"
        )}
      >
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-bold text-text">{title}</b>
        <span className="mt-0.5 block truncate text-[11px] text-text-3">{sub}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        data-arm-switch={arm}
        aria-label={title}
        onClick={() => onToggle(!on)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          on ? (arm === "sell" ? "bg-arm" : "bg-stone") : "bg-line-2"
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-[inset-inline-start]",
            on ? "start-6" : "start-1"
          )}
        />
      </button>
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  blue: "bg-blue-soft text-blue",
  green: "bg-green-soft text-green",
  amber: "bg-amber-soft text-amber",
  stone: "bg-stone-tint text-stone",
};

function SettingRow({
  icon,
  iconTone = "blue",
  title,
  sub,
  onClick,
  testId,
}: {
  icon: IconName;
  iconTone?: "blue" | "green" | "amber" | "stone";
  title: string;
  sub: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-line-2 active:bg-surface-2"
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", TONE_BG[iconTone])}>
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-bold text-text">{title}</b>
        <span className="mt-0.5 block truncate text-[11px] text-text-3">{sub}</span>
      </span>
      <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
    </button>
  );
}

/** عکس پروفایل — از getMe (آواتار کاربر) یا حرف اول نام */
function ProfilePhoto({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const meQ = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.getMe(),
    staleTime: 60_000,
  });
  const url = meQ.data?.avatar?.thumbUrl ?? meQ.data?.avatar?.url ?? null;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- آواتار از سرور فایل
    return <img src={url} alt={user?.name ?? ""} className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-primary-soft text-[20px] font-black text-primary-strong",
        className
      )}
    >
      {(user?.firstName ?? user?.name ?? "؟").slice(0, 1)}
    </span>
  );
}

/* ═══ شیت ویرایش پروفایل — عکس/نام؛ شماره قفل (۱۸) ═══ */
function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { show } = useToast();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const businesses = useAuthStore((s) => s.businesses);
  const qc = useQueryClient();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // مقدار اولیه از کاربر زنده — هر بار که شیت باز می‌شود (الگوی legacy edit-biz)
  const userId = user?.id ?? null;
  const sessionKey = open ? `${userId}:open` : `${userId}:closed`;
  if (open && userId && loadedFor !== sessionKey) {
    setLoadedFor(sessionKey);
    setFirst(user?.firstName ?? "");
    setLast(user?.lastName ?? "");
  }

  const save = async () => {
    if (!first.trim()) {
      show({ text: "نام را خالی نگذار", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      await authApi.editProfile({ firstName: first.trim(), lastName: last.trim() });
      updateUser({ firstName: first.trim(), lastName: last.trim() });
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      show({ text: "ذخیره شد", kind: "success" });
      onClose();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ذخیره نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async (file: File) => {
    if (!user) return;
    setPhotoBusy(true);
    try {
      await filesApi.upload({ file, model: "User", modelId: user.id, key: "avatar" });
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      show({ text: "عکس پروفایل به‌روز شد", kind: "success" });
    } catch {
      show({ text: "عکس ذخیره نشد", kind: "error" });
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ویرایش پروفایل">
      <div className="flex flex-col gap-4 p-5">
        <button
          type="button"
          onClick={() => (document.getElementById("profile-photo-pick") as HTMLInputElement | null)?.click()}
          disabled={photoBusy}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 text-start transition-colors hover:border-line-2 disabled:opacity-50"
        >
          <ProfilePhoto className="size-11" />
          <span className="min-w-0 flex-1">
            <b className="block text-[13px] font-bold text-text">تصویر پروفایل</b>
            <span className="mt-0.5 block text-[11px] text-text-3">
              {photoBusy ? "در حال بارگذاری…" : "در گفتگوها و کنار نام‌تان دیده می‌شود"}
            </span>
          </span>
          <Icon name="chev" size={15} className="shrink-0 text-text-4 rtl:-scale-x-100" />
        </button>
        <input
          id="profile-photo-pick"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void pickPhoto(f);
          }}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-text-2">نام</span>
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            aria-label="نام"
            className="h-11 rounded-xl border border-line bg-bg px-3.5 text-[13.5px] text-text outline-none focus:border-line-2"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-text-2">نام خانوادگی</span>
          <input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            aria-label="نام خانوادگی"
            className="h-11 rounded-xl border border-line bg-bg px-3.5 text-[13.5px] text-text outline-none focus:border-line-2"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-text-2">
            شماره موبایل <span className="font-normal text-text-4">— هویت حساب</span>
          </span>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3.5">
            <span className="flex-1 text-[13.5px] font-bold text-text-2" dir="ltr">
              {fmtPhone(user?.phone)}
            </span>
            <span className="rounded-full bg-green-soft px-2 py-0.5 text-[9px] font-bold text-green">تاییدشده</span>
          </div>
          <span className="text-[11px] text-text-3">شماره‌ای که با آن ثبت‌نام کردید</span>
        </div>

        <Button variant="arm" size="lg" loading={busy} onClick={() => void save()} data-testid="profile-save">
          <Icon name="check" size={16} />
          ذخیره تغییرات
        </Button>
        <p className="text-[11px] leading-5 text-text-3">
          {businesses[0]?.name ?? ""} کسب‌وکار شماست — ویرایش اطلاعات آن از کارت کسب‌وکار.
        </p>
      </div>
    </Sheet>
  );
}

/* ═══ شیت زبان (FD-20) — fa فعال؛ en/ar «به‌زودی» ═══ */
function LangSheet({
  open,
  onClose,
  locale,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  locale: string;
  onPick: (code: "fa" | "en" | "ar") => void;
}) {
  const options = [
    { code: "fa" as const, label: "فارسی", soon: false },
    { code: "en" as const, label: "English", soon: true },
    { code: "ar" as const, label: "العربية", soon: true },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="زبان">
      <div className="flex flex-col gap-2 p-5">
        {options.map((o) => (
          <button
            key={o.code}
            type="button"
            onClick={() => onPick(o.code)}
            className={cn(
              "flex min-h-[48px] items-center justify-between rounded-xl border px-4 text-start text-[13.5px] font-bold transition-colors",
              locale === o.code
                ? "border-arm bg-arm-soft text-arm-strong"
                : "border-line bg-surface text-text-2 hover:border-line-2"
            )}
          >
            <span>{o.label}</span>
            {o.soon && (
              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber">به‌زودی</span>
            )}
            {locale === o.code && !o.soon && <Icon name="check" size={15} />}
          </button>
        ))}
        <p className="text-[11.5px] leading-5 text-text-3">
          انتخاب‌ات ذخیره می‌شود؛ فعال‌سازی کامل زبان‌های دیگر در نسخهٔ بعدی.
        </p>
      </div>
    </Sheet>
  );
}

/* ═══ شیت ارز نمایش (FD-20) — تومان فعال؛ USD/AED «به‌زودی» ═══ */
function CurrencySheet({
  open,
  onClose,
  display,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  display: string;
  onPick: (code: "IRT" | "USD" | "AED") => void;
}) {
  const options = [
    { code: "IRT" as const, label: "تومان", soon: false },
    { code: "USD" as const, label: "دلار آمریکا", soon: true },
    { code: "AED" as const, label: "درهم امارات", soon: true },
  ];
  const isToman = display === "IRR" || display === "IRT";
  return (
    <Sheet open={open} onClose={onClose} title="ارز نمایش قیمت‌ها">
      <div className="flex flex-col gap-2 p-5">
        {options.map((o) => (
          <button
            key={o.code}
            type="button"
            onClick={() => onPick(o.code)}
            className={cn(
              "flex min-h-[48px] items-center justify-between rounded-xl border px-4 text-start text-[13.5px] font-bold transition-colors",
              (o.code === "IRT" && isToman) || o.code === display
                ? "border-arm bg-arm-soft text-arm-strong"
                : "border-line bg-surface text-text-2 hover:border-line-2"
            )}
          >
            <span>{o.label}</span>
            <span className="flex items-center gap-2">
              {o.soon && (
                <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber">به‌زودی</span>
              )}
              {!o.soon && <Icon name="check" size={15} />}
            </span>
          </button>
        ))}
        <p className="text-[11.5px] leading-5 text-text-3">
          قیمت‌ها در ارز اصلی فروشنده ذخیره می‌شوند؛ نمایش شما همین‌جا عوض می‌شود. ارزهای دیگر در نسخهٔ بعدی.
        </p>
      </div>
    </Sheet>
  );
}

/* ═══ شیت رنگ‌های شخصی بازوها — ذخیره در prefs (M8) ═══ */
const ARM_SWATCHES = ["#ea580c", "#f97316", "#0d9488", "#2563eb", "#7c3aed", "#be123c"] as const;

function ArmColorsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { show } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const meQ = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.getMe(),
    enabled: open,
    staleTime: 60_000,
  });
  const sell = meQ.data?.prefs?.armSellColor ?? null;
  const buy = meQ.data?.prefs?.armBuyColor ?? null;

  const pick = async (arm: "sell" | "buy", color: string | null) => {
    setBusy(true);
    try {
      await prefsApi.setPrefs(arm === "sell" ? { armSellColor: color } : { armBuyColor: color });
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      show({ text: "رنگ ذخیره شد", kind: "success" });
    } catch {
      show({ text: "ذخیره نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const Swatches = ({ arm, current }: { arm: "sell" | "buy"; current: string | null }) => (
    <div className="flex flex-wrap items-center gap-2">
      {ARM_SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          disabled={busy}
          aria-label={c}
          onClick={() => void pick(arm, c)}
          className={cn(
            "size-9 rounded-full border-2 transition-transform active:scale-90",
            current === c ? "border-text" : "border-transparent"
          )}
          style={{ background: c }}
        />
      ))}
      <button
        type="button"
        disabled={busy}
        onClick={() => void pick(arm, null)}
        className={cn(
          "h-9 rounded-full border px-3 text-[11px] font-bold transition-colors",
          current === null ? "border-text bg-surface-2 text-text" : "border-line text-text-3 hover:border-line-2"
        )}
      >
        پیش‌فرض
      </button>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title="رنگ‌های شخصی بازوها">
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-text-2">رنگ دستیار فروش</p>
          <Swatches arm="sell" current={sell} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-text-2">رنگ دستیار خرید</p>
          <Swatches arm="buy" current={buy} />
        </div>
        <p className="text-[11.5px] leading-5 text-text-3">
          انتخاب‌ات در حساب‌تان ذخیره می‌شود و در همهٔ دستگاه‌هایتان می‌ماند — اعمال زندهٔ رنگ‌ها در نسخهٔ بعدی.
        </p>
      </div>
    </Sheet>
  );
}

/* ═══ شیت اعلان‌ها — چهار toggle (طرح ۱۴) ═══ */
const NOTIF_ROWS = [
  { key: "priceChange", title: "تغییر قیمت در تابلوهای من", sub: "دیده‌بان‌های لیست خرید" },
  { key: "quoteReplies", title: "پاسخ درخواست‌های قیمت", sub: "استعلام‌ها و پیشنهادها" },
  { key: "suggestions", title: "پیشنهادهای جدید آی‌مچ", sub: "تأمین‌کننده‌های تازه و هم‌صنف‌ها" },
  { key: "push", title: "اعلان مرورگر (پوش)", sub: "حتی وقتی آی‌مچ باز نیست" },
] as const;

function NotifsSheet({ open, onClose, biz }: { open: boolean; onClose: () => void; biz: { id: string; notifPrefs?: { priceChange?: boolean; quoteReplies?: boolean; suggestions?: boolean; push?: boolean } | null } | null }) {
  const { show } = useToast();
  const qc = useQueryClient();
  const updateBusinesses = useAuthStore((s) => s.updateBusinesses);
  const [busy, setBusy] = useState(false);

  const pick = async (key: string, next: boolean) => {
    if (!biz) return;
    setBusy(true);
    try {
      await businessesApi.setNotifPrefs(biz.id, { [key]: next });
      updateBusinesses(await businessesApi.getMyBusinesses());
    } catch {
      show({ text: "ذخیره نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="اعلان‌ها">
      <div className="flex flex-col gap-2 p-5">
        {NOTIF_ROWS.map((r) => {
          const on = biz?.notifPrefs?.[r.key] !== false;
          return (
            <div key={r.key} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-bold text-text">{r.title}</b>
                <span className="mt-0.5 block truncate text-[11px] text-text-3">{r.sub}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                data-notif-switch={r.key}
                disabled={busy}
                aria-label={r.title}
                onClick={() => void pick(r.key, !on)}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                  on ? "bg-arm" : "bg-line-2"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 size-5 rounded-full bg-white shadow transition-[inset-inline-start]",
                    on ? "start-6" : "start-1"
                  )}
                />
              </button>
            </div>
          );
        })}
        <p className="text-[11.5px] leading-5 text-text-3">
          ردیف اعلان‌ها همیشه می‌ماند؛ این تنظیم فقط خبرهای همان دسته را خاموش/روشن می‌کند.
        </p>
      </div>
    </Sheet>
  );
}
