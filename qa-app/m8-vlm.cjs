/* M8 — VLM چشمی روی شات‌های پیام‌رسان، پروفایل و تنظیمات (۲۹/۳۰/۱۸/۱۶) */
const ZAI = require('/home/z/.bun/install/cache/z-ai-web-dev-sdk/0.0.18@@@1/dist/index.js').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/imach-web/shots-m8/';

const PROMPTS = {
  '01-chat-ctx-mobile.png': 'صفحهٔ گفتگوی فارسی RTL موبایل: نوار نارنجی کم‌رنگ «دربارهٔ: سفارش …» بالای پیام‌ها + حباب پیام طرف مقابل (کرم با حاشیه) و حباب پیام خودم (نارنجی پر) با گوشهٔ تیز در پایین + جداکنندهٔ روز «امروز» + چیپ‌های پیام آماده (سلام وقت به خیر / قیمت امروز؟) + نوار تایپ با دکمهٔ عکس و ارسال؟ تمیز و خوانا؟',
  '02-msgs-mobile.png': 'فهرست پیام‌ها فارسی RTL موبایل: ردیف گفتگو با آواتار حرف اول + نام کسب‌وکار + آخرین پیام + بج نخواندهٔ نارنجی + نشان سبز آنلاین روی آواتار + تب‌بار پایین با بج شمارنده روی «پیام‌ها»؟ تمیز؟',
  '03-profile-mobile.png': 'پروفایل فارسی RTL موبایل: کارت هویت (آواتار + نام + شماره) + کارت کسب‌وکار + کارت فیروزه‌ای «داشبورد نمایندهٔ فروش» با بج + کارت کیف پول سبز «موجودی شارژ» + بخش «دستیارهای فعال» با دو سوییچ + بخش «تنظیمات» با ردیف زبان/ارز + دکمهٔ قرمز خروج؟ مرتب؟',
  '04-edit-business-mobile.png': 'فرم «ویرایش کسب‌وکار» فارسی RTL موبایل: فیلد نام کسب‌وکار + شهر + صنف (readonly با شِورون) + توضیح کوتاه + نوار چسبان پایین با دکمهٔ «ذخیره تغییرات» و «انصراف»؟ تمیز؟',
  '05-chat-desktop.png': 'گفتگو در دسکتاپ فارسی RTL: سایدبار ناوبری سمت راست (واژه‌نشان آیمچ + میز فروش/خرید/پیام‌ها/پروفایل + شورت‌کات‌ها + چیپ کاربر) + ستون گفتگو وسط با پس‌زمینهٔ خاکستری روشن + نوار «دربارهٔ: سفارش …» + حباب‌ها با عرض محدود (~۵۶۰px) + نوار تایپ کف؟ چیدمان حرفه‌ای؟',
  '06-profile-desktop.png': 'پروفایل دسکتاپ فارسی RTL دوستونه: سمت راست خوشهٔ هویت چسبان (من/کسب‌وکار/نماینده/کیف پول) و سمت چپ دستیارها + تنظیمات + خروج؛ سایدبار ناوبری هم حاضر است؟ چیدمان دوستونهٔ تمیز بدون هم‌پوشانی؟',
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
