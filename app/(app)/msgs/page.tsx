import type { Metadata } from "next";
import { ThreadsList } from "./msgs-view";

/** /msgs — پیام‌ها (پورت sc-msgs · فاز ۶). تب چت شل به اینجا می‌رسد. */
export const metadata: Metadata = {
  title: "iMach — پیام‌ها",
  robots: { index: false },
};

export default function MsgsPage() {
  return <ThreadsList />;
}
