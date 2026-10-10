/* داده‌های نمایشی mvp-final — شکل داده‌ها نزدیک به مدل واقعی: Good → Product(مرجع) → Listing
   قواعد این نسخه (توافق مالک):
   - هر Ref یک «واحد مصرف‌کننده» دارد: perUnit = مقدار واحد پایهٔ Good در هر واحد مصرف‌کننده
     (بطری ۱٫۸ لیتری → perUnit=1.8 لیتر) و cmp خودش («هر عدد» / «هر کیسه»).
   - Listing وصل به Ref: qty = تعداد واحد مصرف‌کننده در بستهٔ فروش (کارتن ۶ عددی → qty=6).
   - Listing فله (فقط goodId): qty بر حسب واحد پایهٔ Good (کیلو/لیتر/گرم).
   - تابلوی محصولِ برنددار → مقایسه با واحد مصرف‌کننده (هر عدد/کیسه).
     تابلوی نوع کالا (فله + همهٔ برندها) → واحد عمومی مصرف‌کننده (هر کیلو/لیتر/۱۰۰ گرم).
   - priceFor: 'all' | {industries:[...]} — فروشنده تعیین می‌کند قیمت‌هایش را کدام صنف‌ها ببینند.
   - updatedAt/prevPrice مبنای «مهر تازگی» و «اعلان کاهش قیمت» هستند. */
