/* ═════════════════════════════════════════════════════════════════
   iMach — Handlers
   آخرین فایلی که لود می‌شود چون به app-core و app-forms وابسته است.
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
    var go = core.go;
    var show = core.show;
    var back = core.back;
    var goHome = core.goHome;

    /* ═══════════════════════════════════════════════════════════════
       حلقهٔ سراسری کلیک
       ═══════════════════════════════════════════════════════════════ */
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;

        /* ─── Dialog چندگزینه‌ای ─── */
        var actBtn = t.closest('[data-act]');
        var pending = core.getPendingActions();
        if (actBtn && pending) {
            var idx = +actBtn.dataset.act;
            var action = pending[idx];
            core.closeDialog(1);
            if (action && typeof action.onClick === 'function') {
                setTimeout(action.onClick, 50);
            }
            return;
        }

        /* ─── بستن Sheet ─── */
        var closeBtn = t.closest('[data-sheet-close]');
        if (closeBtn) { core.closeSheet(closeBtn.dataset.sheetClose); return; }

        /* ─── باز کردن Sheet با data-sheet ─── */
        var sheetOpen = t.closest('[data-sheet]');
        if (sheetOpen) {
            core.openSheet(sheetOpen.dataset.sheet);
            return;
        }

        /* ─── منوی پروفایل ─── */
        var menuBtn = t.closest('[data-profile-menu]');
        if (menuBtn) {
            var menu = $('#profile-menu');
            if (menu) menu.hidden = !menu.hidden;
            return;
        }
        var menuEl = $('#profile-menu');
        if (menuEl && !menuEl.hidden && !t.closest('#profile-menu')) menuEl.hidden = true;

        /* ─── Dialog ─── */
        var dlgBtn = t.closest('[data-dlg]');
        if (dlgBtn) { core.closeDialog(dlgBtn.dataset.dlg === '1'); return; }
        if (t.id === 'dialog-backdrop') {
            if ($$('.sheet.show').length) core.closeAllSheets();
            else core.closeDialog(false);
            return;
        }

        /* ─── ویرایش پروفایل ─── */
        if (t.closest('#profile-edit-open') || t.closest('[data-profile-edit]')) {
            core.forms.profileOpenEdit();
            return;
        }
        if (t.closest('#profile-photo-pick')) {
            core.forms.profileSync();
            core.openSheet('sheet-photo-pick');
            return;
        }
        var phOpt = t.closest('[data-pphoto]');
        if (phOpt) { core.forms.profilePickPhoto(phOpt.dataset.pphoto); return; }
        if (t.closest('#profile-save')) { core.forms.profileSave(); return; }

        /* ─── ثبت‌نام ─── */
        if (t.closest('#signup-submit')) {
            var roleCard = $('.role-card.active');
            var role = roleCard ? roleCard.dataset.role : 'both';
            core.assist.sell = (role === 'sell' || role === 'both');
            core.assist.buy  = (role === 'buy'  || role === 'both');
            core.applyArms();
            var dest = core.assist.sell ? 's-home-sell' : 's-home-buy';
            core.resetStack();
            show(dest, false);
            return;
        }

        /* ─── ورود ─── */
        if (t.closest('[data-login]')) {
            core.applyArms();
            core.resetStack();
            show(core.assist.sell ? 's-home-sell' : 's-home-buy', false);
            return;
        }

        /* ─── خروج ─── */
        if (t.closest('[data-logout]')) {
            var m = $('#profile-menu');
            if (m) m.hidden = true;
            core.confirm({
                title: 'خروج از حساب',
                text: 'مطمئنی می‌خواهی خارج شوی؟',
                ok: 'خروج', cancel: 'انصراف', danger: true
            }).then(function (ok) {
                if (ok) { core.resetStack(); show('s-landing', false); }
            });
            return;
        }

        /* ─── تب‌های خانه ─── */
        var homeTab = t.closest('.tab[data-tab-home]');
        if (homeTab) {
            $$('.tab').forEach(function (x) { x.classList.remove('active'); });
            homeTab.classList.add('active');
            goHome(homeTab.dataset.tabHome);
            return;
        }

        /* ─── دکمهٔ امتیاز در میز فروش / خرید ─── */
        var scoreBtn = t.closest('[data-score-arm]');
        if (scoreBtn) {
            /* FD-8: data-open-accel (دکمهٔ «کجا دیده می‌شوم؟» حالت ۱۰۰+ میز)
               → شیت توضیح شتابدهی همان بازو، بلافاصله بعد از ورود به
               صفحهٔ امتیاز باز می‌شود (scoreRender: params.openAccel). */
            core.setSCREENParams('s-network-score', {
                arm: scoreBtn.dataset.scoreArm,
                openAccel: !!scoreBtn.dataset.openAccel
            });
            go('s-network-score');
            return;
        }

        /* ─── منوی مشتری — قبل از ناوبری عمومی تا سه‌نقطه کار کند ─── */
        var custMenu = t.closest('[data-cust-menu]');
        if (custMenu) {
            e.stopPropagation();
            var custName = custMenu.dataset.custMenu;
            var custRow = custMenu.closest('.row');
            if (core.customers && typeof core.customers.menu === 'function') {
                core.customers.menu(custName, custMenu, custRow);
                return;
            }
            core.actions('گزینه‌های ' + custName, [
                { label: 'گفتگو', onClick: function () { go('s-chat'); } },
                { label: 'حذف از مشتریان', danger: true, onClick: function () {
                        core.confirm({
                            title: 'حذف از مشتریان',
                            text: '«' + custName + '» از فهرست مشتریانت حذف می‌شود. دیگر قیمت‌های شما را نمی‌بیند.',
                            ok: 'حذف مشتری', cancel: 'انصراف', danger: true
                        }).then(function (ok) {
                            if (ok) {
                                if (custRow) custRow.remove();
                                toast('مشتری از فهرست حذف شد', 'success');
                            }
                        });
                    }}
            ]);
            return;
        }

        /* ─── منوی تأمین‌کننده — شیت از پایین (قانون همیشگی موبایل) ─── */
        var supMenu = t.closest('[data-sup-menu]');
        if (supMenu) {
            e.stopPropagation();
            supMenuOpen(supMenu.dataset.supMenu, supMenu.closest('.row'));
            return;
        }
        var scmAct = t.closest('[data-scm-act]');
        if (scmAct) { scmRun(scmAct.dataset.scmAct); return; }

        /* ─── منوی سفارش خرید (لغو) — شیت از پایین ───
           FD-18: با شناسهٔ واقعی سفارش (data-order-cancel = id) */
        var ordCancel = t.closest('[data-order-cancel]');
        if (ordCancel && ordCancel.dataset.orderCancel) {
            e.stopPropagation();
            ordMenuOpen(ordCancel.dataset.orderCancel, ordCancel.closest('.row'));
            return;
        }
        var ocmAct = t.closest('[data-ocm-act]');
        if (ocmAct) { ocmRun(ocmAct.dataset.ocmAct); return; }

        /* ═══════════════════════════════════════════════════════════
           FD-9/FD-10 — کاتالوگ (۰۵/۳۱/۳۷)
           ▸ کارتِ «قیمت منقضی» با لمس، شیت آپدیت سریع همان کالا را باز
             می‌کند (نه صفحهٔ ویرایش کامل) — حکم مالک.
           ▸ کارت سالمِ کاتالوگ من با id محصول به ویرایش می‌رود.
           ▸ افزودن به سبد خرید مهمان — قبل از شاخهٔ data-guest-card.
           ▸ FD-10: «مشاهده قیمت» (جای قیمتِ مهمان) → فرم ساخت حساب با
             زمینهٔ price — بعد از ثبت‌نام، قیمت‌ها همان‌جا باز می‌شوند.
           ═══════════════════════════════════════════════════════════ */
        var addCart = t.closest('[data-add-cart]');
        if (addCart) {
            e.stopPropagation();
            core.forms.guestCartAdd(addCart.dataset.addCart);
            return;
        }
        var viewPrice = t.closest('[data-view-price]');
        if (viewPrice) {
            e.stopPropagation(); e.preventDefault();
            core.forms.guestAccountOpen('signup', 'price');
            return;
        }
        var staleCard = t.closest('#cat-grid .pcard[data-lid]');
        if (staleCard) {
            e.preventDefault();
            if (staleCard.classList.contains('stale')) {
                core.forms.qpriceOpen(staleCard.dataset.lid);
            } else {
                go('s-sell-edit', { id: staleCard.dataset.lid });
            }
            return;
        }

        /* ─── ناوبری عمومی ─── */
        var goEl = t.closest('[data-go]');
        if (goEl) { e.preventDefault(); go(goEl.dataset.go); return; }
        var pvBack = t.closest('[data-preview-back]');
        if (pvBack) { e.preventDefault(); back(); return; }
        var backEl = t.closest('[data-back]');
        if (backEl) { e.preventDefault(); back(); return; }

        /* ─── پیل‌ها ─── */
        /* FD-14: رادیوی دوگانهٔ هزینهٔ حمل (فرم پیشنهاد) — «یکی از دو»؛
           فعال‌سازی + متن جمع‌بندی زنده */
        var shipPill = t.closest('#of-ship-by .pill');
        if (shipPill) {
            $$('#of-ship-by .pill').forEach(function (p) { p.classList.remove('active'); });
            shipPill.classList.add('active');
            if (core.forms.offerShipPick) core.forms.offerShipPick(shipPill.dataset.ship);
            return;
        }
        var pill = t.closest('.pills .pill');
        if (pill) {
            $$('.pill', pill.parentElement).forEach(function (p) { p.classList.remove('active'); });
            pill.classList.add('active');
            return;
        }

        /* ─── کارت نقش ─── */
        var roleC = t.closest('.role-card');
        if (roleC) {
            $$('.role-card', roleC.parentElement).forEach(function (c) { c.classList.remove('active'); });
            roleC.classList.add('active');
            return;
        }

        /* ─── فیلتر برند (گام ۲ فرم افزودن محصول) ─── */
        var brandChip = t.closest('[data-brand-filter]');
        if (brandChip) {
            core.forms.addPickBrandFilter(brandChip.dataset.brandFilter || null);
            return;
        }

        /* ─── چیپ بسته‌بندی (گام ۳ فرم افزودن محصول) ─── */
        var packChip = t.closest('[data-pick-pack]');
        if (packChip) {
            core.forms.addPickPack(packChip.dataset.pickPack || 'custom');
            return;
        }

        /* ─── FD-14: چیپ گروه کالا در شیت «افزودن به لیست خرید» (۳۱) —
           باید قبل از چیپ عمومی باشد تا فیلتر گروه واقعاً اجرا شود
           (چیپ عمومی فقط کلاس active را جابه‌جا می‌کند و return) ─── */
        var plG = t.closest('[data-pl-g]');
        if (plG) { core.forms.picklistGroup(plG.dataset.plG); return; }

        /* ─── چیپ عمومی ─── */
        var chip = t.closest('.chips .chip');
        if (chip && !chip.dataset.quickMsg && chip.dataset.brandFilter === undefined && chip.dataset.pickPack === undefined) {
            $$('.chip', chip.parentElement).forEach(function (c) { c.classList.remove('active'); });
            chip.classList.add('active');
            return;
        }

        /* ─── سوییچ عمومی ─── */
        var sw = t.closest('.switch');
        if (sw && sw.id === 'vol-on') sw = null; /* سوییچ تخفیف حجمی را شیت خودش مدیریت می‌کند */
        if (sw) {
            if (sw.classList.contains('locked')) {
                toast('ابتدا به ۱۰۰ امتیاز فعالیت برس', 'error');
                return;
            }
            if (sw.dataset.armSwitch) {
                var which = sw.dataset.armSwitch;
                var isOn = sw.classList.contains('on');
                if (isOn) {
                    var other = which === 'sell' ? 'buy' : 'sell';
                    if (!core.assist[other]) { toast('حداقل یکی از دستیارها باید روشن بماند', 'error'); return; }
                    core.assist[which] = false;
                    sw.classList.remove('on');
                    var curArm = $('#phone').dataset.arm;
                    if (curArm === which) {
                        var hid = core.assist.sell ? 's-home-sell' : 's-home-buy';
                        core.resetStack(); show(hid, false);
                    }
                } else {
                    core.assist[which] = true;
                    sw.classList.add('on');
                }
                core.applyArms();
                return;
            }
            if (sw.id === 'promo-switch') {
                core.forms.promoSwitchToggle();
                return;
            }
            /* FD-14: سوییچ‌های فرم پیشنهاد — نمایش/نهفتن بلوک چک و ارسال
               (منطق در app-forms: offerChkToggle / offerShipToggle) */
            if (sw.id === 'of-chk-on') { core.forms.offerChkToggle(); return; }
            if (sw.id === 'of-ship-on') { core.forms.offerShipToggle(); return; }
            /* FD-13: سوییچ «مشاهده قیمت‌ها فقط برای مشتریان» (۳۶) —
               تنظیم کاتالوگ را عوض می‌کند و ۳۱/۳۷ همان لحظه واکنش نشان می‌دهند */
            if (sw.id === 'cate-prices-only') {
                core.forms.catePricesToggle();
                return;
            }
            sw.classList.toggle('on');
            return;
        }

        /* ─── FD-24: تعاملات استعلام چندقلمی (۲۵) ───
           استپر مقدار قلم · حذف قلم · افزودن کالا (شیت) ·
           انتخاب از شیت · تأیید شیت */
        var rfqQ = t.closest('[data-rfq-qty]');
        if (rfqQ && core.forms.rfqQtyStep) {
            core.forms.rfqQtyStep(parseInt(rfqQ.dataset.rfqQty, 10), rfqQ.dataset.dir);
            return;
        }
        var rfqR = t.closest('[data-rfq-rm]');
        if (rfqR && core.forms.rfqItemRemove) {
            core.forms.rfqItemRemove(parseInt(rfqR.dataset.rfqRm, 10));
            return;
        }
        if (t.closest('#rfq-add-btn') && core.forms.rfqPickOpen) {
            core.forms.rfqPickOpen();
            return;
        }
        var rfp = t.closest('[data-rfp-item]');
        if (rfp && core.forms.rfqPickAdd) {
            core.forms.rfqPickAdd(rfp.dataset.rfpItem);
            return;
        }
        if (t.closest('#rfp-done')) {
            core.closeSheet('sheet-rfqpick');
            return;
        }

        /* ─── چک‌رو عمومی ─── */
        var cr = t.closest('.checkrow');
        if (cr && !t.closest('#contact-list')) {
            /* FD-24: تیک قفلِ استعلام چندقلمی — اجتماع دارندگان قلم‌ها
               است؛ لمسش فقط دلیل را می‌گوید (الگوی redesign-base) */
            if (cr.dataset.lock) {
                toast('استعلام چندقلمی به هر که حداقل یکی از قلم‌ها را دارد می‌رسد', 'info');
                return;
            }
            var cb = cr.querySelector('.checkbox');
            if (cb) cb.classList.toggle('on');
            /* FD-14: فرم استعلام (۲۵) — شمارش گیرندگان زنده */
            if (core.forms.rfqRecipSync) core.forms.rfqRecipSync();
            return;
        }

        /* ─── مخاطبین: pick mode ─── */
        var contactRow = t.closest('#contact-list .contact-row');
        if (contactRow && $('#s-contacts') && $('#s-contacts').classList.contains('pick-mode')) {
            if (!t.closest('[data-send-contact]') && !t.closest('[data-invite-sms]')) {
                var cchk = contactRow.querySelector('.contact-check');
                if (cchk) { cchk.classList.toggle('on'); core.forms.updatePickCount(); }
                return;
            }
        }

        /* ─── کپی لینک ───
           FD-16: پیام وابسته به شیت/صفحه — کاتالوگ یا لیست خرید. */
        if (t.closest('[data-copy]')) {
            var inBuySheet = !!(t.closest('#sheet-share-buylist') || t.closest('#s-buy-list-guest'));
            toast(inBuySheet ? 'لینک لیست خرید کپی شد — برای تأمین‌کننده‌ها بفرست' : 'لینک کاتالوگ کپی شد', 'success');
            return;
        }

        /* ─── اشتراک با پیام‌رسان ─── */
        var shareApp = t.closest('[data-share-app]');
        if (shareApp) {
            var app = shareApp.dataset.shareApp;
            var names = { sms: 'پیامک', whatsapp: 'واتس‌اپ', telegram: 'تلگرام', rubika: 'روبیکا', eita: 'ایتا', bale: 'بله' };
            toast('اشتراک با ' + (names[app] || 'پیام‌رسان') + ' باز می‌شود', 'success');
            return;
        }

        /* ─── ارسال به مخاطب ─── */
        var sc = t.closest('[data-send-contact]');
        if (sc) {
            sc.textContent = 'ارسال شد ✓';
            sc.classList.add('btn-outline');
            sc.classList.remove('btn-primary');
            toast('کاتالوگ در پیام‌رسان آی‌مچ برای مخاطب ارسال شد', 'success');
            return;
        }

        /* ─── دعوت با پیامک ─── */
        var inv = t.closest('[data-invite-sms]');
        if (inv) {
            inv.textContent = 'پیامک شد ✓';
            inv.classList.add('btn-outline');
            toast('پیامک دعوت با لینک کاتالوگ ارسال شد', 'success');
            return;
        }

        /* ─── ارسال به مخاطبین (دکمهٔ بالای شیت اشتراک) ─── */
        var cpick = t.closest('[data-contacts-pick]');
        if (cpick) {
            go('s-contacts', { mode: 'pick', back: cpick.dataset.contactsPick || 's-catalog-share' });
            return;
        }

        /* ─── جستجو و انتخاب مخاطبین ─── */
        if (t.closest('#share-pick')) {
            go('s-contacts', { mode: 'pick', back: 's-catalog-share' });
            return;
        }

        /* ─── ارسال گروهی از pick mode ───
           FD-16: پیام وابسته به مقصد برگشت — لیست خرید (دعوت تأمین‌کننده)
           یا کاتالوگ (دعوت مشتری). */
        if (t.closest('#pick-send')) {
            var n = $$('#contact-list .contact-check.on').length;
            if (!n) return;
            var backTo = (core.getSCREENParams()['s-contacts'] || {}).back || 's-catalog-share';
            var isBuyList = (backTo === 's-buy-list' || backTo === 's-buy-suppliers');
            var what = isBuyList ? 'لیست خرید' : 'کاتالوگ';
            var names2 = $$('#contact-list .contact-check.on').map(function (c) {
                var row = c.closest('.contact-row');
                return row.querySelector('.contact-name').textContent.trim().split(' ')[0];
            }).join('، ');
            core.setSCREENParams('s-catalog-share', { sent: n, names: names2 });
            core.resetStack();
            show(backTo, false).then(function () {
                var banner = $('#share-success');
                if (banner) {
                    banner.innerHTML = '<div class="success-banner"><svg><use href="#i-check"/></svg><span>' + what + ' برای ' + faNum(n) + ' نفر ارسال شد</span></div>';
                    banner.hidden = false;
                } else {
                    /* صفحه‌ای که بنر موفقیت ندارد (مثل دفتر مشتری/لیست خرید) — توست کافی است */
                    toast(what + ' برای ' + faNum(n) + ' مخاطب ارسال شد', 'success');
                }
            });
            return;
        }

        /* ─── پیش‌نمایش کاتالوگ ─── */
        if (t.closest('#catalog-preview')) {
            go('s-catalog-guest', { own: 1, preview: 1 });
            return;
        }
        if (t.closest('#buylist-preview')) {
            go('s-buy-list-guest', { own: 1, preview: 1 });
            return;
        }

        /* ═══════════════════════════════════════════════════════════
           FD-9 — تغییر قیمت‌ها (۳۳): دو نیت
           ═══════════════════════════════════════════════════════════ */
        if (t.closest('#bk-quick')) { core.forms.bulkQuick(); return; }
        if (t.closest('#bk-change')) { core.forms.bulkToEdit(); return; }
        if (t.closest('#bulk-cancel')) { core.forms.bulkCancel(); return; }

        /* ═══════════════════════════════════════════════════════════
           FD-9 — شیت آپدیت سریع قیمتِ یک کالا (۰۵)
           ═══════════════════════════════════════════════════════════ */
        var qpDir = t.closest('[data-qp-dir]');
        if (qpDir) {
            var qCur = parseFloat(String(($('#qp-pct') || {}).value || '0')
                .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
                .replace(/[٪%−\s]/g, '').replace('٫', '.')) || 0;
            core.forms.qpPctSet(qCur + (parseFloat(qpDir.dataset.qpDir) || 0));
            return;
        }
        if (t.closest('#qp-save')) { core.forms.qpriceSave(); return; }

        /* ═══════════════════════════════════════════════════════════
           FD-9 — کاتالوگ مهمان (۳۱): سبد خرید + جریان ذخیره/حساب
           ═══════════════════════════════════════════════════════════ */
        if (t.closest('#guest-cart-btn')) { core.forms.guestCartOpen(); return; }
        /* FD-13: کارت مشتری (سبد خریدِ [نام]) — کل کارت = ورود به سبد */
        if (t.closest('#guest-cust-card')) { core.forms.guestCartOpen(); return; }
        /* FD-11: «ورود» اپ‌بار کاتالوگ عمومی — اکشن پلتفرم، جدا از
           دکمه‌های صاحب کاتالوگ (نوار پایین). نمای ورودِ شیت حساب؛
           ctx='price' ⇒ بعد از ورود همان‌جا می‌ماند و قیمت‌ها باز می‌شود */
        if (t.closest('#guest-login-btn')) { core.forms.guestAccountOpen('login', 'price'); return; }
        var cStep = t.closest('[data-cart-step]');
        if (cStep) { core.forms.guestCartStep(cStep.dataset.cartId, parseFloat(cStep.dataset.cartStep) || 0); return; }
        var cDel = t.closest('[data-cart-del]');
        if (cDel) { core.forms.guestCartDel(cDel.dataset.cartDel); return; }
        if (t.closest('#cart-order')) { core.forms.guestOrderSubmit(); return; }
        /* FD-13: «پیگیری سفارش در میز خرید» — مقصد روشن بعد از سفارش */
        if (t.closest('#cart-track')) { core.forms.guestOrderTrack(); return; }
        if (t.closest('#cart-continue')) { core.forms.guestCartContinue(); return; }

        /* ═══ FD-14/FD-22 — افزودن کالاهای کاتالوگ به لیست خرید (۳۱) ═══
           نوار (فقط مشتیِ ذخیره‌کرده) → شیت انتخاب: سرچ + گروه +
           ردیف‌های تک‌ستونه + مقدار/دورهٔ الزامی + «افزودن n کالا» ⇒
           DATA.shoppingList. لمس pill دوره/ input مقدار = تیک ردیف
           نمی‌خورد (فقط خود ردیف) */
        if (t.closest('#guest-addlist-btn')) { core.forms.picklistOpen(); return; }
        var plPer = t.closest('[data-pl-per]');
        if (plPer) { core.forms.picklistPer(plPer.dataset.plPer, plPer.dataset.val); return; }
        var plItem = t.closest('[data-pl-item]');
        if (plItem && !t.closest('input') && !t.closest('.pill')) { core.forms.picklistToggle(plItem.dataset.plItem); return; }
        if (t.closest('#pl-add')) { core.forms.picklistAdd(); return; }

        /* جریان ذخیره: مزایا (آکاردئون FD-10) → حساب → پنل */
        if (t.closest('#bene-toggle')) { core.forms.guestBeneToggle(); return; }
        if (t.closest('[data-save-flow]')) { core.forms.guestSaveFlow(); return; }
        if (t.closest('#bf-continue')) { core.forms.guestAccountOpen('signup', 'save'); return; }
        if (t.closest('#acc-goto-login')) { core.forms.guestAccountOpen('login'); return; }
        if (t.closest('#acc-goto-signup')) { core.forms.guestAccountOpen('signup'); return; }
        if (t.closest('#acc-submit')) { core.forms.guestAccountSubmit('signup'); return; }
        if (t.closest('#acc-login-submit')) { core.forms.guestAccountSubmit('login'); return; }
        /* FD-14: نمای «ذخیره انجام شد» — مقصد انتخابی، نه پرش:
           دکمه = میز خرید (قاعدهٔ FD-12 سرِ جایش) · لینک = ماندن.
           هردو، نمای موفقیت را هم ریست می‌کنند (بازشدن بعدی تمیز). */
        if (t.closest('#acc-goto-desk')) {
            var svd = $('#acc-saved');
            if (svd) svd.hidden = true;
            core.closeSheet('sheet-account');
            core.resetStack();
            show('s-home-buy', false);
            return;
        }
        if (t.closest('#acc-stay')) {
            var svs = $('#acc-saved');
            if (svs) svs.hidden = true;
            core.closeSheet('sheet-account');
            return;
        }
        /* FD-10: دکمهٔ اصلی اکشن‌بار صفحهٔ جزئیات (۳۷) */
        if (t.closest('#pv-cta')) { core.forms.pvCta(); return; }

        /* FD-12: ساخت رمز ورود — ردیف «شروع» میز خرید → شیت sheet-pass
           (pv-save-cta با data-save-flow بالاتر هندل می‌شود) */
        if (t.closest('[data-pass-open]')) { core.forms.passOpen(); return; }
        if (t.closest('#pass-submit')) { core.forms.passSubmit(); return; }

        /* ─── FD-20: تنظیمات زبان/ارز — حضور در طرح، بدون عملکرد ───
           انتخاب فارسی/تومان: ثبت در دیتا + نشان انتخاب جابه‌جا می‌شود.
           گزینه‌های «به‌زودی»: انتخاب نمی‌شوند — فقط خبر می‌دهند. */
        var setLang = t.closest('[data-set-lang]');
        if (setLang) {
            var LANG_T = { fa: 'فارسی', en: 'English', ar: 'العربية' };
            var lv = setLang.dataset.setLang;
            if (lv === 'fa') {
                core.data.user.settings = core.data.user.settings || {};
                core.data.user.settings.lang = 'fa';
                document.querySelectorAll('[data-set-lang]').forEach(function (b) { b.classList.remove('selected'); });
                setLang.classList.add('selected');
                var lvEl = $('#set-lang-val');
                if (lvEl) lvEl.textContent = LANG_T.fa;
                core.closeSheet('sheet-lang');
                toast('زبان: فارسی', 'success');
            } else {
                toast('«' + (LANG_T[lv] || lv) + '» به‌زودی فعال می‌شود', 'info');
            }
            return;
        }
        var setCur = t.closest('[data-set-currency]');
        if (setCur) {
            var CUR_T = { IRT: 'تومان (IRT)', USD: 'دلار آمریکا (USD)', AED: 'درهم امارات (AED)' };
            var cv = setCur.dataset.setCurrency;
            if (cv === 'IRT') {
                core.data.user.settings = core.data.user.settings || {};
                core.data.user.settings.currency = 'IRT';
                document.querySelectorAll('[data-set-currency]').forEach(function (b) { b.classList.remove('selected'); });
                setCur.classList.add('selected');
                var cvEl = $('#set-currency-val');
                if (cvEl) cvEl.textContent = CUR_T.IRT;
                core.closeSheet('sheet-currency');
                toast('ارز نمایش: تومان', 'success');
            } else {
                toast('نمایش به ' + (CUR_T[cv] || cv) + ' به‌زودی فعال می‌شود — قیمت‌ها به تومان ذخیره می‌مانند', 'info');
            }
            return;
        }

        /* ─── ذخیرهٔ کاتالوگ تأمین‌کننده ─── */
        var saveCat = t.closest('[data-save-catalog]');
        if (saveCat && !saveCat.classList.contains('done-save')) {
            saveCat.classList.add('done-save');
            saveCat.innerHTML = '<svg><use href="#i-check"/></svg> ذخیره شد';
            saveCat.classList.add('btn-outline');
            saveCat.classList.remove('btn-primary');
            toast('کاتالوگ در «تأمین‌کنندگان من» ذخیره شد', 'success');
            return;
        }

        /* ─── FD-18: پذیرش سفارش — واقعاً روی دیتا (اصلاح مقدار/قیمت
           از فرم ۱۰ + اعلان به خریدار + بازآرایی فهرست‌ها) ─── */
        if (t.closest('[data-order-accept]')) {
            if (core.forms.orderAccept) core.forms.orderAccept();
            return;
        }

        /* ─── FD-18: رد سفارش — گذار وضعیت + اعلان ─── */
        if (t.closest('[data-order-reject]')) {
            if (core.forms.orderReject) core.forms.orderReject();
            return;
        }

        /* ─── FD-18: «ارسال شد» — فروشنده، پس از پذیرش ─── */
        if (t.closest('[data-order-sent]')) {
            if (core.forms.orderMarkSent) core.forms.orderMarkSent();
            return;
        }

        /* ─── FD-18: «تأیید تحویل» — خریدار، سفارش را می‌بندد ─── */
        if (t.closest('[data-order-delivered]')) {
            if (core.forms.orderConfirmDelivery) core.forms.orderConfirmDelivery();
            return;
        }

        /* ─── FD-18: لغو سفارش خریدار (دکمهٔ ۳۹) ─── */
        if (t.closest('[data-order-cancel]') && !t.closest('[data-order-cancel-menu]')) {
            if (core.forms.orderCancel) core.forms.orderCancel();
            return;
        }

        /* ─── FD-18/FD-22: گفتگوی مرتبط با سفارش — با زمینهٔ گفتگو
           (تصمیم ۸/۹: «دربارهٔ: سفارش …» بالای حباب‌ها) ─── */
        if (t.closest('[data-order-chat]')) {
            var ordAbout = '';
            var bovEl = $('#bov-sub'), sovEl = $('#sov-sub');
            if (bovEl && bovEl.textContent) ordAbout = bovEl.textContent;
            else if (sovEl && sovEl.textContent) ordAbout = sovEl.textContent;
            go('s-chat', { about: 'سفارش ' + (ordAbout || 'جاری') });
            return;
        }

        /* ─── FD-18: سفارش دوباره (بایگانی) → کاتالوگ تأمین‌کننده ─── */
        if (t.closest('[data-order-reorder]')) {
            if (core.forms.orderReorder) core.forms.orderReorder();
            return;
        }

        /* ─── FD-18: ناوبری ردیف سفارش با پارامتر — هر سفارش خودش ─── */
        var ordGo = t.closest('[data-ord-go]');
        if (ordGo) {
            e.preventDefault();
            if (ordGo.dataset.ordSide === 'buy') go('s-buy-order-view', { id: ordGo.dataset.ordGo });
            else go('s-sell-order-view', { id: ordGo.dataset.ordGo });
            return;
        }

        /* ─── ارسال پیشنهاد فروشنده (FD-14: منطق در app-forms —
           اعتبارسنجی قیمت + انتقال استعلام به «پاسخ داده‌شده») ─── */
        if (t.closest('[data-offer-send]')) {
            if (core.forms.offerSend) core.forms.offerSend();
            return;
        }

        /* ─── پذیرش پیشنهاد خریدار (FD-14: پذیرش = بستن استعلام) ─── */
        if (t.closest('[data-accept-offer]')) {
            if (core.forms.offerAccept) core.forms.offerAccept();
            return;
        }

        /* ─── بستن استعلام (۲۶) — پایان کار خریدار بدون انتخاب ─── */
        if (t.closest('[data-close-rfq]')) {
            if (core.forms.rfqCloseConfirm) core.forms.rfqCloseConfirm();
            return;
        }

        /* ─── FD-14: ناوبری با پارامتر — ردیف استعلام/پیشنهاد ─── */
        var rfqGo = t.closest('[data-rfq-go]');
        if (rfqGo) { e.preventDefault(); go('s-sell-offer', { rfq: rfqGo.dataset.rfqGo }); return; }
        var ofrGo = t.closest('[data-ofr-go]');
        if (ofrGo) { e.preventDefault(); go('s-buy-offers', { rfq: ofrGo.dataset.ofrGo }); return; }
        var offerGo = t.closest('[data-offer-go]');
        if (offerGo) { e.preventDefault(); go('s-buy-offer-view', { offer: offerGo.dataset.offerGo }); return; }

        /* ─── ذخیرهٔ ویرایش محصول (FD-9: ثبت زنده در دیتا + اعتبار قیمت) ───
           FD-15: توضیحات هم ذخیره می‌شود (edit-note — قبلاً دور ریخته می‌شد) */
        if (t.closest('[data-edit-save]')) {
            var edParams = core.getSCREENParams()['s-sell-edit'] || {};
            var edL = null;
            core.data.listings.forEach(function (l) { if (l.id === (edParams.id || 'l1')) edL = l; });
            if (edL) {
                var edPrice = parseNum(($('#edit-price') || {}).value);
                if (edPrice) {
                    edL.price = edPrice;
                    if (edL.packCount) edL.pricePerUnit = Math.round(edPrice / edL.packCount);
                }
                var edStock = $('#edit-stock'), edMin = $('#edit-min');
                if (edStock) edL.stock = parseNum(edStock.value);
                if (edMin) edL.min = parseNum(edMin.value) || 1;
                var edNote = $('#edit-note');
                if (edNote) edL.note = edNote.value.trim();
                edL.priceValidDays = core.forms.readDaysPills('#ed-valid');
                edL.priceStale = false;
            }
            toast('تغییرات ذخیره شد', 'success');
            setTimeout(function () { back(); }, 500);
            return;
        }

        /* ─── حذف محصول از کاتالوگ ───
           FD-15: واقعاً از listings حذف می‌شود — قبلاً فقط پیام می‌آمد
           و محصول سر جایش می‌ماند (نقطه‌شکسته). */
        if (t.closest('[data-delete-item]')) {
            core.confirm({
                title: 'حذف محصول',
                text: 'این محصول از کاتالوگ شما حذف می‌شود. مطمئنی؟',
                ok: 'حذف محصول', cancel: 'انصراف', danger: true
            }).then(function (ok) {
                if (ok) {
                    var dlParams = core.getSCREENParams()['s-sell-edit'] || {};
                    var dlId = dlParams.id || 'l1';
                    core.data.listings = core.data.listings.filter(function (l) { return l.id !== dlId; });
                    toast('محصول حذف شد', 'error');
                    setTimeout(function () { core.resetStack(); show('s-catalog', false); }, 500);
                }
            });
            return;
        }

        /* ─── ذخیرهٔ کسب‌وکار ─── */
        if (t.closest('[data-save-business]')) {
            toast('تغییرات ذخیره شد', 'success');
            setTimeout(function () { back(); }, 500);
            return;
        }

        /* ─── ارسال استعلام (FD-14: rfqSendNew در app-forms —
           استعلام واقعاً به «استعلام‌های من» اضافه می‌شود) ─── */
        var rfqBtn = t.closest('[data-rfq-send]');
        if (rfqBtn && !rfqBtn.disabled) {
            if (core.forms.rfqSendNew && core.forms.rfqSendNew()) return;
        }

        /* ─── پیام سریع در چت ─── */
        var quickChip = t.closest('[data-quick-msg]');
        if (quickChip) {
            var input = $('#chat-input');
            if (input) input.value = quickChip.dataset.quickMsg;
            return;
        }

        /* ─── ارسال پیام ─── */
        if (t.closest('[data-chat-send]')) {
            var inp = $('#chat-input');
            var text = inp ? inp.value.trim() : '';
            if (!text) return;
            var body = $('#chat-body');
            if (body) {
                var msg = document.createElement('div');
                msg.className = 'msg out';
                var bub = document.createElement('div');
                bub.className = 'bub'; bub.textContent = text;
                var tm = document.createElement('span');
                tm.className = 'tm'; tm.textContent = 'همین حالا';
                msg.appendChild(bub); msg.appendChild(tm);
                body.appendChild(msg);
                body.scrollTop = body.scrollHeight;
            }
            if (inp) inp.value = '';
            return;
        }

        /* ─── تماس تلفنی ─── */
        if (t.closest('[data-dial]')) {
            toast('در حال باز کردن شماره‌گیر…', 'success');
            return;
        }

        /* ─── کارت محصول مهمان (FD-10) — لمس → صفحهٔ جزئیات کالا (۳۷)؛
             پیش‌نمایش فروشنده هم پارام preview را با خودش می‌برد ─── */
        var gCard = t.closest('[data-guest-card]');
        if (gCard) {
            var pv31 = (core.getSCREENParams()['s-catalog-guest'] || {});
            go('s-product-view', { id: gCard.dataset.lid, preview: pv31.preview ? 1 : 0 });
            return;
        }

        /* ─── اسلات عکس (placeholder) ─── */
        if (t.closest('[data-addphoto]')) {
            toast('انتخاب عکس در نسخهٔ بعدی', 'error');
            return;
        }

        /* ─── دکمهٔ «تأمین‌کنندگان بیشتر» (قفل) ───
           FD-16 (حکم مالک): به جای الرت، به صفحهٔ فعالیت‌های خرید برو —
           آن‌جا می‌بیند با چه کارهایی امتیازش به ۱۰۰ می‌رسد؛ دعوتِ
           تأمین‌کنندهٔ جدید یکی از بالاترین امتیازهاست (scoreItemsBuy). */
        if (t.closest('[data-locked-more]')) {
            core.setSCREENParams('s-network-score', { arm: 'buy' });
            go('s-network-score');
            return;
        }

        /* ─── اشتراک لیست خرید ───
           FD-16 (حکم مالک): دکمه‌های دعوت، شیت اشتراک را باز می‌کنند
           (نه فقط کپی لینک) — مخاطبین/پیام‌رسان/لینک، مثل کاتالوگ. */
        if (t.closest('[data-share-buylist]')) {
            core.openSheet('sheet-share-buylist');
            return;
        }

        /* ═══════════════════════════════════════════════════════════
           فرم افزودن محصول (سه گام)
           ═══════════════════════════════════════════════════════════ */
        var pickGood = t.closest('[data-pick-good]');
        if (pickGood) { core.forms.addPickGood(pickGood.dataset.pickGood); return; }

        var pickRef = t.closest('[data-pick-ref]');
        if (pickRef) { core.forms.addPickRef(pickRef.dataset.pickRef); return; }

        if (t.closest('#add-new-type')) {
            var qNew = ($('#add-q') || {}).value || '';
            core.forms.addOpenNewType(qNew.trim());
            return;
        }
        if (t.closest('#new-good-save')) { core.forms.addSaveNewType(); return; }
        if (t.closest('#add-change-type')) {
            core.forms.addShowStep(1);
            core.forms.addRenderStep1();
            return;
        }
        if (t.closest('#add-new-product')) { core.forms.addNewProduct(); return; }
        if (t.closest('#add-brand-pick')) { core.forms.addOpenBrandSheet(); return; }

        var pickBrandBtn = t.closest('#brand-list [data-pick-brand]');
        if (pickBrandBtn) { core.forms.addPickBrand(pickBrandBtn.dataset.pickBrand || null); return; }

        if (t.closest('[data-new-brand]')) { core.forms.addOpenNewBrand(); return; }
        if (t.closest('#new-brand-save')) { core.forms.addSaveNewBrand(); return; }
        if (t.closest('#add-save')) { core.forms.addSave(); return; }

        /* ═══ FD-15 — ابزارهای ثبت سریع (اسکنر + متن) ═══
           FD-22: سومی رسید — «کپی از کاتالوگ» (sheet-copycat) +
           تصمیم ۷/۹: بارکد ناشناس ⇒ ساخت کالا با همان کد. */
        if (t.closest('#add-scan-open')) { core.forms.scanOpen(); return; }
        if (t.closest('#add-text-open')) { core.forms.txOpen(); return; }
        if (t.closest('#add-copy-open')) { core.forms.ccOpen(); return; }
        if (t.closest('#scan-go')) { core.forms.scanGo(); return; }
        if (t.closest('#scan-demo')) { core.forms.scanDemo(); return; }
        if (t.closest('#scan-continue')) { core.forms.scanContinue(); return; }
        if (t.closest('#scan-newprod')) { core.forms.scanNewProd(); return; }
        if (t.closest('#tx-demo')) { core.forms.txDemo(); return; }
        if (t.closest('#tx-parse')) { core.forms.txParse(); return; }
        if (t.closest('#tx-back')) { core.forms.txBack(); return; }
        if (t.closest('#tx-confirm')) { core.forms.txConfirm(); return; }
        var txChk = t.closest('[data-tx-chk]');
        if (txChk) { core.forms.txToggle(parseInt(txChk.dataset.txChk, 10)); return; }

        /* ═══ FD-22 — کپی از کاتالوگ: پیدا کردن و کپی ═══ */
        if (t.closest('#cc-find-btn')) { core.forms.ccFind(); return; }
        if (t.closest('#cc-copy-btn')) { core.forms.ccCopy(); return; }
        if (t.closest('#cc-go-catalog')) {
            core.closeSheet('sheet-copycat');
            core.resetStack();
            core.show('s-catalog', false);
            return;
        }

        /* ═══ FD-22 (تصمیم ۲/۹) — سفارش از پیشنهاد پذیرفته‌شده ═══ */
        if (t.closest('[data-offer-order]')) { core.forms.offerOrderCreate(); return; }

        /* ═══════════════════════════════════════════════════════════
           تغییر گروهی و دستی قیمت‌ها
           ═══════════════════════════════════════════════════════════ */
        var pctDir = t.closest('[data-bulk-pct-dir]');
        if (pctDir) {
            var pdir = parseFloat(pctDir.dataset.bulkPctDir) || 0;
            var inpPct = $('#bulk-pct');
            var curPct = inpPct ? parseFloat(String(inpPct.value)
                .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
                .replace(/[٪%−\s]/g, '').replace('٫', '.')) : 0;
            if (isNaN(curPct)) curPct = 0;
            core.forms.bulkSetPct(curPct + pdir);
            return;
        }

        var stepBtn = t.closest('[data-bk-step]');
        if (stepBtn) {
            var row = stepBtn.closest('.bulk-row');
            if (row) {
                core.forms.bulkStep(row.dataset.bkId, parseFloat(stepBtn.dataset.bkStep) || 0);
            }
            return;
        }

        if (t.closest('#bulk-save')) { core.forms.bulkApply(); return; }

        /* ═══════════════════════════════════════════════════════════
           تبلیغات و شارژ
           ═══════════════════════════════════════════════════════════ */
        if (t.closest('#ch-send')) { core.forms.chargeSend(); return; }
    });

    /* ═══════════════════════════════════════════════════════════════
       منوی سه‌نقطهٔ تأمین‌کننده و سفارش خرید — شیت از پایین
       ─────────────────────────────────────────────────────────────
       قانون همیشگی موبایل: هیچ منویی معلق باز نمی‌شود؛ همه از پایین.
       (قبلاً core.actions دیالوگ معلق بود — طبق حکم مالک تبدیل به شیت شد)
       الگو همان sheet-cust-menu است: ردیف‌های sheet-row با آیکون و زیرمتن.
       ═══════════════════════════════════════════════════════════════ */
    var SUP = { name: null, row: null, id: null };
    var ORD = { name: null, row: null };

    /* رندر ردیف‌های شیت منو — مشترک بین هر دو منو */
    function menuSheetRowHtml(it, actAttr) {
        var bSt = it.danger ? ' style="color:var(--red)"' : '';
        var icSt = it.danger ? ' style="background:var(--red-soft);color:var(--red)"' : '';
        var sSt = it.danger ? ' style="color:#B91C1C;opacity:.75"' : '';
        return '<button class="sheet-row" type="button" ' + actAttr + '="' + it.act + '">' +
            '<span class="ico"' + icSt + '><svg><use href="#i-' + it.ic + '"/></svg></span>' +
            '<span class="tx"><b' + bSt + '>' + it.t + '</b><span' + sSt + '>' + it.s + '</span></span>' +
            '</button>';
    }

    function supMenuOpen(name, row) {
        SUP.name = name;
        SUP.row = row;
        /* FD-16: ردیف‌ها داینامیک‌اند (app-suppliers.js) — id واقعی
           تأمین‌کننده روی خود ردیف/دکمه هست؛ حذف از دیتا و رندر مجدد. */
        SUP.id = (row && row.dataset.suId) || null;
        var ttl = $('#scm-ttl');
        if (ttl) ttl.textContent = 'گزینه‌های ' + (name || 'تأمین‌کننده');
        var host = $('#scm-list');
        if (!host) return;
        var items = [
            { ic: 'msg',   t: 'گفتگو',                s: 'پیام در آی‌مچ',                            act: 'chat' },
            /* FD-16 (حکم مالک): مستقیم کاتالوگ او — نه صفحهٔ واسط */
            { ic: 'store', t: 'کاتالوگ او',            s: 'قیمت‌های زنده و کالاهایش',                 act: 'catalog' },
            { ic: 'trash', t: 'حذف از تأمین‌کنندگان',     s: '«' + (name || '') + '» از فهرست حذف می‌شود', act: 'delete', danger: true }
        ];
        host.innerHTML = items.map(function (it) { return menuSheetRowHtml(it, 'data-scm-act'); }).join('');
        core.openSheet('sheet-sup-menu');
    }

    function scmRun(act) {
        var name = SUP.name, row = SUP.row;
        core.closeSheet('sheet-sup-menu');
        if (act === 'chat') { go('s-chat'); return; }
        if (act === 'catalog') {
            if (core.suppliers && core.suppliers.openCatalog) core.suppliers.openCatalog();
            else go('s-catalog-guest');
            return;
        }
        if (act === 'delete') {
            core.confirm({
                title: 'حذف از تأمین‌کنندگان',
                text: '«' + (name || '') + '» از فهرست تأمین‌کنندگانت حذف می‌شود.',
                ok: 'حذف تأمین‌کننده', cancel: 'انصراف', danger: true
            }).then(function (ok) {
                if (!ok) return;
                /* FD-16: حذف از دیتا (نه فقط ردیف) — رندر مجدد دفتر */
                if (SUP.id && core.suppliers) {
                    core.data.suppliers = (core.data.suppliers || []).filter(function (x) { return x.id !== SUP.id; });
                    core.suppliers.render();
                    if (core.getCurrentScreen() === 's-supplier-view') core.back();
                } else if (row) {
                    row.remove();
                }
                toast('تأمین‌کننده از فهرست حذف شد', 'success');
            });
        }
    }

    var ORD = { id: null, name: null, row: null };

    function ordMenuOpen(id, row) {
        ORD.id = id;
        ORD.row = row;
        var ttl = $('#ocm-ttl');
        if (ttl) ttl.textContent = 'گزینه‌های سفارش';
        var host = $('#ocm-list');
        if (!host) return;
        var items = [
            { ic: 'msg',   t: 'گفتگو با تأمین‌کننده',     s: 'پیام در آی‌مچ',                              act: 'chat' },
            { ic: 'trash', t: 'لغو سفارش',                s: 'سفارش لغو می‌شود و تأمین‌کننده خبردار می‌شود', act: 'cancel', danger: true }
        ];
        host.innerHTML = items.map(function (it) { return menuSheetRowHtml(it, 'data-ocm-act'); }).join('');
        core.openSheet('sheet-ord-menu');
    }

    function ocmRun(act) {
        var id = ORD.id;
        core.closeSheet('sheet-ord-menu');
        if (act === 'chat') { go('s-chat'); return; }
        if (act === 'cancel') {
            /* FD-18: لغو واقعی — گذار وضعیت + اعلان + بازآرایی ۲۸ */
            if (core.forms.orderCancel) core.forms.orderCancel(id);
        }
    }


    /* ═══════════════════════════════════════════════════════════════
       حلقهٔ سراسری input
       ═══════════════════════════════════════════════════════════════ */
    document.addEventListener('input', function (e) {
        var t = e.target;
        if (!t) return;

        if (t.id === 'add-q') {
            core.forms.ADD.lastQuery = t.value;
            core.forms.addRenderStep1();
            return;
        }
        if (t.id === 'brand-q') { core.forms.addRenderBrandList(t.value); return; }
        if (t.id === 'add-price') { core.forms.addSyncPrices('package'); return; }
        if (t.id === 'add-unit-price') { core.forms.addSyncPrices('unit'); return; }
        if (t.id === 'add-pack-qty') { core.forms.addRenderPrices(); return; }

        /* ═══ FD-9: ورودی دوگانهٔ «درصد ⇄ مبلغ» ═══ */
        if (t.id === 'bulk-pct') {
            core.forms.bulkSetPct(parseFloat(String(t.value)
                .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
                .replace(/[٪%−\s]/g, '').replace('٫', '.')) || 0);
            return;
        }
        if (t.id === 'bulk-amt') {
            core.forms.bulkSetAmt(parseNum(t.value));
            return;
        }
        if (t.id === 'qp-price') { core.forms.qpPriceSet(parseNum(t.value)); return; }
        if (t.id === 'qp-pct') {
            core.forms.qpPctSet(parseFloat(String(t.value)
                .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
                .replace(/[٪%−\s]/g, '').replace('٫', '.')) || 0);
            return;
        }

        if (t.classList && t.classList.contains('bk-price')) {
            var row2 = t.closest('.bulk-row');
            if (row2) core.forms.bulkManual(row2.dataset.bkId, t.value);
            return;
        }

        if (t.id === 'contact-search') {
            var q = t.value.trim();
            $$('#contact-list .contact-row').forEach(function (row) {
                var name = row.querySelector('.contact-name').textContent;
                var meta = (row.querySelector('.contact-meta') || {}).textContent || '';
                var match = !q || (name.indexOf(q) > -1) || (meta.indexOf(q) > -1);
                row.style.display = match ? '' : 'none';
            });
            return;
        }

        if (t.id === 'offer-price' || t.dataset.ofPrice !== undefined) {
            /* FD-14: مرجع قدیمی (#offer-unit-hint-yx) وجود نداشت — هینت
               هیچ‌وقت آپدیت نمی‌شد (باگ). حالا هینت عمومیِ هر قلم.
               FD-24: ورودی‌های چندقلمی data-of-price دارند (نه id) —
               بدون این شاخه هینت قلم‌های ۲+ هیچ‌وقت زنده نمی‌شد. */
            if (core.forms.offerPriceHint) core.forms.offerPriceHint(t);
            return;
        }

        /* ═══ FD-14 — ورودی‌های فرم پیشنهاد (۱۲) و شیت انتخاب (۳۱) ═══ */
        if (t.id === 'of-chk-pct') { core.forms.offerPctSync('chk'); return; }
        if (t.id === 'of-cash-pct') { core.forms.offerPctSync('cash'); return; }
        if (t.id === 'of-chk-days') { core.forms.offerDaysSync(); return; }
        if (t.id === 'pl-search') { core.forms.picklistSearch(t.value); return; }
        /* FD-22 — مقدار خرید ردیف‌های شیت ۳۱ (در state ذنده) */
        if (t.dataset && t.dataset.plQty) { core.forms.picklistQty(t.dataset.plQty, t.value); return; }
    });

    /* ═══ FD-15: Enter در باکس بارکد = «تطبیق» — اسکنر واقعی (دستگاه
       بلوتوثی/دوربین) بعد از شماره Enter می‌فرستد؛ همین رفتار دمو ✓ */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target && e.target.id === 'scan-code') {
            e.preventDefault();
            if (core.forms && core.forms.scanGo) core.forms.scanGo();
        }
    });


    /* ═══════════════════════════════════════════════════════════════
       اجرای اولیه
       ═══════════════════════════════════════════════════════════════ */
    var init = (location.hash || '').slice(1);
    if (init) show(init, false);
    else show('s-landing', false);

})();