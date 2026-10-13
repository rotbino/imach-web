// فاز ۵۱ — QA رفتاری: تکمیل استعلام→پیشنهاد (پرداخت نقدی+چک، تحویل در محل، جزئیات پیشنهاد ۴۸)
// + کاتالوگ (قیمت به‌جای قیمت پایه، پلهٔ حداقل خرید، تعداد تماس، اعتبار قیمت، ردیف ویرایش ۴۴، قیمت منقضی ۰۹)
import { chromium } from 'playwright';

const FILE = 'file://' + process.cwd() + '/index.html';
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + name); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(FILE);
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));

/* ═══ ۱. فرم پیشنهاد (sheet-reqview) — پرداخت: نقدی ضمنی + سوییچ چک ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(300);
await page.click('#scr-05 .req-card[data-req="rq1"]'); await sleep(350);
ok('reqview: مودال باز شد', await page.locator('#sheet-reqview.show').isVisible());
ok('reqview: سوییچ «چک هم قبول می‌کنم» هست', await page.locator('#reqv-chk').count() === 1);
ok('reqview: سوییچ «تحویل در محل» هست', await page.locator('#reqv-dlv').count() === 1);
ok('reqview: بدون پیل‌های پرداخت قدیمی (نقدی/چک صیادی/عندالتحویل)', (await page.locator('#reqv-pay').count()) === 0 && (await page.locator('#reqv-ship').count()) === 0);
ok('reqview: بدون «باربری خریدار»', !(await page.locator('#sheet-reqview').textContent()).includes('باربری خریدار'));
ok('reqview: نقدی چیز دیگری نوشته نشده (ضمنی)', !(await page.locator('#sheet-reqview .reqv-tg').first().textContent()).includes('نقدی'));
ok('reqview: rq1 چک خاموش → جزئیات چک مخفی', await page.locator('#reqv-chkbox').isHidden());
await page.click('#reqv-chk'); await sleep(200);
ok('reqview: روشن‌کردن چک → درصد + سررسید ظاهر شد', await page.locator('#reqv-chkbox').isVisible());
ok('reqview: درصد نقدی/چک مکمل (۳۰+۷۰)', (await page.locator('#reqv-cash').inputValue()) === '۳۰' && (await page.locator('#reqv-chkpct').inputValue()) === '۷۰');
await page.fill('#reqv-cash', '۲۰'); await sleep(200);
ok('reqview: نقدی ۲۰ → چک خودکار ۸۰ (پیوسته)', (await page.locator('#reqv-chkpct').inputValue()) === '۸۰');
ok('reqview: جمع‌بندی خوانا «۲۰٪ نقدی و بقیه چک تا ۳۰ روز»', (await page.locator('#reqv-paysum-t').textContent()) === '۲۰٪ نقدی و بقیه چک تا ۳۰ روز');
await page.fill('#reqv-chkpct', '۵۰'); await sleep(200);
ok('reqview: چک ۵۰ → نقدی خودکار ۵۰', (await page.locator('#reqv-cash').inputValue()) === '۵۰');
await page.fill('#reqv-days', '۴۵'); await sleep(150);
ok('reqview: سررسید در جمع‌بندی می‌نشیند', (await page.locator('#reqv-paysum-t').textContent()).includes('تا ۴۵ روز'));
await page.click('#reqv-chk'); await sleep(150);
ok('reqview: خاموش‌کردن چک → جزئیات جمع شد', await page.locator('#reqv-chkbox').isHidden());
await page.click('#reqv-chk'); await sleep(150);

/* ═══ ۲. rq3 — پیشنهاد پاسخ‌داده: شرایط از قبل پر ═══ */
await page.click('#sheet-reqview .mg'); await sleep(250);
await page.click('#scr-05 .req-card[data-req="rq3"]'); await sleep(350);
ok('reqview: rq3 چک روشن از دیتا', await page.locator('#reqv-chk.on').count() === 1 && await page.locator('#reqv-chkbox').isVisible());
ok('reqview: rq3 تحویل در محل روشن', await page.locator('#reqv-dlv.on').count() === 1);
ok('reqview: rq3 درصد ۳۰/۷۰ + سررسید ۳۰', (await page.locator('#reqv-cash').inputValue()) === '۳۰' && (await page.locator('#reqv-days').inputValue()) === '۳۰');
ok('reqview: rq3 جمع‌بندی «۳۰٪ نقدی و بقیه چک تا ۳۰ روز»', (await page.locator('#reqv-paysum-t').textContent()) === '۳۰٪ نقدی و بقیه چک تا ۳۰ روز');
await page.click('#sheet-reqview .mg'); await sleep(250);

