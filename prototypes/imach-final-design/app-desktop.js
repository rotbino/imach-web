/* ═════════════════════════════════════════════════════════════════
   iMach — Desktop (FD-28 → FD-30)
   ─────────────────────────────────────────────────────────────────
   رسپانسیو دسکتاپ — مرحلهٔ ۳ (FD-30: ارتقای کیفیِ میزها و فرم‌ها به
   سطح اپ حرفه‌ای B2B — الگوهای نام‌دار: Kanban-light · Form+Preview ·
   Wizard · Master-Detail؛ حکم مالک: «فرانت‌اند چیزی بشه که باید باشه»).

   ▸ حکم مالک (FD-28): «در دسکتاب حرفه‌ای‌تر و مطابق استاندارد بالا —
     همچنان مینیمال و ساده؛ صفحه‌به‌صفحه با ظرافت، نه یک ایجنت کلی».
     بازخورد FD-27 که مرحلهٔ قبل ترمیم کرد: لندینگ زیرِ بنر،
     ورود/ثبت‌نام، و تسک‌های میز خرید (زیر هم + استایل مخصوص).
     بازخورد FD-30 که این مرحله ترمیم می‌کند: میزها «قشنگ‌تر و
     پررنگ‌تر/بزرگ‌تر»، فرم‌ها با ستون پیش‌نمایش/ویزارد، فهرست‌ها
     با الگوهای Master-Detail و گرید.

   ▸ معماری: همان دو-لایهٔ FD-27 —
       · این ماژول: پرچم #phone[data-dk] + بازچینیِ DOM لازم.
       · style.css بلوک FD-28 زیر @media(min-width:1024).
     موبایل (زیر ۱۰۲۴) کاملاً دست‌نخورده: show() هر بار HTML خام
     را می‌ریزد؛ هیچ تبدیلی در عرض موبایل اجرا نمی‌شود.

   ▸ الگوهای چیدمان (کلاس روی <section>):
       dk-page   صفحهٔ محتوایی عمومی (هدر ۶۴ + ستون ۱۱۲۰ وسچ)
       dk-list   ردیف‌های پهنِ لیست (دفاتر/سفارش‌ها/استعلام‌ها)
       dk-form   فرم مرکزی ۶۲۰ (با نوار ارسالِ جابه‌جاشده به جریان)
       dk-detail دوستونه: کارت شناسهٔ چسبانِ راست + جریانِ چپ
       dk-narrow ستون باریک ۷۶۰ (اعلان‌ها/امتیاز)
       + تبدیل‌های اختصاصی: لندینگ · ورود/ثبت‌نام · میزها ·
         کاتالوگ · کالا · استعلامِ جدید (دوستونه) · پیشنهادها
         (گرید ۲) · چت (ستون ۹۰۰) · پروفایل.
   ═════════════════════════════════════════════════════════════════ */
