#!/usr/bin/env node
/**
 * iMach — Prototype CSS Porter (design-system migration)
 * ------------------------------------------------------------
 * Ports redesign-final/css/style.css (v18 Reference Prototype) into
 * `styles/imach/components.css`, scoped under the `.ia` app root so the
 * prototype class system can never collide with Tailwind/shadcn styles
 * used by legacy pages (landing/admin) during the migration.
 *
 * Transformations (all fidelity-preserving, auditable):
 *   1. @font-face            → dropped (next/font/local owns fonts)
 *   2. :root / [data-arm] var rules → dropped (styles/imach/tokens.css owns)
 *   3. body / html / * reset → dropped (styles/imach/base.css owns, scoped)
 *   4. demo scaffolding selectors (.workspace, .nav-panel, .phone-wrap,
 *      .notch, .statusbar, .home-indicator, .screen-stack, .demo-link,
 *      body.rd*, .stop-confirm, base-frame `.phone`) → dropped
 *   5. `#sc-x` screen ids    → `[data-screen="x"]` attribute selectors
 *   6. inside ≥920px block: exact `.phone` → `.ia.app` (app grid column)
 *   7. every surviving selector gets the `.ia ` scope prefix
 *   8. font-family 'IRANSans' → var(--font-iran) (next/font variable)
 *      + `background: #fff|white` → `background: var(--surface)` (theme rail:
 *        identical in light mode, actually switchable in dark mode;
 *        `color:#fff` on colored buttons is intentionally untouched)
 *   9. @media (max-width:920px) and the rapid-demo (min-width:1240px)
 *      blocks are dropped entirely (demo-frame neutralization)
 *  10. @keyframes kept verbatim (global names, no prefix)
 *
 * Re-run any time the prototype CSS evolves:
 *   node scripts/port-prototype-css.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve("redesign-final/css/style.css");
const OUT_DIR = path.resolve("styles/imach");
const OUT = path.join(OUT_DIR, "components.css");

// ── selectors that belong to the demo harness, never to the product ──
const DROP_RE = [
  /(^|[\s,>+~])\.workspace\b/,
  /(^|[\s,>+~])\.nav-panel\b/,
  /(^|[\s,>+~])\.nav-groups\b/,
  /(^|[\s,>+~])\.nav-g\b/,
  /(^|[\s,>+~])\.nav-item\b/,
  /(^|[\s,>+~])\.phone-wrap\b/,
  /(^|[\s,>+~])\.notch\b/,
  /(^|[\s,>+~])\.statusbar\b/,
  /(^|[\s,>+~])\.home-indicator\b/,
  /(^|[\s,>+~])\.screen-stack\b/,
  /(^|[\s,>+~])\.demo-link\b/,
  /(^|[\s,>+~])\.stop-confirm\b/,
  /(^|[\s,>+~])\.rd-fab\b/,
  /^body\.rd[\s.,:>#[]?/,
  /(^|[\s,>+~])\.rd-[a-z-]+\b/,
  /^body\b/,
  /^html\b/,
  /^:root\b/,
  /^\*$/,
  /\[data-arm=/,
  /^\.screen$/, // production page semantics owned by shell.css
  /^\.screen\.on$/,
  /^\.phone$/, // فقط سلکتورِ دقیق قاب دمو (word-boundary با phone-verified می‌گرفت!)
];

const mediaDrop = [
  /\(max-width:\s*920px\)/, // demo-frame neutralization (mobile)
  /\(min-width:\s*1240px\)/, // rapid-demo pinned sidebar
];

// ── minimal flat-CSS parser (handles comments + one @media nesting level) ──
function parse(css, from = 0, end = css.length) {
  const nodes = [];
  let i = from;
  let leading = "";
  while (i < end) {
    // consume ALL leading trivia (comments AND whitespace, however mixed)
    for (;;) {
      const rest = css.slice(i, end);
      const cm = /^\/\*[\s\S]*?\*\//.exec(rest);
      if (cm) { leading += cm[0]; i += cm[0].length; continue; }
      const ws = /^\s+/.exec(rest);
      if (ws) { leading += ws[0]; i += ws[0].length; continue; }
      break;
    }
    if (i >= end) break;
    if (css[i] === "}") { i++; continue; }
    // read header until '{' or ';' (statements like @import)
    let header = "";
    while (i < end && css[i] !== "{" && css[i] !== ";") header += css[i++];
    header = header.trim();
    if (css[i] === ";") { i++; leading = ""; continue; } // stray statement
    if (!header) { i++; continue; }
    // read block until matching brace
    let depth = 1, body = "", j = i + 1;
    while (j < end && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") { depth--; if (depth === 0) break; }
      body += css[j++];
    }
    i = j + 1;

    if (header.startsWith("@media")) {
      const query = header.replace(/^@media\s*/i, "");
      nodes.push({ type: "media", query, children: parse(body), leading });
    } else if (header.startsWith("@keyframes") || header.startsWith("@-webkit-keyframes")) {
      nodes.push({ type: "rule", selectors: [header], declarations: body, leading, verbatim: true });
    } else if (header.startsWith("@font-face")) {
      nodes.push({ type: "drop", leading }); // next/font owns fonts
    } else {
      const selectors = header.split(",").map((s) => s.trim()).filter(Boolean);
      nodes.push({ type: "rule", selectors, declarations: body, leading });
    }
    leading = "";
  }
  return nodes;
}

