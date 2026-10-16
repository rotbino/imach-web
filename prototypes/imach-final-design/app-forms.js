/* ═════════════════════════════════════════════════════════════════
   iMach — Forms
   ─────────────────────────────────────────────────────────────────
   مسئول:
     • فرم افزودن محصول (ADD) — سه گام
     • ثبت کالای جدید و برند جدید
     • ویرایش پروفایل کاربر
     • امتیاز فعالیت (فروش / خرید)
     • پیام تشویق در صفحهٔ تأمین‌کنندگان یک کالا
     • حالت مهمان و pick مخاطبین
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
    var ADD = {
        step: 1,
        goodId: null,
        brandFilter: null,
        mode: null,             /* 'ref' | 'new' */
        refId: null,
        selectedPackId: null,
        newProduct: { title: '', brandId: null, img: null },
        lastQuery: ''
    };
    var PROFILE = { firstName: 'احمد', lastName: 'رضایی', photo: 'png/users/me.jpg' };

    var DEFAULT_GOODS = ['g1', 'g3', 'g4', 'g2'];
    var DEFAULT_REFS  = ['r1', 'r3', 'r6', 'r2'];

    /* ═══ Helpers ═══ */
    function findGood(id)  { return core.data.goods.find(function (g) { return g.id === id; }); }
    function findBrand(id) { return core.data.brands.find(function (b) { return b.id === id; }); }
    function findRef(id)   { return core.data.references.find(function (r) { return r.id === id; }); }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ═══════════════════════════════════════════════════════════════
       امتیاز فعالیت — محاسبه
       ═══════════════════════════════════════════════════════════════ */
    function scoreCalc(items) {
        var t = 0;
        (items || []).forEach(function (it) { if (it.done) t += it.pts; });
        return t;
    }
    function scoreMax(items) {
        var t = 0;
        (items || []).forEach(function (it) { t += it.pts; });
        return t || 100;
    }
    function scoreCardHtml(it, done) {
        return '<div class="score-row' + (done ? ' done' : '') + '">' +
            '<div class="ic"><svg><use href="#i-' + (done ? 'check' : 'clock') + '"/></svg></div>' +
            '<div class="tx"><b>' + esc(it.title) + '</b><span>' + esc(it.sub) + '</span></div>' +
            '<div class="pts">+' + faNum(it.pts) + '</div>' +
            '</div>';
    }

    /* ═══════════════════════════════════════════════════════════════
       صفحهٔ امتیاز — روایت «شبکه بساز، شتاب بگیر»
       ═══════════════════════════════════════════════════════════════ */
    function scoreRender() {
        var params = core.getSCREENParams()['s-network-score'] || {};
        var arm = params.arm || core.getLastRealArm();
        if (arm !== 'buy') arm = 'sell';
        var isSell = (arm === 'sell');

        var items = isSell ? core.data.scoreItemsSell : core.data.scoreItemsBuy;
        var score = scoreCalc(items);
        var max = scoreMax(items);

        /* TTL / SUB */
        var ttl = $('#sc-ttl');
        if (ttl) ttl.innerHTML = (isSell ? 'امتیاز فعالیت فروش' : 'امتیاز فعالیت خرید') +
            '<small>' + (isSell ? 'شبکهٔ فروشت را بساز' : 'شبکهٔ تأمینت را بساز') + '</small>';

        /* Hero */
        var num = $('#sc-num');
        if (num) num.textContent = faNum(score);

        var heroT = $('#sc-hero-t');
        if (heroT) heroT.textContent = isSell ? 'امتیاز فعالیت فروش' : 'امتیاز فعالیت خرید';

        var heroP = $('#sc-hero-p');

        if (heroP) {
            if (score >= 100) {
                heroP.textContent = isSell
                    ? '🎉 موتور شتاب‌دهنده آیمچ فعال شده! کالاهایت به خریداران هدف معرفی می‌شوند تا مشتریان تازه‌ای پیدا کنی و شبکه فروشت را گسترش بدهی.'
                    : '🎉 موتور شتاب‌دهنده آیمچ فعال شده! تأمین‌کنندگان مناسب بیشتری به تو معرفی می‌شوند تا انتخاب‌های بیشتری داشته باشی و راحت‌تر خرید کنی.';
            } else {
                heroP.textContent = isSell
                    ? 'کاتالوگت را کامل کن، مشتریان واقعی‌ات را دعوت کن و با فعالیت تجاری امتیاز بگیر. با رسیدن به ۱۰۰ امتیاز، موتور شتاب‌دهنده آیمچ فعال می‌شود و به تو کمک می‌کند مشتریان تازه‌ای پیدا کنی.'
                    : 'لیست خریدت را کامل کن، تأمین‌کنندگان واقعی‌ات را دعوت و کاتالوگ آنها را ذخیره کن و با فعالیت تجاری امتیاز بگیر. با رسیدن به ۱۰۰ امتیاز، موتور شتاب‌دهنده آیمچ فعال می‌شود و تأمین‌کنندگان مناسب بیشتری به تو معرفی می‌کند.';
            }
        }


        var bar = $('#sc-bar');
        if (bar) bar.style.width = Math.min(100, Math.round(score / max * 100)) + '%';

        /* Lists */
        var done = items.filter(function (it) { return it.done; });
        var todo = items.filter(function (it) { return !it.done; });

        var elDone = $('#sc-done');
        if (elDone) elDone.innerHTML = done.length
            ? done.map(function (it) { return scoreCardHtml(it, true); }).join('')
            : '<div class="empty" style="padding:14px;font-size:12px">هنوز کاری انجام نداده‌ای</div>';

        var elTodo = $('#sc-todo');
        if (elTodo) elTodo.innerHTML = todo.length
            ? todo.map(function (it) { return scoreCardHtml(it, false); }).join('')
            : '<div class="empty" style="padding:14px;font-size:12px">همهٔ کارها انجام شده — عالی!</div>';

        var wrapDone = $('#sc-done-wrap'); if (wrapDone) wrapDone.hidden = !done.length;
        var wrapTodo = $('#sc-todo-wrap'); if (wrapTodo) wrapTodo.hidden = !todo.length;
    }

    /* ═══════════════════════════════════════════════════════════════
       امتیاز در کارت وضعیت کاتالوگ و لیست خرید
       ═══════════════════════════════════════════════════════════════ */
    function _scoreRingSync(score, ringSel, numSel) {
        var pct = Math.min(100, score) / 100;
        var ring = $(ringSel);
        if (ring) {
            /* circumference = 2 * π * 18 ≈ 113.1 */
            ring.style.strokeDashoffset = String(113.1 * (1 - pct));
        }
        var num = $(numSel);
        if (num) num.textContent = faNum(score);
    }

    function catalogScoreSync() {
        var sell = scoreCalc(core.data.scoreItemsSell);
        _scoreRingSync(sell, '#cat-score-ring', '#cat-score-num');

        var card = $('#cat-score-card');
        var sub = $('#cat-score-sub');
        var title = $('#cat-score-title');

        if (card) card.classList.toggle('on', sell >= 100);

        if (sell >= 100) {
            if (title) title.textContent = '🎉 شبکهٔ بازت فعال شد';
            if (sub) sub.textContent = 'کالاهایت الان به خریداران هدف نشان داده می‌شود';
        } else {
            if (title) title.textContent = 'امتیاز فعالیت فروش';
            if (sub) sub.textContent = 'شبکه‌ات را بساز — ' + faNum(100 - sell) + ' امتیاز تا شتاب گرفتن';
        }
    }

    function buyListScoreSync() {
        var buy = scoreCalc(core.data.scoreItemsBuy);
        _scoreRingSync(buy, '#buy-score-ring', '#buy-score-num');

        var card = $('#buy-score-card');
        var sub = $('#buy-score-sub');
        var title = $('#buy-score-title');

        if (card) card.classList.toggle('on', buy >= 100);

        if (buy >= 100) {
            if (title) title.textContent = '🎉 شبکهٔ بازت فعال شد';
            if (sub) sub.textContent = 'تأمین‌کنندگان تازه در لیستت پیشنهاد می‌شوند';
        } else {
            if (title) title.textContent = 'امتیاز فعالیت خرید';
            if (sub) sub.textContent = 'شبکه‌ات را بساز — ' + faNum(100 - buy) + ' امتیاز تا شتاب گرفتن';
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       پیام تشویق در صفحهٔ تأمین‌کنندگان یک کالا
       ═══════════════════════════════════════════════════════════════ */
    function bpsRenderCta() {
        var host = $('#bps-cta');
        if (!host) return;
        var count = document.querySelectorAll('#s-buy-product-suppliers .sup-p-card').length;

        if (count === 0) {
            host.innerHTML =
                '<div class="bps-cta">' +
                '<div class="bps-ic"><svg><use href="#i-share"/></svg></div>' +
                '<div class="bps-title">هنوز تأمین‌کننده‌ای این کالا را ندارد</div>' +
                '<div class="bps-tx">لیست خریدت را برای تأمین‌کنندگانت بفرست تا کاتالوگشان را ذخیره کنی و قیمت زنده‌شان همین‌جا بیفتد.</div>' +
                '<button class="btn btn-arm btn-block" data-share-buylist type="button">' +
                '<svg><use href="#i-share"/></svg> اشتراک لیست خرید' +
                '</button>' +
                '</div>';
        } else {
            host.innerHTML =
                '<div class="bps-cta">' +
                '<div class="bps-ic"><svg><use href="#i-users"/></svg></div>' +
                '<div class="bps-title">تأمین‌کننده‌های بیشتری این کالا را دارند؟</div>' +
                '<div class="bps-tx">لیست خریدت را برای تأمین‌کنندگان دیگر هم بفرست تا بتونی از چند نفر قیمت سفارشی بگیری و کنار هم مقایسه کنی.</div>' +
                '<button class="btn btn-outline btn-block" data-share-buylist type="button">' +
                '<svg><use href="#i-share"/></svg> دعوت تأمین‌کننده‌های بیشتر' +
                '</button>' +
                '</div>';
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       فرم افزودن محصول (ADD)
       ═══════════════════════════════════════════════════════════════ */
    function addReset() {
        ADD.step = 1; ADD.goodId = null; ADD.brandFilter = null;
        ADD.mode = null; ADD.refId = null; ADD.selectedPackId = null;
        ADD.newProduct = { title: '', brandId: null, img: null };
        var q = $('#add-q'); if (q) q.value = ADD.lastQuery || '';
        addShowStep(1);
        addRenderStep1();
    }

    function addShowStep(n) {
        ADD.step = n;
        var s1 = $('#add-step-1'), s2 = $('#add-step-2'), s3 = $('#add-step-3');
        var bar = $('#add-bar'), sub = $('#add-sub');
        if (s1) s1.hidden = (n !== 1);
        if (s2) s2.hidden = (n !== 2);
        if (s3) s3.hidden = (n !== 3);
        if (bar) bar.hidden = (n !== 3);
        if (sub) sub.textContent = (n === 1) ? 'چی می‌فروشی؟'
            : (n === 2) ? 'کدام محصول؟'
                : 'بسته‌بندی، قیمت و شرایط فروش';
        var body = document.querySelector('#s-sell-add .body');
        if (body) body.scrollTop = 0;
    }

    function goodRow(g) {
        if (!g) return '';
        return '<button class="pick-row" data-pick-good="' + g.id + '" type="button">' +
            '<div class="thumb"><span style="font-size:24px">' + (g.emoji || '📦') + '</span></div>' +
            '<div class="info"><div class="nm">' + esc(g.name) + '</div>' +
            '<div class="sub">دیدن محصولات این کالا</div></div>' +
            '<div class="chev"><svg><use href="#i-chev"/></svg></div></button>';
    }
    function refRow(r) {
        if (!r) return '';
        var packHint = (r.packs && r.packs.length) ? r.packs.map(function (p) { return p.label; }).join(' · ') : '';
        return '<button class="pick-row" data-pick-ref="' + r.id + '" type="button">' +
            '<div class="thumb">' + (r.img ? '<img src="' + r.img + '" alt="">' : '') + '</div>' +
            '<div class="info"><div class="nm">' + esc(r.name) + '</div>' +
            '<div class="sub">' + esc(r.brand || 'بدون برند') + (packHint ? ' · ' + esc(packHint) : '') + '</div></div>' +
            '<div class="chev"><svg><use href="#i-chev"/></svg></div></button>';
    }
    function groupHtml(title, rows) {
        if (!rows.length) return '';
        return '<div class="pick-group-title" style="margin-top:' + (title ? '8px' : '0') + '">' + title + '</div>' +
            '<div class="pick-group">' + rows.join('') + '</div>';
    }

    function addRenderStep1() {
        var host = $('#add-results');
        if (!host) return;
        var q = (ADD.lastQuery || '').trim();
        var qn = q.toLowerCase();

        var goods = q
            ? core.data.goods.filter(function (g) { return g.name.toLowerCase().indexOf(qn) > -1; })
            : DEFAULT_GOODS.map(findGood).filter(Boolean);
        var refs = q
            ? core.data.references.filter(function (r) {
                return (r.name + ' ' + (r.brand || '')).toLowerCase().indexOf(qn) > -1;
            })
            : DEFAULT_REFS.map(findRef).filter(Boolean);

        if (q && !goods.length && !refs.length) {
            host.innerHTML =
                '<div class="empty" style="padding:22px 16px">' +
                '<div class="empty-ic"><svg><use href="#i-search"/></svg></div>' +
                '<h3>«' + esc(q) + '» پیدا نشد</h3>' +
                '<p>این کالا در فهرست نیست — ثبتش کن تا محصولات این کالا کنار هم مقایسه شوند.</p></div>' +
                '<div style="margin-top:10px">' +
                '<button class="pick-row new" id="add-new-type" type="button">' +
                '<div class="thumb" style="background:var(--primary-soft);color:var(--primary-strong);display:grid;place-items:center">' +
                '<svg style="width:20px;height:20px"><use href="#i-plus"/></svg></div>' +
                '<div class="info"><div class="nm">ثبت «' + esc(q) + '» به‌عنوان کالای جدید</div>' +
                '<div class="sub">بعد از تأیید، برای همه نمایش داده می‌شود</div></div>' +
                '<div class="chev"><svg><use href="#i-chev"/></svg></div></button></div>';
            return;
        }
        var html = '';
        if (refs.length)  html += groupHtml('محصولات', refs.map(refRow));
        if (goods.length) html += groupHtml('کالاها', goods.map(goodRow));
        host.innerHTML = html || '';
    }

    function addPickGood(id) {
        var g = findGood(id); if (!g) return;
        ADD.goodId = id; ADD.brandFilter = null;
        addRenderStep2(); addShowStep(2);
    }
    function refsOfType(typeId) {
        return core.data.references.filter(function (r) { return r.goodId === typeId; });
    }
    function brandsOfType(typeId) {
        var seen = {}, list = [];
        refsOfType(typeId).forEach(function (r) {
            if (r.brandId && !seen[r.brandId]) {
                seen[r.brandId] = true;
                var b = findBrand(r.brandId);
                if (b) list.push(b);
            }
        });
        return list;
    }
    function addRenderStep2() {
        var g = findGood(ADD.goodId); if (!g) return;
        var thumb = $('#add-type-thumb');
        if (thumb) thumb.innerHTML = '<span style="font-size:24px">' + (g.emoji || '📦') + '</span>';
        var nm = $('#add-type-name'); if (nm) nm.textContent = g.name;

        var chipHost = $('#add-brand-chips');
        if (chipHost) {
            var brands = brandsOfType(ADD.goodId);
            var h = '<button class="chip' + (ADD.brandFilter === null ? ' active' : '') +
                '" data-brand-filter="" type="button">همه</button>';
            brands.forEach(function (b) {
                h += '<button class="chip' + (ADD.brandFilter === b.id ? ' active' : '') +
                    '" data-brand-filter="' + b.id + '" type="button">' + esc(b.name) + '</button>';
            });
            chipHost.innerHTML = h;
        }
        var refHost = $('#add-refs');
        if (refHost) {
            var refs = refsOfType(ADD.goodId).filter(function (r) {
                return !ADD.brandFilter || r.brandId === ADD.brandFilter;
            });
            if (!refs.length) {
                refHost.innerHTML =
                    '<div class="empty" style="padding:22px 16px;margin-top:8px">' +
                    '<div class="empty-ic"><svg><use href="#i-store"/></svg></div>' +
                    '<h3>' + (ADD.brandFilter ? 'با این برند محصولی نیست' : 'هنوز محصولی برای این کالا نیست') + '</h3>' +
                    '<p>اولین محصول را ثبت کن — بعد از تأیید، همهٔ فروشنده‌های این محصول مقایسه می‌شوند.</p></div>';
            } else {
                refHost.innerHTML = '<div class="pick-group">' + refs.map(refRow).join('') + '</div>';
            }
        }
    }
    function addPickBrandFilter(id) { ADD.brandFilter = id || null; addRenderStep2(); }

    function clearPrices() {
        var p = $('#add-price'); if (p) p.value = '';
        var up = $('#add-unit-price'); if (up) up.value = '';
        var pl = $('#add-pack-label'); if (pl) pl.value = '';
        var pq = $('#add-pack-qty'); if (pq) pq.value = '';
    }

    function addPickRef(id) {
        var r = findRef(id); if (!r) return;
        if (!ADD.goodId) ADD.goodId = r.goodId;
        ADD.mode = 'ref'; ADD.refId = id;
        ADD.selectedPackId = (r.packs && r.packs.length) ? r.packs[0].id : 'custom';
        clearPrices(); addRenderStep3(); addShowStep(3);
    }

    function addNewProduct() {
        var g = findGood(ADD.goodId); if (!g) return;
        ADD.mode = 'new'; ADD.refId = null; ADD.selectedPackId = 'custom';
        ADD.newProduct = { title: g.name, brandId: null, img: null };
        clearPrices(); addRenderStep3(); addShowStep(3);
    }

    function addRenderStep3() {
        var card = $('#add-final-card'), form = $('#add-new-form'), titleInput = $('#add-title');
        if (ADD.mode === 'ref') {
            var r = findRef(ADD.refId); if (!r) return;
            if (card) card.innerHTML =
                '<div class="thumb">' + (r.img ? '<img src="' + r.img + '" alt="">' : '') + '</div>' +
                '<div class="info"><div class="nm">' + esc(r.name) + '</div>' +
                '<div class="sub">' + esc(r.brand || 'بدون برند') + '</div></div>';
            if (form) form.hidden = true;
        } else if (ADD.mode === 'new') {
            var g2 = findGood(ADD.goodId); if (!g2) return;
            if (card) card.innerHTML =
                '<div class="thumb"><span style="font-size:24px">' + (g2.emoji || '📦') + '</span></div>' +
                '<div class="info"><div class="nm">' + esc(g2.name) + '</div>' +
                '<div class="sub">محصول جدید برای این کالا</div></div>';
            if (form) form.hidden = false;
            if (titleInput && !titleInput.value) titleInput.value = g2.name;
            addUpdateBrandLabel();
        }
        addRenderPackSection();
        addRenderPrices();
    }

    function addUpdateBrandLabel() {
        var label = $('#add-brand-label'); if (!label) return;
        if (!ADD.newProduct.brandId) { label.textContent = 'انتخاب برند'; return; }
        var b = findBrand(ADD.newProduct.brandId);
        label.textContent = b ? b.name : 'انتخاب برند';
    }

    function addRenderPackSection() {
        var chipsHost = $('#add-pack-chips'), customBox = $('#add-pack-custom');
        if (!chipsHost || !customBox) return;
        if (ADD.mode === 'ref') {
            var r = findRef(ADD.refId);
            var packs = (r && r.packs) ? r.packs : [];
            if (packs.length) {
                var h = packs.map(function (p) {
                    return '<button class="chip' + (ADD.selectedPackId === p.id ? ' active' : '') +
                        '" data-pick-pack="' + p.id + '" type="button">' + esc(p.label) + '</button>';
                }).join('');
                h += '<button class="chip' + (ADD.selectedPackId === 'custom' ? ' active' : '') +
                    '" data-pick-pack="custom" type="button">سایر</button>';
                chipsHost.innerHTML = h;
                chipsHost.hidden = false;
                customBox.hidden = (ADD.selectedPackId !== 'custom');
            } else {
                chipsHost.hidden = true;
                chipsHost.innerHTML = '';
                customBox.hidden = false;
                ADD.selectedPackId = 'custom';
            }
        } else if (ADD.mode === 'new') {
            chipsHost.hidden = true;
            chipsHost.innerHTML = '';
            customBox.hidden = false;
            ADD.selectedPackId = 'custom';
        }
    }

    function addPickPack(id) {
        ADD.selectedPackId = id || 'custom';
        addRenderPackSection();
        addRenderPrices();
        var pkgInp = $('#add-price');
        if (pkgInp && parseNum(pkgInp.value) > 0) addSyncPrices('package');
    }

    function addGetPackQty() {
        if (ADD.selectedPackId === 'custom') {
            var inp = $('#add-pack-qty');
            return parseNum(inp && inp.value) || 1;
        }
        if (ADD.mode === 'ref') {
            var r = findRef(ADD.refId);
            if (r && r.packs) {
                var p = r.packs.find(function (x) { return x.id === ADD.selectedPackId; });
                if (p && p.count) return p.count;
            }
        }
        return 1;
    }

    function addGetPackLabel() {
        if (ADD.selectedPackId === 'custom') {
            var inp = $('#add-pack-label');
            return (inp && inp.value.trim()) || 'بسته';
        }
        if (ADD.mode === 'ref') {
            var r = findRef(ADD.refId);
            if (r && r.packs) {
                var p = r.packs.find(function (x) { return x.id === ADD.selectedPackId; });
                if (p) return p.label;
            }
        }
        return 'بسته';
    }

    function addUnitName() {
        if (ADD.mode === 'ref') {
            var r = findRef(ADD.refId);
            if (r) {
                if (r.consumerUnit) return r.consumerUnit;
                var g = findGood(r.goodId);
                if (g && g.consumerUnit) return g.consumerUnit;
            }
        } else if (ADD.mode === 'new') {
            var g2 = findGood(ADD.goodId);
            if (g2 && g2.consumerUnit) return g2.consumerUnit;
        }
        return 'واحد';
    }

    function addRenderPrices() {
        var lbl = $('#add-unit-price-label'), hint = $('#add-unit-hint');
        var qty = addGetPackQty();
        var unitName = addUnitName();
        if (lbl) lbl.textContent = 'قیمت هر ' + unitName;
        if (hint) {
            hint.textContent = qty > 1
                ? 'هر بسته شامل ' + faNum(qty) + ' ' + unitName + ' است — قیمت هر واحد خودکار محاسبه می‌شود.'
                : 'قیمت هر واحد خودکار محاسبه می‌شود.';
        }
        var pkgInp = $('#add-price');
        if (pkgInp && parseNum(pkgInp.value) > 0 && qty > 0) addSyncPrices('package');
    }

    function addSyncPrices(from) {
        var qty = addGetPackQty();
        var pkgInp = $('#add-price'), unitInp = $('#add-unit-price');
        if (!pkgInp || !unitInp || qty < 1) return;
        if (from === 'package') {
            var p = parseNum(pkgInp.value);
            unitInp.value = p > 0 ? faMoney(Math.round(p / qty)) : '';
        } else if (from === 'unit') {
            var u = parseNum(unitInp.value);
            pkgInp.value = u > 0 ? faMoney(u * qty) : '';
        }
    }

    function addOpenNewType(prefill) {
        var inp = $('#new-good-name'); if (inp) inp.value = prefill || '';
        core.openSheet('sheet-new-good');
        setTimeout(function () { if (inp) inp.focus(); }, 100);
    }

    function addSaveNewType() {
        var inp = $('#new-good-name');
        var name = inp ? inp.value.trim() : '';
        if (!name) { toast('نام کالا را وارد کن', 'error'); return; }
        var existing = core.data.goods.find(function (g) { return g.name === name; });
        var g;
        if (existing) { g = existing; }
        else {
            g = {
                id: 'g_' + Date.now(), name: name, emoji: '📦',
                baseUnit: 'واحد', consumerUnit: 'بسته', attrs: []
            };
            core.data.goods.push(g);
        }
        core.closeSheet('sheet-new-good');
        addPickGood(g.id);
    }

    function addOpenBrandSheet() {
        var q = $('#brand-q'); if (q) q.value = '';
        addRenderBrandList('');
        core.openSheet('sheet-pick-brand');
    }

    function addRenderBrandList(query) {
        var host = $('#brand-list'); if (!host) return;
        var q = (query || '').trim().toLowerCase();
        var list = core.data.brands.filter(function (b) {
            return !q || b.name.toLowerCase().indexOf(q) > -1;
        });
        var h = '';
        if (!q || 'بدون برند'.indexOf(q) > -1 || 'فله'.indexOf(q) > -1) {
            h += '<button class="pick-row" data-pick-brand="" type="button">' +
                '<div class="thumb" style="background:var(--surface-2);display:grid;place-items:center">' +
                '<svg style="width:20px;height:20px;color:var(--text-3)"><use href="#i-x"/></svg></div>' +
                '<div class="info"><div class="nm">بدون برند / فله</div>' +
                '<div class="sub">محصول بدون برند مشخص فروخته می‌شود</div></div>' +
                '<div class="chev"><svg><use href="#i-chev"/></svg></div></button>';
        }
        if (!list.length && q) {
            h += '<div class="empty" style="padding:20px 14px">' +
                '<h3>«' + esc(q) + '» پیدا نشد</h3>' +
                '<p>این برند در فهرست نیست.</p></div>';
        } else {
            h += '<div class="pick-group">' + list.map(function (b) {
                return '<button class="pick-row" data-pick-brand="' + b.id + '" type="button">' +
                    '<div class="thumb" style="background:var(--surface-2);display:grid;place-items:center">' +
                    '<svg style="width:20px;height:20px;color:var(--text-3)"><use href="#i-tag"/></svg></div>' +
                    '<div class="info"><div class="nm">' + esc(b.name) + '</div></div>' +
                    '<div class="chev"><svg><use href="#i-chev"/></svg></div></button>';
            }).join('') + '</div>';
        }
        h += '<button class="pick-row new" data-new-brand type="button" style="margin-top:10px">' +
            '<div class="thumb" style="background:var(--primary-soft);color:var(--primary-strong);display:grid;place-items:center">' +
            '<svg style="width:20px;height:20px"><use href="#i-plus"/></svg></div>' +
            '<div class="info"><div class="nm">ثبت برند جدید</div>' +
            '<div class="sub">اگر برندت در فهرست نبود</div></div>' +
            '<div class="chev"><svg><use href="#i-chev"/></svg></div></button>';
        host.innerHTML = h;
    }

    function addPickBrand(id) {
        ADD.newProduct.brandId = id || null;
        addUpdateBrandLabel();
        core.closeSheet('sheet-pick-brand');
    }

    function addOpenNewBrand(prefill) {
        var inp = $('#new-brand-name'); if (inp) inp.value = prefill || '';
        core.closeSheet('sheet-pick-brand');
        setTimeout(function () {
            core.openSheet('sheet-new-brand');
            setTimeout(function () { if (inp) inp.focus(); }, 100);
        }, 320);
    }

    function addSaveNewBrand() {
        var inp = $('#new-brand-name');
        var name = inp ? inp.value.trim() : '';
        if (!name) { toast('نام برند را وارد کن', 'error'); return; }
        var existing = core.data.brands.find(function (b) { return b.name === name; });
        var b;
        if (existing) { b = existing; }
        else { b = { id: 'br_' + Date.now(), name: name }; core.data.brands.push(b); }
        core.closeSheet('sheet-new-brand');
        ADD.newProduct.brandId = b.id;
        addUpdateBrandLabel();
    }

    function addSave() {
        var g = findGood(ADD.goodId);
        if (!g) { toast('کالا انتخاب نشده', 'error'); return; }
        var price = parseNum($('#add-price').value);
        if (!price) { toast('قیمت هر بسته را وارد کن', 'error'); return; }

        var packQty = addGetPackQty();
        if (!packQty || packQty < 1) { toast('تعداد در بسته را وارد کن', 'error'); return; }

        var packLabel = addGetPackLabel();
        var stock = parseNum(($('#add-stock') || {}).value);
        var min = parseNum(($('#add-min') || {}).value) || 1;
        var note = ($('#add-note') || {}).value || '';
        var pricePerUnit = Math.round(price / packQty);

        if (ADD.mode === 'ref' && ADD.selectedPackId === 'custom') {
            var r0 = findRef(ADD.refId);
            if (r0) {
                if (!r0.packs) r0.packs = [];
                var newPack = { id: 'p_' + Date.now(), label: packLabel, count: packQty };
                r0.packs.push(newPack);
                ADD.selectedPackId = newPack.id;
            }
        }

        if (ADD.mode === 'ref') {
            var r = findRef(ADD.refId);
            if (!r) { toast('محصول پیدا نشد', 'error'); return; }
            core.data.listings.push({
                id: 'l_' + Date.now(),
                businessId: core.data.user.activeBusinessId,
                goodId: g.id, refId: r.id,
                packId: ADD.selectedPackId,
                name: r.name, brand: r.brand || '',
                pack: packLabel, packCount: packQty,
                price: price, pricePerUnit: pricePerUnit,
                stock: stock || 0, min: min, note: note,
                img: r.img || null
            });
        } else if (ADD.mode === 'new') {
            var title = ($('#add-title') || {}).value || g.name;
            var brandId = ADD.newProduct.brandId;
            var brandName = brandId ? ((findBrand(brandId) || {}).name || '') : '';

            var newRef = {
                id: 'r_' + Date.now(),
                goodId: g.id, brandId: brandId,
                name: title, brand: brandName,
                packs: [{ id: 'p_' + Date.now(), label: packLabel, count: packQty }],
                img: null, attrs: {}
            };
            core.data.references.push(newRef);

            core.data.listings.push({
                id: 'l_' + Date.now(),
                businessId: core.data.user.activeBusinessId,
                goodId: g.id, refId: newRef.id,
                packId: newRef.packs[0].id,
                name: title, brand: brandName,
                pack: packLabel, packCount: packQty,
                price: price, pricePerUnit: pricePerUnit,
                stock: stock || 0, min: min, note: note,
                img: null
            });
        } else {
            toast('محصول انتخاب نشده', 'error');
            return;
        }

        ADD.lastQuery = '';
        toast('محصول به کاتالوگ اضافه شد', 'success');
        setTimeout(function () {
            core.resetStack();
            core.show('s-catalog', false);
        }, 600);
    }

    /* ═══════════════════════════════════════════════════════════════
       پروفایل
       ═══════════════════════════════════════════════════════════════ */
    function profileSync() {
        $$('[data-profile-name]').forEach(function (el) {
            el.textContent = PROFILE.firstName + ' ' + PROFILE.lastName;
        });
        $$('[data-profile-photo]').forEach(function (el) {
            if (PROFILE.photo) el.innerHTML = '<img src="' + PROFILE.photo + '" alt="">';
            else el.textContent = (PROFILE.firstName || '؟').charAt(0);
        });
        var wrap = $('#profile-photo-wrap');
        if (wrap) {
            if (PROFILE.photo) wrap.innerHTML = '<img src="' + PROFILE.photo + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
            else wrap.textContent = (PROFILE.firstName || '؟').charAt(0);
        }
        var firstInp = $('#profile-firstname'); if (firstInp) firstInp.value = PROFILE.firstName;
        var lastInp = $('#profile-lastname'); if (lastInp) lastInp.value = PROFILE.lastName;
        $$('#sheet-photo-pick .ph-opt').forEach(function (o) {
            o.classList.toggle('on', o.dataset.pphoto === PROFILE.photo);
        });
    }

    function profileOpenEdit() { profileSync(); core.openSheet('sheet-profile-edit'); }

    function profileSave() {
        var fn = ($('#profile-firstname') || {}).value || '';
        var ln = ($('#profile-lastname') || {}).value || '';
        if (!fn.trim()) { toast('نام را وارد کن', 'error'); return; }
        PROFILE.firstName = fn.trim();
        PROFILE.lastName = ln.trim();
        profileSync();
        core.closeSheet('sheet-profile-edit');
        toast('پروفایل ذخیره شد', 'success');
    }

    function profilePickPhoto(value) {
        if (value === 'remove') PROFILE.photo = '';
        else if (value === 'camera') {
            var list = ['png/users/me.jpg', 'png/users/alt-1.jpg', 'png/users/alt-2.jpg'];
            var idx = list.indexOf(PROFILE.photo);
            PROFILE.photo = list[(idx + 1) % list.length];
        } else PROFILE.photo = value;
        profileSync();
        core.closeSheet('sheet-photo-pick');
        toast('تصویر پروفایل تغییر کرد', 'success');
    }

    /* ═══════════════════════════════════════════════════════════════
       Guest / contacts
       ═══════════════════════════════════════════════════════════════ */
    function applyGuestMode() {
        var params = core.getSCREENParams()['s-catalog-guest'] || {};
        var section = $('#s-catalog-guest');
        if (!section) return;
        var isPreview = !!params.preview;
        var banner = section.querySelector('#guest-priv');
        var cards = $$('.pcard.gated', section);
        if (isPreview) {
            if (banner) banner.hidden = true;
            cards.forEach(function (c) { c.classList.remove('gated'); });
        } else {
            if (banner) banner.hidden = false;
            cards.forEach(function (c) { c.classList.add('gated'); });
        }
    }

    function applyContactsMode() { updatePickCount(); }

    function updatePickCount() {
        var n = $$('#contact-list .contact-check.on').length;
        var el = $('#pick-count');
        if (el) el.textContent = faNum(n) + ' نفر انتخاب شده';
        var btn = $('#pick-send');
        if (btn) btn.disabled = (n === 0);
    }

    function markNewItemsSeen() {
        $$('.row-title .b-primary').forEach(function (b) {
            if (b.textContent.trim() === 'جدید') {
                b.className = 'badge b-gray';
                b.textContent = 'دیده‌شده';
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       Hooks
       ═══════════════════════════════════════════════════════════════ */
    core.registerShowHook('s-sell-add', addReset);
    core.registerShowHook('s-catalog-guest', applyGuestMode);
    core.registerShowHook('s-contacts', applyContactsMode);
    core.registerShowHook('s-customers', markNewItemsSeen);
    core.registerShowHook('s-buy-suppliers', markNewItemsSeen);
    core.registerShowHook('s-profile', profileSync);
    core.registerShowHook('s-network-score', scoreRender);
    core.registerShowHook('s-buy-product-suppliers', bpsRenderCta);
    core.registerShowHook('s-catalog', catalogScoreSync);
    core.registerShowHook('s-buy-list', buyListScoreSync);
    core.registerShowHook('s-catalog', catPromoSync);
    core.registerShowHook('s-sell-promo', catPromoSync);
    core.registerShowHook('s-sell-bulk', bulkReset);
    core.registerShowHook('s-charge', chargeSync);

    /* ═══════════════════════════════════════════════════════════════
       Expose
       ═══════════════════════════════════════════════════════════════ */
    core.forms = {
        ADD: ADD, PROFILE: PROFILE,
        findGood: findGood, findBrand: findBrand, findRef: findRef,

        addReset: addReset, addShowStep: addShowStep,
        addRenderStep1: addRenderStep1,
        addRenderStep2: addRenderStep2,
        addRenderStep3: addRenderStep3,
        addPickGood: addPickGood, addPickRef: addPickRef,
        addPickBrandFilter: addPickBrandFilter,
        addNewProduct: addNewProduct,

        addRenderPackSection: addRenderPackSection,
        addPickPack: addPickPack,
        addGetPackQty: addGetPackQty,
        addGetPackLabel: addGetPackLabel,
        addUnitName: addUnitName,
        addRenderPrices: addRenderPrices,
        addSyncPrices: addSyncPrices,

        addOpenNewType: addOpenNewType, addSaveNewType: addSaveNewType,
        addOpenBrandSheet: addOpenBrandSheet,
        addRenderBrandList: addRenderBrandList,
        addPickBrand: addPickBrand,
        addOpenNewBrand: addOpenNewBrand, addSaveNewBrand: addSaveNewBrand,
        addSave: addSave,

        profileSync: profileSync, profileOpenEdit: profileOpenEdit,
        profileSave: profileSave, profilePickPhoto: profilePickPhoto,
        scoreRender: scoreRender,

        bpsRenderCta: bpsRenderCta,

        applyGuestMode: applyGuestMode, applyContactsMode: applyContactsMode,
        updatePickCount: updatePickCount, markNewItemsSeen: markNewItemsSeen,
        catalogScoreSync: catalogScoreSync,
        buyListScoreSync: buyListScoreSync,
        catPromoSync: catPromoSync,
        bulkReset: bulkReset,
        bulkSetPct: bulkSetPct,
        bulkStep: bulkStep,
        bulkManual: bulkManual,
        bulkApply: bulkApply,
        chargeSync: chargeSync,
        chargeSend: chargeSend,
        promoSwitchToggle: promoSwitchToggle,
    };

    /* ═══════════════════════════════════════════════════════════════
   کاتالوگ — ویژه شدن و تبلیغات
   ═══════════════════════════════════════════════════════════════ */
    function catPromoSync() {
        var sell = scoreCalc(core.data.scoreItemsSell);
        var wallet = core.data.user.wallet || 0;
        var on = !!core.data.user.catalogPromo;

        /* باکس کوچک در کاتالوگ */
        var box = $('#promo-box');
        var t = $('#promo-t');
        var s = $('#promo-s');
        var ic = $('#promo-ic');
        if (box) box.classList.toggle('on', on);
        if (t) t.textContent = on ? 'کالاهایت ویژه‌اند' : 'کالاهایت را ویژه کن';
        if (s) {
            if (sell < 100) {
                s.textContent = 'ابتدا به ۱۰۰ امتیاز فعالیت فروش برس';
            } else if (on) {
                s.textContent = 'فعال — در شرایط مشابه بالاتر دیده می‌شوند';
            } else {
                s.textContent = 'در شرایط مشابه، بالاتر دیده می‌شوند';
            }
        }
        if (ic) ic.classList.toggle('on', on);

        /* بج ویژه روی کارت‌های کالا */
        $$('#s-catalog .promo-badge').forEach(function (b) { b.hidden = !on; });

        /* صفحهٔ تبلیغات */
        var sw = $('#promo-switch');
        if (sw) {
            var locked = sell < 100;
            sw.classList.toggle('on', on);
            sw.classList.toggle('locked', locked);
        }
        var sub = $('#promo-toggle-sub');
        if (sub) {
            if (sell < 100) sub.textContent = 'ابتدا به ۱۰۰ امتیاز فعالیت فروش برس';
            else if (wallet <= 0) sub.textContent = 'موجودی شارژ صفر است — ابتدا شارژ کن';
            else sub.textContent = 'روی همهٔ کالاهای کاتالوگ اعمال می‌شود';
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       تغییر گروهی قیمت
       ═══════════════════════════════════════════════════════════════ */
    /* ═══════════════════════════════════════════════════════════════
   تغییر گروهی و دستی قیمت‌ها
   ═══════════════════════════════════════════════════════════════ */
    var BULK_BASE = {}; /* id → قیمت اولیه */

    function bulkReset() {
        BULK_BASE = {};
        var pctInp = $('#bulk-pct');
        if (pctInp) pctInp.value = '۰';

        /* پر کردن مبنای قیمت‌ها از دیتا */
        $$('#bulk-grid .bulk-row').forEach(function (row) {
            var id = row.dataset.bkId;
            var inp = row.querySelector('.bk-price');
            var base = parseNum(row.dataset.bkBase || '0');
            if (id && inp) {
                BULK_BASE[id] = base;
                inp.value = faMoney(base);
                inp.dataset.base = String(base);
            }
        });

        bulkRefreshDirty();
    }

    /* خواندن درصد از اینپوت */
    function _bulkPct() {
        var inp = $('#bulk-pct');
        if (!inp) return 0;
        var v = parseFloat(String(inp.value)
            .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
            .replace(/[٪%−\s]/g, '').replace('٫', '.'));
        if (isNaN(v)) v = 0;
        if (v > 30) v = 30;
        if (v < -30) v = -30;
        return v;
    }

    function bulkSetPct(v) {
        var inp = $('#bulk-pct');
        if (!inp) return;
        v = Math.max(-30, Math.min(30, v));
        var abs = String(Math.abs(v)).replace('.', '٫').replace(/\d/g, function (d) {
            return '۰۱۲۳۴۵۶۷۸۹'[+d];
        });
        inp.value = (v < 0 ? '−' : '') + abs;

        /* اعمال درصدی روی همه */
        var pct = v;
        $$('#bulk-grid .bulk-row').forEach(function (row) {
            var inp2 = row.querySelector('.bk-price');
            var base = parseFloat(row.dataset.bkBase || '0');
            if (inp2 && base > 0) {
                var np = Math.max(0, Math.round(base * (1 + pct / 100)));
                inp2.value = faMoney(np);
            }
        });

        bulkRefreshDirty();
    }

    /* تغییر یک ردیف با دکمه‌های ± */
    function bulkStep(id, dir, stepPct) {
        stepPct = stepPct || 1; /* پیش‌فرض ۱٪ */
        var row = document.querySelector('#bulk-grid .bulk-row[data-bk-id="' + id + '"]');
        if (!row) return;
        var inp = row.querySelector('.bk-price');
        var base = parseFloat(row.dataset.bkBase || '0');
        if (!inp || base <= 0) return;
        var cur = parseNum(inp.value);
        var step = Math.max(1, Math.round(base * stepPct / 100));
        var next = Math.max(0, cur + dir * step);
        inp.value = faMoney(next);
        bulkRefreshDirty();
    }

    /* تغییر دستی یک ردیف */
    function bulkManual(id, value) {
        var row = document.querySelector('#bulk-grid .bulk-row[data-bk-id="' + id + '"]');
        if (!row) return;
        var inp = row.querySelector('.bk-price');
        if (!inp) return;
        var n = parseNum(value);
        inp.value = faMoney(n);
        bulkRefreshDirty();
    }

    function bulkRefreshDirty() {
        var dirty = 0;
        $$('#bulk-grid .bulk-row').forEach(function (row) {
            var inp = row.querySelector('.bk-price');
            var base = parseFloat(row.dataset.bkBase || '0');
            if (!inp) return;
            var cur = parseNum(inp.value);
            var changed = cur !== base;
            row.classList.toggle('chg', changed);
            if (changed) dirty++;
        });
        var save = $('#bulk-save');
        if (save) save.disabled = (dirty === 0);
        var cnt = $('#bulk-count');
        if (cnt) cnt.textContent = '(' + faNum(dirty) + ')';
    }

    function bulkApply() {
        var count = 0;
        $$('#bulk-grid .bulk-row').forEach(function (row) {
            var id = row.dataset.bkId;
            var inp = row.querySelector('.bk-price');
            if (!inp) return;
            var cur = parseNum(inp.value);
            var base = parseFloat(row.dataset.bkBase || '0');
            if (cur === base) return;

            /* به‌روزرسانی listing در دیتا */
            core.data.listings.forEach(function (l) {
                if (l.id === id) {
                    l.price = cur;
                    if (l.packCount) l.pricePerUnit = Math.round(cur / l.packCount);
                    count++;
                }
            });
        });

        /* اگر در دیتا نبود، فقط Toast موفقیت */
        core.toast(count > 0 ? (faNum(count) + ' قیمت به‌روز شد') : 'تغییری ذخیره نشد', 'success');
        setTimeout(function () {
            core.resetStack();
            core.show('s-catalog', false);
        }, 500);
    }




    /* ═══════════════════════════════════════════════════════════════
       شارژ
       ═══════════════════════════════════════════════════════════════ */
    function chargeSync() {
        var w = core.data.user.wallet || 0;
        $$('[data-wallet]').forEach(function (el) { el.textContent = faMoney(w); });
    }

    function chargeSend() {
        var amt = parseNum(($('#ch-amt') || {}).value);
        var ok = $('#ch-ok');
        if (ok) {
            ok.hidden = false;
            ok.textContent = amt ? 'فیش ارسال شد (' + faMoney(amt) + ' تومان) — پس از تأیید، شارژ می‌شود.' : 'فیش ارسال شد.';
        }
        var btn = $('#ch-send');
        if (btn) {
            btn.innerHTML = '<svg><use href="#i-check"/></svg> فیش ارسال شد';
            btn.classList.add('bk-saved');
        }
        setTimeout(function () {
            if (amt) {
                core.data.user.wallet = (core.data.user.wallet || 0) + amt;
                chargeSync();
                catPromoSync();
            }
            if (ok) ok.textContent = 'تأیید شد ✓ — شارژ به حساب اضافه شد.';
            if (btn) {
                btn.innerHTML = '<svg><use href="#i-send"/></svg> ارسال فیش برای تأیید';
                btn.classList.remove('bk-saved');
            }
            setTimeout(function () { if (ok) ok.hidden = true; }, 2600);
        }, 1800);
    }

    function promoSwitchToggle() {
        var sw = $('#promo-switch');
        if (!sw) return;
        var sell = scoreCalc(core.data.scoreItemsSell);
        if (sell < 100) {
            core.toast('ابتدا به ۱۰۰ امتیاز فعالیت فروش برس', 'error');
            return;
        }
        var w = core.data.user.wallet || 0;
        if (w <= 0 && !core.data.user.catalogPromo) {
            core.toast('موجودی شارژ صفر است — ابتدا شارژ کن', 'error');
            return;
        }
        core.data.user.catalogPromo = !core.data.user.catalogPromo;
        catPromoSync();
        core.toast(core.data.user.catalogPromo ? 'کالاها ویژه شدند' : 'ویژه‌سازی خاموش شد', 'success');
    }
})();