window.SEED = (function () {
  const DAY = 86400000;
  const now = Date.now();
  const ago = (d) => now - d * DAY;

  const categories = ['غلات', 'روغن', 'تنقلات', 'کنسرو', 'قند و شکر'];

  const provinces = { 'رشت': 'گیلان', 'لاهیجان': 'گیلان', 'تهران': 'تهران', 'قزوین': 'قزوین', 'اصفهان': 'اصفهان' };

  /* صنف‌ها — هم برای ثبت‌نام، هم برای «قیمت من را کی ببیند» */
  const INDUSTRIES = [
    { id: 'super', label: 'سوپرمارکت' },
    { id: 'grocery', label: 'خواروبار' },
    { id: 'rest', label: 'رستوران / فست‌فود' },
    { id: 'dist', label: 'پخش و توزیع' },
    { id: 'wholesale', label: 'عمده‌فروشی / بنکداری' },
    { id: 'prod', label: 'تولیدی' },
    { id: 'retail', label: 'خرده‌فروشی' },
  ];

  const businesses = [
    { id: 'b1', name: 'پخش برنج پارس', city: 'رشت', phone: '09111234567', trade: 'پخش مواد غذایی', role: 'seller', industry: 'dist' },
    { id: 'b2', name: 'تجارت گیل‌برنج', city: 'رشت', phone: '09112223344', trade: 'عمده‌فروش برنج', role: 'seller', industry: 'wholesale' },
    /* b3 نمونهٔ فروشنده‌ای که قیمت‌هایش را فقط برای سوپرمارکت‌ها و خواروبارها نشان می‌دهد */
    { id: 'b3', name: 'آریو غلات', city: 'اصفهان', phone: '09131112233', trade: 'عمده‌فروش غلات', role: 'seller', industry: 'wholesale', priceFor: { industries: ['super', 'grocery'] } },
    { id: 'b4', name: 'کیان غلات', city: 'قزوین', phone: '09121114455', trade: 'پخش مواد غذایی', role: 'seller', industry: 'dist' },
    { id: 'b5', name: 'بنکداری نوین', city: 'تهران', phone: '09123334455', trade: 'بنکدار', role: 'seller', industry: 'wholesale' },
    { id: 'b6', name: 'پخش سپهر', city: 'لاهیجان', phone: '09115556677', trade: 'پخش مواد غذایی', role: 'seller', industry: 'dist' },
  ];

  /* Good = نوع کالا. cmp = واحد مقایسهٔ تابلوی همین نوع (فله + همهٔ برندها) */
  const goods = [
    { id: 'g1', name: 'برنج هاشمی', cat: 'غلات', unit: 'کیلو', cmp: { label: 'هر کیلو', qty: 1 }, img: 'img/hashemi-10.jpg', aliases: 'هاشمی برنج ایرانی',
      packs: [{ label: 'کیلویی', qty: 1 }, { label: 'کیسه ۱۰ کیلویی', qty: 10 }, { label: 'کیسه ۵۰ کیلویی', qty: 50 }],
      grades: ['معمولی', 'درجه یک', 'ممتاز'] },
    { id: 'g2', name: 'برنج طارم', cat: 'غلات', unit: 'کیلو', cmp: { label: 'هر کیلو', qty: 1 }, img: 'img/rice-sack.jpg', aliases: 'طارم',
      packs: [{ label: 'کیلویی', qty: 1 }, { label: 'کیسه ۱۰ کیلویی', qty: 10 }, { label: 'کیسه ۵۰ کیلویی', qty: 50 }],
      grades: ['معمولی', 'درجه یک', 'ممتاز'] },
    { id: 'g3', name: 'برنج فجر', cat: 'غلات', unit: 'کیلو', cmp: { label: 'هر کیلو', qty: 1 }, img: 'img/fajar-50.jpg', aliases: 'فجر',
      packs: [{ label: 'کیلویی', qty: 1 }, { label: 'کیسه ۱۰ کیلویی', qty: 10 }, { label: 'کیسه ۵۰ کیلویی', qty: 50 }],
      grades: ['معمولی', 'درجه یک'] },
    { id: 'g4', name: 'روغن سرخ‌کردنی', cat: 'روغن', unit: 'لیتر', cmp: { label: 'هر لیتر', qty: 1 }, img: 'img/oil-bottle.jpg', aliases: 'روغن مایع سرخ کردنی',
      packs: [{ label: 'حلب ۱۶ لیتری', qty: 16 }], grades: [] },
    { id: 'g5', name: 'پفک', cat: 'تنقلات', unit: 'گرم', cmp: { label: 'هر ۱۰۰ گرم', qty: 100 }, img: 'img/pofak-small.jpg', aliases: 'پفک نمکی اسنک',
      packs: [], grades: [] },
    { id: 'g6', name: 'قند', cat: 'قند و شکر', unit: 'کیلو', cmp: { label: 'هر کیلو', qty: 1 }, img: 'img/sugar-cubes.jpg', aliases: 'قند حبه',
      packs: [{ label: 'کارتن ۵ کیلویی', qty: 5 }, { label: 'کیسه ۱۰ کیلویی', qty: 10 }], grades: [] },
    { id: 'g7', name: 'رب گوجه‌فرنگی', cat: 'کنسرو', unit: 'گرم', cmp: { label: 'هر کیلو', qty: 1000 }, img: 'img/tomato-paste.jpg', aliases: 'رب گوجه فرنگی',
      packs: [], grades: [] },
  ];

  /* Product مرجع = کالای برنددار با هویت مشخص.
     برند‌دار بسته‌بندی‌شده → واحد مقایسه = واحد مصرف‌کننده (هر عدد؛ کیسهٔ برنج → هر کیسه). */
  const refs = [
    { id: 'r1', goodId: 'g4', brand: 'لادن', name: 'روغن سرخ‌کردنی لادن ۱٫۸ لیتری', pack: 'کارتن ۶ عددی', perUnit: 1.8, cmp: { label: 'هر عدد' }, img: 'img/oil-bottle.jpg', barcode: '6260100100013' },
    { id: 'r2', goodId: 'g4', brand: 'اویلا', name: 'روغن سرخ‌کردنی اویلا ۱٫۵ لیتری', pack: 'کارتن ۶ عددی', perUnit: 1.5, cmp: { label: 'هر عدد' }, img: 'img/oil-carton.jpg', barcode: '6260100200027' },
    { id: 'r8', goodId: 'g4', brand: 'گلان', name: 'روغن سرخ‌کردنی گلان ۲٫۵ لیتری', pack: 'کارتن ۶ عددی', perUnit: 2.5, cmp: { label: 'هر عدد' }, img: 'img/oil-bottle.jpg', barcode: '6260100800081' },
    { id: 'r3', goodId: 'g5', brand: 'مینو', name: 'پفک نمکی مینو ۹۰ گرمی', pack: 'کارتن ۲۴ عددی', perUnit: 90, cmp: { label: 'هر عدد' }, img: 'img/pofak-small.jpg', barcode: '6260100300031' },
    { id: 'r4', goodId: 'g5', brand: 'چی‌توز', name: 'پفک چی‌توز ۶۰ گرمی', pack: 'کارتن ۳۰ عددی', perUnit: 60, cmp: { label: 'هر عدد' }, img: 'img/pofak-big.jpg', barcode: '6260100400045' },
    { id: 'r5', goodId: 'g7', brand: 'چین‌چین', name: 'رب گوجه‌فرنگی چین‌چین ۸۰۰ گرمی', pack: 'کارتن ۱۲ عددی', perUnit: 800, cmp: { label: 'هر عدد' }, img: 'img/tomato-paste.jpg', barcode: '6260100500059' },
    { id: 'r6', goodId: 'g7', brand: 'دلپذیر', name: 'رب گوجه‌فرنگی دلپذیر ۸۰۰ گرمی', pack: 'کارتن ۱۲ عددی', perUnit: 800, cmp: { label: 'هر عدد' }, img: 'img/tomato-paste.jpg', barcode: '6260100600063' },
    { id: 'r7', goodId: 'g1', brand: 'معطر گیلان', name: 'برنج هاشمی معطر گیلان ۱۰ کیلویی', pack: 'کیسه ۱۰ کیلویی', perUnit: 10, cmp: { label: 'هر کیسه' }, img: 'img/rice-grains.jpg', barcode: '6260100700077' },
  ];

  /* Listing = پیشنهاد فروش یک کسب‌وکار. یا refId دارد (برنددار) یا فقط goodId + بسته (فله) */
  let n = 0;
  const L = (bizId, o) => Object.assign({ id: 'l' + (++n), bizId, inStock: true }, o);
  const listings = [
    L('b1', { goodId: 'g1', grade: 'درجه یک', pack: 'کیسه ۵۰ کیلویی', qty: 50, price: 2850000, prevPrice: 2900000, updatedAt: ago(0.2) }),
    L('b1', { goodId: 'g1', grade: 'درجه یک', pack: 'کیسه ۱۰ کیلویی', qty: 10, price: 595000, updatedAt: ago(1) }),
    L('b1', { goodId: 'g2', grade: 'ممتاز', pack: 'کیسه ۵۰ کیلویی', qty: 50, price: 2750000, updatedAt: ago(5) }),
    L('b1', { goodId: 'g3', grade: 'معمولی', pack: 'کیسه ۵۰ کیلویی', qty: 50, price: 2480000, updatedAt: ago(4), inStock: false }),
    L('b1', { goodId: 'g1', refId: 'r7', pack: 'کیسه ۱۰ کیلویی', qty: 1, price: 640000, updatedAt: ago(0.5) }),

    L('b2', { goodId: 'g1', grade: 'درجه یک', pack: 'کیسه ۵۰ کیلویی', qty: 50, price: 2780000, prevPrice: 2850000, updatedAt: ago(0.1) }),
    L('b3', { goodId: 'g1', grade: 'درجه یک', pack: 'کیسه ۵۰ کیلویی', qty: 50, price: 2920000, updatedAt: ago(5) }),
    L('b4', { goodId: 'g1', grade: 'معمولی', pack: 'کیلویی', qty: 1, price: 59000, updatedAt: ago(11) }),
    L('b6', { goodId: 'g1', grade: 'درجه یک', pack: 'کیسه ۱۰ کیلویی', qty: 10, price: 560000, updatedAt: ago(2) }),
    L('b5', { goodId: 'g1', refId: 'r7', pack: 'کیسه ۱۰ کیلویی', qty: 1, price: 610000, updatedAt: ago(1) }),
    L('b2', { goodId: 'g2', grade: 'ممتاز', pack: 'کیسه ۱۰ کیلویی', qty: 10, price: 548000, updatedAt: ago(1) }),
    L('b3', { goodId: 'g3', grade: 'معمولی', pack: 'کیسه ۵۰ کیلویی', qty: 50, price: 2390000, updatedAt: ago(3) }),

    L('b5', { goodId: 'g4', refId: 'r1', pack: 'کارتن ۶ عددی', qty: 6, price: 2380000, prevPrice: 2450000, updatedAt: ago(0.3) }),
    L('b6', { goodId: 'g4', refId: 'r1', pack: 'کارتن ۶ عددی', qty: 6, price: 2520000, updatedAt: ago(3) }),
    L('b2', { goodId: 'g4', refId: 'r1', pack: 'کارتن ۶ عددی', qty: 6, price: 2460000, prevPrice: 2550000, updatedAt: ago(0.1) }),
    L('b5', { goodId: 'g4', refId: 'r2', pack: 'کارتن ۶ عددی', qty: 6, price: 2050000, updatedAt: ago(0.6) }),
    L('b4', { goodId: 'g4', refId: 'r2', pack: 'کارتن ۶ عددی', qty: 6, price: 2100000, updatedAt: ago(2) }),
    L('b5', { goodId: 'g4', refId: 'r8', pack: 'کارتن ۶ عددی', qty: 6, price: 3000000, updatedAt: ago(0.4) }),
    L('b4', { goodId: 'g4', refId: 'r8', pack: 'کارتن ۶ عددی', qty: 6, price: 3120000, updatedAt: ago(1.5) }),

    L('b5', { goodId: 'g5', refId: 'r3', pack: 'کارتن ۲۴ عددی', qty: 24, price: 585000, updatedAt: ago(0.4) }),
    L('b6', { goodId: 'g5', refId: 'r3', pack: 'کارتن ۲۴ عددی', qty: 24, price: 610000, prevPrice: 640000, updatedAt: ago(0.15) }),
    L('b5', { goodId: 'g5', refId: 'r4', pack: 'کارتن ۳۰ عددی', qty: 30, price: 640000, updatedAt: ago(1) }),

    L('b5', { goodId: 'g7', refId: 'r5', pack: 'کارتن ۱۲ عددی', qty: 12, price: 1120000, updatedAt: ago(0.8) }),
    L('b4', { goodId: 'g7', refId: 'r5', pack: 'کارتن ۱۲ عددی', qty: 12, price: 1180000, updatedAt: ago(2) }),
    L('b6', { goodId: 'g7', refId: 'r6', pack: 'کارتن ۱۲ عددی', qty: 12, price: 1090000, prevPrice: 1150000, updatedAt: ago(0.25) }),

    L('b4', { goodId: 'g6', pack: 'کیسه ۱۰ کیلویی', qty: 10, price: 780000, updatedAt: ago(1) }),
    L('b6', { goodId: 'g6', pack: 'کارتن ۵ کیلویی', qty: 5, price: 405000, updatedAt: ago(0.5) }),
    L('b2', { goodId: 'g6', pack: 'کیسه ۱۰ کیلویی', qty: 10, price: 760000, updatedAt: ago(8) }),
  ];

  const buyList = ['r:r1', 'g:g7', 'r:r3', 'g:g6'];

  return { categories, provinces, INDUSTRIES, businesses, goods, refs, listings, buyList, meId: 'b1' };
})();
