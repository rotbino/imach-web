# ═══ iMach — Brand tagline smoke (fa/en/ar) ═══
# Checks: landing h1 + <title> + copyright + login brand tag after the
# "تأمین‌کنندگان هر کالا را به خریداران عمدهٔ آن وصل می‌کند" rebrand.
# Usage: /home/z/.venv/bin/python /home/z/my-project/scripts/brand-smoke.py
import sys, time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3000"
SHOTS = "/home/z/my-project/imach-web/shots-brand"
PASS, FAIL = 0, 0

def ok(msg):
    global PASS; PASS += 1; print(f"  \u2714 {msg}")

def bad(msg):
    global FAIL; FAIL += 1; print(f"  \u2716 {msg}")

def norm(s: str) -> str:
    return " ".join(s.split())

def check(page, url, locale, expects, shot=None, desktop=False):
    page.goto(url, wait_until="networkidle")
    page.wait_for_timeout(400)
    h1_loc = page.locator("h1").first
    h1 = norm(h1_loc.inner_text()) if h1_loc.count() else ""
    title = page.title()
    body = norm(page.locator("body").inner_text())
    for kind, needle, where in expects:
        if where == "__absent__":
            if needle in body or needle in h1 or needle in title:
                bad(f"[{locale or 'fa'}] {kind} — OLD TEXT STILL PRESENT: {needle!r}")
            else:
                ok(f"[{locale or 'fa'}] {kind}")
            continue
        hay = {"h1": h1, "title": title, "body": body}[where]
        if needle in hay:
            ok(f"[{locale or 'fa'}] {kind}")
        else:
            bad(f"[{locale or 'fa'}] {kind} — NOT FOUND: {needle!r} in {where}: {hay[:120]!r}")
    if shot:
        page.screenshot(path=f"{SHOTS}/{shot}", full_page=False)

with sync_playwright() as p:
    browser = p.chromium.launch()
    # ── FA (default) ──
    pg = browser.new_page(viewport={"width": 390, "height": 844})
    print("── FA: landing (mobile) ──")
    check(pg, f"{BASE}/", None, [
        ("h1 tagline (polished)", "تأمین‌کنندگان هر کالا را به خریداران عمدهٔ آن کالا وصل می‌کند", "h1"),
        ("title tagline", "تأمین‌کنندگان هر کالا را به خریداران عمدهٔ آن وصل می‌کند", "title"),
        ("copyright", "وصل‌کردن تأمین‌کنندگان به خریداران عمده", "body"),
        ("no old tagline", "شعبهٔ آنلاین", "__absent__"),
    ], shot="01-fa-hero-mobile.png")
    print("── FA: landing (desktop) ──")
    pg2 = browser.new_page(viewport={"width": 1440, "height": 900})
    check(pg2, f"{BASE}/", None, [
        ("h1 tagline", "تأمین‌کنندگان هر کالا را به خریداران عمدهٔ آن کالا وصل می‌کند", "h1"),
    ], shot="02-fa-hero-desktop.png")
    print("── FA: login brand panel ──")
    pg3 = browser.new_page(viewport={"width": 1440, "height": 900})
    pg3.context.add_cookies([{"name": "imach_locale", "value": "fa", "url": BASE}])
    check(pg3, f"{BASE}/login", "fa", [
        ("brand tag", "تأمین‌کنندگان هر کالا را به خریداران عمدهٔ آن کالا وصل می‌کند", "body"),
        ("no old tag", "شعبهٔ آنلاین", "__absent__"),
    ], shot="03-fa-login-brand.png")
    pg.close(); pg2.close(); pg3.close()

    # ── EN ──
    print("── EN: landing ──")
    pe = browser.new_page(viewport={"width": 1440, "height": 900})
    pe.context.add_cookies([{"name": "imach_locale", "value": "en", "url": BASE}])
    check(pe, f"{BASE}/", "en", [
        ("h1 tagline", "connecting the suppliers of every product to the wholesale buyers of that product", "h1"),
        ("title tagline", "connecting suppliers of every product to its wholesale buyers", "title"),
        ("copyright", "connecting suppliers to wholesale buyers", "body"),
        ("no old tagline", "online branch", "__absent__"),
    ], shot="04-en-hero.png")
    pe.close()

    # ── AR ──
    print("── AR: landing ──")
    pa = browser.new_page(viewport={"width": 1440, "height": 900})
    pa.context.add_cookies([{"name": "imach_locale", "value": "ar", "url": BASE}])
    check(pa, f"{BASE}/", "ar", [
        ("h1 tagline", "يصل مورّدي كل سلعة إلى مشتريي الجملة لتلك السلعة", "h1"),
        ("title tagline", "يصل مورّدي السلع إلى مشتريي الجملة", "title"),
        ("copyright", "يصل المورّدين بمشتريي الجملة", "body"),
    ], shot="05-ar-hero.png")
    pa.close()
    browser.close()

print(f"\n══ RESULT: {PASS} pass / {FAIL} fail ══")
sys.exit(1 if FAIL else 0)
