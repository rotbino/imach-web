/* ═════════════════════════════════════════════════════════════════
   iMach — Customers (دفتر مشتری)
   ─────────────────────────────────────────────────────────────────
   مسئول:
     • رندر دیتامحور لیست مشتریان (با گروه، صنف، بدهی)
     • نوار فیلتر دیوارگونه: صنف / گروه مشتری / بدهی + جستجو
     • خلاصهٔ دفتر (تعداد + مجموع بدهی)
     • مدیریت گروه‌های مشتری (نام + تخفیف مستقیم)
     • فرم افزودن/ویرایش مشتری (s-customer-edit)
     • منوی سه‌نقطهٔ مشتری (گفتگو / ویرایش / حذف)
   ═════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    var core = window.iMach;
    if (!core) { console.error('app-core.js not loaded'); return; }

    var $ = core.$;
    var $$ = core.$$;
    var faNum = core.faNum;
    var faMoney = core.faMoney;
    var parseNum = core.parseNum;
    var toast = core.toast;

    /* ═══ State ═══ */
    var CUST = {
        q: '',
        industry: null,     /* null = همه */
        group: null,        /* null = همه · '' = بدون گروه · 'cgX' = گروه مشخص */
        debt: null,         /* null = همه · 'debt' = بدهکار · 'none' = بدون بدهی */
        seen: false,        /* بج «جدید» فقط بار اول */
        editId: null,       /* id مشتری در حال ویرایش */
        pickGroup: ''       /* گروه انتخاب‌شده در فرم مشتری */
    };
    var CGROUP = { editing: null, returnTo: 'manage' };
    var COLOR_POOL = ['#7c3aed', '#c2703a', '#059669', '#0e7490', '#b45309', '#dc2626', '#2563EB', '#65a30d'];
    var colorIdx = 0;

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
        var h = '';
        if (g && g.discount > 0) {
            h += '<span class="badge b-primary"><svg><use href="#i-tag"/></svg>' + esc(g.name) + ' · ٪' + faNum(g.discount) + '</span>';
        } else if (g) {
            h += '<span class="badge b-gray">' + esc(g.name) + '</span>';
        } else {
            h += '<span class="badge b-gray">بدون گروه</span>';
        }
        h += (c.debt > 0)
            ? '<span class="badge b-red"><svg><use href="#i-wallet"/></svg>' + faMoney(c.debt) + ' بدهی</span>'
            : '<span class="badge b-green">بدون بدهی</span>';
        return h;
    }

    function rowHtml(c) {
        var isNew = c.isNew && !CUST.seen;
        return '<div class="row static" data-go="s-chat" data-cu-id="' + esc(c.id) + '">' +
            '<div class="avatar" style="background:' + (c.color || '#7c3aed') + '">' + esc(c.avatar || (c.name || '؟').charAt(0)) + '</div>' +
            '<div class="row-body">' +
                '<div class="row-title">' + esc(c.name) + (isNew ? ' <span class="badge b-primary">جدید</span>' : '') + '</div>' +
                '<div class="row-sub">' + esc(c.person || '—') + ' <span class="dot">·</span> ' + esc(c.city || '—') + ' <span class="dot">·</span> ' + esc(c.industry || 'بدون صنف') + '</div>' +
                '<div class="cust-badges">' + badgesHtml(c) + '</div>' +
            '</div>' +
            '<button class="icon-btn plain" data-cust-menu="' + esc(c.name) + '" data-cu-id="' + esc(c.id) + '" aria-label="گزینه‌ها">' +
                '<svg><use href="#i-dots"/></svg></button>' +
        '</div>';
    }

    function visibleCustomers() {
        return customers().filter(function (c) {
            if (CUST.q) {
                var hay = (c.name || '') + ' ' + (c.person || '') + ' ' + (c.city || '');
                if (hay.indexOf(CUST.q.trim()) === -1) return false;
            }
            if (CUST.industry && (c.industry || '') !== CUST.industry) return false;
            if (CUST.group !== null && (c.groupId || '') !== CUST.group) return false;
            if (CUST.debt === 'debt' && !(c.debt > 0)) return false;
            if (CUST.debt === 'none' && (c.debt > 0)) return false;
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

        var debtSum = 0;
        vis.forEach(function (c) { debtSum += (c.debt || 0); });
        var sm = $('#cust-summary');
        if (sm) {
            sm.innerHTML =
                '<svg><use href="#i-bookmark"/></svg>' +
                '<span><b>' + faNum(vis.length) + '</b> مشتری</span>' +
                '<span class="dot">·</span>' +
                '<span>مجموع بدهی: <b style="color:' + (debtSum > 0 ? 'var(--red)' : 'var(--text)') + '">' + faMoney(debtSum) + '</b> تومان</span>';
        }

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
        CUST.seen = true;
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
        var bd = $('.fb-btn[data-fb="debt"]');
        if (bd) {
            var sd = bd.querySelector('span');
            sd.textContent = CUST.debt === 'debt' ? 'بدهکار' : (CUST.debt === 'none' ? 'بدون بدهی' : 'بدهی');
            bd.classList.toggle('active', !!CUST.debt);
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

        } else if (kind === 'debt') {
            host = $('#fb-debt-list');
            var debtors = all.filter(function (c) { return c.debt > 0; });
            var sum = 0;
            debtors.forEach(function (c) { sum += c.debt; });
            html += fbOptionRow('debt', '', 'همه', faNum(all.length) + ' مشتری', !CUST.debt);
            html += fbOptionRow('debt', 'debt', 'بدهکار', faNum(debtors.length) + ' مشتری · ' + faMoney(sum) + ' تومان', CUST.debt === 'debt');
            html += fbOptionRow('debt', 'none', 'بدون بدهی', faNum(all.length - debtors.length) + ' مشتری', CUST.debt === 'none');
        }
        if (host) host.innerHTML = html;
    }

    function fbSet(kind, val) {
        if (kind === 'industry') CUST.industry = val || null;
        if (kind === 'group') CUST.group = (val === '' || val === undefined) ? null : (val === '__none__' ? '' : val);
        if (kind === 'debt') CUST.debt = val || null;
        core.closeSheet('sheet-fb-' + kind);
        customersRender();
    }

    function fbClearAll() {
        CUST.industry = null; CUST.group = null; CUST.debt = null;
        customersRender();
        toast('فیلترها پاک شد', 'success');
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
        var disc = Math.max(0, Math.min(50, parseNum(($('#cge-disc') || {}).value)));

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
            CUST.pickGroup = g.id;
            ceGroupLabelSync();
            setTimeout(function () { pcgListRender(); core.openSheet('sheet-pick-cgroup'); }, 320);
            toast('گروه ساخته شد و انتخاب شد', 'success');
        } else {
            setTimeout(function () { cgListRender(); core.openSheet('sheet-cust-groups'); }, 320);
            toast('گروه ذخیره شد', 'success');
        }
        customersRender();
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
            toast('گروه حذف شد', 'success');
        });
    }

    /* ═══ گروه‌ها — انتخاب در فرم مشتری ═══ */
    function pcgListRender() {
        var host = $('#pcg-list');
        if (!host) return;
        var html = fbOptionRow('', '', 'بدون گروه', 'بدون تخفیف گروهی', CUST.pickGroup === '');
        html = html.replace('data-fbset="" data-val=""', 'data-pick-cgroup=""');
        groups().forEach(function (g) {
            var row = fbOptionRow('', g.id, esc(g.name) + ' · ٪' + faNum(g.discount), '', CUST.pickGroup === g.id);
            row = row.replace('data-fbset="" data-val="' + g.id + '"', 'data-pick-cgroup="' + g.id + '"');
            html += row;
        });
        host.innerHTML = html;
    }

    function ceGroupLabelSync() {
        var el = $('#ce-group-label');
        if (el) el.textContent = groupName(CUST.pickGroup);
    }

    /* ═══ فرم مشتری ═══ */
    function ceIndustriesRender(active) {
        var host = $('#ce-industry');
        if (!host) return;
        host.innerHTML = core.data.customerIndustries.map(function (i) {
            return '<button class="pill' + (i === active ? ' active' : '') + '" type="button">' + esc(i) + '</button>';
        }).join('');
    }

    function ceLoad() {
        var p = core.getSCREENParams()['s-customer-edit'] || {};
        var c = null;
        core.data.customers.forEach(function (x) { if (x.id === p.id) c = x; });

        CUST.editId = c ? c.id : null;
        CUST.pickGroup = c ? (c.groupId || '') : '';

        var ttl = $('#ce-ttl');
        if (ttl) {
            ttl.innerHTML = (c ? 'ویرایش مشتری' : 'مشتری جدید') + '<small>دفتر مشتری</small>';
        }
        var set = function (id, v) { var el = $(id); if (el) el.value = v || ''; };
        set('#ce-name', c ? c.name : '');
        set('#ce-person', c ? c.person : '');
        set('#ce-phone', c ? c.phone : '');
        set('#ce-city', c ? c.city : '');
        set('#ce-note', c ? c.note : '');
        var debt = $('#ce-debt');
        if (debt) debt.value = c && c.debt ? faMoney(c.debt) : '';

        ceIndustriesRender(c ? c.industry : null);
        ceGroupLabelSync();
    }

    function ceOpen(id) {
        core.setSCREENParams('s-customer-edit', { id: id || null });
        core.go('s-customer-edit');
    }

    function ceSave() {
        var name = (($('#ce-name') || {}).value || '').trim();
        if (!name) { toast('نام مشتری را وارد کن', 'error'); return; }

        var activePill = $('#ce-industry .pill.active');
        var industry = activePill ? activePill.textContent.trim() : '';

        var c = null;
        if (CUST.editId) {
            core.data.customers.forEach(function (x) { if (x.id === CUST.editId) c = x; });
        }
        if (!c) {
            c = {
                id: 'cu_' + Date.now(),
                businessId: core.data.user.activeBusinessId || 'b1',
                since: 'همین حالا',
                isNew: false,
                avatar: name.charAt(0),
                color: COLOR_POOL[colorIdx++ % COLOR_POOL.length],
                contactId: null
            };
            core.data.customers.push(c);
        }
        c.name = name;
        c.person = (($('#ce-person') || {}).value || '').trim();
        c.phone = (($('#ce-phone') || {}).value || '').trim();
        c.city = (($('#ce-city') || {}).value || '').trim();
        c.industry = industry;
        c.groupId = CUST.pickGroup || '';
        c.debt = parseNum(($('#ce-debt') || {}).value);
        c.note = (($('#ce-note') || {}).value || '').trim();

        toast(CUST.editId ? 'مشتری به‌روز شد' : 'مشتری به دفتر اضافه شد', 'success');
        setTimeout(function () { core.back(); }, 550);
    }

    /* ═══ منوی سه‌نقطهٔ مشتری ═══ */
    function custMenu(name, btn, row) {
        var id = (btn && btn.dataset.cuId) || (row && row.dataset.cuId) || null;
        core.actions('گزینه‌های ' + name, [
            { label: 'گفتگو', onClick: function () { core.go('s-chat'); } },
            { label: 'ویرایش مشتری', onClick: function () { ceOpen(id); } },
            { label: 'حذف از مشتریان', danger: true, onClick: function () {
                    core.confirm({
                        title: 'حذف از مشتریان',
                        text: '«' + name + '» از دفتر مشتریانت حذف می‌شود. دیگر قیمت‌های شما را نمی‌بیند.',
                        ok: 'حذف مشتری', cancel: 'انصراف', danger: true
                    }).then(function (ok) {
                        if (!ok) return;
                        core.data.customers = core.data.customers.filter(function (x) { return x.id !== id; });
                        customersRender();
                        toast('مشتری از دفتر حذف شد', 'success');
                    });
                }}
        ]);
    }

    /* ═══ حلقهٔ کلیک ═══ */
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;

        var fbBtn = t.closest('.fb-btn[data-fb]');
        if (fbBtn) {
            var kind = fbBtn.dataset.fb;
            fbRender(kind);
            core.openSheet('sheet-fb-' + kind);
            return;
        }

        var fbOpt = t.closest('[data-fbset]');
        if (fbOpt) { fbSet(fbOpt.dataset.fbset, fbOpt.dataset.val); return; }

        if (t.closest('#cust-clear-filters')) { fbClearAll(); return; }

        if (t.closest('#cust-add')) { ceOpen(null); return; }

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
                var v = Math.max(0, Math.min(50, parseNum(inp.value) + dir));
                inp.value = faNum(v);
            }
            return;
        }

        var pick = t.closest('[data-pick-cgroup]');
        if (pick) {
            CUST.pickGroup = pick.dataset.pickCgroup || '';
            ceGroupLabelSync();
            core.closeSheet('sheet-pick-cgroup');
            return;
        }

        if (t.closest('#ce-save')) { ceSave(); return; }
    });

    /* ═══ حلقهٔ input ═══ */
    document.addEventListener('input', function (e) {
        var t = e.target;
        if (!t) return;
        if (t.id === 'cust-search') {
            CUST.q = t.value;
            customersRender();
        }
    });

    /* ═══ Hooks ═══ */
    core.registerShowHook('s-customers', customersOnShow);
    core.registerShowHook('s-customer-edit', ceLoad);

    /* ═══ Expose ═══ */
    core.customers = {
        CUST: CUST,
        render: customersRender,
        menu: custMenu,
        ceOpen: ceOpen,
        groupsRender: cgListRender,
        pickRender: pcgListRender
    };
})();
