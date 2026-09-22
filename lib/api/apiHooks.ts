// ─── هوک‌های فایل ─────────────────────────────────────────────────────────────
// FileUploader (کامپوننت سعید) به این ماژول اشاره می‌کند. بک‌اند iMach هنوز
// endpoint فایل ندارد؛ تا wiring واقعی آمد، حذف با خطای روشن شکست می‌خورد —
// FileUploader خطای حذف را غیرمسدودکننده می‌گیرد (console.warn) و جریان
// کاربر نمی‌شکند. وقتی endpoint آمد فقط mutationFn همین‌جا عوض می‌شود.

import { useMutation } from "@tanstack/react-query";

export function useDeleteFile() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/v1/files/${encodeURIComponent(fileId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`file delete failed: ${res.status}`);
      return true;
    },
  });
}
