/* ═════════════════════════════════════════════════════════════════
   iMach — Customers (دفتر مشتری)
   ─────────────────────────────────────────────────────────────────
   مسئول:
     • مشتری = کسی که کاتالوگ را ذخیره کرده — فرم ثبت دستی نیست
     • رندر دیتامحور لیست مشتریان (گروه، صنف، شهر)
       — مشتریان جدید (isNew) با برچسب «جدید» بالاتر از همه
       — روی کارتِ مشتریِ جدید: دکمه‌های «تایید / حذف»
         (تا تکلیف روشن نشود، بالای دفتر می‌ماند)
     • لمس کارت مشتری → صفحهٔ جزئیات مشتری (s-customer-view):
       شناسنامه + یادداشت + سفارش/درخواست‌های او + لیست خرید او
     • منوی سه‌نقطهٔ مشتری = شیت از پایین (قانون همیشگی موبایل):
       گفتگو · لیست خرید او · سفارش‌های او · درخواست‌های او ·
       گروه مشتری · حذف
     • فیلتر «فقط همین مشتری» روی دفتر سفارش/درخواست فروشنده
     • دعوت مشتری جدید = شیت اشتراک‌گذاری (مخاطبین بالا)
     • مدیریت گروه‌ها داخل شیت فیلتر گروه
   ═════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    var core = window.iMach;
    if (!core) { console.error('app-core.js not loaded'); return; }

    var $ = core.$;
    var $$ = core.$$;
    var faNum = core.faNum;
    var toast = core.toast;

    /* ═══ State ═══ */
    var CUST = {
        q: '',
        industry: null,     /* null = همه */
        group: null,        /* null = همه · '' = بدون گروه · 'cgX' = گروه مشخص */
        city: null,         /* null = همه · 'رشت' = شهر مشخص */
        pickId: null,       /* id مشتریِ در حال تغییر گروه */
        viewId: null,       /* id مشتریِ صفحهٔ جزئیات */
        menuId: null        /* id مشتریِ منوی سه‌نقطه */
    };
    var CGROUP = { editing: null, returnTo: 'manage' };
    var FBCITY = { q: '' };        /* جستجوی داخل شیت فیلتر شهر */
    var CUSTVIEW = { orders: null, rfqs: null };  /* فیلتر یک‌بارمصرف دفتر سفارش/درخواست */

    /* ═══ Helpers ═══ */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function groups() { return core.data.customerGroups; }
    function groupById(id) {
        var found = null;
        groups().forEach(function (g) { if (g.id === id) found = g; });
        return found;
    }
    function customers() {
        var bid = core.data.user.activeBusinessId || 'b1';
        return core.data.customers.filter(function (c) { return c.businessId === bid; });
    }
    function customerById(id) {
        var found = null;
        core.data.customers.forEach(function (c) { if (c.id === id) found = c; });
        return found;
    }
    function customersInGroup(gid) {
        return customers().filter(function (c) { return (c.groupId || '') === gid; });
    }
    function groupName(id) {
        var g = groupById(id);
        return g ? g.name : 'بدون گروه';
    }

    /* ═══ رندر لیست ═══ */
    function badgesHtml(c) {
        var g = groupById(c.groupId);
        if (g && g.discount > 0) {
            return '<span class="badge b-primary"><svg><use href="#i-tag"/></svg>' + esc(g.name) + ' · ٪' + faNum(g.discount) + '</span>';
        }
        if (g) {
            return '<span class="badge b-gray"><svg><use href="#i-tag"/></svg>' + esc(g.name) + '</span>';
        }
        return '<span class="badge b-gray">بدون گروه</span>';
    }

    function rowHtml(c) {
        var isNew = !!c.isNew;
        var row = '<div class="row static" data-go="s-customer-view" data-cu-id="' + esc(c.id) + '">' +
            '<div class="avatar" style="background:' + (c.color || '#7c3aed') + '">' + esc(c.avatar || (c.name || '؟').charAt(0)) + '</div>' +
            '<div class="row-body">' +
                '<div class="row-title">' + esc(c.name) + (isNew ? ' <span class="badge b-primary">جدید</span>' : '') + '</div>' +
                '<div class="row-sub">' + esc(c.person || '—') + ' <span class="dot">·</span> ' + esc(c.city || '—') + ' <span class="dot">·</span> ' + esc(c.industry || 'بدون صنف') + '</div>' +
                '<div class="cust-badges">' + badgesHtml(c) + '</div>' +
            '</div>' +
            '<button class="icon-btn plain" data-cust-menu="' + esc(c.name) + '" data-cu-id="' + esc(c.id) + '" aria-label="گزینه‌ها">' +
                '<svg><use href="#i-dots"/></svg></button>' +
        '</div>';
        if (!isNew) return row;
        /* مشتری جدید — کارت با دکمه‌های تایید/حذف (مثل درخواست‌های اینستاگرام) */
        return '<div class="cust-req">' + row +
            '<div class="cust-req-act">' +
                '<button class="btn btn-primary btn-sm" type="button" data-cust-accept="' + esc(c.id) + '">' +
                    '<svg><use href="#i-check"/></svg> تایید</button>' +
                '<button class="btn btn-outline btn-sm" type="button" data-cust-reject="' + esc(c.id) + '" style="color: var(--red); border-color: #F3C1C1;">' +
                    '<svg><use href="#i-x"/></svg> حذف</button>' +
            '</div>' +
        '</div>';
    }

    function visibleCustomers() {
        /* جدیدترین‌ها (isNew) همیشه بالاتر از همه — تا تایید یا حذف شوند */
        var arr = customers().slice().sort(function (a, b) {
            return ((b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        });
        return arr.filter(function (c) {
            if (CUST.q) {
                var hay = (c.name || '') + ' ' + (c.person || '') + ' ' + (c.city || '') + ' ' + (c.industry || '');
                if (hay.indexOf(CUST.q.trim()) === -1) return false;
            }
            if (CUST.industry && (c.industry || '') !== CUST.industry) return false;
            if (CUST.group !== null && (c.groupId || '') !== CUST.group) return false;
            if (CUST.city && (c.city || '') !== CUST.city) return false;
            return true;
        });
    }

    function customersRender() {
        var list = $('#cust-list');
        if (!list) return;
        var vis = visibleCustomers();
        var all = customers().length;
        list.innerHTML = vis.map(rowHtml).join('');

        var empty = $('#cust-empty');
        if (empty) empty.hidden = vis.length > 0;

        var cnt = $('#cust-count');
        if (cnt) cnt.textContent = (vis.length === all)
            ? faNum(all) + ' مشتری'
            : faNum(vis.length) + ' از ' + faNum(all) + ' مشتری';

        cgSummarySync();
        fbSyncButtons();
    }

    function cgSummarySync() {
        var el = $('#cg-summary');
        if (!el) return;
        var gs = groups();
        if (!gs.length) { el.textContent = 'هنوز گروهی نساخته‌ای'; return; }
        var parts = gs.map(function (g) {
            return esc(g.name) + ' ٪' + faNum(g.discount);
        });
        el.textContent = faNum(gs.length) + ' گروه — ' + parts.join(' · ');
    }

    function customersOnShow() {
        customersRender();
    }

    /* ═══ نوار فیلتر ═══ */
    function fbSyncButtons() {
        var bi = $('.fb-btn[data-fb="industry"]');
        if (bi) {
            var si = bi.querySelector('span');
            si.textContent = CUST.industry || 'صنف';
            bi.classList.toggle('active', !!CUST.industry);
        }
        var bg = $('.fb-btn[data-fb="group"]');
        if (bg) {
            var sg = bg.querySelector('span');
            sg.textContent = (CUST.group === null) ? 'گروه مشتری' : groupName(CUST.group);
            bg.classList.toggle('active', CUST.group !== null);
        }
        var bc = $('.fb-btn[data-fb="city"]');
        if (bc) {
            var sc = bc.querySelector('span');
            sc.textContent = CUST.city || 'شهر';
            bc.classList.toggle('active', !!CUST.city);
        }
    }

    function fbOptionRow(kind, val, label, sub, active) {
        return '<button class="pick-row" data-fbset="' + kind + '" data-val="' + esc(val) + '" type="button">' +
            '<div class="thumb" style="background:var(--surface-2);display:grid;place-items:center;color:var(--text-3)">' +
                '<svg style="width:17px;height:17px"><use href="#i-' + (active ? 'check' : 'chev') + '"/></svg>' +
            '</div>' +
            '<div class="info"><div class="nm">' + label + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' +
        '</button>';
    }

    function fbRender(kind) {
        var host = null, html = '';
        var all = customers();

        if (kind === 'industry') {
            host = $('#fb-industry-list');
            var seen = {}, inds = [];
            all.forEach(function (c) {
                var i = c.industry || 'بدون صنف';
                if (!seen[i]) { seen[i] = 0; inds.push(i); }
                seen[i]++;
            });
            html += fbOptionRow('industry', '', 'همهٔ صنف‌ها', faNum(all.length) + ' مشتری', !CUST.industry);
            inds.forEach(function (i) {
                html += fbOptionRow('industry', i, esc(i), faNum(seen[i]) + ' مشتری', CUST.industry === i);
            });

        } else if (kind === 'group') {
            host = $('#fb-group-list');
            html += fbOptionRow('group', '', 'همهٔ گروه‌ها', faNum(all.length) + ' مشتری', CUST.group === null);
            groups().forEach(function (g) {
                var n = customersInGroup(g.id).length;
                html += fbOptionRow('group', g.id, esc(g.name) + ' · ٪' + faNum(g.discount), faNum(n) + ' مشتری', CUST.group === g.id);
            });
            var noG = all.filter(function (c) { return !c.groupId; }).length;
            if (noG) html += fbOptionRow('group', '__none__', 'بدون گروه', faNum(noG) + ' مشتری', CUST.group === '__none__');

        } else if (kind === 'city') {
            host = $('#fb-city-list');
            var seenC = {}, cities = [];
            all.forEach(function (c) {
                var ci = c.city || '';
                if (!ci) return;
                if (!seenC[ci]) { seenC[ci] = 0; cities.push(ci); }
                seenC[ci]++;
            });
            cities.sort(function (a, b) { return a.localeCompare(b, 'fa'); });
            var q = FBCITY.q.trim();
            var shown = q
                ? cities.filter(function (ci) { return ci.indexOf(q) !== -1; })
                : cities;
            html += fbOptionRow('city', '', 'همهٔ شهرها', faNum(all.length) + ' مشتری', !CUST.city);
            if (q && !shown.length) {
                html += '<div class="empty" style="padding:14px 12px;margin-bottom:4px">' +
                    '<p style="margin:0;font-size:12px;color:var(--text-3)">شهری از مشتریانت با «' + esc(q) + '» پیدا نشد.</p></div>';
            }
            shown.forEach(function (ci) {
                html += fbOptionRow('city', ci, esc(ci), faNum(seenC[ci]) + ' مشتری', CUST.city === ci);
            });
        }
        if (host) host.innerHTML = html;
    }

    function fbSet(kind, val) {
        if (kind === 'industry') CUST.industry = val || null;
        if (kind === 'group') CUST.group = (val === '' || val === undefined) ? null : (val === '__none__' ? '' : val);
        if (kind === 'city') CUST.city = val || null;
        core.closeSheet('sheet-fb-' + kind);
        customersRender();
    }

    function fbClearAll() {
        CUST.industry = null; CUST.group = null; CUST.city = null;
        customersRender();
        toast('فیلترها پاک شد', 'success');
    }

    /* ═══ دعوت مشتری — شیت اشتراک کاتالوگ ═══ */
    function shareOpen() {
        core.openSheet('sheet-share-cat');
    }

    /* ═══ تایید / حذف مشتری جدید ═══ */
    function custAccept(id) {
        var c = customerById(id);
        if (!c) return;
        c.isNew = false;
        customersRender();
        cvSyncIfVisible();
        toast('«' + c.name + '» تایید شد — از مشتریان دفترت است', 'success');
    }

    function custReject(id) {
        var c = customerById(id);
        if (!c) return;
        core.confirm({
            title: 'حذف از مشتریان',
            text: '«' + c.name + '» از دفتر مشتریانت حذف می‌شود. دیگر قیمت‌های تو را نمی‌بیند.',
            ok: 'حذف مشتری', cancel: 'انصراف', danger: true
        }).then(function (ok) {
            if (!ok) return;
            core.data.customers = core.data.customers.filter(function (x) { return x.id !== id; });
            customersRender();
            toast('مشتری از دفتر حذف شد', 'success');
            /* اگر همین مشتری در صفحهٔ جزئیات باز است، به دفتر برگرد */
            if (core.getCurrentScreen() === 's-customer-view' && CUST.viewId === id) {
                core.back();
            }
        });
    }

    /* ═══ صفحهٔ جزئیات مشتری (s-customer-view) ═══ */
    function cvRow(ic, val, label, action) {
        var attr = '';
        if (action === 'dial') attr = ' data-dial style="cursor:pointer"';
        if (action === 'group') attr = ' data-cv-group style="cursor:pointer"';
        var chev = action
            ? '<svg style="width:15px;height:15px;color:var(--text-4);flex-shrink:0;margin-inline-start:auto"><use href="#i-chev"/></svg>'
            : '';
        return '<div class="gd-row"' + attr + '>' +
            '<div class="gd-ic"><svg><use href="#i-' + ic + '"/></svg></div>' +
            '<div class="gd-tx"><b>' + val + '</b><span>' + label + '</span></div>' +
            chev +
        '</div>';
    }

    function cvActRow(o, kind) {
        var badge = '';
        if (kind === 'order') {
            badge = (o.status === 'accepted')
                ? '<span class="badge b-green">پذیرفته</span>'
                : '<span class="badge b-primary">در انتظار پاسخ</span>';
        }
        var left = '';
        if (kind === 'rfq' && o.left) {
            var col = o.leftHot ? 'var(--red)' : 'var(--amber)';
            left = ' <span class="dot">·</span> <span style="color:' + col + ';font-weight:700">' + esc(o.left) + '</span>';
        }
        var kindTx = (kind === 'rfq') ? 'درخواست قیمت' : 'سفارش';
        return '<div class="row" data-go="' + esc(o.go || 's-sell-order-view') + '">' +
            '<div class="thumb thumb-sm"><img src="' + esc(o.img) + '" alt=""></div>' +
            '<div class="row-body">' +
                '<div class="row-title">' + esc(o.title) + ' ' + badge + '</div>' +
                '<div class="row-sub">' + kindTx + ' <span class="dot">·</span> ' + esc(o.date || '') + left + '</div>' +
            '</div>' +
            '<div class="row-chev"><svg><use href="#i-chev"/></svg></div>' +
        '</div>';
    }

    function cvRender() {
        var sec = $('#s-customer-view');
        if (!sec) return;

        var c = customerById(CUST.viewId);
        if (!c) {
            var all = customers();
            c = all[0] || null;
            if (c) CUST.viewId = c.id;
        }
        if (!c) { core.back(); return; }

        /* هدر */
        var av = $('#cv-avatar');
        if (av) {
            av.textContent = c.avatar || (c.name || '؟').charAt(0);
            av.style.background = c.color || '#7c3aed';
        }
        var nm = $('#cv-name'); if (nm) nm.textContent = c.name;
        var sub = $('#cv-sub');
        if (sub) sub.textContent = [c.person, c.city].filter(Boolean).join(' · ');

        /* در انتظار تایید — فقط مشتری جدید */
        var pend = $('#cv-pending');
        if (pend) {
            if (c.isNew) {
                pend.hidden = false;
                pend.innerHTML =
                    '<div class="cv-pending">' +
                        '<div class="cv-pending-tx">' +
                            '<svg><use href="#i-user-plus"/></svg>' +
                            '<div><b>در انتظار تایید تو</b><span>کاتالوگ تو را ذخیره کرده</span></div>' +
                        '</div>' +
                        '<div class="cv-pending-act">' +
                            '<button class="btn btn-primary" type="button" data-cust-accept="' + esc(c.id) + '">' +
                                '<svg><use href="#i-check"/></svg> تایید مشتری</button>' +
                            '<button class="btn btn-outline" type="button" data-cust-reject="' + esc(c.id) + '" style="color: var(--red); border-color: #F3C1C1;">' +
                                '<svg><use href="#i-x"/></svg> حذف</button>' +
                        '</div>' +
                    '</div>';
            } else {
                pend.hidden = true;
                pend.innerHTML = '';
            }
        }

        /* شناسنامه */
        var idn = $('#cv-identity');
        if (idn) {
            var g = groupById(c.groupId);
            var gTx = g ? (esc(g.name) + ' · ٪' + faNum(g.discount) + ' تخفیف') : 'بدون گروه';
            idn.innerHTML =
                cvRow('user', esc(c.person || '—'), 'نام مشتری', null) +
                cvRow('store', esc(c.industry || 'بدون صنف'), 'صنف', null) +
                cvRow('pin', esc(c.city || '—'), 'شهر', null) +
                cvRow('phone', '<span dir="ltr">' + esc(c.phone || '—') + '</span>', 'تلفن — لمس کن تا بگیری', 'dial') +
                cvRow('tag', gTx, 'گروه مشتری — لمس کن تا عوض شود', 'group') +
                cvRow('clock', esc(c.since || '—'), 'مشتری از', null);
        }

        /* یادداشت */
        var note = $('#cv-note');
        if (note) note.value = c.note || '';

        /* سفارش‌ها و درخواست‌های او */
        var act = $('#cv-activity');
        if (act) {
            var ords = (core.data.customerOrders || []).filter(function (o) { return o.customerId === c.id; });
            var rfqs = (core.data.customerRfqs || []).filter(function (r) { return r.customerId === c.id; });
            var html = '';
            ords.forEach(function (o) { html += cvActRow(o, 'order'); });
            rfqs.forEach(function (r) { html += cvActRow(r, 'rfq'); });
            if (!html) {
                html = '<div class="empty" style="padding: 16px 12px;">' +
                    '<h3 style="margin-bottom:4px">هنوز سفارش یا درخواستی ندارد</h3>' +
                    '<p style="margin:0">وقتی این مشتری از تو سفارش یا استعلام قیمت بدهد، همین‌جا می‌آید.</p></div>';
            }
            act.innerHTML = html;
        }
    }

    function cvSyncIfVisible() {
        if (core.getCurrentScreen() === 's-customer-view') cvRender();
    }

    function cvNoteSave() {
        var c = customerById(CUST.viewId);
        var note = $('#cv-note');
        if (!c || !note) return;
        c.note = note.value.trim();
        toast('یادداشت ذخیره شد', 'success');
    }

    /* ═══ گروه‌ها — مدیریت ═══ */
    function cgListRender() {
        var host = $('#cg-list');
        if (!host) return;
        var gs = groups();
        if (!gs.length) {
            host.innerHTML = '<div class="empty" style="padding:16px 12px;margin-bottom:6px">' +
                '<h3 style="margin-bottom:4px">هنوز گروهی نداری</h3>' +
                '<p style="margin-bottom:0">گروه بساز تا تخفیف مخصوص هر گروه مشتری‌ات را داشته باشی — مثل «همکار».</p></div>';
            return;
        }
        host.innerHTML = gs.map(function (g) {
            var n = customersInGroup(g.id).length;
            return '<div class="gd-row">' +
                '<div class="gd-ic"><svg><use href="#i-users"/></svg></div>' +
                '<div class="gd-tx">' +
                    '<b>' + esc(g.name) + '</b>' +
                    '<span>٪' + faNum(g.discount) + ' تخفیف · ' + faNum(n) + ' مشتری</span>' +
                '</div>' +
                '<button class="icon-btn plain" data-cg-edit="' + g.id + '" aria-label="ویرایش گروه">' +
                    '<svg><use href="#i-pencil"/></svg></button>' +
            '</div>';
        }).join('');
    }

    function cgeOpen(id, returnTo) {
        CGROUP.editing = id || null;
        CGROUP.returnTo = returnTo || 'manage';
        var g = id ? groupById(id) : null;

        var ttl = $('#cge-ttl');
        if (ttl) ttl.textContent = g ? 'ویرایش گروه' : 'گروه جدید';
        var nm = $('#cge-name');
        if (nm) nm.value = g ? g.name : '';
        var disc = $('#cge-disc');
        if (disc) disc.value = faNum(g ? g.discount : 5);
        var del = $('#cge-del');
        if (del) del.hidden = !g;

        var parent = (CGROUP.returnTo === 'pick') ? 'sheet-pick-cgroup' : 'sheet-cust-groups';
        core.closeSheet(parent);
        setTimeout(function () { core.openSheet('sheet-cgroup-edit'); }, 320);
    }

    function cgeSave() {
        var nm = $('#cge-name');
        var name = nm ? nm.value.trim() : '';
        if (!name) { toast('نام گروه را وارد کن', 'error'); return; }
        var disc = Math.max(0, Math.min(50, core.parseNum(($('#cge-disc') || {}).value)));

        var g;
        if (CGROUP.editing) {
            g = groupById(CGROUP.editing);
            if (!g) { core.closeSheet('sheet-cgroup-edit'); return; }
            g.name = name; g.discount = disc;
        } else {
            g = { id: 'cg_' + Date.now(), name: name, discount: disc };
            groups().push(g);
        }
        core.closeSheet('sheet-cgroup-edit');

        if (CGROUP.returnTo === 'pick') {
            setTimeout(function () { pcgListRender(); core.openSheet('sheet-pick-cgroup'); }, 320);
            toast('گروه ساخته شد — برای این مشتری انتخابش کن', 'success');
        } else {
            setTimeout(function () { cgListRender(); core.openSheet('sheet-cust-groups'); }, 320);
            toast('گروه ذخیره شد', 'success');
        }
        customersRender();
        cvSyncIfVisible();
    }

    function cgeDelete() {
        if (!CGROUP.editing) return;
        var g = groupById(CGROUP.editing);
        if (!g) return;
        var n = customersInGroup(g.id).length;
        core.closeSheet('sheet-cgroup-edit');
        core.confirm({
            title: 'حذف گروه',
            text: 'گروه «' + g.name + '» حذف می‌شود' + (n ? (' و ' + faNum(n) + ' مشتری آن به «بدون گروه» می‌روند') : '') + '. تخفیف این گروه از کاتالوگ برداشته می‌شود.',
            ok: 'حذف گروه', cancel: 'انصراف', danger: true
        }).then(function (ok) {
            if (!ok) return;
            core.data.customerGroups = groups().filter(function (x) { return x.id !== g.id; });
            customers().forEach(function (c) { if (c.groupId === g.id) c.groupId = ''; });
            if (CUST.group === g.id) CUST.group = null;
            customersRender();
            cvSyncIfVisible();
            toast('گروه حذف شد', 'success');
        });
    }

    /* ═══ انتخاب گروه — تغییر گروه یک مشتری ═══ */
    function pcgListRender() {
        var host = $('#pcg-list');
        var sub = $('#pcg-sub');
        var c = customerById(CUST.pickId);
        var cur = c ? (c.groupId || '') : '';

        if (sub) {
            sub.textContent = c
                ? 'گروهِ «' + c.name + '» — تخفیف همین گروه برای خریدهای این مشتری اعمال می‌شود.'
                : 'تخفیف همین گروه برای این مشتری اعمال می‌شود.';
        }
        if (!host) return;

        var html = fbOptionRow('', '', 'بدون گروه', 'بدون تخفیف گروهی', cur === '');
        html = html.replace('data-fbset="" data-val=""', 'data-pick-cgroup=""');
        groups().forEach(function (g) {
            var row = fbOptionRow('', g.id, esc(g.name) + ' · ٪' + faNum(g.discount), '', cur === g.id);
            row = row.replace('data-fbset="" data-val="' + g.id + '"', 'data-pick-cgroup="' + g.id + '"');
            html += row;
        });
        host.innerHTML = html;
    }

    function pcgPick(gid) {
        var c = customerById(CUST.pickId);
        if (c) {
            c.groupId = gid || '';
            toast('گروه «' + groupName(gid) + '» برای «' + c.name + '» ثبت شد', 'success');
        }
        core.closeSheet('sheet-pick-cgroup');
        customersRender();
        cvSyncIfVisible();
    }

    /* ═══ منوی گزینه‌های مشتری — شیت از پایین ═══ */
    function custMenu(name, btn, row) {
        var id = (btn && btn.dataset.cuId) || (row && row.dataset.cuId) || null;
        CUST.menuId = id;
        var c = customerById(id);
        var g = c ? groupById(c.groupId) : null;

        var ttl = $('#ccm-ttl');
        if (ttl) ttl.textContent = 'گزینه‌های ' + (name || (c ? c.name : 'مشتری'));
        var host = $('#ccm-list');
        if (!host) return;

        var items = [
            { ic: 'msg',     t: 'گفتگو',                s: 'پیام در آی‌مچ',                                  act: 'chat' },
            { ic: 'basket',  t: 'لیست خرید او',         s: 'چه چیزهایی می‌خرد',                              act: 'buylist' },
            { ic: 'receipt', t: 'سفارش‌های او',          s: 'سفارش‌هایی که از تو ثبت کرده',                   act: 'orders' },
            { ic: 'inbox',   t: 'درخواست‌های قیمت او',   s: 'استعلام‌های قیمت این مشتری',                     act: 'rfqs' },
            { ic: 'tag',     t: 'گروه مشتری (تخفیف)',   s: g ? (esc(g.name) + ' · ٪' + faNum(g.discount)) : 'بدون گروه', act: 'group' },
            { ic: 'trash',   t: 'حذف از مشتریان',       s: 'از دفتر مشتریانت حذف می‌شود',                    act: 'delete', danger: true }
        ];

        host.innerHTML = items.map(function (it) {
            var bSt = it.danger ? ' style="color:var(--red)"' : '';
            var icSt = it.danger ? ' style="background:var(--red-soft);color:var(--red)"' : '';
            var sSt = it.danger ? ' style="color:#B91C1C;opacity:.75"' : '';
            return '<button class="sheet-row" type="button" data-ccm="' + it.act + '">' +
                '<span class="ico"' + icSt + '><svg><use href="#i-' + it.ic + '"/></svg></span>' +
                '<span class="tx"><b' + bSt + '>' + it.t + '</b><span' + sSt + '>' + it.s + '</span></span>' +
            '</button>';
        }).join('');

        core.openSheet('sheet-cust-menu');
    }

    function ccmRun(act) {
        var id = CUST.menuId;
        var c = customerById(id);
        core.closeSheet('sheet-cust-menu');

        if (act === 'chat') { core.go('s-chat'); return; }
        /* FD-22: لیست خرید او — با پارامتر خریدار (۳۲ بافت‌محور:
           لیستِ خودِ آن مشتری، نه لیست خودم) */
        if (act === 'buylist') { core.go('s-buy-list-guest', { buyer: id }); return; }
        if (act === 'orders') {
            if (c) CUSTVIEW.orders = c.name;
            core.go('s-sell-orders');
            return;
        }
        if (act === 'rfqs') {
            if (c) CUSTVIEW.rfqs = c.name;
            core.go('s-sell-rfqs');
            return;
        }
        if (act === 'group') {
            CUST.pickId = id;
            pcgListRender();
            core.openSheet('sheet-pick-cgroup');
            return;
        }
        if (act === 'delete') { custReject(id); return; }
    }

    /* ═══ فیلتر «فقط همین مشتری» — دفتر سفارش/درخواست فروشنده ═══ */
    function ordersFilterApply() {
        var name = CUSTVIEW.orders;
        CUSTVIEW.orders = null;               /* یک‌بارمصرف */
        /* FD-18: دفتر سفارش پویا شد — فیلتر همان مسیر رندرِ اصلی را
           با نام مشتری صدا می‌زند (قبلاً ردیف‌های ثابت را دستی مخفی
           می‌کرد؛ با رندر پویا دیگر ردیفی برای مخفی‌کردن نیست). */
        if (core.forms && core.forms.ordersSellRender) {
            core.forms.ordersSellRender(name || undefined);
        }
    }

    function rfqsFilterApply() {
        var sec = $('#s-sell-rfqs');
        if (!sec) return;
        var name = CUSTVIEW.rfqs;
        CUSTVIEW.rfqs = null;                 /* یک‌بارمصرف */
        if (!name) return;

        var small = $('#sell-rfqs-sub');
        if (small) small.textContent = 'فقط ' + name;

        var any = false;
        $$('.rows .row', sec).forEach(function (row) {
            var subEl = row.querySelector('.row-sub');
            var isHis = !!(subEl && subEl.textContent.indexOf(name) > -1);
            row.hidden = !isHis;
            if (isHis) any = true;
        });
        var empty = $('#sell-rfqs-empty');
        if (empty) empty.hidden = any;
        if (!any) {
            $$('.body > *', sec).forEach(function (el) {
                if (el.id !== 'sell-rfqs-empty') el.hidden = true;
            });
            var h3 = empty && empty.querySelector('h3');
            if (h3) h3.textContent = 'درخواستی از «' + name + '» پیدا نشد';
        }
    }

    /* ═══ حلقهٔ کلیک ═══ */
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;

        var fbBtn = t.closest('.fb-btn[data-fb]');
        if (fbBtn) {
            var kind = fbBtn.dataset.fb;
            if (kind === 'city') FBCITY.q = '';
            var cs = $('#fb-city-search');
            if (cs) cs.value = '';
            fbRender(kind);
            core.openSheet('sheet-fb-' + kind);
            return;
        }

        var fbOpt = t.closest('[data-fbset]');
        if (fbOpt) { fbSet(fbOpt.dataset.fbset, fbOpt.dataset.val); return; }

        if (t.closest('#cust-clear-filters')) { fbClearAll(); return; }

        /* دعوت مشتری جدید — شیت اشتراک کاتالوگ */
        if (t.closest('#cust-invite') || t.closest('#cust-invite-2')) { shareOpen(); return; }

        /* تایید / حذف مشتری جدید — روی کارت یا در جزئیات */
        var acc = t.closest('[data-cust-accept]');
        if (acc) { custAccept(acc.dataset.custAccept); return; }
        var rej = t.closest('[data-cust-reject]');
        if (rej) { custReject(rej.dataset.custReject); return; }

        /* گزینه‌های منوی شیت مشتری */
        var ccm = t.closest('[data-ccm]');
        if (ccm) { ccmRun(ccm.dataset.ccm); return; }

        /* ذخیرهٔ یادداشت مشتری */
        if (t.closest('#cv-note-save')) { cvNoteSave(); return; }

        /* لیست خرید او — از صفحهٔ جزئیات (FD-22: پارامتر خریدار) */
        if (t.closest('[data-cv-buylist]')) { core.go('s-buy-list-guest', { buyer: CUST.viewId }); return; }

        /* گروه مشتری — از شناسنامهٔ جزئیات */
        if (t.closest('[data-cv-group]')) {
            CUST.pickId = CUST.viewId;
            pcgListRender();
            core.openSheet('sheet-pick-cgroup');
            return;
        }

        /* لمس کارت مشتری → صفحهٔ جزئیات (id را ثبت کن؛ ناوبری با data-go) */
        var cuRow = t.closest('.row[data-cu-id]');
        if (cuRow) CUST.viewId = cuRow.dataset.cuId;

        /* رندر محتوای شیت‌ها هنگام باز شدن (بازکردن توسط هندلر عمومی انجام می‌شود) */
        if (t.closest('[data-sheet="sheet-cust-groups"]')) { cgListRender(); }
        if (t.closest('[data-sheet="sheet-pick-cgroup"]')) { pcgListRender(); }

        var cgEdit = t.closest('[data-cg-edit]');
        if (cgEdit) { cgeOpen(cgEdit.dataset.cgEdit, 'manage'); return; }

        if (t.closest('#cg-new')) { cgeOpen(null, 'manage'); return; }
        if (t.closest('#pcg-new')) { cgeOpen(null, 'pick'); return; }
        if (t.closest('#cge-save')) { cgeSave(); return; }
        if (t.closest('#cge-del')) { cgeDelete(); return; }

        var gdStep = t.closest('[data-gd-step]');
        if (gdStep) {
            var dir = parseFloat(gdStep.dataset.gdStep) || 0;
            var inp = $('#cge-disc');
            if (inp) {
                var v = Math.max(0, Math.min(50, core.parseNum(inp.value) + dir));
                inp.value = faNum(v);
            }
            return;
        }

        var pick = t.closest('[data-pick-cgroup]');
        if (pick) { pcgPick(pick.dataset.pickCgroup || ''); return; }
    });

    /* ═══ حلقهٔ input ═══ */
    document.addEventListener('input', function (e) {
        var t = e.target;
        if (!t) return;
        if (t.id === 'cust-search') {
            CUST.q = t.value;
            customersRender();
        }
        if (t.id === 'fb-city-search') {
            FBCITY.q = t.value;
            fbRender('city');
        }
    });

    /* ═══ Hooks ═══ */
    core.registerShowHook('s-customers', customersOnShow);
    core.registerShowHook('s-customer-view', cvRender);
    core.registerShowHook('s-sell-orders', ordersFilterApply);
    core.registerShowHook('s-sell-rfqs', rfqsFilterApply);

    /* ═══ Expose ═══ */
    core.customers = {
        CUST: CUST,
        render: customersRender,
        menu: custMenu,
        accept: custAccept,
        reject: custReject,
        groupsRender: cgListRender,
        pickRender: pcgListRender,
        shareOpen: shareOpen
    };
})();
