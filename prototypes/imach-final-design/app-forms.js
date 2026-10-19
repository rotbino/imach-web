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
       ─────────────────────────────────────────────────────────────
       FD-16: کارت‌های امتیازِ درون‌صفحه (کاتالوگ ۰۵ — قبل‌تر، لیست خرید
       ۲۰ — این فاز) حذف شدند؛ امتیاز فقط در چیپ اپ‌بار/هدر می‌ماند.
       _scoreRingSync نگه داشته شد چون سینک‌های دیگر (FD-9) به آن
       ارجاع ندارند اما خروجی‌اش بی‌ضرر است؛ catalogScoreSync دیگر
       عنصری برای سینک ندارد و عملاً no-op است (تمیز‌کاری بعدی). */
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

    /* FD-16: کارت امتیاز کاتالوگ حذف شده — این سینک فقط برای سازگاری
       هوک‌های قدیمی مانده؛ عنصری پیدا نمی‌کند و کاری نمی‌کند. */
    function catalogScoreSync() {
        _scoreRingSync(scoreCalc(core.data.scoreItemsSell), '#cat-score-ring', '#cat-score-num');
    }

    /* FD-16: امتیاز لیست خرید — به‌جای کارت درون‌صفحه (حذف شد)، چیپ
       دایره‌ای در هدر (#bl-chip) — همان الگوی چیپ میزها؛ کلیک → صفحهٔ
       امتیازها (data-score-arm در app-handlers.js). */
    function buyListScoreSync() {
        var buy = scoreCalc(core.data.scoreItemsBuy);
        _chipRingSync(buy, '#bl-chip-ring', '#bl-chip-num', '#bl-chip');
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
        /* FD-33 (حکم مالک): زیرمتن «N در انتظار تایید» حذف —
           نشان قرمزِ بالای کاشی مشتریان (گویاتر و خوشگل‌تر) */
        var bdg = $('#desk-cust-badge');
        if (bdg) { bdg.hidden = !newN; bdg.textContent = faNum(newN); }

        /* FD-16: دو کاشی تازه — سفارشات رسیده + درخواست‌های قیمت */
        el = $('#desk-ord-num');
        if (el) el.textContent = faNum((core.data.ordersIn || []).length);
        el = $('#desk-rfq-num');
        if (el) el.textContent = faNum((core.data.rfqsIn || []).length);

        /* FD-16: ردیف «در انتظار تایید» در کارتابل (حکم مالک:
           حتماً این‌جا باشد) — مشتری جدید رسیده → دفتر مشتریان */
        var pr = $('#sell-pend-row');
        if (pr) {
            pr.hidden = newN === 0;
            var pt = $('#sell-pend-t');
            if (pt && newN) pt.textContent = faNum(newN) + ' مشتری جدید';
        }

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

        /* ۴) FD-14: شمارندهٔ کاشی لیست خرید — زنده از DATA.shoppingList
           (کالاهای افزوده‌شده از کاتالوگ ۳۱ همین‌جا دیده می‌شوند)
           FD-16: سه کاشی تازه — تأمین‌کننده‌ها (+در انتظار تایید) /
           سفارشات من (ordersOut) / استعلام‌های من (rfqsOut باز) */
        var ln = $('#buy-desk-list-n');
        if (ln) ln.textContent = faNum((core.data.shoppingList || []).length);
        var sups = (core.data.suppliers || []).filter(function (s) { return s.businessId === 'b2'; });
        var supNew = sups.filter(function (s) { return s.isNew; }).length;
        var sn = $('#buy-desk-sup-n');
        if (sn) sn.textContent = faNum(sups.length);
        var ss = $('#buy-desk-sup-sub');
        if (ss) ss.textContent = supNew ? faNum(supNew) + ' در انتظار تایید' : '';
        var on = $('#buy-desk-ord-n');
        if (on) on.textContent = faNum((core.data.ordersOut || []).length);
        var rn = $('#buy-desk-rfq-n');
        if (rn) rn.textContent = faNum((core.data.rfqsOut || []).filter(function (r) { return r.status === 'current'; }).length);

        /* FD-16: ردیف «در انتظار تایید» در کارتابل (حکم مالک) —
           پیشنهاد تامین رسیده → دفتر تأمین‌کننده‌ها */
        var bpr = $('#buy-pend-row');
        if (bpr) {
            bpr.hidden = supNew === 0;
            var bpt = $('#buy-pend-t');
            if (bpt && supNew) bpt.textContent = faNum(supNew) + ' تأمین‌کنندهٔ پیشنهادی';
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       پیام تشویق در صفحهٔ تأمین‌کنندگان یک کالا
       FD-16 (حکم مالک — متن‌های جدید):
       «تأمین‌کننده‌های این کالا را می‌شناسی؟ لیست خریدت رو برای تأمین‌کنندگان
       این کالا بفرست تا قیمت این کالا را از چند تأمین‌کننده ببینی و همزمان
       بتوانی استعلام قیمت بهتری بگیری. هر کسی که به لیست خرید شما پیشنهاد
       تامین دهد و شما تایید کنید، جز تأمین‌کنندگان شما خواهد بود و شما هم
       مشتری او خواهی شد و از مزایای مشتریان او مانند تخفیف و غیره برخوردار
       می‌شوید.» دکمه: «دعوت تأمین‌کننده‌های این کالا» → شیت اشتراک
       (data-share-buylist در app-handlers.js — sheet-share-buylist).
       ═══════════════════════════════════════════════════════════════ */
    function bpsRenderCta() {
        var host = $('#bps-cta');
        if (!host) return;
        var count = document.querySelectorAll('#s-buy-product-suppliers .sup-p-card').length;

        if (count === 0) {
            host.innerHTML =
                '<div class="bps-cta">' +
                '<div class="bps-ic"><svg><use href="#i-share"/></svg></div>' +
                '<div class="bps-title">تأمین‌کننده‌ای برای این کالا نداری</div>' +
                '<div class="bps-tx">لیست خریدت را برای تأمین‌کنندگان این کالا بفرست تا پیشنهاد تامین بدهند و قیمت این کالا را از چند نفر ببینی.</div>' +
                '<button class="btn btn-arm btn-block" data-share-buylist type="button">' +
                '<svg><use href="#i-share"/></svg> دعوت تأمین‌کننده‌های این کالا' +
                '</button>' +
                '</div>';
        } else {
            host.innerHTML =
                '<div class="bps-cta">' +
                '<div class="bps-ic"><svg><use href="#i-users"/></svg></div>' +
                '<div class="bps-title">تأمین‌کننده‌های این کالا را می‌شناسی؟</div>' +
                '<div class="bps-tx">لیست خریدت را برای تأمین‌کنندگان این کالا بفرست تا قیمت این کالا را از چند تأمین‌کننده ببینی و همزمان بتوانی استعلام قیمت بهتری بگیری. هر کسی که به لیست خرید شما پیشنهاد تامین دهد و شما تایید کنید، جز تأمین‌کنندگان شما خواهد بود و شما هم مشتری او خواهی شد و از مزایای مشتریان او مانند تخفیف و غیره برخوردار می‌شوید.</div>' +
                '<button class="btn btn-outline btn-block" data-share-buylist type="button">' +
                '<svg><use href="#i-share"/></svg> دعوت تأمین‌کننده‌های این کالا' +
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
                groupDiscounts: {},
                justAdded: true   /* FD-15: نشان «تازه افزوده» روی کارت کاتالوگ */
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
                groupDiscounts: {},
                justAdded: true   /* FD-15: نشان «تازه افزوده» روی کارت کاتالوگ */
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
       FD-15 — ثبت سریع: اسکنر بارکد + افزودن گروهی با متن
       ─────────────────────────────────────────────────────────────
       دو ابزار کنار جستجوی گام ۱ فرم افزودن (۱۳):
         ▸ sheet-scan     — بارکد ⇒ تطبیق کالای مرجع ⇒ گام ۳ آماده
         ▸ sheet-textlist — متن لیست قیمت ⇒ جدول ⇒ تیک ⇒ افزودن گروهی
       هر دو فقط از دیتای مرجع (references/goods/brands) کار می‌گیرند؛
       افزودن‌ها همان ساختار listing فرم اصلی (addSave) را می‌سازند تا
       کاتالوگِ پویا (catGridRender) همان‌جا نشانشان دهد.
       ═══════════════════════════════════════════════════════════════ */

    /* ─── اسکنر بارکد ─── */
    var SCAN = { refId: null };

    function scanOpen() {
        SCAN.refId = null;
        var inp = $('#scan-code'); if (inp) inp.value = '';
        var res = $('#scan-result'); if (res) res.innerHTML = '';
        core.openSheet('sheet-scan');
        setTimeout(function () { if (inp) inp.focus(); }, 120);
    }

    function scanDemo() {
        var inp = $('#scan-code');
        if (inp) inp.value = '6260101200010';
        scanGo();
    }

    function scanGo() {
        var inp = $('#scan-code');
        var code = String(inp ? inp.value : '').trim();
        var res = $('#scan-result');
        if (!res) return;
        if (!code) { res.innerHTML = ''; return; }

        var num = parseNum(code);
        var r = null;
        if (num > 0) core.data.references.forEach(function (x) {
            if (x.barcode && parseNum(x.barcode) === num) r = x;
        });

        if (!r) {
            SCAN.refId = null;
            /* FD-22 (تصمیم ۷/۹): کدِ ناشناس = محصول تازه — «بارکدش را
               نگه می‌داریم و اسمش را می‌پرسیم»، نه بن‌بست جستجو. */
            res.innerHTML =
                '<div class="hint-line" style="margin-top: 10px;">' +
                '<svg><use href="#i-info"/></svg>' +
                '<span>این بارکد در کالاهای مرجع پیدا نشد — می‌توانی همین حالا کالای جدیدش را بسازی یا با جستجو پیدایش کنی.</span></div>' +
                '<button class="btn btn-arm btn-block" id="scan-newprod" type="button" style="margin-top: 10px;">' +
                '<svg><use href="#i-plus"/></svg> ساخت کالا با همین بارکد</button>';
            return;
        }

        SCAN.refId = r.id;
        var packHint = (r.packs && r.packs.length) ? r.packs.map(function (p) { return p.label; }).join(' · ') : '';
        res.innerHTML =
            '<button class="pick-row" id="scan-continue" type="button" style="margin-top: 12px;">' +
            '<div class="thumb">' + (r.img ? '<img src="' + r.img + '" alt="">' : '') + '</div>' +
            '<div class="info"><div class="nm">' + esc(r.name) + '</div>' +
            '<div class="sub">تطبیق شد — ' + esc(r.brand || 'بدون برند') + (packHint ? ' · ' + esc(packHint) : '') + '</div></div>' +
            '<div class="chev"><svg><use href="#i-chev"/></svg></div></button>' +
            '<div class="hint-line"><svg><use href="#i-check"/></svg>' +
            '<span>ادامه بزن — فقط قیمت و شرایط فروش را وارد می‌کنی.</span></div>';
    }

    function scanContinue() {
        if (!SCAN.refId) return;
        core.closeSheet('sheet-scan');
        /* همان مسیر لمس محصول مرجع در نتایج جستجو — گام ۳ با دادهٔ کامل */
        addPickRef(SCAN.refId);
    }

    /* ─── تبدیل متن به کالا (sheet-textlist) ─── */
    var TX = { rows: [] };

    /* متن نمونه — قالب واتساپی: ستون‌ها با Tab؛ یک ردیف بدون قیمت و
       یکی هم کالای ناشناس (چیپس) تا هر سه وضعیت دمو دیده شود. */
    var TX_SAMPLE = [
        'نام کالا\tبرند\tبسته‌بندی\tقیمت هر بسته\tحداقل سفارش',
        'پفک نمکی\tاشی مشی\tکارتن ۵۰ عددی\t۲٬۴۰۰٬۰۰۰\t۲',
        'برنج هاشمی\tگلستان\tکیسه ۵۰ کیلویی\t۲٬۸۵۰٬۰۰۰\t۵',
        'روغن سرخ‌کردنی\tلادن\tکارتن ۶ بطری\t۱٬۵۶۰٬۰۰۰\t۴',
        'رب گوجه\tچین‌چین\tکارتن ۲۴ قوطی\t۱٬۲۰۰٬۰۰۰',
        'ماکارونی\tزر ماکارون\tکارتن ۲۰ بسته‌ای\t۹۸۰٬۰۰۰\t۱',
        'چیپس نمکی\tچهارخانه'
    ].join('\n');

    function txOpen() {
        TX.rows = [];
        txView('paste');
        core.openSheet('sheet-textlist');
        var inp = $('#tx-input');
        setTimeout(function () { if (inp) inp.focus(); }, 120);
    }

    function txView(which) {
        var a = $('#tx-paste'), b = $('#tx-review');
        if (a) a.hidden = (which !== 'paste');
        if (b) b.hidden = (which !== 'review');
    }

    function txDemo() {
        var inp = $('#tx-input');
        if (inp) inp.value = TX_SAMPLE;
    }

    /* فقط رقم/جداکننده؟ (کار «قیمت/تعداد» می‌شود نه «نام») */
    function txIsNum(s) {
        return /^[\s۰-۹0-9٬,،.\-–]+$/.test(s) && parseNum(s) > 0;
    }

    function txTokens(s) {
        return String(s || '').split(/[\s\u200c]+/).filter(function (w) {
            return w.replace(/\u200c/g, '').length >= 2;
        });
    }

    /* بهترین تطبیق مرجع: امتیاز = واژه‌های مشترک نام + تطبیق برند */
    function txMatch(name, brand) {
        var toks = txTokens(name);
        var best = null, bestScore = -1;
        core.data.references.forEach(function (r) {
            var rn = (r.name + ' ' + (r.brand || '')).toLowerCase();
            var hit = 0;
            toks.forEach(function (w) { if (rn.indexOf(w.toLowerCase()) > -1) hit++; });
            if (!hit) return;
            var score = hit;
            if (brand && r.brand && r.brand.toLowerCase().indexOf(brand.toLowerCase()) > -1) score += 2;
            if (score > bestScore) { bestScore = score; best = r; }
        });
        return best;
    }

    function txGoodMatch(name) {
        var toks = txTokens(name);
        var best = null, bestHit = 0;
        core.data.goods.forEach(function (g) {
            var gn = g.name.toLowerCase();
            var hit = 0;
            toks.forEach(function (w) { if (gn.indexOf(w.toLowerCase()) > -1) hit++; });
            if (hit > bestHit) { bestHit = hit; best = g; }
        });
        return best;
    }

    function txParse() {
        var el = $('#tx-input');
        var text = (el && el.value) || '';
        var bizId = core.data.user.activeBusinessId;
        var rows = [];

        text.split(/\n+/).forEach(function (raw) {
            var line = raw.replace(/\u200f/g, '').trim();
            if (!line) return;
            var chunks = line.split(/\t+|\s{2,}/).map(function (c) { return c.trim(); }).filter(Boolean);
            if (!chunks.length) return;

            /* خط عنوان ستون‌ها؟ نادیده گرفته می‌شود */
            var low = line.toLowerCase();
            if (low.indexOf('نام') > -1 && (low.indexOf('قیمت') > -1 || low.indexOf('برند') > -1 ||
                low.indexOf('حداقل') > -1 || low.indexOf('بسته') > -1)) return;

            var name = chunks[0], brand = '', packRaw = '', nums = [];

            if (chunks.length === 1 && /\s/.test(chunks[0])) {
                /* فاصلهٔ تکی (متن خام واتساپ): از آخر اعداد را بردار،
                   برند شناخته‌شده و بسته‌بندی را از دل متن بیرون بکش */
                var toks = chunks[0].split(/\s+/).filter(Boolean);
                while (toks.length > 1 && txIsNum(toks[toks.length - 1]) && nums.length < 2) {
                    nums.unshift(parseNum(toks.pop()));
                }
                var restStr = toks.join(' ');
                var brandHit = null;
                core.data.brands.forEach(function (b) {
                    if (!brandHit && b.name && restStr.indexOf(b.name) > -1) brandHit = b;
                });
                if (brandHit) {
                    brand = brandHit.name;
                    restStr = restStr.replace(brandHit.name, ' ').replace(/\s{2,}/g, ' ').trim();
                }
                var pm = restStr.match(/((?:کارتن|کیسه|بسته|قوطی)\s*[\d۰-۹]*\s*(?:عددی|بسته‌ای|بطری|کیلویی)?)/);
                if (pm) {
                    packRaw = pm[1].trim();
                    restStr = restStr.replace(pm[1], ' ').replace(/\s{2,}/g, ' ').trim();
                }
                name = restStr.trim() || chunks[0];
            } else {
                chunks.slice(1).forEach(function (c) {
                    if (txIsNum(c)) { nums.push(parseNum(c)); return; }
                    if (!packRaw && /(کارتن|کیسه|بسته|قوطی|شیشه|گرم|لیتر|کیلو|عددی|بسته‌ای|کارته)/.test(c)) { packRaw = c; return; }
                    if (!brand) brand = c;
                });
            }

            var price = nums.length ? nums[0] : 0;
            var min = nums.length > 1 ? nums[1] : 1;
            var packLabel = packRaw || 'بسته';
            var packCount = packRaw ? (parseNum(packRaw) || 1) : 1;

            var r = txMatch(name, brand);
            var g = r ? null : txGoodMatch(name);

            /* بسته‌بندی متن با بستهٔ مرجع یکی بود ⇒ همان بستهٔ مرجع؛
               بسته‌بندی نداشت ⇒ اولین بستهٔ مرجع */
            var packId = 'custom';
            if (r && r.packs && packRaw) {
                r.packs.forEach(function (p) {
                    if (p.count === packCount || p.label === packRaw) { packId = p.id; packLabel = p.label; packCount = p.count; }
                });
            } else if (r && r.packs && r.packs.length && !packRaw) {
                packId = r.packs[0].id;
                packLabel = r.packs[0].label;
                packCount = r.packs[0].count;
            }

            var dup = false;
            if (r) {
                dup = core.data.listings.some(function (l) {
                    return l.businessId === bizId && l.refId === r.id && l.pack === packLabel;
                });
            }

            rows.push({
                name: name, brand: brand,
                packLabel: packLabel, packCount: packCount, packId: packId,
                price: price, min: min,
                refId: r ? r.id : null,
                goodId: r ? r.goodId : (g ? g.id : null),
                goodName: g ? g.name : null,
                img: r ? r.img : null,
                dup: dup,
                on: !!price && !dup
            });
        });

        TX.rows = rows;
        if (!rows.length) {
            txView('paste');
            toast('چیزی از متن خوانده نشد — هر خط یک کالا و ستون‌ها با Tab یا چند فاصله', 'error');
            return;
        }
        txRender();
        txView('review');
    }

    function txRender() {
        var host = $('#tx-rows');
        if (host) {
            host.innerHTML = TX.rows.map(function (row, i) {
                var st, stCls, stIc;
                if (row.dup)      { st = 'از قبل در کاتالوگ داری'; stCls = 'dup'; stIc = 'check'; }
                else if (!row.price) { st = 'قیمت ندارد — دستی اضافه کن یا متن را اصلاح کن'; stCls = 'err'; stIc = 'info'; }
                else if (row.refId)  { st = 'تطبیق شد با کالای مرجع'; stCls = 'ok'; stIc = 'check'; }
                else if (row.goodId) { st = 'کالای «' + row.goodName + '» — محصول جدید ثبت می‌شود'; stCls = 'warn'; stIc = 'sparkles'; }
                else                 { st = 'در مرجع‌ها نبود — کالای جدید ثبت می‌شود'; stCls = 'warn'; stIc = 'sparkles'; }
                return '<div class="tx-row">' +
                    '<button class="tx-chk' + (row.on ? ' on' : '') + (row.dup || !row.price ? ' locked' : '') +
                        '" type="button" data-tx-chk="' + i + '" aria-label="انتخاب برای افزودن">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4.5 12.5l5 5 10-11"/></svg>' +
                    '</button>' +
                    '<div class="tx-info">' +
                        '<b>' + esc(row.name) + (row.brand ? ' · ' + esc(row.brand) : '') + '</b>' +
                        '<small>' + esc(row.packLabel) + (row.price ? ' — قیمت هر بسته: ' + faMoney(row.price) + ' تومان' : '') +
                            (row.min > 1 ? ' · حداقل: ' + faNum(row.min) : '') + '</small>' +
                        '<span class="tx-status ' + stCls + '"><svg><use href="#i-' + stIc + '"/></svg> ' + st + '</span>' +
                    '</div>' +
                '</div>';
            }).join('');
        }
        var sub = $('#tx-review-sub');
        if (sub) {
            var n = TX.rows.length;
            var ready = TX.rows.filter(function (r) { return r.on; }).length;
            sub.textContent = faNum(n) + ' کالا از متن خوانده شد' + (ready ? ' — ' + faNum(ready) + ' تاییدشده' : '');
        }
        txBtnSync();
    }

    function txBtnSync() {
        var n = TX.rows.filter(function (r) { return r.on; }).length;
        var btn = $('#tx-confirm'), tx = $('#tx-confirm-tx');
        if (btn) btn.disabled = n === 0;
        if (tx) tx.textContent = n ? 'افزودن ' + faNum(n) + ' کالای تاییدشده به کاتالوگ' : 'افزودن کالاهای تاییدشده';
    }

    function txToggle(i) {
        var row = TX.rows[i];
        if (!row || row.dup || !row.price) return;
        row.on = !row.on;
        var el = $('[data-tx-chk="' + i + '"]');
        if (el) el.classList.toggle('on', row.on);
        txBtnSync();
    }

    function txBack() { txView('paste'); }

    function txConfirm() {
        var added = 0;
        var bizId = core.data.user.activeBusinessId;

        TX.rows.forEach(function (row) {
            if (!row.on) return;

            var r = row.refId ? findRef(row.refId) : null;
            var g = null, brandId = null;

            if (!r) {
                /* کالای جدید؟ اول خودِ کالا (good) — بعد محصولِ برنددار */
                if (row.goodId) g = findGood(row.goodId);
                if (!g) {
                    g = { id: 'g_' + Date.now(), name: row.name, emoji: '📦', baseUnit: 'واحد', consumerUnit: 'بسته', attrs: [] };
                    core.data.goods.push(g);
                }
                if (row.brand) {
                    var b = core.data.brands.find(function (x) { return x.name === row.brand; });
                    if (!b) { b = { id: 'br_' + Date.now(), name: row.brand }; core.data.brands.push(b); }
                    brandId = b.id;
                }
                r = {
                    id: 'r_' + Date.now(),
                    goodId: g.id, brandId: brandId,
                    name: row.name, brand: row.brand || '',
                    packs: [{ id: 'p_' + Date.now(), label: row.packLabel, count: row.packCount }],
                    img: null, attrs: {}
                };
                core.data.references.push(r);
            }

            var pack = (r.packs || []).filter(function (p) { return p.label === row.packLabel; })[0];
            core.data.listings.push({
                id: 'l_' + Date.now() + '_' + added,
                businessId: bizId,
                goodId: r.goodId, refId: r.id,
                packId: pack ? pack.id : null,
                name: r.name, brand: r.brand || '',
                pack: row.packLabel, packCount: row.packCount,
                price: row.price, pricePerUnit: Math.round(row.price / (row.packCount || 1)),
                stock: 0, min: row.min || 1, note: '',
                img: r.img || null,
                priceValidDays: 3,
                groupDiscounts: {},
                justAdded: true   /* FD-15: نشان «تازه افزوده» روی کارت کاتالوگ */
            });
            added++;
        });

        if (!added) { toast('کالایی برای افزودن انتخاب نشده', 'error'); return; }

        TX.rows = [];
        var inp = $('#tx-input'); if (inp) inp.value = '';
        core.closeSheet('sheet-textlist');
        toast(faNum(added) + ' محصول به کاتالوگ اضافه شد', 'success');
        setTimeout(function () {
            core.resetStack();
            core.show('s-catalog', false);
        }, 600);
    }

    /* ═══════════════════════════════════════════════════════════════
       FD-22 — کپی از کاتالوگ (sheet-copycat — حکم مالک)
       ─────────────────────────────────────────────────────────────
       «شماره دوستش رو وارد کنه و کاتالوگش بیاد و دکمه کپی کالاها رو
       بزنه و تم» — شماره ≥ ۱۰ رقم = دیتای نمونه (پخش برنج پارس، ۶
       کالا)؛ کالاهای تکراری (هم نام هم بسته) رد می‌شوند؛ کپی‌ها
       listing های مستقل زیر businessId من هستند (justAdded = نشان
       «تازه افزوده» در کاتالوگ). */
    var CC = { cat: null };

    function ccOpen() {
        CC.cat = null;
        var f = $('#cc-find'), d = $('#cc-done');
        if (f) f.hidden = false;
        if (d) d.hidden = true;
        var ph = $('#cc-phone'); if (ph) ph.value = '';
        var res = $('#cc-result'); if (res) res.innerHTML = '';
        core.openSheet('sheet-copycat');
        setTimeout(function () { if (ph) ph.focus(); }, 120);
    }

    function ccFind() {
        var ph = $('#cc-phone');
        var res = $('#cc-result');
        if (!res) return;
        var digits = parseNum(ph ? ph.value : '');
        if (String(digits).length < 10) {
            res.innerHTML = '<div class="hint-line notfound-line"><svg><use href="#i-info"/></svg>' +
                '<span>شماره را کامل وارد کن — ۱۱ رقم، مثل ۰۹۱۲ ۲۲۰ ۳۳۶۱.</span></div>';
            return;
        }
        /* دمو: هر شمارهٔ کامل، کاتالوگ نمونه را پیدا می‌کند (data.copyCatalogs) */
        CC.cat = (core.data.copyCatalogs || [])[0] || null;
        if (!CC.cat) {
            res.innerHTML = '<div class="hint-line notfound-line"><svg><use href="#i-info"/></svg>' +
                '<span>کاتالوگی با این شماره پیدا نشد.</span></div>';
            return;
        }
        var cat = CC.cat;
        var bizId = core.data.user.activeBusinessId;
        var already = cat.items.filter(function (it) {
            return (core.data.listings || []).some(function (l) {
                return l.businessId === bizId && l.name === it.name && l.pack === it.pack;
            });
        }).length;
        res.innerHTML =
            '<div class="ccat-card">' +
                '<div class="ccat-found">' +
                    '<div class="avatar" style="background:' + cat.color + '">' + cat.avatar + '</div>' +
                    '<div class="info"><div class="nm">' + esc(cat.business) +
                        (cat.verified ? ' <svg style="width:13px;height:13px;color:var(--blue)"><use href="#i-verified"/></svg>' : '') +
                    '</div>' +
                    '<div class="sub">' + esc(cat.owner) + ' · ' + esc(cat.city) + ' · عمده‌فروش</div></div>' +
                    '<div class="ccat-count"><b>' + faNum(cat.items.length) + '</b>کالا</div>' +
                '</div>' +
                '<div class="ccat-chips">' + cat.items.slice(0, 4).map(function (it) {
                    return '<span>' + esc(it.name) + '</span>';
                }).join('') + (cat.items.length > 4 ? '<span>+' + faNum(cat.items.length - 4) + ' کالای دیگر</span>' : '') + '</div>' +
                (already ? '<div class="ccat-note"><svg><use href="#i-info"/></svg><span>' + faNum(already) + ' کالای مشابه از قبل در کاتالوگت هست — فقط بقیه کپی می‌شوند.</span></div>' : '') +
                '<button class="btn btn-arm btn-block ccat-copy" id="cc-copy-btn" type="button">' +
                    '<svg><use href="#i-copy"/></svg> کپی ' + faNum(cat.items.length - already) + ' کالا به کاتالوگ من</button>' +
            '</div>';
    }

    function ccCopy() {
        if (!CC.cat) return;
        var cat = CC.cat;
        var bizId = core.data.user.activeBusinessId;
        var added = 0;
        cat.items.forEach(function (it, i) {
            var dup = (core.data.listings || []).some(function (l) {
                return l.businessId === bizId && l.name === it.name && l.pack === it.pack;
            });
            if (dup) return;
            core.data.listings.push({
                id: 'l_cc_' + Date.now() + '_' + i,
                businessId: bizId,
                name: it.name, brand: it.brand || '',
                pack: it.pack, packCount: it.packCount || 1,
                groupId: it.groupId || 'cgr1',
                baseUnit: it.baseUnit || 'واحد',
                price: it.price,
                pricePerUnit: Math.round(it.price / (it.packCount || 1)),
                stock: it.stock || 20, min: it.min || 1,
                img: it.img, status: 'in-stock',
                priceValidDays: 3, justAdded: true
            });
            added++;
        });
        var f = $('#cc-find'), d = $('#cc-done');
        if (f) f.hidden = true;
        if (d) d.hidden = false;
        var ttl = $('#cc-done-ttl');
        if (ttl) ttl.textContent = faNum(added) + ' کالا کپی شد';
        if (core.getCurrentScreen() === 's-catalog' ) catGridRender();
    }

    /* ═══ FD-22 — تصمیم ۷/۹: بارکد ناشناس ⇒ ساخت کالا ═══
       اسکنِ کدِ ناشناس حالا «محصول جدید با این بارکد» را باز می‌کند —
       اسم کالا را می‌نویسد و بارکد به فرم الصاق می‌شود (در محصول واقعی
       به reference تازه می‌رسد؛ در ماک: کالای جدید + chip بارکد). */
    function scanNewProd() {
        var inp = $('#scan-code');
        var code = String(inp ? inp.value : '').trim();
        if (!code) return;
        SCAN.pendingBarcode = code;
        core.closeSheet('sheet-scan');
        var ng = $('#new-good-name');
        if (ng) ng.value = '';
        core.openSheet('sheet-new-good');
        /* chip بارکد — الصاق به فرم (تصمیم ۷/۹: اسکن ناشناس = محصول تازه) */
        var hint = $('#ng-barcode-hint');
        if (hint) {
            hint.hidden = false;
            var tx = $('#ng-barcode-tx');
            if (tx) tx.textContent = code;
        }
        setTimeout(function () { if (ng) ng.focus(); }, 140);
    }

    /* ═══ FD-22 — تصمیم ۲/۹: پیوند پیشنهاد پذیرفته‌شده ← سفارش ═══
       قبلاً پذیرش، استعلام را می‌بست و تمام؛ حالا همان‌جا «ثبت سفارش با
       همین شرایط» = سفارش واقعی با قیمت فریزِ پیشنهاد (بدون پرداخت
       درون‌شبکه‌ای — قید مالک: پول بیرون از سیستم؛ سفارش = تعهد ثبت‌شده
       دو طرف). شرط نمایش: استعلام بسته با نتیجهٔ پذیرش همین فروشنده و
       هنوز سفارش نساخته‌ایم (rfq.ordered). */
    function offerOrderCreate() {
        var params = core.getSCREENParams()['s-buy-offer-view'] || {};
        var o = _offer(params.offer) || (core.data.offers || [])[0];
        if (!o) return;
        var rfq = _rfqOut(o.rfqId);
        if (!rfq || rfq.ordered) return;

        /* FD-24: قیمت هر قلم از prices[] (فریز لحظهٔ پذیرش)؛ قلم
           بدون قیمت (پیشنهاد ناقص) در سفارش نمی‌آید — سفارش فقط
           برای قلم‌های توافقی ثبت می‌شود. */
        var items = (rfq.items || []).map(function (it, i) {
            var p = (o.prices && o.prices.length) ? o.prices[i] : o.price;
            if (!p) return null;
            return {
                name: it.name, pack: it.pack, qty: it.qty,
                unitPrice: p,
                img: it.img
            };
        }).filter(Boolean);
        if (!items.length) {
            /* استعلام‌های ساخته‌شده در همین جلسه (rfqSendNew) items ندارند —
               از itemName می‌خوانیم: «برنج هاشمی گلستان · ۲۰ کیسه» */
            var parts = String(rfq.itemName || 'کالا').split(' · ');
            var qtyPart = String(parts[1] || '۱');
            var qty = parseNum(qtyPart) || 1;
            items = [{ name: parts[0], pack: qtyPart.replace(/^[\s۰-۹0-9]+/, '').trim() || 'واحد', qty: qty, unitPrice: o.price, img: rfq.img }];
        }

        var oid = 'oo' + (Date.now() % 100000);
        core.data.ordersOut = core.data.ordersOut || [];
        core.data.ordersOut.unshift({
            id: oid, businessId: 'b2',
            supplierId: o.supplierId, supplier: o.seller,
            when: 'هم‌اکنون', status: 'new', note:
                'از پیشنهاد پذیرفته‌شده — شرایط: ' + payTx(o.pay) + ' · ' + dlvTx(o.dlv),
            items: items,
            history: [{ st: 'new', t: 'هم‌اکنون' }]
        });
        core.data.ordersIn = core.data.ordersIn || [];
        core.data.ordersIn.unshift({
            id: 'oi' + (Date.now() % 100000), businessId: 'b1',
            buyer: 'سوپرمارکت آریا',
            when: 'هم‌اکنون', status: 'new',
            note: 'از پیشنهاد پذیرفته‌شدهٔ استعلام «' + rfq.itemName + '»',
            items: items.map(function (it) { return { name: it.name, pack: it.pack, qty: it.qty, unitPrice: it.unitPrice, img: it.img }; }),
            history: [{ st: 'new', t: 'هم‌اکنون' }]
        });
        rfq.ordered = true;

        pushNotify({
            type: 'order',
            title: 'سفارش از پیشنهاد پذیرفته‌شده',
            body: 'خریدار برای «' + rfq.itemName + '» سفارش ثبت کرد — با شرایط پیشنهاد خودت.',
            link: 's-sell-orders'
        });
        pushNotify({
            type: 'order',
            title: 'سفارش ثبت شد',
            body: 'سفارش «' + rfq.itemName + '» برای ' + o.seller + ' ثبت شد — پیگیری در دفتر سفارش‌ها.',
            link: 's-buy-orders'
        });
        toast('سفارش با شرایط پیشنهاد ثبت شد', 'success');
        core.go('s-buy-order-view', { id: oid });
    }

    /* ═══ FD-22 — تصمیم ۸/۹: نوار زمینهٔ گفتگو ═══
       از دلِ سفارش/پیشنهاد/لیست که به گفتگو بیایی، «دربارهٔ: …» بالای
       حباب‌ها می‌نشیند؛ در محصول واقعی = thread tag به بک‌اند چت. */
    function chatCtxSync() {
        var el = $('#chat-ctx');
        if (!el) return;
        var about = (core.getSCREENParams()['s-chat'] || {}).about || '';
        el.hidden = !about;
        var tx = $('#chat-ctx-tx');
        if (tx && about) tx.textContent = 'دربارهٔ: ' + about;
    }
    core.registerShowHook('s-chat', chatCtxSync);

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
        $$('#guest-grid .addcart-btn, #guest-needs-grid .addcart-btn').forEach(function (b) {
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
                            /* FD-26 (حکم مالک): «توی سبد خرید امکان ورود عدد
                               بصورت نوشتاری هم باشه. چرا که ممکنه تعداد خیلی
                               بالا باشه» — عدد علاوه بر استپر، مستقیم تایپ
                               می‌شود (input عددی؛ اعتبارسنجی در change —
                               همان گیت حداقلِ استپر). */
                            '<input class="ci-n" type="text" inputmode="numeric" autocomplete="off" data-cart-qty="' + lid + '" value="' + faNum(qty) + '" aria-label="تعداد — قابل تایپ">' +
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

    /* ═══ FD-26 — سبد: تایپ مستقیم تعداد (حکم مالک: «امکان ورود عدد
       بصورت نوشتاری هم باشه. چرا که ممکنه تعداد خیلی بالا باشه») ═══
       رخداد change (نه input) تا تایپ آزاد باشد و اعتبارسنجی فقط در
       خروج از فیلد/Enter — رندرِ کامل هم در همان لحظه مشکلی ندارد
       (فوکوس دیگر روی فیلد نیست). گیت = همان حداقلِ استپر
       («حداقل سفارش همین مقدار است»؛ parseNum فارسی/لاتین/جداکننده
       می‌فهمد). ورودی نامعتبر → برگشت به مقدار قبلی + توست. */
    document.addEventListener('change', function (e) {
        var t = e.target;
        if (!t || !t.dataset || !t.dataset.cartQty) return;
        var lid = t.dataset.cartQty;
        var l = _findListing(lid);
        if (!l || !GUEST_CART[lid]) return;
        var min = l.min || 1;
        var n = parseNum(t.value);
        if (!n || n < min) {
            toast(!n ? 'تعداد را عدد وارد کن' : 'حداقل سفارش همین مقدار است', 'error');
            t.value = faNum(GUEST_CART[lid]);
            return;
        }
        GUEST_CART[lid] = n;
        guestCartSync();
        guestCartRender();
    });

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
        /* FD-18 — سفارشِ سبد واقعاً ثبت می‌شود (قبلاً فقط پیام موفقیت
           بود و «پیگیری سفارش در میز خرید» به سفارشی خالی می‌رسید):
           سفارش چندقلمی در ordersOut ساخته می‌شود، اعلان به فروشنده
           می‌رود و دفتر سفارش‌های خریدار (۲۸) همان‌جا نشانش می‌دهد. */
        var its = [];
        Object.keys(GUEST_CART).forEach(function (lid) {
            var l = _findListing(lid);
            if (!l) return;
            var pct = guestDiscPct(l);
            var unitPrice = pct > 0 ? _discPrice(l.price, pct) : l.price;
            its.push({ listingId: lid, name: l.name, pack: l.pack, qty: GUEST_CART[lid], unitPrice: unitPrice, img: l.img });
        });
        if (its.length) {
            core.data.ordersOut = core.data.ordersOut || [];
            core.data.ordersOut.unshift({
                id: 'oo' + (core.data.ordersOut.length + 10),
                businessId: 'b2', supplierId: 'su1', supplier: 'پخش برنج پارس',
                supAvatar: 'پ', supColor: 'linear-gradient(135deg,#c2703a,#ea580c)',
                items: its, when: 'هم‌اکنون', status: 'new', note: '',
                history: [{ st: 'new', t: 'هم‌اکنون' }]
            });
            pushNotify({
                type: 'order',
                title: 'سفارش جدید',
                body: 'سوپرمارکت آریا برای ' + faNum(its.length) + ' قلم کالا از کاتالوگ تو سفارش داد.',
                link: 's-sell-orders'
            });
            ordersBuyRender();
            deskOrdersSync();
        }
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
        /* FD-18: مقصد پیگیری = دفتر سفارش‌های خریدار (۲۸) — سفارشِ
           تازه‌ثبت‌شدهٔ سبد همین‌جاست (قبلاً به میز خالی می‌رسید) */
        core.show('s-buy-orders', false);
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
        /* FD-14: هر بار باز شدن، نمای «ذخیره انجام شد» ریست می‌شود */
        var svv = $('#acc-saved');
        if (svv) svv.hidden = true;
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

    /* FD-16 — ورود به کاتالوک تأمین‌کننده به چشمِ «مشتری»:
       خریدارِ واردشده کاتالوک تأمین‌کننده‌هایش را از قبل ذخیره کرده —
       یعنی مشتری اوست؛ قیمت‌ها باز و سبد فعال. (ورود از دفتر تأمین‌کننده
       ۲۲ / کارت‌های تأمین‌کنندهٔ کالا ۲۰ / جزئیات تأمین‌کننده ۲۳ /
       جزئیات پیشنهاد ۲۷ — openCatalog در app-suppliers.js.) */
    function guestEnterAsCustomer(name) {
        GUEST_SAVED = true;
        GUEST_NAME = name || 'مشتری';
        GUEST_GROUP = _findGroup('cg2'); /* گروه «معمولی» — مشتری این کاتالوگ */
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
        /* FD-14: نوار «افزودن کالاهای این کاتالوگ به لیست خرید» — فقط
           برای مشتریِ ذخیره‌کرده و نه پیش‌نمایش فروشنده (قاعدهٔ_FD-12:
           مهمان ابزارِ میز خرید ندارد؛ ترس مالک از شلوغی کاتالوگ) */
        var alStrip = $('#guest-addlist-btn');
        if (alStrip) alStrip.hidden = !GUEST_SAVED || isPreview;
        /* FD-23 — بخش «کالاهای موردنیاز تو در این کاتالوگ» (هر دو
           حالت را خودش مدیریت می‌کند: نمایش/ریست) */
        guestNeedsSync();
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

    /* ─── FD-23/FD-25 — بخش «در لیست خرید شما» (۳۱) ───
       قرینهٔ تطبیق ۳۲ در سمت کاتالوگ (حکم مالک FD-23: «دقیقا این کار
       رو سمت کاتالوگ هم انجام بدیم»): محصولات این کاتالوک که در
       لیست خریدِ بیننده هست → بخش بالایی جدا؛ بقیه زیر «سایر محصولات
       این فروشنده» (دو لیست جدا).
       FD-25 (حکم مالک): عنوان بخش = «در لیست خرید شما» و بج سبز
       «در لیست خریدت» از کارت‌ها حذف شد — «دیگه اون بچ سبز رنگ در
       لیست خریدت رو از داخل آیتم‌ها بردار که شلوغ نشه»؛ عنوان و
       جدا بودن بخش همان پیام را می‌دهد (مینیمال اما گویا).
       فقط برای مشتریِ ذخیره‌کرده (GUEST_SAVED) — مهمانِ تازه‌ورود
       لیست خریدی ندارد و کاتالوگ تمیز می‌ماند (قاعدهٔ FD-12 + ترس
       مالک از شلوغی کاتالوگ)؛ پیش‌نمایش فروشنده هم «دید دیگران»
       است و نمی‌بیند. خالی = کل بخش مخفی و عنوان همان «محصولات
       این فروشنده» می‌ماند.
       نکته‌های پیاده‌سازی واقعی:
         · تطبیق سمت سرور روی goodId بین کاتالوگِ فروشنده و
           لیستِ خریدِ بیننده — نه رشتهٔ نام (در ماک نام کافی است).
         · نتیجه در کشِ نمایشگاهی (per viewer×catalog) و با هر
           تغییر لیست/کاتالوگ بی‌اعتبار می‌شود.
         · قابلیت ?hl=needs در URL کاتالوگ عمومی برای لینک مستقیم
           به همین بخش (در فاز رشد). */
    function guestNeedsSync() {
        var sec = $('#guest-needs-sec');
        if (!sec) return;
        var grid = $('#guest-needs-grid');
        var title = $('#guest-all-title');
        var section = $('#s-catalog-guest');
        var isPreview = section ? section.classList.contains('preview-mode') : false;

        /* ریست — قالب با هر show() دوباره ساخته می‌شود؛ این ریست
           برای تغییرِ وضعیتِ درجا (ورود/ذخیره/خروج حالتی) است */
        $$('#guest-grid .pcard').forEach(function (c) { c.classList.remove('hide-need'); });
        if (title) title.innerHTML = '<svg><use href="#i-store"/></svg> محصولات این فروشنده';
        sec.hidden = true;
        if (grid) grid.innerHTML = '';

        if (!GUEST_SAVED || isPreview) return;

        /* لیست خریدِ بیننده (میز خرید b2) — سطح کالا (نام) */
        var needNames = (core.data.shoppingList || []).filter(function (s) {
            return s.businessId === 'b2';
        }).map(function (s) { return s.name; });

        /* محصولاتِ این کاتالوک که موردنیازِ بیننده‌اند */
        var matched = [];
        $$('#guest-grid .pcard').forEach(function (card) {
            var l = _findListing(card.dataset.lid);
            if (l && needNames.indexOf(l.name) > -1 && matched.indexOf(l) === -1) matched.push(l);
        });
        if (!matched.length) return;

        /* کارت‌های مچ‌شده — همان زبانِ کارت کاتالوگ (کلیک‌ها با
           همان data-guest-card / data-add-cart / data-view-price
           به هندلرهای موجود می‌رسند). FD-25: بدون بج «در لیست
           خریدت» — عنوان بخش خودش گویاست (حکم مالک: ضدشلوغی)؛
           فقط بج موجودی مانده. */
        if (grid) {
            grid.innerHTML = matched.map(function (l) {
                var stBadge = l.status === 'low'
                    ? '<span class="badge b-amber">موجودی کم</span>'
                    : '<span class="badge b-green">' + (l.status === 'out' ? 'ناموجود' : 'موجود') + '</span>';
                return '<div class="pcard pcard-need" data-guest-card data-lid="' + esc(l.id) + '">' +
                    '<div class="ph">' +
                        '<img src="' + esc(l.img) + '" alt="' + esc(l.name) + '">' +
                        '<button class="addcart-btn cust-only" type="button" data-add-cart="' + esc(l.id) + '" aria-label="افزودن به سبد خرید"><svg><use href="#i-cart-add"/></svg></button>' +
                    '</div>' +
                    '<div class="info">' +
                        '<div class="pname">' + esc(l.name) + '</div>' +
                        '<div class="ppack">' + esc(l.pack) + '</div>' +
                        '<div class="pmin">حداقل خرید ' + faNum(l.min || 1) + ' ' + _unitWord(l) + '</div>' +
                        '<div class="pprice">' + faMoney(l.price) + ' <small>تومان</small></div>' +
                        '<button class="price-cta" type="button" data-view-price="' + esc(l.id) + '"><svg><use href="#i-eye"/></svg> مشاهده قیمت</button>' +
                        '<div class="pmeta">' + stBadge + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }
        var cnt = $('#gn-count');
        if (cnt) cnt.textContent = faNum(matched.length) + ' کالا';

        /* همان محصولات از گرید اصلی برداشته می‌شوند (دو لیست جدا) */
        $$('#guest-grid .pcard').forEach(function (card) {
            var l = _findListing(card.dataset.lid);
            if (l && needNames.indexOf(l.name) > -1) card.classList.add('hide-need');
        });

        /* عنوان گرید اصلی → «سایر» + شمار باقی‌مانده */
        var rest = $$('#guest-grid .pcard').filter(function (c) {
            return !c.classList.contains('hide-need');
        }).length;
        if (title) title.innerHTML = '<svg><use href="#i-store"/></svg> سایر محصولات این فروشنده <span class="st-b">' + faNum(rest) + ' محصول</span>';
        sec.hidden = false;
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
        guestMarkSaved();
        var ctx = GUEST_ACCT_CTX;
        GUEST_ACCT_CTX = 'save';
        /* FD-13: اگر حساب از «ثبت سفارش» باز شده، سفارش همان‌جا کامل
           می‌شود و نمای موفقیت (پیگیری در میز خرید) جلوی چشم می‌ماند */
        if (ctx === 'order') {
            core.closeSheet('sheet-account');
            guestOrderComplete();
            core.openSheet('sheet-cart');
            return;
        }
        /* FD-10: اگر حساب از «مشاهده قیمت» باز شده، کاربر همان‌جا می‌ماند
           و قیمت‌ها پیش چشمش باز می‌شوند — از هدف جابه‌جا نمی‌شود.
           (ثبت‌نام = ذخیرهٔ کاتالوگ = مشتری‌شدن — حکم مالک) */
        if (ctx === 'price') {
            core.closeSheet('sheet-account');
            var cur = core.getCurrentScreen();
            if (cur === 's-product-view') productViewSync();
            toast(_publicPrices()
                ? 'کاتالوگ ذخیره شد — خوش آمدی'
                : 'کاتالوگ ذخیره شد — قیمت‌ها باز شد', 'success');
            return;
        }
        /* FD-14 (حکم مالک): جریان ذخیره — دیگر بلافاصله به پنل خرید
           برده نمی‌شود؛ همان شیت حساب باز می‌ماند و نمای «ذخیره انجام
           شد» پیام می‌دهد (از این به بعد در بخش تأمین‌کنندگان میز خرید
           خودت در آی‌مچ به این تأمین‌کننده دسترسی داری) + دکمهٔ «رفتن
           به میز خرید» و لینک آرام «ماندن در همین کاتالوگ» — «این‌طوری
           کاربر گیج نمی‌شود». مقصد میز خرید (FD-12) سرِ جایش است ولی
           انتخابی، نه پرش. */
        var su = $('#acc-signup'), lg = $('#acc-login'), sv = $('#acc-saved');
        if (su) su.hidden = true;
        if (lg) lg.hidden = true;
        if (sv) sv.hidden = false;
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

    /* ─── FD-26: بازیابی رمز — شمارهٔ حساب به پشتیبانی خودِ آی‌مچ ───
       حکم مالک: «بازیابی رمز عبور رو از تماس یا واتساپ استفاده نکن.
       بفرسته به خود آیمچ. فقط شماره موبایل رو وارد کنه و بفرسته به
       آیمچ» — فرم شماره + دکمهٔ «ارسال شماره به پشتیبانی برای بازیابی
       رمز عبور»؛ پس از ارسال: «به زودی رمز موقت برای شما ارسال
       می‌شود». فراموشی درجهٔ دوم است — شیت هم بی‌ادعاست (۰۳:
       linklike-quiet). در محصول واقعی: تیکت پشتیبانی از همین فرم +
       رمز موقت درون‌برنامه‌ای/پیامکی (فاز رشد — feature flag FD-22). */
    function forgotReset() {
        var v = $('#forgot-view'), ok = $('#forgot-ok');
        if (v) v.hidden = false;
        if (ok) ok.hidden = true;
        var p = $('#forgot-phone');
        if (p) p.value = '';
    }

    function forgotSend() {
        var phone = (($('#forgot-phone') || {}).value || '').trim();
        if (!phone) { toast('شماره موبایل را وارد کن', 'error'); return; }
        var v = $('#forgot-view'), ok = $('#forgot-ok');
        if (v) v.hidden = true;
        if (ok) ok.hidden = false;
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
    /* ═══════════════════════════════════════════════════════════════
       FD-14 — جریان استعلام/پیشنهاد (پروندهٔ بسته) + کاتالوگ→لیست خرید
       ─────────────────────────────────────────────────────────────
       ▸ ۱۱/۱۲/۲۴/۲۶/۲۷ همه از data.js رندر می‌شوند — با پارامتر rfq/
         offer؛ «درخواست ۳ قلمی» فرم خودش را می‌گیرد و «رب» پیشنهادهای
         خودش را (نقطه‌شکسته‌های قدیمی).
       ▸ عنوان‌ها با پیشوند «درخواست قیمت …» (حکم مالک FD-14).
       ▸ فرم ۱۲: سوییچ چک (درصد چکی/نقدی هم‌گام + حداکثر روز) و
         سوییچ ارسال (رادیوی حمل با فروشنده/مشتری) + جمع‌بندی زندهٔ
         «خریدار این شرایط را می‌بیند: …» (payTx/dlvTx — همان متنِ
         کارت ۲۶ و جزئیات ۲۷).
       ▸ حلقهٔ کامل: پذیرش پیشنهاد (۲۷) یا «بستن استعلام» (۲۶) ⇒
         rfqsOut.status='done' + result (حکم مالک: «استعلام باز را
         ببندد و تمام»).
       ▸ ۲۰: رندر پویا از DATA.shoppingList؛ ۳۱: نوار + شیت انتخاب
         کالاهای کاتالوگ ⇒ افزودن واقعی به لیست خرید.
       ═══════════════════════════════════════════════════════════════ */

    function _rfqIn(id) {
        var out = null;
        (core.data.rfqsIn || []).forEach(function (r) { if (r.id === id) out = r; });
        return out;
    }
    function _rfqOut(id) {
        var out = null;
        (core.data.rfqsOut || []).forEach(function (r) { if (r.id === id) out = r; });
        return out;
    }
    function _offer(id) {
        var out = null;
        (core.data.offers || []).forEach(function (o) { if (o.id === id) out = o; });
        return out;
    }

    /* متن شرایط — یک زبان، سه جا: فرم ۱۲ (پیش‌نمایش فروشنده) +
       کارت ۲۶ + جزئیات ۲۷ (بازتاب خریدار). ساختار: pay={chk,days} ·
       dlv={ship,by} — مستند در data.js */
    function payTx(p) {
        p = p || {};
        var chk = p.chk || 0;
        if (!chk) return 'نقدی';
        return faNum(100 - chk) + '٪ نقدی + ' + faNum(chk) + '٪ چک (تا ' + faNum(p.days || 30) + ' روز)';
    }
    function dlvTx(d) {
        d = d || {};
        if (!d.ship) return 'تحویل حضوری';
        return 'ارسال — حمل با ' + (d.by === 'customer' ? 'مشتری' : 'فروشنده');
    }
    function _rfqTitleTx(name) { return 'درخواست قیمت ' + name; }
    /* FD-24 — جمع کل پیشنهاد: Σ قیمت قلم × مقدار (prices[] هم‌ترتیب
       با rfq.items؛ null = ندارد). تک‌قلمی = قیمت × مقدار قلم اول. */
    function offerTotal(o, rfq) {
        o = o || {};
        var items = ((rfq || {}).items || []);
        if (o.prices && o.prices.length && items.length) {
            var t = 0;
            items.forEach(function (it, i) {
                var p = o.prices[i];
                if (p) t += p * (it.qty || 0);
            });
            return t;
        }
        var it0 = items[0] || {};
        return (o.price || 0) * (it0.qty || 0);
    }
    /* FD-24 — پوشش پیشنهاد: شمار قلم‌های قیمت‌خورده (برای بج
       «k از n قلم» روی کارت مقایسه ۲۶). */
    function offerCover(o, rfq) {
        o = o || {};
        var n = ((rfq || {}).items || []).length;
        if (!(o.prices && o.prices.length) || !n) return n ? 1 : 0;
        return o.prices.filter(function (p) { return p; }).length;
    }
    function _perWord(rfq) {
        var it = ((rfq || {}).items || [])[0] || {};
        return 'هر ' + (((it.pack || '').split(' ')[0]) || 'واحد');
    }
    function _leftTx(daysLeft) {
        return daysLeft === 0 ? 'امروز آخرین روز' : faNum(daysLeft) + ' روز مانده';
    }

    /* ─── ۱۱: درخواست‌های قیمت فروشنده ─── */
    function sellRfqsRender() {
        var sec = $('#s-sell-rfqs');
        if (!sec) return;
        var rows = $('#sell-rfqs-rows'), done = $('#sell-rfqs-done'), sub = $('#sell-rfqs-sub');
        var inArr = core.data.rfqsIn || [], ans = core.data.rfqsAnswered || [];
        if (sub) sub.textContent = faNum(inArr.length) + ' مورد در انتظار پاسخ';
        if (rows) {
            rows.innerHTML = inArr.map(function (r) {
                var multi = (r.items || []).length > 1;
                return '<div class="row" data-rfq-go="' + esc(r.id) + '">' +
                    '<div class="thumb thumb-sm"><img src="' + esc(r.img) + '" alt=""></div>' +
                    '<div class="row-body">' +
                        '<div class="row-title">' + esc(_rfqTitleTx(r.itemName)) +
                            (multi ? ' <span class="badge b-gray">' + faNum(r.items.length) + ' قلم</span>' : '') + '</div>' +
                        '<div class="row-sub">' + esc(r.buyer) + ' <span class="dot">·</span> <span style="color: var(--' +
                            (r.daysLeft === 0 ? 'red' : 'amber') + '); font-weight: 700;">' + _leftTx(r.daysLeft) + '</span></div>' +
                    '</div>' +
                    '<div class="row-chev"><svg><use href="#i-chev"/></svg></div>' +
                '</div>';
            }).join('');
        }
        if (done) {
            done.innerHTML = ans.map(function (r) {
                return '<div class="row static" style="opacity: .75;">' +
                    '<div class="thumb thumb-sm"><img src="' + esc(r.img) + '" alt=""></div>' +
                    '<div class="row-body">' +
                        '<div class="row-title">' + esc(_rfqTitleTx(r.itemName)) + ' <span class="badge b-green">پاسخ داده‌شده</span></div>' +
                        '<div class="row-sub">' + esc(r.buyer) + ' <span class="dot">·</span> ' + esc(r.when) +
                            ' <span class="dot">·</span> پیشنهاد من: ' + esc(r.myOffer) + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }
    }

    /* ─── ۱۲: فرم پیشنهاد — رندر از استعلام + سوییچ‌های شرایط ─── */
    var OFR = { rfq: null, chk: false, chkPct: 50, days: 60, ship: false, shipBy: 'seller' };

    function offerFormRender() {
        var sec = $('#s-sell-offer');
        if (!sec) return;
        var params = core.getSCREENParams()['s-sell-offer'] || {};
        var r = _rfqIn(params.rfq) || (core.data.rfqsIn || [])[0];
        if (!r) return;
        OFR.rfq = r;

        var sub = $('#of-sub');
        if (sub) sub.textContent = _rfqTitleTx(r.itemName);

        /* کارت استعلام + فهرست قلم‌ها (چندقلمی) */
        var card = $('#of-rfq-card');
        if (card) {
            var multi = (r.items || []).length > 1;
            var html = '<div class="card" style="display: flex; gap: 12px; align-items: center;">' +
                '<div class="thumb thumb-md"><img src="' + esc(r.img) + '" alt=""></div>' +
                '<div style="flex: 1; min-width: 0;">' +
                    '<div style="font-size: 14px; font-weight: 700;">' + esc(_rfqTitleTx(r.itemName)) + '</div>' +
                    '<div style="font-size: 11px; color: var(--text-3); margin-top: 3px;">' + esc(r.buyer) + ' · ' + esc(r.pack) + '</div>' +
                    '<div style="margin-top: 6px;"><span class="badge b-' + (r.daysLeft === 0 ? 'red' : 'amber') + '">' +
                        (r.daysLeft === 0 ? 'امروز آخرین روز' : faNum(r.daysLeft) + ' روز مهلت') + '</span></div>' +
                '</div></div>';
            if (multi) {
                html += '<div class="card" style="margin-top: 8px; padding: 4px 14px;">' +
                    (r.items || []).map(function (it) {
                        return '<div class="fact-row"><span class="k">' + esc(it.name) + '</span><span class="v">' +
                            faNum(it.qty) + ' ' + esc(it.pack) + '</span></div>';
                    }).join('') + '</div>';
            }
            card.innerHTML = html;
        }

        /* توضیحات خریدار */
        var note = $('#of-note'), ntx = $('#of-note-tx');
        if (note) note.hidden = !r.note;
        if (ntx) ntx.textContent = r.note || '';

        /* قیمت‌ها — هر قلم فیلد خودش (FD-24: قلم‌های موجود در کاتالوک
           من جای‌گذاریِ قیمتِ خودم را می‌گیرند — «از روی کاتالوگ یک
           تامین‌کننده انجام می‌شود»؛ قابل ویرایش؛ بج «در کاتالوک تو»
           برای قلم مچ‌شده. در محصول واقعی placeholder از قیمت زندهٔ
           کاتالوگ می‌آید و پس از ارسال هم‌گام می‌ماند.) */
        var host = $('#of-prices');
        if (host) {
            var myGoods = (core.data.listings || []).filter(function (l) { return l.businessId === 'b1'; });
            host.innerHTML = (r.items || []).map(function (it, i) {
                var mine = null;
                myGoods.forEach(function (l) {
                    if (!mine && (l.name === it.name || it.name.indexOf(l.name) > -1 || l.name.indexOf(it.name.split(' ')[0]) > -1)) mine = l;
                });
                var ph = mine ? 'کاتالوک تو: ' + faMoney(mine.price) : '۲٬۸۲۰٬۰۰۰';
                return '<div class="field">' +
                    '<label>قیمت هر ' + esc(it.pack) + (multi ? ' — ' + esc(it.name) : '') +
                        (mine ? ' <span class="badge b-green">در کاتالوک تو</span>' : '') +
                        ' <span class="opt">— تومان</span></label>' +
                    '<input class="input" type="tel" data-of-price="' + i + '" inputmode="numeric" placeholder="' + ph + '">' +
                    '<div class="unit-hint"><svg><use href="#i-info"/></svg><span class="ofp-hint">قیمت را وارد کن تا معادلش را ببینی</span></div>' +
                '</div>';
            }).join('');
        }

        offerResetTerms();
    }

    function offerResetTerms() {
        OFR.chk = false; OFR.chkPct = 50; OFR.days = 60; OFR.ship = false; OFR.shipBy = 'seller';
        var sw1 = $('#of-chk-on'), sw2 = $('#of-ship-on');
        if (sw1) { sw1.classList.remove('on'); sw1.setAttribute('aria-checked', 'false'); }
        if (sw2) { sw2.classList.remove('on'); sw2.setAttribute('aria-checked', 'false'); }
        var blk1 = $('#of-chk-block'), blk2 = $('#of-ship-block');
        if (blk1) blk1.hidden = true;
        if (blk2) blk2.hidden = true;
        var cp = $('#of-chk-pct'), csp = $('#of-cash-pct'), cd = $('#of-chk-days');
        if (cp) cp.value = faNum(50);
        if (csp) csp.value = faNum(50);
        if (cd) cd.value = faNum(60);
        var ph = $('#of-pay-hint'), sh = $('#of-ship-hint');
        if (ph) ph.textContent = 'خاموش — کل مبلغ نقدی گرفته می‌شود';
        if (sh) sh.textContent = 'خاموش — تحویل حضوری در انبار تو';
        $$('#of-ship-by .pill').forEach(function (p) {
            p.classList.toggle('active', p.dataset.ship === 'seller');
        });
        var no = $('#of-note-out');
        if (no) no.value = '';
        offerSumSync();
    }

    /* سوییچ «فروش چکی هم داریم» — درصد چکی/نقدی + حداکثر روز چک */
    function offerChkToggle() {
        OFR.chk = !OFR.chk;
        var sw = $('#of-chk-on');
        if (sw) { sw.classList.toggle('on', OFR.chk); sw.setAttribute('aria-checked', String(OFR.chk)); }
        var blk = $('#of-chk-block');
        if (blk) blk.hidden = !OFR.chk;
        var h = $('#of-pay-hint');
        if (h) h.textContent = OFR.chk ? 'روشن — درصد چکی/نقدی و روز چک را مشخص کن' : 'خاموش — کل مبلغ نقدی گرفته می‌شود';
        offerSumSync();
    }

    /* سوییچ «ارسال کالا هم داریم» — خاموش = تحویل حضوری */
    function offerShipToggle() {
        OFR.ship = !OFR.ship;
        var sw = $('#of-ship-on');
        if (sw) { sw.classList.toggle('on', OFR.ship); sw.setAttribute('aria-checked', String(OFR.ship)); }
        var blk = $('#of-ship-block');
        if (blk) blk.hidden = !OFR.ship;
        var h = $('#of-ship-hint');
        if (h) h.textContent = OFR.ship ? 'روشن — هزینهٔ حمل با کیست؟' : 'خاموش — تحویل حضوری در انبار تو';
        offerSumSync();
    }

    function offerShipPick(by) { OFR.shipBy = by === 'customer' ? 'customer' : 'seller'; offerSumSync(); }

    /* دو ورودی درصد — هم‌گام (جمع همیشه ۱۰۰) */
    function offerPctSync(which) {
        var el = which === 'chk' ? $('#of-chk-pct') : $('#of-cash-pct');
        if (!el) return;
        var v = parseNum(el.value);
        if (v < 0) v = 0;
        if (v > 100) v = 100;
        OFR.chkPct = (which === 'chk') ? v : 100 - v;
        var chk = $('#of-chk-pct'), cash = $('#of-cash-pct');
        if (chk) chk.value = faNum(OFR.chkPct);
        if (cash) cash.value = faNum(100 - OFR.chkPct);
        offerSumSync();
    }

    function offerDaysSync() {
        var el = $('#of-chk-days');
        if (el) OFR.days = parseNum(el.value) || 0;
        offerSumSync();
    }

    /* جمع‌بندی زنده — پیش‌نمایشِ همان متنِ سمت خریدار (۲۶/۲۷) */
    function offerSumSync() {
        var tx = $('#of-sum-tx');
        if (!tx) return;
        var p = OFR.chk ? { chk: OFR.chkPct, days: OFR.days } : { chk: 0, days: 0 };
        var d = OFR.ship ? { ship: true, by: OFR.shipBy } : { ship: false, by: null };
        tx.textContent = 'خریدار این شرایط را می‌بیند: ' + payTx(p) + ' · ' + dlvTx(d);
    }

    /* هینت قیمت هر قلم — معادل واحد + جمع کل (فیکس FD-14: هینت قبلاً
       به #offer-unit-hint-yx اشاره می‌کرد که وجود نداشت — هیچ‌وقت
       آپدیت نمی‌شد) */
    function offerPriceHint(input) {
        var hint = input.parentElement ? input.parentElement.querySelector('.ofp-hint') : null;
        if (!hint) return;
        var idx = parseInt(input.dataset.ofPrice, 10);
        var it = (OFR.rfq && OFR.rfq.items) ? OFR.rfq.items[idx] : null;
        var price = parseNum(input.value);
        if (!price || !it) { hint.textContent = 'قیمت را وارد کن تا معادلش را ببینی'; return; }
        var parts = [];
        if (it.packCount && it.packCount > 1) {
            parts.push('هر ' + (it.baseUnit || 'واحد') + ' ≈ <b>' + faMoney(Math.round(price / it.packCount)) + ' تومان</b>');
        }
        parts.push('برای ' + faNum(it.qty || 0) + ' ' + esc(it.pack) + ': <b>' + faMoney(price * (it.qty || 0)) + ' تومان</b>');
        hint.innerHTML = parts.join(' · ');
    }

    /* ارسال پیشنهاد — اعتبارسنجی قیمت + انتقال به «پاسخ داده‌شده».
       FD-24: چندقلمی ⇒ myOffer به‌صورت «n قلم · جمع X تومان» +
       prices[] واقعی روی رکورد پاسخ (در ماک فقط رشتهٔ نمایشی می‌ماند؛
       در محصول واقعی رکورد Offer با آریهٔ قلم‌ها ذخیره می‌شود). */
    function offerSend() {
        var params = core.getSCREENParams()['s-sell-offer'] || {};
        var r = _rfqIn(params.rfq) || (core.data.rfqsIn || [])[0];
        var inputs = $$('[data-of-price]');
        for (var i = 0; i < inputs.length; i++) {
            if (!parseNum(inputs[i].value)) { toast('قیمت پیشنهادی را وارد کن', 'error'); return; }
        }
        var first = inputs[0];
        if (r) {
            var m = (r.items || []).length;
            var myOfferTx;
            if (m > 1) {
                var total = 0;
                (r.items || []).forEach(function (it, ix) {
                    total += parseNum(inputs[ix] ? inputs[ix].value : '') * (it.qty || 0);
                });
                myOfferTx = faNum(m) + ' قلم · جمع ' + faMoney(total) + ' تومان';
            } else {
                myOfferTx = first ? faMoney(parseNum(first.value)) + ' تومان' : '—';
            }
            (core.data.rfqsAnswered = core.data.rfqsAnswered || []).unshift({
                id: 'ra' + Date.now(), buyer: r.buyer, buyerAvatar: r.buyerAvatar, buyerColor: r.buyerColor,
                itemName: r.itemName, pack: r.pack, img: r.img, when: 'همین حالا',
                myOffer: myOfferTx
            });
            core.data.rfqsIn = core.data.rfqsIn.filter(function (x) { return x.id !== r.id; });
        }
        toast('پیشنهاد برای ' + (r ? r.buyer : 'مشتری') + ' ارسال شد', 'success');
        setTimeout(function () { core.back(); }, 700);
    }

    /* ─── ۲۴: استعلام‌های من (خریدار) ─── */
    function buyRfqsRender() {
        var sec = $('#s-buy-rfqs');
        if (!sec) return;
        var open = $('#buy-rfqs-open'), done = $('#buy-rfqs-done'), sub = $('#buy-rfqs-sub');
        var list = core.data.rfqsOut || [];
        var cur = list.filter(function (r) { return r.status === 'current'; });
        var fin = list.filter(function (r) { return r.status !== 'current'; });
        if (sub) sub.textContent = faNum(cur.length) + ' باز · ' + faNum(fin.length) + ' پایان‌یافته';
        if (open) {
            open.innerHTML = cur.length ? cur.map(function (r) {
                var multi = (r.items || []).length > 1;   /* FD-24: بج قلم مثل ۱۱ */
                var left;
                if (!r.offersCount) left = '<span style="color: var(--text-3); font-weight: 700;">در انتظار اولین پیشنهاد</span>';
                else left = faNum(r.offersCount) + ' پیشنهاد <span class="dot">·</span> <span style="color: var(--' +
                    (r.daysLeft === 0 ? 'red' : 'amber') + '); font-weight: 700;">' + _leftTx(r.daysLeft) + '</span>';
                return '<div class="row" data-ofr-go="' + esc(r.id) + '">' +
                    '<div class="thumb thumb-sm"><img src="' + esc(r.img) + '" alt=""></div>' +
                    '<div class="row-body">' +
                        '<div class="row-title">' + esc(_rfqTitleTx(r.itemName)) +
                            (multi ? ' <span class="badge b-gray">' + faNum(r.items.length) + ' قلم</span>' : '') + '</div>' +
                        '<div class="row-sub">' + left + '</div>' +
                    '</div>' +
                    '<div class="row-chev"><svg><use href="#i-chev"/></svg></div>' +
                '</div>';
            }).join('') :
                '<div class="empty"><div class="empty-ic"><svg><use href="#i-inbox"/></svg></div>' +
                '<h3>هنوز استعلامی نداده‌ای</h3><p>با «استعلام جدید» حجم و شرایطت را بگو تا چند تأمین‌کننده با هم قیمت بدهند.</p></div>';
        }
        if (done) {
            done.innerHTML = fin.map(function (r) {
                return '<div class="row static" style="opacity: .75;">' +
                    '<div class="thumb thumb-sm"><img src="' + esc(r.img) + '" alt=""></div>' +
                    '<div class="row-body">' +
                        '<div class="row-title">' + esc(_rfqTitleTx(r.itemName)) + '</div>' +
                        '<div class="row-sub">' + esc(r.result || 'بسته شد') + '</div>' +
                    '</div>' +
                    '<span class="badge b-gray">' + esc(r.when || '') + '</span>' +
                '</div>';
            }).join('');
        }
    }

    /* ─── ۲۶: مقایسهٔ پیشنهادهای یک استعلام ───
       FD-24 — چندقلمی: مرتب‌سازی «اول پوشش کامل، بعد جمع کل»
       (حکم مالک: «تأمین‌کنندگانی که چند کالا را داشتند یا بعضی
       کالاها را داشتند می‌آمدند؛ تعداد کالاهایی که فروشنده داشت»)؛
       هر کارت بج پوشش «k از n قلم» + ردیف قیمت هر قلم («ندارد»
       برای قلم ناقص) + جمع کل در جای قیمت؛ برچسب «کمترین جمع»
       فقط بین پیشنهادهای کامل (مقایسهٔ سیب با سیب). تک‌قلمی همان
       مرتب‌سازی قدیمی بر اساس قیمت قلم است. */
    function offersListRender() {
        var sec = $('#s-buy-offers');
        if (!sec) return;
        var params = core.getSCREENParams()['s-buy-offers'] || {};
        var rfq = _rfqOut(params.rfq) || (core.data.rfqsOut || []).filter(function (r) { return r.status === 'current'; })[0] || (core.data.rfqsOut || [])[0];
        if (!rfq) return;
        var items = rfq.items || [];
        var multi = items.length > 1;
        var list = (core.data.offers || []).filter(function (o) { return o.rfqId === rfq.id; });
        if (multi) {
            list.sort(function (a, b) {
                var d = offerCover(b, rfq) - offerCover(a, rfq);
                if (d) return d;
                return offerTotal(a, rfq) - offerTotal(b, rfq);
            });
        } else {
            list.sort(function (a, b) { return a.price - b.price; });
        }
        var sub = $('#offers-sub');
        if (sub) sub.textContent = _rfqTitleTx(rfq.itemName) + ' · ' + faNum(list.length) + ' پیشنهاد';
        var closeBtn = $('#offers-close');
        if (closeBtn) closeBtn.hidden = rfq.status !== 'current';
        var host = $('#offers-list');
        if (!host) return;

        if (rfq.status !== 'current') {
            host.innerHTML = '<div class="empty"><div class="empty-ic"><svg><use href="#i-inbox"/></svg></div>' +
                '<h3>این استعلام بسته شده</h3><p>' + esc(rfq.result || 'بسته شد') + ' — پیشنهادها برای رکورد همین‌جا می‌مانند.</p></div>';
            return;
        }
        if (!list.length) {
            host.innerHTML = '<div class="empty"><div class="empty-ic"><svg><use href="#i-clock"/></svg></div>' +
                '<h3>هنوز پیشنهادی نرسیده</h3><p>به ' + faNum(rfq.sentTo || 0) + ' تأمین‌کننده گفته شد؛ تا پایان مهلت پاسخ می‌آید.</p></div>';
            return;
        }
        /* «کمترین جمع» = ارزان‌ترینِ کامل‌ها (چندقلمی) / «کمترین قیمت»
           = ارزان‌ترین قلم (تک‌قلمی — همان رفتار قدیمی) */
        var best;
        if (multi) {
            var full = list.filter(function (o) { return offerCover(o, rfq) >= items.length; });
            best = full.length ? full.reduce(function (m, o) { return offerTotal(o, rfq) < offerTotal(m, rfq) ? o : m; }, full[0]) : null;
        } else best = list[0];
        host.innerHTML = list.map(function (o) {
            var cov = offerCover(o, rfq);
            var badges = '';
            if (multi) {
                badges += cov >= items.length
                    ? '<span class="badge b-green">همهٔ ' + faNum(items.length) + ' قلم</span>'
                    : '<span class="badge b-gray">' + faNum(cov) + ' از ' + faNum(items.length) + ' قلم</span>';
            }
            if (o === best) badges += '<span class="badge b-green">' + (multi ? 'کمترین جمع' : 'کمترین قیمت') + '</span>';
            if (o.isKnown) badges += '<span class="badge b-green">آشنای من</span>';

            /* ردیف قیمت هر قلم — چندقلمی (FD-24) */
            var itemsHtml = '';
            if (multi) {
                itemsHtml = '<div class="of-items">' + items.map(function (it, i) {
                    var p = o.prices ? o.prices[i] : null;
                    return '<div class="of-it"><span class="k">' + esc(it.name) +
                        ' <span class="opt">· ' + faNum(it.qty || 0) + ' ' + esc(it.pack) + '</span></span>' +
                        (p
                            ? '<span class="v">' + faMoney(p) + '</span>'
                            : '<span class="v miss">این قلم را ندارد</span>') +
                    '</div>';
                }).join('') + '</div>';
            }

            return '<div class="offer-card' + (o === best ? ' best' : '') + '" data-offer-go="' + esc(o.id) + '">' +
                '<div class="offer-head">' +
                    '<div class="avatar" style="background: ' + esc(o.color) + ';">' + esc(o.avatar) + '</div>' +
                    '<div style="flex: 1; min-width: 0;">' +
                        '<div style="font-size: 13.5px; font-weight: 700;">' + esc(o.seller) +
                            (o.verified ? ' <svg style="width: 12px; height: 12px; color: var(--blue);"><use href="#i-verified"/></svg>' : '') + '</div>' +
                        '<div style="font-size: 11px; color: var(--text-3); margin-top: 2px;">' + esc(o.city) + ' · هم‌استان</div>' +
                        (badges ? '<div style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">' + badges + '</div>' : '') +
                    '</div>' +
                    '<div class="offer-price"><div class="p">' + faMoney(multi ? offerTotal(o, rfq) : o.price) + '</div><div class="u">' +
                        (multi ? 'جمع ' + faNum(cov) + ' قلم' : esc(_perWord(rfq))) + '</div></div>' +
                '</div>' +
                itemsHtml +
                '<div class="of-terms">' +
                    '<div class="ot-chip"><small>پرداخت</small><b>' + esc(payTx(o.pay)) + '</b></div>' +
                    '<div class="ot-chip"><small>تحویل</small><b>' + esc(dlvTx(o.dlv)) + '</b></div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    /* ─── ۲۷: جزئیات پیشنهاد ─── */
    function offerViewRender() {
        var sec = $('#s-buy-offer-view');
        if (!sec) return;
        var params = core.getSCREENParams()['s-buy-offer-view'] || {};
        var o = _offer(params.offer) || (core.data.offers || [])[0];
        if (!o) return;
        var rfq = _rfqOut(o.rfqId) || (core.data.rfqsOut || [])[0] || {};
        var it = (rfq.items || [])[0] || {};

        var sellerSub = $('#ovf-seller');
        if (sellerSub) sellerSub.textContent = o.seller;

        var head = $('#ovf-head');
        if (head) {
            var badges = '';
            if (o.isKnown) badges += '<span class="badge b-green">آشنای من</span>';
            if (o.verified) badges += '<span class="badge b-blue">تأییدشده</span>';
            head.innerHTML =
                '<div class="avatar avatar-lg" style="background: ' + esc(o.color) + ';">' + esc(o.avatar) + '</div>' +
                '<div style="flex: 1; min-width: 0;">' +
                    '<div style="font-size: 15px; font-weight: 700;">' + esc(o.seller) + '</div>' +
                    '<div style="font-size: 11px; color: var(--text-3); margin-top: 3px;">' + esc(o.city) +
                        ' · تأمین‌کننده' + (o.isKnown ? ' — در شبکهٔ تو' : '') + '</div>' +
                    (badges ? '<div style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">' + badges + '</div>' : '') +
                '</div>';
        }

        var lbl = $('#ovf-price-lbl');
        var price = $('#ovf-price');
        var unit = $('#ovf-unit'), utx = $('#ovf-unit-tx');
        var multi = (rfq.items || []).length > 1;
        var cov = offerCover(o, rfq);
        if (multi) {
            /* FD-24 — چندقلمی: جای قیمت، جمع کل می‌نشیند؛ ردیف هر
               قلم (قیمت/ندارد) در کارت مشخصات زیرش؛ معادل واحد فقط
               برای قلم اول اگر بستهٔ چندیته باشد. */
            if (lbl) lbl.textContent = 'جمع ' + faNum(cov) + ' قلم از ' + faNum((rfq.items || []).length) + ' قلم استعلام';
            if (price) price.innerHTML = faMoney(offerTotal(o, rfq)) + ' <small>تومان</small>';
            var it0 = (rfq.items || [])[0] || {};
            var p0 = o.prices ? o.prices[0] : o.price;
            var showUnit = it0.packCount && it0.packCount > 1 && p0;
            if (unit) unit.hidden = !showUnit;
            if (showUnit && utx) {
                utx.innerHTML = 'هر ' + esc(it0.baseUnit || 'واحد') + ' ' + esc(it0.name || '') + ' ≈ <b>' +
                    faMoney(Math.round(p0 / it0.packCount)) + ' تومان</b>';
            }
        } else {
            if (lbl) lbl.textContent = 'قیمت هر ' + (it.pack || 'واحد');
            if (price) price.innerHTML = faMoney(o.price) + ' <small>تومان</small>';
            var showUnit2 = o.packCount && o.packCount > 1 && o.pricePerUnit;
            if (unit) unit.hidden = !showUnit2;
            if (showUnit2 && utx) {
                utx.innerHTML = 'هر ' + esc(o.baseUnit || 'واحد') + ' ≈ <b>' + faMoney(o.pricePerUnit) +
                    ' تومان</b> — قابل‌مقایسه با بسته‌بندی‌های دیگر';
            }
        }

        var facts = $('#ovf-facts');
        if (facts) {
            var rows = [
                ['درخواست', esc(_rfqTitleTx(rfq.itemName || ''))]
            ];
            if (multi) {
                /* ردیف هر قلم — قیمت یا «ندارد» (FD-24)؛
                   «قیمت × مقدار = جمع قلم» خواناتر از فلش است */
                (rfq.items || []).forEach(function (qi, i) {
                    var p = o.prices ? o.prices[i] : null;
                    rows.push([esc(qi.name) + ' · ' + faNum(qi.qty || 0) + ' ' + esc(qi.pack || ''),
                        p
                            ? faMoney(p) + ' × ' + faNum(qi.qty || 0) + ' = <b>' + faMoney(p * (qi.qty || 0)) + ' تومان</b>'
                            : '<span style="color: var(--text-3);">این قلم را ندارد</span>']);
                });
                rows.push(['جمع کل', '<span style="color: var(--primary-strong);">' + faMoney(offerTotal(o, rfq)) + ' تومان</span>']);
            } else {
                rows.push(['مقدار درخواست', faNum(it.qty || 0) + ' ' + esc(it.pack || '')]);
                rows.push(['جمع کل', '<span style="color: var(--primary-strong);">' + faMoney(o.price * (it.qty || 0)) + ' تومان</span>']);
            }
            rows.push(['شرایط پرداخت', esc(payTx(o.pay))]);
            rows.push(['روش تحویل', esc(dlvTx(o.dlv))]);
            if (rfq.status === 'current' && rfq.daysLeft !== undefined) {
                rows.push(['مهلت استعلام', _leftTx(rfq.daysLeft)]);
            }
            facts.innerHTML = rows.map(function (r) {
                return '<div class="fact-row"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>';
            }).join('');
        }

        var note = $('#ovf-note'), ntx = $('#ovf-note-tx');
        if (note) note.hidden = !o.note;
        if (ntx) ntx.textContent = o.note || '';

        var acc = $('#ovf-accept');
        if (acc) acc.hidden = rfq.status !== 'current';

        /* ═══ FD-22 (تصمیم ۲/۹): پیوند پیشنهاد ← سفارش ═══
           استعلام بسته با نتیجهٔ «پذیرفت: همین فروشنده» و هنوز سفارش
           نشده ⇒ دکمهٔ «ثبت سفارش با همین شرایط» زیر جزئیات — حلقهٔ
           استعلام تا سفارش واقعی، بدون پرداخت درون‌شبکه‌ای (سفارش =
           تعهد ثبت‌شده؛ پول و تحویل بیرون از سیستم — قید مالک). */
        var ordWrap = $('#ovf-order');
        if (ordWrap) {
            var acceptedThis = rfq.status === 'done' &&
                String(rfq.result || '').indexOf(o.seller) > -1 && !rfq.ordered;
            ordWrap.hidden = !acceptedThis;
        }
    }

    /* پذیرش پیشنهاد = پایان استعلام (حکم مالک FD-14) */
    function offerAccept() {
        var params = core.getSCREENParams()['s-buy-offer-view'] || {};
        var o = _offer(params.offer) || (core.data.offers || [])[0];
        var rfq = o ? _rfqOut(o.rfqId) : null;
        core.confirm({
            title: 'پذیرش پیشنهاد',
            text: 'این پیشنهاد را می‌پذیری؟ فروشنده خبردار می‌شود و برای هماهنگی با تو تماس می‌گیرد. استعلام هم بسته می‌شود.',
            ok: 'بله، می‌پذیرم', cancel: 'انصراف'
        }).then(function (ok) {
            if (!ok) return;
            if (rfq && rfq.status === 'current') {
                rfq.status = 'done';
                /* FD-24: نتیجهٔ چندقلمی = جمع کل (offerTotal)؛ تک‌قلمی
                   همان قیمت قلم */
                rfq.result = 'پذیرفت: ' + o.seller + ' — ' +
                    (((rfq.items || []).length > 1) ? 'جمع ' + faMoney(offerTotal(o, rfq)) : faMoney(o.price)) + ' ت';
                rfq.when = 'امروز';
            }
            /* FD-19: اعلان به فروشندهٔ برنده (نکتهٔ باز FD-14) — «پیشنهادت
               پذیرفته شد» مهم‌ترین خبرِ اوست؛ بقیهٔ گیرنده‌ها هم استعلامِ
               بسته‌شده را می‌بینند (در محصول واقعی دو اعلان جدا) */
            if (core.forms.pushNotify) {
                pushNotify({
                    type: 'offer',
                    title: 'پیشنهاد پذیرفته شد',
                    body: 'خریدار پیشنهاد «' + o.seller + '» برای «' + (rfq ? rfq.itemName : '') + '» را پذیرفت — برای هماهنگی تماس بگیرید.',
                    link: 's-sell-rfqs'
                });
            }
            toast('پیشنهاد پذیرفته شد — استعلام بسته شد', 'success');
            /* FD-22 (تصمیم ۲/۹): دیگر به فهرست استعلام‌ها پرش نمی‌کنیم —
               همان‌جا می‌مانیم و «ثبت سفارش با همین شرایط» پیش چشم
               می‌نشیند (گام بعدی طبیعیِ پذیرش). */
            offerViewRender();
        });
    }

    /* بستن استعلام بدون انتخاب پیشنهاد (۲۶) */
    function rfqCloseConfirm() {
        var params = core.getSCREENParams()['s-buy-offers'] || {};
        var rfq = _rfqOut(params.rfq) || (core.data.rfqsOut || []).filter(function (r) { return r.status === 'current'; })[0];
        if (!rfq || rfq.status !== 'current') return;
        core.confirm({
            title: 'بستن استعلام',
            text: 'این استعلام را می‌بندی؟ بعد از بستن، پیشنهاد جدیدی دریافت نمی‌کنی.',
            ok: 'بله، بسته می‌شود', cancel: 'انصراف'
        }).then(function (ok) {
            if (!ok) return;
            rfq.status = 'done';
            rfq.result = 'بسته شد — بدون انتخاب پیشنهاد';
            rfq.when = 'امروز';
            /* FD-19: اعلان به تأمین‌کنندگان گیرنده (نکتهٔ باز FD-14) —
               پاسخ‌دهنده‌ها باید بدانند استعلام دیگر باز نیست */
            if (core.forms.pushNotify) {
                pushNotify({
                    type: 'offer',
                    title: 'استعلام بسته شد',
                    body: 'خریدار استعلام «' + rfq.itemName + '» را بدون انتخاب پیشنهاد بست.',
                    link: 's-sell-rfqs'
                });
            }
            toast('استعلام بسته شد', 'success');
            core.resetStack();
            core.show('s-buy-rfqs', false);
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       FD-24 — ۲۵: استعلام چندقلمی
       ─────────────────────────────────────────────────────────────
       حکم مالک: «قیمت‌گیری هم باید چندکالایی را ساپورت کنه؛ اگر یک
       کالا پیش‌فرض هم انتخاب شده باشه باید بتونه کالاهای بعدی رو هم
       اضافه کنه. خیلی کسب‌وکارها مثل خرده‌فروش‌ها معمولاً قیمت چند
       کالا رو در یه استعلام می‌گیرن و قرار نیست برای هر کالا چند
       قیمت‌گیری داشته باشیم که کاربردی نباشه.» (الگوی «چند قیمت‌گیری»
       redesign-base: تأمین‌کنندگانی که چند کالا را داشتند یا بعضی
       کالاها را داشتند می‌آیند + تعداد کالاهایی که فروشنده داشت.)
       ▸ RFQ.items — قلم‌های استعلام { key, name, pack, qty, img,
         packCount?, baseUnit? }؛ قلم اول به‌طور پیش‌فرض از لیست خرید
         (یا پارامتر item) می‌آید؛ بقیه از شیت sheet-rfqpick.
       ▸ گیرندگان = اجتماع دارندگان ≥۱ قلم؛ چندقلمی ⇒ تیک قفلِ روشن
         + بج پوشش «k از n قلم» + سورت نزولی پوشش؛ تک‌قلمی ⇒ تیک
         انتخابی (شبکهٔ تاییدشده روشن، «در انتظار تایید» خاموش).
       ▸ پیاده‌سازی واقعی: پوشش روی goodId سمت سرور با کش per-viewer؛
         قلم تازه هم‌زمان idempotent به لیست خرید می‌نشیند؛ استعلام
         چندقلمی یک رکورد است (groupId مشترک) و نمی‌شکند.
       ═══════════════════════════════════════════════════════════════ */
    var RFQ = { items: [], touched: false, sel: {} };

    /* پرتکرار صنف (دمو — سوپرمارکت) برای شیت انتخاب؛ در محصول واقعی
       از داده‌های واقعی پرتکراریِ صنف کاربر می‌آید. */
    var RFQ_FREQ = [
        { name: 'پفک نمکی',        pack: 'کارتن ۵۰ عددی',  qty: 30, img: 'png/goods/pofak-big.jpg' },
        { name: 'گوشت چرخ‌کرده',    pack: 'کیلوگرم',         qty: 100, img: 'png/goods/meat-beef.jpg' },
        { name: 'سبزی خشک مخلوط',  pack: 'کیسه ۵۰۰ گرمی',   qty: 50, img: 'png/goods/sabzi-mix.jpg' },
        { name: 'برنج فجر',        pack: 'کیسه ۵۰ کیلویی',  qty: 15, img: 'png/goods/fajar-50.jpg' }
    ];

    /* پوشش تأمین‌کننده نسبت به قلم‌های استعلام — تطبیق نامی ساده
       (goodsList ∩ items)؛ در محصول واقعی = تطبیق goodId سمت سرور. */
    function rfqCoverOf(sup, items) {
        var gl = (sup && sup.goodsList) ? sup.goodsList : [];
        if (!gl.length) return 0;
        var n = 0;
        (items || []).forEach(function (it) {
            var nm = String(it.name || '');
            if (gl.some(function (g) { return g && (nm.indexOf(g) > -1 || g.indexOf(nm) > -1); })) n++;
        });
        return n;
    }

    /* قلم پیش‌فرض از لیست خرید (یا پارامتر item — نام/شناسهٔ ردیف) */
    function rfqDefaultItem() {
        var params = core.getSCREENParams()['s-buy-rfq-new'] || {};
        var list = (core.data.shoppingList || []).filter(function (s) { return s.businessId === 'b2'; });
        var row = null;
        if (params.item) {
            list.forEach(function (s) { if (s.id === params.item || s.name === params.item) row = s; });
        }
        if (!row) row = list[0] || null;
        if (!row) return null;
        return rfqItemFromList(row);
    }
    function rfqItemFromList(row) {
        /* مقدار پیش‌فرض از q («۲۰ کیسهٔ ۵۰ کیلویی · ماهانه» → ۲۰) */
        var qty = parseNum(String(row.q || '').split(' ')[0]) || 20;
        var l = row.listingId ? _findListing(row.listingId) : null;
        return {
            key: row.id || ('sl-' + Date.now()),
            name: row.name, pack: row.pack || 'واحد', qty: qty,
            img: row.img || (l ? l.img : ''),
            packCount: l ? (l.packCount || 1) : 1,
            baseUnit: l ? (l.baseUnit || 'واحد') : String(row.pack || 'واحد').split(' ')[0]
        };
    }
    function rfqUnitWord(it) { return String(it.pack || 'واحد').split(' ')[0] || 'واحد'; }

    function rfqNewRender() {
        var sec = $('#s-buy-rfq-new');
        if (!sec) return;
        if (!RFQ.items.length && !RFQ.touched) {
            var def = rfqDefaultItem();
            if (def) RFQ.items = [def];
        }
        rfqRender();
    }

    function rfqRender() {
        var sec = $('#s-buy-rfq-new');
        if (!sec) return;
        var n = RFQ.items.length;
        var multi = n > 1;

        /* قلم‌های استعلام */
        var host = $('#rfq-items');
        if (host) {
            host.innerHTML = n ? RFQ.items.map(function (it, i) {
                return '<div class="rfq-item">' +
                    '<div class="thumb thumb-sm"><img src="' + esc(it.img) + '" alt=""></div>' +
                    '<div class="rfq-tx"><b>' + esc(it.name) + '</b><small>' + esc(it.pack) + '</small></div>' +
                    '<div class="rfq-steps">' +
                        '<button class="rfq-st" type="button" data-rfq-qty="' + i + '" data-dir="-1" aria-label="کمتر"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 12h14"/></svg></button>' +
                        '<div class="rfq-stv">' + faNum(it.qty) + '<small>' + esc(rfqUnitWord(it)) + '</small></div>' +
                        '<button class="rfq-st" type="button" data-rfq-qty="' + i + '" data-dir="1" aria-label="بیشتر"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>' +
                    '</div>' +
                    '<button class="rfq-rm" type="button" data-rfq-rm="' + i + '" aria-label="حذف ' + esc(it.name) + '"><svg><use href="#i-x"/></svg></button>' +
                '</div>';
            }).join('') :
                '<div class="empty" style="padding: 14px 12px;"><h3>کالایی انتخاب نشده</h3><p>«افزودن کالا» را بزن و از لیست خریدت انتخاب کن.</p></div>';
        }

        /* شمارنده‌ها و زیرعنوان */
        var cnt = $('#rfq-count');
        if (cnt) cnt.textContent = faNum(n) + ' قلم';
        var sub = $('#rfq-sub');
        if (sub) sub.textContent = !n ? 'انتخاب کالاهای استعلام' :
            (n === 1 ? RFQ.items[0].name + ' · ارسال به تأمین‌کننده‌ها' : 'استعلام چندقلمی · ' + faNum(n) + ' قلم');
        var addTx = $('#rfq-add-tx');
        if (addTx) addTx.textContent = n ? 'افزودن کالای دیگر' : 'افزودن کالا';

        /* گیرندگان — اجتماع دارندگان قلم‌ها، سورت پوشش نزولی.
           قبل از رندر، تیک‌های دستی کاربر (حالت تک‌قلمی) از DOM
           به RFQ.sel منتقل می‌شود تا با افزودن/حذف قلم یا استپر
           از بین نرود. */
        $$('#s-buy-rfq-new .checkrow[data-sid]').forEach(function (r) {
            RFQ.sel[r.dataset.sid] = !!r.querySelector('.checkbox.on');
        });
        var recHost = $('#rfq-recips');
        var sups = (core.data.suppliers || []).filter(function (s) {
            return s.businessId === 'b2' && rfqCoverOf(s, RFQ.items) > 0;
        }).sort(function (a, b) {
            var d = rfqCoverOf(b, RFQ.items) - rfqCoverOf(a, RFQ.items);
            if (d) return d;
            return (a.lastPrice || 0) - (b.lastPrice || 0);
        });
        if (recHost) {
            recHost.innerHTML = sups.length ? sups.map(function (s) {
                var cov = rfqCoverOf(s, RFQ.items);
                var on = multi ? true : !!RFQ.sel[s.id];          /* چندقلمی = قفل روشن */
                if (!multi && RFQ.sel[s.id] === undefined) on = !s.isNew; /* پیش‌فرض: شبکهٔ تاییدشده */
                var covB = multi
                    ? (cov >= n
                        ? '<span class="badge b-green">همهٔ ' + faNum(n) + ' قلم</span>'
                        : '<span class="badge b-gray">' + faNum(cov) + ' از ' + faNum(n) + ' قلم</span>')
                    : '';
                var pend = s.isNew ? '<span class="badge b-amber">در انتظار تایید</span>' : '';
                var ver = s.verified ? ' <svg style="width: 12px; height: 12px; color: var(--blue);"><use href="#i-verified"/></svg>' : '';
                return '<div class="checkrow' + (multi ? ' rfq-locked' : '') + '" data-sid="' + esc(s.id) + '"' + (multi ? ' data-lock="1"' : '') + '>' +
                    '<div class="avatar avatar-sm" style="background: ' + esc(s.color) + ';">' + esc(s.avatar) + '</div>' +
                    '<div style="flex: 1; min-width: 0;">' +
                        '<div style="font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">' + esc(s.name) + ver + covB + pend + '</div>' +
                        '<div style="font-size: 11px; color: var(--text-3); margin-top: 2px;">' + esc(s.city) + ' · آخرین قیمت ' + faMoney(s.lastPrice || 0) + '</div>' +
                    '</div>' +
                    '<div class="checkbox' + (on ? ' on' : '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4.5 12.5l5 5 10-11"/></svg></div>' +
                '</div>';
            }).join('') : '<div class="empty" style="padding: 14px 12px;"><h3>تأمین‌کننده‌ای با این کالاها نداری</h3><p>کاتالوگ تأمین‌کننده‌ها را ذخیره کن تا در استعلام ببینند.</p></div>';
        }
        var locknote = $('#rfq-locknote');
        if (locknote) locknote.hidden = !multi;
        var rc = $('#rfq-recip-count');
        if (rc) rc.textContent = sups.length
            ? (multi ? 'هر که ' + faNum(n) + ' کالایی که دارد' : faNum(sups.length) + ' تأمین‌کنندهٔ این کالا')
            : '';

        rfqRecipSync();
    }

    /* استپر مقدار قلم — گام ۱ (یا packCount>1؟ نه — مقدار خرید است) */
    function rfqQtyStep(idx, dir) {
        var it = RFQ.items[idx];
        if (!it) return;
        it.qty = Math.max(1, (it.qty || 1) + (dir === '1' ? 1 : -1));
        rfqRender();
    }
    function rfqItemRemove(idx) {
        if (!RFQ.items.length) return;
        RFQ.items.splice(idx, 1);
        RFQ.touched = true;
        rfqRender();
    }

    /* ─── شیت انتخاب کالا (sheet-rfqpick) ─── */
    function rfqPickOpen() {
        rfqPickRender();
        core.openSheet('sheet-rfqpick');
    }
    function rfqPickRowHtml(row) {
        var inq = RFQ.items.some(function (x) { return x.name === row.name; });
        return '<button class="pl-row' + (inq ? ' on in-list' : '') + '" type="button"' +
            (inq ? '' : ' data-rfp-item="' + esc(row.key) + '"') + '>' +
            '<span class="pl-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4.5 12.5l5 5 10-11"/></svg></span>' +
            '<div class="pl-th"><img src="' + esc(row.img) + '" alt=""></div>' +
            '<div class="pl-tx"><b>' + esc(row.name) + '</b><small>' + esc(row.pack) + ' · مقدار پیش‌فرض ' + faNum(row.qty) + '</small></div>' +
            (inq ? '<span class="pl-inlist"><span class="badge b-green">در استعلام</span></span>' : '') +
        '</button>';
    }
    function rfqPickRender() {
        var host = $('#rfp-grid');
        if (!host) return;
        var mine = (core.data.shoppingList || []).filter(function (s) { return s.businessId === 'b2'; })
            .map(rfqItemFromList);
        host.innerHTML =
            '<div class="pl-group-t">در لیست خرید من</div>' + (mine.length ? mine.map(rfqPickRowHtml).join('') : '<div class="pl-empty">لیست خریدت خالی است</div>') +
            '<div class="pl-group-t">پرتکرار در صنف شما — سوپرمارکت</div>' + RFQ_FREQ.map(function (f) {
                return rfqPickRowHtml({ key: 'fq-' + f.name, name: f.name, pack: f.pack, qty: f.qty, img: f.img });
            }).join('');
    }
    function rfqPickAdd(key) {
        /* از لیست خرید من — با مقدار واقعی؛ از پرتکرار — با مقدار پیش‌فرض */
        var row = (core.data.shoppingList || []).filter(function (s) { return s.businessId === 'b2'; })
            .find(function (s) { return s.id === key; });
        var it;
        if (row) it = rfqItemFromList(row);
        else {
            var f = RFQ_FREQ.find(function (x) { return 'fq-' + x.name === key; });
            if (!f) return;
            it = { key: key, name: f.name, pack: f.pack, qty: f.qty, img: f.img, packCount: 1, baseUnit: rfqUnitWord(f) };
        }
        if (RFQ.items.some(function (x) { return x.name === it.name; })) return;
        RFQ.items.push(it);
        RFQ.touched = true;
        rfqRender();
        rfqPickRender();
    }

    /* شمارش زندهٔ دکمهٔ ارسال (هم‌زمان با قلم‌ها و تیک‌ها) */
    function rfqRecipSync() {
        var sec = $('#s-buy-rfq-new');
        if (!sec) return;
        if (!RFQ.items.length) {
            var b0 = $('#rfq-send-btn');
            if (b0) { b0.disabled = true; b0.textContent = 'اول کالای استعلام را انتخاب کن'; }
            return;
        }
        var n = $$('#s-buy-rfq-new .checkrow .checkbox.on').length;
        var m = RFQ.items.length;
        var btn = $('#rfq-send-btn');
        if (btn) {
            btn.textContent = 'ارسال استعلام ' + faNum(m) + ' قلمی به ' + faNum(n) + ' تأمین‌کننده';
            btn.disabled = n === 0;
        }
    }

    function rfqSendNew() {
        var sec = $('#s-buy-rfq-new');
        if (!sec) return false;
        if (!RFQ.items.length) { toast('حداقل یک کالا به استعلام اضافه کن', 'error'); return true; }
        var n = $$('#s-buy-rfq-new .checkrow .checkbox.on').length;
        if (!n) { toast('حداقل یک تأمین‌کننده انتخاب کن', 'error'); return true; }
        var days = 3;
        var act = $('#rfq-deadline .pill.active');
        if (act) days = parseInt(act.dataset.deadline, 10) || 3;
        var m = RFQ.items.length;
        /* عنوان: تک‌قلمی «نام · مقدار» / چندقلمی «n قلمی» + pack جمعی
           (هم‌قالب ri1/ri2 سمت فروشنده — یک زبان در دو طرف) */
        var itemName = m === 1
            ? RFQ.items[0].name + ' · ' + faNum(RFQ.items[0].qty) + ' ' + rfqUnitWord(RFQ.items[0])
            : faNum(m) + ' قلمی';
        var packTx = m === 1 ? RFQ.items[0].pack : RFQ.items.map(function (it) { return rfqUnitWord(it); }).join('، ');
        core.data.rfqsOut.unshift({
            id: 'rn' + Date.now(), businessId: 'b2',
            supplierIds: $$('#s-buy-rfq-new .checkrow').filter(function (r) {
                return r.querySelector('.checkbox.on');
            }).map(function (r) { return r.dataset.sid; }),
            itemName: itemName, pack: packTx, img: RFQ.items[0].img,
            sentTo: n, offersCount: 0, newOffers: 0, daysLeft: days, status: 'current',
            /* FD-24: قلم‌های کامل با مقدار — همان ساختار rfqsIn/ro1؛
               پایپ «ثبت سفارش با همین شرایط» (۲۷) از همین می‌خواند. */
            items: RFQ.items.map(function (it) {
                return { name: it.name, pack: it.pack, packCount: it.packCount || 1, qty: it.qty, img: it.img, baseUnit: it.baseUnit || rfqUnitWord(it) };
            })
        });
        var btn = $('#rfq-send-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'ارسال شد ✓'; }
        toast('استعلام ' + faNum(m) + ' قلمی برای ' + faNum(n) + ' تأمین‌کننده ارسال شد', 'success');
        /* فرم برای بار بعد ریست می‌شود (قلم پیش‌فرض دوباره می‌آید) */
        RFQ.items = []; RFQ.touched = false; RFQ.sel = {};
        setTimeout(function () { core.resetStack(); core.show('s-buy-rfqs', false); }, 800);
        return true;
    }

    /* ─── ۲۰: رندر پویای لیست خرید ─── */
    function buyListRender() {
        var host = $('#buylist-rows');
        if (!host) return;
        var items = core.data.shoppingList || [];
        var cnt = $('#buylist-count');
        if (cnt) cnt.textContent = faNum(items.length) + ' کالا';
        if (!items.length) {
            host.innerHTML = '<div class="empty"><div class="empty-ic"><svg><use href="#i-basket"/></svg></div>' +
                '<h3>لیست خریدت خالی است</h3><p>کالاهایی که عمده می‌خری را اضافه کن — از کاتالوگ تأمین‌کننده‌هایت یا با «افزودن کالا».</p></div>';
            return;
        }
        host.innerHTML = items.map(function (it) {
            var chips = '';
            if (it.added) chips += '<span class="bl-chip hot"><svg><use href="#i-check"/></svg> تازه افزوده</span>';
            else if (it.fresh) chips += '<span class="bl-chip ' + (it.fresh === 'امروز' ? 'fresh' : 'warn') +
                '"><svg><use href="#i-clock"/></svg> قیمت ' + esc(it.fresh) + '</span>';
            if (it.offers) chips += '<span class="bl-chip hot"><svg><use href="#i-sparkles"/></svg> ' + faNum(it.offers) + ' پیشنهاد</span>';
            if (it.inq) chips += '<span class="bl-chip hot"><svg><use href="#i-inbox"/></svg> استعلام در جریان</span>';
            if (it.suppliersCount) chips += '<span class="bl-chip"><svg><use href="#i-users"/></svg> ' + faNum(it.suppliersCount) + ' تأمین‌کننده</span>';
            else chips += '<span class="bl-chip muted"><svg><use href="#i-info"/></svg> تأمین‌کننده‌ای ثبت نشده</span>';
            return '<div class="bl-card" data-go="s-buy-product-suppliers" data-product="' + esc(it.name) + '">' +
                '<div class="bl-thumb"><img src="' + esc(it.img) + '" alt=""></div>' +
                '<div class="bl-body">' +
                    '<div class="bl-title">' + esc(it.name) + '</div>' +
                    '<div class="bl-q">' + esc(it.q || it.pack || '') + '</div>' +
                    '<div class="bl-meta">' + chips + '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    /* ─── ۳۱: شیت «افزودن کالاهای کاتالوگ به لیست خرید» ───
       FD-22 (حکم مالک): لیست ردیفیِ تک‌ستونه (نه دو ستونی) + قبل از
       افزودن، «مقدار خرید» و «دورهٔ خرید» هر کالای انتخاب‌شده الزامی
       است («قبل از اضافه شدن به لیست خرید باید مقدار خرید و دوره خرید
       رو برای هر کالا مشخص کنه»). مقدار پیش‌فرض = حداقل خرید همان
       کالا (پیشنهاد سیستم — کاربر عوضش می‌کند). رندرها مقدارهای
       تایپ‌شده را از PICK.qty/PICK.per می‌خوانند (نمی‌ریزد).
       FD-25 (حکم مالک — طراحی کارت ردیف بازطراحی شد):
         · فیلدها تمام‌عرض زیر سربرگ ردیف می‌نشینند (خارج از ستون
           باریکِ متن) — قبلاً «مقدار خرید و دوره خرید از کادر می‌زد
           بیرون»: فیلدها داخل .pl-tx (ستون کنار بندانگشتی) گیر
           می‌کردند و در عرض کم له/سرریز می‌شدند.
         · «دورهٔ خرید» کمبوی select است (هفتگی/دوهفتگی/ماهانه —
           واژگان redesign-base)، نه دو دکمهٔ pill؛ در پیاده‌سازی
           واقعی همین select با دوره‌های آزادِ کسب‌وکار پر می‌شود.
         · واحد مقدار در لیبل فیلد (الگوی «— تومان» فرم قیمت):
           «مقدار خرید — کیسه»؛ واحد از بسته‌بندی کالا (کاتالوک
           فروشنده) می‌آید و مقدار خرید همیشه با واحد ذخیره می‌شود.
         · پس از افزودن، شیت به نمای موفقیت می‌رود (pl-ok) — حکم
           مالک: پیام «کالاها به لیست خریدت اضافه شد» + دکمهٔ
           «مشاهده لیست خرید در پنل آیمچ» زیرش. */
    var PICK = { sel: {}, q: '', gid: '', qty: {}, per: {} };

    function picklistOpen() {
        PICK.sel = {}; PICK.q = ''; PICK.gid = '';
        PICK.qty = {}; PICK.per = {};
        var s = $('#pl-search');
        if (s) s.value = '';
        /* FD-25: ریست نماها — بازشدن بعدی همیشه با فرم تمیز */
        var v = $('#pl-view'), ok = $('#pl-ok');
        if (v) v.hidden = false;
        if (ok) ok.hidden = true;
        picklistRender();
        core.openSheet('sheet-picklist');
    }

    function picklistRender() {
        var gHost = $('#pl-groups');
        if (gHost) {
            var chips = ['<button class="chip' + (PICK.gid ? '' : ' active') + '" type="button" data-pl-g="">همه</button>'];
            (core.data.catalogGroups || []).forEach(function (g) {
                chips.push('<button class="chip' + (PICK.gid === g.id ? ' active' : '') +
                    '" type="button" data-pl-g="' + esc(g.id) + '">' + esc(g.name) + '</button>');
            });
            gHost.innerHTML = chips.join('');
        }
        var host = $('#pl-grid');
        if (!host) return;
        var items = (core.data.listings || []).filter(function (l) {
            if (PICK.gid && l.groupId !== PICK.gid) return false;
            if (PICK.q && l.name.indexOf(PICK.q) === -1) return false;
            return true;
        });
        host.innerHTML = items.length ? items.map(function (l) {
            var inList = (core.data.shoppingList || []).some(function (s) { return s.listingId === l.id; });
            var sel = !!PICK.sel[l.id];
            var qv = PICK.qty[l.id] || '';
            var per = PICK.per[l.id] || '';
            var flds = (sel && !inList)
                ? '<div class="pl-flds">' +
                    '<div class="pl-f"><label>مقدار خرید <span class="opt">— ' + _unitWord(l) + '</span></label>' +
                    '<div class="input"><input data-pl-qty="' + esc(l.id) + '" inputmode="numeric" autocomplete="off" value="' + esc(qv) + '" placeholder="حداقل ' + faNum(l.min || 1) + '"></div></div>' +
                    '<div class="pl-f"><label>دورهٔ خرید</label>' +
                        '<div class="input pl-sel">' +
                            '<select data-pl-per="' + esc(l.id) + '" aria-label="دورهٔ خرید ' + esc(l.name) + '">' +
                                '<option value=""' + (per ? '' : ' selected') + ' disabled>انتخاب دوره</option>' +
                                '<option value="هفتگی"' + (per === 'هفتگی' ? ' selected' : '') + '>هفتگی</option>' +
                                '<option value="دوهفتگی"' + (per === 'دوهفتگی' ? ' selected' : '') + '>دوهفتگی</option>' +
                                '<option value="ماهانه"' + (per === 'ماهانه' ? ' selected' : '') + '>ماهانه</option>' +
                            '</select>' +
                            '<svg><use href="#i-chevd"/></svg>' +
                        '</div></div>' +
                  '</div>'
                : '';
            return '<div class="pl-row' + (sel ? ' on' : '') + (inList ? ' in-list' : '') + '"' +
                (inList ? '' : ' data-pl-item="' + esc(l.id) + '"') + '>' +
                '<span class="pl-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4.5 12.5l5 5 10-11"/></svg></span>' +
                '<div class="pl-th"><img src="' + esc(l.img) + '" alt=""></div>' +
                '<div class="pl-tx"><b>' + esc(l.name) + '</b>' +
                    '<small>' + esc(l.pack) + (l.min ? ' · حداقل ' + faNum(l.min) : '') + '</small></div>' +
                /* FD-25: فیلدها تمام‌عرض زیر سربرگ ردیف — نه داخل .pl-tx
                   (ستون باریک کنار بندانگشتی) که «از کادر نزنند بیرون» */
                flds +
                (inList ? '<span class="pl-inlist"><span class="badge b-green">در لیست هست</span></span>' : '') +
            '</div>';
        }).join('') : '<div class="pl-empty">کالایی با این جستجو پیدا نشد</div>';
        picklistBtnSync();
    }

    function picklistBtnSync() {
        var n = 0;
        Object.keys(PICK.sel).forEach(function (k) { if (PICK.sel[k]) n++; });
        /* الزام مقدار + دوره (حکم مالک FD-22) — دکمه تا کامل‌شدن همه خاموش */
        var missing = 0;
        Object.keys(PICK.sel).forEach(function (k) {
            if (!PICK.sel[k]) return;
            if (!parseNum(PICK.qty[k]) || !PICK.per[k]) missing++;
        });
        var btn = $('#pl-add'), tx = $('#pl-add-tx');
        if (btn) btn.disabled = n === 0 || missing > 0;
        if (tx) {
            if (missing) tx.textContent = 'مقدار و دورهٔ ' + faNum(missing) + ' کالا را مشخص کن';
            else tx.textContent = n ? 'افزودن ' + faNum(n) + ' کالا به لیست خرید' : 'افزودن به لیست خرید';
        }
    }

    function picklistToggle(lid) {
        PICK.sel[lid] = !PICK.sel[lid];
        if (!PICK.sel[lid]) { delete PICK.qty[lid]; delete PICK.per[lid]; }
        else if (!PICK.qty[lid]) {
            /* پیشنهاد سیستم: مقدار = حداقل خرید همان کالا */
            var l = _findListing(lid);
            if (l && l.min) PICK.qty[lid] = String(l.min);
        }
        picklistRender();
    }

    function picklistGroup(gid) {
        PICK.gid = gid || '';
        picklistRender();
    }

    function picklistSearch(q) {
        PICK.q = (q || '').trim();
        picklistRender();
    }

    /* مقدار/دورهٔ یک کالا — از input مقدار و کمبوی دوره (app-handlers) */
    function picklistQty(lid, val) {
        PICK.qty[lid] = val;
        picklistBtnSync();
    }
    /* FD-25: دوره از کمبو می‌آید (select data-pl-per) — مقدار خالی
       (option placeholder) معتبر نیست و دکمهٔ افزودن خاموش می‌ماند */
    function picklistPer(lid, val) {
        PICK.per[lid] = val || '';
        picklistRender();
    }

    /* ═══ FD-25 — دکمه‌های نمای موفقیت شیت ۳۱ ═══
       «مشاهده لیست خرید در پنل آیمچ»: مقصد روشن (۲۰) — همان الگوی
       guestOrderTrack («پیگیری سفارش در میز خرید»): بستن شیت +
       ریست پشته + رفتن مستقیم؛ در پیاده‌سازی واقعی همین دکمه
       deep-link میز خریدِ همان کسب‌وکار خریدار است.
       «ادامهٔ خرید»: کاربر در همان کاتالوگ می‌ماند — نما ریست می‌شود
       تا بازشدن بعدی شیت با فرم تمیز باشد. */
    function picklistGoList() {
        core.closeSheet('sheet-picklist');
        picklistOkReset();
        core.resetStack();
        core.show('s-buy-list', false);
    }
    function picklistContinue() {
        core.closeSheet('sheet-picklist');
        picklistOkReset();
    }
    function picklistOkReset() {
        var v = $('#pl-view'), ok = $('#pl-ok');
        if (v) v.hidden = false;
        if (ok) ok.hidden = true;
    }

    function picklistAdd() {
        var ids = Object.keys(PICK.sel).filter(function (k) { return PICK.sel[k]; });
        if (!ids.length) return;
        var added = 0;
        ids.forEach(function (lid) {
            var l = _findListing(lid);
            if (!l) return;
            if ((core.data.shoppingList || []).some(function (s) { return s.listingId === l.id; })) return;
            var qty = parseNum(PICK.qty[lid]) || 0;
            var per = PICK.per[lid] || '';
            core.data.shoppingList.push({
                id: 'sl-' + Date.now() + '-' + lid,
                businessId: 'b2', listingId: l.id,
                name: l.name, pack: l.pack, img: l.img,
                q: faNum(qty) + ' ' + l.pack + ' · ' + per,
                suppliersCount: 1, added: true
            });
            added++;
        });
        /* FD-25 (حکم مالک): نتیجه در خودِ شیت پیام می‌شود — «کالاها به
           لیست خریدت اضافه شد» + دکمهٔ «مشاهده لیست خرید در پنل آیمچ»
           زیرش؛ توستِ رانده‌شده حذف شد (شیت بسته نمی‌شود تا کاربر خودش
           انتخاب کند: رفتن به لیست یا ادامهٔ خرید). ضدتکرار کامل =
           پیام خطا همان توست خطاست. */
        if (added) {
            var v = $('#pl-view'), ok = $('#pl-ok'), sub = $('#pl-ok-sub');
            if (v) v.hidden = true;
            if (ok) ok.hidden = false;
            if (sub) sub.textContent = faNum(added) + ' کالا با مقدار و دورهٔ خریدی که مشخص کردی — در میز خرید آیمچ آمادهٔ استعلام است.';
            /* کاشی ۱۹ زنده می‌شود (renderBuyDesk در show-hook) */
        } else {
            core.closeSheet('sheet-picklist');
            toast('این کالاها از قبل در لیست خریدت هستند', 'error');
        }
    }

    core.registerShowHook('s-sell-add', addReset);
    core.registerShowHook('s-catalog-guest', applyGuestMode);
    /* FD-10: جزئیات کالا — رندر از دیتا + وضعیت گیت قیمت */
    core.registerShowHook('s-product-view', productViewSync);
    core.registerShowHook('s-contacts', applyContactsMode);
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
    /* FD-15: گرید از listings واقعی ساخته می‌شود — افزودن/حذف دیده می‌شود */
    core.registerShowHook('s-catalog', catGridRender);
    core.registerShowHook('s-cat-edit', catEditLoad);
    core.registerShowHook('s-sell-edit', gdEditRender);
    core.registerShowHook('s-home-sell', chargeSync);
    /* میز فروش/خرید — کارتابل (FD-6): چیپ امتیاز اپ‌بار + کارت «گام بعدی فعالیت» */
    core.registerShowHook('s-home-sell', deskHomeSync);
    core.registerShowHook('s-home-buy', buyDeskSync);
    core.registerShowHook('s-profile', chargeSync);

    /* ═══ FD-14 — هوک‌های جریان استعلام/پیشنهاد + لیست خرید ═══
       ترتیب مهم: رندرهای این‌جا قبل از فیلترِ یک‌بارمصرفِ دفتر مشتری
       (rfqsFilterApply در app-customers.js — بعد از این فایل لود می‌شود)
       اجرا می‌شوند تا روی ردیف‌های تازه بیفتد. */
    core.registerShowHook('s-sell-rfqs', sellRfqsRender);
    core.registerShowHook('s-sell-offer', offerFormRender);
    core.registerShowHook('s-buy-rfqs', buyRfqsRender);
    core.registerShowHook('s-buy-offers', offersListRender);
    core.registerShowHook('s-buy-offer-view', offerViewRender);
    /* FD-24: رندر کامل فرم چندقلمی (قلم پیش‌فرض + گیرندگان پوششی) */
    core.registerShowHook('s-buy-rfq-new', rfqNewRender);
    core.registerShowHook('s-buy-list', buyListRender);

    /* ═══════════════════════════════════════════════════════════════
       FD-18 — موتور سفارش: حلقهٔ کامل تا بسته‌شدن
       ─────────────────────────────────────────────────────────────
       بازبینی فرایندها (یافتهٔ اصلی): سفارش وجود داشت (سبد → ثبت →
       پیگیری) ولی حلقه‌اش ناقص بود — ۰۹/۱۰/۲۸ ثابت بودند، فقط دو
       وضعیت new/accepted داشتند، پذیرش فقط toast بود و سفارشِ سبد
       هیچ‌جا ثبت نمی‌شد. این موتور همه را از یک دیتای واحد رندر
       می‌کند و هر گذار وضعیت واقعاً رخ می‌دهد:
       new → accepted → sent → delivered (بسته) | rejected/cancelled
       ═══════════════════════════════════════════════════════════════ */

    var ORDER_ST = {
        new:       { t: 'ثبت‌شده',   b: 'b-primary' },
        accepted:  { t: 'پذیرفته',   b: 'b-green' },
        sent:      { t: 'ارسال‌شده', b: 'b-amber' },
        delivered: { t: 'تحویل‌شده', b: 'b-gray' },
        rejected:  { t: 'رد‌شده',    b: 'b-red' },
        cancelled: { t: 'لغو‌شده',   b: 'b-red' }
    };
    var ORDER_FLOW = ['new', 'accepted', 'sent', 'delivered'];
    var ORDER_FLOW_T = { new: 'ثبت سفارش', accepted: 'پذیرش فروشنده', sent: 'ارسال کالا', delivered: 'تأیید تحویل' };

    function _orderIn(id)  { return (core.data.ordersIn  || []).find(function (o) { return o.id === id; }); }
    function _orderOut(id) { return (core.data.ordersOut || []).find(function (o) { return o.id === id; }); }

    function orderTotal(o) {
        var t = 0;
        (o.items || []).forEach(function (it) { t += (it.qty || 0) * (it.unitPrice || 0); });
        return t;
    }
    function _qtyWord(pack) { return String(pack || '').split(' ')[0] || 'عدد'; }
    function orderTitlePlain(o) {
        var its = o.items || [], f = its[0] || {};
        if (!f.name) return 'سفارش';
        var t = f.name + ' · ' + faNum(f.qty || 0) + ' ' + _qtyWord(f.pack);
        if (its.length > 1) t += ' + ' + faNum(its.length - 1) + ' قلم';
        return t;
    }
    function orderTitleHtml(o) {
        var its = o.items || [], f = its[0] || {};
        if (!f.name) return 'سفارش';
        var t = esc(f.name) + ' · ' + faNum(f.qty || 0) + ' ' + esc(_qtyWord(f.pack));
        if (its.length > 1) t += ' <span class="dot">·</span> ' + faNum(its.length) + ' قلم';
        return t;
    }
    function orderStatusBadge(o) {
        var m = ORDER_ST[o.status] || ORDER_ST.new;
        return '<span class="badge ' + m.b + '">' + m.t + '</span>';
    }

    /* خط زمانی — زبانِ مشترک دو طرف (۱۰ و ۳۹ یک روایت می‌بینند) */
    function orderTimelineHtml(o) {
        var cur = ORDER_FLOW.indexOf(o.status);
        var exc = (o.status === 'rejected' || o.status === 'cancelled');
        var h = '<div class="otl">';
        ORDER_FLOW.forEach(function (st, i) {
            var cls = i < cur ? 'done' : (i === cur && !exc ? 'cur' : '');
            var ev = (o.history || []).find(function (ev2) { return ev2.st === st; });
            h += '<div class="otl-st ' + cls + '">' +
                '<span class="otl-dot"></span>' +
                '<b>' + ORDER_FLOW_T[st] + '</b>' +
                '<small>' + (ev ? esc(ev.t) : '—') + '</small>' +
            '</div>';
        });
        h += '</div>';
        if (exc) {
            var eh = (o.history || []).find(function (ev2) { return ev2.st === o.status; });
            h += '<div class="callout callout-warn" style="margin-top: 10px;"><svg><use href="#i-info"/></svg><div><b>' + ORDER_ST[o.status].t + ':</b> ' + (eh ? esc(eh.t) : '') + ' — این سفارش بسته شده است.</div></div>';
        }
        return h;
    }

    /* اقلام سفارش — read-only یا فرمِ قابل‌اصلاح (وضعیت new) */
    function orderItemsHtml(o, editable) {
        var h = (o.items || []).map(function (it, i) {
            var s = '<div class="ord-it">' +
                '<div class="oi-th"><img src="' + esc(it.img || '') + '" alt=""></div>' +
                '<div class="oi-tx"><b>' + esc(it.name) + '</b><small>' + esc(it.pack || '') + '</small></div>';
            if (editable) {
                s += '<div class="oi-edit">' +
                    '<div class="oi-f"><label>مقدار (' + esc(_qtyWord(it.pack)) + ')</label><input class="input" inputmode="numeric" data-ov-qty="' + i + '" value="' + (it.qty || 0) + '"></div>' +
                    '<div class="oi-f"><label>قیمت هر ' + esc(_qtyWord(it.pack)) + ' (تومان)</label><input class="input" inputmode="numeric" data-ov-price="' + i + '" value="' + (it.unitPrice || 0) + '"></div>' +
                '</div>';
            } else {
                s += '<div class="oi-num"><b>' + faNum(it.qty || 0) + '</b><small>' + esc(_qtyWord(it.pack)) + '</small></div>' +
                    '<div class="oi-price"><b>' + faMoney(it.unitPrice || 0) + '</b><small>تومان</small></div>';
            }
            return s + '</div>';
        }).join('');
        return h + '<div class="ord-total"><span>جمع کل</span><b>' + faMoney(orderTotal(o)) + ' <small>تومان</small></b></div>';
    }

    function orderRowHtml(o, side) {
        var f = (o.items || [])[0] || {};
        var who = side === 'sell'
            ? '<div class="row-sub">' + esc(o.buyer || '') + ' <span class="dot">·</span> ' + esc(o.when || '') + '</div>'
            : '<div class="row-sub">' + esc(o.supplier || '') + ' <span class="dot">·</span> ' + esc(o.when || '') + ' <span class="dot">·</span> ' + faMoney(orderTotal(o)) + ' ت</div>';
        /* FD-18: منوی سه‌نقطه فقط برای سفارش جاریِ خریدار (لغو/گفتگو) */
        var menu = (side === 'buy' && ['new', 'accepted'].indexOf(o.status) >= 0)
            ? '<button class="icon-btn plain" data-order-cancel="' + esc(o.id) + '" aria-label="گزینه‌ها"><svg><use href="#i-dots"/></svg></button>'
            : '<div class="row-chev"><svg><use href="#i-chev"/></svg></div>';
        return '<div class="row" data-ord-go="' + esc(o.id) + '" data-ord-side="' + side + '">' +
            '<div class="thumb thumb-sm"><img src="' + esc(f.img || '') + '" alt=""></div>' +
            '<div class="row-body">' +
                '<div class="row-title">' + orderTitleHtml(o) + ' ' + orderStatusBadge(o) + '</div>' +
                who +
            '</div>' +
            menu +
        '</div>';
    }

    /* ─── ۰۹ — دفتر سفارش‌های فروشنده (پویا + فیلتر مشتری) ─── */
    function ordersSellRender(filterName) {
        var host = $('#sell-orders-host');
        if (!host) return;
        var list = (core.data.ordersIn || []).slice();
        if (filterName) list = list.filter(function (o) { return (o.buyer || '').indexOf(filterName) > -1; });
        var nw   = list.filter(function (o) { return o.status === 'new'; });
        var mid  = list.filter(function (o) { return o.status === 'accepted' || o.status === 'sent'; });
        var arch = list.filter(function (o) { return ['delivered', 'rejected', 'cancelled'].indexOf(o.status) >= 0; });
        var sub = $('#sell-orders-sub');
        if (sub) sub.textContent = filterName
            ? (list.length ? 'فقط ' + filterName : 'سفارشی از «' + filterName + '» پیدا نشد')
            : (nw.length ? faNum(nw.length) + ' سفارش جدید' : 'سفارش جدیدی نیست');
        function sec(title, arr, first) {
            if (!arr.length) return '';
            return '<div class="section-title"' + (first ? ' style="margin-top: 0;"' : ' style="margin-top: 8px;"') + '><h2>' + title + '</h2></div>' +
                '<div class="rows">' + arr.map(function (o) { return orderRowHtml(o, 'sell'); }).join('') + '</div>';
        }
        host.innerHTML = list.length
            ? sec('نیازمند پاسخ', nw, true) + sec('در جریان', mid) + sec('بایگانی', arch)
            : '<div class="empty"><div class="empty-ic"><svg><use href="#i-receipt"/></svg></div>' +
              '<h3>سفارشی پیدا نشد</h3><p>وقتی مشتری‌ها از تو سفارش بدهند، همین‌جا می‌آید.</p></div>';
    }

    /* ─── ۱۰ — جزئیات سفارش فروشنده ─── */
    function orderViewRender() {
        var host = $('#sov-host');
        if (!host) return;
        var params = core.getSCREENParams()['s-sell-order-view'] || {};
        var o = _orderIn(params.id) || (core.data.ordersIn || [])[0];
        if (!o) {
            host.innerHTML = '<div class="empty"><h3>سفارشی نیست</h3></div>';
            return;
        }
        var sub = $('#sov-sub');
        if (sub) sub.textContent = orderTitlePlain(o);
        var first = (o.history || [])[0];
        var m = ORDER_ST[o.status] || ORDER_ST.new;
        var h = '';

        /* هدر وضعیت */
        h += '<div class="ord-head">' +
            '<span class="badge ' + m.b + '">' + m.t + '</span>' +
            '<div class="oh-tx"><b>' + esc(o.buyer || '') + '</b><small>ثبت: ' + esc(first ? first.t : o.when) + '</small></div>' +
            '<div class="oh-sum">' + faMoney(orderTotal(o)) + ' <small>تومان</small></div>' +
        '</div>';

        /* اقلام — فقط در وضعیت new قابل اصلاح (حکم README §۵.۵) */
        h += '<div class="card" style="padding: 12px;">' + orderItemsHtml(o, o.status === 'new') + '</div>';

        /* مشخصات */
        h += '<div class="card" style="padding: 4px 14px;">' +
            '<div class="fact-row"><span class="k">مشتری</span><span class="v">' + esc(o.buyer || '') + '</span></div>' +
            '<div class="fact-row"><span class="k">شمار اقلام</span><span class="v">' + faNum((o.items || []).length) + ' قلم</span></div>' +
            '<div class="fact-row"><span class="k">جمع کل</span><span class="v" style="color: var(--primary-strong);">' + faMoney(orderTotal(o)) + ' تومان</span></div>' +
        '</div>';

        /* یادداشت مشتری */
        if (o.note) {
            h += '<div class="callout callout-info"><svg><use href="#i-msg"/></svg><div><b>توضیحات مشتری:</b><div style="margin-top: 4px;">' + esc(o.note) + '</div></div></div>';
        }

        /* خط زمانی */
        h += '<div class="section-title"><h2>مسیر سفارش</h2></div>' + orderTimelineHtml(o);

        /* یادداشت برای مشتری — فقط هنگام پذیرش */
        if (o.status === 'new') {
            h += '<div class="section-title"><h2>پذیرش سفارش</h2></div>' +
                '<div class="field"><label>یادداشت برای مشتری <span class="opt">— اختیاری</span></label>' +
                '<textarea class="input" id="ov-note" placeholder="مثلاً: ارسال فردا صبح، راننده آقای محمدی"></textarea></div>' +
                '<div class="hint-line"><svg><use href="#i-info"/></svg><span>مقدار و قیمت هر قلم را در صورت توافق متفاوت، همان بالا اصلاح کن.</span></div>';
        }
        if (o.status === 'accepted') {
            h += '<div class="hint-line"><svg><use href="#i-truck"/></svg><span>کالا را که فرستادی، «ارسال شد» را بزن — مشتری بعد از تحویل، سفارش را می‌بندد.</span></div>';
        }
        if (o.status === 'sent') {
            /* تصمیم ۱/۹ (FD-22): مهلت تأیید تحویل = ۷ روز پس از ارسال —
               بعد از آن سفارش خودکار بسته می‌شود (اعلان به دو طرف).
               سفارش بازِ ابدی نداریم؛ خریدار فراموش‌کار هم حل می‌شود. */
            h += '<div class="callout callout-warn"><svg><use href="#i-clock"/></svg><div>در انتظار <b>تأیید تحویلِ مشتری</b> — سفارش با تأیید او بسته می‌شود.</div></div>' +
                '<div class="dl-deadline"><svg><use href="#i-clock"/></svg><span>اگر ۷ روز پس از ارسال تأیید نشود، سفارش خودکار بسته می‌شود.</span></div>';
        }
        host.innerHTML = h;

        /* نوار اکشن بر اساس وضعیت */
        var bar = $('#sov-bar');
        if (bar) {
            bar.hidden = ['delivered', 'rejected', 'cancelled'].indexOf(o.status) >= 0;
            var rej = $('#sov-reject'), acc = $('#sov-accept'), snd = $('#sov-send'), cht = $('#sov-chat');
            if (rej) rej.hidden = o.status !== 'new';
            if (acc) acc.hidden = o.status !== 'new';
            if (snd) snd.hidden = o.status !== 'accepted';
            if (cht) cht.hidden = o.status === 'new';
        }
    }

    /* ─── ۲۸ — دفتر سفارش‌های خریدار ─── */
    function ordersBuyRender() {
        var host = $('#buy-orders-host');
        if (!host) return;
        var list = core.data.ordersOut || [];
        var cur = list.filter(function (o) { return ['new', 'accepted', 'sent'].indexOf(o.status) >= 0; });
        var arch = list.filter(function (o) { return ['delivered', 'rejected', 'cancelled'].indexOf(o.status) >= 0; });
        var sub = $('#buy-orders-sub');
        if (sub) sub.textContent = cur.length ? faNum(cur.length) + ' سفارش جاری' : 'سفارش جاری نداری';
        function sec(title, arr, first) {
            if (!arr.length) return '';
            return '<div class="section-title"' + (first ? ' style="margin-top: 0;"' : ' style="margin-top: 8px;"') + '><h2>' + title + '</h2></div>' +
                '<div class="rows">' + arr.map(function (o) { return orderRowHtml(o, 'buy'); }).join('') + '</div>';
        }
        host.innerHTML = list.length
            ? sec('جاری', cur, true) + sec('بایگانی', arch)
            : '<div class="empty"><div class="empty-ic"><svg><use href="#i-basket"/></svg></div>' +
              '<h3>هنوز سفارشی نداری</h3><p>از کاتالوگ تأمین‌کننده‌هایت سفارش بده — همه‌شان همین‌جا پیگیری می‌شود.</p></div>';
    }

    /* ─── ۳۹ — جزئیات سفارش خریدار (نمای جدید) ─── */
    function buyOrderViewRender() {
        var host = $('#bov-host');
        if (!host) return;
        var params = core.getSCREENParams()['s-buy-order-view'] || {};
        var o = _orderOut(params.id) || (core.data.ordersOut || [])[0];
        if (!o) {
            host.innerHTML = '<div class="empty"><h3>سفارشی نیست</h3></div>';
            return;
        }
        var sub = $('#bov-sub');
        if (sub) sub.textContent = orderTitlePlain(o);
        var first = (o.history || [])[0];
        var m = ORDER_ST[o.status] || ORDER_ST.new;
        var h = '';

        h += '<div class="ord-head">' +
            '<span class="badge ' + m.b + '">' + m.t + '</span>' +
            '<div class="oh-tx"><b>' + esc(o.supplier || '') + '</b><small>ثبت: ' + esc(first ? first.t : o.when) + '</small></div>' +
            '<div class="oh-sum">' + faMoney(orderTotal(o)) + ' <small>تومان</small></div>' +
        '</div>';

        h += '<div class="card" style="padding: 12px;">' + orderItemsHtml(o, false) + '</div>';

        h += '<div class="card" style="padding: 4px 14px;">' +
            '<div class="fact-row"><span class="k">تأمین‌کننده</span><span class="v">' + esc(o.supplier || '') + '</span></div>' +
            '<div class="fact-row"><span class="k">شمار اقلام</span><span class="v">' + faNum((o.items || []).length) + ' قلم</span></div>' +
            '<div class="fact-row"><span class="k">جمع کل</span><span class="v" style="color: var(--arm-strong);">' + faMoney(orderTotal(o)) + ' تومان</span></div>' +
        '</div>';

        if (o.note) {
            h += '<div class="callout callout-info"><svg><use href="#i-msg"/></svg><div><b>یادداشت تو برای فروشنده:</b><div style="margin-top: 4px;">' + esc(o.note) + '</div></div></div>';
        }

        h += '<div class="section-title"><h2>مسیر سفارش</h2></div>' + orderTimelineHtml(o);

        if (o.status === 'new') {
            h += '<div class="hint-line"><svg><use href="#i-clock"/></svg><span>در انتظار پاسخ فروشنده — تا قبل از «ارسال» می‌توانی لغو کنی.</span></div>';
        }
        if (o.status === 'sent') {
            /* تصمیم ۱/۹ (FD-22): مهلت ۷ روزهٔ خودکار — همان یک جمله،
               بدون پیچیدگی (قید «پیرمرد ۷۰ ساله»). */
            h += '<div class="hint-line"><svg><use href="#i-truck"/></svg><span>کالا در راه است — بعد از گرفتن، «تأیید تحویل» را بزن تا سفارش بسته شود.</span></div>' +
                '<div class="dl-deadline"><svg><use href="#i-clock"/></svg><span>۷ روز پس از ارسال اگر تأیید نکنی، سفارش خودکار بسته می‌شود.</span></div>';
        }
        if (o.status === 'delivered') {
            h += '<div class="callout callout-success"><svg><use href="#i-check"/></svg><div>این سفارش تحویل شد و بسته است — با «سفارش دوباره» همان اقلام را می‌توانی سفارش بدهی.</div></div>';
        }
        host.innerHTML = h;

        var bar = $('#bov-bar');
        if (bar) {
            bar.hidden = ['rejected', 'cancelled'].indexOf(o.status) >= 0;
            var cnl = $('#bov-cancel'), dlv = $('#bov-deliver'), cht = $('#bov-chat'), ror = $('#bov-reorder');
            if (cnl) cnl.hidden = ['new', 'accepted'].indexOf(o.status) < 0;
            if (dlv) dlv.hidden = o.status !== 'sent';
            if (ror) ror.hidden = o.status !== 'delivered';
            if (cht) cht.hidden = o.status === 'delivered';
        }
    }

    /* ─── اعلان‌ها — پویا (FD-18) ─── */
    function notifsRender() {
        var host = $('#notifs-host');
        if (!host) return;
        var ns = core.data.notifications || [];
        var sub = $('#notifs-sub');
        if (sub) {
            var fresh = ns.filter(function (n) { return n.isNew; }).length;
            sub.textContent = fresh ? faNum(fresh) + ' اعلان تازه' : 'همه را دیدی';
        }
        var IC = {
            order:   ['i-receipt',  'var(--primary-soft)', 'var(--primary-strong)'],
            offer:   ['i-msg',      'var(--green-soft)',   'var(--green)'],
            suggest: ['i-sparkles', 'var(--amber-soft)',   'var(--amber)'],
            supply:  ['i-user-plus','var(--stone-tint)',   'var(--stone-soft)']
        };
        host.innerHTML = ns.length ? ns.map(function (n) {
            var ic = IC[n.type] || IC.order;
            return '<div class="row"' + (n.link ? ' data-go="' + esc(n.link) + '"' : '') + '>' +
                '<div class="thumb thumb-sm" style="background: ' + ic[1] + '; color: ' + ic[2] + '; display: grid; place-items: center;"><svg style="width: 20px; height: 20px;"><use href="#' + ic[0] + '"/></svg></div>' +
                '<div class="row-body">' +
                    '<div class="row-title">' + esc(n.title) + (n.isNew ? ' <span class="badge b-primary">جدید</span>' : '') + '</div>' +
                    '<div class="row-sub">' + esc(n.body || '') + '</div>' +
                '</div>' +
            '</div>';
        }).join('') : '<div class="empty"><h3>اعلانی نیست</h3><p>رویدادهای مهم همین‌جا خبرت می‌کنند.</p></div>';
    }

    function pushNotify(n) {
        core.data.notifications = core.data.notifications || [];
        core.data.notifications.unshift({
            id: 'n' + Date.now(),
            type: n.type || 'order',
            title: n.title || 'اعلان',
            body: n.body || '',
            time: 'هم‌اکنون',
            isNew: true,
            link: n.link || ''
        });
        notifsRender();
    }

    /* ─── گذار وضعیت — قلب حلقه ─── */
    function orderSetStatus(o, st, notif) {
        if (!o) return;
        o.status = st;
        o.history = o.history || [];
        o.history.push({ st: st, t: 'هم‌اکنون' });
        if (notif) pushNotify(notif);
        ordersSellRender();
        ordersBuyRender();
        deskOrdersSync();
    }

    /* ─── اکشن‌های فروشنده (۱۰) ─── */
    function orderAccept() {
        var params = core.getSCREENParams()['s-sell-order-view'] || {};
        var o = _orderIn(params.id) || (core.data.ordersIn || [])[0];
        if (!o) return;
        (o.items || []).forEach(function (it, i) {
            var q = document.querySelector('[data-ov-qty="' + i + '"]');
            var p = document.querySelector('[data-ov-price="' + i + '"]');
            if (q) { var vq = parseNum(q.value); if (vq) it.qty = vq; }
            if (p) { var vp = parseNum(p.value); if (vp) it.unitPrice = vp; }
        });
        var nt = $('#ov-note');
        var note = nt ? nt.value.trim() : '';
        orderSetStatus(o, 'accepted', {
            title: 'سفارش پذیرفته شد',
            body: 'فروشنده سفارش «' + orderTitlePlain(o) + '» را پذیرفت.' + (note ? ' یادداشت فروشنده: ' + note : ''),
            link: 's-buy-order-view'
        });
        toast('سفارش پذیرفته شد — مشتری خبردار شد', 'success');
        orderViewRender();
    }

    function orderReject() {
        var params = core.getSCREENParams()['s-sell-order-view'] || {};
        var o = _orderIn(params.id) || (core.data.ordersIn || [])[0];
        if (!o) return;
        core.confirm({
            title: 'رد سفارش',
            text: 'مطمئنی نمی‌خواهی این سفارش را بپذیری؟ به مشتری اطلاع داده می‌شود.',
            ok: 'رد سفارش', cancel: 'انصراف', danger: true
        }).then(function (ok) {
            if (!ok) return;
            orderSetStatus(o, 'rejected', {
                title: 'سفارش رد شد',
                body: 'فروشنده سفارش «' + orderTitlePlain(o) + '» را رد کرد.',
                link: 's-buy-order-view'
            });
            toast('سفارش رد شد', 'error');
            orderViewRender();
        });
    }

    function orderMarkSent() {
        var params = core.getSCREENParams()['s-sell-order-view'] || {};
        var o = _orderIn(params.id) || (core.data.ordersIn || [])[0];
        if (!o) return;
        core.confirm({
            title: 'ارسال کالا',
            text: 'کالا را برای مشتری فرستادی؟ وضعیت «ارسال‌شده» می‌شود و مشتری بعد از تحویل، سفارش را می‌بندد.',
            ok: 'بله، ارسال شد', cancel: 'انصراف'
        }).then(function (ok) {
            if (!ok) return;
            orderSetStatus(o, 'sent', {
                title: 'سفارش ارسال شد',
                body: 'سفارش «' + orderTitlePlain(o) + '» از طرف فروشنده ارسال شد — بعد از تحویل، تأیید کن.',
                link: 's-buy-order-view'
            });
            toast('وضعیت: ارسال‌شده — در انتظار تأیید تحویل مشتری', 'success');
            orderViewRender();
        });
    }

    /* ─── اکشن‌های خریدار (۳۹) ─── */
    function orderConfirmDelivery() {
        var params = core.getSCREENParams()['s-buy-order-view'] || {};
        var o = _orderOut(params.id) || (core.data.ordersOut || [])[0];
        if (!o) return;
        core.confirm({
            title: 'تأیید تحویل',
            text: 'کالا را گرفتی؟ سفارش بسته می‌شود و به بایگانی می‌رود.',
            ok: 'بله، تحویل گرفتم', cancel: 'انصراف'
        }).then(function (ok) {
            if (!ok) return;
            orderSetStatus(o, 'delivered', {
                title: 'سفارش تحویل شد',
                body: 'سفارش «' + orderTitlePlain(o) + '» بسته شد و به بایگانی رفت.',
                link: 's-buy-orders'
            });
            /* حلقهٔ امتیاز: اولین سفارشِ بستهٔ موفق = امتیاز فروش و خرید */
            _scoreOrderEvent();
            toast('سفارش بسته شد — با تشکر از خریدت', 'success');
            buyOrderViewRender();
        });
    }

    function orderCancel(id) {
        var params = core.getSCREENParams()['s-buy-order-view'] || {};
        var o = _orderOut(id || params.id) || (core.data.ordersOut || [])[0];
        if (!o) return;
        core.confirm({
            title: 'لغو سفارش',
            text: 'سفارش «' + orderTitlePlain(o) + '» لغو می‌شود و تأمین‌کننده خبردار می‌شود.',
            ok: 'لغو سفارش', cancel: 'انصراف', danger: true
        }).then(function (ok) {
            if (!ok) return;
            orderSetStatus(o, 'cancelled', {
                title: 'سفارش لغو شد',
                body: 'خریدار سفارش «' + orderTitlePlain(o) + '» را لغو کرد.',
                link: 's-sell-orders'
            });
            toast('سفارش لغو شد', 'error');
            buyOrderViewRender();
        });
    }

    function orderReorder() {
        core.resetStack();
        core.show('s-catalog-guest', false);
        toast('به کاتالوگ تأمین‌کننده برگشتی — اقلام همان سفارش را دوباره سبد کن', 'info');
    }

    /* ─── شمارنده‌های زندهٔ میزها (۰۴/۱۹) ─── */
    function deskOrdersSync() {
        var nw = (core.data.ordersIn || []).filter(function (o) { return o.status === 'new'; });
        var r = $('#sell-desk-orders-row');
        if (r) {
            r.hidden = nw.length === 0;
            var t = $('#sell-desk-orders-t');
            if (t) t.textContent = faNum(nw.length) + ' سفارش جدید';
            var s = $('#sell-desk-orders-s');
            /* FD-30 (باگ قدیمی FD-18، بازبینی چشمی VLM): esc() همهٔ رشتهٔ
               متصل‌شده را escape می‌کرد — جداکنندهٔ «·» هم به‌شکل متنِ خام
               «<span …>» دیده می‌شد. درست: فقط نام خریدارها escape شود،
               نشانهٔ جداکننده HTML بماند. */
            if (s) s.innerHTML = nw.length
                ? nw.map(function (o) { return esc(o.buyer); }).slice(0, 2).join(' <span class="dot">·</span> ')
                : '';
        }
        var cur = (core.data.ordersOut || []).filter(function (o) { return ['new', 'accepted', 'sent'].indexOf(o.status) >= 0; });
        var br = $('#buy-desk-orders-row');
        if (br) {
            br.hidden = cur.length === 0;
            var bt = $('#buy-desk-orders-t');
            if (bt) bt.textContent = faNum(cur.length) + ' سفارش جاری';
            var bs = $('#buy-desk-orders-s');
            if (bs) bs.textContent = cur.length ? orderTitlePlain(cur[0]) + ' — ' + (cur[0].supplier || '') : '';
        }
    }

    /* اولین سفارشِ بسته = امتیاز (sc7 فروش / sb7 خرید) */
    function _scoreOrderEvent() {
        var closed = (core.data.ordersOut || []).some(function (o) { return o.status === 'delivered'; }) ||
                     (core.data.ordersIn  || []).some(function (o) { return o.status === 'delivered'; });
        if (!closed) return;
        (core.data.scoreItemsSell || []).forEach(function (it) { if (it.id === 'sc7') it.done = true; });
        (core.data.scoreItemsBuy  || []).forEach(function (it) { if (it.id === 'sb7') it.done = true; });
    }

    core.registerShowHook('s-sell-orders', function () { ordersSellRender(); });
    core.registerShowHook('s-sell-order-view', orderViewRender);
    core.registerShowHook('s-buy-orders', ordersBuyRender);
    core.registerShowHook('s-buy-order-view', buyOrderViewRender);
    core.registerShowHook('s-notifs', notifsRender);
    core.registerShowHook('s-home-sell', deskOrdersSync);
    core.registerShowHook('s-home-buy', deskOrdersSync);

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

        /* FD-18 — موتور سفارش */
        ordersSellRender: ordersSellRender,
        orderViewRender: orderViewRender,
        ordersBuyRender: ordersBuyRender,
        buyOrderViewRender: buyOrderViewRender,
        notifsRender: notifsRender,
        pushNotify: pushNotify,
        orderAccept: orderAccept,
        orderReject: orderReject,
        orderMarkSent: orderMarkSent,
        orderConfirmDelivery: orderConfirmDelivery,
        orderCancel: orderCancel,
        orderReorder: orderReorder,
        deskOrdersSync: deskOrdersSync,
        guestSaveFlow: guestSaveFlow,
        guestAccountOpen: guestAccountOpen,
        guestAccountSubmit: guestAccountSubmit,
        guestEnterAsCustomer: guestEnterAsCustomer,
        guestBeneToggle: guestBeneToggle,
        passOpen: passOpen,
        passSubmit: passSubmit,
        forgotReset: forgotReset,
        forgotSend: forgotSend,
        pvCta: pvCta,
        chargeSync: chargeSync,
        chargeSend: chargeSend,
        promoSwitchToggle: promoSwitchToggle,
        catSheetsSync: catSheetsSync,
        catEditLoad: catEditLoad,
        catePricesToggle: catePricesToggle,
        gdEditRender: gdEditRender,

        /* ═══ FD-14 ═══ */
        offerChkToggle: offerChkToggle,
        offerShipToggle: offerShipToggle,
        offerShipPick: offerShipPick,
        offerPctSync: offerPctSync,
        offerDaysSync: offerDaysSync,
        offerPriceHint: offerPriceHint,
        offerSend: offerSend,
        offerAccept: offerAccept,
        rfqCloseConfirm: rfqCloseConfirm,
        rfqRecipSync: rfqRecipSync,
        rfqSendNew: rfqSendNew,
        /* ═══ FD-24 — استعلام چندقلمی ═══ */
        rfqNewRender: rfqNewRender,
        rfqRender: rfqRender,
        rfqQtyStep: rfqQtyStep,
        rfqItemRemove: rfqItemRemove,
        rfqPickOpen: rfqPickOpen,
        rfqPickAdd: rfqPickAdd,
        offerTotal: offerTotal,
        offerCover: offerCover,
        buyListRender: buyListRender,
        picklistOpen: picklistOpen,
        picklistToggle: picklistToggle,
        picklistGroup: picklistGroup,
        picklistSearch: picklistSearch,
        picklistQty: picklistQty,
        picklistPer: picklistPer,
        picklistAdd: picklistAdd,
        /* FD-25 — دکمه‌های نمای موفقیت شیت ۳۱ */
        picklistGoList: picklistGoList,
        picklistContinue: picklistContinue,

        /* ═══ FD-22 — کپی از کاتالوگ + تصمیم‌های ۹گانه ═══ */
        ccOpen: ccOpen,
        ccFind: ccFind,
        ccCopy: ccCopy,
        scanNewProd: scanNewProd,
        offerOrderCreate: offerOrderCreate,
        chatCtxSync: chatCtxSync,

        /* ═══ FD-15 ═══ */
        scanOpen: scanOpen,
        scanGo: scanGo,
        scanDemo: scanDemo,
        scanContinue: scanContinue,
        txOpen: txOpen,
        txDemo: txDemo,
        txParse: txParse,
        txToggle: txToggle,
        txBack: txBack,
        txConfirm: txConfirm,
        catGridRender: catGridRender,
    };

    /* ═══════════════════════════════════════════════════════════════
   کاتالوگ — ویژه شدن و تبلیغات
   ═══════════════════════════════════════════════════════════════ */
    function catPromoSync() {
        var sell = scoreCalc(core.data.scoreItemsSell);
        var wallet = core.data.user.wallet || 0;
        var on = !!core.data.user.catalogPromo;

        /* دکمهٔ فشردهٔ ویژه‌کردن در نوار دکمه‌ها — FD-35 (حکم مالک):
           «ویژه کردن» رفت کنار بقیهٔ دکمه‌ها؛ کادر تبلیغات حذف شد.
           متنِ کوتاه برای دکمه + شرحِ کامل (قفل امتیاز/فعال) به‌عنوان
           title — هاورِ دسکتاپ و دسترس‌پذیری، بدون شلوغی بصری. */
        var box = $('#promo-box');
        var t = $('#promo-t');
        var ic = $('#promo-ic');
        if (box) {
            box.classList.toggle('on', on);
            box.title = sell < 100
                ? 'ابتدا به ۱۰۰ امتیاز فعالیت فروش برس'
                : (on
                    ? 'محصولات ویژه فعال است — در شرایط مشابه بالاتر دیده می‌شوند'
                    : 'در شرایط مشابه، بالاتر دیده می‌شوند');
        }
        if (t) t.textContent = on ? 'ویژه فعال است' : 'ویژه کردن';
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
        /* FD-15: توضیحات از دیتا پر می‌شود (قبلاً خالی می‌ماند و با
           ذخیره، یادداشت فروشنده بی‌صدا دور ریخته می‌شد) */
        var noteEl = $('#edit-note');
        if (noteEl) noteEl.value = L.note || '';

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

    /* ─── FD-15: گرید پویای کاتالوگ — از listings واقعی ───
       قبلاً ۴ کارت استاتیک بود؛ حالا افزودن (۱۳/اسکنر/متن) و حذف
       (ویرایش) واقعاً دیده می‌شوند — حلقهٔ کاملِ «آمادهٔ پیاده‌سازی».
       نشان «تازه افزوده» یک‌بارمصرف است: در اولین رندری که دیده
       می‌شود می‌نشیند و با رندر بعدی برمی‌رود. */
    function catCardHtml(l) {
        var img = l.img
            ? '<img src="' + esc(l.img) + '" alt="' + esc(l.name) + '">'
            : '<div class="cat-noimg"><svg><use href="#i-image"/></svg></div>';
        var badges = '';
        if (!l.stock) badges += '<span class="badge b-red">ناموجود</span>';
        else if (l.stock <= 10) badges += '<span class="badge b-amber">موجودی کم</span>';
        else badges += '<span class="badge b-green">موجود</span>';
        if (l.justAdded) badges = '<span class="badge b-stone">تازه افزوده</span> ' + badges;
        return '<div class="pcard' + (l.priceStale ? ' stale' : '') + '" data-go="s-sell-edit" data-gid="' + esc(l.groupId || '') + '" data-lid="' + esc(l.id) + '">' +
            '<div class="ph">' + img +
                /* FD-35: بج ویژه از روی وضعیتِ واقعی می‌نشیند —
                   catGridRender بعد از catPromoSync اجرا می‌شود و قبلاً
                   همیشه hidden می‌کاشت (باگ کهنه: بعد از هر show، بجِ
                   ویژه غیب می‌شد تا سوییچ دوباره لمس شود). */
                '<span class="promo-badge"' + (core.data.user.catalogPromo ? '' : ' hidden') + '><svg><use href="#i-sparkles"/></svg> ویژه</span>' +
                '<span class="stale-badge"' + (l.priceStale ? '' : ' hidden') + '><svg><use href="#i-clock"/></svg> قیمت منقضی</span>' +
            '</div>' +
            '<div class="info">' +
                '<div class="pname">' + esc(l.name) + '</div>' +
                '<div class="ppack">' + esc(l.pack || '') + '</div>' +
                '<div class="pprice">' + faMoney(l.price) + ' <small>تومان</small></div>' +
                '<div class="pmeta">' + badges + '</div>' +
            '</div>' +
        '</div>';
    }

    function catGridRender() {
        var host = $('#cat-grid');
        if (!host) return;
        var bizId = core.data.user.activeBusinessId;
        var items = core.data.listings.filter(function (l) { return l.businessId === bizId; });
        var cnt = $('#cat-count');
        if (cnt) cnt.textContent = faNum(items.length) + ' محصول';
        host.innerHTML = items.length ? items.map(catCardHtml).join('')
            : '<div class="empty" style="grid-column: 1 / -1;"><div class="empty-ic"><svg><use href="#i-store"/></svg></div>' +
              '<h3>کاتالوگت خالی است</h3><p>با «محصول جدید» اولین محصول را اضافه کن.</p></div>';
        /* نشان «تازه» فقط در همین رندر زنده بماند */
        items.forEach(function (l) { if (l.justAdded) l.justAdded = false; });
        catFilterApply();
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