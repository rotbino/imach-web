import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatView } from "./chat-view";
import { Spinner } from "@/components/imach/spinner";

/** /msgs/[id] — گفتگو (پورت sc-chat v15 · فاز ۶). صفحهٔ مستقل، نه مودال. */
export const metadata: Metadata = {
  title: "iMach — گفتگو",
  robots: { index: false },
};

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <section className="screen" data-screen="chat">
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <Spinner size={22} />
          </div>
        </section>
      }
    >
      <ChatView />
    </Suspense>
  );
}
