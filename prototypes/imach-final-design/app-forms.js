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

    /* ═════════════════════════════════════════════════════════════
       صفحهٔ امتیاز — روایت «شبکه بساز، شتاب بگیر»
       FD-7: طرح امتیازها نهایی شد — متن قهرمان روی «فعالیت واقعی +
       دعوتِ بیشترین امتیاز» می‌نشیند؛ پاداش‌ها در بخش «مسیر امتیاز»
       (دو ایستگاه: ۱۰۰ = ورود به شبکه · بعد از ۱۰۰ = شارژ) آمده‌اند.
       FD-8: عنوان لینک/شیت شتابدهی وابسته به بازو شد (accelRender) —
       دو معنای جدا: فروش = دیده‌شدن محصولات تو · خرید = تأمین‌کنندهٔ بیشتر.
       ═════════════════════════════════════════════════════════════ */
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
                /* FD-7: پاداش بعد از ۱۰۰ هم در متن قهرمان دیده شود */
                heroP.textContent = isSell
                    ? '🎉 در شبکهٔ آی‌مچ هستی — محصولاتت به خریداران شبکه معرفی می‌شود. هر امتیازِ اضافه از این به بعد قابل تبدیل به شارژ تبلیغات است.'
                    : '🎉 در شبکهٔ آی‌مچ هستی — تأمین‌کننده‌های تازه به تو معرفی می‌شوند. هر امتیازِ اضافه از این به بعد قابل تبدیل به شارژ است.';
            } else {
                /* FD-7: تأکید صریح — دعوتِ افراد جدید بیشترین امتیاز را دارد (حکم مالک) */
                heroP.textContent = isSell
                    ? 'با فعالیت واقعی امتیاز بگیر — کاتالوگت را کامل کن، مشتریانت را دعوت کن، سفارش بگیر. دعوتِ هر مشتری جدید بیشترین امتیاز را دارد.'
                    : 'با فعالیت واقعی امتیاز بگیر — لیست خریدت را کامل کن، تأمین‌کننده‌هایت را دعوت کن، استعلام بگیر. دعوتِ هر تأمین‌کنندهٔ جدید بیشترین امتیاز را دارد.';
            }
        }



        /* FD-7: مسیر امتیاز — دو ایستگاه؛ متن‌ها وابسته به بازو، حالت‌ها
           وابسته به امتیاز واقعی (هرگز با چیپ/میز تناقض نمی‌کند) */
        var netS = $('#sp-net-s');
        if (netS) netS.textContent = isSell
            ? 'محصولاتت به خریداران سراسر شبکه نشان داده می‌شود'
            : 'تأمین‌کننده‌های تازه از سراسر شبکه به تو معرفی می‌شوند';
        var chS = $('#sp-charge-s');
        if (chS) chS.textContent = isSell
            ? 'با شارژ، محصولاتت بیشتر و بالاتر دیده می‌شود'
            : 'با شارژ، درخواست‌های خریدت به تأمین‌کننده‌های بیشتری می‌رسد';
        var netRow = $('#sp-net');
        if (netRow) netRow.classList.toggle('done', score >= 100);
        var chRow = $('#sp-charge');
        if (chRow) chRow.classList.toggle('live', score >= 100);

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

        /* FD-8: عنوان لینک و محتوای شیت وابسته به بازو — دو معنای جدا:
           فروش = محصولات تو به خریداران بیشتر نشان داده می‌شود؛
           خرید = تأمین‌کننده‌های بیشتر و به‌صرفه‌تر به تو نشان داده می‌شوند. */
        var linkTx = $('#accel-link-tx');
        if (linkTx) linkTx.textContent = isSell ? 'شتابدهی در فروش یعنی چه؟' : 'شتابدهی در خرید یعنی چه؟';
        accelRender(arm);

        /* FD-8: دکمهٔ «کجا دیده می‌شوم؟» حالت ۱۰۰+ میز، این‌جا می‌رسد و
           شیت توضیح باید خودکار باز شود (params.openAccel از handlers). */
        if (params.openAccel) {
            setTimeout(function () { core.openSheet('sheet-accel'); }, 140);
        }
    }

    /* ═════════════════════════════════════════════════════════════
       شیت «شتابدهی یعنی چه؟» — دو روایت کاملاً جدا (FD-8، حکم مالک)
       ─────────────────────────────────────────────────────────────
       شتابدهی در فروش و خرید دو چیز متفاوت است:
         • فروش: محصولاتِ تو به خریدارانِ بیشتر نشان داده می‌شود —
           جایگاه‌ها: صفحات مقایسه‌ای که خریدار می‌بیند (مقایسهٔ پیشنهادها
           + قیمت زندهٔ هر کالا) → عکس‌های ۰۱/۰۲ (ردیف خود کاربر روشن).
         • خرید: تأمین‌کننده‌های بیشتری از هر کالا به «تو» نشان داده
           می‌شود — بهتر و به‌صرفه‌تر — جایگاه‌ها: صفحهٔ تأمین‌کننده‌های
           کالا (درِ «تأمین‌کننده‌های بیشتر» باز می‌شود) + مقایسهٔ
           پیشنهادها (پیشنهادهای بیشتری به دستت می‌رسد) → عکس‌های ۰۳/۰۴.
       همین شیت در دو صفحه با یک markup کار می‌کند؛ فقط متن/عکس عوض
       می‌شود — پیچیدگی صفر، هم‌خوانی کامل با چیپ و مسیر امتیاز هر بازو.
       ═════════════════════════════════════════════════════════════ */
    var ACCEL = {
        sell: {
            title: 'شتابدهی در فروش یعنی چه؟',
            p1: 'وقتی به <b>۱۰۰ امتیاز</b> می‌رسی، موتور شتاب‌دهندهٔ <b>فروشت</b> فعال می‌شود: محصولاتت را به خریدارهایی نشان می‌دهیم که دنبال همان کالاها هستند — بدون اینکه خودت تبلیغ کنی یا مزاحم کسی شوی.',
            p2: 'کجا؟ همان صفحه‌هایی که خودت هم هنگام خرید، قیمت بقیهٔ تأمین‌کننده‌ها را کنار هم می‌بینی. عکس‌های پایین، صفحه‌های واقعی آی‌مچ‌اند — ردیف روشن‌شده جای محصولات توست.',
            img1: 'png/accel/01-offers-compare.png',
            alt1: 'صفحهٔ مقایسهٔ پیشنهادها — ردیف محصولات شما هایلایت شده',
            cap1: '<b>صفحهٔ مقایسهٔ پیشنهادها —</b> خریدار برای استعلامش، قیمت چند تأمین‌کننده را کنار هم می‌بیند؛ محصولات تو هم همین‌جا بین رقبا دیده می‌شود.',
            img2: 'png/accel/02-good-suppliers.png',
            alt2: 'صفحهٔ قیمت زندهٔ هر کالا — ردیف محصولات شما هایلایت شده',
            cap2: '<b>صفحهٔ قیمت زندهٔ هر کالا —</b> خریداری که کالای تو را در لیست خریدش دارد، قیمت به‌روز تو را همان لحظه می‌بیند و با بقیه مقایسه می‌کند.',
            post100: 'هر امتیازِ اضافه را هر وقت خواستی به شارژ تبدیل کن — شارژ یعنی همان دیده‌شدنِ بیشترِ محصولاتت، این‌بار به انتخاب خودت.',
            hint: 'شتابدهی یعنی همین: جلوتر دیده شدن، بدون تبلیغ و مزاحمت.'
        },
        buy: {
            title: 'شتابدهی در خرید یعنی چه؟',
            p1: 'وقتی به <b>۱۰۰ امتیاز</b> می‌رسی، موتور شتاب‌دهندهٔ <b>خریدت</b> فعال می‌شود: از هر کالای لیستت، تأمین‌کننده‌های بیشتری به تو نشان داده می‌شوند — تأمین‌کننده‌های بهتر و به‌صرفه‌تر — بدون اینکه دنبالشان بگردی.',
            p2: 'کجا؟ همان صفحه‌هایی که قیمت چند تأمین‌کننده را کنار هم می‌بینی. عکس‌های پایین، صفحه‌های واقعی آی‌مچ‌اند — جای روشن‌شده، جایی است که تأمین‌کننده‌های تازه را پیدا می‌کنی.',
            img1: 'png/accel/03-buy-more-suppliers.png',
            alt1: 'صفحهٔ تأمین‌کننده‌های هر کالا — درِ تأمین‌کننده‌های بیشتر با ۱۰۰ امتیاز باز می‌شود',
            cap1: '<b>صفحهٔ تأمین‌کننده‌های هر کالا —</b> الان تأمین‌کننده‌های ذخیره‌شدهٔ خودت را می‌بینی؛ با شتابدهی، تأمین‌کننده‌های تازهٔ همین کالا هم همین‌جا قیمت می‌دهند.',
            img2: 'png/accel/04-buy-offers-compare.png',
            alt2: 'صفحهٔ مقایسهٔ پیشنهادها — پیشنهادهای بیشتری به دستت می‌رسد',
            cap2: '<b>صفحهٔ مقایسهٔ پیشنهادها —</b> استعلامت به تأمین‌کننده‌های بیشتری می‌رسد؛ چند قیمت کنار هم، خرید به‌صرفه‌تر.',
            post100: 'هر امتیازِ اضافه را هر وقت خواستی به شارژ تبدیل کن — شارژ یعنی درخواست‌های خریدت به تأمین‌کننده‌های بیشتری می‌رسد، به انتخاب خودت.',
            hint: 'شتابدهی یعنی همین: تأمین‌کنندهٔ بیشتر، قیمت بهتر — بدون معطلی.'
        }
    };
    function accelRender(arm) {
        var c = ACCEL[(arm === 'buy') ? 'buy' : 'sell'];
        var map = [
            ['sa-title', 'textContent', 'title'],
            ['sa-p1', 'innerHTML', 'p1'],
            ['sa-p2', 'innerHTML', 'p2'],
            ['sa-cap1', 'innerHTML', 'cap1'],
            ['sa-cap2', 'innerHTML', 'cap2'],
            ['sa-post100', 'textContent', 'post100'],
            ['sa-hint', 'textContent', 'hint']
        ];
        for (var i = 0; i < map.length; i++) {
            var el = $('#' + map[i][0]);
            if (el) el[map[i][1]] = c[map[i][2]];
        }
        var im;
        im = $('#sa-img1'); if (im) { im.src = c.img1; im.alt = c.alt1; }
        im = $('#sa-img2'); if (im) { im.src = c.img2; im.alt = c.alt2; }
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
            if (sub) sub.textContent = 'محصولاتت الان به خریداران هدف نشان داده می‌شود';
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
       میز فروش (۰۴) / میز خرید (۱۹) — کارتابل
       ─────────────────────────────────────────────────────────────
       حکم مالک (FD-4): میز = کارتابل؛ بالای صفحه فقط چند لینک مهم،
       بقیهٔ صفحه = اعلام کارهای نیازمند اقدام.

       بازبینی مالک (FD-6):
         • دایرهٔ امتیاز به اپ‌بار برگشت (score-chip) — کلیک → صفحهٔ
           امتیازها (تصمیم FD-5 «امتیاز فقط در کادر صفحه» لغو شد).
         • روی میز فقط دو کادر تمام‌عرض (کاتالوگ من / مشتریان من —
           و در میز خرید: لیست خرید من / تأمین‌کننده‌های من).
         • کارت «گام بعدی فعالیت» با دکمهٔ اقدام (بازگشت از تصمیم FD-5):
           «۵۵ امتیاز تا شتابدهی» + موشک · جملهٔ گام ·
           نوار پیشرفت «۴۵/۱۰۰» + موشک · دکمه («افزودن محصول» و…)

       sync چه چیزی؟
         ۱) چیپ امتیاز اپ‌بار (حلقه + عدد + حالت سبز ۱۰۰+)
         ۲) اعداد دو کاشی (FD-8 — فروش: از دیتای واقعی listings/customers؛
            خرید: ثابت، همگام با صفحات استاتیک دمو)
         ۳) کارت «گام بعدی فعالیت» — اولین گام ناقصِ قابل‌اقدام از
            scoreItems*.desk؛ گام‌به‌گام (همیشه فقط یک گام).
            عدد «۴۵/۱۰۰» و «۵۵ امتیاز تا شتابدهی» محاسبه‌اند، نه متن ثابت —
            همیشه با scoreCalc و صفحهٔ امتیاز سینک می‌مانند.
       نکته: قبلاً کارت امتیاز ۰۴ هیچ‌وقت سینک نمی‌شد چون هوک
       اشتباهاً روی s-catalog ثبت شده بود — ساختار زیر آن باگ را رفع می‌کند.
       ═══════════════════════════════════════════════════════════════ */

    /* چیپ امتیاز اپ‌بار — حلقهٔ ۳۶px با عدد (مشترک فروش/خرید) */
    function _chipRingSync(score, ringSel, numSel, chipSel) {
        var pct = Math.min(100, score) / 100;
        var ring = $(ringSel);
        if (ring) {
            /* circumference = 2 * π * 18 ≈ 113.1 */
            ring.style.strokeDashoffset = String(113.1 * (1 - pct));
        }
        var num = $(numSel);
        if (num) num.textContent = faNum(score);
        var chip = $(chipSel);
        if (chip) chip.classList.toggle('on', score >= 100);
    }

    /* ردیف «گام شروع» (FD-12) — مشترک فروش/خرید.
       جای کارت قهرمانِ «گام بعدی فعالیت» (حکم مالک FD-12: گام‌های شروع
       هم اقدام‌اند، فقط موقتی)، ردیفی ساده در همان فهرست «نیازمند
       اقدام» می‌نشیند. متن از scoreItems*.desk؛ مقصد روی خود ردیف
       (data-go یا data-contacts-pick). با اتمام گام‌ها یا ۱۰۰+ امتیاز
       ردیف محو می‌شود — امتیاز در چیپ اپ‌بار و روایت شتابدهی در
       صفحهٔ امتیاز می‌مانند. */
    function _deskStepSync(rowId, titleId, items, score, homeId) {
        var row = $('#' + rowId);
        if (!row) return;

        var next = null, i;
        for (i = 0; i < (items || []).length; i++) {
            if (items[i].desk && !items[i].done) { next = items[i]; break; }
        }
        if (!next || score >= 100) { row.hidden = true; return; }

        row.hidden = false;
        var t = $('#' + titleId);
        if (t) t.textContent = next.desk.t;
        if (next.desk.pick) {
            row.removeAttribute('data-go');
            row.setAttribute('data-contacts-pick', homeId);
        } else {
            row.removeAttribute('data-contacts-pick');
            row.setAttribute('data-go', next.desk.go || 's-catalog');
        }
    }

    function deskHomeSync() {
        var sell = scoreCalc(core.data.scoreItemsSell);

        /* ۱) چیپ امتیاز اپ‌بار (FD-6) */
        _chipRingSync(sell, '#desk-chip-ring', '#desk-chip-num', '#desk-chip');

        /* ۲) دو کاشی کنار هم (FD-8) — عدد بزرگ از دیتای واقعی:
           کاتالوگ = تعداد listings · مشتریان = تعداد + «در انتظار تایید» */
        var el = $('#desk-cat-num');
        if (el) el.textContent = faNum((core.data.listings || []).length);
        var custs = (core.data.customers || []).filter(function (c) { return c.businessId === 'b1'; });
        var newN = custs.filter(function (c) { return c.isNew; }).length;
        el = $('#desk-cust-num');
        if (el) el.textContent = faNum(custs.length);
        el = $('#desk-cust-sub');
        if (el) el.textContent = newN ? faNum(newN) + ' در انتظار تایید' : 'شبکهٔ مشتریانت';

        /* ۳) ردیف «گام شروع» در فهرست اقدام (FD-12) */
        _deskStepSync('sell-desk-row', 'ds-row-t', core.data.scoreItemsSell, sell, 's-home-sell');
    }

    /* میز خرید (۱۹) — FD-6: همان کارتابل، قرینهٔ فروش.
       شمارنده‌های کادرهای خرید عمداً ثابت‌اند (صفحات لیست/تأمین‌کنندهٔ
       دمو هم استاتیک‌اند)؛ فقط امتیاز و ردیف‌های شروع از دیتا سینک
       می‌شوند. FD-12: ردیف «ساخت رمز» تا وقتی ساخته نشده می‌ماند —
       show() قالب را بازسازی می‌کند، پس این‌جا دوباره اعمال می‌شود. */
    function buyDeskSync() {
        var buy = scoreCalc(core.data.scoreItemsBuy);

        /* ۱) چیپ امتیاز خرید اپ‌بار */
        _chipRingSync(buy, '#buy-chip-ring', '#buy-chip-num', '#buy-chip');

        /* ۲) ردیف «ساخت رمز ورود» (FD-12) */
        var pr = $('#buy-pass-row');
        if (pr) pr.hidden = PASS_MADE;

        /* ۳) ردیف «گام شروع» — از scoreItemsBuy[].desk */
        _deskStepSync('buy-desk-row', 'bds-row-t', core.data.scoreItemsBuy, buy, 's-home-buy');
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
        /* FD-9: اعتبار قیمت — یادآوری آپدیت ۱ تا ۵ روز (پیش‌فرض ۳) */
        var validDays = readDaysPills('#add-valid');

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
                img: r.img || null,
                priceValidDays: validDays,   /* FD-9 */
                groupDiscounts: {}
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
                img: null,
                priceValidDays: validDays,   /* FD-9 */
                groupDiscounts: {}
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
    /* ─── FD-9/FD-10/FD-13: حالت مهمان/دید عمومی کاتالوگ (۳۱) ───
       چهار وضعیت دارد:
       · preview-mode (فروشندهٔ خود کاتالوگ): قیمت‌ها پیداست، عناصر
         مهمان (سبد/ذخیره) پنهان‌اند — «دید عمومی کاتالوگ».
       · open-market (FD-13 — پیش‌فرض): فروشنده سوییچ «مشاهده قیمت‌ها
         فقط برای مشتریان» (۳۶) را روشن نکرده ⇒ قیمت‌ها و سبد خرید
         برای «همه» باز است — حتی مهمانِ ثبت‌نام‌نکرده؛ گیتِ حساب
         در «ثبت سفارش» است (guestOrderSubmit → شیت حساب ctx=order).
       · gated (فقط وقتی سوییچ روشن باشد — قاعدهٔ FD-12): مهمانِ
         ثبت‌نام‌نکرده قیمت نمی‌بیند؛ جای قیمت‌ها دکمهٔ «مشاهده قیمت»
         است (CSS با کلاس .gated روی صفحه)؛ سبد هم فقط برای مشتری.
       · ذخیره‌شده (مشتری): قیمت‌ها پیداست، سبد کار می‌کند، کارتِ
         مشتری جای دکمهٔ ذخیره نشسته (FD-13).
       show() دام را از قالب کش می‌سازد → همهٔ وضعیت‌ها در هوک show
       دوباره می‌نشینند (درس FD-9). */
    function _publicPrices() {
        return !(core.data.catalogSettings || {}).pricesCustomersOnly;
    }

    function applyGuestMode() {
        var params = core.getSCREENParams()['s-catalog-guest'] || {};
        var section = $('#s-catalog-guest');
        if (!section) return;
        var isPreview = !!params.preview;
        section.classList.toggle('preview-mode', isPreview);
        /* FD-13: گیت قیمت فقط با سوییچ فروشنده + مهمانِ ذخیره‌نکرده */
        section.classList.toggle('gated', !isPreview && !GUEST_SAVED && !_publicPrices());
        section.classList.toggle('open-market', !isPreview && _publicPrices());
        guestCartSync();
        guestSavedSync();
    }

    /* ─── FD-9: سبد خرید کاتالوگ مهمان ───
       lid → تعداد؛ مقدار اولیه = حداقل سفارش همان محصول.
       FD-13: قیمت‌های سبد با «تخفیف مشتری» اعمال می‌شود (گروهِ بیننده
       یا تخفیف مخصوص همان محصول) — برای مهمان قیمت پایه است. */
    var GUEST_CART = {};

    function _findListing(id) {
        var out = null;
        core.data.listings.forEach(function (l) { if (l.id === id) out = l; });
        return out;
    }

    function _findGroup(id) {
        var out = null;
        (core.data.customerGroups || []).forEach(function (g) { if (g.id === id) out = g; });
        return out;
    }

    /* FD-13: درصد تخفیف مشتریِ بیننده برای یک محصول — اول تخفیف مخصوصِ
       همان محصول (listing.groupDiscounts)، بعد پیش‌فرض گروه مشتری */
    function guestDiscPct(l) {
        if (!GUEST_SAVED || !GUEST_GROUP) return 0;
        var gd = (l.groupDiscounts || {})[GUEST_GROUP.id];
        if (typeof gd === 'number') return gd;
        return GUEST_GROUP.discount || 0;
    }

    function _discPrice(price, pct) {
        return Math.round(price * (100 - pct) / 100 / 1000) * 1000;
    }

    function guestCartSync() {
        var n = 0;
        Object.keys(GUEST_CART).forEach(function (k) { n += GUEST_CART[k]; });
        var badge = $('#guest-cart-badge');
        if (badge) { badge.hidden = n === 0; badge.textContent = faNum(n); }
        /* FD-13: شمار «قلم» روی کارت مشتری (نشان سبد = مجموع تعداد) */
        var cc = $('#gcc-count');
        if (cc) cc.textContent = faNum(Object.keys(GUEST_CART).length);
        $$('#guest-grid .addcart-btn').forEach(function (b) {
            b.classList.toggle('added', !!GUEST_CART[b.dataset.addCart]);
        });
    }

    function guestCartAdd(lid) {
        var l = _findListing(lid);
        if (!l) return;
        /* FD-12→FD-13: گیت سبد فقط در حالت «قیمت فقط برای مشتریان»؛
           در بازارِ باز مهمان هم سبدش را پر می‌کند و در «ثبت سفارش»
           به حساب راهنمایی می‌شود. این نگهبانِ دفاعی برای پیاده‌سازی
           واقعی می‌ماند — سفارش مهمانِ ناشناس به سرور نمی‌رود */
        if (!GUEST_SAVED && !_publicPrices()) {
            toast('برای خرید از این تأمین‌کننده، اول کاتالوگ او را ذخیره کن تا مشتری‌اش بشوی', 'error');
            return;
        }
        GUEST_CART[lid] = GUEST_CART[lid] || (l.min || 1);
        guestCartSync();
        toast('به سبد خرید اضافه شد — حداقل ' + faNum(l.min || 1) + ' ' + _unitWord(l), 'success');
    }

    function guestCartRender() {
        var host = $('#cart-list');
        if (!host) return;
        var keys = Object.keys(GUEST_CART);
        var view = $('#cart-view'), ok = $('#cart-success');
        if (view) view.hidden = false;
        if (ok) ok.hidden = true;

        if (!keys.length) {
            host.innerHTML = '<div class="empty" style="padding:18px 12px">' +
                '<h3 style="margin-bottom:4px">سبدت خالی است</h3>' +
                '<p style="margin-bottom:0">روی عکس هر کالا، دکمهٔ + را بزن تا به سبد بیاید.</p></div>';
        } else {
            /* FD-13 (حکم مالک): چیدمان کارت سبد — عنوان و توضیح بالا؛
               قیمت و اضافه/کم‌کردن تعداد پایین، با استپرِ بزرگ (۴۲px)
               که در موبایل راحت لمس می‌شود (قاعدهٔ همیشگی جدید). */
            host.innerHTML = keys.map(function (lid) {
                var l = _findListing(lid);
                if (!l) return '';
                var qty = GUEST_CART[lid];
                var unit = _unitWord(l);
                var pct = guestDiscPct(l);
                var unitPrice = pct > 0 ? _discPrice(l.price, pct) : l.price;
                return '<div class="cart-it">' +
                    '<div class="ci-top">' +
                        '<div class="ci-th"><img src="' + l.img + '" alt=""></div>' +
                        '<div class="ci-tx"><b>' + esc(l.name) + '</b><small>' + esc(l.pack) + ' · حداقل ' + faNum(l.min || 1) + ' ' + unit + '</small></div>' +
                        '<button class="ed-del" type="button" data-cart-del="' + lid + '" aria-label="حذف از سبد"><svg><use href="#i-trash"/></svg></button>' +
                    '</div>' +
                    '<div class="ci-bottom">' +
                        '<div class="ci-qty">' +
                            '<button class="bk-step" type="button" data-cart-step="-1" data-cart-id="' + lid + '" aria-label="کاهش تعداد">−</button>' +
                            '<span class="ci-n">' + faNum(qty) + '</span>' +
                            '<button class="bk-step" type="button" data-cart-step="1" data-cart-id="' + lid + '" aria-label="افزایش تعداد">+</button>' +
                            '<small class="ci-unit">' + unit + '</small>' +
                        '</div>' +
                        '<div class="ci-price">' +
                            (pct > 0
                                ? '<small class="ci-base">' + faMoney(l.price) + '</small>' +
                                  '<b>' + faMoney(unitPrice) + '</b>' +
                                  '<span class="badge b-green">٪' + faNum(pct) + ' ' + esc(GUEST_GROUP.name) + '</span>'
                                : '<b>' + faMoney(unitPrice) + '</b>') +
                            ' <small>تومان</small>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        var total = 0;
        keys.forEach(function (lid) {
            var l = _findListing(lid);
            if (l) {
                var pct = guestDiscPct(l);
                var unitPrice = pct > 0 ? _discPrice(l.price, pct) : l.price;
                total += unitPrice * GUEST_CART[lid];
            }
        });
        var tc = $('#cart-total-card'), tb = $('#cart-order');
        if (tc) { tc.hidden = keys.length === 0; }
        if (tb) { tb.hidden = keys.length === 0; tb.disabled = false; }
        var tEl = $('#cart-total');
        if (tEl) tEl.innerHTML = faMoney(total) + ' <small>تومان</small>';
    }

    function guestCartStep(lid, dir) {
        var l = _findListing(lid);
        if (!l || !GUEST_CART[lid]) return;
        var min = l.min || 1;
        var next = GUEST_CART[lid] + dir;
        /* FD-13 (حکم مالک): سبد کمتر از حداقل خریدِ همان محصول را
           قبول نمی‌کند — «حداقل سفارش همین مقدار است» */
        if (next < min) {
            if (dir < 0) toast('حداقل سفارش همین مقدار است', 'error');
            return;
        }
        GUEST_CART[lid] = next;
        guestCartRender();
    }

    function guestCartDel(lid) {
        delete GUEST_CART[lid];
        guestCartSync();
        guestCartRender();
    }

    function guestCartOpen() {
        guestCartRender();
        core.openSheet('sheet-cart');
    }

    /* ─── ثبت سفارش آنلاین (FD-13 — حکم مالک) ───
       مهمانِ لاگین‌نکرده: سبدش پر است؛ در «ثبت سفارش» به ساخت حساب/
       ورود راهنمایی می‌شود (شیت حساب، زمینهٔ order) و بعد از حساب،
       سفارش همان‌جا ارسال می‌شود — کاربر از هدفش جابه‌جا نمی‌شود.
       واردشده: سفارش مستقیم کامل می‌شود. اولین سفارش = ذخیرهٔ خودکار
       کاتالوگ (= مشتری‌شدن). موفقیت: «پیگیری سفارش در میز خرید». */
    function guestOrderSubmit() {
        if (!Object.keys(GUEST_CART).length) return;
        if (!GUEST_SAVED) {
            guestAccountOpen('signup', 'order');
            toast('برای ارسال سفارش، اول حساب بساز یا وارد شو', 'info');
            return;
        }
        guestOrderComplete();
    }

    function guestOrderComplete() {
        var items = Object.keys(GUEST_CART).length;
        GUEST_CART = {};
        guestCartSync();
        var view = $('#cart-view'), ok = $('#cart-success');
        if (view) view.hidden = true;
        if (ok) ok.hidden = false;
        var btn = $('#cart-order');
        if (btn) { btn.disabled = true; btn.innerHTML = '<svg><use href="#i-check"/></svg> ثبت سفارش'; }
        /* FD-13: بعد از اولین سفارش، کاتالوگ خودکار ذخیره می‌شود و
           کاربر در واقع مشتری می‌شود (جریان ذخیره از خرید جدا شد) */
        if (!GUEST_SAVED) guestMarkSaved();
        toast('سفارش ' + faNum(items) + ' قلم کالا برای فروشنده ارسال شد', 'success');
    }

    /* FD-13: دکمهٔ «پیگیری سفارش در میز خرید» — مقصدِ روشنِ بعد از
       سفارش؛ دیگر نه دعوت به ذخیره، نه پرشِ گیج‌کننده */
    function guestOrderTrack() {
        core.closeSheet('sheet-cart');
        core.resetStack();
        core.show('s-home-buy', false);
    }

    function guestCartContinue() {
        core.closeSheet('sheet-cart');
        setTimeout(function () {
            var view = $('#cart-view'), ok = $('#cart-success');
            if (view) view.hidden = false;
            if (ok) ok.hidden = true;
            var btn = $('#cart-order');
            if (btn) btn.disabled = false;
            guestCartRender();
        }, 350);
    }

    /* ─── FD-9/FD-10/FD-13: جریان ذخیرهٔ کاتالوگ مهمان ───
       دکمهٔ ذخیره → شیت «ذخیره کاتالوگ» (کادر مزایای آکاردئونی — حکم
       FD-10: بسته = مینیمال) → دکمهٔ ذخیره → شیت ساخت حساب/ورود →
       کاتالوگ ذخیره + مشتری. ساخت حساب هیچ‌وقت ذخیره را قربانی نمی‌کند.
       FD-13: ثبت‌نام/ورود برای «سفارش» هم باز می‌شود (ctx=order) —
       ذخیره و خرید دو جریان جدا شدند ولی حساب یکسان است. */
    var GUEST_SAVED = false;
    /* FD-13: هویت بینندهٔ واردشده — برای کارت مشتری و تخفیف‌های سبد.
       ثبت‌نام = نام تایپ‌شده + گروه «معمولی» (فروشنده بعداً گروهش را
       عوض می‌کند) · ورود = سعید محمدی (مشتری قدیمی، همکار ٪۵ — در
       محصول واقعی این هویت از سشن و رکورد مشتری در دفتر فروشنده). */
    var GUEST_NAME = '';
    var GUEST_GROUP = null;
    /* زمینهٔ باز شدن شیت حساب: 'save' (از جریان ذخیره → پایان در پنل/
       میز خرید) · 'price' (از «مشاهده قیمت» → پایان همان‌جا) ·
       'order' (FD-13 — از «ثبت سفارش» → سفارش همان‌جا ارسال می‌شود) */
    var GUEST_ACCT_CTX = 'save';

    function guestSaveFlow() {
        if (GUEST_SAVED) { toast('این کاتالوگ ذخیره شده است', 'success'); return; }
        /* هر بار بسته شروع شود — کادر مزایا آرام و مینیمال بماند */
        var list = $('#bene-list'), tog = $('#bene-toggle');
        if (list) list.hidden = true;
        if (tog) { tog.classList.remove('open'); tog.setAttribute('aria-expanded', 'false'); }
        core.openSheet('sheet-save-benefits');
    }

    /* FD-10: کادر «با ذخیره این کاتالوگ چه مزایایی داری؟» — کلیک =
       باز/بسته شدن فهرست مزایا زیر همان کادر (حکم مالک) */
    function guestBeneToggle() {
        var list = $('#bene-list'), tog = $('#bene-toggle');
        if (!list || !tog) return;
        list.hidden = !list.hidden;
        tog.classList.toggle('open', !list.hidden);
        tog.setAttribute('aria-expanded', list.hidden ? 'false' : 'true');
    }

    function guestAccountOpen(mode, ctx) {
        /* FD-11: زمینه فقط وقتی صریحاً داده شود عوض می‌شود — تعویض نمای
           ورود/ثبت‌نام داخلِ همان شیت، قصدِ قبلی کاربر را حفظ می‌کند */
        if (ctx) GUEST_ACCT_CTX = ctx;
        var su = $('#acc-signup'), lg = $('#acc-login');
        if (su) su.hidden = mode !== 'signup';
        if (lg) lg.hidden = mode !== 'login';
        /* FD-13: عنوان و دکمه‌ها با زمینه هم‌خوان — «سفارش» وقتی از
           ثبت سفارش آمده‌ای، «ذخیره کاتالوگ» وقتی از جریان ذخیره */
        var isOrder = GUEST_ACCT_CTX === 'order';
        var tt = $('#acc-title');
        if (tt) tt.textContent = (mode === 'login')
            ? (isOrder ? 'ورود و ثبت سفارش' : 'ورود و ذخیره کاتالوگ')
            : (isOrder ? 'ساخت حساب و ثبت سفارش' : 'ساخت حساب و ذخیره کاتالوگ');
        var sb = $('#acc-submit');
        if (sb) sb.innerHTML = '<svg><use href="#i-check"/></svg> ' +
            (isOrder ? 'ساخت حساب و ثبت سفارش' : 'ساخت حساب و ذخیره کاتالوگ');
        var lsb = $('#acc-login-submit');
        if (lsb) lsb.innerHTML = '<svg><use href="#i-check"/></svg> ' +
            (isOrder ? 'ورود و ثبت سفارش' : 'ورود و ذخیره کاتالوگ');
        var sub = $('#acc-signup .sub');
        if (sub) sub.textContent = isOrder
            ? 'کمتر از ۲ دقیقه — بعدش سفارش‌ات همین‌جا ارسال می‌شود.'
            : 'کمتر از ۲ دقیقه — شماره، نام و نوع کارِ تو.';
        core.openSheet('sheet-account');
    }

    function guestMarkSaved() {
        GUEST_SAVED = true;
        guestSavedSync();
    }

    /* اعمال دوبارهٔ وضعیت ذخیره روی دامِ تازه (show() قالب را دوباره می‌سازد)
       FD-10: «ذخیره‌شده» علاوه بر دکمه/کادر، گیت قیمت را هم برمی‌دارد.
       FD-11: «ورود» اپ‌بار فقط برای مهمانِ واردنشده است — بعد از
       ورود/ذخیره پنهان می‌شود (کاربر دیگر لازمش ندارد).
       FD-12: کلاس saved — عناصر سبد (cust-only) برای واردشده ظاهر
       می‌شوند (در حالت «قیمت فقط مشتریان»).
       FD-13: کارت مشتری (سبدِ [نام] + نوع مشتری + تخفیف + شمار سبد)
       جای دکمهٔ «کاتالوگ ذخیره شد» و کادر پایین را می‌گیرد. */
    function guestSavedSync() {
        var section = $('#s-catalog-guest');
        var isPreview = section ? section.classList.contains('preview-mode') : false;
        if (section) {
            section.classList.toggle('gated', !GUEST_SAVED && !isPreview && !_publicPrices());
            section.classList.toggle('saved', GUEST_SAVED && !isPreview);
            section.classList.toggle('open-market', !isPreview && _publicPrices());
        }
        var lb = $('#guest-login-btn');
        if (lb) lb.hidden = GUEST_SAVED;
        /* FD-13: دکمه/کادر ذخیره فقط برای مهمان؛ کارت مشتری فقط برای ذخیره‌شده */
        var btn = $('#guest-save-btn'), box = $('#guest-save-box'), card = $('#guest-cust-card');
        if (btn) btn.hidden = GUEST_SAVED;
        if (box) box.hidden = GUEST_SAVED;
        if (card) card.hidden = !GUEST_SAVED;
        if (!GUEST_SAVED) { guestCartSync(); return; }
        if (card) {
            var nm = GUEST_NAME || 'مشتری';
            var t = $('#gcc-title'); if (t) t.textContent = 'سبد خرید ' + nm;
            var av = $('#gcc-av'); if (av) av.textContent = (nm.trim().charAt(0) || 'م');
            var g = $('#gcc-group'); if (g) g.textContent = (GUEST_GROUP && GUEST_GROUP.name) || 'معمولی';
            /* خط تخفیف فقط وقتی گروهِ بیننده تخفیف دارد (معمولی = مخفی) */
            var d = $('#gcc-disc');
            if (d) d.hidden = !(GUEST_GROUP && (GUEST_GROUP.discount || 0) > 0);
        }
        var cnt = $('#guest-saved-count');
        if (cnt && !cnt.dataset.bumped) {
            cnt.dataset.bumped = '1';
            cnt.textContent = faNum(parseNum(cnt.textContent) + 1);
        }
        guestCartSync();
    }

    function guestAccountSubmit(kind) {
        if (kind === 'signup') {
            var phone = (($('#acc-phone') || {}).value || '').trim();
            if (!phone) { toast('شماره موبایل را وارد کن', 'error'); return; }
            var name = (($('#acc-name') || {}).value || '').trim();
            if (!name) { toast('نام را وارد کن', 'error'); return; }
            var rc = $('#acc-signup .role-card.active');
            var role = rc ? rc.dataset.role : 'buy';
            core.assist.sell = (role === 'sell' || role === 'both');
            core.assist.buy = (role === 'buy' || role === 'both');
            /* FD-13: هویت بیننده — ثبت‌نام تازه = گروه «معمولی»؛
               فروشنده بعداً در دفتر مشتری گروهش را تعیین می‌کند */
            GUEST_NAME = name;
            GUEST_GROUP = _findGroup('cg2');
        } else {
            /* FD-12: ورود = شماره + رمز (پنل پیامکی/کد تأیید نداریم؛
               رمز را کاربر با ردیف «شروع» میز خرید ساخته است) */
            var lphone = (($('#acc-lphone') || {}).value || '').trim();
            if (!lphone) { toast('شماره موبایل را وارد کن', 'error'); return; }
            var lpass = (($('#acc-lpass') || {}).value || '');
            if (!lpass) { toast('رمز ورود را وارد کن', 'error'); return; }
            /* FD-13: دموی ورود = سعید محمدی — مشتری قدیمیِ «پخش برنج
               پارس» (cu6، گروه همکار ٪۵) تا کارت مشتری و تخفیف‌ها
               واقعی دیده شود؛ در محصول واقعی هویت از سشن می‌آید */
            GUEST_NAME = 'سعید محمدی';
            GUEST_GROUP = _findGroup('cg1');
        }
        core.applyArms();
        core.closeSheet('sheet-account');
        guestMarkSaved();
        var ctx = GUEST_ACCT_CTX;
        GUEST_ACCT_CTX = 'save';
        /* FD-13: اگر حساب از «ثبت سفارش» باز شده، سفارش همان‌جا کامل
           می‌شود و نمای موفقیت (پیگیری در میز خرید) جلوی چشم می‌ماند */
        if (ctx === 'order') {
            guestOrderComplete();
            core.openSheet('sheet-cart');
            return;
        }
        /* FD-10: اگر حساب از «مشاهده قیمت» باز شده، کاربر همان‌جا می‌ماند
           و قیمت‌ها پیش چشمش باز می‌شوند — از هدف جابه‌جا نمی‌شود.
           (ثبت‌نام = ذخیرهٔ کاتالوگ = مشتری‌شدن — حکم مالک) */
        if (ctx === 'price') {
            var cur = core.getCurrentScreen();
            if (cur === 's-product-view') productViewSync();
            toast(_publicPrices()
                ? 'کاتالوگ ذخیره شد — خوش آمدی'
                : 'کاتالوگ ذخیره شد — قیمت‌ها باز شد', 'success');
            return;
        }
        toast('کاتالوگ ذخیره شد — خوش آمدی به آی‌مچ', 'success');
        setTimeout(function () {
            core.resetStack();
            /* FD-12 (حکم مالک): اولین ثبت‌نام از دلِ کاتالوگ همیشه به
               میز خرید می‌رود — حتی اگر نقش «هر دو» را انتخاب کرده
               باشد. زمینهٔ ثبت‌نام خرید است و کاتالوگِ تازه‌ذخیره
               همان‌جا در «تأمین‌کننده‌های من» دیده می‌شود؛ میز فروشِ
               حساب تازه خالی است و راه‌اندازی‌اش بعدا شروع می‌شود. */
            core.show('s-home-buy', false);
        }, 650);
    }

    /* ─── FD-12: ساخت رمز ورود ───
       محدودیت واقعی محصول: پنل پیامکی/کد تأیید نداریم — ثبت‌نام با
       شماره + سشن است و همین رمز، تنها راه ورود در دفعات بعد یا از
       دستگاه‌های دیگر. ردیف «شروع» میز خرید (۱۹) شیت را باز می‌کند؛
       ردیفِ کم‌ادعا تا وقتی رمز ساخته نشده می‌ماند (نه دیوار اجبار). */
    var PASS_MADE = false;

    function passOpen() {
        var v = $('#pass-view'), ok = $('#pass-ok');
        if (v) v.hidden = false;
        if (ok) ok.hidden = true;
        var a = $('#pass-a'), b = $('#pass-b');
        if (a) a.value = '';
        if (b) b.value = '';
        core.openSheet('sheet-pass');
    }

    function passSubmit() {
        var a = (($('#pass-a') || {}).value || '');
        var b = (($('#pass-b') || {}).value || '');
        if (a.length < 6) { toast('رمز باید حداقل ۶ کاراکتر باشد', 'error'); return; }
        if (a !== b) { toast('دو رمز با هم یکی نیستند', 'error'); return; }
        PASS_MADE = true;
        var v = $('#pass-view'), ok = $('#pass-ok');
        if (v) v.hidden = true;
        if (ok) ok.hidden = false;
        var pr = $('#buy-pass-row');
        if (pr) pr.hidden = true;
        toast('رمز ورود ساخته شد', 'success');
    }

    /* ─── FD-10/FD-13: جزئیات کالا (۳۷) — دید عمومی کاتالوگ ───
       از listings واقعی پر می‌شود؛ گیت قیمت مثل ۳۱ (FD-13): فقط وقتی
       فروشنده «قیمت فقط برای مشتریان» را روشن کرده باشد مهمان «مشاهده
       قیمت» می‌بیند؛ در بازارِ باز قیمت برای همه پیداست و «افزودن به
       سبد» مهمان هم فعال است (گیت حساب در ثبت سفارش).
       FD-13: ردیف «قیمت برای تو» — تخفیف گروه مشتریِ بیننده (یا تخفیف
       مخصوص همان محصول)؛ در پیش‌نمایش با گروه نماینده (همکار) نشان
       می‌دهیم تا فروشنده ببیند مشتری‌ها چه می‌بینند. */
    function _unitWord(l) {
        return (l.pack || '').indexOf('کیسه') > -1 ? 'کیسه' : 'عدد';
    }

    function productViewSync() {
        var params = core.getSCREENParams()['s-product-view'] || {};
        var section = $('#s-product-view');
        if (!section) return;
        var l = _findListing(params.id) || core.data.listings[0];
        if (!l) return;
        var isPreview = !!params.preview;
        var gated = !isPreview && !GUEST_SAVED && !_publicPrices();
        section.classList.toggle('gated', gated);

        var ttl = core.$('#pv-ttl');
        if (ttl && ttl.childNodes[0]) ttl.childNodes[0].nodeValue = l.name;
        var img = core.$('#pv-img');
        if (img) { img.src = l.img; img.alt = l.name; }
        var el = core.$('#pv-name'); if (el) el.textContent = l.name;
        el = core.$('#pv-sub'); if (el) el.textContent = l.pack;
        el = core.$('#pv-price');
        if (el) el.innerHTML = faMoney(l.price) + ' <small>تومان</small>';

        /* FD-13: «قیمت برای تو» — تخفیف مشتری زیر قیمت اصلی؛ فقط برای
           مشتری (گروهش/تخفیف مخصوص همین محصول) و پیش‌نمایش (نماینده) */
        var discEl = core.$('#pv-disc');
        if (discEl) {
            var pct = 0, grpName = '';
            if (!gated && GUEST_SAVED && GUEST_GROUP) {
                pct = (l.groupDiscounts || {})[GUEST_GROUP.id];
                if (typeof pct !== 'number') pct = GUEST_GROUP.discount || 0;
                grpName = GUEST_GROUP.name;
            } else if (isPreview) {
                var rep = (core.data.customerGroups || [])[0];
                if (rep) {
                    pct = (l.groupDiscounts || {})[rep.id];
                    if (typeof pct !== 'number') pct = rep.discount || 0;
                    grpName = rep.name;
                }
            }
            discEl.hidden = !(pct > 0);
            if (pct > 0) {
                var dge = core.$('#pv-disc-grp');
                if (dge) dge.textContent = '(تخفیف ' + grpName + ' ٪' + faNum(pct) + ')';
                var dpe = core.$('#pv-disc-price');
                if (dpe) dpe.textContent = faMoney(_discPrice(l.price, pct));
            }
        }

        /* مشخصات */
        var unit = _unitWord(l);
        el = core.$('#pv-pack'); if (el) el.textContent = l.pack;
        var brandRow = core.$('#pv-brand-row');
        if (brandRow) brandRow.hidden = !l.brand;
        el = core.$('#pv-brand'); if (el) el.textContent = l.brand || '—';
        el = core.$('#pv-min'); if (el) el.textContent = faNum(l.min || 1) + ' ' + unit;
        var stockEl = core.$('#pv-stock');
        if (stockEl) {
            if (l.status === 'low') {
                stockEl.className = 'badge b-amber';
                stockEl.textContent = faNum(l.stock) + ' ' + unit + ' — موجودی کم';
            } else {
                stockEl.className = 'badge b-green';
                stockEl.textContent = faNum(l.stock) + ' ' + unit + ' موجود';
            }
        }

        /* توضیحات فروشنده — خالی = کارت مخفی */
        var noteCard = core.$('#pv-note-card');
        if (noteCard) {
            noteCard.hidden = !l.note;
            var noteEl = core.$('#pv-note');
            if (noteEl && l.note) noteEl.textContent = l.note;
        }

        /* تخفیف حجمی — فقط وقتی قیمت دیده می‌شود؛ در بازارِ باز مهمان
           هم پله‌ها را می‌بیند (قیمت‌ها عمومی‌اند)؛ پلهٔ اول = حداقل
           خرید بدون تخفیف؛ آخرین پله «بهترین» */
        var tiersCard = core.$('#pv-tiers-card');
        var tiersHost = core.$('#pv-tiers');
        var tiers = (core.data.volumeTiersOn && core.data.volumeTiers) ? core.data.volumeTiers : [];
        if (tiersCard) {
            tiersCard.hidden = gated || !tiers.length;
            var nEl = core.$('#pv-tiers-n');
            if (nEl) nEl.textContent = faNum(tiers.length) + ' پله';
        }
        if (tiersHost && tiers.length && !gated) {
            var html = '<div class="pv-tier first">' +
                '<span class="pt-q">' + faNum(l.min || 1) + ' ' + unit + ' به بالا <span class="badge b-stone">حداقل خرید — بدون تخفیف</span></span>' +
                '<span class="pt-p"><b>' + faMoney(l.price) + '</b> <small>تومان</small></span>' +
                '</div>';
            tiers.forEach(function (t, i) {
                var p = Math.round(l.price * (100 - t.pct) / 100 / 1000) * 1000;
                var best = (i === tiers.length - 1);
                html += '<div class="pv-tier">' +
                    '<span class="pt-q">' + faNum(t.min) + ' ' + unit + ' به بالا' +
                    (best ? ' <span class="badge b-green">بهترین</span>' : '') + '</span>' +
                    '<span class="pt-p">' + (best ? '<b style="color: var(--green);">' + faMoney(p) + '</b>' : '<b>' + faMoney(p) + '</b>') +
                    ' <small>تومان</small> <span class="badge b-green">٪' + faNum(t.pct) + '</span></span>' +
                    '</div>';
            });
            tiersHost.innerHTML = html;
        }

        /* دکمهٔ اصلی اکشن‌بار — لیبل ثابت؛ فقط data-pv-add ست می‌شود.
           رفتار (مهمان=پیام · مشتری=افزودن) در pvCta() */
        var cta = core.$('#pv-cta');
        if (cta) cta.setAttribute('data-pv-add', l.id);
    }

    /* دکمهٔ «افزودن به سبد خرید» صفحهٔ ۳۷ — همان قاعدهٔ + روی کارت‌ها */
    function pvCta() {
        var cta = core.$('#pv-cta');
        if (!cta) return;
        var lid = cta.getAttribute('data-pv-add');
        if (lid) guestCartAdd(lid);
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
    /* FD-10: جزئیات کالا — رندر از دیتا + وضعیت گیت قیمت */
    core.registerShowHook('s-product-view', productViewSync);
    core.registerShowHook('s-contacts', applyContactsMode);
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
    /* فاز دفتر مشتری — شیت‌های کاتالوگ و تخفیف‌ها */
    core.registerShowHook('s-catalog', catSheetsSync);
    /* FD-9: سینک زندهٔ قیمت/منقضی روی کارت‌های کاتالوگ */
    core.registerShowHook('s-catalog', catGridSync);
    core.registerShowHook('s-cat-edit', catEditLoad);
    core.registerShowHook('s-sell-edit', gdEditRender);
    core.registerShowHook('s-home-sell', chargeSync);
    /* میز فروش/خرید — کارتابل (FD-6): چیپ امتیاز اپ‌بار + کارت «گام بعدی فعالیت» */
    core.registerShowHook('s-home-sell', deskHomeSync);
    core.registerShowHook('s-home-buy', buyDeskSync);
    core.registerShowHook('s-profile', chargeSync);

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
        accelRender: accelRender,
        deskHomeSync: deskHomeSync,
        buyDeskSync: buyDeskSync,

        bpsRenderCta: bpsRenderCta,

        applyGuestMode: applyGuestMode, applyContactsMode: applyContactsMode,
        updatePickCount: updatePickCount, markNewItemsSeen: markNewItemsSeen,
        catalogScoreSync: catalogScoreSync,
        buyListScoreSync: buyListScoreSync,
        catPromoSync: catPromoSync,
        bulkReset: bulkReset,
        bulkSetPct: bulkSetPct,
        bulkSetAmt: bulkSetAmt,
        bulkStep: bulkStep,
        bulkManual: bulkManual,
        bulkApply: bulkApply,
        bulkQuick: bulkQuick,
        bulkToEdit: bulkToEdit,
        bulkCancel: bulkCancel,
        readDaysPills: readDaysPills,
        setDaysPills: setDaysPills,
        catGridSync: catGridSync,
        qpriceOpen: qpriceOpen,
        qpriceSave: qpriceSave,
        qpPctSet: qpPctSet,
        qpPriceSet: qpPriceSet,
        guestCartAdd: guestCartAdd,
        guestCartOpen: guestCartOpen,
        guestCartStep: guestCartStep,
        guestCartDel: guestCartDel,
        guestOrderSubmit: guestOrderSubmit,
        guestOrderTrack: guestOrderTrack,
        guestCartContinue: guestCartContinue,
        guestSaveFlow: guestSaveFlow,
        guestAccountOpen: guestAccountOpen,
        guestAccountSubmit: guestAccountSubmit,
        guestBeneToggle: guestBeneToggle,
        passOpen: passOpen,
        passSubmit: passSubmit,
        pvCta: pvCta,
        chargeSync: chargeSync,
        chargeSend: chargeSend,
        promoSwitchToggle: promoSwitchToggle,
        catSheetsSync: catSheetsSync,
        catEditLoad: catEditLoad,
        catePricesToggle: catePricesToggle,
        gdEditRender: gdEditRender,
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
        if (t) t.textContent = on ? 'محصولاتت ویژه‌اند' : 'محصولاتت را ویژه کن';
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

        /* بج ویژه روی کارت‌های محصول */
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
            else sub.textContent = 'روی همهٔ محصولات کاتالوگ اعمال می‌شود';
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       FD-9 — تغییر قیمت‌ها (۳۳): دو نیت + ورودی دوگانه + اعتبار
       ─────────────────────────────────────────────────────────────
       حکم مالک:
       ▸ «آپدیت سریع با همین قیمت‌ها» = تمدید اعتبار با چیپ روزِ انتخابی؛
         پیام: «به قیمت‌های کاتالوگ تا N روز دیگر اعتبار داده شد».
       ▸ «تغییر قیمت‌ها» = درصد ⇄ قیمتِ محصولِ مرجع (هم‌گام — قانون
         دوگانه) + ویرایش دستی ردیف‌ها (قوت طرح قبلی).
       ▸ مبنای ردیف‌ها از دیتای زنده می‌آید (نه HTML) — آپدیت سریعِ
         تک‌کالا (۰۵) هم بلافاصله اینجا می‌نشیند.
       ═══════════════════════════════════════════════════════════════ */
    var BULK = { mode: 'choice', base: {}, refId: null };

    var DAY_WORDS = { 1: 'یک', 2: 'دو', 3: 'سه', 4: 'چهار', 5: 'پنج' };

    /* چیپ‌های روز — خواندن/نشان‌دادن (کلاس pills سراسری فعال‌سازی را انجام می‌دهد) */
    function readDaysPills(sel) {
        var host = $(sel);
        if (!host) return 3;
        var act = host.querySelector('.pill.active');
        return act ? (parseInt(act.dataset.valid, 10) || 3) : 3;
    }

    function setDaysPills(sel, d) {
        var host = $(sel);
        if (!host) return;
        $$('.pill', host).forEach(function (p) {
            p.classList.toggle('active', parseInt(p.dataset.valid, 10) === d);
        });
    }

    function bulkReset() {
        BULK.mode = 'choice';
        BULK.base = {};
        BULK.refId = null;

        /* مبنای زندهٔ قیمت‌ها از دیتا */
        var firstRow = $('#bulk-grid .bulk-row');
        $$('#bulk-grid .bulk-row').forEach(function (row) {
            var id = row.dataset.bkId;
            var inp = row.querySelector('.bk-price');
            var l = _findListing(id);
            var base = l ? l.price : parseNum(row.dataset.bkBase || '0');
            if (id && inp) {
                BULK.base[id] = base;
                row.dataset.bkBase = String(base);
                inp.value = faMoney(base);
                if (!BULK.refId) BULK.refId = id;
            }
        });

        /* برچسب محصول مرجع (اولین ردیف) */
        var refL = _findListing(BULK.refId);
        var refLbl = $('#bulk-ref-lbl');
        if (refLbl && refL) {
            var shortName = refL.name.replace(' گلستان', '');
            refLbl.textContent = '«' + shortName + '» بشود';
        }

        var pctInp = $('#bulk-pct');
        if (pctInp) pctInp.value = '۰';
        var amtInp = $('#bulk-amt');
        if (amtInp) amtInp.value = faMoney(BULK.base[BULK.refId] || 0);

        bulkModeSync();
        bulkRefreshDirty();
    }

    function bulkModeSync() {
        var choice = $('#bk-choice');
        if (choice) choice.hidden = (BULK.mode !== 'choice');
        var edit = $('#bulk-edit');
        if (edit) edit.hidden = (BULK.mode !== 'edit');
        var bar = $('#bulk-bar');
        if (bar) bar.hidden = (BULK.mode !== 'edit');
    }

    /* ─── نیت ۱: آپدیت سریع با همین قیمت‌ها ─── */
    function bulkQuick() {
        var d = readDaysPills('#bulk-valid');
        core.data.listings.forEach(function (l) {
            l.priceValidDays = d;
            l.priceStale = false;
        });
        core.toast('به قیمت‌های کاتالوگ تا ' + DAY_WORDS[d] + ' روز دیگر اعتبار داده شد', 'success');
        setTimeout(function () {
            core.resetStack();
            core.show('s-catalog', false);
        }, 750);
    }

    /* ─── نیت ۲: حالت تغییر ─── */
    function bulkToEdit() {
        BULK.mode = 'edit';
        bulkModeSync();
    }

    function bulkCancel() {
        BULK.mode = 'choice';
        /* برگرداندن ردیف‌ها به مبنای زنده */
        $$('#bulk-grid .bulk-row').forEach(function (row) {
            var inp = row.querySelector('.bk-price');
            var base = BULK.base[row.dataset.bkId];
            if (inp && base !== undefined) inp.value = faMoney(base);
        });
        var pctInp = $('#bulk-pct');
        if (pctInp) pctInp.value = '۰';
        var amtInp = $('#bulk-amt');
        if (amtInp) amtInp.value = faMoney(BULK.base[BULK.refId] || 0);
        bulkModeSync();
        bulkRefreshDirty();
    }

    /* خواندن درصد از اینپوت */
    function _bulkPct() {
        var inp = $('#bulk-pct');
        if (!inp) return 0;
        var v = _pctParseLoose(inp.value);
        if (v > 30) v = 30;
        if (v < -30) v = -30;
        return v;
    }

    /* اعمال درصد روی همهٔ ردیف‌ها + سینک مبلغ مرجع (قانون دوگانه) */
    function bulkSetPct(v, fromAmt) {
        v = Math.max(-30, Math.min(30, v));
        var inp = $('#bulk-pct');
        if (inp) inp.value = faPctSigned(v);

        if (!fromAmt) {
            var amtIn = $('#bulk-amt');
            var refBase = BULK.base[BULK.refId] || 0;
            if (amtIn && refBase > 0) {
                amtIn.value = faMoney(Math.max(0, Math.round(refBase * (1 + v / 100))));
            }
        }

        $$('#bulk-grid .bulk-row').forEach(function (row) {
            var inp2 = row.querySelector('.bk-price');
            var base = BULK.base[row.dataset.bkId];
            if (inp2 && base > 0) {
                inp2.value = faMoney(Math.max(0, Math.round(base * (1 + v / 100))));
            }
        });

        bulkRefreshDirty();
    }

    /* مبلغ مرجع عوض شد → درصد خودش حساب می‌شود (قانون دوگانه) */
    function bulkSetAmt(amtVal) {
        var refBase = BULK.base[BULK.refId] || 0;
        var v = refBase > 0 ? ((amtVal - refBase) / refBase) * 100 : 0;
        bulkSetPct(v, true);
        var amtIn = $('#bulk-amt');
        if (amtIn) amtIn.value = faMoney(amtVal);
    }

    /* تغییر یک ردیف با دکمه‌های ± */
    function bulkStep(id, dir, stepPct) {
        stepPct = stepPct || 1; /* پیش‌فرض ۱٪ */
        var row = document.querySelector('#bulk-grid .bulk-row[data-bk-id="' + id + '"]');
        if (!row) return;
        var inp = row.querySelector('.bk-price');
        var base = BULK.base[id] || parseNum(row.dataset.bkBase || '0');
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
            var base = BULK.base[row.dataset.bkId] || 0;
            if (!inp) return;
            var cur = parseNum(inp.value);
            var changed = cur !== base;
            row.classList.toggle('chg', changed);
            if (changed) dirty++;
        });
        var save = $('#bulk-save');
        if (save) save.disabled = (dirty === 0);
        var cnt = $('#bulk-count');
        if (cnt) cnt.textContent = dirty ? '(' + faNum(dirty) + ')' : '';
    }

    function bulkApply() {
        var d = readDaysPills('#bulk-valid');
        var count = 0;
        $$('#bulk-grid .bulk-row').forEach(function (row) {
            var id = row.dataset.bkId;
            var inp = row.querySelector('.bk-price');
            if (!inp) return;
            var cur = parseNum(inp.value);
            var base = BULK.base[id] || 0;
            if (cur === base) return;

            core.data.listings.forEach(function (l) {
                if (l.id === id) {
                    l.price = cur;
                    if (l.packCount) l.pricePerUnit = Math.round(cur / l.packCount);
                    count++;
                }
            });
        });

        /* اعتبارِ قیمت‌ها همیشه با همین به‌روزرسانی تمدید می‌شود (حکم مالک) */
        core.data.listings.forEach(function (l) {
            l.priceValidDays = d;
            l.priceStale = false;
        });

        core.toast(count > 0
            ? faNum(count) + ' قیمت به‌روز شد — تا ' + DAY_WORDS[d] + ' روز دیگر اعتبار داده شد'
            : 'به قیمت‌های کاتالوگ تا ' + DAY_WORDS[d] + ' روز دیگر اعتبار داده شد', 'success');
        setTimeout(function () {
            core.resetStack();
            core.show('s-catalog', false);
        }, 850);
    }

    /* ═══════════════════════════════════════════════════════════════
       FD-9 — کمکی‌های مشترک ورودی دوگانهٔ «درصد ⇄ مبلغ»
       ═══════════════════════════════════════════════════════════════ */
    function _pctParseLoose(s) {
        var v = parseFloat(String(s || '')
            .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
            .replace(/[٪%−\s]/g, '').replace('٫', '.'));
        if (isNaN(v)) v = 0;
        return v;
    }

    function _pctClampLoose(v, min, max) {
        if (isNaN(v)) v = 0;
        return Math.max(min, Math.min(max, v));
    }

    /* نمایش درصد فارسی — اعشار در صورت نیاز (۷ یا ۷٫۵) */
    function faPct(v) {
        var r = Math.round(v * 10) / 10;
        var neg = r < 0;
        var s = String(Math.abs(r)).replace('.', '٫').replace(/\d/g, function (d) {
            return '۰۱۲۳۴۵۶۷۸۹'[+d];
        });
        return (neg ? '−' : '') + s;
    }

    function faPctSigned(v) { return faPct(v); }




    /* ═══════════════════════════════════════════════════════════════
       شارژ
       ═══════════════════════════════════════════════════════════════ */
    function chargeSync() {
        var w = core.data.user.wallet || 0;
        $$('[data-wallet]').forEach(function (el) { el.textContent = faMoney(w); });

        /* FD-7: کارت «امتیاز به شارژ» در صفحهٔ شارژ (۳۵) — پلِ طرح امتیاز با
           همین صفحه؛ وضعیت زنده از امتیاز فروش (صفحهٔ شارژ سمت فروش است):
           < ۱۰۰ → «به ۱۰۰ که برسی…» · ≥ ۱۰۰ → «N امتیازِ اضافه قابل تبدیل» */
        var note = $('#ch-score-note');
        if (note) {
            var s = scoreCalc(core.data.scoreItemsSell);
            note.innerHTML = (s >= 100)
                ? 'در شبکه هستی — <b>' + faNum(s) + '</b> امتیاز داری؛ <b>' + faNum(s - 100) +
                  ' امتیازِ اضافه</b> را می‌توانی به شارژ تبلیغات تبدیل کنی.'
                : 'به <b>۱۰۰ امتیاز</b> که برسی، درِ شبکهٔ آی‌مچ باز می‌شود و هر امتیازِ اضافه را می‌توانی به شارژ تبدیل کنی. الان <b>' + faNum(s) + '</b> امتیاز داری.';
        }
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
        core.toast(core.data.user.catalogPromo ? 'محصولات ویژه شدند' : 'ویژه‌سازی خاموش شد', 'success');
    }


    /* ═════════════════════════════════════════════════════════════
       فاز دفتر مشتری — شیت‌های تنظیمات کاتالوگ
       ═════════════════════════════════════════════════════════════ */

    var CATF = { q: '', group: null };   /* فیلتر کاتالوگ: جستجو + گروه کالا */
    var gdEditListing = null;             /* محصول در حال ویرایش (s-sell-edit) */

    function _pctClamp(v) { v = parseInt(v, 10); if (isNaN(v)) v = 0; return Math.max(0, Math.min(50, v)); }

    /* ─── چیپ‌های گروه کالا + فیلتر گرید ─── */
    function catChipsRender() {
        var host = $('#cat-groups');
        if (!host) return;
        var h = '<button class="chip' + (CATF.group ? '' : ' active') + '" data-gid="" type="button">همه</button>';
        core.data.catalogGroups.forEach(function (g) {
            h += '<button class="chip' + (CATF.group === g.id ? ' active' : '') + '" data-gid="' + g.id + '" type="button">' + esc(g.name) + '</button>';
        });
        host.innerHTML = h;
    }

    function catFilterApply() {
        $$('#cat-grid .pcard').forEach(function (p) {
            var okG = !CATF.group || p.dataset.gid === CATF.group;
            var nmEl = p.querySelector('.pname');
            var nm = nmEl ? nmEl.textContent : '';
            var okQ = !CATF.q || nm.indexOf(CATF.q.trim()) > -1;
            p.style.display = (okG && okQ) ? '' : 'none';
        });
    }

    /* ─── تخفیفات حجمی (پله‌ای) ─── */
    function volSync() {
        var sw = $('#vol-on'); if (!sw) return;
        var on = !!core.data.volumeTiersOn;
        sw.classList.toggle('on', on);
        var list = $('#vol-list');
        if (list) { list.style.opacity = on ? '' : '.45'; list.style.pointerEvents = on ? '' : 'none'; }
        var add = $('#vol-add');
        if (add) add.style.display = on ? '' : 'none';
    }

    function volRender() {
        var host = $('#vol-list');
        if (!host) return;
        volSync();
        var tiers = core.data.volumeTiers;        var host = $('#vol-list');
        if (!host) return;
        var tiers = core.data.volumeTiers;
        if (!tiers.length) {
            host.innerHTML = '<div class="empty" style="padding:16px 12px;margin-bottom:6px">' +
                '<h3 style="margin-bottom:4px">هنوز پله‌ای نساخته‌ای</h3>' +
                '<p style="margin-bottom:0">مثلاً: از ۱۰ عدد به بالا ٪۲، از ۲۰ عدد به بالا ٪۵.</p></div>';
            return;
        }
        host.innerHTML = tiers.map(function (t, i) {
            return '<div class="tier-row">' +
                '<div class="tier-min-tx">از <input class="tier-min" data-vol-min="' + i + '" value="' + faNum(t.min) + '" inputmode="numeric"> عدد بالا</div>' +
                '<div class="gd-step">' +
                    '<button class="bk-step" type="button" data-vol-step="-1" data-vol-i="' + i + '" aria-label="کاهش">−</button>' +
                    '<input class="gd-pct" data-vol-val="' + i + '" value="' + faNum(t.pct) + '" inputmode="numeric">' +
                    '<span class="gd-sign">٪</span>' +
                    '<button class="bk-step" type="button" data-vol-step="1" data-vol-i="' + i + '" aria-label="افزایش">+</button>' +
                '</div>' +
                '<button class="icon-btn plain" type="button" data-vol-del="' + i + '" aria-label="حذف پله"><svg style="color:var(--red)"><use href="#i-trash"/></svg></button>' +
            '</div>';
        }).join('');
    }

    function volAdd() {
        var tiers = core.data.volumeTiers;
        var maxMin = 0, maxPct = 0;
        tiers.forEach(function (t) { if (t.min > maxMin) maxMin = t.min; if (t.pct > maxPct) maxPct = t.pct; });
        tiers.push({ min: maxMin ? maxMin + 10 : 5, pct: _pctClamp(maxPct + 1 || 2) });
        tiers.sort(function (a, b) { return a.min - b.min; });
        volRender();
    }

    /* ─── تخفیفات گروه مشتری ─── */
    function cgdiscRender() {
        var host = $('#cgdisc-list');
        if (!host) return;
        var gs = core.data.customerGroups;
        if (!gs.length) {
            host.innerHTML = '<div class="empty" style="padding:16px 12px;margin-bottom:6px">' +
                '<h3 style="margin-bottom:4px">هنوز گروهی نداری</h3>' +
                '<p style="margin-bottom:0">اول از صفحهٔ «مشتریان من ← گروه‌های مشتری» گروه بساز.</p></div>';
            return;
        }
        host.innerHTML = gs.map(function (g) {
            var n = core.data.customers.filter(function (c) { return c.groupId === g.id; }).length;
            return '<div class="gd-row">' +
                '<div class="gd-ic"><svg><use href="#i-users"/></svg></div>' +
                '<div class="gd-tx"><b>' + esc(g.name) + '</b><span>' + faNum(n) + ' مشتری در این گروه</span></div>' +
                '<div class="gd-step">' +
                    '<button class="bk-step" type="button" data-cgd-step="-1" data-cgd-id="' + g.id + '" aria-label="کاهش">−</button>' +
                    '<input class="gd-pct" data-cgd-val="' + g.id + '" value="' + faNum(g.discount) + '" inputmode="numeric">' +
                    '<span class="gd-sign">٪</span>' +
                    '<button class="bk-step" type="button" data-cgd-step="1" data-cgd-id="' + g.id + '" aria-label="افزایش">+</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function cgdSet(id, val) {
        core.data.customerGroups.forEach(function (g) {
            if (g.id === id) g.discount = _pctClamp(val);
        });
    }

    /* ─── گروه‌های کالا ─── */
    function catgrRender() {
        var host = $('#catgr-list');
        if (!host) return;
        var gs = core.data.catalogGroups;
        if (!gs.length) {
            host.innerHTML = '<div class="empty" style="padding:16px 12px;margin-bottom:6px">' +
                '<h3 style="margin-bottom:4px">هنوز گروه کالایی نداری</h3>' +
                '<p style="margin-bottom:0">گروه بساز تا کاتالوگت دسته‌بندی شود.</p></div>';
            return;
        }
        host.innerHTML = gs.map(function (g) {
            var cnt = $$('#cat-grid .pcard[data-gid="' + g.id + '"]').length;
            return '<div class="gd-row">' +
                '<input class="input catgr-name-input" data-catgr-name="' + g.id + '" value="' + esc(g.name) + '">' +
                '<span style="font-size:10.5px;color:var(--text-3);flex-shrink:0;">' + faNum(cnt) + ' محصول</span>' +
                '<button class="icon-btn plain" type="button" data-catgr-del="' + g.id + '" aria-label="حذف گروه"><svg style="color:var(--red)"><use href="#i-trash"/></svg></button>' +
            '</div>';
        }).join('');
    }

    function catgrDelete(id) {
        var g = null;
        core.data.catalogGroups.forEach(function (x) { if (x.id === id) g = x; });
        if (!g) return;
        var cnt = $$('#cat-grid .pcard[data-gid="' + id + '"]').length;
        var doDel = function () {
            core.data.catalogGroups = core.data.catalogGroups.filter(function (x) { return x.id !== id; });
            if (CATF.group === id) CATF.group = null;
            catgrRender();
            catChipsRender();
            catFilterApply();
            toast('گروه کالا حذف شد', 'success');
        };
        if (cnt > 0) {
            core.confirm({
                title: 'حذف گروه کالا',
                text: '«' + g.name + '» حذف می‌شود. محصولات این گروه در «همه» می‌مانند.',
                ok: 'حذف گروه', cancel: 'انصراف', danger: true
            }).then(function (ok) { if (ok) doDel(); });
        } else doDel();
    }

    /* ─── سینک کلی کاتالوگ ─── */
    function catSheetsSync() {
        catChipsRender();
        catFilterApply();
        volRender();
        cgdiscRender();
        catgrRender();
    }

    /* ─── ویرایش کاتالوگ (36) ─── */
    var LOGO_COLORS = [
        'linear-gradient(135deg,#c2703a,#ea580c)',
        'var(--stone)', '#7c3aed', '#0e7490', '#2563EB', '#16A34A', '#DC2626'
    ];

    function activeBusiness() {
        var b = null;
        core.data.businesses.forEach(function (x) { if (x.id === core.data.user.activeBusinessId) b = x; });
        return b || core.data.businesses[0];
    }

    function cateLogoSync() {
        var b = activeBusiness();
        var av = $('#cate-logo');
        if (av) {
            av.textContent = (b.name || '؟').charAt(0);
            av.style.background = b.logoColor;
        }
        var pn = $('#cate-pv-name'); if (pn) pn.textContent = b.name;
        var pc = $('#cate-pv-city'); if (pc) pc.textContent = b.city;
    }

    function catLogoColorsRender() {
        var host = $('#cate-colors');
        if (!host) return;
        var b = activeBusiness();
        host.innerHTML = LOGO_COLORS.map(function (c) {
            return '<button class="logo-opt' + (b.logoColor === c ? ' on' : '') + '" type="button" data-logo-color="' + c + '" style="background:' + c + '" aria-label="رنگ لوگو">' +
                esc((b.name || '؟').charAt(0)) + '</button>';
        }).join('');
    }

    function catEditLoad() {
        var b = activeBusiness();
        if (!b) return;
        var set = function (id, v) { var el = $(id); if (el) el.value = v || ''; };
        set('#cate-name', b.name);
        set('#cate-city', b.city);
        set('#cate-desc', b.desc);
        set('#cate-addr', b.addr);
        var tEl = $('#cate-type-val');
        if (tEl) tEl.textContent = b.type || 'عمده‌فروش';
        cateLogoSync();
        catLogoColorsRender();
        /* FD-13: سوییچ «مشاهده قیمت‌ها فقط برای مشتریان» از تنظیمات زنده */
        catePricesSync();
    }

    /* ═══ FD-13: «مشاهده قیمت‌ها فقط برای مشتریان» (ویرایش کاتالوگ ۳۶) ═══
       سوییچ واقعاً کار می‌کند: data.catalogSettings.pricesCustomersOnly
       عوض می‌شود و کاتالوگ عمومی (۳۱/۳۷) با کلاس gated/open-market
       همان لحظه حالتش را عوض می‌کند. پیش‌فرض خاموش = بازارِ باز:
       قیمت‌ها برای همه (حتی مهمانِ ثبت‌نام‌نکرده) و سفارش بدون عضویت
       ممکن است — اولین سفارش کاتالوگ را خودکار ذخیره می‌کند (مشتری). */
    function catePricesSync() {
        var sw = $('#cate-prices-only');
        var hint = $('#cate-prices-hint');
        var on = !!(core.data.catalogSettings || {}).pricesCustomersOnly;
        if (sw) {
            sw.classList.toggle('on', on);
            sw.setAttribute('aria-checked', on ? 'true' : 'false');
        }
        if (hint) hint.textContent = on
            ? 'روشن — قیمت‌ها فقط برای مشتری‌های ذخیره‌شده؛ بقیه دکمهٔ «مشاهده قیمت» را می‌بینند.'
            : 'خاموش — قیمت‌ها برای همهٔ بازدیدکنندگان دیده می‌شود و بدون عضویت هم می‌توان سفارش داد.';
    }

    function catePricesToggle() {
        var set = core.data.catalogSettings;
        if (!set) return;
        set.pricesCustomersOnly = !set.pricesCustomersOnly;
        catePricesSync();
        toast(set.pricesCustomersOnly
            ? 'قیمت‌ها فقط برای مشتری‌های ذخیره‌شده دیده می‌شود'
            : 'قیمت‌ها برای همهٔ بازدیدکنندگان دیده می‌شود', 'success');
    }

    function catEditSave() {
        var b = activeBusiness();
        if (!b) return;
        var name = (($('#cate-name') || {}).value || '').trim();
        if (!name) { toast('نام کاتالوگ را وارد کن', 'error'); return; }
        b.name = name;
        b.city = (($('#cate-city') || {}).value || '').trim();
        b.desc = (($('#cate-desc') || {}).value || '').trim();
        b.addr = (($('#cate-addr') || {}).value || '').trim();
        var tEl2 = $('#cate-type-val');
        if (tEl2 && tEl2.textContent.trim()) b.type = tEl2.textContent.trim();
        toast('کاتالوگ ذخیره شد', 'success');
        setTimeout(function () { core.back(); }, 550);
    }

    /* ═══════════════════════════════════════════════════════════════
       FD-9 — تخفیف‌های مخصوص همین محصول (s-sell-edit)
       ─────────────────────────────────────────────────────────────
       حکم مالک:
       ▸ هر دو بلوک (تخفیف حجمی + تخفیف گروه مشتری) زیر «توضیحات».
       ▸ هر بلوک سوییچ دارد — خاموش = این محصول از آن تخفیف خارج می‌شود.
       ▸ ورودی دوگانه: [− درصد ٪ +] ⇄ [مبلغ تومان] — قانون همیشگی؛
         تغییر هر کدام، اونیکی را همان لحظه از روی قیمت محصول می‌سازد.
       ▸ پیش‌فرض از تنظیمات کاتالوگ ارث می‌برد (اولین رندر کپی می‌کند تا
         تغییر فقط روی همین محصول بنشیند: listing.volumeTiers / groupDiscounts).
       ▸ فرم از دیتای زندهٔ listing پر می‌شود (قیمت/موجودی/عکس/عنوان) و
         «یادآوری آپدیت قیمت» ۱-۵ روز (پیش‌فرض ۳) دارد.
       ═══════════════════════════════════════════════════════════════ */
    function gdEditRender() {
        var p = core.getSCREENParams()['s-sell-edit'] || {};
        gdEditListing = null;
        core.data.listings.forEach(function (l) { if (l.id === (p.id || 'l1')) gdEditListing = l; });
        if (!gdEditListing) return;
        var L = gdEditListing;

        /* ارث‌بری پیش‌فرض‌های تخفیف از کاتالوگ — فقط بار اول کپی می‌شود */
        if (!L.volumeTiers) {
            L.volumeTiers = core.data.volumeTiers.map(function (t) { return { min: t.min, pct: t.pct }; });
        }
        if (L.volumeTiersOn === undefined) L.volumeTiersOn = core.data.volumeTiersOn;
        if (L.groupDiscOn === undefined) L.groupDiscOn = true;
        if (!L.groupDiscounts) L.groupDiscounts = {};

        /* فرم از دیتای زنده پر می‌شود (کارت‌های کاتالوگ data-lid دارند) */
        var ttl = document.querySelector('#s-sell-edit .ttl small');
        if (ttl) ttl.textContent = L.name + ' · ' + L.pack;
        var nm = document.querySelector('#s-sell-edit .picked-card .nm');
        if (nm) nm.textContent = L.name;
        var sb = document.querySelector('#s-sell-edit .picked-card .sub');
        if (sb) sb.textContent = (L.brand ? L.brand + ' · ' : '') + L.pack + (L.baseUnit ? ' · ' + L.baseUnit : '');
        var pcImg = document.querySelector('#s-sell-edit .picked-card .thumb img');
        if (pcImg) pcImg.src = L.img;
        var slImg = document.querySelector('#s-sell-edit .img-slot-btn.has-img img');
        if (slImg) slImg.src = L.img;
        var priceEl = $('#edit-price');
        if (priceEl) priceEl.value = faMoney(L.price);
        var stockIn = $('#edit-stock');
        if (stockIn) stockIn.value = faNum(L.stock);
        var minIn = $('#edit-min');
        if (minIn) minIn.value = faNum(L.min);

        setDaysPills('#ed-valid', L.priceValidDays || 3);

        edSwitchSync();
        edVolRender();
        edGrpRender();
    }

    /* قیمتِ فعلیِ فرم — مبنای همهٔ تبدیل‌های دوگانه */
    function edBasePrice() {
        var v = parseNum(($('#edit-price') || {}).value);
        return v || (gdEditListing ? gdEditListing.price : 0);
    }

    function edSwitchSync() {
        var L = gdEditListing;
        if (!L) return;
        var vol = $('#ed-vol-on');
        if (vol) vol.classList.toggle('on', !!L.volumeTiersOn);
        var grp = $('#ed-grp-on');
        if (grp) grp.classList.toggle('on', !!L.groupDiscOn);
        var vb = $('#ed-disc-vol');
        if (vb) vb.classList.toggle('off', !L.volumeTiersOn);
        var gb = $('#ed-disc-grp');
        if (gb) gb.classList.toggle('off', !L.groupDiscOn);
    }

    /* ─── رندر بلوک تخفیف حجمی این محصول ─── */
    function edVolRender() {
        var host = $('#ed-vol-list');
        if (!host || !gdEditListing) return;
        var base = edBasePrice();
        var tiers = gdEditListing.volumeTiers;

        if (!tiers.length) {
            host.innerHTML = '<div class="empty" style="padding:14px 10px;margin:0">' +
                '<h3 style="margin-bottom:4px">پله‌ای نساخته‌ای</h3>' +
                '<p style="margin-bottom:0">مثلاً: از ۱۰ بسته به بالا ٪۲.</p></div>';
            return;
        }
        host.innerHTML = tiers.map(function (t, i) {
            var amt = Math.round(base * (1 - t.pct / 100));
            return '<div class="ed-item">' +
                '<div class="ed-line1">' +
                    '<div style="flex:1;min-width:0"><b>از <input class="tier-min" data-evol-min="' + i + '" value="' + faNum(t.min) + '" inputmode="numeric"> بسته به بالا</b>' +
                    '<small>' + esc(gdEditListing.pack || '') + ' — تخفیف پله‌ای همین محصول</small></div>' +
                    '<button class="ed-del" type="button" data-evol-del="' + i + '" aria-label="حذف پله"><svg><use href="#i-trash"/></svg></button>' +
                '</div>' +
                '<div class="bk-gc-row" style="padding:2px 0 0">' +
                    '<div class="gd-step">' +
                        '<button class="bk-step" type="button" data-evol-step="-1" data-evol-i="' + i + '" aria-label="کاهش">−</button>' +
                        '<input class="gd-pct" data-evol-pct="' + i + '" value="' + faPct(t.pct) + '" inputmode="decimal">' +
                        '<span class="gd-sign">٪</span>' +
                        '<button class="bk-step" type="button" data-evol-step="1" data-evol-i="' + i + '" aria-label="افزایش">+</button>' +
                    '</div>' +
                    '<span class="dual-eq">=</span>' +
                    '<div class="bk-gc-amt"><input class="bk-amt-in" data-evol-amt="' + i + '" value="' + faMoney(amt) + '" inputmode="numeric"><small>تومان</small></div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    /* ─── رندر بلوک تخفیف گروه مشتری این محصول ─── */
    function edGrpRender() {
        var host = $('#egd-list');
        if (!host || !gdEditListing) return;
        var base = edBasePrice();
        var L = gdEditListing;

        host.innerHTML = core.data.customerGroups.map(function (g) {
            var has = L.groupDiscounts[g.id] !== undefined;
            var v = has ? L.groupDiscounts[g.id] : g.discount;
            var n = core.data.customers.filter(function (c) { return c.groupId === g.id; }).length;
            var sub = has && v !== g.discount
                ? 'مخصوص این محصول — پیش‌فرض گروه ٪' + faPct(g.discount)
                : 'تخفیف پیش‌فرض گروه';
            var amt = Math.round(base * (1 - v / 100));
            return '<div class="ed-item">' +
                '<div class="ed-line1">' +
                    '<div style="flex:1;min-width:0"><b>' + esc(g.name) + '</b>' +
                    '<small>' + sub + ' · ' + faNum(n) + ' مشتری</small></div>' +
                '</div>' +
                '<div class="bk-gc-row" style="padding:2px 0 0">' +
                    '<div class="gd-step">' +
                        '<button class="bk-step" type="button" data-egd-step="-1" data-egd-id="' + g.id + '" aria-label="کاهش">−</button>' +
                        '<input class="gd-pct" data-egd-pct="' + g.id + '" value="' + faPct(v) + '" inputmode="decimal">' +
                        '<span class="gd-sign">٪</span>' +
                        '<button class="bk-step" type="button" data-egd-step="1" data-egd-id="' + g.id + '" aria-label="افزایش">+</button>' +
                    '</div>' +
                    '<span class="dual-eq">=</span>' +
                    '<div class="bk-gc-amt"><input class="bk-amt-in" data-egd-amt="' + g.id + '" value="' + faMoney(amt) + '" inputmode="numeric"><small>تومان</small></div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    /* ذخیرهٔ مقدار درصد گروه (رد شدن از پیش‌فرض گروه → در groupDiscounts می‌نشیند) */
    function egdSet(gid, val) {
        if (!gdEditListing) return;
        var g = null;
        core.data.customerGroups.forEach(function (x) { if (x.id === gid) g = x; });
        var v = Math.round(_pctClampLoose(val, 0, 99) * 10) / 10;
        if (g && v === g.discount) delete gdEditListing.groupDiscounts[gid];
        else gdEditListing.groupDiscounts[gid] = v;
    }

    /* ═══════════════════════════════════════════════════════════════
       FD-9 — شیت آپدیت سریع قیمتِ یک کالا (۰۵) + سینک کارت‌های کاتالوگ
       ═══════════════════════════════════════════════════════════════ */
    var QP = { lid: null, base: 0 };

    /* سینک زندهٔ قیمت/منقضی روی کارت‌های کاتالوگ (۰۵) */
    function catGridSync() {
        $$('#cat-grid .pcard[data-lid]').forEach(function (card) {
            var l = _findListing(card.dataset.lid);
            if (!l) return;
            var priceEl = card.querySelector('.pprice');
            if (priceEl) priceEl.innerHTML = faMoney(l.price) + ' <small>تومان</small>';
            var stale = !!l.priceStale;
            var badge = card.querySelector('.stale-badge');
            if (badge) badge.hidden = !stale;
            card.classList.toggle('stale', stale);
        });
    }

    function qpriceOpen(lid) {
        var l = _findListing(lid);
        if (!l) return;
        QP.lid = lid;
        QP.base = l.price;
        var sub = $('#qp-sub');
        if (sub) sub.textContent = l.name + ' · ' + l.pack;
        var pr = $('#qp-price');
        if (pr) pr.value = faMoney(l.price);
        var pc = $('#qp-pct');
        if (pc) pc.value = '۰';
        setDaysPills('#qp-valid', l.priceValidDays || 3);
        core.openSheet('sheet-quickprice');
    }

    function qpPctSet(v) {
        v = _pctClampLoose(v, -99, 99);
        var pc = $('#qp-pct');
        if (pc) pc.value = faPct(v);
        var pr = $('#qp-price');
        if (pr && QP.base > 0) pr.value = faMoney(Math.max(0, Math.round(QP.base * (1 + v / 100))));
    }

    function qpPriceSet(p) {
        var pr = $('#qp-price');
        if (pr) pr.value = faMoney(p);
        var v = QP.base > 0 ? ((p - QP.base) / QP.base) * 100 : 0;
        v = _pctClampLoose(Math.round(v * 10) / 10, -99, 99);
        var pc = $('#qp-pct');
        if (pc) pc.value = faPct(v);
    }

    function qpriceSave() {
        var l = _findListing(QP.lid);
        if (!l) return;
        var price = parseNum(($('#qp-price') || {}).value);
        if (!price) { toast('قیمت را وارد کن', 'error'); return; }
        var d = readDaysPills('#qp-valid');
        l.price = price;
        if (l.packCount) l.pricePerUnit = Math.round(price / l.packCount);
        l.priceValidDays = d;
        l.priceStale = false;
        core.closeSheet('sheet-quickprice');
        catGridSync();
        core.toast('قیمت «' + l.name + '» ثبت شد — تا ' + DAY_WORDS[d] + ' روز دیگر اعتبار دارد', 'success');
    }

    /* ─── حلقهٔ کلیک شیت‌های کاتالوگ ─── */
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;

        /* چیپ گروه کالا — فیلتر */
        var gchip = t.closest('#cat-groups .chip[data-gid]');
        if (gchip) {
            CATF.group = gchip.dataset.gid || null;
            catFilterApply();
            return;
        }

        /* تخفیف حجمی */
        var vstep = t.closest('[data-vol-step]');
        if (vstep) {
            var i = parseInt(vstep.dataset.volI, 10);
            var tEl = document.querySelector('[data-vol-val="' + i + '"]');
            if (tEl && core.data.volumeTiers[i] !== undefined) {
                var nv = _pctClamp(parseNum(tEl.value) + (parseFloat(vstep.dataset.volStep) || 0));
                core.data.volumeTiers[i].pct = nv;
                tEl.value = faNum(nv);
            }
            return;
        }
        var vdel = t.closest('[data-vol-del]');
        if (vdel) {
            core.data.volumeTiers.splice(parseInt(vdel.dataset.volDel, 10), 1);
            volRender();
            toast('پله حذف شد', 'success');
            return;
        }
        if (t.closest('#vol-on')) {
            core.data.volumeTiersOn = !core.data.volumeTiersOn;
            volSync();
            toast(core.data.volumeTiersOn ? 'تخفیف حجمی روشن شد' : 'تخفیف حجمی خاموش شد', 'success');
            return;
        }
        if (t.closest('#vol-add')) { volAdd(); return; }
        if (t.closest('#vol-save')) {
            core.data.volumeTiers.sort(function (a, b) { return a.min - b.min; });
            core.closeSheet('sheet-vol');
            toast('تخفیفات حجمی ذخیره شد', 'success');
            return;
        }

        /* تخفیف گروه مشتری (کاتالوگ) */
        var cstep = t.closest('[data-cgd-step]');
        if (cstep) {
            var gid = cstep.dataset.cgdId;
            var cEl = document.querySelector('[data-cgd-val="' + gid + '"]');
            if (cEl) {
                var cv = _pctClamp(parseNum(cEl.value) + (parseFloat(cstep.dataset.cgdStep) || 0));
                cgdSet(gid, cv);
                cEl.value = faNum(cv);
            }
            return;
        }
        if (t.closest('#cgdisc-save')) {
            core.closeSheet('sheet-cg-disc');
            toast('تخفیف گروه‌ها ذخیره شد', 'success');
            return;
        }

        /* گروه‌های کالا */
        var gdel = t.closest('[data-catgr-del]');
        if (gdel) { catgrDelete(gdel.dataset.catgrDel); return; }
        if (t.closest('#catgr-add')) {
            core.data.catalogGroups.push({ id: 'cgr_' + Date.now(), name: 'گروه جدید' });
            catgrRender();
            catChipsRender();
            return;
        }

        /* ویرایش کاتالوگ */
        var lopt = t.closest('[data-logo-color]');
        if (lopt) {
            var b = activeBusiness();
            if (b) b.logoColor = lopt.dataset.logoColor;
            cateLogoSync();
            catLogoColorsRender();
            return;
        }
        var bopt = t.closest('[data-biz-type]');
        if (bopt) {
            var bb = activeBusiness();
            if (bb) bb.type = bopt.dataset.bizType;
            var tv = $('#cate-type-val');
            if (tv) tv.textContent = bopt.dataset.bizType;
            core.closeSheet('sheet-cat-type');
            return;
        }
        if (t.closest('#cat-edit-save')) { catEditSave(); return; }

        /* ═══ FD-9: تخفیف‌های مخصوص همین محصول (s-sell-edit) ═══ */
        /* سوییچ‌ها — خاموش = این محصول از آن تخفیف خارج می‌شود */
        if (t.closest('#ed-vol-on') && gdEditListing) {
            gdEditListing.volumeTiersOn = !gdEditListing.volumeTiersOn;
            edSwitchSync();
            toast(gdEditListing.volumeTiersOn ? 'تخفیف حجمی این محصول روشن شد' : 'تخفیف حجمی این محصول خاموش شد', 'success');
            return;
        }
        if (t.closest('#ed-grp-on') && gdEditListing) {
            gdEditListing.groupDiscOn = !gdEditListing.groupDiscOn;
            edSwitchSync();
            toast(gdEditListing.groupDiscOn ? 'تخفیف گروهی این محصول روشن شد' : 'تخفیف گروهی این محصول خاموش شد', 'success');
            return;
        }

        /* تخفیف حجمی محصول — استپر ± / حذف پله / پلهٔ جدید */
        var evstep = t.closest('[data-evol-step]');
        if (evstep && gdEditListing) {
            var evi = parseInt(evstep.dataset.evolI, 10);
            if (gdEditListing.volumeTiers[evi] !== undefined) {
                var cur = _pctClampLoose(_pctParseLoose((document.querySelector('[data-evol-pct="' + evi + '"]') || {}).value) + (parseFloat(evstep.dataset.evolStep) || 0), 0, 99);
                gdEditListing.volumeTiers[evi].pct = cur;
                edVolRender();
            }
            return;
        }
        var evdel = t.closest('[data-evol-del]');
        if (evdel && gdEditListing) {
            gdEditListing.volumeTiers.splice(parseInt(evdel.dataset.evolDel, 10), 1);
            edVolRender();
            toast('پله حذف شد', 'success');
            return;
        }
        if (t.closest('#ed-vol-add') && gdEditListing) {
            var tiers = gdEditListing.volumeTiers;
            var maxMin = 0, maxPct = 0;
            tiers.forEach(function (x) { if (x.min > maxMin) maxMin = x.min; if (x.pct > maxPct) maxPct = x.pct; });
            tiers.push({ min: maxMin ? maxMin + 10 : 5, pct: _pctClampLoose(maxPct + 1 || 2, 0, 99) });
            tiers.sort(function (a, b) { return a.min - b.min; });
            edVolRender();
            return;
        }

        /* تخفیف گروه روی تک‌محصول — استپر ± (ورودی دوگانه: مبلغ هم تازه می‌شود) */
        var estep = t.closest('[data-egd-step]');
        if (estep) {
            var egid = estep.dataset.egdId;
            var eEl = document.querySelector('[data-egd-pct="' + egid + '"]');
            if (eEl) {
                var ev = _pctClampLoose(_pctParseLoose(eEl.value) + (parseFloat(estep.dataset.egdStep) || 0), 0, 99);
                egdSet(egid, ev);
                /* زیرنویس + مبلغ معادل را تازه کن */
                edGrpRender();
            }
            return;
        }
    });

    /* ─── حلقهٔ input شیت‌های کاتالوگ ─── */
    document.addEventListener('input', function (e) {
        var t = e.target;
        if (!t) return;

        /* ═══ FD-9: ورودی دوگانهٔ درصد ⇄ مبلغ (قانون همیشگی) ═══ */

        /* قیمت محصول در ویرایش عوض شد → معادل‌های مبلغ دو بلوک تازه شوند */
        if (t.id === 'edit-price') {
            edVolRender();
            edGrpRender();
            return;
        }

        /* تخفیف گروه محصول — درصد یا مبلغ */
        if (t.dataset && t.dataset.egdPct !== undefined) {
            var gp = _pctClampLoose(_pctParseLoose(t.value), 0, 99);
            egdSet(t.dataset.egdPct, gp);
            var gAmt = document.querySelector('[data-egd-amt="' + t.dataset.egdPct + '"]');
            if (gAmt) gAmt.value = faMoney(Math.max(0, Math.round(edBasePrice() * (1 - gp / 100))));
            return;
        }
        if (t.dataset && t.dataset.egdAmt !== undefined) {
            var gA = parseNum(t.value);
            var base1 = edBasePrice();
            var gpv = base1 > 0 ? _pctClampLoose(Math.round(((base1 - gA) / base1) * 1000) / 10, 0, 99) : 0;
            egdSet(t.dataset.egdAmt, gpv);
            var gPct = document.querySelector('[data-egd-pct="' + t.dataset.egdAmt + '"]');
            if (gPct) gPct.value = faPct(gpv);
            return;
        }

        /* تخفیف حجمی محصول — پله/درصد/مبلغ */
        if (t.dataset && t.dataset.evolMin !== undefined && gdEditListing) {
            var emi = parseInt(t.dataset.evolMin, 10);
            if (gdEditListing.volumeTiers[emi] !== undefined) gdEditListing.volumeTiers[emi].min = Math.max(1, parseNum(t.value));
            return;
        }
        if (t.dataset && t.dataset.evolPct !== undefined && gdEditListing) {
            var epi = parseInt(t.dataset.evolPct, 10);
            var epv = _pctClampLoose(_pctParseLoose(t.value), 0, 99);
            if (gdEditListing.volumeTiers[epi] !== undefined) gdEditListing.volumeTiers[epi].pct = epv;
            var eAmt = document.querySelector('[data-evol-amt="' + epi + '"]');
            if (eAmt) eAmt.value = faMoney(Math.max(0, Math.round(edBasePrice() * (1 - epv / 100))));
            return;
        }
        if (t.dataset && t.dataset.evolAmt !== undefined && gdEditListing) {
            var eai = parseInt(t.dataset.evolAmt, 10);
            var eAv = parseNum(t.value);
            var base2 = edBasePrice();
            var epv2 = base2 > 0 ? _pctClampLoose(Math.round(((base2 - eAv) / base2) * 1000) / 10, 0, 99) : 0;
            if (gdEditListing.volumeTiers[eai] !== undefined) gdEditListing.volumeTiers[eai].pct = epv2;
            var ePct = document.querySelector('[data-evol-pct="' + eai + '"]');
            if (ePct) ePct.value = faPct(epv2);
            return;
        }

        if (t.id === 'cat-search') {
            CATF.q = t.value;
            catFilterApply();
            return;
        }
        if (t.id === 'cate-name' || t.id === 'cate-city') {
            var b = activeBusiness();
            if (b) {
                if (t.id === 'cate-name') b.name = t.value.trim() || b.name;
                if (t.id === 'cate-city') b.city = t.value.trim();
            }
            cateLogoSync();
            return;
        }

        if (t.classList && t.classList.contains('tier-min')) {
            var i1 = parseInt(t.dataset.volMin, 10);
            if (core.data.volumeTiers[i1] !== undefined) core.data.volumeTiers[i1].min = Math.max(1, parseNum(t.value));
            return;
        }
        if (t.dataset && t.dataset.volVal !== undefined) {
            var i2 = parseInt(t.dataset.volVal, 10);
            var tv = _pctClamp(parseNum(t.value));
            if (core.data.volumeTiers[i2] !== undefined) core.data.volumeTiers[i2].pct = tv;
            return;
        }
        if (t.dataset && t.dataset.cgdVal !== undefined) {
            cgdSet(t.dataset.cgdVal, parseNum(t.value));
            return;
        }
        if (t.dataset && t.dataset.egdVal !== undefined) {
            egdSet(t.dataset.egdVal, parseNum(t.value));
            return;
        }
        if (t.dataset && t.dataset.catgrName !== undefined) {
            var gid2 = t.dataset.catgrName;
            core.data.catalogGroups.forEach(function (g) {
                if (g.id === gid2) g.name = t.value.trim() || g.name;
            });
            catChipsRender();
            return;
        }
    });
})();