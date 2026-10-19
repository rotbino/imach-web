/* FD-35 VLM verify — کاتالوگ (نوار ابزار) + بوم/کاغذ سراسری */
const ZAI = require('z-ai-web-dev-sdk').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/shots-fd35/';

const PROMPTS = {
  's-catalog.png': 'کاتالوک دسکتاپ: نوار جستجو با دکمهٔ نارنجی «محصول جدید» کنارش + ردیف ۴ دکمه (ویژه کردن/تغییر قیمت‌ها/پیشنمایش/اشتراک‌گذاری) + چیپ‌ها + گرید کالا. محتوا داخل یک کاغذ روشن با قاب لبه‌گرد نشسته و پشت آن زمینهٔ کمی خاکستری‌تر است؟ چیدمان/تراز مشکل جدی دارد؟',
  's-catalog-scroll.png': 'گرید کالای کاتالوک دسکتاپ داخل کاغذ لبه‌گرد. یکنواخت و تمیز است؟',
  's-home-sell.png': 'میز فروش دسکتاپ: سایدبار راست + محتوای «دسترسی سریع» (کاشی‌ها و کارت‌های تسک) داخل کاغذ روشن با حاشیهٔ زمینهٔ متفاوت. مرتب و حرفه‌ای است؟',
  's-contacts.png': 'دفتر مخاطبین دسکتاپ: ردیف‌های کارت داخل کاغذ لبه‌گرد روی زمینهٔ متمایز. تمیز است؟',
  's-charge.png': 'فرم شارژ دسکتاپ: فرم ستون ۶۲۰ داخل کاغذ روشن قاب‌دار. حرفه‌ای و مرتب است؟',
  's-buy-rfq-new.png': 'فرم استعلام دسکتاپ دوستونه داخل کاغذ: کالاها راست + گیرندگان چپ. داخل قاب کاغذ نشسته؟ مشکل جدی؟',
  's-product-view.png': 'صفحه کالا دسکتاپ دوستونه داخل کاغذ. حرفه‌ای است؟',
  's-buy-offers.png': 'پیشنهادهای خرید دسکتاپ: گرید کارت‌ها داخل کاغذ. تمیز است؟',
  'm-catalog.png': 'کاتالوک موبایل: بالای صفحه نوار جستجو + دکمهٔ نارنجی «محصول جدید» کنار هم، بعد ۴ دکمهٔ دو ستونی، بعد چیپ‌ها و کارت‌ها. دکمهٔ نارنجی کاملاً دیده می‌شود؟ چیزی بیرون نزده؟',
  'm-catalog-promo.png': 'کاتالوک موبایل با حالت ویژه فعال: دکمهٔ «ویژه فعال است» سبز شده و بج «ویژه» روی کارت‌ها نشسته؟ مشکل چیدمان؟'
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
    if (await check(zai, f, PROMPTS[f] || 'اسکرین‌شات؛ مشکل جدی چیدمان دارد؟ کوتاه.')) ok++;
  }
  console.log('\n=== FD-35 VLM: ' + ok + '/' + files.length + ' ===');
})();
