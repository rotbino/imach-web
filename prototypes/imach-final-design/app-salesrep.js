/* ═════════════════════════════════════════════════════════════════
   iMach — Sales Rep (داشبورد نمایندهٔ فروش) — FD-17
   ─────────────────────────────────────────────────────────────────
   مسئول:
     • رندر داشبورد (۳۸): گروه مشتریان صنف + چهار کاشی + کسب‌وکارهای
       زیر نمایندگی + گزارش واحد سفارش‌ها با فیلتر کسب‌وکار.
     • شیت کسب‌وکار (sheet-repbiz): لینک به میز فروش / کاتالوگ /
       سفارش‌های همان کسب‌وکار (خواستهٔ مالک — داشبورد = آمار و گزارش
       + لینک به امکانات موجود، نه سیستم جدید).
     • شیت سفارش (sheet-reporder): چرخهٔ بازاریاب سنتی — ثبت‌شده ←
       «ارسال لیست سفارش به تأمین‌کننده» (واتس‌اپ/پیامک/کپی — بیرون
       از سیستم، حکم مالک) ← تحویل شد ← پورسانت دریافت شد (تسویه).
     • ورودی‌ها: کارت پروفایل + بنر لندینگ (repBadgeSync).

   پیاده‌سازی واقعی (نکته‌ها):
     • دسترسی‌های لینک‌ها نقش‌محور است: میز فروش/کاتالوگِ «همان
       کسب‌وکار» با نقش کاربر باز می‌شود. در ماک به صفحات نمونهٔ
       همان نوع می‌رویم (میز فروش ب۱ / کاتالوگ ۰۵).
     • پورسانت توافقی per کسب‌وکار است؛ در سیستم فقط ردیابی
       می‌شود — پول بیرون از سیستم جابه‌جا می‌شود.
     • هر کاربر می‌تواند بی‌نهایت کسب‌وکار با نقش‌های مختلف داشته
       باشد (مالک / بازاریاب / ویزیتور / مدیر عامل / نمایندهٔ فروش) —
       داشبورد همین چند-نقشی‌ها را یک‌جا نشان می‌دهد.
   ═════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    var core = window.iMach;
    if (!core) { console.error('app-core.js not loaded'); return; }

    var $ = core.$;
    var $$ = core.$$;
    var faNum = core.faNum;
    var faMoney = core.faMoney;
    var toast = core.toast;

    /* ═══ State ═══ */
    var REP = {
        filter: 'all',      /* فیلتر سفارش‌ها: 'all' | bizId */
        bizId: null,        /* کسب‌وکارِ شیت باز */
        orderId: null       /* سفارشِ شیت باز */
    };

    /* ═══ واژگان وضعیت سفارش نماینده ═══ */
    var STATUS = {
        new:       { label: 'ثبت‌شده',   cls: 'b-amber' },
        sent:      { label: 'ارسال‌شده', cls: 'b-blue'  },
        delivered: { label: 'تحویل‌شده', cls: 'b-green' },
        settled:   { label: 'تسویه‌شده', cls: 'b-gray'  }
    };

    /* ═══ Helpers ═══ */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function money(n) { return faMoney(Math.round(Number(n) || 0)); }
    function businesses() { return core.data.repBusinesses || []; }
    function orders() { return core.data.repOrders || []; }
    function group() { return core.data.repGroup || {}; }
    function bizById(id) {
        var out = null;
        businesses().forEach(function (b) { if (b.id === id) out = b; });
        return out;
    }
    function orderById(id) {
        var out = null;
        orders().forEach(function (o) { if (o.id === id) out = o; });
        return out;
    }
    function orderTotal(o) { return (o.qty || 0) * (o.unitPrice || 0); }
    function orderCommission(o) {
        var b = bizById(o.bizId);
        return b ? Math.round(orderTotal(o) * (b.pct || 0) / 100) : 0;
    }

    /* ═══ رندر داشبورد (۳۸) ═══ */
    function repRender() {
        var biz = businesses();
        var ords = orders();
        var g = group();

        /* هویت: گروه مشتریان صنف */
        var rhName = $('#rh-name');
        if (rhName) rhName.textContent = 'گروه مشتریان من: ' + (g.name || '—');
        var rhSub = $('#rh-sub');
        if (rhSub) rhSub.textContent = faNum(g.count || 0) + ' ' + (g.unit || '') + ' · ' + (g.cadence || '');

        /* زیرعنوان هدر */
        var sub = $('#rep-sub-ttl');
        if (sub) sub.textContent = faNum(biz.length) + ' کسب‌وکار · ' + faNum(g.count || 0) + ' ' + (g.unit || '') + 'ِ صنف';

        /* کاشی‌ها */
        var sales = 0, comm = 0, ordersMonth = 0;
        biz.forEach(function (b) {
            sales += (b.salesMonth || 0);
            comm += Math.round((b.salesMonth || 0) * (b.pct || 0) / 100);
            ordersMonth += (b.ordersMonth || 0);
        });
        var pending = 0;
        ords.forEach(function (o) { if (o.status === 'delivered') pending += orderCommission(o); });

        var el;
        el = $('#rep-t-sales'); if (el) el.textContent = money(sales);
        el = $('#rep-t-comm');  if (el) el.textContent = money(comm);
        el = $('#rep-t-comm-sub'); if (el) el.textContent = money(pending) + ' تومان در انتظار تسویه';
        el = $('#rep-t-biz');   if (el) el.textContent = faNum(biz.length);
        el = $('#rep-t-ord');   if (el) el.textContent = faNum(ordersMonth);

        /* فهرست کسب‌وکارها + چیپ‌ها + سفارش‌ها */
        bizListRender();
        chipsRender();
        ordersRender();
    }

    /* ═══ کارت کسب‌وکار زیر نمایندگی ═══ */
    function bizCardHtml(b) {
        var earn = Math.round((b.salesMonth || 0) * (b.pct || 0) / 100);
        return '<div class="rep-biz" data-rep-biz="' + esc(b.id) + '">' +
            '<div class="rb-head">' +
                '<div class="avatar" style="background:' + (b.color || '#0D9488') + ';">' + esc(b.avatar || (b.name || '؟').charAt(0)) + '</div>' +
                '<div class="rb-tx">' +
                    '<div class="rb-name">' + esc(b.name) + ' <span class="badge b-accent">' + esc(b.role) + '</span></div>' +
                    '<div class="rb-sub">' + esc(b.industry || '') + ' <span class="dot">·</span> ' + esc(b.city || '') + ' <span class="dot">·</span> از ' + esc(b.since || '') + '</div>' +
                '</div>' +
                '<div class="row-chev"><svg><use href="#i-chev"/></svg></div>' +
            '</div>' +
            '<div class="rb-stats">' +
                '<div class="rb-stat"><b>' + faNum(b.products || 0) + '</b><span>محصول</span></div>' +
                '<div class="rb-stat"><b>' + faNum(b.customers || 0) + '</b><span>مشتری</span></div>' +
                '<div class="rb-stat"><b>' + faNum(b.ordersMonth || 0) + '</b><span>سفارش ماه</span></div>' +
            '</div>' +
            '<div class="rb-foot">' +
                '<span class="rb-pct"><svg><use href="#i-percent"/></svg> پورسانت توافقی ' + faNum(b.pct || 0) + '٪</span>' +
                '<b class="rb-earn">پورسانت ماه: ' + money(earn) + ' تومان</b>' +
            '</div>' +
        '</div>';
    }
    function bizListRender() {
        var host = $('#rep-biz-list');
        if (!host) return;
        host.innerHTML = businesses().map(bizCardHtml).join('');
    }

    /* ═══ چیپ‌های فیلتر کسب‌وکار ═══ */
    function chipsRender() {
        var host = $('#rep-chips');
        if (!host) return;
        var html = '<button class="chip' + (REP.filter === 'all' ? ' active' : '') + '" type="button" data-rep-filter="all">همه</button>';
        businesses().forEach(function (b) {
            html += '<button class="chip' + (REP.filter === b.id ? ' active' : '') + '" type="button" data-rep-filter="' + esc(b.id) + '">' + esc(b.name) + '</button>';
        });
        host.innerHTML = html;
    }

    /* ═══ گزارش واحد سفارش‌ها (با فیلتر کسب‌وکار) ═══ */
    function orderRowHtml(o) {
        var b = bizById(o.bizId);
        var st = STATUS[o.status] || STATUS.new;
        var title = esc(o.item) + ' · ' + faNum(o.qty) + ' ' + esc(o.pack || '');
        var sub = esc(b ? b.name : '—') + ' <span class="dot">·</span> ' + esc(o.customer) + ' <span class="dot">·</span> ' + esc(o.when || '');
        return '<div class="row" data-rep-order="' + esc(o.id) + '">' +
            '<div class="thumb thumb-sm"><img src="' + esc(o.img || '') + '" alt=""></div>' +
            '<div class="row-body">' +
                '<div class="row-title">' + title + ' <span class="badge ' + st.cls + '">' + st.label + '</span></div>' +
                '<div class="row-sub">' + sub + '</div>' +
            '</div>' +
            '<div class="row-amt"><b>' + money(orderTotal(o)) + '</b><span>پورسانت ' + money(orderCommission(o)) + '</span></div>' +
        '</div>';
    }
    function ordersRender() {
        var host = $('#rep-ord-list');
        if (!host) return;
        var vis = orders().filter(function (o) {
            return REP.filter === 'all' || o.bizId === REP.filter;
        });
        host.innerHTML = vis.length
            ? vis.map(orderRowHtml).join('')
            : '<div class="empty"><div class="empty-ic"><svg><use href="#i-receipt"/></svg></div>' +
              '<h3>سفارشی در این فیلتر نیست</h3><p>سفارش‌های همین کسب‌وکار، همین‌جا می‌آید.</p></div>';

        var cnt = $('#rep-ord-count');
        if (cnt) cnt.textContent = faNum(vis.length) + ' سفارش';
    }

    /* ═══ شیت کسب‌وکار (sheet-repbiz) ═══ */
    function repBizOpen(id) {
        var b = bizById(id);
        if (!b) return;
        REP.bizId = id;

        var t = $('#rbz-title'); if (t) t.textContent = b.name;
        var s = $('#rbz-sub'); if (s) s.textContent = b.role + ' · ' + b.industry + ' · ' + b.city + ' — از ' + b.since;
        var earn = Math.round((b.salesMonth || 0) * (b.pct || 0) / 100);
        var p = $('#rbz-pct'); if (p) p.textContent = faNum(b.pct) + '٪';
        var e = $('#rbz-earn'); if (e) e.textContent = money(earn) + ' ت';
        var o = $('#rbz-orders'); if (o) o.textContent = faNum(b.ordersMonth || 0);
        var h = $('#rbz-role-hint'); if (h) h.textContent = 'اینجا: ' + b.role + '.';

        core.openSheet('sheet-repbiz');
    }

    /* ═══ شیت سفارش (sheet-reporder) ═══ */
    function roView(which) {
        ['new', 'sent', 'delivered', 'settled'].forEach(function (k) {
            var el = $('#ro-act-' + k);
            if (el) el.hidden = (k !== which);
        });
    }
    function repOrderOpen(id) {
        var o = orderById(id);
        if (!o) return;
        var b = bizById(o.bizId);
        REP.orderId = id;

        var t = $('#ro-title'); if (t) t.textContent = 'سفارش ' + (o.item || '');
        var s = $('#ro-sub'); if (s) s.textContent = (b ? b.name : '—') + ' → ' + o.customer + ' · ' + o.when;
        var img = $('#ro-img'); if (img) img.src = o.img || '';
        var n = $('#ro-item-name'); if (n) n.textContent = o.item || '';
        var p = $('#ro-item-pack'); if (p) p.textContent = (o.pack || '') + ' × ' + faNum(o.qty);
        var tot = $('#ro-total'); if (tot) tot.textContent = money(orderTotal(o)) + ' تومان';
        var c = $('#ro-comm-tx'); if (c) c.textContent = 'پورسانت تو (' + faNum(b ? b.pct : 0) + '٪): ' + money(orderCommission(o)) + ' تومان';
        var st = $('#ro-status');
        if (st) {
            var sd = STATUS[o.status] || STATUS.new;
            st.className = 'badge ' + sd.cls;
            st.textContent = sd.label;
        }

        roView(o.status || 'new');
        core.openSheet('sheet-reporder');
    }

    /* متن لیست سفارش — همان چیزی که بازاریاب سنتی برای
       تأمین‌کننده می‌فرستد (بیرون از سیستم). */
    function orderListText(o) {
        var b = bizById(o.bizId);
        return 'لیست سفارش — ' + (b ? b.name : '') + '\n' +
            'مشتری: ' + o.customer + '\n' +
            o.item + ' ' + (o.pack || '') + ' × ' + faNum(o.qty) +
            ' (' + money(o.unitPrice) + ' تومان ' + (o.pack ? 'هر ' + o.pack : '') + ')\n' +
            'جمع: ' + money(orderTotal(o)) + ' تومان\n' +
            'ثبت‌شده با آی‌مچ';
    }

    /* ارسال لیست سفارش → وضعیت sent + بازتاب در گزارش */
    function orderSend(kind) {
        var o = orderById(REP.orderId);
        if (!o) return;
        var names = { sms: 'پیامک', whatsapp: 'واتس‌اپ', copy: 'کپی' };
        var text = orderListText(o);

        if (kind === 'copy' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function () {});
            toast('لیست سفارش کپی شد — برای تأمین‌کننده بفرست', 'success');
        } else {
            toast('لیست سفارش با ' + (names[kind] || 'پیام‌رسان') + ' برای تأمین‌کننده باز می‌شود', 'success');
        }

        o.status = 'sent';
        ordersRender();
        repOrderOpen(o.id);   /* شیت به نمای «ارسال‌شده» می‌رود */
    }

    /* پیشبردن چرخه: sent → delivered → settled */
    function orderAdvance(status) {
        var o = orderById(REP.orderId);
        if (!o) return;
        o.status = status;
        ordersRender();
        repRender();          /* کاشی «در انتظار تسویه» به‌روز شود */
        repOrderOpen(o.id);
        toast(status === 'delivered'
            ? 'تحویل ثبت شد — پورسانت در انتظار تسویه'
            : 'تسویه شد — پورسانت به درآمد ماهت اضافه شد', 'success');
    }

    /* ═══ بج/شمارندهٔ ورودی‌ها (پروفایل + لندینگ) ═══ */
    function repBadgeSync() {
        $$('[data-rep-badge]').forEach(function (el) {
            el.textContent = faNum(businesses().length) + ' کسب‌وکار';
        });
    }

    /* ═══ حلقهٔ کلیک ═══ */
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;

        /* فیلتر سفارش‌ها با چیپ کسب‌وکار */
        var chip = t.closest('[data-rep-filter]');
        if (chip) {
            REP.filter = chip.dataset.repFilter;
            chipsRender();
            ordersRender();
            return;
        }

        /* کارت کسب‌وکار → شیت لینک‌ها */
        var biz = t.closest('[data-rep-biz]');
        if (biz) { repBizOpen(biz.dataset.repBiz); return; }

        /* لینک‌های شیت کسب‌وکار — در ماک: صفحات نمونهٔ همان نوع؛
           در محصول واقعی: میز/کاتالوگِ همان کسب‌وکار (نقش‌محور). */
        var rbz = t.closest('[data-rbz]');
        if (rbz) {
            var b = bizById(REP.bizId);
            var act = rbz.dataset.rbz;
            core.closeSheet('sheet-repbiz');
            if (act === 'desk') { core.go('s-home-sell'); return; }
            if (act === 'catalog') { core.go('s-catalog'); return; }
            if (act === 'orders' && b) {
                REP.filter = b.id;
                chipsRender();
                ordersRender();
                var sec = $('#rep-ord-count');
                if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
            return;
        }

        /* ردیف سفارش → شیت جزئیات */
        var ord = t.closest('[data-rep-order]');
        if (ord) { repOrderOpen(ord.dataset.repOrder); return; }

        /* ارسال لیست سفارش (واتس‌اپ/پیامک/کپی) */
        var send = t.closest('[data-ro-send]');
        if (send) { orderSend(send.dataset.roSend); return; }

        /* ارسال دوباره */
        if (t.closest('[data-ro-resend]')) { roView('new'); return; }

        /* تحویل / تسویه */
        var adv = t.closest('[data-ro-advance]');
        if (adv) { orderAdvance(adv.dataset.roAdvance); return; }
    });

    /* ═══ Hooks ═══ */
    core.registerShowHook('s-salesrep', repRender);
    core.registerShowHook('s-profile', repBadgeSync);
    core.registerShowHook('s-landing', repBadgeSync);

    /* ═══ Expose ═══ */
    core.salesrep = {
        REP: REP,
        render: repRender,
        bizOpen: repBizOpen,
        orderOpen: repOrderOpen,
        orderSend: orderSend,
        orderAdvance: orderAdvance,
        badgeSync: repBadgeSync
    };
})();