// ── selector transformation ──────────────────────────────────────────
const warnings = [];
function mapSelector(sel, inDesktop) {
  let s = sel;
  // screen ids → data-screen attributes
  s = s.replace(/#sc-([a-z0-9-]+)/g, '[_data_screen_="$1"]');
  if (inDesktop && /^\.phone$/.test(s)) return ".ia.app";
  if (s === ".phone") return null; // demo frame
  if (/^\.phone\s/.test(s)) {
    warnings.push(`unhandled .phone descendant selector: ${sel}`);
    return null;
  }
  s = s.replace(/\[_data_screen_/g, "[data-screen=");
  return `.ia ${s}`;
}

function transformRule(node, inDesktop) {
  if (node.verbatim) return node; // @keyframes passthrough
  const kept = [];
  for (const sel of node.selectors) {
    // the ≥920px `.phone` rule IS the production app grid — map it, never drop
    if (inDesktop && /^\.phone$/.test(sel)) { kept.push(".ia.app"); continue; }
    if (DROP_RE.some((re) => re.test(sel))) continue;
    const mapped = mapSelector(sel, inDesktop);
    if (mapped) kept.push(mapped);
  }
  if (kept.length === 0) return null;
  const declarations = node.declarations
    .replace(/'IRANSans'/g, "var(--font-iran)")
    .replace(/"IRANSans"/g, "var(--font-iran)")
    .replace(/(background(?:-color)?):\s*(#fff(?:fff)?|white)\s*;/g, "$1: var(--surface);");
  return { ...node, selectors: kept, declarations };
}

function serialize(nodes, inDesktop = false, indent = "") {
  let out = "";
  for (const node of nodes) {
    const lead = node.leading ?? "";
    if (node.type === "media") {
      if (mediaDrop.some((re) => re.test(node.query))) continue; // demo block
      const inner = serialize(node.children, /\(min-width:\s*920px\)/.test(node.query), indent + "  ");
      if (inner.trim()) out += `${lead}@media ${node.query} {\n${inner}\n${indent}}\n`;
      continue;
    }
    if (node.type === "drop") continue;
    const t = transformRule(node, inDesktop);
    if (!t) continue;
    out += `${t.leading}${t.selectors.join(",\n")} {\n${t.declarations.trim()}\n}\n`;
  }
  return out;
}

// ── run ──────────────────────────────────────────────────────────────
const css = await readFile(SRC, "utf8");
const nodes = parse(css);
const out = serialize(nodes);

const header = `/* ═══════════════════════════════════════════════════════════════
   iMach — Design System (ported from redesign-final v18 Reference Prototype)
   GENERATED by scripts/port-prototype-css.mjs — do not hand-edit;
   re-run the script after prototype CSS changes instead.

   Scope: every selector lives under \`.ia\` (the app-shell root class)
   so the prototype class system coexists safely with Tailwind/shadcn
   pages still in production during migration.

   Dropped here (owned elsewhere or demo-only):
     · fonts      → next/font/local (--font-iran)
     · tokens     → styles/imach/tokens.css  (vars, [data-arm], [data-theme])
     · resets     → styles/imach/base.css    (scoped * / body / svg sizes)
     · app frame  → styles/imach/shell.css   (.ia.app layout, .screen page)
     · demo harness (phone frame, nav-panel, statusbar, notch, rapid-demo)
   Kept verbatim: component classes, sheets, cards, forms, responsive
     blocks (≥768 / ≥920 / ≥1024 / ≥1280 / ≥1440 / ≥1600), keyframes.
   ═══════════════════════════════════════════════════════════════ */

`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, header + out + "\n");

// stats
const ruleCount = (out.match(/\{\n/g) || []).length;
console.log(`▣ ported ${ruleCount} rule blocks → ${OUT}`);
if (warnings.length) {
  console.warn("⚠ manual review needed:");
  for (const w of warnings) console.warn("  - " + w);
}