/* ═══ ۳. ۴۸ — هدر برجسته + کارت مقایسه‌ای + شیت جزئیات پیشنهاد ═══ */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('#scr-45 .inq-card[data-inq="inq1"]'); await sleep(400);
ok('۴۸: هدر ثابت «پیشنهادات برای استعلام» (فاز ۵۹)', (await page.locator('#of48-t').textContent()).trim().startsWith('پیشنهادات برای استعلام') && !(await page.locator('#of48-t').textContent()).includes('برنج هاشمی'));
ok('۴۸: بنر بدنه شناسهٔ استعلام را دارد (فاز ۵۹)', (await page.locator('#of48-meta').textContent()).includes('برنج هاشمی · ۲۰ کیسهٔ ۵۰ کیلویی') && (await page.locator('#of48-meta').textContent()).includes('۳ روز مانده'));
const cards = page.locator('#of48-list .card');
ok('۴۸: ۳ کارت پیشنهاد', await cards.count() === 3);
const cardTxt = await cards.first().textContent();
ok('۴۸: کارت بدون شرایط/توضیح (مقایسهٔ سریع)', !cardTxt.includes('چک') && !cardTxt.includes('برنج امسال'));
ok('۴۸: کارت بدون دکمه‌های گفتگو/کاتالوگ', !(await cards.first().locator('[data-go="19"]').count()) && !(await cards.first().locator('[data-go="13"]').count()));
ok('۴۸: کارت لینک «جزئیات، شرایط و تماس» دارد', cardTxt.includes('جزئیات، شرایط و تماس'));
await page.click('#of48-list .card[data-ofv="0"]'); await sleep(350);
ok('ofview: شیت جزئیات پیشنهاد باز شد', await page.locator('#sheet-ofview.show').isVisible());
const ofvTxt = await page.locator('#sheet-ofview').textContent();
ok('ofview: پرداخت «۲۰٪ نقدی و بقیه چک تا ۳۰ روز»', ofvTxt.includes('۲۰٪ نقدی و بقیه چک تا ۳۰ روز'));
ok('ofview: تحویل در محل', ofvTxt.includes('تحویل در محل'));
ok('ofview: حداقل خرید', ofvTxt.includes('حداقل ۵ کیسه'));
ok('ofview: توضیح فروشنده', ofvTxt.includes('برنج امسال، پاک‌شده'));
ok('ofview: سه اکشن تماس/کاتالوک/گفتگو', (await page.locator('#sheet-ofview .oc-acts .btn').count()) === 3);
await page.click('#sheet-ofview .mg'); await sleep(250);
/* چندقلمی + پیشنهاد بدون چک */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('#scr-45 .inq-card[data-inq="inq2"]'); await sleep(400);
await page.click('#of48-list .card[data-ofv="1"]'); await sleep(350);
const ofv2 = await page.locator('#sheet-ofview').textContent();
ok('ofview: پخش برنج پارس (چندقلمی) پرداخت نقدی', ofv2.includes('پرداخت نقدی'));
ok('ofview: تحویل حضوری از محل فروشنده', ofv2.includes('تحویل حضوری از محل فروشنده'));
ok('ofview: پوشش ۲ از ۳ قلم', ofv2.includes('۲ از ۳ قلم'));
await page.click('#sheet-ofview .mg'); await sleep(250);

