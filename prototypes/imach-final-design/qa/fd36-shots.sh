#!/bin/bash
# FD-36 — اسکرین‌شات‌های ۱۳ افزودن محصول (دسکتاپ گام ۱/۲/۳ + موبایل)
cd "$(dirname "$0")/.."
OUT=png/qa36
mkdir -p "$OUT"
PORT=8180

agent-browser set viewport 1440 900 >/dev/null 2>&1
agent-browser open "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 1.5
agent-browser eval "location.reload(); 'r'" >/dev/null 2>&1
sleep 2

# ─── دسکتاپ: گام ۱ (جستجو + دو گروه زیرِ هم) ───
agent-browser eval "iMach.show('s-sell-add', false); 'ok'" >/dev/null 2>&1
sleep 1
agent-browser screenshot "$OUT/01-desk-step1.png" >/dev/null 2>&1

# ─── دسکتاپ: گام ۲ (کالای منتخب + چیپ برند + محصولات) ───
agent-browser eval "document.querySelector('#s-sell-add .pick-row[data-pick-good]').click(); 'ok'" >/dev/null 2>&1
sleep 0.8
agent-browser screenshot "$OUT/02-desk-step2.png" >/dev/null 2>&1

# ─── دسکتاپ: گام ۳ (فرم کاغذ + دکمهٔ افزودن با فاصله از ته) ───
agent-browser eval "document.querySelector('#s-sell-add .pick-row[data-pick-ref]').click(); 'ok'" >/dev/null 2>&1
sleep 0.8
agent-browser screenshot "$OUT/03-desk-step3.png" >/dev/null 2>&1

# ─── دسکتاپ: تهِ گام ۳ — دکمه و بالشِ زیرش ───
agent-browser eval "window.scrollTo(0, 99999); 'ok'" >/dev/null 2>&1
sleep 0.5
agent-browser screenshot "$OUT/04-desk-step3-bottom.png" >/dev/null 2>&1

# ─── موبایل ۳۹۰: گام ۱ و گام ۳ — دست‌نخورده ───
agent-browser set viewport 390 844 >/dev/null 2>&1
sleep 1.2
agent-browser eval "iMach.show('s-sell-add', false); 'ok'" >/dev/null 2>&1
sleep 0.8
agent-browser screenshot "$OUT/05-mob-step1.png" >/dev/null 2>&1
agent-browser eval "document.querySelector('#s-sell-add .pick-row[data-pick-good]').click(); 'ok'" >/dev/null 2>&1
sleep 0.5
agent-browser eval "document.querySelector('#s-sell-add .pick-row[data-pick-ref]').click(); 'ok'" >/dev/null 2>&1
sleep 0.5
agent-browser screenshot "$OUT/06-mob-step3.png" >/dev/null 2>&1
agent-browser set viewport 1440 900 >/dev/null 2>&1

ls -la "$OUT"/*.png | awk '{print $9, $5}'
