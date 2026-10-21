"use client";

import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { useMessages } from "@/i18n/messages/use-messages";

/** `/msgs` — placeholder پیام‌ها تا M8 (پیام‌رسان). */
export default function MsgsPage() {
  return (
    <AuthGate>
      <MsgsBody />
    </AuthGate>
  );
}

function MsgsBody() {
  const m = useMessages();
  return (
    <AppShell arm="sell">
      <EmptyState
        icon={<Icon name="msg" size={30} />}
        title={m.placeholders.msgsTitle}
        subtitle={m.placeholders.msgsBody}
      />
    </AppShell>
  );
}
