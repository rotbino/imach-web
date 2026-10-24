/* M9 — VLM چشمی روی شات‌های تبلیغ، شارژ و داشبورد نماینده (۳۴/۳۵/۳۸) */
const ZAI = require('/home/z/.bun/install/cache/z-ai-web-dev-sdk/0.0.18@@@1/dist/index.js').default || require('z-ai-web-dev-sdk');
const fs = require('fs');
const DIR = '/home/z/my-project/imach-web/shots-m9/';

const PROMPTS = {
  '01-promo-mobile.png': 'صفحهٔ «تبلیغات و افزایش فروش» فارسی RTL موبایل: کال‌اوت توضیح با آیکون جرقه + کارت موجودی شارژ سبز + دکمهٔ نارنجی «ساخت تبلیغ تازه» + کارت‌های تبلیغ با نوار پیشرفت بودجه و بج وضعیت + بخش «مصرف‌ها و افزایش‌های شارژ»؟ تمیز و خوانا؟',
  '02-promo-report-mobile.png': 'شیت گزارش تبلیغ فارسی RTL موبایل (از پایین صفحه باز شده): سه آمار فشرده (نمایش هدفمند / ذخیرهٔ حاصل / هزینهٔ هر مشتری) + ردیف وضعیت بودجه + بخش «چه کسانی دیدند؟» با ردیف بیننده و بج «دید/ذخیره کرد»؟ مرتب؟',
  '03-charge-mobile.png': 'صفحهٔ «شارژ» فارسی RTL موبایل: هیرو موجودی سبز با آیکون کیف + کارت «افزایش شارژ» با ۴ بستهٔ پیش‌فرض (۵۰۰/۱/۲/۲/۵ هزار) + فیلد مبلغ دلخواه + دکمهٔ «پرداخت و شارژ کیف» + کارت سبز «لینک کاتالوگت را بفرست» + تاریخچهٔ تراکنش‌ها؟ تمیز؟',
  '04-rep-mobile.png': 'داشبورد نمایندهٔ فروش فارسی RTL موبایل (فضای سوم فیروزه‌ای): هیرو «گروه مشتریان من» + ۴ کاشی آمار (فروش ماه/پورسانت/کسب‌وکار/سفارش) + کارت کسب‌وکار زیر نمایندگی + ردیف سفارش با بج وضعیت + دکمهٔ «ثبت سفارش تازه» + بدون تب‌بار پایین؟ تمیز؟',
  '05-rep-desktop.png': 'داشبورد نمایندهٔ فروش دسکتاپ فارسی RTL: ۴ کاشی در یک ردیف + کارت‌های کسب‌وکار دوستونه + ردیف‌های سفارش با ستون مبلغ/پورسانت + چیدمان حرفه‌ای بدون لوله‌های دراز و بدون هم‌پوشانی؟',
  '06-promo-desktop.png': 'صفحهٔ تبلیغات دسکتاپ فارسی RTL: اپ‌بار با فلش بازگشت و عنوان + نوار ابزار + محتوای وسچ با کال‌اوت + کارت‌های تبلیغ + بخش مصرف‌ها — چیدمان تمیز دسکتاپی؟',
  '07-charge-desktop.png': 'صفحهٔ شارژ دسکتاپ فارسی RTL: هیرو موجودی + بسته‌های چهارتایی در یک ردیف + تاریخچهٔ تراکنش‌ها — چیدمان تمیز دسکتاپی بدون لولهٔ دراز؟',
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
