"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useArm, useActiveBusiness, type Arm } from "@/lib/active-biz";
import { fmtPhone } from "@/lib/countries";
import { fa, activityTypeLabel } from "@/lib/format";
import {
  useMyAvatar,
  useRemoveFile,
  useUploadFile,
  useMyListings,
  useMyFollowers,
  useWatchedGoods,
  useFollows,
  useMyInquiries,
  useSuggestions,
  useSetNotifPrefs,
  useBusinessLogo,
  useMyBusinesses,
} from "@/lib/queries";
import type { NotifPrefsDto } from "@/lib/api";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { NoBusinessState } from "@/app/components/no-business";
import { SetPasswordButton } from "@/app/components/set-password-button";
import { LanguageSelect } from "@/app/components/language-select";
import { ShareContent } from "@/app/components/share";
import { CustomersSection } from "@/app/components/customers";
import { BizSettingsCard } from "@/app/components/biz-edit";
import { TallDialog } from "@/app/components/tall-dialog";
import { FileUploader } from "@/components/FileUploader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  ChevronLeft,
  Eye,
  Globe,
  List,
  Loader2,
  LogOut,
  MapPin,
  Share2,
  ShieldCheck,
  Store,
  Tag,
  User,
  Users,
} from "lucide-react";

/*
 * پروفایل دو-بازویی — فاز ۸ (طرح ۰۷ فروشنده + طرح ۱۴ خریدار):
 * • هدر فروشگاه/خریدار + نوار آمارِ همان بازو (داده‌ی واقعی، همیشه)
 * • سمت فروش: آکاردئون «مشتریان من» + کارت «ابزار رشد کاتالوگ» (د۶)
 * • سمت خرید: میان‌برهای لیست خرید/تأمین‌کنندگان + «ابزار رشد شبکه»
 *   + تنظیمات اعلان (۴ toggle — نهادِ جدیدِ این فاز)
 * • تنظیمات فروشگاه = ردیف‌هایی که فرم BizSettingsCard را در مدال باز می‌کنند
 * • حساب کاربری = همان کاربرِ یکتای مشترک: عکس/نام/موبایل/زبان/خروج
 *   (+ رمز عبور چشمک‌زن برای ثبت‌نام سریع — خواسته‌ی کاربر)
 * بازو از آخرین دستیارِ بازشده خوانده می‌شود (صفحه‌ی مشترک).
 */

const SELL_AVATAR = "bg-gradient-to-br from-[#c2703a] to-[#ea580c]";
const BUY_AVATAR = "bg-gradient-to-br from-[#155e75] to-[#0e7490]";

