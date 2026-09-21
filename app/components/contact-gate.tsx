"use client";

import { useState } from "react";
import { ApiError, businessesApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useMessages } from "@/i18n/messages/use-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, PhoneCall } from "lucide-react";

/** پراپ‌های استاندارد دکمه shadcn — برای تایپ شفاف ContactButton */
type ButtonProps = React.ComponentProps<typeof Button>;

/*
 * گیت ویروسی تماس — موتور جذب کاربر جدید iMach:
 * بازدیدکنندهٔ کاتالوگ/لیست خرید برای دیدن شماره باید عضو شود؛
 * شماره موبایل را وارد می‌کند (و اگر نبود ثبت‌نام می‌کند) و بعد تماس فعال می‌شود.
 */

export function ContactButton({
  slug,
  bizName,
  label,
  ...btn
}: {
  slug: string;
  bizName: string;
  label: string;
} & ButtonProps) {
  const { toast } = useToast();
  const m = useMessages();
  const { status, login, register } = useAuthStore();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  /** شماره آشکارشده — null یعنی هنوز؛ false یعنی کسب‌وکار شماره ندارد */
  const [revealed, setRevealed] = useState<string | null | false>(null);

  const fetchContact = async () => {
    setBusy(true);
    try {
      const res = await businessesApi.getContact(slug);
      setRevealed(res.phone ?? false);
      if (!res.phone) {
        toast({ title: "شماره‌ای ثبت نشده", description: "این کسب‌وکار هنوز شماره‌ای ثبت نکرده است." });
      }
    } catch {
      toast({ title: "دریافت شماره ناموفق بود", description: m.auth.toasts.tryAgain, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openGate = () => {
    if (status === "authed") {
      setOpen(true);
      void fetchContact();
    } else {
      setOpen(true);
      setRevealed(null);
    }
  };

  const submitAuth = async () => {
    if (!/^09\d{9}$/.test(phone)) {
      toast({ title: m.auth.toasts.invalidPhone, description: m.auth.toasts.invalidPhoneDesc, variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: m.auth.toasts.passwordShort, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (tab === "login") {
        await login(phone, password);
      } else {
        if (name.trim().length < 2) {
          toast({ title: m.auth.toasts.nameRequired, variant: "destructive" });
          setBusy(false);
          return;
        }
        await register(name.trim(), phone, password);
      }
      toast({ title: m.auth.toasts.welcome, description: `حالا می‌توانید با ${bizName} تماس بگیرید` });
      await fetchContact();
    } catch (err) {
      toast({
        title: m.auth.toasts.authFailed,
        description: err instanceof ApiError ? err.message : m.auth.toasts.tryAgain,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={openGate} {...btn}>
        <Phone className="size-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          {revealed === null ? (
            <>
              <DialogHeader>
                <DialogTitle>{bizName}</DialogTitle>
                <DialogDescription>
                  برای دیدن شماره تماس، عضو iMach شوید — رایگان و در یک دقیقه.
                </DialogDescription>
              </DialogHeader>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{m.auth.tabs.login}</TabsTrigger>
                  <TabsTrigger value="register">{m.auth.tabs.register}</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-3 grid gap-3">
                  <Field label={m.auth.fields.mobile}>
                    <Input dir="ltr" inputMode="numeric" placeholder={m.auth.placeholders.mobile} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field label={m.auth.fields.password}>
                    <Input dir="ltr" type="password" placeholder={m.auth.placeholders.password} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </Field>
                </TabsContent>

                <TabsContent value="register" className="mt-3 grid gap-3">
                  <Field label={m.auth.fields.fullName}>
                    <Input placeholder={m.auth.placeholders.fullName} value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field label={m.auth.fields.mobile}>
                    <Input dir="ltr" inputMode="numeric" placeholder={m.auth.placeholders.mobile} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field label={m.auth.fields.passwordRegister}>
                    <Input dir="ltr" type="password" placeholder={m.auth.placeholders.password} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </Field>
                </TabsContent>
              </Tabs>

              <Button className="w-full" onClick={() => void submitAuth()} disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {tab === "login" ? m.auth.submitLogin : m.auth.submitRegister}
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>شماره تماس {bizName}</DialogTitle>
                <DialogDescription>با یک لمس تماس بگیرید — در iMach عضو شدید.</DialogDescription>
              </DialogHeader>
              {revealed === false ? (
                <p className="rounded-xl bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
                  این کسب‌وکار هنوز شماره‌ای ثبت نکرده است.
                </p>
              ) : (
                <div className="grid gap-3">
                  <p dir="ltr" className="text-center text-2xl font-black tracking-wider">
                    {revealed}
                  </p>
                  <Button asChild size="lg">
                    <a href={`tel:${revealed}`}>
                      <PhoneCall className="size-5" />
                      تماس با {bizName}
                    </a>
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
