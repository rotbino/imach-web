/* ═════════════════════════════════════════════════════════════════
   iMach — Suppliers (دفتر تأمین‌کننده) — FD-16
   ─────────────────────────────────────────────────────────────────
   مسئول:
     • تأمین‌کننده = فروشنده‌ای که کاتالوگش را ذخیره کرده‌ای — ثبت دستی
       ندارد؛ از دلِ ذخیرهٔ کاتالوگ یا «پیشنهاد تامین».
     • رندر دیتامحور لیست (۲۲) — تأمین‌کننده‌های پیشنهادی (isNew +
       proposal) اولِ لیست با دکمه‌های «تایید / حذف» (قرینهٔ مشتری
       جدید در دفتر مشتری — الگوی درخواست اینستاگرام).
     • لمس ردیف → صفحهٔ جزئیات تأمین‌کننده (s-supplier-view):
       شناسنامه + پیشنهاد تامین او (اگر جدید) + یادداشت + پیشنهادهایی
       که داده (offers) + استعلام‌هایی که از او شده (rfqsOut) +
       سفارش‌هایش (ordersOut) + «کاتالوک او» مستقیم (حکم مالک).
     • دعوت تأمین‌کننده جدید = شیت اشتراک لیست خرید (sheet-share-buylist).
     • شیت «پیشنهاد تامین» دید عمومی لیست (۳۲) — خریدار دیگرِ
       (بینندهٔ لینک) برای کالاهایش قیمت می‌دهد.

   پیاده‌سازی واقعی (نکته‌ها):
     • تایید پیشنهاد = دو رابطهٔ هم‌زمان: او → تأمین‌کنندهٔ من؛
       من → مشتری او (و کاتالوگ او خودکار ذخیره). حکم مالک FD-16.
     • قیمت‌های پیشنهادی به‌مرور با قیمت زندهٔ کاتالوگ فروشنده
       هم‌گام می‌شوند (proposal فقط نقطهٔ شروع است).
     • ارسال پیشنهاد از دید عمومی به حساب آی‌مچ نیاز دارد — گیت
       در submit (همان الگوی سفارش مهمان FD-13).
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
    var SUP = {
        q: '',            /* جستجوی دفتر تأمین‌کننده‌ها */
        viewId: null      /* id تأمین‌کنندهٔ صفحهٔ جزئیات */
    };
    var SUPPLY = { sel: {} };  /* شیت پیشنهاد تامین (۳۲) */

    /* ═══ Helpers ═══ */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function suppliers() {
        return (core.data.suppliers || []).filter(function (s) {
            return s.businessId === 'b2';
        });
    }
    function supplierById(id) {
        var out = null;
        (core.data.suppliers || []).forEach(function (s) { if (s.id === id) out = s; });
        return out;
    }
    function rfqOutById(id) {
        var out = null;
        (core.data.rfqsOut || []).forEach(function (r) { if (r.id === id) out = r; });
        return out;
    }
    function moneyFmt(n) {
        return faNum(Number(n || 0).toLocaleString('en-US').replace(/,/g, '٬'));
    }

    /* ═══ رندر لیست (۲۲) ═══ */
    function rowHtml(s) {
        var isNew = !!s.isNew;
        var verified = s.verified
            ? ' <svg style="width: 14px; height: 14px; color: var(--blue);"><use href="#i-verified"/></svg>'
            : '';
        /* زیرمتن: پیشنهاد تامین او (اگر جدید) یا معرفی معمول */
        var sub = isNew && s.proposal
            ? '<span style="color: var(--amber); font-weight: 700;">پیشنهاد تامین: ' + esc(s.proposal.good) +
              ' — ' + moneyFmt(s.proposal.price) + ' تومان</span>'
            : esc(s.person || '—') + ' <span class="dot">·</span> ' + esc(s.city || '—') +
              ' <span class="dot">·</span> ' + esc(s.industry || '');
        var row = '<div class="row static" data-go="s-supplier-view" data-su-id="' + esc(s.id) + '">' +
            '<div class="avatar" style="background:' + (s.color || '#7c3aed') + '">' + esc(s.avatar || (s.name || '؟').charAt(0)) + '</div>' +
            '<div class="row-body">' +
                '<div class="row-title">' + esc(s.name) + verified +
                    (isNew ? ' <span class="badge b-primary">جدید</span>' : '') + '</div>' +
                '<div class="row-sub">' + sub + '</div>' +
            '</div>' +
            '<button class="icon-btn plain" data-sup-menu="' + esc(s.name) + '" data-su-id="' + esc(s.id) + '" aria-label="گزینه‌ها">' +
                '<svg><use href="#i-dots"/></svg></button>' +
        '</div>';
        if (!isNew) return row;
        /* تأمین‌کنندهٔ پیشنهادی — کارت با تایید/حذف (همان الگوی مشتری جدید) */
        return '<div class="cust-req">' + row +
            '<div class="cust-req-act">' +
                '<button class="btn btn-primary btn-sm" type="button" data-sup-accept="' + esc(s.id) + '">' +
                    '<svg><use href="#i-check"/></svg> تایید</button>' +
                '<button class="btn btn-outline btn-sm" type="button" data-sup-reject="' + esc(s.id) + '" style="color: var(--red); border-color: #F3C1C1;">' +
                    '<svg><use href="#i-x"/></svg> حذف</button>' +
            '</div>' +
        '</div>';
    }

    function visibleSuppliers() {
        /* پیشنهادی‌ها (isNew) همیشه اول — تا تایید یا حذف شوند */
        var arr = suppliers().slice().sort(function (a, b) {
            return ((b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        });
        return arr.filter(function (s) {
            if (SUP.q) {
                var hay = (s.name || '') + ' ' + (s.person || '') + ' ' + (s.city || '') + ' ' + (s.industry || '');
                if (hay.indexOf(SUP.q.trim()) === -1) return false;
            }
            return true;
        });
    }

    function suppliersRender() {
        var list = $('#sup-list');
        if (!list) return;
        var vis = visibleSuppliers();
        var all = suppliers().length;

        if (!vis.length) {
            list.innerHTML = '<div class="empty" style="padding: 16px 12px;">' +
                '<div class="empty-ic"><svg><use href="#i-users"/></svg></div>' +
                '<h3>تأمین‌کننده‌ای پیدا نشد</h3>' +
                '<p>جستجو را ساده‌تر کن یا لینک لیست خریدت را برای تأمین‌کننده‌ها بفرست.</p></div>';
        } else {
            list.innerHTML = vis.map(rowHtml).join('');
        }

        var cnt = $('#sup-count');
        if (cnt) cnt.textContent = (vis.length === all)
            ? faNum(all) + ' تأمین‌کننده'
            : faNum(vis.length) + ' از ' + faNum(all) + ' تأمین‌کننده';

        /* همگام‌سازی میز خرید اگر دیده می‌شود (کاشی/ردیف در انتظار تایید) */
        if (core.getCurrentScreen() === 's-home-buy' && core.forms && core.forms.buyDeskSync) {
            core.forms.buyDeskSync();
        }
    }

    /* ═══ تایید / حذف پیشنهاد تامین ═══ */
    function supAccept(id) {
        var s = supplierById(id);
        if (!s) return;
        s.isNew = false;
        suppliersRender();
        if (core.getCurrentScreen() === 's-supplier-view' && SUP.viewId === id) svRender();
        toast('«' + s.name + '» تایید شد — از تأمین‌کننده‌های توست و تو هم مشتری او (کاتالوگش ذخیره شد)', 'success');
    }

    function supReject(id) {
        var s = supplierById(id);
        if (!s) return;
        core.confirm({
            title: 'حذف پیشنهاد تامین',
            text: '«' + s.name + '» و پیشنهادش حذف می‌شود؛ تأمین‌کننده‌های تو نمی‌شود.',
            ok: 'حذف پیشنهاد', cancel: 'انصراف', danger: true
        }).then(function (ok) {
            if (!ok) return;
            core.data.suppliers = (core.data.suppliers || []).filter(function (x) { return x.id !== id; });
            suppliersRender();
            toast('پیشنهاد تامین حذف شد', 'success');
            if (core.getCurrentScreen() === 's-supplier-view' && SUP.viewId === id) core.back();
        });
    }

    /* ═══ صفحهٔ جزئیات (s-supplier-view) ═══ */
    function svRow(ic, val, label, action) {
        var attr = '';
        if (action === 'dial') attr = ' data-dial style="cursor:pointer"';
        var chev = action
            ? '<svg style="width:15px;height:15px;color:var(--text-4);flex-shrink:0;margin-inline-start:auto"><use href="#i-chev"/></svg>'
            : '';
        return '<div class="gd-row"' + attr + '>' +
            '<div class="gd-ic"><svg><use href="#i-' + ic + '"/></svg></div>' +
            '<div class="gd-tx"><b>' + val + '</b><span>' + label + '</span></div>' +
            chev +
        '</div>';
    }

    function svActRow(o) {
        /* o.kind: 'offer' | 'rfq' | 'order' */
        var title = '', sub = '', go = 's-buy-rfqs';
        if (o.kind === 'offer') {
            title = 'پیشنهاد داده: ' + esc(o.item) + ' — ' + moneyFmt(o.price) + ' تومان';
            sub = 'در پاسخ به درخواست قیمت تو';
            go = 's-buy-offer-view';
        } else if (o.kind === 'order') {
            title = 'سفارش ' + esc(o.item) + ' — ' + esc(o.qty);
            sub = esc(o.when || '') + (o.status === 'accepted' ? ' · در جریان' : '');
            go = 's-buy-orders';
        } else {
            title = 'درخواست قیمت ' + esc(o.item);
            sub = o.daysLeft > 0
                ? faNum(o.daysLeft) + ' روز مانده · ' + faNum(o.offersCount || 0) + ' پیشنهاد'
                : 'پایان مهلت · ' + faNum(o.offersCount || 0) + ' پیشنهاد';
            go = 's-buy-offers';
        }
        return '<div class="row"' + (o.kind === 'offer' ? ' data-sv-offer="' + esc(o.id) + '"' : ' data-go="' + go + '"') + '>' +
            '<div class="thumb thumb-sm"><img src="' + esc(o.img || 'png/goods/rice-sack.jpg') + '" alt=""></div>' +
            '<div class="row-body">' +
                '<div class="row-title">' + title + '</div>' +
                '<div class="row-sub">' + sub + '</div>' +
            '</div>' +
            '<div class="row-chev"><svg><use href="#i-chev"/></svg></div>' +
        '</div>';
    }

    function svRender() {
        var sec = $('#s-supplier-view');
        if (!sec) return;

        var s = supplierById(SUP.viewId);
        if (!s) {
            var all = suppliers();
            s = all[0] || null;
            if (s) SUP.viewId = s.id;
        }
        if (!s) { core.back(); return; }

        /* هدر */
        var av = $('#sv-avatar');
        if (av) {
            av.textContent = s.avatar || (s.name || '؟').charAt(0);
            av.style.background = s.color || '#7c3aed';
        }
        var nm = $('#sv-name'); if (nm) nm.textContent = s.name;
        var sub = $('#sv-sub');
        if (sub) sub.textContent = [s.person, s.city].filter(Boolean).join(' · ');

        /* در انتظار تایید + پیشنهاد تامین او — فقط تأمین‌کنندهٔ جدید */
        var pend = $('#sv-pending');
        if (pend) {
            if (s.isNew) {
                var p = s.proposal || {};
                var pTx = p.good
                    ? '<div class="sv-prop">' +
                        '<div class="sv-prop-tx"><b>' + esc(p.good) + ' — ' + moneyFmt(p.price) + ' تومان</b>' +
                        (p.pack ? '<span>' + esc(p.pack) + '</span>' : '') + '</div>' +
                        (p.msg ? '<div class="sv-prop-msg">' + esc(p.msg) + '</div>' : '') +
                      '</div>'
                    : '';
                pend.hidden = false;
                pend.innerHTML =
                    '<div class="cv-pending">' +
                        '<div class="cv-pending-tx">' +
                            '<svg><use href="#i-user-plus"/></svg>' +
                            '<div><b>در انتظار تایید تو — پیشنهاد تامین داده</b>' +
                            '<span>با تایید، جزو تأمین‌کننده‌هایت می‌شود و تو هم مشتری او</span></div>' +
                        '</div>' +
                        pTx +
                        '<div class="cv-pending-act">' +
                            '<button class="btn btn-primary" type="button" data-sup-accept="' + esc(s.id) + '">' +
                                '<svg><use href="#i-check"/></svg> تایید تأمین‌کننده</button>' +
                            '<button class="btn btn-outline" type="button" data-sup-reject="' + esc(s.id) + '" style="color: var(--red); border-color: #F3C1C1;">' +
                                '<svg><use href="#i-x"/></svg> حذف</button>' +
                        '</div>' +
                    '</div>';
            } else {
                pend.hidden = true;
                pend.innerHTML = '';
            }
        }

        /* شناسنامه */
        var idn = $('#sv-identity');
        if (idn) {
            idn.innerHTML =
                svRow('user', esc(s.person || '—'), 'نام مسئول', null) +
                svRow('store', esc(s.industry || 'بدون صنف'), 'صنف', null) +
                svRow('pin', esc(s.city || '—'), 'شهر', null) +
                svRow('phone', '<span dir="ltr">' + esc(s.phone || '—') + '</span>', 'تلفن — لمس کن تا بگیری', 'dial') +
                svRow('basket', esc(s.goods || '—'), 'کالاهایش', null) +
                svRow('clock', esc(s.since || '—'), 'تأمین‌کننده از', null);
        }

        /* یادداشت */
        var note = $('#sv-note');
        if (note) note.value = s.note || '';

        /* پیشنهادها و استعلام‌ها و سفارش‌هایش */
        var act = $('#sv-activity');
        if (act) {
            var html = '';
            (core.data.offers || []).forEach(function (o) {
                if (o.supplierId === s.id) {
                    var rfq = rfqOutById(o.rfqId) || {};
                    var itemName = (rfq.itemName || '').split(' · ')[0];
                    html += svActRow({ kind: 'offer', id: o.id, item: itemName || 'کالا', price: o.price, img: rfq.img || 'png/goods/rice-sack.jpg' });
                }
            });
            (core.data.rfqsOut || []).forEach(function (r) {
                if ((r.supplierIds || []).indexOf(s.id) > -1) {
                    html += svActRow({ kind: 'rfq', item: r.itemName, img: r.img, daysLeft: r.daysLeft, offersCount: r.offersCount });
                }
            });
            (core.data.ordersOut || []).forEach(function (o) {
                if (o.supplierId === s.id) {
                    html += svActRow({ kind: 'order', item: o.itemName, qty: faNum(o.qty) + ' ' + (o.pack || ''), when: o.when, status: o.status, img: o.img });
                }
            });
            if (!html) {
                html = '<div class="empty" style="padding: 16px 12px;">' +
                    '<h3 style="margin-bottom:4px">هنوز پیشنهاد یا استعلامی ندارد</h3>' +
                    '<p style="margin:0">وقتی از او قیمت بگیری یا پیشنهاد بدهد، همین‌جا می‌آید.</p></div>';
            }
            act.innerHTML = html;
        }
    }

    function svNoteSave() {
        var s = supplierById(SUP.viewId);
        var note = $('#sv-note');
        if (!s || !note) return;
        s.note = note.value.trim();
        toast('یادداشت ذخیره شد', 'success');
    }

    /* ═══ شیت «پیشنهاد تامین» — دید عمومی لیست (۳۲) ═══ */
    function supplyOpen() {
        SUPPLY.sel = {};
        var form = $('#supply-form'), ok = $('#supply-ok');
        if (form) form.hidden = false;
        if (ok) ok.hidden = true;
        var nEl = $('#supply-note');
        if (nEl) nEl.value = '';
        supplyRender();
        core.openSheet('sheet-supply');
    }

    function supplyRender() {
        var host = $('#supply-goods');
        if (!host) return;
        var items = (core.data.shoppingList || []).filter(function (it) { return it.businessId === 'b2'; });
        host.innerHTML = items.map(function (it) {
            return '<div class="sprow' + (SUPPLY.sel[it.id] ? ' on' : '') + '" data-spg="' + esc(it.id) + '" type="button">' +
                '<span class="sprow-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4.5 12.5l5 5 10-11"/></svg></span>' +
                '<div class="thumb thumb-sm"><img src="' + esc(it.img) + '" alt=""></div>' +
                '<div class="sprow-body">' +
                    '<b>' + esc(it.name) + '</b>' +
                    '<small>' + esc(it.q || it.pack || '') + '</small>' +
                '</div>' +
                '<input class="sprow-price" data-spg-price="' + esc(it.id) + '" placeholder="قیمت" inputmode="numeric" autocomplete="off" aria-label="قیمت پیشنهادی ' + esc(it.name) + '">' +
            '</div>';
        }).join('');
    }

    function supplyToggle(id) {
        SUPPLY.sel[id] = !SUPPLY.sel[id];
        var el = $('[data-spg="' + id + '"]');
        if (el) el.classList.toggle('on', !!SUPPLY.sel[id]);
    }

    function supplySend() {
        var picked = [];
        Object.keys(SUPPLY.sel).forEach(function (k) {
            if (!SUPPLY.sel[k]) return;
            var rowEl = $('[data-spg="' + k + '"]');
            var priceEl = rowEl ? rowEl.querySelector('.sprow-price') : null;
            var price = priceEl ? String(priceEl.value).trim() : '';
            picked.push({ id: k, price: price });
        });
        if (!picked.length) { toast('حداقل یک کالا را انتخاب کن', 'error'); return; }
        var noPrice = picked.filter(function (p) { return !p.price; }).length;
        if (noPrice) { toast('برای ' + faNum(noPrice) + ' کالای انتخابی قیمت ننوشته‌ای', 'error'); return; }

        var form = $('#supply-form'), ok = $('#supply-ok');
        if (form) form.hidden = true;
        if (ok) ok.hidden = false;
        /* در محصول واقعی: ثبت پیشنهاد + نوتیفیکیشن خریدار + گیت حساب */
    }

    /* ═══ کاتالوک تأمین‌کننده — به چشم مشتری (حکم مالک FD-16:
       مستقیم به کاتالوک او، نه صفحهٔ واسط). خریدار کاتالوگش را ذخیره
       کرده = مشتری اوست؛ قیمت‌ها باز و سبد فعال (guestEnterAsCustomer
       در app-forms.js). در ماک همه به کاتالوگ نمونهٔ ۳۱ می‌روند —
       در محصول واقعی هر تأمین‌کننده URL کاتالوگ خودش را دارد. ═══ */
    function openCatalog() {
        if (core.forms && core.forms.guestEnterAsCustomer) {
            core.forms.guestEnterAsCustomer('سوپرمارکت آریا');
        }
        core.go('s-catalog-guest');
    }

    /* ═══ حلقهٔ کلیک ═══ */
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;

        /* دعوت تأمین‌کننده جدید — شیت اشتراک لیست خرید (حکم مالک FD-16) */
        if (t.closest('#sup-invite') || t.closest('#sup-invite-2')) {
            core.openSheet('sheet-share-buylist');
            return;
        }

        /* تایید / حذف پیشنهاد تامین — روی کارت یا در جزئیات */
        var acc = t.closest('[data-sup-accept]');
        if (acc) { supAccept(acc.dataset.supAccept); return; }
        var rej = t.closest('[data-sup-reject]');
        if (rej) { supReject(rej.dataset.supReject); return; }

        /* ذخیرهٔ یادداشت تأمین‌کننده */
        if (t.closest('#sv-note-save')) { svNoteSave(); return; }

        /* لمس ردیف تأمین‌کننده → جزئیات (id را ثبت کن؛ ناوبری با data-go) */
        var suRow = t.closest('.row[data-su-id]');
        if (suRow) SUP.viewId = suRow.dataset.suId;

        /* ردیف «پیشنهاد داده» در جزئیات → صفحهٔ همان پیشنهاد (با پارامتر) */
        var svOffer = t.closest('[data-sv-offer]');
        if (svOffer) {
            e.preventDefault();
            core.go('s-buy-offer-view', { offer: svOffer.dataset.svOffer });
            return;
        }

        /* کاتالوک تأمین‌کننده — از هر جای سمت خرید (۲۰/۲۳/۲۷) */
        if (t.closest('[data-sup-cat]')) { openCatalog(); return; }

        /* ═══ شیت پیشنهاد تامین (۳۲) ═══ */
        if (t.closest('#supply-propose')) { supplyOpen(); return; }
        if (t.closest('#supply-send')) { supplySend(); return; }
        var spRow = t.closest('.sprow');
        if (spRow && !t.closest('.sprow-price')) { supplyToggle(spRow.dataset.spg); return; }
    });

    /* ═══ حلقهٔ input ═══ */
    document.addEventListener('input', function (e) {
        var t = e.target;
        if (!t) return;
        if (t.id === 'sup-search') {
            SUP.q = t.value;
            suppliersRender();
        }
        /* نوشتن قیمت در شیت پیشنهاد = انتخاب همان کالا */
        if (t.classList && t.classList.contains('sprow-price')) {
            var id = t.dataset.spgPrice;
            if (String(t.value).trim() && !SUPPLY.sel[id]) {
                SUPPLY.sel[id] = true;
                var rowEl = t.closest('.sprow');
                if (rowEl) rowEl.classList.add('on');
            }
        }
    });

    /* ═══ Hooks ═══ */
    core.registerShowHook('s-buy-suppliers', suppliersRender);
    core.registerShowHook('s-supplier-view', svRender);

    /* ═══ Expose ═══ */
    core.suppliers = {
        SUP: SUP,
        render: suppliersRender,
        accept: supAccept,
        reject: supReject,
        viewRender: svRender,
        supplyOpen: supplyOpen,
        openCatalog: openCatalog
    };
})();
