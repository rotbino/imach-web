#!/usr/bin/env node
/**
 * Visual QA — computed-style diff: Prototype (live HTML) vs Production (/home)
 * با اجرای یک اسکریپت یکسان در هر دو صفحه و مقایسهٔ JSON خروجی.
 * اجرا: node scripts/qa-style-diff.mjs   (پس از باز بودن هر دو صفحه در مرورگر)
 */
import { execFileSync } from "node:child_process";

const PROTO = "file:///home/z/my-project/repos/imach-web/redesign-final/index.html";
const PROD = "http://localhost:3100/home";

const PROBE = String.raw`
(() => {
  const pick = (el, props) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = cs.getPropertyValue(p);
    const r = el.getBoundingClientRect();
    out._box = [Math.round(r.width), Math.round(r.height)].join("x");
    return out;
  };
  const S = (sel) => document.querySelector(sel);
  const fontProps = ["font-size","font-weight","line-height","color","font-family"];
  const boxProps = ["background-color","border-radius","padding","margin","border-color","border-width","box-shadow","gap"];
  return JSON.stringify({
    appbar:      pick(S(".appbar"), [...fontProps, ...boxProps, "min-height"]),
    armPill:     pick(S(".arm-pill"), [...fontProps, ...boxProps]),
    iconBtn:     pick(S(".icon-btn"), boxProps),
    tabbar:      pick(S(".tabbar"), [...boxProps, "padding"]),
    tab:         pick(S(".tabbar .tab"), [...fontProps, "color", "background-color", "border-radius"]),
    tabActive:   pick(S(".tabbar .tab.active"), ["color", "background-color"]),
    greet:       pick(S(".greet b"), fontProps),
    greetSub:    pick(S(".greet span"), fontProps),
    btnPrimary:  pick(S(".btn-primary"), [...fontProps, ...boxProps]),
    shareStrip:  pick(S(".share-strip"), [...boxProps, "border-radius"]),
    secTitle:    pick(S(".sec-title h2"), fontProps),
    rowCard:     pick(S(".row-card"), [...boxProps, "border-radius"]),
    rowTitle:    pick(S(".row-card .t"), fontProps),
    rowPrice:    pick(S(".row-card .pl b"), fontProps),
    rowSub:      pick(S(".row-card .s"), fontProps),
    badge:       pick(S(".badge.b-teal"), [...fontProps.slice(0,2), "background-color", "color", "border-radius"]),
    thumb:       pick(S(".row-card .thumb"), ["width", "height", "border-radius", "background-color"]),
    hint:        pick(S(".hint"), [...fontProps.slice(0,3), "background-color", "border-radius", "border-color"]),
    sheetRow:    pick(S("#sheet-switch .sheet-row"), boxProps),
    body:        pick(S("body"), ["background-color", "color", "font-family"]),
  });
})()
`;

function parseResult(raw) {
  const s = raw.trim();
  // فرم‌های ممکن: '"{…}"' (رشتهٔ JSON کپسوله) · '{…}' مستقیم · خروجی معیوب CLI
  const candidates = [];
  try { candidates.push(JSON.parse(s)); } catch {}
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i >= 0 && j > i) candidates.push(s.slice(i, j + 1));
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().startsWith("{")) {
      try { return JSON.parse(c); } catch {}
    }
    if (c && typeof c === "object" && !Array.isArray(c)) return c;
  }
  return null;
}

function grab(url, setup, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    execFileSync("agent-browser", ["open", url], { stdio: "pipe" });
    execFileSync("agent-browser", ["wait", "--load", "networkidle"], { stdio: "pipe" }).catch?.(() => {});
    if (setup) { try { execFileSync("agent-browser", ["eval", setup], { stdio: "pipe" }); } catch {} }
    execFileSync("agent-browser", ["set", "viewport", "360", "800"], { stdio: "pipe" });
    execFileSync("agent-browser", ["wait", "400"], { stdio: "pipe" });
    const raw = execFileSync("agent-browser", ["eval", PROBE], { stdio: "pipe" }).toString();
    const parsed = parseResult(raw);
    if (parsed) return parsed;
  }
  throw new Error(`eval output unparseable for ${url}`);
}

const protoSetup = String.raw`
  document.querySelector('#sc-buy-list').classList.add('on');
  document.getElementById('phone')?.setAttribute('data-arm','buy');
  'ok'
`;

const a = grab(PROTO, protoSetup);
const b = grab(PROD);

let diffs = 0, checked = 0;
const norm = (v) => String(v).replace(/rgba?\(([^)]+)\)/g, (m) => {
  const n = m.match(/[\d.]+/g).map(Number).map((x) => Math.round(x));
  return `rgb(${n.join(",")})`;
}).replace(/\s+/g, " ").trim();

for (const key of Object.keys(a)) {
  const pa = a[key], pb = b[key];
  if (!pa || !pb) { console.log(`⚠ ${key}: missing (${!pa ? "proto" : "prod"})`); diffs++; continue; }
  for (const prop of Object.keys(pa)) {
    checked++;
    const va = norm(pa[prop]), vb = norm(pb[prop]);
    if (va !== vb) {
      // فونت در production با next/font متفاوت است (preload) — برابری خانواده لازم نیست، اندازه/وزن باید یکی باشد
      if (prop === "font-family") continue;
      console.log(`✖ ${key}.${prop}: proto="${va}" prod="${vb}"`);
      diffs++;
    }
  }
}
console.log(`\n▣ ${checked} properties checked · ${diffs} diffs`);
