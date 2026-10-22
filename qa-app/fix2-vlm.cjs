/* fix2 — VLM چشمی روی شات‌های فرم ثبت کالای کامل‌شده */
const ZAI = require('/home/z/.bun/install/cache/z-ai-web-dev-sdk/0.0.18@@@1/dist/index.js').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/imach-web/shots-fix2/';

const PROMPTS = {
  '01-brand-picker.png': 'گام ۳ فرم ثبت کالا فارسی RTL موبایل: دکمهٔ برند فرم نام برند «گلستان» را نشان می‌دهد؟ فرم تمیز است؟',
  '02-add-form-full.png': 'گام ۳ فرم ثبت کالا فارسی RTL موبایل: عنوان محصول + دکمهٔ برند + کاشی‌های عکس (دو پیش‌نمایش + دکمهٔ افزودن) + چیپ‌های بسته‌بندی (تک‌فروشی/بطری/سایر) + قیمت‌ها؟ مرتب است؟',
  '03-item-gallery.png': 'صفحهٔ کالا: گالری عکس آپلودشده دیده می‌شود؟',
  '04-newgood-unit.png': 'گام ۲ بعد از ثبت نوع کالای جدید: کارت نوع کالا با «واحد کیلوگرم»؟',
  '05-brand-sheet-open.png': 'شیت انتخاب برند فارسی RTL از پایین باز: جستجوی برند + ردیف «بدون برند / فله» + ردیف برند «گلستان» + دکمهٔ برند‌رنگ «ثبت برند جدید» آخر فهرست؟ تمیز و مرتب است؟',
  '06-add-form-complete.png': 'گام ۳ فرم ثبت کالا با برند انتخاب‌شده + یک عکس پیش‌نمایش + چیپ بستهٔ فعال (رنگ روشن) + لیبل قیمت بسته؟ همه بخش‌ها خوانا و مرتب‌اند؟'
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
      console.log(`${isClean ? '✔' : '✖'} ${file}: ${verdict.slice(0, 180).replace(/\n/g, ' ')}`);
    } catch (e) {
      console.log(`✖ ${file}: VLM error — ${e.message}`);
    }
  }
  console.log(`\nVLM: ${clean}/${total} CLEAN`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
