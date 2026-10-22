/* فیکس‌بچ M3 — VLM چشمی روی شات‌های e2e */
const ZAI = require('/home/z/.bun/install/cache/z-ai-web-dev-sdk/0.0.18@@@1/dist/index.js').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/imach-web/shots-fix2/';

const PROMPTS = {
  '01-login.png': 'فرم ورود فارسی RTL دسکتاپ: لوگو و عنوان وسط‌چین بالای کارت؟ فیلد شماره با پرچم ایران؟ مشکلات جدی چیدمان؟ فقط نکات مهم.',
  '02-sell-desk.png': 'میز فروش فارسی RTL دسکتاپ: چهار کاشی شبه‌مربع دسترسی سریع (کاتالوگ/مشتریان/سفارشات/درخواست‌ها) با فقط عدد بزرگ و آیکون ساده بدون قاب رنگی؟ کارت‌های اقدام نه خیلی دراز؟ شورون کارت‌ها به بیرون (چپ) اشاره می‌کند؟ مرتب و مینیمال است؟',
  '03-cats-sheet.png': 'شیت مدیریت دسته‌بندی‌ها از پایین باز در فارسی: فهرست دسته + input دسته جدید + سوییچ «نشان نده»؟ تمیز است؟',
  '04-selladd-cta.png': 'فرم افزودن کالا: جستجوی بی‌نتیجه با پیام «پیدا نشد» و دکمه برند‌رنگ (نارنجی) ثبت نوع کالای جدید زیر لیست خالی؟',
  '05-brand-step3.png': 'گام ۳ فرم ثبت کالا فارسی: کارت محصول + فیلدهای عنوان/برند پیش‌پر + قیمت/موجودی؟',
  '06-item-edit.png': 'فرم ویرایش محصول فارسی RTL: عکس‌های گالری با کاشی افزودن + قیمت/موجودی + بخش تخفیف حجمی با پله + بخش تخفیف مشتری + کارت قرمز حذف؟ همه بخش‌ها مرتب‌اند؟',
  '07-item-view.png': 'صفحه کالا مالک: گالری چپ + قیمت + کارت «تخفیف حجمی خرید» با پله‌ها (بهترین سبز) + کارت تخفیف مشتری‌ها؟',
  '08-sell-mobile.png': 'میز فروش موبایل فارسی: چهار کاشی ۲×۲ جمع‌وجور با عدد بزرگ و آیکون ساده؟ تب‌بار پایین؟ مرتب است؟'
};

async function main() {
  const zai = await ZAI.create();
  let clean = 0, total = 0;
  for (const [file, prompt] of Object.entries(PROMPTS)) {
    const b64 = fs.readFileSync(DIR + file).toString('base64');
    try {
      const r = await zai.chat.completions.createVision({
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
          { type: 'text', text: prompt + ' پاسخ کوتاه: CLEAN یا ISSUES + یک خط توضیح.' }
        ] }],
        max_tokens: 200
      });
      const verdict = (r.choices[0]?.message?.content || '').trim();
      total++;
      const isClean = /CLEAN/i.test(verdict) && !/ISSUES/i.test(verdict);
      if (isClean) clean++;
      console.log(`${isClean ? '✔' : '✖'} ${file}: ${verdict.slice(0, 160).replace(/\n/g, ' ')}`);
    } catch (e) {
      console.log(`✖ ${file}: VLM error — ${e.message}`);
    }
  }
  console.log(`\nVLM: ${clean}/${total} CLEAN`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
