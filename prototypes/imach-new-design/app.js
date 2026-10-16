/* ═══════════════════════════════════════════════════════════════
   iMach — منطق پروتوتایپ
   ═══════════════════════════════════════════════════════════════
   شامل:
   - State سراسری
   - Utilities (اعداد فارسی، پول، تبدیل)
   - Sheet / Modal Manager
   - Router (ناوبری بین صفحات)
   - Event Delegation (همهٔ کلیک‌ها)
   - Hash Navigation
   - QR Painter
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ═══ State ═══ */
    var state = {
        arm: 'sell',
        current: 's-landing',
        stack: [],
        role: 'sell',
        city: 'رشت',
        industry: 'پخش مواد غذایی',
        cart: []
    };

    /* دسترسی سریع به داده */
    var DATA = window.IMACH_DATA || {};

    /* ═══ Utilities ═══ */
    function $ (sel, root) { return (root || document).querySelector(sel); }
    function $$ (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function faNum (n) {
        return String(n).replace(/\d/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+x); });
    }

    function faMoney (n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            .replace(/,/g, '٬')
            .replace(/\d/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+x); });
    }

    function toEnNum (s) {
        return String(s || '').replace(/[۰-۹]/g, function (d) {
            return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
        }).replace(/[^\d]/g, '');
    }

    /* ═══ Sheet / Modal Manager ═══ */
    function closeSheet () {
        var bd = $('#backdrop');
        if (bd) bd.classList.remove('show');
        $$('.sheet.show, .modal.show').forEach(function (s) { s.classList.remove('show'); });
    }

    function openSheet (id) {
        closeSheet();
        var sh = document.getElementById(id);
        if (!sh) return;
        var bd = $('#backdrop');
        if (bd) bd.classList.add('show');
        sh.classList.add('show');
    }

    /* ═══ Router ═══ */
    function show (id, push) {
        var target = document.getElementById(id);
        if (!target) { id = 's-landing'; target = document.getElementById(id); }
        if (!target) return;

        /* گارد دستیار */
        var arm = target.dataset.arm;
        if (arm && arm !== 'keep' && arm !== state.arm) {
            state.arm = arm;
            var phone = document.getElementById('phone');
            if (phone) phone.dataset.arm = arm;
        }

        $$('.screen').forEach(function (s) { s.hidden = true; });
        target.hidden = false;

        var body = target.querySelector('.body');
        if (body) body.scrollTop = 0;

        /* تب‌های داخل همان صفحه */
        var innerTabs = target.querySelectorAll('.tabbar .tab');
        innerTabs.forEach(function (tab) {
            if (tab.dataset.go === id) tab.classList.add('active');
        });

        if (push !== false && state.current && state.current !== id) {
            state.stack.push(state.current);
        }
        state.current = id;

        try { history.replaceState(null, '', '#' + id); } catch (e) {}
    }

    function go (id) {
        if (document.getElementById(id)) show(id, true);
    }

    function back () {
        var prev = state.stack.pop() || 's-landing';
        show(prev, false);
    }

    /* ═══ Event Delegation ═══ */
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;

        /* data-go */
        var goEl = t.closest('[data-go]');
        if (goEl) {
            e.preventDefault();
            var target = goEl.dataset.go;
            if (t.closest('.tabbar')) {
                var bar = t.closest('.tabbar');
                $$('.tab', bar).forEach(function (x) { x.classList.remove('active'); });
                t.closest('.tab').classList.add('active');
            }
            go(target);
            return;
        }

        /* data-back */
        var backEl = t.closest('[data-back]');
        if (backEl) { e.preventDefault(); back(); return; }

        /* data-sheet */
        var sheetEl = t.closest('[data-sheet]');
        if (sheetEl) {
            e.preventDefault();
            var sid = sheetEl.dataset.sheet;
            if (sid && document.getElementById(sid)) openSheet(sid);
            return;
        }

        /* data-close */
        var closeEl = t.closest('[data-close]');
        if (closeEl) { e.preventDefault(); closeSheet(); return; }

        /* backdrop */
        if (t.id === 'backdrop') { closeSheet(); return; }

        /* switch */
        var sw = t.closest('.switch');
        if (sw) { e.preventDefault(); sw.classList.toggle('on'); return; }

        /* checkrow */
        var cr = t.closest('.checkrow');
        if (cr && !cr.querySelector('[data-switch]')) {
            var cb = cr.querySelector('.checkbox');
            if (cb) cb.classList.toggle('on');
            return;
        }

        /* pill */
        var pill = t.closest('.pill');
        if (pill && pill.parentElement.classList.contains('pills')) {
            var parent = pill.parentElement;
            $$('.pill', parent).forEach(function (p) { p.classList.remove('active'); });
            pill.classList.add('active');
            return;
        }

        /* chip */
        var chip = t.closest('.chip');
        if (chip && chip.parentElement && chip.parentElement.classList.contains('chips')) {
            $$('.chip', chip.parentElement).forEach(function (c) { c.classList.remove('active'); });
            chip.classList.add('active');
            return;
        }

        /* pk-row */
        var pk = t.closest('[data-pk]');
        if (pk) { e.preventDefault(); pk.classList.toggle('on'); return; }

        /* data-pick */
        var pick = t.closest('[data-pick]');
        if (pick) {
            e.preventDefault();
            var field = pick.dataset.pick;
            var val = pick.dataset.value;
            if (field === 'city') {
                state.city = val;
                var citySpan = document.getElementById('su-city');
                if (citySpan) citySpan.textContent = val;
            } else if (field === 'industry') {
                state.industry = val;
                var indSpan = document.getElementById('su-industry');
                if (indSpan) indSpan.textContent = val;
            } else if (field === 'biz') {
                var bizName = document.getElementById('sell-dash-name');
                if (bizName) bizName.textContent = val;
            }
            $$('[data-pick]').forEach(function (x) { x.classList.remove('current'); });
            pick.classList.add('current');
            setTimeout(closeSheet, 200);
            return;
        }

        /* data-arm-go */
        var armGo = t.closest('[data-arm-go]');
        if (armGo) {
            e.preventDefault();
            var newArm = armGo.dataset.armGo;
            state.arm = newArm;
            var phoneEl = document.getElementById('phone');
            if (phoneEl) phoneEl.dataset.arm = newArm;
            closeSheet();
            setTimeout(function () {
                show(newArm === 'sell' ? 's-sell-dash' : 's-buy-dash', false);
                state.stack = [];
            }, 250);
            return;
        }

        /* copy */
        var copyEl = t.closest('[data-copy]');
        if (copyEl) {
            e.preventDefault();
            var label = copyEl.querySelector('[data-copy-label]');
            if (label) {
                var orig = label.textContent;
                label.textContent = 'کپی شد ✓';
                setTimeout(function () {
                    label.textContent = orig;
                    closeSheet();
                }, 900);
            }
            return;
        }

        /* visibility */
        var visEl = t.closest('[data-visibility]');
        if (visEl) {
            e.preventDefault();
            $$('[data-visibility]').forEach(function (x) {
                x.classList.toggle('current', x === visEl);
            });
            setTimeout(closeSheet, 300);
            return;
        }

        /* نقش در ثبت‌نام */
        var roleBtn = t.closest('#su-role .pill');
        if (roleBtn) {
            state.role = roleBtn.dataset.role;
            return;
        }

        /* OTP cell */
        var otpCell = t.closest('.otp-cell');
        if (otpCell) {
            var otpRow = otpCell.parentElement;
            var cells = $$('.otp-cell', otpRow);
            var idx = cells.indexOf(otpCell);
            cells.forEach(function (c, i) {
                if (i <= idx) {
                    c.textContent = faNum((i + 3) % 10);
                    c.style.background = 'var(--surface-2)';
                    c.style.borderColor = 'var(--border-2)';
                    c.style.fontSize = '20px';
                    c.style.fontWeight = '700';
                }
            });
            if (idx < cells.length - 1) {
                cells[idx + 1].style.borderColor = 'var(--primary)';
                cells[idx + 1].style.boxShadow = '0 0 0 3px rgba(249,115,22,.14)';
            } else {
                var cont = document.getElementById('otp-continue');
                if (cont) cont.disabled = false;
            }
            return;
        }

        /* continue OTP */
        var contBtn = t.closest('#otp-continue');
        if (contBtn) { go('s-onboarding'); return; }

        /* دکمه‌های اقدام */
        var acceptOffer = t.closest('[data-accept-offer]');
        if (acceptOffer) {
            acceptOffer.innerHTML = '<svg><use href="#i-check"/></svg> انتخاب شد';
            acceptOffer.disabled = true;
            acceptOffer.style.background = 'var(--green)';
            setTimeout(function () { go('s-buy-orders'); }, 800);
            return;
        }

        var ordSubmit = t.closest('[data-order-submit]');
        if (ordSubmit) {
            ordSubmit.innerHTML = '<svg><use href="#i-check"/></svg> سفارش ارسال شد';
            ordSubmit.disabled = true;
            setTimeout(function () {
                state.stack = [];
                show('s-buy-orders', false);
            }, 900);
            return;
        }

        var rfqSubmit = t.closest('[data-rfq-submit]');
        if (rfqSubmit) {
            rfqSubmit.innerHTML = '<svg><use href="#i-check"/></svg> ارسال شد';
            rfqSubmit.disabled = true;
            setTimeout(function () {
                state.stack = [];
                show(state.current === 's-sell-rfq' ? 's-sell-rfqs' : 's-buy-rfqs', false);
            }, 900);
            return;
        }

        var ordAccept = t.closest('[data-order-accept]');
        if (ordAccept) {
            ordAccept.innerHTML = '<svg><use href="#i-check"/></svg> پذیرفته شد';
            ordAccept.disabled = true;
            ordAccept.style.background = 'var(--green)';
            setTimeout(function () {
                state.stack = [];
                show('s-sell-orders', false);
            }, 900);
            return;
        }

        var saveProd = t.closest('[data-save-product]');
        if (saveProd) {
            saveProd.innerHTML = '<svg><use href="#i-check"/></svg> ذخیره شد';
            saveProd.disabled = true;
            setTimeout(function () {
                state.stack = [];
                show('s-sell-catalog', false);
            }, 800);
            return;
        }

        var skip = t.closest('[data-suggestion-skip]');
        if (skip) {
            var card = skip.closest('.card');
            if (card) {
                card.style.transition = 'opacity .3s, transform .3s';
                card.style.opacity = '0';
                card.style.transform = 'translateX(-20px)';
                setTimeout(function () { card.remove(); }, 300);
            }
            return;
        }

        var connect = t.closest('[data-suggestion-connect]');
        if (connect) {
            connect.innerHTML = '<svg><use href="#i-check"/></svg> ارسال شد';
            connect.disabled = true;
            connect.style.background = 'var(--green)';
            return;
        }

        var sendBtn = t.closest('[data-send]');
        if (sendBtn) {
            sendBtn.textContent = 'ارسال شد ✓';
            sendBtn.disabled = true;
            sendBtn.style.color = 'var(--green)';
            sendBtn.style.borderColor = 'var(--green)';
            return;
        }

        var pasteRun = t.closest('[data-paste-run]');
        if (pasteRun) {
            pasteRun.innerHTML = '<svg><use href="#i-check"/></svg> ۳ کالا تطبیق شد';
            pasteRun.style.background = 'var(--green)';
            setTimeout(closeSheet, 900);
            return;
        }

        var addCust = t.closest('[data-add-customer]') || t.closest('[data-add-supplier]');
        if (addCust) {
            var html = addCust.innerHTML;
            addCust.innerHTML = '<svg><use href="#i-check"/></svg> اضافه شد';
            addCust.disabled = true;
            setTimeout(function () {
                closeSheet();
                addCust.innerHTML = html;
                addCust.disabled = false;
            }, 900);
            return;
        }

        /* تب‌بار بدون data-go */
        var tab = t.closest('.tabbar .tab');
        if (tab && !tab.dataset.go) {
            e.preventDefault();
            var bar2 = tab.parentElement;
            $$('.tab', bar2).forEach(function (x) { x.classList.remove('active'); });
            tab.classList.add('active');
            return;
        }
    });

    /* ═══ Enter در input ═══ */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            var active = document.activeElement;
            if (active && active.classList && active.classList.contains('input')) {
                active.blur();
            }
        }
    });

    /* ═══ Hash Navigation ═══ */
    window.addEventListener('hashchange', function () {
        var hash = location.hash.slice(1);
        if (hash && document.getElementById(hash) && hash !== state.current) {
            show(hash, true);
        }
    });

    /* ═══ QR Painter ═══ */
    function paintQR () {
        var svg = document.getElementById('qr-svg');
        if (!svg || svg.dataset.done) return;
        svg.dataset.done = '1';
        var N = 21, seed = 1379;
        function rnd () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        var mods = '';
        for (var y = 0; y < N; y++) {
            for (var x = 0; x < N; x++) {
                var inFinder = (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
                var inCenter = x >= 7 && x <= 13 && y >= 7 && y <= 13;
                if (inFinder || inCenter) continue;
                if (rnd() < 0.44) mods += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
            }
        }
        function finder (fx, fy) {
            return '<rect x="' + fx + '" y="' + fy + '" width="7" height="7"/>' +
                '<rect x="' + (fx + 1) + '" y="' + (fy + 1) + '" width="5" height="5" fill="#fff"/>' +
                '<rect x="' + (fx + 2) + '" y="' + (fy + 2) + '" width="3" height="3"/>';
        }
        svg.innerHTML = '<g fill="#1F1D1A">' + mods +
            finder(0, 0) + finder(14, 0) + finder(0, 14) + '</g>';
    }

    /* ═══ Timer OTP ═══ */
    function startTimer (elId, sec) {
        var el = document.getElementById(elId);
        if (!el) return;
        var timer = setInterval(function () {
            if (sec <= 0) { clearInterval(timer); el.textContent = '۰۰:۰۰'; return; }
            sec--;
            var m = Math.floor(sec / 60), s = sec % 60;
            el.textContent = faNum(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'));
        }, 1000);
    }

    /* ═══ Init ═══ */
    function init () {
        paintQR();
        startTimer('otp-timer', 119);
        startTimer('login-otp-timer', 119);

        /* اگر DATA نیست، هشدار بده */
        if (!window.IMACH_DATA) {
            console.warn('IMACH_DATA is missing — some dynamic content may not render.');
        }

        /* صفحهٔ اولیه */
        var hash = location.hash.slice(1);
        if (hash && document.getElementById(hash)) {
            show(hash, false);
        } else {
            show('s-landing', false);
        }

        /* اطمینان تب فعال */
        var activeScreen = document.getElementById(state.current);
        if (activeScreen) {
            var activeTab = activeScreen.querySelector('.tabbar .tab.active');
            if (!activeTab) {
                var firstTab = activeScreen.querySelector('.tabbar .tab');
                if (firstTab) firstTab.classList.add('active');
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();