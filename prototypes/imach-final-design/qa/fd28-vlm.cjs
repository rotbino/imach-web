/* FD-28 VLM verify — بازطراحی دسکتاپ صفحه‌به‌صفحه */
const ZAI = require('z-ai-web-dev-sdk').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/shots-fd28/';

const PROMPTS = {
  'after-landing.png': 'بالای صفحهٔ لندینگ دسکتاپ محصول B2B فارسی. حرفه‌ای و مینیمال است؟ مشکل جدی چیدمان/تراز/فاصله؟ فقط نکات مهم.',
  'after-landing-sec.png': 'بخش میانی لندینگ: دو کارت ویژگی فروشنده/خریدار کنار هم + شروع بخش نماینده. متوازن و تمیز است؟',
  'after-landing-rep.png': 'بخش همکاران فروش لندینگ: سربرگ وسچ + سه کارت گام کنار هم. تمیز است؟',
  'after-landing-cta.png': 'پایین لندینگ: CTA گرادیانی وسچ + فوتر. حرفه‌ای است؟',
  'after-login.png': 'صفحه ورود دسکتاپ: اسپلیت کارت فرم سفید + پانل برند نارنجی چپ. استاندارد و حرفه‌ای است؟',
  'after-signup.png': 'صفحه ثبت‌نام دسکتاپ اسپلیت. حرفه‌ای است؟ مشکل جدی دارد؟',
  'after-desk.png': 'میز خرید دسکتاپ: سایدبار راست + چهار کاشی + تسک‌های تک‌ستونه با شماره ترتیب. مرتب و حرفه‌ای است؟',
  'after-sell-desk.png': 'میز فروش دسکتاپ با سایدبار. مرتب است؟',
  'after-catalog.png': 'کاتالوگ دسکتاپ: نوار ابزار + گرید کالا چندستونه. حرفه‌ای است؟',
  'after-catalog-scroll.png': 'گرید کالای کاتالوگ در دسکتاپ. تمیز و یکنواخت است؟',
  'after-product.png': 'صفحه کالا دسکتاپ: گالری چپ + مشخصات راست. حرفه‌ای است؟',
  'after-buylist.png': 'لیست خرید دسکتاپ: نوار چهار دکمه + ردیف‌های پهن. تمیز است؟',
  'after-rfq-new.png': 'فرم استعلام جدید دسکتاپ دوستونه: کالاها راست + گیرندگان چپ. حرفه‌ای است؟',
  'after-offers.png': 'لیست پیشنهادها دسکتاپ: گرید ۲ستونه کارت. تمیز است؟',
  'after-chat.png': 'چت دسکتاپ: ستون وسچ ۹۰۰. مثل اپ پیام‌رسان دسکتاپ است؟',
  'after-orders.png': 'لیست سفارش‌های دسکتاپ: ردیف‌های پهن. تمیز است؟',
  'after-order-view.png': 'جزئیات سفارش دسکتاپ دوستونه: کارت راست + جریان چپ. حرفه‌ای است؟',
  'after-customers.png': 'دفتر مشتریان دسکتاپ: جستجو + فیلتر + ردیف‌های پهن. تمیز است؟',
  'after-profile.png': 'پروفایل دسکتاپ دوستونه: کارت پروفایل راست + بخش‌ها چپ. حرفه‌ای است؟',
  'after-notifs.png': 'اعلان‌های دسکتاپ ستون باریک وسچ. تمیز است؟',
  'after-supplier.png': 'صفحه تأمین‌کننده دسکتاپ دوستونه. حرفه‌ای است؟',
  'after-msgs.png': 'پیام‌های دسکتاپ: ردیف‌های گفتگو. تمیز است؟',
  'after-contacts.png': 'دفتر مخاطبین دسکتاپ. تمیز است؟'
};

async function check(zai, file, prompt) {
  const b64 = fs.readFileSync(DIR + file).toString('base64');
  try {
    const r = await zai.chat.completions.createVision({
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
        { type: 'text', text: prompt }
      ] }],
      max_tokens: 200
    });
    const txt = (r.choices[0].message.content || '').trim();
    const bad = /(هم‌پوشان|روی هم|ریخته|به‌هم|کج شده|افتن|شکسته|ناخوانا|غیرحرفه‌ای|overlapping|broken|misaligned)/.test(txt) && !/(مشکل جدی ندارد|بدون مشکل)/.test(txt);
    console.log((bad ? '⚠  ' : '✓  ') + file + ' → ' + txt.replace(/\n/g, ' ').slice(0, 170));
    return !bad;
  } catch (e) { console.log('ERR ' + file + ': ' + String(e.message).slice(0, 90)); return false; }
}

(async () => {
  const zai = await ZAI.create();
  const files = process.argv.slice(2);
  let ok = 0;
  for (const f of files) {
    if (!fs.existsSync(DIR + f)) { console.log('MISS ' + f); continue; }
    if (await check(zai, f, PROMPTS[f] || 'اسکرین‌شات دسکتاپ؛ مشکل جدی چیدمان دارد؟ کوتاه.')) ok++;
  }
  console.log('\n=== FD-28 VLM: ' + ok + '/' + files.length + ' ===');
})();
