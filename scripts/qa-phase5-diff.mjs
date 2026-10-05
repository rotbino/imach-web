#!/usr/bin/env node
/**
 * فاز۵ Visual QA — computed-style diff: Prototype (زنده) vs Production (/sell/*)
 * هر دو صفحه در یک مرورگر (agent-browser) باز می‌شوند؛ اسکریپت یکسان در هر دو
 * اجرا و JSONها مقایسه می‌شوند. فقط تفاوت‌های مادی (نه دیتا) گزارش می‌شود.
 *
 * اجرا: node scripts/qa-phase5-diff.mjs
 */
import { execFileSync } from "node:child_process";

const AB = (args) => execFileSync("agent-browser", args, { encoding: "utf8", timeout: 30_000 });
const evalPage = (js) => AB(["eval", js]).trim();

const PROTO = "file:///home/z/my-project/repos/imach-web/redesign-final/index.html";
const PAIRS = [
  { name: "sell-catalog", proto: "sc-sell-catalog", prod: "http://localhost:3000/sell/catalog", scope: "#sc-sell-catalog" },
  { name: "sell-product-owner", proto: "sc-sell-product-owner", prod: "http://localhost:3000/sell/product/6ac3b204f79516ef723eb4f7", scope: "#sc-sell-product-owner" },
  { name: "discount", proto: "sc-discount", prod: "http://localhost:3000/sell/discounts", scope: "#sc-discount" },
];

const PROBE = (scope) => String.raw`
(() => {
  const root = document.querySelector('${scope}') || document.querySelector('[data-screen]');
  const pick = (el, props) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = cs.getPropertyValue(p);
    const r = el.getBoundingClientRect();
    out._box = Math.round(r.width) + "x" + Math.round(r.height);
    return out;
  };
  const S = (sel) => root ? root.querySelector(sel) : document.querySelector(sel);
  const fontProps = ["font-size", "font-weight", "line-height", "color", "font-family"];
  const boxProps = ["background-color", "border-radius", "padding", "border-color", "box-shadow", "gap"];
  return JSON.stringify({
    pagehead:    pick(root?.querySelector(".pagehead") || S(".pagehead"), [...fontProps, ...boxProps, "height"]),
    pageTitle:   pick(S(".pagehead .tt b") || S(".tt b"), fontProps),
    screenBody:  pick(S(".screen-body"), boxProps),
    card:        pick(S(".card"), boxProps),
    btnPrimary:  pick(S(".btn-primary"), [...fontProps, ...boxProps]),
    iconBtn:     pick(S(".icon-btn"), boxProps),
    secTitle:    pick(S(".sec-title h2"), fontProps),
    tbar:        pick(S(".tbar"), boxProps),
    tbOn:        pick(S(".tbar .tb.on"), ["color", "background-color", "border-radius", "font-weight"]),
    chip:        pick(S(".chips .chip") || S(".chip"), ["font-size", "font-weight", "color", "background-color", "border-radius", "padding"]),
    inp:         pick(S(".inp"), ["font-size", "color", "background-color", "border-radius", "padding", "height"]),
    hint:        pick(S(".hint"), ["background-color", "border-radius", "color", "font-size", "padding"]),
    tabbar:      pick(document.querySelector(".tabbar"), boxProps),
    tabOn:       pick(document.querySelector(".tabbar .tab.active, .tabbar .tab.on"), ["color", "background-color", "font-weight"]),
    searchbar:   pick(S(".searchbar"), boxProps),
    pcard:       pick(S(".p-card"), boxProps),
    pcardNm:     pick(S(".p-card .nm"), fontProps),
    pcardPk:     pick(S(".p-card .pk"), fontProps),
    priceEntry:  pick(S(".price-entry"), boxProps),
    emptyState:  pick(S(".empty-state h3") || S(".empty-state"), fontProps),
    sheet:       pick(document.querySelector(".sheet.open, .sheet"), boxProps),
  });
})()
`;

const norm = (s) => JSON.stringify(JSON.parse(s), null, 0);
let totalDiff = 0;
for (const p of PAIRS) {
  // ۱) پروتوتایپ
  AB(["open", `${PROTO}#${p.proto}`]);
  execFileSync("sleep", ["1"]);
  evalPage(`go('${p.proto}')`);
  const protoJson = evalPage(PROBE(p.scope));
  // ۲) پروداکشن
  AB(["open", p.prod]);
  execFileSync("sleep", ["2.5"]);
  const prodJson = evalPage(PROBE(p.scope));

  // ۳) مقایسهٔ کلید به کلید
  const a = JSON.parse(protoJson);
  const b = JSON.parse(prodJson);
  const diffs = [];
  for (const k of Object.keys(a)) {
    const va = a[k], vb = b[k];
    if (va === null || vb === null || typeof va !== "object" || typeof vb !== "object") continue; // مؤلفه در این صفحه نیست
    for (const prop of Object.keys(va)) {
      if (vb[prop] === undefined) continue;
      if (va[prop] !== vb[prop]) {
        // رنگ‌های نزدیک به هم و اختلاف جزئی px را نادیده نگیریم؟ نه — گزارش دقیق
        diffs.push(`${k}.${prop}: proto=${va[prop]} prod=${vb[prop]}`);
      }
    }
  }
  totalDiff += diffs.length;
  console.log(`\n═══ ${p.name} ═══`);
  if (diffs.length === 0) console.log("  ✓ IDENTICAL (all probed components)");
  else diffs.slice(0, 14).forEach((d) => console.log("  ✗ " + d));
  if (diffs.length > 14) console.log(`  … +${diffs.length - 14} more`);
}
console.log(`\nTOTAL material diffs: ${totalDiff}`);
