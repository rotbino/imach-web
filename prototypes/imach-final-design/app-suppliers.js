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
    var SUPPLY = { sel: {}, vals: {} };  /* شیت پیشنهاد تامین (۳۲) — FD-23: vals = قیمت/حداقلِ زندهٔ هر قلم (رندرها نمی‌ریزند) */

    /* ═══ FD-22 — بافت دید عمومی لیست خرید (۳۲) ═══
       صفحه پارامتری شد (الگوی سفارش‌های FD-18):
         • پیش‌فرض/پیش‌نمایش = لیست خودِ کاربر جاری (b2) — hero: احمد
           رضایی (یکدستی شخصیت دمو FD-15: یک کسب‌وکار، دو میز).
         • {buyer:'cu3'} از دفتر مشتری (۰۸) = لیست عمومی سوپرمارکت
           نیما — بیننده = کاربر جاری؛ نوار «افزودن کالاهای این لیست
           به …» فقط این‌جاست (لیست خودت را به خودت اضافه نمی‌کنی).
         • inq = کالاهای در حال استعلام (نوار افقی)؛ conditions =
           متن شرایط درخواست تامین (لینک مینیمال بالای کالاها). */
    var BLG = {
        other: false, buyer: null, items: [], inq: [], conditions: '',
        /* FD-23 — تطبیق کالاهای موردنیازِ طرف با کاتالوک خودم:
           match[itemId] = { lid, price, min, pack, exact } — مبنا:
           نوار «شما تأمین‌کنندهٔ … هستید» + سورت ردیف‌ها + نشان‌ها +
           pre-fill خودکار شیت پیشنهاد. */
        match: {}
    };

    /* ═══ FD-22/FD-23 — شیت «افزودن کالاهای این لیست» (sheet-listpick) ═══
         حکم مالک: «چه خریدار چه فروشنده بتونه کالاهای لیستِ دیگری را
         به لیست خرید خودش اضافه کند». FD-23: مقصد کاتالوگ حذف شد —
         قلم‌های پیشنهاد تامین خودشان به کاتالوگ می‌نشینند (حکم مالک:
         «دیگه نیاز به اون دکمهٔ اضافی ادد کردن کالاها به کاتالوگم
         نداریم»)؛ لیست ردیفی + جستجو + ضدتکرار «در لیست هست». */
    var LP = { sel: {}, q: '' };

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

    /* ═══ FD-23 — کاتالوک خودِ بیننده (میز فروش) — مرجع تطبیق ═══
       قلم‌های لیستِ خریدِ طرف با این کاتالوگ مچ می‌شوند (سطح کالا؛
       اول نام+بسته = exact، بعد فقط نام = ضعیف) ⇒ قیمت/حداقل pre-fill
       و نشان «از کاتالوک تو».
       پیاده‌سازی واقعی: تطبیق روی goodId رخ می‌دهد (نه رشتهٔ نام) +
       فازیِ نام سمت سرور برای کالاهای هم‌معنا (نرمال‌سازی ی/ی و
       نیم‌فاصله)؛ نتایج تطبیق کش می‌شوند و با تغییر کاتالوک
       بی‌اعتبار می‌شوند. در ماک: تطبیق رشته‌ایِ ساده کافی است. */
    function myCatalog() {
        var bid = ((core.data.user || {}).activeBusinessId) || 'b1';
        return (core.data.listings || []).filter(function (l) {
            return l.businessId === bid;
        });
    }
    function blgMatchOf(it) {
        var strong = null, weak = null;
        myCatalog().forEach(function (l) {
            if ((l.name || '') !== (it.name || '')) return;
            if (!weak) weak = l;
            if (!strong && (l.pack || '') === (it.pack || '')) strong = l;
        });
        var l = strong || weak;
        return l ? { lid: l.id, price: l.price, min: l.min, pack: l.pack, exact: !!strong } : null;
    }

    /* ═══ رندر لیست (۲۲) ═══ */
    /* FD-23 — زیرمتن پیشنهاد: سه شکل — تک‌قلم قدیمی / چندقلمی
       (items[]) / «فقط درخواست» (bare). */
    function propSubHtml(p) {
        if (p.items && p.items.length) {
            return '<span style="color: var(--amber); font-weight: 700;">پیشنهاد تامین: ' +
                faNum(p.items.length) + ' قلم — ' +
                p.items.map(function (i) { return esc(i.name); }).join(' · ') + '</span>';
        }
        if (p.bare || (!p.items && !p.good)) {
            return '<span style="color: var(--amber); font-weight: 700;">درخواست تامین‌کنندگی — بدون قلم قیمت</span>';
        }
        return '<span style="color: var(--amber); font-weight: 700;">پیشنهاد تامین: ' + esc(p.good) +
            ' — ' + moneyFmt(p.price) + ' تومان</span>';
    }
    function rowHtml(s) {
        var isNew = !!s.isNew;
        var verified = s.verified
            ? ' <svg style="width: 14px; height: 14px; color: var(--blue);"><use href="#i-verified"/></svg>'
            : '';
        /* زیرمتن: پیشنهاد تامین او (اگر جدید) یا معرفی معمول */
        var sub = isNew && s.proposal
            ? propSubHtml(s.proposal)
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
        var p = s.proposal || null;
        s.proposal = null;
        suppliersRender();
        /* FD-19/FD-23: اگر کالاهای پیشنهادیِ او در لیست خرید هست،
           شمار تأمین‌کننده‌های همان کالاها زنده می‌شود (حلقهٔ لیست ←
           شبکه). سه شکل پیشنهاد را پوشش می‌دهد: تک‌قلم قدیمی،
           چندقلمی (items[]) و فقط‌درخواست (بدون قلم — چیزی بالا
           نمی‌رود؛ رابطه با مرور کاتالوگ طرف محقق می‌شود). هر
           کالای لیست فقط یک‌بار شمارش می‌شود (ضد دوبار‌بودن). */
        var names = [];
        if (p) {
            if (p.items && p.items.length) {
                p.items.forEach(function (i) { names.push(i.name); });
            } else if (p.good) {
                names.push(p.good);
            }
        }
        if (names.length) {
            var bumped = {};
            (core.data.shoppingList || []).forEach(function (it) {
                if (bumped[it.id]) return;
                var hit = names.some(function (n) { return (it.name || '').indexOf(n) > -1; });
                if (hit) {
                    it.suppliersCount = (it.suppliersCount || 0) + 1;
                    bumped[it.id] = true;
                }
            });
            if (core.getCurrentScreen() === 's-buy-list' && core.forms && core.forms.buyListRender) {
                core.forms.buyListRender();
                buyListProposalsRender();
            }
        }
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

        /* در انتظار تایید + پیشنهاد تامین او — فقط تأمین‌کنندهٔ جدید
           FD-23: سه شکل — تک‌قلم قدیمی / چندقلمی (items[]) /
           فقط‌درخواست (bare — «قلم و قیمتی نفرستاده»). */
        var pend = $('#sv-pending');
        if (pend) {
            if (s.isNew) {
                var p = s.proposal || {};
                var pTx = '';
                if (p.items && p.items.length) {
                    pTx = '<div class="sv-prop">' +
                        p.items.map(function (i) {
                            return '<div class="sv-prop-tx"><b>' + esc(i.name) + ' — ' + moneyFmt(i.price) + ' تومان</b>' +
                                '<span>' + esc(i.pack || '') + (i.min ? ' · حداقل ' + faNum(i.min) : '') + '</span></div>';
                        }).join('') +
                        (p.msg ? '<div class="sv-prop-msg">' + esc(p.msg) + '</div>' : '') +
                      '</div>';
                } else if (p.good) {
                    pTx = '<div class="sv-prop">' +
                        '<div class="sv-prop-tx"><b>' + esc(p.good) + ' — ' + moneyFmt(p.price) + ' تومان</b>' +
                        (p.pack ? '<span>' + esc(p.pack) + '</span>' : '') + '</div>' +
                        (p.msg ? '<div class="sv-prop-msg">' + esc(p.msg) + '</div>' : '') +
                      '</div>';
                } else {
                    /* فقط‌درخواست — بدون قلم قیمت (حکم مالک FD-23:
                       قلم‌ها اختیاری‌اند؛ رابطه از راه کاتالوگ محقق
                       می‌شود: خریدار کاتالوگش را می‌بیند و کالاهایش
                       را به لیستش اضافه می‌کند). */
                    pTx = '<div class="sv-prop">' +
                        '<div class="sv-prop-tx"><b>فقط درخواست تامین‌کنندگی — بدون قلم قیمت</b>' +
                        '<span>کاتالوک او را ببین؛ کالاهایش را از همین‌جا به لیستت اضافه کن</span></div>' +
                        (p.msg ? '<div class="sv-prop-msg">' + esc(p.msg) + '</div>' : '') +
                      '</div>';
                }
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

    /* ═══ FD-22 — رندر دید عمومی لیست خرید (۳۲) ═══ */
    function blgItemByName(name) {
        var out = null;
        BLG.items.forEach(function (it) {
            if (name && (it.name || '').indexOf(name) === 0) out = it;
        });
        return out;
    }

    function blgSync() {
        var sec = $('#s-buy-list-guest');
        if (!sec) return;
        var params = core.getSCREENParams()['s-buy-list-guest'] || {};
        var other = null;
        if (params.buyer) {
            (core.data.otherBuyLists || []).forEach(function (L) {
                if (L.customerId === params.buyer || L.id === params.buyer) other = L;
            });
        }

        if (other) {
            BLG.other = true;
            BLG.buyer = {
                name: other.business, owner: other.owner, avatar: other.avatar,
                color: other.color,
                meta: other.owner + ' · ' + other.type + ' · ' + other.city + ' · خریدار عمده'
            };
            BLG.items = other.items || [];
            BLG.inq = (other.inq || []).map(function (q) {
                var it = blgItemByName(q.name);
                return { name: q.name, img: q.img, daysLeft: q.daysLeft, offers: q.offers, itemId: it ? it.id : '' };
            });
            BLG.conditions = other.conditions || '';
            BLG.views = other.visits;
            BLG.supsCount = other.suppliersCount;
        } else {
            /* لیست خودم — همان روایت یک کسب‌وکار/دو میز (FD-15) */
            BLG.other = false;
            BLG.buyer = {
                name: 'سوپرمارکت آریا', owner: 'احمد رضایی', avatar: 'آ',
                color: 'var(--stone)',
                meta: 'احمد رضایی · سوپرمارکت · رشت · خریدار عمده'
            };
            BLG.items = (core.data.shoppingList || []).filter(function (it) { return it.businessId === 'b2'; });
            BLG.inq = (core.data.rfqsOut || []).filter(function (r) {
                return r.status === 'current' && r.businessId === 'b2';
            }).map(function (r) {
                var nm = String(r.itemName || '').split(' · ')[0];
                var it = blgItemByName(nm);
                return { name: nm, img: r.img, daysLeft: r.daysLeft, offers: r.offersCount, itemId: it ? it.id : '' };
            });
            BLG.conditions = ((core.data.buyListInfo || {}).conditions) || '';
            BLG.views = 86;
            BLG.supsCount = (core.data.suppliers || []).filter(function (s) {
                return s.businessId === 'b2' && !s.isNew;
            }).length;
        }

        /* ═══ FD-23 — تطبیق کالاهای موردنیازِ طرف با کاتالوک خودم ═══
           مبنای نوار «شما تأمین‌کنندهٔ … هستید» + سورت ردیف‌ها +
           نشان‌ها + pre-fill شیت پیشنهاد. در محصول واقعی این تطبیق
           سمت سرور و روی goodId است و نتیجه‌اش با کاتالوگِ بیننده
           کش می‌شود (جدول match بین دو کسب‌وکار). */
        BLG.match = {};
        BLG.items.forEach(function (it) {
            var m = blgMatchOf(it);
            if (m) BLG.match[it.id] = m;
        });
        blgMatchRender();

        /* hero — هویت صاحب لیست */
        var av = $('#blg-av');
        if (av) { av.textContent = BLG.buyer.avatar; av.style.background = BLG.buyer.color; }
        var nm = $('#blg-nm'); if (nm) nm.textContent = BLG.buyer.name;
        var meta = $('#blg-meta'); if (meta) meta.textContent = BLG.buyer.meta;

        /* آمار زنده */
        var st1 = $('#blg-st-goods'); if (st1) st1.textContent = faNum(BLG.items.length);
        var st2 = $('#blg-st-sups'); if (st2) st2.textContent = faNum(BLG.supsCount);
        var st3 = $('#blg-st-views'); if (st3) st3.textContent = faNum(BLG.views);

        /* لینک شرایط — فقط اگر خریدار نوشته باشد (مینیمال: فقط لینک) */
        var cl = $('#blg-cond-link'); if (cl) cl.hidden = !BLG.conditions;

        /* نوار «افزودن کالاهای این لیست» — فقط لیستِ دیگری (۳۲ از دفتر
           مشتری)؛ لیست خودت را به خودت اضافه نمی‌کنی. */
        var strip = $('#blg-addstrip'); if (strip) strip.hidden = !BLG.other;

        /* کالاهای در حال استعلام — نوار افقی (خالی = مخفی) */
        var inqSec = $('#blg-inq-sec');
        if (inqSec) {
            inqSec.hidden = !BLG.inq.length;
            var inqB = $('#blg-inq-b');
            if (inqB) inqB.textContent = faNum(BLG.inq.length) + ' قیمت‌گیری جاری';
            var inqRow = $('#blg-inq-row');
            if (inqRow) {
                inqRow.innerHTML = BLG.inq.map(function (q) {
                    var days = q.daysLeft === 0 ? 'آخرین روز' : faNum(q.daysLeft) + ' روز';
                    return '<button class="blinq-card" type="button" data-blg-inq="' + esc(q.itemId) + '">' +
                        '<span class="bi-th"><img src="' + esc(q.img) + '" alt=""><span class="bi-days">' + days + '</span></span>' +
                        '<b>' + esc(q.name) + '</b>' +
                        '<small>' + faNum(q.offers || 0) + ' پیشنهاد رسیده</small>' +
                    '</button>';
                }).join('');
            }
        }

        /* ═══ FD-23 — نوار «شما تأمین‌کنندهٔ این کالاهای موردنیاز این
           خریدار هستید» بالاتر از همه رندر شده (blgMatchRender بعد
           از محاسبهٔ تطبیق — حکم مالک: «بیاریم بالا و بصورت نوار
           افقی جداگانه»؛ مینیمال اما گویا). چیپ = کالا + قیمت/حداقل
           من؛ لمس = شیت پیشنهاد با همان کالا پیش‌انتخاب. */

        /* کالاهای موردنیاز — FD-23: ردیف‌های مچ‌شده با کاتالوک من
           بالاتر سورت می‌شوند + نشان «در کاتالوک تو» (حکم مالک:
           «اون کالاها بر اساس کالاهای فروشنده سورت بشه بیاد بالا») */
        var gb = $('#blg-goods-b'); if (gb) gb.textContent = faNum(BLG.items.length) + ' کالا';
        var host = $('#blg-rows');
        if (host) {
            var sorted = BLG.items.slice().sort(function (a, b) {
                return ((BLG.match[b.id] ? 1 : 0) - (BLG.match[a.id] ? 1 : 0));
            });
            host.innerHTML = sorted.length ? sorted.map(function (it) {
                var m = BLG.match[it.id];
                return '<div class="row static blg-row' + (m ? ' blg-matched' : '') + '">' +
                    '<div class="thumb thumb-md"><img src="' + esc(it.img) + '" alt=""></div>' +
                    '<div class="row-body">' +
                        '<div class="row-title">' + esc(it.name) +
                            (m ? ' <span class="badge b-green">در کاتالوک تو</span>' : '') + '</div>' +
                        '<div class="row-sub">' + esc(it.q || it.pack || '') + '</div>' +
                    '</div>' +
                    '<button class="blg-offer" type="button" data-blg-offer="' + esc(it.id) + '">' +
                        '<svg><use href="#i-send"/></svg> پیشنهاد</button>' +
                '</div>';
            }).join('') : '<div class="empty" style="padding: 16px 12px;"><h3>لیست خرید خالی است</h3></div>';
        }

        /* متن‌های شیت پیشنهاد — با نام صاحب لیست (FD-23: قلم اختیاری) */
        var ss = $('#supply-sub');
        if (ss) ss.textContent = 'کالاها را با قیمت و حداقل سفارش انتخاب کن — از کاتالوک خودت خودکار پر می‌شود؛ یا فقط درخواست بده.';
    }

    /* ═══ FD-23 — نوار تطبیق (ms-strip) ═══ */
    function blgMatchRender() {
        var sec = $('#blg-match');
        if (!sec) return;
        var matched = BLG.items.filter(function (it) { return BLG.match[it.id]; });
        if (!matched.length) { sec.hidden = true; return; }
        sec.hidden = false;
        var row = $('#blg-match-row');
        if (row) {
            row.innerHTML = matched.map(function (it) {
                var m = BLG.match[it.id];
                return '<button class="ms-chip" type="button" data-blg-offer="' + esc(it.id) + '">' +
                    '<span class="ms-th"><img src="' + esc(it.img) + '" alt=""></span>' +
                    '<span class="ms-tx"><b>' + esc(it.name) + '</b>' +
                        '<small>' + moneyFmt(m.price) + ' تومان · حداقل ' + faNum(m.min || 1) + '</small></span>' +
                '</button>';
            }).join('');
        }
    }

    /* ═══ شیت «پیشنهاد تامین» — دید عمومی لیست (۳۲) ═══
       FD-22: pre = id کالایی که بیننده روی «پیشنهاد»/چیپِ تطبیق/کارتِ
       استعلام زده — همان کالا پیش‌انتخاب می‌شود (یک لمس کمتر).
       FD-23 (حکم مالک — مفهوم کامل «درخواست تامین»):
         • هر قلمِ انتخابی = قیمت + حداقل سفارش (فیلدها زیر ردیف
           باز می‌شوند — الگوی شیت‌های LP).
         • قلم‌هایی که در کاتالوک خودم هستند خودکار مچ: نشان
           «از کاتالوک تو» + قیمت/حداقل pre-fill «اما همچنان قابل
           ویرایش» (حکم صریح مالک).
         • صفر قلم هم مجاز است: «فقط درخواست تامین‌کنندگی» —
           درخواست به‌عنوان تأمین‌کنندهٔ جدید در دفتر خریدار
           می‌نشیند؛ بدون قیمت، بدون تحمیل.
         • قلم‌های تازه همان لحظه به کاتالوگ خودم هم اضافه
           می‌شوند (اگر good+pack ندارم) — «دیگه نیاز به دکمهٔ
           اضافیِ افزودن به کاتالوگ نیست». */
    function supplyOpen(pre) {
        SUPPLY.sel = {};
        SUPPLY.vals = {};
        if (pre) SUPPLY.sel[pre] = true;
        var form = $('#supply-form'), ok = $('#supply-ok');
        if (form) form.hidden = false;
        if (ok) ok.hidden = true;
        var nEl = $('#supply-note');
        if (nEl) nEl.value = '';
        supplyRender();
        core.openSheet('sheet-supply');
    }

    /* مقادیر pre-fill قلم مچ‌شده (از کاتالوک خودم) */
    function supplyValsOf(id) {
        /* ادغامِ state زنده با pre-fill کاتالوگ: ویرایشِ «فقط قیمت»
           حداقلِ کاتالوکی را نمی‌ریزد (و برعکس)؛ پاک‌کردنِ عمدی فیلد
           ('' خالی) حفظ می‌شود و ناقص می‌ماند — درست همان چیزی که
           کاربر دیده است. */
        var v = SUPPLY.vals[id] || {};
        var m = BLG.match[id];
        var out = { price: v.price, min: v.min };
        if (m) {
            if (out.price == null) out.price = String(m.price || '');
            if (out.min == null) out.min = String(m.min || '');
        }
        return out;
    }

    function supplyRender() {
        var host = $('#supply-goods');
        if (!host) return;
        host.innerHTML = BLG.items.map(function (it) {
            var on = !!SUPPLY.sel[it.id];
            var m = BLG.match[it.id];
            var v = supplyValsOf(it.id);
            /* فیلدها فقط برای قلمِ انتخاب‌شده باز می‌شوند (شیت جمع
               می‌ماند)؛ مقادیر از state زنده می‌آیند تا رندرهای
               بعدی (باز/بسته‌شدن ردیف‌ها) آن‌ها را نریزند. */
            var flds = on
                ? '<div class="sprow-flds">' +
                    '<div class="sprow-f"><label>قیمت هر بسته (تومان)</label>' +
                        '<div class="input"><input data-spg-price="' + esc(it.id) + '" inputmode="numeric" autocomplete="off" value="' + esc(v.price || '') + '" placeholder="مثلاً ۲٬۸۵۰٬۰۰۰" aria-label="قیمت ' + esc(it.name) + '"></div></div>' +
                    '<div class="sprow-f"><label>حداقل سفارش</label>' +
                        '<div class="input"><input data-spg-min="' + esc(it.id) + '" inputmode="numeric" autocomplete="off" value="' + esc(v.min || '') + '" placeholder="مثلاً ۵" aria-label="حداقل سفارش ' + esc(it.name) + '"></div></div>' +
                  '</div>'
                : '';
            return '<div class="sprow-w' + (on ? ' on' : '') + '">' +
                '<div class="sprow' + (on ? ' on' : '') + '" data-spg="' + esc(it.id) + '">' +
                    '<span class="sprow-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4.5 12.5l5 5 10-11"/></svg></span>' +
                    '<div class="thumb thumb-sm"><img src="' + esc(it.img) + '" alt=""></div>' +
                    '<div class="sprow-body">' +
                        '<b>' + esc(it.name) + '</b>' +
                        '<small>' + esc(it.q || it.pack || '') + '</small>' +
                        (m ? '<span class="sprow-mb"><svg><use href="#i-check"/></svg> از کاتالوک تو' +
                            (m.exact ? '' : ' · بستهٔ ' + esc(m.pack || '')) + '</span>' : '') +
                    '</div>' +
                '</div>' + flds +
            '</div>';
        }).join('');
        supplyBtnSync();
    }

    /* اقلام انتخاب‌شده + مقادیرشان (از state یا تطبیق کاتالوک) */
    function supplyPicked() {
        var out = [];
        Object.keys(SUPPLY.sel).forEach(function (k) {
            if (!SUPPLY.sel[k]) return;
            var it = BLG.items.filter(function (x) { return x.id === k; })[0];
            if (!it) return;
            var v = supplyValsOf(k);
            out.push({ id: k, item: it, price: String(v.price || ''), min: String(v.min || '') });
        });
        return out;
    }

    /* دکمهٔ ارسال — سه حالت (قاعدهٔ مینیمال، بدون توست):
       صفر قلم = «ارسال درخواست تامین‌کنندگی» (روشن) · ناقص =
       خاموش + «قیمت و حداقل n کالا را وارد کن» · کامل = «ارسال
       پیشنهاد تامین — n قلم». */
    function supplyBtnSync() {
        var picked = supplyPicked();
        var missing = picked.filter(function (p) {
            return !core.parseNum(p.price) || !core.parseNum(p.min);
        }).length;
        var btn = $('#supply-send'), tx = $('#supply-send-tx');
        if (btn) btn.disabled = missing > 0;
        if (tx) {
            if (!picked.length) tx.textContent = 'ارسال درخواست تامین‌کنندگی';
            else if (missing) tx.textContent = 'قیمت و حداقل ' + faNum(missing) + ' کالا را وارد کن';
            else tx.textContent = 'ارسال پیشنهاد تامین — ' + faNum(picked.length) + ' قلم';
        }
    }

    function supplyToggle(id) {
        SUPPLY.sel[id] = !SUPPLY.sel[id];
        /* باز/بسته‌شدن فیلدها = رندر دوباره (مقادیر از state زنده
           برمی‌گردند — SUPPLY.vals) */
        supplyRender();
    }

    function supplySend() {
        var picked = supplyPicked();
        var missing = picked.filter(function (p) {
            return !core.parseNum(p.price) || !core.parseNum(p.min);
        }).length;
        /* نگهبان دفاعی — دکمه خودش خاموش می‌شود؛ برای پیاده‌سازی
           واقعی: اعتبارسنجی سمت سرور با همین قاعده. */
        if (missing) { toast('قیمت و حداقل ' + faNum(missing) + ' کالا را وارد کن', 'error'); return; }

        /* تصمیم محصول ۵/۹ (FD-22): ضدفیلتر پیشنهاد — هر تأمین‌کننده
           برای هر لیست فقط یک پیشنهادِ باز در پنجرهٔ ۷ روزه دارد؛
           تکرار = «نتیجه را صبر کن» (نه رکورد تازه). در محصول
           واقعی: قید یکتایی supplier×list در پنجرهٔ زمانی. */
        var hasOpen = (core.data.suppliers || []).some(function (s) {
            return s.isNew && s.name === 'توزیع آفتاب';
        });
        if (hasOpen) {
            toast('پیشنهاد بازِ تو هنوز پیش این خریدار است — نتیجه را صبر کن یا منتظرش بمان', 'error');
            return;
        }

        var note = (($('#supply-note') || {}).value || '').trim();
        var items = picked.map(function (p) {
            return {
                name: p.item.name,
                pack: p.item.pack || '',
                price: core.parseNum(p.price) || 0,
                min: core.parseNum(p.min) || 1,
                img: p.item.img || '',
                packCount: p.item.packCount,
                groupId: p.item.groupId,
                baseUnit: p.item.baseUnit
            };
        });

        /* ═══ FD-23 — قلم‌های تازه به کاتالوک خودم (حکم مالک:
           «ضمن اینکه اینها رو خریدار می‌بینه به کاتالوگشم اضافه
           بشه — یعنی اگر وجود نداره اضافه بشه») ═══
           ضدتکرار روی نام+بسته (همان قاعدهٔ lpInList)؛ مچ‌شده‌ها
           دست نمی‌خورند (فقط پیشنهاد). در محصول واقعی: ایجاد
           listing زیر businessId من با good/pack تطبیق‌یافته — قیمت
           اولیه همین قیمت پیشنهادی، قابل ویرایش از کاتالوگ. */
        var catAdded = 0;
        items.forEach(function (it) {
            var dup = myCatalog().some(function (l) {
                return (l.name || '') === it.name && (l.pack || '') === it.pack;
            });
            if (dup) return;
            var packCount = it.packCount || 1;
            core.data.listings.push({
                id: 'l-' + Date.now() + '-' + (++catAdded),
                businessId: ((core.data.user || {}).activeBusinessId) || 'b1',
                name: it.name, brand: '',
                pack: it.pack, packCount: packCount,
                groupId: it.groupId || 'cgr1',
                baseUnit: it.baseUnit || 'واحد',
                price: it.price,
                pricePerUnit: Math.round(it.price / (packCount || 1)),
                stock: 20, min: it.min, img: it.img || 'png/goods/rice-sack.jpg',
                status: 'in-stock', priceValidDays: 3,
                justAdded: true
            });
        });
        var catNew = catAdded;

        /* FD-19/FD-23: پیشنهاد واقعاً ثبت می‌شود — تک‌قلم/چندقلمی/
           فقط‌درخواست (bare)؛ بالای لیست خرید خریدار می‌نشیند و
           اعلان می‌رود. نام خریدار از بافت (خودم/نیما). */
        core.data.suppliers = core.data.suppliers || [];
        core.data.suppliers.push({
            id: 'su' + (core.data.suppliers.length + 10),
            businessId: 'b2',
            name: 'توزیع آفتاب', person: 'فرهاد آفتابی', city: 'رشت',
            avatar: 'ت', color: '#B45309', verified: false, isNew: true,
            industry: 'پخش مواد غذایی', phone: '۰۹۱۱ ۵۵۵ ۲۲۰۰', since: 'هم‌اکنون', note: '',
            goods: items.length ? items.map(function (i) { return i.name; }).join(' · ') : '',
            proposal: items.length
                ? { items: items, msg: note || 'از لینک لیست خریدت قیمت دادم.' }
                : { items: [], bare: true, msg: note || '' }
        });
        if (core.forms && core.forms.pushNotify) {
            core.forms.pushNotify({
                type: 'supply',
                title: items.length ? 'پیشنهاد تامین جدید' : 'درخواست تامین‌کنندگی جدید',
                body: items.length
                    ? '«توزیع آفتاب» برای ' + faNum(items.length) + ' قلم کالا قیمت داد — بالای لیست خریدت.'
                    : '«توزیع آفتاب» درخواست تامین‌کنندگی داد — بدون قلم قیمت؛ کاتالوگش را می‌بینی.',
                link: 's-buy-list'
            });
        }
        if (core.getCurrentScreen() === 's-buy-list') buyListProposalsRender();
        if (core.getCurrentScreen() === 's-buy-suppliers') suppliersRender();
        /* شمار کاتالوگ میز فروش (۰۴/۰۵/۱۳) در نمایش بعدی زنده
           می‌شود — رندرها show-hook هستند و listings را می‌خوانند. */

        var form = $('#supply-form'), ok = $('#supply-ok');
        if (form) form.hidden = true;
        if (ok) ok.hidden = false;
        var ttl = $('#supply-ok-ttl'), sub = $('#supply-ok-sub');
        if (ttl) ttl.textContent = items.length ? 'پیشنهاد تامینت ارسال شد' : 'درخواست تامین‌کنندگی‌ات ارسال شد';
        if (sub) {
            sub.textContent = items.length
                ? BLG.buyer.name + ' ' + faNum(items.length) + ' قلم قیمتت را یک‌جا می‌بیند' +
                  (catNew ? ' — ' + faNum(catNew) + ' کالای تازه هم به کاتالوگت اضافه شد' : '') +
                  '؛ با تاییدش جزو تأمین‌کننده‌هایش می‌شوی.'
                : BLG.buyer.name + ' درخواستت را می‌بیند؛ با تاییدش جزو تأمین‌کننده‌هایش می‌شوی و کاتالوگت را ذخیره می‌کند.';
        }
    }

    /* ═══ FD-22 — شیت «شرایط درخواست تامین» ═══
       متن آزاد خریدار (جدا شده با «·») → ردیف‌های تیک‌دار — خواناتر
       از دیوار متن، همان قید «متن ساده اما کاربردی». */
    function condOpen() {
        var sub = $('#cond-sub');
        if (sub) sub.textContent = 'شرایط ' + BLG.buyer.name + ' برای تأمین‌کننده‌ها — قبل از پیشنهاد دادن بخوان.';
        var body = $('#cond-body');
        if (body) {
            var parts = String(BLG.conditions || '').split('·')
                .map(function (s) { return s.trim(); })
                .filter(function (s) { return s; });
            body.innerHTML = parts.length
                ? parts.map(function (p) {
                    return '<div class="cond-row"><svg><use href="#i-check"/></svg><span>' + esc(p) + '</span></div>';
                }).join('')
                : '<div class="empty" style="padding: 14px 8px;"><h3>شرایطی ننوشته</h3></div>';
        }
        core.openSheet('sheet-cond');
    }

    /* ═══ FD-22/FD-23 — شیت «افزودن به لیست خرید من» (sheet-listpick) ═══
       FD-23: تک‌مقصد شد — مقصد «به کاتالوگ من» حذف شد چون قلم‌های
       پیشنهاد تامین خودشان به کاتالوگ می‌نشینند (supplySend). */
    function listpickOpen() {
        LP.sel = {}; LP.q = '';
        var s = $('#lp-search'); if (s) s.value = '';
        lpRender();
        core.openSheet('sheet-listpick');
    }

    function lpInList(it) {
        return (core.data.shoppingList || []).some(function (s) {
            return s.businessId === 'b2' && s.name === it.name && s.pack === it.pack;
        });
    }

    function lpRender() {
        var host = $('#lp-rows');
        if (!host) return;
        var items = BLG.items.filter(function (it) {
            return !LP.q || (it.name || '').indexOf(LP.q) > -1;
        });
        host.innerHTML = items.length ? items.map(function (it) {
            var sel = !!LP.sel[it.id];
            var inList = lpInList(it);
            return '<div class="pl-row' + (sel ? ' on' : '') + (inList ? ' in-list' : '') + '"' +
                (inList ? '' : ' data-lp-item="' + esc(it.id) + '"') + '>' +
                '<span class="pl-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4.5 12.5l5 5 10-11"/></svg></span>' +
                '<div class="pl-th"><img src="' + esc(it.img) + '" alt=""></div>' +
                '<div class="pl-tx"><b>' + esc(it.name) + '</b><small>' + esc(it.q || it.pack || '') + '</small></div>' +
                (inList ? '<span class="pl-inlist"><span class="badge b-green">در لیست هست</span></span>' : '') +
            '</div>';
        }).join('') : '<div class="pl-empty">کالایی با این جستجو پیدا نشد</div>';
        lpBtnSync();
    }

    function lpBtnSync() {
        var n = 0;
        Object.keys(LP.sel).forEach(function (k) { if (LP.sel[k]) n++; });
        var btn = $('#lp-add'), tx = $('#lp-add-tx');
        if (btn) btn.disabled = n === 0;
        if (tx) tx.textContent = n ? 'افزودن ' + faNum(n) + ' کالا به لیست خرید' : 'افزودن به لیست خرید';
    }

    function lpToggle(id) {
        LP.sel[id] = !LP.sel[id];
        lpRender();
    }

    function lpAdd() {
        var ids = Object.keys(LP.sel).filter(function (k) { return LP.sel[k]; });
        if (!ids.length) return;
        var added = 0;
        ids.forEach(function (id) {
            var it = BLG.items.filter(function (x) { return x.id === id; })[0];
            if (!it || lpInList(it)) return;
            core.data.shoppingList.push({
                id: 'sl-' + Date.now() + '-' + id,
                businessId: 'b2', name: it.name, pack: it.pack,
                q: it.q || '', img: it.img,
                suppliersCount: 0, added: true
            });
            added++;
        });
        core.closeSheet('sheet-listpick');
        if (added) {
            toast(faNum(added) + ' کالا به لیست خریدت اضافه شد', 'success');
        } else {
            toast('این کالاها از قبل در لیست خریدت هستند', 'error');
        }
    }

    /* ═══ FD-22 — شیت ویرایش شرایط (۲۰) — سمت خریدار ═══ */
    function buycondOpen() {
        var ta = $('#buycond-text');
        if (ta) ta.value = ((core.data.buyListInfo || {}).conditions) || '';
        core.openSheet('sheet-buycond');
    }

    function buycondSave() {
        core.data.buyListInfo = core.data.buyListInfo || { businessId: 'b2' };
        core.data.buyListInfo.conditions = (($('#buycond-text') || {}).value || '').trim();
        core.closeSheet('sheet-buycond');
        toast(core.data.buyListInfo.conditions
            ? 'شرایط تامین ذخیره شد — بینندهٔ لیستت لینکش را می‌بیند'
            : 'شرایط پاک شد — لینک «شرایط» در صفحهٔ لیستت دیده نمی‌شود', 'success');
        if (core.getCurrentScreen() === 's-buy-list-guest') blgSync();
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

        /* ═══ شیت پیشنهاد تامین (۳۲) — FD-22: همهٔ درها یک جا ═══
           دکمهٔ مینیمال بالا (#supply-propose — همان id از FD-19 برای
           رگرسیون)، دکمهٔ چسبان پایین و دکمهٔ انتهای شیت شرایط —
           همه data-supply-open. FD-23: چیپ‌های نوار تطبیق هم با
           data-blg-offer به همین جا می‌رسند (پیش‌انتخاب). */
        if (t.closest('[data-supply-open]') || t.closest('#supply-propose')) { supplyOpen(); return; }
        if (t.closest('#supply-send')) { supplySend(); return; }
        /* ردیف قلم — فیلدهای قیمت/حداقل زیر ردیف‌اند (خارج از
           .sprow) پس کلیک روی آن‌ها به این‌جا نمی‌رسد. */
        var spRow = t.closest('.sprow');
        if (spRow) { supplyToggle(spRow.dataset.spg); return; }

        /* ═══ FD-22 — ۳۲: پیشنهاد برای یک کالا (پیش‌انتخاب) ═══ */
        var blgOff = t.closest('[data-blg-offer]');
        if (blgOff) { supplyOpen(blgOff.dataset.blgOffer); return; }
        var blgInq = t.closest('[data-blg-inq]');
        if (blgInq) { supplyOpen(blgInq.dataset.blgInq); return; }

        /* گفتگو با صاحب لیست (نوار پایین ۳۲ — حکم فعال‌سازی پیام) */
        if (t.closest('[data-blg-chat]')) {
            core.go('s-chat', { about: 'لیست خرید ' + ((BLG.buyer || {}).name || '') });
            return;
        }

        /* شیت شرایط درخواست تامین */
        if (t.closest('#blg-cond-link')) { condOpen(); return; }

        /* ═══ FD-22/FD-23 — شیت افزودن کالاهای این لیست (تک‌مقصد) ═══ */
        if (t.closest('#blg-addstrip')) { listpickOpen(); return; }
        var lpRow = t.closest('[data-lp-item]');
        if (lpRow) { lpToggle(lpRow.dataset.lpItem); return; }
        if (t.closest('#lp-add')) { lpAdd(); return; }

        /* ═══ FD-22 — ویرایش شرایط تامین (۲۰) ═══ */
        if (t.closest('#buylist-cond')) { buycondOpen(); return; }
        if (t.closest('#buycond-save')) { buycondSave(); return; }
    });

    /* ═══ حلقهٔ input ═══ */
    document.addEventListener('input', function (e) {
        var t = e.target;
        if (!t) return;
        if (t.id === 'sup-search') {
            SUP.q = t.value;
            suppliersRender();
        }
        /* FD-23 — قیمت/حداقل شیت پیشنهاد: در state زنده ذخیره
           (رندرهای بعدی — باز/بسته‌شدن ردیف‌ها — مقدار را از state
           می‌خوانند، نمی‌ریزد) + هم‌گام‌سازی دکمهٔ ارسال. */
        if (t.dataset && (t.dataset.spgPrice || t.dataset.spgMin)) {
            var sid = t.dataset.spgPrice || t.dataset.spgMin;
            SUPPLY.vals[sid] = SUPPLY.vals[sid] || {};
            if (t.dataset.spgPrice) SUPPLY.vals[sid].price = t.value;
            else SUPPLY.vals[sid].min = t.value;
            supplyBtnSync();
        }
        /* FD-22 — جستجوی شیت listpick */
        if (t.id === 'lp-search') {
            LP.q = t.value;
            lpRender();
        }
    });

    /* ═══ FD-19 — «پیشنهادهای تامین» بالای لیست خرید (صفحهٔ ۲۰) ═══
       حکم مالک: «پیشنهاد تامین در لیست خرید بهتره اون بالا باشه که
       جلوی چشم باشه، نه زیر کالاها که دیده نشه» — کارت‌های پیشنهاد
       رسیده (suppliers با isNew+proposal) بالای کالاها رندر می‌شوند؛
       تایید/حذف همان منطق دفتر تأمین‌کنندگان (۲۲) است — دو درِ یکی.
       خالی = کل بخش مخفی (لیست تمیز می‌ماند).
       FD-23: بدنهٔ کارت سه شکل دارد — تک‌قلم قدیمی (blp-good)،
       چندقلمی (items[] → ردیف‌های قیمت/حداقل) و فقط‌درخواست
       (bare — بدون قیمت؛ خریدار با تایید فقط رابطه را می‌سازد). */
    function buyListProposalsRender() {
        var host = $('#bl-proposals');
        if (!host) return;
        var props = (core.data.suppliers || []).filter(function (s) { return s.isNew && s.proposal; });
        if (!props.length) { host.innerHTML = ''; host.hidden = true; return; }
        host.hidden = false;
        var cards = props.map(function (s) {
            var p = s.proposal;
            var body = '';
            if (p.items && p.items.length) {
                body = '<div class="blp-items">' + p.items.map(function (i) {
                    return '<div class="blp-it">' +
                        '<span class="blp-g">' + esc(i.name) + ' <small>' + esc(i.pack || '') + '</small></span>' +
                        '<span class="blp-it-min">حداقل ' + faNum(i.min || 1) + '</span>' +
                        '<span class="blp-p">' + moneyFmt(i.price) + ' <small>تومان</small></span>' +
                    '</div>';
                }).join('') + '</div>';
            } else if (p.bare || !p.good) {
                body = '<div class="blp-bare">فقط درخواست تامین‌کنندگی — قلم و قیمتی نفرستاده؛ با تایید، تأمین‌کننده‌ات می‌شود و کاتالوگش را می‌بینی.</div>';
            } else {
                body = '<div class="blp-good">' +
                    '<span class="blp-g">' + esc(p.good) + ' <small>' + esc(p.pack || '') + '</small></span>' +
                    '<span class="blp-p">' + moneyFmt(p.price) + ' <small>تومان</small></span>' +
                '</div>';
            }
            return '<div class="blp-card">' +
                '<div class="blp-head">' +
                    '<div class="avatar" style="background:' + (s.color || '#7c3aed') + '">' + esc(s.avatar || (s.name || '؟').charAt(0)) + '</div>' +
                    '<div class="blp-tx"><b>' + esc(s.name) + '</b><small>' + esc(s.city || '') + ' <span class="dot">·</span> ' + esc(s.industry || '') + '</small></div>' +
                    '<span class="badge b-amber">پیشنهاد تامین</span>' +
                '</div>' +
                body +
                (p.msg ? '<div class="blp-msg">' + esc(p.msg) + '</div>' : '') +
                '<div class="blp-act">' +
                    '<button class="btn btn-arm btn-sm" type="button" data-sup-accept="' + esc(s.id) + '">' +
                        '<svg><use href="#i-check"/></svg> تایید و افزودن به تأمین‌کنندگانم</button>' +
                    '<button class="btn btn-outline btn-sm" type="button" data-sup-reject="' + esc(s.id) + '" style="color: var(--red); border-color: #F3C1C1;">' +
                        '<svg><use href="#i-x"/></svg> حذف</button>' +
                '</div>' +
            '</div>';
        }).join('');
        host.innerHTML =
            '<div class="section-title" style="margin-top: 0;"><h2><svg style="width:14px;height:14px;color:var(--amber)"><use href="#i-sparkles"/></svg> پیشنهادهای تامین <span class="st-b">' + faNum(props.length) + ' پیشنهاد — بالای لیست، جلوی چشم</span></h2></div>' +
            cards;
    }

    /* ═══ Hooks ═══ */
    core.registerShowHook('s-buy-suppliers', suppliersRender);
    core.registerShowHook('s-supplier-view', svRender);
    core.registerShowHook('s-buy-list', buyListProposalsRender);
    /* FD-22 — رندر بافت‌محور دید عمومی لیست خرید (خودم/نیما) */
    core.registerShowHook('s-buy-list-guest', blgSync);

    /* ═══ Expose ═══ */
    core.suppliers = {
        SUP: SUP,
        BLG: BLG,
        render: suppliersRender,
        accept: supAccept,
        reject: supReject,
        viewRender: svRender,
        supplyOpen: supplyOpen,
        openCatalog: openCatalog,
        buyListProposalsRender: buyListProposalsRender,
        blgSync: blgSync,
        condOpen: condOpen,
        listpickOpen: listpickOpen,
        buycondOpen: buycondOpen,
        buycondSave: buycondSave
    };
})();