export default function ProfilePage() {
  const router = useRouter();
  const { status, user, logout } = useAuthStore();
  const arm = useArm();
  const activeBiz = useActiveBusiness();
  const bizQ = useMyBusinesses();

  useEffect(() => {
    document.title = "پروفایل | iMach";
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed" || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow" />
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  if (bizQ.isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className={`size-6 animate-spin ${arm === "sell" ? "text-primary" : "text-stone-700"}`} />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  if (!activeBiz) return <NoBusinessState variant={arm} />;

  return <ProfileBody arm={arm} bizId={activeBiz.id} />;
}

function ProfileBody({ arm, bizId }: { arm: Arm; bizId: string }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const activeBiz = useActiveBusiness();
  const { toast } = useToast();

  // ── همه‌ی هوک‌ها قبل از هر return — ترتیب هوک‌ها نباید به داده وابسته باشد ──
  const avatarQ = useMyAvatar(user?.id ?? null);
  const uploadFile = useUploadFile();
  const removeFile = useRemoveFile();
  const [avatarPct, setAvatarPct] = useState<number | null>(null);
  const [avatarPhase, setAvatarPhase] = useState<"sending" | "processing">("sending");

  const logoQ = useBusinessLogo(activeBiz?.id ?? null);

  // ── آمارِ بازو — فقط کوئری‌های همان بازو روشن‌اند (کم‌هزینه) ──
  const sellBizId = arm === "sell" ? (activeBiz?.id ?? null) : null;
  const buyBizId = arm === "buy" ? (activeBiz?.id ?? null) : null;
  const sellQ = useMyListings(sellBizId);
  const followersQ = useMyFollowers(sellBizId);
  const watchedQ = useWatchedGoods(buyBizId);
  const followsQ = useFollows(buyBizId);
  const inquiriesQ = useMyInquiries(buyBizId);
  const suggestionsQ = useSuggestions(buyBizId);

  if (!activeBiz || !user) return null;
  const biz = activeBiz;
  const avatar = avatarQ.data;
  const logo = logoQ.data;

  // فقط ردیف‌های فروش (SELL/BOTH) — BUYها متعلق به آمار بازوی خریدند
  const activeSell = (sellQ.data ?? []).filter(
    (l) => l.isActive !== false && (l.mode === "SELL" || l.mode === "BOTH")
  );
  const viewsMonth = activeSell.reduce((s, l) => s + (l.viewCount30 ?? 0), 0);
  const followers = followersQ.data?.length ?? 0;
  const withRequest = (followersQ.data ?? []).filter((c) => c.latestRequest).length;

  const watched = watchedQ.data ?? [];
  const priceChangedWeek = watched.filter((w) => w.priceChanged).length;
  const follows = followsQ.data?.length ?? 0;
  const openInquiries = (inquiriesQ.data?.rows ?? []).filter((r) => !r.offer).length;
  const freshSuggestions =
    (suggestionsQ.data?.betterPrices.length ?? 0) +
    (suggestionsQ.data?.newSuppliers.length ?? 0) +
    (suggestionsQ.data?.alternatives.length ?? 0);

  const hotCls = arm === "sell" ? "text-primary-strong" : "text-stone-800";

  const ownerName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name;
  const subParts = [ownerName, biz.trade ?? (biz.activityType ? activityTypeLabel(biz.activityType) : null), biz.city];

  const uploadAvatar = (file: File) => {
    setAvatarPct(0);
    setAvatarPhase("sending");
    uploadFile.mutate(
      {
        file,
        model: "User",
        modelId: user.id,
        key: "avatar",
        onProgress: (pct, phase) => {
          setAvatarPct(pct);
          setAvatarPhase(phase);
        },
      },
      {
        onSuccess: () => toast({ title: "عکس پروفایل آپلود شد" }),
        onError: (e) => toast({ title: "آپلود ناموفق بود", description: e.message, variant: "destructive" }),
        onSettled: () => setAvatarPct(null),
      }
    );
  };

  const removeAvatar = () => {
    if (!avatar) return;
    removeFile.mutate(avatar.id, {
      onSuccess: () => toast({ title: "عکس پروفایل حذف شد" }),
      onError: (e) => toast({ title: "حذف ناموفق بود", description: e.message, variant: "destructive" }),
    });
  };

  const publicHref = arm === "sell" ? `/sell/${biz.slug}` : `/buy/${biz.slug}`;

  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-5">
          {/* ═══ هدر فروشگاه/خریدار (طرح ۰۷/۱۴) ═══ */}
          <div className="flex items-center gap-3.5">
            {logo ? (
              <img
                src={logo.thumbUrl ?? logo.url}
                alt={biz.name}
                className="size-[54px] shrink-0 rounded-full border object-cover"
              />
            ) : (
              <span
                className={`grid size-[54px] shrink-0 place-items-center rounded-full text-xl font-bold text-white ${arm === "sell" ? SELL_AVATAR : BUY_AVATAR}`}
              >
                {biz.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[18px] font-bold leading-tight">{biz.name}</p>
              <p className="mt-1 truncate text-[11.5px] text-muted-foreground">{subParts.filter(Boolean).join(" · ")}</p>
            </div>
          </div>

          {/* ═══ نوار آمار — سه‌تایی، سومی «داغ» (طرح ۰۷/۱۴) ═══ */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {arm === "sell" ? (
              <>
                <Stat v={fa(activeSell.length)} k="کالا" />
                <Stat v={fa(viewsMonth)} k="بازدید ماه" />
                <Stat v={fa(followers)} k="مشتری" hot={hotCls} />
              </>
            ) : (
              <>
                <Stat v={fa(watched.length)} k="کالا در لیست" />
                <Stat v={fa(follows)} k="تأمین‌کننده دنبال‌شده" />
                <Stat v={fa(openInquiries)} k="درخواست باز" hot={hotCls} />
              </>
            )}
          </div>

          {arm === "sell" ? (
            <>
              {/* ═══ مشتریان من — آکاردئون داخل پروفایل (د۶ · طرح ۰۷) ═══ */}
              <CustomersRow
                followers={followers}
                withRequest={withRequest}
                loading={followersQ.isLoading}
                bizId={biz.id}
              />

              {/* ═══ ابزار رشد کاتالوگ (طرح ۰۷) ═══ */}
              <GrowthCard
                arm="sell"
                title="ابزار رشد کاتالوگ"
                desc="لینک کاتالوگتان را برای مشتری‌ها بفرستید — هر ثبت‌نام از لینک شما، خودکار مشتری شما می‌شود."
                slug={biz.slug}
                bizName={biz.name}
              />
            </>
          ) : (
            <>
              {/* ═══ میان‌برهای خریدار (طرح ۱۴) ═══ */}
              <div className="mt-2.5 grid gap-2">
                <ShortcutRow
                  icon={<List className="size-4.5" />}
                  title="لیست خرید من"
                  sub={
                    watchedQ.isLoading
                      ? undefined
                      : `${fa(watched.length)} کالا${priceChangedWeek > 0 ? ` · ${fa(priceChangedWeek)} تغییر قیمت این هفته` : ""}`
                  }
                  onClick={() => router.push("/buy")}
                />
                <ShortcutRow
                  icon={<Building2 className="size-4.5" />}
                  title="تأمین‌کنندگان من"
                  sub={
                    followsQ.isLoading
                      ? undefined
                      : `${fa(follows)} نفر${freshSuggestions > 0 ? ` · ${fa(freshSuggestions)} پیشنهاد تازه` : ""}`
                  }
                  onClick={() => router.push("/buy/suppliers")}
                />
              </div>

              {/* ═══ ابزار رشد شبکه — لینک دعوت تأمین‌کننده (طرح ۱۰→۱۴) ═══ */}
              <GrowthCard
                arm="buy"
                title="ابزار رشد شبکه"
                desc="لینک دعوت‌تان را برای تأمین‌کننده‌ها بفرستید — هر ثبت‌نام از لینک شما، خودکار تأمین‌کننده‌ی شما می‌شود."
                slug={biz.slug}
                bizName={biz.name}
              />

              {/* ═══ اعلان‌ها — ۴ toggle (قلب طرح ۱۴) ═══ */}
              <NotifPrefsCard bizId={biz.id} prefs={biz.notifPrefs ?? {}} />
            </>
          )}

          {/* ═══ تنظیمات فروشگاه/کسب‌وکار — ردیف‌ها → فرم کامل در مدال ═══ */}
          <SettingsSection biz={biz} />

          {/* ═══ حساب کاربری — کاربر یکتا، مشترک بین هر دو بازو ═══ */}
          <AccountSection
            user={user}
            avatar={avatar}
            avatarPct={avatarPct}
            avatarPhase={avatarPhase}
            uploading={uploadFile.isPending}
            onUpload={uploadAvatar}
            onRemoveAvatar={avatar ? removeAvatar : undefined}
            onLogout={() => void logout()}
          />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}

/* ═══════════ اجزای کوچک — زبان بصری طرح ۰۷/۱۴ ═══════════ */

function Stat({ v, k, hot }: { v: string; k: string; hot?: string }) {
  return (
    <div className="rounded-xl border bg-white px-1.5 py-2 text-center">
      <p className={`text-[16px] font-bold ${hot ?? ""}`}>{v}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{k}</p>
    </div>
  );
}

function CustomersRow({
  followers,
  withRequest,
  loading,
  bizId,
}: {
  followers: number;
  withRequest: number;
  loading: boolean;
  bizId: string;
}) {
  const [open, setOpen] = useState(false);
  const biz = useActiveBusiness();
  if (!biz) return null;

  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-2xl border bg-white p-3 text-start shadow-sm transition hover:shadow-md"
      >
        <span className="grid size-[38px] shrink-0 place-items-center rounded-[11px] bg-accent text-primary-strong">
          <Users className="size-[19px]" />
        </span>
        <span className="min-w-0 grow">
          <span className="block text-[13.5px] font-bold">مشتریان من</span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {loading
              ? "در حال بارگذاری…"
              : `${fa(followers)} دنبال‌کننده${withRequest > 0 ? ` · ${fa(withRequest)} درخواست فعال` : ""}`}
          </span>
        </span>
        <ChevronLeft
          className={`size-4 shrink-0 text-stone-400 transition-transform ${open ? "-rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-2 rounded-2xl border bg-stone-50/60 p-2">
          <CustomersSection bizId={bizId} slug={biz.slug} name={biz.name} showHeader={false} compact />
        </div>
      )}
    </div>
  );
}

function GrowthCard({
  arm,
  title,
  desc,
  slug,
  bizName,
}: {
  arm: Arm;
  title: string;
  desc: string;
  slug: string;
  bizName: string;
}) {
  const publicHref = arm === "sell" ? `/sell/${slug}` : `/buy/${slug}`;
  const router = useRouter();
  return (
    <section className="mt-2.5 rounded-2xl border bg-white p-3.5 shadow-sm">
      <p className="flex items-center gap-1.5 text-[13px] font-bold">
        <Share2 className={`size-4 ${arm === "sell" ? "text-primary" : "text-stone-700"}`} />
        {title}
      </p>
      <p className="mt-1 mb-3 text-[11px] leading-[1.9] text-muted-foreground">{desc}</p>
      <ShareContent kind={arm === "sell" ? "sell" : "buy"} slug={slug} bizName={bizName} />
      <Button variant="outline" className="mt-3 w-full" onClick={() => router.push(publicHref)}>
        <Eye className={`size-4 ${arm === "sell" ? "text-primary" : "text-stone-700"}`} />
        نمای عمومی
      </Button>
    </section>
  );
}

function ShortcutRow({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-2xl border bg-white p-3 text-start shadow-sm transition hover:shadow-md"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-stone-100 text-stone-700">
        {icon}
      </span>
      <span className="min-w-0 grow">
        <span className="block text-[13px] font-bold">{title}</span>
        {sub && <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">{sub}</span>}
      </span>
      <ChevronLeft className="size-3.5 shrink-0 text-stone-400" />
    </button>
  );
}

/* ═══ تنظیمات اعلان — ۴ toggle (طرح ۱۴) — ذخیره‌ی ادغامی و optimistic ═══ */

const NOTIF_ROWS: { key: keyof NotifPrefsDto; label: string }[] = [
  { key: "priceChange", label: "تغییر قیمت در تابلوهای من" },
  { key: "suggestions", label: "پیشنهادهای جدید iMach" },
  { key: "quoteReplies", label: "پاسخ درخواست‌های قیمت" },
  { key: "push", label: "اعلان فوری (Push) روی گوشی" },
];

function NotifPrefsCard({ bizId, prefs }: { bizId: string; prefs: NotifPrefsDto }) {
  const setPrefs = useSetNotifPrefs();
  const { toast } = useToast();

  const toggle = (key: keyof NotifPrefsDto, next: boolean) => {
    setPrefs.mutate(
      { id: bizId, [key]: next },
      {
        onError: () =>
          toast({ title: "ذخیره تنظیم ناموفق بود", variant: "destructive" }),
      }
    );
  };

  return (
    <section className="mt-4">
      <SectionTitle>اعلان‌ها</SectionTitle>
      <div className="rounded-2xl border bg-white px-3.5 shadow-sm">
        {NOTIF_ROWS.map((row, i) => (
          <label
            key={row.key}
            className={`flex cursor-pointer items-center gap-2.5 py-2.5 text-[12.5px] font-medium ${
              i < NOTIF_ROWS.length - 1 ? "border-b border-stone-100" : ""
            }`}
          >
            <Switch
              checked={prefs[row.key] !== false}
              disabled={setPrefs.isPending}
              onCheckedChange={(next) => toggle(row.key, next)}
              aria-label={row.label}
            />
            <span className="grow">{row.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

/* ═══ تنظیمات فروشگاه — ردیف‌ها → BizSettingsCard در مدال (طرح ۰۷) ═══ */

function SettingsSection({ biz }: { biz: ReturnType<typeof useActiveBusiness> }) {
  const [open, setOpen] = useState(false);
  if (!biz) return null;
  const tradeLabel = biz.trade ?? (biz.activityType ? activityTypeLabel(biz.activityType) : "—");

  return (
    <section className="mt-4">
      <SectionTitle>تنظیمات {biz.trade || biz.activityType ? "فروشگاه" : "کسب‌وکار"}</SectionTitle>
      <div className="rounded-2xl border bg-white px-3.5 shadow-sm">
        <SettingsRow icon={<User className="size-4" />} label="نام و لوگو" value={biz.name} onClick={() => setOpen(true)} />
        <SettingsRow icon={<MapPin className="size-4" />} label="شهر و آدرس" value={biz.address ?? biz.city} onClick={() => setOpen(true)} />
        <SettingsRow icon={<Store className="size-4" />} label="صنف و نوع فعالیت" value={tradeLabel} onClick={() => setOpen(true)} last />
      </div>

      <TallDialog open={open} onOpenChange={setOpen} title="تنظیمات فروشگاه" subtitle={biz.name} icon={<Store className="size-4 text-primary" />}>
        <BizSettingsCard biz={biz} />
      </TallDialog>
    </section>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onClick,
  last,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 py-2.5 text-[13px] ${last ? "" : "border-b border-stone-100"}`}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="grow text-start">{label}</span>
      <span className="max-w-[45%] truncate text-[11.5px] text-muted-foreground">{value}</span>
      <ChevronLeft className="size-3.5 shrink-0 text-stone-400" />
    </button>
  );
}

/* ═══ حساب کاربری — کاربرِ یکتا (عکس/نام/موبایل/زبان/رمز/خروج) ═══ */

function AccountSection({
  user,
  avatar,
  avatarPct,
  avatarPhase,
  uploading,
  onUpload,
  onRemoveAvatar,
  onLogout,
}: {
  user: { id: string; name: string; phone: string; role: string; passwordSet?: boolean };
  avatar: { url: string; thumbUrl: string | null } | null;
  avatarPct: number | null;
  avatarPhase: "sending" | "processing";
  uploading: boolean;
  onUpload: (f: File) => void;
  onRemoveAvatar?: () => void;
  onLogout: () => void;
}) {
  return (
    <section className="mt-4">
      <SectionTitle>حساب کاربری</SectionTitle>
      <div className="rounded-2xl border bg-white px-3.5 shadow-sm">
        {/* هویت شخص — جدا از هویت کسب‌وکار؛ عکس همان لحظه آپلود می‌شود */}
        <div className="flex items-center gap-3 border-b border-stone-100 py-3">
          <FileUploader
            shape="round"
            size={44}
            value={avatar ? { url: avatar.url, thumbUrl: avatar.thumbUrl } : null}
            uploading={uploading}
            progress={avatarPct}
            phase={avatarPhase}
            label="عکس پروفایل"
            onSelect={onUpload}
            onRemove={onRemoveAvatar}
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{user.name}</p>
            <p dir="ltr" className="mt-0.5 text-start text-[11px] text-muted-foreground">
              {fmtPhone(user.phone)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">برای تغییر عکس، روی آن بزنید</p>
          </div>
        </div>

        {/* زبان */}
        <div className="flex items-center gap-2.5 border-b border-stone-100 py-2.5 text-[13px]">
          <Globe className="size-4 text-muted-foreground" />
          <span className="grow">زبان / Language</span>
          <LanguageSelect />
        </div>

        {/* رمز عبور — چشمک‌زن برای ثبت‌نام سریع (خواسته‌ی کاربر) */}
        {user.passwordSet === false && (
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 py-3">
            <div>
              <p className="text-[12.5px] font-bold text-red-700">رمز عبور هنوز ثبت نشده</p>
              <p className="mt-0.5 text-[10.5px] leading-5 text-red-600/80">
                برای امنیت حساب و ورود از دستگاه‌های دیگر، یک رمز عبور انتخاب کن.
              </p>
            </div>
            <SetPasswordButton variant="profile" />
          </div>
        )}

        {/* لینک‌های نقشی — ادمین و برند از پروفایل (د۴) */}
        {user.role === "ADMIN" && (
          <Link
            href="/admin"
            className="flex items-center gap-2.5 border-b border-stone-100 py-2.5 text-[13px] transition hover:bg-accent/40"
          >
            <ShieldCheck className="size-4 text-primary" />
            <span className="grow">پنل مدیریت</span>
            <ChevronLeft className="size-3.5 shrink-0 text-stone-400" />
          </Link>
        )}
        <Link
          href="/brand"
          className="flex items-center gap-2.5 border-b border-stone-100 py-2.5 text-[13px] transition hover:bg-accent/40"
        >
          <Tag className="size-4 text-muted-foreground" />
          <span className="grow">پنل برند</span>
          <ChevronLeft className="size-3.5 shrink-0 text-stone-400" />
        </Link>

        {/* خروج */}
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 py-2.5 text-[13px] text-destructive transition hover:bg-red-50"
        >
          <LogOut className="size-4" />
          <span className="grow text-start">خروج از حساب</span>
        </button>
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-bold text-stone-500">
      {children}
    </h2>
  );
}
