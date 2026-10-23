/* Brand rebrand — VLM چشمی روی هیرو/پنل برند (fa/en/ar) */
const ZAI = require('/home/z/.bun/install/cache/z-ai-web-dev-sdk/0.0.18@@@1/dist/index.js').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/imach-web/shots-brand/';

const PROMPTS = {
  '01-fa-hero-mobile.png': 'هیروی فرود آیمچ فارسی RTL موبایل: تیتر دوخطی «آیمچ، تأمین‌کنندگان هر کالا را به / خریداران عمدهٔ آن کالا وصل می‌کند» با نیم‌فاصله‌های درست (تأمین‌کنندگان، می‌کند) دیده می‌شود؟ شکست خط طبیعی است؟ متن روی هم نیفتاده و تمیز است؟',
  '02-fa-hero-desktop.png': 'هیروی فرود آیمچ دسکتاپ فارسی RTL: تیتر بزرگ دوخطی شعار تازه + بنر توضیح + دکمه‌ها + تصویر هیرو؟ تایپوگرافی نیم‌فاصله‌ها درست رندر شده؟ تمیز است؟',
  '03-fa-login-brand.png': 'صفحهٔ ورود فارسی RTL: پنل برند آیمچ با تگ‌لاین «تأمین‌کنندگان هر کالا را به خریداران عمدهٔ آن کالا وصل می‌کند» + بولت‌ها؟ تمیز است؟',
  '04-en-hero.png': 'English desktop landing hero for iMach: two-line headline "connecting the suppliers of every product to / the wholesale buyers of that product"? Clean typography, no overlap?',
  '05-ar-hero.png': 'صفحة الهبوط العربية ديسكتوب لآي‌ماتش: عنوان من سطرين «يصل مورّدي كل سلعة إلى / مشتريي الجملة لتلك السلعة»؟ نظيفة؟',
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
