/**
 * Arabic dictionary — فاز ۱ مهاجرت (ریل سه‌زبانه از روز ۱).
 *
 * Persian is the reference shape (Messages type). Arabic currently covers
 * the namespaces the new v18 app shell actually renders (common + app);
 * remaining namespaces fall back to Persian until their dedicated
 * translation lands in the i18n phase (فاز ۸) — the same incremental
 * pattern this repo already used for English (auth-first).
 */
import { fa, type Messages } from "./fa";

const ar: Messages = {
  ...fa,
  common: {
    ...fa.common,
    languageAria: "اختيار اللغة",
    languageLabel: "اللغة",
    ownerLine: "المدير: {name}",
  },
  app: {
    shell: {
      armBuy: "الشراء بالجملة",
      armSell: "البيع بالجملة",
      notifAria: "الإشعارات",
      notifDot: "٢",
      brandAria: "الصفحة الرئيسية",
      logoAlt: "iMatch",
    },
    tabs: {
      list: "قائمة الشراء",
      saved: "المحفوظات",
      offers: "العروض",
      offersDot: "٣",
      chat: "الدردشة",
      chatDot: "١",
      profile: "الملف الشخصي",
      catalog: "كتالوجي",
      requests: "طلبات السعر",
      requestsDot: "٢",
    },
    desk: {
      bizBuy: "مطعم مهر",
      bizBuyRole: "مساعد الشراء بالجملة",
      bizSell: "توزيع أرز بارس",
      bizSellRole: "مساعد البيع بالجملة",
      walletTitle: "المحفظة — الشحن والحملات",
      savedTitle: "٣ كتالوجات محفوظة",
      savedSub: "ترى سلعهم الجديدة",
      doc: "السعر الحيّ يحفظ توازن الطرفين",
      doc2: "ترتيب المطابقة ليس مدفوعًا أبدًا",
    },
    switch: {
      title: "التبديل بين المساعدين",
      sub: "كلاهما مفعّل على حسابك — فقط اختر أيهما تريد أن تراه الآن",
      buyTitle: "مساعد الشراء بالجملة",
      buySub: "قائمة الشراء · لوحات التوريد · العروض",
      sellTitle: "مساعد البيع بالجملة",
      sellSub: "كتالوجي · طلبات السعر · المتابعون",
      note: "دورك ليس ثابتًا — يمكن لل تاجر بالجملة استخدام المساعدين معًا.",
      close: "إغلاق",
    },
    home: {
      greetTitle: "مرحبًا، {biz}",
      greetSub: "سلعتان بأسعار جديدة هذا الأسبوع — نتتبّعها لك",
      addCta: "إضافة سلعة",
      shareTitle: "شارك قائمة شرائك",
      shareSub: "المورّدون يرونها دون تسجيل · imatch.ir/b/mehr",
      shareCta: "مشاركة",
      secList: "قائمة الشراء الخاصة بي",
      offersLink: "العروض",
      savedStripTitle: "الكتالوجات المحفوظة",
      savedStripSub: "٣ كتالوجات مورّدين · ترى سلعهم الجديدة",
      hint: "كل سلعة في قائمتك لها لوحة توريد — انقر على السلعة لترى الأسعار الحية من عدة مورّدين وشروطهم؛ تابع أيًّا منهم ليبقى دائمًا في دفترك. اللوحة خارج التنقّل الرئيسي؛ تُفتح دائمًا من داخل السلعة.",
      followed: "متابَع",
      suppliers: "مورّدًا",
      freshPrice: "سعر جديد",
      flat: "— دون تغيير",
      perMonth: "شهريًا",
      need: "الحاجة",
      inBoard: "على اللوحة",
      cheapest: "الأرخص",
      lastUpdate: "آخر تحديث",
      hoursAgo: "قبل ساعتين",
      today: "اليوم",
      watchCta: "تفعيل المراقبة",
    },
  },
};

export { ar };