/* ═══ ۳-ب. حلقهٔ بستهٔ فروشنده→خریدار (ادغام شاخهٔ موازی: rqvSyncBuyerOffer) ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(300);
await page.click('#scr-05 .req-card[data-req="rq1"]'); await sleep(350);
await page.fill('#sheet-reqview .reqv-price >> nth=0', '2900000'); await sleep(150);
await page.click('#reqv-chk'); await sleep(200);
await page.fill('#reqv-cash', '25'); await sleep(150);
await page.fill('#reqv-days', '45'); await sleep(150);
await page.click('#reqv-dlv'); await sleep(150);
await page.fill('#reqv-note2', 'برنج تازه — ارسال همان روز'); await sleep(150);
await page.click('#reqv-send'); await sleep(1100);
ok('حلقه: کارت ۰۵ همان لحظه «پاسخ داده‌شده»', (await page.locator('#scr-05 .req-card[data-req="rq1"] .req-top .badge').textContent()).includes('پاسخ داده‌شده'));
/* ناوبری بدون reload — دیتای هم‌گام‌شده در حافظه است */
await page.evaluate(() => { location.hash = '#45'; }); await sleep(350);
await page.click('#scr-45 .inq-card[data-inq="inq1"]'); await sleep(400);
const loopCard = await page.locator('#of48-list .card[data-ofv="0"]').textContent();
ok('حلقه: قیمت تازهٔ فروشنده در کارت ۴۸ (۲٬۹۰۰٬۰۰۰)', loopCard.includes('۲٬۹۰۰٬۰۰۰'));
await page.click('#of48-list .card[data-ofv="0"]'); await sleep(350);
const loopOfv = await page.locator('#sheet-ofview').textContent();
ok('حلقه: ofview پرداخت «۲۵٪ نقدی و بقیه چک تا ۴۵ روز»', loopOfv.includes('۲۵٪ نقدی و بقیه چک تا ۴۵ روز'));
ok('حلقه: ofview تحویل در محل روشن شد', loopOfv.includes('تحویل در محل') && !loopOfv.includes('تحویل حضوری از محل فروشنده'));
ok('حلقه: ofview توضیح تازهٔ فروشنده', loopOfv.includes('برنج تازه — ارسال همان روز'));
await page.click('#sheet-ofview .mg'); await sleep(250);

/* ═══ ۴. ۱۲ — مهلت: ۱-۴ روز + «بیشتر» ═══ */
await page.goto(FILE + '#12'); await page.reload(); await sleep(300);
ok('۱۲: ۴ دکمهٔ روز + «بیشتر»', (await page.locator('#iq-deadline .pill').count()) === 5 && (await page.locator('#iq-deadline .pill').last().textContent()) === 'بیشتر');
ok('۱۲: پیش‌فرض ۳ روز (فاز ۵۷)', (await page.locator('#iq-deadline .pill.active').textContent()).includes('۳ روز') && await page.locator('#iq-dlbox.open').count() === 0);
await page.click('#iq-deadline .pill:nth-child(1)'); await sleep(150);
ok('۱۲: ۱ روز → ورودی جمع شد', (await page.locator('#iq-deadline .pill.active').textContent()).includes('۱ روز') && await page.locator('#iq-dlbox.open').count() === 0);
await page.click('#iq-dlmore'); await sleep(150);
ok('۱۲: «بیشتر» → ورودی برگشت', await page.locator('#iq-dlbox.open').count() === 1);

