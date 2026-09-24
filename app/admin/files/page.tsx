"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  adminFilesApi,
  useAdminMutation,
  useAdminOrphans,
  useAdminUsage,
  type AdminFileDto,
} from "../api";
import { useMessages } from "@/i18n/messages/use-messages";
import { fa } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImageOff, Loader2, Trash2 } from "lucide-react";

/*
 * باغبانی فایل‌ها (خواسته‌ی کاربر: «دیدن فایل‌های سرگردان و پاک کردن
 * یک‌باره یا تک‌تک») — دو بخش:
 *   ۱) سرگردان‌ها: بی‌صاحب (فراموش‌شده‌ی فرم‌ها) یا به مدلی که دیگر وجود
 *      ندارد وصل‌اند. پیش‌نمایش تامبنیل + حذف تکی/همه.
 *   ۲) مصرف فضا: هر کاربر چند فایل و چند بایت مصرف کرده (گروه‌بندی سمت
 *      دیتابیس روی ownerId — هرگز پوش‌اسکن ابری لازم نیست).
 */

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${fa(Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`;
  if (bytes >= 1024) return `${fa(Math.round(bytes / 1024))} KB`;
  return `${fa(bytes)} B`;
}

export default function AdminFilesPage() {
  const m = useMessages();
  const { toast } = useToast();
  const orphansQ = useAdminOrphans();
  const usageQ = useAdminUsage();
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const t = m.admin.files;

  const deleteOne = useAdminMutation(
    () => (busyId ? adminFilesApi.deleteOrphan(busyId) : Promise.resolve({ deleted: 0 })),
    () => toast({ title: m.admin.deleted })
  );
  const purgeAll = useAdminMutation(() => adminFilesApi.purgeOrphans());
  useEffect(() => {
    if (purgeAll.isSuccess) {
      const n = (purgeAll.data as { deleted?: number } | undefined)?.deleted ?? 0;
      toast({ title: t.purged.replace("{n}", fa(n)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purgeAll.isSuccess]);

  const removeOne = (f: AdminFileDto) => {
    setBusyId(f.id);
    deleteOne.mutate(undefined, {
      onSettled: () => setBusyId(null),
    });
  };

  const staged = orphansQ.data?.staged ?? [];
  const dangling = orphansQ.data?.dangling ?? [];
  const total = staged.length + dangling.length;
  const totalBytes = [...staged, ...dangling].reduce((sum, f) => sum + f.size, 0);

  const fileCard = (f: AdminFileDto, label: string) => (
    <div key={f.id} className="overflow-hidden rounded-xl border bg-white">
      <div className="relative grid aspect-square place-items-center bg-accent/20">
        {f.thumbUrl || f.url ? (
          <Image src={f.thumbUrl ?? f.url} alt="" fill sizes="200px" className="object-cover" />
        ) : (
          <ImageOff className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1 p-2">
        <p className="truncate text-[11px] font-bold" title={f.description ?? f.fieldKey}>
          {label} · {f.fieldKey}
        </p>
        <p className="text-[10px] text-muted-foreground">{fmtSize(f.size)}</p>
        <p className="text-[10px] text-muted-foreground">{fa(new Date(f.createdAt).toLocaleDateString("fa-IR"))}</p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={deleteOne.isPending}
          onClick={() => removeOne(f)}
        >
          {busyId === f.id && deleteOne.isPending ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
          {t.deleteOne}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-black">{t.title}</h1>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">{t.desc}</p>
          </div>
          {total > 0 && (
            <Button variant="destructive" size="sm" disabled={purgeAll.isPending} onClick={() => setConfirmPurge(true)}>
              {purgeAll.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {t.purgeAll} ({fa(total)} · {fmtSize(totalBytes)})
            </Button>
          )}
        </div>

        {orphansQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : total === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed bg-white p-10 text-center">
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {staged.length > 0 && (
              <div>
                <h2 className="mb-2 text-xs font-extrabold text-muted-foreground">
                  {t.staged} ({fa(staged.length)})
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {staged.map((f) => fileCard(f, t.staged.split(" ")[0]))}
                </div>
              </div>
            )}
            {dangling.length > 0 && (
              <div>
                <h2 className="mb-2 text-xs font-extrabold text-muted-foreground">
                  {t.dangling} ({fa(dangling.length)})
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {dangling.map((f) => fileCard(f, t.dangling.split(" ")[0]))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-sm font-black">{t.usageTitle}</h2>
        {usageQ.isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (usageQ.data?.items ?? []).length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t.usageEmpty}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start text-[11px] text-muted-foreground">
                  <th className="py-2 text-start font-bold">#</th>
                  <th className="py-2 text-start font-bold">—</th>
                  <th className="py-2 text-start font-bold">{t.fileCount.replace("{n}", "")}</th>
                  <th className="py-2 text-start font-bold">{t.size}</th>
                </tr>
              </thead>
              <tbody>
                {(usageQ.data?.items ?? []).map((row, i) => (
                  <tr key={row.ownerId} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{fa(i + 1)}</td>
                    <td className="py-2">
                      <p className="font-bold">{row.name}</p>
                      <p dir="ltr" className="text-[11px] text-muted-foreground">{row.phone}</p>
                    </td>
                    <td className="py-2">{fa(row.files)}</td>
                    <td className="py-2 font-extrabold">{fmtSize(row.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AlertDialog open={confirmPurge} onOpenChange={setConfirmPurge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.purgeAll}؟</AlertDialogTitle>
            <AlertDialogDescription>{t.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.admin.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setConfirmPurge(false);
                purgeAll.mutate();
              }}
            >
              {t.purgeAll}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
