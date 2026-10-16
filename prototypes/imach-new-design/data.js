/* ═══════════════════════════════════════════════════════════════
   آی‌مچ — دادهٔ نمونه
   ═══════════════════════════════════════════════════════════════
   همهٔ تصاویر از پوشهٔ png/ خوانده می‌شوند.
   در نسخهٔ نهایی، این داده‌ها از API می‌آیند.
   ═══════════════════════════════════════════════════════════════ */

window.IMACH_DATA = {

    /* ═══ کاربر ═══ */
    user: {
        name: 'احمد رضایی',
        phone: '۰۹۱۲ ۳۴۵ ۶۷۸۹',
        photo: 'png/users/me.jpg',
        photos: ['png/users/me.jpg', 'png/users/alt-1.jpg', 'png/users/alt-2.jpg']
    },

    /* ═══ کسب‌وکار ═══ */
    business: {
        name: 'پخش برنج پارس',
        owner: 'احمد رضایی',
        city: 'رشت',
        industry: 'پخش مواد غذایی',
        type: 'عمده‌فروش',
        logo: 'png/goods/catalog-logo.png',
        portrait: 'png/goods/seller-portrait.png',
        about: 'فروش عمده برنج هاشمی و طارم — مستقیم از شالی‌زار گیلان.',
        isPrivate: true,
        wallet: 85000
    },

    /* ═══ کالاها ═══ */
    products: [
        {
            id: 'p1',
            name: 'برنج هاشمی',
            pack: 'کیسه ۵۰ کیلویی',
            price: 2850000,
            stock: 35,
            min: 5,
            unit: 'کیسه',
            img: 'png/goods/rice-sack.jpg',
            status: 'ok'
        },
        {
            id: 'p2',
            name: 'برنج طارم',
            pack: 'کیسه ۵۰ کیلویی',
            price: 2750000,
            stock: 28,
            min: 5,
            unit: 'کیسه',
            img: 'png/goods/rice-grains.jpg',
            status: 'ok'
        },
        {
            id: 'p3',
            name: 'برنج هاشمی',
            pack: 'کیسه ۱۰ کیلویی',
            price: 595000,
            stock: 60,
            min: 10,
            unit: 'کیسه',
            img: 'png/goods/hashemi-10.png',
            status: 'ok'
        },
        {
            id: 'p4',
            name: 'برنج فجر',
            pack: 'کیسه ۵۰ کیلویی',
            price: 2480000,
            stock: 8,
            min: 5,
            unit: 'کیسه',
            img: 'png/goods/fajar-50.jpg',
            status: 'low'
        },
        {
            id: 'p5',
            name: 'روغن سرخ‌کردنی',
            pack: 'کارتن ۶ عددی',
            price: 2450000,
            stock: 20,
            min: 2,
            unit: 'کارتن',
            img: 'png/goods/oil-carton.jpg',
            status: 'ok'
        },
        {
            id: 'p6',
            name: 'روغن مایع',
            pack: 'بطری ۱.۸ لیتری',
            price: 185000,
            stock: 48,
            min: 6,
            unit: 'عدد',
            img: 'png/goods/oil-bottle.jpg',
            status: 'ok'
        },
        {
            id: 'p7',
            name: 'قند و شکر',
            pack: 'کیسه ۱۰ کیلویی',
            price: 760000,
            stock: 25,
            min: 5,
            unit: 'کیسه',
            img: 'png/goods/sugar-cubes.jpg',
            status: 'ok'
        },
        {
            id: 'p8',
            name: 'رب گوجه‌فرنگی',
            pack: 'کارتن ۲۴ عددی',
            price: 1150000,
            stock: 15,
            min: 3,
            unit: 'کارتن',
            img: 'png/goods/tomato-paste.jpg',
            status: 'ok'
        },
        {
            id: 'p9',
            name: 'پفک نمکی',
            pack: 'کارتن ۵۰ عددی',
            price: 890000,
            stock: 12,
            min: 2,
            unit: 'کارتن',
            img: 'png/goods/pofak-big.jpg',
            status: 'ok'
        },
        {
            id: 'p10',
            name: 'پفک کوچک',
            pack: 'کارتن ۲۴ عددی',
            price: 480000,
            stock: 30,
            min: 4,
            unit: 'کارتن',
            img: 'png/goods/pofak-small.jpg',
            status: 'ok'
        },
        {
            id: 'p11',
            name: 'برنج هاشمی ممتاز',
            pack: 'کیسه ۵۰ کیلویی · ممتاز',
            price: 3050000,
            stock: 15,
            min: 5,
            unit: 'کیسه',
            img: 'png/goods/sack-scoop.jpg',
            status: 'ok'
        }
    ],

    /* ═══ مشتریان (سمت فروشنده) ═══ */
    customers: [
        {
            id: 'c1',
            name: 'رستوران مهر',
            owner: 'مهدی کاظمی',
            city: 'تهران',
            phone: '۰۹۱۲ ۳۳۴ ۴۱۰۸',
            industry: 'رستوران',
            isNew: true,
            since: 'امروز',
            av: '#0e7490',
            orders: 7,
            rfqs: 3
        },
        {
            id: 'c2',
            name: 'سوپرمارکت آریا',
            owner: 'نیما فاضلی',
            city: 'رشت',
            phone: '۰۹۱۱ ۵۵۲ ۲۰۷۴',
            industry: 'سوپرمارکت',
            isNew: true,
            since: 'امروز',
            av: '#059669',
            orders: 3,
            rfqs: 1
        },
        {
            id: 'c3',
            name: 'سوپرمارکت سعید',
            owner: 'سعید کریمی',
            city: 'رشت',
            phone: '۰۹۳۵ ۴۴۸ ۸۸۲۳',
            industry: 'سوپرمارکت',
            since: '۳ روز پیش',
            av: '#c2703a',
            orders: 2,
            rfqs: 0
        },
        {
            id: 'c4',
            name: 'سوپرمارکت الماس',
            owner: 'سارا رحیمی',
            city: 'قزوین',
            phone: '۰۹۱۲ ۷۷۶ ۹۱۰۴',
            industry: 'سوپرمارکت',
            since: 'هفتهٔ پیش',
            av: '#7c3aed',
            orders: 4,
            rfqs: 2
        },
        {
            id: 'c5',
            name: 'خواروبار امید',
            owner: 'علی مرادی',
            city: 'مشهد',
            phone: '۰۹۱۵ ۲۲۰ ۳۳۶۱',
            industry: 'خواروبار',
            since: '۲ هفته پیش',
            av: '#0e7490',
            orders: 1,
            rfqs: 0
        }
    ],

    /* ═══ تأمین‌کنندگان (سمت خریدار) ═══ */
    suppliers: [
        {
            id: 's1',
            name: 'پخش برنج پارس',
            owner: 'مرتضی رضایی',
            city: 'رشت',
            phone: '۰۹۱۱ ۲۳۴ ۵۶۷۸',
            verified: true,
            av: '#c2703a',
            portrait: 'png/goods/seller-portrait.png',
            products: ['p1', 'p2', 'p3', 'p11']
        },
        {
            id: 's2',
            name: 'آریو غلات',
            owner: 'امیر قاسمی',
            city: 'اصفهان',
            phone: '۰۹۱۲ ۳۳۴ ۴۴۱۲',
            verified: true,
            av: '#7c3aed',
            products: ['p1', 'p7']
        },
        {
            id: 's3',
            name: 'کیان غلات',
            owner: 'کیان رستمی',
            city: 'قزوین',
            phone: '۰۹۳۵ ۷۷۶ ۸۸۲۳',
            verified: false,
            av: '#0e7490',
            products: ['p1', 'p2', 'p7']
        }
    ],

    /* ═══ سفارش‌های دریافتی (فروشنده) ═══ */
    incomingOrders: [
        {
            id: 'o1',
            customer: 'رستوران مهر',
            customerAv: '#0e7490',
            product: 'برنج هاشمی',
            productImg: 'png/goods/rice-sack.jpg',
            qty: 20,
            unit: 'کیسه',
            price: 2850000,
            total: 57000000,
            status: 'new',
            when: 'امروز'
        },
        {
            id: 'o2',
            customer: 'سوپرمارکت الماس',
            customerAv: '#7c3aed',
            product: 'برنج طارم',
            productImg: 'png/goods/rice-grains.jpg',
            qty: 6,
            unit: 'کیسه',
            price: 2750000,
            total: 16500000,
            status: 'new',
            when: 'امروز'
        },
        {
            id: 'o3',
            customer: 'سوپرمارکت آریا',
            customerAv: '#059669',
            product: 'برنج طارم',
            productImg: 'png/goods/rice-grains.jpg',
            qty: 10,
            unit: 'کیسه',
            price: 2750000,
            total: 27500000,
            status: 'accepted',
            when: '۲ روز پیش'
        },
        {
            id: 'o4',
            customer: 'سوپرمارکت آریا',
            customerAv: '#059669',
            product: 'برنج فجر',
            productImg: 'png/goods/fajar-50.jpg',
            qty: 8,
            unit: 'کیسه',
            price: 2480000,
            total: 19840000,
            status: 'shipped',
            when: '۳ روز پیش'
        },
        {
            id: 'o5',
            customer: 'سوپرمارکت آریا',
            customerAv: '#059669',
            product: 'برنج هاشمی ۱۰ کیلویی',
            productImg: 'png/goods/hashemi-10.png',
            qty: 30,
            unit: 'کیسه',
            price: 595000,
            total: 17850000,
            status: 'done',
            when: 'هفتهٔ پیش'
        }
    ],

    /* ═══ سفارش‌های من (خریدار) ═══ */
    myOrders: [
        {
            id: 'mo1',
            supplier: 'پخش برنج پارس',
            supplierAv: '#c2703a',
            product: 'برنج طارم',
            productImg: 'png/goods/rice-grains.jpg',
            qty: 10,
            unit: 'کیسه',
            price: 2750000,
            total: 27500000,
            status: 'accepted',
            when: '۲ روز پیش'
        },
        {
            id: 'mo2',
            supplier: 'پخش برنج پارس',
            supplierAv: '#c2703a',
            product: 'برنج فجر',
            productImg: 'png/goods/fajar-50.jpg',
            qty: 8,
            unit: 'کیسه',
            price: 2480000,
            total: 19840000,
            status: 'shipped',
            when: '۳ روز پیش'
        },
        {
            id: 'mo3',
            supplier: 'پخش برنج پارس',
            supplierAv: '#c2703a',
            product: 'برنج هاشمی ۱۰ کیلویی',
            productImg: 'png/goods/hashemi-10.png',
            qty: 30,
            unit: 'کیسه',
            price: 595000,
            total: 17850000,
            status: 'done',
            when: 'هفتهٔ پیش'
        }
    ],

    /* ═══ درخواست‌های قیمت دریافتی (فروشنده) ═══ */
    incomingRfqs: [
        {
            id: 'r1',
            customer: 'رستوران مهر',
            customerAv: '#0e7490',
            product: 'برنج هاشمی',
            productImg: 'png/goods/rice-sack.jpg',
            qty: 20,
            unit: 'کیسه',
            deadline: 2,
            when: '۲ روز پیش',
            status: 'pending'
        },
        {
            id: 'r2',
            customer: 'پخش نگین',
            customerAv: '#0e7490',
            product: 'استعلام ۳ قلمی',
            productImg: 'png/goods/oil-carton.jpg',
            qty: '۳ قلم',
            deadline: 0,
            when: '۲ روز پیش',
            status: 'pending'
        },
        {
            id: 'r3',
            customer: 'سوپرمارکت آریا',
            customerAv: '#059669',
            product: 'رب گوجه‌فرنگی',
            productImg: 'png/goods/tomato-paste.jpg',
            qty: 60,
            unit: 'عدد',
            deadline: 4,
            when: 'دیروز',
            status: 'pending'
        }
    ],

    /* ═══ استعلام‌های من (خریدار) ═══ */
    myRfqs: [
        {
            id: 'mr1',
            product: 'برنج هاشمی',
            productImg: 'png/goods/rice-sack.jpg',
            qty: 20,
            unit: 'کیسه',
            deadline: 3,
            when: '۲ روز پیش',
            offers: [
                {
                    supplier: 'پخش برنج پارس',
                    supplierAv: '#c2703a',
                    price: 2790000,
                    total: 55800000,
                    payment: '۳۰٪ نقدی و بقیه چک ۳۰ روزه',
                    delivery: 'تحویل در محل — رایگان',
                    isBest: true
                },
                {
                    supplier: 'آریو غلات',
                    supplierAv: '#7c3aed',
                    price: 2850000,
                    total: 57000000,
                    payment: 'نقدی',
                    delivery: 'ارسال به همه شهرها'
                },
                {
                    supplier: 'کیان غلات',
                    supplierAv: '#0e7490',
                    price: 2820000,
                    total: 56400000,
                    payment: 'نقدی',
                    delivery: 'تحویل حضوری'
                }
            ]
        },
        {
            id: 'mr2',
            product: 'رب گوجه‌فرنگی',
            productImg: 'png/goods/tomato-paste.jpg',
            qty: 60,
            unit: 'عدد',
            deadline: 1,
            when: 'دیروز',
            offers: [
                {
                    supplier: 'پخش برنج پارس',
                    supplierAv: '#c2703a',
                    price: 1150000,
                    total: 69000000,
                    payment: 'نقدی',
                    delivery: 'تحویل در محل',
                    isBest: true
                }
            ]
        }
    ],

    /* ═══ لیست خرید من (خریدار) ═══ */
    shoppingList: [
        {
            id: 'l1',
            product: 'برنج هاشمی',
            productImg: 'png/goods/rice-sack.jpg',
            qty: 20,
            unit: 'کیسه',
            period: 'ماهانه',
            suppliers: 3
        },
        {
            id: 'l2',
            product: 'روغن سرخ‌کردنی',
            productImg: 'png/goods/oil-carton.jpg',
            qty: 4,
            unit: 'کارتن',
            period: 'ماهانه',
            suppliers: 2
        },
        {
            id: 'l3',
            product: 'رب گوجه‌فرنگی',
            productImg: 'png/goods/tomato-paste.jpg',
            qty: 60,
            unit: 'عدد',
            period: 'هفتگی',
            suppliers: 1
        }
    ],

    /* ═══ گفتگوها ═══ */
    conversations: [
        {
            id: 'cn1',
            name: 'پخش برنج پارس',
            av: '#c2703a',
            role: 'تأمین‌کننده',
            lastMessage: 'عالی — ۵۰ کیسه رزرو کنید',
            when: '۱۰:۱۶',
            unread: 1
        },
        {
            id: 'cn2',
            name: 'کیان غلات',
            av: '#0e7490',
            role: 'تأمین‌کننده',
            lastMessage: 'قیمت امروز را فرستادم',
            when: '۹:۴۲',
            unread: 0
        },
        {
            id: 'cn3',
            name: 'رستوران مهر',
            av: '#059669',
            role: 'خریدار',
            lastMessage: 'فردا ۱۰ صبح تحویل می‌دهم',
            when: 'دیروز',
            unread: 0
        }
    ],

    /* ═══ پیشنهادهای آی‌مچ ═══ */
    suggestions: [
        {
            id: 'sg1',
            name: 'هتل سپند',
            av: '#0e7490',
            city: 'رامسر',
            industry: 'هتل و پذیرایی',
            needs: 'برنج هاشمی، فجر',
            volume: '۴۰ تا ۶۰ کیسه ماهانه',
            reason: 'کالای شما + محدودهٔ جغرافیایی'
        },
        {
            id: 'sg2',
            name: 'سوپرمارکت نگین',
            av: '#7c3aed',
            city: 'قزوین',
            industry: 'خرده‌فروشی',
            needs: 'برنج طارم، روغن',
            volume: '۲۰ تا ۳۰ کیسه ماهانه',
            reason: 'کالای مشابه + هم‌استان'
        },
        {
            id: 'sg3',
            name: 'کترینگ بهار',
            av: '#c2703a',
            city: 'تهران',
            industry: 'کترینگ',
            needs: 'برنج هاشمی',
            volume: '۱۵ تا ۲۵ کیسه ماهانه',
            reason: 'کالای شما + نزدیکی'
        }
    ],

    /* ═══ پیام‌های نمونهٔ چت ═══ */
    chatMessages: [
        { from: 'them', text: 'سلام — قیمت امروز برنج درجه یک چنده؟ برای ۵۰ کیسه', time: '۱۰:۱۲' },
        { from: 'me', text: 'سلام. ۸۹٬۵۰۰ کیلو — کیسهٔ ۱۰ کیلویی ۸۹۵٬۰۰۰. موجودی دارم، ارسال امروز', time: '۱۰:۱۴' },
        { from: 'them', img: 'png/goods/rice-sack.jpg', caption: 'عکس کالای امروز', time: '۱۰:۱۵' },
        { from: 'me', text: 'عالی — ۵۰ کیسه رزرو کنید، فردا صبح می‌آیم', time: '۱۰:۱۶' }
    ]
};