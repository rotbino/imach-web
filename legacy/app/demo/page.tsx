import type { Metadata } from "next";
import "@/styles/imach/tokens.css";
import "@/styles/imach/base.css";
import "@/styles/imach/components.css";
import "@/styles/imach/shell.css";
import "@/styles/imach/demo.css";
import { DemoHub } from "@/components/imach/demo-hub";

export const metadata: Metadata = {
  title: "iMach — دموی ناوبری سریع (QA)",
  description:
    "مرورگر صفحات و شیت‌های اپ برای بازبینی سریع — ابزار داخلی تیم، غیر ایندکس‌پذیر.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoHub />;
}