/* ═══ ۵. کاتالوگ — قیمت (نه قیمت پایه) + پلهٔ حداقل خرید ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
await page.click('#scr-01 .pcard .gear'); await sleep(350);
ok('quickps: برچسب «قیمت» (بدون پایه)', (await page.locator('#sheet-quickps label').first().textContent()).includes('قیمت — تومان'));
ok('quickps: اعتبار این‌جا نیست — فقط در ۴۴ (فاز ۵۲)', (await page.locator('#qp-valid').count()) === 0 && !(await page.locator('#sheet-quickps .hintnote').count()));
ok('quickps: سه فیلد خالص — قیمت/موجودی/حداقل خرید', (await page.locator('#sheet-quickps .field').count()) === 3);
await page.click('#sheet-quickps .btn[data-close]'); await sleep(250);
/* فاز ۵۲ — کادر اشتراک + ردیف افزودن/تمدید + تنظیمات کنار جستجو + بج قیمت منقضی */
const promoTxt = await page.locator('#scr-01 .cat-promo').textContent();
ok('کاتالوگ: کادر اشتراک با عنوان مالک', promoTxt.includes('کاتالوگ ویترین قیمتهای زنده شماست، به اشتراکش بگذار'));
ok('کاتالوگ: زیرمتن (فاز ۶۰ — ذخیره + «تأمین‌کنندگان من»)', promoTxt.includes('کاتالوگ شما را ذخیره کنند') && promoTxt.includes('تأمین‌کنندگان من'));
ok('کاتالوگ: فقط اشتراک داخل کادر — چشم به باکس آمار رفت (فاز ۵۵)', (await page.locator('#scr-01 .cat-promo [data-sheet="sheet-share"]').count()) === 1 && (await page.locator('#scr-01 .cat-promo [data-go="13"]').count()) === 0 && (await page.locator('#scr-01 .cat-stats button[data-go="13"]').count()) === 1);
ok('کاتالوگ: ویترین بدون آیکون (سه‌تایی رفتند)', (await page.locator('#scr-01 .showcase .icon-btn').count()) === 0);
ok('کاتالوگ: افزودن کالای جدید + تمدید سریع کنار هم بالای جستجو', (await page.locator('#scr-01 .cat-addrow .add-btn').isVisible()) && (await page.locator('#scr-01 .cat-addrow .renew-btn[data-go="44"]').isVisible()));
ok('کاتالوگ: متن دکمه‌ها نمی‌شکند', (await page.evaluate(() => { const b = document.querySelectorAll('#scr-01 .cat-addrow .btn'); return Array.from(b).every(x => x.scrollWidth <= x.clientWidth + 1 && x.scrollHeight <= x.clientHeight + 1); })));
ok('کاتالوگ: تنظیمات کنار جستجو', (await page.locator('#scr-01 .icon-btn[data-sheet="sheet-cset"]').count()) === 1);
ok('کاتالوگ: بج «قیمت منقضی» کنار چرخ‌دنده (نمونهٔ طارم)', (await page.locator('#scr-01 .pcard .stale-bdg').count()) === 1 && (await page.locator('#scr-01 .stale-bdg').textContent()).includes('قیمت منقضی'));
ok('کاتالوگ: نوار تمام‌عرض گروهی حذف شد', (await page.locator('#scr-01 .bulk-bar').count()) === 0);
await page.goto(FILE + '#02'); await page.reload(); await sleep(300);
const tierTxt = await page.locator('#scr-02').textContent();
ok('۰۲: پلهٔ اول = حداقل خرید بدون تخفیف (۲٬۸۵۰٬۰۰۰)', tierTxt.includes('حداقل خرید — بدون تخفیف') && tierTxt.includes('۵ کیسه به بالا'));
ok('۰۲: بج «۲ پلهٔ تخفیف»', tierTxt.includes('۲ پلهٔ تخفیف'));
ok('۰۲: آمار فروشنده «۳۸ تماس» (نه مشتری)', tierTxt.includes('۳۸ تماس') && !tierTxt.includes('۳۸ مشتری'));

