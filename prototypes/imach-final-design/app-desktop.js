/* ═════════════════════════════════════════════════════════════════
   iMach — Desktop (FD-26)
   ─────────────────────────────────────────────────────────────────
   رسپانسیو — مرحلهٔ ۱ (حکم مالک): «در دسکتاب طوری که هم گویا باشه
   و هم همون موبایل بزرگ‌شده نباشه؛ ساده و مینیمال».

   ▸ صفحه‌های این مرحله: لندینگ (۰۱) · ورود (۰۳) · ثبت‌نام (۰۲) ·
     میز خرید (۱۹). بقیهٔ صفحه‌ها هنوز نمای قابِ گوشی را دارند
     (تبدیل‌شان مرحلهٔ بعد است — data-dk روی این ۴ صفحه/methods).
   ▸ موبایل دست‌نخورده: همهٔ تبدیل‌های DOM فقط وقتی اجرا می‌شوند
     که matchMedia(min-width:1024) برقرار باشد؛ چون show() هر بار
     HTML خام را دوباره در #screen-host می‌ریزد، تبدیل‌ها بدون
     «برگرداندن» امن‌اند — در عرض موبایل هیچ‌کدام اعمال نمی‌شود.
   ▸ چیدمان دسکتاپ در CSS زیر کلید #phone[data-dk="1"] است؛
     این ماژول فقط: پرچم data-dk + بازچینیِ DOMِ لازم (wrap/move)
     + بازسازی هنگام عبور از نقطهٔ شکست.
   ▸ در پیاده‌سازی واقعی (Next.js): همین دو لایه — CSS سفارشی
     breakpoint + کامپوننت‌های هم‌ارز (Layout با سایدبار،
     AuthSplit)؛ منطق صفحه یکی است، فقط پوستهٔ چیدمان عوض می‌شود.
   ═════════════════════════════════════════════════════════════════ */
