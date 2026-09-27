"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { unitsApi, type UnitDto } from "@/lib/api";
import { useUnits } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, Plus, X, Ruler, Package, Box } from "lucide-react";
import Link from "next/link";

export default function AdminUnitsPage() {
  const unitsQ = useUnits();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (unitsQ.isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const units = unitsQ.data ?? [];
  const baseUnits = units.filter((u) => !u.baseUnitKey);
  const packagingUnits = units.filter((u) => !!u.baseUnitKey);

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="size-5 text-primary" />
          <h1 className="text-lg font-extrabold">واحدها</h1>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {units.length} واحد
          </span>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          واحد جدید
        </Button>
      </div>

      <p className="mb-4 text-[11px] leading-5 text-muted-foreground">
        واحدهای پایه (عدد، کیلو، متر) و واحدهای بسته‌بندی (کارتن، کیسه، پالت) را مدیریت کن.
        «تعداد در واحد» برای تبدیل قیمت استفاده می‌شود — مثلاً کارتن ۲۴تایی یعنی هر کارتن ۲۴ عدد دارد.
      </p>

      {creating && <UnitForm baseUnits={baseUnits} onDone={() => setCreating(false)} />}

      <div className="mt-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-stone-700">
          <Box className="size-4 text-primary" />
          واحدهای پایه
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {baseUnits.map((u) => (
            <UnitCard key={u.id} unit={u} isEditing={editingId === u.id} onEdit={() => setEditingId(editingId === u.id ? null : u.id)} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-stone-700">
          <Package className="size-4 text-primary" />
          واحدهای بسته‌بندی
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {packagingUnits.map((u) => (
            <UnitCard key={u.id} unit={u} isEditing={editingId === u.id} onEdit={() => setEditingId(editingId === u.id ? null : u.id)} />
          ))}
        </div>
      </div>

      <div className="mt-6 border-t pt-3">
        <Link href="/admin" className="text-[11px] font-bold text-muted-foreground hover:text-foreground">← بازگشت به داشبورد</Link>
      </div>
    </div>
  );
}

function UnitCard({ unit, isEditing, onEdit }: { unit: UnitDto; isEditing: boolean; onEdit: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [nameFa, setNameFa] = useState(unit.nameFa);
  const [nameEn, setNameEn] = useState(unit.nameEn);
  const [containsQty, setContainsQty] = useState(unit.containsQty?.toString() ?? "");
  const [qtyIsFixed, setQtyIsFixed] = useState(unit.qtyIsFixed);
  const [saving, setSaving] = useState(false);

  const hasChanges = nameFa !== unit.nameFa || nameEn !== unit.nameEn ||
    (containsQty || "") !== (unit.containsQty?.toString() ?? "") || qtyIsFixed !== unit.qtyIsFixed;

  const save = async () => {
    setSaving(true);
    try {
      await unitsApi.update({ id: unit.id, nameFa, nameEn, containsQty: containsQty ? parseInt(containsQty) : null, qtyIsFixed });
      await qc.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "ذخیره شد" });
      onEdit();
    } catch (err) {
      toast({ title: "خطا", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (!isEditing) {
    return (
      <div className="rounded-xl border bg-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-extrabold">{unit.nameFa}</p>
            <p className="text-[10px] text-muted-foreground" dir="ltr">{unit.nameEn} · {unit.key}</p>
          </div>
          <button type="button" onClick={onEdit} className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-primary">
            <Ruler className="size-3.5" />
          </button>
        </div>
        {unit.baseUnitKey && (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">پایه: {unit.baseUnitKey}</span>
            {unit.containsQty && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">× {unit.containsQty}</span>}
            {unit.qtyIsFixed && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">ثابت</span>}
            {unit.scope && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-600">{unit.scope === "wholesale" ? "عمده" : "خرده"}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground">{unit.key}</span>
        <button type="button" onClick={onEdit} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-3.5" /></button>
      </div>
      <div className="grid gap-2">
        <div><Label className="text-[10px] text-muted-foreground">نام فارسی</Label><Input value={nameFa} onChange={(e) => setNameFa(e.target.value)} className="h-8 text-xs" /></div>
        <div><Label className="text-[10px] text-muted-foreground">نام انگلیسی</Label><Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="h-8 text-xs" dir="ltr" /></div>
        {unit.baseUnitKey && (
          <>
            <div><Label className="text-[10px] text-muted-foreground">تعداد در واحد</Label><Input value={containsQty} onChange={(e) => setContainsQty(e.target.value)} className="h-8 text-xs" dir="ltr" placeholder="۲۴" type="number" /></div>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground"><input type="checkbox" checked={qtyIsFixed} onChange={(e) => setQtyIsFixed(e.target.checked)} className="size-3.5 accent-[var(--primary)]" />تعداد ثابت (کاربر نمی‌تواند تغییر دهد)</label>
          </>
        )}
        {hasChanges && <Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}ذخیره</Button>}
      </div>
    </div>
  );
}

function UnitForm({ baseUnits, onDone }: { baseUnits: UnitDto[]; onDone: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [nameFa, setNameFa] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [baseUnitKey, setBaseUnitKey] = useState("");
  const [containsQty, setContainsQty] = useState("");
  const [qtyIsFixed, setQtyIsFixed] = useState(false);
  const [saving, setSaving] = useState(false);
  const isPackaging = !!baseUnitKey;

  const save = async () => {
    if (!key.trim() || !nameFa.trim() || !nameEn.trim()) { toast({ title: "کلید، نام فارسی و انگلیسی الزامی است", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await unitsApi.create({ key: key.trim(), nameFa, nameEn, baseUnitKey: baseUnitKey || null, containsQty: isPackaging && containsQty ? parseInt(containsQty) : null, qtyIsFixed: isPackaging ? qtyIsFixed : false, scope: "wholesale" });
      await qc.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "واحد ساخته شد" });
      onDone();
    } catch (err) { toast({ title: "خطا", description: String(err), variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="mb-4 rounded-xl border-2 border-primary/30 bg-white p-4">
      <div className="mb-3 flex items-center gap-2"><Plus className="size-4 text-primary" /><span className="text-xs font-extrabold">واحد جدید</span></div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div><Label className="text-[10px] text-muted-foreground">کلید (KEY)</Label><Input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} className="h-8 text-xs" dir="ltr" placeholder="CARTON_24" /></div>
        <div><Label className="text-[10px] text-muted-foreground">نام فارسی</Label><Input value={nameFa} onChange={(e) => setNameFa(e.target.value)} className="h-8 text-xs" placeholder="کارتن ۲۴تایی" /></div>
        <div><Label className="text-[10px] text-muted-foreground">نام انگلیسی</Label><Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="h-8 text-xs" dir="ltr" placeholder="Carton (24)" /></div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div>
          <Label className="text-[10px] text-muted-foreground">واحد پایه</Label>
          <Select value={baseUnitKey} onValueChange={setBaseUnitKey}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="">واحد پایه (بدون والد)</SelectItem>{baseUnits.map((u) => <SelectItem key={u.id} value={u.key}>{u.nameFa} ({u.key})</SelectItem>)}</SelectContent></Select>
        </div>
        {isPackaging && (
          <>
            <div><Label className="text-[10px] text-muted-foreground">تعداد در واحد</Label><Input value={containsQty} onChange={(e) => setContainsQty(e.target.value)} className="h-8 text-xs" dir="ltr" placeholder="۲۴" type="number" /></div>
            <div className="flex items-end"><label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground pb-1.5"><input type="checkbox" checked={qtyIsFixed} onChange={(e) => setQtyIsFixed(e.target.checked)} className="size-3.5 accent-[var(--primary)]" />ثابت</label></div>
          </>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}ذخیره</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>انصراف</Button>
      </div>
    </div>
  );
}
