import type { Messages } from "./fa";

/** Arabic (العربية) — RTL. */
export const ar: Messages = {
  common: {
    languageAria: "اختيار اللغة",
    languageLabel: "اللغة",
  },
  auth: {
    tabs: { login: "دخول", register: "تسجيل" },
    titleLogin: "الدخول إلى iMach",
    titleRegister: "إنشاء حساب جديد",
    subtitle: "ادخل برقم الهاتف ليبقى ذراعا الشراء والبيع الخاصان بك متصلين بحسابك.",
    fields: {
      fullName: "الاسم واللقب",
      mobile: "الهاتف المحمول",
      password: "كلمة المرور",
      passwordRegister: "كلمة المرور (٨ أحرف على الأقل)",
    },
    placeholders: {
      fullName: "مثلا علي رضاي",
      mobile: "09121234567",
      password: "••••••••",
    },
    demoHint: "تجريبي: 09120000001 / ImachDemo1234",
    submitLogin: "دخول ومتابعة",
    submitRegister: "إنشاء حساب ومتابعة",
    toasts: {
      invalidPhone: "رقم الهاتف غير صالح",
      invalidPhoneDesc: "مثلا 09121234567",
      passwordShort: "كلمة المرور ٨ أحرف على الأقل",
      nameRequired: "اكتب اسمك",
      authFailed: "فشلت عملية الدخول",
      tryAgain: "حاول مجدداً",
      welcome: "مرحباً بك!",
    },
  },
};