window.iMachDesktop = (function () {
    'use strict';

    var MQ = window.matchMedia('(min-width: 1024px)');

    /* ═══ نقشهٔ صفحه ← تبدیل ═══
       تابع = تبدیل اختصاصی؛ رشته = کلاس‌های چیدمان عمومی. */
    var DK = {
        /* —— اختصاصی‌ها —— */
        's-landing': dkLanding,
        's-login': dkAuth,
        's-signup': dkAuth,
        's-home-buy': dkDesk,
        's-home-sell': dkDesk,
        's-catalog': dkCatalog,
        's-catalog-guest': dkCatalog,
        's-product-view': dkProduct,
        's-buy-rfq-new': dkRfqNew,
        's-buy-offers': dkOffers,
        's-chat': dkChat,
        's-profile': dkProfile,
        's-msgs': dkMsgs,
        's-buy-list': dkBuyList,
        /* FD-30 (الگوی Form+Preview — Vercel Settings/Stripe Webhook):
           فرم راست + پیش‌نمایشِ چسبان چپ */
        's-cat-edit': dkCatEdit,
        /* FD-37 — سند فروش: قالب فاکتور/برگهٔ ارسال = مودال
           (قاب تیرهٔ ثابت + کاغذ A4 وسچ — CSS dk-doc) */
        's-doc-invoice': dkDoc,
        's-doc-slip': dkDoc,
        /* —— دفاتر و لیست‌ها —— */
        's-catalog-share': 'dk-page dk-list',
        's-contacts': 'dk-page dk-list',
        's-customers': 'dk-page dk-list',
        's-customer-view': dkDetail,
        's-sell-orders': 'dk-page dk-list',
        /* سفارش‌ها با JS رندر می‌شوند (host خالی هنگام apply) — ستونِ
           رسیدِ وسچ ۷۶۰، الگوی درستِ صفحهٔ رسید است نه دوستونه */
        's-sell-order-view': 'dk-page dk-narrow',
        's-buy-order-view': 'dk-page dk-narrow',
        's-buy-orders': 'dk-page dk-list',
        's-sell-rfqs': 'dk-page dk-list',
        's-sell-offer': dkOffer,
        's-sell-add': dkAdd,
        's-sell-edit': 'dk-form',
        's-network-score': 'dk-page dk-narrow',
        's-edit-business': 'dk-form',
        's-notifs': 'dk-page dk-narrow',
        's-buy-list-add': 'dk-form',
        's-buy-product-suppliers': 'dk-page dk-list',
        's-buy-suppliers': 'dk-page dk-list',
        's-supplier-view': dkDetail,
        's-buy-rfqs': 'dk-page dk-list',
        's-buy-offer-view': dkDetail,
        's-buy-list-guest': 'dk-page dk-list',
        's-sell-bulk': 'dk-form',
        's-sell-promo': 'dk-form',
        's-charge': 'dk-form',
        's-salesrep': 'dk-page dk-narrow dk-rep'
    };

    function apply(id) {
        var phone = document.getElementById('phone');
        if (!phone) return;
        var cfg = DK[id];
        var on = !!(cfg && MQ.matches);
        if (on) phone.setAttribute('data-dk', '1');
        else phone.removeAttribute('data-dk');
        if (!on) return;
        /* FD-29: اسکرول روی خود مرورگر است — با هر show به بالِ صفحه */
        window.scrollTo(0, 0);
        var sec = document.getElementById(id);
        if (!sec) return;
        sec.classList.add('dk-screen');
        if (typeof cfg === 'string') {
            cfg.split(' ').forEach(function (c) { if (c) sec.classList.add(c); });
        } else {
            cfg(sec, id);
        }
        /* نوار ارسال چسبان → انتهای جریان صفحه (الگوی دسکتاپ:
           دکمه با محتوایش می‌ماند، نه چسبیده به کفِ ۱۰۰vw) */
        if (sec.querySelector('.sticky-bar')) moveSubmit(sec);
    }

    /* ═══ مشترک: نوار چسبان → درون جریان ═══ */
    function moveSubmit(sec) {
        var sb = sec.querySelector('.sticky-bar');
        var body = sec.querySelector('.body');
        /* FD-40 — نوارِ مخفی هم جابه‌جا می‌شود: صفحات پویا (جزئیات
           سفارش فروش/خرید) نوارشان را در show-hook — یعنی بعد از
           apply() — نمایان می‌کنند؛ نوارِ جابه‌جانشده با عرض کامل
           پنجره (۱۰۰vw) به کف صفحه می‌چسبید و از کاغذ جدا می‌افتاد.
           جابه‌جاییِ نوارِ مخفی بی‌ضرر است: مخفی می‌ماند و در لحظهٔ
           نمایان‌شدن، درست درون جریان کاغذ است. */
        if (!sb || !body) return;
        if (sb.parentNode !== body) body.appendChild(sb);
        sb.classList.add('dk-inflow');
    }

    /* ═══ ۰۱ لندینگ ═══
       FD-31 (حکم مالک — فلت اما زیبا): CTA تزریقیِ اپ‌بار حذف شد
       («شروع رایگان» از هدر برداشته شد) · عکس هدر فلت شد (بدون
       کارت — img.hero-shot مستقیم در هیرو) · خط‌های رنگی سرِ کارت‌ها
       و گرادیان/کارت‌های تودرتوی نوار نماینده در CSS حذف شدند.
       هیرو دوستونه · دو کارت ویژگی فروشنده/خریدار کنار‌هم · نوار
       نماینده تمام‌عرض · بخش نظرات (فلت، بدون کارت بیرونی) · CTA
       پایانی پهن · فوتر. */
    function dkLanding(sec) {
        var body = sec.querySelector('.body');
        if (!body) return;

        var hero = body.querySelector('.hero');
        /* FD-32: نوار زبان اولین فرزند body شد — پد دیگر children[1]
           نیست؛ با کلاس صریحش پیدا می‌شود. */
        var pad = body.querySelector('.lp-content') || body.children[1];
        if (!hero || !pad) return;

        /* ۱) تصویر فلت → خانهٔ چپِ هیرو (FD-31: بدون کارت دور عکس) */
        if (!hero.querySelector('.dk-hero-img')) {
            var img = pad.querySelector('img.hero-shot');
            if (img) {
                hero.appendChild(img);
                img.classList.add('dk-hero-img');
            }
        }

        /* ۲) بدنه: چیدمان گرید دسکتاپ */
        pad.removeAttribute('style');
        pad.classList.add('dk-pad');

        /* ۳) گروه‌بندی بخش‌ها — عنوان + محتوایش تا عنوان بعدی.
           FD-31: فقط سه عنوان نخست sell/buy/rep می‌گیرند؛ عنوان‌های
           بعدی (نظرات کاربران) → dk-sec ساده (استایل‌اش با :has(.rv-strip)
           در CSS — بخش فلت بدون کاغذ بیرونی، ضدِ کارت تودرتو). */
        if (!pad.getAttribute('data-dk-done')) {
            pad.setAttribute('data-dk-done', '1');
            var kids = Array.prototype.slice.call(pad.children);
            var cur = null, secIdx = 0;
            var SEC_KINDS = [' dk-sec-sell', ' dk-sec-buy', ' dk-sec-rep'];
            kids.forEach(function (el) {
                var isTitle = el.classList && el.classList.contains('section-title');
                var isFinalCta = el.classList && el.classList.contains('card') && !el.classList.contains('rep-ad');
                if (isTitle) {
                    cur = document.createElement('div');
                    cur.className = 'dk-sec' + (SEC_KINDS[secIdx] || '');
                    secIdx++;
                    pad.insertBefore(cur, el);
                } else if (isFinalCta) {
                    cur = null;
                    el.classList.add('dk-final');
                }
                if (cur && cur !== el) cur.appendChild(el);
            });

            /* ۴) بخش نماینده: کارت rep-ad → سربرگِ بخش (h3 + متن) */
            var rep = pad.querySelector('.dk-sec-rep');
            if (rep) {
                var ad = rep.querySelector('.rep-ad');
                if (ad) {
                    var lead = document.createElement('div');
                    lead.className = 'dk-lead';
                    var h3 = ad.querySelector('h3'), p = ad.querySelector('.ra-tx') || ad.querySelector('p');
                    if (h3) lead.appendChild(h3);
                    if (p) lead.appendChild(p);
                    ad.parentNode.replaceChild(lead, ad);
                }
                /* «یک صنف، چند درآمد» + دکمه → پانوشتِ وسچِ بخش
                   (گروه‌بندی بالا خودشان را داخل rep آورده) */
                var tagEl = null, btnEl = null;
                Array.prototype.slice.call(rep.children).forEach(function (el) {
                    if (el.tagName === 'DIV' && !el.classList.contains('rep-ad') &&
                        !el.classList.contains('rows') && !el.classList.contains('dk-lead') &&
                        el.textContent.indexOf('یک صنف') > -1 && !el.querySelector('button')) tagEl = el;
                    if (el.classList.contains('ra-btn')) btnEl = el;
                });
                if (tagEl) tagEl.classList.add('dk-rep-tag');
                if (btnEl) rep.appendChild(btnEl);

                /* فوتر © */
                var foot = null;
                Array.prototype.slice.call(pad.children).forEach(function (el) {
                    if (el !== rep && !el.classList.contains('dk-sec') && !el.classList.contains('dk-final') &&
                        el.textContent.indexOf('©') > -1) foot = el;
                });
                if (foot) foot.classList.add('dk-foot');
            }
        }
    }

    /* ═══ ۰۳ ورود / ۰۲ ثبت‌نام ═══
       اسپلیت حرفه‌ای: ستون فرمِ راست (کارت سفید ۴۶۰ وسچ) +
       پانل برندِ چپِ تمام‌قد (گرادیان نارنجی + سه ویژگی + واترمارک). */
    function dkAuth(sec, id) {
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');
        body.classList.add('dk-auth');

        /* ۱) فرم: فرزندان body → کارت فرم + سربرگ فرم */
        var card = document.createElement('div');
        card.className = 'dkf-card';
        while (body.firstChild) card.appendChild(body.firstChild);

        var head = document.createElement('div');
        head.className = 'dkf-h';
        head.innerHTML = (id === 's-signup')
            ? '<div class="dkf-t">ساخت حساب</div><div class="dkf-s">کمتر از ۲ دقیقه — با شمارهٔ موبایل</div>'
            : '<div class="dkf-t">ورود به آی‌مچ</div><div class="dkf-s">یک قدم تا دفتر کارت</div>';
        card.insertBefore(head, card.firstChild);

        var form = document.createElement('div');
        form.className = 'dk-auth-form';
        form.appendChild(card);

        /* ۲) پانل برند — سمت چپ (DOM بعد از فرم) */
        var brand = document.createElement('div');
        brand.className = 'dk-brand';
        var bullets = (id === 's-signup')
            ? [
                /* FD-32 (حکم مالک — باکس نارنجی): سه متن جدید */
                'امکانات آیمچ همیشه رایگان خواهد بود',
                'هم میز خرید عمده داری و هم میز فروش عمده',
                'روشن کردن هر دو میز از طریق پروفایل در دسترس است'
            ]
            : [
                'کاتالوگ قیمت زنده بساز و لینکش را برای مشتری‌هایت بفرست',
                'لیست خریدت را بچین و از چند تأمین‌کننده قیمت بگیر',
                'رایگان — با امکان پیدا کردن طرف‌های تجاری جدید'
            ];
        brand.innerHTML =
            '<button class="dkb-back" type="button" data-go="s-landing">' +
            '<svg><use href="#i-back"/></svg><span>صفحهٔ اصلی</span></button>' +
            '<div class="dkb-mark"><svg><use href="#i-logo"/></svg></div>' +
            '<div class="dkb-name">آی‌مچ</div>' +
            '<div class="dkb-tag">شعبهٔ آنلاین خرید و فروش عمدهٔ شما</div>' +
            '<div class="dkb-list">' +
            bullets.map(function (b) {
                return '<div class="dkb-li"><span class="dkb-ck"><svg><use href="#i-check"/></svg></span><span>' + b + '</span></div>';
            }).join('') +
            '</div>' +
            '<div class="dkb-wm" aria-hidden="true"><svg><use href="#i-logo"/></svg></div>';

        /* ۳) دکمهٔ ارسال: از نوار چسبان → انتهای کارت فرم */
        var sb = sec.querySelector('.sticky-bar');
        if (sb) {
            var btn = sb.querySelector('.btn');
            if (btn) card.appendChild(btn);
            sb.setAttribute('hidden', '');
        }

        /* DOM: [فرم (راست) · برند (چپ)] */
        body.appendChild(form);
        body.appendChild(brand);
    }

    /* ═══ پوستهٔ اپ FD-29 — سایدبار پایدار + ستون اصلی ═══
       (حکم مالک: پروفایل و چت صفحهٔ اصلی‌اند و نباید از سایدبار
       بیرون بیفتند — لینکشان در تب‌بار است؛ پیام‌ها هم همین‌طور.)
       میز خرید · میز فروش · پیام‌ها · چت · پروفایل — یک پوسته.

       · سایدبار: تب‌بار خودِ صفحه (میزها) یا تزریقی (بقیه) →
         .dk-side چسبانِ تمام‌قدِ راست + واژه‌نشان + چیپ کاربر.
       · ستون اصلی: هر چه بعد از سایدبار است → .dk-desk-main
         (اپ‌بار/ساب‌هدر چسبان + بدنه با اسکرول مرورگر).
       · تب فعال بر اساس صفحهٔ جاری؛ چت زیر مجموعهٔ پیام‌ها. */
    var SIDE_TABS =
        '<button class="tab" type="button" data-tab-arm="sell" data-tab-home="s-home-sell">' +
        '<svg><use href="#i-store"/></svg> میز فروش</button>' +
        '<button class="tab" type="button" data-tab-arm="buy" data-tab-home="s-home-buy">' +
        '<svg><use href="#i-basket"/></svg> میز خرید</button>' +
        '<button class="tab" type="button" data-tab-home="s-msgs">' +
        '<svg><use href="#i-msg"/></svg> پیام‌ها</button>' +
        '<button class="tab" type="button" data-tab-home="s-profile">' +
        '<svg><use href="#i-user"/></svg> پروفایل</button>';

    var SIDE_ACTIVE = {
        's-home-sell': 's-home-sell',
        's-home-buy': 's-home-buy',
        's-msgs': 's-msgs',
        's-chat': 's-msgs',      /* چت زیر مجموعهٔ پیام‌هاست */
        's-profile': 's-profile'
    };

    function shellify(sec, id) {
        sec.classList.add('dk-desk');

        /* ۱) سایدبار: تب‌بار خودِ صفحه، یا یکی تزریقی */
        var side = sec.querySelector('.tabbar');
        if (side) {
            side.classList.add('dk-side');
            sec.insertBefore(side, sec.firstChild);
        } else {
            side = document.createElement('nav');
            side.className = 'tabbar dk-side';
            side.innerHTML = SIDE_TABS;
            sec.insertBefore(side, sec.firstChild);
        }

        /* ۲) واژه‌نشان بالای سایدبار */
        if (!side.querySelector('.dk-side-brand')) {
            var brand = document.createElement('div');
            brand.className = 'dk-side-brand';
            brand.innerHTML =
                '<span class="dks-mark"><svg><use href="#i-logo"/></svg></span>' +
                '<span class="dks-name">آی‌مچ</span>';
            side.insertBefore(brand, side.firstChild);
        }

        /* ۳) تبِ فعالِ صفحهٔ جاری */
        var act = SIDE_ACTIVE[id] || '';
        Array.prototype.forEach.call(side.querySelectorAll('.tab'), function (t) {
            t.classList.toggle('active', t.getAttribute('data-tab-home') === act);
        });

        /* ۴) چیپ کارر پایین سایدبار → پروفایل */
        if (!side.querySelector('.dk-user')) {
            side.insertAdjacentHTML('beforeend',
                '<button class="dk-user" type="button" data-go="s-profile">' +
                '<img src="png/users/me.jpg" alt="">' +
                '<span class="dku-tx"><b>احمد رضایی</b><small>سوپرمارکت آریا</small></span>' +
                '</button>');
        }

        /* ۵) ستون اصلی: همهٔ فرزندانِ بعد از سایدبار → یک wrapper */
        if (!sec.querySelector('.dk-desk-main')) {
            var main = document.createElement('div');
            main.className = 'dk-desk-main';
            while (side.nextSibling) main.appendChild(side.nextSibling);
            sec.appendChild(main);
        }

        /* ۶) بازوهای خاموش: تب میز مربوط دیده نشود */
        if (window.iMach && window.iMach.applyArms) window.iMach.applyArms();
    }

    /* ═══ ۱۹/۰۴ میزها — FD-30: کارتابل سه‌ستونه (Kanban-light) ═══
       پوستهٔ اپ (FD-29) + سه چیزِ تازه — همه فقط با تزریقِ دسکتاپی؛
       HTML صفحه‌ها دست‌نخورده می‌ماند تا موبایل بایت‌به‌بایت همان
       FD-24 قبلی بماند (show() هر بار قالب خام را می‌ریزد):
         ۱) سرفصل خوشامد — «سلام احمد / کارهای امروزت این‌جاست»
            (الگوی Notion Home؛ متن ثابت — شمارش زنده لازم نیست؛
            پیرمرد ۷۰ ساله بدون دیتا هم می‌فهمد).
         ۲) کارتابل سه‌ستونهٔ موضوعی: شروع · در انتظار تایید ·
            عملیات روزمره. همهٔ ردیف‌ها در DOM می‌مانند و همان
            id/hidden رفتار خود را نگه می‌دارند — deskHomeSync/
            buyDeskSync با id کار می‌کنند، جابه‌جایی والد بی‌ضرر.
            ستونِ خالی (همهٔ ردیف‌ها hidden) با CSS :has پنهان
            می‌شود — عنصرِ بی‌دلیل نداریم.
         ۳) hint-line → کارت پیشنهاد آی‌مچ (کاغذ + آیکون رنگی).
       FD-28 شماره‌های ترتیب (.dk-ord) حذف شد — در چیدمانِ ستونی،
       شمارهٔ سراسری ترتیب را گمراه می‌کند؛ گروهِ ستون جانشینِ
       ترتیبِ خطی است (تصمیم FD-30؛ حکم FD-12 «هم‌قد بودن گام‌های
       شروع» حالا در ستونِ خودش برقرار است).
       FD-33 (حکم مالک — میز فروش): کانبان سه‌ستونه فقط برای میز
       خرید ماند؛ میز فروش تک‌کاغذِ مسطح شد (dsk-flat) — کارت در
       کارت ممنوع؛ بین تسک‌ها خط مویی.
       FD-34 (حکم مالک — میز فروش): «هر تسک در یه کارت، همون
       موبایل» → dsk-tasks (کارت‌های مجزا با فاصله و ارتفاع یکسان)؛
       خوشامد حذف → عنوان «دسترسی سریع». */
    var DESK_COLS = {
        's-home-buy': [
            { k: 'start',  t: 'شروع', ic: '#i-rocket',
              pick: function (r) { return r.classList.contains('row-start'); } },
            { k: 'pend',   t: 'در انتظار تایید', ic: '#i-user-plus',
              pick: function (r) { return r.id === 'buy-pend-row'; } },
            { k: 'orders', t: 'پیشنهادها و سفارشات', ic: '#i-inbox',
              pick: function () { return true; } }
        ]
    };

    function dkDesk(sec, id) {
        shellify(sec, id);
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');

        /* ۱) سرفصل — FD-34 (حکم مالک، میز فروش): «سلام احمد 👋 /
           کارهای امروزت را این‌جا ببین» برداشته شد؛ به‌جایش عنوانِ
           «دسترسی سریع» بالای کاشی‌ها نشست («فقط بزار، دسترسی سریع»).
           میز خرید هنوز به نوبتِ بازطراحی خودش نرسیده — خوشامد
           FD-30 می‌ماند. */
        if (id === 's-home-sell') {
            var quick = document.createElement('div');
            quick.className = 'section-title dk-quick';
            quick.innerHTML = '<h2>دسترسی سریع</h2>';
            body.insertBefore(quick, body.firstChild);
        } else {
            var greet = document.createElement('div');
            greet.className = 'dk-greet';
            greet.innerHTML =
                '<b>سلام احمد <span aria-hidden="true">👋</span></b>' +
                '<small>کارهای امروزت را این‌جا ببین</small>';
            body.insertBefore(greet, body.firstChild);
        }

        /* ۲) کارتابل — FD-33: میز فروش مسطح؛ FD-34 (حکم مالک):
           «همون موبایل — هر تسک در یه کارت، مارجین تاپ مناسب،
           ارتفاع همه یکسان؛ گرید شکل نزار» → dsk-tasks (کارت‌های
           مجزا). میز خرید کانبان سه‌ستونهٔ FD-30. ردیف‌ها در DOM
           می‌مانند و همان id/hidden/دیتا-رفتار خود را نگه می‌دارند. */
        var rows = body.querySelector(':scope > .rows');
        var spec = DESK_COLS[id];
        if (rows && spec) {
            var cols = spec.map(function (c) {
                var col = document.createElement('div');
                col.className = 'dsk-col';
                col.setAttribute('data-col', c.k);
                col.innerHTML =
                    '<div class="dsk-col-h"><svg><use href="' + c.ic + '"/></svg>' +
                    '<span>' + c.t + '</span></div>';
                return col;
            });
            Array.prototype.slice.call(rows.children).forEach(function (r) {
                for (var i = 0; i < spec.length; i++) {
                    if (spec[i].pick(r)) { cols[i].appendChild(r); return; }
                }
            });
            cols.forEach(function (c) { rows.appendChild(c); });
            rows.classList.add('dsk-rows');
        } else if (rows && id === 's-home-sell') {
            /* FD-34 (حکم مالک): «بصورت همون موبایل هر تسک در یه کارت
               باشه» — کارت‌های مجزا با فاصله (CSS .dsk-tasks)؛ نه
               کاغذ واحد با خط مویی (FD-33) و نه گرید. ترتیب DOM =
               ترتیب اهمیت: گام راه‌اندازی → در انتظار تایید →
               سفارش → درخواست. */
            rows.classList.add('dsk-tasks');
        }

        /* ۳) hint-line → کارت پیشنهاد آی‌مچ */
        var hint = body.querySelector(':scope > .hint-line');
        if (hint) hint.classList.add('dsk-hint');
    }

    /* ═══ ۰۵/۳۱ کاتالوگ — FD-39: سایدبار اختصاصی کاتالوگ ═══
       (حکم مالک: «کاتالوگ سایدبار اختصاصی خودش را داشته باشد —
       و آن چهار دکمه از روی کاتالوگ برداشته شود و به‌صورت چهار
       لینک در سایدبار بنشیند.»)
       FD-39v2 (بازخورد مالک روی پیادهٔ اول): «سایدبار یعنی شبیه
       سایدبارِ اصلی سیستم در سمتِ راست صفحه — نه منوی بازِ
       داخلِ محتوای صفحه.» ⟵ پیادهٔ اول یک کارتِ شناور ۲۱۶ در
       ستونِ چپِ بادی بود (مثل پنل‌های FD-30) — مردود.
       ▸ ساختار v۲ = همان پوستهٔ اپ (dk-desk): سایدبار ۲۵۶ در
         «راستِ صفحه»، تمام‌قد (۱۰۰vh) و چسبان و تخت با خطِ
         لبهٔ inline-end — دقیقاً هم‌هندسهٔ .dk-side اصلی؛
         «اختصاصی» فقط در محتواست: واژه‌نشانِ دکان + «کاتالوک
         من» + چهار لینک + چیپ کارر پایین (هم‌ساختارِ اصلی).
       ▸ چهار دکمهٔ .cat-actions دست‌نخورده جابه‌جا می‌شوند (همهٔ
         id ها: promo-box/promo-ic/promo-t/catalog-preview —
         catPromoSync همان‌ها را زنده نگه می‌دارد)؛ CSS در
         [data-dk] آنها را ردیفِ ناوبریِ تخت می‌بیند — هم‌قالبِ
         تب‌های سایدبار اصلی.
       ▸ موبایل دست‌نخورده: این تبدیل فقط ≥۱۰۲۴ اجرا می‌شود و
         CSS هم زیر #phone[data-dk="1"] است.
       ▸ کاتالوگِ مهمان (۳۱) بدون .cat-actions است → بدون پوسته. */
    function dkCatalog(sec) {
        sec.classList.add('dk-page', 'dk-catalog');
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');

        var acts = body.querySelector(':scope > .cat-actions');
        if (!acts) return;   /* مهمان (۳۱): چهار دکمه ندارد */

        /* پوستهٔ اپ — همان گریدِ dk-desk: سایدبارِ راست + ستون اصلی */
        sec.classList.add('dk-desk', 'dk-cat-tools');

        /* ۱) سایدبار اختصاصی — همان هندسه/زبانِ .dk-side اصلی:
           واژه‌نشان (دکان + «کاتالوک من») · چهار لینک · چیپ کارر.
           (aside هم tabbar می‌گیرد تا قواعدِ .dk-desk .dk-side
           مثل میزها/پیام‌ها/پروفایل رویش بنشیند — الگوی shellify.) */
        var side = document.createElement('aside');
        side.className = 'tabbar cat-side dk-side';
        side.innerHTML =
            '<div class="dk-side-brand">' +
                '<span class="dks-mark"><svg><use href="#i-store"/></svg></span>' +
                '<span class="dks-name">کاتالوگ من</span>' +
            '</div>';
        side.appendChild(acts);
        side.insertAdjacentHTML('beforeend',
            '<button class="dk-user" type="button" data-go="s-profile">' +
            '<img src="png/users/me.jpg" alt="">' +
            '<span class="dku-tx"><b>احمد رضایی</b><small>سوپرمارکت آریا</small></span>' +
            '</button>');
        sec.insertBefore(side, sec.firstChild);

        /* ۲) ستون اصلی: ساب‌هدر + بدنه + شیت‌ها — الگوی shellify.
           شیت‌ها fixed اند در [data-dk] — جابه‌جایی DOM اثری بر
           جای‌گیری‌شان ندارد (درس FD-10). */
        var main = document.createElement('div');
        main.className = 'dk-desk-main';
        while (side.nextSibling) main.appendChild(side.nextSibling);
        sec.appendChild(main);
    }

    /* ═══ ۴۰/۴۱ سند فروش — FD-37: مودال سند ═══
       فقط کلاس dk-doc — همهٔ چیدمان (قاب تیرهٔ fixed + کاغذ A4
       وسچ + نوار بالای شفاف) در style.css بلوک FD-37؛ منطقِ چون
       مودال: دکمهٔ «بازگشت» ساب‌هدر همان close است (core.back).
       سند در موبایل صفحهٔ جداگانه است — این تبدیل فقط ≥۱۰۲۴. */
    function dkDoc(sec) {
        sec.classList.add('dk-doc');
    }

    /* ═══ ۳۷ کالا ═══
       دوستونه: مشخصات/قیمت/فروشنده (راست) + گالری چسبان (چپ). */
    function dkProduct(sec) {
        sec.classList.add('dk-page', 'dk-product');
    }

    /* ═══ ۲۵ استعلام جدید ═══
       دوستونه: فرمِ کالاها (راست) + گیرندگان (چپ، چسبان). */
    function dkRfqNew(sec) {
        sec.classList.add('dk-page', 'dk-rfq');
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');

        var titles = body.querySelectorAll(':scope > .section-title');
        if (titles.length < 2) return;
        var splitAt = titles[1];

        var main = document.createElement('div');
        main.className = 'dkrf-main';
        var side = document.createElement('div');
        side.className = 'dkrf-side';

        var kids = Array.prototype.slice.call(body.children);
        var inSide = false;
        kids.forEach(function (k) {
            if (k === splitAt) inSide = true;
            (inSide ? side : main).appendChild(k);
        });
        body.appendChild(main);
        body.appendChild(side);
    }

    /* ═══ ۲۶ پیشنهادها ═══
       گرید ۲ستونهٔ کارت‌های مقایسه + دکمهٔ «بستن استعلام» پهن. */
    function dkOffers(sec) {
        sec.classList.add('dk-page', 'dk-offers');
    }

    /* ═══ ۳۰ چت ═══
       در پوستهٔ اپ؛ ستون اصلی تمام‌قد (۱۰۰vh): ساب‌هدر بالا،
       پیام‌ها با اسکرول داخلی، نوار تایپ کف — الگوی پیام‌رسان. */
    function dkChat(sec, id) {
        shellify(sec, id);
        sec.classList.add('dk-chat');
    }

    /* ═══ ۲۹ پیام‌ها ═══
       در پوستهٔ اپ؛ فهرست گفتگوها در ستون ۹۴۰ وسچ. */
    function dkMsgs(sec, id) {
        shellify(sec, id);
        sec.classList.add('dk-page', 'dk-list', 'dk-msgs');
    }

    /* ═══ ۱۸ پروفایل ═══
       در پوستهٔ اپ + دوستونهٔ واقعی:
       راستِ چسبان: خوشهٔ هویت (من + کسب‌وکار + نماینده + کیف پول)
       چپ: دستیارها و تنظیمات — در ظرف کارت؛ اسکرول روی مرورگر. */
    function dkProfile(sec, id) {
        shellify(sec, id);
        sec.classList.add('dk-page', 'dk-profile');
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');

        var kids = Array.prototype.slice.call(body.children);
        var sideCount = 0, sideKids = [], mainKids = [];
        kids.forEach(function (k) {
            var isIdentity = (k.classList.contains('card') || k.classList.contains('wallet-mini')) && sideCount < 4;
            if (isIdentity) { sideKids.push(k); sideCount++; }
            else mainKids.push(k);
        });

        var side = document.createElement('div');
        side.className = 'dkp-side';
        sideKids.forEach(function (k) { side.appendChild(k); });
        var main = document.createElement('div');
        main.className = 'dkp-main';
        mainKids.forEach(function (k) { main.appendChild(k); });
        body.appendChild(side);
        body.appendChild(main);
    }

    /* ═══ جزئیات (مشتری/تأمین‌کننده/سفارش/پیشنهاد/پروفایل) ═══
       دوستونه: اولین کارتِ محتوایی → ستون راستِ چسبان؛ بقیه → جریان. */
    function dkDetail(sec) {
        sec.classList.add('dk-page', 'dk-detail');
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');

        var kids = Array.prototype.slice.call(body.children);
        var side = null, i, k;
        for (i = 0; i < kids.length; i++) {
            k = kids[i];
            if (k.hidden) continue;
            if (k.classList.contains('hint-line') || k.classList.contains('section-title')) continue;
            side = k; break;
        }
        if (!side) return;

        var main = document.createElement('div');
        main.className = 'dkd-main';
        kids.forEach(function (el) { if (el !== side) main.appendChild(el); });
        side.classList.add('dkd-side');
        body.appendChild(side);
        body.appendChild(main);
    }

    /* ═══ ۱۳ افزودن محصول — FD-36: مثل موبایل، بدون نشانگر ═══
       (حکم مالک: «قرص‌های ویزارد انگار سه دکمه‌اند که کاربر دوست
       دارد رویشان کلیک کند — گیج‌کننده. برداشتنش گویاتر است؛ طرح
       مثل موبایل باشد.»)
       نشانگر سه‌گامیِ FD-30 حذف شد — سرصفحهٔ کوچکِ خودِ صفحه
       («چی می‌فروشی؟ / کدام محصول؟ / بسته‌بندی، قیمت و شرایط
       فروش») تنها راهنمای گام است، دقیقاً مثل موبایل. چیدمان و
       عرض‌ها تماماً CSS اند: ستون‌ها زیرِ هم مثل موبایل + قاب ۶۸۸
       (۲۰٪ باریک‌تر از ۸۶۰ سابق).
       تنها کارِ JS: نوار «افزودن به کاتالوگ» به انتهای جریانِ
       بدنه می‌آید — حتی وقتی hidden است. moveSubmit عمومی از
       hidden رد می‌شود و چون addReset همیشه به گام ۱ برمی‌گردد،
       نوار هیچ‌وقت جابه‌جا نمی‌شد؛ بیرونِ body می‌ماند و لبه‌به‌
       لبهٔ تهِ صفحه می‌چسبید (حکم مالک: «کاملاً به ته صفحه چسبیده —
       بیارش بالاتر و از پایین بهش مارجین بده»). داخل body،
       padding-bottom خودِ بدنه بالشِ امنِ زیر دکمه را می‌سازد.
       FD-38 (ادامهٔ تاریخچه — حکم مالک جدید): نشانگر با زبانِ
       درست برمی‌گردد — «نوار پروگرس گویا و مرحله‌ای… شبیه پروگرس
       بار که حس پیشرفت بده، نه شبیه سه تا دکمه» + فلش بازگشتِ
       هر گام. عنصرش در HTML موبایل است (#add-progress)، CSS‌اش
       در کلاس‌های addp/step-back بیرون @media (موبایل+دسکتاپ)؛
       دسکتاپ فقط نفس می‌گیرد (بلوک FD-38 در style.css). این
       تابع همچنان هیچ تزریقِ نشانگری ندارد — همان درس FD-36:
       نشانگر تزریقیِ JS شکست خورد؛ نشانگرِ داخل HTML و سینکِ
       کلاسی (addProgressSync) کار می‌کند. */
    function dkAdd(sec) {
        sec.classList.add('dk-page', 'dk-add');
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');
        var bar = sec.querySelector('.sticky-bar');
        if (bar && bar.parentNode !== body) body.appendChild(bar);

        /* گام عوض می‌شود → اسکرولِ مرورگر به بالا. در موبایل body
           خودش به بالا می‌رود (addShowStep)؛ در دسکتاپ اسکرول مال
           مرورگر است — بدون این، بعد از انتخاب از تهِ لیستِ بلند،
           کاربر وسطِ گام بعدی می‌ایستی. MutationObserver بی‌حالت:
           هر مسیری را می‌گیرد (کلیک ردیف، شیت ثبت کالا/برند، دکمهٔ
           «تغییر») — قاعدهٔ تزریق: بدون JSِ وضعیت‌دار. */
        if (dkAdd._mo) dkAdd._mo.disconnect();
        var mo = new MutationObserver(function () { window.scrollTo(0, 0); });
        ['add-step-1', 'add-step-2', 'add-step-3'].forEach(function (sid) {
            var el = document.getElementById(sid);
            if (el) mo.observe(el, { attributes: true, attributeFilter: ['hidden'] });
        });
        dkAdd._mo = mo;
    }

    /* ═══ ۱۲ ارسال پیشنهاد — FD-30: دوستونه ═══
       قیمت‌ها (راست، کاغذ واحد — اقلامِ استعلام مسطح با خط مویی،
       الگوی جدول دسکتاپ) + شرایطِ چسبان (چپ، پنل خلاصهٔ استرایپ‌مانند:
       پرداخت/تحویل/جمع‌بندی زنده/توضیح). شکستن در سرصفحهٔ دوم
       («شرایط پرداخت و تحویل») — همان الگوی dkRfqNew؛ همهٔ id ها
       و رفتار سوییچ/رندر پویا دست‌نخورده (offerFormRender بعد از
       تزریق اجرا می‌شود و داخل همین ستون‌ها می‌نویسد). */
    function dkOffer(sec) {
        sec.classList.add('dk-page', 'dk-offer');
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');

        var titles = body.querySelectorAll(':scope > .section-title');
        if (titles.length < 2) return;
        var splitAt = titles[1];

        var main = document.createElement('div');
        main.className = 'ofv-main';
        var side = document.createElement('div');
        side.className = 'ofv-side';

        var kids = Array.prototype.slice.call(body.children);
        var inSide = false;
        kids.forEach(function (k) {
            if (k === splitAt) inSide = true;
            (inSide ? side : main).appendChild(k);
        });
        body.appendChild(main);
        body.appendChild(side);
    }

    /* ═══ ۲۰ لیست خرید ═══
       صفحهٔ پهن + نوار چهار دکمه‌ای افقی + ردیف‌های پهن. */
    function dkBuyList(sec) {
        sec.classList.add('dk-page', 'dk-list', 'dk-blist');
    }

    /* ═══ ۳۶ ویرایش کاتالوگ — FD-30: Form + Preview ═══
       (الگوی Vercel/Stripe: فرمِ راست در کاغذ + ستونِ پیش‌نمایشِ
       چسبانِ چپ — کاربر «در حین تایپ» می‌بیند خریدار چه می‌بیند.)
       پیش‌نمایشِ زندهٔ موجود (اولین کارت بدنه + سینک cateLogoSync)
       فقط به ستونِ چسبان منتقل می‌شود — همان id ها، همان رفتار؛
       سربرگِ «خریداران این را می‌بینند» تزریقی است (متن ثابت). */
    function dkCatEdit(sec) {
        sec.classList.add('dk-page', 'dk-catedit');
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');

        /* ۱) پیش‌نمایش زنده (اولین کارت) → ستون چپ با سربرگ */
        var pv = body.querySelector(':scope > .card');
        var side = document.createElement('div');
        side.className = 'cev-side';
        side.innerHTML =
            '<div class="cev-cap"><svg><use href="#i-eye"/></svg>' +
            '<span>پیش‌نمایش — خریداران این را می‌بینند</span></div>';
        if (pv) {
            pv.classList.add('cev-card');
            side.appendChild(pv);
        }

        /* ۲) بقیهٔ بدنه → فرمِ راست (کاغذ واحد) */
        var main = document.createElement('div');
        main.className = 'cev-main';
        while (body.firstChild) main.appendChild(body.firstChild);
        body.appendChild(main);
        body.appendChild(side);
    }

    /* ═══ عبور از نقطهٔ شکست: بازسازی صفحهٔ جاری ═══ */
    function onMq() {
        var core = window.iMach;
        var cur = core && core.getCurrentScreen && core.getCurrentScreen();
        if (cur && core.show) core.show(cur, false);
    }
    if (MQ.addEventListener) MQ.addEventListener('change', onMq);
    else if (MQ.addListener) MQ.addListener(onMq);

    return { apply: apply };
})();
