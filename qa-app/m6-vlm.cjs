/* M6 — VLM چشمی روی شات‌های شبکهٔ خصوصی و دید عمومی */
const ZAI = require('/home/z/.bun/install/cache/z-ai-web-dev-sdk/0.0.18@@@1/dist/index.js').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/imach-web/shots-m6/';

const PROMPTS = {
  '32-guest.png': 'نمای عمومی لیست خرید خریدار عمده (فارسی RTL موبایل): هدر با نام خریدار + آمار (کالا/تأمین‌کننده/بازدید) + بخش «کالاهای در حال استعلام» با کارت افقی + ردیف‌های «کالاهای موردنیاز» با آیکون تطابق سبز؟ نوار پایین تماس/گفتگو/پیشنهاد تامین نارنجی؟ تمیز است؟',
  '32-sheet.png': 'شیت «پیشنهاد تامین» فارسی RTL از پایین: ردیف‌های کالا با فیلد قیمت و حداقل سفارش باز شده + بج «از کاتالوک تو» + دکمهٔ ارسال نارنجی؟ مرتب است؟',
  '32-success.png': 'نمای موفقیت پیشنهاد تامین: تیک سبز + «پیشنهاد ارسال شد» + «این کالاها هم به کاتالوکت اضافه شد» + دو دکمه «مشاهده کاتالوک» نارنجی و «بستن»؟',
  '20-proposals.png': 'لیست خرید من فارسی RTL: بالای لیست کارت «پیشنهادهای تامین» با نام تأمین‌کننده + ردیف قلم با قیمت + دکمه‌های تایید/حذف؟ زیرش ردیف‌های لیست خرید؟',
  '31-gated.png': 'کاتالوگ عمومی گیت‌شده فارسی RTL: کارت‌های کالا با دکمهٔ «مشاهده قیمت» به‌جای قیمت + دکمهٔ «ذخیره این کاتالوک» نارنجی؟',
  '31-customer.png': 'کاتالوگ عمومی برای مشتری ذخیره‌کرده: بخش «در لیست خرید شما» با کارت‌های سبز + قیمت‌های واقعی روی کارت‌ها + نوار «افزودن کالاها به لیست خرید من»؟',
  '08-new.png': 'دفتر مشتریان فارسی RTL: ردیف مشتری با برچسب «جدید» + دکمه‌های تایید/حذف روی کارت + جستجو و چیپ‌های فیلتر؟',
  '08b-detail.png': 'جزئیات مشتری فارسی RTL: شناسنامه (ردیف‌های نام/صنف/شهر/نوع) + یادداشت + ردیف «لیست خرید او»؟',
  '07-contacts.png': 'دفتر مخاطبین فارسی RTL: ردیف مخاطب با بج «دعوت‌نشده» + دکمهٔ دعوت؟',
  '04-desk.png': 'میز فروش فارسی RTL: کاشی‌های دسترسی + کارت گام بعدی؟ تمیز است؟',
};

async function main() {
  const zai = await ZAI.create();
  let clean = 0, total = 0;
  for (const [file, prompt] of Object.entries(PROMPTS)) {
    if (!fs.existsSync(DIR + file)) { console.log(`- ${file}: not found, skip`); continue; }
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
      console.log(`${isClean ? '✔' : '✖'} ${file}: ${verdict.slice(0, 140)}`);
    } catch (e) {
      console.log(`✖ ${file}: VLM error ${String(e).slice(0, 80)}`);
      total++;
    }
  }
  console.log(`\nVLM: ${clean}/${total} CLEAN`);
}
main();