window.iMachDesktop = (function () {
    'use strict';

    var MQ = window.matchMedia('(min-width: 1024px)');

    /* صفحه‌های تبدیل‌شدهٔ این مرحله — بقیه = قاب گوشی (مرحلهٔ بعد) */
    var DK_SCREENS = {
        's-landing': dkLanding,
        's-login': dkAuth,
        's-signup': dkAuth,
        's-home-buy': dkDesk
    };

    function apply(id) {
        var phone = document.getElementById('phone');
        if (!phone) return;
        var fn = DK_SCREENS[id];
        var on = !!(fn && MQ.matches);
        if (on) phone.setAttribute('data-dk', '1');
        else phone.removeAttribute('data-dk');
        if (!on) return;
        var sec = document.getElementById(id);
        if (sec) fn(sec, id);
    }

    /* ═══ ۰۱ لندینگ ═══
       هیرو دوستونه (متن + تصویر) · سه بخش مخاطب کنار‌هم/کشیده ·
       کپی DOM: تصویر از جریان پایین به خانهٔ دوم هیرو می‌رود و
       جفت‌های [عنوان + ردیف‌ها] در .dk-sec جمع می‌شوند تا گرید
       CSS بتواندشان کنار هم بچیند. */
    function dkLanding(sec) {
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');

        var hero = body.querySelector('.hero');
        var pad = body.children[1];
        if (!hero || !pad) return;

        /* تصویر محصول → خانهٔ دومِ هیرو */
        var imgCard = null;
        Array.prototype.slice.call(pad.children).some(function (el) {
            if (el.classList.contains('card') && el.querySelector('img')) { imgCard = el; return true; }
            return false;
        });
        if (imgCard) {
            hero.appendChild(imgCard);
            imgCard.classList.add('dk-hero-img');
        }

        /* استایلِ inline بدنه (flex ستونی موبایل) کنار می‌رود؛
           چیدمان دسکتاپ با کلاس dk-pad در CSS. */
        pad.removeAttribute('style');
        pad.classList.add('dk-pad');

        /* گروه‌بندی: هر .section-title با محتوایش تا عنوان بعدی؛
           کارت CTA گرادیانی (بدون rep-ad) و فوتر بیرون می‌مانند. */
        var kids = Array.prototype.slice.call(pad.children);
        var cur = null;
        kids.forEach(function (el) {
            var isTitle = el.classList && el.classList.contains('section-title');
            var isCta = el.classList && el.classList.contains('card') && !el.classList.contains('rep-ad');
            if (isTitle) {
                cur = document.createElement('div');
                cur.className = 'dk-sec';
                pad.insertBefore(cur, el);
            } else if (isCta) {
                cur = null; /* CTA و فوتر در ردیف تمام‌عرض خودشان */
            }
            if (cur && cur !== el) cur.appendChild(el);
        });

        /* بخش سوم (نماینده، شامل rep-ad) تمام‌عرض + ردیف‌های ۳ستونه */
        var secs = pad.querySelectorAll('.dk-sec');
        Array.prototype.slice.call(secs).forEach(function (s) {
            if (s.querySelector('.rep-ad')) s.classList.add('dk-sec-wide');
        });
    }

    /* ═══ ۰۳ ورود / ۰۲ ثبت‌نام ═══
       اسپلیت‌اسکرین مینیمال: پنل برند (راست) + ستون فرم (چپ).
       کپی DOM: فرزندان body در .dk-auth-form جمع می‌شوند، پنل
       .dk-brand تزریق می‌شود و دکمهٔ ارسال از نوار چسبانِ پایین
       به انتهای فرم می‌آید (الگوی فرم دسکتاپ — دکمه با فرم می‌ماند). */
    function dkAuth(sec, id) {
        var body = sec.querySelector('.body');
        if (!body || body.getAttribute('data-dk-done')) return;
        body.setAttribute('data-dk-done', '1');

        var form = document.createElement('div');
        form.className = 'dk-auth-form';
        while (body.firstChild) form.appendChild(body.firstChild);

        var brand = document.createElement('div');
        brand.className = 'dk-brand';
        var bullets = (id === 's-signup')
            ? [
                'ثبت‌نام فقط با شمارهٔ موبایل — کمتر از ۲ دقیقه',
                'هم خریدار، هم فروشنده — یک حساب برای هر دو میز',
                'هر وقت خواستی، نقش را از پروفایل عوض کن'
            ]
            : [
                'کاتالوگ قیمت زنده بساز و لینکش را برای مشتری‌هایت بفرست',
                'لیست خریدت را بچین و از چند تأمین‌کننده قیمت بگیر',
                'رایگان — با امکان پیدا کردن طرف‌های تجاری جدید'
            ];
        brand.innerHTML =
            '<div class="dkb-mark"><svg><use href="#i-logo"/></svg></div>' +
            '<div class="dkb-name">آی‌مچ</div>' +
            '<div class="dkb-tag">شعبهٔ آنلاین خرید و فروش عمدهٔ شما</div>' +
            '<div class="dkb-list">' +
            bullets.map(function (b) {
                return '<div class="dkb-li"><svg><use href="#i-check"/></svg><span>' + b + '</span></div>';
            }).join('') +
            '</div>';

        body.appendChild(brand);   /* راست — خانهٔ اول گرید RTL */
        body.appendChild(form);    /* چپ — ستون فرم */

        /* دکمهٔ ارسال: از نوار چسبان به انتهای فرم */
        var sb = sec.querySelector('.sticky-bar');
        if (sb) {
            var btn = sb.querySelector('.btn');
            if (btn) form.appendChild(btn);
            sb.setAttribute('hidden', '');
            sb.classList.add('dk-sticky-off');
        }
    }

    /* ═══ ۱۹ میز خرید ═══
       چیدمان کامل در CSS (گرید: سایدبار راست + محتوا؛ تب‌بار →
       سایدبار عمودی با order/grid-area) — اینجا فقط علامت صفحه. */
    function dkDesk() { /* CSS-only */ }

    /* ═══ عبور از نقطهٔ شکست: بازسازی صفحهٔ جاری ═══
       چون show() از کش HTML خام می‌سازد، بازنمایی = اعمال/لغو
       تمیز تبدیل‌ها (بدون حالت زندهٔ به‌جامانده). */
    function onMq() {
        var core = window.iMach;
        var cur = core && core.getCurrentScreen && core.getCurrentScreen();
        if (cur && core.show) core.show(cur, false);
    }
    if (MQ.addEventListener) MQ.addEventListener('change', onMq);
    else if (MQ.addListener) MQ.addListener(onMq);

    return { apply: apply };
})();
