/* ═════════════════════════════════════════════════════════════════
   iMach — Core
   ناوبری · Sheet · Dialog · Toast · بازوها · helpers
   ═════════════════════════════════════════════════════════════════ */

window.iMach = (function () {
    'use strict';

    var stack = [];
    var current = null;
    var dialogResolve = null;
    var pendingActions = null;
    var ASSIST = { sell: true, buy: true };
    var SCREEN_CACHE = {};
    var SCREEN_PARAMS = {};
    var onShowHooks = {};
    var lastRealArm = 'sell';

    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function faNum(n) { return String(n).replace(/\d/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'[+x]; }); }
    function faMoney(n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '٬').replace(/\d/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'[+x]; });
    }
    function parseNum(s) {
        var t = String(s || '').replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); }).replace(/[٬,\s]/g, '');
        var n = parseInt(t, 10);
        return isNaN(n) ? 0 : n;
    }

    /* ═══ نگاشت شناسه ← فایل ═══ */
    var SCREEN_FILES = {
        's-landing':              '01-landing',
        's-signup':               '02-signup',
        's-login':                '03-login',
        's-home-sell':            '04-home-sell',
        's-catalog':              '05-catalog',
        's-catalog-share':        '06-catalog-share',
        's-contacts':             '07-contacts',
        's-customers':            '08-customers',
        's-customer-view':        '08-customers',
        's-sell-orders':          '09-sell-orders',
        's-sell-order-view':      '10-sell-order-view',
        's-sell-rfqs':            '11-sell-rfqs',
        's-sell-offer':           '12-sell-offer',
        's-sell-add':             '13-sell-add',
        's-sell-edit':            '13-sell-add',
        's-network-score':        '15-network-score',
        's-edit-business':        '16-edit-business',
        's-notifs':               '17-notifs',
        's-profile':              '18-profile',
        's-home-buy':             '19-home-buy',
        's-buy-list':             '20-buy-list',
        's-buy-list-add':         '20-buy-list',
        's-buy-product-suppliers':'20-buy-list',
        's-buy-suppliers':        '22-buy-suppliers',
        's-supplier-view':        '23-buy-supplier-view',
        's-buy-rfqs':             '24-buy-rfqs',
        's-buy-rfq-new':          '25-buy-rfq-new',
        's-buy-offers':           '26-buy-offers',
        's-buy-offer-view':       '27-buy-offer-view',
        's-buy-orders':           '28-buy-orders',
        's-msgs':                 '29-msgs',
        's-chat':                 '30-chat',
        's-catalog-guest':        '31-catalog-guest',
        's-buy-list-guest':       '32-buy-list-guest',
        's-sell-bulk':            '33-sell-bulk',
        's-sell-promo':           '34-sell-promo',
        's-charge':               '35-charge',
        's-cat-edit':             '36-cat-edit',
        's-product-view':         '37-product-view',
        's-salesrep':             '38-salesrep',
        's-buy-order-view':       '39-buy-order-view'
    };

    /* ═══ لود اسکرین ═══ */
    function loadScreen(id) {
        var filename = SCREEN_FILES[id] || id;
        if (SCREEN_CACHE[filename]) return Promise.resolve(SCREEN_CACHE[filename]);
        if (window.SCREENS && window.SCREENS[id]) {
            SCREEN_CACHE[filename] = window.SCREENS[id];
            return Promise.resolve(SCREEN_CACHE[filename]);
        }
        return fetch('screens/' + filename + '.html')
            .then(function (r) {
                if (!r.ok) throw new Error('فایل پیدا نشد: screens/' + filename + '.html');
                return r.text();
            })
            .then(function (html) {
                SCREEN_CACHE[filename] = html;
                return html;
            })
            .catch(function (err) { showLoadError(id, filename, err); throw err; });
    }

    function showLoadError(id, filename, err) {
        var host = $('#screen-host');
        if (!host) return;
        var isFile = location.protocol === 'file:';
        var hint = isFile
            ? '<b>فایل را مستقیم باز کرده‌اید (file://).</b><br>سرور محلی راه بیندازید: <code style="direction:ltr;display:inline-block">npx serve . -p 8000</code>'
            : '<b>فایل «screens/' + filename + '.html» پیدا نشد.</b>';
        host.innerHTML =
            '<div class="body" style="padding:16px">' +
            '<div class="callout callout-warn" style="display:block;line-height:2">' + hint + '</div>' +
            '<details style="margin-top:12px;font-size:11px;color:var(--text-3)">' +
            '<summary style="cursor:pointer;font-weight:700">جزئیات فنی</summary>' +
            '<pre style="direction:ltr;text-align:left;margin-top:8px;background:var(--surface-2);padding:10px;border-radius:8px;overflow:auto;font-size:10px">' +
            (err && err.message ? err.message : String(err)) + '</pre></details></div>';
    }

    /* ═══ نمایش صفحه ═══ */
    function show(id, push, params) {
        return loadScreen(id).then(function (html) {
            var host = $('#screen-host');
            host.innerHTML = html;

            var section = host.querySelector('#' + id);
            if (!section) {
                var all = host.querySelectorAll('.screen');
                if (all.length === 1) section = all[0];
            }
            if (!section || !section.classList.contains('screen')) {
                console.warn('no .screen#' + id + ' in file');
                return;
            }

            host.querySelectorAll('.screen').forEach(function (s) { s.hidden = true; });
            section.hidden = false;

            var tArm = section.dataset.arm || 'keep';
            if (tArm === 'sell' && !ASSIST.sell) { return show('s-home-buy', push); }
            if (tArm === 'buy'  && !ASSIST.buy)  { return show('s-home-sell', push); }

            if (tArm === 'sell' || tArm === 'buy') lastRealArm = tArm;

            if (params) SCREEN_PARAMS[id] = params;
            $('#phone').dataset.arm = tArm;

            var body = section.querySelector('.body');
            if (body) body.scrollTop = 0;

            if (id === 's-contacts' && params && params.mode === 'pick') {
                section.classList.add('pick-mode');
            }
            if (params && params.preview) {
                injectPreviewBar(section, id);
            }

            if (push !== false && current && current !== id) stack.push(current);
            current = id;
            try { history.replaceState(null, '', '#' + id); } catch (e) {}

            var hooks = onShowHooks[id];
            if (hooks) setTimeout(function () {
                (Array.isArray(hooks) ? hooks : [hooks]).forEach(function (fn) { fn(); });
            }, 0);

            closeAllSheets();
            applyArms();

            /* FD-27 — دسکتاپ: پرچم/تبدیل صفحه‌های رسپانسیوِ این مرحله
               (app-desktop.js؛ مستقیم اینجا، نه monkey-patch — همهٔ
               ماژول‌ها از همین show عبور می‌کنند). */
            if (window.iMachDesktop) window.iMachDesktop.apply(id);
        });
    }

    function go(id, params) { return show(id, true, params); }
    function back() {
        var prev = stack.pop();
        if (!prev || prev === current) prev = ASSIST.sell ? 's-home-sell' : 's-home-buy';
        return show(prev, false);
    }
    function goHome(id) { stack.length = 0; return show(id, false); }

    /* ═══ Sheet — باز/بسته کردن ایمن ═══ */
    function openSheet(id) {
        closeAllSheets();
        var sheet = document.getElementById(id);
        if (!sheet) return;
        var bd = $('#dialog-backdrop');
        if (bd) bd.classList.add('show');
        sheet.hidden = false;
        void sheet.offsetHeight; /* force reflow برای انیمیشن */
        sheet.classList.add('show');
    }

    function closeSheet(id) {
        if (id) {
            var sheet = document.getElementById(id);
            if (sheet) {
                sheet.classList.remove('show');
                setTimeout(function () { sheet.hidden = true; }, 300);
            }
        } else {
            closeAllSheets();
        }
        /* اگر هیچ شیت/دیالوگی باز نیست، backdrop را بردار — با تأخیر کوچک */
        setTimeout(function () {
            var anySheet = $$('.sheet.show').length > 0;
            var anyDialog = $$('.dialog.show').length > 0;
            if (!anySheet && !anyDialog) {
                var bd = $('#dialog-backdrop');
                if (bd) bd.classList.remove('show');
            }
        }, 320);
    }

    function closeAllSheets() {
        $$('.sheet').forEach(function (s) {
            s.classList.remove('show');
            s.hidden = true;
        });
        /* اگر دیالوگ باز نیست، backdrop را فوراً بردار */
        var anyDialog = $$('.dialog.show').length > 0;
        if (!anyDialog) {
            var bd = $('#dialog-backdrop');
            if (bd) bd.classList.remove('show');
        }
    }

    /* ═══ نوار دید عمومی — با دکمهٔ بازگشت ═══
       FD-10 (بازخورد مالک): نام مفهوم از «پیش‌نمایش» به «دید عمومی» تغییر
       کرد؛ لیست خرید (۳۲) چون نمای خاص تأمین‌کننده‌هاست، همان
       «پیش‌نمایش» می‌ماند. */
    function injectPreviewBar(section, id) {
        var body = section.querySelector('.body');
        if (!body) return;
        var bar = document.createElement('div');
        bar.className = 'preview-bar';
        var label = (id === 's-buy-list-guest')
            ? 'پیش‌نمایش — تأمین‌کننده‌ها این‌طور می‌بینند'
            : 'دید عمومی کاتالوگ — این‌طور مشتریانت می‌بینند';
        bar.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-eye"/></svg>' +
            '<span>' + label + '</span>' +
            '<button class="preview-back" type="button" data-preview-back>' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-back"/></svg>' +
            ' بازگشت به پنل' +
            '</button>';
        body.parentNode.insertBefore(bar, body);
    }

    /* ═══ بازوها ═══ */
    function applyArms() {
        $$('.tab[data-tab-arm]').forEach(function (tab) {
            var arm = tab.dataset.tabArm;
            tab.hidden = (arm === 'sell' && !ASSIST.sell) || (arm === 'buy' && !ASSIST.buy);
        });
        $$('.switch[data-arm-switch]').forEach(function (sw) {
            sw.classList.toggle('on', !!ASSIST[sw.dataset.armSwitch]);
        });
    }

    /* ═══ Toast ═══ */
    function toast(msg, type) {
        var host = $('#toast-host');
        if (!host) return;
        var el = document.createElement('div');
        el.className = 'toast' + (type ? ' ' + type : '');
        el.textContent = msg;
        host.appendChild(el);
        setTimeout(function () {
            el.style.transition = 'opacity .25s';
            el.style.opacity = '0';
            setTimeout(function () { el.remove(); }, 260);
        }, 2200);
    }

    /* ═══ Dialog ═══ */
    function confirmDialog(opts) {
        opts = opts || {};
        var dlg = $('#dialog'), bd = $('#dialog-backdrop');
        if (!dlg || !bd) return Promise.resolve(true);
        dlg.innerHTML =
            '<h3>' + (opts.title || '') + '</h3>' +
            (opts.text ? '<p>' + opts.text + '</p>' : '') +
            '<div class="actions">' +
            '<button class="btn btn-outline" data-dlg="0">' + (opts.cancel || 'انصراف') + '</button>' +
            '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-dlg="1">' + (opts.ok || 'تأیید') + '</button>' +
            '</div>';
        bd.classList.add('show');
        dlg.classList.add('show');
        dlg.setAttribute('aria-hidden', 'false');
        return new Promise(function (resolve) { dialogResolve = resolve; });
    }

    function actionsDialog(title, actions) {
        var dlg = $('#dialog'), bd = $('#dialog-backdrop');
        if (!dlg || !bd) return;
        var html = '<h3>' + (title || '') + '</h3>';
        html += '<div class="actions" style="flex-direction:column;gap:8px;margin-top:14px">';
        actions.forEach(function (a, i) {
            var style = a.danger ? 'color:var(--red);border-color:#F3C1C1' : '';
            html += '<button class="btn btn-outline" style="width:100%;' + style + '" data-act="' + i + '">' + a.label + '</button>';
        });
        html += '</div>';
        html += '<div class="actions" style="margin-top:8px"><button class="btn btn-ghost btn-block" data-dlg="0">انصراف</button></div>';
        dlg.innerHTML = html;
        bd.classList.add('show');
        dlg.classList.add('show');
        dlg.setAttribute('aria-hidden', 'false');
        pendingActions = actions;
    }

    function closeDialog(value) {
        var dlg = $('#dialog'), bd = $('#dialog-backdrop');
        if (dlg) { dlg.classList.remove('show'); dlg.setAttribute('aria-hidden', 'true'); }
        /* اگر شیتی باز نیست، backdrop را بردار */
        var anySheet = $$('.sheet.show').length > 0;
        if (!anySheet && bd) bd.classList.remove('show');
        pendingActions = null;
        if (dialogResolve) { dialogResolve(value); dialogResolve = null; }
    }

    /* ═══ هوک‌ها ═══ */
    function registerShowHook(id, fn) {
        /* چند هوک برای هر صفحه مجاز است — ترتیب ثبت = ترتیب اجرا */
        if (!onShowHooks[id]) onShowHooks[id] = [];
        if (!Array.isArray(onShowHooks[id])) onShowHooks[id] = [onShowHooks[id]];
        onShowHooks[id].push(fn);
    }
    function getSCREENParams() { return SCREEN_PARAMS; }
    function setSCREENParams(id, params) { SCREEN_PARAMS[id] = params; }
    function resetStack() { stack.length = 0; }
    function getStack() { return stack; }
    function getPendingActions() { return pendingActions; }
    function getCurrentScreen() { return current; }
    function getLastRealArm() { return lastRealArm; }

    applyArms();

    return {
        show: show, go: go, back: back, goHome: goHome,
        getCurrentScreen: getCurrentScreen,
        openSheet: openSheet, closeSheet: closeSheet, closeAllSheets: closeAllSheets,
        confirm: confirmDialog, actions: actionsDialog, closeDialog: closeDialog,
        toast: toast,
        assist: ASSIST, applyArms: applyArms,
        registerShowHook: registerShowHook,
        faNum: faNum, faMoney: faMoney, parseNum: parseNum,
        $: $, $$: $$,
        getSCREENParams: getSCREENParams, setSCREENParams: setSCREENParams,
        resetStack: resetStack, getStack: getStack,
        getPendingActions: getPendingActions,
        getLastRealArm: getLastRealArm,
        forms: {},
        data: (typeof DATA !== 'undefined' ? DATA : null)
    };
})();