/* ═══ ۶. ۱۳ — آمار تماس + قیمت ساده + اشتراک ═══ */
await page.goto(FILE + '#13'); await page.reload(); await sleep(300);
const t13 = await page.locator('#scr-13').textContent();
/* فاز ۶۱-همگام: دامنهٔ چک به نوار pub-stats تنگ شد — بنر درگاه کاتالوگ خصوصی واژگان «مشتریان» را برمی‌گرداند (حکم فاز ۶۰/۶۱) */
const ps13 = await page.locator('#scr-13 .pub-stats').textContent();
ok('۱۳: آمار «۱۸ تماس» جایگزین مشتری (نوار pub-stats)', ps13.includes('۱۸ تماس') && !ps13.includes('مشتری'));
ok('۱۳: قیمت کارت ساده (بدون old-p خط‌خورده)', (await page.locator('#scr-13 .old-p').count()) === 0 && t13.includes('۲٬۸۵۰٬۰۰۰'));
await page.click('#scr-13 .subheader .icon-btn[aria-label="اشتراک"]'); await sleep(300);
ok('share: متن جدید «لینک کاتالوگ خودت رو برای مشتریانت ارسال کن»', (await page.locator('#sheet-share .sub').textContent()).includes('لینک کاتالوگ خودت رو برای مشتریانت ارسال کن'));
await page.click('#sheet-share .btn[data-close]'); await sleep(250);

/* ═══ ۷. ۰۷ — کاتالوگ شما نزد خریداران + شیت کیا ذخیره/تماس ═══ */
await page.goto(FILE + '#07'); await page.reload(); await sleep(300);
ok('۰۷: ردیف «مشتریان شما» (فاز ۶۰)', (await page.locator('#scr-07').textContent()).includes('مشتریان شما'));
ok('۰۷: فاز ۶۰ — مشتری‌شدنِ ذخیره‌کننده صریح شد', (await page.locator('#scr-07').textContent()).includes('مشتری شما می‌شود'));
await page.click('#scr-07 [data-sheet="sheet-reach"]'); await sleep(300);
const reach = await page.locator('#sheet-reach').textContent();
ok('reach: شیت باز + «مشتریان شما» (فاز ۶۰)', await page.locator('#sheet-reach.show').isVisible() && reach.includes('مشتریان شما'));
ok('reach: کیا تماس گرفته‌اند', reach.includes('تماس گرفته‌اند'));
ok('reach: ردیف رستوران مهر', reach.includes('رستوران مهر'));
await page.click('#sheet-reach .btn[data-close]'); await sleep(250);

/* ═══ ۸. ۴۴ — اعتبار + ردیف ویرایش (خلاصه؛ جزئیات در p44/p48) ═══ */
await page.goto(FILE + '#44'); await page.reload(); await sleep(300);
ok('۴۴: اعتبار قیمت‌ها با یادآوری', (await page.locator('#bk-valid .pill.active').textContent()) === '۵ روز' && (await page.locator('#scr-44 .hint').first().textContent()).includes('شرایط مشابه'));
await page.click('#bk-need'); await sleep(200);
ok('۴۴: سه دکمه [انصراف|ذخیره|تغییر درصدی] + ذخیره دیزیبل (فاز ۵۲)', await page.locator('#bk-editbar').isVisible() && await page.locator('#bk-save').isDisabled() && (await page.locator('#bk-save').textContent()).includes('ذخیره') && (await page.locator('#bk-editbar .bk-pctbtn').textContent()).includes('تغییر درصدی'));
ok('۴۴: «تغییر درصدی» دکمه است نه آیکون', (await page.locator('#bk-editbar .bk-pctbtn.btn').count()) === 1 && (await page.locator('#bk-editbar .icon-btn').count()) === 0);
await page.click('#bk-editbar .bk-pctbtn'); await sleep(200);
ok('۴۴: دکمهٔ درصدی پنل را باز می‌کند', await page.locator('#bk-pctbar').isVisible());
await page.click('#bk-pctbar [data-pctstep="0.5"]'); await sleep(150);
await page.click('#bk-pctbar [data-pctstep="0.5"]'); await sleep(200);
ok('۴۴: ذخیره بعد از تغییر درصدی انیبل شد', !(await page.locator('#bk-save').isDisabled()));
await page.click('#bk-cancel'); await sleep(200);
ok('۴۴: انصراف → انتخاب نیت برگشت', await page.locator('#bk-choice').isVisible());

