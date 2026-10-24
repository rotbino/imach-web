/* M10 — VLM چشمی روی شات‌های محتوای اجتماعی و SEO (نظرات/راهنماها/زنگوله/رویدادها) */
const ZAI = require('/home/z/.bun/install/cache/z-ai-web-dev-sdk/0.0.18@@@1/dist/index.js').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/imach-web/shots-m10/';

const PROMPTS = {
  '01-landing-band-mobile.png': 'لندینگ فارسی RTL موبایل: نوار «نظر خریداران» با کارت‌های نظر افقی (آواتار دایره‌ای + نام/کسب‌وکار + متن + چیپ قابلیت نارنجی) + دکمهٔ «ثبت نظر شما»؟ متن فارسی درست رندر شده (نه مربع/جدا)؟ تمیز؟',
  '02-review-dialog-done.png': 'دیالوگ موفقیت ثبت نظر فارسی RTL: آیکون چک سبز در دایره + «نظر شما ثبت شد» + توضیح صف تأیید + دکمهٔ نارنجی «باشه، ممنون»؟ تمیز؟',
  '03-reviews-mobile.png': 'صفحهٔ «سایر نظرات» فارسی RTL موبایل: هدر با فلش بازگشت + کارت‌های نظر تمام‌عرض (تازه سبز-لطیف) + کارت دعوت ثبت نظر + دکمهٔ چسبان پایین «ثبت نظر شما»؟ تمیز؟',
  '04-review-sheet-buyer.png': 'شیت نظرات کاتالوگ فارسی RTL موبایل (از پایین باز): خلاصهٔ امتیاز (عدد درشت + ستاره‌ها + شمار) + کارت نظر با آواتار و ستاره + فرم «نظر شما (قابل ویرایش)» با ستاره‌سِلکت پنج‌تایی؟ تمیز؟',
  '05-review-reply.png': 'شیت نظرات با پاسخ فروشنده فارسی RTL: زیر نظر، بلوک پاسخ سبز-لطیف با نشان «پاسخ فروشنده»؟ تمیز و خوانا؟',
  '06-buy-bell.png': 'لیست خرید عمومی از دید فروشنده فارسی RTL موبایل: ردیف کالای موردنیاز با آواتار + نام + حجم/دوره + دکمهٔ زنگولهٔ (فیروزه‌ای=روشن) + دکمهٔ «پیشنهاد» + کادر راهنمای زنگوله با متن؟ تمیز؟',
  '07-watch-tab.png': 'تب «گوش به زنگ» میز استعلام فروشنده فارسی RTL: کارت استعلام با پس‌زمینهٔ فیروزه‌ای-لطیف + بج «زنگوله‌ات روشن بود» + بخش «نیازهای اعلام‌شده» با بج سبز «در کاتالوک تو»؟ تمیز؟',
  '08-sell-guide.png': 'راهنمای دستیار فروش فارسی RTL موبایل: کارت سرآغاز نارنجی + ردیف‌های شماره‌دار + نوار فیلم‌های آموزشی با پوستر و دکمهٔ پخش + بخش بازخورد و پرسش‌وپاسخ؟ تمیز؟',
  '09-events-sheet.png': 'شیت «تاریخچهٔ رویدادها» کالا فارسی RTL: ردیف شمارنده‌ها (بازدید کل/ماه/لیست خرید/استعلام/گفتگو) + چیپ‌های فیلتر ۷/۳۰ روز + ردیف رویدادها با آیکون و زمان؟ تمیز؟',
  '10-reviews-desktop.png': 'صفحهٔ سایر نظرات دسکتاپ فارسی RTL: هدر وسچ ۷۶۰ + کارت‌های تمام‌عرض + دکمهٔ ثبت — چیدمان تمیز دسکتاپی؟',
  '11-sell-guide-desktop.png': 'راهنمای دستیار فروش دسکتاپ فارسی RTL: سرآغاز + ردیف‌های گام + فیلم‌ها + بازخوردها در ستون وسچ — بدون لولهٔ دراز و بدون هم‌پوشانی؟',
  '12-catalog-desktop.png': 'کاتالوگ عمومی دسکتاپ فارسی RTL: هدر با چیپ امتیاز (عدد + ستاره + شمار) و شمار کالا + گرید کارت‌های کالا — تمیز؟',
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
  console.log(`\n══ M10 VLM: ${clean}/${total} CLEAN ══`);
  process.exit(clean === total ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
