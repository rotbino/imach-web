/* M7 — VLM چشمی روی شات‌های امتیاز، رشد و اعلان‌ها */
const ZAI = require('/home/z/.bun/install/cache/z-ai-web-dev-sdk/0.0.18@@@1/dist/index.js').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/imach-web/shots-m7/';

const PROMPTS = {
  '01-score-sell.png': 'صفحهٔ «امتیاز فعالیت» فارسی RTL: سوییچر دو بازو (امتیاز فروش/خرید) + دایرهٔ امتیاز با عدد ۱۰۰ + کارت سبز «موتور شتاب‌دهندهٔ فروشت فعال است» + دو ردیف مسیر امتیاز (۱۰۰=ورود به شبکه / بعد از ۱۰۰=شارژ) + بخش کارهای انجام‌شده با تیک سبز و امتیاز +؟ تمیز و خوانا؟',
  '02-score-buy-lock.png': 'همان صفحه در بازوی خرید: کارت خط‌چین قفل با «۹۵ امتیاز تا شتابدهی» + هینت «امتیاز میز فروش و میز خرید جداگانه حساب می‌شوند» + لینک «شتابدهی در خرید یعنی چه؟» + بخش کارهای مانده با آیکون ساعت؟ تمیز؟',
  '03-accel-sheet.png': 'شیت «شتابدهی در فروش یعنی چه؟» از پایین فارسی RTL: دو پاراگراف توضیح + کارت «بعد از ۱۰۰ چه می‌شود؟» با آیکون کیف + جملهٔ پایانی با آیکون درخشش + دکمهٔ «باشه، فهمیدم»؟ مرتب؟',
  '04-sell-desk-live.png': 'میز فروش فارسی RTL: کارت «گام بعدی فعالیت» با جملهٔ «اولین محصول را به کاتالوکت اضافه کن» + بج «۹۵ امتیاز تا شتابدهی» + کاشی‌های دسترسی؟ تمیز؟',
  '05-catalog-share.png': 'شیت «اشتراک کاتالوگ» فارسی RTL: کال‌اوت نارنجی «مشتری شما می‌شود» + ردیف «اشتراک با مخاطبین» + سه دکمهٔ پیام‌رسان (واتس‌اپ/تلگرام/پیامک) با دایره‌های رنگی + فیلد لینک با دکمهٔ کپی + ردیف خط‌چین «دعوت‌شدگان و پاداش»؟ مرتب؟',
  '06-referrals.png': 'صفحهٔ «دعوت‌شدگان و پاداش» فارسی RTL: کال‌اوت پاداش + سه کارت آمار (دعوت‌شده/هدف/پاداش) + نوار پیشرفت تا هدف + ردیف دعوت‌شده با بج «مشتری من» و «پاداش گرفت» + دو مسیر دعوت؟ تمیز؟',
  '07-notifs.png': 'فید اعلان‌ها فارسی RTL: ردیف «امتیاز فعالیت فروشت به ۱۰۰ رسید…» با آیکون موشک سبز + ردیف‌های «کاتالوک شما را ذخیره کرد» با آیکون user-plus نارنجی؟ آیکون/رنگ per-type دیده می‌شود؟ تمیز؟',
  '08-catalog-guest-ref.png': 'کاتالوگ عمومی مهمان فارسی RTL (هدر ویترین + کارت کالا): صفحه سالم بارگذاری شده؟ خطای رندر/متنی خام دیده نمی‌شود؟',
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
      console.log(`${isClean ? '✔' : '✖'} ${file}: ${verdict.slice(0, 160)}`);
    } catch (e) {
      console.log(`✖ ${file}: VLM error ${String(e).slice(0, 80)}`);
      total++;
    }
  }
  console.log(`\n══ VLM: ${clean}/${total} CLEAN ══`);
  process.exit(clean === total ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
