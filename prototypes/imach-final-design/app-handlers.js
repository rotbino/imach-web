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
            core.setSCREENParams('s-network-score', { arm: scoreBtn.dataset.scoreArm });
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

        /* ─── منوی تأمین‌کننده ─── */
        var supMenu = t.closest('[data-sup-menu]');
        if (supMenu) {
            e.stopPropagation();
            var supName = supMenu.dataset.supMenu;
            var supRow = supMenu.closest('.row');
            core.actions('گزینه‌های ' + supName, [
                { label: 'گفتگو', onClick: function () { go('s-chat'); } },
                { label: 'حذف از تأمین‌کنندگان', danger: true, onClick: function () {
                        core.confirm({
                            title: 'حذف از تأمین‌کنندگان',
                            text: '«' + supName + '» از فهرست تأمین‌کنندگانت حذف می‌شود.',
                            ok: 'حذف تأمین‌کننده', cancel: 'انصراف', danger: true
                        }).then(function (ok) {
                            if (ok) {
                                if (supRow) supRow.remove();
                                toast('تأمین‌کننده از فهرست حذف شد', 'success');
                            }
                        });
                    }}
            ]);
            return;
        }

        /* ─── منوی سفارش خرید (لغو) ─── */
        var ordCancel = t.closest('[data-order-cancel]');
        if (ordCancel) {
            e.stopPropagation();
            var ordName = ordCancel.dataset.orderCancel;
            var ordRow = ordCancel.closest('.row');
            core.actions('گزینه‌های ' + ordName, [
                { label: 'گفتگو با تأمین‌کننده', onClick: function () { go('s-chat'); } },
                { label: 'لغو سفارش', danger: true, onClick: function () {
                        core.confirm({
                            title: 'لغو سفارش',
                            text: 'سفارش «' + ordName + '» لغو می‌شود و تأمین‌کننده خبردار می‌شود.',
                            ok: 'لغو سفارش', cancel: 'انصراف', danger: true
                        }).then(function (ok) {
                            if (ok) {
                                if (ordRow) ordRow.remove();
                                toast('سفارش لغو شد', 'error');
                            }
                        });
                    }}
            ]);
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
            sw.classList.toggle('on');
            return;
        }

        /* ─── چک‌رو عمومی ─── */
        var cr = t.closest('.checkrow');
        if (cr && !t.closest('#contact-list')) {
            var cb = cr.querySelector('.checkbox');
            if (cb) cb.classList.toggle('on');
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

        /* ─── کپی لینک ─── */
        if (t.closest('[data-copy]')) { toast('لینک کاتالوگ کپی شد', 'success'); return; }

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

        /* ─── جستجو و انتخاب مخاطبین ─── */
        if (t.closest('#share-pick')) {
            core.setSCREENParams('s-contacts', { mode: 'pick', back: 's-catalog-share' });
            go('s-contacts');
            return;
        }

        /* ─── ارسال گروهی از pick mode ─── */
        if (t.closest('#pick-send')) {
            var n = $$('#contact-list .contact-check.on').length;
            if (!n) return;
            var backTo = (core.getSCREENParams()['s-contacts'] || {}).back || 's-catalog-share';
            var names2 = $$('#contact-list .contact-check.on').map(function (c) {
                var row = c.closest('.contact-row');
                return row.querySelector('.contact-name').textContent.trim().split(' ')[0];
            }).join('، ');
            core.setSCREENParams('s-catalog-share', { sent: n, names: names2 });
            core.resetStack();
            show(backTo, false).then(function () {
                var banner = $('#share-success');
                if (banner) {
                    banner.innerHTML = '<div class="success-banner"><svg><use href="#i-check"/></svg><span>کاتالوگ برای ' + faNum(n) + ' نفر ارسال شد</span></div>';
                    banner.hidden = false;
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

        /* ─── پذیرش سفارش ─── */
        if (t.closest('[data-order-accept]')) {
            toast('سفارش پذیرفته شد — مشتری خبردار شد', 'success');
            setTimeout(function () { back(); }, 700);
            return;
        }

        /* ─── رد سفارش ─── */
        if (t.closest('[data-order-reject]')) {
            core.confirm({
                title: 'رد سفارش',
                text: 'مطمئنی نمی‌خواهی این سفارش را بپذیری؟ به مشتری اطلاع داده می‌شود.',
                ok: 'رد سفارش', cancel: 'انصراف', danger: true
            }).then(function (ok) {
                if (ok) { toast('سفارش رد شد', 'error'); setTimeout(function () { back(); }, 700); }
            });
            return;
        }

        /* ─── ارسال پیشنهاد فروشنده ─── */
        if (t.closest('[data-offer-send]')) {
            toast('پیشنهاد برای مشتری ارسال شد', 'success');
            setTimeout(function () { back(); }, 700);
            return;
        }

        /* ─── پذیرش پیشنهاد خریدار ─── */
        if (t.closest('[data-accept-offer]')) {
            core.confirm({
                title: 'پذیرش پیشنهاد',
                text: 'این پیشنهاد را می‌پذیری؟ فروشنده خبردار می‌شود و برای هماهنگی با تو تماس می‌گیرد.',
                ok: 'بله، می‌پذیرم', cancel: 'انصراف'
            }).then(function (ok) {
                if (ok) { toast('پیشنهاد پذیرفته شد — فروشنده خبردار شد', 'success'); setTimeout(function () { back(); }, 700); }
            });
            return;
        }

        /* ─── ذخیرهٔ ویرایش محصول ─── */
        if (t.closest('[data-edit-save]')) {
            toast('تغییرات ذخیره شد', 'success');
            setTimeout(function () { back(); }, 500);
            return;
        }

        /* ─── حذف محصول از کاتالوگ ─── */
        if (t.closest('[data-delete-item]')) {
            core.confirm({
                title: 'حذف محصول',
                text: 'این محصول از کاتالوگ شما حذف می‌شود. مطمئنی؟',
                ok: 'حذف محصول', cancel: 'انصراف', danger: true
            }).then(function (ok) {
                if (ok) {
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

        /* ─── ارسال استعلام ─── */
        var rfqBtn = t.closest('[data-rfq-send]');
        if (rfqBtn && !rfqBtn.disabled) {
            rfqBtn.disabled = true;
            rfqBtn.textContent = 'ارسال شد ✓';
            toast('استعلام قیمت برای ۳ تأمین‌کننده ارسال شد', 'success');
            setTimeout(function () { core.resetStack(); show('s-buy-rfqs', false); }, 800);
            return;
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

        /* ─── کارت مهمان ─── */
        if (t.closest('[data-guest-card]')) {
            var pb = $('#guest-priv');
            if (pb && !pb.hidden) {
                pb.scrollIntoView({ behavior: 'smooth', block: 'center' });
                pb.style.transition = 'box-shadow .25s';
                pb.style.boxShadow = '0 0 0 4px rgba(249,115,22,.25)';
                setTimeout(function () { pb.style.boxShadow = ''; }, 900);
            }
            return;
        }

        /* ─── اسلات عکس (placeholder) ─── */
        if (t.closest('[data-addphoto]')) {
            toast('انتخاب عکس در نسخهٔ بعدی', 'error');
            return;
        }

        /* ─── دکمهٔ «تأمین‌کنندگان بیشتر» (قفل) ─── */
        if (t.closest('[data-locked-more]')) {
            toast('برای دیدن تأمین‌کنندگان بیشتر، امتیاز فعالیت خریدت را به ۱۰۰ برسان', 'error');
            return;
        }

        /* ─── اشتراک لیست خرید ─── */
        if (t.closest('[data-share-buylist]')) {
            toast('لینک لیست خرید کپی شد — برای تأمین‌کنندگانت بفرست', 'success');
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

        if (t.id === 'offer-price') {
            var price = parseNum(t.value);
            var hint = $('#offer-unit-hint-yx');
            if (hint) {
                if (!price) hint.textContent = 'قیمت را وارد کن تا معادلش را ببینی';
                else {
                    var perKg = Math.round(price / 50);
                    hint.innerHTML = 'هر کیلوگرم ≈ <b>' + faMoney(perKg) + ' تومان</b> · برای ۲۰ کیسه: <b>' + faMoney(price * 20) + ' تومان</b>';
                }
            }
            return;
        }
    });


    /* ═══════════════════════════════════════════════════════════════
       اجرای اولیه
       ═══════════════════════════════════════════════════════════════ */
    var init = (location.hash || '').slice(1);
    if (init) show(init, false);
    else show('s-landing', false);

})();