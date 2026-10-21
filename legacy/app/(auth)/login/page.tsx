import type { Metadata } from "next";
import { LoginForm } from "./login-form";

/**
 * /login — ورود با دیزاین‌سیستم v18 (پورت sc-login · فاز ۲ مهاجرت).
 * جریان واقعی: شماره → checkPhone → رمز عبور / ورود بی‌رمز / دعوت به ثبت‌نام.
 * جزئیات تطبیق در کامنت login-form.tsx و MIGRATION-MAP.
 */

export const metadata: Metadata = {
  title: "ورود | iMach",
  description: "ورود به آی‌مچ با شمارهٔ موبایل — سریع و امن",
};

export default function LoginPage() {
  return <LoginForm />;
}
