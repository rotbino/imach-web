/* FD-36 VLM verify — ۱۳ افزودن محصول: مثل موبایل در دسکتاپ */
function loadZAI() {
  const paths = ['z-ai-web-dev-sdk',
    '/home/z/.bun/install/cache/z-ai-web-dev-sdk/0.0.18@@@1'];
  for (const p of paths) { try { const m = require(p); return m.default || m; } catch (e) {} }
  throw new Error('z-ai-web-dev-sdk not found');
}
const ZAI = loadZAI();
const fs = require('fs');
const DIR = '/home/z/my-project/imach-web/prototypes/imach-final-design/png/qa36/';

const PROMPTS = {
  '01-desk-step1.png': 'فرم «افزودن محصول» دسکتاپ (گام ۱): سرچ‌باکس بالا و زیرش دو گروه «محصولات» و «کالاها» به‌صورت کارت‌های تمام‌عرض زیرِ هم (مثل موبایل). آیا هیچ نشانگر گام/قرص سه‌تایی بالای صفحه نیست؟ آیا کارت‌ها هم‌عرض سرچ‌باکس‌اند و ستون‌ها از هم جدا افتاده‌اند؟ مشکل جدی چیدمان دارد؟',
  '02-desk-step2.png': 'گام ۲ فرم افزودن دسکتاپ: کارت کالای منتخب + چیپ‌های برند + فهرست محصولاتِ آن کالا به‌صورت کارت‌های تمام‌عرض زیرِ هم. تمیز و بدون مشکل است؟',
  '03-desk-step3.png': 'گام ۳ فرم افزودن دسکتاپ: فرم در کارت کاغذی وسچ با فیلدهای جفت‌شده + دکمهٔ نارنجی «افزودن به کاتالوگ» زیر فرم. آیا دکمه به لبهٔ پایین صفحه چسبیده یا فاصلهٔ تنفسی دارد؟ مشکل جدی دارد؟',
  '05-mob-step1.png': 'همان فرم در موبایل ۳۹۰ (گام ۱): سرچ + کارت‌های انتخاب. سالم و بدون مشکل است؟',
  '06-mob-step3.png': 'گام ۳ فرم افزودن در موبایل ۳۹۰: فرم + دکمهٔ افزودن. سالم و بدون مشکل است؟'
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
    const bad = /(هم‌پوشان|روی هم|ریخته|به‌هم|کج شده|افتن|شکسته|ناخوانا|غیرحرفه‌ای|overlapping|broken|misaligned|چسبیده به لبه)/.test(txt) && !/(مشکل جدی ندارد|بدون مشکل|فاصله دارد|چسبیده نیست)/.test(txt);
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
  console.log('\n=== FD-36 VLM: ' + ok + '/' + files.length + ' ===');
})();
