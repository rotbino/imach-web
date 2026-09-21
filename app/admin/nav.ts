import { LayoutDashboard, Database, Package, Tag, ListTree } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/*
 * منوی درختی پنل ادمین — هر بخش یک «بسته‌ی مادر» دارد و زیردسته‌ها داخلش
 * باز می‌شوند (مثل اطلاعات پایه ← کالاها/برندها/دسته‌بندی‌ها). پنل بعدا بزرگ
 * می‌شود؛ افزودن بخش یعنی افزودن یک برگ یا یک بسته به همین درخت.
 */

export type NavLeaf = {
  kind: "leaf";
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type NavGroup = {
  kind: "group";
  labelKey: string;
  icon: LucideIcon;
  children: NavLeaf[];
};

export type NavNode = NavLeaf | NavGroup;

export const ADMIN_NAV: NavNode[] = [
  { kind: "leaf", href: "/admin", labelKey: "overview", icon: LayoutDashboard, exact: true },
  {
    kind: "group",
    labelKey: "basicData",
    icon: Database,
    children: [
      { kind: "leaf", href: "/admin/goods", labelKey: "goods", icon: Package },
      { kind: "leaf", href: "/admin/brands", labelKey: "brands", icon: Tag },
      { kind: "leaf", href: "/admin/categories", labelKey: "categories", icon: ListTree },
    ],
  },
];

/** برچسب i18n یک برگ — کلیدها در namespace «admin.nav» زندگی می‌کنند. */
export const navLabel = (m: { admin: { nav: Record<string, string> } }, key: string) =>
  m.admin.nav[key] ?? key;