/* ═══ ۹. ۰۹ — قیمت منقضی: حذف از صدر + خط‌خورده ═══ */
await page.goto(FILE + '#09'); await page.reload(); await sleep(300);
ok('۰۹: ردیف «قیمت قدیمی دارد» هست', (await page.locator('#scr-09').textContent()).includes('قیمت قدیمی دارد'));
ok('۰۹: کیان غلات در صدر تابلو نیست (hidden)', await page.locator('#stale-sup').isHidden());
await page.click('#scr-09 .stale-bar'); await sleep(200);
ok('۰۹: گشودن → کارت کیان با قیمت خط‌خورده', (await page.locator('#stale-sup').textContent()).includes('کیان غلات') && (await page.locator('#stale-sup .price-stale').count()) === 1);
ok('۰۹: بج «قیمت قدیمی — ۱۱ روز»', (await page.locator('#stale-sup').textContent()).includes('قیمت قدیمی — ۱۱ روز'));

/* ═══ ۱۰. priceinfo — مفهوم جدید «قیمت و حداقل خرید» ═══ */
await page.goto(FILE + '#04'); await page.reload(); await sleep(300);
await page.fill('#gf-q', 'هاشمی'); await sleep(250);
await page.locator('#scr-04 .gf-row').first().click(); await sleep(300);
const piBtn = page.locator('#scr-04 [data-sheet="sheet-priceinfo"]');
ok('۰۴: دکمهٔ ℹ قیمت هست', (await piBtn.count()) >= 1);
if ((await piBtn.count()) >= 1) {
  await piBtn.first().click(); await sleep(250);
  const pi = await page.locator('#sheet-priceinfo').textContent();
  ok('priceinfo: عنوان «قیمت و حداقل خرید» (نه قیمت پایه)', pi.includes('قیمت و حداقل خرید') && !pi.includes('قیمت پایه چیست'));
  ok('priceinfo: پلهٔ اول تخفیف صفر توضیح داده شده', pi.includes('تخفیف صفر'));
  await page.click('#sheet-priceinfo .btn[data-close]'); await sleep(200);
}

/* ═══ ۱۱. sheet-ptier — پلهٔ حداقل خرید قفل ═══ */
await page.goto(FILE + '#02'); await page.reload(); await sleep(300);
await page.evaluate(() => { document.getElementById('phone').dataset.arm = 'sell'; var o = document.getElementById('own-02'); if (o) o.hidden = false; });
await sleep(150);
const ptBtn = page.locator('#scr-02 [data-sheet="sheet-ptier"]');
if ((await ptBtn.count()) >= 1) {
  await ptBtn.first().click(); await sleep(300);
  const pt = await page.locator('#sheet-ptier').textContent();
  ok('ptier: پلهٔ «حداقل خرید» قفل با تخفیف صفر', pt.includes('حداقل خرید') && (await page.locator('#sheet-ptier .pctw input[disabled]').count()) === 1);
  ok('ptier: پله‌های ۲۰/۵۰ کیلویی editable', (await page.locator('#sheet-ptier .pctw input:not([disabled])').count()) === 2);
  await page.click('#sheet-ptier .btn[data-close]'); await sleep(200);
} else {
  ok('ptier: دکمهٔ تخفیف پلکانی از ۰۲ (بازوی فروش)', false);
}

/* ═══ ساختار + کنسول ═══ */
const sheetCount = await page.locator('.sheet').count();
ok('ساختار: شیت‌ها داخل #phone', (await page.locator('body > .sheet').count()) === 0);
ok('ساختار: شیت جزئیات پیشنهاد و reach ثبت شدند', (await page.locator('#sheet-ofview').count()) === 1 && (await page.locator('#sheet-reach').count()) === 1);
console.log('  شیت‌ها: ' + sheetCount);
ok('کنسول: بدون خطا', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5));

await browser.close();
console.log('\n═══ فاز ۵۱ ═══');
console.log('PASS: ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
